import type { SupabaseClient } from '@supabase/supabase-js'

// Shared Hold-payment confirmation logic. The verified Stripe webhook
// (src/app/api/stripe/webhook) is the ONLY caller: a Hold / Same-Day Correction
// becomes active, fee-locked, and inspector re-check ready ONLY here, after
// Stripe has confirmed payment server-side.
//
// This module is server-only: it must be given a service-role Supabase client
// (it performs RLS-bypassing writes) and never imports browser code.

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** PostgreSQL 23514: check_violation — a CHECK constraint rejected the value. */
function isCheckViolationError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error &&
    String((error as { code?: unknown }).code ?? '') === '23514'
}

export type ConfirmHoldPaymentCode =
  | 'activated'        // payment confirmed and Hold activated
  | 'already_paid'     // Hold already paid/active (idempotent no-op)
  | 'hold_not_found'
  | 'fetch_error'
  | 'write_error'

export interface ConfirmHoldPaymentParams {
  holdId: string
  // Stripe payment intent id, recorded as the durable proof of payment.
  paymentIntentId?: string | null
  // Stripe checkout session id, for the audit trail.
  checkoutSessionId?: string | null
  // Where the confirmation came from, e.g. 'stripe_webhook'.
  paymentConfirmationSource: string
}

export interface ConfirmHoldPaymentResult {
  ok: boolean
  code: ConfirmHoldPaymentCode
  holdId: string
  activated: boolean
}

export async function confirmHoldPayment(
  serviceClient: SupabaseClient,
  params: ConfirmHoldPaymentParams,
): Promise<ConfirmHoldPaymentResult> {
  const { holdId } = params

  const { data: holdData, error: holdFetchError } = await serviceClient
    .from('job_holds')
    .select('*')
    .eq('id', holdId)
    .maybeSingle()

  if (holdFetchError) {
    console.error('[confirmHoldPayment] hold fetch failed', { holdId, error: holdFetchError.message })
    return { ok: false, code: 'fetch_error', holdId, activated: false }
  }
  if (!holdData) {
    return { ok: false, code: 'hold_not_found', holdId, activated: false }
  }

  const hold = holdData as Record<string, unknown>

  // Idempotency: if payment is already recorded (e.g. duplicate webhook delivery)
  // do not re-activate, re-create the retention session, or re-notify.
  if (hold.hold_payment_status === 'paid' || hold.status === 'hold_active') {
    return { ok: true, code: 'already_paid', holdId, activated: false }
  }

  const now = new Date().toISOString()
  const previousStatus = getString(hold.status) || 'hold_pending_builder_ack'
  const jobId = getString(hold.job_id)
  const inspectorId = getString(hold.inspector_id)
  const builderId = getString(hold.builder_id)
  const premiumRateAmount = toNumber(hold.premium_rate_amount, 0)
  const totalCapAmount = toNumber(hold.hold_cap_amount, 0)
  const windowMinutes = Math.max(30, toNumber(hold.estimated_correction_minutes, 60))
  const sessionHours = windowMinutes / 60

  // Record payment + activation. Payment is the durable fact; the status
  // transition to hold_active happens in the same write.
  const activationPayload: Record<string, unknown> = {
    hold_payment_status: 'paid',
    hold_paid_at: now,
    stripe_payment_intent_id: params.paymentIntentId ?? null,
    status: 'hold_active',
    hold_started_at: now,
    updated_at: now,
  }

  let { error: activationError } = await serviceClient
    .from('job_holds')
    .update(activationPayload)
    .eq('id', holdId)

  // 'hold_active' may fail the CHECK constraint on older schemas (pre-20260412).
  // Fall back to the legacy 'builder_approved' status (its activated equivalent).
  if (activationError && isCheckViolationError(activationError)) {
    console.warn('[confirmHoldPayment] status fallback — retrying with legacy builder_approved status', { holdId })
    ;({ error: activationError } = await serviceClient
      .from('job_holds')
      .update({ ...activationPayload, status: 'builder_approved' })
      .eq('id', holdId))
  }

  if (activationError) {
    console.error('[confirmHoldPayment] activation write failed', { holdId, error: activationError.message })
    return { ok: false, code: 'write_error', holdId, activated: false }
  }

  // ── Retention session (idempotent upsert on hold_id) ───────────────────────
  let dispatchTier = 'standard'
  if (jobId) {
    const { data: jobRow } = await serviceClient
      .from('job_opportunities')
      .select('dispatch_tier')
      .eq('id', jobId)
      .maybeSingle()
    dispatchTier = getString((jobRow as { dispatch_tier?: unknown } | null)?.dispatch_tier) || 'standard'
  }

  const retentionUpsert = serviceClient
    .from('job_hold_retention_sessions')
    .upsert(
      {
        id: `ret-${crypto.randomUUID()}`,
        hold_id: holdId,
        job_id: jobId,
        inspector_id: inspectorId,
        builder_id: builderId,
        dispatch_tier: dispatchTier,
        hourly_rate: premiumRateAmount,
        initial_hours: sessionHours,
        total_hours_booked: sessionHours,
        elapsed_seconds: 0,
        status: 'active',
        resolved_defect_ids: [],
        started_at: now,
        completed_at: null,
        created_at: now,
        updated_at: now,
      },
      { onConflict: 'hold_id' },
    )

  // ── Lifecycle events: hold accepted + started (now that payment is confirmed) ─
  const lifecycleInsert = serviceClient.from('job_hold_events').insert([
    {
      id: `hold-event-${crypto.randomUUID()}`,
      hold_id: holdId,
      job_id: jobId,
      event_type: 'hold_accepted',
      actor_id: null,
      actor_role: 'system',
      note: 'Hold re-verification fee paid and confirmed via Stripe webhook.',
      metadata: { holdCapAmount: totalCapAmount, correctionWindowMinutes: windowMinutes },
    },
    {
      id: `hold-event-${crypto.randomUUID()}`,
      hold_id: holdId,
      job_id: jobId,
      event_type: 'hold_started',
      actor_id: null,
      actor_role: 'system',
      note: null,
      metadata: { holdCapAmount: totalCapAmount, correctionWindowMinutes: windowMinutes },
    },
  ])

  // ── Governance audit ───────────────────────────────────────────────────────
  const auditInsert = serviceClient.from('governance_audit_events').insert({
    entity_type: 'hold',
    entity_id: holdId,
    action: 'hold.payment_confirmed',
    actor_id: params.paymentConfirmationSource,
    actor_role: 'system',
    rule_ids: ['R-031'],
    blocker_type: 'commercial',
    reason: 'Hold re-verification payment confirmed server-side; re-verification authorized.',
    before_state: { status: previousStatus, hold_payment_status: 'unpaid' },
    after_state: { status: 'hold_active', hold_payment_status: 'paid', feeAmount: totalCapAmount },
    metadata: {
      paymentConfirmationSource: params.paymentConfirmationSource,
      stripeCheckoutSessionId: params.checkoutSessionId ?? null,
      stripePaymentIntentId: params.paymentIntentId ?? null,
      correctionWindowMinutes: windowMinutes,
      holdCapAmount: totalCapAmount,
    },
  })

  // Audit/session writes are soft-fail — never undo a confirmed payment.
  await Promise.all([retentionUpsert, lifecycleInsert, auditInsert]).catch(err => {
    console.warn('[confirmHoldPayment] post-activation write failed (soft)', { holdId, error: String(err) })
  })

  // ── Inspector re-check notification — ONLY after payment confirmation ───────
  await notifyInspectorReverificationAuthorized({ holdId, jobId, inspectorId, builderId, feeAmount: totalCapAmount, correctionWindowMinutes: windowMinutes })

  console.log('[confirmHoldPayment] hold activated', {
    holdId,
    source: params.paymentConfirmationSource,
    feeAmount: totalCapAmount,
  })

  return { ok: true, code: 'activated', holdId, activated: true }
}

// Fires the inspector "re-verification authorized" notification via the existing
// SMS-first hold-accepted route. Server-side: requires an absolute URL.
async function notifyInspectorReverificationAuthorized(payload: {
  holdId: string
  jobId: string
  inspectorId: string
  builderId: string
  feeAmount: number
  correctionWindowMinutes: number
}): Promise<void> {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '') || 'http://localhost:3000'
  try {
    await fetch(`${base}/api/notifications/hold-accepted`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationType: 'acknowledged',
        holdId: payload.holdId,
        jobId: payload.jobId,
        inspectorId: payload.inspectorId,
        builderId: payload.builderId,
        feeAmount: payload.feeAmount,
        correctionWindowMinutes: payload.correctionWindowMinutes,
      }),
    })
  } catch (err) {
    console.warn('[confirmHoldPayment] inspector notification failed (soft)', { holdId: payload.holdId, error: String(err) })
  }
}
