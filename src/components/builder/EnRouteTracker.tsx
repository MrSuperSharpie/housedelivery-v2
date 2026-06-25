'use client'

import React from 'react'
import {
  X, CheckCircle2, Navigation, MapPin,
  BadgeCheck, FileText, Home,
  KeyRound, HardHat, ClipboardCheck, ShieldCheck,
} from 'lucide-react'

interface EnRouteTrackerProps {
  isOpen: boolean
  onClose: () => void
  inspector: {
    name: string
    designation: string
    license: string
    avatar: string
  }
  project: {
    name: string
    address: string
    stage: string
  }
}

// ─── Stage definitions ────────────────────────────────────────────────────────
//
// These describe the EXPECTED arrival sequence for an active assignment. Vero
// does not currently receive live inspector position, so only the confirmed
// status is asserted as real — the remaining steps are shown as what to expect,
// not as a live-tracked position.

type StageId = 'confirmed' | 'preparing' | 'en_route' | 'approaching' | 'on_site'

interface TrackStage {
  id: StageId
  label: string
  sub: string
  icon: React.ElementType
}

const STAGES: TrackStage[] = [
  {
    id:    'confirmed',
    label: 'Confirmed',
    sub:   'Inspector assigned and confirmed for this stage',
    icon:  CheckCircle2,
  },
  {
    id:    'preparing',
    label: 'Preparing',
    sub:   'Inspector reviews site documents before departure',
    icon:  FileText,
  },
  {
    id:    'en_route',
    label: 'En Route',
    sub:   'Inspector travels to your site',
    icon:  Navigation,
  },
  {
    id:    'approaching',
    label: 'Approaching',
    sub:   'Inspector nearing the site',
    icon:  MapPin,
  },
  {
    id:    'on_site',
    label: 'On Site',
    sub:   'Inspector arrives and begins the pre-safety check',
    icon:  Home,
  },
]

// The only status Vero can currently assert from assignment data is "confirmed".
const CURRENT_STAGE_IDX = 0

// ─── Site readiness checklist ────────────────────────────────────────────────
//
// Professional, generally-applicable coordination items. No location, no GPS,
// no movement — these prepare the builder for the inspector's scheduled visit.

const READINESS_ITEMS: { label: string; sub: string; icon: React.ElementType }[] = [
  {
    label: 'Site access available',
    sub:   'Confirm gates, lockboxes, or escorts are arranged for the scheduled visit',
    icon:  KeyRound,
  },
  {
    label: 'PPE on site',
    sub:   'Required personal protective equipment is available on arrival',
    icon:  HardHat,
  },
  {
    label: 'Work ready for review',
    sub:   'The stage scope is complete and accessible for inspection',
    icon:  ClipboardCheck,
  },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export function EnRouteTracker({
  isOpen,
  onClose,
  inspector,
  project,
}: EnRouteTrackerProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-md bg-surface border border-white/8 rounded-t-3xl sm:rounded-2xl shadow-card-lg overflow-hidden max-h-[95vh] flex flex-col">

        {/* Handle */}
        <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mt-3 mb-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5 shrink-0">
          <div>
            <div className="font-black text-ink text-base">Inspector Arrival Status</div>
            <div className="text-xs text-muted mt-0.5 truncate max-w-[240px]">{project.name} · {project.stage}</div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 bg-raised rounded-xl flex items-center justify-center text-muted hover:text-ink transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* ── Inspector card (real assignment data) ── */}
          <div className="card-dark rounded-2xl p-4 inset-top flex items-center gap-4">
            <div className="w-14 h-14 bg-flame/15 border border-flame/25 rounded-2xl flex items-center justify-center font-black text-flame text-lg shrink-0">
              {inspector.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-ink text-sm">{inspector.name}</span>
                <BadgeCheck className="w-3.5 h-3.5 text-electric shrink-0" />
              </div>
              <div className="text-xs font-mono text-muted mt-0.5 truncate">
                {inspector.license}{inspector.designation ? ` · ${inspector.designation}` : ''}
              </div>
            </div>
          </div>

          {/* ── Arrival status (honest, not a live countdown) ── */}
          <div className="card-dark rounded-2xl p-4 inset-top">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="label-mono mb-0.5">Arrival</div>
                <div className="text-2xl font-black text-ink">Scheduled</div>
              </div>
              <div className="text-right">
                <div className="label-mono mb-0.5">Address</div>
                <div className="text-xs font-semibold text-ink max-w-[140px] text-right leading-tight">{project.address}</div>
              </div>
            </div>
            <div className="text-[11px] text-muted leading-relaxed">
              This status is based on assignment updates, not live location tracking.
            </div>
          </div>

          {/* ── Site readiness / arrival coordination ── */}
          <div className="card-dark rounded-2xl p-4 inset-top">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-flame" />
              <div className="label-mono">Site Readiness</div>
            </div>

            {/* Assignment summary (real data) */}
            <div className="rounded-xl border border-white/6 bg-panel/60 p-3 mb-3 space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-flame mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-subtle">Site</div>
                  <div className="text-xs font-semibold text-ink leading-snug">{project.address}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ClipboardCheck className="w-3.5 h-3.5 text-flame mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-subtle">Stage</div>
                  <div className="text-xs font-semibold text-ink leading-snug">{project.stage}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <BadgeCheck className="w-3.5 h-3.5 text-electric mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-subtle">Inspector</div>
                  <div className="text-xs font-semibold text-ink leading-snug">{inspector.name} · Confirmed</div>
                </div>
              </div>
            </div>

            {/* Readiness reminders (generally applicable) */}
            <div className="space-y-2.5">
              {READINESS_ITEMS.map(item => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg border border-white/8 bg-surface flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-muted" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-ink">{item.label}</div>
                      <div className="text-[11px] text-muted leading-relaxed">{item.sub}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-muted leading-relaxed">
              Next update will appear when the inspection status changes.
            </div>
          </div>

          {/* ── Status timeline (expected sequence) ── */}
          <div className="card-dark rounded-2xl p-4 inset-top">
            <div className="flex items-center justify-between mb-4">
              <div className="label-mono">Arrival Steps</div>
              <span className="text-[10px] font-semibold text-subtle">Expected sequence</span>
            </div>
            <div className="space-y-0">
              {STAGES.map((stage, idx) => {
                const isDone    = idx < CURRENT_STAGE_IDX
                const isCurrent = idx === CURRENT_STAGE_IDX
                const Icon      = stage.icon
                const isLast    = idx === STAGES.length - 1

                return (
                  <div key={stage.id} className="flex gap-3">
                    {/* Spine + icon */}
                    <div className="flex flex-col items-center">
                      <div className={`
                        w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300
                        ${isDone    ? 'bg-success-green border-success-green' : ''}
                        ${isCurrent ? 'border-flame bg-flame/10' : ''}
                        ${!isDone && !isCurrent ? 'border-white/10 bg-surface' : ''}
                      `}>
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        ) : isCurrent ? (
                          <Icon className="w-4 h-4 text-flame" />
                        ) : (
                          <Icon className="w-3.5 h-3.5 text-subtle" />
                        )}
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 h-6 mt-1 mb-1 rounded-full transition-all duration-300 ${
                          isDone ? 'bg-success-green' : 'bg-white/8'
                        }`} />
                      )}
                    </div>

                    {/* Text */}
                    <div className={`pb-5 flex-1 min-w-0 ${isLast ? 'pb-0' : ''}`}>
                      <div className={`text-sm font-bold ${
                        isCurrent ? 'text-flame' :
                        isDone    ? 'text-success-green' :
                                    'text-muted'
                      }`}>{stage.label}</div>
                      <div className={`text-xs mt-0.5 leading-relaxed ${
                        isCurrent ? 'text-muted' : 'text-subtle'
                      }`}>{stage.sub}</div>
                      {isCurrent && (
                        <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-flame/20 bg-flame/10 px-1.5 py-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-flame">Current status</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-white/5 px-5 py-4 bg-surface/95 backdrop-blur-sm shrink-0">
          <button onClick={onClose}
            className="w-full border border-white/10 bg-panel hover:bg-raised text-ink font-bold py-3 rounded-2xl text-sm transition-all">
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
