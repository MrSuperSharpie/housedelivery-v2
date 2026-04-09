'use client'
export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import {
  PauseCircle, Clock, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronUp, User, MapPin, Shield, Timer
} from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'
import { createClient } from '@/lib/supabase/client'
import type { HoldRecord, HoldStatus } from '@/lib/types'

const supabase = createClient()

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_META: Record<HoldStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  open:             { label: 'Open',             cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: <Clock className="w-3 h-3" /> },
  builder_approved: { label: 'Builder Approved', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: <CheckCircle2 className="w-3 h-3" /> },
  builder_declined: { label: 'Builder Declined', cls: 'bg-red-500/15 text-red-400 border-red-500/30', icon: <XCircle className="w-3 h-3" /> },
  expired:          { label: 'Expired',          cls: 'bg-white/5 text-white/40 border-white/10', icon: <Timer className="w-3 h-3" /> },
  admin_resolved:   { label: 'Admin Resolved',   cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: <Shield className="w-3 h-3" /> },
}

function HoldStatusBadge({ status }: { status: HoldStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${meta.cls}`}>
      {meta.icon} {meta.label}
    </span>
  )
}

// ─── Countdown ───────────────────────────────────────────────────────────────

function HoldCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(expiresAt).getTime() - Date.now()))

  useEffect(() => {
    const t = setInterval(() => setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now())), 1000)
    return () => clearInterval(t)
  }, [expiresAt])

  if (remaining === 0) return <span className="text-xs font-mono text-red-400">Expired</span>

  const h = Math.floor(remaining / 3600000)
  const m = Math.floor((remaining % 3600000) / 60000)
  const s = Math.floor((remaining % 60000) / 1000)
  const isUrgent = remaining < 900000 // 15 min

  return (
    <span className={`font-mono font-bold text-sm ${isUrgent ? 'text-red-400' : 'text-amber-400'}`}>
      {h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`}
    </span>
  )
}

// ─── Hold row ────────────────────────────────────────────────────────────────

interface HoldRowData {
  hold: HoldRecord
  projectName?: string
  inspectorName?: string
}

function HoldRow({ hold, projectName, inspectorName }: HoldRowData) {
  const [expanded, setExpanded] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [adminNote, setAdminNote] = useState('')

  const handleResolve = async () => {
    if (!adminNote.trim()) return
    setResolving(true)
    const now = new Date().toISOString()
    await supabase
      .from('job_holds')
      .update({ status: 'admin_resolved', resolved_at: now, builder_note: adminNote, updated_at: now })
      .eq('id', hold.id)
    setResolving(false)
    // Optimistic — page will re-fetch
    window.location.reload()
  }

  const placedFmt = new Date(hold.placedAt).toLocaleString('en-CA', {
    timeZone: 'America/Vancouver', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="card-dark rounded-2xl border border-white/5 hover:border-white/10 transition-all overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <HoldStatusBadge status={hold.status} />
            {hold.status === 'open' && <HoldCountdown expiresAt={hold.expiresAt} />}
          </div>
          <div className="font-bold text-ink text-sm mb-0.5">{projectName ?? hold.jobId}</div>
          <div className="text-xs text-muted flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {inspectorName ?? 'Inspector'}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Placed {placedFmt}</span>
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-white/5 transition-all">
          {expanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
        </button>
      </div>

      {/* Reason strip */}
      <div className="px-4 pb-3">
        <div className="bg-surface rounded-xl px-3 py-2">
          <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-0.5">Reason</div>
          <div className="text-xs text-ink">{hold.reason}</div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {/* Checklist items */}
          {hold.checklistItemIds.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">Checklist Items</div>
              <div className="flex flex-wrap gap-1.5">
                {hold.checklistItemIds.map(id => (
                  <span key={id} className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded-lg">{id}</span>
                ))}
              </div>
            </div>
          )}

          {/* Builder note */}
          {hold.builderNote && (
            <div>
              <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Builder Note</div>
              <div className="text-xs text-ink bg-surface rounded-xl px-3 py-2">{hold.builderNote}</div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div><span className="text-muted">Placed:</span> <span className="text-ink font-mono">{placedFmt}</span></div>
            <div><span className="text-muted">Expires:</span> <span className="text-ink font-mono">{new Date(hold.expiresAt).toLocaleString('en-CA', { timeZone: 'America/Vancouver', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
            {hold.resolvedAt && <div><span className="text-muted">Resolved:</span> <span className="text-ink font-mono">{new Date(hold.resolvedAt).toLocaleString('en-CA', { timeZone: 'America/Vancouver', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>}
            {hold.expiredAt && <div><span className="text-muted">Expired:</span> <span className="text-ink font-mono">{new Date(hold.expiredAt).toLocaleString('en-CA', { timeZone: 'America/Vancouver', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>}
          </div>

          {/* Admin resolve action */}
          {hold.status === 'open' && (
            <div className="pt-2 border-t border-white/5">
              <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">Admin Resolution</div>
              <textarea
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Provide admin resolution note..."
                rows={2}
                className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-xs text-ink placeholder-subtle focus:outline-none focus:border-blue-500 resize-none mb-2"
              />
              <button
                onClick={handleResolve}
                disabled={!adminNote.trim() || resolving}
                className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-2.5 rounded-xl text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Shield className="w-3.5 h-3.5" />
                {resolving ? 'Resolving...' : 'Resolve Hold'}
              </button>
            </div>
          )}

          {hold.status === 'expired' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-red-300">
                This hold expired without builder response. Consider scheduling a return visit or contacting the builder.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function AdminHoldsPage() {
  const [holds, setHolds] = useState<HoldRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const [jobNames, setJobNames] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('job_holds')
        .select('*')
        .order('placed_at', { ascending: false })

      if (!error && data) {
        const mapped: HoldRecord[] = (data as Record<string, unknown>[]).map(row => ({
          id:               row.id as string,
          jobId:            row.job_id as string,
          inspectorId:      row.inspector_id as string,
          builderId:        row.builder_id as string,
          placedAt:         row.placed_at as string,
          expiresAt:        row.expires_at as string,
          checklistItemIds: (row.checklist_item_ids as string[]) ?? [],
          status:           row.status as HoldStatus,
          reason:           row.reason as string,
          builderNote:      (row.builder_note as string) ?? undefined,
          resolvedAt:       (row.resolved_at as string) ?? undefined,
          expiredAt:        (row.expired_at as string) ?? undefined,
          createdAt:        row.created_at as string,
          updatedAt:        row.updated_at as string,
        }))
        setHolds(mapped)

        // Fetch job names for display
        const jobIds = [...new Set(mapped.map(h => h.jobId))]
        if (jobIds.length > 0) {
          const { data: jobs } = await supabase
            .from('job_opportunities')
            .select('id, project_name')
            .in('id', jobIds)
          if (jobs) {
            const names: Record<string, string> = {}
            for (const j of jobs as { id: string; project_name: string }[]) {
              names[j.id] = j.project_name
            }
            setJobNames(names)
          }
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  const openCount = holds.filter(h => h.status === 'open').length
  const resolvedCount = holds.filter(h => h.status !== 'open').length

  const filtered = filter === 'all'
    ? holds
    : filter === 'open'
      ? holds.filter(h => h.status === 'open')
      : holds.filter(h => h.status !== 'open')

  return (
    <AdminShell title="Hold Review" subtitle={`${openCount} open \u00b7 ${resolvedCount} resolved`}>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {([['all', 'All Holds'], ['open', 'Open'], ['resolved', 'Resolved']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === key
                ? 'bg-flame text-white'
                : 'bg-white/5 text-muted hover:bg-white/8 border border-white/8'
            }`}
          >
            {label}
            {key === 'open' && openCount > 0 && (
              <span className="ml-1.5 bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded-full">{openCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-flame/30 border-t-flame rounded-full animate-spin" />
          <span className="ml-3 text-sm text-muted">Loading holds...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2">
          <PauseCircle className="w-8 h-8 text-muted opacity-30" />
          <p className="text-sm text-muted">
            {filter === 'open' ? 'No open holds.' : filter === 'resolved' ? 'No resolved holds.' : 'No holds found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(hold => (
            <HoldRow
              key={hold.id}
              hold={hold}
              projectName={jobNames[hold.jobId]}
            />
          ))}
        </div>
      )}
    </AdminShell>
  )
}
