'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, TrendingUp, ChevronRight, MapPin,
  CheckCircle2, Clock, AlertTriangle,
  Navigation, Shield, Lock, ExternalLink, EyeOff,
  LayoutDashboard, CalendarCheck, FolderLock, ClipboardCheck, FileCheck, Plus, User,
  PauseCircle, FileText
} from 'lucide-react'
import { RoleDashboardShell } from '@/components/shared/RoleDashboardShell'
import type { DashboardNavGroup } from '@/components/shared/DashboardSidebar'
import { ProjectCard } from '@/components/builder/ProjectCard'
import { DispatchModal } from '@/components/builder/DispatchModal'
import { SchedulingPicker, type TimeSlot } from '@/components/builder/SchedulingPicker'
import { EnRouteTracker } from '@/components/builder/EnRouteTracker'
import { DailyFlash } from '@/components/builder/DailyFlash'
import { SituationStrip, type SituationMetric } from '@/components/builder/SituationStrip'
import { AwaitingValidationPanel, type ValidationItem } from '@/components/builder/AwaitingValidationPanel'
import { RecordsReadyPanel, type RecordItem } from '@/components/builder/RecordsReadyPanel'
import { StageProgressBar } from '@/components/builder/StageProgressBar'
import { getCatalogueModelLabel } from '@/lib/catalogue'
import { Modal } from '@/components/ui/Modal'
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
  { number: 1, internalStage: 1,  label: 'Stage 1 — Site Survey & Excavation' },
  { number: 2, internalStage: 5,  label: 'Stage 2 — Foundation Pour' },
  { number: 3, internalStage: 6,  label: 'Stage 3 — Framing & Lock-up' },
  { number: 4, internalStage: 12, label: 'Stage 4 — Insulation & Energy Compliance' },
  { number: 5, internalStage: 13, label: 'Stage 5 — Interior Completion' },
  { number: 6, internalStage: 14, label: 'Stage 6 — Exterior Works and Site Finalization' },
  { number: 7, internalStage: 15, label: 'Stage 7 — Final Approval and Occupancy' },
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
  id?: string
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

// ─── Dashboard "Hide from dashboard" disposition (non-destructive) ───────────
// Mirrors the inspector Active Worklist hide pattern. Hiding a project appends a
// governance event; it never deletes the project, its jobs, payments, reports,
// seals, Vault packages, compliance records, or audit history. Current hidden
// state = the latest disposition event per project id.
//
// Manual cleanup (documentation only — do NOT run against real data):
//   insert into governance_audit_events
//     (entity_type, entity_id, action, actor_id, actor_role, blocker_type, reason)
//   values
//     ('project', '<PROJECT_OR_JOB_ID>', 'project.dashboard_hidden',
//      '<BUILDER_USER_ID>', 'builder', 'technical', 'Manual mock-data cleanup');
//   -- Restore by inserting the same row with action 'project.dashboard_restored'.
const PROJECT_HIDE_ACTION = 'project.dashboard_hidden'
const PROJECT_RESTORE_ACTION = 'project.dashboard_restored'
const PROJECT_DASHBOARD_DISPOSITION_ACTIONS = [PROJECT_HIDE_ACTION, PROJECT_RESTORE_ACTION] as const
const PROJECT_HIDE_CONFIRMATION_COPY =
  'This hides the project from your dashboard. It does not delete project records, payment records, inspection records, Vault records, sealed reports, or audit history.'

// Latest-event-wins: rows must be passed in ascending created_at order.
function getHiddenProjectIds(rows: Array<Record<string, unknown>>): Set<string> {
  const latestByEntity = new Map<string, string>()
  for (const row of rows) {
    const entityId = typeof row.entity_id === 'string' ? row.entity_id : ''
    const action = typeof row.action === 'string' ? row.action : ''
    if (!entityId || !PROJECT_DASHBOARD_DISPOSITION_ACTIONS.includes(action as typeof PROJECT_DASHBOARD_DISPOSITION_ACTIONS[number])) continue
    latestByEntity.set(entityId, action)
  }
  const hidden = new Set<string>()
  for (const [entityId, action] of latestByEntity) {
    if (action === PROJECT_HIDE_ACTION) hidden.add(entityId)
  }
  return hidden
}

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
  onObject: (reason: ObjectionReason, note: string) => Promise<boolean>
}) {
  const { h, m, s, expired } = useCountdown(assignment.objectionWindowClosesAt)
  const [showForm, setShowForm] = React.useState(false)
  const [showDetails, setShowDetails] = React.useState(false)
  const [reason, setReason] = React.useState<ObjectionReason | ''>('')
  const [note, setNote] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [objected, setObjected] = React.useState(false)
  const [objectionError, setObjectionError] = React.useState<string | null>(null)
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
    setObjectionError(null)
    const ok = await onObject(reason as ObjectionReason, note)
    if (ok) {
      setObjected(true)
    } else {
      setObjectionError('Could not file your objection. Please try again.')
    }
    setSubmitting(false)
  }

  return (
    <div className="rounded-2xl border border-rim bg-panel p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border border-rim/70 bg-white/[0.02] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              isConfirmed
                ? 'text-success-green'
                : assignment.objectionState === 'pending_review' || objected
                  ? 'text-warning-amber'
                  : 'text-subtle'
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
        <div className="mt-3 rounded-xl border border-rim/60 bg-raised px-3 py-2 text-xs font-semibold text-muted">
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
                  <label key={r.value} className={`flex items-start gap-2 rounded-xl border p-3 text-xs transition-colors ${reason === r.value ? 'border-flame/50 bg-flame/[0.06]' : 'border-rim/70 bg-panel hover:border-rim'}`}>
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
                  className="rounded-xl bg-flame px-4 py-2 text-xs font-semibold text-white shadow-sm ring-1 ring-inset ring-white/10 transition-colors hover:bg-flame-light disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? 'Filing...' : 'File Objection'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setReason(''); setNote(''); setObjectionError(null) }}
                  className="rounded-xl border border-rim px-4 py-2 text-xs font-bold text-muted"
                >
                  Cancel
                </button>
              </div>
              {objectionError && (
                <div className="rounded-xl border border-fail-red/30 bg-fail-red/5 px-3 py-2 text-xs font-semibold text-fail-red">
                  {objectionError}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Job status badge ─────────────────────────────────────────────────────────

// Neutral outlined pill base — semantic meaning carried by theme-aware text colour, not a fill.
const BADGE_BASE = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-rim/70 bg-white/[0.02]'

const WORKFLOW_BADGE_CONFIG: Record<string, { cls: string; icon?: React.ReactNode }> = {
  draft:        { cls: 'text-subtle' },
  submitted:    { cls: 'text-subtle' },
  under_review: { cls: 'text-warning-amber' },
  live:         { cls: 'text-flame' },
  closed:       { cls: 'text-success-green', icon: <Lock className="w-2.5 h-2.5" /> },
  archived:     { cls: 'text-subtle' },
}

function StatusBadge({ job }: { job: Pick<JobOpportunityRow, 'status' | 'validationStatus'> }) {
  if (job.status === 'on_hold') {
    return (
      <span className={`${BADGE_BASE} text-warning-amber`}>
        <AlertTriangle className="w-2.5 h-2.5" />
        HOLD
      </span>
    )
  }
  const workflowState = getJobWorkflowState(job)
  const cfg = WORKFLOW_BADGE_CONFIG[workflowState] ?? { cls: 'text-subtle' }
  const label = getJobWorkflowLabel(job)
  return (
    <span className={`${BADGE_BASE} ${cfg.cls}`}>
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
    cls: 'border-rim/70 bg-white/[0.02] text-subtle',
  },
  requested_live: {
    label: 'Requested / live',
    cls: 'border-rim/70 bg-white/[0.02] text-flame',
  },
  inspector_assigned: {
    label: 'Inspector assigned',
    cls: 'border-rim/70 bg-white/[0.02] text-flame',
  },
  in_progress: {
    label: 'In progress',
    cls: 'border-rim/70 bg-white/[0.02] text-flame',
  },
  passed: {
    label: 'Passed / complete',
    cls: 'border-rim/70 bg-white/[0.02] text-success-green',
  },
  hold: {
    label: 'Hold',
    cls: 'border-rim/70 bg-white/[0.02] text-warning-amber',
  },
  failed: {
    label: 'Failed / correction required',
    cls: 'border-rim/70 bg-white/[0.02] text-fail-red',
  },
  available_next: {
    label: 'Available next',
    cls: 'border-rim/70 bg-white/[0.02] text-flame',
  },
  locked: {
    label: 'Locked / waiting on prerequisite',
    cls: 'border-rim/70 bg-white/[0.02] text-subtle',
  },
}

const ACTIVE_STAGE_CARD_LABEL: Partial<Record<BuilderStageStatus, string>> = {
  requested_live:     'Awaiting Inspector',
  inspector_assigned: 'Inspector Assigned',
  in_progress:        'Inspection In Progress',
  hold:               'On Hold',
  failed:             'Failed — Action Required',
}

function StageStatusIcon({ status }: { status: BuilderStageStatus }) {
  if (status === 'passed') return <CheckCircle2 className="h-3 w-3" />
  if (status === 'hold' || status === 'failed') return <AlertTriangle className="h-3 w-3" />
  if (status === 'locked') return <Lock className="h-3 w-3" />
  if (status === 'requested_live' || status === 'inspector_assigned' || status === 'in_progress') return <Clock className="h-3 w-3" />
  return <span className="h-1.5 w-1.5 rounded-full bg-current" />
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

function getManageableTimeSlots(slots: JobOpportunityRow['availableSlots']): TimeSlot[] {
  return (slots ?? [])
    .filter(slot => !slot.flexible && slot.date && slot.startTime && slot.endTime)
    .map(slot => ({
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }))
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
    <div className="mb-5 rounded-2xl border border-rim/70 border-l-2 border-l-warning-amber bg-panel overflow-hidden">
      <div className="px-5 py-4 border-b border-rim">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-raised border border-rim/60 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-warning-amber" />
            </div>
            <div>
              <div className="font-bold text-ink text-sm mb-0.5">Modification Required — {meta.label}</div>
              <div className="text-xs text-muted capitalize">{hold.reasonCode.replace('_', ' ')}{hold.estimatedFixMinutes ? ` · Est. ${hold.estimatedFixMinutes} min` : ''}</div>
            </div>
          </div>
          <div className="rounded-full border border-rim/70 bg-white/[0.02] px-2.5 py-1 shrink-0">
            <div className="text-[10px] text-warning-amber font-semibold uppercase tracking-wide">Action Required</div>
          </div>
        </div>
      </div>

      {hold.notes && (
        <div className="px-5 py-3 border-b border-rim">
          <div className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">Inspector Notes</div>
          <div className="text-sm text-ink">{hold.notes}</div>
        </div>
      )}

      <div className="px-5 py-3 border-b border-rim">
        <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Fee Information</div>
        <div className="text-xs text-muted">{meta.feeNote}</div>
        {hold.type === 'same_day_return' && hold.returnWindowStart && hold.returnWindowEnd && (
          <div className="mt-2 text-xs text-muted">
            Return window: <span className="font-bold text-ink">{formatWindow(hold.returnWindowStart)} – {formatWindow(hold.returnWindowEnd)}</span>
          </div>
        )}
        {hold.isBlocking && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-rim/70 bg-white/[0.02] px-2.5 py-1">
            <Lock className="w-3 h-3 text-fail-red" />
            <span className="text-[11px] font-semibold text-fail-red">Blocking — downstream work paused</span>
          </div>
        )}
      </div>

      <div className="px-5 py-4 space-y-3">
        <button
          onClick={onAccept}
          disabled={isResponding}
          className="w-full bg-flame hover:bg-flame-light text-white font-semibold py-3 rounded-xl text-sm shadow-sm ring-1 ring-inset ring-white/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
            className="flex-1 bg-surface border border-rim rounded-xl px-3 py-2.5 text-xs text-ink placeholder-subtle focus:outline-none focus:border-flame/60"
          />
          <button
            onClick={() => onDecline(declineNote)}
            disabled={!declineNote.trim() || isResponding}
            className="px-4 bg-surface border border-rim text-muted font-bold rounded-xl text-xs hover:bg-raised transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Decline
          </button>
        </div>
        <p className="text-[10px] text-subtle">Declining a Modification Required will revert the inspection to in-progress and allow work to continue.</p>
      </div>
    </div>
  )
}

export default function BuilderDashboard() {
  const { user, isLoading: authLoading } = useAuth()
  const store     = useStore()
  const router    = useRouter()

  // Blueprint Rule #3: only approved builders may access the dashboard
  const [onboardingStatus, setOnboardingStatus] = useState<BuilderOnboardingStatus | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/sign-in?role=builder'); return }
    if (user.role !== 'builder') { router.replace('/'); return }
    getBuilderOnboardingStatusAsync(user.id, user.supabaseId).then(setOnboardingStatus)
  }, [router, user, authLoading])

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
  const [hiddenProjectIds, setHiddenProjectIds] = useState<Set<string>>(new Set())
  const [dbJobs, setDbJobs]                     = useState<JobOpportunityRow[] | null>(null)
  const [completedRecords, setCompletedRecords] = useState<Record<string, { certRef: string; result: string; completedAt: string }>>({})
  const [completionReportsByJobId, setCompletionReportsByJobId] = useState<Record<string, CompletionReportSummary>>({})
  const [activeHolds, setActiveHolds]           = useState<HoldRecord[]>([])
  const [activeHoldDetails, setActiveHoldDetails] = useState<Record<string, HoldDetail>>({})
  const [acceptedHolds, setAcceptedHolds]       = useState<Array<{ hold: HoldRecord; projectName: string; feeAmount: number; acceptedAt: string }>>([])
  const [holdResponding, setHoldResponding]     = useState<string | null>(null)
  const [holdReviewRequesting, setHoldReviewRequesting] = useState<string | null>(null)
  // Evidence row currently being opened (mints a short-lived signed URL server-side).
  const [openingEvidenceId, setOpeningEvidenceId] = useState<string | null>(null)
  // FIX #7: per-hold decline notes instead of one shared string
  const [declineNotes, setDeclineNotes]         = useState<Record<string, string>>({})
  // Builder-selected correction window per hold (minutes). Defaults to 60.
  const [correctionWindowByHold, setCorrectionWindowByHold] = useState<Record<string, number>>({})
  const [activeModHolds, setActiveModHolds]     = useState<InspectionHold[]>([])
  const [modHoldResponding, setModHoldResponding] = useState<string | null>(null)
  const [requestGuardMessage, setRequestGuardMessage] = useState<string | null>(null)
  const [managedLiveJob, setManagedLiveJob] = useState<JobOpportunityRow | null>(null)
  const [managedSlots, setManagedSlots] = useState<TimeSlot[]>([])
  const [manageRequestError, setManageRequestError] = useState<string | null>(null)
  const [manageRequestMessage, setManageRequestMessage] = useState<string | null>(null)
  const [manageRequestSaving, setManageRequestSaving] = useState(false)
  const [manageRequestCancelling, setManageRequestCancelling] = useState(false)
  const [cancelConfirming, setCancelConfirming] = useState(false)

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

  // Load "hide from dashboard" dispositions for this builder. Append-only
  // governance events; the latest event per project id decides visibility.
  useEffect(() => {
    if (!user?.supabaseId) return
    const builderId = user.supabaseId
    let active = true
    async function loadHiddenProjects() {
      const { data, error } = await supabase
        .from('governance_audit_events')
        .select('entity_id, action, created_at')
        .eq('entity_type', 'project')
        .eq('actor_id', builderId)
        .in('action', PROJECT_DASHBOARD_DISPOSITION_ACTIONS)
        .order('created_at', { ascending: true })
      if (!active) return
      if (error) {
        console.warn('Builder dashboard: hidden-project lookup failed', error)
        return
      }
      setHiddenProjectIds(getHiddenProjectIds((data ?? []) as Array<Record<string, unknown>>))
    }
    void loadHiddenProjects()
    return () => { active = false }
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
      .select('id, job_id, status, seal_payload, submitted_at, sealed_at, updated_at')
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
            id: typeof row.id === 'string' ? row.id : undefined,
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
      // Hydrate acceptedHolds ONLY for holds that are both active AND payment-confirmed.
      // hold_active alone is not enough: legacy/test holds may be hold_active but still
      // hold_payment_status 'unpaid' — those must not appear as fee-locked / in progress.
      const alreadyActive = allHolds.filter(h => h.status === 'hold_active' && h.holdPaymentStatus === 'paid')
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

  // Map each job card's id → its linked project id, so hiding a project also
  // suppresses its linked job cards (and standalone job cards hidden directly).
  const jobProjectIdById = new Map<string, string | undefined>()
  for (const job of dbJobs ?? []) jobProjectIdById.set(job.id, job.projectId)
  for (const job of builderJobs) jobProjectIdById.set(job.id, job.projectId)

  // A card is hidden if its own id is hidden, or its linked project id is hidden.
  const isCardVisible = (card: Project) =>
    !hiddenProjectIds.has(card.id) &&
    !hiddenProjectIds.has(jobProjectIdById.get(card.id) ?? '')

  // Single source of truth for "hide from dashboard" across every job-derived
  // panel and count. A job_opportunities row is hidden if its own id or its
  // linked project id has a latest 'project.dashboard_hidden' governance event.
  // `visibleDbJobs` is the filtered base every display derivation should read
  // from; `hiddenJobIdSet` lets assignment/hold panels test by jobId.
  const isJobHidden = (job: JobOpportunityRow) =>
    hiddenProjectIds.has(job.id) ||
    (typeof job.projectId === 'string' && hiddenProjectIds.has(job.projectId))
  const visibleDbJobs: JobOpportunityRow[] = (dbJobs ?? []).filter(job => !isJobHidden(job))
  const hiddenJobIdSet = new Set((dbJobs ?? []).filter(isJobHidden).map(job => job.id))

  // Combine: Supabase projects table + direct job_opportunities + store fallback,
  // then drop any project/job hidden from the dashboard.
  const projects = [
    ...(supabaseProjects ?? storeProjects),
    ...(dbJobs !== null ? dbJobsAsProjects : standaloneJobsAsProjects),
  ].filter(isCardVisible)
  const dailyFlashMode = resolveReportDataMode(Boolean(user?.supabaseId))

  // Two-pass deduplication for Daily Flash.
  //
  // Pass 1: collapse job_opportunities rows to one per project.
  //   job_opportunities has one row per stage inspection, so a 5-stage project
  //   produces 5 rows. Group by projectId (when present) or projectName as fallback,
  //   keeping the highest-stage row (latest updatedAt as tiebreaker).
  //
  // Pass 2: cross-source dedup by normalised name+address.
  //   supabaseProjects (projects table) and the Pass-1 job rows can both contain
  //   Saturday Morning Coffee. Normalise name+address into a single key and keep
  //   the best candidate:
  //   (a) prefer the row whose id resolves a Schedule C-B reportId (shows Download C-B),
  //   (b) then prefer highest currentStage,
  //   (c) then prefer most recent updatedAt.
  const dailyFlashProjects: Project[] = (() => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

    // Pass 1
    const dedupedJobRows: Project[] = (() => {
      if (!dbJobs) return []
      const best = new Map<string, { proj: Project; job: JobOpportunityRow }>()
      for (let i = 0; i < dbJobs.length; i++) {
        const job = dbJobs[i]
        const key = job.projectId ?? job.projectName
        const candidate = dbJobsAsProjects[i]
        const existing = best.get(key)
        if (!existing) {
          best.set(key, { proj: candidate, job })
        } else {
          const isHigherStage = job.stage > existing.job.stage
          const isSameStageNewer = job.stage === existing.job.stage && job.updatedAt > existing.job.updatedAt
          if (isHigherStage || isSameStageNewer) best.set(key, { proj: candidate, job })
        }
      }
      return [...best.values()].map(v => v.proj)
    })()

    // Pass 2 (also drops projects/jobs hidden from the dashboard)
    const raw: Project[] = (dailyFlashMode === 'live'
      ? [...(supabaseProjects ?? []), ...dedupedJobRows]
      : [...storeProjects, ...standaloneJobsAsProjects]
    ).filter(isCardVisible)

    const best = new Map<string, Project>()
    for (const proj of raw) {
      const key = norm(proj.name) + '|' + norm(proj.address)
      const existing = best.get(key)
      if (!existing) {
        best.set(key, proj)
      } else {
        const hasReport   = Boolean(completionReportsByJobId[proj.id]?.id)
        const existHasReport = Boolean(completionReportsByJobId[existing.id]?.id)
        if (hasReport && !existHasReport) {
          best.set(key, proj)
        } else if (hasReport === existHasReport) {
          if (
            proj.currentStage > existing.currentStage ||
            (proj.currentStage === existing.currentStage && proj.updatedAt > existing.updatedAt)
          ) {
            best.set(key, proj)
          }
        }
      }
    }
    return [...best.values()]
  })()

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

  // Non-destructive "Hide from dashboard": appends a governance event instead of
  // deleting. The project, jobs, payments, reports, seals, Vault packages,
  // compliance records, and audit history are all preserved. The latest event
  // per project id decides visibility (restore by inserting the restore action).
  // confirm() is wrapped in try/catch — it throws in some SSR/edge environments.
  const handleHideProject = async (projectId: string) => {
    try {
      if (!window.confirm(PROJECT_HIDE_CONFIRMATION_COPY)) return
    } catch {
      return
    }
    const builderId = user?.supabaseId
    if (!builderId) return
    try {
      const { error } = await supabase.from('governance_audit_events').insert({
        entity_type: 'project',
        entity_id: projectId,
        action: PROJECT_HIDE_ACTION,
        actor_id: builderId,
        actor_role: 'builder',
        rule_ids: ['R-021', 'R-022'],
        blocker_type: 'technical',
        reason: 'Builder hid project from dashboard view.',
        before_state: { dashboardVisible: true },
        after_state: { dashboardVisible: false },
        metadata: {
          source: 'builder_command_center',
          lifecycleMutation: false,
          recordsDeleted: false,
          paymentMutation: false,
        },
      })
      if (error) {
        console.error('Failed to hide project:', error)
        return
      }
      setHiddenProjectIds(prev => new Set(prev).add(projectId))
    } catch (err) {
      console.error('Failed to hide project:', err)
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

  // Opens one Hold evidence item via a short-lived, server-authorized signed URL.
  // The browser sends only the evidenceId; the server verifies the builder owns
  // the Hold before returning a link. No payment/Hold state is touched.
  const handleOpenHoldEvidence = async (evidenceId: string) => {
    if (!evidenceId) return
    setOpeningEvidenceId(evidenceId)
    try {
      const res = await fetch('/api/builder/holds/evidence-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceId }),
      })
      const data = await res.json().catch(() => null)
      if (data?.ok && data?.url) {
        window.open(data.url as string, '_blank', 'noopener,noreferrer')
      } else {
        console.error('Hold evidence open failed', data)
        window.alert('This evidence could not be opened right now. Please try again.')
      }
    } catch (err) {
      console.error('Hold evidence open request failed', err)
      window.alert('This evidence could not be opened right now. Please try again.')
    } finally {
      setOpeningEvidenceId(null)
    }
  }

  const handleApproveHold = async (hold: HoldRecord) => {
    const windowMinutes = correctionWindowByHold[hold.id] ?? 60
    setHoldResponding(hold.id)
    // Record the acknowledgement + selected window + quoted cap. This does NOT
    // activate the Hold: it stays unpaid and is not fee-locked or in progress.
    const ok = await builderApproveHold(hold.id, windowMinutes, 'Acknowledged — correction window selected. Awaiting payment authorization.')
    if (!ok) {
      setHoldResponding(null)
      return
    }
    // Open Stripe checkout for the re-verification fee. The Hold becomes active
    // (fee-locked, inspector re-check authorized) ONLY after the verified Stripe
    // webhook confirms payment server-side — never from this browser flow.
    try {
      const res = await fetch('/api/builder/payments/hold-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdId: hold.id }),
      })
      const data = await res.json().catch(() => null)
      if (data?.ok && data?.url) {
        window.location.href = data.url as string
        return
      }
      console.error('Hold checkout could not start', data)
    } catch (err) {
      console.error('Hold checkout request failed', err)
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

  const openManageRequest = (job: JobOpportunityRow) => {
    setManagedLiveJob(job)
    setManagedSlots(getManageableTimeSlots(job.availableSlots))
    setManageRequestError(null)
    setManageRequestMessage(null)
  }

  const closeManageRequest = () => {
    if (manageRequestSaving || manageRequestCancelling) return
    setManagedLiveJob(null)
    setManagedSlots([])
    setManageRequestError(null)
    setManageRequestMessage(null)
    setCancelConfirming(false)
  }

  const formatManageRequestFailure = (fallback: string, payload: unknown) => {
    if (!payload || typeof payload !== 'object') return fallback
    const error = (payload as Record<string, unknown>).error
    const phase = (payload as Record<string, unknown>).phase
    const detail = [typeof phase === 'string' ? phase : '', typeof error === 'string' ? error : '']
      .filter(Boolean)
      .join(': ')
    return detail || fallback
  }

  const handleSaveManagedRequest = async () => {
    if (!managedLiveJob) return
    if (managedSlots.length === 0) {
      setManageRequestError('Add at least one availability window before saving.')
      return
    }

    setManageRequestSaving(true)
    setManageRequestError(null)
    setManageRequestMessage(null)

    try {
      const response = await fetch('/api/jobs/live-request', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: managedLiveJob.id,
          availableSlots: managedSlots,
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || payload?.ok !== true) {
        setManageRequestError(formatManageRequestFailure('Could not update this request. Please try again.', payload))
        return
      }

      const nextJobs = await reloadBuilderJobs()
      const refreshedJob = nextJobs.find(job => job.id === managedLiveJob.id)
      if (refreshedJob) setManagedLiveJob(refreshedJob)
      setManageRequestMessage('Time windows updated. The request remains visible on the Live Job Board.')
    } catch (error) {
      console.error('handleSaveManagedRequest:', error)
      setManageRequestError('Could not update this request. Please try again.')
    } finally {
      setManageRequestSaving(false)
    }
  }

  const handleCancelManagedRequest = async () => {
    if (!managedLiveJob) return

    setManageRequestCancelling(true)
    setManageRequestError(null)
    setManageRequestMessage(null)

    try {
      const response = await fetch('/api/jobs/live-request', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: managedLiveJob.id,
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || payload?.ok !== true) {
        setManageRequestError(formatManageRequestFailure('Could not cancel this request. Please try again.', payload))
        return
      }

      await reloadBuilderJobs()
      setManagedLiveJob(null)
      setManagedSlots([])
      setRequestGuardMessage(
        managedLiveJob.status === 'pending_validation'
          ? 'Blocked request removed. You can resubmit for this stage when ready.'
          : 'Live request cancelled. You can request this stage again from the existing project when ready.',
      )
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (error) {
      console.error('handleCancelManagedRequest:', error)
      setManageRequestError('Could not cancel this request. Please try again.')
    } finally {
      setManageRequestCancelling(false)
      setCancelConfirming(false)
    }
  }

  // A freshly claimed / provisionally-assigned job is invisible to the builder
  // job bridge, so its reconstructed assignment can carry an empty builderId.
  // Match the builder's own assignments by jobId as well, so a claimed
  // appointment still resolves for the dashboard and the appointment modal.
  const builderJobIds = new Set<string>([
    ...visibleDbJobs.map(j => j.id),
    ...store.jobs.filter(j => isMatch(j.builderId)).map(j => j.id),
  ])
  const isBuildersAssignment = (a: Assignment) => isMatch(a.builderId) || builderJobIds.has(a.jobId)

  // Active inspection appointments — confirmed/provisional assignments and
  // objection-review items for this builder.
  const activeInspectionAppointments = store.assignments.filter(
    a => isBuildersAssignment(a) && !hiddenJobIdSet.has(a.jobId) && (a.status === 'provisional' || a.status === 'confirmed' || a.objectionState === 'pending_review')
  )
  // Operational urgency rank: confirmed first, objection review next, provisional last.
  const appointmentUrgencyRank = (a: Assignment): number => {
    if (a.status === 'confirmed') return 0
    if (a.objectionState === 'pending_review') return 1
    return 2
  }
  // Tie-break: most recently confirmed / claimed first.
  const appointmentRecency = (a: Assignment): number => {
    const ts = a.confirmedAt ?? a.claimedAt
    const parsed = ts ? new Date(ts).getTime() : NaN
    return Number.isNaN(parsed) ? 0 : parsed
  }
  // Copy before sorting — never mutate the store array in place.
  const sortedActiveInspectionAppointments = [...activeInspectionAppointments].sort((a, b) => {
    const rankDiff = appointmentUrgencyRank(a) - appointmentUrgencyRank(b)
    if (rankDiff !== 0) return rankDiff
    return appointmentRecency(b) - appointmentRecency(a)
  })

  // Active assignment — drives the en-route tracker. Aligns with the top-ranked
  // active appointment so the Inspector Arrival Status card and the elevated
  // appointment refer to the same inspection where possible.
  const activeAssignment = sortedActiveInspectionAppointments.find(
    a => a.status === 'provisional' || a.status === 'confirmed'
  ) ?? sortedActiveInspectionAppointments[0]
  const assignedJob         = activeAssignment ? store.jobs.find(j => j.id === activeAssignment.jobId) : null
  // Claimed jobs may be absent from store.jobs; the builder DB job set still has
  // them, so prefer it for the appointment's project / stage / request details.
  const assignedDbJob       = activeAssignment ? visibleDbJobs.find(j => j.id === activeAssignment.jobId) : null
  const inProgressProject   = projects.find(p => p.status === 'in_progress')

  const trackerInspectorName    = activeAssignment?.inspectorName    ?? 'Inspector'
  const trackerInspectorLicense = activeAssignment?.inspectorLicense ?? ''
  const trackerProjectName      = assignedJob?.projectName ?? assignedDbJob?.projectName ?? inProgressProject?.name    ?? 'Active Project'
  const trackerProjectAddress   = assignedJob?.address     ?? assignedDbJob?.address     ?? inProgressProject?.address ?? ''
  const trackerStageName        = assignedDbJob
    ? `Stage ${assignedDbJob.stage} · ${assignedDbJob.stageName}`
    : assignedJob
      ? `Stage ${assignedJob.stage} · ${assignedJob.stageName}`
      : inProgressProject ? `Stage ${inProgressProject.currentStage}` : ''
  const trackerAvatar = activeAssignment
    ? activeAssignment.inspectorName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'IN'

  const statsSource    = (supabaseProjects ?? storeProjects).filter(p => !hiddenProjectIds.has(p.id))
  const activeCount    = statsSource.filter(p => p.status !== 'pass' && p.status !== 'completed').length
  const passedThisWeek = statsSource.filter(p => p.status === 'pass').length
  const activeStages   = statsSource
    .filter(p => p.status !== 'pass' && p.status !== 'completed')
    .reduce((sum, project) => {
      const openStages = project.stages.filter(stage => stage.status !== 'pass').length
      return sum + Math.max(openStages, 1)
    }, 0)
  const dbJobsById = new Map(visibleDbJobs.map(job => [job.id, job]))
  const storeJobsById = new Map(store.jobs.map(job => [job.id, job]))
  const projectsById = new Map(projects.map(project => [project.id, project]))
  const openHoldDetails = Object.values(activeHoldDetails).filter(detail => isHoldOpenStatus(detail.hold.status))
  const onHoldJobs = visibleDbJobs.filter(job => job.status === 'on_hold')
  const actionableHoldJobIds = new Set(activeHolds.map(hold => hold.jobId))
  const actionRequiredHoldJobs = onHoldJobs.filter(job => actionableHoldJobIds.has(job.id))
  const getOpenHoldDetailForJob = (jobId: string) => openHoldDetails.find(detail => detail.hold.jobId === jobId)
  // Job-based accepted holds for hidden projects are suppressed too (same id space).
  const visibleAcceptedHolds = acceptedHolds.filter(({ hold }) => !hiddenProjectIds.has(hold.jobId))
  const hasBuilderActions = actionRequiredHoldJobs.length > 0 || activeModHolds.length > 0 || visibleAcceptedHolds.length > 0
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
    const jobsById = new Map(visibleDbJobs.map(job => [job.id, job]))
    for (const job of visibleDbJobs) {
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

    // Drop any progress group hidden from the dashboard. A group is hidden if its
    // group key, source project id, representative job's project id, or any member
    // job id has a latest 'project.dashboard_hidden' governance event. Rows are
    // only suppressed from this view — no records are deleted.
    const isGroupVisible = (pp: PermitProgressProject) => {
      const ids = [
        pp.key,
        pp.sourceProject?.id,
        pp.representativeJob?.projectId,
        ...pp.jobs.map(job => job.id),
      ]
      return !ids.some(id => typeof id === 'string' && hiddenProjectIds.has(id))
    }

    return Array.from(groups.values())
      .filter(isGroupVisible)
      .sort((a, b) => a.projectName.localeCompare(b.projectName))
  })()
  const getScorecardJobForStage = (relatedJobs: JobOpportunityRow[], stageNumber: number) => {
    const candidates = relatedJobs.filter(candidate => candidate.stage === stageNumber)
    return candidates.find(candidate => candidate.status !== 'cancelled')
  }

  const buildStageScorecard = (relatedJobs: JobOpportunityRow[]): StageScorecardEntry[] => {
    let previousStagePassed = true
    const entries = BUILDER_STAGE_DEFINITIONS.map((stage, index) => {
      const stageJob = getScorecardJobForStage(relatedJobs, stage.number)
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
  const activeAppointmentJobIds = new Set(activeInspectionAppointments.map(assignment => assignment.jobId))
  const liveUnclaimedJobs = visibleDbJobs
    .filter(job => job.status === 'live' && job.validationStatus === 'validated' && !activeAppointmentJobIds.has(job.id))
    .sort((a, b) => {
      const ta = a.publishedAt ?? a.requestedAt ?? a.createdAt
      const tb = b.publishedAt ?? b.requestedAt ?? b.createdAt
      return tb.localeCompare(ta)
    })
  const pendingValidationJobs = visibleDbJobs
    .filter(job => job.status === 'pending_validation')
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))

  const { activeProgressProjects, completedProgressProjects } = (() => {
    const active: PermitProgressProject[] = []
    const completed: PermitProgressProject[] = []
    for (const pp of permitProgressProjects) {
      const sc = buildStageScorecard(pp.jobs)
      if (sc.every(e => e.status === 'passed')) {
        completed.push(pp)
      } else {
        active.push(pp)
      }
    }
    return { activeProgressProjects: active, completedProgressProjects: completed }
  })()

  // FIX #4: show spinner while either projects OR jobs are loading
  const isLoading = isLoadingProjects || isLoadingJobs

  // ─── Command Center layout helpers (presentation only) ───────────────────────
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const needsActionCount = actionRequiredHoldJobs.length + activeModHolds.length + visibleAcceptedHolds.length

  const situationMetrics: SituationMetric[] = [
    { key: 'needs-action', label: 'Needs Action', count: needsActionCount, helper: 'Holds & decisions', tone: 'flame', targetId: 'needs-action' },
    { key: 'live-board', label: 'Live Board', count: liveUnclaimedJobs.length, helper: 'Awaiting claim', tone: 'electric', targetId: 'live-operations' },
    { key: 'awaiting-validation', label: 'Awaiting Validation', count: pendingValidationJobs.length, helper: 'In intake queue', tone: 'amber', targetId: 'awaiting-validation' },
    { key: 'on-hold', label: 'On Hold', count: actionRequiredHoldJobs.length, helper: 'Require correction', tone: 'amber', targetId: 'needs-action' },
    { key: 'records-ready', label: 'Records Ready', count: completedProgressProjects.length, helper: 'Filed & downloadable', tone: 'emerald', targetId: 'records-ready' },
  ]

  // ─── Operations-console sidebar (route links + in-page section anchors) ───────
  const builderProjectCount = permitProgressProjects.length || (dbJobs !== null ? visibleDbJobs.length : projects.length)
  // Major destinations stay visible even at zero count (muted, never hidden) so
  // the sidebar teaches where work lives. Conditionally-rendered sections fall
  // back to the nearest always-present anchor so a click never no-ops.
  const holdsDecisionsCount = actionRequiredHoldJobs.length + activeModHolds.length
  const dashboardNavGroups: DashboardNavGroup[] = [
    {
      label: 'Workspace',
      items: [
        { id: 'overview', kind: 'section', targetId: 'overview', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'needs-action', kind: 'section', targetId: hasBuilderActions ? 'needs-action' : 'overview', label: 'Needs Action', icon: AlertTriangle, badge: needsActionCount, muted: !hasBuilderActions },
        { id: 'projects', kind: 'section', targetId: 'projects', label: 'Projects', icon: Building2, badge: builderProjectCount },
        { id: 'inspection-requests', kind: 'section', targetId: liveUnclaimedJobs.length > 0 ? 'live-operations' : 'projects', label: 'Inspection Requests', icon: Navigation, badge: liveUnclaimedJobs.length, muted: liveUnclaimedJobs.length === 0 },
        { id: 'appointments', kind: 'section', targetId: sortedActiveInspectionAppointments.length > 0 ? 'appointments' : 'projects', label: 'Appointments', icon: CalendarCheck, badge: sortedActiveInspectionAppointments.length, muted: sortedActiveInspectionAppointments.length === 0 },
        { id: 'holds-decisions', kind: 'section', targetId: hasBuilderActions ? 'needs-action' : 'overview', label: 'Holds & Decisions', icon: PauseCircle, badge: holdsDecisionsCount, muted: holdsDecisionsCount === 0 },
        { id: 'vault', kind: 'route', href: '/vault', label: 'Records / Vault', icon: FolderLock },
      ],
    },
    {
      label: 'Actions',
      items: [
        { id: 'post-request', kind: 'action', onClick: handleNewRequest, label: 'Post Inspection Request', icon: Plus },
        { id: 'open-vault', kind: 'route', href: '/vault', label: 'Open Vault', icon: FolderLock },
      ],
    },
    {
      label: 'Project Tools',
      items: [
        { id: 'stage-progress', kind: 'section', targetId: 'projects', label: 'Stage Progress', icon: TrendingUp },
        { id: 'awaiting-validation', kind: 'section', targetId: 'awaiting-validation', label: 'Awaiting Validation', icon: ClipboardCheck, badge: pendingValidationJobs.length, muted: pendingValidationJobs.length === 0 },
        { id: 'records-ready', kind: 'section', targetId: 'records-ready', label: 'Records Ready', icon: FileCheck, badge: completedProgressProjects.length, muted: completedProgressProjects.length === 0 },
        { id: 'schedule-cb', kind: 'route', href: '/vault', label: 'Schedule C-B / Filed Records', icon: FileText },
      ],
    },
    {
      label: 'Account',
      items: [
        { id: 'profile', kind: 'route', href: '/builder/profile', label: 'Profile', icon: User },
      ],
    },
  ]

  const validationPanelItems: ValidationItem[] = pendingValidationJobs.map(job => ({
    id: job.id,
    projectName: job.projectName,
    address: job.address ? `${job.address}${job.city ? `, ${job.city}` : ''}` : undefined,
    stageLabel: BUILDER_STAGE_DEFINITIONS.find(s => s.number === job.stage)?.label ?? `Stage ${job.stage} — ${job.stageName}`,
  }))

  const recordsReadyItems: RecordItem[] = completedProgressProjects.map(pp => {
    const completedJob = [...pp.jobs].reverse().find(j => j.status === 'completed')
    return {
      key: pp.key,
      projectName: pp.projectName,
      address: pp.address ? `${pp.address}${pp.city ? `, ${pp.city}` : ''}` : undefined,
      certRef: completedJob ? completedRecords[completedJob.id]?.certRef : undefined,
      reportId: completedJob ? completionReportsByJobId[completedJob.id]?.id : undefined,
    }
  })

  return (
    <RoleDashboardShell
      brandEyebrow="Builder Operations"
      brandTitle={user?.company ?? MOCK_BUILDER.companyName}
      navGroups={dashboardNavGroups}
      topbar={{
        role: 'builder',
        primaryAction: { label: 'Post Inspection Request', onClick: handleNewRequest, icon: Plus },
        secondaryAction: { label: 'Open Vault', onClick: () => router.push('/vault'), icon: FolderLock },
      }}
    >
        {requestGuardMessage && (
          <div className="mb-6 rounded-2xl border border-rim/70 border-l-2 border-l-warning-amber bg-raised px-4 py-3 text-sm font-semibold text-ink">
            {requestGuardMessage}
          </div>
        )}

        {/* ── Builder Command Center hero ── */}
        {/* Premium dark dotted banner that mirrors the Inspector Live Board hero:
            charcoal surface, subtle dot texture, restrained flame glow + eyebrow,
            strong white typography. Presentation only — the CTAs reuse the
            existing handlers (new request modal + Vault route). */}
        <div id="overview" className="relative mb-6 scroll-mt-20 overflow-hidden rounded-3xl border border-rim/70 bg-gradient-to-b from-panel to-surface bg-dot bg-dot-sm">
          <div className="pointer-events-none absolute -top-24 right-[-6rem] h-72 w-72 rounded-full bg-flame/10 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-flame/40 to-transparent" />
          <div className="relative px-5 py-7 sm:px-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-flame/25 bg-flame/[0.08] px-3 py-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flame/70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-flame" />
                  </span>
                  <span className="label-mono font-bold !text-flame">
                    Builder Operations · {user?.company ?? MOCK_BUILDER.companyName}
                  </span>
                </div>
                <h1 className="text-3xl font-black tracking-tight text-ink sm:text-4xl">Builder Command Center</h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
                  Track live inspections, unblock stalled sites, and download filed records from one place.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleNewRequest}
                  className="inline-flex items-center gap-2 rounded-2xl bg-flame px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-colors hover:bg-flame-light"
                >
                  <MapPin className="h-4 w-4" />
                  Post Inspection Request
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/vault')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rim bg-panel/80 px-5 py-3.5 text-sm font-bold text-ink backdrop-blur transition-colors hover:border-rim hover:bg-raised"
                >
                  <FolderLock className="h-4 w-4 text-muted" />
                  Open Vault
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Situation Strip (compact Today summary) ── */}
        <div className="mb-6">
          <SituationStrip metrics={situationMetrics} onSelect={scrollToSection} />
        </div>

        {/* ── Two-column command layout ── */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* MAIN COLUMN */}
          <div className="space-y-6 lg:col-span-8">

        {/* ── Needs Action (always first) ── */}
        {hasBuilderActions && (
          <section id="needs-action" className="mb-6 scroll-mt-20">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-flame">Needs Action</div>
                <div className="mt-1 text-sm font-extrabold text-ink">Review holds and builder decisions</div>
              </div>
              <div className="rounded-full border border-rim/70 bg-white/[0.02] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-flame">
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
          const affectedItemsSummary = hold
            ? hold.affectedItemSummaries.length > 0
              ? `Affected items: ${hold.affectedItemSummaries.join(' · ')}`
              : `Affected checklist items: ${hold.checklistItemIds.join(', ')}`
            : 'Hold details are unavailable from the existing hold records.'
          const sameDayLabel = hold
            ? hold.holdEligibleForOnSiteCorrection ? 'Same-day correction eligible' : 'Rebook required'
            : 'Hold detail unavailable'

          return (
            <div key={holdId} className="rounded-2xl border border-rim/70 border-l-2 border-l-flame bg-panel overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-rim/60 bg-raised">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-panel border border-rim/60 rounded-xl flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5 text-flame" />
                    </div>
                    <div>
                      <div className="font-bold text-ink text-base mb-0.5">Action required — project on hold</div>
                      <div className="text-xs font-semibold text-muted">{holdJob?.projectName ?? 'Project'} · Stage {holdJob?.stage ?? ''}</div>
                      {holdJob?.address && (
                        <div className="mt-0.5 text-[11px] text-muted">{holdJob.address}{holdJob.city ? `, ${holdJob.city}` : ''}</div>
                      )}
                      <div className="mt-1 text-[11px] text-muted">{builderResponseStatus}</div>
                    </div>
                  </div>
                  <div className="rounded-full border border-rim/70 bg-white/[0.02] px-2.5 py-1">
                    <div className="text-[10px] text-flame font-semibold uppercase tracking-wide">Action Required</div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 border-b border-rim">
                {hold?.deficiencyReason && (
                  <>
                    <div className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">Deficiency Detail</div>
                    <div className="text-sm font-bold text-ink mb-3">{hold.deficiencyReason}</div>
                  </>
                )}
                <div className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-1">Required Correction</div>
                <div className="text-sm font-bold text-ink">{hold?.reason ?? 'The project is marked on hold, but no open job_holds record was returned for this job.'}</div>
                <div className="mt-2 text-xs text-muted">
                  {affectedItemsSummary}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
                  <span className="rounded-full bg-surface px-2 py-1 text-muted">
                    {sameDayLabel}
                  </span>
                  <span className="rounded-full bg-surface px-2 py-1 text-muted">
                    Response: {builderResponseStatus}
                  </span>
                </div>
              </div>

              {holdEvidence.length > 0 && (
                <div className="px-5 py-3 border-b border-rim">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Supporting Evidence</div>
                  <div className="space-y-1.5">
                    {holdEvidence.slice(0, 3).map(evidence => (
                      <div key={evidence.id} className="flex items-center justify-between gap-3 rounded-xl border border-rim bg-surface px-3 py-2 text-xs">
                        <span className="font-semibold text-ink truncate">{evidence.fileName || evidence.noteText || 'Hold evidence'}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="rounded-full bg-panel px-2 py-0.5 text-[10px] font-bold uppercase text-muted">{evidence.evidenceType}</span>
                          {evidence.storagePath && (
                            <button
                              type="button"
                              onClick={() => handleOpenHoldEvidence(evidence.id)}
                              disabled={openingEvidenceId === evidence.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-rim bg-panel px-2 py-1 text-[10px] font-bold text-flame transition-colors hover:bg-surface disabled:opacity-50"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {openingEvidenceId === evidence.id ? 'Opening…' : 'Open photo'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {holdEvidence.length > 3 && (
                    <div className="mt-2 text-[10px] font-semibold text-muted">+{holdEvidence.length - 3} more evidence item{holdEvidence.length - 3 === 1 ? '' : 's'}</div>
                  )}
                </div>
              )}

              <div id={`hold-${holdId}`} className="px-5 py-3 border-b border-rim">
                <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Review Hold Request</div>
                <div className="text-xs text-muted">
                  {hold
                    ? 'Accept a correction window to reserve the inspector for re-verification, or request same-visit review if the correction can be made while they are still available.'
                    : 'This project is on hold, but the dashboard could not find an open hold detail record to power the existing response controls.'}
                </div>
              </div>

              <div className="px-5 py-3 border-b border-rim">
                <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Fee Breakdown</div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Base Hold Review Fee</span>
                    <span className="font-bold text-ink">${baseHoldServiceFee.toFixed(2)}</span>
                  </div>
                  {hold && (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted">Reserved Correction Window ({selectedWindow} min @ 1.5×)</span>
                        <span className="font-bold text-ink">${windowFee.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-rim pt-1.5 flex items-center justify-between text-xs">
                        <span className="font-bold text-ink">Total Due</span>
                        <span className="font-black text-ink">${totalAcceptanceFee.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-2 text-[10px] text-subtle">
                  Reserved correction window: {selectedWindow} min. Additional fees apply if the correction exceeds this window or extends beyond inspector availability.
                </div>
              </div>

              {isActionableHold && hold && (
                <div className="px-5 py-3 border-b border-rim">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[10px] font-bold text-muted uppercase tracking-widest">Select Correction Window</div>
                    <div className="text-[10px] font-bold text-flame">{selectedWindow} min selected</div>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[30, 60, 90, 120, 150].map(minutes => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => setCorrectionWindowByHold(prev => ({ ...prev, [hold.id]: minutes }))}
                        className={`rounded-xl py-2 text-xs font-semibold transition-all ${
                          selectedWindow === minutes
                            ? 'bg-flame text-white shadow-sm ring-1 ring-inset ring-white/10'
                            : 'border border-rim/70 text-muted hover:bg-surface'
                        }`}
                      >
                        {minutes}m
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {hold && (
                <div className="px-5 py-3 border-b border-rim grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="text-[10px] font-bold text-muted uppercase tracking-widest">Expiry</div>
                    <div className="text-xs font-mono font-bold text-ink">
                      {new Date(hold.expiresAt).toLocaleTimeString('en-CA', { timeZone: 'America/Vancouver', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-muted uppercase tracking-widest">Base Rate</div>
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
                      className="flex-1 bg-flame hover:bg-flame-light text-white font-semibold py-3 rounded-xl text-sm shadow-sm ring-1 ring-inset ring-white/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isResponding
                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <CheckCircle2 className="w-4 h-4" />}
                      Payment Required — Authorize Re-verification
                    </button>
                  </div>
                  <p className="text-[11px] text-muted mt-2 text-center">
                    Reserves a {selectedWindow}-minute correction window. You will be taken to secure checkout. The inspector re-check is authorized only after payment is confirmed.
                  </p>
                </div>

                <div>
                  <button
                    onClick={() => handleRequestReview(hold)}
                    disabled={requestingReview}
                    className="w-full rounded-xl border border-rim bg-surface py-2.5 text-xs font-bold text-muted transition-all hover:bg-raised disabled:opacity-40"
                  >
                    {requestingReview ? 'Sending Request...' : 'Fix During Current Visit (No Time Reserved — Re-Inspection Not Guaranteed)'}
                  </button>
                  <p className="text-[11px] text-muted mt-2 text-center">
                    Attempt to complete the correction while the inspector is still on site. Re-inspection will only occur if time allows.
                  </p>
                </div>

                <div className="pt-2 border-t border-rim">
                  <div className="flex gap-2">
                    <input
                      value={thisDeclineNote}
                      onChange={e => setDeclineNotes(prev => ({ ...prev, [hold.id]: e.target.value }))}
                      placeholder="Reason for declining (required)..."
                      className="flex-1 bg-surface border border-rim rounded-xl px-3 py-2.5 text-xs text-ink placeholder-subtle focus:outline-none focus:border-flame/60"
                    />
                    <button
                      onClick={() => handleDeclineHold(hold)}
                      disabled={!thisDeclineNote.trim() || isResponding}
                      className="px-4 bg-surface border border-rim text-muted font-bold rounded-xl text-xs hover:bg-raised transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Decline and Rebook
                    </button>
                  </div>
                  <p className="text-[10px] text-subtle mt-2">Declining stops the inspection. A new booking will be required.</p>
                </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-rim bg-surface px-3 py-3 text-xs text-muted">
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

        {/* ── Re-verification Pending ── */}
        {visibleAcceptedHolds.map(({ hold, projectName, feeAmount, acceptedAt }) => (
          <div key={hold.id} className="mb-5 rounded-2xl border border-rim/70 border-l-2 border-l-warning-amber bg-panel overflow-hidden">
            <div className="px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-raised border border-rim/60 rounded-xl flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-warning-amber" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-ink text-sm mb-0.5">Re-verification Pending</div>
                  <div className="text-xs text-muted truncate">{projectName}</div>
                  <div className="mt-2 text-[11px] text-muted">
                    Inspector is returning to verify the correction. Your site is reserved.{' '}
                    Fee locked: <span className="font-bold text-warning-amber">${feeAmount.toFixed(2)}</span>
                  </div>
                  <div className="mt-1.5 text-[11px] text-muted">
                    Complete the required correction before the inspector returns. If the correction is not ready, the hold may be extended and additional fees may apply.
                  </div>
                  <div className="mt-1 text-[10px] text-subtle">
                    Accepted {new Date(acceptedAt).toLocaleTimeString('en-CA', { timeZone: 'America/Vancouver', hour: '2-digit', minute: '2-digit' })}
                    {' · '}Correction window: {correctionWindowByHold[hold.id] ?? 60} min
                  </div>
                </div>
                <div className="rounded-full border border-rim/70 bg-white/[0.02] px-2.5 py-1 shrink-0">
                  <div className="text-[10px] text-warning-amber font-semibold">In Progress</div>
                </div>
              </div>
            </div>
          </div>
        ))}
            </div>
          </section>
        )}

        {/* ── Active Inspection Appointments ── */}
        {sortedActiveInspectionAppointments.length > 0 && (
          <section id="appointments" className="mb-6 scroll-mt-20">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Active Inspection Appointments</div>
                <div className="mt-1 text-sm font-extrabold text-ink">Confirmed and provisional inspector assignments</div>
              </div>
              <div className="rounded-full border border-rim bg-panel px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                {sortedActiveInspectionAppointments.length} active
              </div>
            </div>
            <div className="space-y-3">
        {sortedActiveInspectionAppointments.map(assignment => {
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

        {/* ── Live Operations ── */}
        {liveUnclaimedJobs.length > 0 && (
          <section id="live-operations" className="mb-6 scroll-mt-20">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-electric">Live Operations</div>
                <div className="mt-1 text-xs font-medium text-muted">Posted requests are visible to qualified inspectors on the Live Job Board until claimed.</div>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-rim/70 bg-white/[0.02] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-electric">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-electric" />
                {liveUnclaimedJobs.length} live
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {liveUnclaimedJobs.map(job => {
                const stageLabel = BUILDER_STAGE_DEFINITIONS.find(s => s.number === job.stage)?.label ?? `Stage ${job.stage} — ${job.stageName}`
                const postedAt = job.publishedAt ?? job.requestedAt ?? job.createdAt
                return (
                  <div key={job.id} className="rounded-2xl border border-rim bg-panel p-4 shadow-sm transition-colors hover:border-electric/30">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rim/60 bg-raised">
                        <Navigation className="h-4 w-4 text-electric" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-extrabold text-ink">{job.projectName}</div>
                        {job.address && (
                          <div className="mt-0.5 truncate text-xs font-medium text-muted">{job.address}{job.city ? `, ${job.city}` : ''}</div>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-rim/70 bg-white/[0.02] px-2 py-0.5 text-[10px] font-semibold text-success-green">
                            Posted to Live Board
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-rim/70 bg-white/[0.02] px-2 py-0.5 text-[10px] font-semibold text-muted">
                            Waiting for inspector claim
                          </span>
                        </div>
                        <div className="mt-2 text-xs font-semibold text-ink">{stageLabel}</div>
                        {postedAt && (
                          <div className="mt-1 text-[11px] text-muted">
                            Posted {new Date(postedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} at {new Date(postedAt).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openManageRequest(job)}
                        className="rounded-xl border border-rim/70 bg-white/[0.02] px-3 py-2 text-[11px] font-semibold text-ink transition-colors hover:border-electric/40 hover:text-electric"
                      >
                        Manage Request
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Projects & Stage Progress ── */}
        <section id="projects" className="mb-6 scroll-mt-20">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Project Portfolio</div>
              <div className="mt-1 text-sm font-extrabold text-ink">Permit-stage progress across your active sites</div>
            </div>
            <span className="label-mono">{permitProgressProjects.length || (dbJobs !== null ? visibleDbJobs.length : projects.length)} project{(permitProgressProjects.length || (dbJobs !== null ? visibleDbJobs.length : projects.length)) === 1 ? '' : 's'}</span>
          </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-flame/30 border-t-flame rounded-full animate-spin" />
            <span className="ml-3 text-sm font-medium text-muted">Loading projects…</span>
          </div>
        ) : visibleDbJobs.length === 0 && projects.length === 0 ? (
          <div className="text-center py-16 card-dark rounded-2xl mb-6">
            <Building2 className="w-10 h-10 text-subtle mx-auto mb-3" />
            <div className="text-sm font-bold text-ink">No projects yet</div>
            <div className="mt-1 text-xs font-medium text-muted">Post your first inspection request to get started</div>
          </div>
        ) : dbJobs !== null ? (
          <div className="overflow-hidden rounded-2xl border border-rim bg-panel shadow-sm divide-y divide-rim/50">
            {activeProgressProjects.map(progressProject => {
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
              const activeStageEntry = stageScorecard.find(e =>
                (['requested_live', 'inspector_assigned', 'in_progress', 'hold', 'failed'] as BuilderStageStatus[]).includes(e.status)
              )
              const latestStatus = latestJob
                ? getJobWorkflowLabel(latestJob)
                : latestPassedStage
                  ? 'Record complete'
                  : 'Project created'
              const latestStageCopy = latestStage
                ? `${latestStage.stage.label.split(' — ')[0]} · ${latestStage.stage.label.split(' — ')[1]}`
                : 'No inspection stage requested yet'
              // Compact stage-progress treatment (full seven-stage detail stays in View Progress)
              const passedStageCount = stageScorecard.filter(e => e.status === 'passed').length
              const focusStage = activeStageEntry ?? availableStage ?? latestStage ?? stageScorecard[Math.max(0, passedStageCount - 1)]
              const focusStatus = focusStage?.status
              const progressStageNumber = focusStage?.stage.number ?? Math.min(passedStageCount + 1, stageScorecard.length)
              const progressStageName = focusStage ? focusStage.stage.label.split(' — ')[0] : 'Not started'
              const progressTone: 'flame' | 'amber' | 'electric' | 'emerald' | 'muted' =
                actionableHoldForJob || focusStatus === 'hold' || focusStatus === 'failed' ? 'amber'
                : focusStatus === 'in_progress' ? 'flame'
                : focusStatus === 'requested_live' || focusStatus === 'inspector_assigned' ? 'electric'
                : focusStatus === 'available_next' ? 'flame'
                : completedJob || passedStageCount === stageScorecard.length ? 'emerald'
                : 'muted'
              return (
                <div id={getProgressDomId(progressProject.key)} key={progressProject.key} className="p-4 transition-colors hover:bg-raised/40 sm:px-5">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.9fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-extrabold text-ink">{progressProject.projectName}</div>
                        {latestJob && <StatusBadge job={latestJob} />}
                        {getCatalogueModelLabel(progressProject.representativeJob?.catalogueModelCode) && (
                          <span className="rounded-full border border-rim bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted">
                            Catalogue model: <span className="font-bold text-ink">{getCatalogueModelLabel(progressProject.representativeJob?.catalogueModelCode)}</span>
                          </span>
                        )}
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
                    <StageProgressBar
                      current={progressStageNumber}
                      total={stageScorecard.length}
                      stageName={progressStageName}
                      passedCount={passedStageCount}
                      tone={progressTone}
                    />
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {actionableHoldForJob ? (
                        <button
                          onClick={() => document.getElementById(`hold-${actionableHoldForJob.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                          className="rounded-xl border border-rim/70 bg-white/[0.02] px-3 py-2 text-[11px] font-semibold text-warning-amber transition-colors hover:border-rim"
                        >
                          Review hold
                        </button>
                      ) : availableStage && requestProject && !ambiguous ? (
                        <button
                          type="button"
                          onClick={() => handleRequestInspection(requestProject)}
                          className="rounded-xl bg-flame px-3 py-2 text-[11px] font-semibold text-white shadow-sm ring-1 ring-inset ring-white/10 transition-colors hover:bg-flame-light"
                        >
                          Request {availableStage.stage.label.split(' — ')[0]} Inspection
                        </button>
                      ) : completedJob ? (
                        completionReportsByJobId[completedJob.id]?.id ? (
                          <a
                            href={`/api/schedule-cb?reportId=${encodeURIComponent(completionReportsByJobId[completedJob.id]!.id!)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-xl bg-flame px-3 py-2 text-[11px] font-semibold text-white shadow-sm ring-1 ring-inset ring-white/10 transition-colors hover:bg-flame-light"
                          >
                            Download Schedule C-B
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => router.push('/vault')}
                            className="rounded-xl border border-rim bg-surface px-3 py-2 text-[11px] font-bold text-muted transition-colors hover:bg-raised"
                          >
                            Open Vault
                          </button>
                        )
                      ) : activeStageEntry ? (
                        <>
                          <span className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${BUILDER_STAGE_STATUS_COPY[activeStageEntry.status].cls}`}>
                            {ACTIVE_STAGE_CARD_LABEL[activeStageEntry.status] ?? BUILDER_STAGE_STATUS_COPY[activeStageEntry.status].label}
                          </span>
                          {activeStageEntry.status === 'requested_live' && activeStageEntry.stageJob && (
                            <button
                              type="button"
                              onClick={() => openManageRequest(activeStageEntry.stageJob!)}
                              className="rounded-xl bg-flame px-3 py-2 text-[11px] font-semibold text-white shadow-sm ring-1 ring-inset ring-white/10 transition-colors hover:bg-flame-light"
                            >
                              Manage Request
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="rounded-xl border border-rim bg-surface px-3 py-2 text-[11px] font-bold text-muted">View progress</span>
                      )}
                      {/* Non-destructive: hides this project from the dashboard via an
                          append-only governance event. No records are deleted. */}
                      <button
                        type="button"
                        onClick={() => handleHideProject(progressProject.representativeJob?.projectId ?? progressProject.sourceProject?.id ?? progressProject.key)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-rim text-muted transition-all hover:border-flame/30 hover:text-flame"
                        title="Hide from dashboard"
                      >
                        <EyeOff className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {openHoldForJob && (
                    <div className="mt-3 rounded-xl border border-rim/70 border-l-2 border-l-warning-amber bg-raised px-3 py-2 text-xs font-semibold text-ink">
                      Project on hold: {openHoldForJob.deficiencyReason || openHoldForJob.reason || 'Builder action may be required before inspection can proceed.'}
                    </div>
                  )}

                  {ambiguous && (
                    <div className="mt-3 rounded-xl border border-rim/70 border-l-2 border-l-warning-amber bg-raised px-3 py-2 text-xs font-semibold text-ink">
                      Progress review needed. This project has an out-of-sequence inspection record. Vero support needs to review the stage history before the next request can be opened.
                    </div>
                  )}

                  <details className="group mt-3 rounded-xl border border-rim/70 bg-surface/60">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted transition-colors hover:text-ink">
                      <span>View Progress — full stage history</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="grid gap-2 border-t border-rim p-3 md:grid-cols-7">
                      {stageScorecard.map(({ stage, stageJob, report, status }) => {
                        const copy = BUILDER_STAGE_STATUS_COPY[status]
                        return (
                          <div key={stage.number} className={`rounded-xl border px-3 py-2 ${copy.cls}`}>
                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
                              <StageStatusIcon status={status} />
                              {stage.label.split(' — ')[0]}
                            </div>
                            <div className="mt-1 min-h-8 text-[11px] font-semibold leading-snug text-ink">{stage.label.split(' — ')[1]}</div>
                            <div className="mt-2 text-[10px] font-bold uppercase tracking-wide">{copy.label}</div>
                            {status === 'passed' && (
                              <div className="mt-1 text-[10px] font-semibold normal-case tracking-normal text-ink">Vero inspection record complete</div>
                            )}
                            {status === 'passed' && stageJob && (
                              report?.id ? (
                                <a
                                  href={`/api/schedule-cb?reportId=${encodeURIComponent(report.id)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 block text-[10px] font-black text-flame underline decoration-current/40 underline-offset-2"
                                >
                                  View Schedule C-B
                                </a>
                              ) : (
                                <span className="mt-2 block text-[10px] font-semibold text-muted">
                                  Record filed
                                </span>
                              )
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </details>

                  {completedJob && (
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-rim/70 border-l-2 border-l-success-green bg-raised px-3 py-2.5">
                      <div>
                        <div className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-ink">Vero Inspection Record</div>
                        <div className="font-mono text-sm font-black text-ink">
                          {rec?.certRef ?? 'Report filed'}
                        </div>
                      </div>
                      {completionReportsByJobId[completedJob.id]?.id ? (
                        <a
                          href={`/api/schedule-cb?reportId=${encodeURIComponent(completionReportsByJobId[completedJob.id]!.id!)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[11px] font-bold text-flame hover:underline"
                        >
                          Download Schedule C-B <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] font-semibold text-muted">Report filed</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-5 mb-6">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} onRequestInspection={handleRequestInspection} onHide={handleHideProject} />
            ))}
          </div>
        )}
        </section>
          </div>
          {/* ── RIGHT RAIL ── */}
          <aside className="lg:col-span-4">
            <div className="space-y-4 lg:sticky lg:top-[5rem]">

              {/* Inspector Arrival Status */}
              {projects.some(p => p.status === 'in_progress') && (
                <button
                  onClick={() => setIsTrackerOpen(true)}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-rim/70 bg-raised p-4 text-left shadow-sm transition-all hover:border-electric/40"
                >
                  <div className="relative h-11 w-11 shrink-0">
                    <div className="absolute inset-0 animate-ping rounded-full bg-electric/20" style={{ animationDuration: '1.8s' }} />
                    <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-rim/60 bg-panel">
                      <Navigation className="h-5 w-5 text-electric" style={{ transform: 'rotate(45deg)' }} />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="text-sm font-bold text-ink">Inspector Scheduled</span>
                      <div className="flex items-center gap-1 rounded-md border border-rim/70 bg-white/[0.02] px-1.5 py-0.5">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-electric">Estimated</span>
                      </div>
                    </div>
                    <div className="truncate text-xs text-muted">
                      {trackerInspectorName}{trackerInspectorLicense ? ` · ${trackerInspectorLicense}` : ''} · {trackerProjectName}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      <div className="text-xs text-muted">Arrival</div>
                      <div className="text-sm font-bold text-electric">Scheduled</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted transition-colors group-hover:text-electric" />
                  </div>
                </button>
              )}

              <div id="awaiting-validation" className="scroll-mt-20">
                <AwaitingValidationPanel
                  items={validationPanelItems}
                  total={pendingValidationJobs.length}
                  onSelect={id => {
                    const job = pendingValidationJobs.find(j => j.id === id)
                    if (job) openManageRequest(job)
                  }}
                />
              </div>

              <div id="records-ready" className="scroll-mt-20">
                <RecordsReadyPanel records={recordsReadyItems} onOpenVault={() => router.push('/vault')} />
              </div>

        {/* ── Weekly Activity ── */}
        <section className="mb-6">
          <div className="mb-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Weekly Activity</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Building2,  label: 'Active Sites',  value: activeCount,    color: 'text-ink' },
              { icon: TrendingUp, label: 'Passed / Week', value: passedThisWeek, color: 'text-ink' },
              { icon: Clock,      label: 'Active Stages', value: activeStages,   color: 'text-ink' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="rounded-2xl border border-rim bg-panel p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <Icon className="h-3.5 w-3.5" />{label}
                </div>
                <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        </section>

        <DailyFlash projects={dailyFlashProjects} dataMode={dailyFlashMode} reportsByJobId={completionReportsByJobId} linkableProjectIds={storeProjects.map(p => p.id)} />

            </div>
          </aside>
        </div>

      <Modal
        isOpen={Boolean(managedLiveJob)}
        onClose={closeManageRequest}
        title="Manage Request"
        size="lg"
        dark
      >
        {managedLiveJob && (
          <div className="space-y-5">
            <div className={`rounded-2xl border border-rim/70 bg-raised px-4 py-3 border-l-2 ${managedLiveJob.status === 'pending_validation' ? 'border-l-warning-amber' : 'border-l-flame'}`}>
              <div className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${managedLiveJob.status === 'pending_validation' ? 'text-warning-amber' : 'text-flame'}`}>
                {managedLiveJob.status === 'pending_validation' ? 'Awaiting validation — not posted to Live Board' : 'Live request awaiting inspector claim'}
              </div>
              <div className="mt-2 text-lg font-bold text-white">{managedLiveJob.projectName}</div>
              <div className="mt-1 text-sm font-medium text-slate-300">
                {managedLiveJob.address}{managedLiveJob.city ? `, ${managedLiveJob.city}` : ''}
              </div>
              <div className="mt-2 text-sm font-bold text-slate-200">
                {BUILDER_STAGE_DEFINITIONS.find(stage => stage.number === managedLiveJob.stage)?.label ?? `Stage ${managedLiveJob.stage} — ${managedLiveJob.stageName}`}
              </div>
            </div>

            {managedLiveJob.status !== 'pending_validation' && (
            <div>
              <div className="mb-2 text-sm font-black text-white">Available time windows</div>
              <div className="[&_.bg-white]:!bg-raised [&_.bg-gray-50]:!bg-panel [&_.bg-gray-100]:!bg-surface [&_.border-gray-200]:!border-rim [&_.border-gray-300]:!border-rim [&_.text-gray-900]:!text-white [&_.text-gray-600]:!text-slate-300 [&_.text-gray-500]:!text-slate-400 [&_.text-gray-400]:!text-slate-500 [&_.text-gray-300]:!text-slate-500 [&_.bg-orange-50]:!bg-flame/10 [&_.border-orange-100]:!border-flame/30">
                <SchedulingPicker
                  slots={managedSlots}
                  onChange={setManagedSlots}
                  max={3}
                  tier={managedLiveJob.dispatchTier}
                />
              </div>
              <p className="mt-2 text-xs font-medium text-slate-300">
                Updating these windows keeps the same Live Job Board request. It does not create a new project or duplicate stage request.
              </p>
            </div>
            )}

            {manageRequestMessage && (
              <div className="rounded-2xl border border-rim/70 border-l-2 border-l-success-green bg-raised px-4 py-3 text-sm font-semibold text-white">
                {manageRequestMessage}
              </div>
            )}

            {manageRequestError && (
              <div className="rounded-2xl border border-rim/70 border-l-2 border-l-fail-red bg-raised px-4 py-3 text-sm font-semibold text-white">
                {manageRequestError}
              </div>
            )}

            {cancelConfirming ? (
              <div className="rounded-2xl border border-rim/70 border-l-2 border-l-fail-red bg-raised px-4 py-3 text-sm">
                <div className="font-semibold text-fail-red">Confirm Cancellation</div>
                <div className="mt-1 text-xs font-medium text-slate-300">
                  {managedLiveJob.status === 'pending_validation'
                    ? 'This cannot be undone. The blocked request will be removed. You can submit a new request for this stage when ready.'
                    : 'This cannot be undone. The request will be removed from the Live Job Board. You will need to submit a new request from this project when ready.'}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={manageRequestCancelling}
                    onClick={() => void handleCancelManagedRequest()}
                    className="rounded-xl border border-fail-red/40 bg-fail-red/10 px-4 py-2 text-xs font-semibold text-fail-red transition-colors hover:bg-fail-red/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {manageRequestCancelling ? 'Cancelling...' : 'Yes, Cancel Request'}
                  </button>
                  <button
                    type="button"
                    disabled={manageRequestCancelling}
                    onClick={() => setCancelConfirming(false)}
                    className="rounded-xl border border-slate-600 px-4 py-2 text-xs font-bold text-slate-300 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-rim/70 border-l-2 border-l-warning-amber bg-raised px-4 py-3 text-sm">
                <div className="font-semibold text-warning-amber">Cancel Request</div>
                <div className="mt-1 text-xs font-medium text-slate-300">
                  {managedLiveJob.status === 'pending_validation'
                    ? 'This request has not been validated and is not visible on the Live Job Board. Cancelling it removes the block and allows you to resubmit for this stage.'
                    : 'Cancelling removes this unclaimed request from the Live Job Board. The same stage can be requested again from this existing project.'}
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              {!cancelConfirming && (
              <button
                type="button"
                disabled={manageRequestSaving || manageRequestCancelling}
                onClick={() => setCancelConfirming(true)}
                className="rounded-xl border border-fail-red/40 bg-fail-red/5 px-4 py-2.5 text-sm font-semibold text-fail-red transition-colors hover:bg-fail-red/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel Request
              </button>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={manageRequestSaving || manageRequestCancelling}
                  onClick={closeManageRequest}
                  className="rounded-xl border border-slate-600 bg-slate-700/40 px-4 py-2.5 text-sm font-bold text-slate-300 transition-colors hover:bg-slate-700/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Close
                </button>
                {managedLiveJob.status !== 'pending_validation' && (
                <button
                  type="button"
                  disabled={manageRequestSaving || manageRequestCancelling || managedSlots.length === 0}
                  onClick={() => void handleSaveManagedRequest()}
                  className="rounded-xl bg-flame px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-flame-light disabled:cursor-not-allowed disabled:bg-surface"
                >
                  {manageRequestSaving ? 'Saving...' : 'Save Time Windows'}
                </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

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
          avatar:      trackerAvatar,
          disciplines: activeAssignment?.inspectorDisciplines ?? [],
          regions:     activeAssignment?.inspectorRegions ?? [],
        }}
        project={{
          name:    trackerProjectName,
          address: trackerProjectAddress,
          stage:   trackerStageName,
        }}
        appointment={activeAssignment ? {
          status:         activeAssignment.status,
          objectionState: activeAssignment.objectionState,
          discipline:     assignedDbJob?.requiredDiscipline ?? assignedJob?.requiredDiscipline,
          dispatchTier:   assignedDbJob?.dispatchTier       ?? assignedJob?.dispatchTier,
          requestedAt:    assignedDbJob?.requestedAt        ?? assignedJob?.requestedAt,
          permitNumber:   assignedDbJob?.permitNumber       ?? assignedJob?.permitNumber,
          notes:          assignedDbJob?.notes,
          availableSlots: assignedDbJob?.availableSlots     ?? assignedJob?.availableSlots,
          claimedSlot:    activeAssignment.claimedSlot,
          claimedAt:      activeAssignment.claimedAt,
          confirmedAt:    activeAssignment.confirmedAt,
        } : undefined}
      />
    </RoleDashboardShell>
  )
}
