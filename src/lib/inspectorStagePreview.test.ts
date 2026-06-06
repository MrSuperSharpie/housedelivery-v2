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
  assert.ok(mapBlock.includes('5: 13'), 'Default map must route builder stage 5 to completion stage 13 (Interior Completion)')
  assert.ok(mapBlock.includes('6: 14'), 'Default map must route builder stage 6 to completion stage 14 (Exterior Works)')
  assert.ok(mapBlock.includes('7: 15'), 'Default map must route builder stage 7 to completion stage 15 (Final Approval)')
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

// ── 7-stage model routing assertions ─────────────────────────────────────────

test('builder stage 5 does not route to S15 in inspector worklist', () => {
  const source = read('app/inspector/page.tsx')
  const mapStart = source.indexOf('BUILDER_STAGE_TO_INSPECTION_STAGE')
  const mapEnd   = source.indexOf('}', mapStart)
  const mapBlock = source.slice(mapStart, mapEnd)
  assert.ok(!mapBlock.includes('5: 15'), 'builder stage 5 must not route to S15 — it maps to S13 (Interior Completion)')
})

test('builder stage 5 routes to S13 in InspectorCompletionWorkspace', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const mapStart = source.indexOf('BUILDER_STAGE_TO_COMPLETION_STAGE')
  const mapEnd   = source.indexOf('}', mapStart)
  const mapBlock = source.slice(mapStart, mapEnd)
  assert.ok(mapBlock.includes('5: 13'), 'BUILDER_STAGE_TO_COMPLETION_STAGE must map builder stage 5 to S13')
})

test('builder stage 6 routes to S14 in InspectorCompletionWorkspace', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const mapStart = source.indexOf('BUILDER_STAGE_TO_COMPLETION_STAGE')
  const mapEnd   = source.indexOf('}', mapStart)
  const mapBlock = source.slice(mapStart, mapEnd)
  assert.ok(mapBlock.includes('6: 14'), 'BUILDER_STAGE_TO_COMPLETION_STAGE must map builder stage 6 to S14')
})

test('builder stage 7 routes to S15 in InspectorCompletionWorkspace', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const mapStart = source.indexOf('BUILDER_STAGE_TO_COMPLETION_STAGE')
  const mapEnd   = source.indexOf('}', mapStart)
  const mapBlock = source.slice(mapStart, mapEnd)
  assert.ok(mapBlock.includes('7: 15'), 'BUILDER_STAGE_TO_COMPLETION_STAGE must map builder stage 7 to S15 (Final Approval)')
})

test('final-occupancy API gate checks builder stage 7, not stage 5', () => {
  const source = read('app/api/inspections/final-occupancy/route.ts')
  assert.ok(source.includes('job.stage !== 7'), 'final-occupancy route must gate on stage 7')
  assert.ok(!source.includes('job.stage !== 5'), 'final-occupancy route must not gate on stage 5')
})

test('final-occupancy prerequisite check covers stages 1 through 6', () => {
  const source = read('app/api/inspections/final-occupancy/route.ts')
  assert.ok(source.includes('[1, 2, 3, 4, 5, 6]'), 'final-occupancy prerequisite list must include stages 1–6')
  assert.ok(!source.includes('[1, 2, 3, 4]'), 'final-occupancy prerequisite list must not stop at stage 4')
})

test('builder page BUILDER_STAGE_DEFINITIONS contains 7 entries', () => {
  const source = read('app/builder/page.tsx')
  const defStart = source.indexOf('const BUILDER_STAGE_DEFINITIONS')
  const defEnd   = source.indexOf('] as const', defStart)
  const defBlock = source.slice(defStart, defEnd)
  assert.ok(defBlock.includes('number: 7'), 'BUILDER_STAGE_DEFINITIONS must include stage number 7')
  assert.ok(defBlock.includes('internalStage: 13'), 'Stage 5 must map to internalStage 13 (Interior Completion)')
  assert.ok(defBlock.includes('internalStage: 14'), 'Stage 6 must map to internalStage 14 (Exterior Works)')
  assert.ok(!defBlock.includes("number: 5, internalStage: 15"), 'Stage 5 must not map to internalStage 15')
})

test('builder UI denominator is 7, not 5', () => {
  const projectDetail = read('app/builder/project/[id]/page.tsx')
  const projectCard   = read('components/builder/ProjectCard.tsx')
  assert.ok(projectDetail.includes('/ 7'), 'project detail page must show stage denominator / 7')
  assert.ok(projectCard.includes('/ 7'),   'ProjectCard must show stage denominator / 7')
  assert.ok(!projectDetail.includes('/ 5'), 'project detail page must not show stale denominator / 5')
  assert.ok(!projectCard.includes('/ 5'),   'ProjectCard must not show stale denominator / 5')
})

test('mockData INSPECTION_STAGES includes ids 5, 6, and 7 with correct names', () => {
  const source = read('lib/mockData.ts')
  assert.ok(source.includes("id: 5") && source.includes("'Interior Completion'"), 'INSPECTION_STAGES id 5 must be Interior Completion')
  assert.ok(source.includes("id: 6") && source.includes("'Exterior Works and Site Finalization'"), 'INSPECTION_STAGES must include id 6: Exterior Works and Site Finalization')
  assert.ok(source.includes("id: 7") && source.includes("'Final Approval and Occupancy'"), 'INSPECTION_STAGES must include id 7: Final Approval and Occupancy')
  assert.ok(!source.includes("'Final Occupancy Permit'"), 'INSPECTION_STAGES must not contain stale Final Occupancy Permit entry')
})

test('DispatchModal isFinalOccupancyStage checks selectedStage === 7', () => {
  const source = read('components/builder/DispatchModal.tsx')
  assert.ok(source.includes('selectedStage === 7'), 'DispatchModal must check selectedStage === 7 for Final Approval stage')
  assert.ok(!source.includes('selectedStage === 5'), 'DispatchModal must not check selectedStage === 5')
})
