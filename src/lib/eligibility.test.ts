import test from 'node:test'
import assert from 'node:assert/strict'

import { checkInspectorEligibility, coversRequiredDiscipline, resolveClaimEligibleDisciplines } from './eligibility'

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

// The Live Board applies a second, RPC-backed authority gate on top of the
// shared helper. It vetoes a job only when the job is absent from the verified
// list AND the shared helper does not already cover the required discipline.
// This models that veto condition so the board and claim flow stay unified.
function liveBoardVetoesPlumbingJob(credentials: string[], approvedRoleLanes: ('official_authority')[] = []) {
  const disciplines = resolveClaimEligibleDisciplines(credentials, approvedRoleLanes)
  const jobAbsentFromRpcList = true // authority plumbing jobs are omitted by inspector_verified_disciplines
  return jobAbsentFromRpcList && !coversRequiredDiscipline('plumbing', disciplines)
}

test('Live Board allows approved plumbing authority even when RPC list omits the job', () => {
  assert.equal(liveBoardVetoesPlumbingJob([], ['official_authority']), false)
  assert.equal(liveBoardVetoesPlumbingJob(['Red Seal Plumber']), false)
  assert.equal(liveBoardVetoesPlumbingJob(['Plumbing Official']), false)
})

test('Live Board still vetoes unrelated credentials on plumbing jobs', () => {
  assert.equal(liveBoardVetoesPlumbingJob(['electrical']), true)
})
