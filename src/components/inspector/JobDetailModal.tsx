'use client'

import React, { useState } from 'react'
import {
  X, MapPin, Clock, DollarSign, CheckCircle2, Star,
  HardHat, AlertTriangle, Calendar, ChevronRight,
  Building2, Layers, Package,
  MessageSquare, RotateCcw, Zap, Lock, Share2
} from 'lucide-react'
import { INSPECTION_STAGES } from '@/lib/mockData'
import type { EligibilityResult } from '@/lib/eligibility'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import type { InspectionJob, JobTimeSlot } from '@/lib/types'
import { calculatePricingBreakdown } from '@/utils/pricing'

interface JobDetailModalProps {
  job: InspectionJob
  eligibility: EligibilityResult
  onClose: () => void
  onClaim: (jobId: string, slot?: JobTimeSlot, suggestedSlot?: JobTimeSlot) => Promise<{ ok: boolean; error?: string }>
}

type ClaimStep = 'detail' | 'schedule' | 'suggest' | 'confirming'

const DISCIPLINE_COLOR: Record<string, string> = {
  structural:    'text-orange-300 bg-orange-500/15 border-orange-500/25',
  geotech:       'text-yellow-300 bg-yellow-500/15 border-yellow-500/25',
  electrical:    'text-blue-300   bg-blue-500/15   border-blue-500/25',
  mechanical:    'text-purple-300 bg-purple-500/15 border-purple-500/25',
  architectural: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/25',
  plumbing:      'text-cyan-300   bg-cyan-500/15   border-cyan-500/25',
}

const TIER_META = {
  standard:  { label: 'Standard',  cls: 'text-muted  bg-white/5  border-white/10', time: '5–7 business days' },
  priority:  { label: 'Priority',  cls: 'text-warning-amber bg-warning-amber/10 border-warning-amber/20', time: '2–3 business days' },
  emergency: { label: 'Emergency', cls: 'text-fail-red bg-fail-red/10 border-fail-red/20', time: 'Within 24 hrs / next day' },
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'long', month: 'short', day: 'numeric'
  })
}

function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${m.toString().padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`
}

const SUGGEST_TIMES = [
  '07:00','07:30','08:00','08:30','09:00','09:30',
  '10:00','10:30','11:00','11:30','12:00','12:30',
  '13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30',
]

function nextDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + 1)
    return d.toISOString().slice(0, 10)
  })
}

export function JobDetailModal({ job, eligibility, onClose, onClaim }: JobDetailModalProps) {
  const [step, setStep]               = useState<ClaimStep>('detail')
  const [selectedSlot, setSelectedSlot] = useState<JobTimeSlot | null>(null)
  const [suggestDate, setSuggestDate] = useState('')
  const [suggestStart, setSuggestStart] = useState('')
  const [suggestEnd, setSuggestEnd]   = useState('')
  const [suggestNote, setSuggestNote] = useState('')
  const [claimError, setClaimError]   = useState<string | null>(null)
  const [shareFeedback, setShareFeedback] = useState<string | null>(null)

  const stage = INSPECTION_STAGES.find(s => s.id === job.stage)
  const tierMeta = TIER_META[job.dispatchTier]
  const discColor = DISCIPLINE_COLOR[job.requiredDiscipline] ?? 'text-muted bg-white/5 border-white/10'
  const pricing = calculatePricingBreakdown({ dispatchTier: job.dispatchTier })
  const hrlyRate = Math.round(pricing.inspectorPayout / (job.estimatedDuration / 60))
  const days = nextDays(14)

  const flexibleClaimSlot: JobTimeSlot = {
    date: '',
    startTime: '',
    endTime: '',
    flexible: true,
  }

  const primaryLockReason = eligibility.reasons[0] ?? 'Claim restricted to qualified inspectors'

  const handleSharePosting = async () => {
    const shareUrl = `${window.location.origin}/inspector?job=${job.id}`
    const shareData = {
      title: `${job.projectName} · ${job.requiredDiscipline}`,
      text: `${job.projectName} in ${job.city} is live on Vero.`,
      url: shareUrl,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        setShareFeedback('Posting shared')
        return
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        setShareFeedback('Share link copied')
        return
      }

      setShareFeedback('Sharing not available on this device')
    } catch {
      setShareFeedback('Could not share this posting')
    }
  }

  const handleConfirmSlot = async () => {
    if (!eligibility.eligible) {
      setClaimError(primaryLockReason)
      return
    }
    const slotToClaim = selectedSlot ?? flexibleClaimSlot
    setClaimError(null)
    setStep('confirming')
    const result = await onClaim(job.id, slotToClaim)
    if (!result || !result.ok) {
      setStep('schedule')
      setClaimError(result?.error ?? 'Could not claim this job. Please try again.')
    }
  }

  const handleConfirmSuggest = async () => {
    if (!eligibility.eligible) {
      setClaimError(primaryLockReason)
      return
    }
    if (!suggestDate || !suggestStart || !suggestEnd) return
    setClaimError(null)
    setStep('confirming')
    const result = await onClaim(job.id, {
      date: suggestDate,
      startTime: suggestStart,
      endTime: suggestEnd,
    })
    if (!result || !result.ok) {
      setStep('suggest')
      setClaimError(result?.error ?? 'Could not claim this job. Please try again.')
    }
  }

  // ── CONFIRMING ──────────────────────────────────────────────────────────────
  if (step === 'confirming') {
    return (
      <ModalShell onClose={onClose}>
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="w-16 h-16 border-2 border-flame/30 border-t-flame rounded-full animate-spin mb-6" />
          <div className="font-bold text-ink text-lg mb-1">Claiming slot…</div>
          <div className="text-sm text-muted text-center">Creating provisional assignment…</div>
        </div>
      </ModalShell>
    )
  }

  // ── SUGGEST TIME ────────────────────────────────────────────────────────────
  if (step === 'suggest') {
    return (
      <ModalShell onClose={onClose} onBack={() => setStep('schedule')} title="Suggest a Time">
        <div className="p-5 space-y-5">
          <p className="text-sm text-muted">Propose a time that works for you. If you claim it, the assignment becomes provisional immediately and the builder keeps only governed objection rights.</p>
          {claimError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {claimError}
            </div>
          )}

          {/* Date picker */}
          <div>
            <div className="label-mono mb-2">Date</div>
            <div className="flex gap-1.5 overflow-x-auto pb-2">
              {days.slice(0, 10).map(d => (
                <button key={d} onClick={() => setSuggestDate(d)}
                  className={`min-w-[52px] shrink-0 rounded-xl px-3 py-2.5 text-center transition-all focus:outline-none focus:ring-2 focus:ring-flame/30 ${
                    suggestDate === d ? 'bg-flame text-white' : 'bg-panel border border-white/8 text-muted hover:text-ink hover:border-white/15'
                  }`}>
                  <div className="text-[10px] font-semibold">{new Date(d+'T12:00:00').toLocaleDateString('en-CA',{weekday:'short'})}</div>
                  <div className="font-black text-sm">{new Date(d+'T12:00:00').getDate()}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label-mono mb-2">From</div>
              <select value={suggestStart} onChange={e => setSuggestStart(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-panel px-3 py-3 text-sm text-ink focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/20">
                <option value="">Select…</option>
                {SUGGEST_TIMES.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
              </select>
            </div>
            <div>
              <div className="label-mono mb-2">To</div>
              <select value={suggestEnd} onChange={e => setSuggestEnd(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-panel px-3 py-3 text-sm text-ink focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/20">
                <option value="">Select…</option>
                {SUGGEST_TIMES.filter(t => !suggestStart || t > suggestStart).map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
              </select>
            </div>
          </div>

          {/* Note */}
          <div>
            <div className="label-mono mb-2">Note to builder (optional)</div>
            <textarea value={suggestNote} onChange={e => setSuggestNote(e.target.value)}
              placeholder="e.g. I can do earlier if needed — just let me know"
              rows={3}
              className="w-full resize-none rounded-xl border border-white/8 bg-panel px-3 py-2.5 text-sm text-ink placeholder-subtle focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/20" />
          </div>

          <button
            onClick={handleConfirmSuggest}
            disabled={!suggestDate || !suggestStart || !suggestEnd}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-flame py-4 font-bold text-white transition-all hover:bg-flame-light focus:outline-none focus:ring-2 focus:ring-flame/30 disabled:cursor-not-allowed disabled:opacity-45 disabled:text-white/80">
            <Calendar className="w-4 h-4" />
            Send Time Suggestion
          </button>
        </div>
      </ModalShell>
    )
  }

  // ── SCHEDULE SELECTION ──────────────────────────────────────────────────────
  if (step === 'schedule') {
    return (
      <ModalShell onClose={onClose} onBack={() => setStep('detail')} title="Pick a Time">
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted">Select a time slot to claim this job. Your assignment is provisional — the builder has a limited window to raise an objection.</p>
          {claimError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {claimError}
            </div>
          )}

          {job.availableSlots && job.availableSlots.length > 0 ? (
            <div className="space-y-2.5">
              {job.availableSlots.map((slot, i) => {
                const isSelected = selectedSlot?.date === slot.date && selectedSlot?.startTime === slot.startTime
                return (
                  <button key={i} onClick={() => setSelectedSlot(isSelected ? null : slot)}
                    className={`w-full rounded-2xl border-2 p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-flame/30 ${
                      isSelected ? 'border-flame bg-flame/10' : 'border-white/8 bg-panel hover:border-white/20 hover:bg-raised'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-ink">{fmtDate(slot.date)}</div>
                        <div className="text-sm text-muted mt-0.5">
                          {fmtTime(slot.startTime)} – {fmtTime(slot.endTime)}
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-flame border-flame' : 'border-subtle'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="bg-panel border border-white/8 rounded-xl p-4 text-center">
              <div className="text-sm text-muted">Builder hasn&apos;t set specific availability — any time works.</div>
            </div>
          )}

          {/* Separator */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-xs text-subtle">or</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Suggest different time */}
          <button onClick={() => setStep('suggest')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-panel py-3.5 text-sm font-bold text-ink transition-all hover:bg-raised focus:outline-none focus:ring-2 focus:ring-flame/20">
            <Calendar className="w-4 h-4 text-muted" />
            Suggest a Different Time
          </button>

          {/* Confirm selected slot */}
          <button
            onClick={handleConfirmSlot}
            disabled={!selectedSlot && !!job.availableSlots && job.availableSlots.length > 0}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-success-green py-4 text-base font-black text-white transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-success-green/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:text-white/80">
            <CheckCircle2 className="w-5 h-5" />
            {selectedSlot
              ? `Claim — ${fmtDate(selectedSlot.date)}, ${fmtTime(selectedSlot.startTime)}`
              : (!job.availableSlots || job.availableSlots.length === 0)
                ? 'Claim Instantly — Flexible Timing'
                : 'Select a time to claim'}
          </button>
        </div>
      </ModalShell>
    )
  }

  // ── MAIN DETAIL VIEW ────────────────────────────────────────────────────────
  return (
    <ModalShell onClose={onClose}>
      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4 border-b border-white/5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${tierMeta.cls}`}>
                {tierMeta.label} · {tierMeta.time}
              </span>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border capitalize ${discColor}`}>
                {job.requiredDiscipline}
              </span>
              {job.isReinspection && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-lg border text-warning-amber bg-warning-amber/10 border-warning-amber/20 flex items-center gap-1">
                  <RotateCcw className="w-2.5 h-2.5" /> Re-inspection
                </span>
              )}
            </div>
            <h2 className="font-black text-ink text-lg leading-tight">{job.projectName}</h2>
            <div className="flex items-center gap-1 text-muted text-xs mt-1">
              <MapPin className="w-3 h-3 shrink-0" />
              {job.address}, {job.city}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-black text-success-green">{formatCurrency(pricing.inspectorPayout)}</div>
            <div className="text-xs text-muted">${hrlyRate}/hr est.</div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Clock,    val: `${job.estimatedDuration}m`,          sub: 'est. duration' },
            { icon: MapPin,   val: `${job.distance} km`,                 sub: 'from you' },
            { icon: Layers,   val: `Stage ${job.stage}`,                 sub: job.stageName.split(' ')[0] },
            { icon: Calendar, val: `${job.availableSlots?.length ?? 0}`, sub: 'time windows' },
          ].map(({ icon: Icon, val, sub }) => (
            <div key={sub} className="bg-raised border border-white/5 rounded-xl p-2 text-center">
              <Icon className="w-3.5 h-3.5 text-muted mx-auto mb-1" />
              <div className="font-bold text-ink text-sm">{val}</div>
              <div className="text-[9px] text-subtle">{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="overflow-y-auto max-h-[55vh] px-5 py-4 space-y-5">

        {/* Site details */}
        <Section title="Site Details" icon={Building2}>
          <Row label="Project Type"  val={job.projectType ?? '—'} />
          <Row label="Permit #"      val={job.permitNumber ?? '—'} mono />
          <Row label="Stage"         val={`Stage ${job.stage} — ${job.stageName}`} />
          <Row label="Discipline"    val={job.requiredDiscipline.charAt(0).toUpperCase() + job.requiredDiscipline.slice(1)} />
          <Row label="Posted"        val={formatRelativeTime(job.requestedAt)} />
        </Section>

        {/* Re-inspection context */}
        {job.isReinspection && job.previousFailNotes && (
          <Section title="Previous Fails to Re-Inspect" icon={RotateCcw} accent="border-warning-amber/30 bg-warning-amber/5">
            {job.previousFailNotes.map((note, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-warning-amber mt-0.5 shrink-0" />
                <span className="text-xs text-ink">{note}</span>
              </div>
            ))}
          </Section>
        )}

        {/* Checklist preview */}
        <Section title={`Stage ${job.stage} Checklist Preview`} icon={CheckCircle2}>
          <div className="space-y-1.5">
            {stage?.items.slice(0, 4).map(item => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-subtle shrink-0" />
                <span className="text-xs text-muted">{item.label}</span>
              </div>
            ))}
            {(stage?.items.length ?? 0) > 4 && (
              <div className="text-xs text-subtle pl-3.5">+ {(stage?.items.length ?? 0) - 4} more items</div>
            )}
          </div>
        </Section>

        {/* Builder notes */}
        {job.builderNotes && (
          <Section title="Builder's Site Notes" icon={MessageSquare} accent={job.builderNotes.includes('urgent') || job.builderNotes.includes('MUST') ? 'border-fail-red/30 bg-fail-red/5' : undefined}>
            <p className="text-sm text-ink leading-relaxed">{job.builderNotes}</p>
          </Section>
        )}

        {/* Builder profile */}
        <Section title="Builder Profile" icon={HardHat}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-flame/15 border border-flame/25 rounded-xl flex items-center justify-center font-black text-flame text-sm shrink-0">
              {(job.builderName ?? 'B').charAt(0)}
            </div>
            <div>
              <div className="font-bold text-ink text-sm">{job.builderName ?? '—'}</div>
              <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                <Star className="w-3 h-3 text-warning-amber fill-warning-amber" />
                <span>{job.builderRating}</span>
                <span className="text-subtle">·</span>
                <span>{job.builderCompletedJobs} inspections completed</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Payout breakdown */}
        <Section title="Payout Breakdown" icon={DollarSign}>
          <Row label="Base rate"             val={formatCurrency(pricing.baseFee)} />
          <Row label={`${job.dispatchTier} multiplier`} val={`×${pricing.multiplier.toFixed(1)}`} />
          {pricing.priorityAdjustment > 0 && (
            <Row label="Priority adjustment" val={formatCurrency(pricing.priorityAdjustment)} />
          )}
          <Row label="Total transaction volume" val={formatCurrency(pricing.totalTransactionVolume)} />
          <Row label="Vero commission (10%)" val={formatCurrency(pricing.platformCommission)} />
          <Row label="Inspector payout"      val={formatCurrency(pricing.inspectorPayout)} highlight />
          <Row label="Estimated duration"    val={`${job.estimatedDuration} min (~${(job.estimatedDuration/60).toFixed(1)}h)`} />
          <Row label="Effective hourly rate" val={`$${hrlyRate}/hr`} highlight />
          <div className="pt-1 border-t border-white/5 mt-1">
            <div className="text-xs text-muted flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-success-green" />
              Paid within 24 hours of builder releasing escrow
            </div>
          </div>
        </Section>

        {/* Required gear */}
        {job.requiredGear && job.requiredGear.length > 0 && (
          <Section title="Required Gear / Bring to Site" icon={Package}>
            <div className="flex flex-wrap gap-1.5">
              {job.requiredGear.map(g => (
                <span key={g} className="text-xs font-semibold px-2.5 py-1 bg-raised border border-white/8 rounded-lg text-muted">
                  {g}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Builder availability */}
        <Section title="Builder's Available Windows" icon={Calendar}>
          {job.availableSlots && job.availableSlots.length > 0 ? (
            <div className="space-y-2">
              {job.availableSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-3 bg-raised border border-white/5 rounded-xl px-3 py-2.5">
                  <div className="w-7 h-7 bg-flame/10 rounded-lg flex items-center justify-center text-xs font-black text-flame">
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-ink">{fmtDate(slot.date)}</div>
                    <div className="text-xs text-muted">{fmtTime(slot.startTime)} – {fmtTime(slot.endTime)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">
              {job.dispatchTier === 'emergency'
                ? 'Emergency dispatch — no windows set. Checklist is unlocked for city staff; confirm you can attend within 24 hours.'
                : 'No specific windows set — builder is flexible.'}
            </p>
          )}
        </Section>

        {!eligibility.eligible && (
          <Section title="Claim Eligibility" icon={Lock} accent="border-electric/20 bg-electric/5">
            <div className="space-y-2">
              <div className="text-sm font-bold text-electric">{primaryLockReason}</div>
              {eligibility.reasons.length > 1 && (
                <div className="space-y-1">
                  {eligibility.reasons.slice(1).map(reason => (
                    <div key={reason} className="text-xs text-muted">{reason}</div>
                  ))}
                </div>
              )}
              <p className="text-xs text-subtle">
                This project stays visible so you can monitor market activity and share it with a qualified colleague, but only qualified inspectors can claim it.
              </p>
            </div>
          </Section>
        )}
      </div>

      {/* ── Sticky CTA ── */}
      <div className="border-t border-white/5 px-5 py-4 bg-surface/95 backdrop-blur-sm">
        {!eligibility.eligible ? (
          <>
            <button
              type="button"
              disabled
              className="w-full bg-electric/20 text-electric font-black py-4 rounded-2xl text-base border border-electric/20 cursor-not-allowed flex items-center justify-center gap-2.5"
            >
              <Lock className="w-5 h-5" />
              Claim Locked — {primaryLockReason}
            </button>
            <button
              type="button"
              onClick={handleSharePosting}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-panel py-3.5 text-sm font-bold text-ink transition-all hover:bg-raised focus:outline-none focus:ring-2 focus:ring-flame/20"
            >
              <Share2 className="w-4 h-4 text-muted" />
              Share This Posting
            </button>
            <p className="text-center text-xs text-subtle mt-2">
              {shareFeedback ?? 'Visible to you for discovery, but governed claim rules stay strict.'}
            </p>
          </>
        ) : job.dispatchTier === 'emergency' && (!job.availableSlots || job.availableSlots.length === 0) ? (
          <>
            <button
              onClick={handleConfirmSlot}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-fail-red/90 py-4 text-base font-black text-white transition-all hover:bg-fail-red focus:outline-none focus:ring-2 focus:ring-fail-red/30">
              <Zap className="w-5 h-5" />
              Claim Emergency Slot — respond within 24h · {formatCurrency(job.offeredRate)}
            </button>
            <p className="text-center text-xs text-subtle mt-2">
              Checklist already unlocked for city staff · No scheduling delay
            </p>
          </>
        ) : (
          <>
            <button onClick={() => setStep('schedule')}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-flame py-4 text-base font-black text-white transition-all hover:bg-flame-light focus:outline-none focus:ring-2 focus:ring-flame/30">
              <CheckCircle2 className="w-5 h-5" />
              Claim This Slot — {formatCurrency(job.offeredRate)}
              <ChevronRight className="w-4 h-4" />
            </button>
            <p className="text-center text-xs text-subtle mt-2">
              Claim instantly · Builder has a limited objection window
            </p>
          </>
        )}
      </div>
    </ModalShell>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModalShell({ children, onClose, onBack, title }: {
  children: React.ReactNode
  onClose: () => void
  onBack?: () => void
  title?: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative flex max-h-[95vh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/8 bg-surface shadow-card-lg animate-slide-up sm:max-w-lg sm:rounded-2xl">
        {/* Handle bar / header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-white/5 shrink-0">
          <div className="w-12 h-1 bg-white/10 rounded-full mx-auto sm:hidden absolute top-2 left-1/2 -translate-x-1/2" />
          {onBack ? (
            <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-ink focus:outline-none focus:ring-2 focus:ring-flame/20 rounded-lg px-1.5 py-1">
              ← Back
            </button>
          ) : (
            <div />
          )}
          {title && <span className="text-sm font-bold text-ink">{title}</span>}
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl bg-raised text-muted transition-all hover:text-ink focus:outline-none focus:ring-2 focus:ring-flame/20">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, children, accent }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  accent?: string
}) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ?? 'border-white/8 bg-panel'}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5 text-flame" />
        <span className="label-mono">{title}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ label, val, mono, highlight }: { label: string; val: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-muted shrink-0">{label}</span>
      <span className={`text-xs text-right ${mono ? 'font-mono' : 'font-semibold'} ${highlight ? 'text-success-green font-bold' : 'text-ink'}`}>
        {val}
      </span>
    </div>
  )
}
