'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, AlertTriangle, Clock, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { Project } from '@/lib/types'
import type { ReportDataMode } from '@/lib/dataSourceMode'

/**
 * Subset of the inspector_completion_reports rows already fetched in
 * builder/page.tsx (completionReportsByJobId). Only the fields Daily Flash
 * needs are declared; the caller passes the full summary object.
 */
interface CompletionReportLike {
  id?: string
  status?: string
  submittedAt?: string
  sealedAt?: string
  updatedAt?: string
}

interface DailyFlashProps {
  projects: Project[]
  dataMode: ReportDataMode
  reportsByJobId?: Record<string, CompletionReportLike>
  /**
   * Ids that resolve in /builder/project/[id]. That route looks up the local
   * store only, so a row is safe to link only when its id is in this set;
   * job_opportunities / Supabase-projects ids are not and must stay
   * non-navigating intelligence rows.
   */
  linkableProjectIds?: string[]
}

type FlashFilter = 'passed' | 'corrections' | 'pending'
type FlashPeriod = 'today' | 'week'

const WEEK_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/** Vancouver-local calendar day key (YYYY-MM-DD) for a timestamp. */
function vancouverDayKey(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Vancouver' })
}

/** The seven Mon→Sun day keys for the Vancouver-local week containing `now`. */
function vancouverWeek(now: Date): { label: string; key: string }[] {
  const weekday = now.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Vancouver' })
  const idx = Math.max(0, WEEK_ORDER.indexOf(weekday as (typeof WEEK_ORDER)[number]))
  const todayKey = vancouverDayKey(now)
  const [y, m, d] = todayKey.split('-').map(Number)
  // Anchor at noon UTC of today's Vancouver date so ±day shifts stay DST-safe.
  const baseNoonUtc = Date.UTC(y, m - 1, d, 12)
  return WEEK_ORDER.map((label, i) => ({
    label,
    key: vancouverDayKey(new Date(baseNoonUtc + (i - idx) * 86_400_000)),
  }))
}

export function DailyFlash({ projects, dataMode, reportsByJobId, linkableProjectIds }: DailyFlashProps) {
  const [period, setPeriod] = useState<FlashPeriod>('today')
  const [activeFilter, setActiveFilter] = useState<FlashFilter>('passed')

  const linkableIds = new Set(linkableProjectIds ?? [])

  const now = new Date()
  const todayKey = vancouverDayKey(now)
  const week = vancouverWeek(now)
  const weekKeys = new Set(week.map(w => w.key))
  const todayLabel = now.toLocaleDateString('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Vancouver',
  })

  // ── Source of truth ──────────────────────────────────────────────────────
  // Passed is derived from real inspector_completion_reports (sealed/submitted)
  // — the same records that drive Schedule C-B — not from job lifecycle status.
  const reportOf = (p: Project) => reportsByJobId?.[p.id]
  const reportTimestamp = (r?: CompletionReportLike) => r?.submittedAt ?? r?.sealedAt ?? r?.updatedAt
  const isPassingReport = (r?: CompletionReportLike) => Boolean(r) && (r!.status === 'sealed' || r!.status === 'submitted')

  const inSelectedPeriod = (ts?: string) => {
    if (!ts) return false
    const key = vancouverDayKey(ts)
    return period === 'today' ? key === todayKey : weekKeys.has(key)
  }

  // Live mode uses completion reports; mock/no-session falls back to project
  // status so the demo preview still renders meaningful figures.
  const hasLiveReports = dataMode === 'live' && projects.some(p => isPassingReport(reportOf(p)))

  const passedProjects = hasLiveReports
    ? projects.filter(p => {
        const r = reportOf(p)
        return isPassingReport(r) && inSelectedPeriod(reportTimestamp(r))
      })
    : projects.filter(p => p.status === 'pass')

  // Corrections / Pending stay sourced from existing project & job state
  // (completion reports carry no corrections outcome). These are current open
  // items, independent of the Today/Weekly period.
  const correctionProjects = projects.filter(
    p => p.status === 'fail' || p.status === 'awaiting_reinspection',
  )
  const pendingProjects = projects.filter(p => p.status === 'pending' || p.status === 'in_progress')

  // ── Weekly trend (real, from completion-report timestamps) ────────────────
  const weekData = week.map(w => ({
    day: w.label,
    pass: hasLiveReports
      ? projects.filter(p => {
          const r = reportOf(p)
          const ts = reportTimestamp(r)
          return isPassingReport(r) && ts != null && vancouverDayKey(ts) === w.key
        }).length
      : 0,
  }))

  // ── Selectable record list (driven by the active card) ───────────────────
  const filterProjects =
    activeFilter === 'passed' ? passedProjects
    : activeFilter === 'corrections' ? correctionProjects
    : pendingProjects
  const records = filterProjects.slice(0, 5)

  const periodWord = period === 'today' ? 'today' : 'this week'

  const cards: { key: FlashFilter; label: string; sub: string; count: number; tone: string }[] = [
    { key: 'passed',      label: 'Passed',      sub: 'submitted',       count: passedProjects.length,     tone: 'emerald' },
    { key: 'corrections', label: 'Corrections', sub: 'action required', count: correctionProjects.length, tone: 'amber' },
    { key: 'pending',     label: 'Pending',     sub: 'action needed',   count: pendingProjects.length,    tone: 'sky' },
  ]

  // Neutral card surfaces; state meaning carried by the theme-aware semantic icon/label
  // colour, not a pastel fill. Active state shown with a thin semantic ring.
  const toneClasses: Record<string, { text: string; ring: string }> = {
    emerald: { text: 'text-success-green', ring: 'ring-success-green/50' },
    amber:   { text: 'text-warning-amber', ring: 'ring-warning-amber/50' },
    sky:     { text: 'text-electric',      ring: 'ring-electric/50' },
  }

  return (
    <section className="rounded-2xl border border-rim/70 bg-panel p-4 shadow-sm" data-report-mode={dataMode}>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted">Daily Flash</div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-subtle">
            <Calendar className="h-3 w-3" />
            <span>{period === 'today' ? todayLabel : 'This week'}</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 rounded-full border border-rim bg-surface p-0.5">
          {(['today', 'week'] as FlashPeriod[]).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide transition-colors ${
                period === p ? 'bg-ink text-surface' : 'text-muted hover:text-ink'
              }`}
            >
              {p === 'today' ? 'Today' : 'Weekly'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row — selectable filters */}
      <div className="mb-2 grid grid-cols-3 gap-2">
        {cards.map(card => {
          const tone = toneClasses[card.tone]
          const isActive = activeFilter === card.key
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setActiveFilter(card.key)}
              aria-pressed={isActive}
              className={`rounded-xl border border-rim/70 bg-white/[0.02] p-3 text-left transition-all ${
                isActive ? `ring-2 ${tone.ring}` : 'hover:border-rim'
              }`}
            >
              <div className="mb-1 flex items-center gap-1.5">
                {card.key === 'passed' && <CheckCircle2 className={`h-3.5 w-3.5 ${tone.text}`} />}
                {card.key === 'corrections' && <AlertTriangle className={`h-3.5 w-3.5 ${tone.text}`} />}
                {card.key === 'pending' && <Clock className={`h-3.5 w-3.5 ${tone.text}`} />}
                <span className={`text-[11px] font-bold ${tone.text}`}>{card.label}</span>
              </div>
              <div className="text-2xl font-black text-ink">{card.count}</div>
              <div className="mt-0.5 text-[10px] font-medium text-muted">{card.sub}</div>
            </button>
          )
        })}
      </div>

      {/* Scope caption */}
      <div className="mb-4 text-[10px] font-medium text-subtle">
        Passed reflects {periodWord} · Corrections &amp; Pending show current open items
      </div>

      {/* Weekly trend — real data in live mode, honest placeholder otherwise */}
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-subtle">This week · passed</div>
      {hasLiveReports ? (
        <div className="mb-4 h-20">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData} barSize={14} barGap={2}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #475569', background: '#0E1727', boxShadow: '0 12px 28px rgba(0,0,0,0.42)' }}
                itemStyle={{ color: '#E5E7EB' }}
                labelStyle={{ color: '#94A3B8' }}
              />
              <Bar dataKey="pass" radius={[4, 4, 0, 0]}>
                {weekData.map((_, i) => <Cell key={i} fill="#10B981" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mb-4 rounded-xl border border-dashed border-rim bg-surface px-3 py-4 text-center text-[11px] font-medium text-muted">
          Weekly trend appears once live inspection records are available.
        </div>
      )}

      {/* Filtered record list */}
      {records.length > 0 ? (
        <div className="space-y-1.5">
          {records.map(project => {
            const reportId = activeFilter === 'passed' ? (reportsByJobId?.[project.id]?.id ?? null) : null
            const canLink = linkableIds.has(project.id)
            const rowTone =
              activeFilter === 'passed' ? 'border-rim/70 border-l-2 border-l-success-green bg-white/[0.02]'
              : activeFilter === 'corrections' ? 'border-rim/70 border-l-2 border-l-warning-amber bg-white/[0.02]'
              : 'border-rim/70 border-l-2 border-l-electric bg-white/[0.02]'
            return (
              <div key={project.id} className={`flex items-center gap-3 rounded-xl border p-2.5 ${rowTone}`}>
                {project.photos[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.photos[0].thumbnailUrl}
                    alt={project.name}
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                )}
                {canLink ? (
                  <Link
                    href={`/builder/project/${project.id}`}
                    className="min-w-0 flex-1 transition-opacity hover:opacity-80"
                  >
                    <div className="truncate text-xs font-bold text-ink">{project.name}</div>
                    <div className="truncate text-[11px] font-medium text-muted">{project.address}</div>
                  </Link>
                ) : (
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-bold text-ink">{project.name}</div>
                    <div className="truncate text-[11px] font-medium text-muted">{project.address}</div>
                    <div className="mt-0.5 text-[10px] font-medium text-subtle">
                      {activeFilter === 'passed' ? 'View from Live Board' : 'Open from Active Worklist'}
                    </div>
                  </div>
                )}
                {reportId ? (
                  <a
                    href={`/api/schedule-cb?reportId=${encodeURIComponent(reportId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg bg-flame px-2.5 py-1.5 text-[10px] font-black text-white transition-colors hover:bg-flame-light"
                  >
                    Download C-B
                  </a>
                ) : activeFilter === 'passed' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success-green" />
                ) : activeFilter === 'corrections' ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-warning-amber" />
                ) : (
                  <Clock className="h-4 w-4 shrink-0 text-electric" />
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-rim bg-surface px-3 py-4 text-center text-[11px] font-medium text-muted">
          No {activeFilter === 'passed' ? `passed records ${periodWord}` : activeFilter === 'corrections' ? 'corrections outstanding' : 'pending items'}.
        </div>
      )}
    </section>
  )
}
