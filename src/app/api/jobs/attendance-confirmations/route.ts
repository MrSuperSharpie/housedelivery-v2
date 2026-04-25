import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AttendanceConfirmationRequestBody {
  confirmationId: string
  confirmationToken?: string | null
  method?: 'manual' | 'notification_link' | 'geo_fence'
  latitude?: number | null
  longitude?: number | null
  accuracyMeters?: number | null
  etaMinutes?: number | null
  metadata?: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  let body: AttendanceConfirmationRequestBody
  try {
    body = await req.json() as AttendanceConfirmationRequestBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.confirmationId || typeof body.confirmationId !== 'string') {
    return NextResponse.json({ ok: false, error: 'confirmationId is required.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('record_job_attendance_confirmation', {
    p_confirmation_id: body.confirmationId,
    p_confirmation_token: body.confirmationToken ?? null,
    p_method: body.method ?? (body.confirmationToken ? 'notification_link' : 'manual'),
    p_latitude: body.latitude ?? null,
    p_longitude: body.longitude ?? null,
    p_accuracy_meters: body.accuracyMeters ?? null,
    p_eta_minutes: body.etaMinutes ?? null,
    p_metadata: body.metadata ?? {},
  })

  if (error) {
    console.error('[attendance-confirmations] RPC error', {
      confirmationId: body.confirmationId,
      error: error.message,
    })
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const payload = data as Record<string, unknown>
  if (payload?.ok !== true) {
    return NextResponse.json(
      { ok: false, error: (payload?.error as string) ?? 'Could not record attendance confirmation.' },
      { status: 422 },
    )
  }

  return NextResponse.json(payload)
}
