import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveTemplateJurisdiction } from './jurisdictionResolver'
import { getDormantOntarioAdminResolverDryRun } from './ontarioAdminResolverDryRun'
import { getDormantOntarioMunicipalOverlayFoundation } from './ontarioMunicipalOverlayFoundation'
import {
  DORMANT_ONTARIO_PROJECT_TAXONOMY_FOUNDATION,
  getDormantOntarioProjectTaxonomyFoundation,
} from './ontarioProjectTaxonomyFoundation'

const expectedFieldLabels = [
  'Province',
  'Municipality',
  'Planned jurisdiction slug',
  'Municipal overlay slug',
  'Project archetype',
  'New build / addition / alteration / renovation / demolition / change of use',
  'Small residential category',
  'Single detached',
  'Semi-detached / duplex',
  'Additional residential unit',
  'Garden suite / laneway suite / detached accessory dwelling',
  'Garage / accessory structure',
  'Existing dwelling-unit count',
  'Proposed dwelling-unit count',
  'Storeys',
  'Approximate building area',
  'Part 9 / Part 3 path placeholder',
  'Occupancy classification placeholder',
  'Schedule 1 Designer Information applicability',
  'BCIN/designer information applicability',
  'General review / architect / engineer involvement placeholder',
  'Applicable law / zoning / municipal precheck status',
  'Energy efficiency / SB-12 applicability',
  'Plumbing scope',
  'HVAC/mechanical scope',
  'Electrical authority boundary',
  'Municipal overlay review requirement',
  'Professional/AHJ review requirement',
  'Production approval status',
]

test('Ontario project taxonomy preserves BC Vancouver and BC fallback resolver behavior', () => {
  const vancouverResolution = resolveTemplateJurisdiction({ city: 'Vancouver' })
  const bcResolution = resolveTemplateJurisdiction({ city: 'Burnaby' })
  const emptyResolution = resolveTemplateJurisdiction({})

  assert.equal(vancouverResolution.status, 'active')
  assert.equal(vancouverResolution.slug, 'vbbl_2025')
  assert.equal(vancouverResolution.allowTemplateFallback, true)

  assert.equal(bcResolution.status, 'active')
  assert.equal(bcResolution.slug, 'bcbc_2024')
  assert.equal(bcResolution.allowTemplateFallback, true)

  assert.equal(emptyResolution.status, 'active')
  assert.equal(emptyResolution.slug, 'bcbc_2024')
  assert.equal(emptyResolution.allowTemplateFallback, true)
})

test('Ontario project taxonomy is dormant and not active', () => {
  const taxonomy = getDormantOntarioProjectTaxonomyFoundation()

  assert.equal(taxonomy, DORMANT_ONTARIO_PROJECT_TAXONOMY_FOUNDATION)
  assert.equal(taxonomy.taxonomyStatus, 'draft_planned_dormant_not_active')
  assert.equal(taxonomy.publicRoutingEnabled, false)
  assert.equal(taxonomy.dispatchEnabled, false)
  assert.equal(taxonomy.inspectorClaimingEnabled, false)
  assert.equal(taxonomy.activeTemplateResolutionEnabled, false)
  assert.equal(taxonomy.projectIntakeEnabled, false)
  assert.equal(taxonomy.databaseMigrationCreated, false)
  assert.equal(taxonomy.productionApprovalStatus, 'not_granted')
})

test('Ontario project taxonomy fields are draft planning fields only', () => {
  const taxonomy = getDormantOntarioProjectTaxonomyFoundation()

  assert.deepEqual(
    taxonomy.fields.map(field => field.label),
    expectedFieldLabels,
  )
  assert.ok(taxonomy.fields.every(field => field.status === 'draft_planned_dormant_not_active'))
  assert.ok(taxonomy.fields.every(field => field.reviewStatus === 'requires_review'))
  assert.ok(taxonomy.fields.every(field => field.isActiveProductionField === false))
  assert.ok(taxonomy.fields.every(field => field.requiresDatabaseMigrationBeforeActivation === true))
})

test('Ontario project taxonomy activation blockers preserve dormant launch boundaries', () => {
  const taxonomy = getDormantOntarioProjectTaxonomyFoundation()

  assert.ok(taxonomy.activationBlockers.some(blocker => blocker.includes('No database migration')))
  assert.ok(taxonomy.activationBlockers.some(blocker => blocker.includes('project intake is not enabled')))
  assert.ok(taxonomy.activationBlockers.some(blocker => blocker.includes('public routing is disabled')))
  assert.ok(taxonomy.activationBlockers.some(blocker => blocker.includes('builder dispatch is disabled')))
  assert.ok(taxonomy.activationBlockers.some(blocker => blocker.includes('inspector claiming is disabled')))
  assert.ok(taxonomy.activationBlockers.some(blocker => blocker.includes('active DB template resolution')))
})

test('Ontario project taxonomy connects to existing Ontario metadata rather than a second workflow', () => {
  const taxonomy = getDormantOntarioProjectTaxonomyFoundation()
  const overlayFoundation = getDormantOntarioMunicipalOverlayFoundation()
  const dryRun = getDormantOntarioAdminResolverDryRun()

  assert.equal(taxonomy.usesExistingOntarioMetadata, true)
  assert.equal(taxonomy.standaloneWorkflowCreated, false)
  assert.equal(overlayFoundation.standaloneWorkflowCreated, false)
  assert.equal(dryRun.standaloneWorkflowCreated, false)
  assert.equal(overlayFoundation.activeTemplateResolutionEnabled, false)
  assert.equal(dryRun.activeDbTemplateResolutionEnabled, false)
})

test('explicit Ontario project taxonomy context remains dormant and blocks BCBC fallback', () => {
  const result = resolveTemplateJurisdiction({
    city: 'Toronto',
    province: 'ON',
    context: 'Ontario taxonomy draft project intake',
  })

  assert.equal(result.status, 'dormant')
  assert.equal(result.family, 'ontario')
  assert.equal(result.slug, null)
  assert.equal(result.dormantSlug, 'obc_2024')
  assert.equal(result.allowTemplateFallback, false)
})
