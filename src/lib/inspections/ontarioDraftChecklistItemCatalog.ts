import { DORMANT_ONTARIO_JURISDICTION_FAMILY, resolveTemplateJurisdiction } from './jurisdictionResolver'
import { DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR } from './ontarioIntakeRoutingReadinessSimulator'
import { DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION } from './ontarioMunicipalOverlayFoundation'
import { DORMANT_ONTARIO_PROJECT_TAXONOMY_FOUNDATION } from './ontarioProjectTaxonomyFoundation'
import { DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION } from './ontarioSmallResidentialTemplateFoundation'
import {
  DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX,
  type VeroInspectionStageId,
} from './ontarioStageAlignedTemplateMatrix'
import { DORMANT_ONTARIO_TEMPLATE_GOVERNANCE } from './ontarioTemplateGovernance'

export type OntarioDraftChecklistCatalogStatus = 'draft_planned_dormant_not_active'
export type OntarioDraftChecklistReviewStatus = 'requires_review'
export type OntarioDraftChecklistProductionApprovalStatus = 'not_granted'

export interface OntarioDraftChecklistItem {
  itemId: string
  title: string
  draftDescription: string
  stageCodes: VeroInspectionStageId[]
  foundationCategoryId: string
  templateCategory: string
  appliesToMunicipalities: string[]
  sourceReviewStatus: OntarioDraftChecklistReviewStatus
  municipalReviewStatus: OntarioDraftChecklistReviewStatus
  professionalReviewStatus: OntarioDraftChecklistReviewStatus
  productionApprovalStatus: OntarioDraftChecklistProductionApprovalStatus
  activeTemplateResolutionEnabled: false
  publicEnabled: false
  dispatchEnabled: false
  inspectorClaimingEnabled: false
  activationBlockers: string[]
}

export interface DormantOntarioDraftChecklistItemCatalog {
  family: typeof DORMANT_ONTARIO_JURISDICTION_FAMILY.family
  statusLabel: 'Draft / Planned / Dormant / Not Active / Not Publicly Enabled / Not Production Approved'
  catalogStatus: OntarioDraftChecklistCatalogStatus
  isActive: false
  activeTemplatesCreated: false
  databaseRowsCreated: false
  databaseMigrationCreated: false
  publicRoutingEnabled: false
  dispatchEnabled: false
  inspectorClaimingEnabled: false
  activeTemplateResolutionEnabled: false
  checklistResponsesExpected: false
  sourceReviewStatus: OntarioDraftChecklistReviewStatus
  municipalReviewStatus: OntarioDraftChecklistReviewStatus
  professionalReviewStatus: OntarioDraftChecklistReviewStatus
  productionApprovalStatus: OntarioDraftChecklistProductionApprovalStatus
  referencesExistingOntarioFoundation: true
  referencesExistingOntarioStageMatrix: true
  referencesExistingOntarioTaxonomy: true
  referencesExistingOntarioMunicipalOverlays: true
  referencesExistingOntarioGovernance: true
  referencesExistingOntarioSimulator: true
  standaloneWorkflowCreated: false
  note: string
  activationBlockers: string[]
  items: OntarioDraftChecklistItem[]
}

const REVIEW_STATUS: OntarioDraftChecklistReviewStatus = 'requires_review'
const PRODUCTION_APPROVAL_STATUS: OntarioDraftChecklistProductionApprovalStatus = 'not_granted'

const ALL_ONTARIO_PLANNING_MUNICIPALITIES = [
  'Province-level',
  ...DORMANT_ONTARIO_JURISDICTION_FAMILY.futureOverlays.map(overlay => overlay.municipality),
]

const MUNICIPAL_OVERLAY_MUNICIPALITIES = DORMANT_ONTARIO_JURISDICTION_FAMILY.futureOverlays.map(
  overlay => overlay.municipality,
)

const COMMON_BLOCKERS = [
  'Ontario checklist catalog is draft/internal only.',
  'Ontario checklist items are not active templates.',
  'No Ontario DB rows or migrations exist for these items.',
  'Active DB template resolution is disabled.',
  'Ontario public routing is disabled.',
  'Ontario builder dispatch is disabled.',
  'Ontario inspector claiming is disabled.',
  'Ontario source review is required before activation.',
  'Ontario municipal review is required before activation.',
  'Professional/AHJ review is required before activation.',
  'Production approval has not been granted.',
]

const FOUNDATION_CATEGORY_TITLES = new Map(
  DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION.categories.map(category => [category.id, category.title]),
)

const STAGE_IDS = new Set(DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX.stages.map(stage => stage.stageId))

function templateCategory(categoryId: string): string {
  const category = FOUNDATION_CATEGORY_TITLES.get(categoryId)
  if (!category) {
    throw new Error(`Unknown dormant Ontario foundation category in draft checklist catalog: ${categoryId}`)
  }
  return category
}

function stageCodes(ids: VeroInspectionStageId[]): VeroInspectionStageId[] {
  for (const id of ids) {
    if (!STAGE_IDS.has(id)) {
      throw new Error(`Unknown dormant Ontario stage in draft checklist catalog: ${id}`)
    }
  }
  return ids
}

function item(params: {
  itemId: string
  title: string
  draftDescription: string
  stageCodes: VeroInspectionStageId[]
  foundationCategoryId: string
  appliesToMunicipalities?: string[]
}): OntarioDraftChecklistItem {
  return {
    itemId: params.itemId,
    title: params.title,
    draftDescription: params.draftDescription,
    stageCodes: stageCodes(params.stageCodes),
    foundationCategoryId: params.foundationCategoryId,
    templateCategory: templateCategory(params.foundationCategoryId),
    appliesToMunicipalities: params.appliesToMunicipalities ?? ALL_ONTARIO_PLANNING_MUNICIPALITIES,
    sourceReviewStatus: REVIEW_STATUS,
    municipalReviewStatus: REVIEW_STATUS,
    professionalReviewStatus: REVIEW_STATUS,
    productionApprovalStatus: PRODUCTION_APPROVAL_STATUS,
    activeTemplateResolutionEnabled: false,
    publicEnabled: false,
    dispatchEnabled: false,
    inspectorClaimingEnabled: false,
    activationBlockers: COMMON_BLOCKERS,
  }
}

export const DORMANT_ONTARIO_DRAFT_CHECKLIST_ITEM_CATALOG: DormantOntarioDraftChecklistItemCatalog = {
  family: DORMANT_ONTARIO_JURISDICTION_FAMILY.family,
  statusLabel: 'Draft / Planned / Dormant / Not Active / Not Publicly Enabled / Not Production Approved',
  catalogStatus: 'draft_planned_dormant_not_active',
  isActive: false,
  activeTemplatesCreated: false,
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
  referencesExistingOntarioFoundation: true,
  referencesExistingOntarioStageMatrix: true,
  referencesExistingOntarioTaxonomy: true,
  referencesExistingOntarioMunicipalOverlays: true,
  referencesExistingOntarioGovernance: true,
  referencesExistingOntarioSimulator: true,
  standaloneWorkflowCreated: false,
  note: 'Admin-only dormant Ontario draft checklist item catalog. It previews future small-residential item groups using the existing Ontario foundation, stage matrix, taxonomy, municipal overlay foundation, governance layer, and intake/routing simulator without creating active templates, DB rows, migrations, public routing, dispatch, claiming, or checklist responses.',
  activationBlockers: COMMON_BLOCKERS,
  items: [
    item({
      itemId: 'obc-2024-small-residential-core-readiness',
      title: 'OBC 2024 small residential core readiness',
      draftDescription: 'Draft internal planning group for future Ontario small-residential core checklist content. Not approved, not complete, and not active.',
      stageCodes: ['S01', 'S05', 'S06', 'S13', 'S15'],
      foundationCategoryId: 'obc-2024-small-residential-core',
    }),
    item({
      itemId: 'permit-construct-demolish-application-readiness',
      title: 'Permit to Construct or Demolish application readiness',
      draftDescription: 'Draft internal planning group for future permit application readiness checks. It does not create Ontario intake or municipal submission workflow.',
      stageCodes: ['S01', 'S03'],
      foundationCategoryId: 'permit-construct-or-demolish-application',
    }),
    item({
      itemId: 'schedule-1-designer-information-readiness',
      title: 'Schedule 1 Designer Information readiness',
      draftDescription: 'Draft internal planning group for future Schedule 1 Designer Information review. Requires Ontario source, municipal, and professional/AHJ review.',
      stageCodes: ['S03'],
      foundationCategoryId: 'schedule-1-designer-information',
    }),
    item({
      itemId: 'bcin-designer-information-readiness',
      title: 'BCIN/designer information readiness',
      draftDescription: 'Draft internal planning group for future BCIN/designer information placeholders. No designer validation workflow is active.',
      stageCodes: ['S03'],
      foundationCategoryId: 'bcin-designer-information',
    }),
    item({
      itemId: 'site-plan-readiness',
      title: 'Site plan readiness',
      draftDescription: 'Draft internal planning group for future site-plan readiness review across early planning, site work, and final exterior stages.',
      stageCodes: ['S01', 'S02', 'S04', 'S14'],
      foundationCategoryId: 'site-plan',
    }),
    item({
      itemId: 'architectural-drawing-readiness',
      title: 'Architectural drawing readiness',
      draftDescription: 'Draft internal planning group for future architectural drawing readiness. It is not a reviewed or enforceable Ontario checklist.',
      stageCodes: ['S03', 'S06', 'S07', 'S13'],
      foundationCategoryId: 'architectural-drawings',
    }),
    item({
      itemId: 'structural-drawing-detail-readiness',
      title: 'Structural drawing/detail readiness where applicable',
      draftDescription: 'Draft internal planning group for future structural drawing/detail applicability. Professional/AHJ review is required before activation.',
      stageCodes: ['S03', 'S05', 'S06'],
      foundationCategoryId: 'structural-drawings-details',
    }),
    item({
      itemId: 'energy-efficiency-sb-12-readiness',
      title: 'Energy efficiency / SB-12 readiness where applicable',
      draftDescription: 'Draft internal planning group for future energy efficiency / SB-12 readiness. No Ontario energy compliance workflow is active.',
      stageCodes: ['S07', 'S12'],
      foundationCategoryId: 'energy-efficiency-sb-12',
    }),
    item({
      itemId: 'plumbing-scope-readiness',
      title: 'Plumbing scope readiness',
      draftDescription: 'Draft internal planning group for future Ontario plumbing scope review. It does not enable plumbing dispatch or inspector claiming.',
      stageCodes: ['S09'],
      foundationCategoryId: 'plumbing-scope',
    }),
    item({
      itemId: 'hvac-mechanical-scope-readiness',
      title: 'HVAC/mechanical scope readiness',
      draftDescription: 'Draft internal planning group for future HVAC/mechanical scope review. It is not connected to active Ontario routing.',
      stageCodes: ['S11'],
      foundationCategoryId: 'hvac-mechanical-scope',
    }),
    item({
      itemId: 'electrical-authority-boundary-readiness',
      title: 'Electrical authority boundary readiness',
      draftDescription: 'Draft internal planning group for future Ontario electrical authority-boundary wording. It does not create an electrical approval workflow.',
      stageCodes: ['S10'],
      foundationCategoryId: 'electrical-authority-boundary',
    }),
    item({
      itemId: 'applicable-law-zoning-municipal-precheck-readiness',
      title: 'Applicable law / zoning / municipal precheck readiness',
      draftDescription: 'Draft internal planning group for future applicable-law, zoning, and municipal precheck readiness. Municipal source review is required before use.',
      stageCodes: ['S01', 'S02', 'S04', 'S14', 'S15'],
      foundationCategoryId: 'applicable-law-zoning-municipal-precheck',
    }),
    item({
      itemId: 'municipal-overlay-review-readiness',
      title: 'Municipal overlay review readiness',
      draftDescription: 'Draft internal planning group for future Toronto, Ottawa, and Mississauga overlay review. No municipal overlay templates are active.',
      stageCodes: ['S02', 'S14', 'S15'],
      foundationCategoryId: 'applicable-law-zoning-municipal-precheck',
      appliesToMunicipalities: MUNICIPAL_OVERLAY_MUNICIPALITIES,
    }),
    item({
      itemId: 'final-inspection-occupancy-readiness',
      title: 'Final inspection / occupancy readiness',
      draftDescription: 'Draft internal planning group for future final inspection / occupancy readiness. It does not imply Vero grants occupancy or municipal approval.',
      stageCodes: ['S15'],
      foundationCategoryId: 'final-inspection-occupancy-readiness',
    }),
  ],
}

export function getDormantOntarioDraftChecklistItemCatalog(): DormantOntarioDraftChecklistItemCatalog {
  const ontarioResolution = resolveTemplateJurisdiction({
    city: 'Toronto',
    province: DORMANT_ONTARIO_JURISDICTION_FAMILY.province,
    context: 'Ontario draft checklist item catalog',
  })

  if (ontarioResolution.status !== 'dormant' || ontarioResolution.allowTemplateFallback) {
    throw new Error('Ontario draft checklist catalog requires explicit Ontario context to remain dormant.')
  }
  if (DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION.participatesInActiveDbResolution) {
    throw new Error('Ontario draft checklist catalog requires the template foundation to stay out of DB resolution.')
  }
  if (DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX.participatesInActiveDbResolution) {
    throw new Error('Ontario draft checklist catalog requires the stage matrix to stay out of DB resolution.')
  }
  if (DORMANT_ONTARIO_PROJECT_TAXONOMY_FOUNDATION.activeTemplateResolutionEnabled) {
    throw new Error('Ontario draft checklist catalog requires taxonomy to stay out of DB resolution.')
  }
  if (DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION.activeTemplateResolutionEnabled) {
    throw new Error('Ontario draft checklist catalog requires municipal overlays to stay out of DB resolution.')
  }
  if (DORMANT_ONTARIO_TEMPLATE_GOVERNANCE.activeTemplateResolutionEnabled) {
    throw new Error('Ontario draft checklist catalog requires governance to keep DB resolution disabled.')
  }
  if (DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR.activeDbTemplateResolutionEnabled) {
    throw new Error('Ontario draft checklist catalog requires the intake/routing simulator to stay inactive.')
  }

  return DORMANT_ONTARIO_DRAFT_CHECKLIST_ITEM_CATALOG
}
