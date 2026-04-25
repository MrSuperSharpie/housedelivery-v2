import Link from 'next/link'
import type React from 'react'
import { Award, BadgeCheck, CheckCircle2, Clock3, FileCheck2, HelpCircle, ShieldCheck, Sparkles } from 'lucide-react'
import type { ReliabilityDashboardMetric, ReliabilityDashboardModel } from '@/lib/reliabilityDashboard'

interface ReliabilityTierDashboardProps {
  model: ReliabilityDashboardModel
  enabled?: boolean
}

const tierStyles: Record<ReliabilityDashboardModel['tier'], string> = {
  verified: 'from-sky-500/15 via-white/80 to-white border-sky-200 text-sky-800',
  preferred: 'from-emerald-500/15 via-white/80 to-white border-emerald-200 text-emerald-800',
  priority: 'from-amber-500/15 via-white/80 to-white border-amber-200 text-amber-800',
  elite: 'from-violet-500/15 via-white/80 to-white border-violet-200 text-violet-800',
}

export function ReliabilityTierDashboard({ model, enabled = true }: ReliabilityTierDashboardProps) {
  if (!enabled) return null

  return (
    <section
      aria-labelledby="reliability-dashboard-title"
      className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <div className={`bg-gradient-to-br p-5 sm:p-6 ${tierStyles[model.tier]}`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-current/20 bg-white/60 px-3 py-1 text-[11px] font-black uppercase tracking-widest">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Inspector Reliability
            </div>
            <h2 id="reliability-dashboard-title" className="mt-4 text-2xl font-black tracking-tight text-ink sm:text-3xl">
              Reliability creates opportunity.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
              Vero rewards inspectors who protect builder schedules, communicate clearly, and complete professional inspection records.
            </p>
            {model.isNewInspector && (
              <p className="mt-4 rounded-2xl border border-white/70 bg-white/70 p-3 text-sm leading-6 text-slate-700">
                Vero is built to protect good inspectors as well as builders. Builders pre-fund work through escrow, and inspectors who perform reliably earn stronger access to the platform.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm lg:min-w-64" aria-label={`Current tier ${model.tierLabel}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Award className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-subtle">Current Tier</div>
                <div className="text-2xl font-black text-ink">{model.tierLabel}</div>
              </div>
            </div>
            <div className="mt-4" aria-label={`Reliability score ${model.score} out of 100`}>
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-subtle">
                <span>Reliability score</span>
                <span>{model.score}/100</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-slate-950" style={{ width: `${model.score}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/70 bg-white/75 p-4">
          <p className="text-sm leading-6 text-slate-700">
            Your tier helps determine access to priority jobs, payout speed, and premium opportunities. The more reliable your record, the more Vero can trust you with higher-value work.
          </p>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <Panel title={`${model.tierLabel} Benefits`} icon={<BadgeCheck className="h-4 w-4" aria-hidden="true" />}>
            <ul className="space-y-2">
              {model.benefits.map(benefit => (
                <li key={benefit} className="flex gap-2 text-sm leading-6 text-muted">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="What Helps" icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}>
            <div className="grid gap-2 sm:grid-cols-2">
              {model.helpfulActions.map(action => (
                <div key={action} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                  {action}
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Reliability Metrics" icon={<Clock3 className="h-4 w-4" aria-hidden="true" />}>
            <div className="grid gap-3 sm:grid-cols-2">
              {model.metrics.map(metric => (
                <MetricCard key={metric.label} metric={metric} />
              ))}
            </div>
          </Panel>

          <Panel title="Protected Professional Judgment" icon={<FileCheck2 className="h-4 w-4" aria-hidden="true" />}>
            <p className="mb-3 text-sm leading-6 text-muted">
              Vero does not penalize inspectors for independent professional judgment or legitimate site conditions.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {model.protectedEvents.map(event => (
                <li key={event} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
                  {event}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm text-muted">
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {model.disputedEventCount > 0
                ? `${model.disputedEventCount} event${model.disputedEventCount === 1 ? '' : 's'} available for review.`
                : 'If an event looks wrong, ask Vero Admin for review with supporting context.'}
            </span>
          </div>
          <Link
            href="/inspector/profile#reliability-review"
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
          >
            Request Review or Appeal
          </Link>
        </div>
      </div>
    </section>
  )
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          {icon}
        </div>
        <h3 className="text-sm font-black text-ink">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function MetricCard({ metric }: { metric: ReliabilityDashboardMetric }) {
  const statusClass = metric.status === 'strong'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : metric.status === 'review'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-sky-200 bg-sky-50 text-sky-900'

  return (
    <div className={`rounded-2xl border p-3 ${statusClass}`}>
      <div className="text-[11px] font-black uppercase tracking-widest opacity-75">{metric.label}</div>
      <div className="mt-1 text-xl font-black">{metric.value}</div>
      <p className="mt-1 text-xs leading-5 opacity-80">{metric.helper}</p>
    </div>
  )
}
