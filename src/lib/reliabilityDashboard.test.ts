import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildInspectorReliabilityDashboardModel,
  INSPECTOR_TIER_BENEFITS,
  normalizeOpportunityTier,
} from './reliabilityDashboard'

test('normalizes platform tier keys into inspector opportunity tiers', () => {
  assert.equal(normalizeOpportunityTier('standard'), 'verified')
  assert.equal(normalizeOpportunityTier('preferred'), 'preferred')
  assert.equal(normalizeOpportunityTier('priority'), 'priority')
  assert.equal(normalizeOpportunityTier('premier'), 'elite')
})

test('dashboard shows constructive benefits for each tier', () => {
  assert.deepEqual(INSPECTOR_TIER_BENEFITS.verified, [
    'Access to standard inspections',
    'Standard payout timing',
    'Standard reserve requirement',
  ])
  assert.ok(INSPECTOR_TIER_BENEFITS.elite.includes('Fastest payout eligibility'))
  assert.ok(INSPECTOR_TIER_BENEFITS.priority.includes('First access to rush jobs'))
})

test('new inspector dashboard includes onboarding explainer state', () => {
  const model = buildInspectorReliabilityDashboardModel({
    profile: { tierKey: 'standard', internalScore: 75, credentialStatus: 'approved' },
    events: [],
  })

  assert.equal(model.tier, 'verified')
  assert.equal(model.isNewInspector, true)
  assert.equal(model.metrics.find(metric => metric.label === 'Attendance reliability')?.value, 'Building')
})

test('properly documented Fail counts as completed professional work', () => {
  const model = buildInspectorReliabilityDashboardModel({
    profile: {
      tierKey: 'preferred',
      internalScore: 92,
      completedProfessionalWorkCount: 6,
      claimCommitmentCount: 6,
      invalidLateCancellationCount: 0,
      noShowCount: 0,
      credentialStatus: 'approved',
    },
    events: [
      {
        eventType: 'completed_professional_work',
        metadata: { inspectionOutcome: 'fail', evidenceComplete: true },
      },
    ],
  })

  assert.equal(model.tierLabel, 'Preferred')
  assert.equal(model.metrics.find(metric => metric.label === 'Completed assigned jobs')?.value, '6')
  assert.ok(model.protectedEvents.includes('Issuing a Fail when properly documented'))
})

test('missed confirmations and disputes surface as reviewable metrics', () => {
  const model = buildInspectorReliabilityDashboardModel({
    profile: {
      tierKey: 'standard',
      internalScore: 74,
      completedProfessionalWorkCount: 8,
      claimCommitmentCount: 10,
      invalidLateCancellationCount: 1,
      noShowCount: 1,
      credentialStatus: 'approved',
    },
    events: [
      { eventType: 'CONFIRMATION_COMPLETED' },
      { eventType: 'CONFIRMATION_MISSED', adminReviewStatus: 'pending' },
      { eventType: 'dispute_opened' },
      { eventType: 'evidence_incomplete' },
    ],
  })

  assert.equal(model.metrics.find(metric => metric.label === 'Confirmation responsiveness')?.value, '50%')
  assert.equal(model.metrics.find(metric => metric.label === 'Dispute history')?.status, 'review')
  assert.equal(model.disputedEventCount, 1)
})
