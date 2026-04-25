'use client'
export const dynamic = 'force-dynamic'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Clock, DollarSign, ShieldCheck } from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'
import {
  getReliabilityAdminSnapshot,
  type ReliabilityAdminSnapshot,
} from '@/lib/supabase/reliability'

const emptySnapshot: ReliabilityAdminSnapshot = {
  profiles: [],
  events: [],
  cancellations: [],
  siteReadinessIncidents: [],
  reserveLedgerEntries: [],
}

export default function AdminReliabilityPage() {
  const [snapshot, setSnapshot] = useState<ReliabilityAdminSnapshot>(emptySnapshot)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    void getReliabilityAdminSnapshot().then(data => {
      if (!mounted) return
      setSnapshot(data)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  const metrics = useMemo(() => {
    const pendingReviews =
      snapshot.events.filter(row => row.adminReviewStatus !== 'none').length
      + snapshot.cancellations.filter(row => row.validityStatus === 'pending_review').length
      + snapshot.siteReadinessIncidents.filter(row => row.adminReviewStatus === 'pending').length
    const noShows = snapshot.profiles.reduce((total, row) => total + row.noShowCount, 0)
    const observeOnlyLedger = snapshot.reserveLedgerEntries.filter(row => row.enforcementMode === 'observe_only').length

    return [
      { label: 'Inspector Profiles', value: snapshot.profiles.length.toString(), icon: ShieldCheck },
      { label: 'Pending Reviews', value: pendingReviews.toString(), icon: AlertTriangle },
      { label: 'No-Show Events', value: noShows.toString(), icon: Clock },
      { label: 'Observe-Only Ledger', value: observeOnlyLedger.toString(), icon: DollarSign },
    ]
  }, [snapshot])

  return (
    <AdminShell
      title="Reliability Control"
      subtitle="Inspector tiers, attendance events, site-readiness protection, and reserve hooks"
    >
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-flame/30 border-t-flame" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-4">
            {metrics.map(metric => {
              const Icon = metric.icon
              return (
                <div key={metric.label} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-subtle">{metric.label}</div>
                      <div className="mt-2 text-2xl font-black text-ink">{metric.value}</div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-flame/25 bg-flame/15 text-flame">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
            <div className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
              Legal review boundary
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">
              Reserve, payout, access, or penalty hooks must remain configurable policy decisions. The default reliability policy is observe-only until legal review approves enforcement.
            </p>
          </div>

          <section className="rounded-2xl border border-white/8 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-black text-ink">Inspector Tier Queue</h2>
              <span className="text-[10px] font-bold uppercase tracking-widest text-subtle">{snapshot.profiles.length} profiles</span>
            </div>
            {snapshot.profiles.length === 0 ? (
              <EmptyState text="No reliability profiles created yet. The first binding claim will create one." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left">
                      <th className="py-2 pr-4 font-semibold text-muted">Inspector</th>
                      <th className="py-2 pr-4 font-semibold text-muted">Score</th>
                      <th className="py-2 pr-4 font-semibold text-muted">Tier</th>
                      <th className="py-2 pr-4 font-semibold text-muted">Commitments</th>
                      <th className="py-2 pr-4 font-semibold text-muted">Late Cancels</th>
                      <th className="py-2 pr-4 font-semibold text-muted">No-Shows</th>
                      <th className="py-2 font-semibold text-muted">Override</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.profiles.map(row => (
                      <tr key={row.inspectorId} className="border-b border-white/5">
                        <td className="py-2.5 pr-4 font-mono text-xs text-ink">{shortId(row.inspectorId)}</td>
                        <td className="py-2.5 pr-4 font-black text-ink">{row.internalScore.toFixed(1)}</td>
                        <td className="py-2.5 pr-4 text-muted capitalize">{row.tierKey}</td>
                        <td className="py-2.5 pr-4 text-muted">{row.claimCommitmentCount}</td>
                        <td className="py-2.5 pr-4 text-muted">{row.invalidLateCancellationCount}</td>
                        <td className="py-2.5 pr-4 text-muted">{row.noShowCount}</td>
                        <td className="py-2.5 text-muted">{row.manualTierOverride ?? 'None'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <ReviewPanel
              title="Reliability Events"
              count={snapshot.events.length}
              rows={snapshot.events.map(row => ({
                id: row.id,
                primary: row.eventType.replaceAll('_', ' '),
                secondary: `${shortId(row.inspectorId)} · delta ${row.scoreDelta}`,
                status: row.adminReviewStatus,
                at: row.createdAt,
              }))}
              empty="No reliability events yet."
            />
            <ReviewPanel
              title="Cancellation Reviews"
              count={snapshot.cancellations.length}
              rows={snapshot.cancellations.map(row => ({
                id: row.id,
                primary: row.reasonCode.replaceAll('_', ' '),
                secondary: `${row.requestedByRole} · ${row.isLate ? 'late' : 'not late'} · ${row.enforcementMode}`,
                status: row.validityStatus,
                at: row.createdAt,
              }))}
              empty="No cancellation requests yet."
            />
            <ReviewPanel
              title="Builder Site-Readiness Protection"
              count={snapshot.siteReadinessIncidents.length}
              rows={snapshot.siteReadinessIncidents.map(row => ({
                id: row.id,
                primary: row.incidentType.replaceAll('_', ' '),
                secondary: `${shortId(row.inspectorId)} · ${row.inspectorProtected ? 'inspector protected' : 'needs review'}`,
                status: row.adminReviewStatus,
                at: row.reportedAt,
              }))}
              empty="No site-readiness incidents yet."
            />
            <ReviewPanel
              title="Reserve Ledger Hooks"
              count={snapshot.reserveLedgerEntries.length}
              rows={snapshot.reserveLedgerEntries.map(row => ({
                id: row.id,
                primary: row.entryType.replaceAll('_', ' '),
                secondary: `${row.currency} ${row.amount.toFixed(2)} · ${row.enforcementMode}`,
                status: row.legalReviewRequired ? 'legal review' : row.status,
                at: row.createdAt,
              }))}
              empty="No reserve ledger hooks yet."
            />
          </div>
        </div>
      )}
    </AdminShell>
  )
}

function ReviewPanel({ title, count, rows, empty }: {
  title: string
  count: number
  rows: Array<{ id: string; primary: string; secondary: string; status: string; at: string }>
  empty: string
}) {
  return (
    <section className="rounded-2xl border border-white/8 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black text-ink">{title}</h2>
        <span className="text-[10px] font-bold uppercase tracking-widest text-subtle">{count} rows</span>
      </div>
      {rows.length === 0 ? (
        <EmptyState text={empty} />
      ) : (
        <div className="space-y-2">
          {rows.map(row => (
            <div key={row.id} className="rounded-xl border border-white/8 bg-surface/60 px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold capitalize text-ink">{row.primary}</div>
                  <div className="mt-0.5 truncate text-xs text-muted">{row.secondary}</div>
                </div>
                <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                  {row.status}
                </span>
              </div>
              <div className="mt-2 text-[10px] font-mono text-subtle">{formatDate(row.at)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-surface/40 px-4 py-8 text-center text-sm text-muted">
      {text}
    </div>
  )
}

function shortId(value: string): string {
  if (value.length <= 12) return value
  return `${value.slice(0, 8)}...${value.slice(-4)}`
}

function formatDate(value: string): string {
  if (!value) return 'No timestamp'
  return new Date(value).toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
