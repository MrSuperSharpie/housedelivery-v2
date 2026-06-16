import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getStripeClient } from '@/lib/stripe'

export const runtime = 'nodejs'

// Service-role client: reads the authoritative payment amount from the job row.
// The amount charged is NEVER taken from the browser.
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '') || 'http://localhost:3000'
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

// POST /api/builder/payments/checkout
// Creates a Stripe Checkout Session for a builder's pending job. The job must
// already exist in `pending_validation`. The job is NOT released here — release
// happens only when the verified Stripe webhook fires. The builder is taken from
// the authenticated session; only the jobId is accepted from the body.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 })
  }

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

  const service = getServiceClient()
  if (!service) {
    console.error('[builder/payments/checkout] service role client unavailable')
    return NextResponse.json({ ok: false, error: 'Service client unavailable.' }, { status: 503 })
  }

  // Load the job server-side: verify ownership, state, and the authoritative amount.
  const { data: jobData, error: jobError } = await service
    .from('job_opportunities')
    .select('id, builder_id, status, escrow_authorized, validation_blockers, escrow_estimate_total, project_name, stage_name')
    .eq('id', jobId)
    .maybeSingle()

  if (jobError) {
    console.error('[builder/payments/checkout] job fetch failed', { jobId, error: jobError.message })
    return NextResponse.json({ ok: false, error: 'Could not load job.' }, { status: 500 })
  }
  if (!jobData) {
    return NextResponse.json({ ok: false, error: 'Job not found.' }, { status: 404 })
  }

  const job = jobData as {
    id: string
    builder_id?: string | null
    status?: string | null
    escrow_authorized?: boolean | null
    validation_blockers?: Array<{ code?: string }> | null
    escrow_estimate_total?: number | null
    project_name?: string | null
    stage_name?: string | null
  }

  // Strict ownership: the job must belong to the authenticated builder. A job
  // with no builder_id is rejected outright.
  if (job.builder_id !== user.id) {
    return NextResponse.json({ ok: false, error: 'You do not have access to this job.' }, { status: 403 })
  }

  if (job.status !== 'pending_validation') {
    return NextResponse.json(
      { ok: false, error: 'This job is not awaiting payment verification.' },
      { status: 409 },
    )
  }

  // The job must still carry the unresolved payment blocker. If payment is
  // already authorized, or the escrow_not_authorized blocker is gone, there is
  // nothing to charge for.
  const blockers = Array.isArray(job.validation_blockers) ? job.validation_blockers : []
  const hasPaymentBlocker = blockers.some(b => b?.code === 'escrow_not_authorized')
  if (job.escrow_authorized === true || !hasPaymentBlocker) {
    return NextResponse.json(
      { ok: false, error: 'This job is not awaiting payment verification.' },
      { status: 409 },
    )
  }

  const amount = typeof job.escrow_estimate_total === 'number' ? job.escrow_estimate_total : 0
  if (!(amount > 0)) {
    console.error('[builder/payments/checkout] missing or invalid amount', { jobId, amount })
    return NextResponse.json({ ok: false, error: 'This job has no payable amount.' }, { status: 409 })
  }
  const amountInCents = Math.round(amount * 100)

  let stripe: ReturnType<typeof getStripeClient>
  try {
    stripe = getStripeClient()
  } catch (err) {
    console.error('[builder/payments/checkout] stripe not configured', { error: String(err) })
    return NextResponse.json({ ok: false, error: 'Card payments are not configured.' }, { status: 503 })
  }

  const appUrl = getAppUrl()
  const productName = job.project_name
    ? `Vero inspection dispatch — ${job.project_name}`
    : 'Vero inspection dispatch'
  const productDescription = job.stage_name ? `Stage: ${job.stage_name}` : undefined

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // The Vero job id travels with the session so the verified webhook can
      // correlate the payment back to the job to release.
      client_reference_id: jobId,
      metadata: { vero_job_id: jobId },
      payment_intent_data: {
        metadata: { vero_job_id: jobId },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'cad',
            unit_amount: amountInCents,
            product_data: {
              name: productName,
              ...(productDescription ? { description: productDescription } : {}),
            },
          },
        },
      ],
      success_url: `${appUrl}/builder?payment=success&job=${encodeURIComponent(jobId)}`,
      cancel_url: `${appUrl}/builder?payment=cancelled&job=${encodeURIComponent(jobId)}`,
    })

    if (!session.url) {
      console.error('[builder/payments/checkout] session created without url', { jobId, sessionId: session.id })
      return NextResponse.json({ ok: false, error: 'Could not start card checkout.' }, { status: 502 })
    }

    return NextResponse.json({ ok: true, url: session.url })
  } catch (err) {
    console.error('[builder/payments/checkout] checkout session create failed', { jobId, error: String(err) })
    return NextResponse.json({ ok: false, error: 'Could not start card checkout.' }, { status: 502 })
  }
}
