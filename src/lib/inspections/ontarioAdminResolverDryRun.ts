import {
  DORMANT_ONTARIO_JURISDICTION_FAMILY,
  type TemplateJurisdictionInput,
  resolveTemplateJurisdiction,
} from './jurisdictionResolver'
import { DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION } from './ontarioMunicipalOverlayFoundation'
import { DORMANT_ONTARIO_TEMPLATE_GOVERNANCE } from './ontarioTemplateGovernance'

export type OntarioDryRunStatus = 'internal_planning_only'

export interface OntarioAdminResolverDryRunCase {
  id: string
  label: string
  sampleInput: TemplateJurisdictionInput
  plannedDormantJurisdictionSlug: string
  resolverStatus: 'dormant'
  activeDbTemplateResolutionEnabled: false
  publicRoutingEnabled: false
  dispatchEnabled: false
  inspectorClaimingEnabled: false
  checklistResponsesExpected: false
  sourceReviewRequired: true
  professionalAhjReviewRequired: true
  productionApprovalGranted: false
  fallbackToBcbcBlocked: true
  activationBlockers: string[]
  note: string
}

export interface OntarioAdminResolverDryRun {
  family: typeof DORMANT_ONTARIO_JURISDICTION_FAMILY.family
  status: OntarioDryRunStatus
  statusLabel: 'Internal Planning Only / Dormant / Not Publicly Enabled / Not Production Approved'
  publicRoutingEnabled: false
  dispatchEnabled: false
  inspectorClaimingEnabled: false
  activeDbTemplateResolutionEnabled: false
  checklistResponsesExpected: false
  sourceReviewRequired: true
  professionalAhjReviewRequired: true
  productionApprovalGranted: false
  usesExistingOntarioMetadata: true
  standaloneWorkflowCreated: false
  note: string
  cases: OntarioAdminResolverDryRunCase[]
}

const SHARED_BLOCKERS = [
  'Ontario source review is required before activation.',
  'Professional/AHJ review is required before activation.',
  'Production approval has not been granted.',
  'Ontario public routing is disabled.',
  'Ontario builder dispatch is disabled.',
  'Ontario inspector claiming is disabled.',
  'Ontario dry-run does not participate in active DB template resolution.',
  'No Ontario checklist responses are expected while dormant.',
]

const DRY_RUN_INPUTS: Array<{
  id: string
  label: string
  sampleInput: TemplateJurisdictionInput
  plannedDormantJurisdictionSlug: string
}> = [
  {
    id: 'ontario-province-obc-2024',
    label: 'Ontario province-level / OBC 2024',
    sampleInput: { province: 'ON', context: 'Ontario Building Code 2024' },
    plannedDormantJurisdictionSlug: DORMANT_ONTARIO_JURISDICTION_FAMILY.baseSlug,
  },
  ...DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION.overlays.map(overlay => ({
    id: `${overlay.plannedSlug}-dry-run`,
    label: overlay.municipalityName,
    sampleInput: { city: overlay.municipalityName, province: overlay.province },
    plannedDormantJurisdictionSlug: overlay.plannedSlug,
  })),
]

function buildDryRunCase(input: (typeof DRY_RUN_INPUTS)[number]): OntarioAdminResolverDryRunCase {
  const resolution = resolveTemplateJurisdiction(input.sampleInput)
  if (resolution.status !== 'dormant' || resolution.allowTemplateFallback) {
    throw new Error(`Ontario dry-run input unexpectedly resolved to an active template jurisdiction: ${input.id}`)
  }

  return {
    id: input.id,
    label: input.label,
    sampleInput: input.sampleInput,
    plannedDormantJurisdictionSlug: input.plannedDormantJurisdictionSlug,
    resolverStatus: 'dormant',
    activeDbTemplateResolutionEnabled: false,
    publicRoutingEnabled: false,
    dispatchEnabled: false,
    inspectorClaimingEnabled: false,
    checklistResponsesExpected: false,
    sourceReviewRequired: true,
    professionalAhjReviewRequired: true,
    productionApprovalGranted: false,
    fallbackToBcbcBlocked: true,
    activationBlockers: SHARED_BLOCKERS,
    note: 'Admin dry-run only. This planned slug is not active, not publicly enabled, and not used for live DB template resolution.',
  }
}

export const DORMANT_ONTARIO_ADMIN_RESOLVER_DRY_RUN: OntarioAdminResolverDryRun = {
  family: DORMANT_ONTARIO_JURISDICTION_FAMILY.family,
  status: 'internal_planning_only',
  statusLabel: 'Internal Planning Only / Dormant / Not Publicly Enabled / Not Production Approved',
  publicRoutingEnabled: false,
  dispatchEnabled: false,
  inspectorClaimingEnabled: false,
  activeDbTemplateResolutionEnabled: false,
  checklistResponsesExpected: false,
  sourceReviewRequired: true,
  professionalAhjReviewRequired: true,
  productionApprovalGranted: false,
  usesExistingOntarioMetadata: true,
  standaloneWorkflowCreated: false,
  note: 'Admin-only Ontario resolver dry-run. It reports planned dormant slugs for review without creating database rows, templates, dispatch, claiming, public routing, or active DB template resolution.',
  cases: DRY_RUN_INPUTS.map(buildDryRunCase),
}

export function getDormantOntarioAdminResolverDryRun(): OntarioAdminResolverDryRun {
  if (DORMANT_ONTARIO_TEMPLATE_GOVERNANCE.activeTemplateResolutionEnabled) {
    throw new Error('Ontario dry-run requires dormant governance with active template resolution disabled.')
  }
  if (DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION.activeTemplateResolutionEnabled) {
    throw new Error('Ontario dry-run requires municipal overlays to remain outside active DB resolution.')
  }
  return DORMANT_ONTARIO_ADMIN_RESOLVER_DRY_RUN
}
