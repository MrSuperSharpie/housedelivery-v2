'use client'

import Link from 'next/link'
import { CheckCircle2, XCircle, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { Project } from '@/lib/types'
import type { ReportDataMode } from '@/lib/dataSourceMode'

interface DailyFlashProps {
  projects: Project[]
  dataMode: ReportDataMode
  reportsByJobId?: Record<string, { id?: string }>
}

export function DailyFlash({ projects, dataMode, reportsByJobId }: DailyFlashProps) {
  const passed = projects.filter(p => p.status === 'pass')
  const failed = projects.filter(p => p.status === 'fail')
  const pending = projects.filter(p => p.status === 'pending' || p.status === 'awaiting_reinspection')

  const today = new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Vancouver' })

  const weekData = [
    { day: 'Mon', pass: 0, fail: 0 },
    { day: 'Tue', pass: 0, fail: 0 },
    { day: 'Wed', pass: 0, fail: 0 },
    { day: 'Thu', pass: 0, fail: 0 },
    { day: 'Fri', pass: passed.length, fail: failed.length },
    { day: 'Sat', pass: 0, fail: 0 },
    { day: 'Sun', pass: 0, fail: 0 },
  ]

  const records = [
    ...passed.map(p => ({ ...p, flash: 'pass' as const })),
    ...failed.map(p => ({ ...p, flash: 'fail' as const })),
  ].slice(0, 4)

  return (
    <section className="rounded-2xl border border-rim bg-panel p-4 shadow-card" data-report-mode={dataMode}>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted">Daily Flash</div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-subtle">
            <Calendar className="h-3 w-3" />
            <span>{today}</span>
          </div>
        </div>
        <span className="rounded-full border border-rim bg-surface px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-muted">
          Weekly
        </span>
      </div>

      {/* Stats row */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-emerald-600/25 bg-emerald-500/10 p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold text-emerald-400">Passed</span>
          </div>
          <div className="text-2xl font-black text-emerald-400">{passed.length}</div>
          <div className="mt-0.5 text-[10px] font-medium text-muted">site{passed.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="rounded-xl border border-red-600/25 bg-red-500/10 p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-[11px] font-bold text-red-400">Failed</span>
          </div>
          <div className="text-2xl font-black text-red-400">{failed.length}</div>
          <div className="mt-0.5 text-[10px] font-medium text-muted">site{failed.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-surface">!</span>
            <span className="text-[11px] font-bold text-amber-400">Pending</span>
          </div>
          <div className="text-2xl font-black text-amber-400">{pending.length}</div>
          <div className="mt-0.5 text-[10px] font-medium text-muted">action needed</div>
        </div>
      </div>

      {/* Weekly trend */}
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-subtle">This week</div>
      <div className="mb-4 h-20">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weekData} barSize={14} barGap={2}>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: 'rgba(148,163,184,0.08)' }}
              contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #475569', background: '#0E1727', boxShadow: '0 12px 28px rgba(0,0,0,0.42)' }}
              itemStyle={{ color: '#E5E7EB' }}
              labelStyle={{ color: '#94A3B8' }}
            />
            <Bar dataKey="pass" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]}>
              {weekData.map((_, i) => <Cell key={i} fill="#10B981" />)}
            </Bar>
            <Bar dataKey="fail" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]}>
              {weekData.map((_, i) => <Cell key={i} fill="#EF4444" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Filed records */}
      {records.length > 0 && (
        <div className="space-y-1.5">
          {records.map(project => {
            const reportId = project.flash === 'pass' ? (reportsByJobId?.[project.id]?.id ?? null) : null
            return (
              <div
                key={project.id}
                className={`flex items-center gap-3 rounded-xl border p-2.5 ${
                  project.flash === 'pass' ? 'border-emerald-600/25 bg-emerald-500/[0.08]' : 'border-red-600/25 bg-red-500/[0.08]'
                }`}
              >
                {project.photos[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.photos[0].thumbnailUrl}
                    alt={project.name}
                    className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  />
                )}
                <Link
                  href={`/builder/project/${project.id}`}
                  className="min-w-0 flex-1 transition-opacity hover:opacity-80"
                >
                  <div className="truncate text-xs font-bold text-ink">{project.name}</div>
                  <div className="truncate text-[11px] font-medium text-muted">{project.address}</div>
                </Link>
                {reportId ? (
                  <a
                    href={`/api/schedule-cb?reportId=${encodeURIComponent(reportId)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg bg-flame px-2.5 py-1.5 text-[10px] font-black text-white transition-colors hover:bg-flame-light"
                  >
                    Download C-B
                  </a>
                ) : project.flash === 'pass' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
