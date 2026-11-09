import { CheckCircle2 } from 'lucide-react'
import { PaymentSuccessCta } from './PaymentSuccessCta'

// Public confirmation page shown after a successful Stripe Checkout.
//
// This page intentionally requires no auth and fetches no job data: the
// verified Stripe webhook remains the only source of truth for releasing the
// job / activating the Hold. The `job` and `hold` query params are read solely
// for display as a reference and to pick the right copy, so the post-payment
// landing never depends on the Supabase client session (which is fragile on
// Vercel Preview). It is registered in the builder layout's RoleGuard
// publicPaths so it renders without a sign-in bounce.
export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; hold?: string }>
}) {
  const { job, hold } = await searchParams
  const holdReference = typeof hold === 'string' ? hold.trim() : ''
  const jobReference = typeof job === 'string' ? job.trim() : ''
  // A `hold` param means this was a same-day correction re-verification payment.
  const isHoldPayment = holdReference.length > 0
  const reference = isHoldPayment ? holdReference : jobReference

  return (
    <div className="app-theme-scope min-h-screen bg-surface flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-rim bg-panel p-8 shadow-card text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-flame/10">
          <CheckCircle2 className="h-6 w-6 text-flame" />
        </div>

        <h1 className="mt-6 text-2xl font-black text-ink">Payment received</h1>
        {isHoldPayment ? (
          <>
            <p className="mt-3 text-base font-bold text-ink">
              Your same-day correction window has been reserved.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-subtle">
              Re-verification is pending — the inspector has been authorized to
              return and re-check the correction. You’ll be notified as it
              progresses. No further action is needed.
            </p>
          </>
        ) : (
          <>
            <p className="mt-3 text-base font-bold text-ink">
              Your inspection request is being posted to the Vero live board.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-subtle">
              Inspectors in your region will be able to claim this request once
              processing is complete. You’ll be notified as it progresses. No
              further action is needed.
            </p>
          </>
        )}

        {reference ? (
          <p className="mt-4 text-xs font-semibold text-subtle">
            Reference: {reference}
          </p>
        ) : null}

        <PaymentSuccessCta isHoldPayment={isHoldPayment} />
      </div>
    </div>
  )
}
