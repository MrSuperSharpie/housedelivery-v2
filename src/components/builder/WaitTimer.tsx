'use client'

import React, { useState, useEffect } from 'react'
import { Timer, DollarSign, Plus, CheckCircle2 } from 'lucide-react'
import { Toggle } from '@/components/ui/Toggle'
import { formatTimer, formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

interface WaitTimerProps {
  startedAt: string
  inspectorName: string
  projectId?: string
  extendRate?: number // $/hr for keeping inspector on-site
}

/** Format seconds as HH:MM:SS */
function formatHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

export function WaitTimer({ startedAt, inspectorName, projectId, extendRate = 85 }: WaitTimerProps) {
  const [seconds, setSeconds] = useState(0)
  const [extended, setExtended] = useState(false)
  const [extraHours, setExtraHours] = useState(0)
  const [holdActive, setHoldActive] = useState(false)
  const [holdElapsed, setHoldElapsed] = useState(0)
  const [holdLoading, setHoldLoading] = useState(false)
  const [holdApproved, setHoldApproved] = useState(false)

  // Main inspection timer
  useEffect(() => {
    const start = new Date(startedAt).getTime()
    const tick = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000)
      setSeconds(elapsed > 0 ? elapsed : 0)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  // Hold billing timer (only when hold is active)
  useEffect(() => {
    if (!holdActive) return
    const interval = setInterval(() => setHoldElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [holdActive])

  const handleAuthorizeHold = async () => {
    setHoldLoading(true)
    try {
      if (projectId) {
        await supabase
          .from('projects')
          .update({ status: 'on_hold' })
          .eq('id', projectId)
      }
      setHoldApproved(true)
      setHoldActive(true)
    } catch (err) {
      console.error('Failed to authorize hold:', err)
    } finally {
      setHoldLoading(false)
    }
  }

  const baseTime = 90 * 60 // 90 minutes included
  const overtimeSeconds = Math.max(0, seconds - baseTime)
  const overtimeHours = overtimeSeconds / 3600
  const holdBillingAmount = (holdElapsed / 3600) * extendRate

  return (
    <div className="bg-blueprint-blue text-white rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 bg-safety-orange rounded-full animate-pulse" />
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Inspector On-Site</span>
      </div>
      <div className="text-xs text-slate-400 mb-4">{inspectorName}</div>

      {/* Timer display */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-end gap-1">
            <span className="text-5xl font-mono font-bold text-white tabular-nums">
              {formatTimer(seconds)}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {seconds < baseTime
              ? `${formatTimer(baseTime - seconds)} remaining in base rate`
              : `${formatTimer(overtimeSeconds)} overtime`}
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <Timer className="w-6 h-6 text-safety-orange mx-auto mb-1" />
          <div className="text-xs text-slate-400">Running</div>
        </div>
      </div>

      {/* Authorize Inspector Hold */}
      {!holdApproved ? (
        <div className="bg-slate-800 rounded-xl p-4 mb-3">
          <div className="text-xs font-bold text-slate-300 mb-1">Inspector Hold Authorization</div>
          <div className="text-xs text-slate-500 mb-3">
            Keep the inspector on-site while your crew addresses issues. Billed at {formatCurrency(extendRate)}/hr.
          </div>
          <button
            onClick={handleAuthorizeHold}
            disabled={holdLoading}
            className="w-full flex items-center justify-center gap-2 bg-safety-orange hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm py-3 rounded-xl transition-all"
          >
            {holdLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Timer className="w-4 h-4" />
                Authorize Inspector Hold
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-success-green" />
            <span className="text-xs font-bold text-success-green">Hold Authorized</span>
            <div className="w-1.5 h-1.5 bg-success-green rounded-full animate-pulse ml-1" />
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">Hourly Billing Timer</div>
            <div className="text-3xl font-mono font-bold text-white tabular-nums">
              {formatHMS(holdElapsed)}
            </div>
            <div className="text-xs text-warning-amber mt-1">
              {formatCurrency(holdBillingAmount)} accrued
            </div>
          </div>
        </div>
      )}

      {/* Extend toggle */}
      <div className="bg-slate-800 rounded-xl p-4">
        <Toggle
          checked={extended}
          onChange={setExtended}
          label={`Keep Inspector On-Site`}
          sublabel={`${formatCurrency(extendRate)}/hr additional charge`}
          dark
          color="orange"
        />

        {extended && (
          <div className="mt-4 border-t border-slate-700 pt-4">
            <div className="text-xs text-slate-400 mb-3">Additional hours needed:</div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setExtraHours(Math.max(0, extraHours - 0.5))}
                className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white font-bold transition-colors"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold text-white">{extraHours}</span>
                <span className="text-slate-400 ml-1">hrs</span>
              </div>
              <button
                onClick={() => setExtraHours(extraHours + 0.5)}
                className="w-9 h-9 rounded-lg bg-safety-orange hover:bg-orange-600 flex items-center justify-center text-white font-bold transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {extraHours > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-1.5 text-sm text-slate-300">
                  <DollarSign className="w-4 h-4 text-success-green" />
                  <span>Additional charge</span>
                </div>
                <span className="text-white font-bold">
                  {formatCurrency(extraHours * extendRate)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overtime warning */}
      {seconds > baseTime && !extended && !holdApproved && (
        <div className="mt-3 bg-warning-amber/10 border border-warning-amber/30 rounded-xl p-3 text-xs text-warning-amber">
          ⚠️ Inspector has exceeded included time. Authorize a hold or they may need to leave.
        </div>
      )}
    </div>
  )
}
