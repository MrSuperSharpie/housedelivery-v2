import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AdminPayoutReviewRequestBody {
  assignmentId: string
  decision: 'approve_payout' | 'reduce_payout' | 'block_payout' | 'apply_reserve' | 'waive_consequence' | 'issue_builder_credit'
  adminNote: string
  payoutReductionAmount?: number
  applyReserve?: boolean
  issueBuilderCredit?: boolean
  builderCreditAmount?: number
  waiveConsequence?: boolean
}

export async function POST(req: NextRequest) {
  let body: AdminPayoutReviewRequestBody
  try {
    body = await req.json() as AdminPayoutReviewRequestBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.assignmentId || !body.decision || !body.adminNote) {
    return NextResponse.json(
      { ok: false, error: 'assignmentId, decision, and adminNote are required.' },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_review_payout_hook', {
    p_assignment_id: body.assignmentId,
    p_decision: body.decision,
    p_admin_note: body.adminNote,
    p_payout_reduction_amount: body.payoutReductionAmount ?? 0,
    p_apply_reserve: body.applyReserve ?? false,
    p_issue_builder_credit: body.issueBuilderCredit ?? false,
    p_builder_credit_amount: body.builderCreditAmount ?? 0,
    p_waive_consequence: body.waiveConsequence ?? false,
  })

  if (error) {
    console.error('[admin/payouts/review] RPC error', {
      assignmentId: body.assignmentId,
      error: error.message,
    })
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const payload = data as Record<string, unknown>
  return NextResponse.json(payload, { status: payload?.ok === true ? 200 : 422 })
}
