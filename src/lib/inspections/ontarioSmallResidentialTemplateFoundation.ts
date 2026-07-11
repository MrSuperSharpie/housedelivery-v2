import { DORMANT_ONTARIO_JURISDICTION_FAMILY } from './jurisdictionResolver'

export type OntarioTemplateFoundationStatus = 'draft_planned_dormant_requires_review'
export type OntarioMunicipalOverlayStatus = 'future_review_required'

export interface OntarioTemplateFoundationCategory {
  id: string
  title: string
  status: OntarioTemplateFoundationStatus
  requiresReview: true
  isActive: false
  participatesInActiveResolution: false
  note: string
}

export interface OntarioTemplateFoundationOverlay {
  slug: string
  municipality: string
  status: OntarioMunicipalOverlayStatus
  requiresReview: true
  isActive: false
  templatesActive: false
}

export interface DormantOntarioSmallResidentialTemplateFoundation {
  family: typeof DORMANT_ONTARIO_JURISDICTION_FAMILY.family
  statusLabel: 'Draft / Planned / Dormant / Not Active / Requires Review'
  scopeLabel: 'Ontario small residential template foundation'
  isActive: false
  templatesActive: false
  publicRoutingEnabled: false
  dispatchEnabled: false
  participatesInActiveDbResolution: false
  checklistResponsesExpected: false
  note: string
  categories: OntarioTemplateFoundationCategory[]
  municipalOverlays: OntarioTemplateFoundationOverlay[]
}

export const DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION: DormantOntarioSmallResidentialTemplateFoundation = {
  family: DORMANT_ONTARIO_JURISDICTION_FAMILY.family,
  statusLabel: 'Draft / Planned / Dormant / Not Active / Requires Review',
  scopeLabel: 'Ontario small residential template foundation',
  isActive: false,
  templatesActive: false,
  publicRoutingEnabled: false,
  dispatchEnabled: false,
  participatesInActiveDbResolution: false,
  checklistResponsesExpected: false,
  note: 'Internal planning foundation only. This does not create Ontario checklist templates, dispatch, public routing, inspector claiming, or active DB resolution.',
  categories: [
    {
      id: 'obc-2024-small-residential-core',
      title: 'Ontario Building Code 2024 small residential core',
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Draft core category for future OBC small residential template review.',
    },
    {
      id: 'permit-construct-or-demolish-application',
      title: 'Application for a Permit to Construct or Demolish',
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Placeholder for future municipal permit-application intake alignment.',
    },
    {
      id: 'schedule-1-designer-information',
      title: 'Schedule 1 Designer Information',
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Draft placeholder only; requires Ontario professional and municipal review.',
    },
    {
      id: 'bcin-designer-information',
      title: 'BCIN/designer information placeholders',
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Planning placeholder for future designer qualification fields.',
    },
    {
      id: 'site-plan',
      title: 'Site plan',
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Draft site-plan category for future municipal precheck workflow.',
    },
    {
      id: 'architectural-drawings',
      title: 'Architectural drawings',
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Planning placeholder for future Ontario small residential drawings review.',
    },
    {
      id: 'structural-drawings-details',
      title: 'Structural drawings/details where applicable',
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Applicability and professional review rules are not active.',
    },
    {
      id: 'energy-efficiency-sb-12',
      title: 'Energy efficiency / SB-12 placeholder where applicable',
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Draft only; no Ontario energy compliance workflow is enabled.',
    },
    {
      id: 'hvac-mechanical-scope',
      title: 'HVAC / mechanical scope placeholder',
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Future mechanical category; not connected to inspection workflow.',
    },
    {
      id: 'plumbing-scope',
      title: 'Plumbing scope placeholder',
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Future plumbing category; not connected to inspector claiming.',
    },
    {
      id: 'electrical-authority-boundary',
      title: 'Electrical authority boundary placeholder',
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Draft boundary marker only; no Ontario electrical authority workflow is active.',
    },
    {
      id: 'applicable-law-zoning-municipal-precheck',
      title: 'Applicable law / zoning / municipal precheck placeholder',
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Planning placeholder for municipal precheck dependencies.',
    },
    {
      id: 'final-inspection-occupancy-readiness',
      title: 'Final inspection / occupancy readiness placeholder',
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Does not imply Vero grants occupancy, approval, or municipal acceptance.',
    },
  ],
  municipalOverlays: DORMANT_ONTARIO_JURISDICTION_FAMILY.futureOverlays.map(overlay => ({
    slug: overlay.slug,
    municipality: overlay.municipality,
    status: 'future_review_required',
    requiresReview: true,
    isActive: false,
    templatesActive: false,
  })),
}

export function getDormantOntarioSmallResidentialTemplateFoundation(): DormantOntarioSmallResidentialTemplateFoundation {
  return DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION
}
