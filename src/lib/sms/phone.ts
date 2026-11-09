// E.164 phone normalization for outbound SMS (Twilio).
//
// Vero Permit's market is Canada/US, so bare 10-digit numbers and 11-digit
// numbers beginning with 1 default to the +1 country code. Already-valid
// E.164 numbers are preserved. Anything that cannot be confidently normalized
// is treated as unusable so a malformed number is never handed to Twilio.
//
// This module is normalize-only for send time. It must NOT write phone numbers
// back to the database.

export type NormalizedPhone =
  | { ok: true; e164: string }
  | { ok: false; reason: 'missing' | 'unusable' }

export function toE164(value: unknown): NormalizedPhone {
  if (typeof value !== 'string') return { ok: false, reason: 'missing' }

  const trimmed = value.trim()
  if (!trimmed) return { ok: false, reason: 'missing' }

  // Preserve an already-valid E.164 number: '+' followed by 7–15 digits.
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '')
    if (digits.length >= 7 && digits.length <= 15) return { ok: true, e164: `+${digits}` }
    return { ok: false, reason: 'unusable' }
  }

  const digits = trimmed.replace(/\D/g, '')

  // Bare 10-digit Canada/US number → prepend +1.
  if (digits.length === 10) return { ok: true, e164: `+1${digits}` }

  // 11-digit number beginning with 1 → +1XXXXXXXXXX.
  if (digits.length === 11 && digits.startsWith('1')) return { ok: true, e164: `+${digits}` }

  return { ok: false, reason: 'unusable' }
}
