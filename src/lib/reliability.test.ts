import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildAttendanceConfirmationLadder,
  buildMissedAttendanceReliabilityEvents,
  calculateInspectorReliability,
  deriveNextRequiredAttendanceCheckIn,
  deriveReliabilityTier,
  evaluateArrivalCheckIn,
  evaluateCancellationPolicy,
  evaluateInspectionPayout,
  evaluateMissedAttendanceConfirmation,
  evaluateNoShowPolicy,
  evaluateStandbyActivation,
  isCompletedProfessionalWork,
  applyAdminPayoutOverride,
  scoreReliabilityEvents,
  selectStandbyInspectorCandidates,
  acceptStandbyOfferState,
  BUILDER_REASSIGNMENT_COPY,
  BUILDER_STANDBY_ACTIVATION_COPY,
  type ReliabilityEventInput,
  type StandbyInspectorCandidateInput,
  type StandbyJobContext,
} from './reliability'

const AS_OF = '2026-04-25T12:00:00.000Z'

function daysAgo(days: number): string {
  const date = new Date(AS_OF)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString()
}

function completedEvent(days: number, outcome: string = 'pass', evidenceCompleteness = 1): ReliabilityEventInput {
  return {
    eventType: 'completed_professional_work',
    occurredAt: daysAgo(days),
    metadata: {
      inspectionOutcome: outcome,
      evidenceCompleteness,
      responseMinutes: 15,
      expectedResponseMinutes: 60,
    },
  }
}

test('scores reliability without rewarding pass outcomes over fail or hold', () => {
  const events: ReliabilityEventInput[] = [
    { eventType: 'completed_professional_work', metadata: { inspectionOutcome: 'pass' } },
    { eventType: 'completed_professional_work', metadata: { inspectionOutcome: 'fail' } },
    { eventType: 'completed_professional_work', metadata: { inspectionOutcome: 'hold' } },
  ]

  const summary = scoreReliabilityEvents(events)

  assert.equal(summary.score, 100)
  assert.equal(summary.counts.completedProfessionalWork, 3)
  assert.equal(events.every(isCompletedProfessionalWork), true)
})

test('tracks late cancellation and no-show events independently of inspection outcomes', () => {
  const summary = scoreReliabilityEvents([
    { eventType: 'claim_commitment_accepted' },
    { eventType: 'pre_site_confirmation_missed' },
    { eventType: 'invalid_late_cancellation' },
    { eventType: 'no_show' },
    { eventType: 'builder_site_not_ready' },
  ])

  assert.equal(summary.score, 61)
  assert.equal(summary.tierKey, 'provisional')
  assert.equal(summary.counts.claimCommitments, 1)
  assert.equal(summary.counts.invalidLateCancellations, 1)
  assert.equal(summary.counts.noShows, 1)
  assert.equal(summary.counts.builderSiteNotReady, 1)
})

test('derives configured reliability tiers from score thresholds', () => {
  assert.equal(deriveReliabilityTier(98).tierKey, 'premier')
  assert.equal(deriveReliabilityTier(92).tierKey, 'preferred')
  assert.equal(deriveReliabilityTier(80).tierKey, 'standard')
  assert.equal(deriveReliabilityTier(65).tierKey, 'provisional')
  assert.equal(deriveReliabilityTier(30).tierKey, 'restricted')
})

test('perfect inspector reaches Elite', () => {
  const result = calculateInspectorReliability({
    asOf: AS_OF,
    events: Array.from({ length: 30 }, (_, index) => completedEvent(index)),
  })

  assert.equal(result.recommendedTier, 'elite')
  assert.equal(result.reliabilityScore, 100)
  assert.equal(result.reserveRequirementPercent, 2.5)
  assert.equal(result.payoutSpeedCategory, 'fastest')
  assert.equal(result.dispatchPriorityWeight, 1.6)
})

test('new inspector starts Verified', () => {
  const result = calculateInspectorReliability({ asOf: AS_OF, events: [] })

  assert.equal(result.recommendedTier, 'verified')
  assert.equal(result.reliabilityScore, 75)
  assert.equal(result.attendanceRate, 1)
  assert.equal(result.noShowCount, 0)
})

test('one valid emergency cancellation does not damage tier materially', () => {
  const result = calculateInspectorReliability({
    asOf: AS_OF,
    events: [
      {
        eventType: 'valid_cancellation',
        occurredAt: daysAgo(1),
        metadata: { validReason: true, reasonCode: 'medical_or_emergency' },
      },
    ],
  })

  assert.equal(result.recommendedTier, 'verified')
  assert.equal(result.reliabilityScore, 75)
  assert.ok(result.explanations.some(item => item.code === 'valid_cancellation_protected'))
})

test('one no-show impacts score', () => {
  const result = calculateInspectorReliability({
    asOf: AS_OF,
    events: [{ eventType: 'no_show', occurredAt: daysAgo(2) }],
  })

  assert.equal(result.noShowCount, 1)
  assert.ok(result.reliabilityScore < 75)
  assert.ok(result.explanations.some(item => item.code === 'no_show_recorded'))
})

test('repeated no-shows trigger suspension recommendation', () => {
  const result = calculateInspectorReliability({
    asOf: AS_OF,
    events: [
      { eventType: 'no_show', occurredAt: daysAgo(10) },
      { eventType: 'no_show', occurredAt: daysAgo(80) },
      { eventType: 'no_show', occurredAt: daysAgo(220) },
    ],
  })

  assert.equal(result.noShowCount, 3)
  assert.equal(result.recommendedTier, 'suspension_review')
  assert.equal(result.payoutSpeedCategory, 'admin_hold')
})

test('builder site-not-ready does not penalize inspector', () => {
  const result = calculateInspectorReliability({
    asOf: AS_OF,
    events: [
      completedEvent(1),
      { eventType: 'builder_site_not_ready', occurredAt: daysAgo(2) },
    ],
  })

  assert.equal(result.attendanceRate, 1)
  assert.equal(result.noShowCount, 0)
  assert.ok(result.reliabilityScore >= 99)
  assert.ok(result.explanations.some(item => item.code === 'builder_site_not_ready_protected'))
})

test('completed Fail does not reduce reliability', () => {
  const passResult = calculateInspectorReliability({
    asOf: AS_OF,
    events: [completedEvent(1, 'pass')],
  })
  const failResult = calculateInspectorReliability({
    asOf: AS_OF,
    events: [completedEvent(1, 'fail')],
  })

  assert.equal(failResult.reliabilityScore, passResult.reliabilityScore)
  assert.ok(failResult.explanations.some(item => item.code === 'completed_fail_valid'))
})

test('evidence incomplete reduces score', () => {
  const complete = calculateInspectorReliability({
    asOf: AS_OF,
    events: Array.from({ length: 8 }, (_, index) => completedEvent(index)),
  })
  const incomplete = calculateInspectorReliability({
    asOf: AS_OF,
    events: Array.from({ length: 8 }, (_, index) => completedEvent(index, 'pass', 0.5)),
  })

  assert.ok(incomplete.reliabilityScore < complete.reliabilityScore)
  assert.ok(incomplete.evidenceCompletenessRate < 1)
  assert.ok(incomplete.explanations.some(item => item.code === 'evidence_incomplete'))
})

test('admin override can neutralize an event when audit fields are present', () => {
  const result = calculateInspectorReliability({
    asOf: AS_OF,
    events: [
      {
        eventType: 'no_show',
        occurredAt: daysAgo(1),
        adminOverride: {
          neutralize: true,
          reason: 'Inspector was reassigned by admin dispatch.',
          reviewedBy: 'admin-1',
          reviewedAt: AS_OF,
        },
      },
    ],
  })

  assert.equal(result.noShowCount, 0)
  assert.equal(result.reliabilityScore, 75)
  assert.ok(result.explanations.some(item => item.code === 'admin_override_neutralized'))
})

test('observe_only mode calculates but does not enforce consequences', () => {
  const result = calculateInspectorReliability({
    asOf: AS_OF,
    policyConfig: { enforcementMode: 'observe_only' },
    events: [
      { eventType: 'no_show', occurredAt: daysAgo(1) },
      { eventType: 'no_show', occurredAt: daysAgo(2) },
    ],
  })

  assert.equal(result.recommendedTier, 'restricted')
  assert.equal(result.consequencesEnforced, false)
  assert.equal(result.enforcementMode, 'observe_only')
  assert.ok(result.reserveRequirementPercent > 10)
  assert.ok(result.explanations.some(item => item.code === 'observe_only'))
})

test('attendance ladder creates six checkpoints and skips elapsed relative checks', () => {
  const ladder = buildAttendanceConfirmationLadder({
    claimedAt: '2026-04-25T20:00:00.000Z',
    scheduledStartAt: '2026-04-26T17:00:00.000Z',
  })

  assert.deepEqual(ladder.map(item => item.checkpoint), [
    'initial_claim',
    't_24h',
    't_4h',
    't_90m',
    'departure',
    'arrival',
  ])
  assert.equal(ladder.find(item => item.checkpoint === 'initial_claim')?.status, 'confirmed')
  assert.equal(ladder.find(item => item.checkpoint === 't_24h')?.status, 'not_required')
  assert.equal(ladder.find(item => item.checkpoint === 't_4h')?.status, 'pending')
})

test('attendance reminder due times are calculated from scheduled start', () => {
  const ladder = buildAttendanceConfirmationLadder({
    claimedAt: '2026-04-25T12:00:00.000Z',
    scheduledStartAt: '2026-04-27T17:00:00.000Z',
  })

  assert.equal(ladder.find(item => item.checkpoint === 't_24h')?.reminderScheduledAt, '2026-04-26T17:00:00.000Z')
  assert.equal(ladder.find(item => item.checkpoint === 't_4h')?.reminderScheduledAt, '2026-04-27T13:00:00.000Z')
  assert.equal(ladder.find(item => item.checkpoint === 't_90m')?.reminderScheduledAt, '2026-04-27T15:30:00.000Z')
  assert.equal(ladder.find(item => item.checkpoint === 'departure')?.reminderScheduledAt, null)
})

test('next attendance check-in returns the earliest pending checkpoint', () => {
  const ladder = buildAttendanceConfirmationLadder({
    claimedAt: '2026-04-25T12:00:00.000Z',
    scheduledStartAt: '2026-04-27T17:00:00.000Z',
  })
  const next = deriveNextRequiredAttendanceCheckIn(ladder, '2026-04-25T12:01:00.000Z')

  assert.equal(next?.checkpoint, 't_24h')
  assert.equal(next?.label, 'T-24h soft check')
  assert.equal(next?.critical, false)
})

test('missed 4-hour confirmation escalates to admin and prepares standby search', () => {
  const escalation = evaluateMissedAttendanceConfirmation('t_4h')

  assert.equal(escalation.notifyAdmin, true)
  assert.equal(escalation.prepareStandbySearch, true)
  assert.equal(escalation.requestStandbyActivation, false)
  assert.equal(escalation.escalationStatus, 'standby_prepared')
})

test('missed 90-minute confirmation requests standby activation when configured', () => {
  const observeOnly = evaluateMissedAttendanceConfirmation('t_90m')
  const activated = evaluateMissedAttendanceConfirmation('t_90m', { standbyActivationEnabled: true })

  assert.equal(observeOnly.requestStandbyActivation, false)
  assert.equal(observeOnly.escalationStatus, 'standby_prepared')
  assert.equal(activated.requestStandbyActivation, true)
  assert.equal(activated.escalationStatus, 'standby_activation_requested')
})

test('arrival check-in updates job status and validates proximity', () => {
  const arrival = evaluateArrivalCheckIn({
    scheduledStartAt: '2026-04-25T12:00:00.000Z',
    arrivedAt: '2026-04-25T12:08:00.000Z',
    latitude: 49.28273,
    longitude: -123.120735,
    siteLatitude: 49.28272,
    siteLongitude: -123.12073,
  })

  assert.equal(arrival.jobStatus, 'in_progress')
  assert.equal(arrival.proximityStatus, 'within_range')
  assert.equal(arrival.evidenceRequired, false)
  assert.deepEqual(arrival.reliabilityEvents.map(event => event.eventType), [
    'ARRIVAL_CONFIRMED',
    'ON_TIME_ARRIVAL',
  ])
})

test('manual arrival without geolocation requires evidence audit flag', () => {
  const arrival = evaluateArrivalCheckIn({
    scheduledStartAt: '2026-04-25T12:00:00.000Z',
    arrivedAt: '2026-04-25T12:30:00.000Z',
  })

  assert.equal(arrival.proximityStatus, 'manual_evidence_required')
  assert.equal(arrival.evidenceRequired, true)
  assert.equal(arrival.reliabilityEvents[1].eventType, 'LATE_ARRIVAL')
})

test('missed confirmation affects reliability in observe_only without enforcing penalties', () => {
  const events = buildMissedAttendanceReliabilityEvents('t_90m', AS_OF)

  assert.deepEqual(events.map(event => event.eventType), ['CONFIRMATION_MISSED'])

  const result = calculateInspectorReliability({
    asOf: AS_OF,
    policyConfig: { enforcementMode: 'observe_only' },
    events,
  })
  assert.equal(result.noShowCount, 0)
  assert.equal(result.consequencesEnforced, false)
  assert.ok(result.reliabilityScore < 75)
})

test('valid cancellation does not materially affect reliability', () => {
  const policy = evaluateCancellationPolicy({
    reasonCode: 'illness',
    evidenceCount: 1,
    requestedAt: '2026-04-25T08:00:00.000Z',
    scheduledStartAt: '2026-04-25T17:00:00.000Z',
  })
  const result = calculateInspectorReliability({
    asOf: AS_OF,
    events: policy.reliabilityEvents,
  })

  assert.equal(policy.preliminaryClassification, 'likely_valid')
  assert.equal(policy.protectedReason, true)
  assert.ok(result.reliabilityScore >= 75)
  assert.ok(result.explanations.some(item => item.code === 'valid_cancellation_protected'))
})

test('avoidable late cancellation creates reliability event', () => {
  const policy = evaluateCancellationPolicy({
    reasonCode: 'double_booked',
    explanation: 'I accepted another job.',
    requestedAt: '2026-04-25T14:00:00.000Z',
    scheduledStartAt: '2026-04-25T17:00:00.000Z',
  })

  assert.equal(policy.preliminaryClassification, 'likely_invalid')
  assert.equal(policy.isInsideProtectedWindow, true)
  assert.deepEqual(policy.reliabilityEvents.map(event => event.eventType), ['LATE_CANCELLATION'])
  assert.equal(policy.appealAvailable, true)
})

test('no-show blocks payout pending admin review', () => {
  const policy = evaluateNoShowPolicy('2026-04-25T17:20:00.000Z')
  const result = calculateInspectorReliability({
    asOf: AS_OF,
    events: policy.reliabilityEvents,
  })

  assert.equal(policy.payoutBlocked, true)
  assert.equal(policy.adminReviewRequired, true)
  assert.equal(policy.appealAvailable, true)
  assert.equal(result.noShowCount, 1)
  assert.ok(result.reliabilityScore < 75)
})

test('builder site-not-ready protects inspector', () => {
  const policy = evaluateCancellationPolicy({
    reasonCode: 'builder_site_not_ready',
    evidenceCount: 1,
    requestedAt: '2026-04-25T16:30:00.000Z',
    scheduledStartAt: '2026-04-25T17:00:00.000Z',
  })
  const result = calculateInspectorReliability({
    asOf: AS_OF,
    events: policy.reliabilityEvents,
  })

  assert.equal(policy.preliminaryClassification, 'likely_valid')
  assert.equal(result.noShowCount, 0)
  assert.ok(result.reliabilityScore >= 75)
})

test('admin override works for cancellation reliability event', () => {
  const result = calculateInspectorReliability({
    asOf: AS_OF,
    events: [{
      eventType: 'LATE_CANCELLATION',
      occurredAt: AS_OF,
      adminOverride: {
        neutralize: true,
        reason: 'Admin accepted added medical documentation.',
        reviewedBy: 'admin-1',
        reviewedAt: AS_OF,
      },
    }],
  })

  assert.equal(result.reliabilityScore, 75)
  assert.ok(result.explanations.some(item => item.code === 'admin_override_neutralized'))
})

test('appeal path exists for reliability-impacting cancellation', () => {
  const policy = evaluateCancellationPolicy({
    reasonCode: 'too_busy',
    requestedAt: '2026-04-25T16:00:00.000Z',
    scheduledStartAt: '2026-04-25T17:00:00.000Z',
  })

  assert.equal(policy.appealAvailable, true)
  assert.match(policy.inspectorNotificationCopy, /appeal/)
})

test('builder notification sent copy is trust-preserving', () => {
  const policy = evaluateCancellationPolicy({
    reasonCode: 'accident',
    evidenceCount: 1,
    requestedAt: '2026-04-25T10:00:00.000Z',
    scheduledStartAt: '2026-04-25T17:00:00.000Z',
  })

  assert.equal(policy.builderNotificationCopy, BUILDER_REASSIGNMENT_COPY)
  assert.match(policy.builderNotificationCopy, /escrow remains protected/)
})

const standbyJob: StandbyJobContext = {
  jobId: 'job-1',
  primaryInspectorId: 'primary-1',
  permitFamily: 'building',
  requiredDiscipline: 'structural',
  region: 'vancouver',
  stageName: 'Framing',
}

const standbyCandidates: StandbyInspectorCandidateInput[] = [
  {
    inspectorId: 'primary-1',
    onboardingStatus: 'approved',
    disciplines: ['structural'],
    regions: ['vancouver'],
    reliabilityTier: 'elite',
    reliabilityScore: 99,
    available: true,
  },
  {
    inspectorId: 'candidate-standard',
    onboardingStatus: 'approved',
    disciplines: ['structural'],
    regions: ['vancouver'],
    reliabilityTier: 'verified',
    reliabilityScore: 82,
    permitFamilies: ['building'],
    stageEligibility: ['Framing'],
    available: true,
  },
  {
    inspectorId: 'candidate-elite',
    onboardingStatus: 'approved',
    disciplines: ['structural'],
    regions: ['vancouver'],
    reliabilityTier: 'elite',
    reliabilityScore: 98,
    permitFamilies: ['building'],
    stageEligibility: ['Framing'],
    available: true,
  },
  {
    inspectorId: 'wrong-discipline',
    onboardingStatus: 'approved',
    disciplines: ['electrical'],
    regions: ['vancouver'],
    reliabilityTier: 'elite',
    reliabilityScore: 99,
    available: true,
  },
]

test('standby candidates selected by governed eligibility', () => {
  const selected = selectStandbyInspectorCandidates(standbyJob, standbyCandidates, 2)

  assert.deepEqual(selected.map(candidate => candidate.inspectorId), [
    'candidate-elite',
    'candidate-standard',
  ])
  assert.deepEqual(selected.map(candidate => candidate.status), ['identified', 'identified'])
  assert.deepEqual(selected.map(candidate => candidate.rank), [1, 2])
})

test('restricted and suspended inspectors are excluded from standby', () => {
  const selected = selectStandbyInspectorCandidates(standbyJob, [
    {
      inspectorId: 'restricted-1',
      onboardingStatus: 'approved',
      disciplines: ['structural'],
      regions: ['vancouver'],
      reliabilityTier: 'restricted',
      reliabilityScore: 58,
      available: true,
    },
    {
      inspectorId: 'suspended-1',
      onboardingStatus: 'suspended',
      disciplines: ['structural'],
      regions: ['vancouver'],
      reliabilityTier: 'elite',
      reliabilityScore: 99,
      suspended: true,
      available: true,
    },
    standbyCandidates[1],
  ], 2)

  assert.deepEqual(selected.map(candidate => candidate.inspectorId), ['candidate-standard'])
})

test('high-tier standby inspectors rank above lower-tier inspectors', () => {
  const selected = selectStandbyInspectorCandidates(standbyJob, [
    standbyCandidates[1],
    standbyCandidates[2],
  ], 2)

  assert.equal(selected[0].inspectorId, 'candidate-elite')
  assert.equal(selected[0].reliabilityTier, 'elite')
})

test('standby activation on missed 90-minute confirmation sends offers', () => {
  const activation = evaluateStandbyActivation('missed_90m_confirmation', {
    rushMultiplierOffered: 1.35,
  })

  assert.equal(activation.candidateStatus, 'offered')
  assert.equal(activation.sendInspectorOffers, true)
  assert.equal(activation.builderNotified, true)
  assert.equal(activation.builderNotificationCopy, BUILDER_STANDBY_ACTIVATION_COPY)
  assert.equal(activation.rushMultiplierOffered, 1.35)
})

test('missed 4-hour confirmation only soft-alerts standby when notifications are enabled', () => {
  const activation = evaluateStandbyActivation('missed_4h_confirmation', {
    notificationsEnabled: true,
  })

  assert.equal(activation.candidateStatus, 'soft_alerted')
  assert.equal(activation.sendInspectorOffers, false)
  assert.equal(activation.softAlertOnly, true)
})

test('accepting standby reassigns job state atomically', () => {
  const accepted = acceptStandbyOfferState({
    jobId: 'job-1',
    originalAssignmentId: 'assignment-primary',
    originalInspectorId: 'primary-1',
    standbyInspectorId: 'candidate-elite',
    standbyInviteId: 'invite-1',
    acceptedAt: AS_OF,
    reason: 'critical_confirmation_miss',
  })

  assert.equal(accepted.originalAssignmentStatus, 'cancelled')
  assert.equal(accepted.acceptedInviteStatus, 'accepted')
  assert.deepEqual(accepted.newAssignment, {
    jobId: 'job-1',
    inspectorId: 'candidate-elite',
    sourceInviteId: 'invite-1',
    status: 'confirmed',
  })
})

test('standby acceptance notifies builder and records original inspector event', () => {
  const accepted = acceptStandbyOfferState({
    jobId: 'job-1',
    originalAssignmentId: 'assignment-primary',
    originalInspectorId: 'primary-1',
    standbyInspectorId: 'candidate-elite',
    standbyInviteId: 'invite-1',
    acceptedAt: AS_OF,
  })

  assert.equal(accepted.builderNotificationCopy, BUILDER_STANDBY_ACTIVATION_COPY)
  assert.ok(accepted.reliabilityEvents.some(event => event.eventType === 'PRIMARY_REASSIGNED'))
  assert.ok(accepted.reliabilityEvents.some(event => event.eventType === 'STANDBY_ACCEPTED'))
})

test('valid Pass releases payout when full enforcement is configured', () => {
  const payout = evaluateInspectionPayout({
    outcome: 'pass',
    documentedProfessionalWork: true,
    evidenceComplete: true,
    grossPayoutAmount: 500,
    inspectorTier: 'verified',
    asOf: AS_OF,
    policyConfig: { enforcementMode: 'full_enforcement' },
  })

  assert.equal(payout.payoutStatus, 'eligible')
  assert.equal(payout.escrowStatus, 'payout_ready')
  assert.equal(payout.consequencesEnforced, true)
})

test('valid Fail releases payout when evidence is complete', () => {
  const payout = evaluateInspectionPayout({
    outcome: 'fail',
    documentedProfessionalWork: true,
    evidenceComplete: true,
    grossPayoutAmount: 500,
    inspectorTier: 'preferred',
    asOf: AS_OF,
    policyConfig: { enforcementMode: 'full_enforcement' },
  })

  assert.equal(payout.payoutStatus, 'eligible')
  assert.equal(payout.escrowStatus, 'payout_ready')
  assert.ok(payout.auditEvents.includes('valid_professional_work.payout_not_outcome_gated'))
})

test('no-show blocks payout and projects builder credit hook', () => {
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

  assert.equal(payout.payoutStatus, 'blocked')
  assert.equal(payout.escrowStatus, 'blocked')
  assert.equal(payout.blockReason, 'no_show')
  assert.equal(payout.builderCreditHook?.amount, 250)
  assert.equal(payout.builderCreditHook?.escrowProtected, true)
})

test('active dispute blocks payout', () => {
  const payout = evaluateInspectionPayout({
    outcome: 'pass',
    documentedProfessionalWork: true,
    evidenceComplete: true,
    hasActiveDispute: true,
    grossPayoutAmount: 500,
    inspectorTier: 'preferred',
    asOf: AS_OF,
    policyConfig: { enforcementMode: 'full_enforcement' },
  })

  assert.equal(payout.payoutStatus, 'blocked')
  assert.equal(payout.blockReason, 'active_dispute')
})

test('incomplete evidence sends payout to review', () => {
  const payout = evaluateInspectionPayout({
    outcome: 'hold',
    documentedProfessionalWork: true,
    evidenceComplete: false,
    hasCompletedHoldWorkflow: true,
    holdPremiumAmount: 120,
    grossPayoutAmount: 620,
    inspectorTier: 'priority',
    asOf: AS_OF,
    policyConfig: { enforcementMode: 'full_enforcement' },
  })

  assert.equal(payout.payoutStatus, 'review')
  assert.equal(payout.escrowStatus, 'earned_pending_review')
  assert.equal(payout.blockReason, 'incomplete_evidence')
})

test('builder site-not-ready protects inspector payout and projects configured fee', () => {
  const payout = evaluateInspectionPayout({
    outcome: 'hold',
    documentedProfessionalWork: true,
    evidenceComplete: true,
    builderSiteNotReady: true,
    grossPayoutAmount: 500,
    inspectorTier: 'verified',
    asOf: AS_OF,
    policyConfig: {
      enforcementMode: 'observe_only',
      builderSiteNotReadyFeeAmount: 75,
    },
  })

  assert.equal(payout.payoutStatus, 'eligible')
  assert.equal(payout.inspectorProtected, true)
  assert.equal(payout.blockReason, 'builder_site_not_ready_protected')
  assert.equal(payout.builderCreditHook?.amount, 75)
  assert.equal(payout.builderCreditHook?.status, 'projected')
})

test('reserve ledger entries are created correctly from tier percent', () => {
  const payout = evaluateInspectionPayout({
    outcome: 'pass',
    documentedProfessionalWork: true,
    evidenceComplete: true,
    grossPayoutAmount: 1000,
    inspectorTier: 'elite',
    asOf: AS_OF,
    policyConfig: {
      enforcementMode: 'full_enforcement',
      reserveHooksEnabled: true,
      reserveReleaseDays: 45,
      tierReservePercents: { elite: 2.5 },
    },
  })

  assert.equal(payout.reserveLedgerEntries.length, 1)
  assert.equal(payout.reserveLedgerEntries[0].entryType, 'reserve_hold')
  assert.equal(payout.reserveLedgerEntries[0].amount, 25)
  assert.equal(payout.reserveLedgerEntries[0].status, 'posted')
  assert.equal(payout.reserveLedgerEntries[0].releaseEligibleAt, '2026-06-09T12:00:00.000Z')
})

test('observe_only mode calculates but does not enforce money movement', () => {
  const payout = evaluateInspectionPayout({
    outcome: 'pass',
    documentedProfessionalWork: true,
    evidenceComplete: true,
    grossPayoutAmount: 1000,
    inspectorTier: 'preferred',
    asOf: AS_OF,
    policyConfig: {
      enforcementMode: 'observe_only',
      reserveHooksEnabled: true,
      tierReservePercents: { preferred: 7.5 },
    },
  })

  assert.equal(payout.payoutStatus, 'eligible')
  assert.equal(payout.escrowStatus, 'earned_pending_review')
  assert.equal(payout.consequencesEnforced, false)
  assert.equal(payout.reserveLedgerEntries[0].entryType, 'observe_only_projection')
})

test('admin override can release payout', () => {
  const blocked = evaluateInspectionPayout({
    outcome: 'pass',
    documentedProfessionalWork: true,
    evidenceComplete: true,
    hasActiveDispute: true,
    grossPayoutAmount: 500,
    inspectorTier: 'verified',
    asOf: AS_OF,
    policyConfig: { enforcementMode: 'full_enforcement' },
  })
  const released = applyAdminPayoutOverride({
    current: blocked,
    decision: 'approve_payout',
    adminNote: 'Dispute resolved with no inspector fault.',
  })

  assert.equal(released.payoutStatus, 'eligible')
  assert.equal(released.escrowStatus, 'payout_ready')
  assert.ok(released.auditEvents.includes('payout.admin_released'))
})
