// Admin-only, single-recipient SMS smoke test for Twilio readiness.
//
// Guarded by design: admin auth + explicit confirm token + one manually entered
// recipient. No DB lookups, no bulk, no Hold-workflow involvement. Reuses the
// existing sender, so when TWILIO_* env vars are absent it safely returns the
// existing { ok: false, code: 'missing_config' } result instead of sending.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/adminApiGuard'
import { sendVeroSms } from '@/lib/sms/sendVeroSms'
import { toE164 } from '@/lib/sms/phone'

export const runtime = 'nodejs'

interface SmsSmokeTestPayload {
  to?: string
  confirm?: string
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi()
  if (!auth.authorized) return auth.response

  // Feature flag: the smoke test is inert unless explicitly enabled in the
  // environment. Anything other than the exact string "true" returns a safe
  // response and never reaches sendVeroSms.
  if (process.env.SMS_SMOKE_TEST_ENABLED !== 'true') {
    return NextResponse.json(
      { ok: false, code: 'smoke_test_disabled', error: 'SMS smoke test is disabled (SMS_SMOKE_TEST_ENABLED is not "true").' },
      { status: 200 },
    )
  }

  let body: SmsSmokeTestPayload
  try {
    body = (await req.json()) as SmsSmokeTestPayload
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.confirm !== 'SEND') {
    return NextResponse.json({ ok: false, error: "confirm must equal 'SEND'." }, { status: 400 })
  }

  const normalized = toE164(body.to)
  if (!normalized.ok) {
    return NextResponse.json(
      { ok: false, error: `Unusable recipient phone number (${normalized.reason}).` },
      { status: 400 },
    )
  }

  const result = await sendVeroSms({
    to: normalized.e164,
    body: 'Vero: test message from Vero Permit. You can ignore this. Reply STOP to opt out.',
  })

  return NextResponse.json(result)
}
