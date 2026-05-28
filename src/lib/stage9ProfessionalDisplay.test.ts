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
const SCHEDULE_CB = 'app/api/schedule-cb/route.ts'
const FINAL_OCC = 'app/api/inspections/final-occupancy/route.ts'

// ===========================================================================
// 1. S09 guard — changes are gated to S09 items only
// ===========================================================================

test('isS09Item guard is declared in the field_view render path', () => {
  const source = read(WORKSPACE)
  assert.ok(
    source.includes("isS09Item = item.item_code.startsWith('S09-')"),
    'isS09Item guard must be declared inside the render loop'
  )
})

test('responsible_party badge is conditionally gated on isS09Item', () => {
  const source = read(WORKSPACE)
  const guardIdx = source.indexOf('isS09Item && item.responsible_party')
  assert.ok(guardIdx !== -1, 'responsible_party must be gated on isS09Item')
})

test('permit_type badge is conditionally gated on isS09Item', () => {
  const source = read(WORKSPACE)
  const guardIdx = source.indexOf('isS09Item && item.permit_type')
  assert.ok(guardIdx !== -1, 'permit_type must be gated on isS09Item')
})

// ===========================================================================
// 2. Header badges — responsible_party and permit_type
// ===========================================================================

test('responsible_party badge uses indigo styling', () => {
  const source = read(WORKSPACE)
  const guardIdx = source.indexOf('isS09Item && item.responsible_party')
  assert.ok(guardIdx !== -1, 'isS09Item-gated responsible_party block must exist')
  const block = source.slice(guardIdx, guardIdx + 400)
  assert.ok(block.includes('indigo'), 'responsible_party badge must use indigo colour')
})

test('permit_type badge uses violet styling', () => {
  const source = read(WORKSPACE)
  const guardIdx = source.indexOf('isS09Item && item.permit_type')
  assert.ok(guardIdx !== -1, 'isS09Item-gated permit_type block must exist')
  const block = source.slice(guardIdx, guardIdx + 400)
  assert.ok(block.includes('violet'), 'permit_type badge must use violet colour')
})

// ===========================================================================
// 3. Full purpose — fieldViewDetails used for S09
// ===========================================================================

test('S09 items use fieldViewDetails instead of shortPurpose in the purpose slot', () => {
  const source = read(WORKSPACE)
  assert.ok(
    source.includes('isS09Item ? fieldViewDetails : shortPurpose'),
    'S09 items must render fieldViewDetails; non-S09 items must render shortPurpose'
  )
})

// ===========================================================================
// 4. Required evidence strip — above Field Checklist for S09
// ===========================================================================

test('required evidence strip is gated on isS09Item', () => {
  const source = read(WORKSPACE)
  assert.ok(
    source.includes('isS09Item && item.required_evidence.length > 0'),
    'required evidence strip must be gated on isS09Item'
  )
})

test('required evidence strip appears before Field Checklist in source order', () => {
  const source = read(WORKSPACE)
  const evidenceStripIdx = source.indexOf('Evidence Required')
  const fieldChecklistIdx = source.indexOf('Field Checklist')
  assert.ok(evidenceStripIdx !== -1, 'Evidence Required strip must exist')
  assert.ok(fieldChecklistIdx !== -1, 'Field Checklist label must exist')
  assert.ok(
    evidenceStripIdx < fieldChecklistIdx,
    'Evidence Required strip must appear before Field Checklist in source order'
  )
})

// ===========================================================================
// 5. Separate fail conditions — stop_if and fail_when rendered independently
// ===========================================================================

test('stop_if and fail_when are rendered in separate panels for S09', () => {
  const source = read(WORKSPACE)
  // S09 stop conditions use item.stop_if directly (not the merged stopItems)
  assert.ok(
    source.includes('isS09Item ? (item.stop_if ?? []) : stopItems'),
    'Critical Stop Conditions must use item.stop_if for S09, stopItems fallback for others'
  )
})

test('Fail Conditions panel exists with amber styling for S09', () => {
  const source = read(WORKSPACE)
  assert.ok(source.includes('Fail Conditions'), 'Fail Conditions panel must exist')
  const failIdx = source.indexOf('Fail Conditions')
  const block = source.slice(failIdx - 300, failIdx + 300)
  assert.ok(block.includes('amber'), 'Fail Conditions panel must use amber styling')
})

test('Fail Conditions panel is gated on isS09Item', () => {
  const source = read(WORKSPACE)
  assert.ok(
    source.includes('isS09Item && item.fail_when.length > 0'),
    'Fail Conditions panel must be gated on isS09Item'
  )
})

test('expandedFailConditions state is declared', () => {
  const source = read(WORKSPACE)
  assert.ok(
    source.includes('expandedFailConditions'),
    'expandedFailConditions state must be declared'
  )
})

// ===========================================================================
// 6. Guidance accordion — fail_when inside Pass/Fail/Pending panel for S09
// ===========================================================================

test('guidance accordion shows Pass / Fail / Pending label for S09', () => {
  const source = read(WORKSPACE)
  assert.ok(
    source.includes('Pass / Fail / Pending'),
    'Guidance accordion must show Pass / Fail / Pending for S09 items'
  )
})

test('fail_when is referenced inside the guidance accordion block', () => {
  const source = read(WORKSPACE)
  const guidanceOpen = source.indexOf('guidancePanelOpen && (')
  assert.ok(guidanceOpen !== -1, 'guidancePanelOpen block must exist')
  // fail_when must appear after guidancePanelOpen
  const failWhenInGuidance = source.indexOf('item.fail_when', guidanceOpen)
  assert.ok(
    failWhenInGuidance !== -1,
    'item.fail_when must be referenced inside the guidance accordion block'
  )
})

test('Fail When section in guidance is gated on isS09Item', () => {
  const source = read(WORKSPACE)
  assert.ok(source.includes('Fail When'), 'Fail When label must appear in guidance accordion')
  // The guard wraps the entire Fail When block; search for the guard expression directly
  assert.ok(
    source.includes("isS09Item && item.fail_when.length > 0 && ("),
    'Fail When rendering in guidance accordion must be gated on isS09Item && item.fail_when.length > 0'
  )
})

// ===========================================================================
// 7. Rename Container Notes → Inspection Notes / Deficiencies for S09
// ===========================================================================

test('Inspection Notes / Deficiencies label appears in workspace', () => {
  const source = read(WORKSPACE)
  assert.ok(
    source.includes('Inspection Notes / Deficiencies'),
    '"Inspection Notes / Deficiencies" label must appear in InspectorCompletionWorkspace'
  )
})

test('Container Notes label is retained for non-S09 items', () => {
  const source = read(WORKSPACE)
  assert.ok(
    source.includes('Container Notes'),
    '"Container Notes" label must still appear for non-S09 items'
  )
})

test('Notes label is conditionally toggled on isS09Item', () => {
  const source = read(WORKSPACE)
  assert.ok(
    source.includes("isS09Item ? 'Inspection Notes / Deficiencies' : 'Container Notes'"),
    'Notes label must toggle based on isS09Item'
  )
})

// ===========================================================================
// 8. Code References placement — above Jurisdiction Notes for S09
// ===========================================================================

test('StageCodeReferences is rendered above Jurisdiction Notes for S09', () => {
  const source = read(WORKSPACE)
  const s09CodeRefsIdx = source.indexOf('isS09Item && PILOT_S9_CODE_REFS')
  const jurisdictionNotesIdx = source.indexOf('Jurisdiction Notes')
  assert.ok(s09CodeRefsIdx !== -1, 'S09-gated StageCodeReferences must exist')
  assert.ok(jurisdictionNotesIdx !== -1, 'Jurisdiction Notes label must exist')
  assert.ok(
    s09CodeRefsIdx < jurisdictionNotesIdx,
    'S09 StageCodeReferences must appear before Jurisdiction Notes in source order'
  )
})

test('non-S09 StageCodeReferences remains after Jurisdiction Notes', () => {
  const source = read(WORKSPACE)
  const jurisdictionNotesIdx = source.indexOf('Jurisdiction Notes')
  const nonS09CodeRefsIdx = source.indexOf('!isS09Item && PILOT_S9_CODE_REFS')
  assert.ok(nonS09CodeRefsIdx !== -1, 'Non-S09 StageCodeReferences fallback must exist')
  assert.ok(
    nonS09CodeRefsIdx > jurisdictionNotesIdx,
    'Non-S09 StageCodeReferences must appear after Jurisdiction Notes'
  )
})

// ===========================================================================
// 9. Isolation — Schedule C-B and final occupancy not contaminated
// ===========================================================================

test('Schedule C-B route does not reference responsible_party or fail_when', () => {
  const source = read(SCHEDULE_CB)
  assert.ok(!source.includes('responsible_party'), 'Schedule C-B must not reference responsible_party')
  assert.ok(!source.includes('fail_when'), 'Schedule C-B must not reference fail_when')
})

test('final-occupancy route does not reference fail_when (responsible_party is pre-existing DB mapping)', () => {
  const source = read(FINAL_OCC)
  assert.ok(!source.includes('fail_when'), 'Final occupancy must not reference fail_when')
})
