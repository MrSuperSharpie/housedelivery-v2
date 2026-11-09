import { DORMANT_ONTARIO_ADMIN_RESOLVER_DRY_RUN } from './ontarioAdminResolverDryRun'
import { DORMANT_ONTARIO_AUTHORITY_PACKAGE_WORDING_SPEC } from './ontarioAuthorityPackageWordingSpec'
import { DORMANT_ONTARIO_DRAFT_CHECKLIST_ITEM_CATALOG } from './ontarioDraftChecklistItemCatalog'
import { DORMANT_ONTARIO_EVIDENCE_DOCUMENT_REQUIREMENTS_FOUNDATION } from './ontarioEvidenceDocumentRequirementsFoundation'
import { DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR } from './ontarioIntakeRoutingReadinessSimulator'
import {
  DORMANT_ONTARIO_JURISDICTION_FAMILY,
  getDormantOntarioCoverageReadiness,
  resolveTemplateJurisdiction,
} from './jurisdictionResolver'
import { DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION } from './ontarioMunicipalOverlayFoundation'
import { DORMANT_ONTARIO_PROJECT_TAXONOMY_FOUNDATION } from './ontarioProjectTaxonomyFoundation'
import { DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION } from './ontarioSmallResidentialTemplateFoundation'
import { DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX } from './ontarioStageAlignedTemplateMatrix'
import { DORMANT_ONTARIO_TEMPLATE_GOVERNANCE } from './ontarioTemplateGovernance'

export type OntarioReadinessGateStatus = 'dormant_internal_planning_only'
export type OntarioReadinessGateProductionApprovalStatus = 'not_granted'

export interface OntarioReadinessGateComponent {
  id: string
  label: string
  status: 'completed_dormant'
  note: string
}

export interface DormantOntarioReadinessGateSummary {
  family: typeof DORMANT_ONTARIO_JURISDICTION_FAMILY.family
  statusLabel: 'Dormant / Internal Planning Only / Not Active / Not Publicly Enabled / Not Production Approved'
  overallStatus: OntarioReadinessGateStatus
  isActive: false
  publicAvailabilityEnabled: false
  publicRoutingEnabled: false
  builderDispatchEnabled: false
  inspectorClaimingEnabled: false
  activeDbTemplateResolutionEnabled: false
  evidenceEnforcementEnabled: false
  authorityPackageGenerationEnabled: false
  productionApprovalStatus: OntarioReadinessGateProductionApprovalStatus
  checklistResponsesExpected: false
  supabaseDatabaseActivationPresent: false
  ontarioActivationMigrationPresent: false
  scheduleCbReusedForOntario: false
  scheduleCbReuseStatus: 'blocked_not_applicable_to_ontario'
  scheduleCbGenerationChanged: false
  vaultSealCompletionChanges: false
  vaultSealCompletionSecurityChanged: false
  referencesExistingOntarioMetadata: true
  standaloneWorkflowCreated: false
  plannedSlugs: string[]
  completedDormantComponents: OntarioReadinessGateComponent[]
  activationBlockers: string[]
  futureReviewsRequired: string[]
  publicAvailabilityStatement: string
}

const COMPLETED_DORMANT_COMPONENTS: OntarioReadinessGateComponent[] = [
  {
    id: 'jurisdiction-scaffold',
    label: 'Jurisdiction scaffold',
    status: 'completed_dormant',
    note: `Ontario family and base slug ${DORMANT_ONTARIO_JURISDICTION_FAMILY.baseSlug} exist as dormant metadata only.`,
  },
  {
    id: 'planned-slugs',
    label: 'Planned slugs',
    status: 'completed_dormant',
    note: 'Province-level and municipal overlay slugs are planned only and not active.',
  },
  {
    id: 'municipal-overlays',
    label: 'Municipal overlays',
    status: 'completed_dormant',
    note: `${DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION.overlays.length} municipal overlays are draft/planned and require review.`,
  },
  {
    id: 'template-foundation',
    label: 'Template foundation',
    status: 'completed_dormant',
    note: `${DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION.categories.length} small-residential foundation categories are internal planning only.`,
  },
  {
    id: 'stage-matrix',
    label: 'S01-S15 stage matrix',
    status: 'completed_dormant',
    note: `${DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX.stages.length} Vero stages are mapped for draft Ontario planning only.`,
  },
  {
    id: 'governance-source-review',
    label: 'Governance/source review',
    status: 'completed_dormant',
    note: 'Source, municipal, professional/AHJ, and production approval gates remain required.',
  },
  {
    id: 'resolver-dry-run',
    label: 'Resolver dry-run',
    status: 'completed_dormant',
    note: `${DORMANT_ONTARIO_ADMIN_RESOLVER_DRY_RUN.cases.length} dry-run cases block BCBC fallback without active DB resolution.`,
  },
  {
    id: 'project-taxonomy',
    label: 'Project taxonomy',
    status: 'completed_dormant',
    note: `${DORMANT_ONTARIO_PROJECT_TAXONOMY_FOUNDATION.fields.length} taxonomy fields are planned only and require later DB/migration review.`,
  },
  {
    id: 'intake-routing-simulator',
    label: 'Intake/routing simulator',
    status: 'completed_dormant',
    note: `${DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR.scenarios.length} internal scenarios are simulated without live intake or routing.`,
  },
  {
    id: 'draft-checklist-catalog',
    label: 'Draft checklist catalog',
    status: 'completed_dormant',
    note: `${DORMANT_ONTARIO_DRAFT_CHECKLIST_ITEM_CATALOG.items.length} draft item groups are not active templates.`,
  },
  {
    id: 'evidence-document-requirements',
    label: 'Evidence/document requirements',
    status: 'completed_dormant',
    note: `${DORMANT_ONTARIO_EVIDENCE_DOCUMENT_REQUIREMENTS_FOUNDATION.requirements.length} draft requirement groups are not enforced.`,
  },
  {
    id: 'authority-wording-spec',
    label: 'Authority wording spec',
    status: 'completed_dormant',
    note: 'The Ontario authority wording spec is copied into docs and does not enable package generation.',
  },
]

export const DORMANT_ONTARIO_READINESS_GATE_SUMMARY: DormantOntarioReadinessGateSummary = {
  family: DORMANT_ONTARIO_JURISDICTION_FAMILY.family,
  statusLabel: 'Dormant / Internal Planning Only / Not Active / Not Publicly Enabled / Not Production Approved',
  overallStatus: 'dormant_internal_planning_only',
  isActive: false,
  publicAvailabilityEnabled: false,
  publicRoutingEnabled: false,
  builderDispatchEnabled: false,
  inspectorClaimingEnabled: false,
  activeDbTemplateResolutionEnabled: false,
  evidenceEnforcementEnabled: false,
  authorityPackageGenerationEnabled: false,
  productionApprovalStatus: 'not_granted',
  checklistResponsesExpected: false,
  supabaseDatabaseActivationPresent: false,
  ontarioActivationMigrationPresent: false,
  scheduleCbReusedForOntario: false,
  scheduleCbReuseStatus: 'blocked_not_applicable_to_ontario',
  scheduleCbGenerationChanged: false,
  vaultSealCompletionChanges: false,
  vaultSealCompletionSecurityChanged: false,
  referencesExistingOntarioMetadata: true,
  standaloneWorkflowCreated: false,
  plannedSlugs: [
    DORMANT_ONTARIO_JURISDICTION_FAMILY.baseSlug,
    ...DORMANT_ONTARIO_JURISDICTION_FAMILY.futureOverlays.map(overlay => overlay.slug),
  ],
  completedDormantComponents: COMPLETED_DORMANT_COMPONENTS,
  activationBlockers: [
    'Ontario source review required.',
    'Municipal source review required.',
    'Professional/AHJ review required.',
    'Production approval required.',
    'DB/migration plan required later.',
    'Template governance/publish workflow required later.',
    'Inspector eligibility/credential review required later.',
    'Authority package generation review required later.',
    'Evidence enforcement review required later.',
    'Public routing/dispatch decision required later.',
    'Vercel/production promotion decision required later.',
  ],
  futureReviewsRequired: [
    'Ontario source review',
    'Municipal source review',
    'Professional/AHJ review',
    'Template governance/publish workflow',
    'Inspector eligibility/credential review',
    'Authority package generation review',
    'Evidence enforcement review',
    'Production approval and promotion review',
  ],
  publicAvailabilityStatement:
    'Ontario is not available to builders, inspectors, public workflows, production routing, evidence enforcement, authority package generation, or active DB template resolution.',
}

export function getDormantOntarioReadinessGateSummary(): DormantOntarioReadinessGateSummary {
  const coverage = getDormantOntarioCoverageReadiness()
  const ontarioResolution = resolveTemplateJurisdiction({
    city: 'Toronto',
    province: DORMANT_ONTARIO_JURISDICTION_FAMILY.province,
    context: 'Ontario readiness gate summary',
  })

  if (ontarioResolution.status !== 'dormant' || ontarioResolution.allowTemplateFallback) {
    throw new Error('Ontario readiness gate requires explicit Ontario context to remain dormant.')
  }
  if (coverage.isActive || coverage.publicRoutingEnabled || coverage.dispatchEnabled || coverage.templatesActive) {
    throw new Error('Ontario readiness gate requires Ontario coverage to remain inactive.')
  }
  if (DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION.participatesInActiveDbResolution) {
    throw new Error('Ontario readiness gate requires the template foundation to stay out of active DB resolution.')
  }
  if (DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX.participatesInActiveDbResolution) {
    throw new Error('Ontario readiness gate requires the stage matrix to stay out of active DB resolution.')
  }
  if (DORMANT_ONTARIO_TEMPLATE_GOVERNANCE.activeTemplateResolutionEnabled) {
    throw new Error('Ontario readiness gate requires governance to keep active DB resolution disabled.')
  }
  if (DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION.activeTemplateResolutionEnabled) {
    throw new Error('Ontario readiness gate requires municipal overlays to stay out of active DB resolution.')
  }
  if (DORMANT_ONTARIO_ADMIN_RESOLVER_DRY_RUN.activeDbTemplateResolutionEnabled) {
    throw new Error('Ontario readiness gate requires resolver dry-run to stay out of active DB resolution.')
  }
  if (DORMANT_ONTARIO_PROJECT_TAXONOMY_FOUNDATION.projectIntakeEnabled) {
    throw new Error('Ontario readiness gate requires project intake to stay disabled.')
  }
  if (DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR.intakeEnabled) {
    throw new Error('Ontario readiness gate requires intake/routing simulator to stay inactive.')
  }
  if (DORMANT_ONTARIO_DRAFT_CHECKLIST_ITEM_CATALOG.activeTemplateResolutionEnabled) {
    throw new Error('Ontario readiness gate requires the draft checklist catalog to stay out of active resolution.')
  }
  if (DORMANT_ONTARIO_EVIDENCE_DOCUMENT_REQUIREMENTS_FOUNDATION.activeEvidenceEnforcementEnabled) {
    throw new Error('Ontario readiness gate requires evidence enforcement to remain disabled.')
  }
  if (DORMANT_ONTARIO_AUTHORITY_PACKAGE_WORDING_SPEC.authorityPackageGenerationEnabled) {
    throw new Error('Ontario readiness gate requires authority package generation to remain disabled.')
  }
  if (
    DORMANT_ONTARIO_AUTHORITY_PACKAGE_WORDING_SPEC.scheduleCbReusedForOntario ||
    DORMANT_ONTARIO_AUTHORITY_PACKAGE_WORDING_SPEC.scheduleCbGenerationChanged ||
    DORMANT_ONTARIO_AUTHORITY_PACKAGE_WORDING_SPEC.vaultSealCompletionChanged ||
    DORMANT_ONTARIO_AUTHORITY_PACKAGE_WORDING_SPEC.vaultSealCompletionSecurityChanged
  ) {
    throw new Error('Ontario readiness gate requires Schedule C-B and Vault/seal/completion to remain unchanged.')
  }

  return DORMANT_ONTARIO_READINESS_GATE_SUMMARY
}
