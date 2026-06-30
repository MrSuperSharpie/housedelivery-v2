import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/adminApiGuard'

/**
 * Read-only admin diagnostic: reports current checklist/template coverage and
 * larger-project readiness gaps. This route performs NO writes and does NOT
 * change template resolution or live checklist selection — it only aggregates
 * what already exists in the template tables so admins can see where coverage
 * is thin and which project dimensions the current resolver does not yet use.
 */
export async function GET() {
  const auth = await requireAdminApi()
  if (!auth.authorized) return auth.response

  const supabase = await createClient()

  const [
    { data: rawJurisdictions },
    { data: rawStages },
    { data: rawTemplates },
    { data: rawItems },
    { count: responseCount },
  ] = await Promise.all([
    supabase
      .from('jurisdictions')
      .select('id, slug, name, code_version, effective_date, is_active')
      .order('name'),
    supabase
      .from('inspection_stages')
      .select('id, stage_number, slug, title, discipline, phase_number, is_active')
      .order('stage_number'),
    supabase
      .from('stage_checklist_templates')
      .select('id, stage_id, jurisdiction_id, title, version, is_active, effective_from, effective_to'),
    supabase
      .from('stage_checklist_items')
      .select('id, template_id, is_active, is_required'),
    supabase
      .from('permit_checklist_responses')
      .select('id', { count: 'exact', head: true }),
  ])

  // ── Normalize ───────────────────────────────────────────────────────────────
  const allJurisdictions = (rawJurisdictions ?? []).map((j: Record<string, unknown>) => ({
    id: j.id as string,
    slug: j.slug as string,
    name: j.name as string,
    codeVersion: (j.code_version as string | null) ?? null,
    effectiveDate: (j.effective_date as string | null) ?? null,
    isActive: (j.is_active as boolean | null) ?? true,
  }))
  const allStages = (rawStages ?? []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    stageNumber: s.stage_number as number,
    slug: s.slug as string,
    title: s.title as string,
    discipline: (s.discipline as string | null) ?? null,
    phaseNumber: (s.phase_number as number | null) ?? null,
    isActive: (s.is_active as boolean | null) ?? true,
  }))
  const templates = (rawTemplates ?? []).map((t: Record<string, unknown>) => ({
    id: t.id as string,
    stageId: t.stage_id as string,
    jurisdictionId: t.jurisdiction_id as string,
    title: t.title as string,
    version: t.version as number,
    isActive: (t.is_active as boolean | null) ?? true,
    effectiveFrom: (t.effective_from as string | null) ?? null,
    effectiveTo: (t.effective_to as string | null) ?? null,
  }))
  const items = (rawItems ?? []).map((i: Record<string, unknown>) => ({
    id: i.id as string,
    templateId: i.template_id as string,
    isActive: (i.is_active as boolean | null) ?? true,
    isRequired: (i.is_required as boolean | null) ?? true,
  }))

  // ── Item rollups per template ───────────────────────────────────────────────
  const itemRollup = new Map<string, { total: number; active: number; required: number }>()
  for (const it of items) {
    const r = itemRollup.get(it.templateId) ?? { total: 0, active: 0, required: 0 }
    r.total += 1
    if (it.isActive) r.active += 1
    if (it.isActive && it.isRequired) r.required += 1
    itemRollup.set(it.templateId, r)
  }

  const stageIdSet = new Set(allStages.map(s => s.id))
  const jurisdictionIdSet = new Set(allJurisdictions.map(j => j.id))
  const templateIdSet = new Set(templates.map(t => t.id))

  // ── Coverage matrix over the operational (active) jurisdiction × stage grid ──
  const activeJurisdictions = allJurisdictions.filter(j => j.isActive)
  const activeStages = allStages.filter(s => s.isActive)

  const byCell = new Map<string, typeof templates>()
  for (const t of templates) {
    const key = `${t.stageId}|${t.jurisdictionId}`
    const list = byCell.get(key) ?? []
    list.push(t)
    byCell.set(key, list)
  }

  type CoverageCell = {
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

  const coverage: CoverageCell[] = []
  let missingCount = 0
  let inactiveOnlyCount = 0
  let activeCellCount = 0

  for (const j of activeJurisdictions) {
    for (const s of activeStages) {
      const list = byCell.get(`${s.id}|${j.id}`) ?? []
      const activeTemplates = list.filter(t => t.isActive)
      // Latest active version drives resolution; mirror resolver ordering only.
      const latestActive = activeTemplates.slice().sort((a, b) => b.version - a.version)[0] ?? null

      let status: CoverageCell['status']
      if (latestActive) {
        status = 'active'
        activeCellCount += 1
      } else if (list.length > 0) {
        status = 'inactive-only'
        inactiveOnlyCount += 1
      } else {
        status = 'missing'
        missingCount += 1
      }

      const roll = latestActive ? itemRollup.get(latestActive.id) : undefined
      coverage.push({
        jurisdictionId: j.id,
        jurisdictionName: j.name,
        stageId: s.id,
        stageNumber: s.stageNumber,
        stageTitle: s.title,
        status,
        activeVersion: latestActive?.version ?? null,
        versionCount: list.length,
        activeItemCount: roll?.active ?? 0,
        requiredItemCount: roll?.required ?? 0,
      })
    }
  }

  // ── Orphans (safely discoverable) ───────────────────────────────────────────
  const orphanTemplates = templates
    .filter(t => !stageIdSet.has(t.stageId) || !jurisdictionIdSet.has(t.jurisdictionId))
    .map(t => ({
      id: t.id,
      title: t.title,
      missingStage: !stageIdSet.has(t.stageId),
      missingJurisdiction: !jurisdictionIdSet.has(t.jurisdictionId),
    }))
  const orphanItemCount = items.filter(i => !templateIdSet.has(i.templateId)).length

  // ── Current resolver basis (descriptive; reflects resolveActiveTemplate) ─────
  const resolverBasis = [
    { dimension: 'Inspection stage', used: true, note: 'Stage number resolves the stage row.' },
    {
      dimension: 'Jurisdiction',
      used: true,
      note: 'City maps to a jurisdiction (Vancouver → VBBL 2025, otherwise BCBC 2024).',
    },
  ]

  // ── Larger-project readiness gaps (reflects schema reality — no such inputs) ─
  const largerProjectGaps = [
    { dimension: 'Building type', supported: false },
    { dimension: 'Occupancy classification', supported: false },
    { dimension: 'Project complexity', supported: false },
    { dimension: 'Part 3 / Part 9 path', supported: false },
    { dimension: 'Floor / unit / area / location', supported: false },
    { dimension: 'Mixed-use classification', supported: false },
    { dimension: 'Catalogue / model designation', supported: false },
  ]

  // Templates expose only is_active + version; there is no draft/review/publish
  // workflow field, so review/publish governance is reported as absent.
  const templateGovernance = {
    hasReviewPublishWorkflow: false,
    note: 'Templates carry only an active flag and a version number — no draft, review, or publish governance field exists.',
  }

  const totals = {
    jurisdictions: allJurisdictions.length,
    activeJurisdictions: activeJurisdictions.length,
    stages: allStages.length,
    activeStages: activeStages.length,
    templates: templates.length,
    activeTemplates: templates.filter(t => t.isActive).length,
    inactiveTemplates: templates.filter(t => !t.isActive).length,
    items: items.length,
    activeItems: items.filter(i => i.isActive).length,
    responses: responseCount ?? 0,
    coverageCells: coverage.length,
    activeCells: activeCellCount,
    inactiveOnlyCells: inactiveOnlyCount,
    missingCells: missingCount,
  }

  return NextResponse.json({
    ok: true,
    totals,
    jurisdictions: activeJurisdictions,
    stages: activeStages,
    coverage,
    orphanTemplates,
    orphanItemCount,
    resolverBasis,
    largerProjectGaps,
    templateGovernance,
  })
}
