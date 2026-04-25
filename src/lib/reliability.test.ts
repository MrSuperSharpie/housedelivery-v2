import test from 'node:test'
import assert from 'node:assert/strict'

import {
  calculateInspectorReliability,
  deriveReliabilityTier,
  isCompletedProfessionalWork,
  scoreReliabilityEvents,
  type ReliabilityEventInput,
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
