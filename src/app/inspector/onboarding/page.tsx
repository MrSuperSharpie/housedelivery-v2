'use client'

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, Clock, FileText, HardHat } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { BrandWordmark } from '@/components/shared/Navbar'
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
    title: 'Waiting for approval',
    detail: 'Your credentials and documents are with Vero for review. You do not need to restart onboarding.',
    icon: Clock,
    tone: 'text-warning-amber',
  },
  under_review: {
    title: 'Waiting for approval',
    detail: 'Vero is reviewing your onboarding package. You do not need to restart onboarding.',
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

function InspectorOnboardingEntryInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [status, setStatus] = useState<InspectorOnboardingStatus>('draft')
  const [hasEligibilityProfile, setHasEligibilityProfile] = useState<boolean | null>(null)
  const [reviewerNote, setReviewerNote] = useState<string | null>(null)

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
        .then(profile => {
          setHasEligibilityProfile(Boolean(profile))
          setReviewerNote(profile?.reviewerNote ?? null)
        })
        .catch(() => {
          setHasEligibilityProfile(false)
          setReviewerNote(null)
        })
      return
    }
    queueMicrotask(() => {
      setHasEligibilityProfile(false)
      setReviewerNote(null)
    })
  }, [user?.id, user?.role, user?.supabaseId])

  // justSubmitted: true immediately after account creation.
  // Checks URL param first; falls back to sessionStorage in case useSearchParams()
  // returns empty during the initial hydration pass (known Next.js edge case).
  const justSubmitted = searchParams.get('submitted') === '1' || (
    typeof window !== 'undefined' && (() => {
      try { return sessionStorage.getItem('vero_just_submitted') === '1' } catch { return false }
    })()
  )

  useEffect(() => {
    if (justSubmitted) return // stay on this page right after signup
    // Only redirect to signup when BOTH conditions are true:
    //  1. No eligibility profile row exists in the database
    //  2. The resolved status is draft (not submitted/approved/under_review)
    // This prevents a race condition where a freshly-submitted inspector has a null
    // eligibility profile for a moment, which previously caused an incorrect bounce.
    if (
      user?.role === 'inspector' &&
      user.supabaseId &&
      hasEligibilityProfile === false &&
      status === 'draft'
    ) {
      router.replace('/inspector/signup')
      return
    }
    // Approved inspectors use the "Browse live jobs" button — no auto-redirect here.
  }, [hasEligibilityProfile, justSubmitted, router, status, user?.role, user?.supabaseId])

  const copy = STATUS_COPY[status]
  const Icon = copy.icon

  return (
    <div className="min-h-screen bg-surface">
      <div className="border-b border-white/5 px-4 sm:px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <BrandWordmark height={32} priority theme="auto" />
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
            {justSubmitted ? 'Waiting for approval' : copy.title}
          </h1>
          <p className="mt-3 text-sm text-muted">{copy.detail}</p>

          {justSubmitted && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border-2 border-success-green bg-success-green/15 px-4 py-3.5 text-sm text-success-green">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Application submitted successfully. Vero will review your credentials within 1–2 business days.</span>
            </div>
          )}

          {status === 'needs_info' && reviewerNote && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border-2 border-warning-amber/30 bg-warning-amber/10 px-4 py-3.5 text-sm text-warning-amber">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-black">Reviewer note</div>
                <p className="mt-1 text-xs leading-relaxed">{reviewerNote}</p>
              </div>
            </div>
          )}

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-rim bg-surface p-5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-subtle">What happens next</div>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>Vero reviews your credentials and supporting documents.</li>
                <li>Approved inspectors can claim eligible jobs from the Live Board.</li>
                <li>Until approval, the Live Board remains locked to prevent accidental claims.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-rim bg-surface p-5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-subtle">Current status</div>
              <div className={`mt-3 text-lg font-black ${copy.tone}`}>
                {justSubmitted ? 'Submitted for review' : copy.title}
              </div>
              <p className="mt-2 text-sm text-muted">{copy.detail}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {status === 'needs_info' ? (
              <Link
                href="/inspector/profile"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#C6A15B] px-5 py-4 text-sm font-black text-[#1B1508] hover:bg-[#D8B871]"
              >
                <FileText className="h-4 w-4" />
                Upload requested documents
              </Link>
            ) : status === 'draft' ? (
              <Link
                href="/inspector/signup"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#C6A15B] px-5 py-4 text-sm font-black text-[#1B1508] hover:bg-[#D8B871]"
              >
                <FileText className="h-4 w-4" />
                Return to onboarding
              </Link>
            ) : (
              status === 'approved' ? (
                <Link
                  href={user?.role === 'inspector' ? '/inspector' : '/sign-in?role=inspector'}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-electric px-5 py-4 text-sm font-black text-surface hover:opacity-90"
                >
                  <HardHat className="h-4 w-4" />
                  {user?.role === 'inspector' ? 'Go to Live Board' : 'Sign in to continue'}
                </Link>
              ) : (
                <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-warning-amber/30 bg-warning-amber/10 px-5 py-4 text-sm font-black text-warning-amber">
                  <Clock className="h-4 w-4" />
                  Waiting for Vero approval
                </div>
              )
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function InspectorOnboardingEntryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <InspectorOnboardingEntryInner />
    </Suspense>
  )
}
