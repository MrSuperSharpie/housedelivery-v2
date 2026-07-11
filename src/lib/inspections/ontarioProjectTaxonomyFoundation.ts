import { DORMANT_ONTARIO_JURISDICTION_FAMILY } from './jurisdictionResolver'
import { DORMANT_ONTARIO_ADMIN_RESOLVER_DRY_RUN } from './ontarioAdminResolverDryRun'
import { DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION } from './ontarioMunicipalOverlayFoundation'
import { DORMANT_ONTARIO_TEMPLATE_GOVERNANCE } from './ontarioTemplateGovernance'

export type OntarioProjectTaxonomyStatus = 'draft_planned_dormant_not_active'
export type OntarioProjectTaxonomyReviewStatus = 'requires_review'
export type OntarioProjectTaxonomyProductionApprovalStatus = 'not_granted'

export interface OntarioProjectTaxonomyField {
  id: string
  label: string
  group: string
  status: OntarioProjectTaxonomyStatus
  reviewStatus: OntarioProjectTaxonomyReviewStatus
  isActiveProductionField: false
  requiresDatabaseMigrationBeforeActivation: true
  note: string
}

export interface DormantOntarioProjectTaxonomyFoundation {
  family: typeof DORMANT_ONTARIO_JURISDICTION_FAMILY.family
  statusLabel: 'Draft / Planned / Dormant / Not Active / Not Publicly Enabled / Not Production Approved'
  scopeLabel: 'Ontario project taxonomy foundation'
  taxonomyStatus: OntarioProjectTaxonomyStatus
  publicRoutingEnabled: false
  dispatchEnabled: false
  inspectorClaimingEnabled: false
  activeTemplateResolutionEnabled: false
  projectIntakeEnabled: false
  databaseMigrationCreated: false
  productionApprovalStatus: OntarioProjectTaxonomyProductionApprovalStatus
  municipalOverlayReviewStatus: OntarioProjectTaxonomyReviewStatus
  professionalAhjReviewStatus: OntarioProjectTaxonomyReviewStatus
  usesExistingOntarioMetadata: true
  standaloneWorkflowCreated: false
  note: string
  activationBlockers: string[]
  fields: OntarioProjectTaxonomyField[]
}

const field = (id: string, label: string, group: string, note: string): OntarioProjectTaxonomyField => ({
  id,
  label,
  group,
  status: 'draft_planned_dormant_not_active',
  reviewStatus: 'requires_review',
  isActiveProductionField: false,
  requiresDatabaseMigrationBeforeActivation: true,
  note,
})

export const DORMANT_ONTARIO_PROJECT_TAXONOMY_FOUNDATION: DormantOntarioProjectTaxonomyFoundation = {
  family: DORMANT_ONTARIO_JURISDICTION_FAMILY.family,
  statusLabel: 'Draft / Planned / Dormant / Not Active / Not Publicly Enabled / Not Production Approved',
  scopeLabel: 'Ontario project taxonomy foundation',
  taxonomyStatus: 'draft_planned_dormant_not_active',
  publicRoutingEnabled: false,
  dispatchEnabled: false,
  inspectorClaimingEnabled: false,
  activeTemplateResolutionEnabled: false,
  projectIntakeEnabled: false,
  databaseMigrationCreated: false,
  productionApprovalStatus: 'not_granted',
  municipalOverlayReviewStatus: 'requires_review',
  professionalAhjReviewStatus: 'requires_review',
  usesExistingOntarioMetadata: true,
  standaloneWorkflowCreated: false,
  note: 'Internal planning taxonomy only. These are not active production fields and do not enable Ontario intake, routing, dispatch, claiming, templates, or DB resolution.',
  activationBlockers: [
    'Ontario project taxonomy source review is required before activation.',
    'Municipal overlay review is required before activation.',
    'Professional/AHJ review is required before activation.',
    'Production approval has not been granted.',
    'No database migration has been created for Ontario project taxonomy fields.',
    'Ontario project intake is not enabled.',
    'Ontario public routing is disabled.',
    'Ontario builder dispatch is disabled.',
    'Ontario inspector claiming is disabled.',
    'Ontario taxonomy does not participate in active DB template resolution.',
  ],
  fields: [
    field('province', 'Province', 'Jurisdiction', 'Draft Ontario province marker; not an active production field.'),
    field('municipality', 'Municipality', 'Jurisdiction', 'Draft municipal project classifier for future overlay review.'),
    field('planned-jurisdiction-slug', 'Planned jurisdiction slug', 'Jurisdiction', 'Draft planned OBC slug reference only.'),
    field('municipal-overlay-slug', 'Municipal overlay slug', 'Jurisdiction', 'Draft planned municipal overlay slug reference only.'),
    field('project-archetype', 'Project archetype', 'Project scope', 'Draft archetype classifier; no template routing is active.'),
    field('work-type', 'New build / addition / alteration / renovation / demolition / change of use', 'Project scope', 'Draft work-type classifier requiring Ontario source review.'),
    field('small-residential-category', 'Small residential category', 'Project scope', 'Draft small-residential category for future OBC review.'),
    field('single-detached', 'Single detached', 'Project scope', 'Draft small residential subtype; not production enabled.'),
    field('semi-detached-duplex', 'Semi-detached / duplex', 'Project scope', 'Draft small residential subtype; not production enabled.'),
    field('additional-residential-unit', 'Additional residential unit', 'Project scope', 'Draft ARU subtype requiring municipal review.'),
    field('garden-laneway-detached-accessory-dwelling', 'Garden suite / laneway suite / detached accessory dwelling', 'Project scope', 'Draft accessory dwelling subtype requiring municipal review.'),
    field('garage-accessory-structure', 'Garage / accessory structure', 'Project scope', 'Draft accessory structure subtype; no Ontario templates are active.'),
    field('existing-dwelling-unit-count', 'Existing dwelling-unit count', 'Project metrics', 'Draft unit-count field; no database migration has been created.'),
    field('proposed-dwelling-unit-count', 'Proposed dwelling-unit count', 'Project metrics', 'Draft unit-count field; no database migration has been created.'),
    field('storeys', 'Storeys', 'Project metrics', 'Draft storey-count field for future Part 9 / Part 3 review.'),
    field('approximate-building-area', 'Approximate building area', 'Project metrics', 'Draft area field for future code-path review.'),
    field('part-9-part-3-path-placeholder', 'Part 9 / Part 3 path placeholder', 'Code path', 'Draft code-path placeholder; not a governed classifier.'),
    field('occupancy-classification-placeholder', 'Occupancy classification placeholder', 'Code path', 'Draft occupancy placeholder requiring professional/AHJ review.'),
    field('schedule-1-designer-information-applicability', 'Schedule 1 Designer Information applicability', 'Professional / documents', 'Draft applicability marker; not enforced.'),
    field('bcin-designer-information-applicability', 'BCIN/designer information applicability', 'Professional / documents', 'Draft applicability marker; not enforced.'),
    field('general-review-architect-engineer-involvement-placeholder', 'General review / architect / engineer involvement placeholder', 'Professional / documents', 'Draft professional-involvement marker requiring review.'),
    field('applicable-law-zoning-municipal-precheck-status', 'Applicable law / zoning / municipal precheck status', 'Municipal review', 'Draft municipal precheck status; not connected to intake or routing.'),
    field('energy-efficiency-sb-12-applicability', 'Energy efficiency / SB-12 applicability', 'Trade / systems', 'Draft energy applicability marker; not enforced.'),
    field('plumbing-scope', 'Plumbing scope', 'Trade / systems', 'Draft plumbing scope marker; no Ontario claiming is active.'),
    field('hvac-mechanical-scope', 'HVAC/mechanical scope', 'Trade / systems', 'Draft mechanical scope marker; no Ontario claiming is active.'),
    field('electrical-authority-boundary', 'Electrical authority boundary', 'Trade / systems', 'Draft authority-boundary marker; no Ontario electrical workflow is active.'),
    field('municipal-overlay-review-requirement', 'Municipal overlay review requirement', 'Governance', 'Draft review requirement; municipal overlays are dormant.'),
    field('professional-ahj-review-requirement', 'Professional/AHJ review requirement', 'Governance', 'Draft review requirement before any activation.'),
    field('production-approval-status', 'Production approval status', 'Governance', 'Draft production approval status; approval is not granted.'),
  ],
}

export function getDormantOntarioProjectTaxonomyFoundation(): DormantOntarioProjectTaxonomyFoundation {
  if (DORMANT_ONTARIO_TEMPLATE_GOVERNANCE.activeTemplateResolutionEnabled) {
    throw new Error('Ontario project taxonomy requires dormant governance with active template resolution disabled.')
  }
  if (DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION.activeTemplateResolutionEnabled) {
    throw new Error('Ontario project taxonomy requires municipal overlays to remain outside active DB resolution.')
  }
  if (DORMANT_ONTARIO_ADMIN_RESOLVER_DRY_RUN.activeDbTemplateResolutionEnabled) {
    throw new Error('Ontario project taxonomy requires the admin dry-run to remain outside active DB resolution.')
  }
  return DORMANT_ONTARIO_PROJECT_TAXONOMY_FOUNDATION
}
