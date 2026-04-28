import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const jurisdictionId = searchParams.get('jurisdictionId')
  const stageId = searchParams.get('stageId')

  const [{ data: rawJurisdictions }, { data: rawStages }] = await Promise.all([
    supabase
      .from('jurisdictions')
      .select('id, slug, name, code_version, effective_date')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('inspection_stages')
      .select('id, stage_number, slug, title')
      .eq('is_active', true)
      .order('stage_number'),
  ])

  const jurisdictions = (rawJurisdictions ?? []).map((j: Record<string, unknown>) => ({
    id: j.id as string,
    slug: j.slug as string,
    name: j.name as string,
    codeVersion: (j.code_version as string | null) ?? null,
    effectiveDate: (j.effective_date as string | null) ?? null,
  }))

  const stages = (rawStages ?? []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    stageNumber: s.stage_number as number,
    slug: s.slug as string,
    title: s.title as string,
  }))

  if (!jurisdictionId || !stageId) {
    return NextResponse.json({ ok: true, jurisdictions, stages, template: null, items: [], responseCount: 0 })
  }

  const { data: rawTemplate } = await supabase
    .from('stage_checklist_templates')
    .select('id, stage_id, jurisdiction_id, title, version, is_active, effective_from')
    .eq('stage_id', stageId)
    .eq('jurisdiction_id', jurisdictionId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!rawTemplate) {
    return NextResponse.json({ ok: true, jurisdictions, stages, template: null, items: [], responseCount: 0 })
  }

  const template = {
    id: rawTemplate.id as string,
    stageId: rawTemplate.stage_id as string,
    jurisdictionId: rawTemplate.jurisdiction_id as string,
    title: rawTemplate.title as string,
    version: rawTemplate.version as number,
    isActive: rawTemplate.is_active as boolean,
    effectiveFrom: (rawTemplate.effective_from as string | null) ?? null,
  }

  const { data: rawItems } = await supabase
    .from('stage_checklist_items')
    .select('id, template_id, sort_order, label, requirement_text, item_type, is_required, legal_reference, source_title, source_url, admin_notes, is_active')
    .eq('template_id', template.id)
    .order('sort_order')

  const items = (rawItems ?? []).map((i: Record<string, unknown>) => ({
    id: i.id as string,
    templateId: i.template_id as string,
    sortOrder: i.sort_order as number,
    label: i.label as string,
    requirementText: i.requirement_text as string,
    itemType: i.item_type as string,
    isRequired: i.is_required as boolean,
    legalReference: (i.legal_reference as string | null) ?? null,
    sourceTitle: (i.source_title as string | null) ?? null,
    sourceUrl: (i.source_url as string | null) ?? null,
    adminNotes: (i.admin_notes as string | null) ?? null,
    isActive: (i.is_active as boolean | null) ?? true,
  }))

  const itemIds = items.map(i => i.id)
  let responseCount = 0
  if (itemIds.length > 0) {
    const { count } = await supabase
      .from('permit_checklist_responses')
      .select('id', { count: 'exact', head: true })
      .in('checklist_item_id', itemIds)
    responseCount = count ?? 0
  }

  return NextResponse.json({ ok: true, jurisdictions, stages, template, items, responseCount })
}
