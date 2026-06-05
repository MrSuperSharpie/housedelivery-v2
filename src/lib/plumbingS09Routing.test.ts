import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

import { validateJobPostingGovernance, validateClaimGovernance } from './governance/index'

const SRC = fileURLToPath(new URL('..', import.meta.url))
function read(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), 'utf8')
}

// ─── Shared fixture ──────────────────────────────────────────────────────────

const BASE_JOB = {
  builderId: 'builder-1',
  builderStatus: 'approved' as const,
  projectName: 'Maple St Duplex',
  address: '456 Maple St',
  city: 'Vancouver',
  permitNumber: 'PL-2024-001',
  region: 'vancouver' as const,
  stage: 3,
  stageName: 'Framing & Lock-up',
  projectComplete: true,
  dependencySealed: true,
  escrowAuthorized: true,
}

// ===========================================================================
// 1. Governance — plumbing permit family
// ===========================================================================

test('plumbing job with plumbing permitFamily passes governance', () => {
  const result = validateJobPostingGovernance({
    ...BASE_JOB,
    permitFamily: 'plumbing',
    requiredDiscipline: 'plumbing',
  })
  assert.equal(result.ok, true, 'plumbing + plumbing should pass governance')
  assert.equal(result.status, 'live')
  assert.ok(!result.blockers.some(b => b.code === 'discipline_mismatch'),
    'No discipline_mismatch blocker expected')
})

test('plumbing job with building permitFamily is rejected with discipline_mismatch', () => {
  const result = validateJobPostingGovernance({
    ...BASE_JOB,
    permitFamily: 'building',
    requiredDiscipline: 'plumbing',
  })
  assert.equal(result.ok, false)
  assert.ok(result.blockers.some(b => b.code === 'discipline_mismatch'),
    'discipline_mismatch blocker must fire for plumbing under building family')
})

test('structural job with building permitFamily still passes governance', () => {
  const result = validateJobPostingGovernance({
    ...BASE_JOB,
    permitFamily: 'building',
    requiredDiscipline: 'structural',
  })
  assert.equal(result.ok, true)
  assert.equal(result.status, 'live')
})

test('electrical job with electrical permitFamily still passes governance', () => {
  const result = validateJobPostingGovernance({
    ...BASE_JOB,
    permitFamily: 'electrical',
    requiredDiscipline: 'electrical',
  })
  assert.equal(result.ok, true)
  assert.equal(result.status, 'live')
})

test('mechanical job with building permitFamily still passes governance (unchanged in this pass)', () => {
  const result = validateJobPostingGovernance({
    ...BASE_JOB,
    permitFamily: 'building',
    requiredDiscipline: 'mechanical',
  })
  assert.equal(result.ok, true, 'mechanical under building should still pass — not changed in this pass')
})

// ─── Claim governance ────────────────────────────────────────────────────────

const BASE_CLAIM = {
  jobStatus: 'live' as const,
  jobValidationStatus: 'validated',
  region: 'vancouver' as const,
  inspectorRegions: ['vancouver' as const],
  onboardingStatus: 'approved' as const,
}

test('plumbing inspector can claim plumbing job when permitFamily is plumbing', () => {
  const result = validateClaimGovernance({
    ...BASE_CLAIM,
    permitFamily: 'plumbing',
    requiredDiscipline: 'plumbing',
    inspectorDisciplines: ['plumbing'],
  })
  assert.equal(result.ok, true, 'plumbing inspector should be able to claim plumbing job')
})

test('plumbing inspector cannot claim plumbing job when permitFamily is building (old bug regression)', () => {
  const result = validateClaimGovernance({
    ...BASE_CLAIM,
    permitFamily: 'building',
    requiredDiscipline: 'plumbing',
    inspectorDisciplines: ['plumbing'],
  })
  assert.equal(result.ok, false, 'plumbing under building permit family should still block claim')
})

// ===========================================================================
// 2. store.tsx — permit family derivation (static analysis)
// ===========================================================================

test('store.tsx addJob derives permitFamily as plumbing for plumbing discipline', () => {
  const source = read('lib/store.tsx')
  const addJobStart = source.indexOf('// ─── addJob')
  const addJobEnd = source.indexOf('// ─── ', addJobStart + 1)
  const addJobBlock = source.slice(addJobStart, addJobEnd)
  assert.ok(
    addJobBlock.includes("'plumbing' ? 'plumbing'"),
    'addJob must map plumbing discipline to plumbing permit family'
  )
})

test('store.tsx addJob does not use bare electrical-or-building pattern', () => {
  const source = read('lib/store.tsx')
  const addJobStart = source.indexOf('// ─── addJob')
  const addJobEnd = source.indexOf('// ─── ', addJobStart + 1)
  const addJobBlock = source.slice(addJobStart, addJobEnd)
  assert.ok(
    !addJobBlock.includes("=== 'electrical' ? 'electrical' : 'building'"),
    'addJob must not use the coarse two-branch pattern'
  )
})

test('store.tsx claim governance derives permitFamily as plumbing for plumbing discipline', () => {
  const source = read('lib/store.tsx')
  const claimStart = source.indexOf('validateClaimGovernance(')
  assert.ok(claimStart !== -1, 'validateClaimGovernance call must exist in store')
  const claimBlock = source.slice(claimStart, claimStart + 400)
  assert.ok(
    claimBlock.includes("'plumbing' ? 'plumbing'"),
    'claim governance must map plumbing discipline to plumbing permit family'
  )
})

test('store.tsx structural discipline still maps to building (no regression)', () => {
  const source = read('lib/store.tsx')
  // The final branch of the ternary chain falls through to 'building'
  assert.ok(
    source.includes(": 'building'"),
    'store.tsx must still have building as the fallback permit family'
  )
})

// ===========================================================================
// 3. InspectorCompletionWorkspace — discipline-aware stage routing
// ===========================================================================

test('InspectorCompletionWorkspace declares DISCIPLINE_STAGE_OVERRIDE', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  assert.ok(
    source.includes('DISCIPLINE_STAGE_OVERRIDE'),
    'DISCIPLINE_STAGE_OVERRIDE must be declared in InspectorCompletionWorkspace'
  )
})

test('DISCIPLINE_STAGE_OVERRIDE maps plumbing builder stage 3 to completion stage 9', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const overrideStart = source.indexOf('DISCIPLINE_STAGE_OVERRIDE')
  const overrideEnd = source.indexOf('const BUILDER_STAGE_LABELS', overrideStart)
  const overrideBlock = source.slice(overrideStart, overrideEnd)
  assert.ok(overrideBlock.includes('plumbing'), 'Override must include plumbing key')
  assert.ok(overrideBlock.includes('3: 9'), 'Override must map builder stage 3 to completion stage 9 for plumbing')
})

test('resolveRequestedChecklistStage accepts a discipline parameter', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const fnStart = source.indexOf('function resolveRequestedChecklistStage(')
  const fnSignatureEnd = source.indexOf(')', fnStart) + 1
  const signature = source.slice(fnStart, fnSignatureEnd + 50)
  assert.ok(
    signature.includes('discipline'),
    'resolveRequestedChecklistStage must accept a discipline parameter'
  )
})

test('resolveRequestedChecklistStage call site passes jobRow.discipline', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  assert.ok(
    source.includes('resolveRequestedChecklistStage(definitionSet.stages, jobRow.stage, jobRow.discipline)'),
    'Call site must pass jobRow.discipline to resolveRequestedChecklistStage'
  )
})

test('BUILDER_STAGE_TO_COMPLETION_STAGE still maps stage 3 to 6 as default', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const mapStart = source.indexOf('BUILDER_STAGE_TO_COMPLETION_STAGE')
  const mapEnd = source.indexOf('}', mapStart)
  const mapBlock = source.slice(mapStart, mapEnd)
  assert.ok(mapBlock.includes('3: 6'), 'Default map must still have 3 → 6 for structural fallback')
})

// ===========================================================================
// 4. fire_protection — permit family validation and stage routing
// ===========================================================================

test('fire_protection job with building permitFamily passes governance', () => {
  const result = validateJobPostingGovernance({
    ...BASE_JOB,
    permitFamily: 'building',
    requiredDiscipline: 'fire_protection',
  })
  assert.equal(result.ok, true, 'fire_protection under building should pass governance after fix')
  assert.equal(result.status, 'live')
  assert.ok(!result.blockers.some(b => b.code === 'discipline_mismatch'),
    'No discipline_mismatch blocker expected for fire_protection under building')
})

test('DISCIPLINE_STAGE_OVERRIDE maps fire_protection builder stage 3 to completion stage 8', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const overrideStart = source.indexOf('DISCIPLINE_STAGE_OVERRIDE')
  const overrideEnd = source.indexOf('const BUILDER_STAGE_LABELS', overrideStart)
  const overrideBlock = source.slice(overrideStart, overrideEnd)
  assert.ok(overrideBlock.includes('fire_protection'), 'Override must include fire_protection key')
  assert.ok(overrideBlock.includes('3: 8'), 'Override must map builder stage 3 to completion stage 8 for fire_protection')
})

test('DISCIPLINE_STAGE_OVERRIDE maps architectural builder stage 3 to completion stage 7', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const overrideStart = source.indexOf('DISCIPLINE_STAGE_OVERRIDE')
  const overrideEnd = source.indexOf('const BUILDER_STAGE_LABELS', overrideStart)
  const overrideBlock = source.slice(overrideStart, overrideEnd)
  assert.ok(overrideBlock.includes('architectural'), 'Override must include architectural key')
  assert.ok(overrideBlock.includes('3: 7'), 'Override must map builder stage 3 to completion stage 7 for architectural')
})

test('DISCIPLINE_STAGE_OVERRIDE still maps plumbing builder stage 3 to completion stage 9', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const overrideStart = source.indexOf('DISCIPLINE_STAGE_OVERRIDE')
  const overrideEnd = source.indexOf('const BUILDER_STAGE_LABELS', overrideStart)
  const overrideBlock = source.slice(overrideStart, overrideEnd)
  assert.ok(overrideBlock.includes('plumbing'), 'Override must still include plumbing key')
  assert.ok(overrideBlock.includes('3: 9'), 'Override must still map builder stage 3 to completion stage 9 for plumbing')
})

test('DISCIPLINE_STAGE_OVERRIDE maps electrical builder stage 3 to completion stage 10', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const overrideStart = source.indexOf('DISCIPLINE_STAGE_OVERRIDE')
  const overrideEnd = source.indexOf('const BUILDER_STAGE_LABELS', overrideStart)
  const overrideBlock = source.slice(overrideStart, overrideEnd)
  assert.ok(overrideBlock.includes('electrical'), 'Override must include electrical key')
  assert.ok(overrideBlock.includes('3: 10'), 'Override must map builder stage 3 to completion stage 10 for electrical')
})

test('DISCIPLINE_STAGE_OVERRIDE maps mechanical builder stage 3 to completion stage 11', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const overrideStart = source.indexOf('DISCIPLINE_STAGE_OVERRIDE')
  const overrideEnd = source.indexOf('const BUILDER_STAGE_LABELS', overrideStart)
  const overrideBlock = source.slice(overrideStart, overrideEnd)
  assert.ok(overrideBlock.includes('mechanical'), 'Override must include mechanical key')
  assert.ok(overrideBlock.includes('3: 11'), 'Override must map builder stage 3 to completion stage 11 for mechanical')
})

test('BUILDER_STAGE_TO_COMPLETION_STAGE still maps stage 3 to 6 as structural default', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const overrideEnd = source.indexOf('DISCIPLINE_STAGE_OVERRIDE')
  const mapStart = source.indexOf('BUILDER_STAGE_TO_COMPLETION_STAGE')
  const mapEnd = source.indexOf('}', mapStart)
  const mapBlock = source.slice(mapStart, mapEnd)
  assert.ok(mapBlock.includes('3: 6'), 'Base map must still have 3 → 6 for structural fallback')
  assert.ok(mapStart < overrideEnd, 'Base map must be declared before DISCIPLINE_STAGE_OVERRIDE')
})

test('fire_protection discipline is not accepted under electrical or plumbing permit families', () => {
  const electricalResult = validateJobPostingGovernance({
    ...BASE_JOB,
    permitFamily: 'electrical',
    requiredDiscipline: 'fire_protection',
  })
  assert.equal(electricalResult.ok, false, 'fire_protection must not satisfy electrical permit family')
  assert.ok(electricalResult.blockers.some(b => b.code === 'discipline_mismatch'),
    'discipline_mismatch must fire for fire_protection under electrical')

  const plumbingResult = validateJobPostingGovernance({
    ...BASE_JOB,
    permitFamily: 'plumbing',
    requiredDiscipline: 'fire_protection',
  })
  assert.equal(plumbingResult.ok, false, 'fire_protection must not satisfy plumbing permit family')
  assert.ok(plumbingResult.blockers.some(b => b.code === 'discipline_mismatch'),
    'discipline_mismatch must fire for fire_protection under plumbing')
})

test('plumbing still rejected under building permit family (regression guard)', () => {
  const result = validateJobPostingGovernance({
    ...BASE_JOB,
    permitFamily: 'building',
    requiredDiscipline: 'plumbing',
  })
  assert.equal(result.ok, false, 'plumbing under building must still be rejected')
  assert.ok(result.blockers.some(b => b.code === 'discipline_mismatch'),
    'discipline_mismatch must still fire for plumbing under building')
})

test('Stage 9 content is not modified by fire_protection routing pass', () => {
  const source = read('lib/inspectorCompletion.ts')
  const s09Start = source.indexOf('STRUCTURAL_STAGE_9_CONTAINERS')
  const s09End = source.indexOf('STRUCTURAL_STAGE_10_CONTAINERS')
  const block = source.slice(s09Start, s09End)
  assert.ok(block.includes("code: 'S09-01'"), 'S09-01 must be preserved')
  assert.ok(block.includes("code: 'S09-02'"), 'S09-02 must be preserved')
  assert.ok(block.includes("code: 'S09-03'"), 'S09-03 must be preserved')
  assert.ok(block.includes("code: 'S09-04'"), 'S09-04 must be preserved')
  assert.ok(block.includes("code: 'S09-05'"), 'S09-05 must be preserved')
  assert.ok(block.includes('DWV test'), 'S09 DWV test language must be preserved')
  assert.ok(
    block.includes('backwater valve') || block.includes('Backwater valve'),
    'S09 backwater valve language must be preserved'
  )
})

test('Schedule C-B and final-occupancy routes are not modified by fire_protection pass', () => {
  const scheduleCB = read('app/api/schedule-cb/route.ts')
  // fire_protection appears in the pre-existing DISCIPLINE_DISPLAY label map — that is correct.
  // What must not appear is checklist routing logic or S08 container references.
  assert.ok(!scheduleCB.includes('DISCIPLINE_STAGE_OVERRIDE'), 'Schedule C-B must not reference the stage override map')
  assert.ok(!scheduleCB.includes('S08-04'), 'Schedule C-B must not reference S08-04 checklist container')
  assert.ok(!scheduleCB.includes('S08-05'), 'Schedule C-B must not reference S08-05 checklist container')

  const finalOcc = read('app/api/inspections/final-occupancy/route.ts')
  assert.ok(!finalOcc.includes('DISCIPLINE_STAGE_OVERRIDE'), 'Final occupancy must not reference the stage override map')
  assert.ok(!finalOcc.includes('S08-04'), 'Final occupancy must not reference S08-04 checklist container')
})

// ===========================================================================
// 5. Isolation — Schedule C-B and final occupancy not touched
// ===========================================================================

test('Schedule C-B route does not reference DISCIPLINE_STAGE_OVERRIDE', () => {
  const source = read('app/api/schedule-cb/route.ts')
  assert.ok(!source.includes('DISCIPLINE_STAGE_OVERRIDE'), 'Schedule C-B must not reference the new override map')
  assert.ok(!source.includes('plumbing.*9\|S09'), 'Schedule C-B must not reference S09 routing')
})

test('final-occupancy route does not reference DISCIPLINE_STAGE_OVERRIDE', () => {
  const source = read('app/api/inspections/final-occupancy/route.ts')
  assert.ok(!source.includes('DISCIPLINE_STAGE_OVERRIDE'), 'Final occupancy must not reference the new override map')
})
