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
import { calculateBaseHoldServiceFee, calculateWindowFee } from '@/utils/pricing'
import { validateHoldResolution, validateOutcomeSelection } from '@/lib/governance'
import { appendGovernanceAuditEvent } from '@/lib/supabase/governance'
import {
  buildHoldLifecycleEvents,
  calculateHoldPricing,
  canAddHoldEvidence,
  canBuilderRespondToHold,
  canPerformHoldAction,
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
  /** Inspector declares whether same-day correction and re-verification is eligible. */
  holdEligibleForOnSiteCorrection: boolean
  /** Job's resolved hourly base rate — used to compute base service fee. */
  premiumRateAmount: number
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

function pgErrorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code ?? '')
    : ''
}

function pgErrorMessage(error: unknown): string {
  return typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : ''
}

function pgErrorDetails(error: unknown): string {
  return typeof error === 'object' && error !== null && 'details' in error
    ? String((error as { details?: unknown }).details ?? '')
    : ''
}

/**
 * PostgreSQL 42703 (undefined_column) or PostgREST PGRST204 (column not found in schema cache).
 * Both mean a column referenced in the query doesn't exist on the table.
 */
function isUndefinedColumnError(error: unknown): boolean {
  const code = pgErrorCode(error)
  return code === '42703' || code === 'PGRST204'
}

/** PostgreSQL 23514: check_violation — a CHECK constraint rejected the value (e.g. old status enum). */
function isCheckViolationError(error: unknown): boolean {
  return pgErrorCode(error) === '23514'
}

/** True when the error is the kind of schema mismatch that a stripped-down retry can resolve. */
function isSchemaCompatibilityError(error: unknown): boolean {
  return isUndefinedColumnError(error) || isCheckViolationError(error)
}

/**
 * True when the error indicates a specific column is missing.
 * Checks both `message` (42703) and `details` (PGRST204 puts the column name there).
 */
function isMissingColumnError(error: unknown, columnName: string): boolean {
  return isUndefinedColumnError(error) && (
    pgErrorMessage(error).includes(columnName) ||
    pgErrorDetails(error).includes(columnName)
  )
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
    builderSelectedCorrectionMinutes: typeof row.builder_selected_correction_minutes === 'number' ? row.builder_selected_correction_minutes : undefined,
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

async function insertHoldEvent(input: any) {
  try {
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
      });

    if (error) {
      console.warn('insertHoldEvent: Notification log skipped.', error);
      // We return nothing (void) but we don't throw, allowing the app to move on
    }
  } catch (err) {
    console.error('insertHoldEvent exception (swallowed):', err);
  }
}

async function notifyBuilderOfHold(hold: HoldRecord): Promise<HoldRecord | null> {
  const now = new Date().toISOString()
  let { data, error } = await supabase
    .from('job_holds')
    .update({
      status: 'hold_pending_builder_ack',
      last_notified_at: now,
      updated_at: now,
    })
    .eq('id', hold.id)
    .select('*')
    .single()

  if (error && isMissingColumnError(error, 'last_notified_at')) {
    // last_notified_at column not yet in DB — retry without it
    console.warn('notifyBuilderOfHold: last_notified_at column missing, retrying without it')
    ;({ data, error } = await supabase
      .from('job_holds')
      .update({ status: 'hold_pending_builder_ack', updated_at: now })
      .eq('id', hold.id)
      .select('*')
      .single())
  }

  if (error && isSchemaCompatibilityError(error)) {
    // Status constraint is still on legacy values — fall back to 'open' which normalises
    // to hold_pending_builder_ack in code via normalizeHoldStatus
    console.warn('notifyBuilderOfHold: schema mismatch on status update, retrying with legacy status',
      JSON.stringify({ code: pgErrorCode(error), message: pgErrorMessage(error) }))
    ;({ data, error } = await supabase
      .from('job_holds')
      .update({ status: 'open', updated_at: now })
      .eq('id', hold.id)
      .select('*')
      .single())
  }

  if (error || !data) {
    console.error('notifyBuilderOfHold: update failed', JSON.stringify({ code: pgErrorCode(error), message: pgErrorMessage(error), detail: (error as Record<string, unknown> | null)?.details }))
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
  // Authorization: the authenticated Supabase user must be the inspector being claimed, or an admin.
  // We intentionally do NOT gate on actor.role here because the app's login flow stores the role in
  // localStorage but does not write it back to Supabase user_metadata — so the JWT role is
  // unreliable. The ID match against the server-verified actor.id is the real authorization check.
  // DB-level RLS policies enforce this as a second layer.
  if (!actor || (actor.role !== 'admin' && actor.id !== input.inspectorId)) {
    console.error('placeHold: auth rejected', { actorId: actor?.id, actorRole: actor?.role, inspectorId: input.inspectorId })
    return null
  }

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
  // Use the dispatch tier's default window for the expiry calculation.
  // The builder will select the actual correction window at acceptance time.
  const tierWindowMinutes = TIER_WINDOW_MINUTES[input.dispatchTier]
  const expiresAt = computeExpiresAt(placedAt, input.dispatchTier, tierWindowMinutes)
  const affectedItemSummaries = input.affectedItemSummaries ?? input.checklistItemIds
  // Base Hold Service Fee — flat, always charged once the builder accepts.
  // The window fee is added at builder acceptance when they select a correction window.
  const baseHoldServiceFee = calculateBaseHoldServiceFee(input.premiumRateAmount)
  const premiumRateType: HoldPremiumRateType = 'flat'

  let { data, error } = await supabase
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
      estimated_correction_minutes: tierWindowMinutes,
      premium_rate_type: premiumRateType,
      premium_rate_amount: input.premiumRateAmount,
      hold_cap_amount: baseHoldServiceFee,
      linked_correction_evidence_ids: input.linkedCorrectionEvidenceIds ?? [],
      builder_note: input.notes ?? null,
    })
    .select('*')
    .single()

  if (error && isSchemaCompatibilityError(error)) {
    // Schema is behind migrations — retry with the minimal set of columns that have existed
    // since the original job_holds table + 20260402133000. Legacy status 'open' normalises
    // to 'hold_pending_builder_ack' via normalizeHoldStatus so the UI still works correctly.
    console.warn('placeHold: schema mismatch on full insert, retrying with legacy payload',
      JSON.stringify({ code: pgErrorCode(error), message: pgErrorMessage(error) }))
    ;({ data, error } = await supabase
      .from('job_holds')
      .insert({
        job_id: input.jobId,
        inspector_id: input.inspectorId,
        builder_id: input.builderId,
        reason: input.reason,
        expires_at: expiresAt,
        placed_at: placedAt.toISOString(),
        status: 'open',
        checklist_item_ids: input.checklistItemIds,
        builder_note: input.notes ?? null,
      })
      .select('*')
      .single())
  }

  if (error || !data) {
    console.error('placeHold: insert failed', JSON.stringify({ code: pgErrorCode(error), message: pgErrorMessage(error), detail: (error as Record<string, unknown> | null)?.details }))
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
      premiumRateAmount: input.premiumRateAmount,
      baseHoldServiceFee,
      holdEligibleForOnSiteCorrection: input.holdEligibleForOnSiteCorrection,
    },
    metadata: {
      checklistItemIds: input.checklistItemIds,
      holdCategory: input.holdCategory,
      premiumRateType,
    },
  })

  // notifyBuilderOfHold updates the status and returns the refreshed row. If it fails
  // (e.g. status constraint still on legacy values, or last_notified_at not yet in schema),
  // return the already-inserted hold so the UI isn't falsely told placement failed.
  const notifiedHold = await notifyBuilderOfHold(hold)
  return notifiedHold ?? hold
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
  correctionWindowMinutes: number,
  builderNote?: string,
): Promise<boolean> {
  const hold = await getHold(holdId)
  const actor = await getAuthenticatedHoldActor()
  // Like placeHold, we do NOT gate on actor.role because the app's login flow never writes role
  // back to Supabase user_metadata, so the JWT role is 'unknown' for all non-admin users.
  // The ID match against the server-verified actor.id is the real authorization check.
  if (!hold || !actor) {
    console.error('builderApproveHold: no hold or actor', { holdId })
    return false
  }
  if (actor.role !== 'admin' && actor.id !== hold.builderId) {
    console.error('builderApproveHold: auth rejected', { actorId: actor.id, builderId: hold.builderId })
    return false
  }
  const effectiveRole = actor.role === 'admin' ? 'admin' : 'builder'
  if (!canBuilderRespondToHold({ actorRole: effectiveRole, holdStatus: hold.status })) {
    console.error('builderApproveHold: hold not in actionable status', { status: hold.status })
    return false
  }

  const governance = validateHoldResolution({
    action: 'accept',
    holdStatus: hold.status,
  })
  if (!governance.ok) return false

  const now = new Date().toISOString()
  const safeWindowMinutes = Math.max(30, Number(correctionWindowMinutes) || 60)
  // Base Hold Service Fee is already stored on the hold (hold.holdCapAmount).
  // Add the Reserved Correction Window Fee based on the builder's selected window.
  const windowFee = calculateWindowFee(hold.premiumRateAmount, safeWindowMinutes)
  const totalCapAmount = hold.holdCapAmount + windowFee
  const sessionHours = safeWindowMinutes / 60

  const { data: jobData } = await supabase
    .from('job_opportunities')
    .select('dispatch_tier')
    .eq('id', hold.jobId)
    .maybeSingle()
  const dispatchTier = ((jobData?.dispatch_tier as DispatchTier | undefined) ?? 'standard')

  const baseUpdatePayload = {
    status: 'hold_active',
    builder_note: builderNote ?? null,
    builder_accepted_at: now,
    hold_started_at: now,
    last_builder_response_at: now,
    estimated_correction_minutes: safeWindowMinutes,
    hold_cap_amount: totalCapAmount,
    updated_at: now,
  }

  let { data, error } = await supabase
    .from('job_holds')
    .update({ ...baseUpdatePayload, builder_selected_correction_minutes: safeWindowMinutes })
    .eq('id', holdId)
    .select('*')
    .single()

  // builder_selected_correction_minutes column may not exist on older DB schemas.
  // Retry without it if we get a schema-compatibility error.
  if (error && isSchemaCompatibilityError(error)) {
    console.warn('builderApproveHold: schema fallback — retrying without builder_selected_correction_minutes', {
      code: error.code, message: error.message, details: error.details, hint: error.hint,
    });
    ({ data, error } = await supabase
      .from('job_holds')
      .update(baseUpdatePayload)
      .eq('id', holdId)
      .select('*')
      .single())
  }

  // 'hold_active' may fail the CHECK constraint on older schemas (pre-20260412).
  // Fall back to 'builder_approved' which is the legacy equivalent.
  if (error && isCheckViolationError(error)) {
    console.warn('builderApproveHold: status fallback — retrying with legacy builder_approved status')
    ;({ data, error } = await supabase
      .from('job_holds')
      .update({ ...baseUpdatePayload, status: 'builder_approved' })
      .eq('id', holdId)
      .select('*')
      .single())
  }

  if (error || !data) {
    console.error('builderApproveHold: DB update failed', {
      code: (error as { code?: string } | null)?.code,
      message: (error as { message?: string } | null)?.message,
      details: (error as { details?: string } | null)?.details,
      hint: (error as { hint?: string } | null)?.hint,
    })
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
    totalMinutesBooked: safeWindowMinutes,
    elapsedSeconds: 0,
    chargeCapAmount: totalCapAmount,
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
        correctionWindowMinutes: safeWindowMinutes,
        holdCapAmount: totalCapAmount,
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
    reason: builderNote ?? 'Builder accepted Hold and reserved correction window.',
    beforeState: { status: hold.status },
    afterState: { status: acceptedHold.status, feeAmount: totalCapAmount },
    metadata: {
      premiumRateAmount: acceptedHold.premiumRateAmount,
      correctionWindowMinutes: safeWindowMinutes,
      holdCapAmount: totalCapAmount,
      acceptedByUserId: acceptedHold.builderId,
      acceptedAt: new Date().toISOString(),
    },
  })

  // ── Communication loop — fire-and-forget, does not block acceptance ─────────

  // STUB: Builder alert — "Urgent: Your inspection is on hold. Review deficiencies in the Vero app."
  // Wire to Resend/Twilio by reading the builder's email/phone from the profiles table.
  // TODO: replace with live send when RESEND_API_KEY / TWILIO_* env vars are set.
  void notifyBuilderHoldActive(acceptedHold.jobId, acceptedHold.builderId)

  // STUB: Inspector alert — "Action Required: Builder has accepted hold terms for [Project Name].
  //        Re-verification is now authorized."
  // Route already exists at /api/notifications/hold-accepted for Resend/Twilio wiring.
  void fetch('/api/notifications/hold-accepted', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      holdId,
      jobId: acceptedHold.jobId,
      inspectorId: acceptedHold.inspectorId,
      builderId: acceptedHold.builderId,
      feeAmount: totalCapAmount,
      correctionWindowMinutes: safeWindowMinutes,
    }),
  }).catch(err => console.warn('[hold-accepted notification]', err))

  return true
}

/**
 * STUB: Notify the builder that their inspection is on hold and deficiencies need review.
 * Message: "Urgent: Your inspection is on hold. Review deficiencies in the Vero app."
 * Wire to Resend/Twilio by looking up the builder's email/phone from the profiles table.
 */
function notifyBuilderHoldActive(jobId: string, builderId: string): void {
  // TODO: send email/SMS to builder
  console.info('[stub] builder hold-active alert', { jobId, builderId })
}

export async function requestOnSiteCorrectionReview(
  holdId: string,
  actorId: string,
  note?: string,
): Promise<boolean> {
  const hold = await getHold(holdId)
  const actor = await getAuthenticatedHoldActor()
  if (!hold || !actor) return false
  if (actor.role !== 'admin' && actor.id !== hold.builderId) return false
  if (actor.id !== actorId && actor.role !== 'admin') return false
  const effectiveRoleForReview = actor.role === 'admin' ? 'admin' : 'builder'
  if (!canPerformHoldAction({ action: 'request_review', actorRole: effectiveRoleForReview, holdStatus: hold.status })) return false

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
  if (!hold || !actor) {
    console.error('builderDeclineHold: no hold or actor', { holdId })
    return false
  }
  if (actor.role !== 'admin' && actor.id !== hold.builderId) {
    console.error('builderDeclineHold: auth rejected', { actorId: actor.id, builderId: hold.builderId })
    return false
  }
  if (actor.id !== actorId && actor.role !== 'admin') {
    console.error('builderDeclineHold: actorId mismatch', { actorId: actor.id, passedActorId: actorId })
    return false
  }
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
if (actorRole === 'unknown') return null // <-- Add this new line here
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

// ════════════════════════════════════════════════════════════════════════════
// 3-Pathway Modification Required Model
//
// Tables: inspection_jobs · inspection_holds · hold_time_logs · reinspections
// Migration: 20260422030000_modification_required_schema.sql
//
// Three governed pathways:
//   onsite          — On-Site Correction Hold
//   same_day_return — Same-Day Return Hold
//   reinspection    — Reinspection Required
//
// State transitions:
//   onsite:          proposed → acknowledged → active → resolved_pass | resolved_fail
//   same_day_return: proposed → acknowledged → active → awaiting_return → resolved_pass | converted
//   reinspection:    proposed → acknowledged → active → converted (job → closed_mod_required)
//
// Billing:
//   onsite:          timer starts at acknowledged; 15-min increments; 30-min minimum
//   same_day_return: fixed SAME_DAY_RETURN_FEE added at acknowledgment
//   reinspection:    new job, new fee — handled by the caller
// ════════════════════════════════════════════════════════════════════════════

// ── Types ─────────────────────────────────────────────────────────────────────

export type InspectionHoldType = 'onsite' | 'same_day_return' | 'reinspection'

export type InspectionHoldStatus =
  | 'proposed'
  | 'acknowledged'
  | 'declined'
  | 'active'
  | 'awaiting_return'
  | 'converted'
  | 'resolved_pass'
  | 'resolved_fail'

export type InspectionHoldReasonCode =
  | 'framing'
  | 'foundation'
  | 'envelope'
  | 'electrical'
  | 'plumbing'
  | 'other'

export type InspectionJobStatus =
  | 'confirmed'
  | 'in_progress'
  | 'hold_active'
  | 'awaiting_return'
  | 'closed_mod_required'
  | 'submitted'
  | 'sealed'

export type ReinspectionStatus = 'scheduled' | 'completed' | 'failed' | 'passed'

export interface InspectionHold {
  id: string
  inspectionId: string
  type: InspectionHoldType
  status: InspectionHoldStatus
  reasonCode: InspectionHoldReasonCode
  notes: string | null
  isBlocking: boolean
  estimatedFixMinutes: number | null
  createdBy: 'inspector' | 'builder'
  builderAcknowledged: boolean
  builderAcknowledgedAt: string | null
  startedAt: string | null
  endedAt: string | null
  returnWindowStart: string | null
  returnWindowEnd: string | null
  linkedReinspectionId: string | null
  createdAt: string
  updatedAt: string
}

export interface ModHoldTimeLog {
  id: string
  holdId: string
  startTime: string
  endTime: string | null
  billableMinutes: number | null
  rateApplied: number | null
  totalCost: number | null
  createdAt: string
}

export interface ReinspectionRecord {
  id: string
  originalInspectionId: string
  holdId: string | null
  scheduledAt: string | null
  inspectorId: string | null
  status: ReinspectionStatus
  createdAt: string
  updatedAt: string
}

export interface CreateModificationHoldInput {
  inspectionId: string
  inspectorId: string
  type: InspectionHoldType
  reasonCode: InspectionHoldReasonCode
  notes?: string
  isBlocking?: boolean
  estimatedFixMinutes?: number
  /** Required when type = 'same_day_return'. */
  returnWindowStart?: string
  returnWindowEnd?: string
}

export interface ResolveOnsiteHoldInput {
  holdId: string
  actorId: string
  /** pass = issue fixed; fail = issue persists. */
  resolution: 'resolved_pass' | 'resolved_fail'
  resolutionNotes?: string
  /** Cost per billable minute. Pass 0 if no charge applies. */
  ratePerMinute?: number
}

export interface ResolveSameDayReturnInput {
  holdId: string
  actorId: string
  /** pass = return inspection passes; converted = auto-convert to reinspection. */
  resolution: 'resolved_pass' | 'converted'
  resolutionNotes?: string
  /** Used when resolution = 'converted' to book the reinspection. */
  preferredInspectorId?: string
  scheduledAt?: string
}

// ── Billing constants ─────────────────────────────────────────────────────────

/** Onsite holds are billed in 15-minute increments. */
const MOD_ONSITE_INCREMENT_MINUTES = 15

/** Onsite holds carry a 30-minute minimum charge regardless of elapsed time. */
const MOD_ONSITE_MINIMUM_MINUTES = 30

/**
 * Fixed fee charged to inspection_jobs.return_fee_total when a same-day return
 * hold is acknowledged. Adjust once per-market pricing is finalised.
 */
const SAME_DAY_RETURN_FEE = 150.00

function roundUpToIncrement(minutes: number, increment: number): number {
  return Math.ceil(minutes / increment) * increment
}

/** Returns billable minutes for an onsite hold, applying increment and minimum. */
function computeOnsiteBillableMinutes(elapsedMinutes: number): number {
  const incremented = roundUpToIncrement(Math.max(0, elapsedMinutes), MOD_ONSITE_INCREMENT_MINUTES)
  return Math.max(incremented, MOD_ONSITE_MINIMUM_MINUTES)
}

// ── Row converters ────────────────────────────────────────────────────────────

function rowToInspectionHold(row: Row): InspectionHold {
  return {
    id: row.id as string,
    inspectionId: row.inspection_id as string,
    type: row.type as InspectionHoldType,
    status: row.status as InspectionHoldStatus,
    reasonCode: row.reason_code as InspectionHoldReasonCode,
    notes: (row.notes as string) ?? null,
    isBlocking: row.is_blocking !== false,
    estimatedFixMinutes: typeof row.estimated_fix_minutes === 'number' ? row.estimated_fix_minutes : null,
    createdBy: row.created_by as 'inspector' | 'builder',
    builderAcknowledged: row.builder_acknowledged === true,
    builderAcknowledgedAt: (row.builder_acknowledged_at as string) ?? null,
    startedAt: (row.started_at as string) ?? null,
    endedAt: (row.ended_at as string) ?? null,
    returnWindowStart: (row.return_window_start as string) ?? null,
    returnWindowEnd: (row.return_window_end as string) ?? null,
    linkedReinspectionId: (row.linked_reinspection_id as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function rowToModHoldTimeLog(row: Row): ModHoldTimeLog {
  return {
    id: row.id as string,
    holdId: row.hold_id as string,
    startTime: row.start_time as string,
    endTime: (row.end_time as string) ?? null,
    billableMinutes: typeof row.billable_minutes === 'number' ? row.billable_minutes : null,
    rateApplied: typeof row.rate_applied === 'number' ? row.rate_applied : null,
    totalCost: typeof row.total_cost === 'number' ? row.total_cost : null,
    createdAt: row.created_at as string,
  }
}

function rowToReinspection(row: Row): ReinspectionRecord {
  return {
    id: row.id as string,
    originalInspectionId: row.original_inspection_id as string,
    holdId: (row.hold_id as string) ?? null,
    scheduledAt: (row.scheduled_at as string) ?? null,
    inspectorId: (row.inspector_id as string) ?? null,
    status: row.status as ReinspectionStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

// ── Internal helper ───────────────────────────────────────────────────────────

type InspectionJobRow = {
  id: string
  inspector_id: string
  builder_id: string
  status: string
  hold_fee_total: number
  return_fee_total: number
}

/** Fetches the parent inspection_jobs row for a given hold (auth checks + fee accumulators). */
async function getInspectionJobForHold(hold: InspectionHold): Promise<InspectionJobRow | null> {
  const { data, error } = await supabase
    .from('inspection_jobs')
    .select('id, inspector_id, builder_id, status, hold_fee_total, return_fee_total')
    .eq('id', hold.inspectionId)
    .maybeSingle()
  if (error || !data) return null
  return data as InspectionJobRow
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function getInspectionHold(holdId: string): Promise<InspectionHold | null> {
  const { data, error } = await supabase
    .from('inspection_holds')
    .select('*')
    .eq('id', holdId)
    .maybeSingle()
  if (error || !data) return null
  return rowToInspectionHold(data as Row)
}

export async function listInspectionHoldsForJob(
  inspectionJobId: string,
): Promise<InspectionHold[]> {
  const { data, error } = await supabase
    .from('inspection_holds')
    .select('*')
    .eq('inspection_id', inspectionJobId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as Row[]).map(rowToInspectionHold)
}

export async function getOpenTimeLogForHold(holdId: string): Promise<ModHoldTimeLog | null> {
  const { data, error } = await supabase
    .from('hold_time_logs')
    .select('*')
    .eq('hold_id', holdId)
    .is('end_time', null)
    .maybeSingle()
  if (error || !data) return null
  return rowToModHoldTimeLog(data as Row)
}

// ── 1. createModificationHold (inspector) ─────────────────────────────────────
//
// Creates an inspection hold in 'proposed' status and transitions the parent
// inspection_job to 'hold_active'. Returns the new hold record.
//
// Guard: same_day_return requires returnWindowStart + returnWindowEnd.

export async function createModificationHold(
  input: CreateModificationHoldInput,
): Promise<InspectionHold | null> {
  const actor = await getAuthenticatedHoldActor()
  if (!actor || (actor.role !== 'admin' && actor.id !== input.inspectorId)) {
    console.error('createModificationHold: auth rejected', { actorId: actor?.id, inspectorId: input.inspectorId })
    return null
  }

  if (input.type === 'same_day_return' && (!input.returnWindowStart || !input.returnWindowEnd)) {
    console.error('createModificationHold: same_day_return requires returnWindowStart and returnWindowEnd')
    return null
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('inspection_holds')
    .insert({
      inspection_id: input.inspectionId,
      type: input.type,
      status: 'proposed',
      reason_code: input.reasonCode,
      notes: input.notes ?? null,
      is_blocking: input.isBlocking ?? true,
      estimated_fix_minutes: input.estimatedFixMinutes ?? null,
      created_by: 'inspector',
      builder_acknowledged: false,
      return_window_start: input.returnWindowStart ?? null,
      return_window_end: input.returnWindowEnd ?? null,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('createModificationHold: insert failed', {
      code: pgErrorCode(error),
      message: pgErrorMessage(error),
    })
    return null
  }

  const hold = rowToInspectionHold(data as Row)

  // Transition the parent job to hold_active and wire current_hold_id.
  await supabase
    .from('inspection_jobs')
    .update({ status: 'hold_active', current_hold_id: hold.id, updated_at: now })
    .eq('id', input.inspectionId)
    .eq('inspector_id', input.inspectorId)

  // STUB: Notify builder.
  // Message: "Modification Required: Your inspection is on hold. Review deficiencies in the Vero app."
  void _notifyModificationHoldProposed(hold)

  return hold
}

// ── 2. acknowledgeModificationHold (builder) ──────────────────────────────────
//
// Builder acknowledges a 'proposed' hold → status: 'acknowledged'.
//
// Billing side-effects at acknowledgment:
//   onsite:          Opens a hold_time_logs row (timer starts NOW).
//   same_day_return: Adds SAME_DAY_RETURN_FEE to inspection_jobs.return_fee_total.
//   reinspection:    None (new-job fee is handled by the caller at rebooking time).

export async function acknowledgeModificationHold(
  holdId: string,
  builderNote?: string,
): Promise<InspectionHold | null> {
  const hold = await getInspectionHold(holdId)
  const actor = await getAuthenticatedHoldActor()
  if (!hold || !actor) {
    console.error('acknowledgeModificationHold: no hold or actor', { holdId })
    return null
  }
  if (hold.status !== 'proposed') {
    console.error('acknowledgeModificationHold: hold not in proposed status', { status: hold.status })
    return null
  }

  const job = await getInspectionJobForHold(hold)
  if (!job) {
    console.error('acknowledgeModificationHold: inspection job not found', { inspectionId: hold.inspectionId })
    return null
  }
  if (actor.role !== 'admin' && actor.id !== job.builder_id) {
    console.error('acknowledgeModificationHold: actor is not the builder', { actorId: actor.id, builderId: job.builder_id })
    return null
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('inspection_holds')
    .update({
      status: 'acknowledged',
      builder_acknowledged: true,
      builder_acknowledged_at: now,
      updated_at: now,
    })
    .eq('id', holdId)
    .select('*')
    .single()

  if (error || !data) {
    console.error('acknowledgeModificationHold: update failed', {
      code: pgErrorCode(error),
      message: pgErrorMessage(error),
    })
    return null
  }

  const acknowledgedHold = rowToInspectionHold(data as Row)

  if (acknowledgedHold.type === 'onsite') {
    // Start the billing timer — end_time/billable_minutes filled at resolveOnsiteHold.
    await supabase
      .from('hold_time_logs')
      .insert({ hold_id: holdId, start_time: now, created_at: now })
  }

  if (acknowledgedHold.type === 'same_day_return') {
    // Add the fixed same-day return fee to the parent job's running total.
    await supabase
      .from('inspection_jobs')
      .update({
        return_fee_total: job.return_fee_total + SAME_DAY_RETURN_FEE,
        updated_at: now,
      })
      .eq('id', acknowledgedHold.inspectionId)
  }

  // STUB: Notify inspector.
  // Message: "Action Required: Builder has acknowledged the modification hold. You may now proceed."
  void _notifyModificationHoldAcknowledged(acknowledgedHold, job.inspector_id)

  return acknowledgedHold
}

// ── 3. declineModificationHold (builder) ──────────────────────────────────────
//
// Builder declines a 'proposed' hold → status: 'declined'.
// The parent job reverts to 'in_progress'; current_hold_id is cleared.

export async function declineModificationHold(
  holdId: string,
  builderNote?: string,
): Promise<InspectionHold | null> {
  const hold = await getInspectionHold(holdId)
  const actor = await getAuthenticatedHoldActor()
  if (!hold || !actor) {
    console.error('declineModificationHold: no hold or actor', { holdId })
    return null
  }
  if (hold.status !== 'proposed') {
    console.error('declineModificationHold: hold not in proposed status', { status: hold.status })
    return null
  }

  const job = await getInspectionJobForHold(hold)
  if (!job) {
    console.error('declineModificationHold: inspection job not found', { inspectionId: hold.inspectionId })
    return null
  }
  if (actor.role !== 'admin' && actor.id !== job.builder_id) {
    console.error('declineModificationHold: actor is not the builder', { actorId: actor.id, builderId: job.builder_id })
    return null
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('inspection_holds')
    .update({ status: 'declined', ended_at: now, updated_at: now })
    .eq('id', holdId)
    .select('*')
    .single()

  if (error || !data) {
    console.error('declineModificationHold: update failed', {
      code: pgErrorCode(error),
      message: pgErrorMessage(error),
    })
    return null
  }

  // Revert the parent job to in_progress and clear the current hold pointer.
  await supabase
    .from('inspection_jobs')
    .update({ status: 'in_progress', current_hold_id: null, updated_at: now })
    .eq('id', hold.inspectionId)

  return rowToInspectionHold(data as Row)
}

// ── 4. activateModificationHold (inspector) ───────────────────────────────────
//
// Inspector activates an acknowledged hold → status: 'active'.
// Inspector can now begin re-verification or wait on site.

export async function activateModificationHold(holdId: string): Promise<InspectionHold | null> {
  const hold = await getInspectionHold(holdId)
  const actor = await getAuthenticatedHoldActor()
  if (!hold || !actor) return null

  if (hold.status !== 'acknowledged') {
    console.error('activateModificationHold: hold must be in acknowledged status', { status: hold.status })
    return null
  }

  const job = await getInspectionJobForHold(hold)
  if (!job || (actor.role !== 'admin' && actor.id !== job.inspector_id)) {
    console.error('activateModificationHold: auth rejected', { actorId: actor.id, inspectorId: job?.inspector_id })
    return null
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('inspection_holds')
    .update({ status: 'active', started_at: now, updated_at: now })
    .eq('id', holdId)
    .select('*')
    .single()

  if (error || !data) {
    console.error('activateModificationHold: update failed', {
      code: pgErrorCode(error),
      message: pgErrorMessage(error),
    })
    return null
  }

  return rowToInspectionHold(data as Row)
}

// ── 5a. resolveOnsiteHold (inspector) ─────────────────────────────────────────
//
// Resolves an active onsite hold: active → resolved_pass | resolved_fail.
// Closes the open hold_time_logs entry, computes billable minutes and total cost,
// and posts the charge to inspection_jobs.hold_fee_total.
// Job returns to 'in_progress' on both pass and fail (inspector continues).

export async function resolveOnsiteHold(
  input: ResolveOnsiteHoldInput,
): Promise<InspectionHold | null> {
  const hold = await getInspectionHold(input.holdId)
  const actor = await getAuthenticatedHoldActor()
  if (!hold || !actor) return null

  if (hold.type !== 'onsite') {
    console.error('resolveOnsiteHold: hold is not an onsite hold', { type: hold.type })
    return null
  }
  if (hold.status !== 'active') {
    console.error('resolveOnsiteHold: hold must be active', { status: hold.status })
    return null
  }

  const job = await getInspectionJobForHold(hold)
  if (!job || (actor.role !== 'admin' && actor.id !== job.inspector_id)) {
    console.error('resolveOnsiteHold: auth rejected')
    return null
  }

  const now = new Date().toISOString()

  // Close the open time log and compute the onsite billing charge.
  let holdFeeCharged = 0
  const openLog = await getOpenTimeLogForHold(input.holdId)
  if (openLog) {
    const elapsedMs = new Date(now).getTime() - new Date(openLog.startTime).getTime()
    const elapsedMinutes = Math.max(0, elapsedMs / (1000 * 60))
    const billableMinutes = computeOnsiteBillableMinutes(elapsedMinutes)
    const ratePerMinute = input.ratePerMinute ?? 0
    holdFeeCharged = billableMinutes * ratePerMinute

    await supabase
      .from('hold_time_logs')
      .update({
        end_time: now,
        billable_minutes: billableMinutes,
        rate_applied: ratePerMinute,
        total_cost: holdFeeCharged,
      })
      .eq('id', openLog.id)
  }

  // Resolve the hold.
  const { data, error } = await supabase
    .from('inspection_holds')
    .update({ status: input.resolution, ended_at: now, updated_at: now })
    .eq('id', input.holdId)
    .select('*')
    .single()

  if (error || !data) {
    console.error('resolveOnsiteHold: hold update failed', {
      code: pgErrorCode(error),
      message: pgErrorMessage(error),
    })
    return null
  }

  // Post the charge and resume the job (pass or fail — inspector continues other items).
  await supabase
    .from('inspection_jobs')
    .update({
      hold_fee_total: job.hold_fee_total + holdFeeCharged,
      current_hold_id: null,
      status: 'in_progress',
      updated_at: now,
    })
    .eq('id', hold.inspectionId)

  return rowToInspectionHold(data as Row)
}

// ── 5b. markSameDayHoldAwaitingReturn (inspector) ─────────────────────────────
//
// Inspector leaves site: hold status → awaiting_return.
// inspection_job.status → awaiting_return.

export async function markSameDayHoldAwaitingReturn(holdId: string): Promise<InspectionHold | null> {
  const hold = await getInspectionHold(holdId)
  const actor = await getAuthenticatedHoldActor()
  if (!hold || !actor) return null

  if (hold.type !== 'same_day_return') {
    console.error('markSameDayHoldAwaitingReturn: not a same_day_return hold', { type: hold.type })
    return null
  }
  if (hold.status !== 'active') {
    console.error('markSameDayHoldAwaitingReturn: hold must be active', { status: hold.status })
    return null
  }

  const job = await getInspectionJobForHold(hold)
  if (!job || (actor.role !== 'admin' && actor.id !== job.inspector_id)) {
    console.error('markSameDayHoldAwaitingReturn: auth rejected')
    return null
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('inspection_holds')
    .update({ status: 'awaiting_return', updated_at: now })
    .eq('id', holdId)
    .select('*')
    .single()

  if (error || !data) {
    console.error('markSameDayHoldAwaitingReturn: update failed', {
      code: pgErrorCode(error),
      message: pgErrorMessage(error),
    })
    return null
  }

  await supabase
    .from('inspection_jobs')
    .update({ status: 'awaiting_return', updated_at: now })
    .eq('id', hold.inspectionId)

  return rowToInspectionHold(data as Row)
}

// ── 5c. resolveSameDayReturnHold (inspector) ──────────────────────────────────
//
// Called after the inspector returns to site.
//   resolved_pass: awaiting_return → resolved_pass; job → in_progress; hold cleared.
//   converted:     awaiting_return → converted; job → closed_mod_required;
//                  a 'scheduled' reinspection record is created automatically.

export async function resolveSameDayReturnHold(
  input: ResolveSameDayReturnInput,
): Promise<InspectionHold | null> {
  const hold = await getInspectionHold(input.holdId)
  const actor = await getAuthenticatedHoldActor()
  if (!hold || !actor) return null

  if (hold.type !== 'same_day_return') {
    console.error('resolveSameDayReturnHold: not a same_day_return hold', { type: hold.type })
    return null
  }
  if (hold.status !== 'awaiting_return') {
    console.error('resolveSameDayReturnHold: hold must be awaiting_return', { status: hold.status })
    return null
  }

  const job = await getInspectionJobForHold(hold)
  if (!job || (actor.role !== 'admin' && actor.id !== job.inspector_id)) {
    console.error('resolveSameDayReturnHold: auth rejected')
    return null
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('inspection_holds')
    .update({ status: input.resolution, ended_at: now, updated_at: now })
    .eq('id', input.holdId)
    .select('*')
    .single()

  if (error || !data) {
    console.error('resolveSameDayReturnHold: update failed', {
      code: pgErrorCode(error),
      message: pgErrorMessage(error),
    })
    return null
  }

  if (input.resolution === 'resolved_pass') {
    await supabase
      .from('inspection_jobs')
      .update({ status: 'in_progress', current_hold_id: null, updated_at: now })
      .eq('id', hold.inspectionId)
  } else {
    // converted — close the job and generate a reinspection record.
    await supabase
      .from('inspection_jobs')
      .update({ status: 'closed_mod_required', updated_at: now })
      .eq('id', hold.inspectionId)

    const { data: reinspData, error: reinspError } = await supabase
      .from('reinspections')
      .insert({
        original_inspection_id: hold.inspectionId,
        hold_id: input.holdId,
        inspector_id: input.preferredInspectorId ?? job.inspector_id,
        scheduled_at: input.scheduledAt ?? null,
        status: 'scheduled',
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single()

    if (!reinspError && reinspData) {
      await supabase
        .from('inspection_holds')
        .update({ linked_reinspection_id: (reinspData as Row).id as string, updated_at: now })
        .eq('id', input.holdId)
    }
  }

  return rowToInspectionHold(data as Row)
}

// ── 6. convertHoldToReinspection (inspector) ──────────────────────────────────
//
// Used for reinspection-type holds only.
// Transitions: hold active → converted; job → closed_mod_required.
// Creates and returns a reinspection record linked to this hold.

export async function convertHoldToReinspection(
  holdId: string,
  preferredInspectorId?: string,
  scheduledAt?: string,
): Promise<ReinspectionRecord | null> {
  const hold = await getInspectionHold(holdId)
  const actor = await getAuthenticatedHoldActor()
  if (!hold || !actor) return null

  if (hold.type !== 'reinspection') {
    console.error('convertHoldToReinspection: hold type must be reinspection', { type: hold.type })
    return null
  }
  if (hold.status !== 'active') {
    console.error('convertHoldToReinspection: hold must be active', { status: hold.status })
    return null
  }

  const job = await getInspectionJobForHold(hold)
  if (!job || (actor.role !== 'admin' && actor.id !== job.inspector_id)) {
    console.error('convertHoldToReinspection: auth rejected')
    return null
  }

  const now = new Date().toISOString()

  // Close the hold.
  const { error: holdError } = await supabase
    .from('inspection_holds')
    .update({ status: 'converted', ended_at: now, updated_at: now })
    .eq('id', holdId)

  if (holdError) {
    console.error('convertHoldToReinspection: hold update failed', {
      code: pgErrorCode(holdError),
      message: pgErrorMessage(holdError),
    })
    return null
  }

  // Close the inspection job.
  await supabase
    .from('inspection_jobs')
    .update({ status: 'closed_mod_required', updated_at: now })
    .eq('id', hold.inspectionId)

  // Create the reinspection record.
  const { data: reinspData, error: reinspError } = await supabase
    .from('reinspections')
    .insert({
      original_inspection_id: hold.inspectionId,
      hold_id: holdId,
      inspector_id: preferredInspectorId ?? job.inspector_id,
      scheduled_at: scheduledAt ?? null,
      status: 'scheduled',
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single()

  if (reinspError || !reinspData) {
    console.error('convertHoldToReinspection: reinspection insert failed', {
      code: pgErrorCode(reinspError),
      message: pgErrorMessage(reinspError),
    })
    return null
  }

  // Back-link the hold to the new reinspection record.
  await supabase
    .from('inspection_holds')
    .update({ linked_reinspection_id: (reinspData as Row).id as string, updated_at: now })
    .eq('id', holdId)

  return rowToReinspection(reinspData as Row)
}

// ── Communication stubs (fire-and-forget) ─────────────────────────────────────
//
// Prefixed with _ to mark as internal stubs. Wire to Resend/Twilio by looking up
// email/phone from the profiles table, then call the /api/notifications/* routes.

/** STUB: Notify builder that a Modification Required hold has been proposed.
 *  Message: "Modification Required: Inspector placed a hold on your job. Review deficiencies in the Vero app." */
function _notifyModificationHoldProposed(hold: InspectionHold): void {
  console.info('[stub] modification hold proposed — notify builder', {
    holdId: hold.id,
    inspectionId: hold.inspectionId,
    type: hold.type,
    reasonCode: hold.reasonCode,
    isBlocking: hold.isBlocking,
  })
}

/** STUB: Notify inspector that the builder has acknowledged the modification hold.
 *  Message: "Action Required: Builder has acknowledged the [type] hold. Re-verification is now authorized." */
function _notifyModificationHoldAcknowledged(hold: InspectionHold, inspectorId: string): void {
  console.info('[stub] modification hold acknowledged — notify inspector', {
    holdId: hold.id,
    inspectionId: hold.inspectionId,
    type: hold.type,
    inspectorId,
  })
}
