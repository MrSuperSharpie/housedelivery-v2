import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const SRC = fileURLToPath(new URL('..', import.meta.url))
function read(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), 'utf8')
}

const COMPLETION = 'lib/inspectorCompletion.ts'
const SCHEDULE_CB = 'app/api/schedule-cb/route.ts'
const FINAL_OCC = 'app/api/inspections/final-occupancy/route.ts'
const WORKSPACE = 'components/inspector/InspectorCompletionWorkspace.tsx'

function getS12Block(source: string): string {
  const start = source.indexOf('STRUCTURAL_STAGE_12_CONTAINERS')
  const end = source.indexOf('STRUCTURAL_STAGE_13_CONTAINERS')
  assert.ok(start !== -1, 'STRUCTURAL_STAGE_12_CONTAINERS must be defined')
  assert.ok(end !== -1, 'STRUCTURAL_STAGE_13_CONTAINERS must exist as boundary')
  return source.slice(start, end)
}

function getS09Block(source: string): string {
  const start = source.indexOf('STRUCTURAL_STAGE_9_CONTAINERS')
  const end = source.indexOf('STRUCTURAL_STAGE_10_CONTAINERS')
  assert.ok(start !== -1, 'STRUCTURAL_STAGE_9_CONTAINERS must be defined')
  assert.ok(end !== -1, 'STRUCTURAL_STAGE_10_CONTAINERS must exist as boundary')
  return source.slice(start, end)
}

function getContainerBlock(s12Block: string, code: string, nextCode?: string): string {
  const start = s12Block.indexOf(`code: '${code}'`)
  assert.ok(start !== -1, `${code} must be defined in S12 block`)
  const end = nextCode
    ? s12Block.indexOf(`code: '${nextCode}'`)
    : s12Block.length
  return s12Block.slice(start, end)
}

function countFieldChecklistItems(containerBlock: string): number {
  const checklistStart = containerBlock.indexOf('fieldChecklist: [')
  assert.ok(checklistStart !== -1, 'fieldChecklist must be present')
  const checklistEnd = containerBlock.indexOf('\n    ],', checklistStart)
  const checklistBlock = containerBlock.slice(checklistStart, checklistEnd)
  // Each item starts a new line with leading spaces then a single quote
  return (checklistBlock.match(/\n\s+'/g) ?? []).length
}

// ===========================================================================
// 1. S12 has exactly 4 containers
// ===========================================================================

test('S12 defines exactly 4 containers', () => {
  const source = read(COMPLETION)
  const block = getS12Block(source)
  const codes = (block.match(/code: 'S12-\d+'/g) ?? [])
  assert.strictEqual(codes.length, 4, 'S12 must define exactly 4 containers')
})

// ===========================================================================
// 2. S12 defines S12-01 through S12-04
// ===========================================================================

test('S12 defines S12-01, S12-02, S12-03, and S12-04', () => {
  const source = read(COMPLETION)
  const block = getS12Block(source)
  for (const code of ['S12-01', 'S12-02', 'S12-03', 'S12-04']) {
    assert.ok(block.includes(`code: '${code}'`), `S12 must define ${code}`)
  }
})

// ===========================================================================
// 3. S12-01 label includes Thermal or Insulation
// ===========================================================================

test('S12-01 label includes Thermal or Insulation', () => {
  const source = read(COMPLETION)
  const block = getS12Block(source)
  const s1201 = getContainerBlock(block, 'S12-01', 'S12-02')
  const labelMatch = s1201.match(/label: '([^']+)'/)
  assert.ok(labelMatch, 'S12-01 must have a label')
  const label = labelMatch![1]
  assert.ok(
    label.includes('Thermal') || label.includes('Insulation'),
    `S12-01 label "${label}" must include "Thermal" or "Insulation"`
  )
})

// ===========================================================================
// 4. S12-02 label includes Air Barrier or Vapour
// ===========================================================================

test('S12-02 label includes Air Barrier or Vapour', () => {
  const source = read(COMPLETION)
  const block = getS12Block(source)
  const s1202 = getContainerBlock(block, 'S12-02', 'S12-03')
  const labelMatch = s1202.match(/label: '([^']+)'/)
  assert.ok(labelMatch, 'S12-02 must have a label')
  const label = labelMatch![1]
  assert.ok(
    label.includes('Air Barrier') || label.includes('Vapour') || label.includes('Air'),
    `S12-02 label "${label}" must include "Air Barrier" or "Vapour"`
  )
})

// ===========================================================================
// 5. S12-03 label includes Energy, Documentation, or Compliance
// ===========================================================================

test('S12-03 label includes Energy, Documentation, or Compliance', () => {
  const source = read(COMPLETION)
  const block = getS12Block(source)
  const s1203 = getContainerBlock(block, 'S12-03', 'S12-04')
  const labelMatch = s1203.match(/label: '([^']+)'/)
  assert.ok(labelMatch, 'S12-03 must have a label')
  const label = labelMatch![1]
  assert.ok(
    label.includes('Energy') || label.includes('Documentation') || label.includes('Compliance'),
    `S12-03 label "${label}" must include "Energy", "Documentation", or "Compliance"`
  )
})

// ===========================================================================
// 6. S12-04 label includes Closeout, Inspection, or Approvals
// ===========================================================================

test('S12-04 label includes Closeout, Inspection, or Approvals', () => {
  const source = read(COMPLETION)
  const block = getS12Block(source)
  const s1204 = getContainerBlock(block, 'S12-04')
  const labelMatch = s1204.match(/label: '([^']+)'/)
  assert.ok(labelMatch, 'S12-04 must have a label')
  const label = labelMatch![1]
  assert.ok(
    label.includes('Closeout') || label.includes('Inspection') || label.includes('Approvals'),
    `S12-04 label "${label}" must include "Closeout", "Inspection", or "Approvals"`
  )
})

// ===========================================================================
// 7. S12-01 fieldChecklist has at least 6 items
// ===========================================================================

test('S12-01 fieldChecklist has at least 6 items', () => {
  const source = read(COMPLETION)
  const block = getS12Block(source)
  const s1201 = getContainerBlock(block, 'S12-01', 'S12-02')
  const count = countFieldChecklistItems(s1201)
  assert.ok(count >= 6, `S12-01 fieldChecklist must have at least 6 items, found ${count}`)
})

// ===========================================================================
// 8. S12-02 fieldChecklist has at least 5 items
// ===========================================================================

test('S12-02 fieldChecklist has at least 5 items', () => {
  const source = read(COMPLETION)
  const block = getS12Block(source)
  const s1202 = getContainerBlock(block, 'S12-02', 'S12-03')
  const count = countFieldChecklistItems(s1202)
  assert.ok(count >= 5, `S12-02 fieldChecklist must have at least 5 items, found ${count}`)
})

// ===========================================================================
// 9. S12-02 references penetration or sealing
// ===========================================================================

test('S12-02 references penetration or sealing in field checklist or description', () => {
  const source = read(COMPLETION)
  const block = getS12Block(source)
  const s1202 = getContainerBlock(block, 'S12-02', 'S12-03')
  assert.ok(
    s1202.includes('penetration') || s1202.includes('Penetration') ||
    s1202.includes('sealing') || s1202.includes('sealed'),
    'S12-02 must reference penetration or sealing'
  )
})

// ===========================================================================
// 10. S12-03 references Step Code with conditional language
// ===========================================================================

test('S12-03 references Step Code with conditional language', () => {
  const source = read(COMPLETION)
  const block = getS12Block(source)
  const s1203 = getContainerBlock(block, 'S12-03', 'S12-04')
  assert.ok(s1203.includes('Step Code'), 'S12-03 must reference Step Code')
  const conditionalMarkers = ['where', 'applicable', 'adopted', 'required by compliance path', 'where adopted', 'where required']
  const hasConditional = conditionalMarkers.some(m => s1203.includes(m))
  assert.ok(
    hasConditional,
    'S12-03 must use conditional language near Step Code (where, applicable, adopted, required by compliance path)'
  )
})

// ===========================================================================
// 11. S12 does not assert Step Code as universal
// ===========================================================================

test('S12 does not assert Step Code as universally required', () => {
  const source = read(COMPLETION)
  const block = getS12Block(source)
  assert.ok(
    !block.includes('Step Code is required'),
    'S12 must not assert "Step Code is required" — use conditional language'
  )
  assert.ok(
    !block.includes('Step Code required'),
    'S12 must not assert "Step Code required" without conditional qualifier'
  )
})

// ===========================================================================
// 12. S12 does not assert blower door testing as universal
// ===========================================================================

test('S12 does not assert blower door testing as universally required', () => {
  const source = read(COMPLETION)
  const block = getS12Block(source)
  assert.ok(
    !block.includes('blower door test is required'),
    'S12 must not assert blower door testing as universally required — use conditional language'
  )
  assert.ok(
    !block.includes('blower door test must be'),
    'S12 must not assert blower door testing as mandatory without a conditional qualifier'
  )
})

// ===========================================================================
// 13. S12 does not assert heat pumps as universal
// ===========================================================================

test('S12 does not assert heat pumps as universally installed', () => {
  const source = read(COMPLETION)
  const block = getS12Block(source)
  assert.ok(
    !block.includes('heat pump is required'),
    'S12 must not assert heat pumps as universally required'
  )
  assert.ok(
    !block.includes('heat pump must be'),
    'S12 must not assert heat pumps as mandatory without a conditional qualifier'
  )
})

// ===========================================================================
// 14. S12 does not assume 6 mil poly as the universal vapour control material
// ===========================================================================

test('S12 does not assume 6 mil poly as the universal vapour control material', () => {
  const source = read(COMPLETION)
  const block = getS12Block(source)
  assert.ok(
    !block.includes('6 mil poly'),
    'S12 must not prescribe "6 mil poly" as the universal vapour control material'
  )
  assert.ok(
    !block.includes('6-mil poly'),
    'S12 must not prescribe "6-mil poly" as the universal vapour control material'
  )
})

// ===========================================================================
// 15. Every S12 container has non-empty codeReferences
// ===========================================================================

test('every S12 container has non-empty codeReferences', () => {
  const source = read(COMPLETION)
  const block = getS12Block(source)
  const codes = ['S12-01', 'S12-02', 'S12-03', 'S12-04']
  const nextCodes: Array<string | undefined> = ['S12-02', 'S12-03', 'S12-04', undefined]
  for (let i = 0; i < codes.length; i++) {
    const containerBlock = getContainerBlock(block, codes[i], nextCodes[i])
    assert.ok(
      containerBlock.includes('codeReferences: ['),
      `${codes[i]} must include codeReferences`
    )
    assert.ok(
      containerBlock.includes('legalReference:'),
      `${codes[i]} codeReferences must include at least one legalReference`
    )
  }
})

// ===========================================================================
// 16. Vancouver/VBBL-specific energy references use isVbblOnly: true
// ===========================================================================

test('Vancouver VBBL energy references use isVbblOnly: true', () => {
  const source = read(COMPLETION)
  const block = getS12Block(source)
  assert.ok(
    block.includes('isVbblOnly: true'),
    'S12 must include at least one codeReferences entry marked isVbblOnly: true for Vancouver-specific requirements'
  )
  // VBBL references must be paired with isVbblOnly
  const vbblRefIdx = block.indexOf('VBBL')
  assert.ok(vbblRefIdx !== -1, 'S12 must reference VBBL')
  const vbblWindow = block.slice(vbblRefIdx - 100, vbblRefIdx + 400)
  assert.ok(
    vbblWindow.includes('isVbblOnly: true'),
    'VBBL references in S12 must be marked isVbblOnly: true'
  )
})

// ===========================================================================
// 17. S12-02 responsibleParty is Inspector, not Auditor
// ===========================================================================

test('S12-02 responsibleParty is Inspector, not Auditor', () => {
  const source = read(COMPLETION)
  const block = getS12Block(source)
  const s1202 = getContainerBlock(block, 'S12-02', 'S12-03')
  assert.ok(
    s1202.includes("responsibleParty: 'Inspector'"),
    'S12-02 responsibleParty must be Inspector'
  )
  assert.ok(
    !s1202.includes("responsibleParty: 'Auditor'"),
    'S12-02 responsibleParty must not be Auditor'
  )
})

// ===========================================================================
// 18. S13-01 depends on S12-04, not S12-03
// ===========================================================================

test('S13-01 dependency is S12-04, not S12-03', () => {
  const source = read(COMPLETION)
  const s13Start = source.indexOf('STRUCTURAL_STAGE_13_CONTAINERS')
  const s13End = source.indexOf('STRUCTURAL_STAGE_14_CONTAINERS')
  const s13Block = source.slice(s13Start, s13End !== -1 ? s13End : s13Start + 5000)
  const s1301Start = s13Block.indexOf("code: 'S13-01'")
  assert.ok(s1301Start !== -1, 'S13-01 must be defined')
  const s1301Block = s13Block.slice(s1301Start, s1301Start + 5000)
  assert.ok(
    s1301Block.includes("'S12-04'"),
    'S13-01 dependencies must include S12-04'
  )
  assert.ok(
    !s1301Block.includes("'S12-03'"),
    'S13-01 dependencies must not reference S12-03 — it should depend on S12-04'
  )
})

// ===========================================================================
// 19. Stage 9 content is not modified
// ===========================================================================

test('Stage 9 DWV test language is preserved', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(block.includes('DWV test'), 'S09 DWV test language must not be modified by Batch 4')
})

test('Stage 9 backwater valve language is preserved', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(
    block.includes('backwater valve') || block.includes('Backwater valve'),
    'S09 backwater valve language must not be modified by Batch 4'
  )
})

test('Stage 9 defines five containers S09-01 through S09-05', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  for (const code of ['S09-01', 'S09-02', 'S09-03', 'S09-04', 'S09-05']) {
    assert.ok(block.includes(`code: '${code}'`), `S09 must still define ${code} after Batch 4`)
  }
})

// ===========================================================================
// 20. Schedule C-B route is not modified
// ===========================================================================

test('Schedule C-B route is not contaminated by Batch 4 changes', () => {
  const source = read(SCHEDULE_CB)
  assert.ok(!source.includes('S12-02'), 'Schedule C-B must not reference S12-02')
  assert.ok(!source.includes('S12-03'), 'Schedule C-B must not reference S12-03')
  assert.ok(!source.includes('S12-04'), 'Schedule C-B must not reference S12-04')
  assert.ok(!source.includes('air barrier'), 'Schedule C-B must not reference air barrier content from Batch 4')
})

// ===========================================================================
// 21. Final occupancy route is not modified
// ===========================================================================

test('final-occupancy route is not contaminated by Batch 4 changes', () => {
  const source = read(FINAL_OCC)
  assert.ok(!source.includes('S12-02'), 'Final occupancy must not reference S12-02')
  assert.ok(!source.includes('S12-03'), 'Final occupancy must not reference S12-03')
  assert.ok(!source.includes('S12-04'), 'Final occupancy must not reference S12-04')
})

// ===========================================================================
// 22. InspectorCompletionWorkspace.tsx is not modified
// ===========================================================================

test('InspectorCompletionWorkspace routing logic is preserved', () => {
  const source = read(WORKSPACE)
  assert.ok(source.includes('DISCIPLINE_STAGE_OVERRIDE'), 'DISCIPLINE_STAGE_OVERRIDE must be preserved')
  assert.ok(source.includes('usesFieldView && item.responsible_party'), 'usesFieldView must gate responsible_party')
  assert.ok(source.includes('PILOT_S9_CODE_REFS'), 'PILOT_S9_CODE_REFS must be preserved')
})

// ===========================================================================
// 23. Verify all S12 containers have required content fields
// ===========================================================================

test('every S12 container includes all required content fields', () => {
  const source = read(COMPLETION)
  const block = getS12Block(source)
  const codes = ['S12-01', 'S12-02', 'S12-03', 'S12-04']
  const nextCodes: Array<string | undefined> = ['S12-02', 'S12-03', 'S12-04', undefined]
  const requiredFields = [
    'fieldChecklist', 'whatToCheck', 'passWhen', 'failWhen',
    'pendingWhen', 'stopIf', 'requiredEvidence', 'notesGuidance',
    'ahjNotes', 'codeReferences',
  ]
  for (let i = 0; i < codes.length; i++) {
    const containerBlock = getContainerBlock(block, codes[i], nextCodes[i])
    for (const field of requiredFields) {
      assert.ok(
        containerBlock.includes(field),
        `${codes[i]} must include ${field}`
      )
    }
  }
})
