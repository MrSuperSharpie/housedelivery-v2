'use client'

import { useState } from 'react'
import { AlertTriangle, ChevronRight } from 'lucide-react'

export interface ValidationItem {
  id: string
  projectName: string
  address?: string
  stageLabel: string
  submittedLabel?: string
}

interface AwaitingValidationPanelProps {
  items: ValidationItem[]
  total: number
  onSelect: (id: string) => void
}

// Compact right-rail preview of the intake/validation backlog. Shows the top 5
// items and a total count instead of large repeated cards. "Review Intake Queue"
// expands the remaining items inline (purely client-side UI state).
export function AwaitingValidationPanel({ items, total, onSelect }: AwaitingValidationPanelProps) {
  const [expanded, setExpanded] = useState(false)
  if (total === 0) return null

  const visible = expanded ? items : items.slice(0, 5)
  const hiddenCount = total - visible.length

  return (
    <section id="awaiting-validation" className="rounded-2xl border border-amber-500/25 bg-panel p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-400">
          Awaiting Validation
        </div>
        <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-400">
          {total}
        </span>
      </div>

      <div className="space-y-1.5">
        {visible.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className="flex w-full items-center gap-2.5 rounded-xl border border-rim bg-surface px-3 py-2 text-left transition-colors hover:bg-raised"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-ink">{item.projectName}</div>
              <div className="truncate text-[11px] font-medium text-muted">{item.stageLabel}</div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" />
          </button>
        ))}
      </div>

      {total > 5 && (
        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          className="mt-3 w-full rounded-xl border border-rim bg-surface py-2 text-[11px] font-bold text-muted transition-colors hover:bg-raised"
        >
          {expanded ? 'Show less' : `Review Intake Queue${hiddenCount > 0 ? ` (+${hiddenCount})` : ''}`}
        </button>
      )}
    </section>
  )
}
