'use client'

import React, { useState } from 'react'
import { ShieldCheck, Lock, CheckCircle2, FileText, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface SealButtonProps {
  canSeal: boolean
  pendingCount: number
  hasOpenHold?: boolean
  onSeal: () => Promise<void>
  isDark?: boolean
}

export function SealButton({ canSeal, pendingCount, hasOpenHold = false, onSeal, isDark = true }: SealButtonProps) {
  const [sealing, setSealing] = useState(false)
  const [sealed, setSealed] = useState(false)

  const handleSeal = async () => {
    if (!canSeal || sealed) return
    setSealing(true)
    await onSeal()
    setSealing(false)
    setSealed(true)
  }

  if (sealed) {
    return (
      <div className="rounded-2xl overflow-hidden border-2 border-success-green bg-success-green/10 p-6 text-center">
        <div className="w-16 h-16 bg-success-green rounded-full flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-9 h-9 text-white" />
        </div>
        <h3 className="text-xl font-bold text-success-green mb-1">Digital Seal Applied</h3>
        <p className="text-sm text-slate-300 mb-4">Schedule C-B generated and record stored</p>
        <div className="flex gap-2 justify-center">
          <button className="flex items-center gap-2 bg-success-green text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors">
            <FileText className="w-4 h-4" />
            View Schedule C-B
          </button>
          <button className="flex items-center gap-2 bg-slate-700 text-slate-200 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-600 transition-colors">
            Share PDF
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border-2 p-5 transition-all ${
      canSeal
        ? 'border-success-green bg-success-green/5'
        : isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'
    }`}>
      <div className="flex items-center gap-3 mb-4">
        {canSeal ? (
          <ShieldCheck className="w-6 h-6 text-success-green" />
        ) : (
          <Lock className="w-6 h-6 text-slate-400" />
        )}
        <div>
          <h3 className={`font-bold text-base ${canSeal ? 'text-success-green' : (isDark ? 'text-slate-300' : 'text-gray-700')}`}>
            Apply Digital Seal & Generate Schedule C-B
          </h3>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            BC Schedule C-B field review report; record stored for authority submission
          </p>
        </div>
      </div>

      {!canSeal && (
        <div className="flex items-start gap-2 bg-warning-amber/10 border border-warning-amber/30 rounded-xl p-3 mb-4">
          <AlertCircle className="w-4 h-4 text-warning-amber shrink-0 mt-0.5" />
          <div className="text-xs text-warning-amber">
            {hasOpenHold
              ? <><span className="font-bold">Hold is active</span> — resolve or close the Hold before sealing.</>
              : <><span className="font-bold">{pendingCount} item{pendingCount !== 1 ? 's' : ''} remaining</span> — resolve all checklist items before sealing.</>
            }
          </div>
        </div>
      )}

      {canSeal && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex items-center gap-2 bg-success-green/10 rounded-xl px-3 py-2">
            <CheckCircle2 className="w-4 h-4 text-success-green" />
            <span className="text-xs font-semibold text-success-green">All items resolved</span>
          </div>
          <div className="flex items-center gap-2 bg-success-green/10 rounded-xl px-3 py-2">
            <ShieldCheck className="w-4 h-4 text-success-green" />
            <span className="text-xs font-semibold text-success-green">Location recorded</span>
          </div>
        </div>
      )}

      <Button
        variant="success"
        size="xl"
        fullWidth
        disabled={!canSeal}
        loading={sealing}
        onClick={handleSeal}
        className={!canSeal ? 'opacity-40' : ''}
      >
        <ShieldCheck className="w-5 h-5" />
        {sealing ? 'Applying Seal…' : 'Apply Digital Seal & Generate Schedule C-B'}
      </Button>
    </div>
  )
}
