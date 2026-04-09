/**
 * Hold aging and retention service layer.
 *
 * Tables:
 *   - job_holds
 *   - job_hold_retention_sessions
 *
 * Constraint enforcement:
 *   [C1] expires_at is computed here from dispatchTier + placed_at.
 *        It is NEVER accepted as a function parameter from any call site.
 *        standard → +4 h | priority → +2 h | emergency → +1 h
 *   [C2] checklistItemIds is always string[] — never null or undefined.
 *        rowToHold() defaults to [] defensively; the DB column is
 *        NOT NULL DEFAULT '[]'::jsonb.
 *   [C3] builderDeclineHold() calls the Postgres RPC decline_hold_and_stop_job()
 *        exclusively. It does NOT import or call updateJobStatus() from jobs.ts.
 *        The RPC performs both the hold update and job status change atomically.
 */

import { createClient } from '@/lib/supabase/client'
import type {
  DispatchTier,
  HoldRecord,
  HoldStatus,
  RetentionSession,
  RetentionSessionStatus,
} from '@/lib/types'
import {
  validateHoldResolution,
  validateOutcomeSelection,
} from '@/lib/governance'
import { appendGovernanceAuditEvent } from '@/lib/supabase/governance'

const supabase = createClient()

type Row = Record<string, unknown>

const ACTIVE_RETENTION_STATUSES: RetentionSessionStatus[] = [
  'pending_approval',
  'active',
  'extended',
]

const TIER_WINDOW_MS: Record<DispatchTier, number> = {
  standard: 4 * 60 * 60 * 1000,
  priority: 2 * 60 * 60 * 1000,
  emergency: 1 * 60 * 60 * 1000,
}

function computeExpiresAt(placedAt: Date, tier: DispatchTier): string {
  return new Date(placedAt.getTime() + TIER_WINDOW_MS[tier]).toISOString()
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string')
}

function rowToHold(row: Row): HoldRecord {
  return {
    id: row.id as string,
    jobId: row.job_id as string,
    inspectorId: row.inspector_id as string,
    builderId: row.builder_id as string,
    placedAt: row.placed_at as string,
    expiresAt: row.expires_at as string,
    checklistItemIds: toStringArray(row.checklist_item_ids),
    status: row.status as HoldStatus,
    reason: row.reason as string,
    builderNote: (row.builder_note as string) ?? undefined,
    resolvedAt: (row.resolved_at as string) ?? undefined,
    expiredAt: (row.expired_at as string) ?? undefined,
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
    hourlyRate: Number(row.hourly_rate ?? 0),
    initialHours: Number(row.initial_hours ?? 1),
    totalHoursBooked: Number(row.total_hours_booked ?? 1),
    elapsedSeconds: Number(row.elapsed_seconds ?? 0),
    status: row.status as RetentionSessionStatus,
    resolvedDefectIds: toStringArray(row.resolved_defect_ids),
    startedAt: (row.started_at as string) ?? undefined,
    completedAt: (row.completed_at as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export interface PlaceHoldInput {
  jobId: string
  inspectorId: string
  builderId: string
  dispatchTier: DispatchTier
  checklistItemIds: string[]
  reason: string
}

export async function placeHold(input: PlaceHoldInput): Promise<HoldRecord | null> {
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

  const placedAt = new Date()
  const expiresAt = computeExpiresAt(placedAt, input.dispatchTier)

  const { data, error } = await supabase
    .from('job_holds')
    .insert({
      job_id: input.jobId,
      inspector_id: input.inspectorId,
      builder_id: input.builderId,
      placed_at: placedAt.toISOString(),
      expires_at: expiresAt,
      checklist_item_ids: input.checklistItemIds,
      status: 'open',
      reason: input.reason,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('placeHold:', error)
    return null
  }

  await appendGovernanceAuditEvent({
    entityType: 'hold',
    entityId: (data as Row).id as string,
    action: 'hold.placed',
    actorId: input.inspectorId,
    actorRole: 'inspector',
    ruleIds: ['R-029'],
    blockerType: 'technical',
    reason: input.reason,
    beforeState: {},
    afterState: {
      status: 'open',
      jobId: input.jobId,
      dispatchTier: input.dispatchTier,
    },
    metadata: {
      checklistItemIds: input.checklistItemIds,
    },
  })

  return rowToHold(data as Row)
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

export async function builderApproveHold(
  holdId: string,
  builderNote?: string,
): Promise<boolean> {
  const hold = await getHold(holdId)
  const governance = validateHoldResolution({
    action: 'accept',
    holdStatus: hold?.status ?? 'unknown',
  })
  if (!governance.ok) return false

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('job_holds')
    .update({
      status: 'builder_approved',
      builder_note: builderNote ?? null,
      resolved_at: now,
      updated_at: now,
    })
    .eq('id', holdId)
    .eq('status', 'open')

  if (error) console.error('builderApproveHold:', error)
  if (!error && hold) {
    await appendGovernanceAuditEvent({
      entityType: 'hold',
      entityId: holdId,
      action: 'hold.accepted',
      actorId: hold.builderId,
      actorRole: 'builder',
      ruleIds: ['R-030', 'R-031'],
      blockerType: 'technical',
      reason: builderNote ?? 'Builder accepted hold.',
      beforeState: { status: hold.status },
      afterState: { status: 'builder_approved' },
      metadata: { builderNote: builderNote ?? null },
    })
  }
  return !error
}

export async function builderDeclineHold(
  holdId: string,
  actorId: string,
  builderNote?: string,
): Promise<boolean> {
  const hold = await getHold(holdId)
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

  if (error) console.error('builderDeclineHold:', error)
  if (!error) {
    await appendGovernanceAuditEvent({
      entityType: 'hold',
      entityId: holdId,
      action: 'hold.declined',
      actorId,
      actorRole: 'builder',
      ruleIds: ['R-030', 'R-032'],
      blockerType: 'technical',
      reason: builderNote ?? 'Builder declined hold.',
      beforeState: { status: hold?.status ?? 'open' },
      afterState: { status: 'builder_declined', outcome: 'fail' },
      metadata: {
        builderNote: builderNote ?? null,
      },
    })
  }
  return !error
}

export async function markHoldExpired(holdId: string): Promise<boolean> {
  const hold = await getHold(holdId)
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('job_holds')
    .update({
      status: 'expired',
      expired_at: now,
      updated_at: now,
    })
    .eq('id', holdId)
    .eq('status', 'open')

  if (error) console.error('markHoldExpired:', error)
  if (!error) {
    await appendGovernanceAuditEvent({
      entityType: 'hold',
      entityId: holdId,
      action: 'hold.expired',
      actorId: 'system:hold-aging',
      actorRole: 'system',
      ruleIds: ['R-029'],
      blockerType: 'technical',
      reason: 'Hold expired without builder response.',
      beforeState: { status: hold?.status ?? 'open' },
      afterState: { status: 'expired' },
      metadata: {},
    })
  }
  return !error
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
