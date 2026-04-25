import type { ReliabilityEnforcementMode } from '@/lib/types'

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
    if (event.eventType === 'invalid_late_cancellation') counts.invalidLateCancellations += 1
    if (event.eventType === 'no_show') counts.noShows += 1
    if (event.eventType === 'builder_site_not_ready') counts.builderSiteNotReady += 1
    if (event.eventType === 'pre_site_confirmation_missed') counts.missedConfirmations += 1

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

    if (event.eventType === 'invalid_late_cancellation') {
      invalidLateCancellationWeight += weight
      attendanceObligationWeight += weight
    }

    if (event.eventType === 'no_show') {
      noShowCount += 1
      noShowWeightedPenaltyCount += seriousWeight
      attendanceObligationWeight += weight
      if (isWithinLookback(event, asOf, thresholds.seriousNoShowLookbackDays)) {
        seriousNoShowPatternCount += 1
      }
    }

    if (event.eventType === 'pre_site_confirmation_missed') {
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

  let reliabilityScore = hasScoredHistory
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
    consequencesEnforced: policy.enforcementMode === 'full_enforcement',
    explanations,
  }
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.min(100, Math.max(0, Number(score.toFixed(2))))
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
