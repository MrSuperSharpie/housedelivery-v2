import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CancellationRequestBody {
  assignmentId: string
  reasonCode: string
  explanation: string
  evidence?: unknown
}

export async function POST(req: NextRequest) {
  let body: CancellationRequestBody
  try {
    body = await req.json() as CancellationRequestBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.assignmentId || !body.reasonCode || !body.explanation) {
    return NextResponse.json(
      { ok: false, error: 'assignmentId, reasonCode, and explanation are required.' },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('request_inspection_cancellation', {
    p_assignment_id: body.assignmentId,
    p_reason_code: body.reasonCode,
    p_explanation: body.explanation,
    p_evidence: body.evidence ?? {},
  })

  if (error) {
    console.error('[jobs/cancellations] RPC error', { assignmentId: body.assignmentId, error: error.message })
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const payload = data as Record<string, unknown>
  return NextResponse.json(payload, { status: payload?.ok === true ? 200 : 422 })
}
