import test from 'node:test'
import assert from 'node:assert/strict'

import { matchesApprovedLane, type CredentialTypeRow, type HeldCredentialRow } from './credentialAuthoritySync'

const held = (credentialTypeId: string): HeldCredentialRow => ({
  id: `held-${credentialTypeId}`,
  credential_type_id: credentialTypeId,
  verification_status: 'unverified',
})

// Mirrors the credential catalog in 20260422010000_credential_authority_model.sql
const RED_SEAL_PLUMBER: CredentialTypeRow = {
  id: 'red_seal_plumber',
  authority_level: 'tradesperson',
  disciplines: ['plumbing'],
}
const MUNICIPAL_INSPECTOR: CredentialTypeRow = {
  id: 'municipal_inspector',
  authority_level: 'municipal_official',
  disciplines: ['structural', 'architectural', 'mechanical', 'electrical', 'plumbing', 'fire_protection', 'geotech'],
}
const FSR_CLASS_A: CredentialTypeRow = {
  id: 'fsr_class_a',
  authority_level: 'tradesperson',
  disciplines: ['electrical'],
}

test('approved official_authority syncs a plumbing trade credential (regression: DEMO-PLMB / John Brown)', () => {
  // Before the fix this returned false (tradesperson !== municipal_official),
  // so the sync found no matching credentials and returned HTTP 409.
  assert.equal(
    matchesApprovedLane(held('red_seal_plumber'), RED_SEAL_PLUMBER, ['official_authority']),
    true,
  )
})

test('approved official_authority still syncs the municipal-official credential', () => {
  assert.equal(
    matchesApprovedLane(held('municipal_inspector'), MUNICIPAL_INSPECTOR, ['official_authority']),
    true,
  )
})

test('official_authority does not sync unrelated (non-plumbing) credentials', () => {
  // Electrical FSR credential is not plumbing and not municipal_official.
  assert.equal(
    matchesApprovedLane(held('fsr_class_a'), FSR_CLASS_A, ['official_authority']),
    false,
  )
})

test('a plumbing trade credential is not synced without an approving lane', () => {
  assert.equal(matchesApprovedLane(held('red_seal_plumber'), RED_SEAL_PLUMBER, []), false)
  assert.equal(matchesApprovedLane(held('red_seal_plumber'), RED_SEAL_PLUMBER, ['engineer']), false)
})
