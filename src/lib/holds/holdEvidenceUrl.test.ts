import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

// Source-assertion tests for Item 1: builder-openable Hold evidence via a
// server-authorized, short-lived signed URL. Display/security only — no
// payment, Stripe, webhook, schema, payout, stage, or report logic is touched.

const SRC = fileURLToPath(new URL('../..', import.meta.url))
function read(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), 'utf8')
}

const EVIDENCE_ROUTE = 'app/api/builder/holds/evidence-url/route.ts'
const BUILDER_PAGE = 'app/builder/page.tsx'

// ===========================================================================
// Builder UI — evidence rows are clickable/openable
// ===========================================================================

test('builder evidence rows expose an Open affordance wired to the evidence route', () => {
  const source = read(BUILDER_PAGE)
  assert.ok(source.includes('handleOpenHoldEvidence'), 'must have an evidence-open handler')
  assert.ok(source.includes('/api/builder/holds/evidence-url'), 'handler must call the signed-url route')
  assert.ok(source.includes('Open photo'), 'must show a clear Open affordance')
  // The link opens in a preview-safe new tab.
  assert.ok(source.includes("window.open(data.url as string, '_blank', 'noopener,noreferrer')"), 'must open the signed URL safely in a new tab')
  // Only a real file (storagePath present) gets an Open button.
  assert.ok(source.includes('evidence.storagePath &&'), 'Open button must be gated on a viewable file')
})

test('builder evidence handler sends only an evidenceId — never a storage path or amount', () => {
  const source = read(BUILDER_PAGE)
  const start = source.indexOf('const handleOpenHoldEvidence')
  const end = source.indexOf('const handleApproveHold')
  assert.ok(start !== -1 && end !== -1 && start < end, 'handler boundaries must exist')
  const body = source.slice(start, end)
  assert.ok(body.includes('JSON.stringify({ evidenceId })'), 'handler must post only the evidenceId')
  assert.ok(!/storage/i.test(body), 'handler must not send a storage path')
  // The evidence handler must not touch payment/Hold-state logic.
  for (const forbidden of ['hold_payment_status', 'builderApproveHold', 'feeAmount', 'checkout']) {
    assert.ok(!body.includes(forbidden), `evidence handler must not reference "${forbidden}"`)
  }
})

// ===========================================================================
// Server route — authentication + authorization
// ===========================================================================

test('evidence route requires an authenticated builder session', () => {
  const source = read(EVIDENCE_ROUTE)
  assert.ok(source.includes('auth.getUser()'), 'must read the authenticated user')
  assert.ok(source.includes("'Not authenticated.'"), 'must reject unauthenticated callers')
  assert.ok(source.includes('status: 401'), 'unauthenticated must be 401')
})

test('evidence route verifies the builder owns the Hold', () => {
  const source = read(EVIDENCE_ROUTE)
  assert.ok(source.includes('hold.builder_id !== user.id'), 'must check Hold ownership against the session user')
  assert.ok(source.includes('status: 403'), 'non-owner must get 403')
})

test('evidence route resolves the path server-side and confirms evidence belongs to the Hold', () => {
  const source = read(EVIDENCE_ROUTE)
  // Body carries only an evidenceId; the storage path is resolved from the DB.
  assert.ok(source.includes('body.evidenceId') || source.includes('{ evidenceId?: unknown }'), 'body must carry only an evidenceId')
  assert.ok(!/body\.\s*storage/i.test(source), 'must never trust a browser-supplied storage path')
  // The evidence row provides hold_id, which is then used to look up the Hold owner.
  assert.ok(source.includes("from('job_hold_evidence')"), 'must read the evidence row')
  assert.ok(source.includes("select('id, hold_id, storage_path')"), 'must resolve hold_id and storage_path from the evidence row')
  assert.ok(source.includes("from('job_holds')"), 'must look up the parent Hold')
  assert.ok(source.includes('.eq(\'id\', holdId)'), 'Hold lookup must use the hold_id resolved from the evidence row')
})

test('evidence route signs from the inspection-evidence bucket with a short TTL', () => {
  const source = read(EVIDENCE_ROUTE)
  assert.ok(source.includes("'inspection-evidence'"), 'must use the inspection-evidence bucket')
  assert.ok(source.includes('createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)'), 'must mint a signed URL from the resolved path')
  assert.ok(source.includes('const SIGNED_URL_TTL_SECONDS = 300'), 'signed URL must be short-lived')
})

// ===========================================================================
// Negative guard — no out-of-scope logic touched
// ===========================================================================

test('evidence route touches no payment / Stripe / webhook / schema / payout / stage / report logic', () => {
  const source = read(EVIDENCE_ROUTE)
  for (const forbidden of [
    'confirmHoldPayment', 'hold_payment_status', 'hold_cap_amount', 'checkout',
    'webhook', 'stripe', 'payout', 'stage_advance', 'report_submission', 'reinspection', 'migration',
  ]) {
    assert.ok(!source.toLowerCase().includes(forbidden.toLowerCase()), `evidence route must not reference "${forbidden}"`)
  }
})
