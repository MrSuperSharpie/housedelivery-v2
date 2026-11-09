import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CancellationAppealRequestBody {
  cancellationRequestId: string
  appealNote: string
  evidence?: unknown
}

export async function POST(req: NextRequest) {
  let body: CancellationAppealRequestBody
  try {
    body = await req.json() as CancellationAppealRequestBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.cancellationRequestId || !body.appealNote) {
    return NextResponse.json(
      { ok: false, error: 'cancellationRequestId and appealNote are required.' },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('submit_cancellation_appeal', {
    p_cancellation_request_id: body.cancellationRequestId,
    p_appeal_note: body.appealNote,
    p_evidence: body.evidence ?? {},
  })

  if (error) {
    console.error('[jobs/cancellations/appeal] RPC error', {
      cancellationRequestId: body.cancellationRequestId,
      error: error.message,
    })
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const payload = data as Record<string, unknown>
  return NextResponse.json(payload, { status: payload?.ok === true ? 200 : 422 })
}
