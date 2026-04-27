'use client'

import React from 'react'
import { CheckCircle2, AlertTriangle, RefreshCcw, Clock, Shield } from 'lucide-react'
import type { BuilderInspectionDisplayModel } from '@/lib/departureMonitoring'

const STATE_CONFIG = {
  on_track: {
    Icon: CheckCircle2,
    containerCls: 'border-emerald-200 bg-emerald-50',
    iconCls: 'text-emerald-600',
    headlineCls: 'text-emerald-800',
    supportCls: 'text-emerald-700',
    escrowCls: 'bg-emerald-100 border-emerald-300 text-emerald-700',
  },
  monitoring: {
    Icon: Clock,
    containerCls: 'border-amber-200 bg-amber-50',
    iconCls: 'text-amber-600',
    headlineCls: 'text-amber-800',
    supportCls: 'text-amber-700',
    escrowCls: 'bg-amber-100 border-amber-300 text-amber-700',
  },
  reassignment: {
    Icon: RefreshCcw,
    containerCls: 'border-purple-200 bg-purple-50',
    iconCls: 'text-purple-600',
    headlineCls: 'text-purple-800',
    supportCls: 'text-purple-700',
    escrowCls: 'bg-purple-100 border-purple-300 text-purple-700',
  },
  revised_eta: {
    Icon: Clock,
    containerCls: 'border-blue-200 bg-blue-50',
    iconCls: 'text-blue-600',
    headlineCls: 'text-blue-800',
    supportCls: 'text-blue-700',
    escrowCls: 'bg-blue-100 border-blue-300 text-blue-700',
  },
  manual_recovery: {
    Icon: AlertTriangle,
    containerCls: 'border-slate-200 bg-slate-50',
    iconCls: 'text-slate-600',
    headlineCls: 'text-slate-800',
    supportCls: 'text-slate-600',
    escrowCls: 'bg-slate-100 border-slate-300 text-slate-600',
  },
} as const

interface InspectionStatusBannerProps {
  display: BuilderInspectionDisplayModel | null | undefined
}

export function InspectionStatusBanner({ display }: InspectionStatusBannerProps) {
  if (!display) return null

  const cfg = STATE_CONFIG[display.state] ?? STATE_CONFIG.on_track
  const { Icon } = cfg

  const formattedEta = display.revisedEta
    ? new Date(display.revisedEta).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className={`rounded-2xl border px-4 py-3 ${cfg.containerCls}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.iconCls}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${cfg.headlineCls}`}>{display.headline}</p>
          {display.supportCopy && (
            <p className={`mt-0.5 text-xs ${cfg.supportCls}`}>{display.supportCopy}</p>
          )}
          {formattedEta && (
            <p className={`mt-0.5 text-xs ${cfg.supportCls}`}>Revised arrival: {formattedEta}</p>
          )}
          {display.escrowProtected && (
            <div className={`mt-2 inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 ${cfg.escrowCls}`}>
              <Shield className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-wide">Escrow Protected</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
