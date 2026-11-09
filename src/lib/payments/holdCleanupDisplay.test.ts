import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

// Source-assertion tests for the Hold cleanup pass (Items 2-5): inspector alert
// copy, Hold payment-success copy, builder fee-breakdown clarity, and the
// correction-window display. These are display/copy changes only — the charged
// amount must still come from the server-side Hold record.

const SRC = fileURLToPath(new URL('../..', import.meta.url))
function read(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), 'utf8')
}

const INSPECTOR_WS = 'components/inspector/InspectorCompletionWorkspace.tsx'
const PAYMENT_SUCCESS = 'app/builder/payment-success/page.tsx'
const PAYMENT_SUCCESS_CTA = 'app/builder/payment-success/PaymentSuccessCta.tsx'
const BUILDER_PAGE = 'app/builder/page.tsx'
const HOLD_CHECKOUT = 'app/api/builder/payments/hold-checkout/route.ts'

// ===========================================================================
// Item 4 — inspector Hold alert copy
// ===========================================================================

test('inspector hold alert references the same-day correction request, not stop conditions', () => {
  const source = read(INSPECTOR_WS)
  assert.ok(
    source.includes('The builder has been notified of the same-day correction request.'),
    'alert must use same-day correction request wording',
  )
  assert.ok(!source.includes('critical stop conditions'), 'stale "critical stop conditions" copy must be gone')
})

// ===========================================================================
// Item 3 — Hold payment-success copy
// ===========================================================================

test('payment-success reads the hold param and branches on it', () => {
  const source = read(PAYMENT_SUCCESS)
  assert.ok(source.includes('hold?: string'), 'must accept a hold query param')
  assert.ok(source.includes('const isHoldPayment = holdReference.length > 0'), 'must branch on the hold param')
})

test('payment-success shows Hold-specific copy for a hold payment', () => {
  const source = read(PAYMENT_SUCCESS)
  assert.ok(source.includes('Your same-day correction window has been reserved.'), 'must confirm the reserved window')
  assert.ok(source.includes('Re-verification is pending'), 'must state re-verification is pending')
})

test('payment-success keeps the job/live-board copy for inspection-request payments', () => {
  const source = read(PAYMENT_SUCCESS)
  assert.ok(
    source.includes('Your inspection request is being posted to the Vero live board.'),
    'job-dispatch payment copy must remain for non-hold payments',
  )
})

// ===========================================================================
// CTA wording — Hold payments must not imply re-authentication
// ===========================================================================

test('payment-success passes isHoldPayment to the CTA component', () => {
  const source = read(PAYMENT_SUCCESS)
  assert.ok(
    source.includes('isHoldPayment={isHoldPayment}'),
    'page must forward isHoldPayment to the CTA so it can choose the right wording',
  )
})

test('CTA component accepts an isHoldPayment prop', () => {
  const source = read(PAYMENT_SUCCESS_CTA)
  assert.ok(source.includes('isHoldPayment'), 'CTA must accept the isHoldPayment prop')
})

test('CTA uses Return wording for Hold payments and does not show Sign-in wording for Hold', () => {
  const source = read(PAYMENT_SUCCESS_CTA)
  // The "Return" label must be present and gated on isHoldPayment.
  assert.ok(
    source.includes("isHoldPayment ? 'Return'"),
    'must render Return label for Hold payments',
  )
  // The static "Sign in to Builder" copy must never appear unconditionally —
  // it must only appear in the non-Hold branch of the ternary.
  // We confirm the ternary is used (not a static string) for the signed-out path.
  assert.ok(
    !source.includes("'Sign in to Builder'"),
    'Sign-in wording must not appear as a static string (must be inside ternary)',
  )
})

// ===========================================================================
// Item 5 — fee-breakdown label cleanup
// ===========================================================================

test('builder fee breakdown is clear: base, reserved window, total due', () => {
  const source = read(BUILDER_PAGE)
  assert.ok(source.includes('Base Hold Review Fee'), 'must show the base fee line')
  assert.ok(source.includes('Reserved Correction Window ('), 'must show the reserved window line')
  assert.ok(source.includes('Total Due'), 'must show a Total Due line')
  // The confusing/duplicative labels must be gone.
  assert.ok(!source.includes('Recorded Hold Cap'), 'the confusing Recorded Hold Cap line must be removed')
  assert.ok(!source.includes('Total at Acceptance'), 'the Total at Acceptance label must be replaced by Total Due')
})

// ===========================================================================
// Item 2 — correction-window display clarity
// ===========================================================================

test('builder window selector visibly reflects the selected window', () => {
  const source = read(BUILDER_PAGE)
  // A live indicator in the selector header and the helper text both reflect the
  // selected window; the breakdown line already binds to {selectedWindow}.
  assert.ok(source.includes('{selectedWindow} min selected'), 'selector header must show the selected window')
  assert.ok(source.includes('Reserved correction window: {selectedWindow} min'), 'helper text must reflect the selected window')
  assert.ok(source.includes('Reserved Correction Window ({selectedWindow} min @ 1.5×)'), 'fee line must reflect the selected window')
  // Selected button highlight is driven by the live selected window.
  assert.ok(source.includes('selectedWindow === minutes'), 'selected button must be driven by the selected window')
})

// ===========================================================================
// Negative guard — display changes never introduce a client-supplied amount
// ===========================================================================

test('hold checkout amount stays server-derived — the dashboard sends only holdId', () => {
  const builder = read(BUILDER_PAGE)
  // The approve flow posts only the holdId to checkout; no amount/fee/cap is sent.
  assert.ok(builder.includes("body: JSON.stringify({ holdId: hold.id })"), 'checkout request body must be holdId only')
  const approveIdx = builder.indexOf('const handleApproveHold')
  const approveBody = builder.slice(approveIdx, approveIdx + 1600)
  assert.ok(!/body:\s*JSON\.stringify\(\{[^}]*amount/i.test(approveBody), 'approve flow must not send an amount')
  assert.ok(!/body:\s*JSON\.stringify\(\{[^}]*feeAmount/i.test(approveBody), 'approve flow must not send a feeAmount')
  assert.ok(!/body:\s*JSON\.stringify\(\{[^}]*holdCapAmount/i.test(approveBody), 'approve flow must not send a cap')

  // The route still derives the charged amount from the Hold row server-side.
  const route = read(HOLD_CHECKOUT)
  assert.ok(route.includes('const amount = typeof hold.hold_cap_amount'), 'route amount must come from hold_cap_amount')
  assert.ok(!/body\.\s*amount/.test(route), 'route must never read an amount from the request body')
})
