'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, ChevronRight, PlayCircle, Clock, Activity, Filter, Briefcase, FolderLock, AlertTriangle, FileText, Wallet, LayoutDashboard, ListChecks, User } from 'lucide-react'
import { RoleDashboardShell } from '@/components/shared/RoleDashboardShell'
import type { DashboardNavGroup } from '@/components/shared/DashboardSidebar'
import { JobCard } from '@/components/inspector/JobCard'
import { HardPingProvider } from '@/components/inspector/HardPingProvider'
import { ReliabilityTierDashboard } from '@/components/inspector/ReliabilityTierDashboard'
import { checkInspectorEligibility, resolveClaimEligibleDisciplines } from '@/lib/eligibility'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { getInspectorOnboardingStatusAsync } from '@/lib/persistence/inspectorOnboarding'
import { selectInspectorEligibility } from '@/lib/supabase/compliance'
import {
  listAllJobOpportunities,
  listEligibleJobsForInspector,
  listOpenJobOpportunities,
  type JobOpportunityRow,
} from '@/lib/supabase/jobs'
import { useTheme } from '@/lib/theme'
import { isInspectorTestModeEnabled } from '@/lib/inspectorTestMode'
import type { ClaimCommitment, JobTimeSlot, Region, InspectorDiscipline, InspectorEligibilityProfile, HoldRecord, InspectionJob } from '@/lib/types'
import { listHoldsForJob } from '@/lib/supabase/holds'
import { isHoldOpenStatus } from '@/lib/holds/workflow'
import { getActiveReliabilityPolicyConfig, getInspectorReliabilityDashboardData, type InspectorReliabilityDashboardData } from '@/lib/supabase/reliability'
import { buildInspectorReliabilityDashboardModel } from '@/lib/reliabilityDashboard'
import { resolveInspectionStageNumber } from '@/lib/inspections/builderStageMapping'
import { evaluateReliabilityRollout } from '@/lib/reliabilityRollout'

const supabase = createClient()

const REGIONS: { value: Region | 'all'; label: string }[] = [
  { value: 'all',       label: 'All Regions' },
  { value: 'vancouver', label: 'Vancouver' },
  { value: 'burnaby',   label: 'Burnaby' },
  { value: 'surrey',    label: 'Surrey' },
  { value: 'coquitlam', label: 'Coquitlam' },
  { value: 'richmond',  label: 'Richmond' },
]

const DISCS: { value: InspectorDiscipline | 'all'; label: string }[] = [
  { value: 'all',             label: 'All Disciplines' },
  { value: 'structural',      label: 'Structural' },
  { value: 'geotech',         label: 'Geotech' },
  { value: 'mechanical',      label: 'Mechanical' },
  { value: 'electrical',      label: 'Electrical' },
  { value: 'plumbing',        label: 'Plumbing' },
  { value: 'architectural',   label: 'Architectural' },
  { value: 'fire_protection', label: 'Fire Protection' },
]

// Discipline is communicated by the label text; the pill stays neutral and outlined
// rather than introducing a decorative per-discipline colour palette.
const DISC_BADGE_NEUTRAL = 'border-rim/70 bg-white/[0.02] text-muted'
const DISC_BADGE: Record<string, string> = {
  structural:     DISC_BADGE_NEUTRAL,
  geotech:        DISC_BADGE_NEUTRAL,
  electrical:     DISC_BADGE_NEUTRAL,
  mechanical:     DISC_BADGE_NEUTRAL,
  architectural:  DISC_BADGE_NEUTRAL,
  plumbing:       DISC_BADGE_NEUTRAL,
  fire_protection:DISC_BADGE_NEUTRAL,
}

const INSPECTION_STAGE_LABELS: Record<number, string> = {
  1:  'Project Setup and Jurisdiction Check',
  2:  'Planning and Site Approvals',
  3:  'Building Permit Submission Package',
  4:  'Site Prep and Pre-Excavation',
  5:  'Footings, Foundation, and Slab',
  6:  'Structural Frame',
  7:  'Building Envelope',
  8:  'Fire and Life Safety',
  9:  'Plumbing Permit and Scope',
  10: 'Electrical Permit and Scope',
  11: 'Gas Permit and Mechanical / HVAC Scope',
  12: 'Insulation and Energy Compliance',
  13: 'Interior Completion',
  14: 'Exterior Works and Site Finalization',
  15: 'Inspections, Final Approval, and Occupancy',
}

function resolveInspectionStagePreview(
  builderStage: number | undefined,
  discipline: string | undefined,
): { code: string; name: string } | null {
  const stageNum = resolveInspectionStageNumber(builderStage, discipline)
  if (!stageNum) return null
  const name = INSPECTION_STAGE_LABELS[stageNum]
  if (!name) return null
  return { code: `S${String(stageNum).padStart(2, '0')}`, name }
}

interface ActiveWorklistItem {
  id: string
  jobId: string
  projectId?: string
  builderId?: string
  projectName: string
  address: string
  city?: string
  status: string
  statusLabel: string
  claimedSlot?: JobTimeSlot
  assignedAt?: string
  openHold?: HoldRecord
  stage?: number
  stageName?: string
  discipline?: string
  jobStatus?: string
  reportStatus?: string
  assignmentIdSuffix: string
  hiddenFromWorklist?: boolean
}

const TERMINAL_ASSIGNMENT_STATUSES = new Set(['cancelled', 'invalidated', 'completed'])
const TERMINAL_JOB_STATUSES = new Set(['completed', 'cancelled', 'stopped'])
const CURRENT_PROJECT_STAGE_STATUSES = new Set(['live', 'provisionally_assigned', 'confirmed', 'in_progress', 'on_hold', 'completed'])
const WORKLIST_HIDE_ACTION = 'assignment.worklist_hidden'
const WORKLIST_RESTORE_ACTION = 'assignment.worklist_restored'
const WORKLIST_DISPOSITION_ACTIONS = [WORKLIST_HIDE_ACTION, WORKLIST_RESTORE_ACTION] as const
const WORKLIST_HIDE_CONFIRMATION_COPY = 'Hide this assignment from your Active Worklist? This does not cancel the assignment, release the job, notify the builder, or delete any draft report or evidence. It only removes this item from your active worklist view.'

// Builder-side "Hide from dashboard" governance events. A job/project hidden by
// its builder is also withdrawn from the Inspector Live Board. Read-only: the
// inspector never writes these. Latest event per project/job id decides state.
const PROJECT_DASHBOARD_HIDE_ACTION = 'project.dashboard_hidden'
const PROJECT_DASHBOARD_RESTORE_ACTION = 'project.dashboard_restored'
const PROJECT_DASHBOARD_DISPOSITION_ACTIONS = [PROJECT_DASHBOARD_HIDE_ACTION, PROJECT_DASHBOARD_RESTORE_ACTION] as const

type ProjectStageIdentity = {
  id: string
  projectId?: string
  builderId?: string
  projectName: string
  address: string
  city?: string
}

function getBoardProjectKey(input: ProjectStageIdentity): string {
  const projectId = input.projectId?.trim()
  if (projectId) return `project:${projectId}`

  const builderId = input.builderId?.trim() || 'unknown-builder'
  return [
    builderId,
    input.projectName,
    input.address,
    input.city,
  ]
    .map(value => (value ?? '').trim().toLowerCase())
    .filter(Boolean)
    .join('|') || `job:${input.id}`
}

function buildLatestProjectStageContext(lifecycleRows: JobOpportunityRow[]): Map<string, number> {
  const latestProjectStage = new Map<string, number>()

  for (const row of lifecycleRows) {
    if (!CURRENT_PROJECT_STAGE_STATUSES.has(row.status)) continue
    const key = getBoardProjectKey({
      id: row.id,
      projectId: row.projectId ?? '',
      builderId: row.builderId,
      projectName: row.projectName,
      address: row.address,
      city: row.city,
    })
    const currentLatest = latestProjectStage.get(key) ?? 0
    if (row.stage > currentLatest) latestProjectStage.set(key, row.stage)
  }

  return latestProjectStage
}

function jobOpportunityToInspectionJob(row: JobOpportunityRow): InspectionJob {
  return {
    id: row.id,
    projectId: row.projectId ?? '',
    projectName: row.projectName,
    address: row.address,
    city: row.city,
    permitNumber: row.permitNumber,
    projectType: row.projectType ?? 'Residential',
    stage: row.stage,
    stageName: row.stageName,
    dispatchTier: row.dispatchTier,
    offeredRate: row.offeredRate,
    estimatedDuration: row.estimatedDurationMinutes,
    distance: 0,
    region: row.region,
    requiredDiscipline: row.requiredDiscipline,
    status: row.status,
    requestedAt: row.requestedAt,
    scheduledFor: row.scheduledFor,
    escrowAmount: row.escrowEstimateTotal ?? row.offeredRate,
    pricingMode: row.pricingMode,
    specialistRole: row.specialistRole,
    baseHourlyRate: row.baseHourlyRate,
    effectiveHourlyRate: row.effectiveHourlyRate,
    billableHours: row.billableHours,
    holdHours: row.holdHours,
    holdCost: row.holdCost,
    urgencyMultiplier: row.urgencyMultiplier,
    platformCommissionAmount: row.platformCommissionAmount,
    requiresProfessionalSeal: row.requiresProfessionalSeal,
    requiresCP: row.requiresCP,
    inspectionType: row.inspectionType,
    credentialClass: row.credentialClass,
    availableSlots: row.availableSlots ?? [],
    builderId: row.builderId,
    builderName: row.builderName,
    builderRating: 0,
    builderCompletedJobs: 0,
    builderNotes: row.notes,
    isReinspection: false,
  }
}

function filterCurrentInspectorBoardJobs(
  openJobs: InspectionJob[],
  lifecycleRows: JobOpportunityRow[],
): InspectionJob[] {
  const latestProjectStage = buildLatestProjectStageContext(lifecycleRows)

  for (const job of openJobs) {
    const key = getBoardProjectKey(job)
    const currentLatest = latestProjectStage.get(key) ?? 0
    if (job.stage > currentLatest) latestProjectStage.set(key, job.stage)
  }

  return openJobs.filter(job => {
    const latestStage = latestProjectStage.get(getBoardProjectKey(job)) ?? job.stage
    return job.stage >= latestStage
  })
}

function filterCurrentActiveWorklistItems(
  worklist: ActiveWorklistItem[],
  lifecycleRows: JobOpportunityRow[],
): ActiveWorklistItem[] {
  const latestProjectStage = buildLatestProjectStageContext(lifecycleRows)

  return worklist.filter(item => {
    if (typeof item.stage !== 'number') return true
    const latestStage = latestProjectStage.get(getBoardProjectKey(item)) ?? item.stage
    return item.stage >= latestStage
  })
}

function getHiddenWorklistAssignmentIds(rows: Array<Record<string, unknown>>): Set<string> {
  const latestDispositionByAssignment = new Map<string, string>()

  for (const row of rows) {
    const assignmentId = typeof row.entity_id === 'string' ? row.entity_id : ''
    const action = typeof row.action === 'string' ? row.action : ''
    if (!assignmentId || !WORKLIST_DISPOSITION_ACTIONS.includes(action as typeof WORKLIST_DISPOSITION_ACTIONS[number])) continue
    latestDispositionByAssignment.set(assignmentId, action)
  }

  const hiddenAssignmentIds = new Set<string>()
  for (const [assignmentId, action] of latestDispositionByAssignment) {
    if (action === WORKLIST_HIDE_ACTION) hiddenAssignmentIds.add(assignmentId)
  }
  return hiddenAssignmentIds
}

// Latest-event-wins over builder dashboard hide/restore events. Rows must be
// passed in ascending created_at order. Returns the set of currently-hidden
// project/job ids (entity_id values whose latest disposition is "hidden").
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
    if (action === PROJECT_DASHBOARD_HIDE_ACTION) hidden.add(entityId)
  }
  return hidden
}

function formatStoredStatus(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function parseWorklistSlot(value: unknown): JobTimeSlot | undefined {
  if (!value || typeof value !== 'object') return undefined
  const slot = value as Record<string, unknown>
  if (slot.flexible === true) {
    return { date: '', startTime: '', endTime: '', flexible: true }
  }
  if (typeof slot.date !== 'string' || typeof slot.startTime !== 'string' || typeof slot.endTime !== 'string') {
    return undefined
  }
  return {
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    flexible: slot.flexible === true,
  }
}

function getWorklistStatusLabel(input: {
  assignmentStatus: string
  jobStatus?: string
  reportStatus?: string
  awaitingReconfirmation?: boolean
}): string {
  if (input.awaitingReconfirmation) return 'Availability Confirmation Needed'
  if (input.jobStatus === 'on_hold') return 'Hold'
  if (input.reportStatus === 'draft' || input.jobStatus === 'in_progress') return 'Draft Record In Progress'
  if (input.assignmentStatus === 'provisional') return 'Provisional'
  if (input.assignmentStatus === 'confirmed') return 'Confirmed'
  if (input.assignmentStatus === 'active') return 'Active'
  return formatStoredStatus(input.assignmentStatus)
}

function getHoldResponseLabel(hold?: HoldRecord): string {
  if (!hold) return 'No hold response recorded'
  if (hold.status === 'hold_active') return 'Builder accepted correction window'
  if (hold.status === 'hold_declined' || hold.builderDeclinedAt) return 'Builder declined — rebook required'
  if (hold.builderAcceptedAt) return 'Builder accepted correction window'
  if (hold.status === 'hold_pending_builder_ack' || hold.status === 'hold_offered') return 'Builder action pending'
  return formatStoredStatus(hold.status)
}

function isActiveWorklistStatus(assignmentStatus: string, jobStatus?: string): boolean {
  if (TERMINAL_ASSIGNMENT_STATUSES.has(assignmentStatus)) return false
  if (jobStatus && TERMINAL_JOB_STATUSES.has(jobStatus)) return false
  return true
}

export default function InspectorDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const store = useStore()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const inspectorTestOverride = isInspectorTestModeEnabled(user)

  const [region, setRegion]         = useState<Region | 'all'>('all')
  const [discipline, setDiscipline] = useState<InspectorDiscipline | 'all'>('all')
  const [boardView, setBoardView] = useState<'all' | 'eligible'>('all')
  const [search, setSearch]         = useState('')
  const [onboardingStatus, setOnboardingStatus] = useState<string | null>(null)
  const [eligibilityProfile, setEligibilityProfile] = useState<InspectorEligibilityProfile | null>(null)
  const [eligibilityLoaded, setEligibilityLoaded] = useState(false)
  const [authorityEligibleJobIds, setAuthorityEligibleJobIds] = useState<Set<string> | null>(null)
  const [authorityEligibilityLoaded, setAuthorityEligibilityLoaded] = useState(false)
  const [acceptedHoldsForInspector, setAcceptedHoldsForInspector] = useState<HoldRecord[]>([])
  const [reliabilityData, setReliabilityData] = useState<InspectorReliabilityDashboardData | null>(null)
  const [reliabilityPolicyConfig, setReliabilityPolicyConfig] = useState<Record<string, unknown> | null>(null)
  const [dbActiveWorklist, setDbActiveWorklist] = useState<ActiveWorklistItem[] | null>(null)
  const [dbHiddenWorklist, setDbHiddenWorklist] = useState<ActiveWorklistItem[]>([])
  const [showHiddenWorklist, setShowHiddenWorklist] = useState(false)
  const [worklistRefreshToken, setWorklistRefreshToken] = useState(0)
  const [worklistActionId, setWorklistActionId] = useState<string | null>(null)
  const [worklistDispositionMessage, setWorklistDispositionMessage] = useState<string | null>(null)
  const [confirmingAvailabilityIds, setConfirmingAvailabilityIds] = useState<Set<string>>(new Set())
  const [confirmedAvailabilityResults, setConfirmedAvailabilityResults] = useState<Map<string, { emailSent: boolean }>>(new Map())
  const [confirmAvailabilityErrors, setConfirmAvailabilityErrors] = useState<Map<string, string>>(new Map())
  const [dbOpenJobs, setDbOpenJobs] = useState<InspectionJob[] | null>(null)
  const [dbBoardLifecycleJobs, setDbBoardLifecycleJobs] = useState<JobOpportunityRow[]>([])
  const [hiddenProjectIds, setHiddenProjectIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) { router.replace('/sign-in?role=inspector'); return }
    if (user.role !== 'inspector') { router.replace('/'); return }
    let active = true
    getInspectorOnboardingStatusAsync(user.id, user.supabaseId).then(status => {
      if (active) setOnboardingStatus(status)
    })

    if (user.supabaseId) {
      Promise.all([
        selectInspectorEligibility(user.supabaseId),
        listEligibleJobsForInspector(user.supabaseId),
      ])
        .then(([profile, authorityEligibleJobs]) => {
          if (!active) return
          setEligibilityProfile(profile)
          setAuthorityEligibleJobIds(new Set(authorityEligibleJobs.map(job => job.id)))
          setEligibilityLoaded(true)
          setAuthorityEligibilityLoaded(true)
        })
        .catch(() => {
          if (!active) return
          setEligibilityProfile(null)
          setAuthorityEligibleJobIds(new Set())
          setEligibilityLoaded(true)
          setAuthorityEligibilityLoaded(true)
        })
    } else {
      queueMicrotask(() => {
        if (!active) return
        setAuthorityEligibleJobIds(null)
        setEligibilityLoaded(true)
        setAuthorityEligibilityLoaded(true)
      })
    }

    return () => {
      active = false
    }
  }, [user, router])

  useEffect(() => {
    if (!user?.supabaseId) {
      queueMicrotask(() => {
        setReliabilityData(null)
        setReliabilityPolicyConfig(null)
      })
      return
    }

    let active = true
    const credentialStatus = eligibilityProfile?.credentialExpiresAt
      && new Date(eligibilityProfile.credentialExpiresAt).getTime() < Date.now()
      ? 'expired'
      : eligibilityProfile?.status ?? onboardingStatus

    Promise.all([
      getInspectorReliabilityDashboardData(user.supabaseId, credentialStatus),
      getActiveReliabilityPolicyConfig(),
    ])
      .then(([data, policy]) => {
        if (!active) return
        setReliabilityData(data)
        setReliabilityPolicyConfig(policy?.config ?? null)
      })
      .catch(() => {
        if (!active) return
        setReliabilityData(null)
        setReliabilityPolicyConfig(null)
      })

    return () => {
      active = false
    }
  }, [eligibilityProfile?.credentialExpiresAt, eligibilityProfile?.status, onboardingStatus, user?.supabaseId])

  const myAssignments = store.assignments.filter(a =>
    a.inspectorId === user?.id || a.inspectorId === user?.supabaseId
  )

  const storedActiveWorklist = useMemo<ActiveWorklistItem[]>(() => {
    return myAssignments
      .map(assignment => {
        const job = store.jobs.find(j => j.id === assignment.jobId)
        return {
          id: assignment.id,
          jobId: assignment.jobId,
          projectId: job?.projectId,
          builderId: assignment.builderId || job?.builderId,
          projectName: assignment.projectName || job?.projectName || 'Assigned Project',
          address: job?.address ?? '',
          city: job?.city,
          status: assignment.status,
          statusLabel: getWorklistStatusLabel({
            assignmentStatus: assignment.status,
            jobStatus: job?.status,
          }),
          claimedSlot: assignment.claimedSlot,
          assignedAt: assignment.claimedAt,
          jobStatus: job?.status,
          stage: job?.stage,
          stageName: job?.stageName,
          discipline: job?.requiredDiscipline,
        }
      })
      .filter(item => isActiveWorklistStatus(item.status, item.jobStatus))
      .map(item => ({
        id: item.id,
        jobId: item.jobId,
        projectId: item.projectId,
        builderId: item.builderId,
        projectName: item.projectName,
        address: item.address,
        city: item.city,
        status: item.status,
        statusLabel: item.statusLabel,
        claimedSlot: item.claimedSlot,
        assignedAt: item.assignedAt,
        stage: item.stage,
        stageName: item.stageName,
        discipline: item.discipline,
        jobStatus: item.jobStatus,
        reportStatus: undefined,
        assignmentIdSuffix: item.id.slice(-6).toUpperCase(),
      }))
  }, [myAssignments, store.jobs])

  // A job is hidden from the board if its job id or its project id has a latest
  // builder project.dashboard_hidden event. Used across worklist, open requests,
  // counts, and potential earnings so a hidden job disappears everywhere.
  const isJobIdHidden = (jobId?: string, projectId?: string) =>
    (typeof jobId === 'string' && jobId !== '' && hiddenProjectIds.has(jobId)) ||
    (typeof projectId === 'string' && projectId !== '' && hiddenProjectIds.has(projectId))

  const activeWorklist = (user?.supabaseId ? (dbActiveWorklist ?? []) : storedActiveWorklist)
    .filter(item => !isJobIdHidden(item.jobId, item.projectId))
  const hiddenActiveWorklist = user?.supabaseId ? dbHiddenWorklist : []
  const renderedActiveWorklist = showHiddenWorklist
    ? [...activeWorklist, ...hiddenActiveWorklist]
    : activeWorklist

  useEffect(() => {
    if (!user?.supabaseId) {
      setDbActiveWorklist(null)
      setDbHiddenWorklist([])
      return
    }

    let active = true

    async function loadActiveWorklist() {
      const inspectorId = user?.supabaseId
      if (!inspectorId) return

      const { data: assignmentRows, error: assignmentError } = await supabase
        .from('job_assignments')
        .select('id, job_id, inspector_id, status, assigned_at, claimed_slot')
        .eq('inspector_id', inspectorId)
        .order('assigned_at', { ascending: false })

      if (!active) return
      if (assignmentError || !assignmentRows) {
        setDbActiveWorklist([])
        setDbHiddenWorklist([])
        return
      }

      const assignmentRecords = (assignmentRows as Array<Record<string, unknown>>)
        .map(row => ({
          id: String(row.id ?? ''),
          jobId: String(row.job_id ?? ''),
          status: String(row.status ?? 'provisional'),
          assignedAt: typeof row.assigned_at === 'string' ? row.assigned_at : undefined,
          claimedSlot: parseWorklistSlot(row.claimed_slot),
        }))
        .filter(row => row.id && row.jobId && !TERMINAL_ASSIGNMENT_STATUSES.has(row.status))

      if (assignmentRecords.length === 0) {
        setDbActiveWorklist([])
        setDbHiddenWorklist([])
        return
      }

      const assignmentIds = assignmentRecords.map(row => row.id)
      const jobIds = [...new Set(assignmentRecords.map(row => row.jobId))]

      const [
        { data: jobRows },
        { data: reportRows },
        { data: confirmationRows },
        { data: worklistDispositionRows, error: worklistDispositionError },
        lifecycleRows,
        holdResults,
      ] = await Promise.all([
        supabase
          .from('job_opportunities')
          .select('id, project_id, builder_id, project_name, address, city, status, stage, stage_name, required_discipline')
          .in('id', jobIds),
        supabase
          .from('inspector_completion_reports')
          .select('assignment_id, status')
          .in('assignment_id', assignmentIds),
        supabase
          .from('job_attendance_confirmations')
          .select('assignment_id, checkpoint, status, required_at, reminder_sent_at')
          .in('assignment_id', assignmentIds)
          .in('checkpoint', ['t_24h', 't_4h', 't_90m'])
          .eq('status', 'pending'),
        supabase
          .from('governance_audit_events')
          .select('entity_id, action, created_at')
          .eq('entity_type', 'assignment')
          .eq('actor_id', inspectorId)
          .in('entity_id', assignmentIds)
          .in('action', WORKLIST_DISPOSITION_ACTIONS)
          .order('created_at', { ascending: true }),
        listAllJobOpportunities(),
        Promise.all(jobIds.map(async jobId => {
          try {
            const holds = await listHoldsForJob(jobId)
            return [jobId, holds.find(hold => isHoldOpenStatus(hold.status)) ?? null] as const
          } catch (error) {
            console.warn('Inspector active worklist: hold lookup failed', { jobId, error })
            return [jobId, null] as const
          }
        })),
      ])

      if (!active) return
      if (worklistDispositionError) {
        console.warn('Inspector active worklist: disposition lookup failed', worklistDispositionError)
      }
      const hiddenAssignmentIds = worklistDispositionError
        ? new Set<string>()
        : getHiddenWorklistAssignmentIds((worklistDispositionRows ?? []) as Array<Record<string, unknown>>)

      const jobsById = new Map(
        ((jobRows ?? []) as Array<Record<string, unknown>>).map(row => [
          String(row.id ?? ''),
          {
            projectId: typeof row.project_id === 'string' ? row.project_id : undefined,
            builderId: typeof row.builder_id === 'string' ? row.builder_id : undefined,
            projectName: typeof row.project_name === 'string' ? row.project_name : 'Assigned Project',
            address: typeof row.address === 'string' ? row.address : '',
            city: typeof row.city === 'string' ? row.city : undefined,
            status: typeof row.status === 'string' ? row.status : undefined,
            stage: typeof row.stage === 'number' ? row.stage : undefined,
            stageName: typeof row.stage_name === 'string' ? row.stage_name : undefined,
            discipline: typeof row.required_discipline === 'string' ? row.required_discipline : undefined,
          },
        ])
      )
      const reportsByAssignmentId = new Map(
        ((reportRows ?? []) as Array<Record<string, unknown>>).map(row => [
          String(row.assignment_id ?? ''),
          typeof row.status === 'string' ? row.status : undefined,
        ])
      )
      const awaitingReconfirmationByAssignmentId = new Set<string>()
      const openHoldsByJobId = new Map(holdResults.filter((entry): entry is readonly [string, HoldRecord] => entry[1] !== null))
      const now = Date.now()
      for (const row of (confirmationRows ?? []) as Array<Record<string, unknown>>) {
        const assignmentId = typeof row.assignment_id === 'string' ? row.assignment_id : null
        if (!assignmentId) continue
        const requiredAt = typeof row.required_at === 'string' ? Date.parse(row.required_at) : NaN
        const reminderSent = typeof row.reminder_sent_at === 'string'
        if (reminderSent || (Number.isFinite(requiredAt) && requiredAt <= now)) {
          awaitingReconfirmationByAssignmentId.add(assignmentId)
        }
      }

      const worklist = assignmentRecords
        .map(assignment => {
          const job = jobsById.get(assignment.jobId)
          const reportStatus = reportsByAssignmentId.get(assignment.id)
          const openHold = openHoldsByJobId.get(assignment.jobId)
          return {
            id: assignment.id,
            jobId: assignment.jobId,
            projectId: job?.projectId,
            builderId: job?.builderId,
            projectName: job?.projectName ?? 'Assigned Project',
            address: job?.address ?? '',
            city: job?.city,
            status: assignment.status,
            statusLabel: getWorklistStatusLabel({
              assignmentStatus: assignment.status,
              jobStatus: job?.status,
              reportStatus,
              awaitingReconfirmation: awaitingReconfirmationByAssignmentId.has(assignment.id),
            }),
            claimedSlot: assignment.claimedSlot,
            assignedAt: assignment.assignedAt,
            jobStatus: job?.status,
            stage: job?.stage,
            stageName: job?.stageName,
            discipline: job?.discipline,
            reportStatus,
            openHold,
          }
        })
        .filter(item => isActiveWorklistStatus(item.status, item.jobStatus))
        .map(item => ({
          id: item.id,
          jobId: item.jobId,
          projectId: item.projectId,
          builderId: item.builderId,
          projectName: item.projectName,
          address: item.address,
          city: item.city,
          status: item.status,
          statusLabel: item.statusLabel,
          claimedSlot: item.claimedSlot,
          assignedAt: item.assignedAt,
          openHold: item.openHold,
          stage: item.stage,
          stageName: item.stageName,
          discipline: item.discipline,
          jobStatus: item.jobStatus,
          reportStatus: item.reportStatus,
          assignmentIdSuffix: item.id.slice(-6).toUpperCase(),
        }))
      const currentWorklist = filterCurrentActiveWorklistItems(worklist, lifecycleRows)
      const visibleWorklist = currentWorklist.filter(item => !hiddenAssignmentIds.has(item.id))
      const hiddenWorklist = currentWorklist
        .filter(item => hiddenAssignmentIds.has(item.id))
        .map(item => ({ ...item, hiddenFromWorklist: true }))

      setDbActiveWorklist(visibleWorklist)
      setDbHiddenWorklist(hiddenWorklist)
    }

    void loadActiveWorklist()

    const refreshActiveWorklistOnFocus = () => {
      void loadActiveWorklist()
    }
    const refreshActiveWorklistOnVisibility = () => {
      if (document.visibilityState === 'visible') void loadActiveWorklist()
    }

    window.addEventListener('focus', refreshActiveWorklistOnFocus)
    document.addEventListener('visibilitychange', refreshActiveWorklistOnVisibility)

    return () => {
      active = false
      window.removeEventListener('focus', refreshActiveWorklistOnFocus)
      document.removeEventListener('visibilitychange', refreshActiveWorklistOnVisibility)
    }
  }, [user?.supabaseId, worklistRefreshToken])

  async function handleWorklistDisposition(assignment: ActiveWorklistItem, action: typeof WORKLIST_DISPOSITION_ACTIONS[number]) {
    if (!user?.supabaseId) return

    const hiding = action === WORKLIST_HIDE_ACTION
    if (hiding && typeof window !== 'undefined' && !window.confirm(WORKLIST_HIDE_CONFIRMATION_COPY)) {
      return
    }

    const actionId = `${action}:${assignment.id}`
    setWorklistActionId(actionId)
    setWorklistDispositionMessage(null)

    const { error } = await supabase.from('governance_audit_events').insert({
      entity_type: 'assignment',
      entity_id: assignment.id,
      action,
      actor_id: user.supabaseId,
      actor_role: 'inspector',
      rule_ids: ['R-021', 'R-022'],
      blocker_type: 'technical',
      reason: hiding
        ? 'Inspector hid assignment from Active Worklist view.'
        : 'Inspector restored assignment to Active Worklist view.',
      before_state: {
        worklistVisible: hiding,
      },
      after_state: {
        worklistVisible: !hiding,
      },
      metadata: {
        jobId: assignment.jobId,
        projectId: assignment.projectId ?? null,
        builderId: assignment.builderId ?? null,
        reportStatus: assignment.reportStatus ?? null,
        jobStatus: assignment.jobStatus ?? null,
        source: 'inspector_active_worklist',
        lifecycleMutation: false,
        builderNotified: false,
        reportsOrEvidenceDeleted: false,
      },
    })

    if (error) {
      console.error('Inspector active worklist disposition failed', { assignmentId: assignment.id, action, error })
      setWorklistDispositionMessage('Worklist update failed. The assignment was not changed.')
      setWorklistActionId(null)
      return
    }

    if (hiding) {
      const hiddenItem = { ...assignment, hiddenFromWorklist: true }
      setDbActiveWorklist(prev => prev ? prev.filter(item => item.id !== assignment.id) : prev)
      setDbHiddenWorklist(prev => [hiddenItem, ...prev.filter(item => item.id !== assignment.id)])
      setWorklistDispositionMessage('Assignment hidden from your Active Worklist view.')
    } else {
      const restoredItem = { ...assignment, hiddenFromWorklist: false }
      setDbHiddenWorklist(prev => prev.filter(item => item.id !== assignment.id))
      setDbActiveWorklist(prev => prev && !prev.some(item => item.id === assignment.id)
        ? [restoredItem, ...prev]
        : prev)
      setWorklistDispositionMessage('Assignment restored to your Active Worklist.')
    }

    setWorklistActionId(null)
    setWorklistRefreshToken(value => value + 1)
  }

  async function handleConfirmAvailability(assignmentId: string, jobId: string) {
    setConfirmingAvailabilityIds(prev => new Set(prev).add(assignmentId))
    setConfirmAvailabilityErrors(prev => { const m = new Map(prev); m.delete(assignmentId); return m })
    try {
      const res = await fetch('/api/inspections/confirm-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, jobId }),
      })
      const data = await res.json() as { ok: boolean; emailSent?: boolean; error?: string }
      if (data.ok) {
        setConfirmedAvailabilityResults(prev => new Map(prev).set(assignmentId, { emailSent: data.emailSent ?? false }))
      } else {
        setConfirmAvailabilityErrors(prev => new Map(prev).set(assignmentId, data.error ?? 'Could not confirm availability. Please try again.'))
      }
    } catch {
      setConfirmAvailabilityErrors(prev => new Map(prev).set(assignmentId, 'Connection error. Please try again.'))
    } finally {
      setConfirmingAvailabilityIds(prev => { const s = new Set(prev); s.delete(assignmentId); return s })
    }
  }

  useEffect(() => {
    if (!user?.supabaseId) {
      setDbOpenJobs(null)
      setDbBoardLifecycleJobs([])
      return
    }

    let active = true

    async function loadBoardJobs() {
      const [openRows, lifecycleRows] = await Promise.all([
        listOpenJobOpportunities(),
        listAllJobOpportunities(),
      ])

      if (!active) return
      setDbOpenJobs(openRows.map(jobOpportunityToInspectionJob))
      setDbBoardLifecycleJobs(lifecycleRows)
    }

    void loadBoardJobs()

    const refreshOnFocus = () => {
      void loadBoardJobs()
    }
    const refreshOnVisibility = () => {
      if (document.visibilityState === 'visible') void loadBoardJobs()
    }

    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnVisibility)

    return () => {
      active = false
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnVisibility)
    }
  }, [user?.supabaseId])

  // Load builder "Hide from dashboard" dispositions. A job/project whose latest
  // event is project.dashboard_hidden is suppressed from the Live Board. Read
  // path only — uses the existing governance_audit_events SELECT policy (any
  // authenticated user may read), latest-event-per-id wins.
  useEffect(() => {
    let active = true
    async function loadHiddenProjects() {
      const { data, error } = await supabase
        .from('governance_audit_events')
        .select('entity_id, action, created_at')
        .eq('entity_type', 'project')
        .in('action', PROJECT_DASHBOARD_DISPOSITION_ACTIONS)
        .order('created_at', { ascending: true })
      if (!active) return
      if (error) {
        console.warn('Inspector board: hidden-project lookup failed', error)
        return
      }
      setHiddenProjectIds(getHiddenProjectIds((data ?? []) as Array<Record<string, unknown>>))
    }
    void loadHiddenProjects()
    return () => { active = false }
  }, [])

  // Poll for holds that builders have accepted — these need a re-verification action.
  useEffect(() => {
    const jobIds = store.assignments
      .filter(a => a.inspectorId === user?.id || a.inspectorId === user?.supabaseId)
      .map(a => a.jobId)
    if (jobIds.length === 0) {
      queueMicrotask(() => setAcceptedHoldsForInspector([]))
      return
    }
    let active = true
    Promise.all(jobIds.map(id => listHoldsForJob(id)))
      .then(results => {
        if (!active) return
        setAcceptedHoldsForInspector(results.flat().filter(h => h.status === 'hold_active'))
      })
      .catch(() => {})
    return () => { active = false }
  }, [store.assignments, user?.id, user?.supabaseId])

  const storeOpenJobs = store.getOpenJobs()
  const boardSourceJobs = user?.supabaseId && dbOpenJobs !== null ? dbOpenJobs : storeOpenJobs
  const openJobs = useMemo(
    () => filterCurrentInspectorBoardJobs(boardSourceJobs, dbBoardLifecycleJobs),
    [boardSourceJobs, dbBoardLifecycleJobs]
  )

  const filteredJobs = useMemo(() => {
    return openJobs.filter(job => {
      const matchesRegion = region === 'all' || job.region === region
      const matchesDisc   = discipline === 'all' || job.requiredDiscipline === discipline
      const matchesSearch = !search ||
        job.projectName.toLowerCase().includes(search.toLowerCase()) ||
        job.address.toLowerCase().includes(search.toLowerCase())

      const isAlreadyClaimedByMe = myAssignments.some(a => a.jobId === job.id)
      const isHidden = isJobIdHidden(job.id, job.projectId)
      return matchesRegion && matchesDisc && matchesSearch && !isAlreadyClaimedByMe && !isHidden
    })
  }, [openJobs, region, discipline, search, myAssignments, hiddenProjectIds])

  const inspectorEligibility = useMemo(() => {
    if (user?.supabaseId) {
      const approvedLanes = eligibilityProfile?.approvedRoleLanes ?? []
      const baseDisciplines = eligibilityProfile?.disciplines ?? []
      const derived = resolveClaimEligibleDisciplines(baseDisciplines, approvedLanes)
      if (approvedLanes.includes('electrical_fsr') && !derived.includes('electrical')) {
        derived.push('electrical')
      }
      const result = {
        status: eligibilityProfile?.status ?? onboardingStatus,
        disciplines: derived,
        regions: eligibilityProfile?.regions ?? [],
        credentialExpiryDate: eligibilityProfile?.credentialExpiresAt,
      }
      console.log('[LiveBoard] SUPABASE branch — user.supabaseId:', user.supabaseId)
      console.log('[LiveBoard] eligibilityProfile raw:', JSON.stringify(eligibilityProfile))
      console.log('[LiveBoard] resolved disciplines:', JSON.stringify(result.disciplines))
      console.log('[LiveBoard] resolved regions:', JSON.stringify(result.regions))
      console.log('[LiveBoard] resolved status:', result.status)
      return result
    }

    const result = {
      status: user?.onboardingStatus ?? onboardingStatus,
      disciplines: user?.disciplines ?? [],
      regions: user?.regions ?? [],
      credentialExpiryDate: user?.credentialExpiryDate,
    }
    console.log('[LiveBoard] DEMO branch — no supabaseId')
    console.log('[LiveBoard] user.disciplines:', JSON.stringify(result.disciplines))
    console.log('[LiveBoard] user.regions:', JSON.stringify(result.regions))
    console.log('[LiveBoard] resolved status:', result.status)
    return result
  }, [eligibilityProfile, onboardingStatus, user])

  const classifiedJobs = useMemo(() => {
    if (inspectorTestOverride) {
      return filteredJobs.map(job => ({
        job,
        eligibility: {
          eligible: true,
          reasons: [],
        },
        primaryReason: null,
      }))
    }

    return filteredJobs.map(job => {
      if (job.projectName?.includes('TEST AAA') || job.requiredDiscipline === 'mechanical') {
        console.log('[LiveBoard] checkInspectorEligibility input for job:', job.projectName)
        console.log('  requiredDiscipline:', job.requiredDiscipline)
        console.log('  jobRegion:', job.region)
        console.log('  inspectorDisciplines:', JSON.stringify(inspectorEligibility.disciplines))
        console.log('  inspectorRegions:', JSON.stringify(inspectorEligibility.regions))
        console.log('  status:', inspectorEligibility.status)
      }
      const eligibility = checkInspectorEligibility(
        job.requiredDiscipline,
        job.region,
        inspectorEligibility.disciplines,
        inspectorEligibility.regions,
        inspectorEligibility.credentialExpiryDate,
        inspectorEligibility.status as InspectorEligibilityProfile['status'] | null,
      )
      if (
        user?.supabaseId &&
        authorityEligibleJobIds &&
        !authorityEligibleJobIds.has(job.id)
      ) {
        eligibility.eligible = false
        if (eligibility.reasons.length === 0) {
          const discipline = `${job.requiredDiscipline.charAt(0).toUpperCase()}${job.requiredDiscipline.slice(1)}`
          eligibility.reasons.push(`Credential for ${discipline} is not yet verified`)
        }
      }
      if (job.projectName?.includes('TEST AAA') || job.requiredDiscipline === 'mechanical') {
        console.log('  eligibility result:', JSON.stringify(eligibility))
      }

      return {
        job,
        eligibility,
        primaryReason: eligibility.reasons[0] ?? null,
      }
    })
  }, [authorityEligibleJobIds, filteredJobs, inspectorEligibility, inspectorTestOverride, user?.supabaseId])

  const eligibleJobs = classifiedJobs.filter(entry => entry.eligibility.eligible)
  const ineligibleJobs = classifiedJobs.filter(entry => !entry.eligibility.eligible)
  // Estimated value of the visible (non-hidden) open opportunities. Derived from
  // the filtered eligible jobs so hidden jobs contribute nothing.
  const potentialEarnings = eligibleJobs.reduce(
    (sum, entry) => sum + (entry.job.offeredRate ?? entry.job.escrowAmount ?? 0),
    0,
  )
  const showOnboardingBanner = !inspectorTestOverride && inspectorEligibility.status !== 'approved'
  const reliabilityDashboardModel = useMemo(() => buildInspectorReliabilityDashboardModel({
    profile: reliabilityData?.profile ?? {
      tierKey: user?.supabaseId ? 'standard' : 'preferred',
      internalScore: user?.supabaseId ? 75 : 91,
      completedProfessionalWorkCount: user?.supabaseId ? 0 : myAssignments.length + 8,
      claimCommitmentCount: user?.supabaseId ? 0 : myAssignments.length + 10,
      invalidLateCancellationCount: 0,
      noShowCount: 0,
      credentialStatus: inspectorEligibility.status,
    },
    events: reliabilityData?.events ?? [],
  }), [inspectorEligibility.status, myAssignments.length, reliabilityData, user?.supabaseId])
  const reliabilityRollout = useMemo(
    () => evaluateReliabilityRollout(reliabilityPolicyConfig),
    [reliabilityPolicyConfig],
  )

  const handleClaim = async (
    jobId: string,
    slot: JobTimeSlot = { date: '', startTime: '', endTime: '', flexible: true },
    claimCommitment?: ClaimCommitment,
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!user) return { ok: false, error: 'Inspector is not signed in.' }

    let result: { ok: boolean; error?: string; assignment?: Record<string, unknown> }
    try {
      const res = await fetch('/api/jobs/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, claimedSlot: slot, commitment: claimCommitment }),
      })
      result = await res.json() as typeof result
    } catch {
      return { ok: false, error: 'Network error. Please try again.' }
    }

    if (result.ok && result.assignment) {
      const assignmentId = result.assignment.id as string
      if (assignmentId) router.push(`/inspector/assignment/${assignmentId}`)
    }

    return result.ok ? { ok: true } : { ok: false, error: result.error }
  }

  if (!user || onboardingStatus === null || !eligibilityLoaded || !authorityEligibilityLoaded) return null

  // ── Presentational workday metrics (derived from existing state only; no logic change) ──
  const inspectorFirstName = user.firstName?.trim()
  const activeAssignmentCount = activeWorklist.length
  const needsAttentionCount =
    acceptedHoldsForInspector.length +
    activeWorklist.filter(item => item.openHold || item.statusLabel === 'Availability Confirmation Needed').length
  const draftRecordCount = activeWorklist.filter(
    item => item.reportStatus === 'draft' || item.statusLabel === 'Draft Record In Progress',
  ).length
  const openOpportunityCount = eligibleJobs.length

  const workdayMetrics = [
    {
      key: 'active',
      label: 'Active Assignments',
      value: String(activeAssignmentCount),
      helper: 'Open or in progress',
      valueClass: 'text-ink',
      dot: activeAssignmentCount > 0 ? 'bg-electric' : 'bg-rim',
      size: 'text-3xl',
      targetId: 'active-worklist',
    },
    {
      key: 'attention',
      label: 'Needs Attention',
      value: String(needsAttentionCount),
      helper: 'Holds & re-verifications',
      valueClass: 'text-ink',
      dot: needsAttentionCount > 0 ? 'bg-warning-amber' : 'bg-rim',
      size: 'text-3xl',
      // The dedicated Needs Attention section only renders when there are accepted
      // holds. When it is absent, fall back to the always-present Active Worklist,
      // where holds & availability items also surface — so the card never no-ops.
      targetId: acceptedHoldsForInspector.length > 0 ? 'needs-attention' : 'active-worklist',
    },
    {
      key: 'drafts',
      label: 'Records In Progress',
      value: String(draftRecordCount),
      helper: 'Field drafts not yet sealed',
      valueClass: 'text-ink',
      dot: draftRecordCount > 0 ? 'bg-flame' : 'bg-rim',
      size: 'text-3xl',
      targetId: 'active-worklist',
    },
    {
      key: 'open',
      label: 'Open Opportunities',
      value: String(openOpportunityCount),
      helper: 'Eligible for you now',
      valueClass: 'text-ink',
      dot: openOpportunityCount > 0 ? 'bg-success-green' : 'bg-rim',
      size: 'text-3xl',
      targetId: 'open-requests',
    },
    {
      key: 'earnings',
      label: 'Potential Earnings',
      value: formatCurrency(potentialEarnings),
      helper: 'Visible open opportunities',
      valueClass: 'text-ink',
      dot: 'bg-success-green',
      size: 'text-2xl',
      targetId: undefined,
    },
  ]

  // Mirrors the Builder Command Center's scroll-to-section navigation. Optional
  // chaining is a safety net only — targetIds resolve to always-present anchors
  // (see Needs Attention's conditional target) so clicks land somewhere useful.
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Human-readable destination phrases for metric-card aria-labels.
  const SECTION_LABEL: Record<string, string> = {
    'active-worklist': 'active worklist',
    'needs-attention': 'needs attention',
    'open-requests': 'open opportunities',
  }

  // ─── Operations-console sidebar (route links + in-page section anchors) ───────
  const hasNeedsAttention = acceptedHoldsForInspector.length > 0
  const dashboardNavGroups: DashboardNavGroup[] = [
    {
      label: 'Workspace',
      items: [
        { id: 'live-board', kind: 'section', targetId: 'overview', label: 'Live Board', icon: LayoutDashboard },
        { id: 'needs-attention', kind: 'section', targetId: 'needs-attention', label: 'Needs Attention', icon: AlertTriangle, badge: needsAttentionCount, available: hasNeedsAttention },
        { id: 'worklist', kind: 'section', targetId: 'active-worklist', label: 'Worklist', icon: PlayCircle, badge: activeAssignmentCount },
        { id: 'open-requests', kind: 'section', targetId: 'open-requests', label: 'Open Requests', icon: Briefcase, badge: openOpportunityCount },
        { id: 'vault', kind: 'route', href: '/vault', label: 'Vault', icon: FolderLock },
        { id: 'profile', kind: 'route', href: '/inspector/profile', label: 'Profile', icon: User },
      ],
    },
    {
      label: 'Field Operations',
      items: [
        { id: 'current-assignments', kind: 'section', targetId: 'active-worklist', label: 'Current Assignments', icon: ListChecks, badge: activeAssignmentCount },
        { id: 'holds-reverifications', kind: 'section', targetId: 'needs-attention', label: 'Holds / Re-verifications', icon: AlertTriangle, badge: needsAttentionCount, available: hasNeedsAttention },
        { id: 'available-opportunities', kind: 'section', targetId: 'open-requests', label: 'Available Opportunities', icon: Briefcase, badge: openOpportunityCount },
        { id: 'records-in-progress', kind: 'section', targetId: 'active-worklist', label: 'Records in Progress', icon: FileText, badge: draftRecordCount },
      ],
    },
  ]

  return (
    <HardPingProvider>
    <RoleDashboardShell
      brandEyebrow="Inspector Operations"
      brandTitle={inspectorFirstName ? inspectorFirstName : 'Inspector'}
      navGroups={dashboardNavGroups}
      topbar={{ role: 'inspector' }}
    >

        {/* ── Inspector Field Hub command header ── */}
        <div id="overview" className="relative mb-6 scroll-mt-20 overflow-hidden rounded-3xl border border-rim/70 bg-gradient-to-b from-panel to-surface bg-dot bg-dot-sm">
          <div className="pointer-events-none absolute -top-24 right-[-6rem] h-72 w-72 rounded-full bg-[#C6A15B]/10 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C6A15B]/40 to-transparent" />
          <div className="relative px-5 py-7 sm:px-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C6A15B]/25 bg-[#C6A15B]/[0.08] px-3 py-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C6A15B]/70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#C6A15B]" />
                  </span>
                  <span className="label-mono font-bold !text-[#C6A15B]">
                    Inspector Operations{inspectorFirstName ? ` · ${inspectorFirstName}` : ''}
                  </span>
                </div>
                <h1 className="text-3xl font-black tracking-tight text-ink sm:text-4xl">Inspector Live Board</h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
                  Your field hub for active assignments, holds and re-verifications, open opportunities, and earning potential — in one place.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                <Link
                  href="/vault"
                  className="inline-flex items-center gap-2 rounded-2xl border border-rim bg-panel/80 px-5 py-3.5 text-sm font-bold text-ink backdrop-blur transition-colors hover:border-rim hover:bg-raised"
                >
                  <FolderLock className="h-4 w-4 text-muted" />
                  Open Vault
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Workday metrics ── */}
        {/* Operational metrics double as section navigation (mirrors the Builder
            Command Center's SituationStrip). Clicking a card scrolls to its
            section; neutral by default, restrained brass emphasis only on
            hover/keyboard-focus. */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {workdayMetrics.map(metric => {
            const cardClass = `relative overflow-hidden rounded-2xl border border-rim/60 bg-panel p-4 shadow-sm${
              metric.targetId
                ? ' border-gold-gradient cursor-pointer text-left transition-all hover:-translate-y-0.5 hover:border-[#C6A15B]/40 hover:shadow-lift focus:outline-none focus-visible:border-[#C6A15B]/40 focus-visible:ring-2 focus-visible:ring-[#C6A15B]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface'
                : ''
            }`
            const cardBody = (
              <>
                <div className="mb-2.5 flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full shadow-[0_0_12px_rgba(198,161,91,0.16)] ${metric.dot}`} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-subtle">{metric.label}</span>
                </div>
                <div className={`${metric.size} font-black leading-none tracking-tight ${metric.valueClass}`}>
                  {metric.value}
                </div>
                <div className="mt-1.5 text-[11px] font-medium leading-snug text-muted">{metric.helper}</div>
              </>
            )
            return metric.targetId ? (
              <button
                key={metric.key}
                type="button"
                onClick={() => scrollToSection(metric.targetId!)}
                aria-label={`Jump to ${SECTION_LABEL[metric.targetId] ?? metric.label.toLowerCase()}`}
                className={cardClass}
              >
                {cardBody}
              </button>
            ) : (
              <div key={metric.key} className={cardClass}>
                {cardBody}
              </div>
            )
          })}
        </div>

        {/* ── Operations grid: action-first main column + status right rail ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-8">

        {/* ── Needs Attention · Re-verification Required ── */}
        {acceptedHoldsForInspector.length > 0 && (
          <div id="needs-attention" className="mb-8 scroll-mt-20">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning-amber" />
              <h2 className="label-mono font-bold !text-warning-amber">Needs Attention · Re-verification Required</h2>
            </div>
            <div className="space-y-3">
              {acceptedHoldsForInspector.map(hold => (
                <div
                  key={hold.id}
                  className="overflow-hidden rounded-2xl border border-rim/70 border-l-2 border-l-warning-amber bg-panel shadow-sm"
                >
                  <div className="flex items-start gap-3 px-5 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rim/60 bg-raised">
                      <Activity className="h-5 w-5 text-warning-amber" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 text-sm font-bold text-ink">Builder Accepted Hold Terms</div>
                      <div className="text-xs text-muted">
                        Site is ready for re-verification. Return to site and resolve the hold.
                      </div>
                      <div className="mt-2 text-[11px] text-muted">
                        Fee reserved: <span className="font-bold text-warning-amber">${hold.holdCapAmount.toFixed(2)}</span>
                        {hold.builderAcceptedAt && (
                          <>{' · '}Accepted {new Date(hold.builderAcceptedAt).toLocaleTimeString('en-CA', { timeZone: 'America/Vancouver', hour: '2-digit', minute: '2-digit' })}</>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/inspector/completion/${hold.relatedInspectionId}#hold`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#C6A15B] px-4 py-2.5 text-xs font-semibold text-[#1B1508] shadow-sm ring-1 ring-inset ring-white/10 transition-colors hover:bg-[#D8B871]"
                    >
                      Re-verify Now
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Worklist */}
        {(activeWorklist.length > 0 || hiddenActiveWorklist.length > 0) && (
          <div id="active-worklist" className="mb-10 scroll-mt-20">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-[#C6A15B]" />
                  <h2 className="label-mono font-bold !text-[#C6A15B]">Your Active Worklist</h2>
                </div>
                <p className="mt-1 text-xs text-muted">
                  These are assignments still open or in progress. Completed submitted records move to Vault.{' '}
                  <Link href="/vault" className="text-ink underline underline-offset-2 transition-colors hover:text-[#C6A15B]">
                    View Submitted Records in Vault
                  </Link>
                </p>
              </div>
              {hiddenActiveWorklist.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHiddenWorklist(value => !value)}
                  className="self-start rounded-xl border border-rim bg-panel px-3 py-2 text-xs font-black text-ink transition-colors hover:bg-raised sm:self-auto"
                >
                  {showHiddenWorklist ? 'Hide Hidden' : `Show Hidden (${hiddenActiveWorklist.length})`}
                </button>
              )}
            </div>
            {worklistDispositionMessage && (
              <div className="mb-3 rounded-xl border border-rim/70 border-l-2 border-l-electric bg-raised px-3 py-2 text-xs font-semibold text-ink">
                {worklistDispositionMessage}
              </div>
            )}
            {renderedActiveWorklist.length === 0 && (
              <div className="rounded-2xl border border-rim/60 bg-panel px-4 py-3 text-sm text-muted">
                No visible active assignments. Hidden assignments are not shown unless you choose Show Hidden.
              </div>
            )}
            <div className="space-y-3">
              {renderedActiveWorklist.map(assignment => {
                const hiddenFromWorklist = assignment.hiddenFromWorklist === true
                const holdDetailsHref = assignment.openHold
                  ? `/inspector/completion/${assignment.id}?hold=${assignment.openHold.id}#hold`
                  : `/inspector/completion/${assignment.id}#hold`
                const holdResponseLabel = getHoldResponseLabel(assignment.openHold)
                const holdHeadline = assignment.openHold?.status === 'hold_active'
                  ? 'Hold active — correction window accepted'
                  : assignment.openHold?.builderDeclinedAt || assignment.openHold?.status === 'hold_declined'
                    ? 'Hold active — builder declined terms'
                    : 'Hold active — builder action pending'
                const inspectionPreview = resolveInspectionStagePreview(assignment.stage, assignment.discipline)
                return (
                  <div
                    key={assignment.id}
                    className={`flex flex-col gap-4 rounded-2xl border p-4 shadow-sm transition-all hover:border-[#C6A15B]/30 md:flex-row md:items-center ${
                      hiddenFromWorklist
                        ? 'border-rim/50 bg-raised/60 opacity-90'
                        : 'border-rim/60 bg-panel hover:bg-raised'
                    }`}
                  >
                    <div className="w-12 h-12 bg-[#C6A15B] rounded-xl flex items-center justify-center shrink-0">
                      <Activity className="w-6 h-6 text-[#1B1508]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-ink text-base truncate">{assignment.projectName || 'Assigned Project'}</span>
                        <span className="rounded-full border border-rim/60 bg-raised px-2 py-0.5 text-[10px] font-bold uppercase text-muted">
                          {assignment.statusLabel}
                        </span>
                        {assignment.jobStatus && assignment.jobStatus !== assignment.status && (
                          <span className="rounded-full border border-rim/70 bg-white/[0.02] px-2 py-0.5 text-[10px] font-semibold uppercase text-muted">
                            Job: {formatStoredStatus(assignment.jobStatus)}
                          </span>
                        )}
                        {assignment.reportStatus && (
                          <span className={`rounded-full border border-rim/70 bg-white/[0.02] px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            assignment.reportStatus === 'sealed' ? 'text-success-green' : 'text-warning-amber'
                          }`}>
                            Field Record: {formatStoredStatus(assignment.reportStatus)}
                          </span>
                        )}
                        {hiddenFromWorklist && (
                          <span className="rounded-full border border-rim/60 bg-raised px-2 py-0.5 text-[10px] font-bold uppercase text-muted">
                            Hidden from Worklist
                          </span>
                        )}
                      </div>
                      {(assignment.stage != null || assignment.discipline) && (
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {assignment.stage != null && (
                            <span className="text-xs font-semibold text-electric">
                              Stage {assignment.stage}{assignment.stageName ? ` — ${assignment.stageName}` : ''}
                            </span>
                          )}
                          {assignment.discipline && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${DISC_BADGE[assignment.discipline] ?? 'border-rim/60 bg-raised text-muted'}`}>
                              {formatStoredStatus(assignment.discipline)}
                            </span>
                          )}
                        </div>
                      )}
                      {inspectionPreview && (
                        <div className="text-xs mb-1">
                          <span className="text-subtle">Inspection Stage: </span>
                          <span className="font-semibold text-ink">
                            {inspectionPreview.code} — {inspectionPreview.name}
                          </span>
                        </div>
                      )}
                      <div className="text-xs text-muted truncate">
                        {assignment.address
                          ? `${assignment.address}${assignment.city ? `, ${assignment.city}` : ''}`
                          : 'Address unavailable'}
                      </div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <div className="flex items-center gap-1 text-[10px] text-subtle">
                          <Clock className="w-3 h-3" />
                          {assignment.claimedSlot?.flexible
                            ? 'Flexible timing'
                            : assignment.claimedSlot?.date
                              ? `${assignment.claimedSlot.date}${assignment.claimedSlot.startTime ? ` · ${assignment.claimedSlot.startTime}–${assignment.claimedSlot.endTime}` : ''}`
                              : 'Upcoming'}
                        </div>
                        <div className="font-mono text-[10px] text-subtle">
                          #{assignment.assignmentIdSuffix}
                        </div>
                      </div>
                      {(assignment.statusLabel === 'Availability Confirmation Needed' || confirmedAvailabilityResults.has(assignment.id)) && (
                        <div className="mt-3 rounded-xl border border-rim/70 border-l-2 border-l-electric bg-raised px-3 py-3 text-ink">
                          {confirmedAvailabilityResults.has(assignment.id) ? (
                            <>
                              <div className="text-sm font-bold">Availability Confirmed</div>
                              <div className="mt-1 text-xs">
                                {confirmedAvailabilityResults.get(assignment.id)?.emailSent
                                  ? 'You confirmed availability for this inspection. The builder has been notified that the visit remains on track.'
                                  : 'You confirmed availability for this inspection.'
                                }
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-sm font-bold">Availability Confirmation Needed</div>
                              <div className="mt-1 text-xs">
                                {user?.firstName
                                  ? `${user.firstName}, please confirm you are still available for this inspection.`
                                  : 'Please confirm you are still available for this inspection.'
                                }{' '}This helps keep the builder informed and gives Vero time to reassign the work if needed.
                              </div>
                              {confirmAvailabilityErrors.has(assignment.id) && (
                                <div className="mt-2 text-xs font-semibold text-fail-red">
                                  {confirmAvailabilityErrors.get(assignment.id)}
                                </div>
                              )}
                              <button
                                type="button"
                                disabled={confirmingAvailabilityIds.has(assignment.id)}
                                onClick={() => void handleConfirmAvailability(assignment.id, assignment.jobId)}
                                className="mt-2 w-full px-3 py-2 rounded-lg text-xs font-semibold text-[#1B1508] bg-[#C6A15B] shadow-sm ring-1 ring-inset ring-white/10 transition-colors hover:bg-[#D8B871] disabled:cursor-wait disabled:opacity-60"
                              >
                                {confirmingAvailabilityIds.has(assignment.id) ? 'Confirming...' : 'Confirm Availability'}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      {assignment.openHold && (
                        <div className="mt-3 rounded-xl border border-rim/70 border-l-2 border-l-warning-amber bg-raised px-3 py-3 text-ink">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="text-sm font-bold">{holdHeadline}</div>
                              <div className="mt-1 text-xs font-semibold">
                                {assignment.openHold.deficiencyReason || assignment.openHold.reason}
                              </div>
                              {assignment.openHold.deficiencyReason && (
                                <div className="mt-1 text-[11px] opacity-80">Required correction: {assignment.openHold.reason}</div>
                              )}
                            </div>
                            <div className="shrink-0 rounded-full border border-rim/70 bg-white/[0.02] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-warning-amber">
                              {holdResponseLabel}
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold">
                            <span className="rounded-full border border-rim/60 bg-white/[0.02] px-2 py-1 text-muted">
                              Fee terms: {formatCurrency(assignment.openHold.holdCapAmount)}
                            </span>
                            <span className="rounded-full border border-rim/60 bg-white/[0.02] px-2 py-1 text-muted">
                              {assignment.openHold.holdEligibleForOnSiteCorrection ? 'Same-day eligible' : 'Rebook required'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex w-full flex-col gap-2 md:w-auto md:shrink-0">
                      {assignment.openHold && !hiddenFromWorklist && (
                        <button
                          onClick={() => router.push(holdDetailsHref)}
                          className="px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-rim/70 bg-white/[0.02] text-warning-amber hover:border-rim"
                        >
                          View Hold Details <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                      {hiddenFromWorklist ? (
                        <button
                          type="button"
                          disabled={worklistActionId === `${WORKLIST_RESTORE_ACTION}:${assignment.id}`}
                          onClick={() => void handleWorklistDisposition(assignment, WORKLIST_RESTORE_ACTION)}
                          className="px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-rim/70 bg-white/[0.02] text-ink hover:border-electric/40 disabled:cursor-wait disabled:opacity-60"
                        >
                          Restore to Worklist
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => router.push(`/inspector/completion/${assignment.id}`)}
                            className="bg-[#C6A15B] text-[#1B1508] px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm ring-1 ring-inset ring-white/10 hover:bg-[#D8B871] transition-colors"
                          >
                            Continue Assignment <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={worklistActionId === `${WORKLIST_HIDE_ACTION}:${assignment.id}`}
                            onClick={() => void handleWorklistDisposition(assignment, WORKLIST_HIDE_ACTION)}
                            className="flex items-center justify-center gap-2 rounded-xl border border-rim bg-panel px-4 py-2.5 text-xs font-black text-muted transition-colors hover:bg-raised hover:text-ink disabled:cursor-wait disabled:opacity-60"
                          >
                            Hide from Worklist
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {showOnboardingBanner && (
          <div className="mb-6 rounded-2xl border border-rim/70 border-l-2 border-l-warning-amber bg-raised p-4 text-ink">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-bold">Waiting for Vero approval</div>
                <p className="mt-1 text-xs">
                  {inspectorEligibility.status !== 'approved'
                    ? 'Your application is under review. The Live Board and uploads stay locked until your profile is approved.'
                    : 'Your account is approved, but your approved role lanes do not include marketplace claim authority yet.'}
                </p>
              </div>
              <button
                onClick={() => router.push('/inspector/onboarding')}
                className="shrink-0 rounded-xl bg-[#C6A15B] px-4 py-2.5 text-xs font-semibold text-[#1B1508] shadow-sm ring-1 ring-inset ring-white/10 transition-colors hover:bg-[#D8B871]"
              >
                View Approval Status
              </button>
            </div>
          </div>
        )}

        {/* Dev-only fast-track: seed a sealed report + open the PDF. Hidden in
            production builds via NEXT_PUBLIC_ build-time swap. */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rim/70 border-l-2 border-l-warning-amber bg-raised px-4 py-3 text-xs text-muted">
            <span className="font-bold uppercase tracking-widest">Dev</span>
            <span className="flex-1">Skip the 15-stage flow — seed a sealed report and open the PDF.</span>
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch('/api/dev/seed-certified-project', { method: 'POST' })
                  const json = await res.json()
                  if (!res.ok) {
                    console.error('[dev-fast-track] seed failed:', json)
                    alert(`Seed failed: ${json.error ?? res.status}${json.detail ? `\n${json.detail}` : ''}`)
                    return
                  }
                  window.open(json.pdfUrl, '_blank', 'noopener,noreferrer')
                } catch (err) {
                  console.error('[dev-fast-track] network error:', err)
                  alert('Seed failed: network error')
                }
              }}
              className="rounded-xl bg-[#C6A15B] px-3 py-2 text-[11px] font-semibold tracking-wide text-[#1B1508] shadow-sm ring-1 ring-inset ring-white/10 transition-colors hover:bg-[#D8B871]"
            >
              Dev: Generate Test Certificate
            </button>
          </div>
        )}

        {/* Header */}
        <div id="open-requests" className="mb-6 scroll-mt-20">
          <div className="mb-2 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-[#C6A15B]" />
            <span className="label-mono font-bold !text-[#C6A15B]">Open Requests · Opportunities</span>
          </div>
          <h2 className="text-2xl font-black text-ink">Open Requests</h2>
          <p className="text-sm text-muted mt-1">
            {eligibleJobs.length} eligible of {classifiedJobs.length} live requests matching your filters
          </p>
          <p className="text-xs text-subtle mt-1 max-w-xl">
            Open Requests are unclaimed live jobs. Jobs you&apos;ve already claimed appear in Your Active Worklist above. Some jobs may be hidden if they do not match your verified credentials, region, or are already assigned. Potential earnings are summarized in the status rail.
          </p>
        </div>

        <ReliabilityTierDashboard
          model={reliabilityDashboardModel}
          enabled={reliabilityRollout.inspectorDashboardVisible}
        />

        {/* Filters */}
        <div className="mb-6 rounded-2xl border border-rim/60 bg-panel p-4 shadow-sm">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
            <input
              type="text"
              placeholder="Search by project name or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-rim/60 bg-surface py-3 pl-11 pr-4 text-sm text-ink placeholder-subtle transition-all focus:border-[#C6A15B] focus:outline-none"
            />
          </div>

          {/* Region pills */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-3 h-3 text-subtle" />
              <span className="text-[10px] font-bold text-subtle uppercase tracking-widest">Region</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map(r => (
                <button key={r.value} onClick={() => setRegion(r.value as Region | 'all')}
                  className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    region === r.value
                      ? 'bg-ink text-surface'
                      : 'border border-rim/60 bg-surface text-muted hover:bg-raised hover:text-ink'
                  }`}>{r.label}</button>
              ))}
            </div>
          </div>

          {/* Discipline pills */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-3 h-3 text-subtle" />
              <span className="text-[10px] font-bold text-subtle uppercase tracking-widest">Discipline</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DISCS.map(d => (
                <button key={d.value} onClick={() => setDiscipline(d.value as InspectorDiscipline | 'all')}
                  className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    discipline === d.value
                      ? 'bg-ink text-surface'
                      : 'border border-rim/60 bg-surface text-muted hover:bg-raised hover:text-ink'
                  }`}>{d.label}</button>
              ))}
            </div>
          </div>

          <div className="mt-4 border-t border-rim/50 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-3 h-3 text-subtle" />
              <span className="text-[10px] font-bold text-subtle uppercase tracking-widest">Board View</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all' as const, label: 'All Live Jobs' },
                { value: 'eligible' as const, label: 'Eligible Only' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setBoardView(option.value)}
                  className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    boardView === option.value
                      ? 'bg-ink text-surface'
                      : 'border border-rim/60 bg-surface text-muted hover:bg-raised hover:text-ink'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Job list */}
        <div className="space-y-3">
          {classifiedJobs.length === 0 ? (
            <div className="rounded-2xl border border-rim/60 bg-panel py-16 text-center shadow-sm">
              <Search className="w-10 h-10 text-subtle mx-auto mb-3" />
              <div className="font-semibold text-muted">No open requests match your filters</div>
              <div className="text-xs text-subtle mt-1">Try adjusting your region or discipline filters</div>
            </div>
          ) : (
            <>
              {eligibleJobs.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="label-mono font-bold !text-success-green">Eligible for You</h2>
                    <span className="text-[10px] font-bold text-subtle uppercase tracking-wider">{eligibleJobs.length} jobs</span>
                  </div>
                  {eligibleJobs.map(({ job, eligibility }) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      eligibility={eligibility}
                      onClaim={(jobId, slot, _suggestedSlot, claimCommitment) => handleClaim(jobId, slot, claimCommitment)}
                    />
                  ))}
                </section>
              )}

              {boardView === 'all' && ineligibleJobs.length > 0 && (
                <section className="space-y-3 pt-4 opacity-70 transition-opacity duration-200 hover:opacity-100 focus-within:opacity-100">
                  <div className="flex items-center justify-between">
                    <h2 className="label-mono font-bold text-subtle">Other Live Projects</h2>
                    <span className="text-[10px] font-bold text-subtle uppercase tracking-wider">{ineligibleJobs.length} locked</span>
                  </div>
                  {ineligibleJobs.map(({ job, eligibility, primaryReason }) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      eligibility={eligibility}
                      primaryEligibilityReason={primaryReason ?? undefined}
                      onClaim={(jobId, slot, _suggestedSlot, claimCommitment) => handleClaim(jobId, slot, claimCommitment)}
                    />
                  ))}
                </section>
              )}

              {boardView === 'eligible' && eligibleJobs.length === 0 && (
                <div className="rounded-2xl border border-rim/60 bg-panel py-16 text-center shadow-sm">
                  <Briefcase className="w-10 h-10 text-subtle mx-auto mb-3" />
                  <div className="font-semibold text-muted">No eligible jobs match your filters</div>
                  <div className="text-xs text-subtle mt-1">Switch to All Live Jobs to view the wider marketplace</div>
                </div>
              )}
            </>
          )}
        </div>
          </div>

          {/* ── Status right rail (secondary, persistent context) ── */}
          <aside className="lg:col-span-4">
            <div className="space-y-4 lg:sticky lg:top-[5rem]">
              <div className="rounded-2xl border border-rim/70 border-l-2 border-l-success-green bg-panel p-5 shadow-sm">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-subtle">
                  <Wallet className="h-3.5 w-3.5 text-success-green" /> Potential Earnings
                </div>
                <div className="mt-2 text-3xl font-black text-success-green">{formatCurrency(potentialEarnings)}</div>
                <div className="mt-1 text-[11px] leading-snug text-subtle">
                  Estimated value of visible open opportunities. Actual payout status appears after admin review and release.
                </div>
              </div>

              <div className="rounded-2xl border border-rim/70 bg-panel p-5 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-widest text-subtle">Field Summary</div>
                <div className="mt-3 space-y-2">
                  {[
                    { label: 'Active assignments', value: activeAssignmentCount, dot: 'bg-electric', target: 'active-worklist' },
                    { label: 'Needs attention', value: needsAttentionCount, dot: 'bg-warning-amber', target: hasNeedsAttention ? 'needs-attention' : 'active-worklist' },
                    { label: 'Records in progress', value: draftRecordCount, dot: 'bg-flame', target: 'active-worklist' },
                    { label: 'Open opportunities', value: openOpportunityCount, dot: 'bg-success-green', target: 'open-requests' },
                  ].map(row => (
                    <button
                      key={row.label}
                      type="button"
                      onClick={() => scrollToSection(row.target)}
                      aria-label={`Jump to ${SECTION_LABEL[row.target] ?? row.label.toLowerCase()}`}
                      className="flex w-full items-center justify-between rounded-xl border border-rim/60 bg-surface px-3 py-2.5 text-left transition-colors hover:border-[#C6A15B]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                    >
                      <span className="flex items-center gap-2 text-xs font-semibold text-muted">
                        <span className={`h-1.5 w-1.5 rounded-full ${row.dot}`} />
                        {row.label}
                      </span>
                      <span className="text-sm font-black tabular-nums text-ink">{row.value}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Link
                href="/vault"
                className="flex items-center justify-center gap-2 rounded-2xl border border-rim bg-panel px-4 py-3 text-sm font-bold text-ink transition-colors hover:bg-raised"
              >
                <FolderLock className="h-4 w-4 text-muted" /> Open Vault
              </Link>
            </div>
          </aside>
        </div>
    </RoleDashboardShell>
    </HardPingProvider>
  )
}
