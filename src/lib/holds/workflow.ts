import type {
  HoldPremiumRateType,
  HoldResolution,
  HoldStatus,
} from '@/lib/types'
import { HOLD_PREMIUM_MULTIPLIER } from '@/lib/pricing/config'

export type HoldActorRole = 'inspector' | 'builder' | 'admin' | 'system'
export type HoldAction =
  | 'create'
  | 'builder_accept'
  | 'builder_decline'
  | 'request_review'
  | 'add_evidence'
  | 'resolve'

export const HOLD_OPEN_STATUSES: HoldStatus[] = [
  'hold_offered',
  'hold_pending_builder_ack',
  'hold_active',
]

export const HOLD_BUILDER_ACTIONABLE_STATUSES: HoldStatus[] = [
  'hold_offered',
  'hold_pending_builder_ack',
]

export const HOLD_RESOLVABLE_STATUSES: HoldStatus[] = ['hold_active']

export interface HoldLifecycleInput {
  actorRole: HoldActorRole
  holdStatus?: HoldStatus | string | null
}

export interface HoldActionPermissionInput extends HoldLifecycleInput {
  action: HoldAction
}

export interface HoldPricingInput {
  premiumRateType: HoldPremiumRateType
  premiumRateAmount: number
  estimatedCorrectionMinutes: number
  elapsedSeconds?: number
  holdCapAmount?: number
}

export interface HoldPricingSnapshot {
  estimatedPremiumAmount: number
  accruedPremiumAmount: number
  retainedMinutes: number
  capped: boolean
}

export interface HoldEventDescriptor {
  action:
    | 'hold_created'
    | 'hold_builder_notified'
    | 'hold_accepted'
    | 'hold_declined'
    | 'hold_started'
    | 'hold_extended'
    | 'evidence_added'
    | 'hold_resolved_pass'
    | 'hold_resolved_fail'
    | 'hold_expired'
    | 'hold_review_requested'
}

const LEGACY_STATUS_MAP: Record<string, HoldStatus> = {
  open: 'hold_pending_builder_ack',
  builder_approved: 'hold_active',
  builder_declined: 'hold_declined',
  expired: 'hold_expired',
}

export function normalizeHoldStatus(status?: string | null): HoldStatus {
  if (!status) return 'hold_pending_builder_ack'
  return (LEGACY_STATUS_MAP[status] ?? status) as HoldStatus
}

export function isHoldOpenStatus(status?: string | null): boolean {
  return HOLD_OPEN_STATUSES.includes(normalizeHoldStatus(status))
}

export function canInspectorCreateHold(actorRole: HoldActorRole): boolean {
  return actorRole === 'inspector' || actorRole === 'admin'
}

export function canBuilderRespondToHold(input: HoldLifecycleInput): boolean {
  if (input.actorRole !== 'builder' && input.actorRole !== 'admin') return false
  return HOLD_BUILDER_ACTIONABLE_STATUSES.includes(normalizeHoldStatus(input.holdStatus))
}

export function canResolveHold(input: HoldLifecycleInput): boolean {
  if (input.actorRole !== 'inspector' && input.actorRole !== 'admin') return false
  return HOLD_RESOLVABLE_STATUSES.includes(normalizeHoldStatus(input.holdStatus))
}

export function canAddHoldEvidence(input: HoldLifecycleInput): boolean {
  if (!['inspector', 'builder', 'admin'].includes(input.actorRole)) return false
  return isHoldOpenStatus(input.holdStatus)
}

export function canPerformHoldAction(input: HoldActionPermissionInput): boolean {
  if (input.action === 'create') return canInspectorCreateHold(input.actorRole)
  if (input.action === 'builder_accept' || input.action === 'builder_decline' || input.action === 'request_review') {
    return canBuilderRespondToHold(input)
  }
  if (input.action === 'resolve') return canResolveHold(input)
  if (input.action === 'add_evidence') return canAddHoldEvidence(input)
  return false
}

export function getHoldResolutionStatus(resolution: HoldResolution): HoldStatus {
  return resolution === 'pass' ? 'hold_resolved_pass' : 'hold_resolved_fail'
}

export function buildHoldLifecycleEvents(params: {
  previousStatus?: string | null
  nextStatus: HoldStatus
  includeNotification?: boolean
}): HoldEventDescriptor[] {
  const next = normalizeHoldStatus(params.nextStatus)
  const events: HoldEventDescriptor[] = []

  if (!params.previousStatus) {
    events.push({ action: 'hold_created' })
    if (params.includeNotification !== false) {
      events.push({ action: 'hold_builder_notified' })
    }
  }

  if (next === 'hold_active') {
    events.push({ action: 'hold_accepted' }, { action: 'hold_started' })
  } else if (next === 'hold_declined') {
    events.push({ action: 'hold_declined' })
  } else if (next === 'hold_expired') {
    events.push({ action: 'hold_expired' })
  } else if (next === 'hold_resolved_pass') {
    events.push({ action: 'hold_resolved_pass' })
  } else if (next === 'hold_resolved_fail') {
    events.push({ action: 'hold_resolved_fail' })
  }

  return events
}

export function calculateHoldPricing(input: HoldPricingInput): HoldPricingSnapshot {
  const retainedMinutes = Math.max(0, Math.round((input.elapsedSeconds ?? input.estimatedCorrectionMinutes * 60) / 60))
  const estimatedMinutes = Math.max(0, input.estimatedCorrectionMinutes)
  const billableMinutes = Math.max(retainedMinutes, estimatedMinutes)
  const baseRate = Math.max(0, input.premiumRateAmount)
  const rawAmount = baseRate * (billableMinutes / 60) * HOLD_PREMIUM_MULTIPLIER
  const estimatedRawAmount = baseRate * (estimatedMinutes / 60) * HOLD_PREMIUM_MULTIPLIER

  const holdCapAmount = typeof input.holdCapAmount === 'number' && input.holdCapAmount > 0
    ? input.holdCapAmount
    : Number.POSITIVE_INFINITY

  return {
    estimatedPremiumAmount: Math.min(estimatedRawAmount, holdCapAmount),
    accruedPremiumAmount: Math.min(rawAmount, holdCapAmount),
    retainedMinutes,
    capped: rawAmount > holdCapAmount,
  }
}
