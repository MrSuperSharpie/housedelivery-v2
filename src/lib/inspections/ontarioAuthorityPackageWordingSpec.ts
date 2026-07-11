import { DORMANT_ONTARIO_JURISDICTION_FAMILY, resolveTemplateJurisdiction } from './jurisdictionResolver'
import { DORMANT_ONTARIO_DRAFT_CHECKLIST_ITEM_CATALOG } from './ontarioDraftChecklistItemCatalog'
import { DORMANT_ONTARIO_EVIDENCE_DOCUMENT_REQUIREMENTS_FOUNDATION } from './ontarioEvidenceDocumentRequirementsFoundation'
import { DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR } from './ontarioIntakeRoutingReadinessSimulator'
import { DORMANT_ONTARIO_TEMPLATE_GOVERNANCE } from './ontarioTemplateGovernance'

export type OntarioAuthorityPackageWordingSpecStatus = 'draft_internal_dormant_not_active'
export type OntarioAuthorityPackageWordingSpecReviewStatus = 'requires_review'
export type OntarioAuthorityPackageWordingSpecProductionApprovalStatus = 'not_granted'

export interface DormantOntarioAuthorityPackageWordingSpec {
  family: typeof DORMANT_ONTARIO_JURISDICTION_FAMILY.family
  statusLabel: 'Draft / Internal Only / Dormant / Not Active / Not Publicly Enabled / Not Production Approved'
  specStatus: OntarioAuthorityPackageWordingSpecStatus
  sourceDocumentPath: 'docs/specs/ontario-authority-package-wording-spec.md'
  sourceDocumentTitle: 'Ontario Authority Package Wording Specification for Vero Permit'
  recommendedPackageName: 'Ontario Permit Support Package'
  isActive: false
  publicEnabled: false
  authorityPackageGenerationEnabled: false
  productionApprovalStatus: OntarioAuthorityPackageWordingSpecProductionApprovalStatus
  wordingReviewStatus: OntarioAuthorityPackageWordingSpecReviewStatus
  scheduleCbReusedForOntario: false
  scheduleCbGenerationChanged: false
  vaultSealCompletionChanged: false
  vaultSealCompletionSecurityChanged: false
  publicRoutingEnabled: false
  dispatchEnabled: false
  inspectorClaimingEnabled: false
  activeTemplateResolutionEnabled: false
  referencesExistingOntarioChecklistCatalog: true
  referencesExistingOntarioEvidenceFoundation: true
  referencesExistingOntarioGovernance: true
  referencesExistingOntarioSimulator: true
  standaloneWorkflowCreated: false
  note: string
  requiredSeparations: string[]
  activationBlockers: string[]
}

export const DORMANT_ONTARIO_AUTHORITY_PACKAGE_WORDING_SPEC: DormantOntarioAuthorityPackageWordingSpec = {
  family: DORMANT_ONTARIO_JURISDICTION_FAMILY.family,
  statusLabel: 'Draft / Internal Only / Dormant / Not Active / Not Publicly Enabled / Not Production Approved',
  specStatus: 'draft_internal_dormant_not_active',
  sourceDocumentPath: 'docs/specs/ontario-authority-package-wording-spec.md',
  sourceDocumentTitle: 'Ontario Authority Package Wording Specification for Vero Permit',
  recommendedPackageName: 'Ontario Permit Support Package',
  isActive: false,
  publicEnabled: false,
  authorityPackageGenerationEnabled: false,
  productionApprovalStatus: 'not_granted',
  wordingReviewStatus: 'requires_review',
  scheduleCbReusedForOntario: false,
  scheduleCbGenerationChanged: false,
  vaultSealCompletionChanged: false,
  vaultSealCompletionSecurityChanged: false,
  publicRoutingEnabled: false,
  dispatchEnabled: false,
  inspectorClaimingEnabled: false,
  activeTemplateResolutionEnabled: false,
  referencesExistingOntarioChecklistCatalog: true,
  referencesExistingOntarioEvidenceFoundation: true,
  referencesExistingOntarioGovernance: true,
  referencesExistingOntarioSimulator: true,
  standaloneWorkflowCreated: false,
  note: 'Admin-only reference to the Pro-generated Ontario authority package wording specification. The spec is draft/internal only and does not enable Ontario package generation, public routing, dispatch, inspector claiming, active template resolution, Schedule C-B changes, or Vault/seal/completion changes.',
  requiredSeparations: [
    'Use Ontario Permit Support Package language for Ontario planning.',
    'Do not use BC Schedule C-B for Ontario package wording.',
    'Do not reuse BC Letters of Assurance language for Ontario unless separately reviewed.',
    'Do not imply Vero issues permits, confirms compliance, or replaces Ontario municipalities, CBOs, inspectors, designers, architects, engineers, BCIN, ESA, or other authorities.',
  ],
  activationBlockers: [
    'Ontario authority wording is draft/internal only.',
    'Ontario legal, municipal-process, and professional-practice review is required before production use.',
    'Ontario authority package generation is disabled.',
    'Ontario wording is not publicly enabled.',
    'Production approval has not been granted.',
    'BC Schedule C-B is not reused for Ontario.',
    'Schedule C-B generation is unchanged.',
    'Vault/seal/completion behavior is unchanged.',
    'Ontario public routing is disabled.',
    'Ontario builder dispatch is disabled.',
    'Ontario inspector claiming is disabled.',
  ],
}

export function getDormantOntarioAuthorityPackageWordingSpec(): DormantOntarioAuthorityPackageWordingSpec {
  const ontarioResolution = resolveTemplateJurisdiction({
    city: 'Toronto',
    province: DORMANT_ONTARIO_JURISDICTION_FAMILY.province,
    context: 'Ontario authority package wording spec',
  })

  if (ontarioResolution.status !== 'dormant' || ontarioResolution.allowTemplateFallback) {
    throw new Error('Ontario authority package wording spec requires explicit Ontario context to remain dormant.')
  }
  if (DORMANT_ONTARIO_DRAFT_CHECKLIST_ITEM_CATALOG.activeTemplateResolutionEnabled) {
    throw new Error('Ontario authority wording spec requires the draft checklist catalog to stay out of active resolution.')
  }
  if (DORMANT_ONTARIO_EVIDENCE_DOCUMENT_REQUIREMENTS_FOUNDATION.activeEvidenceEnforcementEnabled) {
    throw new Error('Ontario authority wording spec requires evidence enforcement to remain disabled.')
  }
  if (DORMANT_ONTARIO_EVIDENCE_DOCUMENT_REQUIREMENTS_FOUNDATION.activeTemplateResolutionEnabled) {
    throw new Error('Ontario authority wording spec requires evidence foundation to stay out of active resolution.')
  }
  if (DORMANT_ONTARIO_TEMPLATE_GOVERNANCE.activeTemplateResolutionEnabled) {
    throw new Error('Ontario authority wording spec requires governance to keep active template resolution disabled.')
  }
  if (DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR.activeDbTemplateResolutionEnabled) {
    throw new Error('Ontario authority wording spec requires the intake/routing simulator to stay inactive.')
  }

  return DORMANT_ONTARIO_AUTHORITY_PACKAGE_WORDING_SPEC
}
