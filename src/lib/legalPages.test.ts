import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const SRC = fileURLToPath(new URL('..', import.meta.url))

function read(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), 'utf8')
}

const PRIVACY = 'app/privacy/page.tsx'
const TERMS = 'app/terms/page.tsx'
const SHELL = 'components/legal/LegalShell.tsx'
const MIDDLEWARE = '../middleware.ts'

// ── Public accessibility (no auth / no RoleGuard) ───────────────────────────

test('privacy and terms are not protected by the middleware matcher', () => {
  const source = read(MIDDLEWARE)
  const matcherStart = source.indexOf('matcher:')
  const matcher = source.slice(matcherStart)
  assert.ok(matcherStart !== -1, 'middleware must define a matcher')
  assert.ok(!matcher.includes('/privacy'), 'matcher must not cover /privacy')
  assert.ok(!matcher.includes('/terms'), 'matcher must not cover /terms')
})

test('legal pages do not import auth / RoleGuard', () => {
  for (const page of [PRIVACY, TERMS, SHELL]) {
    const importLines = read(page)
      .split('\n')
      .filter(l => l.trimStart().startsWith('import'))
      .join('\n')
    assert.ok(!importLines.includes('RoleGuard'), `${page} must not import RoleGuard`)
    assert.ok(!importLines.includes("from '@/lib/auth'"), `${page} must not import auth`)
  }
})

test('the legal shell renders an Effective Date label', () => {
  assert.ok(read(SHELL).includes('Effective Date'), 'shell must render the Effective Date label')
})

// ── Contact email discipline ────────────────────────────────────────────────

test('legal pages use the public compliance email and not the personal one', () => {
  for (const page of [PRIVACY, TERMS]) {
    const shell = read(SHELL)
    const source = read(page)
    assert.ok(shell.includes('admin@veropermit.com'), 'shell contact must use admin@veropermit.com')
    assert.ok(!source.includes('edavis@veropermit.com'), `${page} must not use the personal email`)
  }
  assert.ok(!read(SHELL).includes('edavis@veropermit.com'), 'shell must not use the personal email')
})

test('contact block names the operating entity and website', () => {
  const shell = read(SHELL)
  assert.ok(shell.includes('Vero Permit'), 'contact must show the public brand')
  assert.ok(shell.includes('1578295 B.C. LTD.'), 'contact must name the operating entity')
  assert.ok(shell.includes('https://veropermit.com'), 'contact must show the website')
})

// ── Privacy content ─────────────────────────────────────────────────────────

test('privacy page has the required title and operating entity', () => {
  const source = read(PRIVACY)
  assert.ok(source.includes('Vero Permit Privacy Policy'), 'title')
  assert.ok(source.includes('effectiveDate='), 'effective date prop')
  assert.ok(
    source.includes('1578295 B.C. LTD., doing business as Vero Permit'),
    'operating entity statement',
  )
})

test('privacy page documents the SMS program', () => {
  const source = read(PRIVACY)
  assert.ok(source.includes('does not use SMS for marketing'), 'no-marketing statement')
  assert.ok(source.includes('Message and data rates may apply'), 'rates disclosure')
  assert.ok(source.includes('reply STOP to opt out'), 'STOP opt-out')
  assert.ok(source.includes('reply HELP for help'), 'HELP keyword')
  assert.ok(source.includes('does not sell personal information to advertisers'), 'no-sale statement')
})

// ── Terms content ───────────────────────────────────────────────────────────

test('terms page has the required title and governing law', () => {
  const source = read(TERMS)
  assert.ok(source.includes('Vero Permit Terms and Conditions'), 'title')
  assert.ok(source.includes('effectiveDate='), 'effective date prop')
  assert.ok(
    source.includes('British Columbia') && source.includes('applicable laws of Canada'),
    'governing law clause',
  )
})

test('terms page covers all required sections', () => {
  const source = read(TERMS)
  const requiredHeadings = [
    'Users',
    'Builders',
    'Inspectors',
    'Inspection Outcomes',
    'Same-Day Corrections and Holds',
    'Payments',
    'SMS and Email Notifications',
    'Uploaded Content and Evidence',
    'Platform Availability',
    'No Professional or Legal Advice',
    'Limitation of Liability',
    'Suspension or Termination',
    'Changes to Terms',
    'Governing Law',
  ]
  for (const heading of requiredHeadings) {
    assert.ok(source.includes(`heading="${heading}"`), `terms must include the "${heading}" section`)
  }
})

test('terms page states Vero does not replace municipal / professional authority', () => {
  const source = read(TERMS)
  assert.ok(source.includes('does not replace municipal authority'), 'municipal authority disclaimer')
  assert.ok(source.includes('users consent to receive'), 'SMS consent language')
})
