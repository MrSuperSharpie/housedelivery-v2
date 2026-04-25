import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AdminCancellationReviewRequestBody {
  cancellationRequestId: string
  decision: 'approved' | 'rejected' | 'overridden' | 'more_information'
  adminNote: string
  triggerReassignment?: boolean
  applyFinancialConsequence?: boolean
  waiveFinancialConsequence?: boolean
}

export async function POST(req: NextRequest) {
  let body: AdminCancellationReviewRequestBody
  try {
    body = await req.json() as AdminCancellationReviewRequestBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.cancellationRequestId || !body.decision || !body.adminNote) {
    return NextResponse.json(
      { ok: false, error: 'cancellationRequestId, decision, and adminNote are required.' },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  if (body.decision === 'more_information') {
    const { data, error } = await supabase.rpc('admin_request_cancellation_information', {
      p_cancellation_request_id: body.cancellationRequestId,
      p_admin_note: body.adminNote,
    })

    if (error) {
      console.error('[admin/cancellations/review] more information RPC error', {
        cancellationRequestId: body.cancellationRequestId,
        error: error.message,
      })
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    const payload = data as Record<string, unknown>
    return NextResponse.json(payload, { status: payload?.ok === true ? 200 : 422 })
  }

  const { data, error } = await supabase.rpc('admin_review_inspection_cancellation', {
    p_cancellation_request_id: body.cancellationRequestId,
    p_decision: body.decision,
    p_admin_note: body.adminNote,
    p_trigger_reassignment: body.triggerReassignment ?? false,
    p_apply_financial_consequence: body.applyFinancialConsequence ?? false,
    p_waive_financial_consequence: body.waiveFinancialConsequence ?? false,
  })

  if (error) {
    console.error('[admin/cancellations/review] RPC error', {
      cancellationRequestId: body.cancellationRequestId,
      error: error.message,
    })
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const payload = data as Record<string, unknown>
  return NextResponse.json(payload, { status: payload?.ok === true ? 200 : 422 })
}
