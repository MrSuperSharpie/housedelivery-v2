import React from 'react'
import {
  CheckCircle2,
  FileText,
  Headphones,
  Lock,
  RefreshCcw,
  Shield,
  UserCheck,
} from 'lucide-react'
import {
  BUILDER_RELIABILITY_GUARANTEE_BODY,
  BUILDER_RELIABILITY_GUARANTEE_BULLETS,
  BUILDER_RELIABILITY_GUARANTEE_TITLE,
  type BuilderReliabilityStatusModel,
} from '@/lib/builderReliabilityGuarantee'

interface ReliabilityGuaranteeProps {
  compact?: boolean
  enabled?: boolean
  inspectorName?: string | null
  status?: BuilderReliabilityStatusModel
  showStatus?: boolean
}

const GUARANTEE_ICONS = [UserCheck, CheckCircle2, Lock, RefreshCcw, Headphones, FileText] as const

const STATUS_STYLES: Record<BuilderReliabilityStatusModel['status'], string> = {
  confirmed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  awaiting_reconfirmation: 'border-blue-200 bg-blue-50 text-blue-700',
  at_risk: 'border-amber-200 bg-amber-50 text-amber-700',
  reassignment_in_progress: 'border-purple-200 bg-purple-50 text-purple-700',
  completed: 'border-slate-200 bg-slate-50 text-slate-700',
}

export function ReliabilityGuarantee({
  compact = false,
  enabled = true,
  inspectorName,
  status,
  showStatus = false,
}: ReliabilityGuaranteeProps) {
  const sectionId = React.useId()

  if (!enabled) return null

  return (
    <section
      aria-labelledby={sectionId}
      className={`rounded-2xl border border-blue-100 bg-white shadow-sm ${compact ? 'p-4' : 'p-5'}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
          <Shield className="h-5 w-5 text-blue-600" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={sectionId} className="text-sm font-black uppercase tracking-wide text-blueprint-blue">
            {BUILDER_RELIABILITY_GUARANTEE_TITLE}
          </h2>
          <p className={`mt-1 text-sm leading-relaxed text-slate-600 ${compact ? 'text-xs' : ''}`}>
            {BUILDER_RELIABILITY_GUARANTEE_BODY}
          </p>
        </div>
      </div>

      <div className={`grid gap-2 ${compact ? 'mt-3 sm:grid-cols-2' : 'mt-4 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {BUILDER_RELIABILITY_GUARANTEE_BULLETS.map((bullet, index) => {
          const Icon = GUARANTEE_ICONS[index] ?? CheckCircle2
          return (
            <div key={bullet} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <Icon className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" />
              <span className="text-xs font-semibold text-slate-700">{bullet}</span>
            </div>
          )
        })}
      </div>

      {showStatus && status && (
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                Appointment confidence status
              </div>
              <p className="mt-1 text-sm text-slate-600">{status.copy}</p>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${STATUS_STYLES[status.status]}`}>
              {status.label}
            </span>
          </div>

          <dl className="grid gap-3 text-xs sm:grid-cols-2">
            <StatusItem label="Inspector assigned" value={inspectorName?.trim() || 'Pending assignment confirmation'} />
            <StatusItem label="Next confirmation checkpoint" value={status.nextConfirmationCheckpoint} />
            <StatusItem label="Vero action" value={status.veroAction} />
            <StatusItem label="Escrow protection" value={status.escrowProtection} />
            <StatusItem label="Support escalation path" value={status.supportEscalationPath} />
          </dl>
        </div>
      )}
    </section>
  )
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white bg-white p-3">
      <dt className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-xs font-semibold leading-relaxed text-slate-700">{value}</dd>
    </div>
  )
}
