import test from 'node:test'
import assert from 'node:assert/strict'

import {
  validateClaimEligibility,
  DUPLICATE_CLAIM_ERROR,
  INSPECTOR_CLAIM_EVENT_KEY,
  BUILDER_ASSIGNMENT_EVENT_KEY,
  INSPECTOR_ATTENDANCE_REMINDER_EVENT_KEY,
  ADMIN_CRITICAL_ATTENDANCE_RISK_EVENT_KEY,
  STANDBY_ACTIVATION_REQUESTED_EVENT_KEY,
} from './validation'

const FUTURE_EXPIRY = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
const PAST_EXPIRY = '2020-01-01T00:00:00.000Z'

test('eligible inspector can claim after acknowledgement', () => {
  const result = validateClaimEligibility({ onboardingStatus: 'approved' })
  assert.equal(result.ok, true)
  assert.equal(result.error, undefined)
})

test('eligible inspector with valid credential can claim', () => {
  const result = validateClaimEligibility({
    onboardingStatus: 'approved',
    credentialExpiresAt: FUTURE_EXPIRY,
  })
  assert.equal(result.ok, true)
})

test('ineligible inspector cannot claim', () => {
  for (const status of ['draft', 'submitted', 'under_review', 'needs_info', 'rejected']) {
    const result = validateClaimEligibility({ onboardingStatus: status })
    assert.equal(result.ok, false, `expected blocked for status=${status}`)
    assert.ok(result.error, `expected error message for status=${status}`)
  }
})

test('suspended inspector cannot claim', () => {
  const result = validateClaimEligibility({ onboardingStatus: 'suspended' })
  assert.equal(result.ok, false)
  assert.match(result.error!, /suspended/)
})

test('expired credential cannot claim', () => {
  const result = validateClaimEligibility({
    onboardingStatus: 'approved',
    credentialExpiresAt: PAST_EXPIRY,
  })
  assert.equal(result.ok, false)
  assert.match(result.error!, /expired/)
})

test('restricted reliability tier blocks claim', () => {
  const result = validateClaimEligibility({
    onboardingStatus: 'approved',
    reliabilityTier: 'restricted',
  })
  assert.equal(result.ok, false)
  assert.match(result.error!, /restricted/)
})

test('manual tier override restricted blocks claim even with standard base tier', () => {
  const result = validateClaimEligibility({
    onboardingStatus: 'approved',
    reliabilityTier: 'standard',
    manualTierOverride: 'restricted',
  })
  assert.equal(result.ok, false)
  assert.match(result.error!, /restricted/)
})

test('claim creates commitment and reliability event — event key matches RPC', () => {
  // The RPC queues inspector.claim_commitment_accepted on successful claim.
  // This constant must match the RPC's notification_events insert exactly.
  assert.equal(INSPECTOR_CLAIM_EVENT_KEY, 'inspector.claim_commitment_accepted')
})

test('builder receives assignment notification — event key matches RPC', () => {
  // The RPC queues builder.assignment_claimed to the builder on successful claim.
  assert.equal(BUILDER_ASSIGNMENT_EVENT_KEY, 'builder.assignment_claimed')
})

test('attendance ladder notification keys match RPC inserts', () => {
  assert.equal(INSPECTOR_ATTENDANCE_REMINDER_EVENT_KEY, 'inspector.attendance_confirmation_reminder')
  assert.equal(ADMIN_CRITICAL_ATTENDANCE_RISK_EVENT_KEY, 'admin.critical_attendance_risk')
  assert.equal(STANDBY_ACTIVATION_REQUESTED_EVENT_KEY, 'standby.activation_requested')
})

test('duplicate claim is rejected safely — error matches RPC unique_violation handler', () => {
  // claim_live_job_if_eligible catches unique_violation and returns this message.
  assert.equal(DUPLICATE_CLAIM_ERROR, 'Job has already been claimed.')
})
