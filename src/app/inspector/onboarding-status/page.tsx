'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HardHat, CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react'
import { BrandWordmark } from '@/components/shared/Navbar'
import { useAuth } from '@/lib/auth'
import { isInspectorTestModeEnabled } from '@/lib/inspectorTestMode'
import { getInspectorOnboardingStatus, getInspectorOnboardingStatusAsync } from '@/lib/persistence/inspectorOnboarding'
import type { InspectorOnboardingStatus } from '@/lib/types'

const STATUS_CONFIG: Record<InspectorOnboardingStatus, { label: string; desc: string; icon: React.ElementType; className: string }> = {
  draft:          { label: 'Draft',           desc: 'Complete your application to submit for review.',                    icon: FileText,   className: 'text-muted' },
  submitted:      { label: 'Waiting for approval', desc: 'Your application is under Vero review. You do not need to restart onboarding.', icon: Clock, className: 'text-warning-amber' },
  under_review:  { label: 'Waiting for approval', desc: 'Vero is verifying your credentials and documents. You do not need to restart onboarding.', icon: Clock, className: 'text-warning-amber' },
  needs_info:    { label: 'More info needed', desc: 'Vero has requested additional information. Check your email.',   icon: AlertCircle, className: 'text-warning-amber' },
  approved:      { label: 'Approved',         desc: 'You can access the Live Board and apply to jobs.',                    icon: CheckCircle2, className: 'text-success-green' },
  rejected:      { label: 'Not approved',     desc: 'Your application was not approved. Contact support for details.',   icon: AlertCircle, className: 'text-fail-red' },
  suspended:     { label: 'Suspended',        desc: 'Your access is temporarily suspended. Contact support.',            icon: AlertCircle, className: 'text-fail-red' },
}

export default function InspectorOnboardingStatusPage() {
  const router = useRouter()
  const { user } = useAuth()
  const inspectorTestOverride = isInspectorTestModeEnabled(user)
  const [status, setStatus] = useState<InspectorOnboardingStatus>(() => getInspectorOnboardingStatus())

  useEffect(() => {
    if (!user?.id) return
    getInspectorOnboardingStatusAsync(user.id, user.supabaseId).then(setStatus)
  }, [user?.id, user?.supabaseId])

  // If approved and logged in as inspector, redirect to Live Board
  useEffect(() => {
    if (user?.role === 'inspector' && (status === 'approved' || inspectorTestOverride)) {
      router.replace('/inspector')
    }
  }, [inspectorTestOverride, user?.role, status, router])

  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon

  return (
    <div className="min-h-screen bg-[#0A192F] flex flex-col">
      <div className="border-b border-blue-900 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <BrandWordmark className="max-w-[130px]" height={32} priority theme="dark" />
          {user?.role === 'inspector' ? (
            <Link href="/inspector" className="text-xs text-blue-500 hover:text-electric transition-colors">
              Live Board →
            </Link>
          ) : (
            <Link href="/sign-in?role=inspector" className="text-xs text-[#FF5F15] font-semibold hover:underline">
              Sign in
            </Link>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-md mx-auto">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${status === 'approved' ? 'bg-success-green/20' : 'bg-blue-900/50'}`}>
          <Icon className={`w-8 h-8 ${cfg.className}`} />
        </div>
        <h1 className="text-2xl font-black text-white text-center mb-2">Inspector application status</h1>
        <p className={`text-sm font-semibold ${cfg.className} text-center mb-6`}>{cfg.label}</p>
        <p className="text-sm text-blue-400 text-center mb-8">{cfg.desc}</p>

        <div className="bg-[#0d2137] border border-blue-900 rounded-2xl p-5 w-full text-left mb-8">
          <div className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-3">How it works</div>
          <ul className="space-y-2.5 text-sm text-blue-300">
            <li className="flex items-start gap-2">
              <span className="text-[#FF5F15] font-bold shrink-0">1.</span>
              Vero reviews your credentials and documents first (not the builder).
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#FF5F15] font-bold shrink-0">2.</span>
              Once approved, you get access to the Live Board and can apply to jobs.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#FF5F15] font-bold shrink-0">3.</span>
              Builders only see and review applicants after you apply to their specific job.
            </li>
          </ul>
        </div>

        {status === 'approved' ? (
          <Link
            href="/inspector"
            className="w-full flex items-center justify-center gap-2 bg-[#FF5F15] text-white font-bold py-4 rounded-xl hover:opacity-90 transition-opacity"
          >
            <HardHat className="w-5 h-5" /> Go to Live Board
          </Link>
        ) : user?.role === 'inspector' && status === 'needs_info' ? (
          <Link
            href="/inspector/profile"
            className="w-full flex items-center justify-center gap-2 bg-[#FF5F15] text-white font-bold py-4 rounded-xl hover:opacity-90 transition-opacity"
          >
            <FileText className="w-5 h-5" /> Upload requested documents
          </Link>
        ) : user?.role === 'inspector' && (status === 'submitted' || status === 'under_review') ? (
          <Link
            href="/inspector/onboarding"
            className="w-full flex items-center justify-center gap-2 bg-electric text-[#0A192F] font-bold py-4 rounded-xl hover:opacity-90 transition-opacity"
          >
            <Clock className="w-5 h-5" /> Back to approval page
          </Link>
        ) : (
          <div className="flex flex-col gap-3 w-full">
            <Link
              href="/sign-in?role=inspector"
              className="w-full flex items-center justify-center gap-2 bg-electric text-[#0A192F] font-bold py-4 rounded-xl hover:opacity-90 transition-opacity"
            >
              Sign in to check status
            </Link>
            <Link href="/" className="text-center text-sm text-blue-500 hover:text-blue-400 transition-colors">
              Back to home
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
