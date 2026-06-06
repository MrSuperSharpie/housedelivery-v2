import { buildCompletionChecklist } from '@/lib/inspectorCompletion'
import { createClient } from '@/lib/supabase/server'
import type {
  CompletionChecklistItemDefinition,
  CompletionChecklistStageDefinition,
  CompletionResponsibleParty,
} from '@/lib/inspectorCompletion'

export type MappingJurisdictionSlug = 'bcbc_2024' | 'vbbl_2025'
export type MatchConfidence = 'high' | 'medium' | 'low' | 'none'
export type MappingRiskLevel = 'low' | 'medium' | 'high' | 'do_not_touch'
export type MappingRecommendation =
  | 'keep_ts_only'
  | 'enrich_ts_from_db_metadata'
  | 'feature_flag_pilot_candidate'
  | 'defer'

export interface MappingAuditDbStage {
  id: string
  stageNumber: number
  slug: string
  title: string
  templateTitle: string | null
  templateVersion: number | null
  items: MappingAuditDbItem[]
}

export interface MappingAuditDbItem {
  id: string
  stageSlug: string
  stageNumber: number
  label: string
  requirementText: string
  sortOrder: number
  isRequired: boolean
  legalReference: string | null
  sourceTitle: string | null
  sourceUrl: string | null
  isVbblOnly: boolean
}

export interface MappingAuditTsItem {
  code: string
  label: string
  responsibleParty: CompletionResponsibleParty
  evidenceMode: CompletionChecklistItemDefinition['evidence_mode']
  documentUploadRequired: boolean
  requiredEvidence: string[]
  statusLogic: string
  dependencies: string[]
}

export interface MappingAuditItemMatch {
  tsItem: MappingAuditTsItem
  dbItem: MappingAuditDbItem
  confidence: MatchConfidence
  score: number
}

export interface MappingAuditDomain {
  id: string
  semanticDomain: string
  tsStageNumber: number
  tsStageTitle: string
  dbStageNumbers: number[]
  dbStageTitles: string[]
  dbStageSlugs: string[]
  confidence: MatchConfidence
  riskLevel: MappingRiskLevel
  recommendation: MappingRecommendation
  notes: string[]
  tsItems: MappingAuditTsItem[]
  dbItems: MappingAuditDbItem[]
  matches: MappingAuditItemMatch[]
  tsOnlyItems: MappingAuditTsItem[]
  dbOnlyItems: MappingAuditDbItem[]
  vbblOnlyItems: MappingAuditDbItem[]
  dbLegalReferences: Array<{
    label: string
    legalReference: string
    sourceTitle: string | null
    sourceUrl: string | null
  }>
}

export interface ChecklistMappingAudit {
  jurisdictions: Array<{
    slug: MappingJurisdictionSlug
    label: string
  }>
  generatedAt: string
  summary: {
    totalTsStages: number
    totalDbStages: number
    highConfidenceMatches: number
    dbOnlyItems: number
    tsOnlyItems: number
    vbblOnlyItems: number
    highRiskMismatches: number
    pilotCandidates: number
  }
  domainsByJurisdiction: Record<MappingJurisdictionSlug, MappingAuditDomain[]>
  knownFindings: string[]
  readOnlyAssurance: string[]
}

interface DbStageRow {
  id: string
  stage_number: number
  slug: string
  title: string
}

interface DbTemplateRow {
  id: string
  stage_id: string
  jurisdiction_id: string
  title: string
  version: number
  is_active: boolean
}

interface DbJurisdictionRow {
  id: string
  slug: string
  name: string
  code_version: string | null
}

interface DbItemRow {
  id: string
  template_id: string
  sort_order: number
  label: string
  requirement_text: string | null
  is_required: boolean
  legal_reference: string | null
  source_title: string | null
  source_url: string | null
  is_active?: boolean | null
}

const JURISDICTIONS: ChecklistMappingAudit['jurisdictions'] = [
  { slug: 'bcbc_2024', label: 'BCBC 2024' },
  { slug: 'vbbl_2025', label: 'VBBL 2025' },
]

const SEMANTIC_MAPPINGS: Array<{
  id: string
  domain: string
  tsStageNumber: number
  dbStageSlugs: string[]
  confidence: MatchConfidence
  riskLevel: MappingRiskLevel
  recommendation: MappingRecommendation
  notes: string[]
}> = [
  {
    id: 'project-setup',
    domain: 'Project setup, identity, jurisdiction, and code path',
    tsStageNumber: 1,
    dbStageSlugs: [],
    confidence: 'none',
    riskLevel: 'do_not_touch',
    recommendation: 'keep_ts_only',
    notes: ['No DB stage covers this pre-field production workflow.'],
  },
  {
    id: 'planning-approvals',
    domain: 'Planning, servicing, access, and environmental approvals',
    tsStageNumber: 2,
    dbStageSlugs: [],
    confidence: 'none',
    riskLevel: 'high',
    recommendation: 'keep_ts_only',
    notes: ['DB templates start at site survey/excavation and do not model planning approvals as a stage.'],
  },
  {
    id: 'permit-package',
    domain: 'Permit submission package and assurances',
    tsStageNumber: 3,
    dbStageSlugs: [],
    confidence: 'none',
    riskLevel: 'high',
    recommendation: 'keep_ts_only',
    notes: ['This production intake/package gate has no direct DB template stage.'],
  },
  {
    id: 'site-prep',
    domain: 'Site prep, survey, utilities, excavation, and erosion controls',
    tsStageNumber: 4,
    dbStageSlugs: ['site_survey_excavation'],
    confidence: 'medium',
    riskLevel: 'high',
    recommendation: 'defer',
    notes: ['Semantic overlap exists, but the stage numbers differ: TS S04 maps to DB S01.'],
  },
  {
    id: 'foundation',
    domain: 'Foundation, footing, slab, drainage, formwork, and concrete',
    tsStageNumber: 5,
    dbStageSlugs: ['foundation_formwork_rebar', 'foundation_pour'],
    confidence: 'medium',
    riskLevel: 'high',
    recommendation: 'defer',
    notes: ['TS combines foundation/slab concerns that the DB splits across DB S02 and DB S03.'],
  },
  {
    id: 'structural-frame',
    domain: 'Structural frame, lateral systems, stairs, decks, and lock-up',
    tsStageNumber: 6,
    dbStageSlugs: ['framing_lockup'],
    confidence: 'medium',
    riskLevel: 'high',
    recommendation: 'defer',
    notes: ['Semantic overlap exists, but TS S06 maps to DB S04.'],
  },
  {
    id: 'building-envelope',
    domain: 'Building envelope, sheathing, weatherproofing, roof, and drainage',
    tsStageNumber: 7,
    dbStageSlugs: ['roof_deck_sheathing'],
    confidence: 'medium',
    riskLevel: 'high',
    recommendation: 'defer',
    notes: ['DB splits roof deck/sheathing (S05) from envelope work. After the S10–S15 correction, no DB stage directly models building envelope; closest match is roof_deck_sheathing (DB S05).'],
  },
  {
    id: 'fire-life-safety',
    domain: 'Fire, life safety, egress, alarms, accessibility, and guards',
    tsStageNumber: 8,
    dbStageSlugs: ['fire_suppression_rough_in'],
    confidence: 'low',
    riskLevel: 'high',
    recommendation: 'defer',
    notes: ['DB S07 (fire_suppression_rough_in) covers suppression rough-in. After the S10–S15 correction, DB S13 is interior_completion and no longer covers life-safety systems; TS groups broader life-safety checks than any single DB stage.'],
  },
  {
    id: 'plumbing',
    domain: 'Plumbing rough-in, drainage, testing, and fixtures',
    tsStageNumber: 9,
    dbStageSlugs: ['plumbing_rough_in'],
    confidence: 'high',
    riskLevel: 'medium',
    recommendation: 'feature_flag_pilot_candidate',
    notes: ['Best first pilot candidate. VBBL adds a sewer/storm placard item not present as an explicit TS gate.'],
  },
  {
    id: 'electrical',
    domain: 'Electrical service, rough wiring, life-safety wiring, and devices',
    tsStageNumber: 10,
    dbStageSlugs: ['electrical_rough_in', 'electrical_permit_and_scope'],
    confidence: 'medium',
    riskLevel: 'high',
    recommendation: 'defer',
    notes: ['DB S08 (electrical_rough_in) covers construction-phase wiring; DB S10 (electrical_permit_and_scope) now aligns with TS S10 as the permit-scope stage after the S10–S15 correction.'],
  },
  {
    id: 'mechanical-gas',
    domain: 'Mechanical, HVAC, gas, equipment, venting, and testing',
    tsStageNumber: 11,
    dbStageSlugs: ['mechanical_rough_in', 'gas_mechanical_hvac_scope'],
    confidence: 'medium',
    riskLevel: 'high',
    recommendation: 'defer',
    notes: ['DB S06 (mechanical_rough_in) covers construction-phase mechanical work; DB S11 (gas_mechanical_hvac_scope) now aligns with TS S11 after the S10–S15 correction. DB legal references from S06 may still be useful.'],
  },
  {
    id: 'insulation-energy',
    domain: 'Insulation, air/vapour barrier, airtightness, and energy compliance',
    tsStageNumber: 12,
    dbStageSlugs: ['insulation_energy_compliance'],
    confidence: 'high',
    riskLevel: 'medium',
    recommendation: 'enrich_ts_from_db_metadata',
    notes: ['Good legal-reference enrichment candidate. DB S12 (insulation_energy_compliance) now aligns with TS S12 after the S10–S15 correction.'],
  },
  {
    id: 'interior',
    domain: 'Interior completion, drywall, finishes, backing, and trim',
    tsStageNumber: 13,
    dbStageSlugs: ['interior_completion'],
    confidence: 'medium',
    riskLevel: 'high',
    recommendation: 'defer',
    notes: ['DB S13 (interior_completion) now aligns with TS S13 after the S10–S15 correction. TS interior items are broader than the DB stage scope.'],
  },
  {
    id: 'final-site',
    domain: 'Final site, grading, drainage, hardscaping, and environment',
    tsStageNumber: 14,
    dbStageSlugs: ['exterior_works_site_finalization'],
    confidence: 'high',
    riskLevel: 'medium',
    recommendation: 'feature_flag_pilot_candidate',
    notes: ['Possible second pilot. Same stage number and clear semantic overlap.'],
  },
  {
    id: 'final-occupancy',
    domain: 'Final documents, specialty closeout, occupancy, and authority readiness',
    tsStageNumber: 15,
    dbStageSlugs: ['final_approval_and_occupancy'],
    confidence: 'high',
    riskLevel: 'do_not_touch',
    recommendation: 'defer',
    notes: ['Sensitive. Keep observe-only because final occupancy, Schedule C-B, and sealed records depend on current production logic.'],
  },
]

function normalizeTokens(value: string): string[] {
  const stop = new Set([
    'and', 'or', 'the', 'of', 'to', 'at', 'in', 'for', 'with', 'where', 'all',
    'confirm', 'approved', 'required', 'requirements', 'systems', 'system',
  ])
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map(token => token.trim())
    .filter(token => token.length > 2 && !stop.has(token))
}

function matchScore(a: string, b: string): number {
  const aTokens = new Set(normalizeTokens(a))
  const bTokens = new Set(normalizeTokens(b))
  if (aTokens.size === 0 || bTokens.size === 0) return 0
  let overlap = 0
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1
  }
  return overlap / Math.max(aTokens.size, bTokens.size)
}

function confidenceForScore(score: number): MatchConfidence {
  if (score >= 0.45) return 'high'
  if (score >= 0.28) return 'medium'
  if (score >= 0.16) return 'low'
  return 'none'
}

function toTsItem(item: CompletionChecklistItemDefinition): MappingAuditTsItem {
  return {
    code: item.item_code,
    label: item.item_label,
    responsibleParty: item.responsible_party,
    evidenceMode: item.evidence_mode,
    documentUploadRequired: item.document_upload_required,
    requiredEvidence: item.required_evidence,
    statusLogic: 'Pending -> Passed / Failed / N/A with pass_when, fail_when, pending_when, dependencies, and evidence gates.',
    dependencies: item.dependencies,
  }
}

function compareItems(
  tsItems: MappingAuditTsItem[],
  dbItems: MappingAuditDbItem[],
): {
  matches: MappingAuditItemMatch[]
  tsOnlyItems: MappingAuditTsItem[]
  dbOnlyItems: MappingAuditDbItem[]
} {
  const usedTsCodes = new Set<string>()
  const usedDbIds = new Set<string>()
  const matches: MappingAuditItemMatch[] = []

  for (const dbItem of dbItems) {
    let best: { item: MappingAuditTsItem; score: number } | null = null
    for (const tsItem of tsItems) {
      if (usedTsCodes.has(tsItem.code)) continue
      const score = Math.max(
        matchScore(tsItem.label, dbItem.label),
        matchScore(`${tsItem.label} ${tsItem.requiredEvidence.join(' ')}`, `${dbItem.label} ${dbItem.requirementText}`),
      )
      if (!best || score > best.score) best = { item: tsItem, score }
    }

    if (best && best.score >= 0.16) {
      usedTsCodes.add(best.item.code)
      usedDbIds.add(dbItem.id)
      matches.push({
        tsItem: best.item,
        dbItem,
        score: best.score,
        confidence: confidenceForScore(best.score),
      })
    }
  }

  return {
    matches,
    tsOnlyItems: tsItems.filter(item => !usedTsCodes.has(item.code)),
    dbOnlyItems: dbItems.filter(item => !usedDbIds.has(item.id)),
  }
}

function getStageTitle(stage: CompletionChecklistStageDefinition | undefined): string {
  return stage?.stage_name ?? 'Unknown TypeScript stage'
}

function getJurisdictionLabel(row: DbJurisdictionRow): string {
  return row.code_version ? `${row.name} (${row.code_version})` : row.name
}

export async function buildChecklistMappingAudit(): Promise<ChecklistMappingAudit> {
  const supabase = await createClient()

  const [{ data: stageRows }, { data: jurisdictionRows }, { data: templateRows }, { data: itemRows }] = await Promise.all([
    supabase
      .from('inspection_stages')
      .select('id, stage_number, slug, title')
      .eq('is_active', true)
      .order('stage_number'),
    supabase
      .from('jurisdictions')
      .select('id, slug, name, code_version')
      .in('slug', JURISDICTIONS.map(j => j.slug))
      .eq('is_active', true),
    supabase
      .from('stage_checklist_templates')
      .select('id, stage_id, jurisdiction_id, title, version, is_active')
      .eq('is_active', true),
    supabase
      .from('stage_checklist_items')
      .select('id, template_id, sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url, is_active')
      .neq('is_active', false)
      .order('sort_order'),
  ])

  const tsChecklist = buildCompletionChecklist({
    city: 'Vancouver',
    region: 'vancouver',
    projectType: 'General building permit',
  })
  const tsStages = tsChecklist.stages
  const tsStageByNumber = new Map(tsStages.map(stage => [stage.stage_number, stage]))

  const dbStages = ((stageRows ?? []) as DbStageRow[])
  const dbStageById = new Map(dbStages.map(stage => [stage.id, stage]))
  const dbStageBySlug = new Map(dbStages.map(stage => [stage.slug, stage]))

  const jurisdictions = ((jurisdictionRows ?? []) as DbJurisdictionRow[])
  const jurisdictionById = new Map(jurisdictions.map(row => [row.id, row]))
  const jurisdictionBySlug = new Map(jurisdictions.map(row => [row.slug, row]))
  const itemRowsByTemplateId = new Map<string, DbItemRow[]>()
  for (const row of ((itemRows ?? []) as DbItemRow[])) {
    const rows = itemRowsByTemplateId.get(row.template_id) ?? []
    rows.push(row)
    itemRowsByTemplateId.set(row.template_id, rows)
  }

  const templateByStageAndJurisdiction = new Map<string, DbTemplateRow>()
  for (const template of ((templateRows ?? []) as DbTemplateRow[])) {
    const jurisdiction = jurisdictionById.get(template.jurisdiction_id)
    if (!jurisdiction) continue
    const key = `${template.stage_id}:${jurisdiction.slug}`
    const existing = templateByStageAndJurisdiction.get(key)
    if (!existing || template.version > existing.version) {
      templateByStageAndJurisdiction.set(key, template)
    }
  }

  const allDbItemsByJurisdictionAndStage = new Map<string, MappingAuditDbItem[]>()
  for (const jurisdiction of JURISDICTIONS) {
    for (const stage of dbStages) {
      const jurisdictionRow = jurisdictionBySlug.get(jurisdiction.slug)
      const template = jurisdictionRow
        ? templateByStageAndJurisdiction.get(`${stage.id}:${jurisdiction.slug}`)
        : null
      const rows = template ? itemRowsByTemplateId.get(template.id) ?? [] : []
      const items = rows.map(row => ({
        id: row.id,
        stageSlug: stage.slug,
        stageNumber: stage.stage_number,
        label: row.label,
        requirementText: row.requirement_text ?? '',
        sortOrder: row.sort_order,
        isRequired: row.is_required,
        legalReference: row.legal_reference,
        sourceTitle: row.source_title,
        sourceUrl: row.source_url,
        isVbblOnly: false,
      }))
      allDbItemsByJurisdictionAndStage.set(`${jurisdiction.slug}:${stage.slug}`, items)
    }
  }

  for (const stage of dbStages) {
    const bcbcLabels = new Set(
      (allDbItemsByJurisdictionAndStage.get(`bcbc_2024:${stage.slug}`) ?? [])
        .map(item => item.label.toLowerCase()),
    )
    const vbblItems = allDbItemsByJurisdictionAndStage.get(`vbbl_2025:${stage.slug}`) ?? []
    for (const item of vbblItems) {
      item.isVbblOnly = !bcbcLabels.has(item.label.toLowerCase())
    }
  }

  const domainsByJurisdiction = Object.fromEntries(JURISDICTIONS.map(jurisdiction => {
    const domains = SEMANTIC_MAPPINGS.map(mapping => {
      const tsStage = tsStageByNumber.get(mapping.tsStageNumber)
      const tsItems = (tsStage?.items ?? []).map(toTsItem)
      const dbStagesForMapping = mapping.dbStageSlugs
        .map(slug => dbStageBySlug.get(slug))
        .filter((stage): stage is DbStageRow => Boolean(stage))
      const dbItems = mapping.dbStageSlugs.flatMap(slug =>
        allDbItemsByJurisdictionAndStage.get(`${jurisdiction.slug}:${slug}`) ?? [],
      )
      const comparison = compareItems(tsItems, dbItems)

      return {
        id: mapping.id,
        semanticDomain: mapping.domain,
        tsStageNumber: mapping.tsStageNumber,
        tsStageTitle: getStageTitle(tsStage),
        dbStageNumbers: dbStagesForMapping.map(stage => stage.stage_number),
        dbStageTitles: dbStagesForMapping.map(stage => stage.title),
        dbStageSlugs: mapping.dbStageSlugs,
        confidence: mapping.confidence,
        riskLevel: mapping.riskLevel,
        recommendation: mapping.recommendation,
        notes: mapping.notes,
        tsItems,
        dbItems,
        matches: comparison.matches,
        tsOnlyItems: comparison.tsOnlyItems,
        dbOnlyItems: comparison.dbOnlyItems,
        vbblOnlyItems: dbItems.filter(item => item.isVbblOnly),
        dbLegalReferences: dbItems
          .filter(item => item.legalReference)
          .map(item => ({
            label: item.label,
            legalReference: item.legalReference as string,
            sourceTitle: item.sourceTitle,
            sourceUrl: item.sourceUrl,
          })),
      } satisfies MappingAuditDomain
    })

    return [jurisdiction.slug, domains]
  })) as Record<MappingJurisdictionSlug, MappingAuditDomain[]>

  const vbblDomains = domainsByJurisdiction.vbbl_2025
  const bcbcDomains = domainsByJurisdiction.bcbc_2024
  const allDomains = [...bcbcDomains, ...vbblDomains]
  const resolvedJurisdictions = jurisdictions
    .filter(row => row.slug === 'bcbc_2024' || row.slug === 'vbbl_2025')
    .map(row => ({
      slug: row.slug as MappingJurisdictionSlug,
      label: getJurisdictionLabel(row),
    }))

  return {
    jurisdictions: resolvedJurisdictions.length > 0 ? resolvedJurisdictions : JURISDICTIONS,
    generatedAt: new Date().toISOString(),
    summary: {
      totalTsStages: tsStages.length,
      totalDbStages: dbStages.length,
      highConfidenceMatches: allDomains.filter(domain => domain.confidence === 'high').length,
      dbOnlyItems: bcbcDomains.reduce((sum, domain) => sum + domain.dbOnlyItems.length, 0),
      tsOnlyItems: bcbcDomains.reduce((sum, domain) => sum + domain.tsOnlyItems.length, 0),
      vbblOnlyItems: vbblDomains.reduce((sum, domain) => sum + domain.vbblOnlyItems.length, 0),
      highRiskMismatches: bcbcDomains.filter(domain => domain.riskLevel === 'high' || domain.riskLevel === 'do_not_touch').length,
      pilotCandidates: bcbcDomains.filter(domain => domain.recommendation === 'feature_flag_pilot_candidate').length,
    },
    domainsByJurisdiction,
    knownFindings: [
      'Stage-number mismatch is severe from S1-S13. Semantic domain mapping is required.',
      'Stage 9 Plumbing is the best first feature-flag pilot candidate.',
      'Stage 14 Final Site & Grading is a possible second pilot.',
      'Stage 15 Final Occupancy is sensitive and must remain observe-only.',
      'DB templates are stronger for legal/code references and VBBL-specific items.',
      'TypeScript workflow is stronger for runtime evidence, party logic, pass/fail logic, document uploads, GPS/checksums, final occupancy execution, and Schedule C-B compatibility.',
      'Any BCBC references inside VBBL templates must be displayed with a clear source/code basis.',
    ],
    readOnlyAssurance: [
      'This audit performs Supabase select queries only.',
      'No production checklist, final occupancy, Schedule C-B, builder dashboard, inspector workflow, RLS, or migration logic is modified by this page.',
    ],
  }
}
