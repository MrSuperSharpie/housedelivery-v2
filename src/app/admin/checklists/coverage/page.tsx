'use client'
export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, MinusCircle, AlertTriangle, Activity } from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'

// ─── Types (mirror /api/admin/checklists/coverage response) ─────────────────────

interface Totals {
  jurisdictions: number
  activeJurisdictions: number
  stages: number
  activeStages: number
  templates: number
  activeTemplates: number
  inactiveTemplates: number
  items: number
  activeItems: number
  responses: number
  coverageCells: number
  activeCells: number
  inactiveOnlyCells: number
  missingCells: number
}

interface CoverageCell {
  jurisdictionId: string
  jurisdictionName: string
  stageId: string
  stageNumber: number
  stageTitle: string
  status: 'active' | 'inactive-only' | 'missing'
  activeVersion: number | null
  versionCount: number
  activeItemCount: number
  requiredItemCount: number
}

interface OrphanTemplate {
  id: string
  title: string
  missingStage: boolean
  missingJurisdiction: boolean
}

interface ResolverDimension {
  dimension: string
  used: boolean
  note: string
}

interface GapDimension {
  dimension: string
  supported: boolean
}

interface DormantOntarioCoverage {
  family: 'ontario'
  statusLabel: 'Planned / Dormant / Not Publicly Enabled'
  baseSlug: string
  plannedSlugs: string[]
  isActive: boolean
  dispatchEnabled: boolean
  templatesActive: boolean
  publicRoutingEnabled: boolean
  resolverFallbackToBcbcBlocked: boolean
  note: string
}

interface DormantOntarioTemplateFoundation {
  family: 'ontario'
  statusLabel: 'Draft / Planned / Dormant / Not Active / Requires Review'
  scopeLabel: string
  isActive: boolean
  templatesActive: boolean
  publicRoutingEnabled: boolean
  dispatchEnabled: boolean
  participatesInActiveDbResolution: boolean
  checklistResponsesExpected: boolean
  note: string
  categories: {
    id: string
    title: string
    status: string
    requiresReview: boolean
    isActive: boolean
    participatesInActiveResolution: boolean
    note: string
  }[]
  municipalOverlays: {
    slug: string
    municipality: string
    status: string
    requiresReview: boolean
    isActive: boolean
    templatesActive: boolean
  }[]
}

interface DormantOntarioStageMatrix {
  family: 'ontario'
  statusLabel: 'Draft / Planned / Dormant / Not Active / Requires Review'
  scopeLabel: string
  isActive: boolean
  templatesActive: boolean
  publicRoutingEnabled: boolean
  dispatchEnabled: boolean
  participatesInActiveDbResolution: boolean
  checklistResponsesExpected: boolean
  usesExistingVeroStageArchitecture: boolean
  note: string
  stages: {
    stageId: string
    stageNumber: number
    stageTitle: string
    draftOntarioCoverage: string
    foundationCategoryIds: string[]
    status: string
    requiresReview: boolean
    isActive: boolean
    participatesInActiveResolution: boolean
    note: string
  }[]
  municipalOverlaySlugs: string[]
}

interface DormantOntarioTemplateGovernance {
  family: 'ontario'
  statusLabel: 'Draft / Dormant / Not Active / Not Publicly Enabled / Not Production Approved'
  governanceStatus: string
  foundationStatus: string
  stageMatrixStatus: string
  publicEnabled: boolean
  dispatchEnabled: boolean
  inspectorClaimingEnabled: boolean
  activeTemplateResolutionEnabled: boolean
  sourceReviewStatus: string
  professionalReviewStatus: string
  municipalOverlayReviewStatus: string
  productionApprovalStatus: string
  checklistResponsesExpected: boolean
  referencesExistingFoundation: boolean
  referencesExistingStageMatrix: boolean
  foundationScopeLabel: string
  stageMatrixScopeLabel: string
  note: string
  activationBlockers: string[]
  sourceCategories: {
    id: string
    label: string
    status: string
    note: string
  }[]
}

interface DormantOntarioMunicipalOverlayFoundation {
  family: 'ontario'
  statusLabel: string
  scopeLabel: string
  parentJurisdictionSlug: string
  overlayStatus: string
  publicRoutingEnabled: boolean
  dispatchEnabled: boolean
  inspectorClaimingEnabled: boolean
  activeTemplateResolutionEnabled: boolean
  checklistResponsesExpected: boolean
  municipalSourceReviewStatus: string
  professionalReviewStatus: string
  productionApprovalStatus: string
  referencesExistingOntarioFoundation: boolean
  referencesExistingOntarioGovernance: boolean
  standaloneWorkflowCreated: boolean
  note: string
  overlays: {
    municipalityName: string
    province: string
    plannedSlug: string
    parentJurisdictionSlug: string
    overlayStatus: string
    publicEnabled: boolean
    dispatchEnabled: boolean
    inspectorClaimingEnabled: boolean
    activeTemplateResolutionEnabled: boolean
    checklistResponsesExpected: boolean
    municipalSourceReviewStatus: string
    professionalReviewStatus: string
    productionApprovalStatus: string
    activationBlockers: string[]
    plannedSourceCategories: {
      id: string
      label: string
      reviewStatus: string
      note: string
    }[]
  }[]
}

interface DormantOntarioAdminResolverDryRun {
  family: 'ontario'
  status: string
  statusLabel: string
  publicRoutingEnabled: boolean
  dispatchEnabled: boolean
  inspectorClaimingEnabled: boolean
  activeDbTemplateResolutionEnabled: boolean
  checklistResponsesExpected: boolean
  sourceReviewRequired: boolean
  professionalAhjReviewRequired: boolean
  productionApprovalGranted: boolean
  usesExistingOntarioMetadata: boolean
  standaloneWorkflowCreated: boolean
  note: string
  cases: {
    id: string
    label: string
    sampleInput: {
      city?: string | null
      province?: string | null
      context?: string | null
    }
    plannedDormantJurisdictionSlug: string
    resolverStatus: string
    activeDbTemplateResolutionEnabled: boolean
    publicRoutingEnabled: boolean
    dispatchEnabled: boolean
    inspectorClaimingEnabled: boolean
    checklistResponsesExpected: boolean
    sourceReviewRequired: boolean
    professionalAhjReviewRequired: boolean
    productionApprovalGranted: boolean
    fallbackToBcbcBlocked: boolean
    activationBlockers: string[]
    note: string
  }[]
}

interface DormantOntarioProjectTaxonomyFoundation {
  family: 'ontario'
  statusLabel: string
  scopeLabel: string
  taxonomyStatus: string
  publicRoutingEnabled: boolean
  dispatchEnabled: boolean
  inspectorClaimingEnabled: boolean
  activeTemplateResolutionEnabled: boolean
  projectIntakeEnabled: boolean
  databaseMigrationCreated: boolean
  productionApprovalStatus: string
  municipalOverlayReviewStatus: string
  professionalAhjReviewStatus: string
  usesExistingOntarioMetadata: boolean
  standaloneWorkflowCreated: boolean
  note: string
  activationBlockers: string[]
  fields: {
    id: string
    label: string
    group: string
    status: string
    reviewStatus: string
    isActiveProductionField: boolean
    requiresDatabaseMigrationBeforeActivation: boolean
    note: string
  }[]
}

interface DormantOntarioIntakeRoutingReadinessSimulator {
  family: 'ontario'
  status: string
  statusLabel: string
  intakeEnabled: boolean
  publicRoutingEnabled: boolean
  dispatchEnabled: boolean
  inspectorClaimingEnabled: boolean
  activeDbTemplateResolutionEnabled: boolean
  checklistResponsesExpected: boolean
  sourceReviewRequired: boolean
  municipalReviewRequired: boolean
  professionalAhjReviewRequired: boolean
  productionApprovalGranted: boolean
  usesExistingOntarioFoundation: boolean
  usesExistingOntarioTaxonomy: boolean
  usesExistingOntarioStageMatrix: boolean
  usesExistingOntarioGovernance: boolean
  standaloneWorkflowCreated: boolean
  note: string
  activationBlockers: string[]
  scenarios: {
    id: string
    scenarioName: string
    province: string
    municipality: string
    plannedJurisdictionSlug: string
    plannedMunicipalOverlaySlug: string | null
    projectArchetype: string
    smallResidentialCategory: string
    workType: string
    expectedDormantTemplateCategories: string[]
    stagePlanningCoverage: {
      stageId: string
      stageTitle: string
      draftOntarioCoverage: string
    }[]
    schedule1DesignerInformationPlanning: boolean
    bcinDesignerInformationPlanning: boolean
    applicableLawZoningMunicipalPrecheckPlanning: boolean
    energySb12Planning: boolean
    plumbingScopePlanning: boolean
    hvacMechanicalScopePlanning: boolean
    electricalAuthorityBoundaryPlanning: boolean
    sourceReviewRequired: boolean
    municipalReviewRequired: boolean
    professionalAhjReviewRequired: boolean
    productionApprovalGranted: boolean
    statusLabel: string
    activationBlockers: string[]
  }[]
}

interface DormantOntarioDraftChecklistItemCatalog {
  family: 'ontario'
  statusLabel: string
  catalogStatus: string
  isActive: boolean
  activeTemplatesCreated: boolean
  databaseRowsCreated: boolean
  databaseMigrationCreated: boolean
  publicRoutingEnabled: boolean
  dispatchEnabled: boolean
  inspectorClaimingEnabled: boolean
  activeTemplateResolutionEnabled: boolean
  checklistResponsesExpected: boolean
  sourceReviewStatus: string
  municipalReviewStatus: string
  professionalReviewStatus: string
  productionApprovalStatus: string
  referencesExistingOntarioFoundation: boolean
  referencesExistingOntarioStageMatrix: boolean
  referencesExistingOntarioTaxonomy: boolean
  referencesExistingOntarioMunicipalOverlays: boolean
  referencesExistingOntarioGovernance: boolean
  referencesExistingOntarioSimulator: boolean
  standaloneWorkflowCreated: boolean
  note: string
  activationBlockers: string[]
  items: {
    itemId: string
    title: string
    draftDescription: string
    stageCodes: string[]
    foundationCategoryId: string
    templateCategory: string
    appliesToMunicipalities: string[]
    sourceReviewStatus: string
    municipalReviewStatus: string
    professionalReviewStatus: string
    productionApprovalStatus: string
    activeTemplateResolutionEnabled: boolean
    publicEnabled: boolean
    dispatchEnabled: boolean
    inspectorClaimingEnabled: boolean
    activationBlockers: string[]
  }[]
}

interface DormantOntarioEvidenceDocumentRequirementsFoundation {
  family: 'ontario'
  statusLabel: string
  foundationStatus: string
  isActive: boolean
  activeRequirementsCreated: boolean
  activeEvidenceEnforcementEnabled: boolean
  databaseRowsCreated: boolean
  databaseMigrationCreated: boolean
  publicRoutingEnabled: boolean
  dispatchEnabled: boolean
  inspectorClaimingEnabled: boolean
  activeTemplateResolutionEnabled: boolean
  checklistResponsesExpected: boolean
  sourceReviewStatus: string
  municipalReviewStatus: string
  professionalReviewStatus: string
  productionApprovalStatus: string
  referencesExistingOntarioChecklistCatalog: boolean
  referencesExistingOntarioFoundation: boolean
  referencesExistingOntarioStageMatrix: boolean
  referencesExistingOntarioTaxonomy: boolean
  referencesExistingOntarioMunicipalOverlays: boolean
  referencesExistingOntarioGovernance: boolean
  referencesExistingOntarioSimulator: boolean
  standaloneWorkflowCreated: boolean
  note: string
  activationBlockers: string[]
  requirements: {
    requirementId: string
    title: string
    draftDescription: string
    relatedChecklistItemIds: string[]
    relatedStageCodes: string[]
    requirementType: string
    appliesToMunicipalities: string[]
    requiredStatus: string
    sourceReviewStatus: string
    municipalReviewStatus: string
    professionalReviewStatus: string
    productionApprovalStatus: string
    activeEvidenceEnforcementEnabled: boolean
    activeTemplateResolutionEnabled: boolean
    publicEnabled: boolean
    dispatchEnabled: boolean
    inspectorClaimingEnabled: boolean
    activationBlockers: string[]
  }[]
}

interface DormantOntarioAuthorityPackageWordingSpec {
  family: 'ontario'
  statusLabel: string
  specStatus: string
  sourceDocumentPath: string
  sourceDocumentTitle: string
  recommendedPackageName: string
  isActive: boolean
  publicEnabled: boolean
  authorityPackageGenerationEnabled: boolean
  productionApprovalStatus: string
  wordingReviewStatus: string
  scheduleCbReusedForOntario: boolean
  scheduleCbGenerationChanged: boolean
  vaultSealCompletionChanged: boolean
  vaultSealCompletionSecurityChanged: boolean
  publicRoutingEnabled: boolean
  dispatchEnabled: boolean
  inspectorClaimingEnabled: boolean
  activeTemplateResolutionEnabled: boolean
  referencesExistingOntarioChecklistCatalog: boolean
  referencesExistingOntarioEvidenceFoundation: boolean
  referencesExistingOntarioGovernance: boolean
  referencesExistingOntarioSimulator: boolean
  standaloneWorkflowCreated: boolean
  note: string
  requiredSeparations: string[]
  activationBlockers: string[]
}

interface CoveragePayload {
  ok: boolean
  totals: Totals
  jurisdictions: { id: string; name: string; codeVersion: string | null }[]
  stages: { id: string; stageNumber: number; title: string }[]
  coverage: CoverageCell[]
  orphanTemplates: OrphanTemplate[]
  orphanItemCount: number
  resolverBasis: ResolverDimension[]
  largerProjectGaps: GapDimension[]
  templateGovernance: { hasReviewPublishWorkflow: boolean; note: string }
  dormantOntarioCoverage: DormantOntarioCoverage
  dormantOntarioTemplateFoundation: DormantOntarioTemplateFoundation
  dormantOntarioStageMatrix: DormantOntarioStageMatrix
  dormantOntarioTemplateGovernance: DormantOntarioTemplateGovernance
  dormantOntarioMunicipalOverlayFoundation: DormantOntarioMunicipalOverlayFoundation
  dormantOntarioAdminResolverDryRun: DormantOntarioAdminResolverDryRun
  dormantOntarioProjectTaxonomyFoundation: DormantOntarioProjectTaxonomyFoundation
  dormantOntarioIntakeRoutingReadinessSimulator: DormantOntarioIntakeRoutingReadinessSimulator
  dormantOntarioDraftChecklistItemCatalog: DormantOntarioDraftChecklistItemCatalog
  dormantOntarioEvidenceDocumentRequirementsFoundation: DormantOntarioEvidenceDocumentRequirementsFoundation
  dormantOntarioAuthorityPackageWordingSpec: DormantOntarioAuthorityPackageWordingSpec
}

// ─── Small presentational helpers ───────────────────────────────────────────────

function StatTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/5 p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-subtle">{label}</div>
      <div className="mt-1.5 text-2xl font-black text-ink">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}
    </div>
  )
}

function StatusBadge({ status }: { status: CoverageCell['status'] }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-success-green/25 bg-success-green/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-success-green">
        <CheckCircle2 className="h-3 w-3" /> Active
      </span>
    )
  }
  if (status === 'inactive-only') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-flame/25 bg-flame/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-flame">
        <MinusCircle className="h-3 w-3" /> Inactive only
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-muted">
      <AlertTriangle className="h-3 w-3" /> No template
    </span>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function ChecklistCoveragePage() {
  const [data, setData] = useState<CoveragePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetch('/api/admin/checklists/coverage')
      .then(async r => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`)
        return r.json() as Promise<CoveragePayload>
      })
      .then(payload => {
        if (payload.ok) setData(payload)
        else setError('Diagnostic data unavailable.')
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load diagnostic.'))
      .finally(() => setLoading(false))
  }, [])

  const cellsByJurisdiction = React.useMemo(() => {
    if (!data) return []
    const map = new Map<string, CoverageCell[]>()
    for (const cell of data.coverage) {
      const list = map.get(cell.jurisdictionName) ?? []
      list.push(cell)
      map.set(cell.jurisdictionName, list)
    }
    return Array.from(map.entries()).map(([name, cells]) => ({
      name,
      cells: cells.slice().sort((a, b) => a.stageNumber - b.stageNumber),
    }))
  }, [data])

  const ontarioTaxonomyFieldGroups = React.useMemo(() => {
    if (!data) return []
    const map = new Map<string, DormantOntarioProjectTaxonomyFoundation['fields']>()
    for (const field of data.dormantOntarioProjectTaxonomyFoundation.fields) {
      const list = map.get(field.group) ?? []
      list.push(field)
      map.set(field.group, list)
    }
    return Array.from(map.entries()).map(([group, fields]) => ({ group, fields }))
  }, [data])

  return (
    <AdminShell
      title="Coverage Diagnostic"
      subtitle="Internal read-only view of checklist/template coverage and larger-project readiness. This is an operational diagnostic, not an approval or compliance decision."
    >
      <div className="mb-6">
        <Link
          href="/admin/checklists"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Checklist Templates
        </Link>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted">Loading diagnostic…</div>
      ) : error ? (
        <div className="rounded-xl border border-flame/20 bg-flame/5 p-6 text-sm text-flame">{error}</div>
      ) : !data ? (
        <div className="py-16 text-center text-sm text-muted">No diagnostic data.</div>
      ) : (
        <div className="space-y-8">

          {/* Overview */}
          <section>
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-subtle">Overview</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile label="Jurisdictions" value={data.totals.activeJurisdictions} hint={`${data.totals.jurisdictions} total`} />
              <StatTile label="Inspection Stages" value={data.totals.activeStages} hint={`${data.totals.stages} total`} />
              <StatTile
                label="Templates"
                value={data.totals.activeTemplates}
                hint={`${data.totals.inactiveTemplates} inactive · ${data.totals.templates} total`}
              />
              <StatTile
                label="Checklist Items"
                value={data.totals.activeItems}
                hint={`${data.totals.items} total (incl. retired)`}
              />
            </div>
          </section>

          {/* Coverage signals */}
          <section>
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-subtle">Readiness Signals</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label="Cells Covered"
                value={<span className="text-success-green">{data.totals.activeCells}</span>}
                hint={`of ${data.totals.coverageCells} stage × jurisdiction cells`}
              />
              <StatTile
                label="Inactive-only Cells"
                value={<span className={data.totals.inactiveOnlyCells ? 'text-flame' : 'text-ink'}>{data.totals.inactiveOnlyCells}</span>}
                hint="templates exist but none active"
              />
              <StatTile
                label="Missing Cells"
                value={<span className={data.totals.missingCells ? 'text-flame' : 'text-ink'}>{data.totals.missingCells}</span>}
                hint="no template for stage × jurisdiction"
              />
              <StatTile
                label="Recorded Responses"
                value={data.totals.responses}
                hint="permit checklist responses on file"
              />
            </div>
          </section>

          {/* Current resolver basis */}
          <section className="rounded-xl border border-white/8 bg-white/5 p-6">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-flame" />
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink">Current Resolver Basis</h2>
            </div>
            <p className="mt-2 text-xs text-muted">
              These are the only inputs the live template resolver uses today. Nothing here changes resolution — it
              simply reports the current basis.
            </p>
            <ul className="mt-4 space-y-2">
              {data.resolverBasis.map(d => (
                <li key={d.dimension} className="flex items-start gap-3 rounded-lg border border-white/8 bg-surface/40 px-4 py-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-green" />
                  <div>
                    <div className="text-sm font-bold text-ink">{d.dimension}</div>
                    <div className="text-xs text-muted">{d.note}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Dormant Ontario scaffold */}
          <section className="rounded-xl border border-flame/20 bg-flame/5 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-flame" />
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink">Ontario Coverage Readiness</h2>
              <span className="rounded-full border border-flame/25 bg-flame/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-flame">
                {data.dormantOntarioCoverage.statusLabel}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted">{data.dormantOntarioCoverage.note}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-surface/40 px-4 py-2.5">
                <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                <span className="text-sm text-ink">Ontario active</span>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                  {data.dormantOntarioCoverage.isActive ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-surface/40 px-4 py-2.5">
                <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                <span className="text-sm text-ink">Ontario dispatch</span>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                  {data.dormantOntarioCoverage.dispatchEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-surface/40 px-4 py-2.5">
                <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                <span className="text-sm text-ink">Ontario templates</span>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                  {data.dormantOntarioCoverage.templatesActive ? 'Active' : 'Not active'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-surface/40 px-4 py-2.5">
                <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                <span className="text-sm text-ink">Public Ontario routing</span>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                  {data.dormantOntarioCoverage.publicRoutingEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-surface/40 px-4 py-2.5">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success-green" />
                <span className="text-sm text-ink">Explicit Ontario → BCBC fallback</span>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-success-green">
                  {data.dormantOntarioCoverage.resolverFallbackToBcbcBlocked ? 'Blocked' : 'Allowed'}
                </span>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-white/8 bg-surface/40 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-black text-ink">Ontario Template Governance &amp; Source Review</div>
                <span className="rounded-full border border-flame/25 bg-flame/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-flame">
                  {data.dormantOntarioTemplateGovernance.statusLabel}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">{data.dormantOntarioTemplateGovernance.note}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Production approval</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioTemplateGovernance.productionApprovalStatus.replaceAll('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Inspector claiming</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioTemplateGovernance.inspectorClaimingEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Source review</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioTemplateGovernance.sourceReviewStatus.replaceAll('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Professional/AHJ review</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioTemplateGovernance.professionalReviewStatus.replaceAll('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Municipal overlay review</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioTemplateGovernance.municipalOverlayReviewStatus.replaceAll('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Active template resolution</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioTemplateGovernance.activeTemplateResolutionEnabled ? 'Enabled' : 'Not participating'}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-subtle">Activation Blockers</div>
                <ul className="mt-2 grid gap-1.5 md:grid-cols-2">
                  {data.dormantOntarioTemplateGovernance.activationBlockers.map(blocker => (
                    <li key={blocker} className="flex items-start gap-2 rounded-lg border border-white/8 bg-black/10 px-3 py-2 text-[11px] text-muted">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-flame" />
                      <span>{blocker}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-subtle">Draft Source Categories</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.dormantOntarioTemplateGovernance.sourceCategories.map(category => (
                    <span
                      key={category.id}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-ink/80"
                      title={category.note}
                    >
                      {category.label} · Requires review
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-white/8 bg-surface/40 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-black text-ink">{data.dormantOntarioMunicipalOverlayFoundation.scopeLabel}</div>
                <span className="rounded-full border border-flame/25 bg-flame/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-flame">
                  {data.dormantOntarioMunicipalOverlayFoundation.statusLabel}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">{data.dormantOntarioMunicipalOverlayFoundation.note}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Public Ontario routing</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioMunicipalOverlayFoundation.publicRoutingEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Ontario dispatch</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioMunicipalOverlayFoundation.dispatchEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Inspector claiming</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioMunicipalOverlayFoundation.inspectorClaimingEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Active DB template resolution</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioMunicipalOverlayFoundation.activeTemplateResolutionEnabled ? 'Enabled' : 'Not participating'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Municipal source review</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioMunicipalOverlayFoundation.municipalSourceReviewStatus.replaceAll('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Professional/AHJ review</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioMunicipalOverlayFoundation.professionalReviewStatus.replaceAll('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Production approval</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioMunicipalOverlayFoundation.productionApprovalStatus.replaceAll('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Ontario checklist responses expected</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioMunicipalOverlayFoundation.checklistResponsesExpected ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {data.dormantOntarioMunicipalOverlayFoundation.overlays.map(overlay => (
                  <div key={overlay.plannedSlug} className="rounded-lg border border-white/8 bg-black/10 px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-xs font-black text-ink">{overlay.municipalityName}</div>
                      <span className="rounded-full border border-flame/20 bg-flame/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-flame">
                        Planned / Dormant
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-muted">{overlay.plannedSlug}</div>
                    <div className="mt-3 grid gap-1.5">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-muted">Public / dispatch / claiming</span>
                        <span className="font-bold uppercase tracking-wide text-flame">Disabled</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-muted">Template resolution</span>
                        <span className="font-bold uppercase tracking-wide text-flame">Not participating</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-muted">Production approval</span>
                        <span className="font-bold uppercase tracking-wide text-flame">
                          {overlay.productionApprovalStatus.replaceAll('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle">Review blockers</div>
                      <ul className="mt-1.5 space-y-1">
                        {overlay.activationBlockers.slice(0, 4).map(blocker => (
                          <li key={blocker} className="flex items-start gap-1.5 text-[10px] text-muted">
                            <AlertTriangle className="mt-0.5 h-2.5 w-2.5 shrink-0 text-flame" />
                            <span>{blocker}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {overlay.plannedSourceCategories.map(category => (
                        <span
                          key={`${overlay.plannedSlug}-${category.id}`}
                          className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold text-ink/75"
                          title={category.note}
                        >
                          {category.label} · Requires review
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-white/8 bg-surface/40 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-black text-ink">Ontario Admin Resolver Dry-Run</div>
                <span className="rounded-full border border-flame/25 bg-flame/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-flame">
                  {data.dormantOntarioAdminResolverDryRun.statusLabel}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">{data.dormantOntarioAdminResolverDryRun.note}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Active DB template resolution</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioAdminResolverDryRun.activeDbTemplateResolutionEnabled ? 'Enabled' : 'No'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Public routing</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioAdminResolverDryRun.publicRoutingEnabled ? 'Enabled' : 'No'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Dispatch</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioAdminResolverDryRun.dispatchEnabled ? 'Enabled' : 'No'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Inspector claiming</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioAdminResolverDryRun.inspectorClaimingEnabled ? 'Enabled' : 'No'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Source review</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioAdminResolverDryRun.sourceReviewRequired ? 'Required' : 'Not required'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Professional/AHJ review</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioAdminResolverDryRun.professionalAhjReviewRequired ? 'Required' : 'Not required'}
                  </span>
                </div>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {data.dormantOntarioAdminResolverDryRun.cases.map(dryRunCase => (
                  <div key={dryRunCase.id} className="rounded-lg border border-white/8 bg-black/10 px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-xs font-black text-ink">{dryRunCase.label}</div>
                      <span className="rounded-full border border-flame/20 bg-flame/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-flame">
                        Internal planning only
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1.5 text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted">Sample input</span>
                        <span className="font-bold text-ink">
                          {[dryRunCase.sampleInput.city, dryRunCase.sampleInput.province, dryRunCase.sampleInput.context]
                            .filter(Boolean)
                            .join(' / ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted">Planned dormant slug</span>
                        <span className="font-bold text-ink">{dryRunCase.plannedDormantJurisdictionSlug}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted">Active DB resolution</span>
                        <span className="font-bold uppercase tracking-wide text-flame">
                          {dryRunCase.activeDbTemplateResolutionEnabled ? 'Enabled' : 'No'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted">BCBC fallback</span>
                        <span className="font-bold uppercase tracking-wide text-success-green">
                          {dryRunCase.fallbackToBcbcBlocked ? 'Blocked' : 'Allowed'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted">Responses expected</span>
                        <span className="font-bold uppercase tracking-wide text-flame">
                          {dryRunCase.checklistResponsesExpected ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-muted">{dryRunCase.note}</p>
                    <div className="mt-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle">Activation blockers</div>
                      <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
                        {dryRunCase.activationBlockers.map(blocker => (
                          <li key={`${dryRunCase.id}-${blocker}`} className="flex items-start gap-1.5 text-[10px] text-muted">
                            <AlertTriangle className="mt-0.5 h-2.5 w-2.5 shrink-0 text-flame" />
                            <span>{blocker}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-white/8 bg-surface/40 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-black text-ink">{data.dormantOntarioProjectTaxonomyFoundation.scopeLabel}</div>
                <span className="rounded-full border border-flame/25 bg-flame/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-flame">
                  {data.dormantOntarioProjectTaxonomyFoundation.statusLabel}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">{data.dormantOntarioProjectTaxonomyFoundation.note}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Ontario project intake</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioProjectTaxonomyFoundation.projectIntakeEnabled ? 'Enabled' : 'No'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Database migration created</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioProjectTaxonomyFoundation.databaseMigrationCreated ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Public Ontario routing</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioProjectTaxonomyFoundation.publicRoutingEnabled ? 'Enabled' : 'No'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Dispatch / inspector claiming</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioProjectTaxonomyFoundation.dispatchEnabled || data.dormantOntarioProjectTaxonomyFoundation.inspectorClaimingEnabled ? 'Enabled' : 'No'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Active DB template resolution</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioProjectTaxonomyFoundation.activeTemplateResolutionEnabled ? 'Enabled' : 'No'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Review / production status</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioProjectTaxonomyFoundation.productionApprovalStatus.replaceAll('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-subtle">Activation Blockers</div>
                <ul className="mt-2 grid gap-1.5 md:grid-cols-2">
                  {data.dormantOntarioProjectTaxonomyFoundation.activationBlockers.map(blocker => (
                    <li key={blocker} className="flex items-start gap-2 rounded-lg border border-white/8 bg-black/10 px-3 py-2 text-[11px] text-muted">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-flame" />
                      <span>{blocker}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {ontarioTaxonomyFieldGroups.map(group => (
                  <div key={group.group} className="rounded-lg border border-white/8 bg-black/10 px-3 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle">{group.group}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {group.fields.map(field => (
                        <span
                          key={field.id}
                          className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-ink/75"
                          title={field.note}
                        >
                          {field.label} · Draft · Requires review
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-white/8 bg-surface/40 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-black text-ink">Ontario Intake &amp; Routing Readiness Simulator</div>
                <span className="rounded-full border border-flame/25 bg-flame/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-flame">
                  {data.dormantOntarioIntakeRoutingReadinessSimulator.statusLabel}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">{data.dormantOntarioIntakeRoutingReadinessSimulator.note}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Ontario intake</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioIntakeRoutingReadinessSimulator.intakeEnabled ? 'Enabled' : 'No'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Ontario routing</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioIntakeRoutingReadinessSimulator.publicRoutingEnabled ? 'Enabled' : 'No'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Dispatch / inspector claiming</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioIntakeRoutingReadinessSimulator.dispatchEnabled || data.dormantOntarioIntakeRoutingReadinessSimulator.inspectorClaimingEnabled ? 'Enabled' : 'No'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Active DB template resolution</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioIntakeRoutingReadinessSimulator.activeDbTemplateResolutionEnabled ? 'Enabled' : 'No'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Ontario checklist responses expected</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioIntakeRoutingReadinessSimulator.checklistResponsesExpected ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Review / approval</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioIntakeRoutingReadinessSimulator.productionApprovalGranted ? 'Granted' : 'Required'}
                  </span>
                </div>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {data.dormantOntarioIntakeRoutingReadinessSimulator.scenarios.map(scenario => (
                  <div key={scenario.id} className="rounded-lg border border-white/8 bg-black/10 px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-xs font-black text-ink">{scenario.scenarioName}</div>
                      <span className="rounded-full border border-flame/20 bg-flame/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-flame">
                        Draft internal only
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1.5 text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted">Municipality</span>
                        <span className="font-bold text-ink">{scenario.municipality}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted">Planned slug</span>
                        <span className="font-bold text-ink">{scenario.plannedJurisdictionSlug}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted">Overlay slug</span>
                        <span className="font-bold text-ink">{scenario.plannedMunicipalOverlaySlug ?? 'Province-level only'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted">Archetype</span>
                        <span className="font-bold text-ink">{scenario.projectArchetype}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted">Work type</span>
                        <span className="font-bold text-ink">{scenario.workType}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {[
                        ['Schedule 1', scenario.schedule1DesignerInformationPlanning],
                        ['BCIN/designer', scenario.bcinDesignerInformationPlanning],
                        ['Applicable law/zoning', scenario.applicableLawZoningMunicipalPrecheckPlanning],
                        ['Energy/SB-12', scenario.energySb12Planning],
                        ['Plumbing', scenario.plumbingScopePlanning],
                        ['HVAC/mechanical', scenario.hvacMechanicalScopePlanning],
                        ['Electrical boundary', scenario.electricalAuthorityBoundaryPlanning],
                      ].map(([label, active]) => (
                        <span
                          key={`${scenario.id}-${label}`}
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                            active
                              ? 'border-flame/20 bg-flame/10 text-flame'
                              : 'border-white/10 bg-white/5 text-subtle'
                          }`}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle">Dormant Template Categories</div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {scenario.expectedDormantTemplateCategories.map(category => (
                          <span key={`${scenario.id}-${category}`} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-ink/75">
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle">Stage Planning Coverage</div>
                      <div className="mt-1.5 grid gap-1.5">
                        {scenario.stagePlanningCoverage.map(stage => (
                          <div key={`${scenario.id}-${stage.stageId}`} className="rounded-md border border-white/8 bg-white/5 px-2 py-1.5">
                            <div className="text-[10px] font-black text-ink">
                              {stage.stageId} · {stage.stageTitle}
                            </div>
                            <div className="mt-0.5 text-[10px] text-muted">{stage.draftOntarioCoverage}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle">Activation blockers</div>
                      <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
                        {scenario.activationBlockers.map(blocker => (
                          <li key={`${scenario.id}-${blocker}`} className="flex items-start gap-1.5 text-[10px] text-muted">
                            <AlertTriangle className="mt-0.5 h-2.5 w-2.5 shrink-0 text-flame" />
                            <span>{blocker}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-white/8 bg-surface/40 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-black text-ink">Ontario Draft Checklist Item Catalog</div>
                <span className="rounded-full border border-flame/25 bg-flame/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-flame">
                  {data.dormantOntarioDraftChecklistItemCatalog.statusLabel}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">{data.dormantOntarioDraftChecklistItemCatalog.note}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ['Active templates', data.dormantOntarioDraftChecklistItemCatalog.activeTemplatesCreated ? 'Created' : 'Not created'],
                  ['DB rows / migrations', data.dormantOntarioDraftChecklistItemCatalog.databaseRowsCreated || data.dormantOntarioDraftChecklistItemCatalog.databaseMigrationCreated ? 'Created' : 'None'],
                  ['Active DB template resolution', data.dormantOntarioDraftChecklistItemCatalog.activeTemplateResolutionEnabled ? 'Enabled' : 'Disabled'],
                  ['Public Ontario routing', data.dormantOntarioDraftChecklistItemCatalog.publicRoutingEnabled ? 'Enabled' : 'Disabled'],
                  ['Dispatch', data.dormantOntarioDraftChecklistItemCatalog.dispatchEnabled ? 'Enabled' : 'Disabled'],
                  ['Inspector claiming', data.dormantOntarioDraftChecklistItemCatalog.inspectorClaimingEnabled ? 'Enabled' : 'Disabled'],
                  ['Checklist responses expected', data.dormantOntarioDraftChecklistItemCatalog.checklistResponsesExpected ? 'Yes' : 'No'],
                  ['Source review', data.dormantOntarioDraftChecklistItemCatalog.sourceReviewStatus.replaceAll('_', ' ')],
                  ['Municipal review', data.dormantOntarioDraftChecklistItemCatalog.municipalReviewStatus.replaceAll('_', ' ')],
                  ['Professional/AHJ review', data.dormantOntarioDraftChecklistItemCatalog.professionalReviewStatus.replaceAll('_', ' ')],
                  ['Production approval', data.dormantOntarioDraftChecklistItemCatalog.productionApprovalStatus.replaceAll('_', ' ')],
                  ['Standalone workflow', data.dormantOntarioDraftChecklistItemCatalog.standaloneWorkflowCreated ? 'Created' : 'No'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                    <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                    <span className="text-xs text-ink">{label}</span>
                    <span className="ml-auto text-right text-[10px] font-bold uppercase tracking-wide text-flame">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-lg border border-white/8 bg-black/10 px-3 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-subtle">
                    Draft/Internal Item Groups
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {data.dormantOntarioDraftChecklistItemCatalog.items.map(item => (
                      <div key={item.itemId} className="rounded-lg border border-white/8 bg-white/5 px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-xs font-bold text-ink">{item.title}</div>
                          <span className="rounded-full border border-flame/20 bg-flame/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-flame">
                            Draft only
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-muted">{item.draftDescription}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.stageCodes.map(stageCode => (
                            <span
                              key={`${item.itemId}-${stageCode}`}
                              className="rounded-full border border-white/10 bg-black/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-subtle"
                            >
                              {stageCode}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 text-[10px] text-subtle">
                          {item.templateCategory} · {item.appliesToMunicipalities.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-white/8 bg-black/10 px-3 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-subtle">
                    Activation Blockers
                  </div>
                  <ul className="mt-2 grid gap-1.5">
                    {data.dormantOntarioDraftChecklistItemCatalog.activationBlockers.map(blocker => (
                      <li key={blocker} className="flex items-start gap-1.5 text-[10px] text-muted">
                        <AlertTriangle className="mt-0.5 h-2.5 w-2.5 shrink-0 text-flame" />
                        <span>{blocker}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 rounded-lg border border-white/8 bg-white/5 px-3 py-2 text-[10px] text-muted">
                    Reuses existing Ontario foundation, stage matrix, taxonomy, municipal overlays, governance, and simulator metadata. No second workflow is created.
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-white/8 bg-surface/40 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-black text-ink">Ontario Evidence &amp; Document Requirements Foundation</div>
                <span className="rounded-full border border-flame/25 bg-flame/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-flame">
                  {data.dormantOntarioEvidenceDocumentRequirementsFoundation.statusLabel}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">{data.dormantOntarioEvidenceDocumentRequirementsFoundation.note}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ['Evidence enforcement', data.dormantOntarioEvidenceDocumentRequirementsFoundation.activeEvidenceEnforcementEnabled ? 'Enabled' : 'Not enforced'],
                  ['Production requirements', data.dormantOntarioEvidenceDocumentRequirementsFoundation.activeRequirementsCreated ? 'Active' : 'Not active'],
                  ['DB rows / migrations', data.dormantOntarioEvidenceDocumentRequirementsFoundation.databaseRowsCreated || data.dormantOntarioEvidenceDocumentRequirementsFoundation.databaseMigrationCreated ? 'Created' : 'None'],
                  ['Active DB template resolution', data.dormantOntarioEvidenceDocumentRequirementsFoundation.activeTemplateResolutionEnabled ? 'Enabled' : 'Disabled'],
                  ['Public Ontario routing', data.dormantOntarioEvidenceDocumentRequirementsFoundation.publicRoutingEnabled ? 'Enabled' : 'Disabled'],
                  ['Dispatch', data.dormantOntarioEvidenceDocumentRequirementsFoundation.dispatchEnabled ? 'Enabled' : 'Disabled'],
                  ['Inspector claiming', data.dormantOntarioEvidenceDocumentRequirementsFoundation.inspectorClaimingEnabled ? 'Enabled' : 'Disabled'],
                  ['Checklist responses expected', data.dormantOntarioEvidenceDocumentRequirementsFoundation.checklistResponsesExpected ? 'Yes' : 'No'],
                  ['Source review', data.dormantOntarioEvidenceDocumentRequirementsFoundation.sourceReviewStatus.replaceAll('_', ' ')],
                  ['Municipal review', data.dormantOntarioEvidenceDocumentRequirementsFoundation.municipalReviewStatus.replaceAll('_', ' ')],
                  ['Professional/AHJ review', data.dormantOntarioEvidenceDocumentRequirementsFoundation.professionalReviewStatus.replaceAll('_', ' ')],
                  ['Production approval', data.dormantOntarioEvidenceDocumentRequirementsFoundation.productionApprovalStatus.replaceAll('_', ' ')],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                    <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                    <span className="text-xs text-ink">{label}</span>
                    <span className="ml-auto text-right text-[10px] font-bold uppercase tracking-wide text-flame">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-lg border border-white/8 bg-black/10 px-3 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-subtle">
                    Draft/Internal Evidence &amp; Document Groups
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {data.dormantOntarioEvidenceDocumentRequirementsFoundation.requirements.map(requirement => (
                      <div key={requirement.requirementId} className="rounded-lg border border-white/8 bg-white/5 px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-xs font-bold text-ink">{requirement.title}</div>
                          <span className="rounded-full border border-flame/20 bg-flame/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-flame">
                            Not enforced
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-muted">{requirement.draftDescription}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {requirement.relatedStageCodes.map(stageCode => (
                            <span
                              key={`${requirement.requirementId}-${stageCode}`}
                              className="rounded-full border border-white/10 bg-black/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-subtle"
                            >
                              {stageCode}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 text-[10px] text-subtle">
                          {requirement.requirementType.replaceAll('_', ' ')} · {requirement.appliesToMunicipalities.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-white/8 bg-black/10 px-3 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-subtle">
                    Activation Blockers
                  </div>
                  <ul className="mt-2 grid gap-1.5">
                    {data.dormantOntarioEvidenceDocumentRequirementsFoundation.activationBlockers.map(blocker => (
                      <li key={blocker} className="flex items-start gap-1.5 text-[10px] text-muted">
                        <AlertTriangle className="mt-0.5 h-2.5 w-2.5 shrink-0 text-flame" />
                        <span>{blocker}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 rounded-lg border border-white/8 bg-white/5 px-3 py-2 text-[10px] text-muted">
                    Reuses the Ontario checklist catalog, foundation, stage matrix, taxonomy, municipal overlays,
                    governance, and simulator metadata. No evidence enforcement workflow is created.
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-white/8 bg-surface/40 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-black text-ink">Ontario Authority Package Wording Spec</div>
                <span className="rounded-full border border-flame/25 bg-flame/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-flame">
                  {data.dormantOntarioAuthorityPackageWordingSpec.statusLabel}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">{data.dormantOntarioAuthorityPackageWordingSpec.note}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ['Spec document', data.dormantOntarioAuthorityPackageWordingSpec.sourceDocumentPath],
                  ['Recommended package name', data.dormantOntarioAuthorityPackageWordingSpec.recommendedPackageName],
                  ['Authority package generation', data.dormantOntarioAuthorityPackageWordingSpec.authorityPackageGenerationEnabled ? 'Enabled' : 'Disabled'],
                  ['Schedule C-B reused for Ontario', data.dormantOntarioAuthorityPackageWordingSpec.scheduleCbReusedForOntario ? 'Yes' : 'No'],
                  ['Schedule C-B generation changed', data.dormantOntarioAuthorityPackageWordingSpec.scheduleCbGenerationChanged ? 'Yes' : 'No'],
                  ['Vault/seal/completion changed', data.dormantOntarioAuthorityPackageWordingSpec.vaultSealCompletionChanged || data.dormantOntarioAuthorityPackageWordingSpec.vaultSealCompletionSecurityChanged ? 'Yes' : 'No'],
                  ['Public Ontario routing', data.dormantOntarioAuthorityPackageWordingSpec.publicRoutingEnabled ? 'Enabled' : 'Disabled'],
                  ['Dispatch / inspector claiming', data.dormantOntarioAuthorityPackageWordingSpec.dispatchEnabled || data.dormantOntarioAuthorityPackageWordingSpec.inspectorClaimingEnabled ? 'Enabled' : 'Disabled'],
                  ['Production approval', data.dormantOntarioAuthorityPackageWordingSpec.productionApprovalStatus.replaceAll('_', ' ')],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                    <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                    <span className="text-xs text-ink">{label}</span>
                    <span className="ml-auto text-right text-[10px] font-bold uppercase tracking-wide text-flame">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-white/8 bg-black/10 px-3 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-subtle">
                    Required Separations
                  </div>
                  <ul className="mt-2 grid gap-1.5">
                    {data.dormantOntarioAuthorityPackageWordingSpec.requiredSeparations.map(item => (
                      <li key={item} className="flex items-start gap-1.5 text-[10px] text-muted">
                        <AlertTriangle className="mt-0.5 h-2.5 w-2.5 shrink-0 text-flame" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-white/8 bg-black/10 px-3 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-subtle">
                    Activation Blockers
                  </div>
                  <ul className="mt-2 grid gap-1.5">
                    {data.dormantOntarioAuthorityPackageWordingSpec.activationBlockers.map(blocker => (
                      <li key={blocker} className="flex items-start gap-1.5 text-[10px] text-muted">
                        <AlertTriangle className="mt-0.5 h-2.5 w-2.5 shrink-0 text-flame" />
                        <span>{blocker}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-white/8 bg-surface/40 px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-subtle">Planned Dormant Slugs</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {data.dormantOntarioCoverage.plannedSlugs.map(slug => (
                  <span
                    key={slug}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-ink/80"
                  >
                    {slug}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-white/8 bg-surface/40 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-black text-ink">{data.dormantOntarioTemplateFoundation.scopeLabel}</div>
                <span className="rounded-full border border-flame/25 bg-flame/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-flame">
                  {data.dormantOntarioTemplateFoundation.statusLabel}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">{data.dormantOntarioTemplateFoundation.note}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Foundation participates in DB resolution</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioTemplateFoundation.participatesInActiveDbResolution ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Ontario checklist responses expected</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioTemplateFoundation.checklistResponsesExpected ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-subtle">
                  Draft/Internal Template Categories
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {data.dormantOntarioTemplateFoundation.categories.map(category => (
                    <div key={category.id} className="rounded-lg border border-white/8 bg-black/10 px-3 py-2.5">
                      <div className="text-xs font-bold text-ink">{category.title}</div>
                      <div className="mt-1 text-[11px] text-muted">{category.note}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-full border border-flame/20 bg-flame/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-flame">
                          Not live
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-subtle">
                          Requires review
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-subtle">
                  Municipal Overlay Placeholders
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.dormantOntarioTemplateFoundation.municipalOverlays.map(overlay => (
                    <span
                      key={overlay.slug}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-ink/80"
                    >
                      {overlay.municipality}: {overlay.slug} · Future review required
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-white/8 bg-surface/40 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-black text-ink">{data.dormantOntarioStageMatrix.scopeLabel}</div>
                <span className="rounded-full border border-flame/25 bg-flame/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-flame">
                  {data.dormantOntarioStageMatrix.statusLabel}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">{data.dormantOntarioStageMatrix.note}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success-green" />
                  <span className="text-xs text-ink">Uses Vero S01-S15 stage architecture</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-success-green">
                    {data.dormantOntarioStageMatrix.usesExistingVeroStageArchitecture ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Stage matrix participates in DB resolution</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioStageMatrix.participatesInActiveDbResolution ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Ontario stage templates active</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioStageMatrix.templatesActive ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-flame" />
                  <span className="text-xs text-ink">Ontario stage responses expected</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-flame">
                    {data.dormantOntarioStageMatrix.checklistResponsesExpected ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-subtle">
                  Draft/Internal Stage Matrix
                </div>
                <div className="mt-2 grid gap-2">
                  {data.dormantOntarioStageMatrix.stages.map(stage => (
                    <div key={stage.stageId} className="rounded-lg border border-white/8 bg-black/10 px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-wide text-subtle">{stage.stageId}</span>
                        <span className="text-xs font-bold text-ink">{stage.stageTitle}</span>
                        <span className="rounded-full border border-flame/20 bg-flame/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-flame">
                          Planned, not live
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-subtle">
                          Requires review
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-muted">{stage.draftOntarioCoverage}</div>
                      <div className="mt-1 text-[10px] text-subtle">{stage.note}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-subtle">
                  Future Municipal Overlay Review
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.dormantOntarioStageMatrix.municipalOverlaySlugs.map(slug => (
                    <span
                      key={slug}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-ink/80"
                    >
                      {slug} · Future review required
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Larger-project gaps */}
          <section className="rounded-xl border border-white/8 bg-white/5 p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-flame" />
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink">Larger-Project Gaps</h2>
            </div>
            <p className="mt-2 text-xs text-muted">
              Project dimensions the current resolver does not consider. These are informational signals about coverage
              breadth — not a compliance assessment. The city or proper authority still has the final say.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {data.largerProjectGaps.map(g => (
                <div key={g.dimension} className="flex items-center gap-2.5 rounded-lg border border-white/8 bg-surface/40 px-4 py-2.5">
                  <MinusCircle className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="text-sm text-ink">{g.dimension}</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-subtle">Not used by resolver</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-white/8 bg-surface/40 px-4 py-3">
              <MinusCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
              <div>
                <div className="text-sm font-bold text-ink">Template review / publish governance</div>
                <div className="text-xs text-muted">{data.templateGovernance.note}</div>
              </div>
            </div>
          </section>

          {/* Coverage matrix */}
          <section>
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-subtle">
              Coverage by Jurisdiction &amp; Stage
            </div>
            <div className="space-y-6">
              {cellsByJurisdiction.map(group => (
                <div key={group.name} className="rounded-xl border border-white/8 bg-white/5 p-5">
                  <h3 className="text-sm font-black text-ink">{group.name}</h3>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[640px] border-collapse text-left">
                      <thead>
                        <tr className="text-[10px] font-bold uppercase tracking-wider text-subtle">
                          <th className="py-2 pr-4">Stage</th>
                          <th className="py-2 pr-4">Status</th>
                          <th className="py-2 pr-4">Active ver.</th>
                          <th className="py-2 pr-4">Versions</th>
                          <th className="py-2 pr-4">Active items</th>
                          <th className="py-2 pr-4">Required</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.cells.map(cell => (
                          <tr key={cell.stageId} className="border-t border-white/8 text-sm">
                            <td className="py-2.5 pr-4">
                              <span className="text-subtle">S{String(cell.stageNumber).padStart(2, '0')}</span>{' '}
                              <span className="text-ink/85">{cell.stageTitle}</span>
                            </td>
                            <td className="py-2.5 pr-4"><StatusBadge status={cell.status} /></td>
                            <td className="py-2.5 pr-4 text-ink/70">{cell.activeVersion ?? '—'}</td>
                            <td className="py-2.5 pr-4 text-ink/70">{cell.versionCount}</td>
                            <td className="py-2.5 pr-4 text-ink/70">{cell.status === 'active' ? cell.activeItemCount : '—'}</td>
                            <td className="py-2.5 pr-4 text-ink/70">{cell.status === 'active' ? cell.requiredItemCount : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Data integrity */}
          {(data.orphanTemplates.length > 0 || data.orphanItemCount > 0) && (
            <section className="rounded-xl border border-flame/20 bg-flame/5 p-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-flame" />
                <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink">Data Integrity</h2>
              </div>
              <p className="mt-2 text-xs text-muted">
                Records that reference a missing parent. Surfaced for visibility only — nothing is changed.
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-ink/85">
                {data.orphanItemCount > 0 && (
                  <li>{data.orphanItemCount} checklist item(s) reference a template that no longer exists.</li>
                )}
                {data.orphanTemplates.map(t => (
                  <li key={t.id}>
                    “{t.title}” references a missing{' '}
                    {[t.missingStage ? 'stage' : null, t.missingJurisdiction ? 'jurisdiction' : null]
                      .filter(Boolean)
                      .join(' and ')}
                    .
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="pt-2 text-[11px] leading-relaxed text-subtle">
            Internal admin diagnostic only. Vero Permit helps inspection information move from scattered to organized; it
            does not approve permits, certify compliance, or replace the city, building official, or qualified
            professional. The proper authority retains final say.
          </p>
        </div>
      )}
    </AdminShell>
  )
}
