import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createPackageIntegritySnapshot,
  validateClaimGovernance,
  validateJobPostingGovernance,
  validatePayoutRelease,
  validateSealSubmissionRequest,
} from './index.ts'

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
