import { DORMANT_ONTARIO_JURISDICTION_FAMILY } from './jurisdictionResolver'
import { DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX } from './ontarioStageAlignedTemplateMatrix'
import { DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION } from './ontarioSmallResidentialTemplateFoundation'

export type OntarioGovernanceStatus = 'draft_dormant_not_active'
export type OntarioReviewStatus = 'required_before_activation'
export type OntarioProductionApprovalStatus = 'not_granted'
export type OntarioMunicipalOverlayReviewStatus = 'future_review_required'

export interface OntarioTemplateGovernanceSourceCategory {
  id: string
  label: string
  status: OntarioReviewStatus
  note: string
}

export interface DormantOntarioTemplateGovernance {
  family: typeof DORMANT_ONTARIO_JURISDICTION_FAMILY.family
  statusLabel: 'Draft / Dormant / Not Active / Not Publicly Enabled / Not Production Approved'
  governanceStatus: OntarioGovernanceStatus
  foundationStatus: OntarioGovernanceStatus
  stageMatrixStatus: OntarioGovernanceStatus
  publicEnabled: false
  dispatchEnabled: false
  inspectorClaimingEnabled: false
  activeTemplateResolutionEnabled: false
  sourceReviewStatus: OntarioReviewStatus
  professionalReviewStatus: OntarioReviewStatus
  municipalOverlayReviewStatus: OntarioMunicipalOverlayReviewStatus
  productionApprovalStatus: OntarioProductionApprovalStatus
  checklistResponsesExpected: false
  referencesExistingFoundation: true
  referencesExistingStageMatrix: true
  foundationScopeLabel: typeof DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION.scopeLabel
  stageMatrixScopeLabel: typeof DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX.scopeLabel
  note: string
  activationBlockers: string[]
  sourceCategories: OntarioTemplateGovernanceSourceCategory[]
}

export const DORMANT_ONTARIO_TEMPLATE_GOVERNANCE: DormantOntarioTemplateGovernance = {
  family: DORMANT_ONTARIO_JURISDICTION_FAMILY.family,
  statusLabel: 'Draft / Dormant / Not Active / Not Publicly Enabled / Not Production Approved',
  governanceStatus: 'draft_dormant_not_active',
  foundationStatus: 'draft_dormant_not_active',
  stageMatrixStatus: 'draft_dormant_not_active',
  publicEnabled: false,
  dispatchEnabled: false,
  inspectorClaimingEnabled: false,
  activeTemplateResolutionEnabled: false,
  sourceReviewStatus: 'required_before_activation',
  professionalReviewStatus: 'required_before_activation',
  municipalOverlayReviewStatus: 'future_review_required',
  productionApprovalStatus: 'not_granted',
  checklistResponsesExpected: false,
  referencesExistingFoundation: true,
  referencesExistingStageMatrix: true,
  foundationScopeLabel: DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION.scopeLabel,
  stageMatrixScopeLabel: DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX.scopeLabel,
  note: 'Ontario governance is internal planning only. Source review, professional/AHJ review, municipal overlay review, and production approval are required before any Ontario template can become active.',
  activationBlockers: [
    'Ontario source review is required before activation.',
    'Professional/AHJ review is required before activation.',
    'Municipal overlay review is required for Toronto, Ottawa, and Mississauga placeholders.',
    'Production approval has not been granted.',
    'Ontario public routing is not enabled.',
    'Ontario builder dispatch is disabled.',
    'Ontario inspector claiming is disabled.',
    'Ontario foundation and stage matrix do not participate in active DB template resolution.',
    'No Ontario checklist responses are expected while the scaffold is dormant.',
  ],
  sourceCategories: [
    {
      id: 'obc-2024-core',
      label: 'Ontario Building Code 2024 / OBC core',
      status: 'required_before_activation',
      note: 'Draft/internal reference category; requires source review before activation.',
    },
    {
      id: 'municipal-building-department-requirements',
      label: 'Municipal building department requirements',
      status: 'required_before_activation',
      note: 'Draft/internal reference category for future municipal source review.',
    },
    {
      id: 'schedule-1-designer-information',
      label: 'Schedule 1 Designer Information',
      status: 'required_before_activation',
      note: 'Draft/internal reference category; not production approved.',
    },
    {
      id: 'bcin-designer-information',
      label: 'BCIN/designer information',
      status: 'required_before_activation',
      note: 'Draft/internal reference category; requires professional review.',
    },
    {
      id: 'applicable-law-zoning-municipal-precheck',
      label: 'Applicable law / zoning / municipal precheck',
      status: 'required_before_activation',
      note: 'Draft/internal reference category for municipal precheck review.',
    },
    {
      id: 'energy-efficiency-sb-12',
      label: 'Energy efficiency / SB-12',
      status: 'required_before_activation',
      note: 'Draft/internal reference category; requires Ontario source review.',
    },
    {
      id: 'trade-authority-boundaries',
      label: 'Plumbing / mechanical / electrical authority boundaries',
      status: 'required_before_activation',
      note: 'Draft/internal boundary category; no Ontario trade routing is active.',
    },
    {
      id: 'final-inspection-occupancy-readiness',
      label: 'Final inspection / occupancy readiness',
      status: 'required_before_activation',
      note: 'Draft/internal category; does not imply Vero grants occupancy or municipal approval.',
    },
    {
      id: 'future-municipal-overlays',
      label: 'Future Toronto, Ottawa, and Mississauga overlays',
      status: 'required_before_activation',
      note: 'Future/review-required category; no municipal overlay is active.',
    },
  ],
}

export function getDormantOntarioTemplateGovernance(): DormantOntarioTemplateGovernance {
  return DORMANT_ONTARIO_TEMPLATE_GOVERNANCE
}
