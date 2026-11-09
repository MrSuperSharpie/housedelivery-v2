import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/adminApiGuard'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const auth = await requireAdminApi()
  if (!auth.authorized) return auth.response

  const supabase = await createClient()
  // Load the source template
  const { data: source, error: sourceErr } = await supabase
    .from('stage_checklist_templates')
    .select('id, stage_id, jurisdiction_id, title, version')
    .eq('id', id)
    .single()

  if (sourceErr || !source) {
    return NextResponse.json({ ok: false, error: 'Template not found.' }, { status: 404 })
  }

  const src = source as Record<string, unknown>

  // Find the max version for this (stage, jurisdiction) to avoid collisions
  const { data: maxRow } = await supabase
    .from('stage_checklist_templates')
    .select('version')
    .eq('stage_id', src.stage_id as string)
    .eq('jurisdiction_id', src.jurisdiction_id as string)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const newVersion = ((maxRow as Record<string, unknown> | null)?.version as number ?? src.version as number) + 1

  // Create the new template
  const { data: newTmpl, error: insertErr } = await supabase
    .from('stage_checklist_templates')
    .insert({
      stage_id: src.stage_id,
      jurisdiction_id: src.jurisdiction_id,
      title: src.title,
      version: newVersion,
      is_active: true,
      effective_from: null,
    })
    .select('id')
    .single()

  if (insertErr || !newTmpl) {
    console.error('[admin/checklists/templates/new-version] insert error', insertErr?.message)
    return NextResponse.json({ ok: false, error: insertErr?.message ?? 'Failed to create template.' }, { status: 500 })
  }

  const newTemplateId = (newTmpl as { id: string }).id

  // Copy all active items from source template
  const { data: sourceItems } = await supabase
    .from('stage_checklist_items')
    .select('sort_order, label, requirement_text, item_type, is_required, legal_reference, source_title, source_url, admin_notes')
    .eq('template_id', id)
    .eq('is_active', true)
    .order('sort_order')

  if (sourceItems && sourceItems.length > 0) {
    const copies = (sourceItems as Record<string, unknown>[]).map(item => ({
      template_id: newTemplateId,
      sort_order: item.sort_order,
      label: item.label,
      requirement_text: item.requirement_text,
      item_type: item.item_type,
      is_required: item.is_required,
      legal_reference: item.legal_reference,
      source_title: item.source_title,
      source_url: item.source_url,
      admin_notes: item.admin_notes,
    }))

    const { error: copyErr } = await supabase
      .from('stage_checklist_items')
      .insert(copies)

    if (copyErr) {
      console.error('[admin/checklists/templates/new-version] copy items error', copyErr.message)
      return NextResponse.json({ ok: false, error: copyErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, newTemplateId, newVersion })
}
