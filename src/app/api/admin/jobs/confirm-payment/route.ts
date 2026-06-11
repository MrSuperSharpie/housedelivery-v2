import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAdminApi } from '@/lib/adminApiGuard'
import {
  validateJobPostingGovernance,
  type JobPostingGovernanceInput,
  type InspectorOnboardingStatus,
  type GovernanceIssue,
  type InspectorDiscipline,
  type Region,
} from '@/lib/governance'

export const runtime = 'nodejs'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi()
  if (!auth.authorized) return auth.response

  let body: { jobId?: unknown }
  try {
    body = await req.json() as { jobId?: unknown }
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const jobId = getString(body.jobId)
  if (!jobId) {
    return NextResponse.json({ ok: false, error: 'jobId is required.' }, { status: 400 })
  }

  const serviceClient = getServiceClient()
  if (!serviceClient) {
    console.error('[admin/jobs/confirm-payment] service role client unavailable')
    return NextResponse.json({ ok: false, error: 'Service client unavailable.' }, { status: 503 })
  }

  const { data: jobData, error: jobFetchError } = await serviceClient
    .from('job_opportunities')
    .select('*')
    .eq('id', jobId)
    .maybeSingle()

  if (jobFetchError) {
    console.error('[admin/jobs/confirm-payment] job fetch failed', { jobId, error: jobFetchError.message })
    return NextResponse.json({ ok: false, error: 'Could not fetch job record.' }, { status: 500 })
  }

  if (!jobData) {
    return NextResponse.json({ ok: false, error: 'Job not found.' }, { status: 404 })
  }

  const job = jobData as Record<string, unknown>

  if (job.status !== 'pending_validation') {
    return NextResponse.json(
      { ok: false, error: 'Job is not in pending_validation state.' },
      { status: 409 },
    )
  }

  const existingBlockers = (job.validation_blockers as GovernanceIssue[] | null) ?? []
  const hasPaymentBlocker = existingBlockers.some(b => b.code === 'escrow_not_authorized')
  if (!hasPaymentBlocker) {
    return NextResponse.json(
      { ok: false, error: 'This job does not have a pending payment blocker.' },
      { status: 409 },
    )
  }

  const now = new Date().toISOString()
  const previousStatus = job.status as string

  // Record payment authorization first — this is the durable fact.
  const { error: paymentUpdateError } = await serviceClient
    .from('job_opportunities')
    .update({ escrow_authorized: true, updated_at: now })
    .eq('id', jobId)

  if (paymentUpdateError) {
    console.error('[admin/jobs/confirm-payment] payment authorization write failed', { jobId, error: paymentUpdateError.message })
    return NextResponse.json({ ok: false, error: 'Failed to record payment authorization.' }, { status: 500 })
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
    console.error('[admin/jobs/confirm-payment] status update failed', { jobId, error: statusUpdateError.message })
    return NextResponse.json({ ok: false, error: 'Payment confirmed but job status update failed.' }, { status: 500 })
  }

  // Audit trail — soft-fail; never let event writes block the response.
  const eventInsert = serviceClient.from('job_status_events').insert({
    job_id: jobId,
    actor_id: auth.userId,
    actor_role: 'admin',
    from_status: previousStatus,
    to_status: newStatus,
    reason: 'Admin manually confirmed payment received.',
    created_at: now,
  })

  const auditInsert = serviceClient.from('governance_audit_events').insert({
    entity_type: 'job',
    entity_id: jobId,
    action: 'job.payment_confirmed_admin',
    actor_id: auth.userId,
    actor_role: 'admin',
    rule_ids: ['R-016'],
    blocker_type: 'commercial',
    reason: 'Admin manually confirmed payment received for job.',
    before_state: { escrow_authorized: false, status: previousStatus },
    after_state: { escrow_authorized: true, status: newStatus },
    metadata: {
      governancePassedAfterPayment: governance.ok,
      remainingBlockers: remainingBlockers.map(b => b.code),
    },
    created_at: now,
  })

  await Promise.all([eventInsert, auditInsert]).catch(err => {
    console.warn('[admin/jobs/confirm-payment] audit event write failed', { jobId, error: String(err) })
  })

  console.log('[admin/jobs/confirm-payment] payment confirmed', {
    jobId,
    adminId: auth.userId,
    live: governance.ok,
    newStatus,
    remainingBlockerCodes: remainingBlockers.map(b => b.code),
  })

  return NextResponse.json({
    ok: true,
    jobId,
    live: governance.ok,
    newStatus,
    remainingBlockers: governance.ok ? [] : remainingBlockers,
  })
}
