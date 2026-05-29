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

function getS04Block(source: string): string {
  return getStageBlock(source, 'STRUCTURAL_STAGE_4_CONTAINERS', 'STRUCTURAL_STAGE_5_CONTAINERS')
}

function getS05Block(source: string): string {
  return getStageBlock(source, 'STRUCTURAL_STAGE_5_CONTAINERS', 'STRUCTURAL_STAGE_6_CONTAINERS')
}

function getS09Block(source: string): string {
  return getStageBlock(source, 'STRUCTURAL_STAGE_9_CONTAINERS', 'STRUCTURAL_STAGE_10_CONTAINERS')
}

// ===========================================================================
// 1. S04 defines at least four containers
// ===========================================================================

test('S04 defines at least four item containers', () => {
  const source = read(COMPLETION)
  const block = getS04Block(source)
  for (const code of ['S04-01', 'S04-02', 'S04-03', 'S04-04']) {
    assert.ok(block.includes(`code: '${code}'`), `S04 block must define ${code}`)
  }
})

// ===========================================================================
// 2. S04 includes utility locate language
// ===========================================================================

test('S04 includes utility locate language', () => {
  const source = read(COMPLETION)
  const block = getS04Block(source)
  assert.ok(
    block.includes('utility locate') || block.includes('utility locates') || block.includes('underground service'),
    'S04 must include utility locate or underground service language'
  )
})

// ===========================================================================
// 3. S04 includes survey / siting / setback language
// ===========================================================================

test('S04 includes survey, siting, and setback language', () => {
  const source = read(COMPLETION)
  const block = getS04Block(source)
  assert.ok(
    block.includes('survey') || block.includes('Survey'),
    'S04 must include survey language'
  )
  assert.ok(
    block.includes('setback') || block.includes('Setback'),
    'S04 must include setback language'
  )
  assert.ok(
    block.includes('siting') || block.includes('Siting'),
    'S04 must include siting language'
  )
})

// ===========================================================================
// 4. S04 includes flood construction level or floodplain language
// ===========================================================================

test('S04 includes flood construction level or floodplain language where applicable', () => {
  const source = read(COMPLETION)
  const block = getS04Block(source)
  assert.ok(
    block.includes('flood construction level') || block.includes('Flood construction level') ||
    block.includes('floodplain') || block.includes('Floodplain'),
    'S04 must include flood construction level or floodplain language'
  )
})

// ===========================================================================
// 5. S04 includes geotechnical / subgrade / soil condition language
// ===========================================================================

test('S04 includes geotechnical, subgrade, and soil condition language', () => {
  const source = read(COMPLETION)
  const block = getS04Block(source)
  assert.ok(
    block.includes('geotechnical') || block.includes('Geotechnical'),
    'S04 must include geotechnical language'
  )
  assert.ok(
    block.includes('subgrade') || block.includes('Subgrade'),
    'S04 must include subgrade language'
  )
  assert.ok(
    block.includes('soil condition') || block.includes('Soil condition'),
    'S04 must include soil condition language'
  )
})

// ===========================================================================
// 6. S04 includes tree protection / root zone / arborist language
// ===========================================================================

test('S04 includes tree protection, root zone, and arborist language', () => {
  const source = read(COMPLETION)
  const block = getS04Block(source)
  assert.ok(
    block.includes('tree protection') || block.includes('Tree protection'),
    'S04 must include tree protection language'
  )
  assert.ok(
    block.includes('root zone') || block.includes('root-zone'),
    'S04 must include root zone language'
  )
  assert.ok(
    block.includes('arborist') || block.includes('Arborist'),
    'S04 must include arborist language'
  )
})

// ===========================================================================
// 7. S04 includes erosion and sediment control language
// ===========================================================================

test('S04 includes erosion and sediment control language', () => {
  const source = read(COMPLETION)
  const block = getS04Block(source)
  assert.ok(
    block.includes('erosion') || block.includes('Erosion'),
    'S04 must include erosion language'
  )
  assert.ok(
    block.includes('sediment') || block.includes('Sediment'),
    'S04 must include sediment control language'
  )
})

// ===========================================================================
// 8. S04 includes temporary drainage / runoff / dewatering language
// ===========================================================================

test('S04 includes temporary drainage, runoff, and dewatering language', () => {
  const source = read(COMPLETION)
  const block = getS04Block(source)
  assert.ok(
    block.includes('temporary drainage') || block.includes('Temporary drainage'),
    'S04 must include temporary drainage language'
  )
  assert.ok(
    block.includes('runoff') || block.includes('Runoff'),
    'S04 must include runoff language'
  )
  assert.ok(
    block.includes('dewatering') || block.includes('Dewatering'),
    'S04 must include dewatering language'
  )
})

// ===========================================================================
// 9. S04 includes WorkSafeBC / site-safety distinction language
// ===========================================================================

test('S04 includes WorkSafeBC site-safety distinction language', () => {
  const source = read(COMPLETION)
  const block = getS04Block(source)
  assert.ok(
    block.includes('WorkSafeBC'),
    'S04 must include WorkSafeBC language'
  )
  assert.ok(
    block.includes('safety observation') || block.includes('safety observations'),
    'S04 must identify WorkSafeBC items as safety observations, not approval items'
  )
})

// ===========================================================================
// 10. Every S04 item includes required content fields and codeReferences
// ===========================================================================

test('every S04 item includes fieldChecklist, passWhen, failWhen, pendingWhen, stopIf, requiredEvidence, and codeReferences', () => {
  const source = read(COMPLETION)
  const block = getS04Block(source)
  const codes = ['S04-01', 'S04-02', 'S04-03', 'S04-04']
  const requiredFields = ['fieldChecklist', 'passWhen', 'failWhen', 'pendingWhen', 'stopIf', 'requiredEvidence', 'codeReferences']
  for (let i = 0; i < codes.length; i++) {
    const itemStart = block.indexOf(`code: '${codes[i]}'`)
    const itemEnd = i + 1 < codes.length
      ? block.indexOf(`code: '${codes[i + 1]}'`)
      : block.length
    const itemBlock = block.slice(itemStart, itemEnd)
    for (const field of requiredFields) {
      assert.ok(itemBlock.includes(field), `${codes[i]} must include ${field}`)
    }
  }
})

// ===========================================================================
// 11. S05 defines S05-04
// ===========================================================================

test('S05 defines S05-04', () => {
  const source = read(COMPLETION)
  const block = getS05Block(source)
  assert.ok(block.includes("code: 'S05-04'"), 'S05 block must define S05-04')
})

// ===========================================================================
// 12. S05-04 includes delivery ticket / batch information language
// ===========================================================================

test('S05-04 includes delivery ticket and batch information language', () => {
  const source = read(COMPLETION)
  const s05_04Start = source.indexOf("code: 'S05-04'")
  const stage6Start = source.indexOf('STRUCTURAL_STAGE_6_CONTAINERS')
  assert.ok(s05_04Start !== -1, 'S05-04 must be defined')
  const block = source.slice(s05_04Start, stage6Start)
  assert.ok(
    block.includes('delivery ticket') || block.includes('batch information'),
    'S05-04 must include delivery ticket or batch information language'
  )
})

// ===========================================================================
// 13. S05-04 includes slump / temperature / mix design language
// ===========================================================================

test('S05-04 includes slump, temperature, and mix design language where applicable', () => {
  const source = read(COMPLETION)
  const s05_04Start = source.indexOf("code: 'S05-04'")
  const stage6Start = source.indexOf('STRUCTURAL_STAGE_6_CONTAINERS')
  const block = source.slice(s05_04Start, stage6Start)
  assert.ok(
    block.includes('slump') || block.includes('Slump'),
    'S05-04 must include slump language'
  )
  assert.ok(
    block.includes('temperature') || block.includes('Temperature'),
    'S05-04 must include temperature language'
  )
  assert.ok(
    block.includes('mix design') || block.includes('Mix design'),
    'S05-04 must include mix design language'
  )
})

// ===========================================================================
// 14. S05-04 includes cold-weather or hot-weather protection language
// ===========================================================================

test('S05-04 includes cold-weather or hot-weather protection language where applicable', () => {
  const source = read(COMPLETION)
  const s05_04Start = source.indexOf("code: 'S05-04'")
  const stage6Start = source.indexOf('STRUCTURAL_STAGE_6_CONTAINERS')
  const block = source.slice(s05_04Start, stage6Start)
  assert.ok(
    block.includes('cold-weather') || block.includes('cold weather') || block.includes('Cold-weather'),
    'S05-04 must include cold-weather language'
  )
  assert.ok(
    block.includes('hot-weather') || block.includes('hot weather') || block.includes('Hot-weather'),
    'S05-04 must include hot-weather language'
  )
})

// ===========================================================================
// 15. S05-04 includes curing language
// ===========================================================================

test('S05-04 includes curing language', () => {
  const source = read(COMPLETION)
  const s05_04Start = source.indexOf("code: 'S05-04'")
  const stage6Start = source.indexOf('STRUCTURAL_STAGE_6_CONTAINERS')
  const block = source.slice(s05_04Start, stage6Start)
  assert.ok(
    block.includes('curing') || block.includes('Curing'),
    'S05-04 must include curing language'
  )
})

// ===========================================================================
// 16. S05-04 includes cylinder / test report language where specified
// ===========================================================================

test('S05-04 includes cylinder test and field test report language', () => {
  const source = read(COMPLETION)
  const s05_04Start = source.indexOf("code: 'S05-04'")
  const stage6Start = source.indexOf('STRUCTURAL_STAGE_6_CONTAINERS')
  const block = source.slice(s05_04Start, stage6Start)
  assert.ok(
    block.includes('cylinder') || block.includes('Cylinder'),
    'S05-04 must include cylinder test language'
  )
  assert.ok(
    block.includes('test report') || block.includes('field test'),
    'S05-04 must include test report language'
  )
})

// ===========================================================================
// 17. S05-04 includes honeycombing / voids / visible defect language
// ===========================================================================

test('S05-04 includes honeycombing, voids, and visible defect language', () => {
  const source = read(COMPLETION)
  const s05_04Start = source.indexOf("code: 'S05-04'")
  const stage6Start = source.indexOf('STRUCTURAL_STAGE_6_CONTAINERS')
  const block = source.slice(s05_04Start, stage6Start)
  assert.ok(
    block.includes('honeycombing') || block.includes('Honeycombing'),
    'S05-04 must include honeycombing language'
  )
  assert.ok(
    block.includes('void') || block.includes('voids'),
    'S05-04 must include voids language'
  )
})

// ===========================================================================
// 18. S05 includes rebar size / spacing / cover / lap language
// ===========================================================================

test('S05 includes rebar size, spacing, cover, and lap language', () => {
  const source = read(COMPLETION)
  const block = getS05Block(source)
  assert.ok(
    block.includes('rebar size') || block.includes('Rebar size'),
    'S05 must include rebar size language'
  )
  assert.ok(
    block.includes('spacing') || block.includes('Spacing'),
    'S05 must include rebar spacing language'
  )
  assert.ok(
    block.includes('cover') || block.includes('Cover'),
    'S05 must include rebar cover language'
  )
  assert.ok(
    block.includes('lap length') || block.includes('lap lengths'),
    'S05 must include lap length language'
  )
})

// ===========================================================================
// 19. S05 includes anchor bolts / hold-downs / embeds language
// ===========================================================================

test('S05 includes anchor bolts, hold-downs, and embeds language', () => {
  const source = read(COMPLETION)
  const block = getS05Block(source)
  assert.ok(
    block.includes('anchor bolt') || block.includes('Anchor bolt'),
    'S05 must include anchor bolt language'
  )
  assert.ok(
    block.includes('hold-down') || block.includes('hold-downs'),
    'S05 must include hold-down language'
  )
  assert.ok(
    block.includes('embed') || block.includes('Embed'),
    'S05 must include embedded items language'
  )
})

// ===========================================================================
// 20. S05 includes radon / soil gas / vapour barrier language
// ===========================================================================

test('S05 includes radon, soil gas, and vapour barrier language', () => {
  const source = read(COMPLETION)
  const block = getS05Block(source)
  assert.ok(
    block.includes('radon') || block.includes('Radon'),
    'S05 must include radon language'
  )
  assert.ok(
    block.includes('soil gas') || block.includes('Soil gas'),
    'S05 must include soil gas language'
  )
  assert.ok(
    block.includes('vapour barrier') || block.includes('vapor barrier'),
    'S05 must include vapour barrier language'
  )
})

// ===========================================================================
// 21. S06-01 depends on S05-04
// ===========================================================================

test('S06-01 depends on S05-04 as the terminal S05 container', () => {
  const source = read(COMPLETION)
  const s06_01Start = source.indexOf("code: 'S06-01'")
  const s06_02Start = source.indexOf("code: 'S06-02'")
  assert.ok(s06_01Start !== -1, 'S06-01 must be defined')
  assert.ok(s06_02Start !== -1, 'S06-02 must be defined')
  const block = source.slice(s06_01Start, s06_02Start)
  assert.ok(
    block.includes("'S05-04'"),
    "S06-01 dependencies must reference 'S05-04' as the terminal S05 container"
  )
})

// ===========================================================================
// 22. Stage 9 content is not modified or reduced
// ===========================================================================

test('S09 still defines five containers S09-01 through S09-05', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  for (const code of ['S09-01', 'S09-02', 'S09-03', 'S09-04', 'S09-05']) {
    assert.ok(block.includes(`code: '${code}'`), `S09 block must still define ${code} after Batch 2`)
  }
})

test('S09 still includes DWV test language', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(block.includes('DWV test'), 'S09 DWV test language must not be removed by Batch 2')
})

test('S09 still includes backwater valve language', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(
    block.includes('backwater valve') || block.includes('Backwater valve'),
    'S09 backwater valve language must not be removed by Batch 2'
  )
})

// ===========================================================================
// 23. Schedule C-B route is not modified
// ===========================================================================

test('Schedule C-B route does not reference S04 or S05 new metadata fields', () => {
  const source = read(SCHEDULE_CB)
  assert.ok(!source.includes('S04-03'), 'Schedule C-B must not reference S04-03')
  assert.ok(!source.includes('S04-04'), 'Schedule C-B must not reference S04-04')
  assert.ok(!source.includes('S05-04'), 'Schedule C-B must not reference S05-04')
  assert.ok(!source.includes('honeycombing'), 'Schedule C-B must not reference honeycombing from Batch 2')
  assert.ok(!source.includes('dewatering'), 'Schedule C-B must not reference dewatering from Batch 2')
})

// ===========================================================================
// 24. Final occupancy route is not modified
// ===========================================================================

test('final-occupancy route does not reference S04 or S05 items added in Batch 2', () => {
  const source = read(FINAL_OCC)
  assert.ok(!source.includes('S04-03'), 'Final occupancy must not reference S04-03')
  assert.ok(!source.includes('S04-04'), 'Final occupancy must not reference S04-04')
  assert.ok(!source.includes('S05-04'), 'Final occupancy must not reference S05-04')
})

// ===========================================================================
// 25. No prohibited files changed
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
