'use client'

import React, { useState } from 'react'
import { Calendar, Plus, X } from 'lucide-react'

export interface TimeSlot {
  date: string   // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string   // HH:MM
}

interface SchedulingPickerProps {
  slots: TimeSlot[]
  onChange: (slots: TimeSlot[]) => void
  max?: number
  tier?: string
}

const TIMES = [
  '07:00','07:30','08:00','08:30','09:00','09:30',
  '10:00','10:30','11:00','11:30','12:00','12:30',
  '13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30',
]

function nextDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i + 1)
    return d.toISOString().slice(0, 10)
  })
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'short', month: 'short', day: 'numeric'
  })
}

function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2,'0')} ${ampm}`
}

export function SchedulingPicker({ slots, onChange, max = 3, tier }: SchedulingPickerProps) {
  const isEmergency = tier === 'emergency' || tier === 'Emergency (Within 24 hrs)' || tier === 'Emergency'
  // For emergency: only today and tomorrow. Otherwise: next 14 days
  const days = isEmergency ? nextDays(2) : nextDays(14)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Partial<TimeSlot>>({})

  const addSlot = () => {
    if (!draft.date || !draft.startTime || !draft.endTime) return
    onChange([...slots, draft as TimeSlot])
    setDraft({})
    setAdding(false)
  }

  const removeSlot = (i: number) => onChange(slots.filter((_, idx) => idx !== i))

  return (
    <div>
      {/* Existing slots */}
      <div className="space-y-2 mb-3">
        {slots.map((slot, i) => (
          <div key={i} className="flex items-center gap-3 bg-panel border border-rim/30 rounded-xl px-3 py-2.5">
            <Calendar className="w-3.5 h-3.5 text-flame shrink-0" />
            <div className="flex-1 text-sm">
              <span className="font-bold text-ink">{fmtDate(slot.date)}</span>
              <span className="text-muted ml-2">{fmtTime(slot.startTime)} – {fmtTime(slot.endTime)}</span>
            </div>
            <button onClick={() => removeSlot(i)} className="text-subtle hover:text-fail-red transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add slot */}
      {adding ? (
        <div className="bg-panel border border-flame/30 rounded-xl p-4 space-y-3">
          {/* Emergency notice */}
          {isEmergency && (
            <div className="bg-fail-red/10 border border-fail-red/20 text-fail-red text-xs rounded-xl px-3 py-2">
              ⚡ Emergency dispatch: only today and tomorrow are available for scheduling.
            </div>
          )}
          {/* Date */}
          <div>
            <div className="label-mono mb-2">Date</div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {days.slice(0, 10).map(d => (
                <button key={d} onClick={() => setDraft(p => ({ ...p, date: d }))}
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-flame/30 ${
                    draft.date === d ? 'bg-flame text-white' : 'bg-raised border border-rim/30 text-muted hover:text-ink'
                  }`}>
                  <div>{new Date(d + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short' })}</div>
                  <div className="font-mono">{new Date(d + 'T12:00:00').getDate()}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label-mono mb-2">From</div>
              <select value={draft.startTime ?? ''} onChange={e => setDraft(p => ({ ...p, startTime: e.target.value }))}
                className="w-full rounded-xl border border-rim/30 bg-raised px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/20">
                <option value="">Select…</option>
                {TIMES.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
              </select>
            </div>
            <div>
              <div className="label-mono mb-2">To</div>
              <select value={draft.endTime ?? ''} onChange={e => setDraft(p => ({ ...p, endTime: e.target.value }))}
                className="w-full rounded-xl border border-rim/30 bg-raised px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/20">
                <option value="">Select…</option>
                {TIMES.filter(t => !draft.startTime || t > draft.startTime).map(t => (
                  <option key={t} value={t}>{fmtTime(t)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setDraft({}) }}
              className="flex-1 rounded-xl border border-rim/30 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-ink focus:outline-none focus:ring-2 focus:ring-flame/20">
              Cancel
            </button>
            <button onClick={addSlot} disabled={!draft.date || !draft.startTime || !draft.endTime}
              className="flex-1 rounded-xl bg-flame py-2.5 text-sm font-bold text-white transition-all hover:bg-flame-light focus:outline-none focus:ring-2 focus:ring-flame/30 disabled:cursor-not-allowed disabled:opacity-45 disabled:text-white/80">
              Add Window
            </button>
          </div>
        </div>
      ) : slots.length < max ? (
        <button onClick={() => setAdding(true)}
          className="w-full rounded-xl border border-dashed border-rim/40 py-3 flex items-center justify-center gap-2 text-sm text-muted transition-all hover:border-rim/70 hover:text-ink focus:outline-none focus:ring-2 focus:ring-flame/20">
          <Plus className="w-4 h-4" />
          Add availability window {slots.length > 0 ? `(${slots.length}/${max})` : ''}
        </button>
      ) : (
        <div className="text-xs text-center text-subtle py-2">Maximum {max} windows added</div>
      )}
    </div>
  )
}
