import { createClient } from '@/lib/supabase/client'
import type {
  DispatchTier,
  HoldCategory,
  HoldEvidenceRole,
  HoldEvidenceType,
  HoldPremiumRateType,
  HoldRecord,
  HoldResolution,
  RetentionSession,
  RetentionSessionStatus,
} from '@/lib/types'
import { validateHoldResolution, validateOutcomeSelection } from '@/lib/governance'
import { appendGovernanceAuditEvent } from '@/lib/supabase/governance'
import {
  buildHoldLifecycleEvents,
  calculateHoldPricing,
  canAddHoldEvidence,
  canBuilderRespondToHold,
  canPerformHoldAction,
  canInspectorCreateHold,
  canResolveHold,
  getHoldResolutionStatus,
  isHoldOpenStatus,
  normalizeHoldStatus,
} from '@/lib/holds/workflow'

const supabase = createClient()
const STORAGE_BUCKET = 'inspection-evidence'

type Row = Record<string, unknown>

const ACTIVE_RETENTION_STATUSES: RetentionSessionStatus[] = [
  'pending_approval',
  'active',
  'extended',
]

const TIER_WINDOW_MINUTES: Record<DispatchTier, number> = {
  standard: 120,
  priority: 90,
  emergency: 60,
}

export interface HoldTimelineEvent {
  id: string
  holdId: string
  jobId: string
  eventType: string
  actorId?: string
  actorRole: 'inspector' | 'builder' | 'admin' | 'system'
  note?: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface HoldEvidenceRecord {
  id: string
  holdId: string
  jobId: string
  checklistItemId?: string
  evidenceRole: HoldEvidenceRole
  evidenceType: HoldEvidenceType
  fileName?: string
  mimeType?: string
  fileSize?: number
  storagePath?: string
  noteText?: string
  captureGeo: Record<string, unknown>
  capturedAt?: string
  createdByUserId: string
  createdAt: string
  updatedAt: string
}

export interface HoldDetail {
  hold: HoldRecord
  events: HoldTimelineEvent[]
  evidence: HoldEvidenceRecord[]
  retentionSession: RetentionSession | null
}

export interface PlaceHoldInput {
  jobId: string
  inspectorId: string
  builderId: string
  dispatchTier: DispatchTier
  checklistItemIds: string[]
  affectedItemSummaries?: string[]
  reason: string
  deficiencyReason?: string
  holdCategory: HoldCategory
  holdEligibleForOnSiteCorrection: boolean
  estimatedCorrectionMinutes: number
  premiumRateType: HoldPremiumRateType
  premiumRateAmount: number
  holdCapAmount: number
  notes?: string
  relatedInspectionId?: string
  linkedCorrectionEvidenceIds?: string[]
}

export interface HoldEvidenceInput {
  holdId: string
  jobId: string
  createdByUserId: string
  evidenceRole: HoldEvidenceRole
  evidenceType: HoldEvidenceType
  checklistItemId?: string
  file?: File
  noteText?: string
  captureGeo?: Record<string, unknown>
  capturedAt?: string
}

export interface ResolveHoldInput {
  holdId: string
  actorId: string
  actorRole: 'inspector' | 'admin'
  resolution: HoldResolution
  technicalResolved: boolean
  resolutionNotes: string
  linkedCorrectionEvidenceIds?: string[]
  elapsedSeconds?: number
}

interface AuthenticatedHoldActor {
  id: string
  role: 'inspector' | 'builder' | 'admin' | 'system' | 'unknown'
}

function computeExpiresAt(
  placedAt: Date,
  tier: DispatchTier,
  estimatedCorrectionMinutes?: number,
): string {
  const windowMinutes = Math.max(
    30,
    Math.min(
      estimatedCorrectionMinutes ?? TIER_WINDOW_MINUTES[tier],
      TIER_WINDOW_MINUTES[tier],
    ),
  )
  return new Date(placedAt.getTime() + windowMinutes * 60 * 1000).toISOString()
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string')
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function toNumber(value: unknown, fallback = 0): number {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

function createRuntimeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_')
}

function deriveActorRoleFromMetadata(user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }): AuthenticatedHoldActor['role'] {
  const appRole = user.app_metadata?.role
  const userRole = user.user_metadata?.role
  const role = typeof appRole === 'string' ? appRole : typeof userRole === 'string' ? userRole : ''
  if (role === 'admin' || role === 'builder' || role === 'inspector') return role
  return 'unknown'
}

async function getAuthenticatedHoldActor(): Promise<AuthenticatedHoldActor | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    if (error) console.error('getAuthenticatedHoldActor:', error)
    return null
  }

  return {
    id: user.id,
    role: deriveActorRoleFromMetadata(user),
  }
}

function isAuthorizedParticipant(actor: AuthenticatedHoldActor, hold: HoldRecord, expected: 'inspector' | 'builder' | 'admin'): boolean {
  if (actor.role === 'admin') return true
  if (expected === 'inspector') return actor.role === 'inspector' && actor.id === hold.inspectorId
  if (expected === 'builder') return actor.role === 'builder' && actor.id === hold.builderId
  return false
}

function rowToHold(row: Row): HoldRecord {
  return {
    id: row.id as string,
    jobId: row.job_id as string,
    inspectorId: row.inspector_id as string,
    builderId: row.builder_id as string,
    createdByInspectorId: (row.created_by_inspector_id as string) ?? (row.inspector_id as string),
    relatedInspectionId: (row.related_inspection_id as string) ?? String(row.job_id),
    placedAt: (row.placed_at as string) ?? (row.created_at as string),
    expiresAt: row.expires_at as string,
    checklistItemIds: toStringArray(row.checklist_item_ids),
    status: normalizeHoldStatus(row.status as string),
    reason: row.reason as string,
    deficiencyReason: (row.deficiency_reason as string) ?? (row.reason as string),
    holdCategory: (row.hold_category as HoldCategory) ?? 'minor_deficiency',
    holdEligibleForOnSiteCorrection: row.hold_eligible_for_on_site_correction !== false,
    estimatedCorrectionMinutes: toNumber(row.estimated_correction_minutes, 60),
    premiumRateType: (row.premium_rate_type as HoldPremiumRateType) ?? 'hourly',
    premiumRateAmount: toNumber(row.premium_rate_amount, 0),
    holdCapAmount: toNumber(row.hold_cap_amount, 0),
    builderAcceptedAt: (row.builder_accepted_at as string) ?? (row.accepted_at as string) ?? undefined,
    builderDeclinedAt: (row.builder_declined_at as string) ?? (row.declined_at as string) ?? undefined,
    holdStartedAt: (row.hold_started_at as string) ?? undefined,
    holdEndedAt: (row.hold_ended_at as string) ?? undefined,
    holdResolution: (row.hold_resolution as HoldResolution) ?? undefined,
    holdResolutionNotes: (row.hold_resolution_notes as string) ?? (row.resolution_summary as string) ?? undefined,
    holdResolvedByUserId: (row.hold_resolved_by_user_id as string) ?? undefined,
    linkedCorrectionEvidenceIds: toStringArray(row.linked_correction_evidence_ids),
    affectedItemSummaries: toStringArray(row.affected_item_summaries),
    premiumChargeAmount: toNumber(row.premium_charge_amount, 0),
    actualRetainedMinutes: toNumber(row.actual_retained_minutes, 0),
    extensionCount: toNumber(row.extension_count, 0),
    builderNote: (row.builder_note as string) ?? undefined,
    resolutionSummary: (row.resolution_summary as string) ?? undefined,
    resolvedAt: (row.resolved_at as string) ?? undefined,
    expiredAt: (row.expired_at as string) ?? undefined,
    lastNotifiedAt: (row.last_notified_at as string) ?? undefined,
    lastBuilderResponseAt: (row.last_builder_response_at as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function rowToRetentionSession(row: Row): RetentionSession {
  return {
    id: row.id as string,
    holdId: row.hold_id as string,
    jobId: row.job_id as string,
    inspectorId: row.inspector_id as string,
    builderId: row.builder_id as string,
    dispatchTier: row.dispatch_tier as DispatchTier,
    hourlyRate: toNumber(row.hourly_rate, 0),
    initialHours: toNumber(row.initial_hours, 1),
    totalHoursBooked: toNumber(row.total_hours_booked, 1),
    totalMinutesBooked: toNumber(row.total_hours_booked, 1) * 60,
    elapsedSeconds: toNumber(row.elapsed_seconds, 0),
    chargeCapAmount: undefined,
    accruedChargeAmount: undefined,
    status: row.status as RetentionSessionStatus,
    resolvedDefectIds: toStringArray(row.resolved_defect_ids),
    startedAt: (row.started_at as string) ?? undefined,
    completedAt: (row.completed_at as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function rowToHoldEvent(row: Row): HoldTimelineEvent {
  return {
    id: row.id as string,
    holdId: row.hold_id as string,
    jobId: row.job_id as string,
    eventType: row.event_type as string,
    actorId: (row.actor_id as string) ?? undefined,
    actorRole: (row.actor_role as HoldTimelineEvent['actorRole']) ?? 'system',
    note: (row.note as string) ?? undefined,
    metadata: toRecord(row.metadata),
    createdAt: row.created_at as string,
  }
}

function rowToHoldEvidence(row: Row): HoldEvidenceRecord {
  return {
    id: row.id as string,
    holdId: row.hold_id as string,
    jobId: row.job_id as string,
    checklistItemId: (row.checklist_item_id as string) ?? undefined,
    evidenceRole: row.evidence_role as HoldEvidenceRole,
    evidenceType: row.evidence_type as HoldEvidenceType,
    fileName: (row.file_name as string) ?? undefined,
    mimeType: (row.mime_type as string) ?? undefined,
    fileSize: typeof row.file_size === 'number' ? row.file_size : undefined,
    storagePath: (row.storage_path as string) ?? undefined,
    noteText: (row.note_text as string) ?? undefined,
    captureGeo: toRecord(row.capture_geo),
    capturedAt: (row.captured_at as string) ?? undefined,
    createdByUserId: row.created_by_user_id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

async function insertHoldEvent(input: {
  holdId: string
  jobId: string
  eventType: string
  actorId?: string
  actorRole: HoldTimelineEvent['actorRole']
  note?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const { error } = await supabase
    .from('job_hold_events')
    .insert({
      id: createRuntimeId('hold-event'),
      hold_id: input.holdId,
      job_id: input.jobId,
      event_type: input.eventType,
      actor_id: input.actorId ?? null,
      actor_role: input.actorRole,
      note: input.note ?? null,
      metadata: input.metadata ?? {},
    })

  if (error) {
    console.error('insertHoldEvent:', error)
  }
}

async function notifyBuilderOfHold(hold: HoldRecord): Promise<HoldRecord | null> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('job_holds')
    .update({
      status: 'hold_pending_builder_ack',
      last_notified_at: now,
      updated_at: now,
    })
    .eq('id', hold.id)
    .select('*')
    .single()

  if (error || !data) {
    console.error('notifyBuilderOfHold:', error)
    return null
  }

  await insertHoldEvent({
    holdId: hold.id,
    jobId: hold.jobId,
    eventType: 'hold_builder_notified',
    actorId: hold.createdByInspectorId,
    actorRole: 'inspector',
    note: 'Builder notified of Hold / Site Retainer terms.',
    metadata: {
      premiumRateAmount: hold.premiumRateAmount,
      holdCapAmount: hold.holdCapAmount,
      estimatedCorrectionMinutes: hold.estimatedCorrectionMinutes,
    },
  })

  return rowToHold(data as Row)
}

export async function placeHold(input: PlaceHoldInput): Promise<HoldRecord | null> {
  const actor = await getAuthenticatedHoldActor()
  if (!actor || !canInspectorCreateHold(actor.role) || (actor.role !== 'admin' && actor.id !== input.inspectorId)) return null

  const governance = validateOutcomeSelection({
    outcome: 'hold',
    requiredChecklistComplete: true,
    evidenceCount: Math.max(input.checklistItemIds.length, 1),
    hasOpenHold: false,
    actorRole: 'inspector',
  })

  if (!governance.ok) {
    console.error('placeHold governance:', governance.blockers)
    return null
  }

  const existingOpenHold = await getLatestOpenHoldForJob(input.jobId)
  if (existingOpenHold) {
    console.error('placeHold: job already has an open hold', input.jobId)
    return null
  }

  const placedAt = new Date()
  const expiresAt = computeExpiresAt(placedAt, input.dispatchTier, input.estimatedCorrectionMinutes)
  const affectedItemSummaries = input.affectedItemSummaries ?? input.checklistItemIds

  const { data, error } = await supabase
    .from('job_holds')
    .insert({
      job_id: input.jobId,
      inspector_id: input.inspectorId,
      builder_id: input.builderId,
      created_by_inspector_id: input.inspectorId,
      related_inspection_id: input.relatedInspectionId ?? input.jobId,
      placed_at: placedAt.toISOString(),
      expires_at: expiresAt,
      checklist_item_ids: input.checklistItemIds,
      status: 'hold_offered',
      reason: input.reason,
      deficiency_reason: input.deficiencyReason ?? input.reason,
      hold_category: input.holdCategory,
      hold_eligible_for_on_site_correction: input.holdEligibleForOnSiteCorrection,
      estimated_correction_minutes: input.estimatedCorrectionMinutes,
      premium_rate_type: input.premiumRateType,
      premium_rate_amount: input.premiumRateAmount,
      hold_cap_amount: input.holdCapAmount,
      linked_correction_evidence_ids: input.linkedCorrectionEvidenceIds ?? [],
      affected_item_summaries: affectedItemSummaries,
      builder_note: input.notes ?? null,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('placeHold:', error)
    return null
  }

  const hold = rowToHold(data as Row)

  for (const event of buildHoldLifecycleEvents({
    previousStatus: null,
    nextStatus: hold.status,
    includeNotification: false,
  })) {
    await insertHoldEvent({
      holdId: hold.id,
      jobId: hold.jobId,
      eventType: event.action,
      actorId: input.inspectorId,
      actorRole: 'inspector',
      note: input.notes,
      metadata: {
        checklistItemIds: input.checklistItemIds,
        affectedItemSummaries,
      },
    })
  }

  await appendGovernanceAuditEvent({
    entityType: 'hold',
    entityId: hold.id,
    action: 'hold.created',
    actorId: input.inspectorId,
    actorRole: 'inspector',
    ruleIds: ['R-029'],
    blockerType: 'technical',
    reason: input.reason,
    beforeState: {},
    afterState: {
      status: hold.status,
      estimatedCorrectionMinutes: input.estimatedCorrectionMinutes,
      premiumRateAmount: input.premiumRateAmount,
      holdCapAmount: input.holdCapAmount,
    },
    metadata: {
      checklistItemIds: input.checklistItemIds,
      holdCategory: input.holdCategory,
      premiumRateType: input.premiumRateType,
    },
  })

  return notifyBuilderOfHold(hold)
}

export async function getHold(holdId: string): Promise<HoldRecord | null> {
  const { data, error } = await supabase
    .from('job_holds')
    .select('*')
    .eq('id', holdId)
    .maybeSingle()

  if (error || !data) return null
  return rowToHold(data as Row)
}

export async function listHoldsForJob(jobId: string): Promise<HoldRecord[]> {
  const { data, error } = await supabase
    .from('job_holds')
    .select('*')
    .eq('job_id', jobId)
    .order('placed_at', { ascending: false })

  if (error || !data) return []
  return (data as Row[]).map(rowToHold)
}

export async function hasOpenHoldForJob(jobId: string): Promise<boolean> {
  const holds = await listHoldsForJob(jobId)
  return holds.some(hold => isHoldOpenStatus(hold.status))
}

export async function getLatestOpenHoldForJob(jobId: string): Promise<HoldRecord | null> {
  const holds = await listHoldsForJob(jobId)
  return holds.find(hold => isHoldOpenStatus(hold.status)) ?? null
}

export async function listHoldEvents(holdId: string): Promise<HoldTimelineEvent[]> {
  const { data, error } = await supabase
    .from('job_hold_events')
    .select('*')
    .eq('hold_id', holdId)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return (data as Row[]).map(rowToHoldEvent)
}

export async function listHoldEvidence(holdId: string): Promise<HoldEvidenceRecord[]> {
  const { data, error } = await supabase
    .from('job_hold_evidence')
    .select('*')
    .eq('hold_id', holdId)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return (data as Row[]).map(rowToHoldEvidence)
}

export async function getHoldDetail(holdId: string): Promise<HoldDetail | null> {
  const hold = await getHold(holdId)
  if (!hold) return null

  const [events, evidence, retentionSession] = await Promise.all([
    listHoldEvents(holdId),
    listHoldEvidence(holdId),
    getRetentionSessionByHoldId(holdId),
  ])

  return { hold, events, evidence, retentionSession }
}

export async function listHoldDetailsForJob(jobId: string): Promise<HoldDetail[]> {
  const holds = await listHoldsForJob(jobId)
  return Promise.all(holds.map(async hold => {
    const [events, evidence, retentionSession] = await Promise.all([
      listHoldEvents(hold.id),
      listHoldEvidence(hold.id),
      getRetentionSessionByHoldId(hold.id),
    ])
    return { hold, events, evidence, retentionSession }
  }))
}

export async function builderApproveHold(
  holdId: string,
  builderNote?: string,
): Promise<boolean> {
  const hold = await getHold(holdId)
  const actor = await getAuthenticatedHoldActor()
  if (!hold || !actor || !isAuthorizedParticipant(actor, hold, 'builder') || !canBuilderRespondToHold({ actorRole: actor.role, holdStatus: hold.status })) return false

  const governance = validateHoldResolution({
    action: 'accept',
    holdStatus: hold.status,
  })
  if (!governance.ok) return false

  const now = new Date().toISOString()
  const sessionHours = Math.max(1, Math.ceil(hold.estimatedCorrectionMinutes / 60))
  const { data: jobData } = await supabase
    .from('job_opportunities')
    .select('dispatch_tier')
    .eq('id', hold.jobId)
    .maybeSingle()
  const dispatchTier = ((jobData?.dispatch_tier as DispatchTier | undefined) ?? 'standard')

  const { data, error } = await supabase
    .from('job_holds')
    .update({
      status: 'hold_active',
      builder_note: builderNote ?? null,
      builder_accepted_at: now,
      hold_started_at: now,
      last_builder_response_at: now,
      updated_at: now,
    })
    .eq('id', holdId)
    .select('*')
    .single()

  if (error || !data) {
    console.error('builderApproveHold:', error)
    return false
  }

  const acceptedHold = rowToHold(data as Row)
  const retentionSession: RetentionSession = {
    id: createRuntimeId('ret'),
    holdId: acceptedHold.id,
    jobId: acceptedHold.jobId,
    inspectorId: acceptedHold.inspectorId,
    builderId: acceptedHold.builderId,
    dispatchTier,
    hourlyRate: acceptedHold.premiumRateAmount,
    initialHours: sessionHours,
    totalHoursBooked: sessionHours,
    totalMinutesBooked: acceptedHold.estimatedCorrectionMinutes,
    elapsedSeconds: 0,
    chargeCapAmount: acceptedHold.holdCapAmount,
    accruedChargeAmount: 0,
    status: 'active',
    resolvedDefectIds: [],
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  }
  await upsertRetentionSession(retentionSession)

  for (const event of buildHoldLifecycleEvents({
    previousStatus: hold.status,
    nextStatus: acceptedHold.status,
  })) {
    await insertHoldEvent({
      holdId: acceptedHold.id,
      jobId: acceptedHold.jobId,
      eventType: event.action,
      actorId: acceptedHold.builderId,
      actorRole: 'builder',
      note: builderNote,
      metadata: {
        premiumRateAmount: acceptedHold.premiumRateAmount,
        holdCapAmount: acceptedHold.holdCapAmount,
      },
    })
  }

  await appendGovernanceAuditEvent({
    entityType: 'hold',
    entityId: holdId,
    action: 'hold.accepted',
    actorId: acceptedHold.builderId,
    actorRole: 'builder',
    ruleIds: ['R-031'],
    blockerType: 'commercial',
    reason: builderNote ?? 'Builder accepted Hold / Site Retainer terms.',
    beforeState: { status: hold.status },
    afterState: { status: acceptedHold.status },
    metadata: {
      premiumRateAmount: acceptedHold.premiumRateAmount,
      holdCapAmount: acceptedHold.holdCapAmount,
      estimatedCorrectionMinutes: acceptedHold.estimatedCorrectionMinutes,
    },
  })

  return true
}

export async function requestOnSiteCorrectionReview(
  holdId: string,
  actorId: string,
  note?: string,
): Promise<boolean> {
  const hold = await getHold(holdId)
  const actor = await getAuthenticatedHoldActor()
  if (
    !hold
    || !actor
    || !isAuthorizedParticipant(actor, hold, 'builder')
    || actor.id !== actorId
    || !canPerformHoldAction({ action: 'request_review', actorRole: actor.role, holdStatus: hold.status })
  ) return false

  await insertHoldEvent({
    holdId,
    jobId: hold.jobId,
    eventType: 'hold_review_requested',
    actorId,
    actorRole: 'builder',
    note,
    metadata: {},
  })

  await appendGovernanceAuditEvent({
    entityType: 'hold',
    entityId: holdId,
    action: 'hold.review_requested',
    actorId,
    actorRole: 'builder',
    ruleIds: ['R-031'],
    blockerType: 'commercial',
    reason: note ?? 'Builder requested on-site correction review.',
    beforeState: { status: hold.status },
    afterState: { status: hold.status },
    metadata: {},
  })

  return true
}

export async function builderDeclineHold(
  holdId: string,
  actorId: string,
  builderNote?: string,
): Promise<boolean> {
  const hold = await getHold(holdId)
  const actor = await getAuthenticatedHoldActor()
  if (!hold || !actor || !isAuthorizedParticipant(actor, hold, 'builder') || actor.id !== actorId) return false
  const governance = validateHoldResolution({
    action: 'decline',
    holdStatus: hold?.status ?? 'unknown',
  })
  if (!governance.ok) return false

  const { error } = await supabase.rpc('decline_hold_and_stop_job', {
    p_hold_id: holdId,
    p_builder_note: builderNote ?? null,
    p_actor_id: actorId,
  })

  if (error) {
    console.error('builderDeclineHold:', error)
    return false
  }

  if (hold) {
    await insertHoldEvent({
      holdId,
      jobId: hold.jobId,
      eventType: 'hold_declined',
      actorId,
      actorRole: 'builder',
      note: builderNote,
      metadata: {},
    })

    await appendGovernanceAuditEvent({
      entityType: 'hold',
      entityId: holdId,
      action: 'hold.declined',
      actorId,
      actorRole: 'builder',
      ruleIds: ['R-032'],
      blockerType: 'commercial',
      reason: builderNote ?? 'Builder declined Hold / Site Retainer terms.',
      beforeState: { status: hold.status },
      afterState: { status: 'hold_declined', outcome: 'fail' },
      metadata: {},
    })
  }

  return true
}

export async function markHoldExpired(holdId: string): Promise<boolean> {
  const hold = await getHold(holdId)
  if (!hold) return false

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('job_holds')
    .update({
      status: 'hold_expired',
      expired_at: now,
      hold_ended_at: now,
      updated_at: now,
    })
    .eq('id', holdId)
    .in('status', ['hold_offered', 'hold_pending_builder_ack'])

  if (error) {
    console.error('markHoldExpired:', error)
    return false
  }

  await insertHoldEvent({
    holdId,
    jobId: hold.jobId,
    eventType: 'hold_expired',
    actorRole: 'system',
    note: 'Hold expired without builder response.',
    metadata: {},
  })

  await appendGovernanceAuditEvent({
    entityType: 'hold',
    entityId: holdId,
    action: 'hold.expired',
    actorId: 'system:hold-aging',
    actorRole: 'system',
    ruleIds: ['R-029'],
    blockerType: 'technical',
    reason: 'Hold expired without builder response.',
    beforeState: { status: hold.status },
    afterState: { status: 'hold_expired' },
    metadata: {},
  })

  return true
}

export async function addHoldEvidence(
  input: HoldEvidenceInput,
): Promise<HoldEvidenceRecord | null> {
  const hold = await getHold(input.holdId)
  const actor = await getAuthenticatedHoldActor()
  if (!hold || !actor) return null
  const actorRole = actor.role === 'admin'
    ? 'admin'
    : actor.id === hold.inspectorId
      ? 'inspector'
      : actor.id === hold.builderId
        ? 'builder'
        : 'unknown'
  if (actor.id !== input.createdByUserId && actor.role !== 'admin') return null
  if (!canAddHoldEvidence({ actorRole, holdStatus: hold.status })) return null

  let storagePath: string | null = null
  const fileName = input.file?.name ?? null
  const mimeType = input.file?.type ?? null
  const fileSize = input.file?.size ?? null
  const capturedAt = input.capturedAt ?? new Date().toISOString()

  if (input.file) {
    storagePath = [
      'inspector_documents',
      input.createdByUserId,
      'holds',
      input.holdId,
      `${Date.now()}-${sanitizeFileName(input.file.name)}`,
    ].join('/')

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, input.file, { cacheControl: '3600', upsert: false })

    if (uploadError) {
      console.error('addHoldEvidence upload:', uploadError)
      return null
    }
  }

  const { data, error } = await supabase
    .from('job_hold_evidence')
    .insert({
      id: createRuntimeId('hold-evidence'),
      hold_id: input.holdId,
      job_id: input.jobId,
      checklist_item_id: input.checklistItemId ?? null,
      evidence_role: input.evidenceRole,
      evidence_type: input.evidenceType,
      file_name: fileName,
      mime_type: mimeType,
      file_size: fileSize,
      storage_path: storagePath,
      note_text: input.noteText ?? null,
      capture_geo: input.captureGeo ?? {},
      captured_at: capturedAt,
      created_by_user_id: input.createdByUserId,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('addHoldEvidence insert:', error)
    return null
  }

  const evidence = rowToHoldEvidence(data as Row)

  if (input.evidenceRole === 'correction') {
    const nextIds = [...new Set([...hold.linkedCorrectionEvidenceIds, evidence.id])]
    await supabase
      .from('job_holds')
      .update({ linked_correction_evidence_ids: nextIds })
      .eq('id', input.holdId)
  }

  await insertHoldEvent({
    holdId: input.holdId,
    jobId: input.jobId,
    eventType: 'evidence_added',
    actorId: input.createdByUserId,
    actorRole,
    note: input.noteText,
    metadata: {
      evidenceType: input.evidenceType,
      evidenceRole: input.evidenceRole,
      checklistItemId: input.checklistItemId ?? null,
    },
  })

  return evidence
}

export async function resolveHold(input: ResolveHoldInput): Promise<HoldRecord | null> {
  const hold = await getHold(input.holdId)
  const actor = await getAuthenticatedHoldActor()
  if (!hold || !actor || !isAuthorizedParticipant(actor, hold, 'inspector') || actor.id !== input.actorId) return null
  const resolvedActorRole = actor.role === 'admin' ? 'admin' : 'inspector'
  if (!canResolveHold({ actorRole: resolvedActorRole, holdStatus: hold.status })) return null

  const governance = validateHoldResolution({
    action: 'resolve',
    holdStatus: hold.status,
    technicalResolved: input.technicalResolved,
  })
  if (!governance.ok) return null

  const now = new Date().toISOString()
  const retentionSession = await getRetentionSessionByHoldId(input.holdId)
  const pricing = calculateHoldPricing({
    premiumRateType: hold.premiumRateType,
    premiumRateAmount: hold.premiumRateAmount,
    estimatedCorrectionMinutes: hold.estimatedCorrectionMinutes,
    elapsedSeconds: input.elapsedSeconds ?? retentionSession?.elapsedSeconds ?? hold.estimatedCorrectionMinutes * 60,
    holdCapAmount: hold.holdCapAmount > 0 ? hold.holdCapAmount : undefined,
  })

  if (retentionSession) {
    await upsertRetentionSession({
      ...retentionSession,
      elapsedSeconds: input.elapsedSeconds ?? retentionSession.elapsedSeconds,
      status: 'completed',
      completedAt: now,
      updatedAt: now,
      accruedChargeAmount: pricing.accruedPremiumAmount,
      chargeCapAmount: hold.holdCapAmount,
    })
  }

  const nextStatus = getHoldResolutionStatus(input.resolution)
  const nextEvidenceIds = input.linkedCorrectionEvidenceIds?.length
    ? [...new Set([...hold.linkedCorrectionEvidenceIds, ...input.linkedCorrectionEvidenceIds])]
    : hold.linkedCorrectionEvidenceIds

  const { data, error } = await supabase
    .from('job_holds')
    .update({
      status: nextStatus,
      hold_resolution: input.resolution,
      hold_resolution_notes: input.resolutionNotes,
      hold_resolved_by_user_id: input.actorId,
      hold_ended_at: now,
      resolved_at: now,
      linked_correction_evidence_ids: nextEvidenceIds,
      premium_charge_amount: pricing.accruedPremiumAmount,
      actual_retained_minutes: pricing.retainedMinutes,
      updated_at: now,
    })
    .eq('id', input.holdId)
    .select('*')
    .single()

  if (error || !data) {
    console.error('resolveHold:', error)
    return null
  }

  const resolvedHold = rowToHold(data as Row)

  await supabase
    .from('job_opportunities')
    .update({ status: 'in_progress', updated_at: now })
    .eq('id', resolvedHold.jobId)

  const eventType = input.resolution === 'pass' ? 'hold_resolved_pass' : 'hold_resolved_fail'
  await insertHoldEvent({
      holdId: resolvedHold.id,
      jobId: resolvedHold.jobId,
      eventType,
      actorId: input.actorId,
      actorRole: resolvedActorRole,
      note: input.resolutionNotes,
    metadata: {
      premiumChargeAmount: pricing.accruedPremiumAmount,
      actualRetainedMinutes: pricing.retainedMinutes,
      capped: pricing.capped,
    },
  })

  await appendGovernanceAuditEvent({
    entityType: 'hold',
    entityId: resolvedHold.id,
    action: eventType,
    actorId: input.actorId,
    actorRole: resolvedActorRole,
    ruleIds: ['R-033'],
    blockerType: 'technical',
    reason: input.resolutionNotes,
    beforeState: { status: hold.status },
    afterState: {
      status: nextStatus,
      premiumChargeAmount: pricing.accruedPremiumAmount,
      actualRetainedMinutes: pricing.retainedMinutes,
    },
    metadata: {
      linkedCorrectionEvidenceIds: nextEvidenceIds,
      capped: pricing.capped,
    },
  })

  return resolvedHold
}

export async function upsertRetentionSession(
  session: RetentionSession,
): Promise<RetentionSession | null> {
  const payload: Record<string, unknown> = {
    id: session.id,
    hold_id: session.holdId,
    job_id: session.jobId,
    inspector_id: session.inspectorId,
    builder_id: session.builderId,
    dispatch_tier: session.dispatchTier,
    hourly_rate: session.hourlyRate,
    initial_hours: session.initialHours,
    total_hours_booked: session.totalHoursBooked,
    elapsed_seconds: session.elapsedSeconds,
    status: session.status,
    resolved_defect_ids: session.resolvedDefectIds,
    started_at: session.startedAt ?? null,
    completed_at: session.completedAt ?? null,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  }

  const { data, error } = await supabase
    .from('job_hold_retention_sessions')
    .upsert(payload, { onConflict: 'hold_id' })
    .select('*')
    .single()

  if (error || !data) {
    console.error('upsertRetentionSession:', error)
    return null
  }

  return rowToRetentionSession(data as Row)
}

export async function getRetentionSessionByHoldId(
  holdId: string,
): Promise<RetentionSession | null> {
  const { data, error } = await supabase
    .from('job_hold_retention_sessions')
    .select('*')
    .eq('hold_id', holdId)
    .maybeSingle()

  if (error || !data) return null
  return rowToRetentionSession(data as Row)
}

export async function getLatestActiveRetentionSessionForActor(
  actorId: string,
): Promise<RetentionSession | null> {
  const { data, error } = await supabase
    .from('job_hold_retention_sessions')
    .select('*')
    .or(`inspector_id.eq.${actorId},builder_id.eq.${actorId}`)
    .in('status', ACTIVE_RETENTION_STATUSES)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error('getLatestActiveRetentionSessionForActor:', error)
    return null
  }

  return rowToRetentionSession(data as Row)
}
