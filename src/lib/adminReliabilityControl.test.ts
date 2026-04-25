import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCancellationReviewOutcome,
  buildInspectorReliabilityDetail,
  buildPayoutReviewOutcome,
  buildPolicyConfigUpdate,
  buildReliabilityOverviewMetrics,
  canAccessAdminReliabilitySection,
  sanitizeInspectorReliabilityDetailForViewer,
} from './adminReliabilityControl'
import type { ReliabilityAdminSnapshot, ReliabilityProfileRow } from './supabase/reliability'

const emptySnapshot: ReliabilityAdminSnapshot = {
  profiles: [],
  events: [],
  appointments: [],
  confirmations: [],
  notifications: [],
  standbyCandidates: [],
  cancellations: [],
  siteReadinessIncidents: [],
  reserveLedgerEntries: [],
  payoutReviews: [],
  builderCreditHooks: [],
  auditEvents: [],
}

const baseProfile: ReliabilityProfileRow = {
  inspectorId: 'inspector-1',
  internalScore: 82,
  tierKey: 'preferred',
  completedProfessionalWorkCount: 8,
  claimCommitmentCount: 10,
  validCancellationCount: 1,
  invalidLateCancellationCount: 1,
  noShowCount: 0,
  builderSiteNotReadyCount: 1,
  updatedAt: '2026-04-25T12:00:00.000Z',
}

test('admin access allowed', () => {
  assert.equal(canAccessAdminReliabilitySection('admin', 'overview'), true)
  assert.equal(canAccessAdminReliabilitySection('admin', 'policy_config'), true)
})

test('non-admin access denied', () => {
  assert.equal(canAccessAdminReliabilitySection('builder', 'payout_review'), false)
  assert.equal(canAccessAdminReliabilitySection('inspector', 'inspector_detail'), false)
  assert.equal(canAccessAdminReliabilitySection(null, 'policy_config'), false)
})

test('policy config updates audited', () => {
  const update = buildPolicyConfigUpdate({
    policyVersionId: 'policy-1',
    currentConfig: { appealWindowHours: 72, enforcementMode: 'observe_only' },
    patch: { appealWindowHours: 96 },
    enforcementMode: 'observe_only',
    adminNote: 'Extend appeal window while still observe-only.',
  })

  assert.equal(update.nextConfig.appealWindowHours, 96)
  assert.equal(update.nextConfig.enforcementMode, 'observe_only')
  assert.equal(update.audit.action, 'reliability.policy_config_updated')
  assert.equal(update.audit.entityType, 'reliability_policy_version')
})

test('cancellation review creates correct events', () => {
  const outcome = buildCancellationReviewOutcome({
    cancellationRequestId: 'cancel-1',
    jobId: 'job-1',
    assignmentId: 'assignment-1',
    reasonCode: 'double_booked',
    isLate: true,
    decision: 'rejected',
    adminNote: 'Avoidable late cancellation inside protected window.',
    applyConsequence: true,
    triggerReassignment: true,
  })

  assert.equal(outcome.validityStatus, 'invalid')
  assert.equal(outcome.financialConsequenceStatus, 'applied')
  assert.deepEqual(outcome.reliabilityEvents.map(event => event.eventType), ['LATE_CANCELLATION'])
  assert.equal(outcome.audit.action, 'cancellation.admin_reviewed')
})

test('payout review updates payout status', () => {
  const approved = buildPayoutReviewOutcome({
    assignmentId: 'assignment-1',
    decision: 'approve_payout',
    adminNote: 'Inspection evidence complete and dispute cleared.',
  })
  const blocked = buildPayoutReviewOutcome({
    assignmentId: 'assignment-1',
    decision: 'block_payout',
    adminNote: 'No-show pending admin review.',
  })

  assert.equal(approved.payoutStatus, 'payout_ready')
  assert.equal(approved.adminReviewStatus, 'approved')
  assert.equal(blocked.payoutStatus, 'blocked')
  assert.equal(blocked.adminReviewStatus, 'blocked')
  assert.equal(blocked.audit.action, 'payout.admin_reviewed')
})

test('inspector detail does not leak across accounts', () => {
  const detail = buildInspectorReliabilityDetail({
    profile: baseProfile,
    events: [{ id: 'event-1', inspectorId: 'inspector-1', eventType: 'NO_SHOW', scoreDelta: -25, adminReviewStatus: 'pending', createdAt: '2026-04-25T12:00:00.000Z' }],
    cancellations: [],
    reserveEntries: [{ id: 'reserve-1', inspectorId: 'inspector-1', entryType: 'reserve_hold', amount: 50, currency: 'CAD', enforcementMode: 'observe_only', legalReviewRequired: true, status: 'pending', createdAt: '2026-04-25T12:00:00.000Z' }],
    credentialStatus: 'approved',
    adminNotes: ['Internal watchlist note'],
  })

  assert.equal(sanitizeInspectorReliabilityDetailForViewer(detail, { role: 'builder', id: 'builder-1' }), null)

  const selfView = sanitizeInspectorReliabilityDetailForViewer(detail, { role: 'inspector', id: 'inspector-1' })
  assert.ok(selfView)
  assert.equal('reliabilityScore' in selfView, false)
  assert.equal('adminNotes' in selfView, false)
  assert.equal('reserveRequirement' in selfView, false)

  const adminView = sanitizeInspectorReliabilityDetailForViewer(detail, { role: 'admin', id: 'admin-1' })
  assert.equal(adminView?.reliabilityScore, 82)
  assert.deepEqual(adminView?.adminNotes, ['Internal watchlist note'])
})

test('overview metrics count reliability queues', () => {
  const metrics = buildReliabilityOverviewMetrics({
    ...emptySnapshot,
    appointments: [{
      id: 'appointment-1',
      jobId: 'job-1',
      assignmentId: 'assignment-1',
      inspectorId: 'inspector-1',
      scheduledStartAt: '2026-04-25T18:00:00.000Z',
      commitmentVersion: 'v1',
      commitmentAcceptedAt: '2026-04-25T12:00:00.000Z',
      confirmationStatus: 'pending',
      status: 'scheduled',
      createdAt: '2026-04-25T12:00:00.000Z',
    }],
    confirmations: [{
      id: 'confirmation-1',
      jobId: 'job-1',
      assignmentId: 'assignment-1',
      inspectorId: 'inspector-1',
      checkpoint: 't_90m',
      status: 'missed',
      escalationStatus: 'standby_activation_requested',
      criticalAlertOnMiss: true,
      standbyPrepareOnMiss: true,
      standbyActivateOnMiss: true,
      createdAt: '2026-04-25T16:30:00.000Z',
    }],
    payoutReviews: [{ id: 'payout-1', jobId: 'job-1', payoutStatus: 'blocked', paymentStatus: 'held', adminReviewStatus: 'pending', baseFeeAmount: 100, holdPremiumAmount: 0, reserveWithheldAmount: 0, payoutReductionAmount: 0, builderCreditAmount: 0, enforcementMode: 'observe_only', decidedAt: '2026-04-25T16:40:00.000Z' }],
    profiles: [{ ...baseProfile, internalScore: 60 }],
  }, new Date('2026-04-25T10:00:00.000Z'))

  assert.equal(metrics.find(metric => metric.key === 'assigned_today')?.value, 1)
  assert.equal(metrics.find(metric => metric.key === 'at_risk')?.value, 1)
  assert.equal(metrics.find(metric => metric.key === 'missed_confirmations')?.value, 1)
  assert.equal(metrics.find(metric => metric.key === 'payout_blocks')?.value, 1)
  assert.equal(metrics.find(metric => metric.key === 'watchlist')?.value, 1)
})
