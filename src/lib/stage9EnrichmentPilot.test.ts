import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const SRC = fileURLToPath(new URL('..', import.meta.url))

function read(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), 'utf8')
}

function exists(relPath: string): boolean {
  return existsSync(resolve(SRC, relPath))
}

// ===========================================================================
// 1. inspectorCompletion.ts — codeReferences field shape
// ===========================================================================

test('CompletionChecklistItemDefinition declares code_references as optional', () => {
  const source = read('lib/inspectorCompletion.ts')
  assert.ok(
    source.includes('code_references?:'),
    'CompletionChecklistItemDefinition must declare code_references as an optional field'
  )
})

test('S09-01 has at least one codeReferences entry with a legalReference', () => {
  const source = read('lib/inspectorCompletion.ts')
  const s09_01Start = source.indexOf("code: 'S09-01'")
  const s09_02Start = source.indexOf("code: 'S09-02'")
  assert.ok(s09_01Start !== -1, 'S09-01 must be defined in STRUCTURAL_STAGE_9_CONTAINERS')
  assert.ok(s09_02Start !== -1, 'S09-02 must be defined in STRUCTURAL_STAGE_9_CONTAINERS')
  const block = source.slice(s09_01Start, s09_02Start)
  assert.ok(block.includes('codeReferences'), 'S09-01 must have a codeReferences array')
  assert.ok(block.includes('legalReference'), 'S09-01 codeReferences must include at least one legalReference')
})

test('S09-02 has at least one codeReferences entry with a legalReference', () => {
  const source = read('lib/inspectorCompletion.ts')
  const s09_02Start = source.indexOf("code: 'S09-02'")
  const stage10Start = source.indexOf('STRUCTURAL_STAGE_10_CONTAINERS')
  assert.ok(s09_02Start !== -1, 'S09-02 must be defined')
  assert.ok(stage10Start !== -1, 'STRUCTURAL_STAGE_10_CONTAINERS must exist as a boundary marker')
  const block = source.slice(s09_02Start, stage10Start)
  assert.ok(block.includes('codeReferences'), 'S09-02 must have a codeReferences array')
  assert.ok(block.includes('legalReference'), 'S09-02 codeReferences must include at least one legalReference')
})

test('S09-02 includes the VBBL-only sewer/storm placard reference as advisory', () => {
  const source = read('lib/inspectorCompletion.ts')
  const s09_02Start = source.indexOf("code: 'S09-02'")
  const stage10Start = source.indexOf('STRUCTURAL_STAGE_10_CONTAINERS')
  const block = source.slice(s09_02Start, stage10Start)
  assert.ok(block.includes('isVbblOnly: true'), 'S09-02 must include a VBBL-only advisory reference')
  assert.ok(block.includes('Sewer'), 'S09-02 must include the sewer/storm placard reference')
})

test('STRUCTURAL_STAGE_9_CONTAINERS does not define S09-03 or any later item code', () => {
  const source = read('lib/inspectorCompletion.ts')
  const containerStart = source.indexOf('STRUCTURAL_STAGE_9_CONTAINERS')
  const containerEnd = source.indexOf('STRUCTURAL_STAGE_10_CONTAINERS')
  assert.ok(containerStart !== -1, 'STRUCTURAL_STAGE_9_CONTAINERS must be defined')
  assert.ok(containerEnd !== -1, 'STRUCTURAL_STAGE_10_CONTAINERS must exist as a boundary')
  const block = source.slice(containerStart, containerEnd)
  assert.ok(!block.includes("code: 'S09-03'"), 'STRUCTURAL_STAGE_9_CONTAINERS must not define S09-03')
  assert.ok(!block.includes("code: 'S09-04'"), 'STRUCTURAL_STAGE_9_CONTAINERS must not define S09-04')
})

test('S09-01 and S09-02 item codes are preserved unchanged', () => {
  const source = read('lib/inspectorCompletion.ts')
  assert.ok(source.includes("code: 'S09-01'"), 'S09-01 item code must be preserved')
  assert.ok(source.includes("code: 'S09-02'"), 'S09-02 item code must be preserved')
})

// ===========================================================================
// 2. StageCodeReferences — pure display, no writes, not admin-gated
// ===========================================================================

test('StageCodeReferences.tsx exists', () => {
  assert.ok(
    exists('components/inspector/StageCodeReferences.tsx'),
    'StageCodeReferences.tsx must exist at src/components/inspector/'
  )
})

test('StageCodeReferences has no form submit handler', () => {
  const source = read('components/inspector/StageCodeReferences.tsx')
  assert.ok(!source.includes('onSubmit'), 'StageCodeReferences must not contain an onSubmit handler')
})

test('StageCodeReferences has no Supabase write operations', () => {
  const source = read('components/inspector/StageCodeReferences.tsx')
  assert.ok(!source.includes('supabase'), 'StageCodeReferences must not reference supabase')
  assert.ok(!source.includes('.insert('), 'StageCodeReferences must not call .insert()')
  assert.ok(!source.includes('.update('), 'StageCodeReferences must not call .update()')
  assert.ok(!source.includes('.delete('), 'StageCodeReferences must not call .delete()')
  assert.ok(!source.includes('.upsert('), 'StageCodeReferences must not call .upsert()')
})

test('StageCodeReferences does not import requireAdmin or adminApiGuard', () => {
  const source = read('components/inspector/StageCodeReferences.tsx')
  assert.ok(!source.includes('requireAdmin'), 'StageCodeReferences must not be admin-gated')
  assert.ok(!source.includes('adminApiGuard'), 'StageCodeReferences must not import adminApiGuard')
})

// ===========================================================================
// 3. StageAdvisoryNote — no pass/fail or inspection_status logic
// ===========================================================================

test('StageAdvisoryNote.tsx exists', () => {
  assert.ok(
    exists('components/inspector/StageAdvisoryNote.tsx'),
    'StageAdvisoryNote.tsx must exist at src/components/inspector/'
  )
})

test('StageAdvisoryNote has no inspection_status logic', () => {
  const source = read('components/inspector/StageAdvisoryNote.tsx')
  assert.ok(
    !source.includes('inspection_status'),
    'StageAdvisoryNote must not reference inspection_status'
  )
})

test('StageAdvisoryNote has no Pass/Fail/Pending status logic', () => {
  const source = read('components/inspector/StageAdvisoryNote.tsx')
  assert.ok(!source.includes("'Passed'"), "StageAdvisoryNote must not contain 'Passed' status logic")
  assert.ok(!source.includes("'Failed'"), "StageAdvisoryNote must not contain 'Failed' status logic")
  assert.ok(!source.includes("'Pending'"), "StageAdvisoryNote must not contain 'Pending' status logic")
})

test('StageAdvisoryNote renders the Advisory — not a hold point label', () => {
  const source = read('components/inspector/StageAdvisoryNote.tsx')
  assert.ok(
    source.includes('Advisory') && source.includes('not a hold point'),
    'StageAdvisoryNote must render "Advisory — not a hold point"'
  )
})

// ===========================================================================
// 4. InspectorCompletionWorkspace — pilot flag gates Code References
// ===========================================================================

test('InspectorCompletionWorkspace declares the PILOT_S9_CODE_REFS constant', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  assert.ok(
    source.includes('PILOT_S9_CODE_REFS'),
    'InspectorCompletionWorkspace must declare the PILOT_S9_CODE_REFS pilot flag'
  )
})

test('StageCodeReferences is gated behind PILOT_S9_CODE_REFS in InspectorCompletionWorkspace', () => {
  const source = read('components/inspector/InspectorCompletionWorkspace.tsx')
  const pilotFlagIndex = source.indexOf('PILOT_S9_CODE_REFS')
  const componentUsageIndex = source.indexOf('<StageCodeReferences')
  assert.ok(pilotFlagIndex !== -1, 'PILOT_S9_CODE_REFS must be declared')
  assert.ok(componentUsageIndex !== -1, 'StageCodeReferences must be used in InspectorCompletionWorkspace')
  assert.ok(
    pilotFlagIndex < componentUsageIndex,
    'PILOT_S9_CODE_REFS must be declared before StageCodeReferences usage'
  )
})

// ===========================================================================
// 5. Schedule C-B isolation — code references must not contaminate the packet
// ===========================================================================

test('Schedule C-B route does not reference codeReferences or StageCodeReferences', () => {
  const source = read('app/api/schedule-cb/route.ts')
  assert.ok(!source.includes('codeReferences'), 'Schedule C-B route must not reference codeReferences')
  assert.ok(!source.includes('code_references'), 'Schedule C-B route must not reference code_references')
  assert.ok(!source.includes('StageCodeReferences'), 'Schedule C-B route must not import StageCodeReferences')
})

test('ScheduleCBPacketItemRecord does not include codeReferences or legalReference fields', () => {
  const source = read('lib/pdf/scheduleCBPacketTypes.ts')
  assert.ok(!source.includes('codeReferences'), 'ScheduleCBPacketItemRecord must not include codeReferences')
  assert.ok(!source.includes('code_references'), 'ScheduleCBPacketItemRecord must not include code_references')
  assert.ok(!source.includes('legalReference'), 'ScheduleCBPacketItemRecord must not include legalReference')
})
