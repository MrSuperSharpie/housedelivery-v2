'use client'

import React, { useState, useEffect } from 'react'
import { Timer, Plus, CheckCircle2, AlertTriangle, DollarSign, Zap } from 'lucide-react'
import { HOLD_PREMIUM_MULTIPLIER, getFixedDispatchHoldBaseRate } from '@/lib/pricing/config'

interface RetentionTimerProps {
  onComplete: () => void
  onCancel: () => void
  hourlyRate?: number
  onElapsedChange?: (elapsedSeconds: number) => void
}

type RetentionState = 'idle' | 'active' | 'extended' | 'complete'

export function RetentionTimer({ onComplete, onCancel, hourlyRate = getFixedDispatchHoldBaseRate(), onElapsedChange }: RetentionTimerProps) {
  const [state, setState]             = useState<RetentionState>('idle')
  const [seconds, setSeconds]         = useState(0)
  const [hoursBooked, setHoursBooked] = useState(1)
  const [extending, setExtending]     = useState(false)
  const [fixedItems, setFixedItems]   = useState<string[]>([])

  const baseRate = hourlyRate || getFixedDispatchHoldBaseRate()
  const billedRate = baseRate * HOLD_PREMIUM_MULTIPLIER
  const maxSeconds = hoursBooked * 3600
  const pct = Math.min((seconds / maxSeconds) * 100, 100)
  const remaining = Math.max(maxSeconds - seconds, 0)
  const earned = ((seconds / 3600) * billedRate)

  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return h > 0
      ? `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`
      : `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`
  }

  useEffect(() => {
    if (state !== 'active' && state !== 'extended') return
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [state])

  useEffect(() => {
    onElapsedChange?.(seconds)
  }, [onElapsedChange, seconds])

  // Auto-expire warning
  const nearEnd = remaining > 0 && remaining <= 300 // 5 min warning

  const handleExtend = () => {
    setHoursBooked(h => h + 1)
    setExtending(false)
    setState('extended')
  }

  const PENDING_DEFECTS = [
    'Missing hurricane clip at truss #4',
    'Rebar spacing at SW corner — 275mm vs 200mm required',
    'Clearance to earth insufficient at footing B-3',
  ]

  if (state === 'idle') {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <Timer className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="font-bold text-amber-300 text-sm">On-Site Retention — Premium Add-On</div>
            <div className="text-xs text-amber-500">Builder authorizes inspector to wait while crew fixes issues</div>
          </div>
        </div>

        {/* Pending defects */}
        <div className="mb-4">
          <div className="label-mono text-amber-600 mb-2">Pending Minor Defects</div>
          <div className="space-y-1.5">
            {PENDING_DEFECTS.map((d, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <span className="text-xs text-amber-300">{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rate info */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-center gap-3">
          <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="text-xs text-amber-300">
            <span className="font-bold">${baseRate}/hour base rate</span> billed at 1.5× for an effective <span className="font-bold">${billedRate}/hour</span>.
            Inspector stays on-site. No rebooking. No 24-hour delay.
          </div>
        </div>

        {/* Select hours */}
        <div className="mb-4">
          <div className="label-mono text-amber-600 mb-2">Initial Time Block</div>
          <div className="flex gap-2">
            {[1, 2, 3].map(h => (
              <button key={h} onClick={() => setHoursBooked(h)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  hoursBooked === h
                    ? 'bg-amber-500 text-white'
                    : 'border border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                }`}>
                {h}h · ${h * billedRate}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => setState('active')}
          className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold py-3.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2">
          <Zap className="w-4 h-4" />
          Authorize {hoursBooked}h Retention · ${hoursBooked * billedRate}
        </button>
        <button onClick={onCancel}
          className="w-full mt-2 text-xs text-amber-600 hover:text-amber-400 py-2 transition-colors">
          No thanks, I&apos;ll rebook instead
        </button>
      </div>
    )
  }

  if (state === 'complete') {
    return (
      <div className="bg-success-green/10 border border-success-green/30 rounded-2xl p-5 text-center">
        <div className="w-14 h-14 bg-success-green/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-7 h-7 text-success-green" />
        </div>
        <div className="font-bold text-success-green text-lg mb-1">Retention Complete</div>
        <div className="text-sm text-muted mb-3">
          All defects resolved. Inspector is ready to re-inspect and apply seal.
        </div>
        <div className="bg-surface border border-white/8 rounded-xl p-3 text-left mb-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted">Time on-site</span>
            <span className="font-mono font-bold text-ink">{fmtTime(seconds)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Retention fee</span>
            <span className="font-bold text-success-green">${earned.toFixed(2)}</span>
          </div>
        </div>
        <button onClick={onComplete}
          className="w-full bg-success-green hover:opacity-90 text-white font-bold py-3.5 rounded-xl transition-all text-sm">
          Proceed to Re-Inspection
        </button>
      </div>
    )
  }

  // Active / Extended
  const urgencyColor = nearEnd ? 'text-fail-red' : 'text-amber-400'
  const barColor = nearEnd ? 'bg-fail-red' : pct > 75 ? 'bg-amber-400' : 'bg-success-green'

  return (
    <div className="bg-[#0d2137] border border-amber-500/30 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${nearEnd ? 'bg-fail-red' : 'bg-amber-400'}`} />
          <span className="text-xs font-bold text-amber-400 tracking-widest uppercase">
            {state === 'extended' ? 'Extended' : 'Retention Active'}
          </span>
        </div>
        <div className={`font-mono font-black text-2xl ${urgencyColor}`}>
          {fmtTime(remaining)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-4">
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {[
          { label: 'Elapsed',  val: fmtTime(seconds) },
          { label: 'Booked',   val: `${hoursBooked}h` },
          { label: 'Earned',   val: `$${earned.toFixed(0)}` },
        ].map(({ label, val }) => (
          <div key={label} className="bg-surface border border-white/5 rounded-xl p-2.5 text-center">
            <div className="label-mono mb-0.5">{label}</div>
            <div className="font-mono font-bold text-ink text-sm">{val}</div>
          </div>
        ))}
      </div>

      {/* Defect checklist */}
      <div className="mb-5">
        <div className="label-mono mb-2">Defects to Resolve</div>
        <div className="space-y-2">
          {PENDING_DEFECTS.map((d, i) => {
            const fixed = fixedItems.includes(d)
            return (
              <button key={i} onClick={() => setFixedItems(prev =>
                prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
              )}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  fixed
                    ? 'border-success-green/30 bg-success-green/5'
                    : 'border-white/8 bg-surface hover:border-white/15'
                }`}>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  fixed ? 'bg-success-green border-success-green' : 'border-subtle'
                }`}>
                  {fixed && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <span className={`text-xs flex-1 ${fixed ? 'line-through text-muted' : 'text-ink'}`}>{d}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {fixedItems.length === PENDING_DEFECTS.length && (
          <button onClick={() => setState('complete')}
            className="w-full bg-success-green hover:opacity-90 text-white font-bold py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            All Fixed — Proceed to Re-Inspect
          </button>
        )}

        {!extending ? (
          <button onClick={() => setExtending(true)}
            className="w-full border border-amber-500/30 text-amber-400 hover:bg-amber-500/5 font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Extend +1 Hour · ${hourlyRate}
          </button>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3">
            <span className="text-xs text-amber-300 flex-1">Add 1 more hour of retention for ${hourlyRate}?</span>
            <div className="flex gap-2">
              <button onClick={() => setExtending(false)} className="text-xs text-amber-600 font-semibold px-3 py-1.5 hover:text-amber-400">Cancel</button>
              <button onClick={handleExtend} className="text-xs bg-amber-500 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-amber-400 transition-all">Confirm</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
