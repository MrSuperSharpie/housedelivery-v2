import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getStripeClient } from '@/lib/stripe'
import { normalizeHoldStatus, HOLD_BUILDER_ACTIONABLE_STATUSES } from '@/lib/holds/workflow'

export const runtime = 'nodejs'

// Service-role client: reads the authoritative Hold fee from the job_holds row.
// The amount charged is NEVER taken from the browser.
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// Build the absolute URL Stripe redirects back to after Checkout. Prefer the
// origin the builder is actually browsing (sent as the Origin header on this
// same-origin POST) so the post-payment landing returns to the SAME origin.
// Supabase auth cookies are per-origin: redirecting to a different configured
// host (e.g. a Vercel Preview URL vs NEXT_PUBLIC_APP_URL) leaves the cookie
// absent on the success page and makes the builder appear signed out. Falls
// back to the forwarded host, then the configured app URL, then localhost.
function getAppUrl(req: NextRequest): string {
  const origin = getString(req.headers.get('origin'))
  if (origin) return origin.replace(/\/+$/, '')
  const forwardedHost = getString(req.headers.get('x-forwarded-host')) || getString(req.headers.get('host'))
  if (forwardedHost) {
    const proto = getString(req.headers.get('x-forwarded-proto')) || 'https'
    return `${proto}://${forwardedHost}`.replace(/\/+$/, '')
  }
  return (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '') || 'http://localhost:3000'
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

// POST /api/builder/payments/hold-checkout
// Creates a Stripe Checkout Session for a Hold / Same-Day Correction
// re-verification fee. The Hold is NOT activated here — activation happens only
// when the verified Stripe webhook fires (confirmHoldPayment). The builder is
// taken from the authenticated session; only the holdId is accepted from the body.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 })
  }

  let body: { holdId?: unknown }
  try {
    body = await req.json() as { holdId?: unknown }
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const holdId = getString(body.holdId)
  if (!holdId) {
    return NextResponse.json({ ok: false, error: 'holdId is required.' }, { status: 400 })
  }

  const service = getServiceClient()
  if (!service) {
    console.error('[builder/payments/hold-checkout] service role client unavailable')
    return NextResponse.json({ ok: false, error: 'Service client unavailable.' }, { status: 503 })
  }

  // Load the hold server-side: verify ownership, payment state, and the
  // authoritative amount (hold_cap_amount). Never trust a browser amount.
  const { data: holdData, error: holdError } = await service
    .from('job_holds')
    .select('id, builder_id, job_id, status, hold_cap_amount, hold_payment_status')
    .eq('id', holdId)
    .maybeSingle()

  if (holdError) {
    console.error('[builder/payments/hold-checkout] hold fetch failed', { holdId, error: holdError.message })
    return NextResponse.json({ ok: false, error: 'Could not load hold.' }, { status: 500 })
  }
  if (!holdData) {
    return NextResponse.json({ ok: false, error: 'Hold not found.' }, { status: 404 })
  }

  const hold = holdData as {
    id: string
    builder_id?: string | null
    job_id?: string | null
    status?: string | null
    hold_cap_amount?: number | null
    hold_payment_status?: string | null
  }

  // Strict ownership: the hold must belong to the authenticated builder.
  if (hold.builder_id !== user.id) {
    return NextResponse.json({ ok: false, error: 'You do not have access to this hold.' }, { status: 403 })
  }

  // Only an unpaid hold can be charged. A paid hold is already (or will be)
  // activated by the webhook — there is nothing to charge for.
  if (hold.hold_payment_status === 'paid') {
    return NextResponse.json(
      { ok: false, error: 'This hold has already been paid.' },
      { status: 409 },
    )
  }

  // Only a Hold still awaiting builder payment/acknowledgement is payable.
  // Reject any non-actionable status (active/approved, resolved pass/fail,
  // declined, expired, admin-resolved, or any legacy equivalent). Normalize
  // first so legacy DB values (e.g. 'open', 'builder_approved') are gated too.
  const normalizedStatus = normalizeHoldStatus(hold.status)
  if (!HOLD_BUILDER_ACTIONABLE_STATUSES.includes(normalizedStatus)) {
    return NextResponse.json(
      { ok: false, error: 'This hold is not awaiting payment.' },
      { status: 409 },
    )
  }

  // Amount is read server-side from the hold row, never from the browser.
  const amount = typeof hold.hold_cap_amount === 'number' ? hold.hold_cap_amount : 0
  if (!(amount > 0)) {
    console.error('[builder/payments/hold-checkout] missing or invalid amount', { holdId, amount })
    return NextResponse.json({ ok: false, error: 'This hold has no payable amount.' }, { status: 409 })
  }
  const amountInCents = Math.round(amount * 100)
  const jobId = getString(hold.job_id)

  let stripe: ReturnType<typeof getStripeClient>
  try {
    stripe = getStripeClient()
  } catch (err) {
    console.error('[builder/payments/hold-checkout] stripe not configured', { error: String(err) })
    return NextResponse.json({ ok: false, error: 'Card payments are not configured.' }, { status: 503 })
  }

  const appUrl = getAppUrl(req)

  try {
    const metadata = {
      payment_kind: 'hold_reverification',
      vero_hold_id: holdId,
      vero_job_id: jobId,
      builder_id: user.id,
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // The Vero hold id travels with the session so the verified webhook can
      // correlate the payment back to the hold and activate re-verification.
      client_reference_id: holdId,
      metadata,
      payment_intent_data: { metadata },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'cad',
            unit_amount: amountInCents,
            product_data: {
              name: 'Vero same-day correction — re-verification',
              description: 'Reserves the inspector re-check window for a flagged Hold.',
            },
          },
        },
      ],
      success_url: `${appUrl}/builder/payment-success?hold=${encodeURIComponent(holdId)}`,
      cancel_url: `${appUrl}/builder?payment=cancelled&hold=${encodeURIComponent(holdId)}`,
    })

    if (!session.url) {
      console.error('[builder/payments/hold-checkout] session created without url', { holdId, sessionId: session.id })
      return NextResponse.json({ ok: false, error: 'Could not start card checkout.' }, { status: 502 })
    }

    // Record the checkout session id for webhook correlation / idempotency.
    // Soft-fail: the metadata on the session is the authoritative correlation key.
    const { error: sessionWriteError } = await service
      .from('job_holds')
      .update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() })
      .eq('id', holdId)
    if (sessionWriteError) {
      console.warn('[builder/payments/hold-checkout] could not persist session id', { holdId, error: sessionWriteError.message })
    }

    return NextResponse.json({ ok: true, url: session.url })
  } catch (err) {
    console.error('[builder/payments/hold-checkout] checkout session create failed', { holdId, error: String(err) })
    return NextResponse.json({ ok: false, error: 'Could not start card checkout.' }, { status: 502 })
  }
}
