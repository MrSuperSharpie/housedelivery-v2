import test from 'node:test'
import assert from 'node:assert/strict'

import { checkInspectorEligibility, resolveClaimEligibleDisciplines } from './eligibility'

const REGION = 'vancouver' as const

function plumbingEligibility(credentials: string[], approvedRoleLanes: ('official_authority')[] = []) {
  const disciplines = resolveClaimEligibleDisciplines(credentials, approvedRoleLanes)
  return checkInspectorEligibility('plumbing', REGION, disciplines, [REGION], undefined, 'approved')
}

test('Red Seal Plumber can claim plumbing jobs', () => {
  assert.equal(plumbingEligibility(['Red Seal Plumber']).eligible, true)
  assert.equal(plumbingEligibility(['red_seal_plumber']).eligible, true)
})

test('Building Official / Plumbing Official / AHJ authority can claim plumbing jobs', () => {
  assert.equal(plumbingEligibility([], ['official_authority']).eligible, true)
  assert.equal(plumbingEligibility(['Plumbing Official']).eligible, true)
  assert.equal(plumbingEligibility(['AHJ authority']).eligible, true)
})

test('unrelated credentials cannot claim plumbing jobs', () => {
  const result = plumbingEligibility(['electrical'])
  assert.equal(result.eligible, false)
  assert.deepEqual(result.reasons, ['Plumbing credential required'])
})
