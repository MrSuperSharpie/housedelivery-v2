// Notification hook: fires when a builder accepts a hold.
// Currently logs to console and provides ready-to-wire Resend + Twilio stubs.
// To enable live sending, set RESEND_API_KEY and/or TWILIO_* environment variables.

import { NextRequest, NextResponse } from 'next/server'

export interface HoldAcceptedPayload {
  holdId: string
  jobId: string
  inspectorId: string
  builderId: string
  feeAmount: number
  correctionWindowMinutes: number
}

export async function POST(req: NextRequest) {
  let body: HoldAcceptedPayload
  try {
    body = await req.json() as HoldAcceptedPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { holdId, jobId, inspectorId, builderId, feeAmount, correctionWindowMinutes } = body

  // ── Audit log ──────────────────────────────────────────────────────────────
  console.log('[hold-accepted] notification triggered', {
    holdId,
    jobId,
    inspectorId,
    builderId,
    feeAmount,
    correctionWindowMinutes,
    timestamp: new Date().toISOString(),
  })

  // ── Email to Inspector via Resend ──────────────────────────────────────────
  // Uncomment and set RESEND_API_KEY to enable.
  // You will also need to look up the inspector's email from the `profiles` table.
  //
  // if (process.env.RESEND_API_KEY) {
  //   const inspectorEmail = '...' // look up from profiles WHERE supabase_id = inspectorId
  //   await fetch('https://api.resend.com/emails', {
  //     method: 'POST',
  //     headers: {
  //       Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({
  //       from: 'Vero Permit <no-reply@getvero.ca>',
  //       to: [inspectorEmail],
  //       subject: 'Action Required: Builder Accepted Hold Terms',
  //       text: [
  //         `Builder has accepted the hold terms for your active inspection.`,
  //         `Re-verification is now authorized.`,
  //         ``,
  //         `Correction window: ${correctionWindowMinutes} minutes`,
  //         `Fee reserved: $${feeAmount.toFixed(2)}`,
  //         ``,
  //         `Open the Vero app to begin re-verification.`,
  //       ].join('\n'),
  //     }),
  //   })
  // }

  // ── SMS to Inspector via Twilio ────────────────────────────────────────────
  // Uncomment and set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER to enable.
  // You will also need to look up the inspector's phone from the `profiles` table.
  //
  // if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
  //   const inspectorPhone = '...' // look up from profiles WHERE supabase_id = inspectorId
  //   const creds = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')
  //   await fetch(
  //     `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
  //     {
  //       method: 'POST',
  //       headers: {
  //         Authorization: `Basic ${creds}`,
  //         'Content-Type': 'application/x-www-form-urlencoded',
  //       },
  //       body: new URLSearchParams({
  //         From: process.env.TWILIO_FROM_NUMBER,
  //         To: inspectorPhone,
  //         Body: `Action Required: Builder accepted hold terms. Re-verification is now authorized. Open the Vero app to begin.`,
  //       }).toString(),
  //     },
  //   )
  // }

  // ── Email to Builder via Resend ────────────────────────────────────────────
  // Builder notification for when an inspector places a hold (send at hold creation, not here).
  // Wire this into the placeHold() flow using the same pattern above.

  return NextResponse.json({ sent: true })
}
