import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const SRC = fileURLToPath(new URL('..', import.meta.url))

function read(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), 'utf8')
}

// ── routing maps ──────────────────────────────────────────────────────────────

test('worklist page defines BUILDER_STAGE_TO_INSPECTION_STAGE with correct structural default', () => {
  const source = read('app/inspector/page.tsx')
  const mapStart = source.indexOf('BUILDER_STAGE_TO_INSPECTION_STAGE')
  const mapEnd   = source.indexOf('}', mapStart)
  const mapBlock = source.slice(mapStart, mapEnd)
  assert.ok(mapStart !== -1, 'BUILDER_STAGE_TO_INSPECTION_STAGE must be defined')
  assert.ok(mapBlock.includes('3: 6'), 'Default map must route builder stage 3 to completion stage 6 (structural)')
  assert.ok(mapBlock.includes('4: 12'), 'Default map must route builder stage 4 to completion stage 12')
  assert.ok(mapBlock.includes('5: 15'), 'Default map must route builder stage 5 to completion stage 15')
})

test('worklist page defines DISCIPLINE_INSPECTION_STAGE_OVERRIDE with mechanical → S11', () => {
  const source    = read('app/inspector/page.tsx')
  const overStart = source.indexOf('DISCIPLINE_INSPECTION_STAGE_OVERRIDE')
  const overEnd   = source.indexOf('}', overStart + 40)
  const overBlock = source.slice(overStart, overEnd + 200) // grab enough for all discipline entries
  assert.ok(overStart !== -1, 'DISCIPLINE_INSPECTION_STAGE_OVERRIDE must be defined')
  assert.ok(overBlock.includes('mechanical'), 'Override must include mechanical key')
  assert.ok(overBlock.includes('3: 11'), 'Override must map mechanical builder stage 3 to completion stage 11')
})

test('worklist page DISCIPLINE_INSPECTION_STAGE_OVERRIDE maps electrical stage 3 to S10', () => {
  const source    = read('app/inspector/page.tsx')
  const overStart = source.indexOf('DISCIPLINE_INSPECTION_STAGE_OVERRIDE')
  const overBlock = source.slice(overStart, overStart + 400)
  assert.ok(overBlock.includes('electrical'), 'Override must include electrical key')
  assert.ok(overBlock.includes('3: 10'), 'Override must map electrical builder stage 3 to completion stage 10')
})

test('worklist page DISCIPLINE_INSPECTION_STAGE_OVERRIDE maps plumbing stage 3 to S09', () => {
  const source    = read('app/inspector/page.tsx')
  const overStart = source.indexOf('DISCIPLINE_INSPECTION_STAGE_OVERRIDE')
  const overBlock = source.slice(overStart, overStart + 400)
  assert.ok(overBlock.includes('plumbing'), 'Override must include plumbing key')
  assert.ok(overBlock.includes('3: 9'), 'Override must map plumbing builder stage 3 to completion stage 9')
})

// ── stage label lookup ────────────────────────────────────────────────────────

test('worklist page INSPECTION_STAGE_LABELS has correct label for S11', () => {
  const source = read('app/inspector/page.tsx')
  assert.ok(
    source.includes("'Gas Permit and Mechanical / HVAC Scope'"),
    'INSPECTION_STAGE_LABELS must include S11 label: Gas Permit and Mechanical / HVAC Scope'
  )
})

test('worklist page INSPECTION_STAGE_LABELS has correct label for S10', () => {
  const source = read('app/inspector/page.tsx')
  assert.ok(
    source.includes("'Electrical Permit and Scope'"),
    'INSPECTION_STAGE_LABELS must include S10 label: Electrical Permit and Scope'
  )
})

test('worklist page INSPECTION_STAGE_LABELS has correct label for S15', () => {
  const source = read('app/inspector/page.tsx')
  assert.ok(
    source.includes("'Inspections, Final Approval, and Occupancy'"),
    'INSPECTION_STAGE_LABELS must include S15 label: Inspections, Final Approval, and Occupancy'
  )
})

// ── render ────────────────────────────────────────────────────────────────────

test('worklist card renders Inspection Stage label when inspectionPreview is set', () => {
  const source = read('app/inspector/page.tsx')
  assert.ok(source.includes('Inspection Stage: '), 'Worklist card must render "Inspection Stage: " label')
  assert.ok(source.includes('inspectionPreview.code'), 'Worklist card must render inspectionPreview.code')
  assert.ok(source.includes('inspectionPreview.name'), 'Worklist card must render inspectionPreview.name')
})

test('resolveInspectionStagePreview is called with assignment.stage and assignment.discipline', () => {
  const source = read('app/inspector/page.tsx')
  assert.ok(
    source.includes('resolveInspectionStagePreview(assignment.stage, assignment.discipline)'),
    'Must call resolveInspectionStagePreview with assignment.stage and assignment.discipline'
  )
})
