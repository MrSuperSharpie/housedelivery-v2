import { DORMANT_ONTARIO_JURISDICTION_FAMILY } from './jurisdictionResolver'
import { DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION } from './ontarioSmallResidentialTemplateFoundation'
import { DORMANT_ONTARIO_TEMPLATE_GOVERNANCE } from './ontarioTemplateGovernance'

export type OntarioMunicipalOverlayStatus = 'planned_dormant_not_active'
export type OntarioMunicipalOverlayReviewStatus = 'requires_review'
export type OntarioMunicipalOverlayProductionApprovalStatus = 'not_granted'

export interface OntarioMunicipalOverlaySourceCategory {
  id: string
  label: string
  reviewStatus: OntarioMunicipalOverlayReviewStatus
  note: string
}

export interface DormantOntarioMunicipalOverlay {
  municipalityName: string
  province: typeof DORMANT_ONTARIO_JURISDICTION_FAMILY.province
  plannedSlug: string
  parentJurisdictionSlug: typeof DORMANT_ONTARIO_JURISDICTION_FAMILY.baseSlug
  overlayStatus: OntarioMunicipalOverlayStatus
  publicEnabled: false
  dispatchEnabled: false
  inspectorClaimingEnabled: false
  activeTemplateResolutionEnabled: false
  checklistResponsesExpected: false
  municipalSourceReviewStatus: OntarioMunicipalOverlayReviewStatus
  professionalReviewStatus: OntarioMunicipalOverlayReviewStatus
  productionApprovalStatus: OntarioMunicipalOverlayProductionApprovalStatus
  activationBlockers: string[]
  plannedSourceCategories: OntarioMunicipalOverlaySourceCategory[]
}

export interface DormantOntarioMunicipalOverlayFoundation {
  family: typeof DORMANT_ONTARIO_JURISDICTION_FAMILY.family
  statusLabel: 'Draft / Planned / Dormant / Not Active / Not Publicly Enabled / Not Production Approved'
  scopeLabel: 'Ontario municipal overlay foundation'
  parentJurisdictionSlug: typeof DORMANT_ONTARIO_JURISDICTION_FAMILY.baseSlug
  overlayStatus: OntarioMunicipalOverlayStatus
  publicRoutingEnabled: false
  dispatchEnabled: false
  inspectorClaimingEnabled: false
  activeTemplateResolutionEnabled: false
  checklistResponsesExpected: false
  municipalSourceReviewStatus: OntarioMunicipalOverlayReviewStatus
  professionalReviewStatus: OntarioMunicipalOverlayReviewStatus
  productionApprovalStatus: OntarioMunicipalOverlayProductionApprovalStatus
  referencesExistingOntarioFoundation: true
  referencesExistingOntarioGovernance: true
  standaloneWorkflowCreated: false
  note: string
  overlays: DormantOntarioMunicipalOverlay[]
}

const MUNICIPAL_SOURCE_CATEGORIES: OntarioMunicipalOverlaySourceCategory[] = [
  {
    id: 'municipal-permit-application-requirements',
    label: 'Municipal permit application requirements',
    reviewStatus: 'requires_review',
    note: 'Draft municipal source category; not approved or production-ready.',
  },
  {
    id: 'municipal-zoning-applicable-law-precheck',
    label: 'Municipal zoning / applicable law precheck',
    reviewStatus: 'requires_review',
    note: 'Draft municipal precheck category; requires source review before use.',
  },
  {
    id: 'municipal-drawing-submission-expectations',
    label: 'Municipal drawing submission expectations',
    reviewStatus: 'requires_review',
    note: 'Draft drawing-submission category; no checklist enforcement is active.',
  },
  {
    id: 'municipal-inspection-naming-differences',
    label: 'Municipal inspection naming differences',
    reviewStatus: 'requires_review',
    note: 'Draft terminology category; does not change Vero inspection stages.',
  },
  {
    id: 'municipal-portal-submission-process',
    label: 'Municipal portal / submission process',
    reviewStatus: 'requires_review',
    note: 'Draft process category; no municipal portal integration is active.',
  },
  {
    id: 'local-forms-supplemental-documents',
    label: 'Local forms and supplemental documents',
    reviewStatus: 'requires_review',
    note: 'Draft form category; not complete, compliant, or production approved.',
  },
  {
    id: 'external-authority-dependencies',
    label: 'External authority dependencies where applicable',
    reviewStatus: 'requires_review',
    note: 'Draft authority-boundary category; does not replace AHJ or professional review.',
  },
  {
    id: 'future-reviewed-checklist-overlays',
    label: 'Future reviewed checklist overlays',
    reviewStatus: 'requires_review',
    note: 'Future template category only; no Ontario checklist templates are active.',
  },
]

function activationBlockersFor(municipalityName: string): string[] {
  return [
    `${municipalityName} municipal source review is required before activation.`,
    `${municipalityName} Professional/AHJ review is required before activation.`,
    `${municipalityName} overlay production approval has not been granted.`,
    `${municipalityName} public Ontario routing is disabled.`,
    `${municipalityName} Ontario builder dispatch is disabled.`,
    `${municipalityName} Ontario inspector claiming is disabled.`,
    `${municipalityName} overlay does not participate in active DB template resolution.`,
    `${municipalityName} overlay has no checklist responses expected while dormant.`,
  ]
}

const overlays: DormantOntarioMunicipalOverlay[] = DORMANT_ONTARIO_JURISDICTION_FAMILY.futureOverlays.map(overlay => ({
  municipalityName: overlay.municipality,
  province: DORMANT_ONTARIO_JURISDICTION_FAMILY.province,
  plannedSlug: overlay.slug,
  parentJurisdictionSlug: DORMANT_ONTARIO_JURISDICTION_FAMILY.baseSlug,
  overlayStatus: 'planned_dormant_not_active',
  publicEnabled: false,
  dispatchEnabled: false,
  inspectorClaimingEnabled: false,
  activeTemplateResolutionEnabled: false,
  checklistResponsesExpected: false,
  municipalSourceReviewStatus: 'requires_review',
  professionalReviewStatus: 'requires_review',
  productionApprovalStatus: 'not_granted',
  activationBlockers: activationBlockersFor(overlay.municipality),
  plannedSourceCategories: MUNICIPAL_SOURCE_CATEGORIES,
}))

export const DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION: DormantOntarioMunicipalOverlayFoundation = {
  family: DORMANT_ONTARIO_JURISDICTION_FAMILY.family,
  statusLabel: 'Draft / Planned / Dormant / Not Active / Not Publicly Enabled / Not Production Approved',
  scopeLabel: 'Ontario municipal overlay foundation',
  parentJurisdictionSlug: DORMANT_ONTARIO_JURISDICTION_FAMILY.baseSlug,
  overlayStatus: 'planned_dormant_not_active',
  publicRoutingEnabled: false,
  dispatchEnabled: false,
  inspectorClaimingEnabled: false,
  activeTemplateResolutionEnabled: false,
  checklistResponsesExpected: false,
  municipalSourceReviewStatus: 'requires_review',
  professionalReviewStatus: 'requires_review',
  productionApprovalStatus: 'not_granted',
  referencesExistingOntarioFoundation: true,
  referencesExistingOntarioGovernance: true,
  standaloneWorkflowCreated: false,
  note: 'Internal admin-only municipal overlay foundation. Toronto, Ottawa, and Mississauga are planned/dormant only; no Ontario public routing, dispatch, inspector claiming, active templates, or DB resolution are enabled.',
  overlays,
}

export function getDormantOntarioMunicipalOverlayFoundation(): DormantOntarioMunicipalOverlayFoundation {
  return DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION
}

export function assertDormantOntarioMunicipalOverlayReferences(): void {
  if (!DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION.referencesExistingOntarioFoundation) {
    throw new Error('Ontario municipal overlay foundation must reference the existing dormant Ontario foundation.')
  }
  if (!DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION.referencesExistingOntarioGovernance) {
    throw new Error('Ontario municipal overlay foundation must reference existing dormant Ontario governance.')
  }
  if (DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION.participatesInActiveDbResolution) {
    throw new Error('Ontario foundation must remain outside active DB resolution.')
  }
  if (DORMANT_ONTARIO_TEMPLATE_GOVERNANCE.activeTemplateResolutionEnabled) {
    throw new Error('Ontario governance must keep active template resolution disabled.')
  }
}
