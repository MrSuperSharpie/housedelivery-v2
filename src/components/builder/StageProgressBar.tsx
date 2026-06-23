'use client'

export type StageTone = 'flame' | 'amber' | 'electric' | 'emerald' | 'muted'

interface StageProgressBarProps {
  current: number
  total: number
  stageName: string
  passedCount: number
  tone?: StageTone
}

const FILL: Record<StageTone, string> = {
  flame:    'bg-flame',
  amber:    'bg-amber-400',
  electric: 'bg-electric',
  emerald:  'bg-emerald-400',
  muted:    'bg-subtle',
}

// Compact stage-progress treatment for project rows: "Stage X of 7 — Name" plus a
// clean horizontal bar. The full seven-stage detail lives in the row's expandable
// View Progress panel. Pure presentational.
export function StageProgressBar({ current, total, stageName, passedCount, tone = 'flame' }: StageProgressBarProps) {
  const pct = total > 0 ? Math.round((passedCount / total) * 100) : 0
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 truncate text-xs font-bold text-ink">
          <span className="text-muted">Stage {current} of {total}</span>
          {stageName && <span className="mx-1.5 text-subtle">—</span>}
          {stageName && <span>{stageName}</span>}
        </div>
        <span className="shrink-0 font-mono text-[11px] font-bold text-muted">{passedCount}/{total}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div className={`h-full rounded-full transition-all ${FILL[tone]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
