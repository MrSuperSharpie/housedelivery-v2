import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ACTIVE_BC_TEMPLATE_JURISDICTIONS,
  DORMANT_ONTARIO_JURISDICTION_FAMILY,
  resolveTemplateJurisdiction,
} from './jurisdictionResolver'
import { DORMANT_ONTARIO_DRAFT_CHECKLIST_ITEM_CATALOG } from './ontarioDraftChecklistItemCatalog'
import { getDormantOntarioEvidenceDocumentRequirementsFoundation } from './ontarioEvidenceDocumentRequirementsFoundation'
import { DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR } from './ontarioIntakeRoutingReadinessSimulator'
import { DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION } from './ontarioMunicipalOverlayFoundation'
import { DORMANT_ONTARIO_PROJECT_TAXONOMY_FOUNDATION } from './ontarioProjectTaxonomyFoundation'
import { DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION } from './ontarioSmallResidentialTemplateFoundation'
import { DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX } from './ontarioStageAlignedTemplateMatrix'
import { DORMANT_ONTARIO_TEMPLATE_GOVERNANCE } from './ontarioTemplateGovernance'

const REQUIRED_EVIDENCE_DOCUMENT_GROUPS = [
  'permit-construct-demolish-application-package',
  'schedule-1-designer-information',
  'bcin-designer-information',
  'site-plan',
  'architectural-drawings',
  'structural-drawings-details-where-applicable',
  'energy-efficiency-sb-12-documentation-where-applicable',
  'plumbing-scope-documentation',
  'hvac-mechanical-scope-documentation',
  'electrical-authority-boundary-documentation',
  'applicable-law-zoning-municipal-precheck-documentation',
  'municipal-overlay-supplemental-forms',
  'inspection-photos-field-evidence-planning-placeholder',
  'final-inspection-occupancy-readiness-documentation',
]

test('Ontario evidence/document foundation does not change BC resolver behavior', () => {
  assert.equal(resolveTemplateJurisdiction({ city: 'Vancouver' }).slug, ACTIVE_BC_TEMPLATE_JURISDICTIONS.vancouver)
  assert.equal(resolveTemplateJurisdiction({ city: 'Burnaby' }).slug, ACTIVE_BC_TEMPLATE_JURISDICTIONS.provinceBase)
  assert.equal(resolveTemplateJurisdiction({ city: null }).slug, ACTIVE_BC_TEMPLATE_JURISDICTIONS.provinceBase)
})

test('Ontario evidence/document foundation remains dormant and blocks BCBC fallback for Ontario context', () => {
  const result = resolveTemplateJurisdiction({ city: 'Toronto', province: 'ON' })
  const foundation = getDormantOntarioEvidenceDocumentRequirementsFoundation()

  assert.equal(result.status, 'dormant')
  assert.equal(result.allowTemplateFallback, false)
  assert.equal(result.dormantSlug, DORMANT_ONTARIO_JURISDICTION_FAMILY.baseSlug)
  assert.equal(foundation.isActive, false)
  assert.equal(foundation.activeRequirementsCreated, false)
  assert.equal(foundation.activeEvidenceEnforcementEnabled, false)
  assert.equal(foundation.databaseRowsCreated, false)
  assert.equal(foundation.databaseMigrationCreated, false)
  assert.equal(foundation.publicRoutingEnabled, false)
  assert.equal(foundation.dispatchEnabled, false)
  assert.equal(foundation.inspectorClaimingEnabled, false)
  assert.equal(foundation.activeTemplateResolutionEnabled, false)
  assert.equal(foundation.checklistResponsesExpected, false)
  assert.equal(foundation.productionApprovalStatus, 'not_granted')
})

test('Ontario evidence/document requirements are present and not enforced', () => {
  const foundation = getDormantOntarioEvidenceDocumentRequirementsFoundation()

  assert.deepEqual(
    foundation.requirements.map(requirement => requirement.requirementId),
    REQUIRED_EVIDENCE_DOCUMENT_GROUPS,
  )

  for (const requirement of foundation.requirements) {
    assert.equal(requirement.requiredStatus, 'draft_planned_dormant_not_active_not_enforced')
    assert.equal(requirement.sourceReviewStatus, 'requires_review')
    assert.equal(requirement.municipalReviewStatus, 'requires_review')
    assert.equal(requirement.professionalReviewStatus, 'requires_review')
    assert.equal(requirement.productionApprovalStatus, 'not_granted')
    assert.equal(requirement.activeEvidenceEnforcementEnabled, false)
    assert.equal(requirement.activeTemplateResolutionEnabled, false)
    assert.equal(requirement.publicEnabled, false)
    assert.equal(requirement.dispatchEnabled, false)
    assert.equal(requirement.inspectorClaimingEnabled, false)
    assert.ok(requirement.activationBlockers.includes('Ontario evidence upload enforcement is not active.'))
    assert.ok(requirement.activationBlockers.includes('No Ontario DB rows or migrations exist for these requirements.'))
  }
})

test('Ontario evidence/document foundation reuses existing dormant Ontario scaffold metadata', () => {
  const foundation = getDormantOntarioEvidenceDocumentRequirementsFoundation()
  const checklistItemIds = new Set(DORMANT_ONTARIO_DRAFT_CHECKLIST_ITEM_CATALOG.items.map(item => item.itemId))
  const stageIds = new Set(DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX.stages.map(stage => stage.stageId))

  assert.equal(foundation.referencesExistingOntarioChecklistCatalog, true)
  assert.equal(foundation.referencesExistingOntarioFoundation, true)
  assert.equal(foundation.referencesExistingOntarioStageMatrix, true)
  assert.equal(foundation.referencesExistingOntarioTaxonomy, true)
  assert.equal(foundation.referencesExistingOntarioMunicipalOverlays, true)
  assert.equal(foundation.referencesExistingOntarioGovernance, true)
  assert.equal(foundation.referencesExistingOntarioSimulator, true)
  assert.equal(foundation.standaloneWorkflowCreated, false)

  assert.equal(DORMANT_ONTARIO_DRAFT_CHECKLIST_ITEM_CATALOG.activeTemplateResolutionEnabled, false)
  assert.equal(DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION.participatesInActiveDbResolution, false)
  assert.equal(DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX.participatesInActiveDbResolution, false)
  assert.equal(DORMANT_ONTARIO_PROJECT_TAXONOMY_FOUNDATION.activeTemplateResolutionEnabled, false)
  assert.equal(DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION.activeTemplateResolutionEnabled, false)
  assert.equal(DORMANT_ONTARIO_TEMPLATE_GOVERNANCE.activeTemplateResolutionEnabled, false)
  assert.equal(DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR.activeDbTemplateResolutionEnabled, false)

  for (const requirement of foundation.requirements) {
    assert.ok(requirement.relatedChecklistItemIds.length > 0)
    assert.ok(requirement.relatedChecklistItemIds.every(itemId => checklistItemIds.has(itemId)))
    assert.ok(requirement.relatedStageCodes.length > 0)
    assert.ok(requirement.relatedStageCodes.every(stageCode => stageIds.has(stageCode)))
  }
})
