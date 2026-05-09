'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, TrendingUp, ChevronRight, MapPin,
  CheckCircle2, Clock, AlertTriangle,
  Navigation, Shield, Lock, ExternalLink
} from 'lucide-react'
import { Navbar } from '@/components/shared/Navbar'
import { ProjectCard } from '@/components/builder/ProjectCard'
import { DispatchModal } from '@/components/builder/DispatchModal'
import { EnRouteTracker } from '@/components/builder/EnRouteTracker'
import { DailyFlash } from '@/components/builder/DailyFlash'
import { MOCK_BUILDER } from '@/lib/mockData'
import { useAuth } from '@/lib/auth'
import { useStore } from '@/lib/store'
import type { Assignment, ObjectionReason } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { getBuilderOnboardingStatusAsync } from '@/lib/persistence/builderOnboarding'
import type { BuilderOnboardingStatus } from '@/lib/persistence/builderOnboarding'
import type { Project, DispatchTier, InspectionStatus } from '@/lib/types'
import type { HoldRecord } from '@/lib/types'
import {
  builderApproveHold,
  builderDeclineHold,
  listHoldDetailsForJob,
  requestOnSiteCorrectionReview,
  acknowledgeModificationHold,
  declineModificationHold,
  listInspectionHoldsForJob,
  type HoldDetail,
  type InspectionHold,
} from '@/lib/supabase/holds'
import { listJobsByBuilder } from '@/lib/supabase/jobs'
import type { JobOpportunityRow } from '@/lib/supabase/jobs'
import { getJobWorkflowLabel, getJobWorkflowState } from '@/lib/workflow'
import { HOLD_BUILDER_ACTIONABLE_STATUSES, isHoldOpenStatus } from '@/lib/holds/workflow'
import { resolveHoldBaseRate } from '@/lib/pricing/config'
import { calculateBaseHoldServiceFee, calculateWindowFee } from '@/utils/pricing'
import { resolveReportDataMode } from '@/lib/dataSourceMode'
import { buildBuilderReliabilityStatus } from '@/lib/builderReliabilityGuarantee'

// FIX #1: createClient() must not be called between import statements.
// Moved here, after all imports, as a module-level constant.
const supabase = createClient()

// ─── Assignment panel helpers ──────────────────────────────────────────────────

const BUILDER_STAGE_DEFINITIONS = [
  { number: 1, internalStage: 1, label: 'Stage 1 — Site Survey & Excavation' },
  { number: 2, internalStage: 5, label: 'Stage 2 — Foundation Pour' },
  { number: 3, internalStage: 6, label: 'Stage 3 — Framing & Lock-up' },
  { number: 4, internalStage: 12, label: 'Stage 4 — Insulation & Vapor Barrier' },
  { number: 5, internalStage: 15, label: 'Stage 5 — Final Occupancy Permit' },
] as const

type BuilderStageDefinition = typeof BUILDER_STAGE_DEFINITIONS[number]
type BuilderStageStatus =
  | 'not_requested'
  | 'requested_live'
  | 'inspector_assigned'
  | 'in_progress'
  | 'passed'
  | 'hold'
  | 'failed'
  | 'available_next'
  | 'locked'

type CompletionReportSummary = {
  jobId: string
  status?: string
  sealPayload: Record<string, unknown>
  submittedAt?: string
  sealedAt?: string
  updatedAt?: string
}

type PermitProgressProject = {
  key: string
  projectName: string
  address: string
  city?: string
  representativeJob?: JobOpportunityRow
  sourceProject?: Project
  jobs: JobOpportunityRow[]
}

type StageScorecardEntry = {
  stage: BuilderStageDefinition
  stageJob?: JobOpportunityRow
  report?: CompletionReportSummary
  status: BuilderStageStatus
}

type NextUpItem = {
  progressProject: PermitProgressProject
  stageScorecard: StageScorecardEntry[]
  availableStage?: StageScorecardEntry
  latestPassedStage?: StageScorecardEntry
  requestProject: Project | null
  ambiguous: boolean
}

type StageRequestCandidate = {
  id: string
  projectId?: string
  builderId?: string
  projectName?: string
  address?: string
  city?: string
  permitNumber?: string
  stage?: number
  status?: string
}

const ACTIVE_STAGE_REQUEST_STATUSES = new Set([
  'live',
  'pending_validation',
  'validated',
  'provisionally_assigned',
  'confirmed',
  'in_progress',
  'on_hold',
])

const OBJECTION_REASONS: { value: ObjectionReason; label: string; desc: string }[] = [
  { value: 'conflict_of_interest',    label: 'Conflict of interest',      desc: 'Inspector has a personal or financial conflict with this project.' },
  { value: 'access_concern',          label: 'Access concern',            desc: 'Inspector cannot safely or practically access the site.' },
  { value: 'continuity_requirement',  label: 'Continuity requirement',    desc: 'Prior inspection continuity requires a specific inspector.' },
  { value: 'credential_mismatch',     label: 'Credential mismatch',       desc: "Inspector's credentials do not match stage requirements." },
  { value: 'prior_admin_restriction', label: 'Prior admin restriction',   desc: 'Admin has previously restricted this inspector from this project.' },
]

function useCountdown(targetIso: string) {
  const [remaining, setRemaining] = React.useState(() => {
    const ms = new Date(targetIso).getTime() - Date.now()
    return Math.max(0, ms)
  })
  React.useEffect(() => {
    const t = setInterval(() => {
      const ms = new Date(targetIso).getTime() - Date.now()
      setRemaining(Math.max(0, ms))
    }, 1000)
    return () => clearInterval(t)
  }, [targetIso])
  const h = Math.floor(remaining / 3600000)
  const m = Math.floor((remaining % 3600000) / 60000)
  const s = Math.floor((remaining % 60000) / 1000)
  const expired = remaining === 0
  return { h, m, s, expired, remaining }
}

function buildAssignmentReliabilityStatus(assignment: Assignment, objectionWindowExpired: boolean) {
  const appointmentStart = getAssignmentAppointmentStart(assignment)
  const nextRequiredAt = appointmentStart
    ? new Date(appointmentStart.getTime() - 24 * 60 * 60 * 1000).toISOString()
    : null

  return buildBuilderReliabilityStatus({
    assignmentStatus: assignment.status === 'provisional' && objectionWindowExpired ? 'confirmed' : assignment.status,
    nextConfirmationCheckpoint: appointmentStart
      ? '24-hour attendance reconfirmation'
      : 'Next scheduled attendance check',
    nextConfirmationRequiredAt: nextRequiredAt,
    completed: assignment.status === 'completed',
  })
}

function getAssignmentAppointmentStart(assignment: Assignment): Date | null {
  if (assignment.claimedSlot.flexible || !assignment.claimedSlot.date || !assignment.claimedSlot.startTime) {
    return null
  }

  const start = new Date(`${assignment.claimedSlot.date}T${assignment.claimedSlot.startTime}:00`)
  return Number.isNaN(start.getTime()) ? null : start
}

function ProvisionalAssignmentPanel({
  assignment,
  jobName,
  jobAddress,
  onObject,
}: {
  assignment: Assignment
  jobName: string
  jobAddress?: string
  onObject: (reason: ObjectionReason, note: string) => void
}) {
  const { h, m, s, expired } = useCountdown(assignment.objectionWindowClosesAt)
  const [showForm, setShowForm] = React.useState(false)
  const [showDetails, setShowDetails] = React.useState(false)
  const [reason, setReason] = React.useState<ObjectionReason | ''>('')
  const [note, setNote] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [objected, setObjected] = React.useState(false)
  const isConfirmed = assignment.status === 'confirmed' || expired
  const reliabilityStatus = buildAssignmentReliabilityStatus(assignment, expired)
  const statusLabel = assignment.objectionState === 'pending_review' || objected
    ? 'Builder objection under admin review'
    : isConfirmed
      ? 'Confirmed'
      : 'Provisional'
  const actionCopy = assignment.objectionState === 'pending_review' || objected
    ? 'Builder action recorded'
    : isConfirmed
      ? 'No builder action required right now'
      : 'Optional builder objection window open'
  const appointmentTime = assignment.claimedSlot.flexible
    ? 'Flexible timing'
    : `${new Date(assignment.claimedSlot.date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })} · ${assignment.claimedSlot.startTime}–${assignment.claimedSlot.endTime}`

  const handleObject = async () => {
    if (!reason || !note.trim()) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 700))
    setObjected(true)
    onObject(reason as ObjectionReason, note)
    setSubmitting(false)
  }

  return (
    <div className="rounded-2xl border border-rim bg-panel p-4 shadow-card">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
              isConfirmed
                ? 'border-emerald-500/30 bg-emerald-500/10 text-ink'
                : assignment.objectionState === 'pending_review' || objected
                  ? 'border-amber-500/40 bg-amber-500/10 text-ink'
                  : 'border-blue-500/30 bg-blue-500/10 text-ink'
            }`}>
              {isConfirmed ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {statusLabel}
            </span>
            <span className="text-xs font-semibold text-muted">{appointmentTime}</span>
          </div>
          <div className="mt-2 truncate text-sm font-extrabold text-ink">{jobName}</div>
          {jobAddress && <div className="mt-0.5 truncate text-xs font-medium text-muted">{jobAddress}</div>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>Inspector: <span className="font-bold text-ink">{assignment.inspectorName || 'Inspector assigned'}</span></span>
            {assignment.inspectorLicense && <span>Licence: <span className="font-mono font-semibold text-ink">{assignment.inspectorLicense}</span></span>}
            <span>Next checkpoint: <span className="font-semibold text-ink">{reliabilityStatus.nextConfirmationCheckpoint}</span></span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="rounded-xl border border-rim bg-surface px-3 py-2 text-[11px] font-bold text-ink">{actionCopy}</span>
          <button
            type="button"
            onClick={() => setShowDetails(prev => !prev)}
            className="rounded-xl border border-rim bg-panel px-3 py-2 text-[11px] font-black text-ink transition-colors hover:border-flame/40"
          >
            View Appointment
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 rounded-xl border border-rim bg-surface px-3 py-2 text-xs text-muted">
          Claimed {new Date(assignment.claimedAt).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
          {!isConfirmed && assignment.objectionState !== 'pending_review' && !objected && (
            <span> · Objection window closes in {h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`}</span>
          )}
        </div>
      )}

      {assignment.objectionState === 'pending_review' || objected ? (
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-ink">
          Your objection has been recorded. Admin will review and either uphold or reject it.
        </div>
      ) : !isConfirmed && (
        <div className="mt-3">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="text-xs font-bold text-ink hover:underline"
            >
              Raise an objection
            </button>
          ) : (
            <div className="space-y-3 rounded-xl border border-rim bg-surface p-3">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Select objection reason</div>
              <div className="grid gap-2 md:grid-cols-2">
                {OBJECTION_REASONS.map(r => (
                  <label key={r.value} className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${reason === r.value ? 'border-amber-500/40 bg-amber-500/10' : 'border-rim bg-panel'}`}>
                    <input
                      type="radio"
                      name="objection"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="mt-0.5 accent-amber-500"
                    />
                    <span>
                      <span className="block font-bold text-ink">{r.label}</span>
                      <span className="mt-0.5 block text-muted">{r.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Provide specific details to support your objection."
                rows={3}
                className="w-full rounded-xl border border-rim bg-panel px-3 py-2 text-xs text-ink placeholder-subtle focus:border-warning-amber focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  disabled={!reason || !note.trim() || submitting}
                  onClick={handleObject}
                  className="rounded-xl bg-warning-amber px-4 py-2 text-xs font-black text-[#080D18] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? 'Filing...' : 'File Objection'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setReason(''); setNote('') }}
                  className="rounded-xl border border-rim px-4 py-2 text-xs font-bold text-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Job status badge ─────────────────────────────────────────────────────────

const WORKFLOW_BADGE_CONFIG: Record<string, { cls: string; icon?: React.ReactNode }> = {
  draft:        { cls: 'bg-slate-500/10 text-ink border-slate-400/30' },
  submitted:    { cls: 'bg-blue-500/10 text-ink border-blue-500/30' },
  under_review: { cls: 'bg-amber-500/10 text-ink border-amber-500/30' },
  live:         { cls: 'bg-flame/10 text-ink border-flame/30' },
  closed:       { cls: 'bg-emerald-500/10 text-ink border-emerald-500/30', icon: <Lock className="w-2.5 h-2.5" /> },
  archived:     { cls: 'bg-slate-500/10 text-ink border-slate-400/30' },
}

function StatusBadge({ job }: { job: Pick<JobOpportunityRow, 'status' | 'validationStatus'> }) {
  if (job.status === 'on_hold') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border border-amber-500/40 bg-amber-500/15 text-ink">
        <AlertTriangle className="w-2.5 h-2.5" />
        HOLD
      </span>
    )
  }
  const workflowState = getJobWorkflowState(job)
  const cfg = WORKFLOW_BADGE_CONFIG[workflowState] ?? { cls: 'bg-slate-500/10 text-ink border-slate-400/30' }
  const label = getJobWorkflowLabel(job)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${cfg.cls}`}>
      {cfg.icon}
      {label}
    </span>
  )
}

function getReportStageSignOff(report: CompletionReportSummary | undefined, internalStage: number): Record<string, unknown> | null {
  const stageSignOffs = report?.sealPayload?.stageSignOffs
  if (!stageSignOffs || typeof stageSignOffs !== 'object' || Array.isArray(stageSignOffs)) return null
  const signOff = (stageSignOffs as Record<string, unknown>)[String(internalStage)]
  return signOff && typeof signOff === 'object' && !Array.isArray(signOff)
    ? signOff as Record<string, unknown>
    : null
}

function getBuilderStageStatus(input: {
  stage: BuilderStageDefinition
  job?: JobOpportunityRow
  report?: CompletionReportSummary
  previousStagePassed: boolean
  isFirstStage: boolean
}): BuilderStageStatus {
  const { stage, job, report, previousStagePassed, isFirstStage } = input
  const stageSignedOff = Boolean(getReportStageSignOff(report, stage.internalStage))

  if (job?.status === 'on_hold') return 'hold'
  if (job?.status === 'stopped' || job?.status === 'disputed') return 'failed'
  if (job?.status === 'completed' || report?.status === 'sealed' || report?.status === 'submitted' || stageSignedOff) return 'passed'
  if (job?.status === 'in_progress') return 'in_progress'
  if (job?.status === 'confirmed' || job?.status === 'provisionally_assigned') return 'inspector_assigned'
  if (job?.status === 'live' || job?.status === 'pending_validation' || String(job?.status) === 'validated') return 'requested_live'
  if (!job && (isFirstStage || previousStagePassed)) return 'available_next'
  if (!job) return 'locked'
  return 'not_requested'
}

function normalizeProjectIdentity(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function isNonTerminalStageRequest(job: StageRequestCandidate): boolean {
  return ACTIVE_STAGE_REQUEST_STATUSES.has(String(job.status ?? '').trim())
}

function isSameProgressProject(job: StageRequestCandidate, project: Project): boolean {
  if (job.projectId && job.projectId === project.id) return true
  if (job.id === project.id) return true

  return Boolean(
    job.builderId
    && job.builderId === project.builderId
    && normalizeProjectIdentity(job.projectName) === normalizeProjectIdentity(project.name)
    && normalizeProjectIdentity(job.address) === normalizeProjectIdentity(project.address)
    && normalizeProjectIdentity(job.city) === normalizeProjectIdentity(project.city)
  )
}

function findExistingStageRequest(
  project: Project,
  stageNumber: number,
  jobs: StageRequestCandidate[],
): StageRequestCandidate | undefined {
  return jobs.find(job =>
    job.stage === stageNumber
    && isNonTerminalStageRequest(job)
    && isSameProgressProject(job, project)
  )
}

function getPermitProgressGroupKey(job: JobOpportunityRow): string {
  if (job.projectId) return job.projectId
  return [
    job.builderId,
    job.permitNumber ?? '',
    String(job.projectName ?? '').trim().toLowerCase(),
    String(job.address ?? '').trim().toLowerCase(),
    String(job.city ?? '').trim().toLowerCase(),
  ].join('|')
}

function getPermitProgressGroupKeyForJob(
  job: JobOpportunityRow,
  jobsById: Map<string, JobOpportunityRow>,
): string {
  const parentJob = job.projectId ? jobsById.get(job.projectId) : undefined
  return getPermitProgressGroupKey(parentJob ?? job)
}

const BUILDER_STAGE_STATUS_COPY: Record<BuilderStageStatus, { label: string; cls: string }> = {
  not_requested: {
    label: 'Not requested',
    cls: 'border-slate-400/40 bg-panel text-ink',
  },
  requested_live: {
    label: 'Requested / live',
    cls: 'border-blue-500/40 bg-blue-500/10 text-ink',
  },
  inspector_assigned: {
    label: 'Inspector assigned',
    cls: 'border-cyan-500/40 bg-cyan-500/10 text-ink',
  },
  in_progress: {
    label: 'In progress',
    cls: 'border-flame/40 bg-flame/10 text-ink',
  },
  passed: {
    label: 'Passed / complete',
    cls: 'border-emerald-600/40 bg-emerald-500/10 text-ink',
  },
  hold: {
    label: 'Hold',
    cls: 'border-amber-600/50 bg-amber-500/10 text-ink',
  },
  failed: {
    label: 'Failed / correction required',
    cls: 'border-red-600/50 bg-red-500/10 text-ink',
  },
  available_next: {
    label: 'Available next',
    cls: 'border-blue-600/40 bg-blue-500/10 text-ink',
  },
  locked: {
    label: 'Locked / waiting on prerequisite',
    cls: 'border-slate-400/40 bg-slate-500/10 text-muted',
  },
}

const STAGE_DOT_CLASS: Record<BuilderStageStatus, string> = {
  not_requested: 'border-slate-400 bg-panel text-muted',
  requested_live: 'border-blue-500 bg-blue-500 text-white',
  inspector_assigned: 'border-cyan-500 bg-cyan-500 text-white',
  in_progress: 'border-flame bg-flame text-white',
  passed: 'border-emerald-600 bg-emerald-600 text-white',
  hold: 'border-amber-600 bg-amber-500 text-white',
  failed: 'border-red-600 bg-red-600 text-white',
  available_next: 'border-blue-600 bg-blue-600 text-white',
  locked: 'border-slate-400 bg-slate-100 text-slate-600',
}

function StageStatusIcon({ status }: { status: BuilderStageStatus }) {
  if (status === 'passed') return <CheckCircle2 className="h-3 w-3" />
  if (status === 'hold' || status === 'failed') return <AlertTriangle className="h-3 w-3" />
  if (status === 'locked') return <Lock className="h-3 w-3" />
  if (status === 'requested_live' || status === 'inspector_assigned' || status === 'in_progress') return <Clock className="h-3 w-3" />
  return <span className="h-1.5 w-1.5 rounded-full bg-current" />
}

function StageProgressRail({ scorecard }: { scorecard: StageScorecardEntry[] }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {scorecard.map(({ stage, status }) => (
        <div key={stage.number} className="min-w-0">
          <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-black ${STAGE_DOT_CLASS[status]}`}>
            <StageStatusIcon status={status} />
          </div>
          <div className="mt-1 truncate text-center text-[10px] font-bold text-ink">S{stage.number}</div>
          <div className="truncate text-center text-[9px] font-semibold text-muted">{BUILDER_STAGE_STATUS_COPY[status].label}</div>
        </div>
      ))}
    </div>
  )
}

function getLatestStageEntry(scorecard: StageScorecardEntry[]): StageScorecardEntry | undefined {
  return [...scorecard].reverse().find(entry => entry.stageJob || entry.status === 'passed')
}

function findSafeAvailableStage(scorecard: StageScorecardEntry[]): { entry?: StageScorecardEntry; ambiguous: boolean } {
  const passedIndexes = scorecard
    .map((entry, index) => entry.status === 'passed' ? index : -1)
    .filter(index => index >= 0)
  const firstGapBeforePassed = passedIndexes.some(index =>
    scorecard.slice(0, index).some(prior => prior.status !== 'passed')
  )
  if (firstGapBeforePassed) return { ambiguous: true }

  const blockingActive = scorecard.some(entry =>
    ['requested_live', 'inspector_assigned', 'in_progress', 'hold', 'failed'].includes(entry.status)
  )
  if (blockingActive) return { ambiguous: false }

  const entry = scorecard.find((candidate, index) =>
    candidate.status === 'available_next'
    && scorecard.slice(0, index).every(prior => prior.status === 'passed')
  )
  return { entry, ambiguous: false }
}

function getProgressDomId(key: string): string {
  return `project-progress-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

const MOD_HOLD_TYPE_META = {
  onsite: {
    label: 'On-Site Correction',
    feeNote: 'Billed by time — 15-min increments, 30-min minimum. Timer starts on acceptance.',
    actionLabel: 'Accept — Inspector Stays On-Site',
  },
  same_day_return: {
    label: 'Same-Day Return',
    feeNote: 'Fixed return fee: $150.00. Inspector will leave and return within the stated window.',
    actionLabel: 'Accept — Reserve Return Visit',
  },
  reinspection: {
    label: 'Reinspection Required',
    feeNote: 'A new inspection booking will be scheduled. Standard inspection fees apply.',
    actionLabel: 'Accept — Schedule Reinspection',
  },
} as const

function ModificationRequiredCard({
  hold,
  onAccept,
  onDecline,
  isResponding,
}: {
  hold: InspectionHold
  onAccept: () => void
  onDecline: (note: string) => void
  isResponding: boolean
}) {
  const [declineNote, setDeclineNote] = React.useState('')
  const meta = MOD_HOLD_TYPE_META[hold.type]

  const formatWindow = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-CA', { timeZone: 'America/Vancouver', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="mb-5 rounded-2xl border border-amber-500/30 border-l-[6px] border-l-amber-500 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-500/15 border border-amber-500/25 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="font-black text-slate-900 text-sm mb-0.5">Modification Required — {meta.label}</div>
              <div className="text-xs text-slate-500 capitalize">{hold.reasonCode.replace('_', ' ')}{hold.estimatedFixMinutes ? ` · Est. ${hold.estimatedFixMinutes} min` : ''}</div>
            </div>
          </div>
          <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg px-2 py-1 shrink-0">
            <div className="text-[10px] text-amber-600 font-bold uppercase tracking-wide">Action Required</div>
          </div>
        </div>
      </div>

      {hold.notes && (
        <div className="px-5 py-3 border-b border-slate-200">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Inspector Notes</div>
          <div className="text-sm text-slate-700">{hold.notes}</div>
        </div>
      )}

      <div className="px-5 py-3 border-b border-slate-200">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Fee Information</div>
        <div className="text-xs text-slate-700">{meta.feeNote}</div>
        {hold.type === 'same_day_return' && hold.returnWindowStart && hold.returnWindowEnd && (
          <div className="mt-2 text-xs text-slate-500">
            Return window: <span className="font-bold text-slate-900">{formatWindow(hold.returnWindowStart)} – {formatWindow(hold.returnWindowEnd)}</span>
          </div>
        )}
        {hold.isBlocking && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1">
            <Lock className="w-3 h-3 text-red-500" />
            <span className="text-[11px] font-bold text-red-600">Blocking — downstream work paused</span>
          </div>
        )}
      </div>

      <div className="px-5 py-4 space-y-3">
        <button
          onClick={onAccept}
          disabled={isResponding}
          className="w-full bg-amber-500 hover:bg-amber-400 text-white font-black py-3 rounded-xl text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isResponding
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <CheckCircle2 className="w-4 h-4" />}
          {meta.actionLabel}
        </button>
        <div className="flex gap-2">
          <input
            value={declineNote}
            onChange={e => setDeclineNote(e.target.value)}
            placeholder="Reason for declining (required)..."
            className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-500"
          />
          <button
            onClick={() => onDecline(declineNote)}
            disabled={!declineNote.trim() || isResponding}
            className="px-4 bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Decline
          </button>
        </div>
        <p className="text-[10px] text-slate-400">Declining a Modification Required will revert the inspection to in-progress and allow work to continue.</p>
      </div>
    </div>
  )
}

export default function BuilderDashboard() {
  const { user }  = useAuth()
  const store     = useStore()
  const router    = useRouter()

  // Blueprint Rule #3: only approved builders may access the dashboard
  const [onboardingStatus, setOnboardingStatus] = useState<BuilderOnboardingStatus | null>(null)

  useEffect(() => {
    if (!user) { router.replace('/sign-in?role=builder'); return }
    if (user.role !== 'builder') { router.replace('/'); return }
    getBuilderOnboardingStatusAsync(user.id, user.supabaseId).then(setOnboardingStatus)
  }, [router, user])

  useEffect(() => {
    if (!user || user.role !== 'builder' || onboardingStatus === null) return
    if (onboardingStatus !== 'approved') router.replace('/builder/onboarding')
  }, [user, onboardingStatus, router])

  const [dispatchProject, setDispatchProject]   = useState<Project | null>(null)
  const [isDispatchOpen, setIsDispatchOpen]     = useState(false)
  const [isTrackerOpen, setIsTrackerOpen]       = useState(false)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  // FIX #4: separate loading flag for jobs so the spinner doesn't hang indefinitely
  const [isLoadingJobs, setIsLoadingJobs]       = useState(false)
  const [supabaseProjects, setSupabaseProjects] = useState<Project[] | null>(null)
  const [dbJobs, setDbJobs]                     = useState<JobOpportunityRow[] | null>(null)
  const [completedRecords, setCompletedRecords] = useState<Record<string, { certRef: string; result: string; completedAt: string }>>({})
  const [completionReportsByJobId, setCompletionReportsByJobId] = useState<Record<string, CompletionReportSummary>>({})
  const [activeHolds, setActiveHolds]           = useState<HoldRecord[]>([])
  const [activeHoldDetails, setActiveHoldDetails] = useState<Record<string, HoldDetail>>({})
  const [acceptedHolds, setAcceptedHolds]       = useState<Array<{ hold: HoldRecord; projectName: string; feeAmount: number; acceptedAt: string }>>([])
  const [holdResponding, setHoldResponding]     = useState<string | null>(null)
  const [holdReviewRequesting, setHoldReviewRequesting] = useState<string | null>(null)
  // FIX #7: per-hold decline notes instead of one shared string
  const [declineNotes, setDeclineNotes]         = useState<Record<string, string>>({})
  // Builder-selected correction window per hold (minutes). Defaults to 60.
  const [correctionWindowByHold, setCorrectionWindowByHold] = useState<Record<string, number>>({})
  const [activeModHolds, setActiveModHolds]     = useState<InspectionHold[]>([])
  const [modHoldResponding, setModHoldResponding] = useState<string | null>(null)
  const [requestGuardMessage, setRequestGuardMessage] = useState<string | null>(null)

  // ─── DATA BRIDGE: MATCH LOCAL AUTH ID OR SUPABASE ID ─────────────────────────
  const builderLocalId    = user?.id ?? ''
  const builderSupabaseId = user?.supabaseId ?? ''
  const isMatch = (id: string | undefined) =>
    !!id && (id === builderLocalId || id === builderSupabaseId)

  const storeProjects = store.projects.filter(p => isMatch(p.builderId))
  const builderJobs   = store.jobs.filter(j => isMatch(j.builderId))

  const reloadBuilderJobs = React.useCallback(async () => {
    const builderSupabaseUserId = user?.supabaseId
    if (!builderSupabaseUserId) return []

    setIsLoadingJobs(true)
    try {
      const nextJobs = await listJobsByBuilder(builderSupabaseUserId)
      setDbJobs(nextJobs)
      return nextJobs
    } finally {
      setIsLoadingJobs(false)
    }
  }, [user?.supabaseId])

  // Fetch projects from Supabase
  useEffect(() => {
    if (!user?.supabaseId) return
    const supabaseId = user.supabaseId
    async function loadProjects() {
      setIsLoadingProjects(true)
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', supabaseId)
        .order('created_at', { ascending: false })

      setIsLoadingProjects(false)
      if (!error && data && data.length > 0) {
        const mapped: Project[] = (data as Record<string, unknown>[]).map((row) => ({
          id:                 row.id as string,
          builderId:          (row.builder_id ?? row.user_id) as string,
          name:               (row.name ?? 'Unnamed Project') as string,
          address:            (row.address ?? '') as string,
          city:               (row.city ?? '') as string,
          permitNumber:       (row.permit_number ?? '') as string,
          currentStage:       (row.current_stage ?? 1) as number,
          status:             (row.status ?? 'pending') as Project['status'],
          stages:             (row.stages as Project['stages']) ?? [],
          photos:             (row.photos as Project['photos']) ?? [],
          gpsCoord:           (row.gps_coord as Project['gpsCoord']) ?? { lat: 0, lng: 0, accuracy: 0, timestamp: '', deviceId: '' },
          createdAt:          (row.created_at ?? '') as string,
          updatedAt:          (row.updated_at ?? '') as string,
          checklistUnlockedAt:(row.checklist_unlocked_at as string | undefined) ?? undefined,
          dispatchTier:       (row.dispatch_tier as Project['dispatchTier']) ?? undefined,
        }))
        setSupabaseProjects(mapped)
      }
    }
    void loadProjects()
  }, [user?.supabaseId])

  // Fetch job_opportunities directly by builder_id
  useEffect(() => {
    void reloadBuilderJobs()
  }, [reloadBuilderJobs])

  // Fetch completed records for any completed jobs
  useEffect(() => {
    const completedIds = (dbJobs ?? []).filter(j => j.status === 'completed').map(j => j.id)
    if (completedIds.length === 0) return
    supabase
      .from('compliance_completed_records')
      .select('job_ref, cert_ref, result, completed_at')
      .in('job_ref', completedIds)
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, { certRef: string; result: string; completedAt: string }> = {}
        for (const row of data as Record<string, string>[]) {
          map[row.job_ref] = { certRef: row.cert_ref, result: row.result, completedAt: row.completed_at }
        }
        setCompletedRecords(map)
      })
  }, [dbJobs])

  useEffect(() => {
    const jobIds = (dbJobs ?? []).map(job => job.id)
    if (jobIds.length === 0) {
      setCompletionReportsByJobId({})
      return
    }

    supabase
      .from('inspector_completion_reports')
      .select('job_id, status, seal_payload, submitted_at, sealed_at, updated_at')
      .in('job_id', jobIds)
      .then(({ data, error }) => {
        if (error) {
          console.warn('Builder dashboard: completion report lookup failed', error)
          setCompletionReportsByJobId({})
          return
        }

        const reports = new Map<string, CompletionReportSummary>()
        for (const row of (data ?? []) as Array<Record<string, unknown>>) {
          const jobId = typeof row.job_id === 'string' ? row.job_id : null
          if (!jobId) continue
          const existing = reports.get(jobId)
          const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : ''
          if (existing?.updatedAt && existing.updatedAt > updatedAt) continue
          reports.set(jobId, {
            jobId,
            status: typeof row.status === 'string' ? row.status : undefined,
            sealPayload: row.seal_payload && typeof row.seal_payload === 'object' && !Array.isArray(row.seal_payload)
              ? row.seal_payload as Record<string, unknown>
              : {},
            submittedAt: typeof row.submitted_at === 'string' ? row.submitted_at : undefined,
            sealedAt: typeof row.sealed_at === 'string' ? row.sealed_at : undefined,
            updatedAt,
          })
        }
        setCompletionReportsByJobId(Object.fromEntries(reports))
      })
  }, [dbJobs])

  // Fetch active holds for builder's on_hold jobs
  useEffect(() => {
    async function loadActiveHolds() {
      const onHoldJobs = (dbJobs ?? []).filter(j => j.status === 'on_hold')
      if (onHoldJobs.length === 0) {
        setActiveHolds([])
        setActiveHoldDetails({})
        return
      }
      const detailResults = await Promise.all(onHoldJobs.map(async job => {
        try {
          return await listHoldDetailsForJob(job.id)
        } catch (error) {
          console.warn('Builder dashboard: hold detail lookup failed', { jobId: job.id, error })
          return []
        }
      }))
      const allDetails = detailResults.flat()
      const allHolds = allDetails.map(detail => detail.hold)
      setActiveHoldDetails(Object.fromEntries(allDetails.map(detail => [detail.hold.id, detail])))
      // Only show holds the builder can actually respond to — 'hold_active' means already accepted.
      setActiveHolds(allHolds.filter(h => HOLD_BUILDER_ACTIONABLE_STATUSES.includes(h.status)))
      // Hydrate acceptedHolds for holds already in hold_active state (e.g. page refresh after acceptance)
      const alreadyActive = allHolds.filter(h => h.status === 'hold_active')
      if (alreadyActive.length > 0) {
        setAcceptedHolds(prev => {
          const existingIds = new Set(prev.map(e => e.hold.id))
          const toAdd = alreadyActive
            .filter(h => !existingIds.has(h.id))
            .map(h => ({
              hold: h,
              projectName: (dbJobs ?? []).find(j => j.id === h.jobId)?.projectName ?? 'Project',
              feeAmount: h.holdCapAmount,
              acceptedAt: h.builderAcceptedAt ?? h.updatedAt,
            }))
          return [...prev, ...toAdd]
        })
      }
    }
    void loadActiveHolds()
  }, [dbJobs])

  // Fetch mod holds (inspection_holds status='proposed') for this builder
  useEffect(() => {
    const builderSid = user?.supabaseId
    if (!builderSid) return
    async function loadModHolds() {
      const { data: inspJobs } = await supabase
        .from('inspection_jobs')
        .select('id')
        .eq('builder_id', builderSid)
        .in('status', ['hold_active', 'awaiting_return'])
      if (!inspJobs?.length) { setActiveModHolds([]); return }
      const results = await Promise.all(
        inspJobs.map((j: { id: string }) => listInspectionHoldsForJob(j.id))
      )
      setActiveModHolds(results.flat().filter(h => h.status === 'proposed'))
    }
    void loadModHolds()
  }, [user?.supabaseId])

  // ─── DATA BRIDGE: MAP STANDALONE JOBS TO PROJECTS ARRAY ──────────────────────
  const standaloneJobsAsProjects: Project[] = builderJobs.map(job => {
    let derivedStatus: Project['status'] = 'pending'
    if (['provisionally_assigned', 'confirmed', 'in_progress'].includes(job.status)) {
      derivedStatus = 'in_progress'
    } else if (job.status === 'completed') {
      derivedStatus = 'pass'
    }
    return {
      id:           job.id,
      builderId:    job.builderId ?? '',
      name:         job.projectName || 'Standalone Request',
      address:      job.address,
      city:         job.city,
      permitNumber: job.permitNumber ?? '',
      currentStage: job.stage,
      status:       derivedStatus,
      // FIX #5: include all required Stage fields so the type is satisfied
      stages: [{
        id:          String(job.stage),
        name:        job.stageName,
        stageNumber: job.stage,
        stageName:   job.stageName,
        status:      'pending' as InspectionStatus,
        items:       [],
      }],
      photos:       [],
      gpsCoord:     { lat: 0, lng: 0, accuracy: 0, timestamp: '', deviceId: '' },
      createdAt:    job.requestedAt,
      updatedAt:    job.requestedAt,
      dispatchTier: job.dispatchTier,
    }
  })

  // Map job_opportunities rows to project display format
  const dbJobsAsProjects: Project[] = (dbJobs ?? []).map(job => {
    let derivedStatus: InspectionStatus = 'pending'
    if (['provisionally_assigned', 'confirmed', 'in_progress'].includes(job.status)) {
      derivedStatus = 'in_progress'
    } else if (job.status === 'completed') {
      derivedStatus = 'pass'
    }
    return {
      id:           job.id,
      builderId:    job.builderId,
      name:         job.projectName,
      address:      job.address,
      city:         job.city,
      permitNumber: job.permitNumber ?? '',
      currentStage: job.stage,
      status:       derivedStatus,
      // FIX #5: same required Stage fields here
      stages: [{
        id:          String(job.stage),
        name:        job.stageName,
        stageNumber: job.stage,
        stageName:   job.stageName,
        status:      'pending' as InspectionStatus,
        items:       [],
      }],
      photos:       [],
      gpsCoord:     { lat: 0, lng: 0, accuracy: 0, timestamp: '', deviceId: '' },
      createdAt:    job.requestedAt,
      updatedAt:    job.updatedAt,
      dispatchTier: job.dispatchTier,
    }
  })

  // Combine: Supabase projects table + direct job_opportunities + store fallback
  const projects = [
    ...(supabaseProjects ?? storeProjects),
    ...(dbJobs !== null ? dbJobsAsProjects : standaloneJobsAsProjects),
  ]
  const dailyFlashMode = resolveReportDataMode(Boolean(user?.supabaseId))
  const dailyFlashProjects = dailyFlashMode === 'live'
    ? [
        ...(supabaseProjects ?? []),
        ...(dbJobs !== null ? dbJobsAsProjects : []),
      ]
    : [
        ...storeProjects,
        ...standaloneJobsAsProjects,
      ]

  const stageRequestCandidates: StageRequestCandidate[] = [
    ...(dbJobs ?? []).map(job => ({
      id: job.id,
      projectId: job.projectId,
      builderId: job.builderId,
      projectName: job.projectName,
      address: job.address,
      city: job.city,
      permitNumber: job.permitNumber,
      stage: job.stage,
      status: job.status,
    })),
    ...builderJobs.map(job => ({
      id: job.id,
      projectId: job.projectId,
      builderId: job.builderId,
      projectName: job.projectName,
      address: job.address,
      city: job.city,
      permitNumber: job.permitNumber,
      stage: job.stage,
      status: job.status,
    })),
  ]

  // FIX #6: wrap confirm() in a try/catch — it throws in some SSR/edge environments
  const handleDeleteProject = async (projectId: string) => {
    try {
      if (!window.confirm('Delete this project?')) return
    } catch {
      return
    }
    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId)
      if (!error) {
        setSupabaseProjects(prev => prev ? prev.filter(p => p.id !== projectId) : prev)
      }
    } catch (err) {
      console.error('Failed to delete project:', err)
    }
  }

  const handleRequestInspection = (project: Project) => {
    const stageNumber = project.currentStage ?? project.stages?.[0]?.stageNumber ?? 1
    const existingStageRequest = findExistingStageRequest(project, stageNumber, stageRequestCandidates)
    if (existingStageRequest) {
      setRequestGuardMessage(`Stage ${stageNumber} has already been requested and is waiting for inspector claim or completion.`)
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return
    }
    setRequestGuardMessage(null)
    setDispatchProject(project)
    setIsDispatchOpen(true)
  }

  const handleNewRequest = () => {
    setRequestGuardMessage(null)
    setDispatchProject(null)
    setIsDispatchOpen(true)
  }

  const handleApproveHold = async (hold: HoldRecord) => {
    const windowMinutes = correctionWindowByHold[hold.id] ?? 60
    setHoldResponding(hold.id)
    const ok = await builderApproveHold(hold.id, windowMinutes, 'Approved — correction window reserved.')
    if (ok) {
      setActiveHolds(prev => prev.filter(h => h.id !== hold.id))
      const holdJob = (dbJobs ?? []).find(j => j.id === hold.jobId)
      const baseHoldServiceFee = calculateBaseHoldServiceFee(hold.premiumRateAmount)
      const windowFee = calculateWindowFee(hold.premiumRateAmount, windowMinutes)
      setAcceptedHolds(prev => [...prev, {
        hold,
        projectName: holdJob?.projectName ?? 'Project',
        feeAmount: baseHoldServiceFee + windowFee,
        acceptedAt: new Date().toISOString(),
      }])
    }
    setHoldResponding(null)
  }

  const handleDeclineHold = async (hold: HoldRecord) => {
    const note = declineNotes[hold.id] ?? ''
    if (!note.trim()) return
    setHoldResponding(hold.id)
    const ok = await builderDeclineHold(hold.id, builderSupabaseId || builderLocalId, note)
    if (ok) {
      setActiveHolds(prev => prev.filter(h => h.id !== hold.id))
      setDeclineNotes(prev => { const next = { ...prev }; delete next[hold.id]; return next })
    }
    setHoldResponding(null)
  }

  const handleRequestReview = async (hold: HoldRecord) => {
    setHoldReviewRequesting(hold.id)
    await requestOnSiteCorrectionReview(
      hold.id,
      builderSupabaseId || builderLocalId,
      'Builder requested on-site correction review.',
    )
    setHoldReviewRequesting(null)
  }

  const handleAcknowledgeModHold = async (hold: InspectionHold) => {
    setModHoldResponding(hold.id)
    const updated = await acknowledgeModificationHold(hold.id)
    if (updated) setActiveModHolds(prev => prev.filter(h => h.id !== hold.id))
    setModHoldResponding(null)
  }

  const handleDeclineModHold = async (hold: InspectionHold, note: string) => {
    if (!note.trim()) return
    setModHoldResponding(hold.id)
    const updated = await declineModificationHold(hold.id, note)
    if (updated) setActiveModHolds(prev => prev.filter(h => h.id !== hold.id))
    setModHoldResponding(null)
  }

  const handleDispatch = (_dispatchTier: DispatchTier) => {
    // Job creation handled inside DispatchModal via store.addJob()
    void _dispatchTier
    void reloadBuilderJobs()
  }

  // Active assignment — drives the en-route tracker
  const activeAssignment = store.assignments.find(
    a => isMatch(a.builderId) && (a.status === 'provisional' || a.status === 'confirmed')
  )
  const assignedJob         = activeAssignment ? store.jobs.find(j => j.id === activeAssignment.jobId) : null
  const inProgressProject   = projects.find(p => p.status === 'in_progress')

  const trackerInspectorName    = activeAssignment?.inspectorName    ?? 'Inspector'
  const trackerInspectorLicense = activeAssignment?.inspectorLicense ?? ''
  const trackerProjectName      = assignedJob?.projectName ?? inProgressProject?.name    ?? 'Active Project'
  const trackerProjectAddress   = assignedJob?.address     ?? inProgressProject?.address ?? ''
  const trackerStageName        = assignedJob
    ? `Stage ${assignedJob.stage} · ${assignedJob.stageName}`
    : inProgressProject ? `Stage ${inProgressProject.currentStage}` : ''
  const trackerAvatar = activeAssignment
    ? activeAssignment.inspectorName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'IN'

  const activeCount    = projects.filter(p => p.status !== 'pass' && p.status !== 'completed').length
  const passedThisWeek = projects.filter(p => p.status === 'pass').length
  const activeStages   = projects
    .filter(p => p.status !== 'pass' && p.status !== 'completed')
    .reduce((sum, project) => {
      const openStages = project.stages.filter(stage => stage.status !== 'pass').length
      return sum + Math.max(openStages, 1)
    }, 0)
  const dbJobsById = new Map((dbJobs ?? []).map(job => [job.id, job]))
  const storeJobsById = new Map(store.jobs.map(job => [job.id, job]))
  const projectsById = new Map(projects.map(project => [project.id, project]))
  const openHoldDetails = Object.values(activeHoldDetails).filter(detail => isHoldOpenStatus(detail.hold.status))
  const onHoldJobs = (dbJobs ?? []).filter(job => job.status === 'on_hold')
  const actionableHoldJobIds = new Set(activeHolds.map(hold => hold.jobId))
  const actionRequiredHoldJobs = onHoldJobs.filter(job => actionableHoldJobIds.has(job.id))
  const getOpenHoldDetailForJob = (jobId: string) => openHoldDetails.find(detail => detail.hold.jobId === jobId)
  const hasBuilderActions = actionRequiredHoldJobs.length > 0 || activeModHolds.length > 0
  const activeInspectionAppointments = store.assignments.filter(
    a => isMatch(a.builderId) && (a.status === 'provisional' || a.status === 'confirmed' || a.objectionState === 'pending_review')
  )
  const resolveAppointmentJobDisplay = (assignment: Assignment) => {
    const dbJob = dbJobsById.get(assignment.jobId)
    const storeJob = storeJobsById.get(assignment.jobId)
    const project = projectsById.get(dbJob?.projectId ?? assignment.jobId)
    const projectName = storeJob?.projectName
      ?? dbJob?.projectName
      ?? assignment.projectName
      ?? project?.name
      ?? 'Inspection appointment'
    const dbAddress = [dbJob?.address, dbJob?.city].filter(Boolean).join(', ')
    const projectAddress = [project?.address, project?.city].filter(Boolean).join(', ')
    const address = storeJob?.address || dbAddress || projectAddress || undefined
    return { projectName, address }
  }
  const permitProgressProjects: PermitProgressProject[] = (() => {
    const groups = new Map<string, PermitProgressProject>()
    const jobsById = new Map((dbJobs ?? []).map(job => [job.id, job]))
    for (const job of dbJobs ?? []) {
      const key = getPermitProgressGroupKeyForJob(job, jobsById)
      const existing = groups.get(key)
      if (existing) {
        existing.jobs.push(job)
        existing.jobs.sort((a, b) => a.stage - b.stage || a.requestedAt.localeCompare(b.requestedAt))
        existing.representativeJob = existing.jobs[0]
      } else {
        groups.set(key, {
          key,
          projectName: job.projectName || 'Inspection project',
          address: job.address,
          city: job.city,
          representativeJob: job,
          jobs: [job],
        })
      }
    }

    const projectRowsWithoutJobs = supabaseProjects ?? (dbJobs === null ? storeProjects : [])
    for (const project of projectRowsWithoutJobs) {
      if (groups.has(project.id)) continue
      groups.set(project.id, {
        key: project.id,
        projectName: project.name || 'Inspection project',
        address: project.address,
        city: project.city,
        sourceProject: project,
        jobs: [],
      })
    }

    return Array.from(groups.values()).sort((a, b) => a.projectName.localeCompare(b.projectName))
  })()
  const buildStageScorecard = (relatedJobs: JobOpportunityRow[]): StageScorecardEntry[] => {
    let previousStagePassed = true
    const entries = BUILDER_STAGE_DEFINITIONS.map((stage, index) => {
      const stageJob = relatedJobs.find(candidate => candidate.stage === stage.number)
      const report = stageJob ? completionReportsByJobId[stageJob.id] : undefined
      const status = getBuilderStageStatus({
        stage,
        job: stageJob,
        report,
        previousStagePassed,
        isFirstStage: index === 0,
      })
      previousStagePassed = status === 'passed'
      return { stage, stageJob, report, status }
    })
    const hasPassedStageGap = entries.some((entry, index) =>
      entry.status === 'passed' && entries.slice(0, index).some(prior => prior.status !== 'passed')
    )
    return hasPassedStageGap
      ? entries.map(entry => entry.status === 'available_next' ? { ...entry, status: 'locked' as const } : entry)
      : entries
  }
  const buildProjectRequestForStage = (job: JobOpportunityRow, stage: BuilderStageDefinition): Project => ({
    id: job.projectId ?? job.id,
    builderId: job.builderId,
    name: job.projectName,
    address: job.address,
    city: job.city,
    permitNumber: job.permitNumber ?? '',
    currentStage: stage.number,
    status: 'pending',
    stages: [{
      stageNumber: stage.number,
      stageName: stage.label.replace(/^Stage \d+ — /, ''),
      status: 'pending' as InspectionStatus,
    }],
    photos: [],
    gpsCoord: { lat: 0, lng: 0, accuracy: 0, timestamp: '', deviceId: '' },
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    dispatchTier: job.dispatchTier,
  })
  const buildProjectRequestForProgressStage = (progressProject: PermitProgressProject, stage: BuilderStageDefinition): Project | null => {
    if (progressProject.representativeJob) {
      return buildProjectRequestForStage(progressProject.representativeJob, stage)
    }
    if (!progressProject.sourceProject) return null
    return {
      ...progressProject.sourceProject,
      currentStage: stage.number,
      status: 'pending',
      stages: [{
        stageNumber: stage.number,
        stageName: stage.label.replace(/^Stage \d+ — /, ''),
        status: 'pending' as InspectionStatus,
      }],
    }
  }
  const nextUpItems: NextUpItem[] = permitProgressProjects
    .map(progressProject => {
      const stageScorecard = buildStageScorecard(progressProject.jobs)
      const latestPassedStage = getLatestStageEntry(stageScorecard.filter(entry => entry.status === 'passed'))
      const { entry: availableStage, ambiguous } = findSafeAvailableStage(stageScorecard)
      const requestProject = availableStage
        ? buildProjectRequestForProgressStage(progressProject, availableStage.stage)
        : null
      return {
        progressProject,
        stageScorecard,
        availableStage,
        latestPassedStage,
        requestProject,
        ambiguous,
      }
    })
    .filter(item => item.availableStage && item.requestProject && !item.ambiguous)

  // FIX #4: show spinner while either projects OR jobs are loading
  const isLoading = isLoadingProjects || isLoadingJobs

  return (
    <div className="app-theme-scope min-h-screen bg-surface">
      <Navbar role="builder" dark />

      {/* ── Hero dispatch bar ── */}
      <div className="bg-dot bg-dot-sm border-b border-rim px-4 sm:px-6 pt-8 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="label-mono mb-2 font-bold">{user?.company ?? MOCK_BUILDER.companyName}</div>
          <h1 className="mb-5 text-2xl font-extrabold text-ink">
            {user ? `${user.firstName}'s Command Center` : 'Project Command Center'}
          </h1>

          <button
            onClick={handleNewRequest}
            className="group flex w-full items-center gap-4 rounded-2xl border border-rim bg-panel p-5 shadow-card transition-all hover:border-flame/40 hover:glow-flame-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-flame flex items-center justify-center shrink-0 shadow-[0_12px_24px_rgba(245,124,0,0.22)]">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-extrabold text-ink">Post an Inspection Request</div>
              <div className="mt-1 text-xs font-medium text-muted">Start a new request with site details, inspection stage, discipline, and builder availability. Dispatch speed is selected inside the request flow.</div>
            </div>
            <div className="w-9 h-9 bg-flame/10 border border-flame/20 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-flame group-hover:border-flame transition-all">
              <ChevronRight className="w-4 h-4 text-flame group-hover:text-white transition-colors" />
            </div>
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {requestGuardMessage && (
          <div className="mb-6 rounded-2xl border border-amber-600/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-ink">
            {requestGuardMessage}
          </div>
        )}

        {/* ── Action Required (always first) ── */}
        {hasBuilderActions && (
          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-flame">Action Required</div>
                <div className="mt-1 text-sm font-extrabold text-ink">Review holds and builder decisions</div>
              </div>
              <div className="rounded-full border border-flame/25 bg-flame/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-flame">
                {actionRequiredHoldJobs.length + activeModHolds.length} open
              </div>
            </div>
            <div className="space-y-5">
        {actionRequiredHoldJobs.map(holdJob => {
          const holdDetail = getOpenHoldDetailForJob(holdJob.id)
          const hold = holdDetail?.hold
          const holdMissing = !hold
          const isActionableHold = hold ? HOLD_BUILDER_ACTIONABLE_STATUSES.includes(hold.status) : false
          const holdId = hold?.id ?? holdJob.id
          const holdEvidence = holdDetail?.evidence ?? []
          const holdBaseRate = hold?.premiumRateAmount || resolveHoldBaseRate({
            pricingMode: holdJob?.pricingMode,
            specialistRole: holdJob?.specialistRole,
            discipline: holdJob?.requiredDiscipline,
            credentialClass: holdJob?.credentialClass,
            inspectionType: holdJob?.inspectionType,
          }).baseRate
          const isResponding = hold ? holdResponding === hold.id : false
          const requestingReview = hold ? holdReviewRequesting === hold.id : false
          // FIX #7: each hold gets its own decline note
          const thisDeclineNote = hold ? declineNotes[hold.id] ?? '' : ''

          const baseHoldServiceFee = calculateBaseHoldServiceFee(holdBaseRate)
          const selectedWindow = hold ? correctionWindowByHold[hold.id] ?? 60 : 60
          const windowFee = calculateWindowFee(holdBaseRate, selectedWindow)
          const totalAcceptanceFee = baseHoldServiceFee + windowFee
          const builderResponseStatus = holdMissing
            ? 'Hold details not found'
            : hold.builderAcceptedAt
            ? 'Correction window accepted'
            : hold.builderDeclinedAt
              ? 'Declined — rebook required'
              : 'Builder response pending'
          const deficiencySummary = hold
            ? hold.deficiencyReason || hold.reason
            : 'The project is marked on hold, but no open job_holds record was returned for this job.'
          const affectedItemsSummary = hold
            ? hold.affectedItemSummaries.length > 0
              ? `Affected items: ${hold.affectedItemSummaries.join(' · ')}`
              : `Affected checklist items: ${hold.checklistItemIds.join(', ')}`
            : 'Hold details are unavailable from the existing hold records.'
          const sameDayLabel = hold
            ? hold.holdEligibleForOnSiteCorrection ? 'Same-day correction eligible' : 'Rebook required'
            : 'Hold detail unavailable'

          return (
            <div key={holdId} className="rounded-2xl border border-flame/40 border-l-[6px] border-l-flame bg-white overflow-hidden shadow-[0_18px_34px_rgba(245,124,0,0.16)]">
              <div className="px-5 py-4 border-b border-flame/20 bg-flame-dim/70">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white border border-flame/20 rounded-xl flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5 text-flame" />
                    </div>
                    <div>
                      <div className="font-black text-slate-900 text-base mb-0.5">Action required — project on hold</div>
                      <div className="text-xs font-semibold text-slate-600">{holdJob?.projectName ?? 'Project'} · Stage {holdJob?.stage ?? ''}</div>
                      {holdJob?.address && (
                        <div className="mt-0.5 text-[11px] text-slate-600">{holdJob.address}{holdJob.city ? `, ${holdJob.city}` : ''}</div>
                      )}
                      <div className="mt-1 text-[11px] text-slate-600">{builderResponseStatus}</div>
                    </div>
                  </div>
                  <div className="bg-flame-dim border border-flame/30 rounded-lg px-2 py-1">
                    <div className="text-[10px] text-flame font-bold uppercase tracking-wide">Action Required</div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 border-b border-slate-200">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Deficiency Summary</div>
                <div className="text-sm font-bold text-slate-900">{deficiencySummary}</div>
                {hold?.deficiencyReason && (
                  <>
                    <div className="mt-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Required Correction</div>
                    <div className="text-sm font-semibold text-slate-900">{hold.reason}</div>
                  </>
                )}
                <div className="mt-2 text-xs text-slate-500">
                  {affectedItemsSummary}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                    {sameDayLabel}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                    Response: {builderResponseStatus}
                  </span>
                </div>
              </div>

              {holdEvidence.length > 0 && (
                <div className="px-5 py-3 border-b border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Supporting Evidence</div>
                  <div className="space-y-1.5">
                    {holdEvidence.slice(0, 3).map(evidence => (
                      <div key={evidence.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                        <span className="font-semibold text-slate-700 truncate">{evidence.fileName || evidence.noteText || 'Hold evidence'}</span>
                        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">{evidence.evidenceType}</span>
                      </div>
                    ))}
                  </div>
                  {holdEvidence.length > 3 && (
                    <div className="mt-2 text-[10px] font-semibold text-slate-500">+{holdEvidence.length - 3} more evidence item{holdEvidence.length - 3 === 1 ? '' : 's'}</div>
                  )}
                </div>
              )}

              <div id={`hold-${holdId}`} className="px-5 py-3 border-b border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Review Hold Request</div>
                <div className="text-xs text-slate-600">
                  {hold
                    ? 'Accept a correction window to reserve the inspector for re-verification, or request same-visit review if the correction can be made while they are still available.'
                    : 'This project is on hold, but the dashboard could not find an open hold detail record to power the existing response controls.'}
                </div>
              </div>

              <div className="px-5 py-3 border-b border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Fee Breakdown</div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Base Hold Review Fee</span>
                    <span className="font-bold text-slate-900">${baseHoldServiceFee.toFixed(2)}</span>
                  </div>
                  {hold && (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Recorded Hold Cap</span>
                        <span className="font-bold text-slate-900">${hold.holdCapAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Reserved Correction Window ({selectedWindow} min @ 1.5×)</span>
                        <span className="font-bold text-slate-900">${windowFee.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">Total at Acceptance</span>
                        <span className="font-black text-slate-900">${totalAcceptanceFee.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-2 text-[10px] text-slate-400">Additional fees apply if correction exceeds the selected window or extends beyond inspector availability.</div>
              </div>

              {isActionableHold && hold && (
                <div className="px-5 py-3 border-b border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Select Correction Window</div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[30, 60, 90, 120, 150].map(minutes => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => setCorrectionWindowByHold(prev => ({ ...prev, [hold.id]: minutes }))}
                        className={`rounded-xl py-2 text-xs font-bold transition-all ${
                          selectedWindow === minutes
                            ? 'bg-slate-800 text-white'
                            : 'border border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {minutes}m
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {hold && (
                <div className="px-5 py-3 border-b border-slate-200 grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Expiry</div>
                    <div className="text-xs font-mono font-bold text-slate-900">
                      {new Date(hold.expiresAt).toLocaleTimeString('en-CA', { timeZone: 'America/Vancouver', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Base Rate</div>
                    <div className="text-xs font-semibold text-ink">${holdBaseRate.toFixed(2)}/hr</div>
                  </div>
                </div>
              )}

              <div className="px-5 py-4 space-y-4">
                {isActionableHold && hold ? (
                  <>
                <div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveHold(hold)}
                      disabled={isResponding}
                      className="flex-1 bg-flame hover:bg-flame-light text-white font-black py-3 rounded-xl text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isResponding
                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <CheckCircle2 className="w-4 h-4" />}
                      Accept Correction Window — Reserve {selectedWindow} Min
                    </button>
                  </div>
                  <p className="text-[11px] text-muted mt-2 text-center">
                    Inspector will return to review the correction before leaving site. Time is reserved and fees apply.
                  </p>
                </div>

                <div>
                  <button
                    onClick={() => handleRequestReview(hold)}
                    disabled={requestingReview}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-40"
                  >
                    {requestingReview ? 'Sending Request...' : 'Fix During Current Visit (No Time Reserved — Re-Inspection Not Guaranteed)'}
                  </button>
                  <p className="text-[11px] text-muted mt-2 text-center">
                    Attempt to complete the correction while the inspector is still on site. Re-inspection will only occur if time allows.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <div className="flex gap-2">
                    <input
                      value={thisDeclineNote}
                      onChange={e => setDeclineNotes(prev => ({ ...prev, [hold.id]: e.target.value }))}
                      placeholder="Reason for declining (required)..."
                      className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-500"
                    />
                    <button
                      onClick={() => handleDeclineHold(hold)}
                      disabled={!thisDeclineNote.trim() || isResponding}
                      className="px-4 bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Decline and Rebook
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">Declining stops the inspection. A new booking will be required.</p>
                </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700">
                    {hold
                      ? 'No builder response is available from this card right now. Review the hold status above and continue through the existing re-verification flow.'
                      : 'Hold response controls are unavailable because no open job_holds detail was found for this on-hold project.'}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* ── Modification Required Holds ── */}
        {activeModHolds.map(hold => (
          <ModificationRequiredCard
            key={hold.id}
            hold={hold}
            onAccept={() => void handleAcknowledgeModHold(hold)}
            onDecline={note => void handleDeclineModHold(hold, note)}
            isResponding={modHoldResponding === hold.id}
          />
        ))}
            </div>
          </section>
        )}

        {/* ── Next Up ── */}
        {nextUpItems.length > 0 && (
          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted">Next Up</div>
                <div className="mt-1 text-sm font-extrabold text-ink">Clear builder actions</div>
              </div>
              <div className="rounded-full border border-rim bg-panel px-3 py-1 text-[10px] font-black uppercase tracking-wide text-muted">
                {nextUpItems.length} ready
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {nextUpItems.map(({ progressProject, stageScorecard, availableStage, latestPassedStage, requestProject }) => {
                return (
                  <div key={progressProject.key} className="rounded-2xl border border-rim bg-panel p-4 shadow-card">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-500/10 text-ink">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-extrabold text-ink">{progressProject.projectName}</div>
                        {progressProject.address && (
                          <div className="mt-0.5 truncate text-xs font-medium text-muted">{progressProject.address}{progressProject.city ? `, ${progressProject.city}` : ''}</div>
                        )}
                        <div className="mt-2 text-xs font-semibold text-ink">
                          {latestPassedStage
                              ? `${latestPassedStage.stage.label.split(' — ')[0]} passed · Vero inspection record complete`
                              : 'Ready to begin permit-stage inspections'}
                        </div>
                        <div className="mt-1 text-xs text-muted">
                          {availableStage
                            ? `${availableStage.stage.label} is available when ready.`
                            : 'A permit-stage inspection is ready to request.'}
                        </div>
                        <div className="mt-3">
                          <StageProgressRail scorecard={stageScorecard} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {availableStage && requestProject ? (
                        <button
                          type="button"
                          onClick={() => handleRequestInspection(requestProject)}
                          className="rounded-xl bg-flame px-3 py-2 text-[11px] font-black text-white transition-colors hover:bg-flame-light"
                        >
                          Request {availableStage.stage.label.split(' — ')[0]} Inspection
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Active Inspection Appointments ── */}
        {activeInspectionAppointments.length > 0 && (
          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted">Active Inspection Appointments</div>
                <div className="mt-1 text-sm font-extrabold text-ink">Confirmed and provisional inspector assignments</div>
              </div>
              <div className="rounded-full border border-rim bg-panel px-3 py-1 text-[10px] font-black uppercase tracking-wide text-muted">
                {activeInspectionAppointments.length} active
              </div>
            </div>
            <div className="space-y-3">
        {activeInspectionAppointments.map(assignment => {
            const appointmentJob = resolveAppointmentJobDisplay(assignment)
            return (
              <ProvisionalAssignmentPanel
                key={assignment.id}
                assignment={assignment}
                jobName={appointmentJob.projectName}
                jobAddress={appointmentJob.address}
                onObject={(reason, note) => store.objectAssignment(assignment.id, reason, note)}
              />
            )
          })}
            </div>
          </section>
        )}

        {/* ── Re-verification Pending ── */}
        {acceptedHolds.map(({ hold, projectName, feeAmount, acceptedAt }) => (
          <div key={hold.id} className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-500/5 overflow-hidden">
            <div className="px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-500/15 border border-amber-500/25 rounded-xl flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-ink text-sm mb-0.5">Re-verification Pending</div>
                  <div className="text-xs text-muted truncate">{projectName}</div>
                  <div className="mt-2 text-[11px] text-muted">
                    Inspector is returning to verify the correction. Your site is reserved.{' '}
                    Fee locked: <span className="font-bold text-amber-400">${feeAmount.toFixed(2)}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-subtle">
                    Accepted {new Date(acceptedAt).toLocaleTimeString('en-CA', { timeZone: 'America/Vancouver', hour: '2-digit', minute: '2-digit' })}
                    {' · '}Correction window: {correctionWindowByHold[hold.id] ?? 60} min
                  </div>
                </div>
                <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg px-2 py-1 shrink-0">
                  <div className="text-[10px] text-amber-400 font-bold">In Progress</div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* En route — live tracker card */}
        {projects.some(p => p.status === 'in_progress') && (
          <button
            onClick={() => setIsTrackerOpen(true)}
            className="w-full bg-electric/5 border border-electric/25 hover:border-electric/50 hover:bg-electric/8 rounded-2xl p-4 mb-5 flex items-center gap-4 transition-all group text-left"
          >
            <div className="relative w-11 h-11 shrink-0">
              <div className="absolute inset-0 bg-electric/20 rounded-full animate-ping" style={{ animationDuration: '1.8s' }} />
              <div className="relative w-11 h-11 bg-electric/15 border border-electric/30 rounded-full flex items-center justify-center">
                <Navigation className="w-5 h-5 text-electric" style={{ transform: 'rotate(45deg)' }} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-ink text-sm">Inspector En Route</span>
                <div className="flex items-center gap-1 bg-electric/10 border border-electric/20 rounded-md px-1.5 py-0.5">
                  <div className="w-1.5 h-1.5 bg-electric rounded-full animate-pulse" />
                  <span className="text-[9px] font-bold text-electric uppercase tracking-wide">Live</span>
                </div>
              </div>
              <div className="text-xs text-muted">
                {trackerInspectorName}{trackerInspectorLicense ? ` · ${trackerInspectorLicense}` : ''} · {trackerProjectName}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <div className="text-xs text-muted">ETA</div>
                <div className="text-lg font-black text-electric font-mono">8 min</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted group-hover:text-electric transition-colors" />
            </div>
          </button>
        )}

        {/* ── Project Portfolio ── */}
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted">Project Portfolio</div>
              <div className="mt-1 text-sm font-extrabold text-ink">Compact permit-stage progress</div>
            </div>
            <span className="label-mono">{permitProgressProjects.length || (dbJobs ?? projects).length} project{(permitProgressProjects.length || (dbJobs ?? projects).length) === 1 ? '' : 's'}</span>
          </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-flame/30 border-t-flame rounded-full animate-spin" />
            <span className="ml-3 text-sm font-medium text-muted">Loading projects…</span>
          </div>
        ) : (dbJobs ?? []).length === 0 && projects.length === 0 ? (
          <div className="text-center py-16 card-dark rounded-2xl mb-6">
            <Building2 className="w-10 h-10 text-subtle mx-auto mb-3" />
            <div className="text-sm font-bold text-ink">No projects yet</div>
            <div className="mt-1 text-xs font-medium text-muted">Post your first inspection request to get started</div>
          </div>
        ) : dbJobs !== null ? (
          <div className="space-y-3">
            {permitProgressProjects.map(progressProject => {
              const stageScorecard = buildStageScorecard(progressProject.jobs)
              const latestStage = getLatestStageEntry(stageScorecard)
              const latestJob = latestStage?.stageJob ?? progressProject.representativeJob
              const latestPassedStage = [...stageScorecard].reverse().find(entry => entry.status === 'passed')
              const { entry: availableStage, ambiguous } = findSafeAvailableStage(stageScorecard)
              const requestProject = availableStage ? buildProjectRequestForProgressStage(progressProject, availableStage.stage) : null
              const actionableHoldForJob = activeHolds.find(hold => progressProject.jobs.some(job => job.id === hold.jobId))
              const openHoldForJob = progressProject.jobs.map(job => getOpenHoldDetailForJob(job.id)?.hold).find(Boolean)
              const completedJob = progressProject.jobs.find(job => job.status === 'completed')
              const rec = completedJob ? completedRecords[completedJob.id] : undefined
              const latestStatus = latestJob
                ? getJobWorkflowLabel(latestJob)
                : latestPassedStage
                  ? 'Record complete'
                  : 'Project created'
              const latestStageCopy = latestStage
                ? `${latestStage.stage.label.split(' — ')[0]} · ${latestStage.stage.label.split(' — ')[1]}`
                : 'No inspection stage requested yet'
              return (
                <div id={getProgressDomId(progressProject.key)} key={progressProject.key} className="rounded-2xl border border-rim bg-panel p-4 shadow-card">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.9fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-extrabold text-ink">{progressProject.projectName}</div>
                        {latestJob && <StatusBadge job={latestJob} />}
                      </div>
                      {progressProject.address && (
                        <div className="mt-1 flex items-center gap-1 text-xs font-medium text-muted">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{progressProject.address}{progressProject.city ? `, ${progressProject.city}` : ''}</span>
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-muted">
                        <span>Status: <span className="font-bold text-ink">{latestStatus}</span></span>
                        <span>Latest stage: <span className="font-bold text-ink">{latestStageCopy}</span></span>
                        {latestPassedStage && <span>{latestPassedStage.stage.label.split(' — ')[0]} passed · Vero inspection record complete</span>}
                      </div>
                    </div>
                    <StageProgressRail scorecard={stageScorecard} />
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {actionableHoldForJob ? (
                        <button
                          onClick={() => document.getElementById(`hold-${actionableHoldForJob.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                          className="rounded-xl border border-amber-600/40 bg-amber-500/10 px-3 py-2 text-[11px] font-black text-ink transition-colors hover:bg-amber-500/15"
                        >
                          Review hold
                        </button>
                      ) : availableStage && requestProject && !ambiguous ? (
                        <button
                          type="button"
                          onClick={() => handleRequestInspection(requestProject)}
                          className="rounded-xl bg-flame px-3 py-2 text-[11px] font-black text-white transition-colors hover:bg-flame-light"
                        >
                          Request {availableStage.stage.label.split(' — ')[0]} Inspection
                        </button>
                      ) : completedJob ? (
                        <button
                          type="button"
                          onClick={() => router.push('/vault')}
                          className="rounded-xl border border-emerald-600/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-black text-ink transition-colors hover:bg-emerald-500/15"
                        >
                          Open Vault
                        </button>
                      ) : (
                        <span className="rounded-xl border border-rim bg-surface px-3 py-2 text-[11px] font-bold text-muted">View progress</span>
                      )}
                    </div>
                  </div>

                  {openHoldForJob && (
                    <div className="mt-3 rounded-xl border border-amber-600/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-ink">
                      Project on hold: {openHoldForJob.deficiencyReason || openHoldForJob.reason || 'Builder action may be required before inspection can proceed.'}
                    </div>
                  )}

                  {ambiguous && (
                    <div className="mt-3 rounded-xl border border-amber-600/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-ink">
                      Progress review needed. This project has an out-of-sequence inspection record. Vero support needs to review the stage history before the next request can be opened.
                    </div>
                  )}

                  <details className="mt-3 rounded-xl border border-rim bg-surface">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-black text-ink">View Progress</summary>
                    <div className="grid gap-2 border-t border-rim p-3 md:grid-cols-5">
                      {stageScorecard.map(({ stage, stageJob, status }) => {
                        const copy = BUILDER_STAGE_STATUS_COPY[status]
                        return (
                          <div key={stage.number} className={`rounded-xl border px-3 py-2 ${copy.cls}`}>
                            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide">
                              <StageStatusIcon status={status} />
                              {stage.label.split(' — ')[0]}
                            </div>
                            <div className="mt-1 min-h-8 text-[11px] font-semibold leading-snug text-ink">{stage.label.split(' — ')[1]}</div>
                            <div className="mt-2 text-[10px] font-black uppercase tracking-wide">{copy.label}</div>
                            {status === 'passed' && (
                              <div className="mt-1 text-[10px] font-semibold normal-case tracking-normal text-ink">Vero inspection record complete</div>
                            )}
                            {status === 'passed' && stageJob && (
                              <button
                                type="button"
                                onClick={() => router.push('/vault')}
                                className="mt-2 text-[10px] font-black text-ink underline decoration-current/40 underline-offset-2"
                              >
                                View Stage Record
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </details>

                  {completedJob && (
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-600/25 bg-emerald-500/10 px-3 py-2.5">
                      <div>
                        <div className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-ink">Vero Inspection Record</div>
                        <div className="font-mono text-sm font-black text-ink">
                          {rec?.certRef ?? 'Report filed'}
                        </div>
                      </div>
                      <button
                        onClick={() => router.push('/vault')}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-ink hover:underline"
                      >
                        View Report <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-5 mb-6">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} onRequestInspection={handleRequestInspection} onDelete={handleDeleteProject} />
            ))}
          </div>
        )}
        </section>

        {/* ── Weekly Activity ── */}
        <section className="mb-6">
          <div className="mb-3">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-muted">Weekly Activity</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Building2,  label: 'Active Sites',  value: activeCount,    color: 'text-ink' },
              { icon: TrendingUp, label: 'Passed / Week', value: passedThisWeek, color: 'text-ink' },
              { icon: Clock,      label: 'Active Stages', value: activeStages,   color: 'text-ink' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="rounded-2xl border border-rim bg-panel p-4 shadow-card">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-muted">
                  <Icon className="h-3.5 w-3.5" />{label}
                </div>
                <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        </section>

        <DailyFlash projects={dailyFlashProjects} dataMode={dailyFlashMode} />
      </main>

      <DispatchModal
        project={dispatchProject}
        isOpen={isDispatchOpen}
        onClose={() => setIsDispatchOpen(false)}
        onDispatch={handleDispatch}
      />

      <EnRouteTracker
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        inspector={{
          name:        trackerInspectorName,
          designation: activeAssignment?.inspectorDisciplines?.[0] ?? '',
          license:     trackerInspectorLicense,
          rating:      4.9,
          completions: 0,
          avatar:      trackerAvatar,
        }}
        project={{
          name:    trackerProjectName,
          address: trackerProjectAddress,
          stage:   trackerStageName,
        }}
        initialEtaMinutes={8}
      />
    </div>
  )
}
