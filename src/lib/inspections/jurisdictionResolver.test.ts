import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ACTIVE_BC_TEMPLATE_JURISDICTIONS,
  DORMANT_ONTARIO_JURISDICTION_FAMILY,
  getDormantOntarioCoverageReadiness,
  resolveTemplateJurisdiction,
} from './jurisdictionResolver'

test('Vancouver still resolves to vbbl_2025', () => {
  const result = resolveTemplateJurisdiction({ city: 'Vancouver' })
  assert.equal(result.status, 'active')
  assert.equal(result.slug, ACTIVE_BC_TEMPLATE_JURISDICTIONS.vancouver)
})

test('BC non-Vancouver cities still resolve to bcbc_2024', () => {
  for (const city of ['Burnaby', 'Surrey', 'Richmond', 'Coquitlam', 'Langley']) {
    const result = resolveTemplateJurisdiction({ city })
    assert.equal(result.status, 'active')
    assert.equal(result.slug, ACTIVE_BC_TEMPLATE_JURISDICTIONS.provinceBase)
  }
})

test('empty city still resolves to bcbc_2024', () => {
  const result = resolveTemplateJurisdiction({ city: null })
  assert.equal(result.status, 'active')
  assert.equal(result.slug, ACTIVE_BC_TEMPLATE_JURISDICTIONS.provinceBase)
})

test('Ontario city with Ontario context does not silently resolve to bcbc_2024', () => {
  const result = resolveTemplateJurisdiction({ city: 'Toronto', province: 'ON' })
  assert.equal(result.status, 'dormant')
  assert.equal(result.family, 'ontario')
  assert.equal(result.slug, null)
  assert.equal(result.dormantSlug, DORMANT_ONTARIO_JURISDICTION_FAMILY.baseSlug)
  assert.equal(result.allowTemplateFallback, false)
})

test('Ontario scaffold remains dormant and inactive', () => {
  assert.equal(DORMANT_ONTARIO_JURISDICTION_FAMILY.baseSlug, 'obc_2024')
  assert.equal(DORMANT_ONTARIO_JURISDICTION_FAMILY.isActive, false)
  assert.equal(DORMANT_ONTARIO_JURISDICTION_FAMILY.publicRoutingEnabled, false)
  assert.deepEqual(
    DORMANT_ONTARIO_JURISDICTION_FAMILY.futureOverlays.map(overlay => overlay.slug),
    ['toronto_obc_2024', 'ottawa_obc_2024', 'mississauga_obc_2024'],
  )
  assert.ok(DORMANT_ONTARIO_JURISDICTION_FAMILY.futureOverlays.every(overlay => overlay.isActive === false))
})

test('Ontario admin coverage readiness reports dormant safeguards', () => {
  const readiness = getDormantOntarioCoverageReadiness()

  assert.equal(readiness.statusLabel, 'Planned / Dormant / Not Publicly Enabled')
  assert.equal(readiness.isActive, false)
  assert.equal(readiness.dispatchEnabled, false)
  assert.equal(readiness.templatesActive, false)
  assert.equal(readiness.publicRoutingEnabled, false)
  assert.equal(readiness.resolverFallbackToBcbcBlocked, true)
  assert.deepEqual(readiness.plannedSlugs, [
    'obc_2024',
    'toronto_obc_2024',
    'ottawa_obc_2024',
    'mississauga_obc_2024',
  ])
})
