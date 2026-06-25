'use client'

import React from 'react'
import {
  X, CheckCircle2, Navigation, MapPin,
  BadgeCheck, FileText, Home,
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

// ─── Static route preview ────────────────────────────────────────────────────
//
// A stylised, non-live route illustration. No coordinates, no GPS, no movement.

function RoutePreviewMap() {
  return (
    <div className="relative w-full h-48 bg-[#060B14] rounded-2xl overflow-hidden border border-white/6">
      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {[0.18, 0.38, 0.58, 0.77].map((y, i) => (
          <line key={`h${i}`}
            x1="0" y1={`${y * 100}%`} x2="100%" y2={`${y * 100}%`}
            stroke="#1a2744" strokeWidth="1.5" />
        ))}
        {[0.14, 0.34, 0.55, 0.72, 0.88].map((x, i) => (
          <line key={`v${i}`}
            x1={`${x * 100}%`} y1="0" x2={`${x * 100}%`} y2="100%"
            stroke="#1a2744" strokeWidth="1.5" />
        ))}
        {[
          [0.15, 0.19, 0.18, 0.18], [0.36, 0.19, 0.18, 0.18],
          [0.56, 0.39, 0.15, 0.18], [0.15, 0.39, 0.18, 0.18],
          [0.36, 0.59, 0.18, 0.17], [0.56, 0.19, 0.15, 0.18],
          [0.74, 0.39, 0.13, 0.18], [0.74, 0.59, 0.13, 0.17],
        ].map(([x, y, w, h], i) => (
          <rect key={`b${i}`}
            x={`${x * 100}%`} y={`${y * 100}%`}
            width={`${w * 100}%`} height={`${h * 100}%`}
            fill="#0C1525" rx="2" />
        ))}

        {/* Indicative route path (static, illustrative only) */}
        <polyline
          points={`15,${0.70 * 192} ${0.34 * 100 * 3.2},${0.70 * 192} ${0.34 * 100 * 3.2},${0.38 * 192} ${0.55 * 100 * 3.2},${0.38 * 192} ${0.55 * 100 * 3.2},${0.25 * 192} ${0.67 * 100 * 3.2},${0.25 * 192}`}
          stroke="#FF5F15" strokeWidth="2.5" fill="none"
          strokeDasharray="5,3" strokeLinecap="round"
          opacity="0.45"
        />
      </svg>

      {/* Destination pin — your site (real address shown below) */}
      <div className="absolute top-[22%] right-[30%] flex flex-col items-center">
        <div className="w-8 h-8 rounded-full border-2 border-flame bg-[#080D18] flex items-center justify-center">
          <MapPin className="w-4 h-4 text-flame" />
        </div>
        <div className="mt-1 text-[9px] font-bold text-flame bg-[#080D18] px-1.5 py-0.5 rounded border border-flame/30 whitespace-nowrap">
          Your Site
        </div>
      </div>

      {/* Indicative start point — static, not a live position */}
      <div className="absolute left-[18%] top-[66%]" style={{ transform: 'translate(-50%, -50%)' }}>
        <div className="w-7 h-7 bg-flame/80 rounded-full border-2 border-white/80 flex items-center justify-center shadow-lg">
          <Navigation className="w-3.5 h-3.5 text-white" style={{ transform: 'rotate(45deg)' }} />
        </div>
      </div>

      {/* Honest label — preview only */}
      <div className="absolute top-3 left-3 bg-[#080D18]/90 border border-white/10 rounded-xl px-2.5 py-1.5 backdrop-blur-sm">
        <div className="text-[9px] text-muted uppercase tracking-widest">Site Route</div>
        <div className="text-xs font-bold text-ink">Preview</div>
      </div>

      <div className="absolute bottom-3 left-3 right-3 text-center">
        <span className="text-[10px] font-semibold text-muted bg-[#080D18]/80 border border-white/10 rounded-full px-2.5 py-1 backdrop-blur-sm">
          Estimated route · not live tracking
        </span>
      </div>
    </div>
  )
}

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
              Estimated only — not live GPS. Arrival status updates as the assignment status changes.
            </div>
          </div>

          {/* ── Route preview ── */}
          <RoutePreviewMap />

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

          {/* Site address reminder */}
          <div className="bg-panel border border-white/5 rounded-2xl p-3 flex items-start gap-3">
            <MapPin className="w-4 h-4 text-flame mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-bold text-ink">{project.address}</div>
              <div className="text-xs text-muted mt-0.5">Ensure site access is available and all PPE is on-site before arrival</div>
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
