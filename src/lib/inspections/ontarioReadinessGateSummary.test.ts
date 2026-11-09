import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ACTIVE_BC_TEMPLATE_JURISDICTIONS,
  DORMANT_ONTARIO_JURISDICTION_FAMILY,
  resolveTemplateJurisdiction,
} from './jurisdictionResolver'
import { DORMANT_ONTARIO_AUTHORITY_PACKAGE_WORDING_SPEC } from './ontarioAuthorityPackageWordingSpec'
import { DORMANT_ONTARIO_DRAFT_CHECKLIST_ITEM_CATALOG } from './ontarioDraftChecklistItemCatalog'
import { DORMANT_ONTARIO_EVIDENCE_DOCUMENT_REQUIREMENTS_FOUNDATION } from './ontarioEvidenceDocumentRequirementsFoundation'
import { DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR } from './ontarioIntakeRoutingReadinessSimulator'
import { getDormantOntarioReadinessGateSummary } from './ontarioReadinessGateSummary'
import { DORMANT_ONTARIO_TEMPLATE_GOVERNANCE } from './ontarioTemplateGovernance'

const EXPECTED_COMPONENTS = [
  'jurisdiction-scaffold',
  'planned-slugs',
  'municipal-overlays',
  'template-foundation',
  'stage-matrix',
  'governance-source-review',
  'resolver-dry-run',
  'project-taxonomy',
  'intake-routing-simulator',
  'draft-checklist-catalog',
  'evidence-document-requirements',
  'authority-wording-spec',
]

test('Ontario readiness gate does not change BC resolver behavior', () => {
  assert.equal(resolveTemplateJurisdiction({ city: 'Vancouver' }).slug, ACTIVE_BC_TEMPLATE_JURISDICTIONS.vancouver)
  assert.equal(resolveTemplateJurisdiction({ city: 'Burnaby' }).slug, ACTIVE_BC_TEMPLATE_JURISDICTIONS.provinceBase)
  assert.equal(resolveTemplateJurisdiction({ city: null }).slug, ACTIVE_BC_TEMPLATE_JURISDICTIONS.provinceBase)
})

test('Ontario readiness gate keeps every live activation gate disabled', () => {
  const result = resolveTemplateJurisdiction({ city: 'Toronto', province: 'ON' })
  const summary = getDormantOntarioReadinessGateSummary()

  assert.equal(result.status, 'dormant')
  assert.equal(result.allowTemplateFallback, false)
  assert.equal(summary.overallStatus, 'dormant_internal_planning_only')
  assert.equal(summary.isActive, false)
  assert.equal(summary.publicAvailabilityEnabled, false)
  assert.equal(summary.publicRoutingEnabled, false)
  assert.equal(summary.builderDispatchEnabled, false)
  assert.equal(summary.inspectorClaimingEnabled, false)
  assert.equal(summary.activeDbTemplateResolutionEnabled, false)
  assert.equal(summary.evidenceEnforcementEnabled, false)
  assert.equal(summary.authorityPackageGenerationEnabled, false)
  assert.equal(summary.checklistResponsesExpected, false)
  assert.equal(summary.productionApprovalStatus, 'not_granted')
  assert.equal(summary.supabaseDatabaseActivationPresent, false)
  assert.equal(summary.ontarioActivationMigrationPresent, false)
})

test('Ontario readiness gate blocks Schedule C-B reuse and Vault/seal/completion changes', () => {
  const summary = getDormantOntarioReadinessGateSummary()

  assert.equal(summary.scheduleCbReusedForOntario, false)
  assert.equal(summary.scheduleCbReuseStatus, 'blocked_not_applicable_to_ontario')
  assert.equal(summary.scheduleCbGenerationChanged, false)
  assert.equal(summary.vaultSealCompletionChanges, false)
  assert.equal(summary.vaultSealCompletionSecurityChanged, false)
})

test('Ontario readiness gate summarizes completed dormant components and blockers', () => {
  const summary = getDormantOntarioReadinessGateSummary()

  assert.deepEqual(
    summary.completedDormantComponents.map(component => component.id),
    EXPECTED_COMPONENTS,
  )
  assert.deepEqual(summary.plannedSlugs, [
    DORMANT_ONTARIO_JURISDICTION_FAMILY.baseSlug,
    ...DORMANT_ONTARIO_JURISDICTION_FAMILY.futureOverlays.map(overlay => overlay.slug),
  ])
  assert.ok(summary.completedDormantComponents.every(component => component.status === 'completed_dormant'))
  assert.ok(summary.activationBlockers.includes('Ontario source review required.'))
  assert.ok(summary.activationBlockers.includes('DB/migration plan required later.'))
  assert.ok(summary.activationBlockers.includes('Authority package generation review required later.'))
  assert.ok(summary.activationBlockers.includes('Evidence enforcement review required later.'))
  assert.ok(summary.publicAvailabilityStatement.includes('not available to builders'))
})

test('Ontario readiness gate reuses existing metadata instead of creating a second workflow', () => {
  const summary = getDormantOntarioReadinessGateSummary()

  assert.equal(summary.referencesExistingOntarioMetadata, true)
  assert.equal(summary.standaloneWorkflowCreated, false)
  assert.equal(DORMANT_ONTARIO_TEMPLATE_GOVERNANCE.activeTemplateResolutionEnabled, false)
  assert.equal(DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR.intakeEnabled, false)
  assert.equal(DORMANT_ONTARIO_DRAFT_CHECKLIST_ITEM_CATALOG.activeTemplateResolutionEnabled, false)
  assert.equal(DORMANT_ONTARIO_EVIDENCE_DOCUMENT_REQUIREMENTS_FOUNDATION.activeEvidenceEnforcementEnabled, false)
  assert.equal(DORMANT_ONTARIO_AUTHORITY_PACKAGE_WORDING_SPEC.authorityPackageGenerationEnabled, false)
  assert.equal(DORMANT_ONTARIO_AUTHORITY_PACKAGE_WORDING_SPEC.scheduleCbReusedForOntario, false)
})
