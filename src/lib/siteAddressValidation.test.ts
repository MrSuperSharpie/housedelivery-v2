import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

import { validateSiteAddressFormat } from './siteAddressValidation'

// ===========================================================================
// 1. Valid addresses — must return null (no error)
// ===========================================================================

test('full address with city and BC passes', () => {
  assert.equal(validateSiteAddressFormat('123 Main St, Vancouver, BC'), null)
})

test('full address with British Columbia passes', () => {
  assert.equal(validateSiteAddressFormat('123 Main Street, Burnaby, British Columbia'), null)
})

test('Kingsway Burnaby BC passes', () => {
  assert.equal(validateSiteAddressFormat('4521 Kingsway, Burnaby, BC'), null)
})

test('avenue address with Vancouver BC passes', () => {
  assert.equal(validateSiteAddressFormat('155 E 10th Ave, Vancouver, BC'), null)
})

test('Cornwall Ave recent site passes', () => {
  assert.equal(validateSiteAddressFormat('2847 Cornwall Ave, Vancouver, BC'), null)
})

test('B.C. abbreviation with dots passes', () => {
  assert.equal(validateSiteAddressFormat('99 Oak St, Victoria, B.C.'), null)
})

test('lowercase bc passes (case insensitive)', () => {
  assert.equal(validateSiteAddressFormat('99 Oak St, Victoria, bc'), null)
})

// ===========================================================================
// 2. Street-only and incomplete — must be rejected
// ===========================================================================

test('street-only address is rejected', () => {
  const err = validateSiteAddressFormat('123 Main St')
  assert.ok(err !== null, 'Street-only address must be rejected')
  assert.ok(err!.includes('city and province'), 'Error must mention city and province')
})

test('another street-only address is rejected', () => {
  assert.ok(validateSiteAddressFormat('1234 Fast St.') !== null)
})

test('bare street name without number is rejected', () => {
  assert.ok(validateSiteAddressFormat('Main Street') !== null)
})

test('city-only address is rejected', () => {
  assert.ok(validateSiteAddressFormat('Vancouver') !== null)
})

test('province-only is rejected', () => {
  assert.ok(validateSiteAddressFormat('BC') !== null)
})

test('street and city without province is rejected', () => {
  assert.ok(validateSiteAddressFormat('123 Main St, Vancouver') !== null)
})

test('empty string is rejected', () => {
  assert.ok(validateSiteAddressFormat('') !== null)
})

// ===========================================================================
// 3. Two-part city+province without street — must be rejected
// ===========================================================================

test('Vancouver, BC is rejected (no street)', () => {
  assert.ok(validateSiteAddressFormat('Vancouver, BC') !== null, 'Vancouver, BC must be rejected — no street')
})

test('Burnaby, British Columbia is rejected (no street)', () => {
  assert.ok(validateSiteAddressFormat('Burnaby, British Columbia') !== null, 'city + province only must be rejected')
})

// ===========================================================================
// 4. Street + province without city — must be rejected
// ===========================================================================

test('123 Main St, BC is rejected (no city)', () => {
  assert.ok(validateSiteAddressFormat('123 Main St, BC') !== null, '123 Main St, BC must be rejected — no city')
})

// ===========================================================================
// 5. Malformed three-part entries — must be rejected
// ===========================================================================

test('123 Main St, [blank city], BC is rejected', () => {
  assert.ok(validateSiteAddressFormat('123 Main St, , BC') !== null, 'Empty city part must be rejected')
})

test('[blank street], Vancouver, BC is rejected', () => {
  assert.ok(validateSiteAddressFormat(', Vancouver, BC') !== null, 'Empty street part must be rejected')
})

test('street-only with no digit is rejected', () => {
  // "Main Street, Vancouver, BC" — no digit in street
  assert.ok(validateSiteAddressFormat('Main Street, Vancouver, BC') !== null, 'Street without digit must be rejected')
})

test('street-only with no alpha is rejected', () => {
  // Pathological: digit-only street
  assert.ok(validateSiteAddressFormat('123, Vancouver, BC') !== null, 'Street without alpha chars must be rejected')
})

test('unknown province is rejected', () => {
  assert.ok(validateSiteAddressFormat('123 Main St, Vancouver, ON') !== null, 'Ontario must be rejected — not BC')
})

// ===========================================================================
// 6. Static analysis — DispatchModal wired correctly, prohibited files clean
// ===========================================================================

const SRC = fileURLToPath(new URL('..', import.meta.url))
function read(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), 'utf8')
}

test('DispatchModal helper text updated to require city and province', () => {
  const source = read('components/builder/DispatchModal.tsx')
  assert.ok(
    source.includes('including city and province'),
    'DispatchModal helper text must say "including city and province"'
  )
  assert.ok(
    !source.includes('Enter the project site address in British Columbia.'),
    'Old helper text must be replaced'
  )
})

test('DispatchModal Continue button calls validateSiteAddressFormat', () => {
  const source = read('components/builder/DispatchModal.tsx')
  assert.ok(
    source.includes('validateSiteAddressFormat(address)'),
    'Continue button onClick must call validateSiteAddressFormat'
  )
})

test('DispatchModal imports validateSiteAddressFormat from siteAddressValidation', () => {
  const source = read('components/builder/DispatchModal.tsx')
  assert.ok(
    source.includes("from '@/lib/siteAddressValidation'"),
    'DispatchModal must import validateSiteAddressFormat from the dedicated lib module'
  )
})

test('inspectorCompletion.ts is not modified by address validation change', () => {
  const source = read('lib/inspectorCompletion.ts')
  assert.ok(source.includes("code: 'S09-01'"), 'S09-01 must be preserved')
  assert.ok(!source.includes('validateSiteAddressFormat'), 'inspectorCompletion must not reference address validation')
})

test('governance index is not modified by address validation change', () => {
  const source = read('lib/governance/index.ts')
  assert.ok(!source.includes('validateSiteAddressFormat'), 'governance index must not reference address validation')
})

test('Schedule C-B route is not modified by address validation change', () => {
  const source = read('app/api/schedule-cb/route.ts')
  assert.ok(!source.includes('validateSiteAddressFormat'), 'Schedule C-B must not reference address validation')
})
