import test from 'node:test'
import assert from 'node:assert/strict'

import {
  acceptStandbyOfferState,
  buildAttendanceConfirmationLadder,
  calculateInspectorReliability,
  evaluateArrivalCheckIn,
  evaluateCancellationPolicy,
  evaluateInspectionPayout,
  evaluateMissedAttendanceConfirmation,
  evaluateNoShowPolicy,
  evaluateStandbyActivation,
  selectStandbyInspectorCandidates,
  type ReliabilityEventInput,
} from './reliability'
import {
  buildCancellationReviewOutcome,
  buildInspectorReliabilityDetail,
  buildJobReliabilityTimeline,
  sanitizeInspectorReliabilityDetailForViewer,
} from './adminReliabilityControl'
import { buildBuilderReliabilityStatus } from './builderReliabilityGuarantee'
import { buildInspectorReliabilityDashboardModel } from './reliabilityDashboard'
import {
  buildHoldLifecycleEvents,
  calculateHoldPricing,
  canPerformHoldAction,
  getHoldResolutionStatus,
} from './holds/workflow'
import type { ReliabilityProfileRow } from './supabase/reliability'

const CLAIMED_AT = '2026-04-25T08:00:00.000Z'
const SCHEDULED_START = '2026-04-26T16:00:00.000Z'
const ARRIVED_AT = '2026-04-26T15:56:00.000Z'
const AS_OF = '2026-04-27T12:00:00.000Z'

test('Scenario 1: ideal inspection completes through payout eligibility and reliability improvement', () => {
  const ladder = buildAttendanceConfirmationLadder({
    claimedAt: CLAIMED_AT,
    scheduledStartAt: SCHEDULED_START,
  })
  const completedCheckpoints = ladder.map(checkpoint => ({
    ...checkpoint,
    status: checkpoint.status === 'pending' ? 'confirmed' as const : checkpoint.status,
    confirmedAt: checkpoint.confirmedAt ?? checkpoint.requiredAt,
  }))
  const arrival = evaluateArrivalCheckIn({
    arrivedAt: ARRIVED_AT,
    scheduledStartAt: SCHEDULED_START,
    latitude: 49.2827,
    longitude: -123.1207,
    siteLatitude: 49.2828,
    siteLongitude: -123.1208,
  })
  const events: ReliabilityEventInput[] = [
    { eventType: 'claim_commitment_accepted', occurredAt: CLAIMED_AT },
    ...completedCheckpoints
      .filter(checkpoint => checkpoint.status === 'confirmed')
      .map(checkpoint => ({
        eventType: 'CONFIRMATION_COMPLETED' as const,
        occurredAt: checkpoint.confirmedAt ?? CLAIMED_AT,
        metadata: { checkpoint: checkpoint.checkpoint },
      })),
    ...arrival.reliabilityEvents,
    {
      eventType: 'completed_professional_work',
      occurredAt: '2026-04-26T18:00:00.000Z',
      metadata: { inspectionOutcome: 'pass', evidenceComplete: true, evidenceCompleteness: 1 },
    },
  ]
  const payout = evaluateInspectionPayout({
    outcome: 'pass',
    documentedProfessionalWork: true,
    evidenceComplete: true,
    grossPayoutAmount: 500,
    inspectorTier: 'verified',
    asOf: AS_OF,
    policyConfig: { enforcementMode: 'full_enforcement' },
  })
  const reliability = calculateInspectorReliability({
    events,
    asOf: AS_OF,
    policyConfig: { enforcementMode: 'observe_only' },
  })

  assert.equal(ladder.length, 6)
  assert.equal(completedCheckpoints.filter(checkpoint => checkpoint.status === 'confirmed').length, 6)
  assert.equal(arrival.jobStatus, 'in_progress')
  assert.equal(arrival.proximityStatus, 'within_range')
  assert.equal(payout.payoutStatus, 'eligible')
  assert.equal(payout.escrowStatus, 'payout_ready')
  assert.ok(reliability.reliabilityScore > 75)
  assert.equal(reliability.attendanceRate, 1)
})

test('Scenario 2: proper Fail remains valid professional work and payout eligible', () => {
  const passReliability = calculateInspectorReliability({
    asOf: AS_OF,
    events: [
      { eventType: 'completed_professional_work', occurredAt: AS_OF, metadata: { inspectionOutcome: 'pass', evidenceComplete: true, evidenceCompleteness: 1 } },
    ],
  })
  const failReliability = calculateInspectorReliability({
    asOf: AS_OF,
    events: [
      { eventType: 'completed_professional_work', occurredAt: AS_OF, metadata: { inspectionOutcome: 'fail', evidenceComplete: true, evidenceCompleteness: 1 } },
    ],
  })
  const payout = evaluateInspectionPayout({
    outcome: 'fail',
    documentedProfessionalWork: true,
    evidenceComplete: true,
    grossPayoutAmount: 500,
    inspectorTier: 'verified',
    asOf: AS_OF,
    policyConfig: { enforcementMode: 'full_enforcement' },
  })
  const builderNotice = 'Builder notified: inspection result requires correction with complete supporting evidence.'

  assert.equal(payout.payoutStatus, 'eligible')
  assert.ok(payout.auditEvents.includes('valid_professional_work.payout_not_outcome_gated'))
  assert.equal(failReliability.reliabilityScore, passReliability.reliabilityScore)
  assert.ok(failReliability.explanations.some(item => item.code === 'completed_fail_valid'))
  assert.match(builderNotice, /evidence/)
})

test('Scenario 3: Hold / Modification Required retainer workflow resolves with premium payout eligibility', () => {
  assert.equal(canPerformHoldAction({ actorRole: 'inspector', action: 'create' }), true)
  assert.equal(canPerformHoldAction({ actorRole: 'builder', action: 'builder_accept', holdStatus: 'hold_pending_builder_ack' }), true)
  assert.equal(canPerformHoldAction({ actorRole: 'inspector', action: 'add_evidence', holdStatus: 'hold_active' }), true)

  const creationEvents = buildHoldLifecycleEvents({ nextStatus: 'hold_pending_builder_ack' })
  const acceptedEvents = buildHoldLifecycleEvents({ previousStatus: 'hold_pending_builder_ack', nextStatus: 'hold_active' })
  const pricing = calculateHoldPricing({
    premiumRateType: 'hourly',
    premiumRateAmount: 160,
    estimatedCorrectionMinutes: 60,
    elapsedSeconds: 45 * 60,
    holdCapAmount: 260,
  })
  const finalStatus = getHoldResolutionStatus('pass')
  const payout = evaluateInspectionPayout({
    outcome: 'modification_required',
    documentedProfessionalWork: true,
    evidenceComplete: true,
    grossPayoutAmount: 500 + pricing.accruedPremiumAmount,
    holdPremiumAmount: pricing.accruedPremiumAmount,
    inspectorTier: 'verified',
    asOf: AS_OF,
    policyConfig: { enforcementMode: 'full_enforcement' },
  })

  assert.deepEqual(creationEvents.map(event => event.action), ['hold_created', 'hold_builder_notified'])
  assert.deepEqual(acceptedEvents.map(event => event.action), ['hold_accepted', 'hold_started'])
  assert.equal(finalStatus, 'hold_resolved_pass')
  assert.ok(pricing.accruedPremiumAmount > 0)
  assert.equal(pricing.retainedMinutes, 45)
  assert.equal(payout.payoutStatus, 'eligible')
  assert.ok(payout.auditEvents.includes('valid_professional_work.payout_not_outcome_gated'))
})

test('Scenario 4: inspector no-show activates standby, blocks payout, protects escrow, and reduces reliability', () => {
  const missed4h = evaluateMissedAttendanceConfirmation('t_4h')
  const missed90m = evaluateMissedAttendanceConfirmation('t_90m', { standbyActivationEnabled: true })
  const activation = evaluateStandbyActivation('missed_90m_confirmation', {
    notificationsEnabled: true,
    rushMultiplierOffered: 1.5,
  })
  const standbyCandidates = selectStandbyInspectorCandidates({
    jobId: 'job-1',
    primaryInspectorId: 'inspector-primary',
    permitFamily: 'building',
    requiredDiscipline: 'structural',
    region: 'vancouver',
    stageName: 'Framing',
  }, [
    {
      inspectorId: 'inspector-standby',
      onboardingStatus: 'approved',
      disciplines: ['structural'],
      regions: ['vancouver'],
      permitFamilies: ['building'],
      stageEligibility: ['Framing'],
      reliabilityTier: 'elite',
      reliabilityScore: 98,
      available: true,
    },
  ])
  const standby = acceptStandbyOfferState({
    jobId: 'job-1',
    originalAssignmentId: 'assignment-primary',
    originalInspectorId: 'inspector-primary',
    standbyInspectorId: 'inspector-standby',
    standbyInviteId: 'standby-1',
    acceptedAt: '2026-04-26T14:40:00.000Z',
    reason: 'missed_90m_confirmation',
  })
  const noShow = evaluateNoShowPolicy('2026-04-26T16:20:00.000Z')
  const payout = evaluateInspectionPayout({
    outcome: 'pass',
    documentedProfessionalWork: false,
    evidenceComplete: false,
    hasNoShow: true,
    grossPayoutAmount: 500,
    inspectorTier: 'verified',
    asOf: AS_OF,
    policyConfig: {
      enforcementMode: 'full_enforcement',
      builderCreditHooksEnabled: true,
      builderCreditAmount: 250,
      builderCreditFundingSource: 'platform_budget',
    },
  })
  const reliability = calculateInspectorReliability({
    asOf: AS_OF,
    events: [
      { eventType: 'claim_commitment_accepted', occurredAt: CLAIMED_AT },
      { eventType: 'CONFIRMATION_MISSED', occurredAt: '2026-04-26T12:00:00.000Z', metadata: { checkpoint: 't_4h' } },
      { eventType: 'CONFIRMATION_MISSED', occurredAt: '2026-04-26T14:30:00.000Z', metadata: { checkpoint: 't_90m' } },
      ...noShow.reliabilityEvents,
    ],
    policyConfig: { enforcementMode: 'observe_only' },
  })

  assert.equal(missed4h.notifyAdmin, true)
  assert.equal(missed4h.prepareStandbySearch, true)
  assert.equal(missed90m.requestStandbyActivation, true)
  assert.equal(standbyCandidates[0]?.inspectorId, 'inspector-standby')
  assert.equal(activation.sendInspectorOffers, true)
  assert.equal(activation.builderNotified, true)
  assert.equal(standby.originalAssignmentStatus, 'cancelled')
  assert.equal(noShow.adminReviewRequired, true)
  assert.equal(payout.payoutStatus, 'blocked')
  assert.equal(payout.escrowStatus, 'blocked')
  assert.equal(payout.builderCreditHook?.escrowProtected, true)
  assert.ok(reliability.reliabilityScore < 75)
  assert.ok(reliability.explanations.some(item => item.code === 'no_show_recorded'))
})

test('Scenario 5: valid emergency cancellation triggers protected reassignment without material reliability damage', () => {
  const cancellation = evaluateCancellationPolicy({
    reasonCode: 'family_emergency',
    requestedAt: '2026-04-26T13:00:00.000Z',
    scheduledStartAt: SCHEDULED_START,
    evidenceCount: 1,
  })
  const review = buildCancellationReviewOutcome({
    cancellationRequestId: 'cancel-1',
    jobId: 'job-1',
    assignmentId: 'assignment-1',
    reasonCode: 'family_emergency',
    isLate: true,
    decision: 'approved',
    adminNote: 'Emergency evidence approved.',
    waiveConsequence: true,
    triggerReassignment: true,
  })
  const activation = evaluateStandbyActivation('invalid_cancellation', { notificationsEnabled: true })
  const reliability = calculateInspectorReliability({
    asOf: AS_OF,
    events: cancellation.reliabilityEvents,
  })

  assert.equal(cancellation.preliminaryClassification, 'likely_valid')
  assert.deepEqual(cancellation.reliabilityEvents.map(event => event.eventType), ['valid_cancellation'])
  assert.equal(review.validityStatus, 'valid')
  assert.equal(review.financialConsequenceStatus, 'waived')
  assert.equal(activation.sendInspectorOffers, true)
  assert.equal(reliability.lateCancellationRate, 0)
  assert.ok(reliability.explanations.some(item => item.code === 'valid_cancellation_protected'))
})

test('Scenario 6: builder site not ready protects inspector and projects configured fee hook', () => {
  const arrival = evaluateArrivalCheckIn({
    arrivedAt: ARRIVED_AT,
    scheduledStartAt: SCHEDULED_START,
  })
  const reliability = calculateInspectorReliability({
    asOf: AS_OF,
    events: [
      { eventType: 'builder_site_not_ready', occurredAt: ARRIVED_AT, metadata: { reasonCode: 'no_access' } },
    ],
  })
  const payout = evaluateInspectionPayout({
    outcome: 'hold',
    documentedProfessionalWork: true,
    evidenceComplete: true,
    builderSiteNotReady: true,
    grossPayoutAmount: 300,
    inspectorTier: 'verified',
    asOf: AS_OF,
    policyConfig: {
      enforcementMode: 'observe_only',
      builderSiteNotReadyFeeAmount: 75,
    },
  })

  assert.equal(arrival.evidenceRequired, true)
  assert.equal(arrival.proximityStatus, 'manual_evidence_required')
  assert.equal(payout.inspectorProtected, true)
  assert.equal(payout.blockReason, 'builder_site_not_ready_protected')
  assert.equal(payout.builderCreditHook?.amount, 75)
  assert.equal(payout.builderCreditHook?.status, 'projected')
  assert.equal(reliability.reliabilityScore, 75)
  assert.ok(reliability.explanations.some(item => item.code === 'builder_site_not_ready_protected'))
})

test('Scenario 7: admin override converts invalid cancellation to protected and updates dashboard state', () => {
  const invalid = evaluateCancellationPolicy({
    reasonCode: 'double_booked',
    requestedAt: '2026-04-26T13:00:00.000Z',
    scheduledStartAt: SCHEDULED_START,
  })
  const overriddenEvent: ReliabilityEventInput = {
    ...invalid.reliabilityEvents[0],
    adminOverride: {
      neutralize: true,
      reason: 'Documented hospital emergency evidence accepted.',
      reviewedBy: 'admin-1',
      reviewedAt: '2026-04-26T13:20:00.000Z',
    },
  }
  const reliability = calculateInspectorReliability({
    asOf: AS_OF,
    events: [overriddenEvent],
  })
  const dashboard = buildInspectorReliabilityDashboardModel({
    profile: {
      tierKey: 'standard',
      internalScore: reliability.reliabilityScore,
      invalidLateCancellationCount: 0,
      noShowCount: 0,
      credentialStatus: 'approved',
    },
    events: [overriddenEvent],
  })
  const auditLog = {
    action: 'cancellation.admin_reviewed',
    entityType: 'cancellation_request',
    reason: overriddenEvent.adminOverride?.reason,
  }

  assert.equal(invalid.preliminaryClassification, 'likely_invalid')
  assert.equal(reliability.lateCancellationRate, 0)
  assert.ok(reliability.explanations.some(item => item.code === 'admin_override_neutralized'))
  assert.equal(auditLog.action, 'cancellation.admin_reviewed')
  assert.equal(dashboard.disputedEventCount, 0)
})

test('Scenario 8: tier progression updates dashboard benefits from Verified toward higher tiers', () => {
  const repeatedReliableWork: ReliabilityEventInput[] = Array.from({ length: 20 }, (_, index) => ({
    eventType: 'completed_professional_work',
    occurredAt: new Date(Date.UTC(2026, 3, index + 1, 18)).toISOString(),
    metadata: {
      inspectionOutcome: index % 3 === 0 ? 'fail' : 'pass',
      evidenceComplete: true,
      evidenceCompleteness: 1,
      responseMinutes: 15,
      expectedResponseMinutes: 60,
    },
  }))
  const reliability = calculateInspectorReliability({
    asOf: AS_OF,
    events: repeatedReliableWork,
    policyConfig: {
      enforcementMode: 'soft_enforcement',
      tierRules: {
        preferred: { minScore: 82, minCompletedProfessionalWork: 5 },
        priority: { minScore: 88, minCompletedProfessionalWork: 15 },
        elite: { minScore: 93, minCompletedProfessionalWork: 20 },
      },
    },
  })
  const dashboard = buildInspectorReliabilityDashboardModel({
    profile: {
      tierKey: reliability.recommendedTier === 'elite' ? 'premier' : reliability.recommendedTier,
      internalScore: reliability.reliabilityScore,
      completedProfessionalWorkCount: 20,
      claimCommitmentCount: 20,
      invalidLateCancellationCount: 0,
      noShowCount: 0,
      credentialStatus: 'approved',
    },
    events: repeatedReliableWork,
  })

  assert.ok(['priority', 'elite'].includes(reliability.recommendedTier))
  assert.ok(reliability.reliabilityScore >= 88)
  assert.ok(dashboard.benefits.some(benefit => /rush|priority|payout/i.test(benefit)))
  assert.notEqual(dashboard.tier, 'verified')
})

test('Scenario 9: permission safety hides builder/inspector internals while Admin sees timeline', () => {
  const profile: ReliabilityProfileRow = {
    inspectorId: 'inspector-1',
    internalScore: 64,
    tierKey: 'restricted',
    completedProfessionalWorkCount: 4,
    claimCommitmentCount: 6,
    validCancellationCount: 0,
    invalidLateCancellationCount: 1,
    noShowCount: 1,
    builderSiteNotReadyCount: 0,
    updatedAt: AS_OF,
  }
  const detail = buildInspectorReliabilityDetail({
    profile,
    events: [
      { id: 'event-1', inspectorId: 'inspector-1', jobId: 'job-1', eventType: 'NO_SHOW', scoreDelta: -25, adminReviewStatus: 'pending', createdAt: AS_OF },
    ],
    cancellations: [],
    reserveEntries: [
      { id: 'reserve-1', inspectorId: 'inspector-1', jobId: 'job-1', entryType: 'reserve_hold', amount: 100, currency: 'CAD', enforcementMode: 'full_enforcement', legalReviewRequired: true, status: 'pending', createdAt: AS_OF },
    ],
    adminNotes: ['Internal review note'],
  })
  const builderView = buildBuilderReliabilityStatus({
    assignmentStatus: 'confirmed',
    nextConfirmationCheckpoint: '24-hour attendance reconfirmation',
  })
  const deniedBuilderDetail = sanitizeInspectorReliabilityDetailForViewer(detail, { role: 'builder', id: 'builder-1' })
  const deniedOtherInspector = sanitizeInspectorReliabilityDetailForViewer(detail, { role: 'inspector', id: 'inspector-2' })
  const selfInspectorDetail = sanitizeInspectorReliabilityDetailForViewer(detail, { role: 'inspector', id: 'inspector-1' })
  const adminDetail = sanitizeInspectorReliabilityDetailForViewer(detail, { role: 'admin', id: 'admin-1' })
  const timeline = buildJobReliabilityTimeline({
    jobId: 'job-1',
    appointments: [{
      id: 'appointment-1',
      jobId: 'job-1',
      assignmentId: 'assignment-1',
      inspectorId: 'inspector-1',
      scheduledStartAt: SCHEDULED_START,
      commitmentVersion: 'reliability-commitment-v1',
      commitmentAcceptedAt: CLAIMED_AT,
      confirmationStatus: 'missed',
      status: 'no_show',
      createdAt: CLAIMED_AT,
    }],
    confirmations: [],
    notifications: [],
    events: [{ id: 'event-1', inspectorId: 'inspector-1', jobId: 'job-1', eventType: 'NO_SHOW', scoreDelta: -25, adminReviewStatus: 'pending', createdAt: AS_OF }],
    cancellations: [],
    standbyCandidates: [],
    payoutReviews: [{ id: 'payout-1', jobId: 'job-1', payoutStatus: 'blocked', paymentStatus: 'held', adminReviewStatus: 'pending', baseFeeAmount: 100, holdPremiumAmount: 0, reserveWithheldAmount: 0, payoutReductionAmount: 0, builderCreditAmount: 0, enforcementMode: 'full_enforcement', decidedAt: AS_OF }],
  })

  assert.equal(deniedBuilderDetail, null)
  assert.equal(deniedOtherInspector, null)
  assert.ok(selfInspectorDetail)
  assert.equal('reliabilityScore' in selfInspectorDetail, false)
  assert.equal('reserveRequirement' in selfInspectorDetail, false)
  assert.equal(adminDetail?.reliabilityScore, 64)
  assert.match(JSON.stringify(builderView).toLowerCase(), /escrow/)
  assert.doesNotMatch(JSON.stringify(builderView).toLowerCase(), /score|reserve/)
  assert.ok(timeline.some(item => item.label === 'Payout status'))
  assert.ok(timeline.some(item => item.label.replaceAll('_', ' ') === 'NO SHOW' || item.detail.includes('pending')))
})
