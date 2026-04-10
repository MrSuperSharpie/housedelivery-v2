/**
 * Job marketplace — DB access layer.
 *
 * Tables: job_opportunities, job_applications, job_assignments, job_status_events
 *
 * Pattern mirrors src/lib/supabase/builders.ts.
 */

import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
import type {
  PermitFamily,
  InspectorDiscipline,
  Region,
  DispatchTier,
  JobTimeSlot,
  EscrowStatus,
} from '@/lib/types'
import type { GovernanceIssue, GovernanceValidationStatus } from '@/lib/governance'
import { validateJobPostingGovernance } from '@/lib/governance'
import {
  canObjectAssignment,
  normalizeAssignmentStatus,
  normalizeAssignmentUiSnapshot,
} from '@/lib/governance/assignments'
import {
  appendGovernanceAuditEvent,
  upsertJobValidationResult,
} from '@/lib/supabase/governance'
import { getDbProjectReadiness } from '@/lib/supabase/projects'

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobStatus =
  | 'pending_validation'
  | 'live'
  | 'provisionally_assigned'
  | 'confirmed'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'stopped'               // terminal: builder declined a hold [C3]

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'

// Assignment lifecycle status — matches CHECK constraint added in migration
// 20260325000002_assignment_lifecycle.sql
export type AssignmentLifecycleStatus =
  | 'provisional'
  | 'confirmed'
  | 'cancelled'
  | 'invalidated'
  | 'completed'

export interface JobOpportunityRow {
  id: string
  projectId?: string
  builderId: string
  builderName: string
  projectName: string
  address: string
  city: string
  permitFamily: PermitFamily
  permitNumber?: string
  projectType?: string
  stage: number
  stageName: string
  dispatchTier: DispatchTier
  offeredRate: number
  estimatedDurationMinutes: number
  requiredDiscipline: InspectorDiscipline
  region: Region
  status: JobStatus
  notes?: string
  availableSlots?: JobTimeSlot[]
  builderOnboardingStatus?: string
  validationStatus?: GovernanceValidationStatus
  validationBlockers?: GovernanceIssue[]
  escrowAuthorized?: boolean
  requestedAt: string
  scheduledFor?: string
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

export interface JobApplicationRow {
  id: string
  jobId: string
  inspectorId: string
  status: ApplicationStatus
  appliedAt: string
  reviewedAt?: string
  reviewedBy?: string
  note?: string
}

export interface JobAssignmentRow {
  id: string
  jobId: string
  inspectorId: string
  assignedBy: string
  assignedAt: string
  // Lifecycle fields added by migration 20260325000002_assignment_lifecycle.sql
  status: AssignmentLifecycleStatus
  objectionWindowClosesAt?: string
  claimedSlot?: JobTimeSlot
  objectionReason?: string
  objectionNote?: string
  objectionState?: 'none' | 'pending_review' | 'sustained' | 'overruled'
  objectedAt?: string
  confirmedAt?: string
  adminNote?: string
  cancelledAt?: string
  invalidatedAt?: string
  updatedAt: string
  // Original escrow fields
  startedAt?: string
  completedAt?: string
  escrowAmount: number
  escrowStatus: EscrowStatus
  payoutReleasedAt?: string
}

function toJobTimeSlot(value: unknown): JobTimeSlot | undefined {
  if (!value || typeof value !== 'object') return undefined
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
    return undefined
  }

  return {
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    flexible: slot.flexible === true,
  }
}

function toJobTimeSlots(value: unknown): JobTimeSlot[] {
  if (!Array.isArray(value)) return []
  return value
    .map(toJobTimeSlot)
    .filter((slot): slot is JobTimeSlot => Boolean(slot))
}

export interface JobStatusEvent {
  id: string
  jobId: string
  actorId: string
  actorRole?: string
  fromStatus?: string
  toStatus?: string
  reason?: string
  createdAt: string
}

export interface ClaimJobRpcResult {
  ok: boolean
  error?: string
  assignment?: JobAssignmentRow
}

type DbErrorShape = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

function formatDbError(error: unknown): DbErrorShape {
  if (!error || typeof error !== 'object') return {}
  const value = error as Record<string, unknown>
  return {
    code: typeof value.code === 'string' ? value.code : undefined,
    message: typeof value.message === 'string' ? value.message : undefined,
    details: typeof value.details === 'string' ? value.details : undefined,
    hint: typeof value.hint === 'string' ? value.hint : undefined,
  }
}

function isMissingColumnError(error: unknown): boolean {
  const formatted = formatDbError(error)
  const haystack = [
    formatted.message,
    formatted.details,
    formatted.hint,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes('column') && (
    haystack.includes('does not exist')
    || haystack.includes('could not find')
    || haystack.includes('schema cache')
  )
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToJob(row: Record<string, unknown>): JobOpportunityRow {
  return {
    id:                       row.id as string,
    projectId:                (row.project_id as string) ?? undefined,
    builderId:                row.builder_id as string,
    builderName:              (row.builder_name as string) ?? '',
    projectName:              row.project_name as string,
    address:                  row.address as string,
    city:                     (row.city as string) ?? 'Vancouver',
    permitFamily:             row.permit_family as PermitFamily,
    permitNumber:             (row.permit_number as string) ?? undefined,
    projectType:              (row.project_type as string) ?? undefined,
    stage:                    row.stage as number,
    stageName:                row.stage_name as string,
    dispatchTier:             (row.dispatch_tier as DispatchTier) ?? 'standard',
    offeredRate:              row.offered_rate as number,
    estimatedDurationMinutes: (row.estimated_duration_minutes as number) ?? 120,
    requiredDiscipline:       row.required_discipline as InspectorDiscipline,
    region:                   row.region as Region,
    status:                   row.status as JobStatus,
    notes:                    (row.notes as string) ?? undefined,
    availableSlots:           toJobTimeSlots(row.available_slots),
    builderOnboardingStatus:  (row.builder_onboarding_status as string) ?? undefined,
    validationStatus:         (row.validation_status as GovernanceValidationStatus) ?? undefined,
    validationBlockers:       (row.validation_blockers as GovernanceIssue[]) ?? [],
    escrowAuthorized:         row.escrow_authorized === true,
    requestedAt:              row.requested_at as string,
    scheduledFor:             (row.scheduled_for as string) ?? undefined,
    publishedAt:              (row.published_at as string) ?? undefined,
    createdAt:                row.created_at as string,
    updatedAt:                row.updated_at as string,
  }
}

function rowToApplication(row: Record<string, unknown>): JobApplicationRow {
  return {
    id:          row.id as string,
    jobId:       row.job_id as string,
    inspectorId: row.inspector_id as string,
    status:      row.status as ApplicationStatus,
    appliedAt:   row.applied_at as string,
    reviewedAt:  (row.reviewed_at as string) ?? undefined,
    reviewedBy:  (row.reviewed_by as string) ?? undefined,
    note:        (row.note as string) ?? undefined,
  }
}

function rowToAssignment(row: Record<string, unknown>): JobAssignmentRow {
  return {
    id:                      row.id as string,
    jobId:                   row.job_id as string,
    inspectorId:             row.inspector_id as string,
    assignedBy:              row.assigned_by as string,
    assignedAt:              (row.assigned_at as string) ?? (row.created_at as string),
    status:                  (row.status as AssignmentLifecycleStatus) ?? 'provisional',
    objectionWindowClosesAt: (row.objection_window_closes_at as string) ?? undefined,
    claimedSlot:             toJobTimeSlot(row.claimed_slot),
    objectionReason:         (row.objection_reason as string) ?? undefined,
    objectionNote:           (row.objection_note as string) ?? undefined,
    objectionState:          ((row.objection_state as JobAssignmentRow['objectionState']) ?? undefined),
    objectedAt:              (row.objected_at as string) ?? undefined,
    confirmedAt:             (row.confirmed_at as string) ?? undefined,
    adminNote:               (row.admin_note as string) ?? undefined,
    cancelledAt:             (row.cancelled_at as string) ?? undefined,
    invalidatedAt:           (row.invalidated_at as string) ?? undefined,
    updatedAt:               (row.updated_at as string) ?? new Date().toISOString(),
    startedAt:               (row.started_at as string) ?? undefined,
    completedAt:             (row.completed_at as string) ?? undefined,
    escrowAmount:            row.escrow_amount as number,
    escrowStatus:            row.escrow_status as EscrowStatus,
    payoutReleasedAt:        (row.payout_released_at as string) ?? undefined,
  }
}

async function reconcileAssignmentRow(row: JobAssignmentRow): Promise<JobAssignmentRow> {
  const snapshot = normalizeAssignmentUiSnapshot({
    status: row.status,
    objectionState: row.objectionState,
    objectionWindowClosesAt: row.objectionWindowClosesAt,
  })

  if (!snapshot.autoConfirm) {
    return {
      ...row,
      status: snapshot.status,
      objectionState: snapshot.objectionState,
    }
  }

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('job_assignments')
    .update({
      status: 'confirmed',
      confirmed_at: now,
      objection_state: snapshot.objectionState,
      updated_at: now,
    })
    .eq('id', row.id)
    .eq('status', 'provisional')
    .select('*')
    .maybeSingle()

  if (error) {
    console.error(
      'reconcileAssignmentRow failed:',
      '\n  message :', error.message,
      '\n  code    :', error.code,
      '\n  details :', error.details,
      '\n  hint    :', error.hint,
      '\n  row.id  :', row.id,
      '\n  row.status:', row.status,
      '\n  full    :', JSON.stringify(error),
    )
    return {
      ...row,
      status: snapshot.status,
      objectionState: snapshot.objectionState,
    }
  }

  if (data) {
    await updateJobStatus(
      row.jobId,
      'confirmed',
      row.inspectorId,
      'system',
      'Objection window closed without a pending objection.',
      'provisionally_assigned',
    )

    await appendGovernanceAuditEvent({
      entityType: 'assignment',
      entityId: row.id,
      action: 'assignment.confirmed',
      actorId: row.inspectorId,
      actorRole: 'system',
      ruleIds: ['R-020'],
      blockerType: 'technical',
      reason: 'Provisional assignment auto-confirmed when the objection window elapsed.',
      beforeState: { status: 'provisional' },
      afterState: { status: 'confirmed' },
      metadata: { jobId: row.jobId },
    })

    return rowToAssignment(data as Record<string, unknown>)
  }

  return {
    ...row,
    status: snapshot.status,
    objectionState: snapshot.objectionState,
  }
}

function rowToStatusEvent(row: Record<string, unknown>): JobStatusEvent {
  return {
    id:         row.id as string,
    jobId:      row.job_id as string,
    actorId:    row.actor_id as string,
    actorRole:  (row.actor_role as string) ?? undefined,
    fromStatus: (row.from_status as string) ?? undefined,
    toStatus:   (row.to_status as string) ?? undefined,
    reason:     (row.reason as string) ?? undefined,
    createdAt:  row.created_at as string,
  }
}

// ─── Job opportunities ────────────────────────────────────────────────────────

export async function listOpenJobOpportunities(): Promise<JobOpportunityRow[]> {
  const { data, error } = await supabase
    .from('job_opportunities')
    .select('*')
    .eq('status', 'live')
    .eq('validation_status', 'validated')
    .order('created_at', { ascending: false })

  if (error && isMissingColumnError(error)) {
    const legacyQuery = await supabase
      .from('job_opportunities')
      .select('*')
      .eq('status', 'live')
      .order('created_at', { ascending: false })

    if (legacyQuery.error || !legacyQuery.data) return []
    return (legacyQuery.data as Record<string, unknown>[]).map(rowToJob)
  }

  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToJob)
}

export async function listAllJobOpportunities(): Promise<JobOpportunityRow[]> {
  const { data, error } = await supabase
    .from('job_opportunities')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToJob)
}

export async function listJobsByBuilder(builderId: string): Promise<JobOpportunityRow[]> {
  const { data, error } = await supabase
    .from('job_opportunities')
    .select('*')
    .eq('builder_id', builderId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToJob)
}

export async function insertJobOpportunity(
  job: Omit<JobOpportunityRow, 'id' | 'createdAt' | 'updatedAt' | 'requestedAt'>
): Promise<string | null> {
  const now = new Date().toISOString()
  const projectReadiness = job.projectId
    ? await getDbProjectReadiness(job.projectId)
    : null
  const governance = validateJobPostingGovernance({
    jobId: undefined,
    projectId: job.projectId,
    builderId: job.builderId,
    builderStatus: (job.builderOnboardingStatus as JobOpportunityRow['builderOnboardingStatus']) ?? 'draft',
    projectName: job.projectName,
    address: job.address,
    city: job.city,
    permitFamily: job.permitFamily,
    permitNumber: job.permitNumber,
    requiredDiscipline: job.requiredDiscipline,
    region: job.region,
    stage: job.stage,
    stageName: job.stageName,
    projectComplete: projectReadiness ? projectReadiness.ready : Boolean(job.projectName && job.address && job.city && job.permitNumber),
    dependencySealed: true,
    escrowAuthorized: job.escrowAuthorized === true,
  })

  const finalStatus = governance.ok && job.status === 'live' ? 'live' : 'pending_validation'
  const validationStatus: GovernanceValidationStatus = governance.ok ? 'validated' : 'blocked'

  const fullInsertPayload = {
    project_id:                  job.projectId ?? null,
    builder_id:                 job.builderId,
    builder_name:               job.builderName,
    project_name:               job.projectName,
    address:                    job.address,
    city:                       job.city,
    permit_family:              job.permitFamily,
    permit_number:              job.permitNumber ?? null,
    project_type:               job.projectType ?? null,
    stage:                      job.stage,
    stage_name:                 job.stageName,
    dispatch_tier:              job.dispatchTier,
    offered_rate:               job.offeredRate,
    estimated_duration_minutes: job.estimatedDurationMinutes,
    required_discipline:        job.requiredDiscipline,
    region:                     job.region,
    status:                     finalStatus,
    notes:                      job.notes ?? null,
    available_slots:            job.availableSlots ?? [],
    builder_onboarding_status:  job.builderOnboardingStatus ?? null,
    validation_status:          validationStatus,
    validation_blockers:        governance.blockers,
    escrow_authorized:          job.escrowAuthorized === true,
    validation_completed_at:    now,
    published_at:               finalStatus === 'live' ? now : null,
    scheduled_for:              job.scheduledFor ?? null,
    requested_at:               now,
    created_at:                 now,
    updated_at:                 now,
  }

  const legacyInsertPayload = {
    builder_id:                 job.builderId,
    builder_name:               job.builderName,
    project_name:               job.projectName,
    address:                    job.address,
    city:                       job.city,
    permit_family:              job.permitFamily,
    permit_number:              job.permitNumber ?? null,
    project_type:               job.projectType ?? null,
    stage:                      job.stage,
    stage_name:                 job.stageName,
    dispatch_tier:              job.dispatchTier,
    offered_rate:               job.offeredRate,
    estimated_duration_minutes: job.estimatedDurationMinutes,
    required_discipline:        job.requiredDiscipline,
    region:                     job.region,
    status:                     finalStatus,
    notes:                      job.notes ?? null,
    available_slots:            job.availableSlots ?? [],
    scheduled_for:              job.scheduledFor ?? null,
    requested_at:               now,
    created_at:                 now,
    updated_at:                 now,
  }

  let { data, error } = await supabase
    .from('job_opportunities')
    .insert(fullInsertPayload)
    .select('id')
    .single()

  if (error && isMissingColumnError(error)) {
    console.warn('insertJobOpportunity: retrying with legacy payload', formatDbError(error))
    const legacyInsert = await supabase
      .from('job_opportunities')
      .insert(legacyInsertPayload)
      .select('id')
      .single()

    data = legacyInsert.data
    error = legacyInsert.error
  }

  if (error || !data) {
    console.error('insertJobOpportunity:', formatDbError(error))
    return null
  }
  const insertedId = (data as Record<string, unknown>).id as string

  await upsertJobValidationResult({
    jobId: insertedId,
    projectId: job.projectId,
    builderId: job.builderId,
    validationStatus,
    blockers: governance.blockers,
    warnings: governance.warnings,
    validatorVersion: '2026-04-07',
    validatedAt: now,
    metadata: {
      permitFamily: job.permitFamily,
      requiredDiscipline: job.requiredDiscipline,
      region: job.region,
      finalStatus,
    },
  })

  await appendGovernanceAuditEvent({
    entityType: 'job',
    entityId: insertedId,
    action: governance.ok ? 'job.validated' : 'job.blocked',
    actorId: job.builderId,
    actorRole: 'builder',
    ruleIds: governance.blockers.map(issue => issue.ruleId),
    blockerType: governance.blockers[0]?.blockerType,
    reason: governance.ok ? 'Job validation passed.' : 'Job validation produced blockers.',
    beforeState: { requestedStatus: job.status },
    afterState: {
      status: finalStatus,
      validationStatus,
      blockerCount: governance.blockers.length,
    },
    metadata: {
      jobId: insertedId,
      projectId: job.projectId,
      blockers: governance.blockers,
      warnings: governance.warnings,
    },
  })

  return insertedId
}

export async function updateJobStatus(
  id: string,
  status: JobStatus,
  actorId: string,
  actorRole?: string,
  reason?: string,
  previousStatus?: string
): Promise<boolean> {
  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('job_opportunities')
    .update({ status, updated_at: now })
    .eq('id', id)

  if (updateError) {
    console.error('updateJobStatus:', updateError)
    return false
  }

  const { error: eventError } = await supabase.from('job_status_events').insert({
    job_id:      id,
    actor_id:    actorId,
    actor_role:  actorRole ?? null,
    from_status: previousStatus ?? null,
    to_status:   status,
    reason:      reason ?? null,
    created_at:  now,
  })

  if (eventError) console.error('updateJobStatus (event):', eventError)
  return !updateError
}

// ─── Job applications ─────────────────────────────────────────────────────────

export async function listApplicationsForJob(jobId: string): Promise<JobApplicationRow[]> {
  const { data, error } = await supabase
    .from('job_applications')
    .select('*')
    .eq('job_id', jobId)
    .order('applied_at', { ascending: false })

  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToApplication)
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
  reviewedBy: string,
  note?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('job_applications')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      note: note ?? null,
    })
    .eq('id', id)

  if (error) console.error('updateApplicationStatus:', error)
  return !error
}

// ─── Job assignments ──────────────────────────────────────────────────────────

export async function listAssignmentsForInspector(
  inspectorId: string
): Promise<JobAssignmentRow[]> {
  const { data, error } = await supabase
    .from('job_assignments')
    .select('*')
    .eq('inspector_id', inspectorId)
    .order('assigned_at', { ascending: false })

  if (error || !data) return []
  const rows = (data as Record<string, unknown>[]).map(rowToAssignment)
  return Promise.all(rows.map(reconcileAssignmentRow))
}

export async function listAssignmentsForBuilder(
  builderId: string,
): Promise<JobAssignmentRow[]> {
  const { data: jobs, error: jobError } = await supabase
    .from('job_opportunities')
    .select('id')
    .eq('builder_id', builderId)

  if (jobError || !jobs || jobs.length === 0) {
    if (jobError) console.error('listAssignmentsForBuilder:', jobError)
    return []
  }

  const jobIds = (jobs as Array<{ id: string }>).map(job => job.id)
  const { data, error } = await supabase
    .from('job_assignments')
    .select('*')
    .in('job_id', jobIds)
    .order('assigned_at', { ascending: false })

  if (error || !data) {
    if (error) console.error('listAssignmentsForBuilder:', error)
    return []
  }

  const rows = (data as Record<string, unknown>[]).map(rowToAssignment)
  return Promise.all(rows.map(reconcileAssignmentRow))
}

export async function getAssignmentForJob(jobId: string): Promise<JobAssignmentRow | null> {
  const { data, error } = await supabase
    .from('job_assignments')
    .select('*')
    .eq('job_id', jobId)
    .maybeSingle()

  if (error || !data) return null
  return reconcileAssignmentRow(rowToAssignment(data as Record<string, unknown>))
}

export async function getAssignmentById(assignmentId: string): Promise<JobAssignmentRow | null> {
  const { data, error } = await supabase
    .from('job_assignments')
    .select('*')
    .eq('id', assignmentId)
    .maybeSingle()

  if (error || !data) return null
  return reconcileAssignmentRow(rowToAssignment(data as Record<string, unknown>))
}

export async function insertJobAssignment(
  assignment: Omit<JobAssignmentRow, 'id' | 'assignedAt' | 'status' | 'updatedAt'>
): Promise<JobAssignmentRow | null> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('job_assignments')
    .insert({
      job_id:             assignment.jobId,
      inspector_id:       assignment.inspectorId,
      assigned_by:        assignment.assignedBy,
      assigned_at:        now,
      status:             'provisional',
      objection_window_closes_at: assignment.objectionWindowClosesAt ?? null,
      claimed_slot:       assignment.claimedSlot ?? null,
      escrow_amount:      assignment.escrowAmount,
      escrow_status:      assignment.escrowStatus,
      started_at:         assignment.startedAt ?? null,
      completed_at:       assignment.completedAt ?? null,
      payout_released_at: assignment.payoutReleasedAt ?? null,
      updated_at:         now,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('insertJobAssignment:', error)
    return null
  }

  return rowToAssignment(data as Record<string, unknown>)
}

export async function claimLiveJobIfEligible(
  jobId: string,
  claimedSlot?: JobTimeSlot
): Promise<ClaimJobRpcResult> {
  const { data, error } = await supabase.rpc('claim_live_job_if_eligible', {
    p_job_id: jobId,
    p_claimed_slot: claimedSlot ?? null,
  })

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Failed to claim this job.' }
  }

  const payload = data as Record<string, unknown>
  if (payload.ok !== true) {
    return {
      ok: false,
      error: (payload.error as string) ?? 'Failed to claim this job.',
    }
  }

  const assignmentPayload = payload.assignment
  if (!assignmentPayload || typeof assignmentPayload !== 'object') {
    return { ok: false, error: 'Assignment payload missing from claim response.' }
  }

  return {
    ok: true,
    assignment: rowToAssignment(assignmentPayload as Record<string, unknown>),
  }
}

// ─── updateAssignmentStatus ───────────────────────────────────────────────────
// Handles the three assignment lifecycle transitions:
//
//   objectAssignment:     provisional → objected
//     Requires: objectionReason, objectionNote
//     Sets:     objected_at, objection_reason, objection_note
//
//   confirmAssignment:    provisional → confirmed
//     Sets:     confirmed_at
//
//   invalidateAssignment: any → invalidated  (admin only)
//     Requires: adminNote
//     Sets:     invalidated_at, admin_note
//
// Also writes a job_status_events audit row for Blueprint Rule 10.
export async function updateAssignmentStatus(
  assignmentId: string,
  jobId: string,
  newStatus: AssignmentLifecycleStatus,
  actorId: string,
  actorRole: 'builder' | 'admin',
  options?: {
    objectionReason?: string
    objectionNote?:   string
    adminNote?:       string
    previousStatus?:  string
  }
): Promise<boolean> {
  const now = new Date().toISOString()
  const normalizedNextStatus = normalizeAssignmentStatus(newStatus)

  const update: Record<string, unknown> = {
    status:     normalizedNextStatus,
    updated_at: now,
  }

  if (options?.objectionReason || options?.objectionNote) {
    update.objected_at       = now
    update.objection_reason  = options?.objectionReason ?? null
    update.objection_note    = options?.objectionNote ?? null
    update.objection_state   = 'pending_review'
  }
  if (normalizedNextStatus === 'confirmed') {
    update.confirmed_at = now
    update.objection_state = options?.objectionReason ? 'overruled' : (options?.previousStatus ? 'overruled' : 'none')
  }
  if (normalizedNextStatus === 'cancelled') {
    update.cancelled_at = now
    update.objection_state = 'sustained'
    update.admin_note = options?.adminNote ?? null
  }
  if (normalizedNextStatus === 'invalidated') {
    update.invalidated_at = now
    update.admin_note     = options?.adminNote ?? null
    update.objection_state = 'overruled'
  }
  if (normalizedNextStatus === 'completed') {
    update.completed_at = now
  }

  const { error: updateError } = await supabase
    .from('job_assignments')
    .update(update)
    .eq('id', assignmentId)

  if (updateError) {
    console.error('updateAssignmentStatus:', updateError)
    return false
  }

  // Blueprint Rule 10: immutable audit event for every assignment decision
  const { error: eventError } = await supabase.from('job_status_events').insert({
    job_id:      jobId,
    actor_id:    actorId,
    actor_role:  actorRole,
    from_status: options?.previousStatus ?? null,
    to_status:   `assignment_${normalizedNextStatus}`,
    reason:      options?.objectionReason ?? options?.adminNote ?? null,
    created_at:  now,
  })

  if (eventError) console.error('updateAssignmentStatus (event):', eventError)

  await appendGovernanceAuditEvent({
    entityType: 'assignment',
    entityId: assignmentId,
    action: `assignment.${normalizedNextStatus}`,
    actorId,
    actorRole,
    ruleIds: ['R-021', 'R-022'],
    blockerType: 'technical',
    reason: options?.objectionReason ?? options?.adminNote ?? `Assignment transitioned to ${normalizedNextStatus}.`,
    beforeState: {
      status: options?.previousStatus ?? null,
    },
    afterState: {
      status: normalizedNextStatus,
      objectionState: update.objection_state ?? null,
    },
    metadata: {
      jobId,
      objectionNote: options?.objectionNote ?? null,
    },
  })
  return !updateError
}

export async function objectJobAssignment(
  assignmentId: string,
  actorId: string,
  reason: string,
  note: string,
): Promise<boolean> {
  const assignment = await getAssignmentById(assignmentId)
  if (!assignment) return false
  if (!canObjectAssignment({
    status: assignment.status,
    objectionWindowClosesAt: assignment.objectionWindowClosesAt,
  })) {
    return false
  }

  const ok = await updateAssignmentStatus(
    assignmentId,
    assignment.jobId,
    'provisional',
    actorId,
    'builder',
    {
      objectionReason: reason,
      objectionNote: note,
      previousStatus: assignment.status,
    },
  )

  if (ok) {
    await appendGovernanceAuditEvent({
      entityType: 'assignment',
      entityId: assignmentId,
      action: 'assignment.objection_filed',
      actorId,
      actorRole: 'builder',
      ruleIds: ['R-021'],
      blockerType: 'technical',
      reason: reason,
      beforeState: {
        status: assignment.status,
      },
      afterState: {
        status: 'provisional',
        objectionState: 'pending_review',
      },
      metadata: {
        note,
        jobId: assignment.jobId,
      },
    })
  }

  return ok
}

export async function confirmJobAssignment(
  assignmentId: string,
  actorId: string,
  actorRole: 'builder' | 'admin' = 'admin',
  adminNote?: string,
): Promise<boolean> {
  const assignment = await getAssignmentById(assignmentId)
  if (!assignment) return false

  const ok = await updateAssignmentStatus(
    assignmentId,
    assignment.jobId,
    'confirmed',
    actorId,
    actorRole,
    {
      adminNote,
      previousStatus: assignment.status,
      objectionReason: assignment.objectionState === 'pending_review' ? 'admin_confirmed' : undefined,
    },
  )

  if (ok) {
    await updateJobStatus(
      assignment.jobId,
      'confirmed',
      actorId,
      actorRole,
      adminNote ?? 'Assignment confirmed.',
      'provisionally_assigned',
    )
  }

  return ok
}

export async function cancelJobAssignment(
  assignmentId: string,
  actorId: string,
  adminNote?: string,
): Promise<boolean> {
  const assignment = await getAssignmentById(assignmentId)
  if (!assignment) return false

  const ok = await updateAssignmentStatus(
    assignmentId,
    assignment.jobId,
    'cancelled',
    actorId,
    'admin',
    {
      adminNote,
      previousStatus: assignment.status,
    },
  )

  if (ok) {
    await updateJobStatus(
      assignment.jobId,
      'live',
      actorId,
      'admin',
      adminNote ?? 'Assignment cancelled and job reopened.',
      'provisionally_assigned',
    )
  }

  return ok
}

export async function invalidateJobAssignment(
  assignmentId: string,
  actorId: string,
  adminNote: string,
): Promise<boolean> {
  const assignment = await getAssignmentById(assignmentId)
  if (!assignment) return false

  return updateAssignmentStatus(
    assignmentId,
    assignment.jobId,
    'invalidated',
    actorId,
    'admin',
    {
      adminNote,
      previousStatus: assignment.status,
    },
  )
}

export async function completeJobAssignment(
  assignmentId: string,
  actorId: string,
): Promise<boolean> {
  const assignment = await getAssignmentById(assignmentId)
  if (!assignment) return false

  return updateAssignmentStatus(
    assignmentId,
    assignment.jobId,
    'completed',
    actorId,
    'admin',
    {
      previousStatus: assignment.status,
    },
  )
}

export async function updateEscrowStatus(
  jobId: string,
  escrowStatus: EscrowStatus,
  payoutReleasedAt?: string
): Promise<boolean> {
  const update: Record<string, unknown> = { escrow_status: escrowStatus }
  if (payoutReleasedAt) update.payout_released_at = payoutReleasedAt

  const { error } = await supabase
    .from('job_assignments')
    .update(update)
    .eq('job_id', jobId)

  if (error) console.error('updateEscrowStatus:', error)
  return !error
}

// ─── Job status events ────────────────────────────────────────────────────────

export async function listStatusEventsForJob(jobId: string): Promise<JobStatusEvent[]> {
  const { data, error } = await supabase
    .from('job_status_events')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToStatusEvent)
}
