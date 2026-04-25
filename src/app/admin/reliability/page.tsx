'use client'
export const dynamic = 'force-dynamic'

import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  Lock,
  RefreshCcw,
  Shield,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth'
import {
  buildInspectorReliabilityDetail,
  buildJobReliabilityTimeline,
  buildReliabilityOverviewMetrics,
  canAccessAdminReliabilitySection,
} from '@/lib/adminReliabilityControl'
import { buildEmergencyEnforcementDisablePatch, evaluateReliabilityRollout } from '@/lib/reliabilityRollout'
import {
  getActiveReliabilityPolicyConfig,
  getReliabilityAdminSnapshot,
  type ActiveReliabilityPolicyConfig,
  type ReliabilityAdminSnapshot,
  type ReliabilityCancellationRow,
  type PayoutReviewRow,
} from '@/lib/supabase/reliability'
import type { ReliabilityEnforcementMode } from '@/lib/types'

const emptySnapshot: ReliabilityAdminSnapshot = {
  profiles: [],
  events: [],
  appointments: [],
  confirmations: [],
  notifications: [],
  standbyCandidates: [],
  cancellations: [],
  siteReadinessIncidents: [],
  reserveLedgerEntries: [],
  payoutReviews: [],
  builderCreditHooks: [],
  auditEvents: [],
}

const metricIcons = [Clock, AlertTriangle, AlertTriangle, RefreshCcw, AlertTriangle, Shield, DollarSign, FileText, UserRound] as const

export default function AdminReliabilityPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [snapshot, setSnapshot] = useState<ReliabilityAdminSnapshot>(emptySnapshot)
  const [policy, setPolicy] = useState<ActiveReliabilityPolicyConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const isAdmin = canAccessAdminReliabilitySection(user?.role, 'overview')

  useEffect(() => {
    if (authLoading || !isAdmin) return

    let mounted = true
    void Promise.all([
      getReliabilityAdminSnapshot(),
      getActiveReliabilityPolicyConfig(),
    ]).then(([snapshotData, policyData]) => {
      if (!mounted) return
      setSnapshot(snapshotData)
      setPolicy(policyData)
      setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [authLoading, isAdmin])

  const overviewMetrics = useMemo(() => buildReliabilityOverviewMetrics(snapshot), [snapshot])
  const rollout = useMemo(() => evaluateReliabilityRollout(policy?.config ?? null), [policy])
  const selectedInspector = snapshot.profiles[0]
  const inspectorDetail = selectedInspector
    ? buildInspectorReliabilityDetail({
        profile: selectedInspector,
        events: snapshot.events,
        cancellations: snapshot.cancellations,
        reserveEntries: snapshot.reserveLedgerEntries,
        credentialStatus: 'admin verified or pending credential review',
        adminNotes: selectedInspector.overrideReason ? [selectedInspector.overrideReason] : [],
        tierHistory: selectedInspector.manualTierOverride
          ? [{ tier: selectedInspector.manualTierOverride, at: selectedInspector.updatedAt, reason: selectedInspector.overrideReason }]
          : [],
      })
    : null
  const selectedJobId = snapshot.appointments[0]?.jobId
    ?? snapshot.confirmations[0]?.jobId
    ?? snapshot.payoutReviews[0]?.jobId
    ?? snapshot.cancellations[0]?.jobId
  const timeline = selectedJobId
    ? buildJobReliabilityTimeline({
        jobId: selectedJobId,
        appointments: snapshot.appointments,
        confirmations: snapshot.confirmations,
        notifications: snapshot.notifications,
        events: snapshot.events,
        cancellations: snapshot.cancellations,
        standbyCandidates: snapshot.standbyCandidates,
        payoutReviews: snapshot.payoutReviews,
      })
    : []

  const refreshSnapshot = async () => {
    const [snapshotData, policyData] = await Promise.all([
      getReliabilityAdminSnapshot(),
      getActiveReliabilityPolicyConfig(),
    ])
    setSnapshot(snapshotData)
    setPolicy(policyData)
  }

  const handleCancellationAction = async (
    row: ReliabilityCancellationRow,
    decision: 'approved' | 'rejected' | 'overridden' | 'more_information',
  ) => {
    setActionMessage(null)
    const response = await fetch('/api/admin/cancellations/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cancellationRequestId: row.id,
        decision,
        adminNote: decision === 'more_information'
          ? 'Admin requested additional cancellation context before classification.'
          : `Admin ${decision.replace('_', ' ')} cancellation from Reliability Control Centre.`,
        triggerReassignment: decision === 'rejected',
        applyFinancialConsequence: decision === 'rejected' && row.isLate,
        waiveFinancialConsequence: decision === 'approved',
      }),
    })
    const payload = await response.json() as { ok?: boolean; error?: string }
    setActionMessage(payload.ok ? `Cancellation ${decision.replace('_', ' ')} recorded.` : payload.error ?? 'Cancellation action failed.')
    if (payload.ok) await refreshSnapshot()
  }

  const handlePayoutAction = async (
    row: PayoutReviewRow,
    decision: 'approve_payout' | 'block_payout' | 'apply_reserve' | 'issue_builder_credit' | 'waive_consequence',
  ) => {
    setActionMessage(null)
    const response = await fetch('/api/admin/payouts/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignmentId: row.assignmentId,
        decision,
        adminNote: `Admin ${decision.replaceAll('_', ' ')} from Reliability Control Centre.`,
        applyReserve: decision === 'apply_reserve',
        issueBuilderCredit: decision === 'issue_builder_credit',
        waiveConsequence: decision === 'waive_consequence',
        builderCreditAmount: decision === 'issue_builder_credit' ? row.builderCreditAmount : 0,
      }),
    })
    const payload = await response.json() as { ok?: boolean; error?: string }
    setActionMessage(payload.ok ? `Payout action ${decision.replaceAll('_', ' ')} recorded.` : payload.error ?? 'Payout action failed.')
    if (payload.ok) await refreshSnapshot()
  }

  const handlePolicyUpdate = async (patch: Record<string, unknown>, enforcementMode?: ReliabilityEnforcementMode) => {
    if (!policy) return
    setActionMessage(null)
    const response = await fetch('/api/admin/reliability/policy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        policyVersionId: policy.id,
        configPatch: patch,
        enforcementMode,
        adminNote: 'Admin updated reliability policy configuration from Control Centre.',
      }),
    })
    const payload = await response.json() as { ok?: boolean; error?: string }
    setActionMessage(payload.ok ? 'Policy configuration update audited.' : payload.error ?? 'Policy update failed.')
    if (payload.ok) await refreshSnapshot()
  }

  const handleDisableEnforcement = async () => {
    const disable = buildEmergencyEnforcementDisablePatch('Admin emergency disable from Reliability Control Centre.')
    await handlePolicyUpdate(disable.patch, disable.enforcementMode)
  }

  return (
    <AdminShell
      title="Reliability Control Centre"
      subtitle="Human reliability supervision across confirmations, standby recovery, cancellations, payout controls, and policy."
    >
      {authLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-flame/30 border-t-flame" />
        </div>
      ) : !isAdmin ? (
        <AccessDenied />
      ) : loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-flame/30 border-t-flame" />
        </div>
      ) : (
        <div className="space-y-6">
          {actionMessage && (
            <div className="rounded-2xl border border-electric/25 bg-electric/10 p-4 text-sm font-semibold text-ink">
              {actionMessage}
            </div>
          )}

          {!rollout.adminDataVisible && (
            <div className="rounded-3xl border border-amber-300/30 bg-amber-300/10 p-5">
              <div className="text-sm font-black text-ink">Reliability Control Centre disabled</div>
              <p className="mt-1 text-sm text-muted">
                Admin visibility is currently disabled by feature flag. Use policy configuration to re-enable the control centre.
              </p>
            </div>
          )}

          {rollout.adminDataVisible && <section className="rounded-3xl border border-white/8 bg-white/5 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-ink">Reliability Overview</h2>
                <p className="mt-1 text-sm text-muted">Today&apos;s appointment confidence, exception queues, and recovery workload.</p>
              </div>
              <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-300">
                Internal only
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
              {overviewMetrics.map((metric, index) => {
                const Icon = metricIcons[index] ?? ShieldCheck
                return (
                  <MetricCard key={metric.key} label={metric.label} value={metric.value} tone={metric.tone} icon={<Icon className="h-4 w-4" />} />
                )
              })}
            </div>
          </section>}

          {rollout.adminDataVisible && <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <InspectorDetailPanel detail={inspectorDetail} />
            <JobTimelinePanel jobId={selectedJobId} timeline={timeline} />
          </div>}

          {rollout.adminDataVisible && <div className="grid gap-6 xl:grid-cols-2">
            <CancellationReviewQueue rows={snapshot.cancellations} onAction={handleCancellationAction} />
            <PayoutReviewQueue rows={snapshot.payoutReviews} onAction={handlePayoutAction} />
          </div>}

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <PolicyConfigPanel policy={policy} onUpdate={handlePolicyUpdate} onDisableEnforcement={handleDisableEnforcement} />
            <AuditTrailPanel rows={snapshot.auditEvents} />
          </div>

          <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
            <div className="text-xs font-black uppercase tracking-widest text-amber-300">Legal review boundary</div>
            <p className="mt-2 text-sm leading-6 text-muted">
              Reserve, payout, access, or penalty hooks remain configurable policy decisions. Observe-only remains the safe default unless legal review approves enforcement.
            </p>
          </div>
        </div>
      )}
    </AdminShell>
  )
}

function AccessDenied() {
  return (
    <div className="rounded-3xl border border-red-400/30 bg-red-500/10 p-6">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
        <div>
          <h2 className="text-base font-black text-ink">Admin access required</h2>
          <p className="mt-1 text-sm text-muted">Reliability scores, reserve hooks, payout review, and policy configuration are internal Admin-only controls.</p>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, tone, icon }: {
  label: string
  value: number
  tone: 'neutral' | 'watch' | 'critical' | 'success'
  icon: React.ReactNode
}) {
  const toneClass = {
    neutral: 'border-white/10 bg-white/5 text-muted',
    watch: 'border-amber-300/25 bg-amber-300/10 text-amber-300',
    critical: 'border-red-400/25 bg-red-500/10 text-red-300',
    success: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  }[tone]

  return (
    <div className="rounded-2xl border border-white/8 bg-surface/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-subtle">{label}</div>
          <div className="mt-2 text-2xl font-black text-ink">{value}</div>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${toneClass}`}>{icon}</div>
      </div>
    </div>
  )
}

function InspectorDetailPanel({ detail }: { detail: ReturnType<typeof buildInspectorReliabilityDetail> | null }) {
  return (
    <section className="rounded-3xl border border-white/8 bg-white/5 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-ink">Inspector Detail</h2>
          <p className="mt-1 text-sm text-muted">Internal score, reserve, payout speed, history, and admin notes.</p>
        </div>
        <ShieldCheck className="h-5 w-5 text-flame" />
      </div>
      {!detail ? (
        <EmptyState text="No inspector reliability profile is available yet." />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStat label="Current tier" value={detail.currentTier} />
            <MiniStat label="Reliability score" value={detail.reliabilityScore.toFixed(1)} />
            <MiniStat label="Attendance rate" value={`${detail.attendanceRate}%`} />
            <MiniStat label="No-show history" value={detail.noShowHistory.toString()} />
            <MiniStat label="Evidence completeness" value={detail.evidenceCompleteness} />
            <MiniStat label="Credential status" value={detail.credentialStatus} />
            <MiniStat label="Reserve requirement" value={detail.reserveRequirement} />
            <MiniStat label="Payout speed" value={detail.payoutSpeed} />
            <MiniStat label="Dispute history" value={detail.disputeHistory.toString()} />
          </div>
          <div className="rounded-2xl border border-white/8 bg-surface/50 p-4">
            <div className="text-xs font-black uppercase tracking-widest text-subtle">Recent reliability events</div>
            <div className="mt-3 space-y-2">
              {detail.recentEvents.length === 0 ? (
                <div className="text-sm text-muted">No events recorded.</div>
              ) : detail.recentEvents.map(event => (
                <div key={event.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/8 bg-white/5 px-3 py-2">
                  <div>
                    <div className="text-sm font-bold capitalize text-ink">{event.eventType.replaceAll('_', ' ')}</div>
                    <div className="text-xs text-muted">{formatDate(event.createdAt)}</div>
                  </div>
                  <span className="text-xs font-black text-muted">{event.scoreDelta}</span>
                </div>
              ))}
            </div>
          </div>
          <ReviewPanel title="Admin notes / tier history" rows={[
            ...detail.adminNotes.map((note, index) => ({ id: `note-${index}`, primary: note, secondary: 'Admin note', status: 'internal', at: '' })),
            ...detail.tierHistory.map((entry, index) => ({ id: `tier-${index}`, primary: entry.tier, secondary: entry.reason ?? 'Tier history', status: 'tier', at: entry.at })),
          ]} empty="No admin notes or tier history recorded." />
        </div>
      )}
    </section>
  )
}

function JobTimelinePanel({ jobId, timeline }: {
  jobId?: string
  timeline: ReturnType<typeof buildJobReliabilityTimeline>
}) {
  return (
    <section className="rounded-3xl border border-white/8 bg-white/5 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-black text-ink">Job Reliability Timeline</h2>
        <p className="mt-1 text-sm text-muted">{jobId ? `Selected job ${shortId(jobId)}` : 'No job timeline available yet.'}</p>
      </div>
      {timeline.length === 0 ? (
        <EmptyState text="No reliability timeline events are available for this job." />
      ) : (
        <div className="space-y-3">
          {timeline.map(item => (
            <div key={item.id} className="flex gap-3 rounded-2xl border border-white/8 bg-surface/50 p-3">
              <div className={`mt-1 h-3 w-3 rounded-full ${timelineTone(item.status)}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold capitalize text-ink">{item.label}</div>
                <div className="mt-0.5 text-xs text-muted">{item.detail}</div>
                <div className="mt-1 text-[10px] font-mono text-subtle">{formatDate(item.at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function CancellationReviewQueue({ rows, onAction }: {
  rows: ReliabilityCancellationRow[]
  onAction: (row: ReliabilityCancellationRow, decision: 'approved' | 'rejected' | 'overridden' | 'more_information') => void
}) {
  return (
    <section className="rounded-3xl border border-white/8 bg-white/5 p-5">
      <h2 className="text-lg font-black text-ink">Cancellation Review Queue</h2>
      <p className="mt-1 text-sm text-muted">Approve protected cancellations, classify invalid ones, request context, and trigger recovery.</p>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <EmptyState text="No cancellation reviews are open." />
        ) : rows.slice(0, 6).map(row => (
          <div key={row.id} className="rounded-2xl border border-white/8 bg-surface/50 p-4">
            <QueueHeader title={row.reasonCode.replaceAll('_', ' ')} status={row.validityStatus} subtitle={`${shortId(row.jobId)} · ${row.isLate ? 'late window' : 'not late'} · ${row.enforcementMode}`} />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <ActionButton label="Approve valid" onClick={() => onAction(row, 'approved')} />
              <ActionButton label="Classify invalid" onClick={() => onAction(row, 'rejected')} />
              <ActionButton label="Request more info" onClick={() => onAction(row, 'more_information')} />
              <ActionButton label="Override / waive" onClick={() => onAction(row, 'overridden')} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function PayoutReviewQueue({ rows, onAction }: {
  rows: PayoutReviewRow[]
  onAction: (row: PayoutReviewRow, decision: 'approve_payout' | 'block_payout' | 'apply_reserve' | 'issue_builder_credit' | 'waive_consequence') => void
}) {
  return (
    <section className="rounded-3xl border border-white/8 bg-white/5 p-5">
      <h2 className="text-lg font-black text-ink">Payout Review Queue</h2>
      <p className="mt-1 text-sm text-muted">Approve, hold, apply reserve, issue credit, waive consequence, and document rationale.</p>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <EmptyState text="No payout reviews are open." />
        ) : rows.slice(0, 6).map(row => (
          <div key={row.id} className="rounded-2xl border border-white/8 bg-surface/50 p-4">
            <QueueHeader title={row.blockReason?.replaceAll('_', ' ') ?? row.payoutStatus} status={row.adminReviewStatus} subtitle={`${shortId(row.assignmentId ?? row.jobId)} · ${row.paymentStatus} · reserve CAD ${row.reserveWithheldAmount.toFixed(2)}`} />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <ActionButton label="Approve payout" onClick={() => onAction(row, 'approve_payout')} disabled={!row.assignmentId} />
              <ActionButton label="Hold payout" onClick={() => onAction(row, 'block_payout')} disabled={!row.assignmentId} />
              <ActionButton label="Apply reserve" onClick={() => onAction(row, 'apply_reserve')} disabled={!row.assignmentId} />
              <ActionButton label="Issue builder credit" onClick={() => onAction(row, 'issue_builder_credit')} disabled={!row.assignmentId} />
              <ActionButton label="Waive consequence" onClick={() => onAction(row, 'waive_consequence')} disabled={!row.assignmentId} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function PolicyConfigPanel({ policy, onUpdate, onDisableEnforcement }: {
  policy: ActiveReliabilityPolicyConfig | null
  onUpdate: (patch: Record<string, unknown>, enforcementMode?: ReliabilityEnforcementMode) => void
  onDisableEnforcement: () => void
}) {
  const config = policy?.config ?? {}
  const rollout = evaluateReliabilityRollout(config)
  return (
    <section className="rounded-3xl border border-white/8 bg-white/5 p-5">
      <h2 className="text-lg font-black text-ink">Policy Config</h2>
      <p className="mt-1 text-sm text-muted">Admin-only view of enforcement mode, confirmation windows, tier thresholds, reserves, appeals, and standby rules.</p>
      {!policy ? (
        <EmptyState text="No active reliability policy version found." />
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniStat label="Version" value={policy.version} />
            <MiniStat label="Enforcement mode" value={policy.enforcementMode} />
            <MiniStat label="Kill switch" value={rollout.emergencyKillSwitch ? 'Enabled' : 'Off'} />
            <MiniStat label="Confirmation windows" value={jsonSummary(config.confirmationWindows ?? config.attendanceConfirmationWindows)} />
            <MiniStat label="Tier thresholds" value={jsonSummary(config.tierThresholds ?? config.thresholds)} />
            <MiniStat label="Reserve percentages" value={jsonSummary(config.tierReservePercents)} />
            <MiniStat label="Appeal window" value={`${String(config.appealWindowHours ?? 72)} hours`} />
            <MiniStat label="No-show defaults" value={jsonSummary(config.noShowConsequenceDefaults ?? config.builderNoShowResolution)} />
            <MiniStat label="Standby rules" value={jsonSummary({ enabled: config.standbyActivationEnabled, rush: config.standbyRushMultiplier })} />
            <MiniStat label="Money movement" value={rollout.moneyMovementAllowed ? 'Allowed by policy' : 'Disabled'} />
            <MiniStat label="Auto suspension" value={rollout.automaticSuspensionAllowed ? 'Explicitly enabled' : 'Admin confirmation required'} />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <ActionButton label="Set observe-only" onClick={() => onUpdate({}, 'observe_only')} />
            <ActionButton label="Emergency disable enforcement" onClick={onDisableEnforcement} />
            <ActionButton label="Enable standby alerts" onClick={() => onUpdate({ standbyNotificationsEnabled: true })} />
            <ActionButton label="Extend appeal window" onClick={() => onUpdate({ appealWindowHours: 96 })} />
          </div>
        </div>
      )}
    </section>
  )
}

function AuditTrailPanel({ rows }: { rows: ReliabilityAdminSnapshot['auditEvents'] }) {
  return (
    <ReviewPanel
      title="Admin Audit Trail"
      rows={rows.map(row => ({
        id: row.id,
        primary: row.action.replaceAll('_', ' '),
        secondary: `${row.entityType} · ${shortId(row.entityId)} · ${row.actorRole ?? 'unknown'}`,
        status: 'audited',
        at: row.createdAt,
      }))}
      empty="No reliability admin audit events recorded yet."
    />
  )
}

function ReviewPanel({ title, rows, empty }: {
  title: string
  rows: Array<{ id: string; primary: string; secondary: string; status: string; at: string }>
  empty: string
}) {
  return (
    <section className="rounded-3xl border border-white/8 bg-white/5 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-ink">{title}</h2>
        <span className="text-[10px] font-bold uppercase tracking-widest text-subtle">{rows.length} rows</span>
      </div>
      {rows.length === 0 ? (
        <EmptyState text={empty} />
      ) : (
        <div className="space-y-2">
          {rows.slice(0, 8).map(row => (
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
              {row.at && <div className="mt-2 text-[10px] font-mono text-subtle">{formatDate(row.at)}</div>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-surface/50 p-3">
      <div className="text-[10px] font-black uppercase tracking-widest text-subtle">{label}</div>
      <div className="mt-1 text-sm font-bold text-ink">{value}</div>
    </div>
  )
}

function QueueHeader({ title, status, subtitle }: { title: string; status: string; subtitle: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-black capitalize text-ink">{title}</div>
        <div className="mt-1 text-xs text-muted">{subtitle}</div>
      </div>
      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-muted">
        {status}
      </span>
    </div>
  )
}

function ActionButton({ label, onClick, disabled = false }: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <Button variant="secondary" size="sm" onClick={onClick} disabled={disabled} className="justify-center text-xs">
      {label}
    </Button>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-surface/40 px-4 py-8 text-center text-sm text-muted">
      {text}
    </div>
  )
}

function timelineTone(status: 'complete' | 'pending' | 'risk' | 'admin'): string {
  if (status === 'complete') return 'bg-emerald-400'
  if (status === 'risk') return 'bg-red-400'
  if (status === 'admin') return 'bg-amber-300'
  return 'bg-slate-400'
}

function jsonSummary(value: unknown): string {
  if (value == null) return 'Not configured'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value).slice(0, 80)
}

function shortId(value?: string): string {
  if (!value) return 'unassigned'
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
