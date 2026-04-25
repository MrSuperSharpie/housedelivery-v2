import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AcceptStandbyOfferRequestBody {
  standbyInviteId: string
}

export async function POST(req: NextRequest) {
  let body: AcceptStandbyOfferRequestBody
  try {
    body = await req.json() as AcceptStandbyOfferRequestBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.standbyInviteId || typeof body.standbyInviteId !== 'string') {
    return NextResponse.json({ ok: false, error: 'standbyInviteId is required.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('accept_standby_offer', {
    p_standby_invite_id: body.standbyInviteId,
  })

  if (error) {
    console.error('[standby-offers/accept] RPC error', {
      standbyInviteId: body.standbyInviteId,
      error: error.message,
    })
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const payload = data as Record<string, unknown>
  return NextResponse.json(payload, { status: payload?.ok === true ? 200 : 422 })
}
