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
// 1. sign-in page — forgot password link present, demo cards absent
// ===========================================================================

test('sign-in page links to /forgot-password', () => {
  const source = read('app/sign-in/page.tsx')
  assert.ok(source.includes('/forgot-password'), 'sign-in page must link to /forgot-password')
})

test('sign-in page demo account cards are still absent', () => {
  const source = read('app/sign-in/page.tsx')
  assert.ok(!source.includes('demo-card'), 'demo-card must not be present')
  assert.ok(!source.includes('DEMO_ACCOUNTS'), 'DEMO_ACCOUNTS must not be present')
})

// ===========================================================================
// 2. forgot-password page
// ===========================================================================

test('forgot-password page calls resetPasswordForEmail', () => {
  const source = read('app/forgot-password/page.tsx')
  assert.ok(
    source.includes('resetPasswordForEmail'),
    'forgot-password page must call resetPasswordForEmail'
  )
})

test('forgot-password page uses /auth/confirm as redirectTo', () => {
  const source = read('app/forgot-password/page.tsx')
  assert.ok(
    source.includes('/auth/confirm'),
    'forgot-password page must use /auth/confirm as redirectTo'
  )
})

test('forgot-password page does not reveal whether account exists', () => {
  const source = read('app/forgot-password/page.tsx')
  assert.ok(
    source.includes('If an account exists'),
    'forgot-password must use non-revealing confirmation message'
  )
})

// ===========================================================================
// 3. auth/confirm route
// ===========================================================================

test('auth/confirm route checks for recovery type', () => {
  const source = read('app/auth/confirm/route.ts')
  assert.ok(
    source.includes("type === 'recovery'"),
    "auth/confirm route must check type === 'recovery'"
  )
})

test('auth/confirm route calls verifyOtp', () => {
  const source = read('app/auth/confirm/route.ts')
  assert.ok(source.includes('verifyOtp'), 'auth/confirm route must call verifyOtp')
})

test('auth/confirm route redirects to /reset-password on success', () => {
  const source = read('app/auth/confirm/route.ts')
  assert.ok(
    source.includes('/reset-password'),
    'auth/confirm route must redirect to /reset-password on success'
  )
})

test('auth/confirm route redirects to /sign-in on failure', () => {
  const source = read('app/auth/confirm/route.ts')
  assert.ok(
    source.includes('/sign-in'),
    'auth/confirm route must redirect to /sign-in on failure'
  )
})

// ===========================================================================
// 4. reset-password page
// ===========================================================================

test('reset-password page calls updateUser', () => {
  const source = read('app/reset-password/page.tsx')
  assert.ok(source.includes('updateUser'), 'reset-password page must call updateUser')
})

test('reset-password page enforces minimum 8-character password', () => {
  const source = read('app/reset-password/page.tsx')
  assert.ok(
    source.includes('8'),
    'reset-password page must enforce minimum password length of 8'
  )
})

test('reset-password page checks for active session before rendering', () => {
  const source = read('app/reset-password/page.tsx')
  assert.ok(source.includes('getSession'), 'reset-password page must check for active session')
})

// ===========================================================================
// 5. Middleware — recovery routes not added to protected matcher
// ===========================================================================

test('middleware does not block /forgot-password', () => {
  const source = read('../middleware.ts')
  assert.ok(
    !source.includes("'/forgot-password'"),
    'middleware must not add /forgot-password to protected matcher'
  )
})

test('middleware does not block /reset-password', () => {
  const source = read('../middleware.ts')
  assert.ok(
    !source.includes("'/reset-password'"),
    'middleware must not add /reset-password to protected matcher'
  )
})

test('middleware does not block /auth/confirm', () => {
  const source = read('../middleware.ts')
  assert.ok(
    !source.includes("'/auth/confirm'"),
    'middleware must not add /auth/confirm to protected matcher'
  )
})

// ===========================================================================
// 6. Protected files unchanged
// ===========================================================================

test('governance/index.ts not modified by password reset pass', () => {
  const source = read('lib/governance/index.ts')
  assert.ok(!source.includes('resetPasswordForEmail'), 'governance must not reference password reset')
  assert.ok(!source.includes('updateUser'), 'governance must not reference updateUser')
})

test('inspectorCompletion.ts not modified by password reset pass', () => {
  const source = read('lib/inspectorCompletion.ts')
  assert.ok(!source.includes('resetPasswordForEmail'), 'inspectorCompletion must not reference password reset')
  assert.ok(!source.includes('updateUser'), 'inspectorCompletion must not reference updateUser')
})
