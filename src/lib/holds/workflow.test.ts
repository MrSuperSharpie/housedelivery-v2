import test from 'node:test'
import assert from 'node:assert/strict'

import {
  canAddHoldEvidence,
  canPerformHoldAction,
  buildHoldLifecycleEvents,
  calculateHoldPricing,
  canBuilderRespondToHold,
  canInspectorCreateHold,
  canResolveHold,
  getHoldResolutionStatus,
  isHoldOpenStatus,
  normalizeHoldStatus,
} from './workflow'

test('inspector can create governed hold offers', () => {
  assert.equal(canInspectorCreateHold('inspector'), true)
  assert.equal(canInspectorCreateHold('builder' as never), false)
})

test('builder can accept or decline only while hold awaits acknowledgment', () => {
  assert.equal(canBuilderRespondToHold({ actorRole: 'builder', holdStatus: 'hold_pending_builder_ack' }), true)
  assert.equal(canBuilderRespondToHold({ actorRole: 'builder', holdStatus: 'hold_active' }), false)
})

test('hold action matrix enforces role boundaries', () => {
  assert.equal(canPerformHoldAction({ action: 'create', actorRole: 'builder', holdStatus: 'hold_pending_builder_ack' }), false)
  assert.equal(canPerformHoldAction({ action: 'builder_accept', actorRole: 'builder', holdStatus: 'hold_pending_builder_ack' }), true)
  assert.equal(canPerformHoldAction({ action: 'builder_decline', actorRole: 'inspector', holdStatus: 'hold_pending_builder_ack' }), false)
  assert.equal(canPerformHoldAction({ action: 'resolve', actorRole: 'inspector', holdStatus: 'hold_active' }), true)
})

test('timer/open-hold semantics begin only after builder acceptance', () => {
  assert.equal(isHoldOpenStatus('hold_pending_builder_ack'), true)
  assert.equal(isHoldOpenStatus('hold_active'), true)
  assert.equal(canResolveHold({ actorRole: 'inspector', holdStatus: 'hold_pending_builder_ack' }), false)
  assert.equal(canResolveHold({ actorRole: 'inspector', holdStatus: 'hold_active' }), true)
  assert.equal(canAddHoldEvidence({ actorRole: 'builder', holdStatus: 'hold_active' }), true)
})

test('hold resolves cleanly to pass or fail', () => {
  assert.equal(getHoldResolutionStatus('pass'), 'hold_resolved_pass')
  assert.equal(getHoldResolutionStatus('fail'), 'hold_resolved_fail')
})

test('legacy hold statuses normalize into governed equivalents', () => {
  assert.equal(normalizeHoldStatus('open'), 'hold_pending_builder_ack')
  assert.equal(normalizeHoldStatus('builder_approved'), 'hold_active')
  assert.equal(normalizeHoldStatus('expired'), 'hold_expired')
})

test('hold pricing respects configured cap and retained minutes', () => {
  const snapshot = calculateHoldPricing({
    premiumRateType: 'hourly',
    premiumRateAmount: 120,
    estimatedCorrectionMinutes: 60,
    elapsedSeconds: 90 * 60,
    holdCapAmount: 150,
  })

  assert.equal(snapshot.retainedMinutes, 90)
  assert.equal(snapshot.accruedPremiumAmount, 150)
  assert.equal(snapshot.capped, true)
})

test('hold lifecycle emits auditable event transitions', () => {
  const created = buildHoldLifecycleEvents({
    previousStatus: null,
    nextStatus: 'hold_pending_builder_ack',
  })
  const accepted = buildHoldLifecycleEvents({
    previousStatus: 'hold_pending_builder_ack',
    nextStatus: 'hold_active',
  })

  assert.deepEqual(created.map(event => event.action), ['hold_created', 'hold_builder_notified'])
  assert.deepEqual(accepted.map(event => event.action), ['hold_accepted', 'hold_started'])
})
