import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { toE164 } from './phone'
import { sendVeroSms } from './sendVeroSms'

const SRC = fileURLToPath(new URL('../..', import.meta.url))
function read(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), 'utf8')
}

const HOLD_ISSUED_ROUTE = 'app/api/notifications/hold-issued/route.ts'
const HOLD_ACCEPTED_ROUTE = 'app/api/notifications/hold-accepted/route.ts'
const HOLDS = 'lib/supabase/holds.ts'

// ===========================================================================
// Phone normalization (E.164)
// ===========================================================================

test('toE164 normalizes a 10-digit Canada/US number with +1', () => {
  assert.deepEqual(toE164('604-555-0100'), { ok: true, e164: '+16045550100' })
  assert.deepEqual(toE164('6045550100'), { ok: true, e164: '+16045550100' })
})

test('toE164 normalizes an 11-digit number beginning with 1', () => {
  assert.deepEqual(toE164('1 604 555 0100'), { ok: true, e164: '+16045550100' })
  assert.deepEqual(toE164('16045550100'), { ok: true, e164: '+16045550100' })
})

test('toE164 preserves a valid E.164 number', () => {
  assert.deepEqual(toE164('+16045550100'), { ok: true, e164: '+16045550100' })
  assert.deepEqual(toE164('+447911123456'), { ok: true, e164: '+447911123456' })
})

test('toE164 reports missing for empty / non-string input', () => {
  assert.deepEqual(toE164(''), { ok: false, reason: 'missing' })
  assert.deepEqual(toE164('   '), { ok: false, reason: 'missing' })
  assert.deepEqual(toE164(null), { ok: false, reason: 'missing' })
  assert.deepEqual(toE164(undefined), { ok: false, reason: 'missing' })
})

test('toE164 rejects unusable numbers', () => {
  assert.deepEqual(toE164('12345'), { ok: false, reason: 'unusable' })
  assert.deepEqual(toE164('604555010'), { ok: false, reason: 'unusable' })
  assert.deepEqual(toE164('+12'), { ok: false, reason: 'unusable' })
})

// ===========================================================================
// SMS helper env guard — never throws on missing config, never false success
// ===========================================================================

test('sendVeroSms returns missing_config (not a throw) when TWILIO_* is unset', async () => {
  const saved = {
    sid: process.env.TWILIO_ACCOUNT_SID,
    token: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_FROM_NUMBER,
  }
  delete process.env.TWILIO_ACCOUNT_SID
  delete process.env.TWILIO_AUTH_TOKEN
  delete process.env.TWILIO_FROM_NUMBER
  try {
    const result = await sendVeroSms({ to: '+16045550100', body: 'test' })
    assert.equal(result.ok, false)
    assert.equal(result.ok === false && result.code, 'missing_config')
  } finally {
    if (saved.sid !== undefined) process.env.TWILIO_ACCOUNT_SID = saved.sid
    if (saved.token !== undefined) process.env.TWILIO_AUTH_TOKEN = saved.token
    if (saved.from !== undefined) process.env.TWILIO_FROM_NUMBER = saved.from
  }
})

test('sendVeroSms returns invalid_recipient for an empty phone (config present)', async () => {
  const saved = {
    sid: process.env.TWILIO_ACCOUNT_SID,
    token: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_FROM_NUMBER,
  }
  process.env.TWILIO_ACCOUNT_SID = 'AC_test'
  process.env.TWILIO_AUTH_TOKEN = 'token_test'
  process.env.TWILIO_FROM_NUMBER = '+15005550006'
  try {
    const result = await sendVeroSms({ to: '   ', body: 'test' })
    assert.equal(result.ok, false)
    assert.equal(result.ok === false && result.code, 'invalid_recipient')
  } finally {
    if (saved.sid === undefined) delete process.env.TWILIO_ACCOUNT_SID
    else process.env.TWILIO_ACCOUNT_SID = saved.sid
    if (saved.token === undefined) delete process.env.TWILIO_AUTH_TOKEN
    else process.env.TWILIO_AUTH_TOKEN = saved.token
    if (saved.from === undefined) delete process.env.TWILIO_FROM_NUMBER
    else process.env.TWILIO_FROM_NUMBER = saved.from
  }
})

// ===========================================================================
// hold-issued route — builder SMS first, email supporting, per-channel result
// ===========================================================================

test('hold-issued route sends builder SMS first and email second', () => {
  const source = read(HOLD_ISSUED_ROUTE)
  assert.ok(source.includes("from '@/lib/sms/sendVeroSms'"), 'must import sendVeroSms')
  assert.ok(source.includes("from '@/lib/sms/phone'"), 'must import the phone normalizer')
  assert.ok(source.includes("from '@/lib/email/sendVeroEmail'"), 'must import sendVeroEmail')
  assert.ok(source.includes('sendVeroSms('), 'must send SMS')
  assert.ok(source.includes("eventKey: 'hold.issued_builder_notice'"), 'must use the builder hold email template')
  // SMS branch appears before the email branch (SMS-first).
  assert.ok(source.indexOf('sendVeroSms(') < source.indexOf('sendVeroEmail('), 'SMS must be attempted before email')
})

test('hold-issued route returns per-channel status, never unconditional sent:true', () => {
  const source = read(HOLD_ISSUED_ROUTE)
  assert.ok(source.includes('smsSent'), 'must return smsSent')
  assert.ok(source.includes('emailSent'), 'must return emailSent')
  assert.ok(!/NextResponse\.json\(\{\s*sent:\s*true/.test(source), 'no unconditional { sent: true } response')
})

test('hold-issued route allows email fallback when phone is missing', () => {
  const source = read(HOLD_ISSUED_ROUTE)
  // A failed/missing phone records a skip reason but does not gate the email send.
  assert.ok(source.includes("skipped.sms = normalized.reason === 'missing' ? 'no_phone' : 'unusable_phone'"),
    'missing/unusable phone must be recorded as a skip reason, not block email')
})

// ===========================================================================
// hold-accepted / correction-ready route — inspector SMS first, email second
// ===========================================================================

test('hold-accepted route sends inspector SMS first and email second', () => {
  const source = read(HOLD_ACCEPTED_ROUTE)
  assert.ok(source.includes("from '@/lib/sms/sendVeroSms'"), 'must import sendVeroSms')
  assert.ok(source.includes('sendVeroSms('), 'must send SMS')
  assert.ok(source.includes("eventKey: 'hold.response_submitted_inspector_notice'"), 'must use the inspector hold response template')
  assert.ok(source.indexOf('sendVeroSms(') < source.indexOf('sendVeroEmail('), 'SMS must be attempted before email')
})

test('hold-accepted route distinguishes acknowledged vs correction_ready SMS copy', () => {
  const source = read(HOLD_ACCEPTED_ROUTE)
  // correction_ready → "ready for re-check"
  assert.ok(
    source.includes("notificationType === 'correction_ready'"),
    'SMS copy must branch on the correction_ready notification type',
  )
  assert.ok(
    source.includes('marked the same-day correction ready for re-check'),
    'correction_ready copy must say ready for re-check',
  )
  // acknowledged (default) → review Hold status, NOT re-check
  assert.ok(
    source.includes('The builder acknowledged the same-day correction at'),
    'acknowledged copy must be present',
  )
  assert.ok(
    source.includes('Open Vero Permit to review the Hold status before leaving the site.'),
    'acknowledged copy must point to Hold status review, not re-check',
  )
  // Default is the acknowledgement (acceptance) wording.
  assert.ok(
    source.includes("body.notificationType === 'correction_ready' ? 'correction_ready' : 'acknowledged'"),
    'notificationType must default to acknowledged',
  )
})

test('inspector acknowledged notification is payment-gated; review-ready stays correction_ready', () => {
  const source = read(HOLDS)
  const approveIdx = source.indexOf('export async function builderApproveHold')
  const reviewIdx = source.indexOf('export async function requestOnSiteCorrectionReview')
  assert.ok(approveIdx !== -1 && reviewIdx !== -1, 'both callers must exist')
  const approveBody = source.slice(approveIdx, reviewIdx)
  const reviewBody = source.slice(reviewIdx, reviewIdx + 1700)
  // builderApproveHold must NOT notify the inspector — there is no payment yet.
  assert.ok(!approveBody.includes('/api/notifications/hold-accepted'), 'builderApproveHold must not notify the inspector before payment')
  assert.ok(!approveBody.includes('notificationType'), 'builderApproveHold must send no inspector notification')
  // The acknowledged inspector notification now fires only after webhook-confirmed payment.
  const confirm = read('lib/payments/confirmHoldPayment.ts')
  assert.ok(confirm.includes("notificationType: 'acknowledged'"), 'confirmHoldPayment must send acknowledged after payment')
  assert.ok(confirm.includes('/api/notifications/hold-accepted'), 'confirmHoldPayment must call the inspector notification route')
  // The separate on-site review-ready flow is unchanged.
  assert.ok(reviewBody.includes("notificationType: 'correction_ready'"), 'review-ready must send correction_ready')
})

test('hold-accepted route returns per-channel status, never unconditional sent:true', () => {
  const source = read(HOLD_ACCEPTED_ROUTE)
  assert.ok(source.includes('smsSent'), 'must return smsSent')
  assert.ok(source.includes('emailSent'), 'must return emailSent')
  assert.ok(!/NextResponse\.json\(\{\s*sent:\s*true/.test(source), 'old unconditional { sent: true } response must be gone')
})

// ===========================================================================
// Hold flow wiring
// ===========================================================================

test('placeHold flow fires the hold-issued notification', () => {
  const source = read(HOLDS)
  assert.ok(source.includes("fetch('/api/notifications/hold-issued'"), 'builder notification must be wired into the hold-placement flow')
})

test('on-site correction review fires the inspector hold-accepted notification', () => {
  const source = read(HOLDS)
  const idx = source.indexOf('export async function requestOnSiteCorrectionReview')
  assert.ok(idx !== -1, 'requestOnSiteCorrectionReview must exist')
  const body = source.slice(idx, idx + 1600)
  assert.ok(body.includes("fetch('/api/notifications/hold-accepted'"), 'review-ready must notify the inspector')
})

// ===========================================================================
// Negative guard — notification routes stay notifications-only
// ===========================================================================

test('notification routes do not touch escrow / payout / refund / stage / schema', () => {
  for (const routePath of [HOLD_ISSUED_ROUTE, HOLD_ACCEPTED_ROUTE]) {
    const source = read(routePath)
    for (const forbidden of ['escrow', 'payout', 'refund', 'stage_advance', 'migration', 'earned_pending_review']) {
      assert.ok(!source.includes(forbidden), `${routePath} must not reference "${forbidden}"`)
    }
  }
})
