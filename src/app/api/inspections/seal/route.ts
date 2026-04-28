import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canUserSealStage } from '@/lib/inspections/access'

interface SealRequestBody {
  permitId: string
  stageId: string
  notes?: string | null
}

export async function POST(req: NextRequest) {
  let body: SealRequestBody
  try {
    body = await req.json() as SealRequestBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { permitId, stageId, notes } = body

  if (!permitId || typeof permitId !== 'string') {
    return NextResponse.json({ ok: false, error: 'permitId is required.' }, { status: 400 })
  }
  if (!stageId || typeof stageId !== 'string') {
    return NextResponse.json({ ok: false, error: 'stageId is required.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 })
  }

  const eligibility = await canUserSealStage(user.id, permitId, stageId)
  if (!eligibility.allowed) {
    return NextResponse.json(
      { ok: false, error: eligibility.reason ?? 'Not permitted to seal this stage.' },
      { status: 403 }
    )
  }

  const { data, error } = await supabase.rpc('seal_inspection_stage', {
    p_permit_id: permitId,
    p_stage_id: stageId,
    p_notes: notes ?? null,
  })

  if (error) {
    console.error('[inspections/seal] RPC error', { permitId, stageId, error: error.message })
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to seal stage.' },
      { status: 500 }
    )
  }

  const payload = data as Record<string, unknown>
  if (payload?.ok !== true) {
    return NextResponse.json(
      { ok: false, error: (payload?.error as string) ?? 'Failed to seal stage.' },
      { status: 422 }
    )
  }

  return NextResponse.json({ ok: true })
}
