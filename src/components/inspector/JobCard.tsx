'use client'

import React, { useState } from 'react'
import { MapPin, Clock, DollarSign, ChevronRight, RotateCcw, Star, Lock } from 'lucide-react'
import { TierBadge } from '@/components/ui/Badge'
import { JobDetailModal } from '@/components/inspector/JobDetailModal'
import { INSPECTION_STAGES } from '@/lib/mockData'
import type { EligibilityResult } from '@/lib/eligibility'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { useTheme } from '@/lib/theme'
import type { ClaimCommitment, InspectionJob, JobTimeSlot } from '@/lib/types'

interface JobCardProps {
  job: InspectionJob
  eligibility: EligibilityResult
  primaryEligibilityReason?: string
  onClaim: (jobId: string, slot?: JobTimeSlot, suggestedSlot?: JobTimeSlot, claimCommitment?: ClaimCommitment) => Promise<{ ok: boolean; error?: string }>
}

const DISC_COLOR: Record<string, string> = {
  structural:     'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300',
  geotech:        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300',
  electrical:     'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300',
  mechanical:     'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-300',
  architectural:  'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300',
  plumbing:       'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/15 dark:text-cyan-300',
  fire_protection:'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300',
}

function formatDisciplineLabel(discipline: string): string {
  return discipline
    .split('_')
    .filter(Boolean)
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

export function JobCard({ job, eligibility, primaryEligibilityReason, onClaim }: JobCardProps) {
  const [showDetail, setShowDetail] = useState(false)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const stage = INSPECTION_STAGES.find(s => s.id === job.stage)
  const hrlyRate = Math.round(job.offeredRate / (job.estimatedDuration / 60))
  const discColor = DISC_COLOR[job.requiredDiscipline] ?? (isDark
    ? 'border-slate-600 bg-slate-900 text-slate-300'
    : 'border-slate-300 bg-white text-slate-600')

  const handleClaim = async (jobId: string, slot?: JobTimeSlot, suggested?: JobTimeSlot, claimCommitment?: ClaimCommitment): Promise<{ ok: boolean; error?: string }> => {
    const result = await onClaim(jobId, slot, suggested, claimCommitment)
    if (result.ok) setShowDetail(false)
    return result
  }

  return (
    <>
      {/* ── Card ── */}
      <button
        onClick={() => setShowDetail(true)}
        className={`group w-full rounded-2xl border p-4 text-left shadow-sm transition-all duration-200 hover:translate-y-[-1px] ${
          isDark
            ? 'border-slate-700 bg-slate-800 hover:border-slate-600 hover:bg-slate-800/90'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {job.isReinspection && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-warning-amber/30 text-warning-amber bg-warning-amber/10 flex items-center gap-1">
                  <RotateCcw className="w-2.5 h-2.5" /> Re-inspect
                </span>
              )}
              <TierBadge tier={job.dispatchTier} />
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${discColor}`}>
                {formatDisciplineLabel(job.requiredDiscipline)}
              </span>
              {!eligibility.eligible && (
                <span className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                  isDark
                    ? 'border-slate-600 bg-slate-700/50 text-slate-300'
                    : 'border-slate-300 bg-slate-200 text-slate-700'
                }`}>
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
            </div>
            <h3 className="font-bold text-ink text-sm leading-tight">{job.projectName}</h3>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{job.address}, {job.city}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-xl font-black ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>{formatCurrency(job.offeredRate)}</div>
            <div className="text-[10px] text-muted">${hrlyRate}/hr</div>
          </div>
        </div>

        {/* Stage chip + time */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
            isDark
              ? 'border-slate-600 bg-slate-700/50 text-slate-300'
              : 'border-slate-300 bg-slate-200 text-slate-700'
          }`}>
            Stage {job.stage} · {stage?.shortName}
          </span>
          {job.availableSlots && job.availableSlots.length > 0 && (
            <span className="text-[10px] text-muted">
              {job.availableSlots.length} time window{job.availableSlots.length > 1 ? 's' : ''} available
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <StatCell icon={MapPin} val={`${job.distance} km`} sub="away" isDark={isDark} />
          <StatCell icon={Clock} val={`${job.estimatedDuration}m`} sub="est." isDark={isDark} />
          <StatCell icon={DollarSign} val={`$${hrlyRate}/hr`} sub="rate" green isDark={isDark} />
        </div>

        {!eligibility.eligible && primaryEligibilityReason && (
          <div className={`mb-3 rounded-xl border px-3 py-2 ${
            isDark ? 'border-slate-600 bg-slate-700/50' : 'border-slate-300 bg-slate-200'
          }`}>
            <div className="text-[11px] font-semibold text-electric">{primaryEligibilityReason}</div>
            <div className="text-[10px] text-subtle mt-0.5">Visible on the board, but claim is restricted to qualified inspectors.</div>
          </div>
        )}

        {/* Builder + time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {job.builderRating && (
              <div className="flex items-center gap-1 text-[10px] text-muted">
                <Star className="w-2.5 h-2.5 text-warning-amber fill-warning-amber" />
                {job.builderRating} builder
              </div>
            )}
            <span className="text-[10px] text-subtle">· {formatRelativeTime(job.requestedAt)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-flame group-hover:gap-2 transition-all">
            View Details <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </button>

      {/* Detail modal */}
      {showDetail && (
        <JobDetailModal
          job={job}
          eligibility={eligibility}
          onClose={() => setShowDetail(false)}
          onClaim={handleClaim}
        />
      )}
    </>
  )
}

function StatCell({ icon: Icon, val, sub, green, isDark }: {
  icon: React.ElementType; val: string; sub: string; green?: boolean; isDark: boolean
}) {
  return (
    <div className={`rounded-xl border p-2 text-center ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
      <Icon className="w-3 h-3 text-muted mx-auto mb-0.5" />
      <div className={`text-xs font-bold ${green ? (isDark ? 'text-emerald-300' : 'text-emerald-800') : 'text-ink'}`}>{val}</div>
      <div className="text-[9px] text-subtle">{sub}</div>
    </div>
  )
}
