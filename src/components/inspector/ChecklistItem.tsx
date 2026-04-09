'use client'

import React, { useState } from 'react'
import { CheckCircle2, XCircle, MinusCircle, Camera, Mic, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChecklistItemDef, ChecklistItemState, ChecklistResult } from '@/lib/types'

interface ChecklistItemProps {
  item: ChecklistItemDef
  state: ChecklistItemState
  onChange: (state: ChecklistItemState) => void
  isOffline?: boolean
}

export function ChecklistItem({ item, state, onChange, isOffline }: ChecklistItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [voiceNote, setVoiceNote] = useState(state.voiceNote ?? '')
  const [failNote, setFailNote] = useState(state.failNote ?? '')

  const setResult = (result: ChecklistResult) => {
    const newState: ChecklistItemState = {
      ...state,
      result,
      resolvedAt: result !== 'pending' ? new Date().toISOString() : undefined,
    }
    onChange(newState)

    if (result === 'fail') {
      setExpanded(true)
    } else {
      setExpanded(false)
    }
  }

  const updateNote = (val: string) => {
    setFailNote(val)
    onChange({ ...state, failNote: val })
  }

  const updateVoice = (val: string) => {
    setVoiceNote(val)
    onChange({ ...state, voiceNote: val })
  }

  const resultConfig = {
    pending: { bg: 'bg-slate-800', border: 'border-slate-700', dot: null },
    pass: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', dot: 'bg-success-green' },
    fail: { bg: 'bg-red-500/10', border: 'border-red-500/40', dot: 'bg-fail-red' },
    na: { bg: 'bg-slate-700/50', border: 'border-slate-600', dot: 'bg-slate-500' },
  }

  const { bg, border } = resultConfig[state.result]

  return (
    <div className={cn('rounded-xl border transition-all duration-200', bg, border)}>
      {/* Item row */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => state.result !== 'pending' && setExpanded(!expanded)}
      >
        {/* Status dot */}
        <div className="mt-0.5 shrink-0">
          {state.result === 'pass' && <CheckCircle2 className="w-5 h-5 text-success-green" />}
          {state.result === 'fail' && <XCircle className="w-5 h-5 text-fail-red" />}
          {state.result === 'na' && <MinusCircle className="w-5 h-5 text-slate-500" />}
          {state.result === 'pending' && <AlertCircle className="w-5 h-5 text-slate-500" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm leading-tight">{item.label}</div>
          {item.description && state.result === 'pending' && (
            <div className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</div>
          )}
          {state.result === 'fail' && state.failNote && (
            <div className="text-xs text-red-300 mt-1 truncate">{state.failNote}</div>
          )}
        </div>

        {state.result !== 'pending' && (
          expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </div>

      {/* Fail expansion */}
      {state.result === 'fail' && expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-red-500/20 pt-3">
          {/* Fail note */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Deficiency Note *</label>
            <textarea
              value={failNote}
              onChange={e => updateNote(e.target.value)}
              placeholder="Describe the specific deficiency (e.g., 'Rebar spacing 275mm — spec requires 200mm OC')"
              rows={3}
              className="w-full bg-slate-900 border border-red-500/30 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-fail-red resize-none"
            />
          </div>

          {/* Photo upload */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Evidence Photos</label>
            <button className="w-full border-2 border-dashed border-slate-600 hover:border-safety-orange rounded-xl p-4 flex flex-col items-center gap-2 transition-colors group">
              <Camera className="w-6 h-6 text-slate-500 group-hover:text-safety-orange" />
              <span className="text-xs text-slate-400 group-hover:text-safety-orange">
                {isOffline ? 'Camera (will sync when online)' : 'Tap to take photo'}
              </span>
            </button>
            {state.photos.length > 0 && (
              <div className="flex gap-2 mt-2">
                {state.photos.map(p => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.id} src={p.thumbnailUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />
                ))}
              </div>
            )}
          </div>

          {/* Voice note */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Voice Note (optional)</label>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-xs text-slate-300 transition-colors">
                <Mic className="w-4 h-4 text-safety-orange" />
                Record Voice Note
              </button>
              <input
                type="text"
                value={voiceNote}
                onChange={e => updateVoice(e.target.value)}
                placeholder="Or type a note…"
                className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* Pass expansion — just show passed timestamp */}
      {state.result === 'pass' && expanded && (
        <div className="px-4 pb-3 border-t border-emerald-500/20 pt-2">
          <p className="text-xs text-emerald-400">
            ✓ Passed at {state.resolvedAt ? new Date(state.resolvedAt).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' }) : 'now'}
          </p>
        </div>
      )}

      {/* Thumb-zone action buttons — shown when pending */}
      {state.result === 'pending' && (
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={() => setResult('pass')}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-success-green text-white font-bold text-sm hover:bg-emerald-600 transition-colors active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            PASS
          </button>
          <button
            onClick={() => setResult('fail')}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-fail-red text-white font-bold text-sm hover:bg-red-600 transition-colors active:scale-95"
          >
            <XCircle className="w-4 h-4" />
            FAIL
          </button>
          <button
            onClick={() => setResult('na')}
            className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-600 transition-colors active:scale-95"
          >
            N/A
          </button>
        </div>
      )}
    </div>
  )
}
