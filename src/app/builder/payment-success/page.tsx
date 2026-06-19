import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

// Public confirmation page shown after a successful Stripe Checkout.
//
// This page intentionally requires no auth and fetches no job data: the
// verified Stripe webhook remains the only source of truth for releasing the
// job. The `job` query param is read solely for display as a reference, so the
// post-payment landing never depends on the Supabase client session (which is
// fragile on Vercel Preview). It is registered in the builder layout's
// RoleGuard publicPaths so it renders without a sign-in bounce.
export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>
}) {
  const { job } = await searchParams
  const reference = typeof job === 'string' ? job.trim() : ''

  return (
    <div className="app-theme-scope min-h-screen bg-surface flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-rim bg-panel p-8 shadow-card text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-flame/10">
          <CheckCircle2 className="h-6 w-6 text-flame" />
        </div>

        <h1 className="mt-6 text-2xl font-black text-ink">Payment received</h1>
        <p className="mt-3 text-base font-bold text-ink">
          Your inspection request is being posted to the Vero live board.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-subtle">
          Inspectors in your region will be able to claim this request once
          processing is complete. You’ll be notified as it progresses. No
          further action is needed.
        </p>

        {reference ? (
          <p className="mt-4 text-xs font-semibold text-subtle">
            Reference: {reference}
          </p>
        ) : null}

        <Link
          href="/builder"
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-flame px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-flame-light"
        >
          Go to dashboard
        </Link>

        <p className="mt-4 text-[11px] text-subtle">
          If you’re signed out, you’ll be asked to sign in first.
        </p>
      </div>
    </div>
  )
}
