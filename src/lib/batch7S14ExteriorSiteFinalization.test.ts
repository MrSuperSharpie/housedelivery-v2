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

function getS14Block(source: string): string {
  const start = source.indexOf('STRUCTURAL_STAGE_14_CONTAINERS')
  const end = source.indexOf('STRUCTURAL_STAGE_15_CONTAINERS')
  assert.ok(start !== -1, 'STRUCTURAL_STAGE_14_CONTAINERS must be defined')
  assert.ok(end !== -1, 'STRUCTURAL_STAGE_15_CONTAINERS must exist as boundary')
  return source.slice(start, end)
}

function getContainerBlock(s14Block: string, code: string, nextCode: string | null): string {
  const start = s14Block.indexOf(`code: '${code}'`)
  assert.ok(start !== -1, `${code} must exist in S14 block`)
  const end = nextCode !== null
    ? s14Block.indexOf(`code: '${nextCode}'`)
    : s14Block.length
  return s14Block.slice(start, end)
}

function countFieldChecklistItems(containerBlock: string): number {
  const fcStart = containerBlock.indexOf('fieldChecklist: [')
  if (fcStart === -1) return 0
  const fcEnd = containerBlock.indexOf('\n    ],', fcStart)
  const fcBlock = containerBlock.slice(fcStart, fcEnd)
  return (fcBlock.match(/(',\n)/g) ?? []).length
}

// ===========================================================================
// 1. S14 defines exactly 5 containers
// ===========================================================================

test('S14 defines exactly 5 containers: S14-01 through S14-05', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const codes = ['S14-01', 'S14-02', 'S14-03', 'S14-04', 'S14-05']
  for (const code of codes) {
    assert.ok(block.includes(`code: '${code}'`), `STRUCTURAL_STAGE_14_CONTAINERS must define ${code}`)
  }
  assert.ok(!block.includes("code: 'S14-06'"), 'S14 must not define S14-06')
})

// ===========================================================================
// 2. Container labels
// ===========================================================================

test('S14-01 label references cladding, envelope, or weather-resistive continuity', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const s1401 = getContainerBlock(block, 'S14-01', 'S14-02')
  const labelMatch = s1401.match(/label:\s*'([^']+)'/)
  assert.ok(labelMatch, 'S14-01 must have a label')
  const label = labelMatch[1].toLowerCase()
  assert.ok(
    label.includes('cladding') || label.includes('envelope') || label.includes('weather'),
    'S14-01 label must reference cladding, envelope, or weather-resistive continuity'
  )
})

test('S14-02 label references stairs, decks, guards, or handrails', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const s1402 = getContainerBlock(block, 'S14-02', 'S14-03')
  const labelMatch = s1402.match(/label:\s*'([^']+)'/)
  assert.ok(labelMatch, 'S14-02 must have a label')
  const label = labelMatch[1].toLowerCase()
  assert.ok(
    label.includes('stair') || label.includes('deck') || label.includes('guard') || label.includes('handrail'),
    'S14-02 label must reference stairs, decks, guards, or handrails'
  )
})

test('S14-03 label references grading, drainage, or stormwater', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const s1403 = getContainerBlock(block, 'S14-03', 'S14-04')
  const labelMatch = s1403.match(/label:\s*'([^']+)'/)
  assert.ok(labelMatch, 'S14-03 must have a label')
  const label = labelMatch[1].toLowerCase()
  assert.ok(
    label.includes('grading') || label.includes('drainage') || label.includes('stormwater'),
    'S14-03 label must reference grading, drainage, or stormwater'
  )
})

test('S14-04 label references access, servicing, fire authority, or exterior systems', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const s1404 = getContainerBlock(block, 'S14-04', 'S14-05')
  const labelMatch = s1404.match(/label:\s*'([^']+)'/)
  assert.ok(labelMatch, 'S14-04 must have a label')
  const label = labelMatch[1].toLowerCase()
  assert.ok(
    label.includes('access') || label.includes('servicing') || label.includes('fire') || label.includes('exterior systems'),
    'S14-04 label must reference access, servicing, fire authority, or exterior systems'
  )
})

test('S14-05 label references landscaping, site restoration, or closeout', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const s1405 = getContainerBlock(block, 'S14-05', null)
  const labelMatch = s1405.match(/label:\s*'([^']+)'/)
  assert.ok(labelMatch, 'S14-05 must have a label')
  const label = labelMatch[1].toLowerCase()
  assert.ok(
    label.includes('landscaping') || label.includes('restoration') || label.includes('closeout'),
    'S14-05 label must reference landscaping, site restoration, or closeout'
  )
})

// ===========================================================================
// 3. Every S14 container has all required fields
// ===========================================================================

test('every S14 container has fieldChecklist, passWhen, failWhen, pendingWhen, stopIf, and requiredEvidence', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const codes = ['S14-01', 'S14-02', 'S14-03', 'S14-04', 'S14-05']
  const nextCodes: (string | null)[] = ['S14-02', 'S14-03', 'S14-04', 'S14-05', null]
  const requiredFields = ['fieldChecklist', 'passWhen', 'failWhen', 'pendingWhen', 'stopIf', 'requiredEvidence']
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

// ===========================================================================
// 4. Minimum fieldChecklist item counts
// ===========================================================================

test('S14-01 has at least 6 fieldChecklist items', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const container = getContainerBlock(block, 'S14-01', 'S14-02')
  const count = countFieldChecklistItems(container)
  assert.ok(count >= 6, `S14-01 must have at least 6 fieldChecklist items, found ${count}`)
})

test('S14-02 has at least 6 fieldChecklist items', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const container = getContainerBlock(block, 'S14-02', 'S14-03')
  const count = countFieldChecklistItems(container)
  assert.ok(count >= 6, `S14-02 must have at least 6 fieldChecklist items, found ${count}`)
})

test('S14-03 has at least 6 fieldChecklist items', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const container = getContainerBlock(block, 'S14-03', 'S14-04')
  const count = countFieldChecklistItems(container)
  assert.ok(count >= 6, `S14-03 must have at least 6 fieldChecklist items, found ${count}`)
})

test('S14-04 has at least 6 fieldChecklist items', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const container = getContainerBlock(block, 'S14-04', 'S14-05')
  const count = countFieldChecklistItems(container)
  assert.ok(count >= 6, `S14-04 must have at least 6 fieldChecklist items, found ${count}`)
})

test('S14-05 has at least 5 fieldChecklist items', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const container = getContainerBlock(block, 'S14-05', null)
  const count = countFieldChecklistItems(container)
  assert.ok(count >= 5, `S14-05 must have at least 5 fieldChecklist items, found ${count}`)
})

// ===========================================================================
// 5. Domain-specific content checks
// ===========================================================================

test('S14-01 includes cladding or WRB language', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const container = getContainerBlock(block, 'S14-01', 'S14-02')
  assert.ok(
    container.includes('cladding') || container.includes('weather-resistive') || container.includes('WRB') || container.includes('drainage plane'),
    'S14-01 must include cladding or weather-resistive barrier language'
  )
})

test('S14-01 includes flashing language', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const container = getContainerBlock(block, 'S14-01', 'S14-02')
  assert.ok(
    container.includes('flashing') || container.includes('Flashing'),
    'S14-01 must include flashing language'
  )
})

test('S14-02 includes guard height language', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const container = getContainerBlock(block, 'S14-02', 'S14-03')
  assert.ok(
    container.includes('guard height') || container.includes('Guard height'),
    'S14-02 must include guard height language'
  )
})

test('S14-02 includes handrail language', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const container = getContainerBlock(block, 'S14-02', 'S14-03')
  assert.ok(
    container.includes('handrail') || container.includes('Handrail'),
    'S14-02 must include handrail language'
  )
})

test('S14-03 includes grading slope language', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const container = getContainerBlock(block, 'S14-03', 'S14-04')
  assert.ok(
    container.includes('grade') || container.includes('grading') || container.includes('slope'),
    'S14-03 must include grading slope language'
  )
})

test('S14-03 includes downspout discharge language', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const container = getContainerBlock(block, 'S14-03', 'S14-04')
  assert.ok(
    container.includes('downspout') || container.includes('Downspout'),
    'S14-03 must include downspout discharge language'
  )
})

test('S14-03 includes erosion control language', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const container = getContainerBlock(block, 'S14-03', 'S14-04')
  assert.ok(
    container.includes('erosion') || container.includes('Erosion'),
    'S14-03 must include erosion control language'
  )
})

test('S14-04 includes address visibility language', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const container = getContainerBlock(block, 'S14-04', 'S14-05')
  assert.ok(
    container.includes('address') || container.includes('Address'),
    'S14-04 must include address visibility language'
  )
})

test('S14-04 includes fire access or fire department language', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const container = getContainerBlock(block, 'S14-04', 'S14-05')
  assert.ok(
    container.includes('fire') || container.includes('Fire'),
    'S14-04 must include fire access or fire department language'
  )
})

test('S14-04 includes accessible route language', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const container = getContainerBlock(block, 'S14-04', 'S14-05')
  assert.ok(
    container.includes('accessible') || container.includes('Accessible'),
    'S14-04 must include accessible route language'
  )
})

test('S14-05 includes tree compliance or arborist language', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const container = getContainerBlock(block, 'S14-05', null)
  assert.ok(
    container.includes('tree') || container.includes('Tree') || container.includes('arborist') || container.includes('Arborist'),
    'S14-05 must include tree compliance or arborist language'
  )
})

test('S14-05 includes deficiency resolution or closeout language', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const container = getContainerBlock(block, 'S14-05', null)
  assert.ok(
    container.includes('deficien') || container.includes('closeout') || container.includes('Closeout'),
    'S14-05 must include deficiency resolution or closeout language'
  )
})

// ===========================================================================
// 6. No requiredLogic dead key anywhere in S14
// ===========================================================================

test('no requiredLogic key appears anywhere in the S14 block', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  assert.ok(
    !block.includes('requiredLogic'),
    'S14 block must not contain the requiredLogic dead key'
  )
})

// ===========================================================================
// 7. All 5 S14 containers use permitType: 'building' and responsibleParty: 'Inspector'
// ===========================================================================

test('all 5 S14 containers use permitType: building', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const codes = ['S14-01', 'S14-02', 'S14-03', 'S14-04', 'S14-05']
  const nextCodes: (string | null)[] = ['S14-02', 'S14-03', 'S14-04', 'S14-05', null]
  for (let i = 0; i < codes.length; i++) {
    const container = getContainerBlock(block, codes[i], nextCodes[i])
    assert.ok(
      container.includes("permitType: 'building'"),
      `${codes[i]} must use permitType: 'building'`
    )
    assert.ok(
      !container.includes("permitType: 'trees'"),
      `${codes[i]} must not use permitType: 'trees'`
    )
  }
})

test('all 5 S14 containers use responsibleParty: Inspector', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const codes = ['S14-01', 'S14-02', 'S14-03', 'S14-04', 'S14-05']
  const nextCodes: (string | null)[] = ['S14-02', 'S14-03', 'S14-04', 'S14-05', null]
  for (let i = 0; i < codes.length; i++) {
    const container = getContainerBlock(block, codes[i], nextCodes[i])
    assert.ok(
      container.includes("responsibleParty: 'Inspector'"),
      `${codes[i]} must use responsibleParty: 'Inspector'`
    )
    assert.ok(
      !container.includes("responsibleParty: 'AHJ'"),
      `${codes[i]} must not use responsibleParty: 'AHJ'`
    )
  }
})

// ===========================================================================
// 8. All 5 S14 containers have codeReferences with at least 2 entries
// ===========================================================================

test('all 5 S14 containers have codeReferences with at least 2 entries', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const codes = ['S14-01', 'S14-02', 'S14-03', 'S14-04', 'S14-05']
  const nextCodes: (string | null)[] = ['S14-02', 'S14-03', 'S14-04', 'S14-05', null]
  for (let i = 0; i < codes.length; i++) {
    const container = getContainerBlock(block, codes[i], nextCodes[i])
    assert.ok(
      container.includes('codeReferences:'),
      `${codes[i]} must have a codeReferences field`
    )
    const crStart = container.indexOf('codeReferences:')
    const crBlock = container.slice(crStart, container.indexOf('],', crStart) + 2)
    const entryCount = (crBlock.match(/legalReference:/g) ?? []).length
    assert.ok(
      entryCount >= 2,
      `${codes[i]} codeReferences must have at least 2 entries, found ${entryCount}`
    )
  }
})

// ===========================================================================
// 9. At least one isVbblOnly: true entry in S14
// ===========================================================================

test('at least one S14 codeReferences entry has isVbblOnly: true', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  assert.ok(
    block.includes('isVbblOnly: true'),
    'S14 must contain at least one codeReferences entry with isVbblOnly: true'
  )
})

// ===========================================================================
// 10. Dependency chain
// ===========================================================================

test('S14-01 depends on S13-05', () => {
  const source = read(COMPLETION)
  const block = getS14Block(source)
  const container = getContainerBlock(block, 'S14-01', 'S14-02')
  const depIdx = container.indexOf('dependencies:')
  assert.ok(depIdx !== -1, 'S14-01 must have a dependencies field')
  const depLine = container.slice(depIdx, container.indexOf(']', depIdx) + 1)
  assert.ok(depLine.includes("'S13-05'"), "S14-01 dependencies must include 'S13-05'")
})

test('S15-01 depends on S14-05, not S14-03', () => {
  const source = read(COMPLETION)
  const s1501Idx = source.indexOf("code: 'S15-01'")
  assert.ok(s1501Idx !== -1, 'S15-01 must exist in the source')
  const s1501Block = source.slice(s1501Idx, s1501Idx + 3000)
  const depIdx = s1501Block.indexOf('dependencies:')
  assert.ok(depIdx !== -1, 'S15-01 must have a dependencies field')
  const depLine = s1501Block.slice(depIdx, s1501Block.indexOf(']', depIdx) + 1)
  assert.ok(depLine.includes("'S14-05'"), "S15-01 dependencies must include 'S14-05'")
  assert.ok(!depLine.includes("'S14-03'"), "S15-01 dependencies must not reference 'S14-03'")
})

// ===========================================================================
// 11. Schedule C-B not contaminated
// ===========================================================================

test('Schedule C-B route is not contaminated with S14 exterior-specific content', () => {
  const source = read(SCHEDULE_CB)
  assert.ok(!source.includes('S14-04'), 'Schedule C-B must not reference S14-04')
  assert.ok(!source.includes('S14-05'), 'Schedule C-B must not reference S14-05')
  assert.ok(!source.includes('cladding'), 'Schedule C-B must not reference cladding')
  assert.ok(!source.includes('flashing'), 'Schedule C-B must not reference flashing')
  assert.ok(!source.includes('arborist'), 'Schedule C-B must not reference arborist')
})
