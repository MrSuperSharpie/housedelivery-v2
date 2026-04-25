import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface NoShowRequestBody {
  assignmentId: string
  detectedAt?: string
  note?: string
}

export async function POST(req: NextRequest) {
  let body: NoShowRequestBody
  try {
    body = await req.json() as NoShowRequestBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.assignmentId) {
    return NextResponse.json({ ok: false, error: 'assignmentId is required.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('record_inspection_no_show', {
    p_assignment_id: body.assignmentId,
    p_detected_at: body.detectedAt ?? new Date().toISOString(),
    p_note: body.note ?? null,
  })

  if (error) {
    console.error('[jobs/no-show] RPC error', { assignmentId: body.assignmentId, error: error.message })
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const payload = data as Record<string, unknown>
  return NextResponse.json(payload, { status: payload?.ok === true ? 200 : 422 })
}
