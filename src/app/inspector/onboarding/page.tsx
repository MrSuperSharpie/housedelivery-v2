'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, Clock, FileText, HardHat } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { getInspectorOnboardingStatus, getInspectorOnboardingStatusAsync } from '@/lib/persistence/inspectorOnboarding'
import { selectInspectorEligibility } from '@/lib/supabase/compliance'
import type { InspectorOnboardingStatus } from '@/lib/types'

const STATUS_COPY: Record<InspectorOnboardingStatus, { title: string; detail: string; icon: React.ElementType; tone: string }> = {
  draft: {
    title: 'Finish your onboarding',
    detail: 'Complete your credentials and document submission before claiming jobs.',
    icon: FileText,
    tone: 'text-muted',
  },
  submitted: {
    title: 'Application submitted',
    detail: 'Your credentials and documents are with Vero for review. You can browse the board, but claims stay locked until approval.',
    icon: Clock,
    tone: 'text-warning-amber',
  },
  under_review: {
    title: 'Under review',
    detail: 'Vero is reviewing your onboarding package. You can browse the board while approval is pending.',
    icon: Clock,
    tone: 'text-warning-amber',
  },
  needs_info: {
    title: 'More info needed',
    detail: 'Vero needs additional information before approval. Return to onboarding and update your submission.',
    icon: AlertCircle,
    tone: 'text-warning-amber',
  },
  approved: {
    title: 'Approved',
    detail: 'Your onboarding is complete and you can claim eligible jobs.',
    icon: CheckCircle2,
    tone: 'text-success-green',
  },
  rejected: {
    title: 'Not approved',
    detail: 'Your onboarding was not approved. Contact Vero support if you need help.',
    icon: AlertCircle,
    tone: 'text-fail-red',
  },
  suspended: {
    title: 'Suspended',
    detail: 'Your inspector access is suspended. Contact Vero support for next steps.',
    icon: AlertCircle,
    tone: 'text-fail-red',
  },
}

export default function InspectorOnboardingEntryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [status, setStatus] = useState<InspectorOnboardingStatus>('submitted')
  const [hasEligibilityProfile, setHasEligibilityProfile] = useState<boolean | null>(null)

  useEffect(() => {
    if (!user?.id) {
      queueMicrotask(() => {
        setStatus(getInspectorOnboardingStatus())
      })
      return
    }

    getInspectorOnboardingStatusAsync(user.id, user.supabaseId).then(setStatus)
    if (user.role === 'inspector' && user.supabaseId) {
      selectInspectorEligibility(user.supabaseId)
        .then(profile => setHasEligibilityProfile(Boolean(profile)))
        .catch(() => setHasEligibilityProfile(false))
      return
    }
    queueMicrotask(() => {
      setHasEligibilityProfile(false)
    })
  }, [user?.id, user?.role, user?.supabaseId])

  useEffect(() => {
    if (user?.role === 'inspector' && user.supabaseId && hasEligibilityProfile === false) {
      router.replace('/inspector/signup')
      return
    }
    if (user?.role === 'inspector' && status === 'approved') {
      router.replace('/inspector')
    }
  }, [hasEligibilityProfile, router, status, user?.role, user?.supabaseId])

  const justSubmitted = searchParams.get('submitted') === '1'
  const copy = STATUS_COPY[status]
  const Icon = copy.icon

  return (
    <div className="min-h-screen bg-surface">
      <div className="border-b border-white/5 px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-lg font-black text-ink">
            Vero
          </Link>
          <Link href="/sign-in?role=inspector" className="text-xs font-semibold text-electric hover:underline">
            Inspector sign in
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-3xl border border-rim bg-panel p-8 shadow-card-lg">
          <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/8 bg-surface ${copy.tone}`}>
            <Icon className="h-7 w-7" />
          </div>

          <h1 className="text-3xl font-black text-ink">
            {justSubmitted ? 'Complete onboarding to claim jobs' : copy.title}
          </h1>
          <p className="mt-3 text-sm text-muted">{copy.detail}</p>

          {justSubmitted && (
            <div className="mt-5 rounded-2xl border border-electric/20 bg-electric/10 px-4 py-3 text-sm text-electric">
              Your account was created successfully. Check your email to confirm your account, then sign in to continue tracking your onboarding status.
            </div>
          )}

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-rim bg-surface p-5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-subtle">What happens next</div>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>Vero reviews your credentials and supporting documents.</li>
                <li>Approved inspectors can claim eligible jobs from the Live Board.</li>
                <li>Until approval, you can still browse the marketplace for discovery.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-rim bg-surface p-5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-subtle">Current status</div>
              <div className={`mt-3 text-lg font-black ${copy.tone}`}>{copy.title}</div>
              <p className="mt-2 text-sm text-muted">{copy.detail}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {status === 'needs_info' || status === 'draft' ? (
              <Link
                href="/inspector/signup"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-flame px-5 py-4 text-sm font-black text-white hover:bg-flame-light"
              >
                <FileText className="h-4 w-4" />
                Return to onboarding
              </Link>
            ) : (
              <Link
                href={user?.role === 'inspector' ? '/inspector' : '/sign-in?role=inspector'}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-electric px-5 py-4 text-sm font-black text-surface hover:opacity-90"
              >
                <HardHat className="h-4 w-4" />
                {user?.role === 'inspector' ? 'Browse live jobs' : 'Sign in to continue'}
              </Link>
            )}

            <Link
              href="/inspector/onboarding-status"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rim bg-surface px-5 py-4 text-sm font-bold text-ink hover:bg-raised"
            >
              <Clock className="h-4 w-4" />
              Check approval status
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
