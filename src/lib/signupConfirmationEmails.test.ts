import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const SRC = fileURLToPath(new URL('..', import.meta.url))
function read(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), 'utf8')
}

// ===========================================================================
// 1. inspector.application_submitted — updated copy
// ===========================================================================

test('inspector.application_submitted body includes updated first sentence', () => {
  const source = read('lib/email/templates.ts')
  assert.ok(
    source.includes('Your Vero Permit inspector application has been received and is now under review.'),
    'inspector template must use updated first sentence'
  )
})

test('inspector.application_submitted body mentions credentials, service regions, trade discipline', () => {
  const source = read('lib/email/templates.ts')
  assert.ok(
    source.includes('credentials, service regions, trade discipline, and requested work areas'),
    'inspector template must name the reviewed items'
  )
})

test('inspector.application_submitted body mentions activating profile', () => {
  const source = read('lib/email/templates.ts')
  assert.ok(
    source.includes('activating your profile'),
    'inspector template must reference activating the profile'
  )
})

test('inspector.application_submitted body states no further action required', () => {
  const source = read('lib/email/templates.ts')
  assert.ok(
    source.includes('No further action is required at this time.'),
    'inspector template must state the post-approval outcome'
  )
})

test('inspector.application_submitted body mentions additional credentials expand eligibility', () => {
  const source = read('lib/email/templates.ts')
  assert.ok(
    source.includes('Additional credentials may expand the types of inspections you are eligible to claim'),
    'inspector template must include closing thank-you paragraph'
  )
})

// ===========================================================================
// 2. builder.profile_submitted — updated copy
// ===========================================================================

test('builder.profile_submitted body includes updated first sentence', () => {
  const source = read('lib/email/templates.ts')
  assert.ok(
    source.includes('Thank you for submitting your Vero Permit builder profile.'),
    'builder template must use updated first sentence'
  )
})

test('builder.profile_submitted body mentions activating builder account', () => {
  const source = read('lib/email/templates.ts')
  assert.ok(
    source.includes('activating your builder account'),
    'builder template must reference activating the account'
  )
})

test('builder.profile_submitted body mentions request inspections and manage project records', () => {
  const source = read('lib/email/templates.ts')
  assert.ok(
    source.includes('request inspections, manage project records'),
    'builder template must state post-approval capabilities'
  )
})

test('builder.profile_submitted body includes closing thank-you paragraph', () => {
  const source = read('lib/email/templates.ts')
  assert.ok(
    source.includes('Thank you for helping modernize the inspection process'),
    'builder template must include closing thank-you paragraph'
  )
})

// ===========================================================================
// 3. account-lifecycle/route.ts — user confirmation emails wired
// ===========================================================================

test('account-lifecycle route references inspector.application_submitted event key', () => {
  const source = read('app/api/mail/account-lifecycle/route.ts')
  assert.ok(
    source.includes("'inspector.application_submitted'"),
    'route must send inspector.application_submitted user confirmation'
  )
})

test('account-lifecycle route references builder.profile_submitted event key', () => {
  const source = read('app/api/mail/account-lifecycle/route.ts')
  assert.ok(
    source.includes("'builder.profile_submitted'"),
    'route must send builder.profile_submitted user confirmation'
  )
})

test('account-lifecycle route still references admin.inspector_application_submitted', () => {
  const source = read('app/api/mail/account-lifecycle/route.ts')
  assert.ok(
    source.includes("'admin.inspector_application_submitted'"),
    'admin inspector notification must remain present'
  )
})

test('account-lifecycle route still references admin.builder_profile_submitted', () => {
  const source = read('app/api/mail/account-lifecycle/route.ts')
  assert.ok(
    source.includes("'admin.builder_profile_submitted'"),
    'admin builder notification must remain present'
  )
})

test('account-lifecycle route inspector confirmation uses /inspector/onboarding-status ctaUrl', () => {
  const source = read('app/api/mail/account-lifecycle/route.ts')
  assert.ok(
    source.includes('/inspector/onboarding-status'),
    'inspector confirmation must link to /inspector/onboarding-status'
  )
})

test('account-lifecycle route builder confirmation uses /builder/onboarding ctaUrl', () => {
  const source = read('app/api/mail/account-lifecycle/route.ts')
  assert.ok(
    source.includes('/builder/onboarding'),
    'builder confirmation must link to /builder/onboarding'
  )
})

// ===========================================================================
// 4. Legacy mail routes not modified
// ===========================================================================

test('application-received route still uses sendApplicationReceived from mail', () => {
  const source = read('app/api/mail/application-received/route.ts')
  assert.ok(
    source.includes('sendApplicationReceived'),
    'legacy application-received route must be unchanged'
  )
})

test('application-status route still uses sendApplicationStatus from mail', () => {
  const source = read('app/api/mail/application-status/route.ts')
  assert.ok(
    source.includes('sendApplicationStatus'),
    'legacy application-status route must be unchanged'
  )
})

// ===========================================================================
// 5. No demo account code restored
// ===========================================================================

test('sign-in page demo account cards still absent', () => {
  const source = read('app/sign-in/page.tsx')
  assert.ok(!source.includes('demo-card'), 'demo-card must not be present')
  assert.ok(!source.includes('DEMO_ACCOUNTS'), 'DEMO_ACCOUNTS must not be present')
})
