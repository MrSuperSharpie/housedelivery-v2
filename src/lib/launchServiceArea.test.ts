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

const LAUNCH_MUNICIPALITIES = [
  'Vancouver',
  'Surrey',
  'Burnaby',
  'Richmond',
  'Coquitlam',
  'Delta',
  'Langley City',
  'Langley Township',
  'Maple Ridge',
  'New Westminster',
  'North Vancouver City',
  'North Vancouver District',
  'West Vancouver',
  'Port Coquitlam',
  'Port Moody',
  'White Rock',
]

// ===========================================================================
// 1. cityRegionMapping — all 16 approved municipalities map to a non-null Region
// ===========================================================================

for (const municipality of LAUNCH_MUNICIPALITIES) {
  test(`cityRegionMapping resolves "${municipality}" to a non-null Region`, () => {
    const result = normalizeRegionFromCity(municipality)
    assert.notEqual(result, null, `"${municipality}" must map to a known internal Region`)
  })
}

// ===========================================================================
// 2. Inspector signup — includes all 16 approved municipalities
// ===========================================================================

test('inspector signup REGIONS includes all 16 approved launch municipalities', () => {
  const source = read('app/inspector/signup/page.tsx')
  for (const municipality of LAUNCH_MUNICIPALITIES) {
    assert.ok(
      source.includes(`'${municipality}'`),
      `inspector signup must include '${municipality}'`
    )
  }
})

test('inspector signup no longer uses only the old 5 raw region values', () => {
  const source = read('app/inspector/signup/page.tsx')
  assert.ok(
    !source.includes("['vancouver', 'burnaby', 'surrey', 'richmond', 'coquitlam']"),
    'inspector signup must not still use the old 5-value REGIONS constant'
  )
})

test('inspector signup imports normalizeRegionFromCity', () => {
  const source = read('app/inspector/signup/page.tsx')
  assert.ok(
    source.includes('normalizeRegionFromCity'),
    'inspector signup must import and use normalizeRegionFromCity'
  )
})

test('inspector signup uses municipalitiesToRegions before storing regions', () => {
  const source = read('app/inspector/signup/page.tsx')
  assert.ok(
    source.includes('municipalitiesToRegions'),
    'inspector signup must use municipalitiesToRegions helper before persisting'
  )
})

// ===========================================================================
// 3. Builder onboarding — includes all 16 approved municipalities, no off-launch cities
// ===========================================================================

test('builder onboarding REGIONS includes all 16 approved launch municipalities', () => {
  const source = read('app/builder/onboarding/page.tsx')
  for (const municipality of LAUNCH_MUNICIPALITIES) {
    assert.ok(
      source.includes(`'${municipality}'`),
      `builder onboarding must include '${municipality}'`
    )
  }
})

test('builder onboarding does not include Abbotsford', () => {
  const source = read('app/builder/onboarding/page.tsx')
  assert.ok(
    !source.includes("'Abbotsford'"),
    'builder onboarding must not include Abbotsford (outside launch geography)'
  )
})

test('builder onboarding does not include Chilliwack', () => {
  const source = read('app/builder/onboarding/page.tsx')
  assert.ok(
    !source.includes("'Chilliwack'"),
    'builder onboarding must not include Chilliwack (outside launch geography)'
  )
})

test('builder onboarding does not include Kelowna', () => {
  const source = read('app/builder/onboarding/page.tsx')
  assert.ok(
    !source.includes("'Kelowna'"),
    'builder onboarding must not include Kelowna (outside launch geography)'
  )
})

// ===========================================================================
// 4. Region type is not expanded in this pass
// ===========================================================================

test('Region type still contains exactly the original 5 internal values', () => {
  const source = read('lib/types.ts')
  assert.ok(
    source.includes("'burnaby' | 'vancouver' | 'surrey' | 'coquitlam' | 'richmond'"),
    'Region type must not be expanded in this pass'
  )
})
