import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

// Source-assertion tests for the Hold / Same-Day Correction payment gate.
// Rule: no Hold becomes active, fee-locked, or inspector re-check ready until
// Stripe payment is confirmed server-side by the verified webhook.

const SRC = fileURLToPath(new URL('../..', import.meta.url))
function read(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), 'utf8')
}

const HOLD_CHECKOUT = 'app/api/builder/payments/hold-checkout/route.ts'
const CONFIRM_HOLD = 'lib/payments/confirmHoldPayment.ts'
const WEBHOOK = 'app/api/stripe/webhook/route.ts'
const HOLDS = 'lib/supabase/holds.ts'
const BUILDER_PAGE = 'app/builder/page.tsx'
const MIGRATION = '../supabase/migrations/20260622000000_hold_payment_gate.sql'

// ===========================================================================
// Migration — additive payment fields, no status change
// ===========================================================================

test('migration adds payment fields and a payment-status CHECK without touching status', () => {
  const sql = read(MIGRATION)
  assert.ok(sql.includes('hold_payment_status text not null default \'unpaid\''), 'adds hold_payment_status')
  assert.ok(sql.includes('stripe_checkout_session_id text'), 'adds stripe_checkout_session_id')
  assert.ok(sql.includes('stripe_payment_intent_id text'), 'adds stripe_payment_intent_id')
  assert.ok(sql.includes('hold_paid_at timestamptz'), 'adds hold_paid_at')
  assert.ok(sql.includes("check (hold_payment_status in ('unpaid', 'paid', 'failed', 'cancelled'))"), 'constrains payment status')
  // Must NOT alter the workflow status column or redefine its CHECK constraint.
  assert.ok(!/alter\s+column\s+status/i.test(sql), 'must not alter the status column')
  assert.ok(!/\bjob_holds_status_check\b/i.test(sql), 'must not touch the status CHECK constraint')
  assert.ok(!/\(\s*status\s+in\b/i.test(sql), 'must not redefine the status enum')
})

// ===========================================================================
// Hold checkout route — auth, ownership, server-side amount
// ===========================================================================

test('hold checkout requires authentication', () => {
  const source = read(HOLD_CHECKOUT)
  assert.ok(source.includes('auth.getUser()'), 'must read the authenticated user')
  assert.ok(source.includes("'Not authenticated.'"), 'must reject unauthenticated callers')
})

test('hold checkout rejects a non-owner builder', () => {
  const source = read(HOLD_CHECKOUT)
  assert.ok(source.includes('hold.builder_id !== user.id'), 'must check Hold ownership against the session user')
  assert.ok(source.includes('status: 403'), 'non-owner must get 403')
})

test('hold checkout derives the amount server-side from hold_cap_amount', () => {
  const source = read(HOLD_CHECKOUT)
  assert.ok(source.includes("'hold_cap_amount'") || source.includes('hold_cap_amount'), 'must select hold_cap_amount')
  assert.ok(source.includes('const amount = typeof hold.hold_cap_amount'), 'amount must come from the Hold row')
  assert.ok(source.includes('Math.round(amount * 100)'), 'unit amount must be derived from the server amount')
})

test('hold checkout ignores any browser-supplied amount', () => {
  const source = read(HOLD_CHECKOUT)
  // The request body type only carries holdId.
  assert.ok(source.includes('body: { holdId?: unknown }') || source.includes('{ holdId?: unknown }'), 'body must only accept holdId')
  assert.ok(!/body\.\s*amount/.test(source), 'must never read an amount from the body')
  assert.ok(!/body\.\s*holdCapAmount/.test(source), 'must never read a cap from the body')
})

test('hold checkout rejects non-actionable (active/resolved/declined/expired) holds', () => {
  const source = read(HOLD_CHECKOUT)
  // Raw DB status is normalized first so legacy values are gated too.
  assert.ok(source.includes('normalizeHoldStatus(hold.status)'), 'must normalize the raw Hold status')
  assert.ok(
    source.includes('HOLD_BUILDER_ACTIONABLE_STATUSES.includes(normalizedStatus)'),
    'must gate checkout on the builder-actionable status set',
  )
  assert.ok(source.includes("'This hold is not awaiting payment.'"), 'non-payable status must be rejected')
  // Only hold_offered / hold_pending_builder_ack are actionable; everything else
  // (hold_active, builder_approved, resolved/declined/expired, admin_resolved) is excluded.
  const workflow = read('lib/holds/workflow.ts')
  const setIdx = workflow.indexOf('HOLD_BUILDER_ACTIONABLE_STATUSES')
  const setBlock = workflow.slice(setIdx, setIdx + 160)
  for (const blocked of ['hold_active', 'hold_resolved_pass', 'hold_resolved_fail', 'hold_declined', 'hold_expired', 'admin_resolved']) {
    assert.ok(!setBlock.includes(blocked), `${blocked} must not be a builder-actionable (payable) status`)
  }
})

test('hold checkout carries the required metadata and does not activate the Hold', () => {
  const source = read(HOLD_CHECKOUT)
  assert.ok(source.includes("payment_kind: 'hold_reverification'"), 'metadata must mark the payment kind')
  assert.ok(source.includes('vero_hold_id: holdId'), 'metadata must carry the hold id')
  assert.ok(source.includes('vero_job_id: jobId'), 'metadata must carry the job id')
  assert.ok(source.includes('builder_id: user.id'), 'metadata must carry the builder id')
  assert.ok(source.includes('stripe_checkout_session_id'), 'must persist the checkout session id')
  // The route must not flip workflow status or payment status to paid/active.
  assert.ok(!source.includes("status: 'hold_active'"), 'checkout route must not activate the Hold')
  assert.ok(!source.includes("hold_payment_status: 'paid'"), 'checkout route must not mark the Hold paid')
})

// ===========================================================================
// confirmHoldPayment — webhook-only activation, idempotent
// ===========================================================================

test('confirmHoldPayment records payment and activates the Hold', () => {
  const source = read(CONFIRM_HOLD)
  assert.ok(source.includes("hold_payment_status: 'paid'"), 'must set payment status paid')
  assert.ok(source.includes('hold_paid_at: now'), 'must stamp hold_paid_at')
  assert.ok(source.includes('stripe_payment_intent_id: params.paymentIntentId'), 'must record the payment intent')
  assert.ok(source.includes("status: 'hold_active'"), 'must transition the Hold to active')
  assert.ok(source.includes('job_hold_retention_sessions'), 'must create/preserve the retention session')
})

test('confirmHoldPayment is idempotent — no double activation or double notify', () => {
  const source = read(CONFIRM_HOLD)
  assert.ok(
    source.includes("hold.hold_payment_status === 'paid' || hold.status === 'hold_active'"),
    'must short-circuit when already paid/active',
  )
  assert.ok(source.includes("code: 'already_paid'"), 'must report an already_paid no-op')
  // The retention upsert must be conflict-safe on hold_id.
  assert.ok(source.includes("onConflict: 'hold_id'"), 'retention session upsert must be idempotent on hold_id')
})

test('confirmHoldPayment notifies the inspector only as part of confirmation', () => {
  const source = read(CONFIRM_HOLD)
  assert.ok(source.includes('/api/notifications/hold-accepted'), 'must fire the inspector re-check notification')
  // The notification call sits after the activation write, inside this confirm path.
  assert.ok(source.indexOf("status: 'hold_active'") < source.indexOf('/api/notifications/hold-accepted'),
    'inspector notification must follow activation')
})

// ===========================================================================
// Webhook — Hold branch present, paid-gated, job flow intact
// ===========================================================================

test('webhook routes Hold payments to confirmHoldPayment', () => {
  const source = read(WEBHOOK)
  assert.ok(source.includes("from '@/lib/payments/confirmHoldPayment'"), 'must import confirmHoldPayment')
  assert.ok(source.includes("paymentKind === 'hold_reverification'") || source.includes("payment_kind"), 'must detect the hold payment kind')
  assert.ok(source.includes('confirmHoldPayment(service, {'), 'must call confirmHoldPayment')
})

test('webhook does not activate a Hold when the session is not paid', () => {
  const source = read(WEBHOOK)
  assert.ok(source.includes('hold session not paid; not activating'), 'must guard on payment_status === paid')
  // The hold branch must check payment_status before activating.
  const holdBranchIdx = source.indexOf('hold_reverification')
  const guardIdx = source.indexOf('hold session not paid; not activating')
  const confirmIdx = source.indexOf('confirmHoldPayment(service, {')
  assert.ok(holdBranchIdx !== -1 && guardIdx !== -1 && confirmIdx !== -1, 'hold branch, guard, and confirm call must all exist')
  assert.ok(guardIdx < confirmIdx, 'the not-paid guard must precede the confirm call')
})

test('webhook leaves the existing job-dispatch flow intact', () => {
  const source = read(WEBHOOK)
  assert.ok(source.includes('confirmJobPayment(service, {'), 'job-dispatch confirmation must remain')
  assert.ok(source.includes('vero_job_id'), 'job correlation key must remain')
})

// ===========================================================================
// builderApproveHold — cannot activate, cannot notify, stays unpaid
// ===========================================================================

test('builderApproveHold cannot activate a Hold', () => {
  const source = read(HOLDS)
  const approveIdx = source.indexOf('export async function builderApproveHold')
  const nextFnIdx = source.indexOf('export async function requestOnSiteCorrectionReview')
  assert.ok(approveIdx !== -1 && nextFnIdx !== -1, 'function boundaries must exist')
  const body = source.slice(approveIdx, nextFnIdx)
  assert.ok(!body.includes("status: 'hold_active'"), 'must not set hold_active')
  assert.ok(!body.includes("status: 'builder_approved'"), 'must not set the legacy active status')
  assert.ok(!body.includes('hold_started_at'), 'must not start the hold timer')
  assert.ok(!body.includes('upsertRetentionSession'), 'must not create a retention session')
  assert.ok(!body.includes('/api/notifications/hold-accepted'), 'must not notify the inspector')
})

// ===========================================================================
// Builder dashboard — payment-required CTA, no premature in-progress card
// ===========================================================================

test('builder dashboard opens Hold checkout and shows the payment-required CTA', () => {
  const source = read(BUILDER_PAGE)
  assert.ok(source.includes('/api/builder/payments/hold-checkout'), 'approve action must open Hold checkout')
  assert.ok(source.includes('Payment Required — Authorize Re-verification'), 'CTA must read Payment Required — Authorize Re-verification')
})

test('builder dashboard only shows the in-progress card for activated AND paid holds', () => {
  const source = read(BUILDER_PAGE)
  // The "Re-verification Pending / In Progress" card hydrates only from holds
  // that are hold_active AND payment-confirmed — never hold_active alone.
  assert.ok(
    source.includes("h.status === 'hold_active' && h.holdPaymentStatus === 'paid'"),
    'accepted card must require hold_active AND hold_payment_status paid',
  )
  assert.ok(!/filter\(h => h\.status === 'hold_active'\)/.test(source), 'must not hydrate from hold_active alone')
  // handleApproveHold must no longer optimistically push an accepted/in-progress card.
  const approveIdx = source.indexOf('const handleApproveHold')
  const approveBody = source.slice(approveIdx, approveIdx + 1400)
  assert.ok(!approveBody.includes('setAcceptedHolds'), 'approve handler must not optimistically show the in-progress card')
})

test('builder dashboard does not fee-lock before payment is confirmed', () => {
  const source = read(BUILDER_PAGE)
  // "Fee locked" copy lives on the accepted card, which only hydrates from
  // holds that are hold_active AND hold_payment_status 'paid'. Legacy/test holds
  // that are hold_active but default to 'unpaid' must never appear fee-locked.
  assert.ok(source.includes('Fee locked'), 'fee-locked copy exists on the accepted card')
  assert.ok(
    source.includes("h.status === 'hold_active' && h.holdPaymentStatus === 'paid'"),
    'fee-locked card must be gated on payment confirmation',
  )
})

// ===========================================================================
// Negative guard — payment gate touches no out-of-scope subsystems
// ===========================================================================

test('payment gate code does not touch payout / refund / stage / report / reinspection logic', () => {
  for (const path of [HOLD_CHECKOUT, CONFIRM_HOLD]) {
    const source = read(path)
    for (const forbidden of ['payout', 'refund', 'stage_advance', 'report_submission', 'reinspection']) {
      assert.ok(!source.includes(forbidden), `${path} must not reference "${forbidden}"`)
    }
  }
})
