import type { SupabaseClient } from '@supabase/supabase-js'
import {
  validateJobPostingGovernance,
  type JobPostingGovernanceInput,
  type InspectorOnboardingStatus,
  type GovernanceIssue,
  type InspectorDiscipline,
  type Region,
} from '@/lib/governance'

// Shared payment-release logic. Both the admin manual Interac confirmation
// (src/app/api/admin/jobs/confirm-payment) and the verified Stripe webhook
// (src/app/api/stripe/webhook) call this so a job is released to `live` through
// exactly one governance path. The `escrow_authorized` flag remains the gate.
//
// This module is server-only: it must be given a service-role Supabase client
// (it performs RLS-bypassing writes) and never imports browser code.

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export type ConfirmJobPaymentCode =
  | 'released'            // payment authorized and job went live
  | 'authorized_still_blocked' // payment authorized, other governance blockers remain
  | 'not_pending'         // job not in pending_validation (likely already processed)
  | 'no_payment_blocker'  // job has no outstanding escrow_not_authorized blocker
  | 'job_not_found'
  | 'fetch_error'
  | 'write_error'

export interface ConfirmJobPaymentParams {
  jobId: string
  // Actor recorded in governance_audit_events.actor_id (text column). For the
  // Stripe webhook there is no human actor — pass a sentinel like 'stripe-webhook'.
  actorId: string | null
  actorRole: string
  // Human-readable reason stamped on the status + audit events.
  reason: string
  // Where the confirmation came from, e.g. 'admin_manual' | 'stripe_webhook'.
  paymentConfirmationSource: string
  // Actor for job_status_events.actor_id (uuid column). The webhook has no uuid
  // actor and must pass null; the admin route passes the admin's user id.
  statusEventActorId?: string | null
  // Extra audit metadata merged into governance_audit_events.metadata
  // (e.g. Stripe session / payment intent ids).
  auditMetadata?: Record<string, unknown>
}

export interface ConfirmJobPaymentResult {
  ok: boolean
  code: ConfirmJobPaymentCode
  jobId: string
  live: boolean
  newStatus: string | null
  remainingBlockers: GovernanceIssue[]
}

export async function confirmJobPayment(
  serviceClient: SupabaseClient,
  params: ConfirmJobPaymentParams,
): Promise<ConfirmJobPaymentResult> {
  const { jobId } = params
  const statusEventActorId =
    params.statusEventActorId !== undefined ? params.statusEventActorId : params.actorId

  const { data: jobData, error: jobFetchError } = await serviceClient
    .from('job_opportunities')
    .select('*')
    .eq('id', jobId)
    .maybeSingle()

  if (jobFetchError) {
    console.error('[confirmJobPayment] job fetch failed', { jobId, error: jobFetchError.message })
    return { ok: false, code: 'fetch_error', jobId, live: false, newStatus: null, remainingBlockers: [] }
  }

  if (!jobData) {
    return { ok: false, code: 'job_not_found', jobId, live: false, newStatus: null, remainingBlockers: [] }
  }

  const job = jobData as Record<string, unknown>

  if (job.status !== 'pending_validation') {
    // Already processed (e.g. duplicate webhook delivery) or never eligible.
    return {
      ok: false,
      code: 'not_pending',
      jobId,
      live: job.status === 'live',
      newStatus: job.status as string,
      remainingBlockers: [],
    }
  }

  const existingBlockers = (job.validation_blockers as GovernanceIssue[] | null) ?? []
  const hasPaymentBlocker = existingBlockers.some(b => b.code === 'escrow_not_authorized')
  if (!hasPaymentBlocker) {
    return { ok: false, code: 'no_payment_blocker', jobId, live: false, newStatus: job.status as string, remainingBlockers: [] }
  }

  const now = new Date().toISOString()
  const previousStatus = job.status as string

  // Record payment authorization first — this is the durable fact.
  const { error: paymentUpdateError } = await serviceClient
    .from('job_opportunities')
    .update({ escrow_authorized: true, updated_at: now })
    .eq('id', jobId)

  if (paymentUpdateError) {
    console.error('[confirmJobPayment] payment authorization write failed', { jobId, error: paymentUpdateError.message })
    return { ok: false, code: 'write_error', jobId, live: false, newStatus: null, remainingBlockers: [] }
  }

  // Re-run governance with escrowAuthorized: true to determine final job status.
  const projectComplete = Boolean(
    job.project_name && (job.project_name as string).trim() &&
    job.address && (job.address as string).trim() &&
    job.city && (job.city as string).trim() &&
    job.stage_name && (job.stage_name as string).trim(),
  )

  const governanceInput: JobPostingGovernanceInput = {
    jobId,
    projectId: (job.project_id as string | undefined) ?? undefined,
    builderId: (job.builder_id as string | undefined) ?? undefined,
    builderStatus: (job.builder_onboarding_status as InspectorOnboardingStatus | null) ?? null,
    projectName: getString(job.project_name),
    address: getString(job.address),
    city: getString(job.city),
    permitFamily: getString(job.permit_family),
    permitNumber: (job.permit_number as string | undefined) ?? undefined,
    requiredDiscipline: job.required_discipline as InspectorDiscipline,
    region: job.region as Region,
    stage: job.stage as number,
    stageName: getString(job.stage_name),
    projectComplete,
    dependencySealed: true,
    escrowAuthorized: true,
  }

  const governance = validateJobPostingGovernance(governanceInput)
  const newStatus = governance.ok ? 'live' : 'pending_validation'
  const newValidationStatus = governance.ok ? 'validated' : 'blocked'
  const remainingBlockers = governance.blockers ?? []

  const { error: statusUpdateError } = await serviceClient
    .from('job_opportunities')
    .update({
      status: newStatus,
      validation_status: newValidationStatus,
      validation_blockers: remainingBlockers,
      published_at: governance.ok ? now : null,
      updated_at: now,
    })
    .eq('id', jobId)

  if (statusUpdateError) {
    console.error('[confirmJobPayment] status update failed', { jobId, error: statusUpdateError.message })
    // Payment authorization is already recorded; surface as a write error.
    return { ok: false, code: 'write_error', jobId, live: false, newStatus: null, remainingBlockers }
  }

  // Audit trail — soft-fail; never let event writes block the release outcome.
  const eventInsert = serviceClient.from('job_status_events').insert({
    job_id: jobId,
    actor_id: statusEventActorId,
    actor_role: params.actorRole,
    from_status: previousStatus,
    to_status: newStatus,
    reason: params.reason,
    created_at: now,
  })

  const auditInsert = serviceClient.from('governance_audit_events').insert({
    entity_type: 'job',
    entity_id: jobId,
    action: 'job.payment_confirmed',
    actor_id: params.actorId,
    actor_role: params.actorRole,
    rule_ids: ['R-016'],
    blocker_type: 'commercial',
    reason: params.reason,
    before_state: { escrow_authorized: false, status: previousStatus },
    after_state: { escrow_authorized: true, status: newStatus },
    metadata: {
      paymentConfirmationSource: params.paymentConfirmationSource,
      governancePassedAfterPayment: governance.ok,
      remainingBlockers: remainingBlockers.map(b => b.code),
      ...(params.auditMetadata ?? {}),
    },
    created_at: now,
  })

  await Promise.all([eventInsert, auditInsert]).catch(err => {
    console.warn('[confirmJobPayment] audit event write failed', { jobId, error: String(err) })
  })

  console.log('[confirmJobPayment] payment confirmed', {
    jobId,
    actorRole: params.actorRole,
    source: params.paymentConfirmationSource,
    live: governance.ok,
    newStatus,
    remainingBlockerCodes: remainingBlockers.map(b => b.code),
  })

  return {
    ok: true,
    code: governance.ok ? 'released' : 'authorized_still_blocked',
    jobId,
    live: governance.ok,
    newStatus,
    remainingBlockers: governance.ok ? [] : remainingBlockers,
  }
}
