import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const SRC = fileURLToPath(new URL('..', import.meta.url))
function read(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), 'utf8')
}

const WORKSPACE = 'components/inspector/InspectorCompletionWorkspace.tsx'
const SCOPED_ROUTE = 'app/api/inspections/complete-scoped-assignment/route.ts'

// ===========================================================================
// Scoped-Fail submission patch
// A documented Fail (deficiency note + evidence) is submittable on the scoped
// path. Failed status is preserved, the outcome is stamped 'fail', the stage
// does not advance, and the builder receives a Corrections Required notice.
// ===========================================================================

test('isDocumentedFail requires a deficiency note AND attached evidence', () => {
  const source = read(WORKSPACE)
  const idx = source.indexOf('function isDocumentedFail')
  assert.ok(idx !== -1, 'isDocumentedFail helper must exist')
  const body = source.slice(idx, idx + 400)
  assert.ok(body.includes("inspection_status === 'Failed'"), 'must require Failed status')
  assert.ok(body.includes('response_note.trim().length > 0'), 'must require a non-empty deficiency note')
  assert.ok(body.includes('item.documents.length > 0'), 'must require at least one evidence item')
})

test('"Evidence unavailable" bypass is not implemented yet', () => {
  const source = read(WORKSPACE)
  assert.ok(
    !/evidence[_ ]?unavailable/i.test(source),
    'Evidence-unavailable must remain a later controlled feature, not a current bypass'
  )
})

test('sign-off gate blocks on undocumented fails only (blockingFailedStageItems)', () => {
  const source = read(WORKSPACE)
  assert.ok(source.includes('blockingFailedStageItems'), 'blocking subset must exist')
  // The gate uses the blocking subset, not the raw failed set.
  assert.ok(
    source.includes('return blockingFailedStageItems.length === 0'),
    'stageReadyForSignOff must gate on blockingFailedStageItems'
  )
})

test('blocking subset is scoped-only and excludes documented fails', () => {
  const source = read(WORKSPACE)
  const idx = source.indexOf('const blockingFailedStageItems')
  assert.ok(idx !== -1, 'blockingFailedStageItems must be declared')
  const body = source.slice(idx, idx + 360)
  assert.ok(body.includes('isScopedStageCompletion'), 'relaxation must be scoped-path only')
  assert.ok(body.includes('!isDocumentedFail(item)'), 'documented fails must be excluded from the blocker')
})

test('handleStageSignOff preserves Failed status (does not force-convert to Passed)', () => {
  const source = read(WORKSPACE)
  assert.ok(
    source.includes("(item.inspection_status === 'N/A' || item.inspection_status === 'Failed')"),
    'sign-off must preserve both N/A and Failed outcomes'
  )
})

test('scoped sign-off stamps overallResult into the seal payload', () => {
  const source = read(WORKSPACE)
  assert.ok(source.includes('scopedStageHasFailure'), 'scoped failure must be derived')
  assert.ok(
    source.includes("{ overallResult: scopedStageHasFailure ? 'fail' : 'pass' }"),
    'overallResult must be written for scoped completion'
  )
})

test('inspector copy: failed section keeps the inspector working safe items', () => {
  const source = read(WORKSPACE)
  assert.ok(
    source.includes('Use Corrections Required when the section cannot be cleared because the inspector observed a deficiency. Document the issue, attach evidence, and continue inspecting safe and accessible items.'),
    'failed-section continue-where-safe panel copy must be present'
  )
})

test('inspector copy: documentation required before submitting a failed item', () => {
  const source = read(WORKSPACE)
  assert.ok(
    source.includes('Add a deficiency note and evidence before submitting a failed item.'),
    'undocumented-fail blocking copy must be present'
  )
})

test('scoped route routes the failed builder notice when overallResult is fail', () => {
  const source = read(SCOPED_ROUTE)
  assert.ok(source.includes("reportOverallResult === 'fail'"), 'route must branch on fail outcome')
  assert.ok(source.includes("'inspection.failed_builder_notice'"), 'failed notice template must be used')
})

test('scoped route escrow write stays assignment-scoped, not job-scoped', () => {
  const source = read(SCOPED_ROUTE)
  const idx = source.indexOf("escrow_status: 'earned_pending_review'")
  assert.ok(idx !== -1, 'escrow write must exist')
  const body = source.slice(idx, idx + 120)
  assert.ok(body.includes(".eq('id', assignmentId)"), 'escrow must be scoped to the assignment id')
})

// ===========================================================================
// Section Outcome clarity patch (inspector field UI wording only)
// ===========================================================================

test('footer outcome area is titled Section Outcome with helper copy', () => {
  const source = read(WORKSPACE)
  assert.ok(source.includes("const SECTION_OUTCOME_HEADING = 'Section Outcome'"), 'Section Outcome heading must exist')
  assert.ok(
    source.includes('These actions apply to this full inspection section. Use Corrections Required when you observed a deficiency.'),
    'Section Outcome helper copy must exist'
  )
})

test('main outcome buttons use the two-line product labels', () => {
  const source = read(WORKSPACE)
  for (const [label, sublabel] of [
    ['Passed', 'Verified Clear'],
    ['Corrections Required', 'Deficiency Observed'],
    ['Hold', 'Same-Day Correction'],
    ['N/A', 'Not Applicable'],
  ]) {
    assert.ok(source.includes(`label="${label}"`) || source.includes(`>${label}<`), `outcome label "${label}" must be present`)
    assert.ok(source.includes(sublabel), `outcome sublabel "${sublabel}" must be present`)
  }
})

test('Pending is a secondary reset action, not a main outcome button', () => {
  const source = read(WORKSPACE)
  assert.ok(source.includes('label="Reset to Pending"'), 'Pending must be relabelled as a reset action')
  assert.ok(!source.includes('Keep Section Pending'), 'old "Keep Section Pending" outcome wording must be gone')
  assert.ok(!source.includes('Confirm Section Passed'), 'old "Confirm Section Passed" wording must be gone')
  assert.ok(!source.includes('Confirm Corrections Required'), 'old "Confirm Corrections Required" wording must be gone')
})

test('failed section shows Corrections Required badge and doc-state messages', () => {
  const source = read(WORKSPACE)
  assert.ok(source.includes('Corrections Required'), 'Corrections Required badge must exist')
  assert.ok(
    source.includes('Add a deficiency note and evidence before submitting this failed section.'),
    'doc-required message must exist'
  )
  assert.ok(
    source.includes('Ready to submit as Corrections Required.'),
    'ready-to-submit message must exist'
  )
})

test('Critical Stop / Stage Blocker panel is presented as calm Important Clearance Notes', () => {
  const source = read(WORKSPACE)
  assert.ok(
    !source.includes('Critical Stop Conditions'),
    'inspector-facing "Critical Stop Conditions" wording must be removed'
  )
  assert.ok(
    !source.includes("'Stage Blocker Conditions'"),
    'major-action "Stage Blocker Conditions" wording must be removed while the workflow is unbuilt'
  )
  assert.ok(
    source.includes("const STAGE_BLOCKER_CONDITIONS_HEADING = 'Important Clearance Notes'"),
    'panel heading must read "Important Clearance Notes"'
  )
  assert.ok(
    source.includes('Review these conditions before clearing this section. If any apply, document the issue and use Corrections Required, Hold, or the appropriate report notes.'),
    'calm clearance-notes helper copy must exist'
  )
})

test('Hold modal explains the same-day correction meaning, not unable-to-verify', () => {
  const source = read(WORKSPACE)
  assert.ok(
    source.includes('Use Hold when a minor correction can likely be completed while you are still on site. Add what needs to be corrected. If it is not corrected before you leave the site, mark Corrections Required.'),
    'Hold same-day-correction helper copy must exist'
  )
  assert.ok(
    !source.includes('Unable to Verify / Hold'),
    'unable-to-verify Hold wording must be removed'
  )
})
