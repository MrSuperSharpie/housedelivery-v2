import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const SRC = fileURLToPath(new URL('..', import.meta.url))

function read(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), 'utf8')
}

// ── signup page ───────────────────────────────────────────────────────────────

test('signup page selects role from profiles in session check', () => {
  const source = read('app/inspector/signup/page.tsx')
  assert.ok(
    source.includes("'onboarding_status, verified, role'"),
    'signup page must query role alongside onboarding_status and verified'
  )
})

test('signup page checks profileRole for admin before setting existingUserId', () => {
  const source = read('app/inspector/signup/page.tsx')
  assert.ok(source.includes("profileRole === 'admin'"), 'signup page must check profileRole === admin')
  assert.ok(source.includes("profileRole === 'builder'"), 'signup page must check profileRole === builder')
})

test('signup page role guard appears before the setExistingUserId call', () => {
  const source = read('app/inspector/signup/page.tsx')
  // Search for the function call, not the useState destructuring declaration
  const roleCheckIdx   = source.indexOf("profileRole === 'admin'")
  const setExistingIdx = source.indexOf('setExistingUserId(u.id)')
  assert.ok(roleCheckIdx !== -1, 'role check must be present')
  assert.ok(setExistingIdx !== -1, 'setExistingUserId(u.id) call must be present')
  assert.ok(roleCheckIdx < setExistingIdx, 'role check must come before setExistingUserId(u.id)')
})

test('signup page sets blockedRole state and never sets existingUserId for blocked sessions', () => {
  const source = read('app/inspector/signup/page.tsx')
  assert.ok(source.includes('setBlockedRole('), 'signup page must call setBlockedRole')
  // The return inside the role guard must precede the setExistingUserId(u.id) call
  const guardBlock = source.slice(0, source.indexOf('setExistingUserId(u.id)'))
  assert.ok(guardBlock.includes('setBlockedRole('), 'setBlockedRole must be called before the setExistingUserId branch')
})

test('signup page renders blocked screen when blockedRole is set', () => {
  const source = read('app/inspector/signup/page.tsx')
  assert.ok(source.includes('blockedRole !== null'), 'signup page must render a blocked screen when blockedRole is not null')
  assert.ok(source.includes('Access Restricted'), 'blocked screen must include "Access Restricted" heading')
})

// ── check-registration route ──────────────────────────────────────────────────

test('check-registration route selects role from profiles on email lookup', () => {
  const source = read('app/api/auth/check-registration/route.ts')
  assert.ok(
    source.includes("'id, role'"),
    'check-registration route must select role alongside id'
  )
})

test('check-registration route returns 409 with blocked_role for admin email', () => {
  const source = read('app/api/auth/check-registration/route.ts')
  assert.ok(source.includes("=== 'admin'"), 'check-registration route must check for admin role')
  assert.ok(source.includes("blocked_role: existingRole"), 'check-registration route must include blocked_role in 409 body')
})

test('check-registration route returns 409 with blocked_role for builder email', () => {
  const source = read('app/api/auth/check-registration/route.ts')
  assert.ok(source.includes("=== 'builder'"), 'check-registration route must check for builder role')
})

test('check-registration route preserves generic 409 for existing inspector email', () => {
  const source = read('app/api/auth/check-registration/route.ts')
  assert.ok(
    source.includes('This email is already registered. Please Sign In to continue.'),
    'check-registration route must preserve the generic message for non-blocked roles'
  )
})
