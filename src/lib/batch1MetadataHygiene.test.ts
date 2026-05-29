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
const STORE = 'lib/store.tsx'

function getStageBlock(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker)
  assert.ok(start !== -1, `${startMarker} must be defined`)
  assert.ok(end !== -1, `${endMarker} must exist as boundary`)
  return source.slice(start, end)
}

function getS01Block(source: string): string {
  return getStageBlock(source, 'STRUCTURAL_STAGE_1_CONTAINERS', 'STRUCTURAL_STAGE_2_CONTAINERS')
}

function getS02Block(source: string): string {
  return getStageBlock(source, 'STRUCTURAL_STAGE_2_CONTAINERS', 'STRUCTURAL_STAGE_3_CONTAINERS')
}

function getS03Block(source: string): string {
  return getStageBlock(source, 'STRUCTURAL_STAGE_3_CONTAINERS', 'STRUCTURAL_STAGE_4_CONTAINERS')
}

function getS09Block(source: string): string {
  return getStageBlock(source, 'STRUCTURAL_STAGE_9_CONTAINERS', 'STRUCTURAL_STAGE_10_CONTAINERS')
}

// ===========================================================================
// 1. S01 still defines S01-01 through S01-05
// ===========================================================================

test('S01 defines all five item containers S01-01 through S01-05', () => {
  const source = read(COMPLETION)
  const block = getS01Block(source)
  for (const code of ['S01-01', 'S01-02', 'S01-03', 'S01-04', 'S01-05']) {
    assert.ok(block.includes(`code: '${code}'`), `S01 block must define ${code}`)
  }
})

// ===========================================================================
// 2. Every S01 item has uiSchema
// ===========================================================================

test('every S01 item has uiSchema: field_view', () => {
  const source = read(COMPLETION)
  const block = getS01Block(source)
  const codes = ['S01-01', 'S01-02', 'S01-03', 'S01-04', 'S01-05']
  for (let i = 0; i < codes.length; i++) {
    const itemStart = block.indexOf(`code: '${codes[i]}'`)
    const itemEnd = i + 1 < codes.length
      ? block.indexOf(`code: '${codes[i + 1]}'`)
      : block.length
    const itemBlock = block.slice(itemStart, itemEnd)
    assert.ok(itemBlock.includes('uiSchema'), `${codes[i]} must include uiSchema`)
    assert.ok(itemBlock.includes("field_view"), `${codes[i]} uiSchema must be field_view`)
  }
})

// ===========================================================================
// 3. Every S01 item has viewDetails
// ===========================================================================

test('every S01 item has viewDetails', () => {
  const source = read(COMPLETION)
  const block = getS01Block(source)
  const codes = ['S01-01', 'S01-02', 'S01-03', 'S01-04', 'S01-05']
  for (let i = 0; i < codes.length; i++) {
    const itemStart = block.indexOf(`code: '${codes[i]}'`)
    const itemEnd = i + 1 < codes.length
      ? block.indexOf(`code: '${codes[i + 1]}'`)
      : block.length
    const itemBlock = block.slice(itemStart, itemEnd)
    assert.ok(itemBlock.includes('viewDetails'), `${codes[i]} must include viewDetails`)
  }
})

// ===========================================================================
// 4. Every S01 item has stopIf
// ===========================================================================

test('every S01 item has stopIf', () => {
  const source = read(COMPLETION)
  const block = getS01Block(source)
  const codes = ['S01-01', 'S01-02', 'S01-03', 'S01-04', 'S01-05']
  for (let i = 0; i < codes.length; i++) {
    const itemStart = block.indexOf(`code: '${codes[i]}'`)
    const itemEnd = i + 1 < codes.length
      ? block.indexOf(`code: '${codes[i + 1]}'`)
      : block.length
    const itemBlock = block.slice(itemStart, itemEnd)
    assert.ok(itemBlock.includes('stopIf'), `${codes[i]} must include stopIf`)
  }
})

// ===========================================================================
// 5. Every S01 item has permitType
// ===========================================================================

test('every S01 item has permitType', () => {
  const source = read(COMPLETION)
  const block = getS01Block(source)
  const codes = ['S01-01', 'S01-02', 'S01-03', 'S01-04', 'S01-05']
  for (let i = 0; i < codes.length; i++) {
    const itemStart = block.indexOf(`code: '${codes[i]}'`)
    const itemEnd = i + 1 < codes.length
      ? block.indexOf(`code: '${codes[i + 1]}'`)
      : block.length
    const itemBlock = block.slice(itemStart, itemEnd)
    assert.ok(itemBlock.includes('permitType'), `${codes[i]} must include permitType`)
  }
})

// ===========================================================================
// 6. Every S01 item has responsibleParty
// ===========================================================================

test('every S01 item has responsibleParty', () => {
  const source = read(COMPLETION)
  const block = getS01Block(source)
  const codes = ['S01-01', 'S01-02', 'S01-03', 'S01-04', 'S01-05']
  for (let i = 0; i < codes.length; i++) {
    const itemStart = block.indexOf(`code: '${codes[i]}'`)
    const itemEnd = i + 1 < codes.length
      ? block.indexOf(`code: '${codes[i + 1]}'`)
      : block.length
    const itemBlock = block.slice(itemStart, itemEnd)
    assert.ok(itemBlock.includes('responsibleParty'), `${codes[i]} must include responsibleParty`)
  }
})

// ===========================================================================
// 7. Every S01 item has documentUploadRequired
// ===========================================================================

test('every S01 item has documentUploadRequired', () => {
  const source = read(COMPLETION)
  const block = getS01Block(source)
  const codes = ['S01-01', 'S01-02', 'S01-03', 'S01-04', 'S01-05']
  for (let i = 0; i < codes.length; i++) {
    const itemStart = block.indexOf(`code: '${codes[i]}'`)
    const itemEnd = i + 1 < codes.length
      ? block.indexOf(`code: '${codes[i + 1]}'`)
      : block.length
    const itemBlock = block.slice(itemStart, itemEnd)
    assert.ok(itemBlock.includes('documentUploadRequired'), `${codes[i]} must include documentUploadRequired`)
  }
})

// ===========================================================================
// 8. Every S01 item has codeReferences
// ===========================================================================

test('every S01 item has codeReferences', () => {
  const source = read(COMPLETION)
  const block = getS01Block(source)
  const codes = ['S01-01', 'S01-02', 'S01-03', 'S01-04', 'S01-05']
  for (let i = 0; i < codes.length; i++) {
    const itemStart = block.indexOf(`code: '${codes[i]}'`)
    const itemEnd = i + 1 < codes.length
      ? block.indexOf(`code: '${codes[i + 1]}'`)
      : block.length
    const itemBlock = block.slice(itemStart, itemEnd)
    assert.ok(itemBlock.includes('codeReferences'), `${codes[i]} must include codeReferences`)
    assert.ok(itemBlock.includes('legalReference'), `${codes[i]} codeReferences must include at least one legalReference`)
  }
})

test('S01-02 includes a Vancouver/VBBL isVbblOnly reference for jurisdiction overlay', () => {
  const source = read(COMPLETION)
  const s01_02Start = source.indexOf("code: 'S01-02'")
  const s01_03Start = source.indexOf("code: 'S01-03'")
  const block = source.slice(s01_02Start, s01_03Start)
  assert.ok(block.includes('isVbblOnly: true'), 'S01-02 must include a VBBL-only reference for local jurisdiction overlay')
})

test('S01-05 includes Letters of Assurance reference', () => {
  const source = read(COMPLETION)
  const s01_05Start = source.indexOf("code: 'S01-05'")
  const stage2Start = source.indexOf('STRUCTURAL_STAGE_2_CONTAINERS')
  const block = source.slice(s01_05Start, stage2Start)
  assert.ok(
    block.includes('Letters of Assurance') || block.includes('Assurance'),
    'S01-05 codeReferences must include a Letters of Assurance reference'
  )
})

// ===========================================================================
// 9. Every S02 item has codeReferences
// ===========================================================================

test('every S02 item has codeReferences', () => {
  const source = read(COMPLETION)
  const block = getS02Block(source)
  for (const code of ['S02-01', 'S02-02', 'S02-03']) {
    assert.ok(block.includes(`code: '${code}'`), `S02 block must define ${code}`)
  }
  const codes = ['S02-01', 'S02-02', 'S02-03']
  for (let i = 0; i < codes.length; i++) {
    const itemStart = block.indexOf(`code: '${codes[i]}'`)
    const itemEnd = i + 1 < codes.length
      ? block.indexOf(`code: '${codes[i + 1]}'`)
      : block.length
    const itemBlock = block.slice(itemStart, itemEnd)
    assert.ok(itemBlock.includes('codeReferences'), `${codes[i]} must include codeReferences`)
    assert.ok(itemBlock.includes('legalReference'), `${codes[i]} codeReferences must include at least one legalReference`)
  }
})

test('S02-01 includes a zoning authority reference', () => {
  const source = read(COMPLETION)
  const s02_01Start = source.indexOf("code: 'S02-01'")
  const s02_02Start = source.indexOf("code: 'S02-02'")
  const block = source.slice(s02_01Start, s02_02Start)
  assert.ok(
    block.includes('Zoning') || block.includes('zoning'),
    'S02-01 codeReferences must include a zoning authority reference'
  )
})

test('S02-03 includes a tree protection reference', () => {
  const source = read(COMPLETION)
  const s02_03Start = source.indexOf("code: 'S02-03'")
  const stage3Start = source.indexOf('STRUCTURAL_STAGE_3_CONTAINERS')
  const block = source.slice(s02_03Start, stage3Start)
  assert.ok(
    block.includes('Tree') || block.includes('tree'),
    'S02-03 codeReferences must include a tree protection reference'
  )
})

// ===========================================================================
// 10. Every S03 item has codeReferences
// ===========================================================================

test('every S03 item has codeReferences', () => {
  const source = read(COMPLETION)
  const block = getS03Block(source)
  for (const code of ['S03-01', 'S03-02', 'S03-03']) {
    assert.ok(block.includes(`code: '${code}'`), `S03 block must define ${code}`)
  }
  const codes = ['S03-01', 'S03-02', 'S03-03']
  for (let i = 0; i < codes.length; i++) {
    const itemStart = block.indexOf(`code: '${codes[i]}'`)
    const itemEnd = i + 1 < codes.length
      ? block.indexOf(`code: '${codes[i + 1]}'`)
      : block.length
    const itemBlock = block.slice(itemStart, itemEnd)
    assert.ok(itemBlock.includes('codeReferences'), `${codes[i]} must include codeReferences`)
    assert.ok(itemBlock.includes('legalReference'), `${codes[i]} codeReferences must include at least one legalReference`)
  }
})

test('S03-03 includes a Letters of Assurance or Schedule B reference', () => {
  const source = read(COMPLETION)
  const s03_03Start = source.indexOf("code: 'S03-03'")
  const stage4Start = source.indexOf('STRUCTURAL_STAGE_4_CONTAINERS')
  const block = source.slice(s03_03Start, stage4Start)
  assert.ok(
    block.includes('Assurance') || block.includes('Schedule B'),
    'S03-03 codeReferences must reference Letters of Assurance or Schedule B'
  )
})

// ===========================================================================
// 11. S09 content is not modified or reduced
// ===========================================================================

test('S09 still defines five containers S09-01 through S09-05', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  for (const code of ['S09-01', 'S09-02', 'S09-03', 'S09-04', 'S09-05']) {
    assert.ok(block.includes(`code: '${code}'`), `S09 block must still define ${code} after Batch 1`)
  }
})

test('S09 still includes DWV test language', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(block.includes('DWV test'), 'S09 DWV test language must not be removed by Batch 1')
})

test('S09 still includes backwater valve language', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(
    block.includes('backwater valve') || block.includes('Backwater valve'),
    'S09 backwater valve language must not be removed by Batch 1'
  )
})

// ===========================================================================
// 12. Schedule C-B route is not modified
// ===========================================================================

test('Schedule C-B route does not reference S01 new metadata fields', () => {
  const source = read(SCHEDULE_CB)
  assert.ok(!source.includes('S01-03'), 'Schedule C-B must not reference S01-03')
  assert.ok(!source.includes('S01-04'), 'Schedule C-B must not reference S01-04')
  assert.ok(!source.includes('S01-05'), 'Schedule C-B must not reference S01-05')
  assert.ok(!source.includes('viewDetails'), 'Schedule C-B must not reference viewDetails from Batch 1')
})

// ===========================================================================
// 13. Final occupancy route is not modified
// ===========================================================================

test('final-occupancy route does not reference S01 items', () => {
  const source = read(FINAL_OCC)
  assert.ok(!source.includes('S01-01'), 'Final occupancy must not reference S01-01')
  assert.ok(!source.includes('S01-02'), 'Final occupancy must not reference S01-02')
  assert.ok(!source.includes('S01-03'), 'Final occupancy must not reference S01-03')
})

// ===========================================================================
// 14. No prohibited files changed
// ===========================================================================

test('InspectorCompletionWorkspace routing logic is preserved', () => {
  const source = read(WORKSPACE)
  assert.ok(source.includes('DISCIPLINE_STAGE_OVERRIDE'), 'DISCIPLINE_STAGE_OVERRIDE must be preserved')
  assert.ok(source.includes('isS09Item'), 'isS09Item guard must be preserved')
  assert.ok(source.includes('PILOT_S9_CODE_REFS'), 'PILOT_S9_CODE_REFS must be preserved')
})

test('store.tsx structural discipline mapping is preserved', () => {
  const source = read(STORE)
  assert.ok(
    source.includes(": 'building'"),
    'store.tsx building fallback permit family must be preserved'
  )
})
