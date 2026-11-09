/**
 * Transactional email via Resend.
 * Server-only — never import this module in client components.
 */
import { Resend } from 'resend'
import { resolveTxt } from 'node:dns/promises'

const FROM = 'Vero Permit <admin@veropermit.com>'
const MAIL_DOMAIN = process.env.EMAIL_DOMAIN ?? 'veropermit.com'

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

async function readTxt(name: string): Promise<string[]> {
  try {
    return (await resolveTxt(name)).map(record => record.join(''))
  } catch {
    return []
  }
}

export async function verifyEmailDns(domain = MAIL_DOMAIN): Promise<{
  domain: string
  spf: boolean
  dkim: boolean
  dmarc: boolean
  records: {
    spf: string[]
    dkim: string[]
    dmarc: string[]
  }
}> {
  const [rootTxt, dmarcTxt, resendDkimTxt, selector1DkimTxt, selector2DkimTxt] = await Promise.all([
    readTxt(domain),
    readTxt(`_dmarc.${domain}`),
    readTxt(`resend._domainkey.${domain}`),
    readTxt(`selector1._domainkey.${domain}`),
    readTxt(`selector2._domainkey.${domain}`),
  ])

  const dkimTxt = [...resendDkimTxt, ...selector1DkimTxt, ...selector2DkimTxt]

  return {
    domain,
    spf: rootTxt.some(record => record.toLowerCase().startsWith('v=spf1')),
    dkim: dkimTxt.length > 0,
    dmarc: dmarcTxt.some(record => record.toLowerCase().startsWith('v=dmarc1')),
    records: {
      spf: rootTxt.filter(record => record.toLowerCase().startsWith('v=spf1')),
      dkim: dkimTxt,
      dmarc: dmarcTxt.filter(record => record.toLowerCase().startsWith('v=dmarc1')),
    },
  }
}

// ─── Application Received ─────────────────────────────────────────────────────

export async function sendApplicationReceived(options: {
  to: string
  inspectorName: string
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getClient()
  if (!resend) {
    console.warn('[mail] sendApplicationReceived: RESEND_API_KEY not set — skipping')
    return { ok: false, error: 'Email not configured' }
  }

  const { to, inspectorName } = options
  const firstName = inspectorName.split(' ')[0] || inspectorName

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #111; padding: 28px 32px; border-radius: 16px 16px 0 0;">
        <p style="color: #f97316; font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin: 0;">Vero Permit</p>
      </div>
      <div style="background: #fafafa; border: 1px solid #e5e5e5; border-top: none; padding: 32px; border-radius: 0 0 16px 16px;">
        <h1 style="font-size: 22px; font-weight: 800; color: #111; margin: 0 0 16px;">Application Received</h1>
        <p style="font-size: 15px; color: #444; line-height: 1.6; margin: 0 0 16px;">Hi ${firstName},</p>
        <p style="font-size: 15px; color: #444; line-height: 1.6; margin: 0 0 24px;">
          Thank you for submitting your inspector application to Vero Permit. We have received your credentials and documents and our team will begin reviewing them shortly.
        </p>
        <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 20px 24px; margin: 0 0 24px;">
          <p style="font-size: 12px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 10px;">What happens next</p>
          <ul style="font-size: 14px; color: #444; line-height: 1.7; margin: 0; padding: 0 0 0 20px;">
            <li>Your credentials are under review by the Vero team</li>
            <li>Expect a decision within <strong>1–2 business days</strong></li>
            <li>You will receive an email once your application is approved or if we need additional information</li>
          </ul>
        </div>
        <p style="font-size: 13px; color: #888; line-height: 1.6; margin: 0;">
          Questions? Reply to this email or contact <a href="mailto:admin@veropermit.com" style="color: #f97316;">admin@veropermit.com</a>.
        </p>
      </div>
      <p style="font-size: 11px; color: #aaa; text-align: center; margin: 20px 0 0;">
        Vero Permit &middot; British Columbia, Canada
      </p>
    </div>
  `

  const text = [
    `Hi ${firstName},`,
    ``,
    `Thank you for submitting your inspector application to Vero Permit. We have received your credentials and documents and our team will begin reviewing them shortly.`,
    ``,
    `What happens next:`,
    `- Your credentials are under review by the Vero team`,
    `- Expect a decision within 1-2 business days`,
    `- You will receive an email once your application is approved or if we need additional information`,
    ``,
    `Questions? Contact admin@veropermit.com`,
    ``,
    `Vero Permit · British Columbia, Canada`,
  ].join('\n')

  const { error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject: 'Your Vero Permit Application Has Been Received',
    html,
    text,
  })

  if (error) {
    console.error('[mail] sendApplicationReceived failed:', error)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

// ─── Application Status ───────────────────────────────────────────────────────

export async function sendApplicationStatus(options: {
  to: string
  inspectorName: string
  status: 'approved' | 'needs_info' | 'rejected'
  reviewerNote?: string
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getClient()
  if (!resend) {
    console.warn('[mail] sendApplicationStatus: RESEND_API_KEY not set — skipping')
    return { ok: false, error: 'Email not configured' }
  }

  const { to, inspectorName, status, reviewerNote } = options
  const firstName = inspectorName.split(' ')[0] || inspectorName
  const headline = status === 'approved'
    ? 'Your Vero inspector profile is approved'
    : status === 'needs_info'
      ? 'Vero needs more information'
      : 'Your Vero inspector application was not approved'
  const body = status === 'approved'
    ? 'You can now sign in to Vero and access the Live Board for eligible inspection requests.'
    : status === 'needs_info'
      ? 'Our review team needs additional information before your profile can be approved.'
      : 'After review, Vero is unable to approve your inspector profile at this time.'

  const safeReviewerNote = reviewerNote ? escapeHtml(reviewerNote) : undefined
  const noteHtml = safeReviewerNote
    ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;margin:20px 0;color:#7c2d12;font-size:14px;line-height:1.6;"><strong>Reviewer note:</strong><br>${safeReviewerNote}</div>`
    : ''

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">
      <div style="background:#0A192F;padding:28px 32px;border-radius:14px 14px 0 0;">
        <p style="color:#FF5F15;font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;margin:0;">Vero Permit</p>
      </div>
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;padding:32px;border-radius:0 0 14px 14px;">
        <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 16px;">${headline}</h1>
        <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 16px;">Hi ${firstName},</p>
        <p style="font-size:15px;color:#475569;line-height:1.6;margin:0;">${body}</p>
        ${noteHtml}
        <p style="font-size:13px;color:#64748b;line-height:1.6;margin:24px 0 0;">Questions? Reply to this email or contact <a href="mailto:admin@veropermit.com" style="color:#FF5F15;">admin@veropermit.com</a>.</p>
      </div>
      <p style="font-size:11px;color:#94a3b8;text-align:center;margin:18px 0 0;">Vero Permit &middot; British Columbia, Canada</p>
    </div>
  `

  const text = [
    `Hi ${firstName},`,
    ``,
    headline,
    body,
    reviewerNote ? `Reviewer note: ${reviewerNote}` : '',
    ``,
    `Questions? Contact admin@veropermit.com`,
    ``,
    `Vero Permit · British Columbia, Canada`,
  ].filter(Boolean).join('\n')

  const { error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject: headline,
    html,
    text,
  })

  if (error) {
    console.error('[mail] sendApplicationStatus failed:', error)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
