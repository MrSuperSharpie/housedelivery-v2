import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface UpdateTemplateBody {
  isActive?: boolean
  title?: string
  effectiveFrom?: string | null
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  let body: UpdateTemplateBody
  try {
    body = await req.json() as UpdateTemplateBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 })

  const patch: Record<string, unknown> = {}
  if (body.isActive !== undefined)   patch.is_active     = body.isActive
  if (body.title !== undefined)      patch.title         = body.title.trim()
  if ('effectiveFrom' in body)       patch.effective_from = body.effectiveFrom || null

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: 'No fields to update.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('stage_checklist_templates')
    .update(patch)
    .eq('id', id)

  if (error) {
    console.error('[admin/checklists/templates/[id]] update error', error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
