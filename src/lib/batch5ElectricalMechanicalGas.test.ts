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

function getS10Block(source: string): string {
  const start = source.indexOf('STRUCTURAL_STAGE_10_CONTAINERS')
  const end = source.indexOf('STRUCTURAL_STAGE_11_CONTAINERS')
  assert.ok(start !== -1, 'STRUCTURAL_STAGE_10_CONTAINERS must be defined')
  assert.ok(end !== -1, 'STRUCTURAL_STAGE_11_CONTAINERS must exist as boundary')
  return source.slice(start, end)
}

function getS11Block(source: string): string {
  const start = source.indexOf('STRUCTURAL_STAGE_11_CONTAINERS')
  const end = source.indexOf('STRUCTURAL_STAGE_12_CONTAINERS')
  assert.ok(start !== -1, 'STRUCTURAL_STAGE_11_CONTAINERS must be defined')
  assert.ok(end !== -1, 'STRUCTURAL_STAGE_12_CONTAINERS must exist as boundary')
  return source.slice(start, end)
}

function getS12Block(source: string): string {
  const start = source.indexOf('STRUCTURAL_STAGE_12_CONTAINERS')
  const end = source.indexOf('STRUCTURAL_STAGE_13_CONTAINERS')
  assert.ok(start !== -1, 'STRUCTURAL_STAGE_12_CONTAINERS must be defined')
  assert.ok(end !== -1, 'STRUCTURAL_STAGE_13_CONTAINERS must exist as boundary')
  return source.slice(start, end)
}

function getS9Block(source: string): string {
  const start = source.indexOf('STRUCTURAL_STAGE_9_CONTAINERS')
  const end = source.indexOf('STRUCTURAL_STAGE_10_CONTAINERS')
  assert.ok(start !== -1, 'STRUCTURAL_STAGE_9_CONTAINERS must be defined')
  assert.ok(end !== -1, 'STRUCTURAL_STAGE_10_CONTAINERS must exist as boundary')
  return source.slice(start, end)
}

function countFieldChecklistItems(containerBlock: string): number {
  const m = containerBlock.match(/fieldChecklist:\s*\[/)
  if (!m || m.index === undefined) return 0
  const start = m.index + m[0].length
  let depth = 1
  let i = start
  while (i < containerBlock.length && depth > 0) {
    if (containerBlock[i] === '[') depth++
    else if (containerBlock[i] === ']') depth--
    i++
  }
  const checklist = containerBlock.slice(start, i - 1)
  return (checklist.match(/^\s*'/gm) || []).length
}

function getContainerBlock(stageBlock: string, code: string, nextCode?: string): string {
  const start = stageBlock.indexOf(`code: '${code}'`)
  assert.ok(start !== -1, `Container ${code} must exist`)
  const end = nextCode ? stageBlock.indexOf(`code: '${nextCode}'`) : stageBlock.length
  return stageBlock.slice(start, end)
}

// ===========================================================================
// 1. S10 defines exactly 4 containers
// ===========================================================================

test('S10 defines exactly 4 containers: S10-01, S10-02, S10-03, S10-04', () => {
  const source = read(COMPLETION)
  const block = getS10Block(source)
  for (const code of ['S10-01', 'S10-02', 'S10-03', 'S10-04']) {
    assert.ok(block.includes(`code: '${code}'`), `S10 must define ${code}`)
  }
  assert.ok(!block.includes("code: 'S10-05'"), 'S10 must not define a fifth container')
})

// ===========================================================================
// 2. S10-01 label and permit language
// ===========================================================================

test('S10-01 label includes Electrical Permit and Service Readiness', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS10Block(source), 'S10-01', 'S10-02')
  assert.ok(
    block.includes('Electrical Permit and Service Readiness'),
    'S10-01 label must include Electrical Permit and Service Readiness'
  )
})

test('S10-01 includes permit issuance language', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS10Block(source), 'S10-01', 'S10-02')
  assert.ok(
    block.includes('permit') || block.includes('Permit'),
    'S10-01 must include permit issuance language'
  )
})

// ===========================================================================
// 3. S10-01 fieldChecklist count
// ===========================================================================

test('S10-01 has at least 6 fieldChecklist items', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS10Block(source), 'S10-01', 'S10-02')
  const count = countFieldChecklistItems(block)
  assert.ok(count >= 6, `S10-01 must have at least 6 fieldChecklist items, found ${count}`)
})

// ===========================================================================
// 4. S10-01 grounding and bonding
// ===========================================================================

test('S10-01 includes grounding and bonding language', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS10Block(source), 'S10-01', 'S10-02')
  assert.ok(
    block.includes('grounding') || block.includes('Grounding'),
    'S10-01 must include grounding language'
  )
  assert.ok(
    block.includes('bonding') || block.includes('Bonding'),
    'S10-01 must include bonding language'
  )
})

// ===========================================================================
// 5. S10-02 fieldChecklist count
// ===========================================================================

test('S10-02 has at least 6 fieldChecklist items', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS10Block(source), 'S10-02', 'S10-03')
  const count = countFieldChecklistItems(block)
  assert.ok(count >= 6, `S10-02 must have at least 6 fieldChecklist items, found ${count}`)
})

// ===========================================================================
// 6. S10-02 wet-area circuit language
// ===========================================================================

test('S10-02 includes wet-area circuit language', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS10Block(source), 'S10-02', 'S10-03')
  assert.ok(
    block.includes('bathroom') || block.includes('kitchen') || block.includes('garage') || block.includes('laundry'),
    'S10-02 must include wet-area circuit language such as bathroom, kitchen, garage, or laundry'
  )
})

// ===========================================================================
// 7. S10-02 EV charger language is conditional
// ===========================================================================

test('S10-02 includes EV charger or conduit language with conditional wording', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS10Block(source), 'S10-02', 'S10-03')
  assert.ok(
    block.includes('EV') || block.includes('charger') || block.includes('conduit'),
    'S10-02 must reference EV charger or conduit provisions'
  )
  assert.ok(
    block.includes('where') || block.includes('applicable') || block.includes('permit'),
    'S10-02 EV/conduit reference must use conditional language'
  )
})

// ===========================================================================
// 8. S10-02 AFCI/GFCI language is conditional
// ===========================================================================

test('S10-02 includes AFCI/GFCI language with conditional wording', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS10Block(source), 'S10-02', 'S10-03')
  assert.ok(
    block.includes('AFCI') || block.includes('GFCI'),
    'S10-02 must include AFCI/GFCI language'
  )
  assert.ok(
    block.includes('where') || block.includes('applicable'),
    'S10-02 AFCI/GFCI language must be conditional'
  )
})

// ===========================================================================
// 9. S10-03 fieldChecklist count
// ===========================================================================

test('S10-03 has at least 5 fieldChecklist items', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS10Block(source), 'S10-03', 'S10-04')
  const count = countFieldChecklistItems(block)
  assert.ok(count >= 5, `S10-03 must have at least 5 fieldChecklist items, found ${count}`)
})

// ===========================================================================
// 10. S10-03 smoke alarm / CO language
// ===========================================================================

test('S10-03 includes smoke alarm and CO interconnect language', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS10Block(source), 'S10-03', 'S10-04')
  assert.ok(
    block.includes('smoke') || block.includes('Smoke'),
    'S10-03 must include smoke alarm language'
  )
  assert.ok(
    block.includes('CO') || block.includes('carbon monoxide'),
    'S10-03 must include CO detector language'
  )
})

// ===========================================================================
// 11. S10-04 exists and includes Technical Safety BC language
// ===========================================================================

test('S10-04 exists and includes Technical Safety BC language', () => {
  const source = read(COMPLETION)
  const block = getS10Block(source)
  assert.ok(block.includes("code: 'S10-04'"), 'S10-04 must exist')
  const container = getContainerBlock(block, 'S10-04')
  assert.ok(
    container.includes('Technical Safety BC') || container.includes('TSBC'),
    'S10-04 must include Technical Safety BC language'
  )
})

// ===========================================================================
// 12. S10-04 fieldChecklist count
// ===========================================================================

test('S10-04 has at least 4 fieldChecklist items', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS10Block(source), 'S10-04')
  const count = countFieldChecklistItems(block)
  assert.ok(count >= 4, `S10-04 must have at least 4 fieldChecklist items, found ${count}`)
})

// ===========================================================================
// 13. Every S10 container has responsibleParty: Inspector
// ===========================================================================

test('every S10 container has responsibleParty: Inspector', () => {
  const source = read(COMPLETION)
  const block = getS10Block(source)
  const codes = ['S10-01', 'S10-02', 'S10-03', 'S10-04']
  for (let i = 0; i < codes.length; i++) {
    const container = getContainerBlock(block, codes[i], codes[i + 1])
    assert.ok(
      container.includes("responsibleParty: 'Inspector'"),
      `${codes[i]} must have responsibleParty: Inspector`
    )
  }
})

// ===========================================================================
// 14. Every S10 container has codeReferences
// ===========================================================================

test('every S10 container has codeReferences', () => {
  const source = read(COMPLETION)
  const block = getS10Block(source)
  const codes = ['S10-01', 'S10-02', 'S10-03', 'S10-04']
  for (let i = 0; i < codes.length; i++) {
    const container = getContainerBlock(block, codes[i], codes[i + 1])
    assert.ok(container.includes('codeReferences'), `${codes[i]} must have codeReferences`)
    assert.ok(container.includes('legalReference'), `${codes[i]} codeReferences must include a legalReference`)
  }
})

// ===========================================================================
// 15. At least one S10 codeReferences entry has isVbblOnly: true
// ===========================================================================

test('at least one S10 codeReferences entry has isVbblOnly: true', () => {
  const source = read(COMPLETION)
  const block = getS10Block(source)
  assert.ok(block.includes('isVbblOnly: true'), 'S10 must have at least one isVbblOnly: true codeReferences entry')
})

// ===========================================================================
// 16. S10-01 depends on S08-03
// ===========================================================================

test('S10-01 depends on S08-03', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS10Block(source), 'S10-01', 'S10-02')
  assert.ok(block.includes("'S08-03'"), 'S10-01 dependencies must include S08-03')
})

// ===========================================================================
// 17. S10-04 depends on S10-03
// ===========================================================================

test('S10-04 depends on S10-03', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS10Block(source), 'S10-04')
  assert.ok(block.includes("'S10-03'"), 'S10-04 dependencies must include S10-03')
})

// ===========================================================================
// 18. S10 does not assert universal EV charger, solar, battery, or generator obligations
// ===========================================================================

test('S10 does not assert universal EV charger, solar, battery, or generator obligations', () => {
  const source = read(COMPLETION)
  const block = getS10Block(source)
  assert.ok(
    !block.includes("'EV charger installed'") && !block.includes("'Solar installed'"),
    'S10 must not assert universal EV or solar obligations as unconditional checklist items'
  )
  assert.ok(
    !block.includes("'All projects require EV'"),
    'S10 must not mandate EV for all projects'
  )
  assert.ok(
    block.includes('where') || block.includes('applicable') || block.includes('where required'),
    'S10 must include conditional language for specialty provisions'
  )
})

// ===========================================================================
// 19. S11 defines exactly 4 containers
// ===========================================================================

test('S11 defines exactly 4 containers: S11-01, S11-02, S11-03, S11-04', () => {
  const source = read(COMPLETION)
  const block = getS11Block(source)
  for (const code of ['S11-01', 'S11-02', 'S11-03', 'S11-04']) {
    assert.ok(block.includes(`code: '${code}'`), `S11 must define ${code}`)
  }
  assert.ok(!block.includes("code: 'S11-05'"), 'S11 must not define a fifth container')
})

// ===========================================================================
// 20. S11-01 fieldChecklist count
// ===========================================================================

test('S11-01 has at least 6 fieldChecklist items', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS11Block(source), 'S11-01', 'S11-02')
  const count = countFieldChecklistItems(block)
  assert.ok(count >= 6, `S11-01 must have at least 6 fieldChecklist items, found ${count}`)
})

// ===========================================================================
// 21. S11-01 includes mechanical permit language
// ===========================================================================

test('S11-01 includes mechanical permit language', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS11Block(source), 'S11-01', 'S11-02')
  assert.ok(
    block.includes('Mechanical Permit') || block.includes('mechanical permit'),
    'S11-01 must include mechanical permit language'
  )
})

// ===========================================================================
// 22. S11-01 includes heat-load calculation language
// ===========================================================================

test('S11-01 includes heat-load calculation language', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS11Block(source), 'S11-01', 'S11-02')
  assert.ok(
    block.includes('heat-load') || block.includes('heat load'),
    'S11-01 must include heat-load calculation language'
  )
})

// ===========================================================================
// 23. S11-02 fieldChecklist count
// ===========================================================================

test('S11-02 has at least 6 fieldChecklist items', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS11Block(source), 'S11-02', 'S11-03')
  const count = countFieldChecklistItems(block)
  assert.ok(count >= 6, `S11-02 must have at least 6 fieldChecklist items, found ${count}`)
})

// ===========================================================================
// 24. S11-02 includes gas pressure test documentation language
// ===========================================================================

test('S11-02 includes gas pressure test documentation language', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS11Block(source), 'S11-02', 'S11-03')
  assert.ok(
    block.includes('pressure test') || block.includes('Pressure test'),
    'S11-02 must include gas pressure test language'
  )
  assert.ok(
    block.includes('documentation') || block.includes('record') || block.includes('on file'),
    'S11-02 pressure test language must reference documentation'
  )
})

// ===========================================================================
// 25. S11-02 includes gas shutoff language
// ===========================================================================

test('S11-02 includes gas shutoff language', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS11Block(source), 'S11-02', 'S11-03')
  assert.ok(
    block.includes('shutoff') || block.includes('shut-off'),
    'S11-02 must include gas shutoff language'
  )
})

// ===========================================================================
// 26. S11-02 includes venting clearance language
// ===========================================================================

test('S11-02 includes appliance venting and clearance language', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS11Block(source), 'S11-02', 'S11-03')
  assert.ok(
    block.includes('venting') || block.includes('Venting'),
    'S11-02 must include venting language'
  )
  assert.ok(
    block.includes('clearance') || block.includes('termination'),
    'S11-02 must include clearance or termination language for venting'
  )
})

// ===========================================================================
// 27. S11-03 fieldChecklist count
// ===========================================================================

test('S11-03 has at least 5 fieldChecklist items', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS11Block(source), 'S11-03', 'S11-04')
  const count = countFieldChecklistItems(block)
  assert.ok(count >= 5, `S11-03 must have at least 5 fieldChecklist items, found ${count}`)
})

// ===========================================================================
// 28. S11-03 includes HRV/ERV language
// ===========================================================================

test('S11-03 includes HRV/ERV language', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS11Block(source), 'S11-03', 'S11-04')
  assert.ok(
    block.includes('HRV') || block.includes('ERV'),
    'S11-03 must include HRV or ERV language'
  )
})

// ===========================================================================
// 29. S11-03 includes fire damper or rated penetration language
// ===========================================================================

test('S11-03 includes fire damper or rated penetration language', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS11Block(source), 'S11-03', 'S11-04')
  assert.ok(
    block.includes('fire') || block.includes('Fire') || block.includes('damper'),
    'S11-03 must include fire damper or fire-rated penetration language'
  )
  assert.ok(
    block.includes('damper') || block.includes('penetration') || block.includes('firestopping'),
    'S11-03 must include damper, penetration, or firestopping language'
  )
})

// ===========================================================================
// 30. S11-03 includes condensate drainage language
// ===========================================================================

test('S11-03 includes condensate drainage language', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS11Block(source), 'S11-03', 'S11-04')
  assert.ok(
    block.includes('condensate') || block.includes('Condensate'),
    'S11-03 must include condensate drainage language'
  )
})

// ===========================================================================
// 31. S11-04 includes Technical Safety BC / gas inspection language
// ===========================================================================

test('S11-04 includes Technical Safety BC or gas inspection language', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS11Block(source), 'S11-04')
  assert.ok(
    block.includes('Technical Safety BC') || block.includes('gas inspection'),
    'S11-04 must include Technical Safety BC or gas inspection language'
  )
})

// ===========================================================================
// 32. S11-04 includes Declaration of Inspection language
// ===========================================================================

test('S11-04 includes Declaration of Inspection language', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS11Block(source), 'S11-04')
  assert.ok(
    block.includes('Declaration of Inspection') || block.includes('declaration'),
    'S11-04 must include Declaration of Inspection language'
  )
})

// ===========================================================================
// 33. Every S11 container has responsibleParty: Inspector
// ===========================================================================

test('every S11 container has responsibleParty: Inspector', () => {
  const source = read(COMPLETION)
  const block = getS11Block(source)
  const codes = ['S11-01', 'S11-02', 'S11-03', 'S11-04']
  for (let i = 0; i < codes.length; i++) {
    const container = getContainerBlock(block, codes[i], codes[i + 1])
    assert.ok(
      container.includes("responsibleParty: 'Inspector'"),
      `${codes[i]} must have responsibleParty: Inspector`
    )
  }
})

// ===========================================================================
// 34. S11-04 does not have responsibleParty: AHJ
// ===========================================================================

test('S11-04 does not have responsibleParty: AHJ', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS11Block(source), 'S11-04')
  assert.ok(
    !block.includes("responsibleParty: 'AHJ'"),
    'S11-04 must not have responsibleParty: AHJ'
  )
})

// ===========================================================================
// 35. Every S11 container has codeReferences
// ===========================================================================

test('every S11 container has codeReferences', () => {
  const source = read(COMPLETION)
  const block = getS11Block(source)
  const codes = ['S11-01', 'S11-02', 'S11-03', 'S11-04']
  for (let i = 0; i < codes.length; i++) {
    const container = getContainerBlock(block, codes[i], codes[i + 1])
    assert.ok(container.includes('codeReferences'), `${codes[i]} must have codeReferences`)
    assert.ok(container.includes('legalReference'), `${codes[i]} codeReferences must include a legalReference`)
  }
})

// ===========================================================================
// 36. At least one S11 codeReferences entry has isVbblOnly: true
// ===========================================================================

test('at least one S11 codeReferences entry has isVbblOnly: true', () => {
  const source = read(COMPLETION)
  const block = getS11Block(source)
  assert.ok(block.includes('isVbblOnly: true'), 'S11 must have at least one isVbblOnly: true codeReferences entry')
})

// ===========================================================================
// 37. S12-01 dependencies include S10-04 and S11-04, not S10-03 and S11-03
// ===========================================================================

test('S12-01 dependencies include S10-04 and S11-04', () => {
  const source = read(COMPLETION)
  const s1201Start = source.indexOf("code: 'S12-01'")
  assert.ok(s1201Start !== -1, 'S12-01 must exist')
  const s1202Start = source.indexOf("code: 'S12-02'")
  const block = source.slice(s1201Start, s1202Start !== -1 ? s1202Start : s1201Start + 5000)
  assert.ok(block.includes("'S10-04'"), 'S12-01 dependencies must include S10-04')
  assert.ok(block.includes("'S11-04'"), 'S12-01 dependencies must include S11-04')
  assert.ok(!block.includes("'S10-03'"), 'S12-01 dependencies must not include S10-03')
  assert.ok(!block.includes("'S11-03'"), 'S12-01 dependencies must not include S11-03')
})

// ===========================================================================
// 38. Stage 9 content is not modified
// ===========================================================================

test('Stage 9 content is not modified by Batch 5', () => {
  const source = read(COMPLETION)
  const block = getS9Block(source)
  for (const code of ['S09-01', 'S09-02', 'S09-03', 'S09-04', 'S09-05']) {
    assert.ok(block.includes(`code: '${code}'`), `S09 block must still define ${code}`)
  }
  assert.ok(block.includes('DWV test'), 'S09 DWV test language must be preserved')
  assert.ok(
    block.includes('backwater valve') || block.includes('Backwater valve'),
    'S09 backwater valve language must be preserved'
  )
})

// ===========================================================================
// 39. S12 content is not modified except S12-01 dependency
// ===========================================================================

test('S12 defines four containers S12-01 through S12-04', () => {
  const source = read(COMPLETION)
  const block = getS12Block(source)
  for (const code of ['S12-01', 'S12-02', 'S12-03', 'S12-04']) {
    assert.ok(block.includes(`code: '${code}'`), `S12 block must define ${code}`)
  }
})

// ===========================================================================
// 40. Schedule C-B route is not contaminated
// ===========================================================================

test('Schedule C-B route does not reference S10-04 or S11-04', () => {
  const source = read(SCHEDULE_CB)
  assert.ok(!source.includes('S10-04'), 'Schedule C-B must not reference S10-04')
  assert.ok(!source.includes('S11-04'), 'Schedule C-B must not reference S11-04')
  assert.ok(!source.includes('Technical Safety BC'), 'Schedule C-B must not reference Technical Safety BC from Batch 5')
})

// ===========================================================================
// 41. Final occupancy route is not contaminated
// ===========================================================================

test('final-occupancy route does not reference S10-04 or S11-04', () => {
  const source = read(FINAL_OCC)
  assert.ok(!source.includes('S10-04'), 'Final occupancy must not reference S10-04')
  assert.ok(!source.includes('S11-04'), 'Final occupancy must not reference S11-04')
})

// ===========================================================================
// 42. InspectorCompletionWorkspace routing logic is preserved
// ===========================================================================

test('InspectorCompletionWorkspace routing logic is preserved', () => {
  const source = read(WORKSPACE)
  assert.ok(source.includes('DISCIPLINE_STAGE_OVERRIDE'), 'DISCIPLINE_STAGE_OVERRIDE must be preserved')
  assert.ok(source.includes('usesFieldView && item.responsible_party'), 'usesFieldView gate must be preserved')
  assert.ok(source.includes('PILOT_S9_CODE_REFS'), 'PILOT_S9_CODE_REFS must be preserved')
})

// ===========================================================================
// 43. S11-02 is gas-focused, not the old ventilation container
// ===========================================================================

test('S11-02 is gas piping focused and includes gas shutoff and pressure test language', () => {
  const source = read(COMPLETION)
  const block = getContainerBlock(getS11Block(source), 'S11-02', 'S11-03')
  assert.ok(
    block.includes('Gas Piping') || block.includes('gas piping'),
    'S11-02 must be gas piping focused'
  )
  assert.ok(
    block.includes('shutoff') || block.includes('shut-off'),
    'S11-02 must include shutoff language'
  )
  assert.ok(
    block.includes('pressure test') || block.includes('Pressure test'),
    'S11-02 must include pressure test language'
  )
})

// ===========================================================================
// 44. S11-01 depends on S08-03; S11-04 depends on S11-03
// ===========================================================================

test('S11-01 depends on S08-03 and S11-04 depends on S11-03', () => {
  const source = read(COMPLETION)
  const block = getS11Block(source)
  const s1101 = getContainerBlock(block, 'S11-01', 'S11-02')
  assert.ok(s1101.includes("'S08-03'"), 'S11-01 dependencies must include S08-03')
  const s1104 = getContainerBlock(block, 'S11-04')
  assert.ok(s1104.includes("'S11-03'"), 'S11-04 dependencies must include S11-03')
})
