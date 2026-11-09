import { Resend } from 'resend'

export const VERO_EMAIL_FROM = 'Vero Permit <notifications@veropermit.com>'
export const VERO_EMAIL_REPLY_TO = 'admin@veropermit.com'
export const VERO_ADMIN_EMAIL = 'admin@veropermit.com'

export type ResendClientResult =
  | {
      ok: true
      client: Resend
    }
  | {
      ok: false
      code: 'missing_api_key'
      error: string
    }

export function getResendClient(): ResendClientResult {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    const error = 'RESEND_API_KEY is not configured.'
    console.warn(`[email] ${error} Skipping outbound email.`)
    return { ok: false, code: 'missing_api_key', error }
  }

  return { ok: true, client: new Resend(apiKey) }
}
