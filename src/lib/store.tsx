'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type {
  Project,
  InspectionJob,
  InspectorDiscipline,
  DispatchTier,
  Region,
  Assignment,
  ClaimCommitment,
  ObjectionReason,
  JobTimeSlot,
  PricingInspectionType,
  PricingMode,
  SpecialistCredentialClass,
  SpecialistRoleId,
  InspectorOnboardingStatus,
} from './types'
import type { TimeSlot } from '@/components/builder/SchedulingPicker'
import { checkInspectorEligibility, type EligibilityResult } from './eligibility'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
import { claimLiveJobIfEligible, insertJobOpportunity, listOpenJobOpportunities, updateApplicationStatus, updateJobStatus } from '@/lib/supabase/jobs'
import {
  confirmJobAssignment,
  getAssignmentForJob as getDbAssignmentForJob,
  invalidateJobAssignment,
  listAssignmentsForBuilder,
  listAssignmentsForInspector,
  objectJobAssignment,
} from '@/lib/supabase/jobs'
import { selectInspectorEligibility } from '@/lib/supabase/compliance'
import { canSealSubmission } from '@/lib/domain'
import type { SubmissionStatus } from '@/lib/domain'
import type { EscrowStatus } from '@/lib/types'
import type {
  HoldCategory,
  HoldRecord,
  RetentionSession,
} from '@/lib/types'
import {
  placeHold,
  builderApproveHold,
  builderDeclineHold,
  listHoldsForJob,
  getLatestActiveRetentionSessionForActor,
  upsertRetentionSession,
} from '@/lib/supabase/holds'
import { calculatePricingBreakdown } from '@/utils/pricing'
import { getFixedDispatchHoldBaseRate } from '@/lib/pricing/config'
import { isInspectorTestModeEnabled } from '@/lib/inspectorTestMode'
import {
  createDispute,
  upsertGovernedProject,
  upsertPaymentDecision,
} from '@/lib/supabase/governance'
import { listProjectsByBuilder, upsertProject as upsertProjectRecord } from '@/lib/supabase/projects'
import { normalizeAssignmentUiSnapshot } from '@/lib/governance/assignments'
import {
  validateClaimGovernance,
  validateJobPostingGovernance,
  validatePackageExportRequest,
  validatePayoutRelease,
  validateProjectGovernance,
  validateSealSubmissionRequest,
} from '@/lib/governance'

export type StoreActionResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; error: string }

export interface Application {
  id:                   string
  jobId:                string
  jobRef:               string
  jobName:              string
  jobAddress:           string
  builderId:            string
  inspectorId:          string
  inspectorName:        string
  inspectorLicense:     string
  inspectorDesignation: string
  inspectorRating:      number
  inspectorCompletions: number
  inspectorAvatar:      string
  inspectorPhone:       string
  inspectorDisciplines: InspectorDiscipline[]
  inspectorRegions:     Region[]
  credentialExpiryDate?: string
  availableSlot:        string
  note:                 string
  status:               'pending' | 'approved' | 'declined'
  appliedAt:            string
}

export interface NewJobInput {
  projectId?:            string
  projectName:          string
  address:              string
  city:                 string
  permitNumber:         string
  stage:                number
  stageName:            string
  discipline:           InspectorDiscipline
  tier:                 DispatchTier
  offeredRate:          number
  slots:                TimeSlot[]
  builderName:          string
  builderId:            string
  builderAvatar:        string
  builderRating:        number
  builderJobs:          number
  ppeRequired:          string[]
  hazardFlags:          string[]
  siteReqs:             string[]
  safetyNotes:          string
  builderApprovalStatus: string
  pricingMode?:         PricingMode
  specialistRole?:      SpecialistRoleId | null
  hourlyRate?:          number
  billableHours?:       number
  holdHours?:           number
  requiresProfessionalSeal?: boolean
  requiresCP?:          boolean
  inspectionType?:      PricingInspectionType
  credentialClass?:     SpecialistCredentialClass
}

export interface NewClaimInput {
  jobId:                string
  builderId:            string
  inspectorId:          string
  inspectorName:        string
  inspectorLicense:     string
  inspectorDisciplines: InspectorDiscipline[]
  inspectorRegions:     Region[]
  claimedSlot:          import('@/lib/types').JobTimeSlot
  claimCommitment?:     ClaimCommitment
  credentialExpiryDate?: string
}

export interface NewApplicationInput {
  jobId:                string
  jobRef:               string
  jobName:              string
  jobAddress:           string
  builderId:            string
  inspectorId:          string
  inspectorName:        string
  inspectorLicense:     string
  inspectorDesig:       string
  inspectorRating:      number
  inspectorJobs:        number
  inspectorAvatar:      string
  inspectorPhone:       string
  inspectorDisciplines: InspectorDiscipline[]
  inspectorRegions:     Region[]
  credentialExpiryDate?: string
  availableSlot:        string
  note:                 string
}

interface StoreValue {
  projects:     Project[]
  jobs:         InspectionJob[]
  applications: Application[]
  assignments:          Assignment[]
  addJob:               (input: NewJobInput) => Promise<StoreActionResult<string>>
  addProject:           (p: Partial<Project> & { name: string; address: string; city: string; builderApprovalStatus: string }) => StoreActionResult<string>
  applyForJob:          (input: NewApplicationInput) => void
  approveApplication:   (applicationId: string, actorId: string) => EligibilityResult
  declineApplication:   (applicationId: string, actorId: string) => void
  getJobApplications:   (jobId: string) => Application[]
  getBuilderApplicants: (builderId: string) => Application[]
  getOpenJobs:          () => InspectionJob[]
  claimJob:             (input: NewClaimInput) => Promise<StoreActionResult<Assignment>>
  objectAssignment:     (assignmentId: string, reason: ObjectionReason, note: string) => void
  confirmAssignment:    (assignmentId: string) => void
  invalidateAssignment: (assignmentId: string, adminNote: string) => void
  getJobAssignment:     (jobId: string) => Assignment | undefined
  sealSubmission:       (projectId: string, currentSubmissionStatus: SubmissionStatus) => StoreActionResult
  exportPackage:        (projectId: string, guards: ExportGuards) => StoreActionResult
  releasePayout:        (assignmentId: string, currentEscrowStatus: EscrowStatus) => StoreActionResult
  // ── Hold workflow ──
  placeHoldPoint:       (input: {
    jobId: string
    inspectorId: string
    builderId: string
    tier: DispatchTier
    reason: string
    deficiencyReason?: string
    checklistItemIds: string[]
    affectedItemSummaries?: string[]
    holdCategory: HoldCategory
    holdEligibleForOnSiteCorrection: boolean
    premiumRateAmount: number
    notes?: string
    relatedInspectionId?: string
  }) => Promise<StoreActionResult<HoldRecord>>
  approveHoldPoint:     (holdId: string, jobId: string, correctionWindowMinutes: number, builderNote?: string) => Promise<StoreActionResult>
  declineHoldPoint:     (holdId: string, actorId: string, builderNote?: string) => Promise<StoreActionResult>
  getJobHolds:          (jobId: string) => Promise<HoldRecord[]>
  activeRetention:      RetentionSession | null
  startRetention:       (holdId: string, jobId: string, inspectorId: string, builderId: string, tier: DispatchTier, hours: number) => void
  extendRetention:      () => void
  completeRetention:    (resolvedDefectIds: string[]) => void
}

export interface ExportGuards {
  submissionStatus: SubmissionStatus
  hasOpenDeficiencies: boolean
  hasAdminApproval: boolean
}

const StoreContext = createContext<StoreValue | null>(null)

const PROJECTS_KEY     = 'sl_projects'
const APPLICATIONS_KEY = 'sl_applications'
const ASSIGNMENTS_KEY  = 'sl_assignments'
const OBJECTION_WINDOW_MS: Record<string, number> = {
  emergency: 2 * 3600 * 1000,
  priority:  12 * 3600 * 1000,
  standard:  24 * 3600 * 1000,
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null
    return raw ? JSON.parse(raw) as T : fallback
  } catch { return fallback }
}

function writeLS<T>(key: string, val: T) {
  try { if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(val)) } catch { }
}

function normalizeJobTimeSlot(value: unknown): JobTimeSlot | null {
  if (!value || typeof value !== 'object') return null
  const slot = value as Record<string, unknown>

  if (slot.flexible === true) {
    return {
      date: '',
      startTime: '',
      endTime: '',
      flexible: true,
    }
  }

  if (typeof slot.date !== 'string' || typeof slot.startTime !== 'string' || typeof slot.endTime !== 'string') {
    return null
  }

  return {
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    flexible: slot.flexible === true,
  }
}

function normalizeJobTimeSlots(value: unknown): JobTimeSlot[] {
  if (!Array.isArray(value)) return []
  return value
    .map(normalizeJobTimeSlot)
    .filter((slot): slot is JobTimeSlot => Boolean(slot))
}

const SUPPORTED_CITY_REGIONS: Array<{ city: string; region: Region }> = [
  { city: 'Vancouver', region: 'vancouver' },
  { city: 'Burnaby', region: 'burnaby' },
  { city: 'Surrey', region: 'surrey' },
  { city: 'Coquitlam', region: 'coquitlam' },
  { city: 'Richmond', region: 'richmond' },
]

function normalizeRegionFromCity(city?: string): Region | null {
  const value = city?.trim().toLowerCase().replace(/\s+/g, ' ') ?? ''
  return SUPPORTED_CITY_REGIONS.find(({ city: supportedCity }) => value.includes(supportedCity.toLowerCase()))?.region ?? null
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [projects,     setProjects]     = useState<Project[]>(() => readLS<Project[]>(PROJECTS_KEY, []))
  const [jobs,         setJobs]         = useState<InspectionJob[]>([])
  const [applications, setApplications] = useState<Application[]>(() => readLS<Application[]>(APPLICATIONS_KEY, []))
  const [assignments,  setAssignments]  = useState<Assignment[]>(() => readLS<Assignment[]>(ASSIGNMENTS_KEY, []))
  const [activeRetention, setActiveRetention] = useState<RetentionSession | null>(null)
  const [actorId, setActorId] = useState<string>('system')

  const persistRetentionSession = useCallback(async (
    session: RetentionSession,
    source: string,
  ) => {
    const persisted = await upsertRetentionSession(session)
    if (!persisted) {
      console.error(`${source}: failed to persist retention session`, session)
      return
    }

    setActiveRetention(current => {
      if (!current) return persisted
      return current.holdId === persisted.holdId ? persisted : current
    })
  }, [])

  useEffect(() => {
    const storedProjects    = readLS<Project[]>(PROJECTS_KEY, [])

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setActorId(session.user.id)
        const dbProjects = await listProjectsByBuilder(session.user.id)
        setProjects(dbProjects.length > 0 ? dbProjects : storedProjects)

        // Load the full Live Board. Inspector eligibility is classified in the
        // Live Board UI so "All Live Jobs" can show ineligible-but-visible work.
        const dbJobs = await listOpenJobOpportunities()
        const dbMapped: InspectionJob[] = dbJobs.map(j => ({
          id:                   j.id,
          projectId:            j.projectId ?? j.id,
          projectName:          j.projectName,
          address:              j.address,
          city:                 j.city,
          permitNumber:         j.permitNumber,
          projectType:          j.projectType ?? 'Residential',
          stage:                j.stage,
          stageName:            j.stageName,
          dispatchTier:         j.dispatchTier,
          offeredRate:          j.offeredRate,
          estimatedDuration:    j.estimatedDurationMinutes,
          distance:             0,
          region:               j.region,
          requiredDiscipline:   j.requiredDiscipline,
          status:               j.status as InspectionJob['status'],
          requestedAt:          j.requestedAt,
          escrowAmount:         j.escrowEstimateTotal ?? j.offeredRate,
          pricingMode:          j.pricingMode,
          specialistRole:       j.specialistRole,
          baseHourlyRate:       j.baseHourlyRate,
          effectiveHourlyRate:  j.effectiveHourlyRate,
          billableHours:        j.billableHours,
          holdHours:            j.holdHours,
          holdCost:             j.holdCost,
          urgencyMultiplier:    j.urgencyMultiplier,
          platformCommissionAmount: j.platformCommissionAmount,
          requiresProfessionalSeal: j.requiresProfessionalSeal,
          requiresCP:           j.requiresCP,
          inspectionType:       j.inspectionType,
          credentialClass:      j.credentialClass,
          availableSlots:       j.availableSlots ?? [],
          builderName:          j.builderName ?? '',
          builderRating:        0,
          builderCompletedJobs: 0,
          isReinspection:       false,
          builderNotes:         j.notes,
          builderId:            j.builderId,
        }))
        setJobs(dbMapped)

        // ─── DATA BRIDGE FIX: SYNC ASSIGNMENTS FROM DB ───
        try {
          const [{ data: dbProfiles }, { data: myJobs, error: jobsQueryError }] = await Promise.all([
            supabase.from('profiles').select('*'),
            supabase.from('job_opportunities').select('*'),
          ])
          const profileRows = (dbProfiles ?? []) as Array<Record<string, unknown>>
          const jobRows = (myJobs ?? []) as Array<Record<string, unknown>>

          const [builderAssignments, inspectorAssignments] = await Promise.all([
            listAssignmentsForBuilder(session.user.id),
            listAssignmentsForInspector(session.user.id),
          ])

          // Fetch project names for inspector's claimed jobs — these may be
          // provisionally_assigned (not live) and invisible to the generic jobRows fetch.
          const inspectorJobIds = inspectorAssignments.map(a => a.jobId)
          const claimedJobNameMap = new Map<string, string>()
          if (inspectorJobIds.length > 0) {
            const { data: claimedJobData } = await supabase
              .from('job_opportunities')
              .select('id, project_name')
              .in('id', inspectorJobIds)
            for (const row of (claimedJobData ?? []) as Array<Record<string, unknown>>) {
              if (typeof row.id === 'string' && row.project_name) {
                claimedJobNameMap.set(row.id, row.project_name as string)
              }
            }
          }

          const assignmentMap = new Map([...builderAssignments, ...inspectorAssignments].map(row => [row.id, row]))

          const reconstructedAssignments: Assignment[] = Array.from(assignmentMap.values()).map(dba => {
            const myJob = jobRows.find(j => j.id === dba.jobId)
            const prof = profileRows.find(p => p.id === dba.inspectorId)
            const snapshot = normalizeAssignmentUiSnapshot({
              status: dba.status,
              objectionState: dba.objectionState,
              objectionWindowClosesAt: dba.objectionWindowClosesAt,
            })

            return {
              id: dba.id,
              jobId: dba.jobId,
              projectName: (myJob?.project_name as string | undefined) ?? claimedJobNameMap.get(dba.jobId),
              builderId: (myJob?.builder_id as string | undefined) ?? '',
              inspectorId: dba.inspectorId,
              inspectorName: prof ? `${(prof.first_name as string | undefined) ?? ''} ${(prof.last_name as string | undefined) ?? ''}`.trim() || 'Inspector' : 'Inspector',
              inspectorLicense: (prof?.license_number as string | undefined) ?? '',
              inspectorDisciplines: (prof?.disciplines as Assignment['inspectorDisciplines'] | undefined) ?? [],
              inspectorRegions: (prof?.regions as Assignment['inspectorRegions'] | undefined) ?? [],
              claimedAt: dba.assignedAt ?? new Date().toISOString(),
              objectionWindowClosesAt: dba.objectionWindowClosesAt ?? new Date().toISOString(),
              claimedSlot: dba.claimedSlot ?? { date: new Date().toISOString().split('T')[0], startTime: 'TBD', endTime: 'TBD' },
              status: snapshot.status as Assignment['status'],
              objectionState: snapshot.objectionState,
              objectionReason: dba.objectionReason as Assignment['objectionReason'],
              objectionNote: dba.objectionNote,
            }
          })

          setAssignments(reconstructedAssignments)
          writeLS(ASSIGNMENTS_KEY, reconstructedAssignments)

          if (!Array.isArray(myJobs) || jobsQueryError) {
            console.warn('store: job_opportunities bridge query failed — preserving existing live jobs', jobsQueryError)
          } else setJobs(prevJobs => {
            const newJobs: InspectionJob[] = []
            jobRows.forEach(mj => {
              const existing = prevJobs.find(j => j.id === mj.id)
              if (!existing) {
                newJobs.push({
                  id: mj.id as string,
                  projectId: (mj.project_id as string | undefined) ?? (mj.id as string),
                  projectName: (mj.project_name as string | undefined) ?? 'Project',
                  address: (mj.address as string | undefined) ?? '',
                  city: (mj.city as string | undefined) ?? '',
                  permitNumber: (mj.permit_number as string | undefined) ?? '',
                  projectType: (mj.project_type as string | undefined) ?? 'Residential',
                  stage: (mj.stage as number | undefined) ?? 1,
                  stageName: (mj.stage_name as string | undefined) ?? 'Stage',
                  dispatchTier: (mj.dispatch_tier as InspectionJob['dispatchTier'] | undefined) ?? 'standard',
                  offeredRate: (mj.offered_rate as number | undefined) ?? 0,
                  estimatedDuration: (mj.estimated_duration_minutes as number | undefined) ?? 60,
                  distance: 0,
                  region: (mj.region as InspectionJob['region'] | undefined) ?? 'vancouver',
                  requiredDiscipline: (mj.required_discipline as InspectionJob['requiredDiscipline'] | undefined) ?? 'structural',
                  status: mj.status as InspectionJob['status'],
                  requestedAt: (mj.requested_at as string | undefined) ?? new Date().toISOString(),
                  escrowAmount: (mj.escrow_estimate_total as number | undefined) ?? (mj.offered_rate as number | undefined) ?? 0,
                  pricingMode: (mj.pricing_mode as InspectionJob['pricingMode'] | undefined) ?? 'dispatch_fixed',
                  specialistRole: (mj.specialist_role as InspectionJob['specialistRole'] | undefined) ?? undefined,
                  baseHourlyRate: (mj.base_hourly_rate as number | undefined) ?? undefined,
                  effectiveHourlyRate: (mj.effective_hourly_rate as number | undefined) ?? undefined,
                  billableHours: (mj.billable_hours as number | undefined) ?? undefined,
                  holdHours: (mj.hold_hours as number | undefined) ?? undefined,
                  holdCost: (mj.hold_cost as number | undefined) ?? undefined,
                  urgencyMultiplier: (mj.urgency_multiplier as number | undefined) ?? undefined,
                  platformCommissionAmount: (mj.platform_commission_amount as number | undefined) ?? undefined,
                  requiresProfessionalSeal: mj.requires_professional_seal === true,
                  requiresCP: mj.requires_cp === true,
                  inspectionType: (mj.inspection_type as InspectionJob['inspectionType'] | undefined) ?? undefined,
                  credentialClass: (mj.credential_class as InspectionJob['credentialClass'] | undefined) ?? undefined,
                  availableSlots: normalizeJobTimeSlots(mj.available_slots),
                  builderName: (mj.builder_name as string | undefined) ?? '',
                  builderRating: 0,
                  builderCompletedJobs: 0,
                  isReinspection: false,
                  builderNotes: (mj.notes as string | undefined) ?? '',
                  builderId: (mj.builder_id as string | undefined) ?? '',
                })
              } else {
                newJobs.push({
                  ...existing,
                  status: mj.status as InspectionJob['status'],
                  pricingMode: (mj.pricing_mode as InspectionJob['pricingMode']) ?? existing.pricingMode,
                  specialistRole: (mj.specialist_role as InspectionJob['specialistRole']) ?? existing.specialistRole,
                  baseHourlyRate: (mj.base_hourly_rate as number | undefined) ?? existing.baseHourlyRate,
                  effectiveHourlyRate: (mj.effective_hourly_rate as number | undefined) ?? existing.effectiveHourlyRate,
                  billableHours: (mj.billable_hours as number | undefined) ?? existing.billableHours,
                  holdHours: (mj.hold_hours as number | undefined) ?? existing.holdHours,
                  holdCost: (mj.hold_cost as number | undefined) ?? existing.holdCost,
                  urgencyMultiplier: (mj.urgency_multiplier as number | undefined) ?? existing.urgencyMultiplier,
                  platformCommissionAmount: (mj.platform_commission_amount as number | undefined) ?? existing.platformCommissionAmount,
                  escrowAmount: (mj.escrow_estimate_total as number | undefined) ?? existing.escrowAmount,
                  availableSlots: normalizeJobTimeSlots(mj.available_slots),
                })
              }
            })
            return newJobs
          })
        } catch (err) {
          console.error('Failed to sync assignments from DB:', err)
        }

        const persistedRetention = await getLatestActiveRetentionSessionForActor(session.user.id)
        setActiveRetention(persistedRetention)
      } else {
        setActorId('system')
        setProjects(storedProjects)
        setJobs([])
        setActiveRetention(null)
      }
    }
    init()
  }, [])

  const addProject = useCallback((input: Partial<Project> & { name: string; address: string; city: string; builderApprovalStatus: string }) => {
    const governance = validateProjectGovernance({
      builderId: input.builderId,
      builderStatus: (input.builderApprovalStatus ?? 'draft') as InspectorOnboardingStatus,
      name: input.name,
      address: input.address,
      city: input.city,
      permitNumber: input.permitNumber,
      projectScope: input.projectScope ?? input.name,
    })

    if (!governance.ok) {
      return {
        ok: false as const,
        error: governance.blockers.map(issue => issue.message).join(' '),
      }
    }

    const id = 'proj-' + uid()
    const nextProject: Project = {
      ...input,
      id,
      builderId: input.builderId ?? 'unknown-builder',
      permitNumber: input.permitNumber ?? '',
      currentStage: input.currentStage ?? 1,
      status: input.status ?? 'pending',
      stages: input.stages ?? [],
      photos: input.photos ?? [],
      gpsCoord: input.gpsCoord ?? { lat: 0, lng: 0, accuracy: 0, timestamp: '', deviceId: '' },
      createdAt: input.createdAt ?? new Date().toISOString(),
      updatedAt: input.updatedAt ?? new Date().toISOString(),
    }
    setProjects(prev => {
      const updated = [...prev, nextProject]
      writeLS(PROJECTS_KEY, updated)
      return updated
    })

    void upsertProjectRecord({
      ...nextProject,
      currentStage: nextProject.currentStage ?? 1,
      status: nextProject.status ?? 'pending',
      stages: nextProject.stages ?? [],
      photos: nextProject.photos ?? [],
      gpsCoord: nextProject.gpsCoord ?? { lat: 0, lng: 0, accuracy: 0, timestamp: '', deviceId: '' },
      createdAt: nextProject.createdAt ?? new Date().toISOString(),
      updatedAt: nextProject.updatedAt ?? new Date().toISOString(),
      permitNumber: nextProject.permitNumber ?? '',
      city: nextProject.city ?? '',
      address: nextProject.address,
      name: nextProject.name,
      builderId: nextProject.builderId ?? 'unknown-builder',
    } as Project, nextProject.builderId ?? 'unknown-builder')

    void upsertGovernedProject({
      id,
      builderId: input.builderId ?? 'unknown-builder',
      name: input.name,
      address: input.address,
      city: input.city,
      permitNumber: input.permitNumber ?? undefined,
      builderOnboardingStatus: input.builderApprovalStatus ?? 'draft',
      completenessStatus: governance.completenessStatus,
      completenessBlockers: governance.blockers,
      ruleSnapshot: governance.ruleResult as unknown as Record<string, unknown>,
      metadata: {
        source: 'store.addProject',
      },
    })

    return { ok: true as const, value: id }
  }, [])

  // ─── addJob ───────────────────────────────────────────────────────────────
  const addJob = useCallback(async (input: NewJobInput): Promise<StoreActionResult<string>> => {
    const permitFamily = input.discipline === 'electrical' ? 'electrical'
      : input.discipline === 'plumbing' ? 'plumbing'
      : 'building'
    const provisionalId = 'job-' + uid()
    const pricing = calculatePricingBreakdown({
      dispatchTier: input.tier,
      pricingMode: input.pricingMode,
      specialistRole: input.specialistRole,
      hourlyRate: input.hourlyRate,
      billableHours: input.billableHours,
      holdHours: input.holdHours,
      requiresProfessionalSeal: input.requiresProfessionalSeal,
      requiresCP: input.requiresCP,
      inspectionType: input.inspectionType,
      credentialClass: input.credentialClass,
      discipline: input.discipline,
    })
    const estimatedDurationMinutes = pricing.pricingMode === 'specialist_hourly'
      ? Math.max(90, Math.round(pricing.billableHours * 60))
      : 120
    const normalizedRegion = normalizeRegionFromCity(input.city)
    const dispatchRegion = normalizedRegion ?? ('' as Region)
    const projectIdentityComplete = Boolean(input.projectName && input.address && input.city)

    const governance = validateJobPostingGovernance({
      jobId: provisionalId,
      projectId: input.projectId,
      builderId: input.builderId,
      builderStatus: (input.builderApprovalStatus ?? 'draft') as InspectorOnboardingStatus,
      projectName: input.projectName,
      address: input.address,
      city: input.city,
      permitFamily,
      permitNumber: input.permitNumber,
      requiredDiscipline: input.discipline,
      region: dispatchRegion,
      stage: input.stage,
      stageName: input.stageName,
      projectComplete: projectIdentityComplete,
      dependencySealed: true,
      escrowAuthorized: true,
    })
    const nextStatus = governance.status

    const insertedJob = await insertJobOpportunity({
      projectId:                input.projectId,
      projectName:              input.projectName,
      address:                  input.address,
      city:                     input.city,
      permitNumber:             input.permitNumber,
      stage:                    input.stage,
      stageName:                input.stageName,
      requiredDiscipline:       input.discipline,
      dispatchTier:             input.tier,
      offeredRate:              pricing.inspectorPayout,
      pricingMode:              pricing.pricingMode,
      specialistRole:           pricing.specialistRole,
      baseHourlyRate:           pricing.specialistRole ? pricing.hourlyRate : undefined,
      effectiveHourlyRate:      pricing.effectiveHourlyRate,
      billableHours:            pricing.pricingMode === 'specialist_hourly' ? pricing.billableHours : undefined,
      holdHours:                pricing.holdHours,
      holdCost:                 pricing.holdCost,
      urgencyMultiplier:        pricing.multiplier,
      platformCommissionAmount: pricing.platformCommission,
      escrowEstimateTotal:      pricing.builderEscrowTotal,
      requiresProfessionalSeal: input.requiresProfessionalSeal === true,
      requiresCP:               input.requiresCP === true,
      inspectionType:           input.inspectionType ?? 'dispatch',
      credentialClass:          input.credentialClass ?? undefined,
      builderId:                input.builderId,
      builderName:              input.builderName,
      region:                   dispatchRegion,
      status:                   nextStatus,
      permitFamily,
      notes:                    input.safetyNotes,
      availableSlots:           input.slots,
      builderOnboardingStatus:  input.builderApprovalStatus,
      escrowAuthorized:         true,
      estimatedDurationMinutes,
    }).catch(err => {
      console.error('[addJob] insertJobOpportunity failed:', err)
      return null
    })

    if (!insertedJob) {
      return {
        ok: false,
        error: 'Could not save the inspection request. Please review the site details and try again.',
      }
    }

    const insertedId = insertedJob.id
    const persistedStatus = insertedJob.status
    if (persistedStatus !== 'live') {
      return {
        ok: false,
        error: insertedJob.blockers.map(issue => issue.message).join(' ') || 'This inspection request could not be posted to the Live Job Board yet.',
      }
    }

    const newJob: InspectionJob = {
      id:                   insertedId,
      projectId:            input.projectId ?? insertedId,
      projectName:          input.projectName,
      address:              input.address,
      city:                 input.city,
      permitNumber:         input.permitNumber,
      projectType:          'Residential',
      stage:                input.stage,
      stageName:            input.stageName,
      dispatchTier:         input.tier,
      offeredRate:          pricing.inspectorPayout,
      estimatedDuration:    estimatedDurationMinutes,
      distance:             0,
      region:               dispatchRegion,
      requiredDiscipline:   input.discipline,
      status:               persistedStatus,
      requestedAt:          new Date().toISOString(),
      escrowAmount:         pricing.builderEscrowTotal,
      pricingMode:          pricing.pricingMode,
      specialistRole:       pricing.specialistRole,
      baseHourlyRate:       pricing.specialistRole ? pricing.hourlyRate : undefined,
      effectiveHourlyRate:  pricing.effectiveHourlyRate,
      billableHours:        pricing.pricingMode === 'specialist_hourly' ? pricing.billableHours : undefined,
      holdHours:            pricing.holdHours,
      holdCost:             pricing.holdCost,
      urgencyMultiplier:    pricing.multiplier,
      platformCommissionAmount: pricing.platformCommission,
      requiresProfessionalSeal: input.requiresProfessionalSeal === true,
      requiresCP:           input.requiresCP === true,
      inspectionType:       input.inspectionType ?? 'dispatch',
      credentialClass:      input.credentialClass,
      availableSlots:       input.slots as JobTimeSlot[],
      builderName:          input.builderName,
      builderRating:        input.builderRating,
      builderCompletedJobs: input.builderJobs,
      isReinspection:       false,
      builderNotes:         input.safetyNotes,
      builderId:            input.builderId,
    }

    setJobs(prev => [...prev, newJob])
    return { ok: true as const, value: insertedId }
  }, [projects])

  const applyForJob = useCallback((input: NewApplicationInput) => {
    const app: Application = {
      ...input,
      id: 'app-' + uid(),
      inspectorDesignation: input.inspectorDesig,
      inspectorCompletions: input.inspectorJobs,
      inspectorAvatar: input.inspectorAvatar,
      status: 'pending',
      appliedAt: new Date().toISOString(),
    }
    setApplications(prev => {
      const updated = [...prev, app]
      writeLS(APPLICATIONS_KEY, updated)
      return updated
    })
  }, [])

  const approveApplication = useCallback((applicationId: string, actorId: string): EligibilityResult => {
    setApplications(prev => {
      const updated = prev.map(a => a.id === applicationId ? { ...a, status: 'approved' as const } : a)
      writeLS(APPLICATIONS_KEY, updated)
      return updated
    })
    updateApplicationStatus(applicationId, 'accepted', actorId).catch(
      err => console.error('[approveApplication] DB update failed:', err)
    )
    return { eligible: true, reasons: [] }
  }, [])

  const declineApplication = useCallback((applicationId: string, actorId: string) => {
    setApplications(prev => {
      const updated = prev.map(a => a.id === applicationId ? { ...a, status: 'declined' as const } : a)
      writeLS(APPLICATIONS_KEY, updated)
      return updated
    })
    updateApplicationStatus(applicationId, 'rejected', actorId).catch(
      err => console.error('[declineApplication] DB update failed:', err)
    )
  }, [])

  // ─── claimJob ─────────────────────────────────────────────────────────────
  const claimJob = useCallback(async (input: NewClaimInput): Promise<StoreActionResult<Assignment>> => {
    const job = jobs.find(j => j.id === input.jobId)
    if (!job || job.status !== 'live') {
      return { ok: false, error: 'Job is not available.' }
    }

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    // Test override applies only to demo (localStorage) sessions — never to real Supabase accounts.
    // Real users must pass the full eligibility check and route through claim_live_job_if_eligible.
    const inspectorTestOverride = isInspectorTestModeEnabled({ role: 'inspector' }) && !authUser?.id

    const persistedEligibility = !inspectorTestOverride && authUser?.id
      ? await selectInspectorEligibility(authUser.id)
      : null

    if (!inspectorTestOverride && authUser?.id && !persistedEligibility) {
      return { ok: false, error: 'Inspector eligibility profile not found. Complete onboarding or contact Vero.' }
    }

    const inspectorDisciplines = persistedEligibility?.disciplines ?? input.inspectorDisciplines
    const inspectorRegions = persistedEligibility?.regions ?? input.inspectorRegions
    const credentialExpiryDate = persistedEligibility?.credentialExpiresAt ?? input.credentialExpiryDate
    const inspectorLicense = persistedEligibility?.licenseNumber ?? input.inspectorLicense
    const onboardingStatus = persistedEligibility?.status ?? (authUser ? null : 'approved')

    if (!inspectorTestOverride) {
      const eligibility = checkInspectorEligibility(
        job.requiredDiscipline,
        job.region,
        inspectorDisciplines,
        inspectorRegions,
        credentialExpiryDate,
        onboardingStatus,
      )
      if (!eligibility.eligible) {
        return { ok: false, error: eligibility.reasons?.join(', ') ?? 'Inspector is not eligible for this job.' }
      }

      const governance = validateClaimGovernance({
        jobStatus: job.status,
        jobValidationStatus: job.status === 'live' ? 'validated' : 'blocked',
        permitFamily: job.requiredDiscipline === 'electrical' ? 'electrical'
          : job.requiredDiscipline === 'plumbing' ? 'plumbing'
          : 'building',
        requiredDiscipline: job.requiredDiscipline,
        region: job.region,
        inspectorDisciplines,
        inspectorRegions,
        onboardingStatus,
        credentialExpiryDate,
        assignmentLocked: assignments.some(existing =>
          existing.jobId === job.id && (existing.status === 'provisional' || existing.status === 'confirmed')
        ),
      })

      if (!governance.ok) {
        return { ok: false, error: governance.blockers.map(issue => issue.message).join(' ') }
      }
    }

    const now = new Date()
    const windowMs = OBJECTION_WINDOW_MS[job.dispatchTier ?? 'standard']

    const provisionalAssignment: Assignment = {
      id:                      '',
      jobId:                   input.jobId,
      builderId:               job.builderId ?? '',
      inspectorId:             input.inspectorId,
      inspectorName:           input.inspectorName,
      inspectorLicense,
      inspectorDisciplines,
      inspectorRegions,
      claimedAt:               now.toISOString(),
      objectionWindowClosesAt: new Date(now.getTime() + windowMs).toISOString(),
      claimedSlot:             input.claimedSlot,
      status:                  'provisional',
    }

    try {
      let assignment: Assignment

      if (authUser?.id && !inspectorTestOverride) {
        const claimPayload = {
          jobId: provisionalAssignment.jobId,
          inspectorId: authUser.id,
          claimedSlot: provisionalAssignment.claimedSlot,
          objectionWindowClosesAt: provisionalAssignment.objectionWindowClosesAt,
        }

        console.log('START claim', claimPayload)
        const result = await claimLiveJobIfEligible(job.id, provisionalAssignment.claimedSlot, input.claimCommitment)
        console.log('RESULT', result.assignment, result.error)

        if (!result.ok || !result.assignment) {
          console.error('[claimJob] assignment insert failed', result.error, { payload: claimPayload })
          return { ok: false, error: result.error ?? 'Failed to create assignment record in database.' }
        }

        assignment = {
          ...provisionalAssignment,
          id: result.assignment.id,
          inspectorId: result.assignment.inspectorId,
          claimedAt: result.assignment.assignedAt ?? provisionalAssignment.claimedAt,
          status: (result.assignment.status as Assignment['status']) ?? provisionalAssignment.status,
          objectionWindowClosesAt: result.assignment.objectionWindowClosesAt ?? provisionalAssignment.objectionWindowClosesAt,
          claimedSlot: result.assignment.claimedSlot ?? provisionalAssignment.claimedSlot,
        }
      } else {
        if (!authUser?.id) {
          return { ok: false, error: 'A valid Supabase session is required to claim jobs. Please sign in.' }
        }
        const assignmentInsertPayload = {
          job_id: provisionalAssignment.jobId,
          inspector_id: authUser.id,
          assigned_by: authUser.id,
          assigned_at: provisionalAssignment.claimedAt,
          status: 'provisional' as const,
          objection_window_closes_at: provisionalAssignment.objectionWindowClosesAt,
          claimed_slot: provisionalAssignment.claimedSlot,
          commitment_accepted: input.claimCommitment?.accepted === true,
          commitment_version: input.claimCommitment?.version ?? null,
          commitment_accepted_at: input.claimCommitment?.acceptedAt ?? null,
          escrow_amount: job.escrowAmount ?? job.offeredRate,
          escrow_status: 'held' as const,
          updated_at: provisionalAssignment.claimedAt,
        }

        console.log('START claim', assignmentInsertPayload)

        const { data: insertedAssignment, error: assignmentInsertError } = await supabase
          .from('job_assignments')
          .insert(assignmentInsertPayload)
          .select('*')
          .single()

        console.log('RESULT', insertedAssignment, assignmentInsertError)

        if (assignmentInsertError || !insertedAssignment) {
          console.error('[claimJob] assignment insert failed', assignmentInsertError, {
            payload: assignmentInsertPayload,
          })
          return { ok: false, error: assignmentInsertError?.message ?? 'Failed to create assignment record in database.' }
        }

        assignment = {
          ...provisionalAssignment,
          id: insertedAssignment.id as string,
          claimedAt: (insertedAssignment.assigned_at as string) ?? provisionalAssignment.claimedAt,
          status: ((insertedAssignment.status as Assignment['status']) ?? provisionalAssignment.status),
          objectionWindowClosesAt: (insertedAssignment.objection_window_closes_at as string) ?? provisionalAssignment.objectionWindowClosesAt,
          claimedSlot: normalizeJobTimeSlot(insertedAssignment.claimed_slot) ?? provisionalAssignment.claimedSlot,
        }

        const jobStatusUpdatePayload = {
          status: 'provisionally_assigned' as const,
          updated_at: new Date().toISOString(),
        }

        console.log('[claimJob] job update payload', {
          jobId: job.id,
          assignmentId: assignment.id,
          inspectorId: input.inspectorId,
          claimedSlot: assignment.claimedSlot,
          objectionWindowClosesAt: assignment.objectionWindowClosesAt,
          update: jobStatusUpdatePayload,
        })

        const { error: jobUpdateError } = await supabase
          .from('job_opportunities')
          .update(jobStatusUpdatePayload)
          .eq('id', job.id)

        if (jobUpdateError) {
          console.error('[claimJob] job status update failed', jobUpdateError, {
            payload: jobStatusUpdatePayload,
            jobId: job.id,
            assignmentId: assignment.id,
          })
          return { ok: false, error: jobUpdateError.message }
        }

        const jobStatusEventPayload = {
          job_id: job.id,
          actor_id: input.inspectorId,
          actor_role: 'inspector',
          from_status: job.status,
          to_status: 'provisionally_assigned',
          reason: 'Inspector claimed job from Live Board',
          created_at: new Date().toISOString(),
        }

        const { error: jobEventError } = await supabase
          .from('job_status_events')
          .insert(jobStatusEventPayload)

        if (jobEventError) {
          console.error('[claimJob] job status event insert failed', jobEventError, {
            payload: jobStatusEventPayload,
            assignmentId: assignment.id,
          })
        }
      }

      console.log('ASSIGNMENT CREATED', assignment)

      setAssignments(prev => {
        const updated = [...prev.filter(existing => existing.id !== assignment.id && existing.jobId !== assignment.jobId), assignment]
        writeLS(ASSIGNMENTS_KEY, updated)
        return updated
      })
      setJobs(prev => prev.map(j =>
        j.id === job.id ? { ...j, status: 'provisionally_assigned' as const } : j
      ))

      return { ok: true, value: assignment }
    } catch (err) {
      console.error('[claimJob] DB sync failed:', err)
      const message = err instanceof Error ? err.message : 'Unknown claim error'
      return { ok: false, error: message }
    }
  }, [jobs, assignments])

  // ─── sealSubmission ───────────────────────────────────────────────────────
  const sealSubmission = useCallback((
    projectId: string,
    currentSubmissionStatus: SubmissionStatus,
  ): StoreActionResult => {
    const result = canSealSubmission(currentSubmissionStatus)
    const governance = validateSealSubmissionRequest({
      submissionStatus: currentSubmissionStatus,
      hasOpenHold: currentSubmissionStatus === 'hold_open',
      hasTechnicalBlockers: currentSubmissionStatus === 'archived',
      evidenceCount: 1,
      sealed: currentSubmissionStatus === 'sealed',
      checklistPendingCount: 0,
    })
    if (!result.allowed || !governance.ok) {
      return {
        ok: false,
        error: result.reason ?? governance.blockers.map(issue => issue.message).join(' '),
      }
    }
    return { ok: true, value: undefined }
  }, [])

  // ─── exportPackage ────────────────────────────────────────────────────────
  const exportPackage = useCallback((
    projectId: string,
    guards: ExportGuards,
  ): StoreActionResult => {
    const governance = validatePackageExportRequest({
      sealed: guards.submissionStatus === 'sealed',
      hasTechnicalBlockers: guards.hasOpenDeficiencies,
      hasReadinessBlockers: !guards.hasAdminApproval,
      hasOpenHold: guards.submissionStatus === 'hold_open',
    })
    if (!governance.ok) {
      return { ok: false, error: governance.blockers.map(issue => issue.message).join(' ') }
    }
    return { ok: true, value: undefined }
  }, [])

  // ─── releasePayout ────────────────────────────────────────────────────────
  const releasePayout = useCallback((
    assignmentId: string,
    currentEscrowStatus: EscrowStatus,
  ): StoreActionResult => {
    const governance = validatePayoutRelease({
      escrowStatus: currentEscrowStatus,
      hasBlockingDispute: currentEscrowStatus === 'disputed',
      hasControlPlaneException: currentEscrowStatus === 'blocked',
    })
    if (!governance.ok) {
      void createDispute({
        jobId: assignmentId,
        assignmentId,
        openedById: assignmentId,
        openedByRole: 'system',
        reason: governance.blockers.map(issue => issue.message).join(' '),
        status: 'open',
        commercialBlock: true,
        resolutionNote: undefined,
        openedAt: new Date().toISOString(),
        resolvedAt: undefined,
        metadata: {
          source: 'store.releasePayout',
          escrowStatus: currentEscrowStatus,
        },
      })
      return { ok: false, error: governance.blockers.map(issue => issue.message).join(' ') }
    }
    void upsertPaymentDecision({
      jobId: assignmentId,
      assignmentId,
      paymentStatus: 'earned_pending_review',
      payoutStatus: 'released',
      baseFeeAmount: 0,
      holdPremiumAmount: 0,
      veroCommissionAmount: 0,
      blockedReason: undefined,
      decisionNote: 'Payout released through store guard.',
      decidedById: assignmentId,
      decidedAt: new Date().toISOString(),
      releasedAt: new Date().toISOString(),
      metadata: {
        source: 'store.releasePayout',
      },
    })
    return { ok: true, value: undefined }
  }, [])

  // ─── placeHoldPoint ───────────────────────────────────────────────────────
  const placeHoldPoint = useCallback(async (
    input: {
      jobId: string
      inspectorId: string
      builderId: string
      tier: DispatchTier
      reason: string
      deficiencyReason?: string
      checklistItemIds: string[]
      affectedItemSummaries?: string[]
      holdCategory: HoldCategory
      holdEligibleForOnSiteCorrection: boolean
      premiumRateAmount: number
      notes?: string
      relatedInspectionId?: string
    },
  ): Promise<StoreActionResult<HoldRecord>> => {
    const hold = await placeHold({
      jobId: input.jobId,
      inspectorId: input.inspectorId,
      builderId: input.builderId,
      dispatchTier: input.tier,
      checklistItemIds: input.checklistItemIds,
      affectedItemSummaries: input.affectedItemSummaries,
      reason: input.reason,
      deficiencyReason: input.deficiencyReason,
      holdCategory: input.holdCategory,
      holdEligibleForOnSiteCorrection: input.holdEligibleForOnSiteCorrection,
      premiumRateAmount: input.premiumRateAmount,
      notes: input.notes,
      relatedInspectionId: input.relatedInspectionId,
    })
    if (!hold) return { ok: false, error: 'Failed to place hold.' }

    // Transition job → on_hold
    await updateJobStatus(input.jobId, 'on_hold', input.inspectorId, 'inspector', `Hold placed: ${input.reason}`, 'in_progress')
    setJobs(prev => prev.map(j => j.id === input.jobId ? { ...j, status: 'on_hold' as const } : j))

    return { ok: true, value: hold }
  }, [])

  // ─── approveHoldPoint ─────────────────────────────────────────────────────
  const approveHoldPoint = useCallback(async (
    holdId: string, jobId: string, correctionWindowMinutes: number, builderNote?: string,
  ): Promise<StoreActionResult> => {
    const ok = await builderApproveHold(holdId, correctionWindowMinutes, builderNote)
    if (!ok) return { ok: false, error: 'Failed to approve hold.' }

    // Job stays on_hold until retention completes and inspector re-inspects
    return { ok: true, value: undefined }
  }, [])

  // ─── declineHoldPoint ─────────────────────────────────────────────────────
  const declineHoldPoint = useCallback(async (
    holdId: string, actorId: string, builderNote?: string,
  ): Promise<StoreActionResult> => {
    const ok = await builderDeclineHold(holdId, actorId, builderNote)
    if (!ok) return { ok: false, error: 'Failed to decline hold.' }

    // [C3] The RPC already set job to 'stopped' atomically
    const now = new Date().toISOString()
    setActiveRetention(prev => prev && prev.holdId === holdId ? {
      ...prev,
      status: 'cancelled',
      completedAt: prev.completedAt ?? now,
      updatedAt: now,
    } : prev)
    setJobs(prev => prev.map(j => {
      // We don't have the jobId directly, so check all on_hold jobs — the RPC handles it
      return j
    }))
    return { ok: true, value: undefined }
  }, [])

  // ─── getJobHolds ──────────────────────────────────────────────────────────
  const getJobHolds = useCallback(async (jobId: string): Promise<HoldRecord[]> => {
    return listHoldsForJob(jobId)
  }, [])

  // ─── startRetention ───────────────────────────────────────────────────────
  const startRetention = useCallback((
    holdId: string, jobId: string, inspectorId: string,
    builderId: string, tier: DispatchTier, hours: number,
  ) => {
    const now = new Date().toISOString()
    const rate = getFixedDispatchHoldBaseRate()
    const session: RetentionSession = {
      id: `ret-${Date.now().toString(36)}`,
      holdId, jobId, inspectorId, builderId,
      dispatchTier: tier,
      hourlyRate: rate,
      initialHours: hours,
      totalHoursBooked: hours,
      elapsedSeconds: 0,
      status: 'active',
      resolvedDefectIds: [],
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    }
    setActiveRetention(session)
    void persistRetentionSession(session, 'startRetention')
  }, [persistRetentionSession])

  // ─── extendRetention ──────────────────────────────────────────────────────
  const extendRetention = useCallback(() => {
    if (!activeRetention) return

    const nextSession: RetentionSession = {
      ...activeRetention,
      totalHoursBooked: activeRetention.totalHoursBooked + 1,
      status: 'extended',
      updatedAt: new Date().toISOString(),
    }

    setActiveRetention(nextSession)
    void persistRetentionSession(nextSession, 'extendRetention')
  }, [activeRetention, persistRetentionSession])

  // ─── completeRetention ────────────────────────────────────────────────────
  const completeRetention = useCallback((resolvedDefectIds: string[]) => {
    if (!activeRetention) return

    const now = new Date().toISOString()
    const nextSession: RetentionSession = {
      ...activeRetention,
      status: 'completed',
      resolvedDefectIds,
      completedAt: now,
      updatedAt: now,
    }

    setActiveRetention(nextSession)
    void persistRetentionSession(nextSession, 'completeRetention')
  }, [activeRetention, persistRetentionSession])

  const storeValue: StoreValue = {
    projects,
    jobs,
    applications,
    assignments,
    addJob,
    addProject,
    applyForJob,
    approveApplication,
    declineApplication,
    getJobApplications:   (jobId) => applications.filter(a => a.jobId === jobId && a.status === 'pending'),
    getBuilderApplicants: (builderId) => applications.filter(a => a.builderId === builderId && a.status === 'pending'),
    getOpenJobs:          () => jobs
      .filter(j => j.status === 'live')
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()),
    claimJob,
    objectAssignment:     (assignmentId, reason, note) => {
      void objectJobAssignment(assignmentId, actorId, reason, note).then(async ok => {
        if (!ok) return
        const assignment = assignments.find(existing => existing.id === assignmentId)
        if (!assignment) return
        const refreshed = await getDbAssignmentForJob(assignment.jobId)
        if (!refreshed) return
        setAssignments(current => current.map(existing =>
          existing.id === assignmentId
            ? {
                ...existing,
                status: refreshed.status as Assignment['status'],
                objectionState: refreshed.objectionState ?? 'pending_review',
                objectionReason: refreshed.objectionReason as Assignment['objectionReason'],
                objectionNote: refreshed.objectionNote,
              }
            : existing,
        ))
      })
    },
    confirmAssignment:    (assignmentId) => {
      void confirmJobAssignment(assignmentId, actorId).then(async ok => {
        if (!ok) return
        const assignment = assignments.find(existing => existing.id === assignmentId)
        if (!assignment) return
        const refreshed = await getDbAssignmentForJob(assignment.jobId)
        if (!refreshed) return
        setAssignments(current => current.map(existing =>
          existing.id === assignmentId
            ? { ...existing, status: refreshed.status as Assignment['status'], objectionState: refreshed.objectionState ?? 'overruled' }
            : existing,
        ))
      })
    },
    invalidateAssignment: (assignmentId, adminNote) => {
      void invalidateJobAssignment(assignmentId, actorId, adminNote).then(async ok => {
        if (!ok) return
        const assignment = assignments.find(existing => existing.id === assignmentId)
        if (!assignment) return
        const refreshed = await getDbAssignmentForJob(assignment.jobId)
        if (!refreshed) return
        setAssignments(current => current.map(existing =>
          existing.id === assignmentId
            ? { ...existing, status: refreshed.status as Assignment['status'], objectionState: refreshed.objectionState ?? 'overruled' }
            : existing,
        ))
      })
    },
    getJobAssignment:     (jobId) => assignments.find(a => a.jobId === jobId),
    sealSubmission,
    exportPackage,
    releasePayout,
    placeHoldPoint,
    approveHoldPoint,
    declineHoldPoint,
    getJobHolds,
    activeRetention,
    startRetention,
    extendRetention,
    completeRetention,
  }

  return <StoreContext.Provider value={storeValue}>{children}</StoreContext.Provider>
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore must be used within a StoreProvider')
  return context
}
