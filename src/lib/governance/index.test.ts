import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createPackageIntegritySnapshot,
  validateClaimGovernance,
  validateHoldResolution,
  validateJobPostingGovernance,
  validateOutcomeSelection,
  validatePayoutRelease,
  validateSealSubmissionRequest,
} from './index'

import { isHoldOpenStatus } from '../holds/workflow'

test('job posting stays pending validation when escrow is not authorized', () => {
  const result = validateJobPostingGovernance({
    builderId: 'builder-1',
    builderStatus: 'approved',
    projectName: 'Oak Street Duplex',
    address: '123 Oak St',
    city: 'Vancouver',
    permitFamily: 'building',
    permitNumber: 'BP-123',
    requiredDiscipline: 'structural',
    region: 'vancouver',
    stage: 2,
    stageName: 'Framing',
    projectComplete: true,
    dependencySealed: true,
    escrowAuthorized: false,
  })

  assert.equal(result.ok, false)
  assert.equal(result.status, 'pending_validation')
  assert.ok(result.blockers.some(issue => issue.ruleId === 'R-016'))
})

test('claim governance blocks expired inspector credentials', () => {
  const result = validateClaimGovernance({
    jobStatus: 'live',
    jobValidationStatus: 'validated',
    permitFamily: 'electrical',
    requiredDiscipline: 'electrical',
    region: 'vancouver',
    inspectorDisciplines: ['electrical'],
    inspectorRegions: ['vancouver'],
    onboardingStatus: 'approved',
    credentialExpiryDate: '2020-01-01T00:00:00.000Z',
    assignmentLocked: false,
  })

  assert.equal(result.ok, false)
  assert.ok(result.blockers.some(issue => issue.ruleId === 'R-009'))
})

test('seal governance blocks submissions with open holds', () => {
  const result = validateSealSubmissionRequest({
    submissionStatus: 'hold_open',
    hasOpenHold: true,
    hasTechnicalBlockers: false,
    evidenceCount: 4,
    sealed: false,
    checklistPendingCount: 0,
  })

  assert.equal(result.ok, false)
  assert.ok(result.blockers.some(issue => issue.ruleId === 'R-036'))
})

test('builder cannot create technical hold decisions', () => {
  const result = validateOutcomeSelection({
    outcome: 'hold',
    requiredChecklistComplete: true,
    evidenceCount: 2,
    hasOpenHold: false,
    actorRole: 'builder',
  })

  assert.equal(result.ok, false)
  assert.ok(result.blockers.some(issue => issue.ruleId === 'R-029'))
})

test('hold resolution requires active builder-accepted hold state', () => {
  const blocked = validateHoldResolution({
    action: 'resolve',
    holdStatus: 'hold_pending_builder_ack',
    technicalResolved: true,
  })
  const allowed = validateHoldResolution({
    action: 'resolve',
    holdStatus: 'hold_active',
    technicalResolved: true,
  })

  assert.equal(blocked.ok, false)
  assert.equal(allowed.ok, true)
})

test('package integrity snapshot is deterministic enough to emit hash and verification code', async () => {
  const snapshot = await createPackageIntegritySnapshot({
    recordId: 'record-1',
    versionNumber: 1,
    sealedAt: '2026-04-07T12:00:00.000Z',
    sealedById: 'inspector-1',
    manifest: {
      certRef: 'CERT-001',
      result: 'pass',
      evidenceCount: 3,
    },
  })

  assert.equal(snapshot.versionNumber, 1)
  assert.equal(snapshot.packageHash.length, 64)
  assert.match(snapshot.verificationCode, /^[A-Z0-9-]+$/)
})

test('payout release stays blocked while a dispute is open', () => {
  const result = validatePayoutRelease({
    escrowStatus: 'disputed',
    hasBlockingDispute: true,
    hasControlPlaneException: false,
  })

  assert.equal(result.ok, false)
  assert.ok(result.blockers.some(issue => issue.ruleId === 'R-047'))
})

test('seal remains blocked until all stage holds are resolved, not just one', () => {
  const BASE_SEAL_INPUT = {
    hasTechnicalBlockers: false,
    evidenceCount: 4,
    sealed: false,
    checklistPendingCount: 0,
  }

  const bothOpen = [
    { stage: 1, status: 'hold_active' },
    { stage: 4, status: 'hold_active' },
  ]
  assert.equal(
    validateSealSubmissionRequest({
      ...BASE_SEAL_INPUT,
      hasOpenHold: bothOpen.some(h => isHoldOpenStatus(h.status)),
    }).ok,
    false,
  )

  const stageOneResolved = [
    { stage: 1, status: 'hold_resolved_pass' },
    { stage: 4, status: 'hold_active' },
  ]
  const partialResult = validateSealSubmissionRequest({
    ...BASE_SEAL_INPUT,
    hasOpenHold: stageOneResolved.some(h => isHoldOpenStatus(h.status)),
  })
  assert.equal(partialResult.ok, false)
  assert.ok(partialResult.blockers.some(issue => issue.ruleId === 'R-036'))

  const bothResolved = [
    { stage: 1, status: 'hold_resolved_pass' },
    { stage: 4, status: 'hold_resolved_pass' },
  ]
  assert.equal(
    validateSealSubmissionRequest({
      ...BASE_SEAL_INPUT,
      hasOpenHold: bothResolved.some(h => isHoldOpenStatus(h.status)),
    }).ok,
    true,
  )
})
