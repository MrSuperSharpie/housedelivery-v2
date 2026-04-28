import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface UpdateItemBody {
  sortOrder?: number
  label?: string
  requirementText?: string
  isRequired?: boolean
  legalReference?: string | null
  sourceTitle?: string | null
  sourceUrl?: string | null
  adminNotes?: string | null
  isActive?: boolean
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  let body: UpdateItemBody
  try {
    body = await req.json() as UpdateItemBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 })

  const patch: Record<string, unknown> = {}
  if (body.sortOrder !== undefined)      patch.sort_order      = body.sortOrder
  if (body.label !== undefined)          patch.label           = body.label.trim()
  if (body.requirementText !== undefined) patch.requirement_text = body.requirementText.trim()
  if (body.isRequired !== undefined)     patch.is_required     = body.isRequired
  if ('legalReference' in body)          patch.legal_reference = body.legalReference?.trim() || null
  if ('sourceTitle' in body)             patch.source_title    = body.sourceTitle?.trim() || null
  if ('sourceUrl' in body)               patch.source_url      = body.sourceUrl?.trim() || null
  if ('adminNotes' in body)              patch.admin_notes     = body.adminNotes?.trim() || null
  if (body.isActive !== undefined)       patch.is_active       = body.isActive

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: 'No fields to update.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('stage_checklist_items')
    .update(patch)
    .eq('id', id)

  if (error) {
    console.error('[admin/checklists/items/[id]] update error', error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
