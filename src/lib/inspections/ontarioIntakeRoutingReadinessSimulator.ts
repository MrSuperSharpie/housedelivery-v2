import { DORMANT_ONTARIO_JURISDICTION_FAMILY, resolveTemplateJurisdiction } from './jurisdictionResolver'
import { DORMANT_ONTARIO_ADMIN_RESOLVER_DRY_RUN } from './ontarioAdminResolverDryRun'
import { DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION } from './ontarioMunicipalOverlayFoundation'
import { DORMANT_ONTARIO_PROJECT_TAXONOMY_FOUNDATION } from './ontarioProjectTaxonomyFoundation'
import { DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION } from './ontarioSmallResidentialTemplateFoundation'
import {
  DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX,
  type VeroInspectionStageId,
} from './ontarioStageAlignedTemplateMatrix'
import { DORMANT_ONTARIO_TEMPLATE_GOVERNANCE } from './ontarioTemplateGovernance'

export type OntarioSimulatorStatus = 'draft_internal_dormant_not_active'

export interface OntarioSimulatorStagePlanningCoverage {
  stageId: VeroInspectionStageId
  stageTitle: string
  draftOntarioCoverage: string
}

export interface OntarioIntakeRoutingSimulatorScenario {
  id: string
  scenarioName: string
  province: typeof DORMANT_ONTARIO_JURISDICTION_FAMILY.province
  municipality: string
  plannedJurisdictionSlug: string
  plannedMunicipalOverlaySlug: string | null
  projectArchetype: string
  smallResidentialCategory: string
  workType: string
  expectedDormantTemplateCategories: string[]
  stagePlanningCoverage: OntarioSimulatorStagePlanningCoverage[]
  schedule1DesignerInformationPlanning: boolean
  bcinDesignerInformationPlanning: boolean
  applicableLawZoningMunicipalPrecheckPlanning: boolean
  energySb12Planning: boolean
  plumbingScopePlanning: boolean
  hvacMechanicalScopePlanning: boolean
  electricalAuthorityBoundaryPlanning: boolean
  sourceReviewRequired: true
  municipalReviewRequired: true
  professionalAhjReviewRequired: true
  productionApprovalGranted: false
  statusLabel: 'Draft / Internal Only / Dormant / Not Active / Not Publicly Enabled'
  activationBlockers: string[]
}

export interface OntarioIntakeRoutingReadinessSimulator {
  family: typeof DORMANT_ONTARIO_JURISDICTION_FAMILY.family
  status: OntarioSimulatorStatus
  statusLabel: 'Draft / Internal Only / Dormant / Not Active / Not Publicly Enabled / Not Production Approved'
  intakeEnabled: false
  publicRoutingEnabled: false
  dispatchEnabled: false
  inspectorClaimingEnabled: false
  activeDbTemplateResolutionEnabled: false
  checklistResponsesExpected: false
  sourceReviewRequired: true
  municipalReviewRequired: true
  professionalAhjReviewRequired: true
  productionApprovalGranted: false
  usesExistingOntarioFoundation: true
  usesExistingOntarioTaxonomy: true
  usesExistingOntarioStageMatrix: true
  usesExistingOntarioGovernance: true
  standaloneWorkflowCreated: false
  note: string
  activationBlockers: string[]
  scenarios: OntarioIntakeRoutingSimulatorScenario[]
}

const COMMON_BLOCKERS = [
  'Ontario intake is not enabled.',
  'Ontario public routing is disabled.',
  'Ontario builder dispatch is disabled.',
  'Ontario inspector claiming is disabled.',
  'Ontario simulator does not participate in active DB template resolution.',
  'No Ontario checklist responses are expected while dormant.',
  'Ontario source review is required before activation.',
  'Municipal overlay review is required before activation.',
  'Professional/AHJ review is required before activation.',
  'Production approval has not been granted.',
]

function categoryTitles(ids: string[]): string[] {
  return ids.map(id => {
    const category = DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION.categories.find(item => item.id === id)
    if (!category) {
      throw new Error(`Unknown dormant Ontario category in simulator: ${id}`)
    }
    return category.title
  })
}

function stageCoverage(ids: VeroInspectionStageId[]): OntarioSimulatorStagePlanningCoverage[] {
  return ids.map(stageId => {
    const stage = DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX.stages.find(item => item.stageId === stageId)
    if (!stage) {
      throw new Error(`Unknown dormant Ontario stage in simulator: ${stageId}`)
    }
    return {
      stageId: stage.stageId,
      stageTitle: stage.stageTitle,
      draftOntarioCoverage: stage.draftOntarioCoverage,
    }
  })
}

function overlaySlugFor(municipality: string): string | null {
  return (
    DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION.overlays.find(overlay => overlay.municipalityName === municipality)
      ?.plannedSlug ?? null
  )
}

function scenario(params: {
  id: string
  scenarioName: string
  municipality: string
  plannedJurisdictionSlug: string
  projectArchetype: string
  smallResidentialCategory: string
  workType: string
  categoryIds: string[]
  stageIds: VeroInspectionStageId[]
  schedule1DesignerInformationPlanning?: boolean
  bcinDesignerInformationPlanning?: boolean
  applicableLawZoningMunicipalPrecheckPlanning?: boolean
  energySb12Planning?: boolean
  plumbingScopePlanning?: boolean
  hvacMechanicalScopePlanning?: boolean
  electricalAuthorityBoundaryPlanning?: boolean
}): OntarioIntakeRoutingSimulatorScenario {
  const resolution = resolveTemplateJurisdiction({
    city: params.municipality === 'Province-level' ? null : params.municipality,
    province: DORMANT_ONTARIO_JURISDICTION_FAMILY.province,
    context: 'Ontario intake routing readiness simulator',
  })
  if (resolution.status !== 'dormant' || resolution.allowTemplateFallback) {
    throw new Error(`Ontario simulator scenario unexpectedly resolved to active routing: ${params.id}`)
  }

  return {
    id: params.id,
    scenarioName: params.scenarioName,
    province: DORMANT_ONTARIO_JURISDICTION_FAMILY.province,
    municipality: params.municipality,
    plannedJurisdictionSlug: params.plannedJurisdictionSlug,
    plannedMunicipalOverlaySlug: overlaySlugFor(params.municipality),
    projectArchetype: params.projectArchetype,
    smallResidentialCategory: params.smallResidentialCategory,
    workType: params.workType,
    expectedDormantTemplateCategories: categoryTitles(params.categoryIds),
    stagePlanningCoverage: stageCoverage(params.stageIds),
    schedule1DesignerInformationPlanning: params.schedule1DesignerInformationPlanning ?? false,
    bcinDesignerInformationPlanning: params.bcinDesignerInformationPlanning ?? false,
    applicableLawZoningMunicipalPrecheckPlanning: params.applicableLawZoningMunicipalPrecheckPlanning ?? true,
    energySb12Planning: params.energySb12Planning ?? false,
    plumbingScopePlanning: params.plumbingScopePlanning ?? false,
    hvacMechanicalScopePlanning: params.hvacMechanicalScopePlanning ?? false,
    electricalAuthorityBoundaryPlanning: params.electricalAuthorityBoundaryPlanning ?? false,
    sourceReviewRequired: true,
    municipalReviewRequired: true,
    professionalAhjReviewRequired: true,
    productionApprovalGranted: false,
    statusLabel: 'Draft / Internal Only / Dormant / Not Active / Not Publicly Enabled',
    activationBlockers: COMMON_BLOCKERS,
  }
}

export const DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR: OntarioIntakeRoutingReadinessSimulator = {
  family: DORMANT_ONTARIO_JURISDICTION_FAMILY.family,
  status: 'draft_internal_dormant_not_active',
  statusLabel: 'Draft / Internal Only / Dormant / Not Active / Not Publicly Enabled / Not Production Approved',
  intakeEnabled: false,
  publicRoutingEnabled: false,
  dispatchEnabled: false,
  inspectorClaimingEnabled: false,
  activeDbTemplateResolutionEnabled: false,
  checklistResponsesExpected: false,
  sourceReviewRequired: true,
  municipalReviewRequired: true,
  professionalAhjReviewRequired: true,
  productionApprovalGranted: false,
  usesExistingOntarioFoundation: true,
  usesExistingOntarioTaxonomy: true,
  usesExistingOntarioStageMatrix: true,
  usesExistingOntarioGovernance: true,
  standaloneWorkflowCreated: false,
  note: 'Admin-only Ontario intake and routing readiness simulator. It composes dormant Ontario taxonomy, municipal overlays, resolver dry-run, template foundation, stage matrix, and governance blockers without enabling live intake, routing, dispatch, claiming, templates, or production behavior.',
  activationBlockers: COMMON_BLOCKERS,
  scenarios: [
    scenario({
      id: 'ontario-province-small-residential',
      scenarioName: 'Ontario province-level small residential project',
      municipality: 'Province-level',
      plannedJurisdictionSlug: DORMANT_ONTARIO_JURISDICTION_FAMILY.baseSlug,
      projectArchetype: 'Small residential',
      smallResidentialCategory: 'Ontario small residential core',
      workType: 'New build',
      categoryIds: [
        'obc-2024-small-residential-core',
        'permit-construct-or-demolish-application',
        'site-plan',
        'architectural-drawings',
        'energy-efficiency-sb-12',
      ],
      stageIds: ['S01', 'S03', 'S05', 'S06', 'S12', 'S15'],
      schedule1DesignerInformationPlanning: true,
      bcinDesignerInformationPlanning: true,
      energySb12Planning: true,
    }),
    scenario({
      id: 'toronto-aru-garden-suite-readiness',
      scenarioName: 'Toronto additional residential unit / garden suite readiness',
      municipality: 'Toronto',
      plannedJurisdictionSlug: 'toronto_obc_2024',
      projectArchetype: 'Additional residential unit / garden suite',
      smallResidentialCategory: 'Additional residential unit',
      workType: 'Addition / alteration',
      categoryIds: [
        'obc-2024-small-residential-core',
        'applicable-law-zoning-municipal-precheck',
        'site-plan',
        'architectural-drawings',
        'schedule-1-designer-information',
        'bcin-designer-information',
        'energy-efficiency-sb-12',
      ],
      stageIds: ['S01', 'S02', 'S03', 'S04', 'S07', 'S12', 'S15'],
      schedule1DesignerInformationPlanning: true,
      bcinDesignerInformationPlanning: true,
      energySb12Planning: true,
      plumbingScopePlanning: true,
      hvacMechanicalScopePlanning: true,
      electricalAuthorityBoundaryPlanning: true,
    }),
    scenario({
      id: 'ottawa-small-residential-permit-readiness',
      scenarioName: 'Ottawa small residential permit readiness',
      municipality: 'Ottawa',
      plannedJurisdictionSlug: 'ottawa_obc_2024',
      projectArchetype: 'Small residential permit',
      smallResidentialCategory: 'Single detached / semi-detached review placeholder',
      workType: 'New build / renovation',
      categoryIds: [
        'permit-construct-or-demolish-application',
        'applicable-law-zoning-municipal-precheck',
        'architectural-drawings',
        'structural-drawings-details',
        'plumbing-scope',
        'hvac-mechanical-scope',
        'electrical-authority-boundary',
      ],
      stageIds: ['S01', 'S02', 'S03', 'S05', 'S09', 'S10', 'S11', 'S15'],
      schedule1DesignerInformationPlanning: true,
      bcinDesignerInformationPlanning: true,
      plumbingScopePlanning: true,
      hvacMechanicalScopePlanning: true,
      electricalAuthorityBoundaryPlanning: true,
    }),
    scenario({
      id: 'mississauga-detached-semi-detached-readiness',
      scenarioName: 'Mississauga detached/semi-detached residential readiness',
      municipality: 'Mississauga',
      plannedJurisdictionSlug: 'mississauga_obc_2024',
      projectArchetype: 'Detached / semi-detached residential',
      smallResidentialCategory: 'Single detached or semi-detached',
      workType: 'New build / alteration / renovation',
      categoryIds: [
        'obc-2024-small-residential-core',
        'site-plan',
        'architectural-drawings',
        'structural-drawings-details',
        'energy-efficiency-sb-12',
        'final-inspection-occupancy-readiness',
      ],
      stageIds: ['S01', 'S03', 'S05', 'S06', 'S12', 'S13', 'S14', 'S15'],
      schedule1DesignerInformationPlanning: true,
      bcinDesignerInformationPlanning: true,
      energySb12Planning: true,
    }),
  ],
}

export function getDormantOntarioIntakeRoutingReadinessSimulator(): OntarioIntakeRoutingReadinessSimulator {
  if (DORMANT_ONTARIO_PROJECT_TAXONOMY_FOUNDATION.activeTemplateResolutionEnabled) {
    throw new Error('Ontario simulator requires taxonomy to remain outside active DB resolution.')
  }
  if (DORMANT_ONTARIO_ADMIN_RESOLVER_DRY_RUN.activeDbTemplateResolutionEnabled) {
    throw new Error('Ontario simulator requires dry-run resolution to remain inactive.')
  }
  if (DORMANT_ONTARIO_TEMPLATE_GOVERNANCE.activeTemplateResolutionEnabled) {
    throw new Error('Ontario simulator requires governance to keep active template resolution disabled.')
  }
  return DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR
}
