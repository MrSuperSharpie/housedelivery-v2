import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  ACTIVE_BC_TEMPLATE_JURISDICTIONS,
  DORMANT_ONTARIO_JURISDICTION_FAMILY,
  resolveTemplateJurisdiction,
} from './jurisdictionResolver'
import { DORMANT_ONTARIO_DRAFT_CHECKLIST_ITEM_CATALOG } from './ontarioDraftChecklistItemCatalog'
import { DORMANT_ONTARIO_EVIDENCE_DOCUMENT_REQUIREMENTS_FOUNDATION } from './ontarioEvidenceDocumentRequirementsFoundation'
import { getDormantOntarioAuthorityPackageWordingSpec } from './ontarioAuthorityPackageWordingSpec'
import { DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR } from './ontarioIntakeRoutingReadinessSimulator'
import { DORMANT_ONTARIO_TEMPLATE_GOVERNANCE } from './ontarioTemplateGovernance'

test('Ontario authority wording spec does not change BC resolver behavior', () => {
  assert.equal(resolveTemplateJurisdiction({ city: 'Vancouver' }).slug, ACTIVE_BC_TEMPLATE_JURISDICTIONS.vancouver)
  assert.equal(resolveTemplateJurisdiction({ city: 'Burnaby' }).slug, ACTIVE_BC_TEMPLATE_JURISDICTIONS.provinceBase)
  assert.equal(resolveTemplateJurisdiction({ city: null }).slug, ACTIVE_BC_TEMPLATE_JURISDICTIONS.provinceBase)
})

test('Ontario authority wording spec remains dormant and does not enable package generation', () => {
  const result = resolveTemplateJurisdiction({ city: 'Toronto', province: 'ON' })
  const spec = getDormantOntarioAuthorityPackageWordingSpec()

  assert.equal(result.status, 'dormant')
  assert.equal(result.allowTemplateFallback, false)
  assert.equal(result.dormantSlug, DORMANT_ONTARIO_JURISDICTION_FAMILY.baseSlug)
  assert.equal(spec.isActive, false)
  assert.equal(spec.publicEnabled, false)
  assert.equal(spec.authorityPackageGenerationEnabled, false)
  assert.equal(spec.productionApprovalStatus, 'not_granted')
  assert.equal(spec.wordingReviewStatus, 'requires_review')
  assert.equal(spec.publicRoutingEnabled, false)
  assert.equal(spec.dispatchEnabled, false)
  assert.equal(spec.inspectorClaimingEnabled, false)
  assert.equal(spec.activeTemplateResolutionEnabled, false)
})

test('Ontario authority wording spec keeps Schedule C-B and Vault/seal/completion unchanged', () => {
  const spec = getDormantOntarioAuthorityPackageWordingSpec()

  assert.equal(spec.scheduleCbReusedForOntario, false)
  assert.equal(spec.scheduleCbGenerationChanged, false)
  assert.equal(spec.vaultSealCompletionChanged, false)
  assert.equal(spec.vaultSealCompletionSecurityChanged, false)
  assert.ok(spec.activationBlockers.includes('BC Schedule C-B is not reused for Ontario.'))
  assert.ok(spec.activationBlockers.includes('Schedule C-B generation is unchanged.'))
  assert.ok(spec.activationBlockers.includes('Vault/seal/completion behavior is unchanged.'))
})

test('Ontario authority wording spec references the copied Pro-generated source document', () => {
  const spec = getDormantOntarioAuthorityPackageWordingSpec()
  const source = readFileSync(spec.sourceDocumentPath, 'utf8')

  assert.equal(spec.sourceDocumentPath, 'docs/specs/ontario-authority-package-wording-spec.md')
  assert.match(source, /^# Ontario Authority Package Wording Specification for Vero Permit/m)
  assert.match(source, /Ontario Permit Support Package/)
  assert.match(source, /Do not use BC Schedule C-B/)
  assert.match(source, /Draft only/)
})

test('Ontario authority wording spec reuses existing dormant Ontario metadata', () => {
  const spec = getDormantOntarioAuthorityPackageWordingSpec()

  assert.equal(spec.referencesExistingOntarioChecklistCatalog, true)
  assert.equal(spec.referencesExistingOntarioEvidenceFoundation, true)
  assert.equal(spec.referencesExistingOntarioGovernance, true)
  assert.equal(spec.referencesExistingOntarioSimulator, true)
  assert.equal(spec.standaloneWorkflowCreated, false)

  assert.equal(DORMANT_ONTARIO_DRAFT_CHECKLIST_ITEM_CATALOG.activeTemplateResolutionEnabled, false)
  assert.equal(DORMANT_ONTARIO_EVIDENCE_DOCUMENT_REQUIREMENTS_FOUNDATION.activeEvidenceEnforcementEnabled, false)
  assert.equal(DORMANT_ONTARIO_EVIDENCE_DOCUMENT_REQUIREMENTS_FOUNDATION.activeTemplateResolutionEnabled, false)
  assert.equal(DORMANT_ONTARIO_TEMPLATE_GOVERNANCE.activeTemplateResolutionEnabled, false)
  assert.equal(DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR.activeDbTemplateResolutionEnabled, false)
})
