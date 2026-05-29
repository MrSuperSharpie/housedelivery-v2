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

function getS06Block(source: string): string {
  return getStageBlock(source, 'STRUCTURAL_STAGE_6_CONTAINERS', 'STRUCTURAL_STAGE_7_CONTAINERS')
}

function getS07Block(source: string): string {
  return getStageBlock(source, 'STRUCTURAL_STAGE_7_CONTAINERS', 'STRUCTURAL_STAGE_8_CONTAINERS')
}

function getS08Block(source: string): string {
  return getStageBlock(source, 'STRUCTURAL_STAGE_8_CONTAINERS', 'STRUCTURAL_STAGE_9_CONTAINERS')
}

function getS09Block(source: string): string {
  return getStageBlock(source, 'STRUCTURAL_STAGE_9_CONTAINERS', 'STRUCTURAL_STAGE_10_CONTAINERS')
}

// ===========================================================================
// 1. S06 includes truss layout / truss bracing language
// ===========================================================================

test('S06 includes truss layout and truss bracing language', () => {
  const source = read(COMPLETION)
  const block = getS06Block(source)
  assert.ok(
    block.includes('truss layout') || block.includes('Truss layout'),
    'S06 must include truss layout language'
  )
  assert.ok(
    block.includes('truss bracing') || block.includes('Truss bracing'),
    'S06 must include truss bracing language'
  )
})

// ===========================================================================
// 2. S06 includes engineered wood product language
// ===========================================================================

test('S06 includes engineered wood product language', () => {
  const source = read(COMPLETION)
  const block = getS06Block(source)
  assert.ok(
    block.includes('LVL') || block.includes('engineered wood') || block.includes('I-joists'),
    'S06 must include engineered wood product language (LVL, PSL, I-joists, or engineered wood)'
  )
})

// ===========================================================================
// 3. S06 includes posts / beams / point loads / load path language
// ===========================================================================

test('S06 includes posts, beams, point loads, and load path language', () => {
  const source = read(COMPLETION)
  const block = getS06Block(source)
  assert.ok(
    block.includes('point load') || block.includes('point-load'),
    'S06 must include point load language'
  )
  assert.ok(
    block.includes('load path') || block.includes('load-path'),
    'S06 must include load path language'
  )
  assert.ok(
    block.includes('Posts') || block.includes('posts'),
    'S06 must include posts language'
  )
  assert.ok(
    block.includes('beams') || block.includes('Beams'),
    'S06 must include beams language'
  )
})

// ===========================================================================
// 4. S06 includes lateral load path / shear / hold-down / connector language
// ===========================================================================

test('S06 includes lateral load path, shear wall, hold-down, and connector language', () => {
  const source = read(COMPLETION)
  const block = getS06Block(source)
  assert.ok(
    block.includes('shear wall') || block.includes('Shear wall'),
    'S06 must include shear wall language'
  )
  assert.ok(
    block.includes('hold-down') || block.includes('Hold-down'),
    'S06 must include hold-down language'
  )
  assert.ok(
    block.includes('connector') || block.includes('Connector'),
    'S06 must include connector language'
  )
  assert.ok(
    block.includes('braced wall panel') || block.includes('Braced wall panel'),
    'S06 must include braced wall panel language'
  )
})

// ===========================================================================
// 5. S06 includes notching / drilling / holes / penetrations language
// ===========================================================================

test('S06 includes notching, drilling, holes, and penetrations language', () => {
  const source = read(COMPLETION)
  const block = getS06Block(source)
  assert.ok(
    block.includes('Notching') || block.includes('notching'),
    'S06 must include notching language'
  )
  assert.ok(
    block.includes('drilling') || block.includes('Drilling'),
    'S06 must include drilling language'
  )
  assert.ok(
    block.includes('holes') || block.includes('penetrations'),
    'S06 must include holes or penetrations language'
  )
})

// ===========================================================================
// 6. S06 includes stair rough opening / guard blocking language where applicable
// ===========================================================================

test('S06 includes stair rough opening and guard blocking language where applicable', () => {
  const source = read(COMPLETION)
  const block = getS06Block(source)
  assert.ok(
    block.includes('rough opening') || block.includes('rough openings'),
    'S06 must include stair rough opening language'
  )
  assert.ok(
    block.includes('guard') || block.includes('Guard'),
    'S06 must include guard language'
  )
  assert.ok(
    block.includes('guard, handrail, and opening-protection') || block.includes('guard, handrail'),
    'S06 must include guard, handrail, and opening-protection language instead of fall-protection language'
  )
})

// ===========================================================================
// 7. S06 includes fire separation framing language where applicable
// ===========================================================================

test('S06 includes fire separation framing language where applicable', () => {
  const source = read(COMPLETION)
  const block = getS06Block(source)
  assert.ok(
    block.includes('fire separation') || block.includes('fire-separation'),
    'S06 must include fire separation language where applicable'
  )
  assert.ok(
    block.includes('fire blocking') || block.includes('fire-blocking'),
    'S06 must include fire blocking language'
  )
  assert.ok(
    block.includes('rated') || block.includes('rated assembly'),
    'S06 must include rated assembly language'
  )
})

// ===========================================================================
// 8. S06 includes professional field review language where applicable
// ===========================================================================

test('S06 includes professional field review language where applicable', () => {
  const source = read(COMPLETION)
  const block = getS06Block(source)
  assert.ok(
    block.includes('field review') || block.includes('professional field review'),
    'S06 must include professional field review language where applicable'
  )
  assert.ok(
    block.includes('Part 4') || block.includes('engineering report'),
    'S06 must include Part 4 engineering or engineering report language'
  )
})

// ===========================================================================
// S06 codeReferences — every item includes codeReferences with at least one legalReference
// ===========================================================================

test('every S06 item includes codeReferences with at least one legalReference', () => {
  const source = read(COMPLETION)
  const block = getS06Block(source)
  const codes = ['S06-01', 'S06-02', 'S06-03']
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

test('S06-01 codeReferences includes structural framing, approved drawings, and Letters of Assurance language', () => {
  const source = read(COMPLETION)
  const s06_01Start = source.indexOf("code: 'S06-01'")
  const s06_02Start = source.indexOf("code: 'S06-02'")
  const block = source.slice(s06_01Start, s06_02Start)
  assert.ok(
    block.includes('structural framing') || block.includes('Approved structural drawings'),
    'S06-01 codeReferences must include structural framing or approved drawings reference language'
  )
  assert.ok(
    block.includes('engineered') || block.includes('truss'),
    'S06-01 codeReferences must include engineered component or truss reference language'
  )
  assert.ok(
    block.includes('Letters of Assurance') || block.includes('Schedule B'),
    'S06-01 codeReferences must include Letters of Assurance or Schedule B reference language'
  )
})

test('S06-02 codeReferences includes lateral, seismic, and structural schedule reference language', () => {
  const source = read(COMPLETION)
  const s06_02Start = source.indexOf("code: 'S06-02'")
  const s06_03Start = source.indexOf("code: 'S06-03'")
  const block = source.slice(s06_02Start, s06_03Start)
  assert.ok(
    block.includes('lateral') || block.includes('seismic'),
    'S06-02 codeReferences must include lateral or seismic reference language'
  )
  assert.ok(
    block.includes('shear wall schedule') || block.includes('braced wall panel') || block.includes('hold-down schedule') || block.includes('structural notes'),
    'S06-02 codeReferences must include structural schedule or braced wall panel reference language'
  )
})

test('S06-03 codeReferences includes stairs, guards, fire separation framing, and Letters of Assurance language', () => {
  const source = read(COMPLETION)
  const s06_03Start = source.indexOf("code: 'S06-03'")
  const s07Start = source.indexOf('STRUCTURAL_STAGE_7_CONTAINERS')
  const block = source.slice(s06_03Start, s07Start)
  assert.ok(
    block.includes('stairs') || block.includes('guards') || block.includes('handrails'),
    'S06-03 codeReferences must include stairs, guards, or handrails reference language'
  )
  assert.ok(
    block.includes('fire separation framing') || block.includes('rated assemblies') || block.includes('rated assembly'),
    'S06-03 codeReferences must include fire separation framing or rated assemblies reference language'
  )
  assert.ok(
    block.includes('Letters of Assurance') || block.includes('Schedule B'),
    'S06-03 codeReferences must include Letters of Assurance or Schedule B reference language'
  )
})

test('S06 does not contain fall-protection blocking or fall-protection backing language', () => {
  const source = read(COMPLETION)
  const block = getS06Block(source)
  assert.ok(
    !block.includes('fall-protection blocking'),
    'S06 must not contain "fall-protection blocking" — use guard/handrail/opening-protection language'
  )
  assert.ok(
    !block.includes('fall-protection backing'),
    'S06 must not contain "fall-protection backing" — use guard/handrail/opening-protection language'
  )
})

test('S06 contains guard, handrail, and opening-protection language', () => {
  const source = read(COMPLETION)
  const block = getS06Block(source)
  assert.ok(
    block.includes('guard, handrail, and opening-protection') || block.includes('guard, handrail'),
    'S06 must contain guard, handrail, and opening-protection language'
  )
})

test('S06 does not overstate Part 4 as the only trigger for engineering documentation', () => {
  const source = read(COMPLETION)
  const block = getS06Block(source)
  assert.ok(
    !block.includes('Part 4 engineering documentation is required when the project exceeds Part 9 limits'),
    'S06 must not overstate Part 4 as the only engineering documentation trigger'
  )
  assert.ok(
    !block.includes('If within Part 9 limits, mark as Pass or N/A'),
    'S06 must not direct inspectors to make independent Part 9 vs Part 4 scope determinations'
  )
  assert.ok(
    block.includes('AHJ conditions') && block.includes('approved drawings'),
    'S06 must reference broader engineering documentation triggers including AHJ conditions and approved drawings'
  )
})

test('S06 dependency chain is preserved S05-04 → S06-01 → S06-02 → S06-03', () => {
  const source = read(COMPLETION)
  const block = getS06Block(source)
  assert.ok(block.includes("dependencies: ['S05-04']"), 'S06-01 must depend on S05-04')
  assert.ok(block.includes("dependencies: ['S06-01']"), 'S06-02 must depend on S06-01')
  assert.ok(block.includes("dependencies: ['S06-02']"), 'S06-03 must depend on S06-02')
})

// ===========================================================================
// 9. S07 defines S07-04
// ===========================================================================

test('S07 defines S07-04', () => {
  const source = read(COMPLETION)
  const block = getS07Block(source)
  assert.ok(block.includes("code: 'S07-04'"), 'S07 block must define S07-04')
})

// ===========================================================================
// 10. S07 includes WRB / weather-resistive barrier / rain-screen language
// ===========================================================================

test('S07 includes WRB, weather-resistive barrier, and rainscreen language', () => {
  const source = read(COMPLETION)
  const block = getS07Block(source)
  assert.ok(
    block.includes('WRB') || block.includes('weather-resistive barrier'),
    'S07 must include WRB or weather-resistive barrier language'
  )
  assert.ok(
    block.includes('rainscreen') || block.includes('rain-screen') || block.includes('Rainscreen'),
    'S07 must include rainscreen language'
  )
})

// ===========================================================================
// 11. S07 includes sill pan / head flashing / jamb membrane / through-wall flashing language
// ===========================================================================

test('S07 includes sill pan, head flashing, jamb membrane, and through-wall flashing language', () => {
  const source = read(COMPLETION)
  const block = getS07Block(source)
  assert.ok(
    block.includes('sill pan') || block.includes('Sill pan'),
    'S07 must include sill pan language'
  )
  assert.ok(
    block.includes('head flashing') || block.includes('Head flashing'),
    'S07 must include head flashing language'
  )
  assert.ok(
    block.includes('jamb membrane') || block.includes('jamb'),
    'S07 must include jamb membrane language'
  )
  assert.ok(
    block.includes('through-wall flashing') || block.includes('Through-wall flashing'),
    'S07 must include through-wall flashing language'
  )
})

// ===========================================================================
// 12. S07 includes penetration flashing / sealing language
// ===========================================================================

test('S07 includes penetration flashing and sealing language', () => {
  const source = read(COMPLETION)
  const block = getS07Block(source)
  assert.ok(
    block.includes('penetration') || block.includes('penetrations'),
    'S07 must include penetration language'
  )
  assert.ok(
    block.includes('sealed') || block.includes('sealing') || block.includes('gasketed'),
    'S07 must include penetration sealing language'
  )
})

// ===========================================================================
// 13. S07 includes roof drainage / gutters / scuppers / overflow language
// ===========================================================================

test('S07 includes roof drainage, gutters, scuppers, and overflow language', () => {
  const source = read(COMPLETION)
  const block = getS07Block(source)
  assert.ok(
    block.includes('gutters') || block.includes('Gutters'),
    'S07 must include gutters language'
  )
  assert.ok(
    block.includes('scuppers') || block.includes('Scuppers'),
    'S07 must include scuppers language'
  )
  assert.ok(
    block.includes('overflow') || block.includes('Overflow'),
    'S07 must include overflow language'
  )
  assert.ok(
    block.includes('drainage') || block.includes('Drainage'),
    'S07 must include roof drainage language'
  )
})

// ===========================================================================
// 14. S07 includes ventilation path / attic baffle / soffit ventilation language
// ===========================================================================

test('S07 includes ventilation path, attic baffle, and soffit ventilation language', () => {
  const source = read(COMPLETION)
  const block = getS07Block(source)
  assert.ok(
    block.includes('ventilation path') || block.includes('Ventilation path'),
    'S07 must include ventilation path language'
  )
  assert.ok(
    block.includes('attic baffle') || block.includes('Attic baffle'),
    'S07 must include attic baffle language'
  )
  assert.ok(
    block.includes('soffit ventilation') || block.includes('soffit'),
    'S07 must include soffit ventilation language'
  )
})

// ===========================================================================
// 15. S07-04 includes envelope field review / assurance language
// ===========================================================================

test('S07-04 includes envelope field review and assurance language', () => {
  const source = read(COMPLETION)
  const s07_04Start = source.indexOf("code: 'S07-04'")
  const s08Start = source.indexOf('STRUCTURAL_STAGE_8_CONTAINERS')
  assert.ok(s07_04Start !== -1, 'S07-04 must be defined')
  const block = source.slice(s07_04Start, s08Start)
  assert.ok(
    block.includes('field review') || block.includes('envelope field review'),
    'S07-04 must include envelope field review language'
  )
  assert.ok(
    block.includes('assurance') || block.includes('Assurance'),
    'S07-04 must include assurance language'
  )
  assert.ok(
    block.includes('manufacturer') || block.includes('Manufacturer'),
    'S07-04 must include manufacturer observation language'
  )
})

// ===========================================================================
// S07 codeReferences — every item includes codeReferences with at least one legalReference
// ===========================================================================

test('every S07 item includes codeReferences with at least one legalReference', () => {
  const source = read(COMPLETION)
  const block = getS07Block(source)
  const codes = ['S07-01', 'S07-02', 'S07-03', 'S07-04']
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

test('S07-01 codeReferences includes envelope, WRB, moisture control, and approved drawings language', () => {
  const source = read(COMPLETION)
  const s07_01Start = source.indexOf("code: 'S07-01'")
  const s07_02Start = source.indexOf("code: 'S07-02'")
  const block = source.slice(s07_01Start, s07_02Start)
  assert.ok(
    block.includes('building envelope') || block.includes('weather barrier') || block.includes('moisture control'),
    'S07-01 codeReferences must include building envelope, weather barrier, or moisture control reference language'
  )
  assert.ok(
    block.includes('WRB') || block.includes('weather-resistive barrier') || block.includes('rainscreen'),
    'S07-01 codeReferences must include WRB, weather-resistive barrier, or rainscreen reference language'
  )
  assert.ok(
    block.includes('Approved') || block.includes('approved permit drawings') || block.includes('manufacturer'),
    'S07-01 codeReferences must include approved drawings or manufacturer reference language'
  )
})

test('S07-02 codeReferences includes openings, flashings, penetrations, cladding, and approved details language', () => {
  const source = read(COMPLETION)
  const s07_02Start = source.indexOf("code: 'S07-02'")
  const s07_03Start = source.indexOf("code: 'S07-03'")
  const block = source.slice(s07_02Start, s07_03Start)
  assert.ok(
    block.includes('openings') || block.includes('flashings') || block.includes('penetrations'),
    'S07-02 codeReferences must include openings, flashings, or penetrations reference language'
  )
  assert.ok(
    block.includes('cladding') || block.includes('Cladding'),
    'S07-02 codeReferences must include cladding reference language'
  )
  assert.ok(
    block.includes('Approved') || block.includes('approved permit drawings') || block.includes('manufacturer installation'),
    'S07-02 codeReferences must include approved details or manufacturer installation reference language'
  )
})

test('S07-03 codeReferences includes roofing, roof drainage, ventilation, and manufacturer requirements language', () => {
  const source = read(COMPLETION)
  const s07_03Start = source.indexOf("code: 'S07-03'")
  const s07_04Start = source.indexOf("code: 'S07-04'")
  const block = source.slice(s07_03Start, s07_04Start)
  assert.ok(
    block.includes('roofing') || block.includes('roof membrane') || block.includes('roof drainage'),
    'S07-03 codeReferences must include roofing, roof membrane, or roof drainage reference language'
  )
  assert.ok(
    block.includes('ventilation') || block.includes('Ventilation'),
    'S07-03 codeReferences must include ventilation reference language'
  )
  assert.ok(
    block.includes('manufacturer') || block.includes('Manufacturer'),
    'S07-03 codeReferences must include manufacturer requirements reference language'
  )
})

test('S07-04 codeReferences includes Letters of Assurance, field review, and professional responsibility language', () => {
  const source = read(COMPLETION)
  const s07_04Start = source.indexOf("code: 'S07-04'")
  const s08Start = source.indexOf('STRUCTURAL_STAGE_8_CONTAINERS')
  const block = source.slice(s07_04Start, s08Start)
  assert.ok(
    block.includes('Letters of Assurance') || block.includes('Schedule B'),
    'S07-04 codeReferences must include Letters of Assurance or Schedule B reference language'
  )
  assert.ok(
    block.includes('field review') || block.includes('professional field review') || block.includes('professional responsibility'),
    'S07-04 codeReferences must include field review or professional responsibility reference language'
  )
  assert.ok(
    block.includes('Schedule C-B') || block.includes('Schedule B'),
    'S07-04 codeReferences must include Schedule B or Schedule C-B reference language'
  )
})

test('S07-04 uses conditional language for envelope field review and does not imply universal requirement', () => {
  const source = read(COMPLETION)
  const s07_04Start = source.indexOf("code: 'S07-04'")
  const s08Start = source.indexOf('STRUCTURAL_STAGE_8_CONTAINERS')
  const block = source.slice(s07_04Start, s08Start)
  assert.ok(
    block.includes('where triggered') || block.includes('where required') || block.includes('where applicable'),
    'S07-04 must use conditional language — field review is not universally required'
  )
  assert.ok(
    block.includes('confirmed not applicable') || block.includes('confirmed not required') || block.includes('not required'),
    'S07-04 must include path for marking envelope field review as not applicable when not triggered'
  )
  assert.ok(
    block.includes('Hold') || block.includes('qualified professional') || block.includes('AHJ') ,
    'S07-04 must include Hold or AHJ confirmation path for unclear trigger cases'
  )
})

test('S07 references Vancouver Building By-law and rain screen language as Vancouver-specific only', () => {
  const source = read(COMPLETION)
  const block = getS07Block(source)
  if (block.includes('Vancouver Building By-law') || block.includes('rain screen cladding')) {
    assert.ok(
      block.includes('isVbblOnly: true') || block.includes('where Vancouver jurisdiction applies') || block.includes('where applicable'),
      'S07 Vancouver Building By-law or rain screen cladding references must be Vancouver-specific or conditional'
    )
  }
})

test('S07 dependency chain is preserved S06-03 → S07-01 → S07-02 → S07-03 → S07-04', () => {
  const source = read(COMPLETION)
  const block = getS07Block(source)
  assert.ok(block.includes("dependencies: ['S06-03']"), 'S07-01 must depend on S06-03')
  assert.ok(block.includes("dependencies: ['S07-01']"), 'S07-02 must depend on S07-01')
  assert.ok(block.includes("dependencies: ['S07-02']"), 'S07-03 must depend on S07-02')
  assert.ok(block.includes("dependencies: ['S07-03']"), 'S07-04 must depend on S07-03')
})

test('S08-01 still depends on S07-04', () => {
  const source = read(COMPLETION)
  const s08_01Start = source.indexOf("code: 'S08-01'")
  const s08_02Start = source.indexOf("code: 'S08-02'")
  assert.ok(s08_01Start !== -1, 'S08-01 must be defined')
  assert.ok(s08_02Start !== -1, 'S08-02 must be defined')
  const block = source.slice(s08_01Start, s08_02Start)
  assert.ok(
    block.includes("dependencies: ['S07-04']"),
    'S08-01 must depend on S07-04 after S07-04 was added as terminal S07 container'
  )
})

// ===========================================================================
// 16. S08 defines S08-01 through S08-05
// ===========================================================================

test('S08 defines S08-01 through S08-05', () => {
  const source = read(COMPLETION)
  const block = getS08Block(source)
  for (const code of ['S08-01', 'S08-02', 'S08-03', 'S08-04', 'S08-05']) {
    assert.ok(block.includes(`code: '${code}'`), `S08 block must define ${code}`)
  }
})

// ===========================================================================
// 17. S08-01 includes fire separation continuity / fire blocking / firestopping language
// ===========================================================================

test('S08-01 includes fire separation continuity, fire blocking, and firestopping language', () => {
  const source = read(COMPLETION)
  const s08_01Start = source.indexOf("code: 'S08-01'")
  const s08_02Start = source.indexOf("code: 'S08-02'")
  const block = source.slice(s08_01Start, s08_02Start)
  assert.ok(
    block.includes('fire separation') || block.includes('fire-separation'),
    'S08-01 must include fire separation language'
  )
  assert.ok(
    block.includes('fire blocking') || block.includes('Fire blocking'),
    'S08-01 must include fire blocking language'
  )
  assert.ok(
    block.includes('firestopping') || block.includes('Firestopping'),
    'S08-01 must include firestopping language'
  )
})

// ===========================================================================
// 18. S08-01 distinguishes intumescent collars / sealant / listed firestop systems
// ===========================================================================

test('S08-01 distinguishes intumescent collars, sealant, and listed firestop systems where applicable', () => {
  const source = read(COMPLETION)
  const s08_01Start = source.indexOf("code: 'S08-01'")
  const s08_02Start = source.indexOf("code: 'S08-02'")
  const block = source.slice(s08_01Start, s08_02Start)
  assert.ok(
    block.includes('intumescent collar') || block.includes('intumescent collars'),
    'S08-01 must include intumescent collars language'
  )
  assert.ok(
    block.includes('intumescent sealant') || block.includes('sealant'),
    'S08-01 must include intumescent sealant language'
  )
  assert.ok(
    block.includes('listed') || block.includes('listed assemblies') || block.includes('listed firestop'),
    'S08-01 must include listed firestop system language'
  )
})

// ===========================================================================
// 19. S08-02 includes smoke / CO alarm rough-in language
// ===========================================================================

test('S08-02 includes smoke alarm and CO alarm rough-in language', () => {
  const source = read(COMPLETION)
  const s08_02Start = source.indexOf("code: 'S08-02'")
  const s08_03Start = source.indexOf("code: 'S08-03'")
  const block = source.slice(s08_02Start, s08_03Start)
  assert.ok(
    block.includes('smoke alarm') || block.includes('Smoke alarm'),
    'S08-02 must include smoke alarm rough-in language'
  )
  assert.ok(
    block.includes('carbon monoxide') || block.includes('Carbon monoxide') || block.includes('CO alarm'),
    'S08-02 must include carbon monoxide alarm rough-in language'
  )
})

// ===========================================================================
// 20. S08-02 includes emergency lighting / exit sign rough-in language
// ===========================================================================

test('S08-02 includes emergency lighting and exit sign rough-in language', () => {
  const source = read(COMPLETION)
  const s08_02Start = source.indexOf("code: 'S08-02'")
  const s08_03Start = source.indexOf("code: 'S08-03'")
  const block = source.slice(s08_02Start, s08_03Start)
  assert.ok(
    block.includes('emergency lighting') || block.includes('Emergency lighting'),
    'S08-02 must include emergency lighting rough-in language'
  )
  assert.ok(
    block.includes('exit sign') || block.includes('Exit sign'),
    'S08-02 must include exit sign rough-in language'
  )
})

// ===========================================================================
// 21. S08-03 includes accessibility / adaptable / guard language
// ===========================================================================

test('S08-03 includes accessibility, adaptable, and guard language', () => {
  const source = read(COMPLETION)
  const s08_03Start = source.indexOf("code: 'S08-03'")
  const s08_04Start = source.indexOf("code: 'S08-04'")
  const block = source.slice(s08_03Start, s08_04Start)
  assert.ok(
    block.includes('accessibility') || block.includes('Accessibility'),
    'S08-03 must include accessibility language'
  )
  assert.ok(
    block.includes('adaptable') || block.includes('Adaptable'),
    'S08-03 must include adaptable language'
  )
  assert.ok(
    block.includes('guard') || block.includes('Guard'),
    'S08-03 must include guard language'
  )
})

// ===========================================================================
// 22. S08-04 includes fire suppression applicability gate language
// ===========================================================================

test('S08-04 includes fire suppression applicability gate language', () => {
  const source = read(COMPLETION)
  const s08_04Start = source.indexOf("code: 'S08-04'")
  const s08_05Start = source.indexOf("code: 'S08-05'")
  assert.ok(s08_04Start !== -1, 'S08-04 must be defined')
  assert.ok(s08_05Start !== -1, 'S08-05 must be defined')
  const block = source.slice(s08_04Start, s08_05Start)
  assert.ok(
    block.includes('applicability') || block.includes('Not Required') || block.includes('Not Applicable'),
    'S08-04 must include fire suppression applicability gate language'
  )
  assert.ok(
    block.includes('not universally required') || block.includes('If not applicable') || block.includes('Not Required'),
    'S08-04 must make clear fire suppression is not universally required'
  )
})

// ===========================================================================
// 23. S08-04 includes NFPA 13 / 13R / 13D pathway language
// ===========================================================================

test('S08-04 includes NFPA 13, NFPA 13R, and NFPA 13D pathway language', () => {
  const source = read(COMPLETION)
  const s08_04Start = source.indexOf("code: 'S08-04'")
  const s08_05Start = source.indexOf("code: 'S08-05'")
  const block = source.slice(s08_04Start, s08_05Start)
  assert.ok(block.includes('NFPA 13'), 'S08-04 must include NFPA 13 language')
  assert.ok(block.includes('NFPA 13R'), 'S08-04 must include NFPA 13R language')
  assert.ok(block.includes('NFPA 13D'), 'S08-04 must include NFPA 13D language')
})

// ===========================================================================
// 24. S08-04 includes sprinkler drawings / hydraulic calculations / water supply / FDC / backflow / hydrostatic test language
// ===========================================================================

test('S08-04 includes sprinkler drawings, hydraulic calculations, FDC, backflow, and hydrostatic test language', () => {
  const source = read(COMPLETION)
  const s08_04Start = source.indexOf("code: 'S08-04'")
  const s08_05Start = source.indexOf("code: 'S08-05'")
  const block = source.slice(s08_04Start, s08_05Start)
  assert.ok(
    block.includes('sprinkler') || block.includes('fire suppression drawings'),
    'S08-04 must include sprinkler or fire suppression drawings language'
  )
  assert.ok(
    block.includes('hydraulic') || block.includes('Hydraulic'),
    'S08-04 must include hydraulic calculations language'
  )
  assert.ok(
    block.includes('FDC') || block.includes('fire department connection'),
    'S08-04 must include FDC language'
  )
  assert.ok(
    block.includes('backflow') || block.includes('Backflow'),
    'S08-04 must include backflow language'
  )
  assert.ok(
    block.includes('hydrostatic') || block.includes('Hydrostatic'),
    'S08-04 must include hydrostatic test language'
  )
})

// ===========================================================================
// 25. S08-05 includes fire alarm applicability gate language
// ===========================================================================

test('S08-05 includes fire alarm applicability gate language', () => {
  const source = read(COMPLETION)
  const s08_05Start = source.indexOf("code: 'S08-05'")
  const s09Start = source.indexOf('STRUCTURAL_STAGE_9_CONTAINERS')
  assert.ok(s08_05Start !== -1, 'S08-05 must be defined')
  const block = source.slice(s08_05Start, s09Start)
  assert.ok(
    block.includes('applicability') || block.includes('Not Required') || block.includes('Not Applicable'),
    'S08-05 must include fire alarm applicability gate language'
  )
  assert.ok(
    block.includes('not universally required') || block.includes('If not applicable') || block.includes('Not Required'),
    'S08-05 must make clear fire alarm is not universally required'
  )
})

// ===========================================================================
// 26. S08-05 includes fire alarm devices / control panel / annunciator / notification appliance language
// ===========================================================================

test('S08-05 includes fire alarm devices, control panel, annunciator, and notification appliance language', () => {
  const source = read(COMPLETION)
  const s08_05Start = source.indexOf("code: 'S08-05'")
  const s09Start = source.indexOf('STRUCTURAL_STAGE_9_CONTAINERS')
  const block = source.slice(s08_05Start, s09Start)
  assert.ok(
    block.includes('control panel') || block.includes('Control panel'),
    'S08-05 must include control panel language'
  )
  assert.ok(
    block.includes('annunciator') || block.includes('Annunciator'),
    'S08-05 must include annunciator language'
  )
  assert.ok(
    block.includes('notification appliance') || block.includes('Notification appliance'),
    'S08-05 must include notification appliance language'
  )
  assert.ok(
    block.includes('initiating device') || block.includes('initiating devices') || block.includes('Initiating device'),
    'S08-05 must include initiating device language'
  )
})

// ===========================================================================
// S08 codeReferences — every item includes codeReferences with at least one legalReference
// ===========================================================================

test('every S08 item includes codeReferences with at least one legalReference', () => {
  const source = read(COMPLETION)
  const block = getS08Block(source)
  const codes = ['S08-01', 'S08-02', 'S08-03', 'S08-04', 'S08-05']
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

test('S08-01 codeReferences includes broad fire separation, firestopping, and approved assembly language', () => {
  const source = read(COMPLETION)
  const s08_01Start = source.indexOf("code: 'S08-01'")
  const s08_02Start = source.indexOf("code: 'S08-02'")
  const block = source.slice(s08_01Start, s08_02Start)
  assert.ok(
    block.includes('fire separations') || block.includes('fire separation'),
    'S08-01 codeReferences must include fire separation reference language'
  )
  assert.ok(
    block.includes('firestopping') || block.includes('firestop'),
    'S08-01 codeReferences must include firestopping reference language'
  )
  assert.ok(
    block.includes('rated assembly') || block.includes('listed assemblies') || block.includes('approved drawings'),
    'S08-01 codeReferences must include rated assembly, listed assemblies, or approved drawings reference language'
  )
})

test('S08-02 label clearly distinguishes Smoke/CO alarms from the full fire alarm system in S08-05', () => {
  const source = read(COMPLETION)
  const s08_02Start = source.indexOf("code: 'S08-02'")
  const s08_03Start = source.indexOf("code: 'S08-03'")
  const block = source.slice(s08_02Start, s08_03Start)
  assert.ok(
    block.includes('Smoke/CO') || (block.includes('Smoke') && block.includes('/CO')),
    'S08-02 label must clearly distinguish Smoke/CO alarms from the full fire alarm system in S08-05'
  )
})

test('S08-02 codeReferences includes broad egress, smoke alarm, CO alarm, emergency lighting, and exit sign language', () => {
  const source = read(COMPLETION)
  const s08_02Start = source.indexOf("code: 'S08-02'")
  const s08_03Start = source.indexOf("code: 'S08-03'")
  const block = source.slice(s08_02Start, s08_03Start)
  assert.ok(
    block.includes('egress') || block.includes('Egress'),
    'S08-02 codeReferences must include egress reference language'
  )
  assert.ok(
    block.includes('smoke alarm') || block.includes('smoke alarms'),
    'S08-02 codeReferences must include smoke alarm reference language'
  )
  assert.ok(
    block.includes('carbon monoxide') || block.includes('CO alarm'),
    'S08-02 codeReferences must include carbon monoxide alarm reference language'
  )
  assert.ok(
    block.includes('emergency lighting') || block.includes('exit sign'),
    'S08-02 codeReferences must include emergency lighting or exit sign reference language'
  )
})

test('S08-03 codeReferences includes broad accessibility, adaptable, guards, handrails, and opening protection language', () => {
  const source = read(COMPLETION)
  const s08_03Start = source.indexOf("code: 'S08-03'")
  const s08_04Start = source.indexOf("code: 'S08-04'")
  const block = source.slice(s08_03Start, s08_04Start)
  assert.ok(
    block.includes('accessibility') || block.includes('adaptable'),
    'S08-03 codeReferences must include accessibility or adaptable reference language'
  )
  assert.ok(
    block.includes('guards') || block.includes('handrails'),
    'S08-03 codeReferences must include guards or handrails reference language'
  )
  assert.ok(
    block.includes('opening protection') || block.includes('opening-protection'),
    'S08-03 codeReferences must include opening protection reference language'
  )
})

test('S08-04 NFPA references use conditional where adopted or required language', () => {
  const source = read(COMPLETION)
  const s08_04Start = source.indexOf("code: 'S08-04'")
  const s08_05Start = source.indexOf("code: 'S08-05'")
  const block = source.slice(s08_04Start, s08_05Start)
  assert.ok(
    block.includes('where adopted') || block.includes('where adopted, referenced') || block.includes('or required by the AHJ'),
    'S08-04 NFPA references must use conditional language — where adopted, referenced by approved drawings, or required by AHJ'
  )
})

test('S08-05 ULC references use conditional where adopted or required language', () => {
  const source = read(COMPLETION)
  const s08_05Start = source.indexOf("code: 'S08-05'")
  const s09Start = source.indexOf('STRUCTURAL_STAGE_9_CONTAINERS')
  const block = source.slice(s08_05Start, s09Start)
  assert.ok(
    block.includes('where adopted') || block.includes('where adopted, referenced') || block.includes('or required by the AHJ'),
    'S08-05 ULC references must use conditional language — where adopted, referenced by approved drawings, or required by AHJ'
  )
})

test('S08 codeReferences use broad defensible language with AHJ qualification caveat where citing code', () => {
  const source = read(COMPLETION)
  const block = getS08Block(source)
  assert.ok(
    block.includes('exact clause to be verified by AHJ or qualified professional'),
    'S08 codeReferences must include "exact clause to be verified by AHJ or qualified professional" caveat for code citations'
  )
})

test('S08 Vancouver Building By-law references are Vancouver-specific with isVbblOnly', () => {
  const source = read(COMPLETION)
  const block = getS08Block(source)
  if (block.includes('Vancouver Building By-law')) {
    assert.ok(
      block.includes('isVbblOnly: true') || block.includes('where Vancouver jurisdiction applies') || block.includes('where applicable'),
      'S08 Vancouver Building By-law references must be Vancouver-specific or conditional'
    )
  }
})

test('S08 dependency chain is preserved S07-04 → S08-01 → S08-02 → S08-03 → S08-04 → S08-05', () => {
  const source = read(COMPLETION)
  const block = getS08Block(source)
  assert.ok(block.includes("dependencies: ['S07-04']"), 'S08-01 must depend on S07-04')
  assert.ok(block.includes("dependencies: ['S08-01']"), 'S08-02 must depend on S08-01')
  assert.ok(block.includes("dependencies: ['S08-02']"), 'S08-03 must depend on S08-02')
  assert.ok(block.includes("dependencies: ['S08-03']"), 'S08-04 must depend on S08-03')
  assert.ok(block.includes("dependencies: ['S08-04']"), 'S08-05 must depend on S08-04')
})

// ===========================================================================
// 27. S09-01 depends on S08-05
// ===========================================================================

test('S09-01 depends on S08-05', () => {
  const source = read(COMPLETION)
  const s09_01Start = source.indexOf("code: 'S09-01'")
  const s09_02Start = source.indexOf("code: 'S09-02'")
  assert.ok(s09_01Start !== -1, 'S09-01 must be defined')
  assert.ok(s09_02Start !== -1, 'S09-02 must be defined')
  const block = source.slice(s09_01Start, s09_02Start)
  assert.ok(
    block.includes("dependencies: ['S08-05']"),
    'S09-01 must depend on S08-05 after S08-04 and S08-05 are added as terminal S08 containers'
  )
})

// ===========================================================================
// 28. Stage 9 content is not modified or reduced except dependency update
// ===========================================================================

test('S09 still defines five containers S09-01 through S09-05', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  for (const code of ['S09-01', 'S09-02', 'S09-03', 'S09-04', 'S09-05']) {
    assert.ok(block.includes(`code: '${code}'`), `S09 block must still define ${code} after Batch 3`)
  }
})

test('S09 DWV test language is preserved', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(block.includes('DWV test'), 'S09 DWV test language must not be removed by Batch 3')
})

test('S09 backwater valve language is preserved', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(
    block.includes('backwater valve') || block.includes('Backwater valve'),
    'S09 backwater valve language must not be removed by Batch 3'
  )
})

// ===========================================================================
// 29. Schedule C-B route is not modified
// ===========================================================================

test('Schedule C-B route is not contaminated by Batch 3 changes', () => {
  const source = read(SCHEDULE_CB)
  assert.ok(!source.includes('S07-04'), 'Schedule C-B must not reference S07-04')
  assert.ok(!source.includes('S08-04'), 'Schedule C-B must not reference S08-04')
  assert.ok(!source.includes('S08-05'), 'Schedule C-B must not reference S08-05')
  assert.ok(!source.includes('NFPA 13'), 'Schedule C-B must not reference NFPA 13')
})

// ===========================================================================
// 30. Final occupancy route is not modified
// ===========================================================================

test('final-occupancy route is not contaminated by Batch 3 changes', () => {
  const source = read(FINAL_OCC)
  assert.ok(!source.includes('S07-04'), 'Final occupancy must not reference S07-04')
  assert.ok(!source.includes('S08-04'), 'Final occupancy must not reference S08-04')
  assert.ok(!source.includes('S08-05'), 'Final occupancy must not reference S08-05')
})

// ===========================================================================
// 31. No prohibited files changed
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
