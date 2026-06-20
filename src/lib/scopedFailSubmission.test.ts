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

test('inspector copy: a Fail does not end the inspection', () => {
  const source = read(WORKSPACE)
  assert.ok(
    source.includes('A Fail does not end the inspection — document the deficiency and continue inspecting all safe, accessible items.'),
    'continue-where-safe guidance copy must be present'
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
