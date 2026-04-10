'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  X, CheckCircle2, Navigation, MapPin, Clock,
  Star, BadgeCheck, Phone, MessageSquare,
  FileText, Home, Loader2
} from 'lucide-react'

interface EnRouteTrackerProps {
  isOpen: boolean
  onClose: () => void
  inspector: {
    name: string
    designation: string
    license: string
    rating: number
    completions: number
    avatar: string
  }
  project: {
    name: string
    address: string
    stage: string
  }
  initialEtaMinutes?: number
}

// ─── Stage definitions ────────────────────────────────────────────────────────

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
    sub:   'Application approved · Escrow locked',
    icon:  CheckCircle2,
  },
  {
    id:    'preparing',
    label: 'Preparing',
    sub:   'Inspector reviewing site documents',
    icon:  FileText,
  },
  {
    id:    'en_route',
    label: 'En Route',
    sub:   'Inspector in transit to your site',
    icon:  Navigation,
  },
  {
    id:    'approaching',
    label: 'Approaching',
    sub:   'Less than 2 km from site',
    icon:  MapPin,
  },
  {
    id:    'on_site',
    label: 'On Site',
    sub:   'Inspector has arrived — pre-safety check in progress',
    icon:  Home,
  },
]

const STAGE_ORDER: StageId[] = ['confirmed', 'preparing', 'en_route', 'approaching', 'on_site']

// ─── Animated dot grid map placeholder ───────────────────────────────────────

function MockMap({ progress, arrived }: { progress: number; arrived: boolean }) {
  // progress: 0–1 (represents inspector movement along the route)
  const inspectorX = 15 + progress * 52  // 15% → 67%
  const inspectorY = 70 - progress * 45  // 70% → 25%

  return (
    <div className="relative w-full h-48 bg-[#060B14] rounded-2xl overflow-hidden border border-white/6">
      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {/* Horizontal roads */}
        {[0.18, 0.38, 0.58, 0.77].map((y, i) => (
          <line key={`h${i}`}
            x1="0" y1={`${y * 100}%`} x2="100%" y2={`${y * 100}%`}
            stroke="#1a2744" strokeWidth="1.5" />
        ))}
        {/* Vertical roads */}
        {[0.14, 0.34, 0.55, 0.72, 0.88].map((x, i) => (
          <line key={`v${i}`}
            x1={`${x * 100}%`} y1="0" x2={`${x * 100}%`} y2="100%"
            stroke="#1a2744" strokeWidth="1.5" />
        ))}
        {/* City blocks */}
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

        {/* Route path */}
        <polyline
          points={`15,${0.70 * 192} ${0.34 * 100 * 3.2},${0.70 * 192} ${0.34 * 100 * 3.2},${0.38 * 192} ${0.55 * 100 * 3.2},${0.38 * 192} ${0.55 * 100 * 3.2},${0.25 * 192} ${0.67 * 100 * 3.2},${0.25 * 192}`}
          stroke="#FF5F15" strokeWidth="2.5" fill="none"
          strokeDasharray="5,3" strokeLinecap="round"
          opacity="0.6"
        />
        {/* Completed portion of route */}
        <polyline
          points={`15,${0.70 * 192} ${Math.min(0.34 * 100 * 3.2, inspectorX * 3.2)},${0.70 * 192}`}
          stroke="#FF5F15" strokeWidth="2.5" fill="none" strokeLinecap="round"
          opacity={progress > 0.05 ? 0.9 : 0}
        />
      </svg>

      {/* Destination pin */}
      <div className="absolute top-[22%] right-[30%] flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
          arrived ? 'bg-success-green border-success-green animate-pulse' : 'bg-[#080D18] border-flame'
        }`}>
          <MapPin className={`w-4 h-4 ${arrived ? 'text-white' : 'text-flame'}`} />
        </div>
        <div className="mt-1 text-[9px] font-bold text-flame bg-[#080D18] px-1.5 py-0.5 rounded border border-flame/30 whitespace-nowrap">
          Your Site
        </div>
      </div>

      {/* Inspector dot — animates along route */}
      <div
        className="absolute transition-all duration-[2000ms] ease-linear"
        style={{ left: `${inspectorX}%`, top: `${inspectorY}%`, transform: 'translate(-50%, -50%)' }}
      >
        {arrived ? (
          <div className="w-8 h-8 bg-success-green rounded-full border-2 border-white flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
        ) : (
          <>
            <div className="absolute inset-0 bg-flame/30 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
            <div className="relative w-8 h-8 bg-flame rounded-full border-2 border-white flex items-center justify-center shadow-lg">
              <Navigation className="w-3.5 h-3.5 text-white" style={{ transform: 'rotate(45deg)' }} />
            </div>
          </>
        )}
      </div>

      {/* ETA chip on map */}
      {!arrived && (
        <div className="absolute top-3 left-3 bg-[#080D18]/90 border border-white/10 rounded-xl px-2.5 py-1.5 backdrop-blur-sm">
          <div className="text-[9px] text-muted uppercase tracking-widest">Live Track</div>
          <div className="text-xs font-bold text-electric">Vero GPS</div>
        </div>
      )}

      {arrived && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-success-green/90 border border-success-green rounded-2xl px-5 py-3 text-center">
            <CheckCircle2 className="w-6 h-6 text-white mx-auto mb-1" />
            <div className="font-black text-white text-sm">Inspector On Site</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EnRouteTracker({
  isOpen,
  onClose,
  inspector,
  project,
  initialEtaMinutes = 8,
}: EnRouteTrackerProps) {
  const [currentStageIdx, setCurrentStageIdx] = useState(2)   // start at 'en_route'
  const [etaSeconds, setEtaSeconds]           = useState(initialEtaMinutes * 60)
  const [mapProgress, setMapProgress]         = useState(0.18) // 0–1 along route
  const [pulseStage, setPulseStage]           = useState(false)

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stageRef    = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentStage = STAGES[currentStageIdx]
  const arrived      = currentStageIdx >= 4
  const totalEta     = initialEtaMinutes * 60

  useEffect(() => {
    if (!isOpen) return

    // Reset
    setCurrentStageIdx(2)
    setEtaSeconds(initialEtaMinutes * 60)
    setMapProgress(0.18)

    // ETA countdown — tick every second
    timerRef.current = setInterval(() => {
      setEtaSeconds(s => Math.max(0, s - 1))
    }, 1000)

    // Map progress — smooth movement
    progressRef.current = setInterval(() => {
      setMapProgress(p => Math.min(1, p + 0.004))
    }, 1000)

    // Advance stages
    stageRef.current = setTimeout(() => {
      // → Approaching after ~40% of ETA
      setPulseStage(true)
      setTimeout(() => setPulseStage(false), 800)
      setCurrentStageIdx(3)

      setTimeout(() => {
        // → On Site after another 30% of ETA
        setPulseStage(true)
        setTimeout(() => setPulseStage(false), 800)
        setCurrentStageIdx(4)
        setEtaSeconds(0)
        setMapProgress(1)
        // Stop timers
        if (timerRef.current) clearInterval(timerRef.current)
        if (progressRef.current) clearInterval(progressRef.current)
      }, Math.floor(initialEtaMinutes * 60 * 0.28) * 1000)

    }, Math.floor(initialEtaMinutes * 60 * 0.42) * 1000)

    return () => {
      if (timerRef.current)    clearInterval(timerRef.current)
      if (progressRef.current) clearInterval(progressRef.current)
      if (stageRef.current)    clearTimeout(stageRef.current)
    }
  }, [isOpen, initialEtaMinutes])

  if (!isOpen) return null

  const fmtEta = () => {
    if (arrived) return 'Arrived'
    const m = Math.floor(etaSeconds / 60)
    const s = etaSeconds % 60
    return m > 0 ? `${m} min` : `${s}s`
  }

  const etaPct = Math.max(0, Math.min(100, 100 - (etaSeconds / totalEta) * 100))

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
            <div className="font-black text-ink text-base">Live Tracker</div>
            <div className="text-xs text-muted mt-0.5 truncate max-w-[240px]">{project.name} · {project.stage}</div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 bg-raised rounded-xl flex items-center justify-center text-muted hover:text-ink transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* ── Inspector card ── */}
          <div className="card-dark rounded-2xl p-4 inset-top flex items-center gap-4">
            <div className="w-14 h-14 bg-flame/15 border border-flame/25 rounded-2xl flex items-center justify-center font-black text-flame text-lg shrink-0">
              {inspector.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-ink text-sm">{inspector.name}</span>
                <BadgeCheck className="w-3.5 h-3.5 text-electric shrink-0" />
              </div>
              <div className="text-xs font-mono text-muted mt-0.5">{inspector.license} · {inspector.designation}</div>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-warning-amber fill-warning-amber" />
                  <span className="text-xs font-bold text-ink">{inspector.rating}</span>
                </div>
                <span className="text-xs text-muted">{inspector.completions} inspections</span>
              </div>
            </div>
            {/* Quick contact */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <button className="w-8 h-8 bg-raised border border-white/8 rounded-xl flex items-center justify-center text-muted hover:text-electric hover:border-electric/30 transition-all">
                <Phone className="w-3.5 h-3.5" />
              </button>
              <button className="w-8 h-8 bg-raised border border-white/8 rounded-xl flex items-center justify-center text-muted hover:text-electric hover:border-electric/30 transition-all">
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── ETA bar ── */}
          <div className="card-dark rounded-2xl p-4 inset-top">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="label-mono mb-0.5">Estimated Arrival</div>
                <div className={`text-3xl font-black font-mono transition-all ${arrived ? 'text-success-green' : 'text-ink'}`}>
                  {fmtEta()}
                </div>
              </div>
              <div className="text-right">
                <div className="label-mono mb-0.5">Address</div>
                <div className="text-xs font-semibold text-ink max-w-[140px] text-right leading-tight">{project.address}</div>
              </div>
            </div>
            {/* ETA progress track */}
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${arrived ? 'bg-success-green' : 'bg-flame'}`}
                style={{ width: `${etaPct}%` }}
              />
            </div>
          </div>

          {/* ── Live map ── */}
          <MockMap progress={mapProgress} arrived={arrived} />

          {/* ── Status timeline ── */}
          <div className="card-dark rounded-2xl p-4 inset-top">
            <div className="label-mono mb-4">Status</div>
            <div className="space-y-0">
              {STAGES.map((stage, idx) => {
                const isDone    = idx < currentStageIdx
                const isCurrent = idx === currentStageIdx
                const Icon      = stage.icon
                const isLast    = idx === STAGES.length - 1

                return (
                  <div key={stage.id} className="flex gap-3">
                    {/* Spine + icon */}
                    <div className="flex flex-col items-center">
                      <div className={`
                        w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-500
                        ${isDone    ? 'bg-success-green border-success-green' : ''}
                        ${isCurrent ? `border-flame bg-flame/10 ${pulseStage ? 'scale-110' : 'scale-100'}` : ''}
                        ${!isDone && !isCurrent ? 'border-white/10 bg-surface' : ''}
                      `}>
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        ) : isCurrent ? (
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-4 h-4 bg-flame/30 rounded-full animate-ping" style={{ animationDuration: '1.2s' }} />
                            </div>
                            <Icon className="w-4 h-4 text-flame relative" />
                          </div>
                        ) : (
                          <Icon className="w-3.5 h-3.5 text-subtle" />
                        )}
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 h-6 mt-1 mb-1 rounded-full transition-all duration-500 ${
                          isDone ? 'bg-success-green' : 'bg-white/8'
                        }`} />
                      )}
                    </div>

                    {/* Text */}
                    <div className={`pb-5 flex-1 min-w-0 ${isLast ? 'pb-0' : ''}`}>
                      <div className={`text-sm font-bold transition-all ${
                        isCurrent ? 'text-flame' :
                        isDone    ? 'text-success-green' :
                                    'text-muted'
                      }`}>{stage.label}</div>
                      <div className={`text-xs mt-0.5 leading-relaxed ${
                        isCurrent ? 'text-muted' : 'text-subtle'
                      }`}>{stage.sub}</div>
                      {isCurrent && !arrived && (
                        <div className="flex items-center gap-1 mt-1">
                          <Loader2 className="w-3 h-3 text-flame animate-spin" />
                          <span className="text-[10px] text-flame font-semibold">Live</span>
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
            Close Tracker
          </button>
        </div>

      </div>
    </div>
  )
}
