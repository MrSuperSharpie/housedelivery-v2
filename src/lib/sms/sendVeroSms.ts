// Server-only SMS sender for Vero Permit notifications (Twilio REST API).
//
// Env-guarded by design: when TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN /
// TWILIO_FROM_NUMBER are not all present, this returns a typed failure result
// instead of throwing. Callers branch on `ok` and must never report a false
// success. Mirrors the contract of sendVeroEmail.

export type VeroSmsSendResult =
  | { ok: true; sid?: string }
  | {
      ok: false
      code: 'missing_config' | 'invalid_recipient' | 'send_failed' | 'unexpected_error'
      error: string
    }

type TwilioConfig = {
  accountSid: string
  authToken: string
  fromNumber: string
}

function getTwilioConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_FROM_NUMBER
  if (!accountSid || !authToken || !fromNumber) return null
  return { accountSid, authToken, fromNumber }
}

export async function sendVeroSms(input: { to: string; body: string }): Promise<VeroSmsSendResult> {
  const config = getTwilioConfig()
  if (!config) {
    const error = 'TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER are not configured.'
    console.warn(`[sms] ${error} Skipping outbound SMS.`)
    return { ok: false, code: 'missing_config', error }
  }

  const to = typeof input.to === 'string' ? input.to.trim() : ''
  if (!to) {
    return { ok: false, code: 'invalid_recipient', error: 'No recipient phone number provided.' }
  }

  try {
    const creds = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${creds}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: config.fromNumber,
          To: to,
          Body: input.body,
        }).toString(),
      },
    )

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.warn(`[sms] Twilio send failed (${response.status}): ${detail}`)
      return { ok: false, code: 'send_failed', error: `Twilio responded ${response.status}` }
    }

    const data = (await response.json().catch(() => null)) as { sid?: string } | null
    return { ok: true, sid: data?.sid }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected SMS send error.'
    console.warn(`[sms] Unexpected failure sending SMS: ${message}`)
    return { ok: false, code: 'unexpected_error', error: message }
  }
}
