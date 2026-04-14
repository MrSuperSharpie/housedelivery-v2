'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Building2, HardHat, Eye, ChevronLeft, CheckCircle2 } from 'lucide-react'
import { BrandWordmark } from '@/components/shared/Navbar'

const ROLES = [
  {
    id:          'builder',
    Icon:        Building2,
    label:       'Builder / Developer',
    tagline:     'Post inspection requests and track your projects',
    color:       'border-flame/40 hover:border-flame bg-flame/5',
    iconBg:      'bg-flame/15 border-flame/25 text-flame',
    ctaColor:    'bg-flame hover:bg-flame-light text-white',
    perks: [
      'Post inspection requests in under 2 minutes',
      'Vero assigns the appropriate inspector automatically',
      'Live tracking when your inspector is en route',
      'Escrow-protected payments — released on approval',
      'Schedule C-B letters auto-generated and archived',
    ],
  },
  {
    id:          'inspector',
    Icon:        HardHat,
    label:       'Certified Professional',
    tagline:     'Browse open jobs and conduct inspections',
    color:       'border-electric/40 hover:border-electric bg-electric/5',
    iconBg:      'bg-electric/15 border-electric/25 text-electric',
    ctaColor:    'bg-electric hover:opacity-90 text-surface',
    perks: [
      'Browse open requests matched to your credentials',
      'Set your availability — builder confirms the slot',
      'GPS-verified on-site check-in and evidence archive',
      'Digital seal generates Schedule C-B automatically',
      'Paid within 24 hrs of builder escrow release',
    ],
  },
  {
    id:          'auditor',
    Icon:        Eye,
    label:       'City Auditor',
    tagline:     'Access the inspection vault',
    color:       'border-white/15 hover:border-white/30 bg-white/3',
    iconBg:      'bg-white/10 border-white/15 text-muted',
    ctaColor:    'bg-white/10 hover:bg-white/15 text-ink border border-white/15',
    perks: [
      'Read-only access to sealed inspection records',
      'Filter records by project, date, inspector, or jurisdiction',
      'Download Schedule C-B letters and evidence packages',
      'Verified record integrity and audit trail for archives',
      'Built to support municipal review workflows',
    ],
  },
]

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="border-b border-white/5 px-4 sm:px-6 py-4 flex items-center gap-4">
        <BrandWordmark className="max-w-[130px]" height={32} priority theme="dark" />
        <Link href="/" className="ml-auto flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 bg-flame/10 border border-flame/20 text-flame text-xs font-bold px-3 py-1.5 rounded-full mb-5">
            <div className="w-1.5 h-1.5 bg-flame rounded-full animate-pulse" />
            Create your account
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-ink mb-3">
            Who are you building with?
          </h1>
          <p className="text-muted text-base max-w-lg mx-auto">
            Vero connects builders, certified professionals, and city auditors on a single verified platform.
            Select your role to get started.
          </p>
        </div>

        {/* Role cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {ROLES.map(role => {
            const Icon = role.Icon
            return (
              <div key={role.id} className={`rounded-2xl border-2 p-6 transition-all flex flex-col ${role.color}`}>
                {/* Icon */}
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-4 ${role.iconBg}`}>
                  <Icon className="w-6 h-6" />
                </div>

                {/* Label */}
                <div className="font-black text-ink text-base mb-1">{role.label}</div>
                <div className="text-sm text-muted mb-5 leading-relaxed">{role.tagline}</div>

                {/* Perks */}
                <ul className="space-y-2 mb-6 flex-1">
                  {role.perks.map((perk, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success-green mt-0.5 shrink-0" />
                      <span className="text-xs text-muted leading-snug">{perk}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link href={`/sign-in?role=${role.id}`}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${role.ctaColor}`}>
                  Continue as {role.label.split(' ')[0]}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-subtle">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-flame hover:underline font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
