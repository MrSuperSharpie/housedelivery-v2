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

export function SealButton({
  canSeal,
  pendingCount,
  hasOpenHold = false,
  onSeal,
  isDark = true,
}: SealButtonProps) {
  const [sealing, setSealing] = useState(false)
  const [sealed, setSealed] = useState(false)

  const handleSeal = async () => {
    if (!canSeal || sealed || sealing) return

    try {
      setSealing(true)
      await onSeal()
      setSealed(true)
    } finally {
      setSealing(false)
    }
  }

  if (sealed) {
    return (
      <div className="rounded-2xl overflow-hidden border-2 border-success-green bg-success-green/10 p-6 text-center">
        <div className="relative mb-4">
          <img src="/THIS-IS-A-TEST.png" />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border-4 border-[#0f172a] bg-success-green p-1">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
        </div>

        <h3 className="mb-1 text-xl font-bold text-success-green">Digital Seal Applied</h3>
        <p className="mb-4 text-sm text-slate-300">Schedule C-B generated and record stored</p>

        <div className="flex justify-center gap-2">
          <button className="flex items-center gap-2 rounded-xl bg-success-green px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-600">
            <FileText className="h-4 w-4" />
            View Schedule C-B
          </button>
          <button className="rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-600">
            Share PDF
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`rounded-2xl border-2 p-5 transition-all ${
        canSeal
          ? 'border-success-green bg-success-green/5'
          : isDark
            ? 'border-slate-700 bg-slate-800/50'
            : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="mb-6 flex justify-center">
        <div className="relative">
          <img
            src="/vero-seal-v2.png"
            className={`h-40 w-40 object-contain transition-opacity duration-500 ${
              canSeal ? 'opacity-100' : 'opacity-40 grayscale'
            }`}
            alt="Vero Permit Seal"
          />
          {!canSeal && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Lock className="h-8 w-8 text-slate-400" />
            </div>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        {canSeal ? (
          <ShieldCheck className="h-6 w-6 text-success-green" />
        ) : (
          <Lock className="h-6 w-6 text-slate-400" />
        )}

        <div>
          <h3
            className={`text-base font-bold ${
              canSeal ? 'text-success-green' : isDark ? 'text-slate-300' : 'text-gray-700'
            }`}
          >
            Apply Digital Seal & Generate Schedule C-B
          </h3>
          <p className={`mt-0.5 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            BC Schedule C-B field review report; record stored for authority submission
          </p>
        </div>
      </div>

      {!canSeal && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-warning-amber/30 bg-warning-amber/10 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning-amber" />
          <div className="text-xs text-warning-amber">
            {hasOpenHold ? (
              <>
                <span className="font-bold">Hold is active</span> — resolve or close the Hold before
                sealing.
              </>
            ) : (
              <>
                <span className="font-bold">
                  {pendingCount} item{pendingCount !== 1 ? 's' : ''} remaining
                </span>{' '}
                — resolve all checklist items before sealing.
              </>
            )}
          </div>
        </div>
      )}

      {canSeal && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-success-green/10 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-success-green" />
            <span className="text-xs font-semibold text-success-green">All items resolved</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-success-green/10 px-3 py-2">
            <ShieldCheck className="h-4 w-4 text-success-green" />
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
        <ShieldCheck className="h-5 w-5" />
        {sealing ? 'Applying Seal…' : 'Apply Digital Seal & Generate Schedule C-B'}
      </Button>
    </div>
  )
}