import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getStripeClient } from '@/lib/stripe'
import { confirmJobPayment } from '@/lib/payments/confirmJobPayment'

export const runtime = 'nodejs'

// Service-role client owns the release write (RLS-bypassing).
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// Syncs inspector Connect account capability flags after Stripe onboarding.
// Idempotent: re-delivering the same event overwrites with identical values.
// If no matching row exists the event is acknowledged without error so Stripe
// does not retry for accounts that belong to other platforms.
async function handleAccountUpdated(account: Stripe.Account): Promise<NextResponse> {
  const stripeAccountId = account.id
  const service = getServiceClient()
  if (!service) {
    console.error('[stripe/webhook] account.updated: service role client unavailable', { stripeAccountId })
    return NextResponse.json({ ok: false, error: 'Service client unavailable.' }, { status: 503 })
  }

  const { data: existingRow, error: lookupError } = await service
    .from('inspector_payment_accounts')
    .select('inspector_id, onboarding_completed_at')
    .eq('stripe_account_id', stripeAccountId)
    .maybeSingle()

  if (lookupError) {
    console.error('[stripe/webhook] account.updated: lookup failed', { stripeAccountId, error: lookupError.message })
    return NextResponse.json({ ok: false, error: 'Lookup failed.' }, { status: 500 })
  }

  if (!existingRow) {
    console.warn('[stripe/webhook] account.updated: no matching inspector_payment_accounts row', { stripeAccountId })
    return NextResponse.json({ ok: true, received: true, ignored: 'no_matching_account' })
  }

  const row = existingRow as { inspector_id: string; onboarding_completed_at: string | null }
  const now = new Date().toISOString()
  const currentlyDue: string[] = Array.isArray(account.requirements?.currently_due)
    ? (account.requirements.currently_due as string[])
    : []

  const updates: Record<string, unknown> = {
    charges_enabled: account.charges_enabled ?? false,
    payouts_enabled: account.payouts_enabled ?? false,
    details_submitted: account.details_submitted ?? false,
    requirements_currently_due: currentlyDue,
    updated_at: now,
  }

  // Stamp onboarding completion once, the first time details_submitted becomes true.
  if (account.details_submitted && !row.onboarding_completed_at) {
    updates.onboarding_completed_at = now
  }

  const { error: updateError } = await service
    .from('inspector_payment_accounts')
    .update(updates)
    .eq('stripe_account_id', stripeAccountId)

  if (updateError) {
    console.error('[stripe/webhook] account.updated: update failed', { stripeAccountId, error: updateError.message })
    return NextResponse.json({ ok: false, error: 'Update failed.' }, { status: 500 })
  }

  console.log('[stripe/webhook] account.updated: synced', {
    stripeAccountId,
    inspectorId: row.inspector_id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  })

  return NextResponse.json({ ok: true, received: true, synced: true })
}

// POST /api/stripe/webhook
// The ONLY trusted source for releasing a card-paid job. The browser success
// redirect never releases a job. We verify the Stripe signature, then on
// `checkout.session.completed` we reuse the shared confirmJobPayment logic so
// Stripe and admin Interac confirmations release jobs identically.
export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ ok: false, error: 'Missing Stripe signature.' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ ok: false, error: 'Webhook not configured.' }, { status: 503 })
  }

  let stripe: ReturnType<typeof getStripeClient>
  try {
    stripe = getStripeClient()
  } catch (err) {
    console.error('[stripe/webhook] stripe not configured', { error: String(err) })
    return NextResponse.json({ ok: false, error: 'Webhook not configured.' }, { status: 503 })
  }

  // Raw body is required for signature verification.
  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed', { error: String(err) })
    return NextResponse.json({ ok: false, error: 'Invalid signature.' }, { status: 400 })
  }

  if (event.type === 'account.updated') {
    return handleAccountUpdated(event.data.object as Stripe.Account)
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ ok: true, received: true, ignored: event.type })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const jobId =
    (session.metadata?.vero_job_id as string | undefined) ??
    (session.client_reference_id ?? undefined)

  if (!jobId) {
    // Nothing to correlate. Acknowledge so Stripe stops retrying.
    console.error('[stripe/webhook] checkout.session.completed without vero_job_id', { sessionId: session.id })
    return NextResponse.json({ ok: true, received: true, released: false })
  }

  // Only release when Stripe says the payment actually succeeded.
  if (session.payment_status && session.payment_status !== 'paid') {
    console.warn('[stripe/webhook] session not paid; not releasing', { jobId, paymentStatus: session.payment_status })
    return NextResponse.json({ ok: true, received: true, released: false })
  }

  const service = getServiceClient()
  if (!service) {
    console.error('[stripe/webhook] service role client unavailable', { jobId })
    // 503 → Stripe will retry later when the service is reachable.
    return NextResponse.json({ ok: false, error: 'Service client unavailable.' }, { status: 503 })
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null

  const result = await confirmJobPayment(service, {
    jobId,
    actorId: 'stripe-webhook',
    actorRole: 'system',
    reason: 'Stripe card payment verified via webhook.',
    paymentConfirmationSource: 'stripe_webhook',
    // job_status_events.actor_id is a uuid column; the webhook has no uuid actor.
    statusEventActorId: null,
    auditMetadata: {
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
    },
  })

  // Idempotent acknowledgement: 'not_pending' means the job was already released
  // (e.g. duplicate delivery) — treat as success so Stripe stops retrying.
  if (result.ok || result.code === 'not_pending') {
    return NextResponse.json({ ok: true, received: true, released: result.ok && result.live })
  }

  if (result.code === 'job_not_found' || result.code === 'no_payment_blocker') {
    // Not retryable — acknowledge to avoid an infinite retry loop.
    console.error('[stripe/webhook] cannot release job', { jobId, code: result.code })
    return NextResponse.json({ ok: true, received: true, released: false, code: result.code })
  }

  // fetch_error / write_error → transient; ask Stripe to retry.
  console.error('[stripe/webhook] release failed; requesting retry', { jobId, code: result.code })
  return NextResponse.json({ ok: false, error: 'Release failed.', code: result.code }, { status: 500 })
}
