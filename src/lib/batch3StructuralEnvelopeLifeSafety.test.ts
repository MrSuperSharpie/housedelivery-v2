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
    block.includes('fall-protection') || block.includes('fall protection'),
    'S06 must include fall protection language'
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
