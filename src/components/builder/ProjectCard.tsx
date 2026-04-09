'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin, Clock, ChevronRight, CheckCircle2, AlertTriangle, FileText, X, Trash2 } from 'lucide-react'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { StatusBadge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'
import type { Project } from '@/lib/types'

// Mock notes keyed by project id — in production these come from the DB
const PROJECT_NOTES: Record<string, { stage: string; result: 'pass' | 'fail'; note: string; date: string }[]> = {
  'proj-1': [
    { stage: 'Stage 3 — Framing', result: 'pass', note: 'All load paths and shear wall nailing confirmed per Rev. C drawings.', date: 'Feb 22' },
    { stage: 'Stage 2 — Foundation', result: 'pass', note: 'Rebar spacing and anchor bolts verified before pour.', date: 'Feb 8' },
  ],
  'proj-2': [
    { stage: 'Stage 1 — Site Survey', result: 'fail', note: '⚠ Setback non-compliant on north boundary — 2.1m vs 2.4m required. GC notified.', date: 'Feb 18' },
  ],
  'proj-3': [
    { stage: 'Stage 2 — Foundation', result: 'pass', note: 'Formwork, rebar, and void forms all compliant pre-pour.', date: 'Feb 14' },
  ],
  'proj-4': [
    { stage: 'Stage 4 — Mechanical', result: 'pass', note: 'HVAC, HRV, and plumbing rough-in signed off.', date: 'Feb 10' },
  ],
}

interface ProjectCardProps {
  project: Project
  onRequestInspection: (project: Project) => void
  onDelete?: (projectId: string) => void
}

const STAGE_COLORS: Partial<Record<string, string>> = {
  pass:        'bg-success-green',
  fail:        'bg-fail-red',
  in_progress: 'bg-electric',
  pending:     'bg-white/10',
}

export function ProjectCard({ project, onRequestInspection, onDelete }: ProjectCardProps) {
  const router     = useRouter()
  const completed  = project.stages.filter(s => s.status === 'pass').length
  const isLive     = project.status === 'in_progress'
  const notes      = PROJECT_NOTES[project.id] ?? []
  const latestNote = notes[0]
  const hasFail    = notes.some(n => n.result === 'fail')
  const [showNotes, setShowNotes] = useState(false)

  return (
    <div className={`card-dark inset-top group overflow-hidden rounded-2xl border border-rim transition-all duration-200 hover:translate-y-[-1px] ${
      hasFail ? 'hover:border-fail-red/30' : 'hover:border-flame/20'
    }`}>
      {/* Live indicator stripe */}
      {isLive && <div className="h-px bg-gradient-to-r from-electric via-electric/50 to-transparent" />}
      {hasFail && !isLive && <div className="h-px bg-gradient-to-r from-fail-red via-fail-red/50 to-transparent" />}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-ink text-sm leading-snug truncate">{project.name}</h3>
            <div className="mt-1 flex items-center gap-1 text-xs font-medium text-muted">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{project.address}</span>
            </div>
          </div>
          <ProgressRing current={completed} total={5} size={52} />
        </div>

        {/* Permit + status */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] font-semibold text-subtle">{project.permitNumber}</span>
          <StatusBadge status={project.status} />
        </div>

        {/* Stage track */}
        <div className="mb-3">
          <div className="mb-1.5 text-[10px] font-semibold text-muted">
            Stage {project.currentStage} / 5 · {project.stages[project.currentStage - 1]?.stageName}
          </div>
          <div className="flex gap-0.5">
            {project.stages.map((s, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                STAGE_COLORS[s.status as keyof typeof STAGE_COLORS] ?? 'bg-white/10'
              }`} />
            ))}
          </div>
        </div>

        {/* Latest inspection note — shown if exists */}
        {latestNote && !showNotes && (
          <button onClick={() => setShowNotes(true)}
            className={`w-full text-left rounded-xl border px-3 py-2 mb-3 transition-all hover:opacity-80 ${
              latestNote.result === 'fail'
                ? 'bg-fail-red/5 border-fail-red/20'
                : 'bg-success-green/5 border-success-green/15'
            }`}>
            <div className="flex items-center gap-1.5 mb-0.5">
              {latestNote.result === 'fail'
                ? <AlertTriangle className="w-3 h-3 text-fail-red shrink-0" />
                : <CheckCircle2 className="w-3 h-3 text-success-green shrink-0" />
              }
              <span className={`text-[9px] font-black uppercase tracking-wide ${
                latestNote.result === 'fail' ? 'text-fail-red' : 'text-success-green'
              }`}>{latestNote.stage} · {latestNote.date}</span>
            </div>
            <p className="text-[10px] font-medium leading-snug text-muted line-clamp-2">{latestNote.note}</p>
          </button>
        )}

        {/* Expanded notes panel */}
        {showNotes && (
          <div className="mb-3 overflow-hidden rounded-xl border border-rim bg-panel">
            <div className="flex items-center justify-between border-b border-rim px-3 py-2">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-muted" />
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-ink">Inspection Notes</span>
              </div>
              <button onClick={() => setShowNotes(false)} className="text-muted hover:text-ink transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="max-h-40 divide-y divide-rim overflow-y-auto">
              {notes.map((n, i) => (
                <div key={i} className="px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {n.result === 'fail'
                      ? <AlertTriangle className="w-3 h-3 text-fail-red shrink-0" />
                      : <CheckCircle2 className="w-3 h-3 text-success-green shrink-0" />
                    }
                    <span className={`text-[9px] font-bold uppercase ${n.result === 'fail' ? 'text-fail-red' : 'text-success-green'}`}>
                      {n.stage} · {n.date}
                    </span>
                  </div>
                  <p className="text-[10px] font-medium leading-snug text-muted">{n.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Updated */}
        <div className="mb-4 flex items-center gap-1 text-[10px] font-medium text-subtle">
          <Clock className="w-3 h-3" />
          Updated {formatRelativeTime(project.updatedAt)}
          {notes.length > 0 && (
            <span className="ml-auto flex cursor-pointer items-center gap-1 font-semibold text-muted hover:text-ink" onClick={() => setShowNotes(s => !s)}>
              <FileText className="w-3 h-3" />{notes.length} note{notes.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => isLive ? router.push('/builder/project/' + project.id) : onRequestInspection(project)}
            className={`flex-1 text-xs font-bold py-2.5 rounded-xl transition-all ${
              isLive
                ? 'bg-electric/10 border border-electric/20 text-electric hover:bg-electric/15'
                : 'bg-flame text-white hover:bg-flame-light'
            }`}>
            {isLive ? 'Inspector En Route' : 'Request Inspection'}
          </button>
          <Link href={`/builder/project/${project.id}`}>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-rim text-muted transition-all hover:border-flame/20 hover:text-ink">
              <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
          {onDelete && (
            <button
              onClick={() => onDelete(project.id)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-rim text-muted transition-all hover:border-fail-red/30 hover:text-fail-red"
              title="Delete project">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
