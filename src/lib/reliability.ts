import type {
  AttendanceConfirmationCheckpoint,
  AttendanceEscalationStatus,
  AttendanceProximityStatus,
  AttendanceConfirmationStatus,
  JobAttendanceConfirmation,
  NextAttendanceCheckIn,
  ReliabilityEnforcementMode,
  PermitFamily,
  InspectorDiscipline,
  Region,
} from '@/lib/types'
import { evaluateReliabilityRollout } from '@/lib/reliabilityRollout'

export type ReliabilityTierKey = 'restricted' | 'provisional' | 'standard' | 'preferred' | 'premier'
export type InspectorReliabilityTier = 'verified' | 'preferred' | 'priority' | 'elite' | 'restricted' | 'suspension_review'
export type CredentialComplianceStatus = 'compliant' | 'needs_review' | 'expired' | 'suspended'
export type PayoutSpeedCategory = 'normal' | 'slightly_faster' | 'faster' | 'fastest' | 'admin_hold'

export type ReliabilityEventType =
  | 'claim_commitment_accepted'
  | 'assignment_confirmed'
  | 'pre_site_confirmation_sent'
  | 'pre_site_confirmation_completed'
  | 'pre_site_confirmation_missed'
  | 'en_route_marked'
  | 'arrival_confirmed'
  | 'completed_professional_work'
  | 'valid_cancellation'
  | 'invalid_late_cancellation'
  | 'no_show'
  | 'builder_site_not_ready'
  | 'standby_invited'
  | 'standby_assigned'
  | 'admin_override'
  | 'evidence_incomplete'
  | 'dispute_opened'
  | 'dispute_resolved_inspector_fault'
  | 'dispute_resolved_no_fault'
  | 'response_recorded'
  | 'CONFIRMATION_COMPLETED'
  | 'CONFIRMATION_MISSED'
  | 'DEPARTURE_CONFIRMED'
  | 'ARRIVAL_CONFIRMED'
  | 'LATE_ARRIVAL'
  | 'ON_TIME_ARRIVAL'
  | 'LATE_CANCELLATION'
  | 'NO_SHOW'
  | 'STANDBY_CANDIDATE_IDENTIFIED'
  | 'STANDBY_SOFT_ALERTED'
  | 'STANDBY_OFFERED'
  | 'STANDBY_ACCEPTED'
  | 'PRIMARY_REASSIGNED'

export type CancellationReasonCode =
  | 'illness'
  | 'accident'
  | 'documented_vehicle_failure'
  | 'family_emergency'
  | 'unsafe_site'
  | 'severe_weather_road_closure'
  | 'builder_site_not_ready'
  | 'no_access'
  | 'missing_required_documents'
  | 'too_far'
  | 'too_busy'
  | 'double_booked'
  | 'changed_mind'
  | 'unsupported_other_reason'

export type CancellationClassification = 'likely_valid' | 'likely_invalid' | 'admin_review_required'
export type CancellationAdminDecision = 'approved' | 'rejected' | 'overridden'

export interface CancellationPolicyInput {
  reasonCode: CancellationReasonCode
  explanation?: string | null
  evidenceCount?: number
  requestedAt: string
  scheduledStartAt?: string | null
  protectedWindowMinutes?: number
}

export interface CancellationPolicyResult {
  reasonCode: CancellationReasonCode
  protectedReason: boolean
  avoidableReason: boolean
  preliminaryClassification: CancellationClassification
  isInsideProtectedWindow: boolean
  requiresEvidence: boolean
  reliabilityEvents: ReliabilityEventInput[]
  builderNotificationCopy: string
  inspectorNotificationCopy: string
  appealAvailable: boolean
}

export interface NoShowPolicyResult {
  reliabilityEvents: ReliabilityEventInput[]
  payoutBlocked: boolean
  adminReviewRequired: boolean
  refundCreditWorkflow: 'policy_configured'
  builderNotificationCopy: string
  inspectorNotificationCopy: string
  appealAvailable: boolean
}

export type StandbyCandidateStatus =
  | 'identified'
  | 'soft_alerted'
  | 'offered'
  | 'accepted'
  | 'declined'
  | 'expired'

export type StandbyActivationTrigger =
  | 'missed_4h_confirmation'
  | 'missed_90m_confirmation'
  | 'invalid_cancellation'
  | 'admin_manual'

export interface StandbyInspectorCandidateInput {
  inspectorId: string
  onboardingStatus: string
  disciplines: InspectorDiscipline[]
  regions: Region[]
  reliabilityTier?: InspectorReliabilityTier | ReliabilityTierKey | null
  reliabilityScore?: number | null
  permitFamilies?: PermitFamily[]
  stageEligibility?: string[]
  available?: boolean
  suspended?: boolean
  restricted?: boolean
}

export interface StandbyJobContext {
  jobId: string
  primaryInspectorId: string
  permitFamily: PermitFamily
  requiredDiscipline: InspectorDiscipline
  region: Region
  stageName?: string | null
}

export interface StandbyCandidateSelection {
  jobId: string
  inspectorId: string
  rank: number
  status: StandbyCandidateStatus
  reliabilityTier: string
  reliabilityScore: number
}

export interface StandbyActivationEvaluation {
  trigger: StandbyActivationTrigger
  candidateStatus: StandbyCandidateStatus
  sendInspectorOffers: boolean
  softAlertOnly: boolean
  builderNotified: boolean
  builderNotificationCopy?: string
  inspectorNotificationCopy?: string
  rushMultiplierOffered?: number
}

export interface StandbyAcceptanceResult {
  originalAssignmentId: string
  originalAssignmentStatus: 'cancelled'
  originalInspectorId: string
  newAssignment: {
    jobId: string
    inspectorId: string
    sourceInviteId: string
    status: 'confirmed'
  }
  acceptedInviteStatus: 'accepted'
  builderNotificationCopy: string
  reliabilityEvents: ReliabilityEventInput[]
}

export type InspectionOutcomeForPayout = 'pass' | 'fail' | 'hold' | 'modification_required'
export type ReliabilityPayoutStatus = 'eligible' | 'review' | 'blocked'
export type BuilderCreditFundingSource = 'policy_configured' | 'escrow_refund' | 'platform_budget' | 'rush_budget' | 'inspector_reserve'

export interface PayoutPolicyConfig {
  enforcementMode: ReliabilityEnforcementMode
  reserveHooksEnabled?: boolean
  reserveReleaseDays?: number
  tierReservePercents?: Partial<Record<InspectorReliabilityTier | ReliabilityTierKey, number>>
  payoutSpeedDays?: Partial<Record<PayoutSpeedCategory, number>>
  invalidLateCancellationPayoutAction?: 'review' | 'blocked'
  builderCreditHooksEnabled?: boolean
  builderCreditAmount?: number
  builderCreditFundingSource?: BuilderCreditFundingSource
  builderSiteNotReadyFeeAmount?: number
}

export interface InspectionPayoutEvaluationInput {
  outcome: InspectionOutcomeForPayout
  documentedProfessionalWork: boolean
  evidenceComplete: boolean
  hasCompletedHoldWorkflow?: boolean
  holdPremiumAmount?: number
  hasActiveDispute?: boolean
  payoutAlreadyReleasedAt?: string | null
  hasNoShow?: boolean
  hasInvalidLateCancellation?: boolean
  builderSiteNotReady?: boolean
  builderCancelledAfterDeparture?: boolean
  grossPayoutAmount: number
  inspectorTier: InspectorReliabilityTier | ReliabilityTierKey
  policyConfig?: Partial<PayoutPolicyConfig> | Record<string, unknown> | null
  asOf?: string
}

export interface ReserveLedgerProjection {
  entryType: 'observe_only_projection' | 'reserve_hold'
  amount: number
  releaseEligibleAt: string
  enforcementMode: ReliabilityEnforcementMode
  status: 'pending' | 'posted'
  reason: string
}

export interface BuilderCreditProjection {
  amount: number
  fundingSource: BuilderCreditFundingSource
  status: 'projected' | 'pending_admin_review'
  escrowProtected: boolean
}

export interface PayoutEvaluationResult {
  payoutStatus: ReliabilityPayoutStatus
  escrowStatus: 'earned_pending_review' | 'payout_ready' | 'blocked'
  blockReason?: string
  payoutSpeedCategory: PayoutSpeedCategory
  payoutEligibleAt: string
  reserveLedgerEntries: ReserveLedgerProjection[]
  builderCreditHook?: BuilderCreditProjection
  inspectorProtected: boolean
  consequencesEnforced: boolean
  auditEvents: string[]
}

export interface AdminPayoutOverrideInput {
  current: PayoutEvaluationResult
  decision: 'approve_payout' | 'reduce_payout' | 'block_payout' | 'apply_reserve' | 'waive_consequence' | 'issue_builder_credit'
  adminNote: string
  payoutReductionAmount?: number
  builderCreditAmount?: number
}

export interface ReliabilityTierDefinition {
  tierKey: ReliabilityTierKey
  label: string
  minScore: number
  maxScore: number
  opportunityRank: number
}

export interface ReliabilityPolicyConfig {
  enforcementMode: ReliabilityEnforcementMode
  eventScoreDeltas: Partial<Record<ReliabilityEventType, number>>
  thresholds?: Partial<ReliabilityPolicyThresholds>
  tierRules?: Partial<Record<InspectorReliabilityTier, Partial<InspectorReliabilityTierRule>>>
  emergencyKillSwitch?: boolean
  automaticRestrictionRulesEnabled?: boolean
  automaticSuspensionEnabled?: boolean
  suspensionsRequireAdminConfirmation?: boolean
}

export interface ReliabilityEventInput {
  eventType: ReliabilityEventType
  scoreDelta?: number
  occurredAt?: string
  createdAt?: string
  adminOverride?: ReliabilityAdminOverride
  metadata?: {
    inspectionOutcome?: 'pass' | 'fail' | 'hold' | 'modification_required' | string
    evidenceComplete?: boolean
    evidenceCompleteness?: number
    responseMinutes?: number
    expectedResponseMinutes?: number
    validReason?: boolean
    reasonCode?: string
    [key: string]: unknown
  }
}

export interface ReliabilityScoreSummary {
  score: number
  tierKey: ReliabilityTierKey
  counts: {
    completedProfessionalWork: number
    claimCommitments: number
    validCancellations: number
    invalidLateCancellations: number
    noShows: number
    builderSiteNotReady: number
    missedConfirmations: number
  }
}

export interface ReliabilityAdminOverride {
  neutralize: boolean
  reason: string
  reviewedBy: string
  reviewedAt: string
}

export interface InspectorReliabilityTierRule {
  tier: InspectorReliabilityTier
  minScore: number
  minCompletedProfessionalWork: number
  minAttendanceRate: number
  minEvidenceCompletenessRate: number
  maxDisputeRate: number
  maxNoShowCount: number
  reserveRequirementPercent: number
  payoutSpeedCategory: PayoutSpeedCategory
  dispatchPriorityWeight: number
}

export interface ReliabilityPolicyThresholds {
  lookbackDays: number
  recentHalfLifeDays: number
  seriousNoShowLookbackDays: number
  seriousNoShowHalfLifeDays: number
  newInspectorScore: number
  newInspectorResponseTimeScore: number
  missedConfirmationPenalty: number
  invalidLateCancellationPenalty: number
  noShowPenalty: number
  evidenceIncompletePenalty: number
  restrictedNoShowCount: number
  suspensionNoShowCount: number
}

export interface InspectorReliabilityCalculationInput {
  events: ReliabilityEventInput[]
  policyConfig?: Partial<ReliabilityPolicyConfig> | Record<string, unknown> | null
  asOf?: string
  credentialComplianceStatus?: CredentialComplianceStatus
}

export interface ReliabilityCalculationExplanation {
  code: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  metadata?: Record<string, unknown>
}

export interface InspectorReliabilityCalculationResult {
  reliabilityScore: number
  attendanceRate: number
  lateCancellationRate: number
  noShowCount: number
  evidenceCompletenessRate: number
  disputeRate: number
  responseTimeScore: number
  credentialComplianceStatus: CredentialComplianceStatus
  recommendedTier: InspectorReliabilityTier
  reserveRequirementPercent: number
  payoutSpeedCategory: PayoutSpeedCategory
  dispatchPriorityWeight: number
  enforcementMode: ReliabilityEnforcementMode
  consequencesEnforced: boolean
  explanations: ReliabilityCalculationExplanation[]
}

export const RELIABILITY_COMMITMENT_VERSION = 'reliability-commitment-v1'

export interface AttendanceCheckpointDefinition {
  checkpoint: AttendanceConfirmationCheckpoint
  label: string
  offsetMinutesBeforeStart: number | null
  reminderOffsetMinutesBeforeStart: number | null
  manualTrigger: boolean
  geoFenced: boolean
  criticalAlertOnMiss: boolean
  standbyPrepareOnMiss: boolean
  standbyActivateOnMiss: boolean
}

export interface BuildAttendanceLadderInput {
  scheduledStartAt?: string | null
  claimedAt?: string | null
}

export interface MissedAttendanceEvaluation {
  checkpoint: AttendanceConfirmationCheckpoint
  escalationStatus: AttendanceEscalationStatus
  markJobAtRisk: boolean
  notifyAdmin: boolean
  prepareStandbySearch: boolean
  requestStandbyActivation: boolean
  notifyBuilderAtRisk: boolean
}

export interface ArrivalCheckInInput {
  scheduledStartAt?: string | null
  arrivedAt: string
  latitude?: number | null
  longitude?: number | null
  siteLatitude?: number | null
  siteLongitude?: number | null
  proximityThresholdMeters?: number
  arrivalGraceMinutes?: number
  networkAvailable?: boolean
}

export interface ArrivalCheckInResult {
  jobStatus: 'in_progress'
  proximityStatus: AttendanceProximityStatus
  evidenceRequired: boolean
  syncStatus: 'recorded' | 'queued_for_sync'
  distanceFromSiteMeters?: number
  reliabilityEvents: ReliabilityEventInput[]
}

export interface PreInspectionCredentialContinuityInput {
  credentialComplianceStatus: CredentialComplianceStatus
  checkedAt: string
  scheduledStartAt?: string | null
}

export interface PreInspectionCredentialContinuityResult {
  canProceed: boolean
  requiresAdminReview: boolean
  action: 'allow' | 'block_departure_or_arrival' | 'admin_review_required'
  reliabilityEvents: ReliabilityEventInput[]
}

export interface AttendanceReschedulePlan {
  scheduledStartAt: string
  rescheduledAt: string
  confirmations: JobAttendanceConfirmation[]
  cancelledConfirmationIds: string[]
  replacementConfirmations: JobAttendanceConfirmation[]
}

export const INSPECTOR_ATTENDANCE_REMINDER_COPY =
  'Please reconfirm your Vero inspection appointment. Reliable attendance improves your Vero tier, job access, and payout speed.'

export const BUILDER_INSPECTION_CONFIRMED_COPY =
  'Your inspection is confirmed. Vero is monitoring the appointment and will notify you if anything changes.'

export const BUILDER_INSPECTION_AT_RISK_COPY =
  'Vero is monitoring your inspection appointment. If the assigned inspector becomes unavailable, we will begin reassignment support and keep your escrow protected.'

export const BUILDER_REASSIGNMENT_COPY =
  'The assigned inspector is no longer available. Vero has begun reassignment support to protect your schedule. Your escrow remains protected while we resolve the appointment.'

export const BUILDER_STANDBY_ACTIVATION_COPY =
  'Vero has begun reassignment support for your inspection. We are prioritizing qualified inspectors who match the required credential, region, and inspection stage.'

export const INSPECTOR_STANDBY_OFFER_COPY =
  'A priority Vero inspection is available due to reassignment. Accepting and completing priority work can improve your tier standing and earnings.'

export const INSPECTOR_INVALID_LATE_CANCELLATION_COPY =
  'This cancellation has been recorded as reliability-impacting because it occurred inside the protected appointment window without a supported reason. You may submit an appeal or additional context for Admin review.'

export const INSPECTOR_VALID_CANCELLATION_COPY =
  'This cancellation has been recorded as protected. Your reliability tier will not be materially affected.'

export const PROTECTED_CANCELLATION_REASONS: CancellationReasonCode[] = [
  'illness',
  'accident',
  'documented_vehicle_failure',
  'family_emergency',
  'unsafe_site',
  'severe_weather_road_closure',
  'builder_site_not_ready',
  'no_access',
  'missing_required_documents',
]

export const AVOIDABLE_CANCELLATION_REASONS: CancellationReasonCode[] = [
  'too_far',
  'too_busy',
  'double_booked',
  'changed_mind',
  'unsupported_other_reason',
]

const EVIDENCE_RECOMMENDED_REASONS: CancellationReasonCode[] = [
  'illness',
  'accident',
  'documented_vehicle_failure',
  'family_emergency',
  'unsafe_site',
  'severe_weather_road_closure',
  'no_access',
  'missing_required_documents',
]

export const ATTENDANCE_CONFIRMATION_LADDER: AttendanceCheckpointDefinition[] = [
  {
    checkpoint: 'initial_claim',
    label: 'Initial confirmation',
    offsetMinutesBeforeStart: null,
    reminderOffsetMinutesBeforeStart: null,
    manualTrigger: false,
    geoFenced: false,
    criticalAlertOnMiss: false,
    standbyPrepareOnMiss: false,
    standbyActivateOnMiss: false,
  },
  {
    checkpoint: 't_24h',
    label: 'T-24h soft check',
    offsetMinutesBeforeStart: 24 * 60,
    reminderOffsetMinutesBeforeStart: 24 * 60,
    manualTrigger: false,
    geoFenced: false,
    criticalAlertOnMiss: false,
    standbyPrepareOnMiss: false,
    standbyActivateOnMiss: false,
  },
  {
    checkpoint: 't_4h',
    label: 'T-4h critical check',
    offsetMinutesBeforeStart: 4 * 60,
    reminderOffsetMinutesBeforeStart: 4 * 60,
    manualTrigger: false,
    geoFenced: false,
    criticalAlertOnMiss: true,
    standbyPrepareOnMiss: true,
    standbyActivateOnMiss: false,
  },
  {
    checkpoint: 't_90m',
    label: 'T-90m go/no-go',
    offsetMinutesBeforeStart: 90,
    reminderOffsetMinutesBeforeStart: 90,
    manualTrigger: false,
    geoFenced: false,
    criticalAlertOnMiss: true,
    standbyPrepareOnMiss: true,
    standbyActivateOnMiss: true,
  },
  {
    checkpoint: 'departure',
    label: 'Departure',
    offsetMinutesBeforeStart: 90,
    reminderOffsetMinutesBeforeStart: null,
    manualTrigger: true,
    geoFenced: false,
    criticalAlertOnMiss: false,
    standbyPrepareOnMiss: false,
    standbyActivateOnMiss: false,
  },
  {
    checkpoint: 'arrival',
    label: 'Arrival',
    offsetMinutesBeforeStart: 0,
    reminderOffsetMinutesBeforeStart: null,
    manualTrigger: false,
    geoFenced: true,
    criticalAlertOnMiss: false,
    standbyPrepareOnMiss: false,
    standbyActivateOnMiss: false,
  },
]

export function buildAttendanceConfirmationLadder(
  input: BuildAttendanceLadderInput,
): JobAttendanceConfirmation[] {
  const claimedAt = input.claimedAt ? new Date(input.claimedAt) : new Date()
  const scheduledStartAt = input.scheduledStartAt ? new Date(input.scheduledStartAt) : null
  const hasValidStart = Boolean(scheduledStartAt && Number.isFinite(scheduledStartAt.getTime()))

  return ATTENDANCE_CONFIRMATION_LADDER.map(definition => {
    if (definition.checkpoint === 'initial_claim') {
      return {
        checkpoint: definition.checkpoint,
        status: 'confirmed',
        requiredAt: claimedAt.toISOString(),
        scheduledStartAt: hasValidStart ? scheduledStartAt!.toISOString() : null,
        reminderScheduledAt: null,
        confirmedAt: claimedAt.toISOString(),
        escalationStatus: 'none',
        criticalAlertOnMiss: definition.criticalAlertOnMiss,
        standbyPrepareOnMiss: definition.standbyPrepareOnMiss,
        standbyActivateOnMiss: definition.standbyActivateOnMiss,
      }
    }

    const requiredAt = hasValidStart && definition.offsetMinutesBeforeStart !== null
      ? new Date(scheduledStartAt!.getTime() - (definition.offsetMinutesBeforeStart * 60_000))
      : null
    const reminderScheduledAt = hasValidStart && definition.reminderOffsetMinutesBeforeStart !== null
      ? new Date(scheduledStartAt!.getTime() - (definition.reminderOffsetMinutesBeforeStart * 60_000))
      : null
    const isRelativeCheckAlreadyPassed = Boolean(
      requiredAt
      && requiredAt.getTime() <= claimedAt.getTime()
      && definition.checkpoint !== 'departure'
      && definition.checkpoint !== 'arrival',
    )
    const status: AttendanceConfirmationStatus = requiredAt && !isRelativeCheckAlreadyPassed
      ? 'pending'
      : 'not_required'

    return {
      checkpoint: definition.checkpoint,
      status,
      escalationStatus: 'none',
      requiredAt: requiredAt?.toISOString() ?? null,
      reminderScheduledAt: status === 'pending' ? reminderScheduledAt?.toISOString() ?? null : null,
      scheduledStartAt: hasValidStart ? scheduledStartAt!.toISOString() : null,
      criticalAlertOnMiss: definition.criticalAlertOnMiss,
      standbyPrepareOnMiss: definition.standbyPrepareOnMiss,
      standbyActivateOnMiss: definition.standbyActivateOnMiss,
    }
  })
}

export function deriveNextRequiredAttendanceCheckIn(
  confirmations: JobAttendanceConfirmation[],
  asOf: string | Date = new Date(),
): NextAttendanceCheckIn | null {
  const asOfTime = typeof asOf === 'string' ? new Date(asOf).getTime() : asOf.getTime()
  const pending = confirmations
    .filter(confirmation => confirmation.status === 'pending')
    .sort((a, b) => checkpointSortValue(a, asOfTime) - checkpointSortValue(b, asOfTime))

  const next = pending[0]
  if (!next) return null

  return {
    confirmationId: next.id,
    confirmationToken: next.confirmationToken,
    checkpoint: next.checkpoint,
    status: next.status,
    requiredAt: next.requiredAt ?? null,
    label: formatAttendanceCheckpointLabel(next.checkpoint),
    critical: next.criticalAlertOnMiss === true,
    manualTrigger: definitionForCheckpoint(next.checkpoint)?.manualTrigger === true,
    geoFenced: definitionForCheckpoint(next.checkpoint)?.geoFenced === true,
  }
}

export function formatAttendanceCheckpointLabel(checkpoint: AttendanceConfirmationCheckpoint): string {
  return ATTENDANCE_CONFIRMATION_LADDER.find(item => item.checkpoint === checkpoint)?.label ?? checkpoint
}

export function buildMissedAttendanceReliabilityEvents(
  checkpoint: AttendanceConfirmationCheckpoint,
  occurredAt: string,
): ReliabilityEventInput[] {
  return [
    {
      eventType: 'CONFIRMATION_MISSED',
      occurredAt,
      metadata: { checkpoint, source: 'attendance_confirmation_ladder' },
    },
  ]
}

export function evaluateMissedAttendanceConfirmation(
  checkpoint: AttendanceConfirmationCheckpoint,
  options: { standbyActivationEnabled?: boolean } = {},
): MissedAttendanceEvaluation {
  if (checkpoint === 't_24h') {
    return {
      checkpoint,
      escalationStatus: 'at_risk',
      markJobAtRisk: true,
      notifyAdmin: false,
      prepareStandbySearch: false,
      requestStandbyActivation: false,
      notifyBuilderAtRisk: true,
    }
  }

  if (checkpoint === 't_4h') {
    return {
      checkpoint,
      escalationStatus: 'standby_prepared',
      markJobAtRisk: true,
      notifyAdmin: true,
      prepareStandbySearch: true,
      requestStandbyActivation: false,
      notifyBuilderAtRisk: true,
    }
  }

  if (checkpoint === 't_90m') {
    const requestStandbyActivation = options.standbyActivationEnabled === true
    return {
      checkpoint,
      escalationStatus: requestStandbyActivation ? 'standby_activation_requested' : 'standby_prepared',
      markJobAtRisk: true,
      notifyAdmin: true,
      prepareStandbySearch: true,
      requestStandbyActivation,
      notifyBuilderAtRisk: true,
    }
  }

  return {
    checkpoint,
    escalationStatus: 'none',
    markJobAtRisk: false,
    notifyAdmin: false,
    prepareStandbySearch: false,
    requestStandbyActivation: false,
    notifyBuilderAtRisk: false,
  }
}

export function evaluateArrivalCheckIn(input: ArrivalCheckInInput): ArrivalCheckInResult {
  const threshold = input.proximityThresholdMeters ?? 250
  const hasInspectorLocation = typeof input.latitude === 'number' && typeof input.longitude === 'number'
  const hasSiteLocation = typeof input.siteLatitude === 'number' && typeof input.siteLongitude === 'number'
  const distance = hasInspectorLocation && hasSiteLocation
    ? distanceMeters(input.latitude!, input.longitude!, input.siteLatitude!, input.siteLongitude!)
    : undefined
  const proximityStatus: AttendanceProximityStatus = typeof distance === 'number'
    ? distance <= threshold ? 'within_range' : 'outside_range'
    : 'manual_evidence_required'
  const scheduledStart = input.scheduledStartAt ? new Date(input.scheduledStartAt) : null
  const arrivedAt = new Date(input.arrivedAt)
  const graceMs = (input.arrivalGraceMinutes ?? 15) * 60_000
  const isLate = Boolean(
    scheduledStart
    && Number.isFinite(scheduledStart.getTime())
    && Number.isFinite(arrivedAt.getTime())
    && arrivedAt.getTime() > scheduledStart.getTime() + graceMs,
  )
  const syncStatus = input.networkAvailable === false ? 'queued_for_sync' : 'recorded'

  return {
    jobStatus: 'in_progress',
    proximityStatus,
    evidenceRequired: proximityStatus !== 'within_range' || syncStatus === 'queued_for_sync',
    syncStatus,
    distanceFromSiteMeters: distance === undefined ? undefined : Number(distance.toFixed(2)),
    reliabilityEvents: [
      {
        eventType: 'ARRIVAL_CONFIRMED',
        occurredAt: input.arrivedAt,
        metadata: {
          proximityStatus,
          distanceFromSiteMeters: distance === undefined ? undefined : Number(distance.toFixed(2)),
          evidenceRequired: proximityStatus !== 'within_range' || syncStatus === 'queued_for_sync',
          syncStatus,
          offlineQueued: syncStatus === 'queued_for_sync',
        },
      },
      {
        eventType: isLate ? 'LATE_ARRIVAL' : 'ON_TIME_ARRIVAL',
        occurredAt: input.arrivedAt,
        metadata: {
          scheduledStartAt: input.scheduledStartAt,
        },
      },
    ],
  }
}

export function evaluatePreInspectionCredentialContinuity(
  input: PreInspectionCredentialContinuityInput,
): PreInspectionCredentialContinuityResult {
  if (input.credentialComplianceStatus === 'compliant') {
    return {
      canProceed: true,
      requiresAdminReview: false,
      action: 'allow',
      reliabilityEvents: [],
    }
  }

  return {
    canProceed: false,
    requiresAdminReview: true,
    action: input.credentialComplianceStatus === 'needs_review'
      ? 'admin_review_required'
      : 'block_departure_or_arrival',
    reliabilityEvents: [
      {
        eventType: 'admin_override',
        occurredAt: input.checkedAt,
        metadata: {
          reason: 'credential_continuity_failed_before_inspection',
          credentialComplianceStatus: input.credentialComplianceStatus,
          scheduledStartAt: input.scheduledStartAt,
        },
      },
    ],
  }
}

export function buildAttendanceReschedulePlan(input: {
  confirmations: JobAttendanceConfirmation[]
  newScheduledStartAt: string
  rescheduledAt: string
}): AttendanceReschedulePlan {
  const cancelledConfirmationIds = input.confirmations
    .filter(confirmation => confirmation.status === 'pending')
    .map(confirmation => confirmation.id)
    .filter((id): id is string => Boolean(id))
  const replacementConfirmations = buildAttendanceConfirmationLadder({
    claimedAt: input.rescheduledAt,
    scheduledStartAt: input.newScheduledStartAt,
  })

  return {
    scheduledStartAt: new Date(input.newScheduledStartAt).toISOString(),
    rescheduledAt: new Date(input.rescheduledAt).toISOString(),
    confirmations: input.confirmations.map(confirmation => (
      confirmation.status === 'pending'
        ? { ...confirmation, status: 'cancelled' as const }
        : confirmation
    )),
    cancelledConfirmationIds,
    replacementConfirmations,
  }
}

export function evaluateCancellationPolicy(input: CancellationPolicyInput): CancellationPolicyResult {
  const protectedReason = PROTECTED_CANCELLATION_REASONS.includes(input.reasonCode)
  const avoidableReason = AVOIDABLE_CANCELLATION_REASONS.includes(input.reasonCode)
  const requiresEvidence = EVIDENCE_RECOMMENDED_REASONS.includes(input.reasonCode)
  const hasEvidence = (input.evidenceCount ?? 0) > 0
  const isInsideProtectedWindow = isWithinProtectedAppointmentWindow({
    requestedAt: input.requestedAt,
    scheduledStartAt: input.scheduledStartAt,
    protectedWindowMinutes: input.protectedWindowMinutes,
  })
  const preliminaryClassification: CancellationClassification = protectedReason
    ? requiresEvidence && !hasEvidence ? 'admin_review_required' : 'likely_valid'
    : 'likely_invalid'
  const isReliabilityImpacting = preliminaryClassification === 'likely_invalid' && isInsideProtectedWindow
  const reliabilityEvents: ReliabilityEventInput[] = isReliabilityImpacting
    ? [{
        eventType: 'LATE_CANCELLATION',
        occurredAt: input.requestedAt,
        metadata: {
          reasonCode: input.reasonCode,
          preliminaryClassification,
          protectedWindowMinutes: input.protectedWindowMinutes ?? 240,
        },
      }]
    : protectedReason
      ? [{
          eventType: 'valid_cancellation',
          occurredAt: input.requestedAt,
          metadata: { reasonCode: input.reasonCode, validReason: true },
        }]
      : []

  return {
    reasonCode: input.reasonCode,
    protectedReason,
    avoidableReason,
    preliminaryClassification,
    isInsideProtectedWindow,
    requiresEvidence,
    reliabilityEvents,
    builderNotificationCopy: BUILDER_REASSIGNMENT_COPY,
    inspectorNotificationCopy: isReliabilityImpacting
      ? INSPECTOR_INVALID_LATE_CANCELLATION_COPY
      : INSPECTOR_VALID_CANCELLATION_COPY,
    appealAvailable: isReliabilityImpacting || preliminaryClassification === 'admin_review_required',
  }
}

export function evaluateNoShowPolicy(occurredAt: string): NoShowPolicyResult {
  return {
    reliabilityEvents: [{
      eventType: 'NO_SHOW',
      occurredAt,
      metadata: {
        adminReviewRequired: true,
        payoutBlocked: true,
      },
    }],
    payoutBlocked: true,
    adminReviewRequired: true,
    refundCreditWorkflow: 'policy_configured',
    builderNotificationCopy: BUILDER_REASSIGNMENT_COPY,
    inspectorNotificationCopy: INSPECTOR_INVALID_LATE_CANCELLATION_COPY,
    appealAvailable: true,
  }
}

export function selectStandbyInspectorCandidates(
  job: StandbyJobContext,
  candidates: StandbyInspectorCandidateInput[],
  limit = 2,
): StandbyCandidateSelection[] {
  return candidates
    .filter(candidate => isStandbyEligible(job, candidate))
    .sort((a, b) => {
      const tierComparison = standbyTierRank(a.reliabilityTier) - standbyTierRank(b.reliabilityTier)
      if (tierComparison !== 0) return tierComparison
      return (b.reliabilityScore ?? 75) - (a.reliabilityScore ?? 75)
    })
    .slice(0, Math.max(0, limit))
    .map((candidate, index) => ({
      jobId: job.jobId,
      inspectorId: candidate.inspectorId,
      rank: index + 1,
      status: 'identified',
      reliabilityTier: candidate.reliabilityTier ?? 'verified',
      reliabilityScore: candidate.reliabilityScore ?? 75,
    }))
}

export function evaluateStandbyActivation(
  trigger: StandbyActivationTrigger,
  options: {
    notificationsEnabled?: boolean
    rushMultiplierOffered?: number
  } = {},
): StandbyActivationEvaluation {
  if (trigger === 'missed_4h_confirmation') {
    const softAlertOnly = options.notificationsEnabled !== false
    return {
      trigger,
      candidateStatus: softAlertOnly ? 'soft_alerted' : 'identified',
      sendInspectorOffers: false,
      softAlertOnly,
      builderNotified: false,
    }
  }

  return {
    trigger,
    candidateStatus: 'offered',
    sendInspectorOffers: true,
    softAlertOnly: false,
    builderNotified: true,
    builderNotificationCopy: BUILDER_STANDBY_ACTIVATION_COPY,
    inspectorNotificationCopy: INSPECTOR_STANDBY_OFFER_COPY,
    rushMultiplierOffered: options.rushMultiplierOffered ?? 1,
  }
}

export function acceptStandbyOfferState(input: {
  jobId: string
  originalAssignmentId: string
  originalInspectorId: string
  standbyInspectorId: string
  standbyInviteId: string
  acceptedAt: string
  reason?: string
}): StandbyAcceptanceResult {
  return {
    originalAssignmentId: input.originalAssignmentId,
    originalAssignmentStatus: 'cancelled',
    originalInspectorId: input.originalInspectorId,
    newAssignment: {
      jobId: input.jobId,
      inspectorId: input.standbyInspectorId,
      sourceInviteId: input.standbyInviteId,
      status: 'confirmed',
    },
    acceptedInviteStatus: 'accepted',
    builderNotificationCopy: BUILDER_STANDBY_ACTIVATION_COPY,
    reliabilityEvents: [
      {
        eventType: 'PRIMARY_REASSIGNED',
        occurredAt: input.acceptedAt,
        metadata: {
          standbyInviteId: input.standbyInviteId,
          originalInspectorId: input.originalInspectorId,
          standbyInspectorId: input.standbyInspectorId,
          reason: input.reason ?? 'standby_accepted',
        },
      },
      {
        eventType: 'STANDBY_ACCEPTED',
        occurredAt: input.acceptedAt,
        metadata: {
          standbyInviteId: input.standbyInviteId,
          originalAssignmentId: input.originalAssignmentId,
        },
      },
    ],
  }
}

export function evaluateInspectionPayout(
  input: InspectionPayoutEvaluationInput,
): PayoutEvaluationResult {
  const policy = normalizePayoutPolicyConfig(input.policyConfig)
  const rollout = evaluateReliabilityRollout(input.policyConfig)
  const asOf = input.asOf ? new Date(input.asOf) : new Date()
  const consequencesEnforced = rollout.financialConsequencesEnforced
  const payoutSpeedCategory = payoutSpeedForTier(input.inspectorTier)
  const payoutEligibleAt = new Date(
    asOf.getTime() + ((policy.payoutSpeedDays?.[payoutSpeedCategory] ?? 5) * 24 * 60 * 60_000),
  ).toISOString()
  const auditEvents = ['payout.evaluated']
  const inspectorProtected = input.builderSiteNotReady === true || input.builderCancelledAfterDeparture === true

  let payoutStatus: ReliabilityPayoutStatus = 'eligible'
  let blockReason: string | undefined

  if (input.hasNoShow) {
    payoutStatus = 'blocked'
    blockReason = 'no_show'
  } else if (input.hasActiveDispute) {
    if (input.payoutAlreadyReleasedAt) {
      payoutStatus = 'review'
      blockReason = 'post_release_dispute'
      auditEvents.push('payout.post_release_dispute_review')
    } else {
      payoutStatus = 'blocked'
      blockReason = 'active_dispute'
    }
  } else if (!input.evidenceComplete || !input.documentedProfessionalWork) {
    payoutStatus = 'review'
    blockReason = 'incomplete_evidence'
  } else if (input.hasInvalidLateCancellation) {
    payoutStatus = policy.invalidLateCancellationPayoutAction === 'blocked' ? 'blocked' : 'review'
    blockReason = 'invalid_late_cancellation'
  } else if (inspectorProtected) {
    blockReason = input.builderCancelledAfterDeparture
      ? 'builder_cancelled_after_departure_protected'
      : 'builder_site_not_ready_protected'
    auditEvents.push('inspector.protected')
  }

  if (input.outcome === 'fail' || input.outcome === 'hold' || input.outcome === 'modification_required') {
    auditEvents.push('valid_professional_work.payout_not_outcome_gated')
  }

  const reservePercent = policy.reserveHooksEnabled
    ? policy.tierReservePercents?.[input.inspectorTier] ?? 0
    : 0
  const reserveAmount = roundMoney(input.grossPayoutAmount * reservePercent / 100)
  const reserveLedgerEntries: ReserveLedgerProjection[] = reserveAmount > 0
    ? [{
        entryType: consequencesEnforced ? 'reserve_hold' : 'observe_only_projection',
        amount: reserveAmount,
        releaseEligibleAt: new Date(
          asOf.getTime() + ((policy.reserveReleaseDays ?? 30) * 24 * 60 * 60_000),
        ).toISOString(),
        enforcementMode: policy.enforcementMode,
        status: consequencesEnforced ? 'posted' : 'pending',
        reason: 'Tier-based reserve hook calculated from active reliability policy.',
      }]
    : []

  const needsBuilderCredit = input.hasNoShow === true || input.hasInvalidLateCancellation === true
  const builderCreditHook: BuilderCreditProjection | undefined = needsBuilderCredit
    ? {
        amount: roundMoney(policy.builderCreditAmount ?? 0),
        fundingSource: policy.builderCreditFundingSource ?? 'policy_configured',
        status: !consequencesEnforced || !policy.builderCreditHooksEnabled
          ? 'projected'
          : 'pending_admin_review',
        escrowProtected: true,
      }
    : (input.builderSiteNotReady || input.builderCancelledAfterDeparture) && (policy.builderSiteNotReadyFeeAmount ?? 0) > 0
      ? {
          amount: roundMoney(policy.builderSiteNotReadyFeeAmount ?? 0),
          fundingSource: 'escrow_refund',
          status: consequencesEnforced ? 'pending_admin_review' : 'projected',
          escrowProtected: true,
        }
      : undefined

  const escrowStatus = payoutStatus === 'blocked'
    ? consequencesEnforced ? 'blocked' : 'earned_pending_review'
    : payoutStatus === 'eligible' && consequencesEnforced
      ? 'payout_ready'
      : 'earned_pending_review'

  return {
    payoutStatus,
    escrowStatus,
    blockReason,
    payoutSpeedCategory,
    payoutEligibleAt,
    reserveLedgerEntries,
    builderCreditHook,
    inspectorProtected,
    consequencesEnforced,
    auditEvents,
  }
}

export function applyAdminPayoutOverride(input: AdminPayoutOverrideInput): PayoutEvaluationResult {
  if (!input.adminNote.trim()) {
    throw new Error('Admin rationale is required for payout override.')
  }

  if (input.decision === 'block_payout') {
    return {
      ...input.current,
      payoutStatus: 'blocked',
      escrowStatus: 'blocked',
      blockReason: input.current.blockReason ?? 'admin_blocked',
      auditEvents: [...input.current.auditEvents, 'payout.admin_blocked'],
    }
  }

  if (
    input.decision === 'approve_payout'
    || input.decision === 'reduce_payout'
    || input.decision === 'waive_consequence'
  ) {
    return {
      ...input.current,
      payoutStatus: 'eligible',
      escrowStatus: 'payout_ready',
      blockReason: input.decision === 'waive_consequence' ? undefined : input.current.blockReason,
      auditEvents: [
        ...input.current.auditEvents,
        input.decision === 'reduce_payout' ? 'payout.admin_reduced' : 'payout.admin_released',
      ],
    }
  }

  if (input.decision === 'issue_builder_credit') {
    return {
      ...input.current,
      builderCreditHook: {
        amount: roundMoney(input.builderCreditAmount ?? input.current.builderCreditHook?.amount ?? 0),
        fundingSource: input.current.builderCreditHook?.fundingSource ?? 'policy_configured',
        status: 'pending_admin_review',
        escrowProtected: true,
      },
      auditEvents: [...input.current.auditEvents, 'builder_credit.admin_approved'],
    }
  }

  return {
    ...input.current,
    reserveLedgerEntries: input.current.reserveLedgerEntries.map(entry => ({
      ...entry,
      status: 'posted',
    })),
    auditEvents: [...input.current.auditEvents, 'reserve.admin_applied'],
  }
}

export const DEFAULT_RELIABILITY_TIERS: ReliabilityTierDefinition[] = [
  { tierKey: 'restricted', label: 'Restricted', minScore: 0, maxScore: 59.99, opportunityRank: 500 },
  { tierKey: 'provisional', label: 'Provisional', minScore: 60, maxScore: 74.99, opportunityRank: 300 },
  { tierKey: 'standard', label: 'Standard', minScore: 75, maxScore: 89.99, opportunityRank: 200 },
  { tierKey: 'preferred', label: 'Preferred', minScore: 90, maxScore: 96.99, opportunityRank: 100 },
  { tierKey: 'premier', label: 'Premier', minScore: 97, maxScore: 100, opportunityRank: 50 },
]

export const DEFAULT_RELIABILITY_POLICY: ReliabilityPolicyConfig = {
  enforcementMode: 'observe_only',
  eventScoreDeltas: {
    claim_commitment_accepted: 0,
    assignment_confirmed: 0,
    pre_site_confirmation_sent: 0,
    pre_site_confirmation_completed: 0.5,
    pre_site_confirmation_missed: -2,
    en_route_marked: 0.5,
    arrival_confirmed: 1,
    completed_professional_work: 2,
    valid_cancellation: 0,
    invalid_late_cancellation: -12,
    no_show: -25,
    builder_site_not_ready: 0,
    standby_invited: 0,
    standby_assigned: 1,
    admin_override: 0,
    evidence_incomplete: -5,
    dispute_opened: -4,
    dispute_resolved_inspector_fault: -10,
    dispute_resolved_no_fault: 0,
    response_recorded: 0,
    CONFIRMATION_COMPLETED: 0.5,
    CONFIRMATION_MISSED: -2,
    DEPARTURE_CONFIRMED: 0.5,
    ARRIVAL_CONFIRMED: 1,
    LATE_ARRIVAL: -3,
    ON_TIME_ARRIVAL: 1,
    LATE_CANCELLATION: -12,
    NO_SHOW: -25,
    STANDBY_CANDIDATE_IDENTIFIED: 0,
    STANDBY_SOFT_ALERTED: 0,
    STANDBY_OFFERED: 0,
    STANDBY_ACCEPTED: 1,
    PRIMARY_REASSIGNED: 0,
  },
  thresholds: {
    lookbackDays: 365,
    recentHalfLifeDays: 90,
    seriousNoShowLookbackDays: 730,
    seriousNoShowHalfLifeDays: 365,
    newInspectorScore: 75,
    newInspectorResponseTimeScore: 75,
    missedConfirmationPenalty: 2,
    invalidLateCancellationPenalty: 4,
    noShowPenalty: 10,
    evidenceIncompletePenalty: 5,
    restrictedNoShowCount: 2,
    suspensionNoShowCount: 3,
  },
  tierRules: {
    verified: {
      tier: 'verified',
      minScore: 0,
      minCompletedProfessionalWork: 0,
      minAttendanceRate: 0,
      minEvidenceCompletenessRate: 0,
      maxDisputeRate: 1,
      maxNoShowCount: 1,
      reserveRequirementPercent: 10,
      payoutSpeedCategory: 'normal',
      dispatchPriorityWeight: 1,
    },
    preferred: {
      tier: 'preferred',
      minScore: 85,
      minCompletedProfessionalWork: 5,
      minAttendanceRate: 0.92,
      minEvidenceCompletenessRate: 0.85,
      maxDisputeRate: 0.06,
      maxNoShowCount: 0,
      reserveRequirementPercent: 7.5,
      payoutSpeedCategory: 'slightly_faster',
      dispatchPriorityWeight: 1.15,
    },
    priority: {
      tier: 'priority',
      minScore: 92,
      minCompletedProfessionalWork: 15,
      minAttendanceRate: 0.96,
      minEvidenceCompletenessRate: 0.9,
      maxDisputeRate: 0.04,
      maxNoShowCount: 0,
      reserveRequirementPercent: 5,
      payoutSpeedCategory: 'faster',
      dispatchPriorityWeight: 1.35,
    },
    elite: {
      tier: 'elite',
      minScore: 97,
      minCompletedProfessionalWork: 25,
      minAttendanceRate: 0.98,
      minEvidenceCompletenessRate: 0.96,
      maxDisputeRate: 0.02,
      maxNoShowCount: 0,
      reserveRequirementPercent: 2.5,
      payoutSpeedCategory: 'fastest',
      dispatchPriorityWeight: 1.6,
    },
    restricted: {
      tier: 'restricted',
      minScore: 0,
      minCompletedProfessionalWork: 0,
      minAttendanceRate: 0,
      minEvidenceCompletenessRate: 0,
      maxDisputeRate: 1,
      maxNoShowCount: Number.POSITIVE_INFINITY,
      reserveRequirementPercent: 20,
      payoutSpeedCategory: 'admin_hold',
      dispatchPriorityWeight: 0.25,
    },
    suspension_review: {
      tier: 'suspension_review',
      minScore: 0,
      minCompletedProfessionalWork: 0,
      minAttendanceRate: 0,
      minEvidenceCompletenessRate: 0,
      maxDisputeRate: 1,
      maxNoShowCount: Number.POSITIVE_INFINITY,
      reserveRequirementPercent: 30,
      payoutSpeedCategory: 'admin_hold',
      dispatchPriorityWeight: 0,
    },
  },
}

const DEFAULT_TIER_ORDER: InspectorReliabilityTier[] = [
  'elite',
  'priority',
  'preferred',
  'verified',
]

export function deriveReliabilityTier(
  score: number,
  tiers: ReliabilityTierDefinition[] = DEFAULT_RELIABILITY_TIERS,
): ReliabilityTierDefinition {
  const clampedScore = clampScore(score)
  const sorted = [...tiers].sort((a, b) => b.minScore - a.minScore)
  return sorted.find(tier => clampedScore >= tier.minScore && clampedScore <= tier.maxScore)
    ?? sorted[sorted.length - 1]
    ?? DEFAULT_RELIABILITY_TIERS[0]
}

export function isCompletedProfessionalWork(event: ReliabilityEventInput): boolean {
  return event.eventType === 'completed_professional_work'
}

export function scoreReliabilityEvents(
  events: ReliabilityEventInput[],
  policy: ReliabilityPolicyConfig = DEFAULT_RELIABILITY_POLICY,
  tiers: ReliabilityTierDefinition[] = DEFAULT_RELIABILITY_TIERS,
): ReliabilityScoreSummary {
  let score = 100
  const counts: ReliabilityScoreSummary['counts'] = {
    completedProfessionalWork: 0,
    claimCommitments: 0,
    validCancellations: 0,
    invalidLateCancellations: 0,
    noShows: 0,
    builderSiteNotReady: 0,
    missedConfirmations: 0,
  }

  for (const event of events) {
    if (isCompletedProfessionalWork(event)) counts.completedProfessionalWork += 1
    if (event.eventType === 'claim_commitment_accepted') counts.claimCommitments += 1
    if (event.eventType === 'valid_cancellation') counts.validCancellations += 1
    if (event.eventType === 'invalid_late_cancellation' || event.eventType === 'LATE_CANCELLATION') counts.invalidLateCancellations += 1
    if (event.eventType === 'no_show' || event.eventType === 'NO_SHOW') counts.noShows += 1
    if (event.eventType === 'builder_site_not_ready') counts.builderSiteNotReady += 1
    if (event.eventType === 'pre_site_confirmation_missed' || event.eventType === 'CONFIRMATION_MISSED') counts.missedConfirmations += 1

    const delta = event.scoreDelta ?? policy.eventScoreDeltas[event.eventType] ?? 0
    score = clampScore(score + delta)
  }

  return {
    score,
    tierKey: deriveReliabilityTier(score, tiers).tierKey,
    counts,
  }
}

export function calculateInspectorReliability(
  input: InspectorReliabilityCalculationInput,
): InspectorReliabilityCalculationResult {
  const policy = normalizePolicyConfig(input.policyConfig)
  const rollout = evaluateReliabilityRollout(input.policyConfig)
  const thresholds = normalizeThresholds(policy.thresholds)
  const tierRules = normalizeTierRules(policy)
  const asOf = input.asOf ? new Date(input.asOf) : new Date()
  const credentialComplianceStatus = input.credentialComplianceStatus ?? 'compliant'
  const explanations: ReliabilityCalculationExplanation[] = []

  let completedWeight = 0
  let attendanceObligationWeight = 0
  let invalidLateCancellationWeight = 0
  let missedConfirmationWeight = 0
  let noShowWeightedPenaltyCount = 0
  let noShowCount = 0
  let seriousNoShowPatternCount = 0
  let completedProfessionalWorkCount = 0
  let evidenceCompletenessWeightedTotal = 0
  let evidenceCompletenessWeight = 0
  let evidenceIncompleteWeight = 0
  let protectedEventCount = 0
  let disputeWeightedCount = 0
  let responseScoreWeightedTotal = 0
  let responseScoreWeight = 0

  for (const event of input.events) {
    if (isAuditedNeutralizingOverride(event)) {
      explanations.push({
        code: 'admin_override_neutralized',
        severity: 'info',
        message: 'Admin override neutralized a reliability event for scoring.',
        metadata: {
          eventType: event.eventType,
          reviewedBy: event.adminOverride?.reviewedBy,
          reviewedAt: event.adminOverride?.reviewedAt,
          reason: event.adminOverride?.reason,
        },
      })
      continue
    }

    const weight = eventRecencyWeight(event, asOf, thresholds.recentHalfLifeDays)
    const seriousWeight = eventRecencyWeight(event, asOf, thresholds.seriousNoShowHalfLifeDays)

    if (event.eventType === 'completed_professional_work') {
      completedProfessionalWorkCount += 1
      completedWeight += weight
      attendanceObligationWeight += weight

      const evidenceCompleteness = getEvidenceCompleteness(event)
      evidenceCompletenessWeightedTotal += evidenceCompleteness * weight
      evidenceCompletenessWeight += weight
      if (evidenceCompleteness < 1) evidenceIncompleteWeight += (1 - evidenceCompleteness) * weight

      const responseScore = getEventResponseScore(event)
      if (responseScore !== null) {
        responseScoreWeightedTotal += responseScore * weight
        responseScoreWeight += weight
      }

      if (event.metadata?.inspectionOutcome === 'fail') {
        explanations.push({
          code: 'completed_fail_valid',
          severity: 'info',
          message: 'Completed Fail outcome counted as valid professional work because reliability does not reward Pass outcomes.',
        })
      }
    }

    if (event.eventType === 'response_recorded') {
      const responseScore = getEventResponseScore(event)
      if (responseScore !== null) {
        responseScoreWeightedTotal += responseScore * weight
        responseScoreWeight += weight
      }
    }

    if (event.eventType === 'valid_cancellation') {
      explanations.push({
        code: 'valid_cancellation_protected',
        severity: 'info',
        message: 'Valid safety or emergency cancellation did not materially reduce reliability.',
        metadata: { reasonCode: event.metadata?.reasonCode },
      })
      continue
    }

    if (event.eventType === 'builder_site_not_ready') {
      protectedEventCount += 1
      explanations.push({
        code: 'builder_site_not_ready_protected',
        severity: 'info',
        message: 'Builder site-not-ready event protected the inspector from reliability penalty.',
      })
      continue
    }

    if (event.eventType === 'invalid_late_cancellation' || event.eventType === 'LATE_CANCELLATION') {
      invalidLateCancellationWeight += weight
      attendanceObligationWeight += weight
    }

    if (event.eventType === 'no_show' || event.eventType === 'NO_SHOW') {
      noShowCount += 1
      noShowWeightedPenaltyCount += seriousWeight
      attendanceObligationWeight += weight
      if (isWithinLookback(event, asOf, thresholds.seriousNoShowLookbackDays)) {
        seriousNoShowPatternCount += 1
      }
    }

    if (event.eventType === 'pre_site_confirmation_missed' || event.eventType === 'CONFIRMATION_MISSED') {
      missedConfirmationWeight += weight
    }

    if (event.eventType === 'LATE_ARRIVAL') {
      missedConfirmationWeight += weight
    }

    if (event.eventType === 'evidence_incomplete') {
      evidenceIncompleteWeight += weight
    }

    if (event.eventType === 'dispute_opened' || event.eventType === 'dispute_resolved_inspector_fault') {
      disputeWeightedCount += weight
    }
  }

  const hasScoredHistory = completedProfessionalWorkCount > 0
    || invalidLateCancellationWeight > 0
    || noShowCount > 0
    || missedConfirmationWeight > 0
    || disputeWeightedCount > 0
    || evidenceIncompleteWeight > 0
  const hasPositiveReliabilityEvidence = completedProfessionalWorkCount > 0
    || responseScoreWeight > 0

  const attendanceRate = attendanceObligationWeight > 0
    ? completedWeight / attendanceObligationWeight
    : 1
  const lateCancellationRate = attendanceObligationWeight > 0
    ? invalidLateCancellationWeight / attendanceObligationWeight
    : 0
  const evidenceCompletenessRate = evidenceCompletenessWeight > 0
    ? evidenceCompletenessWeightedTotal / evidenceCompletenessWeight
    : 1
  const disputeRate = completedWeight > 0
    ? Math.min(1, disputeWeightedCount / completedWeight)
    : disputeWeightedCount > 0 ? 1 : 0
  const responseTimeScore = responseScoreWeight > 0
    ? responseScoreWeightedTotal / responseScoreWeight
    : thresholds.newInspectorResponseTimeScore

  let reliabilityScore = hasScoredHistory && hasPositiveReliabilityEvidence
    ? (
        (attendanceRate * 35)
        + (evidenceCompletenessRate * 20)
        + ((responseTimeScore / 100) * 15)
        + ((1 - disputeRate) * 15)
        + credentialScore(credentialComplianceStatus)
      )
    : thresholds.newInspectorScore

  reliabilityScore -= missedConfirmationWeight * thresholds.missedConfirmationPenalty
  reliabilityScore -= invalidLateCancellationWeight * thresholds.invalidLateCancellationPenalty
  reliabilityScore -= noShowWeightedPenaltyCount * thresholds.noShowPenalty
  reliabilityScore -= evidenceIncompleteWeight * thresholds.evidenceIncompletePenalty
  reliabilityScore = clampScore(reliabilityScore)

  if (noShowCount > 0) {
    explanations.push({
      code: 'no_show_recorded',
      severity: noShowCount >= thresholds.suspensionNoShowCount ? 'critical' : 'warning',
      message: 'No-show events materially reduce reliability and remain visible for a longer review window.',
      metadata: { noShowCount, seriousNoShowPatternCount },
    })
  }

  if (evidenceCompletenessRate < 1 || evidenceIncompleteWeight > 0) {
    explanations.push({
      code: 'evidence_incomplete',
      severity: 'warning',
      message: 'Incomplete evidence reduced documentation quality in the reliability score.',
      metadata: { evidenceCompletenessRate: roundRate(evidenceCompletenessRate) },
    })
  }

  if (credentialComplianceStatus !== 'compliant') {
    explanations.push({
      code: 'credential_compliance',
      severity: credentialComplianceStatus === 'suspended' || credentialComplianceStatus === 'expired' ? 'critical' : 'warning',
      message: 'Credential compliance status limits recommended tier and dispatch access.',
      metadata: { credentialComplianceStatus },
    })
  }

  if (protectedEventCount > 0) {
    explanations.push({
      code: 'protected_events',
      severity: 'info',
      message: 'Protected builder/site events were excluded from negative scoring.',
      metadata: { protectedEventCount },
    })
  }

  let recommendedTier = recommendTier({
    score: reliabilityScore,
    completedProfessionalWorkCount,
    attendanceRate,
    evidenceCompletenessRate,
    disputeRate,
    noShowCount: seriousNoShowPatternCount,
    credentialComplianceStatus,
    tierRules,
    thresholds,
  })

  if (policy.enforcementMode === 'observe_only') {
    explanations.push({
      code: 'observe_only',
      severity: 'info',
      message: 'Reliability consequences are calculated for review only; reserve, payout, and access changes are not enforced.',
    })
  }

  if (rollout.emergencyKillSwitch) {
    explanations.push({
      code: 'emergency_kill_switch',
      severity: 'critical',
      message: 'Automatic reliability enforcement is disabled by Admin kill switch.',
    })
  }

  const consequenceTier = tierRules[recommendedTier]
  if (!consequenceTier) {
    recommendedTier = 'verified'
  }
  const finalTierRule = tierRules[recommendedTier] ?? tierRules.verified

  explanations.push({
    code: 'tier_recommended',
    severity: recommendedTier === 'restricted' || recommendedTier === 'suspension_review' ? 'critical' : 'info',
    message: `Recommended reliability tier: ${formatTierLabel(recommendedTier)}.`,
    metadata: {
      reliabilityScore,
      completedProfessionalWorkCount,
      attendanceRate: roundRate(attendanceRate),
      evidenceCompletenessRate: roundRate(evidenceCompletenessRate),
      disputeRate: roundRate(disputeRate),
    },
  })

  return {
    reliabilityScore,
    attendanceRate: roundRate(attendanceRate),
    lateCancellationRate: roundRate(lateCancellationRate),
    noShowCount,
    evidenceCompletenessRate: roundRate(evidenceCompletenessRate),
    disputeRate: roundRate(disputeRate),
    responseTimeScore: clampScore(responseTimeScore),
    credentialComplianceStatus,
    recommendedTier,
    reserveRequirementPercent: finalTierRule.reserveRequirementPercent,
    payoutSpeedCategory: finalTierRule.payoutSpeedCategory,
    dispatchPriorityWeight: finalTierRule.dispatchPriorityWeight,
    enforcementMode: policy.enforcementMode,
    consequencesEnforced: rollout.financialConsequencesEnforced || rollout.automaticInspectorRestrictionAllowed,
    explanations,
  }
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.min(100, Math.max(0, Number(score.toFixed(2))))
}

function definitionForCheckpoint(checkpoint: AttendanceConfirmationCheckpoint): AttendanceCheckpointDefinition | undefined {
  return ATTENDANCE_CONFIRMATION_LADDER.find(item => item.checkpoint === checkpoint)
}

function checkpointSortValue(confirmation: JobAttendanceConfirmation, asOfTime: number): number {
  if (!confirmation.requiredAt) return Number.MAX_SAFE_INTEGER
  const requiredTime = new Date(confirmation.requiredAt).getTime()
  if (!Number.isFinite(requiredTime)) return Number.MAX_SAFE_INTEGER
  return requiredTime < asOfTime ? requiredTime - asOfTime : requiredTime
}

function isStandbyEligible(
  job: StandbyJobContext,
  candidate: StandbyInspectorCandidateInput,
): boolean {
  if (candidate.inspectorId === job.primaryInspectorId) return false
  if (candidate.onboardingStatus !== 'approved') return false
  if (candidate.suspended || candidate.restricted) return false
  if (standbyTierRank(candidate.reliabilityTier) >= standbyTierRank('restricted')) return false
  if (candidate.available === false) return false
  if (!candidate.disciplines.includes(job.requiredDiscipline)) return false
  if (!candidate.regions.includes(job.region)) return false
  if (candidate.permitFamilies?.length && !candidate.permitFamilies.includes(job.permitFamily)) return false
  if (
    candidate.stageEligibility?.length
    && job.stageName
    && !candidate.stageEligibility.includes(job.stageName)
  ) return false

  return true
}

function standbyTierRank(tier?: InspectorReliabilityTier | ReliabilityTierKey | string | null): number {
  switch (tier) {
    case 'elite':
    case 'premier':
      return 1
    case 'priority':
    case 'preferred':
      return 2
    case 'verified':
    case 'standard':
      return 3
    case 'provisional':
      return 4
    case 'restricted':
    case 'suspension_review':
      return 99
    default:
      return 5
  }
}

function normalizePayoutPolicyConfig(
  policyConfig?: Partial<PayoutPolicyConfig> | Record<string, unknown> | null,
): PayoutPolicyConfig {
  const config = isRecord(policyConfig) ? policyConfig : {}
  const enforcementMode = isReliabilityEnforcementMode(config.enforcementMode)
    ? config.enforcementMode
    : 'observe_only'

  return {
    enforcementMode,
    reserveHooksEnabled: config.reserveHooksEnabled === true,
    reserveReleaseDays: numberOrUndefined(config.reserveReleaseDays),
    tierReservePercents: isRecord(config.tierReservePercents)
      ? Object.fromEntries(
          Object.entries(config.tierReservePercents)
            .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
            .map(([key, value]) => [key, Math.max(0, value as number)]),
        ) as PayoutPolicyConfig['tierReservePercents']
      : {},
    payoutSpeedDays: isRecord(config.payoutSpeedDays)
      ? Object.fromEntries(
          Object.entries(config.payoutSpeedDays)
            .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
            .map(([key, value]) => [key, Math.max(0, value as number)]),
        ) as PayoutPolicyConfig['payoutSpeedDays']
      : defaultPayoutSpeedDays(),
    invalidLateCancellationPayoutAction: config.invalidLateCancellationPayoutAction === 'blocked'
      ? 'blocked'
      : 'review',
    builderCreditHooksEnabled: config.builderCreditHooksEnabled === true,
    builderCreditAmount: numberOrUndefined(config.builderCreditAmount),
    builderCreditFundingSource: isBuilderCreditFundingSource(config.builderCreditFundingSource)
      ? config.builderCreditFundingSource
      : 'policy_configured',
    builderSiteNotReadyFeeAmount: numberOrUndefined(config.builderSiteNotReadyFeeAmount),
  }
}

function payoutSpeedForTier(tier: InspectorReliabilityTier | ReliabilityTierKey): PayoutSpeedCategory {
  switch (tier) {
    case 'elite':
    case 'premier':
      return 'fastest'
    case 'priority':
      return 'faster'
    case 'preferred':
      return 'slightly_faster'
    case 'restricted':
    case 'suspension_review':
      return 'admin_hold'
    default:
      return 'normal'
  }
}

function defaultPayoutSpeedDays(): Record<PayoutSpeedCategory, number> {
  return {
    normal: 5,
    slightly_faster: 3,
    faster: 2,
    fastest: 1,
    admin_hold: 999,
  }
}

function roundMoney(amount: number): number {
  if (!Number.isFinite(amount)) return 0
  return Math.round(Math.max(0, amount) * 100) / 100
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isBuilderCreditFundingSource(value: unknown): value is BuilderCreditFundingSource {
  return value === 'policy_configured'
    || value === 'escrow_refund'
    || value === 'platform_budget'
    || value === 'rush_budget'
    || value === 'inspector_reserve'
}

function distanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180
  const radiusMeters = 6_371_000
  const latitudeDelta = toRadians(latitudeB - latitudeA)
  const longitudeDelta = toRadians(longitudeB - longitudeA)
  const a = (
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(latitudeA))
    * Math.cos(toRadians(latitudeB))
    * Math.sin(longitudeDelta / 2) ** 2
  )

  return radiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function isWithinProtectedAppointmentWindow(input: {
  requestedAt: string
  scheduledStartAt?: string | null
  protectedWindowMinutes?: number
}): boolean {
  if (!input.scheduledStartAt) return false
  const requestedAt = new Date(input.requestedAt).getTime()
  const scheduledStartAt = new Date(input.scheduledStartAt).getTime()
  if (!Number.isFinite(requestedAt) || !Number.isFinite(scheduledStartAt)) return false
  const windowMs = (input.protectedWindowMinutes ?? 240) * 60_000
  return scheduledStartAt - requestedAt <= windowMs
}

function normalizePolicyConfig(
  rawConfig?: Partial<ReliabilityPolicyConfig> | Record<string, unknown> | null,
): ReliabilityPolicyConfig {
  if (!rawConfig || typeof rawConfig !== 'object') return DEFAULT_RELIABILITY_POLICY

  const config = rawConfig as Record<string, unknown>
  const enforcementMode = isReliabilityEnforcementMode(config.enforcementMode)
    ? config.enforcementMode
    : isReliabilityEnforcementMode(config.enforcement_mode)
      ? config.enforcement_mode
      : DEFAULT_RELIABILITY_POLICY.enforcementMode

  return {
    ...DEFAULT_RELIABILITY_POLICY,
    enforcementMode,
    eventScoreDeltas: {
      ...DEFAULT_RELIABILITY_POLICY.eventScoreDeltas,
      ...(isRecord(config.eventScoreDeltas) ? config.eventScoreDeltas : {}),
    },
    thresholds: {
      ...DEFAULT_RELIABILITY_POLICY.thresholds!,
      ...(isRecord(config.thresholds) ? config.thresholds : {}),
    },
    tierRules: mergeTierRules(config.tierRules),
  }
}

function normalizeThresholds(rawThresholds?: Partial<ReliabilityPolicyThresholds>): ReliabilityPolicyThresholds {
  const defaults = DEFAULT_RELIABILITY_POLICY.thresholds as ReliabilityPolicyThresholds
  return {
    lookbackDays: numberOrDefault(rawThresholds?.lookbackDays, defaults.lookbackDays),
    recentHalfLifeDays: numberOrDefault(rawThresholds?.recentHalfLifeDays, defaults.recentHalfLifeDays),
    seriousNoShowLookbackDays: numberOrDefault(rawThresholds?.seriousNoShowLookbackDays, defaults.seriousNoShowLookbackDays),
    seriousNoShowHalfLifeDays: numberOrDefault(rawThresholds?.seriousNoShowHalfLifeDays, defaults.seriousNoShowHalfLifeDays),
    newInspectorScore: numberOrDefault(rawThresholds?.newInspectorScore, defaults.newInspectorScore),
    newInspectorResponseTimeScore: numberOrDefault(rawThresholds?.newInspectorResponseTimeScore, defaults.newInspectorResponseTimeScore),
    missedConfirmationPenalty: numberOrDefault(rawThresholds?.missedConfirmationPenalty, defaults.missedConfirmationPenalty),
    invalidLateCancellationPenalty: numberOrDefault(rawThresholds?.invalidLateCancellationPenalty, defaults.invalidLateCancellationPenalty),
    noShowPenalty: numberOrDefault(rawThresholds?.noShowPenalty, defaults.noShowPenalty),
    evidenceIncompletePenalty: numberOrDefault(rawThresholds?.evidenceIncompletePenalty, defaults.evidenceIncompletePenalty),
    restrictedNoShowCount: numberOrDefault(rawThresholds?.restrictedNoShowCount, defaults.restrictedNoShowCount),
    suspensionNoShowCount: numberOrDefault(rawThresholds?.suspensionNoShowCount, defaults.suspensionNoShowCount),
  }
}

function normalizeTierRules(policy: ReliabilityPolicyConfig): Record<InspectorReliabilityTier, InspectorReliabilityTierRule> {
  return mergeTierRules(policy.tierRules)
}

function mergeTierRules(
  rules?: unknown,
): Record<InspectorReliabilityTier, InspectorReliabilityTierRule> {
  const merged = { ...DEFAULT_RELIABILITY_POLICY.tierRules } as Record<InspectorReliabilityTier, InspectorReliabilityTierRule>
  if (!isRecord(rules)) return merged

  for (const tier of Object.keys(merged) as InspectorReliabilityTier[]) {
    if (isRecord(rules[tier])) {
      merged[tier] = {
        ...merged[tier],
        ...rules[tier],
        tier,
      }
    }
  }

  return merged
}

function recommendTier(input: {
  score: number
  completedProfessionalWorkCount: number
  attendanceRate: number
  evidenceCompletenessRate: number
  disputeRate: number
  noShowCount: number
  credentialComplianceStatus: CredentialComplianceStatus
  tierRules: Record<InspectorReliabilityTier, InspectorReliabilityTierRule>
  thresholds: ReliabilityPolicyThresholds
}): InspectorReliabilityTier {
  if (input.credentialComplianceStatus === 'suspended') return 'suspension_review'
  if (input.noShowCount >= input.thresholds.suspensionNoShowCount) return 'suspension_review'
  if (input.credentialComplianceStatus === 'expired') return 'restricted'
  if (input.noShowCount >= input.thresholds.restrictedNoShowCount) return 'restricted'

  for (const tier of DEFAULT_TIER_ORDER) {
    const rule = input.tierRules[tier]
    if (
      input.score >= rule.minScore
      && input.completedProfessionalWorkCount >= rule.minCompletedProfessionalWork
      && input.attendanceRate >= rule.minAttendanceRate
      && input.evidenceCompletenessRate >= rule.minEvidenceCompletenessRate
      && input.disputeRate <= rule.maxDisputeRate
      && input.noShowCount <= rule.maxNoShowCount
    ) {
      return tier
    }
  }

  return input.score < 55 ? 'restricted' : 'verified'
}

function getEvidenceCompleteness(event: ReliabilityEventInput): number {
  const rawCompleteness = event.metadata?.evidenceCompleteness
  if (typeof rawCompleteness === 'number') return Math.min(1, Math.max(0, rawCompleteness))
  if (event.metadata?.evidenceComplete === false) return 0.5
  return 1
}

function getEventResponseScore(event: ReliabilityEventInput): number | null {
  const responseMinutes = event.metadata?.responseMinutes
  if (typeof responseMinutes !== 'number' || responseMinutes < 0) return null
  const expectedResponseMinutes = typeof event.metadata?.expectedResponseMinutes === 'number'
    ? Math.max(1, event.metadata.expectedResponseMinutes)
    : 60

  if (responseMinutes <= expectedResponseMinutes) return 100
  const maxLateMinutes = expectedResponseMinutes * 4
  if (responseMinutes >= maxLateMinutes) return 0
  return clampScore(100 - (((responseMinutes - expectedResponseMinutes) / (maxLateMinutes - expectedResponseMinutes)) * 100))
}

function eventRecencyWeight(event: ReliabilityEventInput, asOf: Date, halfLifeDays: number): number {
  const eventDate = event.occurredAt ?? event.createdAt
  if (!eventDate) return 1
  const elapsedMs = Math.max(0, asOf.getTime() - new Date(eventDate).getTime())
  const elapsedDays = elapsedMs / 86_400_000
  return Math.pow(0.5, elapsedDays / Math.max(1, halfLifeDays))
}

function isWithinLookback(event: ReliabilityEventInput, asOf: Date, lookbackDays: number): boolean {
  const eventDate = event.occurredAt ?? event.createdAt
  if (!eventDate) return true
  const elapsedMs = Math.max(0, asOf.getTime() - new Date(eventDate).getTime())
  return elapsedMs / 86_400_000 <= lookbackDays
}

function isAuditedNeutralizingOverride(event: ReliabilityEventInput): boolean {
  return event.adminOverride?.neutralize === true
    && Boolean(event.adminOverride.reason)
    && Boolean(event.adminOverride.reviewedBy)
    && Boolean(event.adminOverride.reviewedAt)
}

function credentialScore(status: CredentialComplianceStatus): number {
  if (status === 'compliant') return 15
  if (status === 'needs_review') return 8
  return 0
}

function roundRate(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Number(Math.min(1, Math.max(0, value)).toFixed(4))
}

function formatTierLabel(tier: InspectorReliabilityTier): string {
  return tier.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isReliabilityEnforcementMode(value: unknown): value is ReliabilityEnforcementMode {
  return value === 'observe_only' || value === 'soft_enforcement' || value === 'full_enforcement'
}

function numberOrDefault(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}
