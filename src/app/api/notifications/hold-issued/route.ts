// Notification hook: fires when an inspector places a Hold / Same-Day Correction.
//
// SMS is the mandatory primary channel for the builder (they must act while the
// inspector is still on site). Email is the supporting secondary channel.
// Returns per-channel results — never an unconditional { sent: true }.

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendVeroEmail } from '@/lib/email/sendVeroEmail'
import { sendVeroSms } from '@/lib/sms/sendVeroSms'
import { toE164 } from '@/lib/sms/phone'

export const runtime = 'nodejs'

const APP_URL = 'https://veropermit.com'

export interface HoldIssuedPayload {
  holdId: string
  jobId: string
  inspectorId: string
  builderId: string
  reason?: string
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(req: NextRequest) {
  let body: HoldIssuedPayload
  try {
    body = (await req.json()) as HoldIssuedPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { holdId, jobId, builderId, reason } = body

  // ── Audit log ──────────────────────────────────────────────────────────────
  console.log('[hold-issued] notification triggered', {
    holdId,
    jobId,
    builderId,
    timestamp: new Date().toISOString(),
  })

  const service = getServiceClient()
  if (!service) {
    return NextResponse.json(
      { smsSent: false, emailSent: false, skipped: { reason: 'service_client_unavailable' } },
      { status: 200 },
    )
  }

  // Builder contact (onboarding first, profile fallback) + job context.
  const [{ data: onboarding }, { data: profile }, { data: job }] = await Promise.all([
    service
      .from('builder_onboarding_status')
      .select('contact_email, contact_name, contact_phone')
      .eq('user_id', builderId)
      .maybeSingle(),
    service.from('profiles').select('email, full_name, phone').eq('id', builderId).maybeSingle(),
    service.from('job_opportunities').select('project_name, address, stage_name').eq('id', jobId).maybeSingle(),
  ])

  const builderEmail = (onboarding?.contact_email ?? '').trim() || (profile?.email ?? '').trim()
  const builderName = (onboarding?.contact_name ?? '').trim() || (profile?.full_name ?? '').trim() || undefined
  const builderPhoneRaw = (onboarding?.contact_phone ?? '').trim() || (profile?.phone ?? '').trim()
  const projectName = (job?.project_name ?? '').trim() || undefined
  const address = (job?.address ?? '').trim()
  const stageName = (job?.stage_name ?? '').trim()
  const locationLabel = address || projectName || 'your inspection'
  const reasonText = (reason ?? '').trim()

  const skipped: Record<string, string> = {}

  // ── SMS first (mandatory when a usable phone exists) ───────────────────────
  let smsSent = false
  const normalized = toE164(builderPhoneRaw)
  if (normalized.ok) {
    const result = await sendVeroSms({
      to: normalized.e164,
      body: `Vero Permit: A same-day correction was flagged on your inspection at ${locationLabel}. It can be fixed while the inspector is still on site. Act now — open the Vero app.`,
    })
    smsSent = result.ok
    if (!result.ok) skipped.sms = result.code
  } else {
    skipped.sms = normalized.reason === 'missing' ? 'no_phone' : 'unusable_phone'
  }

  // ── Email (supporting) ─────────────────────────────────────────────────────
  let emailSent = false
  if (builderEmail) {
    const details: string[] = []
    if (address) details.push(`Address: ${address}`)
    if (stageName) details.push(`Inspection stage: ${stageName}`)
    const result = await sendVeroEmail({
      eventKey: 'hold.issued_builder_notice',
      to: builderEmail,
      recipientName: builderName,
      projectName,
      holdReason: reasonText || undefined,
      details: details.length > 0 ? details : undefined,
      ctaUrl: `${APP_URL}/builder`,
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
