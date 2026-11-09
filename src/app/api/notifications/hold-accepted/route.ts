// Notification hook: fires when a builder acknowledges a Hold or marks the
// same-day correction ready for re-check.
//
// SMS is the mandatory primary channel for the inspector (they need to re-verify
// before leaving site). Email is the supporting secondary channel.
// Returns per-channel results — never an unconditional { sent: true }.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendVeroEmail } from '@/lib/email/sendVeroEmail'
import { sendVeroSms } from '@/lib/sms/sendVeroSms'
import { toE164 } from '@/lib/sms/phone'
import { smsWithLocation } from '@/lib/sms/smsBodyUtils'

export const runtime = 'nodejs'

const APP_URL = 'https://veropermit.com'

// 'acknowledged'     — builder accepted/acknowledged the Hold terms.
// 'correction_ready' — builder marked the same-day correction ready for re-check.
export type HoldInspectorNotificationType = 'acknowledged' | 'correction_ready'

export interface HoldAcceptedPayload {
  notificationType?: HoldInspectorNotificationType
  holdId: string
  jobId: string
  inspectorId: string
  builderId: string
  feeAmount?: number
  correctionWindowMinutes?: number
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(req: NextRequest) {
  let body: HoldAcceptedPayload
  try {
    body = (await req.json()) as HoldAcceptedPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { holdId, jobId, inspectorId, builderId, feeAmount, correctionWindowMinutes } = body
  const notificationType: HoldInspectorNotificationType =
    body.notificationType === 'correction_ready' ? 'correction_ready' : 'acknowledged'

  // ── Audit log ──────────────────────────────────────────────────────────────
  console.log('[hold-accepted] notification triggered', {
    notificationType,
    holdId,
    jobId,
    inspectorId,
    builderId,
    feeAmount,
    correctionWindowMinutes,
    timestamp: new Date().toISOString(),
  })

  const service = getServiceClient()
  if (!service) {
    return NextResponse.json(
      { smsSent: false, emailSent: false, skipped: { reason: 'service_client_unavailable' } },
      { status: 200 },
    )
  }

  // Inspector contact (profile first, onboarding fallback for phone) + job context.
  const [{ data: profile }, { data: onboarding }, { data: job }] = await Promise.all([
    service.from('profiles').select('email, full_name, phone').eq('id', inspectorId).maybeSingle(),
    service
      .from('inspector_onboarding_status')
      .select('contact_phone')
      .eq('user_id', inspectorId)
      .maybeSingle(),
    service.from('job_opportunities').select('project_name, address').eq('id', jobId).maybeSingle(),
  ])

  const inspectorEmail = (profile?.email ?? '').trim()
  const inspectorName = (profile?.full_name ?? '').trim() || undefined
  const inspectorPhoneRaw = (profile?.phone ?? '').trim() || (onboarding?.contact_phone ?? '').trim()
  const projectName = (job?.project_name ?? '').trim() || undefined
  const address = (job?.address ?? '').trim()
  const locationForSms = address || projectName || ''

  const skipped: Record<string, string> = {}

  const smsBody =
    notificationType === 'correction_ready'
      ? smsWithLocation(
          'Vero: Builder says correction is ready at {loc}. Re-check the Hold in Vero.',
          locationForSms,
          'Vero: Builder says correction is ready. Re-check the Hold in Vero.',
        )
      : smsWithLocation(
          'Vero: Builder accepted the same-day correction at {loc}. Review the Hold in Vero.',
          locationForSms,
          'Vero: Builder accepted the same-day correction. Review the Hold in Vero.',
        )

  // ── SMS first (mandatory when a usable phone exists) ───────────────────────
  let smsSent = false
  const normalized = toE164(inspectorPhoneRaw)
  if (normalized.ok) {
    const result = await sendVeroSms({
      to: normalized.e164,
      body: smsBody,
    })
    smsSent = result.ok
    if (!result.ok) skipped.sms = result.code
  } else {
    skipped.sms = normalized.reason === 'missing' ? 'no_phone' : 'unusable_phone'
  }

  // ── Email (supporting) ─────────────────────────────────────────────────────
  let emailSent = false
  if (inspectorEmail) {
    const details: string[] = []
    if (address) details.push(`Address: ${address}`)
    const result = await sendVeroEmail({
      eventKey: 'hold.response_submitted_inspector_notice',
      to: inspectorEmail,
      recipientName: inspectorName,
      projectName,
      details: details.length > 0 ? details : undefined,
      ctaUrl: `${APP_URL}/inspector`,
    })
    emailSent = result.ok
    if (!result.ok) skipped.email = result.code ?? 'send_failed'
  } else {
    skipped.email = 'no_email'
  }

  return NextResponse.json({
    smsSent,
    emailSent,
    ...(Object.keys(skipped).length > 0 ? { skipped } : {}),
  })
}
