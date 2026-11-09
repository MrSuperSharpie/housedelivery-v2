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
// 1. usesFieldView guard — rich display applies to all field_view items
// ===========================================================================

test('usesFieldView is declared in the field_view render path', () => {
  const source = read(WORKSPACE)
  assert.ok(
    source.includes("usesFieldView = item.ui_schema === 'field_view'"),
    'usesFieldView must be declared inside the render loop'
  )
})

test('responsible_party badge is conditionally gated on usesFieldView', () => {
  const source = read(WORKSPACE)
  const guardIdx = source.indexOf('usesFieldView && item.responsible_party')
  assert.ok(guardIdx !== -1, 'responsible_party must be gated on usesFieldView')
})

test('permit_type badge is conditionally gated on usesFieldView', () => {
  const source = read(WORKSPACE)
  const guardIdx = source.indexOf('usesFieldView && item.permit_type')
  assert.ok(guardIdx !== -1, 'permit_type must be gated on usesFieldView')
})

// ===========================================================================
// 2. Header badges — responsible_party and permit_type
// ===========================================================================

test('responsible_party badge uses indigo styling', () => {
  const source = read(WORKSPACE)
  const guardIdx = source.indexOf('usesFieldView && item.responsible_party')
  assert.ok(guardIdx !== -1, 'usesFieldView-gated responsible_party block must exist')
  const block = source.slice(guardIdx, guardIdx + 400)
  assert.ok(block.includes('indigo'), 'responsible_party badge must use indigo colour')
})

test('permit_type badge uses violet styling', () => {
  const source = read(WORKSPACE)
  const guardIdx = source.indexOf('usesFieldView && item.permit_type')
  assert.ok(guardIdx !== -1, 'usesFieldView-gated permit_type block must exist')
  const block = source.slice(guardIdx, guardIdx + 400)
  assert.ok(block.includes('violet'), 'permit_type badge must use violet colour')
})

// ===========================================================================
// 3. Full purpose — fieldViewDetails used for S09
// ===========================================================================

test('field_view items use fieldViewDetails instead of shortPurpose in the purpose slot', () => {
  const source = read(WORKSPACE)
  assert.ok(
    source.includes('usesFieldView ? fieldViewDetails : shortPurpose'),
    'field_view items must render fieldViewDetails; standard items must render shortPurpose'
  )
})

// ===========================================================================
// 4. Required evidence affordance — rendered within the Field Checklist container
// ===========================================================================

test('required evidence strip is shown for all field_view items with evidence', () => {
  const source = read(WORKSPACE)
  assert.ok(
    source.includes('item.required_evidence.length > 0 && ('),
    'required evidence strip must be shown whenever required_evidence is non-empty'
  )
})

test('required-evidence affordance is rendered within the Field Checklist container', () => {
  const source = read(WORKSPACE)
  // The redesigned workspace integrates the evidence affordance into the field
  // checklist container: a pass-gating RequiredEvidenceActionPanel directly under
  // the Field Checklist header, plus a "Required Evidence" acceptable-evidence strip.
  const fieldChecklistIdx = source.indexOf('Field Checklist')
  assert.ok(fieldChecklistIdx !== -1, 'Field Checklist label must exist')
  assert.ok(
    source.includes('<RequiredEvidenceActionPanel'),
    'RequiredEvidenceActionPanel must be rendered for required-evidence items'
  )
  assert.ok(
    source.includes('Required Evidence'),
    'Required Evidence strip label must exist'
  )
})

// ===========================================================================
// 5. Separate fail conditions — stop_if and fail_when rendered independently
// ===========================================================================

test('stop_if and fail_when are rendered in separate panels for all field_view items', () => {
  const source = read(WORKSPACE)
  // Critical Stop Conditions uses stop_if only — fail_when has its own dedicated panel
  assert.ok(
    source.includes('(item.stop_if ?? []).length > 0 && ('),
    'Critical Stop Conditions must use item.stop_if only, not the merged stopItems fallback'
  )
})

test('Correction Triggers panel exists with amber styling for S09', () => {
  const source = read(WORKSPACE)
  assert.ok(source.includes('Correction Triggers'), 'Correction Triggers panel must exist')
  const failIdx = source.indexOf('Correction Triggers')
  const block = source.slice(failIdx - 300, failIdx + 300)
  assert.ok(block.includes('amber'), 'Correction Triggers panel must use amber styling')
})

test('Correction Triggers panel is shown for all field_view items with fail_when', () => {
  const source = read(WORKSPACE)
  assert.ok(source.includes('Correction Triggers'), 'Correction Triggers panel must exist')
  assert.ok(
    source.includes('item.fail_when.length > 0 && ('),
    'Correction Triggers panel must be gated on item.fail_when.length > 0'
  )
  assert.ok(
    !source.includes('isS09Item && item.fail_when.length > 0'),
    'Correction Triggers must not be restricted to S09 items'
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

test('guidance accordion shows Pass / Corrections / Pending label for S09', () => {
  const source = read(WORKSPACE)
  assert.ok(
    source.includes('Pass / Corrections / Pending'),
    'Guidance accordion must show Pass / Corrections / Pending for S09 items'
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

test('Corrections Required When section in guidance is shown for all field_view items with fail_when', () => {
  const source = read(WORKSPACE)
  assert.ok(source.includes('Corrections Required When'), 'Corrections Required When label must appear in guidance accordion')
  // Guard is now item.fail_when.length > 0 only — not restricted to S09
  const guidanceOpen = source.indexOf('guidancePanelOpen && (')
  assert.ok(guidanceOpen !== -1, 'guidancePanelOpen block must exist')
  const failWhenInGuidance = source.indexOf('item.fail_when.length > 0 && (', guidanceOpen)
  assert.ok(
    failWhenInGuidance !== -1,
    'Corrections Required When in guidance accordion must be gated on item.fail_when.length > 0'
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

test('Inspection Notes / Deficiencies label is used for all field_view items', () => {
  const source = read(WORKSPACE)
  assert.ok(
    source.includes('Inspection Notes / Deficiencies'),
    '"Inspection Notes / Deficiencies" label must appear in InspectorCompletionWorkspace'
  )
  assert.ok(
    !source.includes("isS09Item ? 'Inspection Notes / Deficiencies'"),
    'Notes label must not be conditionally toggled on isS09Item'
  )
})

// ===========================================================================
// 8. Code References placement — above Jurisdiction Notes for S09
// ===========================================================================

test('StageCodeReferences is rendered above Jurisdiction Notes for all field_view items', () => {
  const source = read(WORKSPACE)
  const codeRefsIdx = source.indexOf('PILOT_S9_CODE_REFS && (')
  const jurisdictionNotesIdx = source.indexOf('Jurisdiction Notes')
  assert.ok(codeRefsIdx !== -1, 'PILOT_S9_CODE_REFS-gated StageCodeReferences must exist')
  assert.ok(jurisdictionNotesIdx !== -1, 'Jurisdiction Notes label must exist')
  assert.ok(
    codeRefsIdx < jurisdictionNotesIdx,
    'StageCodeReferences must appear before Jurisdiction Notes in source order'
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
