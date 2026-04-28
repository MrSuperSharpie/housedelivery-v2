import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RequestBody {
  permitId: string
  stageId: string
  itemId: string
  completed: boolean
  notes?: string | null
}

export async function POST(req: NextRequest) {
  let body: RequestBody
  try {
    body = await req.json() as RequestBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { permitId, stageId, itemId, completed, notes } = body

  if (!permitId || typeof permitId !== 'string') {
    return NextResponse.json({ ok: false, error: 'permitId is required.' }, { status: 400 })
  }
  if (!stageId || typeof stageId !== 'string') {
    return NextResponse.json({ ok: false, error: 'stageId is required.' }, { status: 400 })
  }
  if (!itemId || typeof itemId !== 'string') {
    return NextResponse.json({ ok: false, error: 'itemId is required.' }, { status: 400 })
  }
  if (typeof completed !== 'boolean') {
    return NextResponse.json({ ok: false, error: 'completed must be a boolean.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 })
  }

  const { error } = await supabase
    .from('permit_checklist_responses')
    .upsert(
      {
        permit_id: permitId,
        stage_id: stageId,
        checklist_item_id: itemId,
        response_status: completed ? 'completed' : 'pending',
        response: notes ? { notes } : {},
        completed_by: user.id,
        completed_at: completed ? new Date().toISOString() : null,
      },
      { onConflict: 'permit_id,checklist_item_id' }
    )

  if (error) {
    console.error('[checklist-response] upsert error', { itemId, error: error.message })
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to save response.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
