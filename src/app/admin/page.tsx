'use client'
export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  Building2, HardHat, FileCheck, PauseCircle, Package, DollarSign,
  ShieldAlert, AlertTriangle, Activity, ArrowRight, Loader2, Shield,
  Sparkles, Orbit, Server,
} from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

interface DashStats {
  totalBuilders: number
  approvedBuilders: number
  pendingBuilders: number
  totalInspectors: number
  approvedInspectors: number
  pendingInspectors: number
  jobsThisMonth: number
  sealedPackages: number
}

async function fetchDashStats(): Promise<DashStats> {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [
    { data: builders },
    { data: inspectors },
    { data: jobs },
    { data: packages },
  ] = await Promise.all([
    supabase.from('builder_onboarding_status').select('status'),
    supabase.from('inspector_onboarding_status').select('status'),
    supabase.from('job_opportunities').select('id', { count: 'exact', head: true })
      .gte('created_at', monthStart.toISOString()),
    supabase.from('compliance_completed_records').select('id', { count: 'exact', head: true }),
  ])

  const builderRows = (builders ?? []) as { status: string }[]
  const inspectorRows = (inspectors ?? []) as { status: string }[]

  const PENDING = ['submitted', 'under_review', 'needs_info']

  return {
    totalBuilders: builderRows.length,
    approvedBuilders: builderRows.filter(r => r.status === 'approved').length,
    pendingBuilders: builderRows.filter(r => PENDING.includes(r.status)).length,
    totalInspectors: inspectorRows.length,
    approvedInspectors: inspectorRows.filter(r => r.status === 'approved').length,
    pendingInspectors: inspectorRows.filter(r => PENDING.includes(r.status)).length,
    jobsThisMonth: jobs?.length ?? 0,
    sealedPackages: packages?.length ?? 0,
  }
}

const SYSTEM_HEALTH = [
  { label: 'Supabase DB', status: 'ok', latency: 'Live' },
  { label: 'Storage bucket', status: 'ok', latency: 'Attached' },
  { label: 'Escrow engine', status: 'pending', latency: 'Pending' },
  { label: 'Email delivery', status: 'pending', latency: 'Pending' },
] as const

type Tone = 'default' | 'warning' | 'electric' | 'success' | 'danger'

const TONE_STYLES: Record<Tone, {
  iconWrap: string
  icon: string
  pill: string
  value: string
  border: string
}> = {
  default: {
    iconWrap: 'bg-white/8 border-white/10',
    icon: 'text-ink',
    pill: 'bg-white/8 text-muted border-white/10',
    value: 'text-ink',
    border: 'border-white/10',
  },
  warning: {
    iconWrap: 'bg-warning-amber/12 border-warning-amber/20',
    icon: 'text-warning-amber',
    pill: 'bg-warning-amber/10 text-warning-amber border-warning-amber/20',
    value: 'text-warning-amber',
    border: 'border-warning-amber/20',
  },
  electric: {
    iconWrap: 'bg-electric/12 border-electric/20',
    icon: 'text-electric',
    pill: 'bg-electric/10 text-electric border-electric/20',
    value: 'text-electric',
    border: 'border-electric/20',
  },
  success: {
    iconWrap: 'bg-success-green/12 border-success-green/20',
    icon: 'text-success-green',
    pill: 'bg-success-green/10 text-success-green border-success-green/20',
    value: 'text-success-green',
    border: 'border-success-green/20',
  },
  danger: {
    iconWrap: 'bg-fail-red/10 border-fail-red/20',
    icon: 'text-fail-red',
    pill: 'bg-fail-red/10 text-fail-red border-fail-red/20',
    value: 'text-fail-red',
    border: 'border-fail-red/20',
  },
}

function SectionHeader({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  eyebrow: string
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="label-mono admin-section-label mb-2">{eyebrow}</div>
        <h2 className="text-lg font-black tracking-[-0.04em] text-ink sm:text-[1.35rem]">{title}</h2>
        <p className="admin-body-strong mt-1 max-w-2xl text-sm text-muted">{description}</p>
      </div>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="touch-target inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-muted transition-all hover:border-white/15 hover:bg-white/8 hover:text-ink"
        >
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  sub,
  meta,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: string | number
  sub: string
  meta: string
  icon: LucideIcon
  tone?: Tone
}) {
  const styles = TONE_STYLES[tone]

  return (
    <div className={`admin-stat-card relative overflow-hidden rounded-[26px] border p-4 sm:p-5 ${styles.border}`}>
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="label-mono admin-section-label">{label}</div>
          <div className={`mt-3 text-[2rem] font-black tracking-[-0.06em] ${styles.value}`}>
            {value}
          </div>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${styles.iconWrap}`}>
          <Icon className={`h-5 w-5 ${styles.icon}`} />
        </div>
      </div>
      <div className="admin-body-strong mt-2 text-sm text-muted">{sub}</div>
      <div className={`mt-4 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${styles.pill}`}>
        {meta}
      </div>
    </div>
  )
}

function QueueCard({
  label,
  count,
  href,
  icon: Icon,
  tone,
}: {
  label: string
  count: number
  href: string
  icon: LucideIcon
  tone: Exclude<Tone, 'default'>
}) {
  const activeTone = count > 0 ? tone : 'default'
  const styles = TONE_STYLES[activeTone]

  return (
    <Link
      href={href}
      className={`admin-queue-card group flex h-full flex-col rounded-[24px] border p-4 transition-all duration-200 hover:-translate-y-0.5 sm:p-5 ${styles.border}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${styles.iconWrap}`}>
          <Icon className={`h-5 w-5 ${styles.icon}`} />
        </div>
        <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${styles.pill}`}>
          {count > 0 ? 'Needs review' : 'Clear'}
        </div>
      </div>

      <div className={`mt-5 text-[2rem] font-black tracking-[-0.06em] ${styles.value}`}>
        {count}
      </div>
      <div className="mt-1 text-sm font-semibold text-ink">{label}</div>
      <p className="admin-body-strong mt-2 flex-1 text-sm text-muted">
        {count > 0
          ? `${count} ${count === 1 ? 'item is' : 'items are'} waiting for admin attention.`
          : 'No active backlog in this queue right now.'}
      </p>

      <div className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-muted transition-colors group-hover:text-ink">
        <span>{count > 0 ? 'Open queue' : 'Inspect section'}</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  )
}

function LoadingMetricCard() {
  return (
    <div className="admin-stat-card overflow-hidden rounded-[26px] border border-white/10 p-4 sm:p-5">
      <div className="h-3 w-24 rounded-full bg-white/10" />
      <div className="mt-4 h-9 w-20 rounded-2xl bg-white/10" />
      <div className="mt-3 h-3 w-36 rounded-full bg-white/8" />
      <div className="mt-4 h-7 w-28 rounded-full bg-white/8" />
    </div>
  )
}

function HealthBadge({ status }: { status: 'ok' | 'pending' }) {
  const classes = status === 'ok'
    ? 'bg-success-green/10 text-success-green border-success-green/20'
    : 'bg-warning-amber/10 text-warning-amber border-warning-amber/20'

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${classes}`}>
      {status === 'ok' ? 'Stable' : 'Pending'}
    </span>
  )
}

export default function AdminHomePage() {
  const { user, isLoading: authLoading } = useAuth()
  const [stats, setStats] = useState<DashStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (user?.role !== 'admin') return
    fetchDashStats()
      .then(s => {
        setStats(s)
        setLoading(false)
      })
      .catch(err => {
        console.error('[Admin] fetchDashStats failed', err)
        setLoading(false)
      })
  }, [authLoading, user?.role])

  const queueCards = stats ? [
    { label: 'Builders pending approval', count: stats.pendingBuilders, href: '/admin/builders', icon: Building2, tone: 'warning' as const },
    { label: 'Inspectors pending review', count: stats.pendingInspectors, href: '/admin/inspectors', icon: HardHat, tone: 'warning' as const },
    { label: 'Sealed packages', count: stats.sealedPackages, href: '/admin/packages', icon: Package, tone: 'electric' as const },
    { label: 'Open disputes', count: 0, href: '/admin/disputes', icon: ShieldAlert, tone: 'danger' as const },
    { label: 'Active holds', count: 0, href: '/admin/holds', icon: PauseCircle, tone: 'danger' as const },
    { label: 'Submissions awaiting seal', count: 0, href: '/admin/submissions', icon: FileCheck, tone: 'electric' as const },
  ] : []

  const totalReviewPressure = (stats?.pendingBuilders ?? 0) + (stats?.pendingInspectors ?? 0)
  const okSystems = SYSTEM_HEALTH.filter(item => item.status === 'ok').length

  return (
    <AdminShell
      title="Control Plane"
      subtitle="SiteLine internal admin for approvals, queues, and operational health."
    >
      <div className="space-y-6 lg:space-y-7">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
          <section className="admin-surface-card overflow-hidden rounded-[28px] border border-white/10 p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <div className="label-mono admin-section-label mb-3">Operations snapshot</div>
                <h2 className="text-[1.6rem] font-black tracking-[-0.05em] text-ink sm:text-[1.9rem]">
                  Review pressure, account volume, and system readiness in one pass.
                </h2>
                <p className="admin-body-strong mt-3 text-sm text-muted sm:text-[15px]">
                  Review workload, account volume, and system status at a glance.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[20rem]">
                <div className="admin-surface-card-soft rounded-[22px] border border-white/10 p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-flame/20 bg-flame/10">
                      <Sparkles className="h-4.5 w-4.5 text-flame" />
                    </div>
                    <div className="label-mono admin-section-label">Priority queues</div>
                  </div>
                  <div className="mt-4 text-3xl font-black tracking-[-0.06em] text-ink">
                    {loading ? '—' : totalReviewPressure}
                  </div>
                  <div className="admin-body-strong mt-1 text-sm text-muted">
                    {loading ? 'Loading current review pressure...' : totalReviewPressure > 0 ? 'Items currently awaiting review.' : 'No active review backlog.'}
                  </div>
                </div>

                <div className="admin-surface-card-soft rounded-[22px] border border-white/10 p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-success-green/20 bg-success-green/10">
                      <Shield className="h-4.5 w-4.5 text-success-green" />
                    </div>
                    <div className="label-mono admin-section-label">System watch</div>
                  </div>
                  <div className="mt-4 text-3xl font-black tracking-[-0.06em] text-ink">
                    {okSystems}/{SYSTEM_HEALTH.length}
                  </div>
                  <div className="admin-body-strong mt-1 text-sm text-muted">
                    Stable systems reporting clean status.
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="admin-surface-card-soft rounded-[28px] border border-white/10 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-electric/20 bg-electric/10">
                <Orbit className="h-4.5 w-4.5 text-electric" />
              </div>
              <div>
                <div className="label-mono admin-section-label">Operational posture</div>
                <div className="mt-1 text-base font-black tracking-[-0.04em] text-ink">
                  {loading ? 'Syncing dashboard...' : totalReviewPressure > 0 ? 'Action required today' : 'Queues look controlled'}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {[
                {
                  label: 'Builder reviews',
                  value: loading ? '—' : String(stats?.pendingBuilders ?? 0),
                  tone: (stats?.pendingBuilders ?? 0) > 0 ? 'warning' : 'default',
                },
                {
                  label: 'Inspector reviews',
                  value: loading ? '—' : String(stats?.pendingInspectors ?? 0),
                  tone: (stats?.pendingInspectors ?? 0) > 0 ? 'warning' : 'default',
                },
                {
                  label: 'Packages sealed',
                  value: loading ? '—' : String(stats?.sealedPackages ?? 0),
                  tone: (stats?.sealedPackages ?? 0) > 0 ? 'electric' : 'default',
                },
              ].map(item => {
                const styles = TONE_STYLES[item.tone as Tone]

                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <span className="admin-body-strong text-sm text-muted">{item.label}</span>
                    <span className={`text-lg font-black tracking-[-0.04em] ${styles.value}`}>{item.value}</span>
                  </div>
                )
              })}
            </div>

            <Link
              href="/admin/audit"
              className="touch-target mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-muted transition-all hover:border-white/15 hover:bg-white/8 hover:text-ink"
            >
              Open audit log
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        </div>

        <section>
          <SectionHeader
            eyebrow="Key metrics"
            title="Live metrics"
            description="Core activity and completion indicators."
          />

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <LoadingMetricCard key={index} />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Builders"
                value={stats?.totalBuilders ?? 0}
                sub={`${stats?.approvedBuilders ?? 0} approved builder accounts`}
                meta={`${stats?.pendingBuilders ?? 0} pending`}
                icon={Building2}
                tone="default"
              />
              <MetricCard
                label="Inspectors"
                value={stats?.totalInspectors ?? 0}
                sub={`${stats?.approvedInspectors ?? 0} approved inspector accounts`}
                meta={`${stats?.pendingInspectors ?? 0} pending`}
                icon={HardHat}
                tone="default"
              />
              <MetricCard
                label="Jobs this month"
                value={stats?.jobsThisMonth ?? 0}
                sub="Openings created since month start"
                meta="Current month"
                icon={Activity}
                tone="warning"
              />
              <MetricCard
                label="Sealed packages"
                value={stats?.sealedPackages ?? 0}
                sub="Compliance records completed"
                meta="Ready in vault"
                icon={Package}
                tone="success"
              />
            </div>
          )}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
          <div className="space-y-6">
            <section>
          <SectionHeader
            eyebrow="Queue management"
            title="Queues that need attention"
            description="Pending reviews and actions across the system."
          />

              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="admin-queue-card rounded-[24px] border border-white/10 p-5">
                      <div className="h-11 w-11 rounded-2xl bg-white/10" />
                      <div className="mt-5 h-9 w-14 rounded-2xl bg-white/10" />
                      <div className="mt-3 h-4 w-40 rounded-full bg-white/8" />
                      <div className="mt-2 h-3 w-full rounded-full bg-white/8" />
                      <div className="mt-5 h-3 w-24 rounded-full bg-white/8" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {queueCards.map(card => (
                    <QueueCard
                      key={card.href}
                      label={card.label}
                      count={card.count}
                      href={card.href}
                      icon={card.icon}
                      tone={card.tone}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <SectionHeader
                eyebrow="Activity"
                title="Recent activity"
                description="A cleaner holding state for the audit area until the live event feed is connected."
                actionHref="/admin/audit"
                actionLabel="View audit log"
              />

              <div className="admin-surface-card rounded-[28px] border border-white/10 p-6 text-center sm:p-7">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-white/5">
                  <Activity className="h-6 w-6 text-muted" />
                </div>
                <div className="mt-5 text-lg font-black tracking-[-0.04em] text-ink">
                  Audit feed is not connected yet
                </div>
                <p className="admin-body-strong mx-auto mt-2 max-w-xl text-sm text-muted">
                  Once the event stream is wired in, this section can surface approvals, disputes, package sealing,
                  and admin interventions without forcing the team into the full log view.
                </p>
                <div className="mt-5 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-muted">
                  Placeholder surface with cleaner hierarchy
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="admin-surface-card rounded-[28px] border border-white/10 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="label-mono admin-section-label">System health</div>
                  <h2 className="mt-2 text-lg font-black tracking-[-0.04em] text-ink">Service watchlist</h2>
                  <p className="admin-body-strong mt-1 text-sm text-muted">
                    Status framing for the core services admins care about during review and payout flows.
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <Server className="h-5 w-5 text-muted" />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {SYSTEM_HEALTH.map(item => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink">{item.label}</div>
                      <div className="admin-body-strong text-xs text-muted">{item.latency}</div>
                    </div>
                    <HealthBadge status={item.status} />
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-surface-card rounded-[28px] border border-white/10 p-5 sm:p-6">
              <div className="label-mono admin-section-label">Escalations</div>
              <h2 className="mt-2 text-lg font-black tracking-[-0.04em] text-ink">Priority watch</h2>

              {loading ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing queue pressure...
                </div>
              ) : totalReviewPressure > 0 ? (
                <div className="mt-4 rounded-[24px] border border-warning-amber/20 bg-warning-amber/8 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-warning-amber/20 bg-warning-amber/10">
                      <AlertTriangle className="h-4.5 w-4.5 text-warning-amber" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-warning-amber">
                        {totalReviewPressure} item{totalReviewPressure === 1 ? '' : 's'} need active review
                      </div>
                      <div className="mt-1 text-sm text-warning-amber">
                        Builder and inspector onboarding queues are the current operational bottleneck.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[24px] border border-success-green/20 bg-success-green/8 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-success-green/20 bg-success-green/10">
                      <Shield className="h-4.5 w-4.5 text-success-green" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-success-green">No active review bottleneck</div>
                      <div className="mt-1 text-sm text-success-green">
                        Queue pressure is currently controlled. This is a clean moment to audit settings and payouts.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="admin-surface-card rounded-[28px] border border-white/10 p-5 sm:p-6">
              <div className="label-mono admin-section-label">Quick links</div>
              <h2 className="mt-2 text-lg font-black tracking-[-0.04em] text-ink">Common admin paths</h2>
              <div className="mt-5 space-y-2.5">
                {[
                  { href: '/admin/audit', label: 'View full audit log', icon: Activity },
                  { href: '/admin/payments', label: 'Open escrow overview', icon: DollarSign },
                  { href: '/admin/builders', label: 'Review builder submissions', icon: Building2 },
                ].map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="admin-link-card group flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-flame/20 bg-flame/10">
                      <Icon className="h-4.5 w-4.5 text-flame" />
                    </div>
                    <span className="admin-body-strong flex-1 text-sm text-muted">{label}</span>
                    <ArrowRight className="h-4 w-4 text-muted transition-colors group-hover:text-ink" />
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
