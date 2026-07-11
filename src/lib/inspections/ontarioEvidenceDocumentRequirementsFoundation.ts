import { DORMANT_ONTARIO_JURISDICTION_FAMILY, resolveTemplateJurisdiction } from './jurisdictionResolver'
import {
  DORMANT_ONTARIO_DRAFT_CHECKLIST_ITEM_CATALOG,
  type OntarioDraftChecklistItem,
} from './ontarioDraftChecklistItemCatalog'
import { DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR } from './ontarioIntakeRoutingReadinessSimulator'
import { DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION } from './ontarioMunicipalOverlayFoundation'
import { DORMANT_ONTARIO_PROJECT_TAXONOMY_FOUNDATION } from './ontarioProjectTaxonomyFoundation'
import { DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION } from './ontarioSmallResidentialTemplateFoundation'
import {
  DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX,
  type VeroInspectionStageId,
} from './ontarioStageAlignedTemplateMatrix'
import { DORMANT_ONTARIO_TEMPLATE_GOVERNANCE } from './ontarioTemplateGovernance'

export type OntarioEvidenceRequirementStatus = 'draft_planned_dormant_not_active_not_enforced'
export type OntarioEvidenceRequirementType =
  | 'document_package'
  | 'designer_information'
  | 'drawing_document'
  | 'scope_document'
  | 'authority_boundary_document'
  | 'municipal_precheck_document'
  | 'field_evidence_planning'
  | 'final_readiness_document'
export type OntarioEvidenceRequirementReviewStatus = 'requires_review'
export type OntarioEvidenceRequirementProductionApprovalStatus = 'not_granted'

export interface OntarioEvidenceDocumentRequirement {
  requirementId: string
  title: string
  draftDescription: string
  relatedChecklistItemIds: string[]
  relatedStageCodes: VeroInspectionStageId[]
  requirementType: OntarioEvidenceRequirementType
  appliesToMunicipalities: string[]
  requiredStatus: OntarioEvidenceRequirementStatus
  sourceReviewStatus: OntarioEvidenceRequirementReviewStatus
  municipalReviewStatus: OntarioEvidenceRequirementReviewStatus
  professionalReviewStatus: OntarioEvidenceRequirementReviewStatus
  productionApprovalStatus: OntarioEvidenceRequirementProductionApprovalStatus
  activeEvidenceEnforcementEnabled: false
  activeTemplateResolutionEnabled: false
  publicEnabled: false
  dispatchEnabled: false
  inspectorClaimingEnabled: false
  activationBlockers: string[]
}

export interface DormantOntarioEvidenceDocumentRequirementsFoundation {
  family: typeof DORMANT_ONTARIO_JURISDICTION_FAMILY.family
  statusLabel: 'Draft / Planned / Dormant / Not Active / Not Publicly Enabled / Not Enforced / Not Production Approved'
  foundationStatus: OntarioEvidenceRequirementStatus
  isActive: false
  activeRequirementsCreated: false
  activeEvidenceEnforcementEnabled: false
  databaseRowsCreated: false
  databaseMigrationCreated: false
  publicRoutingEnabled: false
  dispatchEnabled: false
  inspectorClaimingEnabled: false
  activeTemplateResolutionEnabled: false
  checklistResponsesExpected: false
  sourceReviewStatus: OntarioEvidenceRequirementReviewStatus
  municipalReviewStatus: OntarioEvidenceRequirementReviewStatus
  professionalReviewStatus: OntarioEvidenceRequirementReviewStatus
  productionApprovalStatus: OntarioEvidenceRequirementProductionApprovalStatus
  referencesExistingOntarioChecklistCatalog: true
  referencesExistingOntarioFoundation: true
  referencesExistingOntarioStageMatrix: true
  referencesExistingOntarioTaxonomy: true
  referencesExistingOntarioMunicipalOverlays: true
  referencesExistingOntarioGovernance: true
  referencesExistingOntarioSimulator: true
  standaloneWorkflowCreated: false
  note: string
  activationBlockers: string[]
  requirements: OntarioEvidenceDocumentRequirement[]
}

const REQUIRED_STATUS: OntarioEvidenceRequirementStatus = 'draft_planned_dormant_not_active_not_enforced'
const REVIEW_STATUS: OntarioEvidenceRequirementReviewStatus = 'requires_review'
const PRODUCTION_APPROVAL_STATUS: OntarioEvidenceRequirementProductionApprovalStatus = 'not_granted'

const ALL_ONTARIO_PLANNING_MUNICIPALITIES = [
  'Province-level',
  ...DORMANT_ONTARIO_JURISDICTION_FAMILY.futureOverlays.map(overlay => overlay.municipality),
]

const MUNICIPAL_OVERLAY_MUNICIPALITIES = DORMANT_ONTARIO_JURISDICTION_FAMILY.futureOverlays.map(
  overlay => overlay.municipality,
)

const COMMON_BLOCKERS = [
  'Ontario evidence requirements are draft/internal only.',
  'Ontario evidence upload enforcement is not active.',
  'Ontario document requirements are not active production requirements.',
  'No Ontario DB rows or migrations exist for these requirements.',
  'Active DB template resolution is disabled.',
  'Ontario public routing is disabled.',
  'Ontario builder dispatch is disabled.',
  'Ontario inspector claiming is disabled.',
  'Ontario source review is required before activation.',
  'Ontario municipal review is required before activation.',
  'Professional/AHJ review is required before activation.',
  'Production approval has not been granted.',
]

const CHECKLIST_ITEMS = new Map(
  DORMANT_ONTARIO_DRAFT_CHECKLIST_ITEM_CATALOG.items.map(item => [item.itemId, item]),
)

const STAGE_IDS = new Set(DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX.stages.map(stage => stage.stageId))

function checklistItems(ids: string[]): OntarioDraftChecklistItem[] {
  return ids.map(id => {
    const item = CHECKLIST_ITEMS.get(id)
    if (!item) {
      throw new Error(`Unknown dormant Ontario checklist item in evidence foundation: ${id}`)
    }
    return item
  })
}

function relatedStageCodes(ids: VeroInspectionStageId[]): VeroInspectionStageId[] {
  for (const id of ids) {
    if (!STAGE_IDS.has(id)) {
      throw new Error(`Unknown dormant Ontario stage in evidence foundation: ${id}`)
    }
  }
  return ids
}

function requirement(params: {
  requirementId: string
  title: string
  draftDescription: string
  relatedChecklistItemIds: string[]
  relatedStageCodes: VeroInspectionStageId[]
  requirementType: OntarioEvidenceRequirementType
  appliesToMunicipalities?: string[]
}): OntarioEvidenceDocumentRequirement {
  checklistItems(params.relatedChecklistItemIds)

  return {
    requirementId: params.requirementId,
    title: params.title,
    draftDescription: params.draftDescription,
    relatedChecklistItemIds: params.relatedChecklistItemIds,
    relatedStageCodes: relatedStageCodes(params.relatedStageCodes),
    requirementType: params.requirementType,
    appliesToMunicipalities: params.appliesToMunicipalities ?? ALL_ONTARIO_PLANNING_MUNICIPALITIES,
    requiredStatus: REQUIRED_STATUS,
    sourceReviewStatus: REVIEW_STATUS,
    municipalReviewStatus: REVIEW_STATUS,
    professionalReviewStatus: REVIEW_STATUS,
    productionApprovalStatus: PRODUCTION_APPROVAL_STATUS,
    activeEvidenceEnforcementEnabled: false,
    activeTemplateResolutionEnabled: false,
    publicEnabled: false,
    dispatchEnabled: false,
    inspectorClaimingEnabled: false,
    activationBlockers: COMMON_BLOCKERS,
  }
}

export const DORMANT_ONTARIO_EVIDENCE_DOCUMENT_REQUIREMENTS_FOUNDATION: DormantOntarioEvidenceDocumentRequirementsFoundation = {
  family: DORMANT_ONTARIO_JURISDICTION_FAMILY.family,
  statusLabel: 'Draft / Planned / Dormant / Not Active / Not Publicly Enabled / Not Enforced / Not Production Approved',
  foundationStatus: REQUIRED_STATUS,
  isActive: false,
  activeRequirementsCreated: false,
  activeEvidenceEnforcementEnabled: false,
  databaseRowsCreated: false,
  databaseMigrationCreated: false,
  publicRoutingEnabled: false,
  dispatchEnabled: false,
  inspectorClaimingEnabled: false,
  activeTemplateResolutionEnabled: false,
  checklistResponsesExpected: false,
  sourceReviewStatus: REVIEW_STATUS,
  municipalReviewStatus: REVIEW_STATUS,
  professionalReviewStatus: REVIEW_STATUS,
  productionApprovalStatus: PRODUCTION_APPROVAL_STATUS,
  referencesExistingOntarioChecklistCatalog: true,
  referencesExistingOntarioFoundation: true,
  referencesExistingOntarioStageMatrix: true,
  referencesExistingOntarioTaxonomy: true,
  referencesExistingOntarioMunicipalOverlays: true,
  referencesExistingOntarioGovernance: true,
  referencesExistingOntarioSimulator: true,
  standaloneWorkflowCreated: false,
  note: 'Admin-only dormant Ontario evidence and document requirements foundation. It links planned Ontario checklist item groups to future document/evidence expectations without enabling evidence upload enforcement, active templates, DB rows, migrations, public routing, dispatch, claiming, or checklist responses.',
  activationBlockers: COMMON_BLOCKERS,
  requirements: [
    requirement({
      requirementId: 'permit-construct-demolish-application-package',
      title: 'Permit to Construct or Demolish application package',
      draftDescription: 'Draft planned document package expectation for future Ontario permit application readiness. Not active, not enforced, and not production approved.',
      relatedChecklistItemIds: ['permit-construct-demolish-application-readiness'],
      relatedStageCodes: ['S01', 'S03'],
      requirementType: 'document_package',
    }),
    requirement({
      requirementId: 'schedule-1-designer-information',
      title: 'Schedule 1 Designer Information',
      draftDescription: 'Draft planned document expectation for future Schedule 1 Designer Information review. Requires Ontario source and professional/AHJ review.',
      relatedChecklistItemIds: ['schedule-1-designer-information-readiness'],
      relatedStageCodes: ['S03'],
      requirementType: 'designer_information',
    }),
    requirement({
      requirementId: 'bcin-designer-information',
      title: 'BCIN/designer information',
      draftDescription: 'Draft planned document expectation for future BCIN/designer information. No designer validation or evidence enforcement is active.',
      relatedChecklistItemIds: ['bcin-designer-information-readiness'],
      relatedStageCodes: ['S03'],
      requirementType: 'designer_information',
    }),
    requirement({
      requirementId: 'site-plan',
      title: 'Site plan',
      draftDescription: 'Draft planned document expectation for future site-plan readiness. Municipal source review is required before activation.',
      relatedChecklistItemIds: ['site-plan-readiness'],
      relatedStageCodes: ['S01', 'S02', 'S04', 'S14'],
      requirementType: 'drawing_document',
    }),
    requirement({
      requirementId: 'architectural-drawings',
      title: 'Architectural drawings',
      draftDescription: 'Draft planned document expectation for future architectural drawing readiness. Not an approved or enforceable Ontario template requirement.',
      relatedChecklistItemIds: ['architectural-drawing-readiness'],
      relatedStageCodes: ['S03', 'S06', 'S07', 'S13'],
      requirementType: 'drawing_document',
    }),
    requirement({
      requirementId: 'structural-drawings-details-where-applicable',
      title: 'Structural drawings/details where applicable',
      draftDescription: 'Draft planned document expectation for future structural drawing/detail applicability. Professional/AHJ review is required before use.',
      relatedChecklistItemIds: ['structural-drawing-detail-readiness'],
      relatedStageCodes: ['S03', 'S05', 'S06'],
      requirementType: 'drawing_document',
    }),
    requirement({
      requirementId: 'energy-efficiency-sb-12-documentation-where-applicable',
      title: 'Energy efficiency / SB-12 documentation where applicable',
      draftDescription: 'Draft planned document expectation for future energy efficiency / SB-12 readiness. No Ontario energy evidence enforcement is active.',
      relatedChecklistItemIds: ['energy-efficiency-sb-12-readiness'],
      relatedStageCodes: ['S07', 'S12'],
      requirementType: 'document_package',
    }),
    requirement({
      requirementId: 'plumbing-scope-documentation',
      title: 'Plumbing scope documentation',
      draftDescription: 'Draft planned document expectation for future Ontario plumbing scope review. It does not enable plumbing dispatch or inspector claiming.',
      relatedChecklistItemIds: ['plumbing-scope-readiness'],
      relatedStageCodes: ['S09'],
      requirementType: 'scope_document',
    }),
    requirement({
      requirementId: 'hvac-mechanical-scope-documentation',
      title: 'HVAC/mechanical scope documentation',
      draftDescription: 'Draft planned document expectation for future HVAC/mechanical scope review. It is not connected to active Ontario routing.',
      relatedChecklistItemIds: ['hvac-mechanical-scope-readiness'],
      relatedStageCodes: ['S11'],
      requirementType: 'scope_document',
    }),
    requirement({
      requirementId: 'electrical-authority-boundary-documentation',
      title: 'Electrical authority boundary documentation',
      draftDescription: 'Draft planned authority-boundary document expectation for future Ontario electrical scope. It does not create an electrical approval workflow.',
      relatedChecklistItemIds: ['electrical-authority-boundary-readiness'],
      relatedStageCodes: ['S10'],
      requirementType: 'authority_boundary_document',
    }),
    requirement({
      requirementId: 'applicable-law-zoning-municipal-precheck-documentation',
      title: 'Applicable law / zoning / municipal precheck documentation',
      draftDescription: 'Draft planned document expectation for future applicable-law, zoning, and municipal precheck readiness. Municipal review is required before activation.',
      relatedChecklistItemIds: ['applicable-law-zoning-municipal-precheck-readiness'],
      relatedStageCodes: ['S01', 'S02', 'S04', 'S14', 'S15'],
      requirementType: 'municipal_precheck_document',
    }),
    requirement({
      requirementId: 'municipal-overlay-supplemental-forms',
      title: 'Municipal overlay supplemental forms',
      draftDescription: 'Draft planned document expectation for future Toronto, Ottawa, and Mississauga supplemental forms. No municipal overlay requirements are active.',
      relatedChecklistItemIds: ['municipal-overlay-review-readiness'],
      relatedStageCodes: ['S02', 'S14', 'S15'],
      requirementType: 'municipal_precheck_document',
      appliesToMunicipalities: MUNICIPAL_OVERLAY_MUNICIPALITIES,
    }),
    requirement({
      requirementId: 'inspection-photos-field-evidence-planning-placeholder',
      title: 'Inspection photos / field evidence planning placeholder',
      draftDescription: 'Draft planned placeholder for future Ontario field evidence expectations. Evidence upload enforcement is not active or production approved.',
      relatedChecklistItemIds: [
        'obc-2024-small-residential-core-readiness',
        'site-plan-readiness',
        'architectural-drawing-readiness',
        'structural-drawing-detail-readiness',
      ],
      relatedStageCodes: ['S04', 'S05', 'S06', 'S07', 'S12', 'S13', 'S14'],
      requirementType: 'field_evidence_planning',
    }),
    requirement({
      requirementId: 'final-inspection-occupancy-readiness-documentation',
      title: 'Final inspection / occupancy readiness documentation',
      draftDescription: 'Draft planned document expectation for future final inspection / occupancy readiness. It does not imply Vero grants occupancy or municipal approval.',
      relatedChecklistItemIds: ['final-inspection-occupancy-readiness'],
      relatedStageCodes: ['S15'],
      requirementType: 'final_readiness_document',
    }),
  ],
}

export function getDormantOntarioEvidenceDocumentRequirementsFoundation(): DormantOntarioEvidenceDocumentRequirementsFoundation {
  const ontarioResolution = resolveTemplateJurisdiction({
    city: 'Toronto',
    province: DORMANT_ONTARIO_JURISDICTION_FAMILY.province,
    context: 'Ontario evidence and document requirements foundation',
  })

  if (ontarioResolution.status !== 'dormant' || ontarioResolution.allowTemplateFallback) {
    throw new Error('Ontario evidence/document foundation requires explicit Ontario context to remain dormant.')
  }
  if (DORMANT_ONTARIO_DRAFT_CHECKLIST_ITEM_CATALOG.activeTemplateResolutionEnabled) {
    throw new Error('Ontario evidence/document foundation requires the draft checklist catalog to stay out of DB resolution.')
  }
  if (DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION.participatesInActiveDbResolution) {
    throw new Error('Ontario evidence/document foundation requires the template foundation to stay out of DB resolution.')
  }
  if (DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX.participatesInActiveDbResolution) {
    throw new Error('Ontario evidence/document foundation requires the stage matrix to stay out of DB resolution.')
  }
  if (DORMANT_ONTARIO_PROJECT_TAXONOMY_FOUNDATION.activeTemplateResolutionEnabled) {
    throw new Error('Ontario evidence/document foundation requires taxonomy to stay out of DB resolution.')
  }
  if (DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION.activeTemplateResolutionEnabled) {
    throw new Error('Ontario evidence/document foundation requires municipal overlays to stay out of DB resolution.')
  }
  if (DORMANT_ONTARIO_TEMPLATE_GOVERNANCE.activeTemplateResolutionEnabled) {
    throw new Error('Ontario evidence/document foundation requires governance to keep DB resolution disabled.')
  }
  if (DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR.activeDbTemplateResolutionEnabled) {
    throw new Error('Ontario evidence/document foundation requires the intake/routing simulator to stay inactive.')
  }

  return DORMANT_ONTARIO_EVIDENCE_DOCUMENT_REQUIREMENTS_FOUNDATION
}
