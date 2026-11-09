import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/adminApiGuard'

interface CreateItemBody {
  templateId: string
  sortOrder: number
  label: string
  requirementText: string
  isRequired: boolean
  legalReference?: string | null
  sourceTitle?: string | null
  sourceUrl?: string | null
  adminNotes?: string | null
}

export async function POST(req: NextRequest) {
  let body: CreateItemBody
  try {
    body = await req.json() as CreateItemBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.templateId || !body.label?.trim() || !body.requirementText?.trim()) {
    return NextResponse.json({ ok: false, error: 'templateId, label, and requirementText are required.' }, { status: 400 })
  }

  const auth = await requireAdminApi()
  if (!auth.authorized) return auth.response

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stage_checklist_items')
    .insert({
      template_id: body.templateId,
      sort_order: body.sortOrder ?? 99,
      label: body.label.trim(),
      requirement_text: body.requirementText.trim(),
      item_type: 'boolean',
      is_required: body.isRequired ?? true,
      legal_reference: body.legalReference?.trim() || null,
      source_title: body.sourceTitle?.trim() || null,
      source_url: body.sourceUrl?.trim() || null,
      admin_notes: body.adminNotes?.trim() || null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[admin/checklists/items] insert error', error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: (data as { id: string }).id })
}
