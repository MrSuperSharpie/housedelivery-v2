import { DORMANT_ONTARIO_JURISDICTION_FAMILY } from './jurisdictionResolver'
import { DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION } from './ontarioSmallResidentialTemplateFoundation'

export type OntarioStageMatrixStatus = 'draft_planned_dormant_requires_review'

export type VeroInspectionStageId =
  | 'S01'
  | 'S02'
  | 'S03'
  | 'S04'
  | 'S05'
  | 'S06'
  | 'S07'
  | 'S08'
  | 'S09'
  | 'S10'
  | 'S11'
  | 'S12'
  | 'S13'
  | 'S14'
  | 'S15'

export interface OntarioStageMatrixEntry {
  stageId: VeroInspectionStageId
  stageNumber: number
  stageTitle: string
  draftOntarioCoverage: string
  foundationCategoryIds: string[]
  status: OntarioStageMatrixStatus
  requiresReview: true
  isActive: false
  participatesInActiveResolution: false
  note: string
}

export interface DormantOntarioStageAlignedTemplateMatrix {
  family: typeof DORMANT_ONTARIO_JURISDICTION_FAMILY.family
  statusLabel: 'Draft / Planned / Dormant / Not Active / Requires Review'
  scopeLabel: 'Ontario stage-aligned template matrix'
  isActive: false
  templatesActive: false
  publicRoutingEnabled: false
  dispatchEnabled: false
  participatesInActiveDbResolution: false
  checklistResponsesExpected: false
  usesExistingVeroStageArchitecture: true
  note: string
  stages: OntarioStageMatrixEntry[]
  municipalOverlaySlugs: string[]
}

const FOUNDATION_CATEGORY_IDS = new Set(
  DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION.categories.map(category => category.id),
)

function categoryIds(ids: string[]): string[] {
  for (const id of ids) {
    if (!FOUNDATION_CATEGORY_IDS.has(id)) {
      throw new Error(`Unknown dormant Ontario template foundation category: ${id}`)
    }
  }
  return ids
}

export const DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX: DormantOntarioStageAlignedTemplateMatrix = {
  family: DORMANT_ONTARIO_JURISDICTION_FAMILY.family,
  statusLabel: 'Draft / Planned / Dormant / Not Active / Requires Review',
  scopeLabel: 'Ontario stage-aligned template matrix',
  isActive: false,
  templatesActive: false,
  publicRoutingEnabled: false,
  dispatchEnabled: false,
  participatesInActiveDbResolution: false,
  checklistResponsesExpected: false,
  usesExistingVeroStageArchitecture: true,
  note: 'Internal planning matrix only. It maps Ontario draft categories to Vero S01-S15 stages without creating live templates, dispatch, claiming, public routing, or active DB resolution.',
  municipalOverlaySlugs: DORMANT_ONTARIO_JURISDICTION_FAMILY.futureOverlays.map(overlay => overlay.slug),
  stages: [
    {
      stageId: 'S01',
      stageNumber: 1,
      stageTitle: 'Project Setup and Jurisdiction Check',
      draftOntarioCoverage: 'Site survey, excavation readiness, permit application, applicable law, zoning, and municipal precheck planning.',
      foundationCategoryIds: categoryIds([
        'obc-2024-small-residential-core',
        'permit-construct-or-demolish-application',
        'applicable-law-zoning-municipal-precheck',
        'site-plan',
      ]),
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Draft Ontario planning only; no public dispatch or live template resolution.',
    },
    {
      stageId: 'S02',
      stageNumber: 2,
      stageTitle: 'Planning and Site Approvals',
      draftOntarioCoverage: 'Municipal applicable-law, zoning, site-plan, and future overlay precheck placeholders.',
      foundationCategoryIds: categoryIds([
        'applicable-law-zoning-municipal-precheck',
        'site-plan',
        'permit-construct-or-demolish-application',
      ]),
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Municipal overlay rules are future/review-required and not active.',
    },
    {
      stageId: 'S03',
      stageNumber: 3,
      stageTitle: 'Building Permit Submission Package',
      draftOntarioCoverage: 'Permit package planning for application, Schedule 1, BCIN/designer information, architectural drawings, and structural details where applicable.',
      foundationCategoryIds: categoryIds([
        'permit-construct-or-demolish-application',
        'schedule-1-designer-information',
        'bcin-designer-information',
        'architectural-drawings',
        'structural-drawings-details',
      ]),
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Draft package mapping only; not complete, approved, or production-ready.',
    },
    {
      stageId: 'S04',
      stageNumber: 4,
      stageTitle: 'Site Prep and Pre-Excavation',
      draftOntarioCoverage: 'Site plan, applicable law, excavation readiness, and municipal precheck placeholders.',
      foundationCategoryIds: categoryIds([
        'site-plan',
        'applicable-law-zoning-municipal-precheck',
        'obc-2024-small-residential-core',
      ]),
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Draft readiness mapping only; no Ontario inspection workflow is enabled.',
    },
    {
      stageId: 'S05',
      stageNumber: 5,
      stageTitle: 'Footings, Foundation, and Slab',
      draftOntarioCoverage: 'Foundation and structural readiness placeholders where applicable.',
      foundationCategoryIds: categoryIds([
        'obc-2024-small-residential-core',
        'structural-drawings-details',
        'site-plan',
      ]),
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Structural applicability requires Ontario review before any enforcement.',
    },
    {
      stageId: 'S06',
      stageNumber: 6,
      stageTitle: 'Structural Frame',
      draftOntarioCoverage: 'Framing, structural drawings/details, and architectural review readiness placeholders.',
      foundationCategoryIds: categoryIds([
        'obc-2024-small-residential-core',
        'structural-drawings-details',
        'architectural-drawings',
      ]),
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Stage alignment uses Vero S06; it does not create an Ontario-specific workflow.',
    },
    {
      stageId: 'S07',
      stageNumber: 7,
      stageTitle: 'Building Envelope',
      draftOntarioCoverage: 'Architectural drawings, OBC small residential core, and envelope readiness planning.',
      foundationCategoryIds: categoryIds([
        'obc-2024-small-residential-core',
        'architectural-drawings',
        'energy-efficiency-sb-12',
      ]),
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Draft only; no Ontario envelope template is active.',
    },
    {
      stageId: 'S08',
      stageNumber: 8,
      stageTitle: 'Fire and Life Safety',
      draftOntarioCoverage: 'Small residential life-safety planning tied to OBC core, architectural drawings, and electrical authority boundary placeholders.',
      foundationCategoryIds: categoryIds([
        'obc-2024-small-residential-core',
        'architectural-drawings',
        'electrical-authority-boundary',
      ]),
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Draft planning category only; not a live life-safety checklist.',
    },
    {
      stageId: 'S09',
      stageNumber: 9,
      stageTitle: 'Plumbing Permit and Scope',
      draftOntarioCoverage: 'Plumbing scope placeholder for future Ontario review.',
      foundationCategoryIds: categoryIds(['plumbing-scope', 'obc-2024-small-residential-core']),
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Not connected to Ontario inspector claiming or live plumbing dispatch.',
    },
    {
      stageId: 'S10',
      stageNumber: 10,
      stageTitle: 'Electrical Permit and Scope',
      draftOntarioCoverage: 'Electrical authority boundary placeholder for future Ontario review.',
      foundationCategoryIds: categoryIds(['electrical-authority-boundary', 'obc-2024-small-residential-core']),
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Authority-boundary placeholder only; no Ontario electrical routing is enabled.',
    },
    {
      stageId: 'S11',
      stageNumber: 11,
      stageTitle: 'Gas Permit and Mechanical / HVAC Scope',
      draftOntarioCoverage: 'HVAC/mechanical scope placeholder for future Ontario review.',
      foundationCategoryIds: categoryIds(['hvac-mechanical-scope', 'obc-2024-small-residential-core']),
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Not connected to live mechanical dispatch or claiming.',
    },
    {
      stageId: 'S12',
      stageNumber: 12,
      stageTitle: 'Insulation and Energy Compliance',
      draftOntarioCoverage: 'Energy efficiency / SB-12 placeholder where applicable.',
      foundationCategoryIds: categoryIds(['energy-efficiency-sb-12', 'obc-2024-small-residential-core']),
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'No Ontario energy compliance workflow is active.',
    },
    {
      stageId: 'S13',
      stageNumber: 13,
      stageTitle: 'Interior Completion',
      draftOntarioCoverage: 'Interior completion readiness planning tied to OBC core and architectural drawings.',
      foundationCategoryIds: categoryIds(['obc-2024-small-residential-core', 'architectural-drawings']),
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Draft stage mapping only; not a live Ontario completion template.',
    },
    {
      stageId: 'S14',
      stageNumber: 14,
      stageTitle: 'Exterior Works and Site Finalization',
      draftOntarioCoverage: 'Exterior/site finalization readiness with site plan and municipal precheck placeholders.',
      foundationCategoryIds: categoryIds([
        'site-plan',
        'applicable-law-zoning-municipal-precheck',
        'obc-2024-small-residential-core',
      ]),
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Municipal overlay details remain future/review-required.',
    },
    {
      stageId: 'S15',
      stageNumber: 15,
      stageTitle: 'Inspections, Final Approval, and Occupancy',
      draftOntarioCoverage: 'Final inspection / occupancy readiness placeholder with municipal authority boundary preserved.',
      foundationCategoryIds: categoryIds([
        'final-inspection-occupancy-readiness',
        'applicable-law-zoning-municipal-precheck',
        'obc-2024-small-residential-core',
      ]),
      status: 'draft_planned_dormant_requires_review',
      requiresReview: true,
      isActive: false,
      participatesInActiveResolution: false,
      note: 'Does not imply Vero grants occupancy, approval, or municipal acceptance.',
    },
  ],
}

export function getDormantOntarioStageAlignedTemplateMatrix(): DormantOntarioStageAlignedTemplateMatrix {
  return DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX
}
