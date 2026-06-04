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
const STORE = 'lib/store.tsx'

function getS15Block(source: string): string {
  const start = source.indexOf('STRUCTURAL_STAGE_15_CONTAINERS')
  const end = source.indexOf('const RAW_STAGES')
  assert.ok(start !== -1, 'STRUCTURAL_STAGE_15_CONTAINERS must be defined')
  assert.ok(end !== -1, 'RAW_STAGES must exist as boundary')
  return source.slice(start, end)
}

function getContainerBlock(s15Block: string, code: string, nextCode: string | null): string {
  const start = s15Block.indexOf(`code: '${code}'`)
  const end = nextCode !== null ? s15Block.indexOf(`code: '${nextCode}'`) : s15Block.length
  assert.ok(start !== -1, `Container ${code} must exist in S15 block`)
  return s15Block.slice(start, end)
}

function countFieldChecklistItems(containerBlock: string): number {
  const fcStart = containerBlock.indexOf('fieldChecklist: [')
  if (fcStart === -1) return 0
  const fcEnd = containerBlock.indexOf('\n    ],', fcStart)
  const fcBlock = containerBlock.slice(fcStart, fcEnd)
  return (fcBlock.match(/(',\n)/g) ?? []).length
}

// ===========================================================================
// 1. S15 defines exactly 4 containers: S15-01 through S15-04
// ===========================================================================

test('S15 defines exactly 4 containers', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const codes = ['S15-01', 'S15-02', 'S15-03', 'S15-04']
  for (const code of codes) {
    assert.ok(block.includes(`code: '${code}'`), `S15 must define ${code}`)
  }
  assert.ok(!block.includes("code: 'S15-05'"), 'S15 must not define S15-05')
})

// ===========================================================================
// 2. Container labels
// ===========================================================================

test('S15-01 label contains Life-Safety', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-01', 'S15-02')
  const labelIdx = cb.indexOf('label:')
  const labelLine = cb.slice(labelIdx, labelIdx + 120)
  assert.ok(labelLine.includes('Life-Safety'), 'S15-01 label must contain "Life-Safety"')
})

test('S15-02 label contains Deficiency, Prior-Stage, or Trade', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-02', 'S15-03')
  const labelIdx = cb.indexOf('label:')
  const labelLine = cb.slice(labelIdx, labelIdx + 120)
  assert.ok(
    labelLine.includes('Deficien') || labelLine.includes('Prior-Stage') || labelLine.includes('Prior Stage') || labelLine.includes('Trade'),
    'S15-02 label must contain "Deficiency", "Prior-Stage", "Prior Stage", or "Trade"'
  )
})

test('S15-03 label contains Professional Assurance, Closeout, or Evidence Package', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-03', 'S15-04')
  const labelIdx = cb.indexOf('label:')
  const labelLine = cb.slice(labelIdx, labelIdx + 120)
  assert.ok(
    labelLine.includes('Professional Assurance') || labelLine.includes('Closeout') || labelLine.includes('Evidence Package'),
    'S15-03 label must contain "Professional Assurance", "Closeout", or "Evidence Package"'
  )
})

test('S15-04 label contains AHJ, Occupancy, or Final Approval', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-04', null)
  const labelIdx = cb.indexOf('label:')
  const labelLine = cb.slice(labelIdx, labelIdx + 120)
  assert.ok(
    labelLine.includes('AHJ') || labelLine.includes('Occupancy') || labelLine.includes('Final Approval'),
    'S15-04 label must contain "AHJ", "Occupancy", or "Final Approval"'
  )
})

// ===========================================================================
// 3. All 4 containers have uiSchema: 'field_view'
// ===========================================================================

test('all S15 containers use uiSchema field_view', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const codes: [string, string | null][] = [
    ['S15-01', 'S15-02'],
    ['S15-02', 'S15-03'],
    ['S15-03', 'S15-04'],
    ['S15-04', null],
  ]
  for (const [code, next] of codes) {
    const cb = getContainerBlock(block, code, next)
    assert.ok(cb.includes("uiSchema: 'field_view'"), `${code} must have uiSchema: 'field_view'`)
  }
})

// ===========================================================================
// 4. All 4 containers have required content fields
// ===========================================================================

test('all S15 containers have required content fields', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const entries: [string, string | null][] = [
    ['S15-01', 'S15-02'],
    ['S15-02', 'S15-03'],
    ['S15-03', 'S15-04'],
    ['S15-04', null],
  ]
  const required = ['fieldChecklist', 'passWhen', 'failWhen', 'pendingWhen', 'stopIf', 'requiredEvidence']
  for (const [code, next] of entries) {
    const cb = getContainerBlock(block, code, next)
    for (const field of required) {
      assert.ok(cb.includes(field), `${code} must include ${field}`)
    }
  }
})

// ===========================================================================
// 5. No container in S15 contains requiredLogic
// ===========================================================================

test('no S15 container contains requiredLogic', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  assert.ok(!block.includes('requiredLogic'), 'S15 block must not contain requiredLogic')
})

// ===========================================================================
// 6. All containers have codeReferences with at least 2 entries
// ===========================================================================

test('all S15 containers have codeReferences with at least 2 entries', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const entries: [string, string | null][] = [
    ['S15-01', 'S15-02'],
    ['S15-02', 'S15-03'],
    ['S15-03', 'S15-04'],
    ['S15-04', null],
  ]
  for (const [code, next] of entries) {
    const cb = getContainerBlock(block, code, next)
    assert.ok(cb.includes('codeReferences:'), `${code} must have codeReferences`)
    const crStart = cb.indexOf('codeReferences: [')
    const crEnd = cb.indexOf('\n    ],', crStart)
    const crBlock = cb.slice(crStart, crEnd)
    const entryCount = (crBlock.match(/legalReference:/g) ?? []).length
    assert.ok(entryCount >= 2, `${code} codeReferences must have at least 2 entries (found ${entryCount})`)
  }
})

// ===========================================================================
// 7. At least one S15 codeReferences entry has isVbblOnly: true
// ===========================================================================

test('at least one S15 codeReferences entry has isVbblOnly: true', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  assert.ok(block.includes('isVbblOnly: true'), 'S15 block must contain at least one isVbblOnly: true entry')
})

// ===========================================================================
// 8. No container has responsibleParty: 'AHJ'
// ===========================================================================

test('no S15 container has responsibleParty AHJ', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  assert.ok(!block.includes("responsibleParty: 'AHJ'"), 'S15 must not assign responsibleParty: AHJ')
})

// ===========================================================================
// 9. No container has responsibleParty: 'Auditor'
// ===========================================================================

test('no S15 container has responsibleParty Auditor', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  assert.ok(!block.includes("responsibleParty: 'Auditor'"), 'S15 must not assign responsibleParty: Auditor')
})

// ===========================================================================
// 10. All containers have responsibleParty: 'Inspector'
// ===========================================================================

test('all S15 containers have responsibleParty Inspector', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const entries: [string, string | null][] = [
    ['S15-01', 'S15-02'],
    ['S15-02', 'S15-03'],
    ['S15-03', 'S15-04'],
    ['S15-04', null],
  ]
  for (const [code, next] of entries) {
    const cb = getContainerBlock(block, code, next)
    assert.ok(cb.includes("responsibleParty: 'Inspector'"), `${code} must have responsibleParty: 'Inspector'`)
  }
})

// ===========================================================================
// 11. Dependency chain
// ===========================================================================

test('S15-01 depends on S14-05', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-01', 'S15-02')
  assert.ok(cb.includes("dependencies: ['S14-05']"), "S15-01 must depend on ['S14-05']")
})

test('S15-02 depends on S15-01', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-02', 'S15-03')
  assert.ok(cb.includes("dependencies: ['S15-01']"), "S15-02 must depend on ['S15-01']")
})

test('S15-03 depends on S15-02', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-03', 'S15-04')
  assert.ok(cb.includes("dependencies: ['S15-02']"), "S15-03 must depend on ['S15-02']")
})

test('S15-04 depends on S15-03', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-04', null)
  assert.ok(cb.includes("dependencies: ['S15-03']"), "S15-04 must depend on ['S15-03']")
})

// ===========================================================================
// 12. fieldChecklist item counts
// ===========================================================================

test('S15-01 fieldChecklist has at least 5 items', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-01', 'S15-02')
  const count = countFieldChecklistItems(cb)
  assert.ok(count >= 5, `S15-01 fieldChecklist must have at least 5 items (found ${count})`)
})

test('S15-02 fieldChecklist has at least 5 items', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-02', 'S15-03')
  const count = countFieldChecklistItems(cb)
  assert.ok(count >= 5, `S15-02 fieldChecklist must have at least 5 items (found ${count})`)
})

test('S15-03 fieldChecklist has at least 5 items', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-03', 'S15-04')
  const count = countFieldChecklistItems(cb)
  assert.ok(count >= 5, `S15-03 fieldChecklist must have at least 5 items (found ${count})`)
})

test('S15-04 fieldChecklist has at least 4 items', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-04', null)
  const count = countFieldChecklistItems(cb)
  assert.ok(count >= 4, `S15-04 fieldChecklist must have at least 4 items (found ${count})`)
})

// ===========================================================================
// 13. S15-01 content domains
// ===========================================================================

test('S15-01 contains smoke alarm language', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-01', 'S15-02')
  assert.ok(
    cb.includes('smoke alarm') || cb.includes('Smoke alarm') || cb.includes('smoke detector'),
    'S15-01 must include smoke alarm language'
  )
})

test('S15-01 contains CO alarm or carbon monoxide language', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-01', 'S15-02')
  assert.ok(
    cb.includes('CO alarm') || cb.includes('carbon monoxide') || cb.includes('Carbon monoxide'),
    'S15-01 must include CO alarm or carbon monoxide language'
  )
})

test('S15-01 contains egress or emergency egress language', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-01', 'S15-02')
  assert.ok(
    cb.includes('egress') || cb.includes('Egress'),
    'S15-01 must include egress or emergency egress language'
  )
})

test('S15-01 contains guard or handrail language', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-01', 'S15-02')
  assert.ok(
    cb.includes('guard') || cb.includes('Guard') || cb.includes('handrail') || cb.includes('Handrail'),
    'S15-01 must include guard or handrail language'
  )
})

test('S15-01 contains fire separation or firestopping language', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-01', 'S15-02')
  assert.ok(
    cb.includes('fire separation') || cb.includes('Fire separation') || cb.includes('firestopping') || cb.includes('Firestopping'),
    'S15-01 must include fire separation or firestopping language'
  )
})

// ===========================================================================
// 14. S15-02 content domains
// ===========================================================================

test('S15-02 contains deficiency or prior-stage language', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-02', 'S15-03')
  assert.ok(
    cb.includes('deficien') || cb.includes('Deficien') || cb.includes('prior stage') || cb.includes('prior-stage') || cb.includes('Prior stage'),
    'S15-02 must include deficiency or prior-stage language'
  )
})

test('S15-02 contains plumbing inspection language', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-02', 'S15-03')
  assert.ok(
    cb.includes('plumbing') || cb.includes('Plumbing'),
    'S15-02 must include plumbing inspection language'
  )
})

test('S15-02 contains electrical inspection language', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-02', 'S15-03')
  assert.ok(
    cb.includes('electrical') || cb.includes('Electrical'),
    'S15-02 must include electrical inspection language'
  )
})

test('S15-02 contains mechanical or gas inspection language', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-02', 'S15-03')
  assert.ok(
    cb.includes('mechanical') || cb.includes('Mechanical') || cb.includes('gas') || cb.includes('Gas'),
    'S15-02 must include mechanical or gas inspection language'
  )
})

// ===========================================================================
// 15. S15-03 content domains
// ===========================================================================

test('S15-03 contains Letters of Assurance or professional assurance language', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-03', 'S15-04')
  assert.ok(
    cb.includes('Letters of Assurance') || cb.includes('professional assurance'),
    'S15-03 must include Letters of Assurance or professional assurance language'
  )
})

test('S15-03 contains Schedule B or Schedule C-B language', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-03', 'S15-04')
  assert.ok(
    cb.includes('Schedule B') || cb.includes('Schedule C-B'),
    'S15-03 must include Schedule B or Schedule C-B language'
  )
})

test('S15-03 contains as-built language', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-03', 'S15-04')
  assert.ok(
    cb.includes('as-built') || cb.includes('As-built'),
    'S15-03 must include as-built language'
  )
})

test('S15-03 contains commissioning or warranty language', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-03', 'S15-04')
  assert.ok(
    cb.includes('commissioning') || cb.includes('Commissioning') || cb.includes('warrant'),
    'S15-03 must include commissioning or warranty language'
  )
})

// ===========================================================================
// 16. S15-04 content domains
// ===========================================================================

test('S15-04 contains AHJ language', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-04', null)
  assert.ok(cb.includes('AHJ'), 'S15-04 must include AHJ language')
})

test('S15-04 contains occupancy permit language', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-04', null)
  assert.ok(
    cb.includes('occupancy permit') || cb.includes('Occupancy permit'),
    'S15-04 must include occupancy permit language'
  )
})

// ===========================================================================
// 17. No "Vero issues", "Vero grants", or "Vero certifies" language
// ===========================================================================

test('no S15 container uses Vero issues, Vero grants, or Vero certifies language', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  assert.ok(!block.includes('Vero issues'), 'S15 must not use "Vero issues" language')
  assert.ok(!block.includes('Vero grants'), 'S15 must not use "Vero grants" language')
  assert.ok(!block.includes('Vero certifies'), 'S15 must not use "Vero certifies" language')
})

// ===========================================================================
// 18. S15-04 ahjNotes states Vero documents but does not issue/certify/replace
// ===========================================================================

test('S15-04 ahjNotes states Vero documents AHJ status but does not issue occupancy or replace AHJ authority', () => {
  const source = read(COMPLETION)
  const block = getS15Block(source)
  const cb = getContainerBlock(block, 'S15-04', null)
  const ahjIdx = cb.indexOf('ahjNotes:')
  assert.ok(ahjIdx !== -1, 'S15-04 must have ahjNotes')
  const ahjNote = cb.slice(ahjIdx, ahjIdx + 400)
  assert.ok(
    ahjNote.includes('does not issue') || ahjNote.includes('does not grant'),
    'S15-04 ahjNotes must state Vero does not issue occupancy or grant approval'
  )
  assert.ok(
    ahjNote.includes('AHJ') || ahjNote.includes('municipal authority'),
    'S15-04 ahjNotes must reference AHJ or municipal authority as the issuing body'
  )
})

// ===========================================================================
// 19. Prohibited files not contaminated
// ===========================================================================

test('Schedule C-B route is not contaminated by S15 changes', () => {
  const source = read(SCHEDULE_CB)
  assert.ok(!source.includes('S15-03'), 'Schedule C-B must not reference S15-03')
  assert.ok(!source.includes('S15-04'), 'Schedule C-B must not reference S15-04')
  assert.ok(!source.includes('Letters of Assurance'), 'Schedule C-B must not gain new Letters of Assurance references from S15')
})

test('final-occupancy route is not contaminated by S15 changes', () => {
  const source = read(FINAL_OCC)
  assert.ok(!source.includes('S15-03'), 'Final occupancy route must not reference S15-03')
  assert.ok(!source.includes('S15-04'), 'Final occupancy route must not reference S15-04')
})

test('store.tsx is not contaminated by S15 changes', () => {
  const source = read(STORE)
  assert.ok(!source.includes('S15-03'), 'store.tsx must not reference S15-03 directly')
  assert.ok(!source.includes('S15-04'), 'store.tsx must not reference S15-04 directly')
})

// ===========================================================================
// 20. S14 block remains unchanged and S14-05 still exists
// ===========================================================================

test('S14 block is unchanged and S14-05 still exists', () => {
  const source = read(COMPLETION)
  const s14Start = source.indexOf('STRUCTURAL_STAGE_14_CONTAINERS')
  const s14End = source.indexOf('STRUCTURAL_STAGE_15_CONTAINERS')
  assert.ok(s14Start !== -1, 'STRUCTURAL_STAGE_14_CONTAINERS must exist')
  assert.ok(s14End !== -1, 'S14/S15 boundary must exist')
  const s14Block = source.slice(s14Start, s14End)
  assert.ok(s14Block.includes("code: 'S14-05'"), 'S14-05 must still exist in S14 block')
  assert.ok(s14Block.includes("code: 'S14-01'"), 'S14-01 must still exist in S14 block')
})
