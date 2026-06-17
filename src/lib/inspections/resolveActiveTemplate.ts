/**
 * Read-only resolver: given a DB inspection stage number and a project city,
 * resolves the active jurisdiction-scoped checklist template and its items.
 *
 * This mirrors the resolution logic already used by the inspector reference
 * page (src/app/inspector/stages/page.tsx) but is packaged as a pure read so it
 * can be reused by the Phase 0 "Vero-resolved inspection scope" panel without
 * duplicating the query. It performs NO writes and joins NO permit-specific
 * response/progress data — it returns the blank reference template only.
 */
import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export interface ResolvedTemplateItem {
  id: string
  label: string
  requirementText: string
  sortOrder: number
  isRequired: boolean
  legalReference: string | null
}

export type ResolvedTemplate =
  | {
      resolved: true
      templateId: string
      title: string
      version: number
      jurisdictionName: string | null
      stageLabel: string
      items: ResolvedTemplateItem[]
    }
  | { resolved: false }

// Maps a project city to the best matching jurisdiction slug. Vancouver
// projects use VBBL 2025; all other BC projects default to BCBC 2024.
// NOTE: copied (Phase 0) from src/app/inspector/stages/page.tsx to avoid
// editing that working page; consolidate into one helper in a later phase.
function cityToJurisdictionSlug(city: string | null): string {
  if (!city) return 'bcbc_2024'
  return city.trim().toLowerCase() === 'vancouver' ? 'vbbl_2025' : 'bcbc_2024'
}

export async function resolveActiveTemplate(
  supabase: SupabaseServerClient,
  { stageNumber, city }: { stageNumber: number; city: string | null },
): Promise<ResolvedTemplate> {
  // ── DB stage row (stage_number → id + title) ────────────────────────────────
  const { data: stageRow } = await supabase
    .from('inspection_stages')
    .select('id, stage_number, title')
    .eq('stage_number', stageNumber)
    .eq('is_active', true)
    .maybeSingle()

  if (!stageRow?.id) return { resolved: false }

  const stageId = stageRow.id as string
  const stageLabel = `S${String(stageNumber).padStart(2, '0')} — ${stageRow.title as string}`

  // ── Active template (jurisdiction-aware, latest version) ────────────────────
  let templateId: string | null = null
  let templateTitle: string | null = null
  let templateVersion: number | null = null
  let jurisdictionName: string | null = null

  const jurisdictionSlug = cityToJurisdictionSlug(city)
  const { data: jx } = await supabase
    .from('jurisdictions')
    .select('id, name')
    .eq('slug', jurisdictionSlug)
    .maybeSingle()

  if (jx?.id) {
    const { data: tmpl } = await supabase
      .from('stage_checklist_templates')
      .select('id, title, version')
      .eq('stage_id', stageId)
      .eq('jurisdiction_id', jx.id)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (tmpl?.id) {
      templateId = tmpl.id as string
      templateTitle = tmpl.title as string
      templateVersion = tmpl.version as number
      jurisdictionName = (jx.name as string | null) ?? null
    }
  }

  // Fallback: any active template for this stage (unknown/unmapped city).
  if (!templateId) {
    const { data: tmpl } = await supabase
      .from('stage_checklist_templates')
      .select('id, title, version')
      .eq('stage_id', stageId)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (tmpl?.id) {
      templateId = tmpl.id as string
      templateTitle = tmpl.title as string
      templateVersion = tmpl.version as number
    }
  }

  if (!templateId) return { resolved: false }

  // ── Checklist items (blank reference — no permit responses joined) ──────────
  const { data: rawItems } = await supabase
    .from('stage_checklist_items')
    .select('id, label, requirement_text, sort_order, is_required, legal_reference')
    .eq('template_id', templateId)
    .neq('is_active', false)
    .order('sort_order')

  const items: ResolvedTemplateItem[] = (rawItems ?? []).map((i: Record<string, unknown>) => ({
    id: i.id as string,
    label: i.label as string,
    requirementText: (i.requirement_text as string | null) ?? '',
    sortOrder: i.sort_order as number,
    isRequired: i.is_required as boolean,
    legalReference: (i.legal_reference as string | null) ?? null,
  }))

  return {
    resolved: true,
    templateId,
    title: templateTitle ?? stageLabel,
    version: templateVersion ?? 1,
    jurisdictionName,
    stageLabel,
    items,
  }
}
