'use client'

export type MetricTone = 'flame' | 'amber' | 'electric' | 'emerald' | 'muted'

export interface SituationMetric {
  key: string
  label: string
  count: number
  helper: string
  tone: MetricTone
  targetId: string
}

interface SituationStripProps {
  metrics: SituationMetric[]
  onSelect: (targetId: string) => void
}

const TONE: Record<MetricTone, { count: string; chip: string }> = {
  flame:    { count: 'text-flame',         chip: 'border-flame/30' },
  amber:    { count: 'text-amber-400',     chip: 'border-amber-500/30' },
  electric: { count: 'text-electric',      chip: 'border-electric/30' },
  emerald:  { count: 'text-emerald-400',   chip: 'border-emerald-500/30' },
  muted:    { count: 'text-ink',           chip: 'border-rim' },
}

// Compact, clickable metric strip beneath the command header. Clicking a card
// scrolls to the related section. Pure presentational — counts and navigation
// targets are provided by the page.
export function SituationStrip({ metrics, onSelect }: SituationStripProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {metrics.map(metric => {
        const tone = TONE[metric.tone]
        return (
          <button
            key={metric.key}
            type="button"
            onClick={() => onSelect(metric.targetId)}
            className={`rounded-2xl border bg-panel p-4 text-left shadow-card transition-all hover:bg-raised ${tone.chip}`}
          >
            <div className={`text-2xl font-black ${tone.count}`}>{metric.count}</div>
            <div className="mt-1 text-xs font-bold text-ink">{metric.label}</div>
            <div className="mt-0.5 text-[11px] font-medium leading-snug text-muted">
              {metric.helper}
            </div>
          </button>
        )
      })}
    </div>
  )
}
