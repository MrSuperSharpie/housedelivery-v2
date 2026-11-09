import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { HardPingBackendAction, HardPingIssueReason, HardPingResponseType } from '@/lib/hardPingTypes'

interface HardPingRequestBody {
  assignmentId?: string
  jobId?: string
  responseType?: HardPingResponseType
  backendAction?: HardPingBackendAction
  reasonCategory?: HardPingIssueReason
  details?: string
  clientTimestamp?: string
}

function normalizeAction(body: HardPingRequestBody): HardPingBackendAction | null {
  if (body.backendAction === 'yes_en_route' || body.backendAction === 'need_help' || body.backendAction === 'cannot_attend') {
    return body.backendAction
  }
  if (body.responseType === 'en_route') return 'yes_en_route'
  if (body.responseType === 'needs_help') return 'need_help'
  if (body.responseType === 'cannot_attend') return 'cannot_attend'
  return null
}

function statusForRpcPayload(payload: Record<string, unknown>) {
  const error = typeof payload.error === 'string' ? payload.error.toLowerCase() : ''
  if (error.includes('not authorized')) return 403
  if (error.includes('not found') || error.includes('no longer active')) return 409
  return 422
}

export async function POST(req: NextRequest) {
  let body: HardPingRequestBody
  try {
    body = await req.json() as HardPingRequestBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const action = normalizeAction(body)
  if (!body.assignmentId || !action) {
    return NextResponse.json(
      { ok: false, error: 'assignmentId and a supported responseType are required.' },
      { status: 400 },
    )
  }

  if (action === 'need_help' && !body.reasonCategory) {
    return NextResponse.json(
      { ok: false, error: 'reasonCategory is required when reporting an issue.' },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  if (!authData.user) {
    return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 })
  }

  const metadata = {
    clientTimestamp: body.clientTimestamp ?? new Date().toISOString(),
    frontendResponseType: body.responseType ?? null,
    details: body.details?.trim() || null,
    jobId: body.jobId ?? null,
  }

  const { data, error } = await supabase.rpc('record_departure_hard_ping_response', {
    p_assignment_id: body.assignmentId,
    p_action: action,
    p_issue_reason: action === 'need_help' ? body.reasonCategory : null,
    p_metadata: metadata,
  })

  if (error) {
    console.error('[departure-hard-ping] RPC error', {
      assignmentId: body.assignmentId,
      action,
      error: error.message,
    })
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const payload = (data ?? {}) as Record<string, unknown>
  if (payload.ok !== true) {
    const status = statusForRpcPayload(payload)
    return NextResponse.json(
      {
        ok: false,
        stale: status === 409,
        hardPingActive: status !== 409,
        error: (payload.error as string) ?? 'Could not record hard ping response.',
      },
      { status },
    )
  }

  return NextResponse.json({
    ok: true,
    hardPingActive: false,
    beginReassignment: payload.beginReassignment === true,
    updatedEtaSeconds: typeof payload.updatedEtaSeconds === 'number' ? payload.updatedEtaSeconds : null,
  })
}

