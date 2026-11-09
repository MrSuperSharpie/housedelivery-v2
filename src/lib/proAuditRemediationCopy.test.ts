import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

test('inspector outcome copy separates Corrections Required, Hold, Pending, and N/A', () => {
  const source = read('src/components/inspector/InspectorCompletionWorkspace.tsx')

  assert.ok(source.includes('Use Corrections Required when you observed a deficiency'))
  assert.ok(source.includes('Use Hold only for a same-day correction while you are still on site'))
  assert.ok(source.includes('Pending is the default draft state'))
  assert.ok(source.includes('Use N/A only when the condition is genuinely outside scope'))
  assert.ok(source.includes('no fire suppression scope'))
  assert.ok(source.includes('no gas appliances'))
  assert.ok(source.includes('no deep foundations'))
  assert.ok(source.includes('Vancouver-only requirements on a BCBC project'))
})

test('evidence prompt copy names concrete field evidence types', () => {
  const workspace = read('src/components/inspector/InspectorCompletionWorkspace.tsx')
  const uploader = read('src/components/inspector/FieldMediaUploader.tsx')
  const combined = `${workspace}\n${uploader}`

  for (const expected of [
    'Photo or short video',
    'Permit proof',
    'inspection card or status',
    'manufacturer document',
    'field note',
    'test result',
    'deficiency photo',
    'correction evidence',
    'item-bound evidence record',
  ]) {
    assert.ok(combined.includes(expected), `missing evidence guidance: ${expected}`)
  }
})

test('final occupancy UI copy does not imply Vero grants AHJ occupancy approval', () => {
  const source = read('src/components/inspector/InspectorCompletionWorkspace.tsx')

  assert.ok(source.includes('Record AHJ Occupancy Evidence'))
  assert.ok(source.includes('Vero does not issue occupancy, grant final approval, or replace the authority having jurisdiction'))
  assert.ok(source.includes('RECORD AHJ EVIDENCE'))
  assert.ok(!source.includes('final Vero certification gate'))
  assert.ok(!source.includes('ISSUE FINAL OCCUPANCY'))
  assert.ok(!source.includes('Issuing Final Occupancy'))
})

test('builder-facing vault result copy says Corrections Required instead of Fail', () => {
  const source = read('src/app/vault/page.tsx')

  assert.ok(source.includes("return 'Corrections Required'"))
  assert.ok(!source.includes("return 'Fail'"))
})
