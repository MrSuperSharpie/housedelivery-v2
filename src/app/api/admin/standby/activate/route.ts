import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AdminStandbyActivationRequestBody {
  assignmentId: string
  reason?: 'critical_confirmation_miss' | 'invalid_cancellation' | 'no_show' | 'admin_requested'
}

export async function POST(req: NextRequest) {
  let body: AdminStandbyActivationRequestBody
  try {
    body = await req.json() as AdminStandbyActivationRequestBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.assignmentId || typeof body.assignmentId !== 'string') {
    return NextResponse.json({ ok: false, error: 'assignmentId is required.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_activate_standby_candidates', {
    p_assignment_id: body.assignmentId,
    p_reason: body.reason ?? 'admin_requested',
  })

  if (error) {
    console.error('[admin/standby/activate] RPC error', {
      assignmentId: body.assignmentId,
      error: error.message,
    })
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const payload = data as Record<string, unknown>
  return NextResponse.json(payload, { status: payload?.ok === true ? 200 : 422 })
}
