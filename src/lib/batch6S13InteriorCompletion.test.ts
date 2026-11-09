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

function getS13Block(source: string): string {
  const start = source.indexOf('STRUCTURAL_STAGE_13_CONTAINERS')
  const end = source.indexOf('STRUCTURAL_STAGE_14_CONTAINERS')
  assert.ok(start !== -1, 'STRUCTURAL_STAGE_13_CONTAINERS must be defined')
  assert.ok(end !== -1, 'STRUCTURAL_STAGE_14_CONTAINERS must exist as boundary')
  return source.slice(start, end)
}

function getContainerSubBlock(s13Block: string, code: string, nextCode: string | null): string {
  const start = s13Block.indexOf(`code: '${code}'`)
  assert.ok(start !== -1, `S13 block must contain code: '${code}'`)
  const end = nextCode !== null ? s13Block.indexOf(`code: '${nextCode}'`) : s13Block.length
  return s13Block.slice(start, end)
}

function countFieldChecklistItems(containerBlock: string): number {
  const fcStart = containerBlock.indexOf('fieldChecklist: [')
  if (fcStart === -1) return 0
  // fieldChecklist array closes at the first `    ],` after the open
  const fcEnd = containerBlock.indexOf('\n    ],', fcStart)
  const fcBlock = containerBlock.slice(fcStart, fcEnd)
  // each item ends with `',` — count them
  return (fcBlock.match(/',\n/g) ?? []).length
}

// ===========================================================================
// 1. S13 defines exactly 5 containers: S13-01 through S13-05
// ===========================================================================

test('S13 defines exactly 5 containers S13-01 through S13-05', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const codes = ['S13-01', 'S13-02', 'S13-03', 'S13-04', 'S13-05']
  for (const code of codes) {
    assert.ok(block.includes(`code: '${code}'`), `S13 block must define ${code}`)
  }
  assert.ok(!block.includes("code: 'S13-06'"), 'S13 block must not define S13-06')
})

// ===========================================================================
// 2. S13-01 includes fire separation / rated assembly language
// ===========================================================================

test('S13-01 includes fire separation and rated assembly language', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const sub = getContainerSubBlock(block, 'S13-01', 'S13-02')
  assert.ok(
    sub.includes('fire separation') || sub.includes('Fire separation') || sub.includes('fire-rated') || sub.includes('rated assembly'),
    'S13-01 must include fire separation or rated assembly language'
  )
})

// ===========================================================================
// 3. S13-01 includes firestopping language
// ===========================================================================

test('S13-01 includes firestopping language', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const sub = getContainerSubBlock(block, 'S13-01', 'S13-02')
  assert.ok(
    sub.includes('firestopping') || sub.includes('Firestopping'),
    'S13-01 must include firestopping language'
  )
})

// ===========================================================================
// 4. S13-01 includes shaft wall or service chase language
// ===========================================================================

test('S13-01 includes shaft wall or service chase language', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const sub = getContainerSubBlock(block, 'S13-01', 'S13-02')
  assert.ok(
    sub.includes('shaft wall') || sub.includes('Shaft wall') || sub.includes('service chase') || sub.includes('Service chase'),
    'S13-01 must include shaft wall or service chase language'
  )
})

// ===========================================================================
// 5. S13-01 includes sound separation language
// ===========================================================================

test('S13-01 includes sound separation language', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const sub = getContainerSubBlock(block, 'S13-01', 'S13-02')
  assert.ok(
    sub.includes('sound separation') || sub.includes('Sound separation'),
    'S13-01 must include sound separation language'
  )
})

// ===========================================================================
// 6. S13-01 stopIf references concealment gate for rated penetrations
// ===========================================================================

test('S13-01 stopIf references concealment gate for rated penetrations', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const sub = getContainerSubBlock(block, 'S13-01', 'S13-02')
  const stopIfIdx = sub.indexOf('stopIf')
  assert.ok(stopIfIdx !== -1, 'S13-01 must have a stopIf field')
  const stopIfBlock = sub.slice(stopIfIdx, stopIfIdx + 400)
  assert.ok(
    stopIfBlock.includes('conceal') || stopIfBlock.includes('penetration') || stopIfBlock.includes('rated'),
    'S13-01 stopIf must reference concealment or rated penetrations'
  )
})

// ===========================================================================
// 7. S13-02 includes tile backer or wet-area substrate language
// ===========================================================================

test('S13-02 includes tile backer or wet-area substrate language', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const sub = getContainerSubBlock(block, 'S13-02', 'S13-03')
  assert.ok(
    sub.includes('tile backer') || sub.includes('Tile backer') || sub.includes('wet-area'),
    'S13-02 must include tile backer or wet-area substrate language'
  )
})

// ===========================================================================
// 8. S13-02 includes waterproofing or wet-area preparation language
// ===========================================================================

test('S13-02 includes waterproofing or wet-area preparation language', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const sub = getContainerSubBlock(block, 'S13-02', 'S13-03')
  assert.ok(
    sub.includes('waterproofing') || sub.includes('Waterproofing') || sub.includes('wet-area preparation'),
    'S13-02 must include waterproofing or wet-area preparation language'
  )
})

// ===========================================================================
// 9. S13-02 includes grab bar blocking or adaptable backing language
// ===========================================================================

test('S13-02 includes grab bar blocking or adaptable backing language', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const sub = getContainerSubBlock(block, 'S13-02', 'S13-03')
  assert.ok(
    sub.includes('grab bar blocking') || sub.includes('Grab bar blocking') || sub.includes('adaptable'),
    'S13-02 must include grab bar blocking or adaptable backing language'
  )
})

// ===========================================================================
// 10. S13-03 includes guard or handrail language
// ===========================================================================

test('S13-03 includes guard or handrail language', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const sub = getContainerSubBlock(block, 'S13-03', 'S13-04')
  assert.ok(
    sub.includes('guard') || sub.includes('Guard') || sub.includes('handrail') || sub.includes('Handrail'),
    'S13-03 must include guard or handrail language'
  )
})

// ===========================================================================
// 11. S13-03 includes smoke alarm language
// ===========================================================================

test('S13-03 includes smoke alarm language', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const sub = getContainerSubBlock(block, 'S13-03', 'S13-04')
  assert.ok(
    sub.includes('smoke alarm') || sub.includes('Smoke alarm'),
    'S13-03 must include smoke alarm language'
  )
})

// ===========================================================================
// 12. S13-03 includes CO detector language
// ===========================================================================

test('S13-03 includes CO detector language', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const sub = getContainerSubBlock(block, 'S13-03', 'S13-04')
  assert.ok(
    sub.includes('CO detector') || sub.includes('carbon monoxide'),
    'S13-03 must include CO detector language'
  )
})

// ===========================================================================
// 13. S13-03 stopIf references guard deficiency or egress hardware
// ===========================================================================

test('S13-03 stopIf references guard deficiency or egress hardware', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const sub = getContainerSubBlock(block, 'S13-03', 'S13-04')
  const stopIfIdx = sub.indexOf('stopIf')
  assert.ok(stopIfIdx !== -1, 'S13-03 must have a stopIf field')
  const stopIfBlock = sub.slice(stopIfIdx, stopIfIdx + 500)
  assert.ok(
    stopIfBlock.includes('guard') || stopIfBlock.includes('egress') || stopIfBlock.includes('handrail'),
    'S13-03 stopIf must reference guard deficiency or egress hardware'
  )
})

// ===========================================================================
// 14. S13-04 includes flame-spread or finish material compliance language
// ===========================================================================

test('S13-04 includes flame-spread or finish material compliance language', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const sub = getContainerSubBlock(block, 'S13-04', 'S13-05')
  assert.ok(
    sub.includes('flame-spread') || sub.includes('flame spread') || sub.includes('fire-performance'),
    'S13-04 must include flame-spread or fire-performance language'
  )
})

// ===========================================================================
// 15. S13-04 includes plumbing trim and electrical trim language
// ===========================================================================

test('S13-04 includes plumbing trim and electrical trim language', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const sub = getContainerSubBlock(block, 'S13-04', 'S13-05')
  assert.ok(
    sub.includes('Plumbing trim') || sub.includes('plumbing trim'),
    'S13-04 must include plumbing trim language'
  )
  assert.ok(
    sub.includes('Electrical trim') || sub.includes('electrical trim'),
    'S13-04 must include electrical trim language'
  )
})

// ===========================================================================
// 16. S13-05 includes accessibility clearance or door width language
// ===========================================================================

test('S13-05 includes accessibility clearance or door width language', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const sub = getContainerSubBlock(block, 'S13-05', null)
  assert.ok(
    sub.includes('clear-opening') || sub.includes('door clear') || sub.includes('turning clearance'),
    'S13-05 must include accessibility clearance or door width language'
  )
})

// ===========================================================================
// 17. S13-05 includes adaptable housing language
// ===========================================================================

test('S13-05 includes adaptable housing language', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const sub = getContainerSubBlock(block, 'S13-05', null)
  assert.ok(
    sub.includes('adaptable housing') || sub.includes('Adaptable housing'),
    'S13-05 must include adaptable housing language'
  )
})

// ===========================================================================
// 18. Every S13 item has fieldChecklist, passWhen, failWhen, pendingWhen, stopIf, and requiredEvidence
// ===========================================================================

test('every S13 item includes fieldChecklist, passWhen, failWhen, pendingWhen, stopIf, and requiredEvidence', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const codes = ['S13-01', 'S13-02', 'S13-03', 'S13-04', 'S13-05']
  const nextCodes: Array<string | null> = ['S13-02', 'S13-03', 'S13-04', 'S13-05', null]
  const requiredFields = ['fieldChecklist', 'passWhen', 'failWhen', 'pendingWhen', 'stopIf', 'requiredEvidence']
  for (let i = 0; i < codes.length; i++) {
    const sub = getContainerSubBlock(block, codes[i], nextCodes[i])
    for (const field of requiredFields) {
      assert.ok(sub.includes(field), `${codes[i]} must include ${field}`)
    }
  }
})

// ===========================================================================
// 19. Every S13 item has codeReferences with at least one legalReference
// ===========================================================================

test('every S13 item has codeReferences with at least one legalReference', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const codes = ['S13-01', 'S13-02', 'S13-03', 'S13-04', 'S13-05']
  const nextCodes: Array<string | null> = ['S13-02', 'S13-03', 'S13-04', 'S13-05', null]
  for (let i = 0; i < codes.length; i++) {
    const sub = getContainerSubBlock(block, codes[i], nextCodes[i])
    assert.ok(sub.includes('codeReferences'), `${codes[i]} must have codeReferences`)
    assert.ok(sub.includes('legalReference'), `${codes[i]} must have at least one legalReference`)
  }
})

// ===========================================================================
// 20. At least one S13 codeReferences entry has isVbblOnly: true
// ===========================================================================

test('at least one S13 codeReferences entry has isVbblOnly: true', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  assert.ok(
    block.includes('isVbblOnly: true'),
    'At least one S13 codeReferences entry must have isVbblOnly: true'
  )
})

// ===========================================================================
// 21. No S13 item has responsibleParty: 'AHJ'
// ===========================================================================

test("no S13 item has responsibleParty: 'AHJ'", () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  assert.ok(
    !block.includes("responsibleParty: 'AHJ'"),
    "S13 containers must not use responsibleParty: 'AHJ'"
  )
})

// ===========================================================================
// 22. No S13 item has requiredLogic
// ===========================================================================

test('no S13 item has requiredLogic', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  assert.ok(
    !block.includes('requiredLogic'),
    'S13 containers must not include the non-standard requiredLogic key'
  )
})

// ===========================================================================
// 23. S13-01 depends on S12-04
// ===========================================================================

test("S13-01 depends on S12-04", () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const sub = getContainerSubBlock(block, 'S13-01', 'S13-02')
  assert.ok(sub.includes("'S12-04'"), "S13-01 dependencies must include 'S12-04'")
})

// ===========================================================================
// 24. S14-01 depends on S13-05, not S13-03
// ===========================================================================

test("S14-01 depends on S13-05, not S13-03", () => {
  const source = read(COMPLETION)
  // Find S14-01 in the full source and check its dependencies field
  const s1401Idx = source.indexOf("code: 'S14-01'")
  assert.ok(s1401Idx !== -1, "S14-01 must exist in the source")
  const s1401Block = source.slice(s1401Idx, s1401Idx + 3000)
  const depIdx = s1401Block.indexOf('dependencies:')
  assert.ok(depIdx !== -1, "S14-01 must have a dependencies field")
  // Only inspect the dependencies line itself (up to the closing bracket)
  const depLine = s1401Block.slice(depIdx, s1401Block.indexOf(']', depIdx) + 1)
  assert.ok(
    depLine.includes("'S13-05'"),
    "S14-01 dependencies must include 'S13-05'"
  )
  assert.ok(
    !depLine.includes("'S13-03'"),
    "S14-01 dependencies must not reference 'S13-03'"
  )
})

// ===========================================================================
// 25. Every S13 container has at least 5 fieldChecklist items
// ===========================================================================

test('every S13 container has at least 5 fieldChecklist items', () => {
  const source = read(COMPLETION)
  const block = getS13Block(source)
  const codes = ['S13-01', 'S13-02', 'S13-03', 'S13-04', 'S13-05']
  const nextCodes: Array<string | null> = ['S13-02', 'S13-03', 'S13-04', 'S13-05', null]
  for (let i = 0; i < codes.length; i++) {
    const sub = getContainerSubBlock(block, codes[i], nextCodes[i])
    const count = countFieldChecklistItems(sub)
    assert.ok(
      count >= 5,
      `${codes[i]} must have at least 5 fieldChecklist items (found ${count})`
    )
  }
})

// ===========================================================================
// 26. S09 block is unchanged (key structural markers still present)
// ===========================================================================

test('S09 block structural markers are unchanged', () => {
  const source = read(COMPLETION)
  const s09Start = source.indexOf('STRUCTURAL_STAGE_9_CONTAINERS')
  const s10Start = source.indexOf('STRUCTURAL_STAGE_10_CONTAINERS')
  assert.ok(s09Start !== -1, 'STRUCTURAL_STAGE_9_CONTAINERS must still exist')
  const s09Block = source.slice(s09Start, s10Start)
  assert.ok(s09Block.includes("code: 'S09-01'"), 'S09-01 must still exist')
  assert.ok(s09Block.includes("code: 'S09-05'"), 'S09-05 must still exist')
  assert.ok(!s09Block.includes("code: 'S09-06'"), 'S09-06 must not exist in S09 block')
})

// ===========================================================================
// 27. S10 block still has 4 containers
// ===========================================================================

test('S10 block still has 4 containers (S10-01 through S10-04)', () => {
  const source = read(COMPLETION)
  const s10Start = source.indexOf('STRUCTURAL_STAGE_10_CONTAINERS')
  const s11Start = source.indexOf('STRUCTURAL_STAGE_11_CONTAINERS')
  assert.ok(s10Start !== -1, 'STRUCTURAL_STAGE_10_CONTAINERS must exist')
  const s10Block = source.slice(s10Start, s11Start)
  for (let i = 1; i <= 4; i++) {
    const code = `S10-0${i}`
    assert.ok(s10Block.includes(`code: '${code}'`), `${code} must still exist in S10 block`)
  }
  assert.ok(!s10Block.includes("code: 'S10-05'"), 'S10-05 must not exist in S10 block')
})

// ===========================================================================
// 28. S11 block still has 4 containers
// ===========================================================================

test('S11 block still has 4 containers (S11-01 through S11-04)', () => {
  const source = read(COMPLETION)
  const s11Start = source.indexOf('STRUCTURAL_STAGE_11_CONTAINERS')
  const s12Start = source.indexOf('STRUCTURAL_STAGE_12_CONTAINERS')
  assert.ok(s11Start !== -1, 'STRUCTURAL_STAGE_11_CONTAINERS must exist')
  const s11Block = source.slice(s11Start, s12Start)
  for (let i = 1; i <= 4; i++) {
    const code = `S11-0${i}`
    assert.ok(s11Block.includes(`code: '${code}'`), `${code} must still exist in S11 block`)
  }
  assert.ok(!s11Block.includes("code: 'S11-05'"), 'S11-05 must not exist in S11 block')
})

// ===========================================================================
// 29. S12 block still has 4 containers
// ===========================================================================

test('S12 block still has 4 containers (S12-01 through S12-04)', () => {
  const source = read(COMPLETION)
  const s12Start = source.indexOf('STRUCTURAL_STAGE_12_CONTAINERS')
  const s13Start = source.indexOf('STRUCTURAL_STAGE_13_CONTAINERS')
  assert.ok(s12Start !== -1, 'STRUCTURAL_STAGE_12_CONTAINERS must exist')
  const s12Block = source.slice(s12Start, s13Start)
  for (let i = 1; i <= 4; i++) {
    const code = `S12-0${i}`
    assert.ok(s12Block.includes(`code: '${code}'`), `${code} must still exist in S12 block`)
  }
  assert.ok(!s12Block.includes("code: 'S12-05'"), 'S12-05 must not exist in S12 block')
})

// ===========================================================================
// 30. Schedule C-B route is not contaminated with S13 interior-specific content
// ===========================================================================

test('Schedule C-B route is not contaminated by S13 content', () => {
  const source = read(SCHEDULE_CB)
  assert.ok(!source.includes('S13-03'), 'Schedule C-B must not reference S13-03')
  assert.ok(!source.includes('S13-04'), 'Schedule C-B must not reference S13-04')
  assert.ok(!source.includes('S13-05'), 'Schedule C-B must not reference S13-05')
  assert.ok(!source.includes('firestopping'), 'Schedule C-B must not reference firestopping')
  assert.ok(!source.includes('adaptable housing'), 'Schedule C-B must not reference adaptable housing')
})

// ===========================================================================
// 31. Final occupancy route is not contaminated
// ===========================================================================

test('final-occupancy route is not contaminated by S13 content', () => {
  const source = read(FINAL_OCC)
  assert.ok(!source.includes('S13-03'), 'Final occupancy must not reference S13-03')
  assert.ok(!source.includes('S13-04'), 'Final occupancy must not reference S13-04')
  assert.ok(!source.includes('S13-05'), 'Final occupancy must not reference S13-05')
})

// ===========================================================================
// 32. InspectorCompletionWorkspace routing logic is preserved
// ===========================================================================

test('InspectorCompletionWorkspace routing logic is preserved', () => {
  const source = read(WORKSPACE)
  assert.ok(source.includes('DISCIPLINE_STAGE_OVERRIDE'), 'Workspace routing logic must be preserved')
  assert.ok(source.includes('usesFieldView && item.responsible_party'), 'usesFieldView must gate responsible_party for all field_view items')
  assert.ok(source.includes('PILOT_S9_CODE_REFS'), 'PILOT_S9_CODE_REFS must be preserved in workspace')
})
