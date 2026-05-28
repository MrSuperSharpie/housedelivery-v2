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
const WORKSPACE = 'components/inspector/InspectorCompletionWorkspace.tsx'

function getS09Block(source: string): string {
  const start = source.indexOf('STRUCTURAL_STAGE_9_CONTAINERS')
  const end = source.indexOf('STRUCTURAL_STAGE_10_CONTAINERS')
  assert.ok(start !== -1, 'STRUCTURAL_STAGE_9_CONTAINERS must be defined')
  assert.ok(end !== -1, 'STRUCTURAL_STAGE_10_CONTAINERS must exist as boundary')
  return source.slice(start, end)
}

// ===========================================================================
// 1. S09 has at least five containers
// ===========================================================================

test('S09 defines at least five item containers', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  const codes = ['S09-01', 'S09-02', 'S09-03', 'S09-04', 'S09-05']
  for (const code of codes) {
    assert.ok(block.includes(`code: '${code}'`), `STRUCTURAL_STAGE_9_CONTAINERS must define ${code}`)
  }
})

// ===========================================================================
// 2. S09-01 — Permit scope, readiness, and visibility
// ===========================================================================

test('S09 includes permit scope / readiness / visibility container', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  const s09_01 = block.slice(0, block.indexOf("code: 'S09-02'"))
  assert.ok(
    s09_01.includes('Permit Scope') || s09_01.includes('permit scope') || s09_01.includes('Readiness'),
    'S09-01 must cover permit scope, readiness, or visibility'
  )
})

test('S09 includes permit scope match language in field checklist or whatToCheck', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(
    block.includes('permit scope') || block.includes('permit drawings') || block.includes('approved permit'),
    'S09 must reference permit scope or approved permit in checklist content'
  )
})

// ===========================================================================
// 3. S09-02 — Potable water supply rough-in
// ===========================================================================

test('S09 includes potable water supply rough-in container', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(
    block.includes('Potable Water') || block.includes('Water Supply') || block.includes('domestic water'),
    'S09 must include a potable water supply rough-in container'
  )
})

// ===========================================================================
// 4. S09 includes waterline pressure test language
// ===========================================================================

test('S09 includes waterline pressure test language', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(
    block.includes('pressure test') || block.includes('Pressure test'),
    'S09 must include waterline pressure test language'
  )
})

// ===========================================================================
// 5. S09 includes DWV test language
// ===========================================================================

test('S09 includes DWV test language', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(block.includes('DWV test'), 'S09 must include DWV test language')
})

// ===========================================================================
// 6. S09 includes drainage slope language
// ===========================================================================

test('S09 includes drainage slope language', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(
    block.includes('drainage slope') || block.includes('Drainage slope'),
    'S09 must include drainage slope language'
  )
})

// ===========================================================================
// 7. S09 includes cleanout language
// ===========================================================================

test('S09 includes cleanout language', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(
    block.includes('cleanout') || block.includes('Cleanout'),
    'S09 must include cleanout language'
  )
})

// ===========================================================================
// 8. S09 includes vent sizing / routing language
// ===========================================================================

test('S09 includes vent sizing and routing language', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(
    block.includes('vent sizing') || block.includes('Vent sizing') || block.includes('vent routing'),
    'S09 must include vent sizing or routing language'
  )
})

// ===========================================================================
// 9. S09 includes trap arm language
// ===========================================================================

test('S09 includes trap arm language', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(
    block.includes('trap arm') || block.includes('Trap arm'),
    'S09 must include trap arm language'
  )
})

// ===========================================================================
// 10. S09 includes backwater valve language
// ===========================================================================

test('S09 includes backwater valve language', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(
    block.includes('backwater valve') || block.includes('Backwater valve'),
    'S09 must include backwater valve language'
  )
})

// ===========================================================================
// 11. S09 includes sump language
// ===========================================================================

test('S09 includes sump language', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(
    block.includes('sump') || block.includes('Sump'),
    'S09 must include sump language'
  )
})

// ===========================================================================
// 12. S09 includes foundation drain and roof drain language
// ===========================================================================

test('S09 includes foundation drain and roof drain language', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(
    block.includes('foundation drain') || block.includes('Foundation drain'),
    'S09 must include foundation drain language'
  )
  assert.ok(
    block.includes('roof drain') || block.includes('Roof drain'),
    'S09 must include roof drain language'
  )
})

// ===========================================================================
// 13. S09 includes cross-connection / backflow language
// ===========================================================================

test('S09 includes cross-connection and backflow language', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(
    block.includes('cross-connection') || block.includes('Cross-connection'),
    'S09 must include cross-connection language'
  )
  assert.ok(
    block.includes('backflow') || block.includes('Backflow'),
    'S09 must include backflow prevention language'
  )
})

// ===========================================================================
// 14. S09 includes hot water tempering language
// ===========================================================================

test('S09 includes hot water tempering language', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(
    block.includes('tempering') || block.includes('scald protection'),
    'S09 must include hot water tempering or scald protection language'
  )
})

// ===========================================================================
// 15. S09 includes fixture count language
// ===========================================================================

test('S09 includes fixture count language', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(
    block.includes('fixture count') || block.includes('Fixture count'),
    'S09 must include fixture count language'
  )
})

// ===========================================================================
// 16. S09 includes fire separation / penetration language
// ===========================================================================

test('S09 includes fire separation and penetration language', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(
    block.includes('fire separation') || block.includes('fire-separation') || block.includes('fire-rated'),
    'S09 must include fire separation or fire-rated language'
  )
  assert.ok(
    block.includes('penetration') || block.includes('firestopping'),
    'S09 must include penetration or firestopping language'
  )
})

// ===========================================================================
// 17. S09 includes sewer/storm placard or city connection language
// ===========================================================================

test('S09 includes sewer/storm placard and city connection language', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(
    block.includes('placard') || block.includes('Placard'),
    'S09 must include sewer/storm placard language'
  )
  assert.ok(
    block.includes('city connection') || block.includes('City connection') || block.includes('sewer connection'),
    'S09 must include city connection language'
  )
})

// ===========================================================================
// 18. S09 includes concealed work Hold/Fail language
// ===========================================================================

test('S09 includes concealed work Hold or Failed language', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  assert.ok(
    block.includes('concealed') || block.includes('Concealed'),
    'S09 must include concealed work language in stop_if, fail_when, or field checklist'
  )
})

// ===========================================================================
// 19. Every S09 item has all required content fields
// ===========================================================================

test('every S09 item includes fieldChecklist, passWhen, failWhen, pendingWhen, stopIf, and requiredEvidence', () => {
  const source = read(COMPLETION)
  const block = getS09Block(source)
  const codes = ['S09-01', 'S09-02', 'S09-03', 'S09-04', 'S09-05']
  const requiredFields = ['fieldChecklist', 'passWhen', 'failWhen', 'pendingWhen', 'stopIf', 'requiredEvidence']
  for (let i = 0; i < codes.length; i++) {
    const itemStart = block.indexOf(`code: '${codes[i]}'`)
    const itemEnd = i + 1 < codes.length
      ? block.indexOf(`code: '${codes[i + 1]}'`)
      : block.length
    const itemBlock = block.slice(itemStart, itemEnd)
    for (const field of requiredFields) {
      assert.ok(
        itemBlock.includes(field),
        `${codes[i]} must include ${field}`
      )
    }
  }
})

// ===========================================================================
// 20. Prohibited files not changed
// ===========================================================================

test('Schedule C-B route is not contaminated by S09 content-completion changes', () => {
  const source = read(SCHEDULE_CB)
  assert.ok(!source.includes('S09-03'), 'Schedule C-B must not reference S09-03')
  assert.ok(!source.includes('S09-04'), 'Schedule C-B must not reference S09-04')
  assert.ok(!source.includes('S09-05'), 'Schedule C-B must not reference S09-05')
  assert.ok(!source.includes('backwater valve'), 'Schedule C-B must not reference backwater valve')
  assert.ok(!source.includes('tempering'), 'Schedule C-B must not reference hot water tempering')
})

test('final-occupancy route is not contaminated by S09 content-completion changes', () => {
  const source = read(FINAL_OCC)
  assert.ok(!source.includes('S09-03'), 'Final occupancy must not reference S09-03')
  assert.ok(!source.includes('S09-04'), 'Final occupancy must not reference S09-04')
  assert.ok(!source.includes('S09-05'), 'Final occupancy must not reference S09-05')
})

test('store.tsx is not changed by S09 content-completion pass', () => {
  const source = read(STORE)
  assert.ok(!source.includes('S09-03'), 'store.tsx must not reference S09-03 directly')
  assert.ok(!source.includes('S09-04'), 'store.tsx must not reference S09-04 directly')
  assert.ok(!source.includes('S09-05'), 'store.tsx must not reference S09-05 directly')
})

test('InspectorCompletionWorkspace is not changed by S09 content-completion pass', () => {
  const source = read(WORKSPACE)
  // The workspace must still have the existing S09 routing logic unchanged
  assert.ok(source.includes('DISCIPLINE_STAGE_OVERRIDE'), 'Workspace routing logic must be preserved')
  assert.ok(source.includes('isS09Item'), 'isS09Item guard must be preserved in workspace')
  assert.ok(source.includes('PILOT_S9_CODE_REFS'), 'PILOT_S9_CODE_REFS must be preserved in workspace')
})
