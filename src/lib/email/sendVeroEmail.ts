import { VERO_EMAIL_FROM, VERO_EMAIL_REPLY_TO, getResendClient } from './resendClient'
import { renderVeroEmail } from './templates'
import type { SendVeroEmailOptions, VeroEmailSendResult } from './types'

export async function sendVeroEmail(options: SendVeroEmailOptions): Promise<VeroEmailSendResult> {
  const renderedEmail = renderVeroEmail(options)
  const resend = getResendClient()

  if (!resend.ok) {
    const result: VeroEmailSendResult = {
      ok: false,
      eventKey: options.eventKey,
      code: resend.code,
      error: resend.error,
    }

    if (options.throwOnError) {
      throw new Error(result.error)
    }

    return result
  }

  try {
    const { data, error } = await resend.client.emails.send({
      from: VERO_EMAIL_FROM,
      to: options.to,
      replyTo: VERO_EMAIL_REPLY_TO,
      subject: renderedEmail.subject,
      html: renderedEmail.html,
      text: renderedEmail.text,
    })

    if (error) {
      const result: VeroEmailSendResult = {
        ok: false,
        eventKey: options.eventKey,
        code: 'send_failed',
        error: error.message,
        providerError: error,
      }

      console.warn(`[email] Failed to send ${options.eventKey}: ${error.message}`)

      if (options.throwOnError) {
        throw new Error(result.error)
      }

      return result
    }

    return {
      ok: true,
      eventKey: options.eventKey,
      id: data?.id,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected email send error.'
    const result: VeroEmailSendResult = {
      ok: false,
      eventKey: options.eventKey,
      code: 'unexpected_error',
      error: message,
      providerError: error,
    }

    console.warn(`[email] Unexpected failure sending ${options.eventKey}: ${message}`)

    if (options.throwOnError) {
      throw error
    }

    return result
  }
}
