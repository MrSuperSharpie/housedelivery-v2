'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, ChevronRight, PlayCircle, Clock, Activity, Filter, Briefcase } from 'lucide-react'
import { Navbar } from '@/components/shared/Navbar'
import { JobCard } from '@/components/inspector/JobCard'
import { HardPingProvider } from '@/components/inspector/HardPingProvider'
import { ReliabilityTierDashboard } from '@/components/inspector/ReliabilityTierDashboard'
import { checkInspectorEligibility } from '@/lib/eligibility'
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

const DISC_BADGE: Record<string, string> = {
  structural:     'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300',
  geotech:        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300',
  electrical:     'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300',
  mechanical:     'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-300',
  architectural:  'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300',
  plumbing:       'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/15 dark:text-cyan-300',
  fire_protection:'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300',
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

  const activeWorklist = user?.supabaseId ? (dbActiveWorklist ?? []) : storedActiveWorklist
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
      return matchesRegion && matchesDisc && matchesSearch && !isAlreadyClaimedByMe
    })
  }, [openJobs, region, discipline, search, myAssignments])

  const inspectorEligibility = useMemo(() => {
    if (user?.supabaseId) {
      const approvedLanes = eligibilityProfile?.approvedRoleLanes ?? []
      const baseDisciplines = eligibilityProfile?.disciplines ?? []
      const derived = [...baseDisciplines]
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

  return (
    <HardPingProvider>
    <div className={`app-theme-scope min-h-screen ${isDark ? 'bg-[#0f172a]' : 'bg-slate-50'}`}>
      <Navbar role="inspector" dark />
      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Builder-Accepted Hold Notifications ── */}
        {acceptedHoldsForInspector.map(hold => (
          <div
            key={hold.id}
            className={`mb-5 rounded-2xl border overflow-hidden ${
              isDark
                ? 'border-amber-500/30 bg-amber-500/10'
                : 'border-amber-400/40 bg-amber-50'
            }`}
          >
            <div className="px-5 py-4 flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-ink text-sm mb-0.5">Builder Accepted Hold Terms</div>
                <div className="text-xs text-muted">
                  Site is ready for re-verification. Return to site and resolve the hold.
                </div>
                <div className="mt-2 text-[11px] text-muted">
                  Fee reserved: <span className="font-bold text-amber-400">${hold.holdCapAmount.toFixed(2)}</span>
                  {hold.builderAcceptedAt && (
                    <>{' · '}Accepted {new Date(hold.builderAcceptedAt).toLocaleTimeString('en-CA', { timeZone: 'America/Vancouver', hour: '2-digit', minute: '2-digit' })}</>
                  )}
                </div>
              </div>
              <Link
                href={`/inspector/completion/${hold.relatedInspectionId}#hold`}
                className={`rounded-lg px-2 py-1 shrink-0 ${isDark ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-amber-100 border border-amber-300'}`}
              >
                <div className="text-[10px] text-amber-500 font-bold">Re-verify Now</div>
              </Link>
            </div>
          </div>
        ))}

        {/* Active Worklist */}
        {(activeWorklist.length > 0 || hiddenActiveWorklist.length > 0) && (
          <div className="mb-10">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-flame" />
                  <h2 className="text-xs font-bold text-electric tracking-widest uppercase">Your Active Worklist</h2>
                </div>
                <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  These are assignments still open or in progress. Completed submitted records move to Vault.{' '}
                  <Link href="/vault" className={`underline underline-offset-2 ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                    View Submitted Records in Vault
                  </Link>
                </p>
              </div>
              {hiddenActiveWorklist.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHiddenWorklist(value => !value)}
                  className={`self-start rounded-xl border px-3 py-2 text-xs font-black transition-all sm:self-auto ${
                    isDark
                      ? 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {showHiddenWorklist ? 'Hide Hidden' : `Show Hidden (${hiddenActiveWorklist.length})`}
                </button>
              )}
            </div>
            {worklistDispositionMessage && (
              <div className={`mb-3 rounded-xl border px-3 py-2 text-xs font-semibold ${
                isDark
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-100'
                  : 'border-blue-200 bg-blue-50 text-blue-900'
              }`}>
                {worklistDispositionMessage}
              </div>
            )}
            {renderedActiveWorklist.length === 0 && (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-slate-300'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}>
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
                    className={`flex flex-col gap-4 rounded-2xl border p-4 shadow-sm transition-all hover:border-electric/30 md:flex-row md:items-center ${
                      hiddenFromWorklist
                        ? isDark
                          ? 'border-slate-700 bg-slate-900/70 opacity-90'
                          : 'border-slate-200 bg-slate-50 opacity-95'
                        : isDark
                          ? 'border-slate-700 bg-slate-800 hover:bg-slate-800/90'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-12 h-12 bg-flame rounded-xl flex items-center justify-center shrink-0">
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-ink text-base truncate">{assignment.projectName || 'Assigned Project'}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                          isDark
                            ? 'border-slate-600 bg-slate-700/50 text-slate-300'
                            : 'border-slate-300 bg-slate-200 text-slate-700'
                        }`}>
                          {assignment.statusLabel}
                        </span>
                        {assignment.jobStatus && assignment.jobStatus !== assignment.status && (
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                            isDark
                              ? 'border-blue-700/50 bg-blue-900/30 text-blue-300'
                              : 'border-blue-200 bg-blue-50 text-blue-700'
                          }`}>
                            Job: {formatStoredStatus(assignment.jobStatus)}
                          </span>
                        )}
                        {assignment.reportStatus && (
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                            assignment.reportStatus === 'sealed'
                              ? isDark
                                ? 'border-emerald-700/50 bg-emerald-900/30 text-emerald-300'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : isDark
                                ? 'border-amber-700/50 bg-amber-900/30 text-amber-300'
                                : 'border-amber-200 bg-amber-50 text-amber-700'
                          }`}>
                            Field Record: {formatStoredStatus(assignment.reportStatus)}
                          </span>
                        )}
                        {hiddenFromWorklist && (
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                            isDark
                              ? 'border-slate-600 bg-slate-700/50 text-slate-300'
                              : 'border-slate-300 bg-slate-100 text-slate-600'
                          }`}>
                            Hidden from Worklist
                          </span>
                        )}
                      </div>
                      {(assignment.stage != null || assignment.discipline) && (
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {assignment.stage != null && (
                            <span className={`text-xs font-semibold ${isDark ? 'text-electric' : 'text-blue-700'}`}>
                              Stage {assignment.stage}{assignment.stageName ? ` — ${assignment.stageName}` : ''}
                            </span>
                          )}
                          {assignment.discipline && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${DISC_BADGE[assignment.discipline] ?? (isDark ? 'border-slate-600 bg-slate-700/50 text-slate-300' : 'border-slate-300 bg-slate-200 text-slate-700')}`}>
                              {formatStoredStatus(assignment.discipline)}
                            </span>
                          )}
                        </div>
                      )}
                      {inspectionPreview && (
                        <div className="text-xs mb-1">
                          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Inspection Stage: </span>
                          <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
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
                        <div className={`font-mono text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          #{assignment.assignmentIdSuffix}
                        </div>
                      </div>
                      {(assignment.statusLabel === 'Availability Confirmation Needed' || confirmedAvailabilityResults.has(assignment.id)) && (
                        <div className={`mt-3 rounded-xl border px-3 py-3 ${
                          isDark
                            ? 'border-blue-500/40 bg-blue-500/10 text-blue-100'
                            : 'border-blue-300 bg-blue-50 text-blue-950'
                        }`}>
                          {confirmedAvailabilityResults.has(assignment.id) ? (
                            <>
                              <div className="text-sm font-black">Availability Confirmed</div>
                              <div className="mt-1 text-xs">
                                {confirmedAvailabilityResults.get(assignment.id)?.emailSent
                                  ? 'You confirmed availability for this inspection. The builder has been notified that the visit remains on track.'
                                  : 'You confirmed availability for this inspection.'
                                }
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-sm font-black">Availability Confirmation Needed</div>
                              <div className="mt-1 text-xs">
                                {user?.firstName
                                  ? `${user.firstName}, please confirm you are still available for this inspection.`
                                  : 'Please confirm you are still available for this inspection.'
                                }{' '}This helps keep the builder informed and gives Vero time to reassign the work if needed.
                              </div>
                              {confirmAvailabilityErrors.has(assignment.id) && (
                                <div className={`mt-2 text-xs font-semibold ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                                  {confirmAvailabilityErrors.get(assignment.id)}
                                </div>
                              )}
                              <button
                                type="button"
                                disabled={confirmingAvailabilityIds.has(assignment.id)}
                                onClick={() => void handleConfirmAvailability(assignment.id, assignment.jobId)}
                                className={`mt-2 w-full px-3 py-2 rounded-lg text-xs font-black transition-all disabled:cursor-wait disabled:opacity-60 ${
                                  isDark
                                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                              >
                                {confirmingAvailabilityIds.has(assignment.id) ? 'Confirming...' : 'Confirm Availability'}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      {assignment.openHold && (
                        <div className={`mt-3 rounded-xl border px-3 py-3 ${
                          isDark
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                            : 'border-amber-300 bg-amber-50 text-amber-950'
                        }`}>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="text-sm font-black">{holdHeadline}</div>
                              <div className="mt-1 text-xs font-semibold">
                                {assignment.openHold.deficiencyReason || assignment.openHold.reason}
                              </div>
                              {assignment.openHold.deficiencyReason && (
                                <div className="mt-1 text-[11px] opacity-80">Required correction: {assignment.openHold.reason}</div>
                              )}
                            </div>
                            <div className="shrink-0 rounded-lg border border-amber-400/50 bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-900">
                              {holdResponseLabel}
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold">
                            <span className="rounded-full bg-white/70 px-2 py-1 text-amber-950">
                              Fee terms: {formatCurrency(assignment.openHold.holdCapAmount)}
                            </span>
                            <span className="rounded-full bg-white/70 px-2 py-1 text-amber-950">
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
                          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                            isDark
                              ? 'border border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20'
                              : 'border border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200'
                          }`}
                        >
                          View Hold Details <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                      {hiddenFromWorklist ? (
                        <button
                          type="button"
                          disabled={worklistActionId === `${WORKLIST_RESTORE_ACTION}:${assignment.id}`}
                          onClick={() => void handleWorklistDisposition(assignment, WORKLIST_RESTORE_ACTION)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all disabled:cursor-wait disabled:opacity-60 ${
                            isDark
                              ? 'border border-blue-500/40 bg-blue-500/10 text-blue-100 hover:bg-blue-500/20'
                              : 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          Restore to Worklist
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => router.push(`/inspector/completion/${assignment.id}`)}
                            className="bg-flame text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-flame-light transition-all glow-flame-sm"
                          >
                            Continue Assignment <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={worklistActionId === `${WORKLIST_HIDE_ACTION}:${assignment.id}`}
                            onClick={() => void handleWorklistDisposition(assignment, WORKLIST_HIDE_ACTION)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all disabled:cursor-wait disabled:opacity-60 ${
                              isDark
                                ? 'border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700'
                                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
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
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-100 p-4 text-amber-900">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-black">Waiting for Vero approval</div>
                <p className="mt-1 text-xs">
                  {inspectorEligibility.status !== 'approved'
                    ? 'Your application is under review. The Live Board and uploads stay locked until your profile is approved.'
                    : 'Your account is approved, but your approved role lanes do not include marketplace claim authority yet.'}
                </p>
              </div>
              <button
                onClick={() => router.push('/inspector/onboarding')}
                className="shrink-0 rounded-xl bg-amber-900 px-4 py-2.5 text-xs font-black text-white hover:opacity-90"
              >
                View Approval Status
              </button>
            </div>
          </div>
        )}

        {/* Dev-only fast-track: seed a sealed report + open the PDF. Hidden in
            production builds via NEXT_PUBLIC_ build-time swap. */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
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
              className="rounded-xl bg-flame px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white hover:bg-flame-light"
            >
              Dev: Generate Test Certificate
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-ink">Open Requests</h1>
            <p className="text-sm text-muted mt-1">
              {eligibleJobs.length} eligible of {classifiedJobs.length} live requests matching your filters
            </p>
            <p className="text-xs text-subtle mt-1">
              Open Requests are unclaimed live jobs. Jobs you&apos;ve already claimed appear in Your Active Worklist above. Some jobs may be hidden if they do not match your verified credentials, region, or are already assigned.
            </p>
          </div>
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm ${
            isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
          }`}>
            <div className="text-right">
              <div className="text-[10px] font-bold text-subtle uppercase tracking-widest">Potential Open Earnings</div>
              <div className={`text-xl font-black ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>{formatCurrency(1329)}</div>
              <div className={`mt-1 text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Estimated value of visible open opportunities. Actual payout status appears after admin review and release.
              </div>
            </div>
          </div>
        </div>

        <ReliabilityTierDashboard
          model={reliabilityDashboardModel}
          enabled={reliabilityRollout.inspectorDashboardVisible}
        />

        {/* Filters */}
        <div className={`mb-6 rounded-2xl border p-4 shadow-sm ${
          isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
        }`}>
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
            <input
              type="text"
              placeholder="Search by project name or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full rounded-xl border py-3 pl-11 pr-4 text-sm text-ink placeholder-subtle transition-all focus:border-flame focus:outline-none ${
                isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'
              }`}
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
                  className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    region === r.value
                      ? 'bg-flame text-white'
                      : isDark
                        ? 'border border-slate-600 bg-slate-900 text-muted hover:bg-slate-800 hover:text-ink'
                        : 'border border-slate-300 bg-white text-muted hover:bg-slate-100 hover:text-ink'
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
                  className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    discipline === d.value
                      ? 'bg-electric text-white'
                      : isDark
                        ? 'border border-slate-600 bg-slate-900 text-muted hover:bg-slate-800 hover:text-ink'
                        : 'border border-slate-300 bg-white text-muted hover:bg-slate-100 hover:text-ink'
                  }`}>{d.label}</button>
              ))}
            </div>
          </div>

          <div className={`mt-4 border-t pt-4 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
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
                  className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    boardView === option.value
                      ? (isDark ? 'bg-slate-200 text-slate-900' : 'bg-slate-700 text-white')
                      : isDark
                        ? 'border border-slate-600 bg-slate-900 text-muted hover:bg-slate-800 hover:text-ink'
                        : 'border border-slate-300 bg-white text-muted hover:bg-slate-100 hover:text-ink'
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
            <div className={`rounded-2xl border py-16 text-center shadow-sm ${
              isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
            }`}>
              <Search className="w-10 h-10 text-subtle mx-auto mb-3" />
              <div className="font-semibold text-muted">No open requests match your filters</div>
              <div className="text-xs text-subtle mt-1">Try adjusting your region or discipline filters</div>
            </div>
          ) : (
            <>
              {eligibleJobs.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className={`text-xs font-bold tracking-widest uppercase ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>Eligible for You</h2>
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
                <section className="space-y-3 pt-4">
                  <div className="flex items-center justify-between">
                    <h2 className={`text-xs font-bold tracking-widest uppercase ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Other Live Projects</h2>
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
                <div className={`rounded-2xl border py-16 text-center shadow-sm ${
                  isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
                }`}>
                  <Briefcase className="w-10 h-10 text-subtle mx-auto mb-3" />
                  <div className="font-semibold text-muted">No eligible jobs match your filters</div>
                  <div className="text-xs text-subtle mt-1">Switch to All Live Jobs to view the wider marketplace</div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
    </HardPingProvider>
  )
}
