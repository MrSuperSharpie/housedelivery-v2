'use client'

import React from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, TrendingUp, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card } from '@/components/ui/Card'
import type { Project } from '@/lib/types'
import type { ReportDataMode } from '@/lib/dataSourceMode'

interface DailyFlashProps {
  projects: Project[]
  dataMode: ReportDataMode
}

export function DailyFlash({ projects, dataMode }: DailyFlashProps) {
  const passed = projects.filter(p => p.status === 'pass')
  const failed = projects.filter(p => p.status === 'fail')
  const pending = projects.filter(p => p.status === 'pending' || p.status === 'awaiting_reinspection')

  const today = new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/Vancouver' })

  const weekData = [
    { day: 'Mon', pass: 1, fail: 0 },
    { day: 'Tue', pass: 2, fail: 1 },
    { day: 'Wed', pass: 1, fail: 0 },
    { day: 'Thu', pass: 0, fail: 1 },
    { day: 'Fri', pass: passed.length, fail: failed.length },
    { day: 'Sat', pass: 0, fail: 0 },
    { day: 'Sun', pass: 0, fail: 0 },
  ]

  return (
    <Card className="col-span-full border border-rim" data-report-mode={dataMode}>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted">
            <Calendar className="w-3.5 h-3.5" />
            <span>{today}</span>
          </div>
          <h3 className="text-lg font-extrabold text-ink">Daily Flash Report</h3>
          <p className="mt-0.5 text-sm font-medium text-muted">Summary of today&apos;s inspection activity</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-rim bg-panel px-3 py-1.5 text-xs font-bold text-ink">
          <TrendingUp className="w-3.5 h-3.5" />
          Weekly View
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-success-green" />
            <span className="text-xs font-bold text-emerald-800">Passed</span>
          </div>
          <div className="text-2xl font-extrabold text-success-green">{passed.length}</div>
          <div className="mt-1 text-xs font-medium text-emerald-700">site{passed.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-fail-red" />
            <span className="text-xs font-bold text-red-800">Failed</span>
          </div>
          <div className="text-2xl font-extrabold text-fail-red">{failed.length}</div>
          <div className="mt-1 text-xs font-medium text-red-700">site{failed.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-4 h-4 rounded-full bg-warning-amber flex items-center justify-center text-white text-[10px] font-bold">!</span>
            <span className="text-xs font-bold text-amber-800">Pending</span>
          </div>
          <div className="text-2xl font-extrabold text-warning-amber">{pending.length}</div>
          <div className="mt-1 text-xs font-medium text-amber-700">action needed</div>
        </div>
      </div>

      {/* Mini chart */}
      <div className="h-24 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weekData} barSize={14} barGap={2}>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#4B5563', fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
              itemStyle={{ color: '#374151' }}
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

      {/* Site thumbnails */}
      <div className="space-y-2">
        {[...passed.map(p => ({ ...p, flash: 'pass' as const })), ...failed.map(p => ({ ...p, flash: 'fail' as const }))].slice(0, 4).map((project) => (
          <Link
            key={project.id}
            href={`/builder/project/${project.id}`}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-opacity hover:opacity-80 ${
              project.flash === 'pass' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
            }`}
          >
            {project.photos[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.photos[0].thumbnailUrl}
                alt={project.name}
                className="w-12 h-12 rounded-lg object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-bold text-ink">{project.name}</div>
              <div className="truncate text-xs font-medium text-muted">{project.address}</div>
            </div>
            {project.flash === 'pass' ? (
              <CheckCircle2 className="w-5 h-5 text-success-green shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-fail-red shrink-0" />
            )}
          </Link>
        ))}
      </div>
    </Card>
  )
}
