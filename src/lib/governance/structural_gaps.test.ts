import test from 'node:test'
import assert from 'node:assert/strict'

import { evaluateDbProjectReadiness } from './projects'
import { normalizeAssignmentUiSnapshot } from './assignments'
import { evaluateGeofence } from '../geofence'
import { hydrateGovernedPaymentAmounts } from './payments'

test('project readiness is derived from database-backed state, not stale local-only data', () => {
  const readiness = evaluateDbProjectReadiness(
    {
      id: 'project-1',
      name: 'North Shore Duplex',
      address: '123 Marine Dr',
      city: 'North Vancouver',
      permitNumber: '',
      builderOnboardingStatus: 'approved',
      localOnly: false,
    },
    {
      completenessStatus: 'needs_info',
      completenessBlockers: [{ ruleId: 'R-010', message: 'Permit number missing.' }],
    },
  )

  assert.equal(readiness.ready, false)
  assert.match(readiness.blockers.join(' '), /Permit number missing/i)
})

test('assignment UI reads reflect persisted provisional objection state without inventing local status', () => {
  const snapshot = normalizeAssignmentUiSnapshot({
    status: 'provisional',
    objectionState: 'pending_review',
    objectionWindowClosesAt: '2099-01-01T00:00:00.000Z',
  })

  assert.equal(snapshot.status, 'provisional')
  assert.equal(snapshot.objectionState, 'pending_review')
  assert.equal(snapshot.autoConfirm, false)
})

test('expired provisional assignments are normalized to confirmed from persisted timestamps', () => {
  const snapshot = normalizeAssignmentUiSnapshot({
    status: 'provisional',
    objectionState: 'none',
    objectionWindowClosesAt: '2026-01-01T00:00:00.000Z',
  }, '2026-04-07T00:00:00.000Z')

  assert.equal(snapshot.status, 'confirmed')
  assert.equal(snapshot.autoConfirm, true)
})

test('geofence evaluation requires explanation for anomalous captures', () => {
  const result = evaluateGeofence({
    projectPoint: { latitude: 49.2827, longitude: -123.1207 },
    capturePoint: { latitude: 49.2927, longitude: -123.1207 },
    thresholdMeters: 250,
  })

  assert.equal(result.state, 'anomalous')
  assert.equal(result.explanationRequired, true)
  assert.ok((result.distanceMeters ?? 0) > 250)
})

test('payment hydration uses upstream offered rate when available', () => {
  const result = hydrateGovernedPaymentAmounts({
    offeredRate: 443,
    escrowAmount: 443,
    platformCommission: 44,
  })

  assert.equal(result.baseFeeAmount, 443)
  assert.equal(result.holdPremiumAmount, 0)
  assert.equal(result.veroCommissionAmount, 44)
  assert.equal(result.usedFallback, false)
})
