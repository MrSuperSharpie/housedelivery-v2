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

  // Only checkout completion releases a job in this patch.
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
