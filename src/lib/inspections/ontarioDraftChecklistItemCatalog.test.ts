import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ACTIVE_BC_TEMPLATE_JURISDICTIONS,
  DORMANT_ONTARIO_JURISDICTION_FAMILY,
  resolveTemplateJurisdiction,
} from './jurisdictionResolver'
import { getDormantOntarioDraftChecklistItemCatalog } from './ontarioDraftChecklistItemCatalog'
import { DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR } from './ontarioIntakeRoutingReadinessSimulator'
import { DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION } from './ontarioMunicipalOverlayFoundation'
import { DORMANT_ONTARIO_PROJECT_TAXONOMY_FOUNDATION } from './ontarioProjectTaxonomyFoundation'
import { DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION } from './ontarioSmallResidentialTemplateFoundation'
import { DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX } from './ontarioStageAlignedTemplateMatrix'
import { DORMANT_ONTARIO_TEMPLATE_GOVERNANCE } from './ontarioTemplateGovernance'

const REQUIRED_DRAFT_ITEM_GROUPS = [
  'obc-2024-small-residential-core-readiness',
  'permit-construct-demolish-application-readiness',
  'schedule-1-designer-information-readiness',
  'bcin-designer-information-readiness',
  'site-plan-readiness',
  'architectural-drawing-readiness',
  'structural-drawing-detail-readiness',
  'energy-efficiency-sb-12-readiness',
  'plumbing-scope-readiness',
  'hvac-mechanical-scope-readiness',
  'electrical-authority-boundary-readiness',
  'applicable-law-zoning-municipal-precheck-readiness',
  'municipal-overlay-review-readiness',
  'final-inspection-occupancy-readiness',
]

test('Ontario draft checklist catalog does not change BC resolver behavior', () => {
  assert.equal(resolveTemplateJurisdiction({ city: 'Vancouver' }).slug, ACTIVE_BC_TEMPLATE_JURISDICTIONS.vancouver)
  assert.equal(resolveTemplateJurisdiction({ city: 'Burnaby' }).slug, ACTIVE_BC_TEMPLATE_JURISDICTIONS.provinceBase)
  assert.equal(resolveTemplateJurisdiction({ city: null }).slug, ACTIVE_BC_TEMPLATE_JURISDICTIONS.provinceBase)
})

test('Ontario draft checklist catalog remains dormant and blocks BCBC fallback for Ontario context', () => {
  const result = resolveTemplateJurisdiction({ city: 'Toronto', province: 'ON' })
  const catalog = getDormantOntarioDraftChecklistItemCatalog()

  assert.equal(result.status, 'dormant')
  assert.equal(result.allowTemplateFallback, false)
  assert.equal(result.dormantSlug, DORMANT_ONTARIO_JURISDICTION_FAMILY.baseSlug)
  assert.equal(catalog.isActive, false)
  assert.equal(catalog.activeTemplatesCreated, false)
  assert.equal(catalog.databaseRowsCreated, false)
  assert.equal(catalog.databaseMigrationCreated, false)
  assert.equal(catalog.publicRoutingEnabled, false)
  assert.equal(catalog.dispatchEnabled, false)
  assert.equal(catalog.inspectorClaimingEnabled, false)
  assert.equal(catalog.activeTemplateResolutionEnabled, false)
  assert.equal(catalog.checklistResponsesExpected, false)
  assert.equal(catalog.productionApprovalStatus, 'not_granted')
})

test('Ontario draft checklist item groups are present and are not active templates', () => {
  const catalog = getDormantOntarioDraftChecklistItemCatalog()

  assert.deepEqual(
    catalog.items.map(item => item.itemId),
    REQUIRED_DRAFT_ITEM_GROUPS,
  )

  for (const item of catalog.items) {
    assert.equal(item.sourceReviewStatus, 'requires_review')
    assert.equal(item.municipalReviewStatus, 'requires_review')
    assert.equal(item.professionalReviewStatus, 'requires_review')
    assert.equal(item.productionApprovalStatus, 'not_granted')
    assert.equal(item.activeTemplateResolutionEnabled, false)
    assert.equal(item.publicEnabled, false)
    assert.equal(item.dispatchEnabled, false)
    assert.equal(item.inspectorClaimingEnabled, false)
    assert.ok(item.activationBlockers.includes('Ontario checklist items are not active templates.'))
    assert.ok(item.activationBlockers.includes('No Ontario DB rows or migrations exist for these items.'))
  }
})

test('Ontario draft checklist catalog reuses existing dormant Ontario scaffold metadata', () => {
  const catalog = getDormantOntarioDraftChecklistItemCatalog()
  const foundationCategoryIds = new Set(
    DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION.categories.map(category => category.id),
  )
  const stageIds = new Set(DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX.stages.map(stage => stage.stageId))

  assert.equal(catalog.referencesExistingOntarioFoundation, true)
  assert.equal(catalog.referencesExistingOntarioStageMatrix, true)
  assert.equal(catalog.referencesExistingOntarioTaxonomy, true)
  assert.equal(catalog.referencesExistingOntarioMunicipalOverlays, true)
  assert.equal(catalog.referencesExistingOntarioGovernance, true)
  assert.equal(catalog.referencesExistingOntarioSimulator, true)
  assert.equal(catalog.standaloneWorkflowCreated, false)

  assert.equal(DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION.participatesInActiveDbResolution, false)
  assert.equal(DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX.participatesInActiveDbResolution, false)
  assert.equal(DORMANT_ONTARIO_PROJECT_TAXONOMY_FOUNDATION.activeTemplateResolutionEnabled, false)
  assert.equal(DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION.activeTemplateResolutionEnabled, false)
  assert.equal(DORMANT_ONTARIO_TEMPLATE_GOVERNANCE.activeTemplateResolutionEnabled, false)
  assert.equal(DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR.activeDbTemplateResolutionEnabled, false)

  for (const item of catalog.items) {
    assert.ok(foundationCategoryIds.has(item.foundationCategoryId))
    assert.ok(item.stageCodes.length > 0)
    assert.ok(item.stageCodes.every(stageCode => stageIds.has(stageCode)))
  }
})
