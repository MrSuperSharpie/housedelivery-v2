'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth'

const BUILDER_HREF = '/builder'
const SIGNIN_BUILDER_HREF = '/sign-in?role=builder&next=%2Fbuilder'

export function PaymentSuccessCta() {
  const { user, isLoading: authLoading } = useAuth()

  if (authLoading) {
    return (
      <div className="mt-8 h-11 w-full animate-pulse rounded-xl bg-panel border border-rim" />
    )
  }

  if (user && user.role === 'builder') {
    return (
      <Link
        href={BUILDER_HREF}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-flame px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-flame-light"
      >
        Go to Builder&apos;s Command Center
      </Link>
    )
  }

  if (user && user.role !== 'builder') {
    return (
      <div className="mt-8 space-y-3">
        <div className="rounded-xl border border-rim bg-panel px-4 py-3 text-xs leading-relaxed text-subtle">
          You&apos;re currently signed in under another role. To view this request,
          sign in with the builder account used for payment.
        </div>
        <Link
          href={SIGNIN_BUILDER_HREF}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-flame px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-flame-light"
        >
          Sign in as builder
        </Link>
      </div>
    )
  }

  // Signed out
  return (
    <div className="mt-8 space-y-3">
      <Link
        href={SIGNIN_BUILDER_HREF}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-flame px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-flame-light"
      >
        Sign in to Builder&apos;s Command Center
      </Link>
      <p className="text-[11px] text-subtle">
        You&apos;ll be taken to your builder dashboard after signing in.
      </p>
    </div>
  )
}
