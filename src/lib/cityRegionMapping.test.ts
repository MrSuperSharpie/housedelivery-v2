import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

import { normalizeRegionFromCity } from './cityRegionMapping'

const SRC = fileURLToPath(new URL('..', import.meta.url))
function read(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), 'utf8')
}

// ===========================================================================
// 1. Original five regions — regression guard
// ===========================================================================

test('Vancouver maps to vancouver', () => {
  assert.equal(normalizeRegionFromCity('Vancouver'), 'vancouver')
})

test('Burnaby maps to burnaby', () => {
  assert.equal(normalizeRegionFromCity('Burnaby'), 'burnaby')
})

test('Surrey maps to surrey', () => {
  assert.equal(normalizeRegionFromCity('Surrey'), 'surrey')
})

test('Coquitlam maps to coquitlam', () => {
  assert.equal(normalizeRegionFromCity('Coquitlam'), 'coquitlam')
})

test('Richmond maps to richmond', () => {
  assert.equal(normalizeRegionFromCity('Richmond'), 'richmond')
})

// ===========================================================================
// 2. Launch expansion — North Shore → vancouver
// ===========================================================================

test('North Vancouver maps to vancouver', () => {
  assert.equal(normalizeRegionFromCity('North Vancouver'), 'vancouver')
})

test('City of North Vancouver maps to vancouver', () => {
  assert.equal(normalizeRegionFromCity('City of North Vancouver'), 'vancouver')
})

test('District of North Vancouver maps to vancouver', () => {
  assert.equal(normalizeRegionFromCity('District of North Vancouver'), 'vancouver')
})

test('West Vancouver maps to vancouver', () => {
  assert.equal(normalizeRegionFromCity('West Vancouver'), 'vancouver')
})

// ===========================================================================
// 3. Launch expansion — Tri-Cities → coquitlam
// ===========================================================================

test('Port Coquitlam maps to coquitlam', () => {
  assert.equal(normalizeRegionFromCity('Port Coquitlam'), 'coquitlam')
})

test('Port Moody maps to coquitlam', () => {
  assert.equal(normalizeRegionFromCity('Port Moody'), 'coquitlam')
})

test('Maple Ridge maps to coquitlam', () => {
  assert.equal(normalizeRegionFromCity('Maple Ridge'), 'coquitlam')
})

// ===========================================================================
// 4. Launch expansion — South Fraser → surrey
// ===========================================================================

test('Langley maps to surrey', () => {
  assert.equal(normalizeRegionFromCity('Langley'), 'surrey')
})

test('Langley City maps to surrey (alias via substring)', () => {
  assert.equal(normalizeRegionFromCity('Langley City'), 'surrey')
})

test('Township of Langley maps to surrey (alias via substring)', () => {
  assert.equal(normalizeRegionFromCity('Township of Langley'), 'surrey')
})

test('City of Langley maps to surrey (alias via substring)', () => {
  assert.equal(normalizeRegionFromCity('City of Langley'), 'surrey')
})

test('White Rock maps to surrey', () => {
  assert.equal(normalizeRegionFromCity('White Rock'), 'surrey')
})

// ===========================================================================
// 5. Launch expansion — South of Fraser → richmond
// ===========================================================================

test('Delta maps to richmond', () => {
  assert.equal(normalizeRegionFromCity('Delta'), 'richmond')
})

test('North Delta maps to richmond (alias via substring)', () => {
  assert.equal(normalizeRegionFromCity('North Delta'), 'richmond')
})

// ===========================================================================
// 6. Launch expansion — Central → burnaby
// ===========================================================================

test('New Westminster maps to burnaby', () => {
  assert.equal(normalizeRegionFromCity('New Westminster'), 'burnaby')
})

// ===========================================================================
// 7. Case-insensitive matching
// ===========================================================================

test('lowercase langley maps to surrey', () => {
  assert.equal(normalizeRegionFromCity('langley'), 'surrey')
})

test('mixed case Port Coquitlam maps to coquitlam', () => {
  assert.equal(normalizeRegionFromCity('PORT COQUITLAM'), 'coquitlam')
})

test('lowercase north vancouver maps to vancouver', () => {
  assert.equal(normalizeRegionFromCity('north vancouver'), 'vancouver')
})

// ===========================================================================
// 8. Outside launch service area returns null
// ===========================================================================

test('Victoria returns null (not in launch area)', () => {
  assert.equal(normalizeRegionFromCity('Victoria'), null)
})

test('Kelowna returns null (Interior — not in launch area)', () => {
  assert.equal(normalizeRegionFromCity('Kelowna'), null)
})

test('Abbotsford returns null (Fraser Valley — not in launch area)', () => {
  assert.equal(normalizeRegionFromCity('Abbotsford'), null)
})

test('Nanaimo returns null (Vancouver Island — not in launch area)', () => {
  assert.equal(normalizeRegionFromCity('Nanaimo'), null)
})

test('empty string returns null', () => {
  assert.equal(normalizeRegionFromCity(''), null)
})

test('undefined returns null', () => {
  assert.equal(normalizeRegionFromCity(undefined), null)
})

// ===========================================================================
// 9. No false positives — unrelated words must not accidentally match
// ===========================================================================

test('Pitt Meadows does not map to a region (not in launch area)', () => {
  // Pitt Meadows is a Maple Ridge adjacent municipality not yet in our list.
  assert.equal(normalizeRegionFromCity('Pitt Meadows'), null)
})

test('Squamish does not map to a region (Sea-to-Sky — not in launch area)', () => {
  assert.equal(normalizeRegionFromCity('Squamish'), null)
})

// ===========================================================================
// 10. Isolation — governance, types, and protected files not modified
// ===========================================================================

test('governance/index.ts Region type is unchanged', () => {
  const source = read('lib/governance/index.ts')
  assert.ok(
    source.includes("= 'burnaby' | 'vancouver' | 'surrey' | 'coquitlam' | 'richmond'"),
    'governance Region type must remain the original five values'
  )
  assert.ok(!source.includes('north_vancouver'), 'governance must not reference new region values')
  assert.ok(!source.includes('normalizeRegionFromCity'), 'governance must not import city mapping')
})

test('types.ts Region type is unchanged', () => {
  const source = read('lib/types.ts')
  assert.ok(
    source.includes("'burnaby' | 'vancouver' | 'surrey' | 'coquitlam' | 'richmond'"),
    'types.ts Region type must remain the original five values'
  )
})

test('store.tsx imports normalizeRegionFromCity from cityRegionMapping', () => {
  const source = read('lib/store.tsx')
  assert.ok(
    source.includes("from '@/lib/cityRegionMapping'"),
    'store.tsx must import from the dedicated cityRegionMapping module'
  )
  assert.ok(
    !source.includes('SUPPORTED_CITY_REGIONS'),
    'store.tsx must not define SUPPORTED_CITY_REGIONS locally'
  )
})

test('inspectorCompletion.ts is not modified', () => {
  const source = read('lib/inspectorCompletion.ts')
  assert.ok(source.includes("code: 'S09-01'"), 'S09-01 must be preserved')
  assert.ok(!source.includes('normalizeRegionFromCity'), 'inspectorCompletion must not reference city mapping')
})

test('governance/index.ts is not modified by this pass', () => {
  const source = read('lib/governance/index.ts')
  assert.ok(!source.includes('normalizeRegionFromCity'), 'governance must not reference city mapping')
  assert.ok(!source.includes('cityRegionMapping'), 'governance must not import cityRegionMapping')
})
