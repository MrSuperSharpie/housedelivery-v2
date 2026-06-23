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

const TONE: Record<MetricTone, { count: string; dot: string; hover: string; glow: string; active: boolean }> = {
  // `active` tones (flame/amber) light up only when their count is non-zero —
  // colour signals momentum and risk, it does not decorate every card.
  flame:    { count: 'text-flame',       dot: 'bg-flame',       hover: 'hover:border-flame/40',       glow: 'from-flame/[0.10]',     active: true },
  amber:    { count: 'text-amber-400',   dot: 'bg-amber-400',   hover: 'hover:border-amber-500/40',   glow: 'from-amber-500/[0.10]', active: true },
  electric: { count: 'text-electric',    dot: 'bg-electric',    hover: 'hover:border-electric/40',    glow: 'from-electric/[0.08]',  active: false },
  emerald:  { count: 'text-emerald-400', dot: 'bg-emerald-400', hover: 'hover:border-emerald-500/40', glow: 'from-emerald-500/[0.08]', active: false },
  muted:    { count: 'text-ink',         dot: 'bg-subtle',      hover: 'hover:border-rim',            glow: 'from-white/[0.04]',     active: false },
}

// Compact, clickable metric strip beneath the command header. Clicking a card
// scrolls to the related section. Pure presentational — counts and navigation
// targets are provided by the page.
export function SituationStrip({ metrics, onSelect }: SituationStripProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {metrics.map(metric => {
        const tone = TONE[metric.tone]
        const lit = tone.active && metric.count > 0
        return (
          <button
            key={metric.key}
            type="button"
            onClick={() => onSelect(metric.targetId)}
            className={`group relative overflow-hidden rounded-2xl border bg-panel p-4 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 ${tone.hover} ${lit ? 'border-rim' : 'border-rim/60'}`}
          >
            {/* Subtle corner wash — stronger when the metric is live */}
            <div
              className={`pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-gradient-to-br ${tone.glow} to-transparent blur-2xl transition-opacity duration-200 ${lit ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}
            />
            <div className="relative">
              <div className="mb-2.5 flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${lit ? tone.dot : 'bg-rim'}`} />
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-subtle">
                  {metric.label}
                </span>
              </div>
              <div className={`text-3xl font-black leading-none tracking-tight ${metric.count > 0 ? tone.count : 'text-ink'}`}>
                {metric.count}
              </div>
              <div className="mt-1.5 text-[11px] font-medium leading-snug text-muted">
                {metric.helper}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
