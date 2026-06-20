import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getStripeClient } from '@/lib/stripe'

export const runtime = 'nodejs'

// Service-role client: owns all writes to inspector_payment_accounts (clients
// cannot write that table under RLS).
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function getAppUrl(): string {
  // On Vercel Preview, prefer the deployment-specific hostname so Stripe returns
  // to the same Preview URL, not the production domain stored in NEXT_PUBLIC_APP_URL.
  const vercelEnv = process.env.VERCEL_ENV
  if (vercelEnv === 'preview') {
    const deploymentHost =
      process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL
    if (deploymentHost) return `https://${deploymentHost}`
  }
  return (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '') || 'http://localhost:3000'
}

// POST /api/inspector/payouts/connect
// Creates (or reuses) the caller's Stripe Connect account and returns a fresh
// Stripe-hosted onboarding link. The inspector is taken from the authenticated
// session only — no inspectorId is accepted from the request body.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 })
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('role, email, onboarding_status, verified')
    .eq('id', user.id)
    .maybeSingle()

  const profile = profileRow as {
    role?: string | null
    email?: string | null
    onboarding_status?: string | null
    verified?: boolean | null
  } | null
  const role = profile?.role ?? (user.user_metadata?.role as string | undefined)
  if (role !== 'inspector') {
    return NextResponse.json({ ok: false, error: 'Inspector role required.' }, { status: 403 })
  }

  // Mirror the inspector profile/onboarding approval standard: approved when
  // onboarding_status is 'approved', or (when status is absent) verified === true.
  const isApprovedForPayouts = profile?.onboarding_status === 'approved' || profile?.verified === true
  if (!isApprovedForPayouts) {
    return NextResponse.json(
      { ok: false, error: 'Your inspector account must be approved before you can set up payouts.' },
      { status: 403 },
    )
  }

  const service = getServiceClient()
  if (!service) {
    console.error('[inspector/payouts/connect] service role client unavailable')
    return NextResponse.json({ ok: false, error: 'Service client unavailable.' }, { status: 503 })
  }

  let stripe: ReturnType<typeof getStripeClient>
  try {
    stripe = getStripeClient()
  } catch (err) {
    console.error('[inspector/payouts/connect] stripe not configured', { error: String(err) })
    return NextResponse.json({ ok: false, error: 'Payouts are not configured.' }, { status: 503 })
  }

  const inspectorId = user.id
  const now = new Date().toISOString()

  // Create-or-reuse: never mint a second connected account for an inspector.
  const { data: existingRow, error: lookupError } = await service
    .from('inspector_payment_accounts')
    .select('stripe_account_id')
    .eq('inspector_id', inspectorId)
    .maybeSingle()

  if (lookupError) {
    console.error('[inspector/payouts/connect] account lookup failed', { error: lookupError.message })
    return NextResponse.json({ ok: false, error: 'Could not load payout account.' }, { status: 500 })
  }

  let stripeAccountId =
    (existingRow as { stripe_account_id?: string | null } | null)?.stripe_account_id ?? null

  if (!stripeAccountId) {
    try {
      // Controller-properties approach (current Stripe API): an Express-style
      // connected account where Stripe hosts onboarding and collects
      // requirements. No legacy `type: 'express' | 'custom'`.
      const account = await stripe.accounts.create({
        country: 'CA',
        email: profile?.email ?? user.email ?? undefined,
        controller: {
          stripe_dashboard: { type: 'express' },
          fees: { payer: 'application' },
          losses: { payments: 'application' },
          requirement_collection: 'stripe',
        },
        capabilities: {
          transfers: { requested: true },
        },
        metadata: { vero_inspector_id: inspectorId },
      })
      stripeAccountId = account.id

      const { error: upsertError } = await service
        .from('inspector_payment_accounts')
        .upsert(
          {
            inspector_id: inspectorId,
            stripe_account_id: stripeAccountId,
            account_type: 'express',
            charges_enabled: account.charges_enabled ?? false,
            payouts_enabled: account.payouts_enabled ?? false,
            details_submitted: account.details_submitted ?? false,
            onboarding_started_at: now,
            updated_at: now,
          },
          { onConflict: 'inspector_id' },
        )

      if (upsertError) {
        console.error('[inspector/payouts/connect] account persist failed', { error: upsertError.message })
        return NextResponse.json({ ok: false, error: 'Could not save payout account.' }, { status: 500 })
      }
    } catch (err) {
      console.error('[inspector/payouts/connect] stripe account create failed', { error: String(err) })
      return NextResponse.json({ ok: false, error: 'Could not create payout account.' }, { status: 502 })
    }
  }

  // Fresh single-use onboarding link each call (Stripe account links are
  // short-lived); refresh_url is hit if the link expires before completion.
  try {
    const appUrl = getAppUrl()
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${appUrl}/inspector/profile?payouts=refresh`,
      return_url: `${appUrl}/inspector/profile?payouts=return`,
      type: 'account_onboarding',
    })
    return NextResponse.json({ ok: true, url: accountLink.url })
  } catch (err) {
    console.error('[inspector/payouts/connect] account link failed', { error: String(err) })
    return NextResponse.json({ ok: false, error: 'Could not start payout onboarding.' }, { status: 502 })
  }
}
