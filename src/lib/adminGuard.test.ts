import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

// src/ is one level up from src/lib/ where this test lives
const SRC = fileURLToPath(new URL('..', import.meta.url))
// Project root is one level above src/
const ROOT = fileURLToPath(new URL('../..', import.meta.url))

function read(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), 'utf8')
}

function readRoot(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf8')
}

function exists(relPath: string): boolean {
  return existsSync(resolve(SRC, relPath))
}

// ===========================================================================
// 1. Middleware matcher — /admin included, /api/admin NOT included
// ===========================================================================

test('middleware matcher includes /admin/:path*', () => {
  const source = readRoot('middleware.ts')
  assert.ok(
    source.includes("'/admin/:path*'"),
    "middleware matcher must include '/admin/:path*'"
  )
})

test('middleware matcher does not include /api/admin/:path*', () => {
  const source = readRoot('middleware.ts')
  assert.ok(
    !source.includes("'/api/admin/:path*'"),
    "middleware must not add /api/admin to the matcher in this commit — API routes are hardened separately"
  )
})

test('middleware preserves existing /inspector/:path* matcher entry', () => {
  const source = readRoot('middleware.ts')
  assert.ok(source.includes("'/inspector/:path*'"), 'existing /inspector matcher must be preserved')
})

test('middleware preserves existing /vault/:path* matcher entry', () => {
  const source = readRoot('middleware.ts')
  assert.ok(source.includes("'/vault/:path*'"), 'existing /vault matcher must be preserved')
})

test('middleware preserves existing /live-board/:path* matcher entry', () => {
  const source = readRoot('middleware.ts')
  assert.ok(source.includes("'/live-board/:path*'"), 'existing /live-board matcher must be preserved')
})

// ===========================================================================
// 2. Middleware admin role logic
// ===========================================================================

test('middleware imports isAdminLikeRole from adminAccess', () => {
  const source = readRoot('middleware.ts')
  assert.ok(
    source.includes("isAdminLikeRole") && source.includes("adminAccess"),
    'middleware must import isAdminLikeRole from adminAccess for admin role checking'
  )
})

test('middleware checks isAdminPath before allowing authenticated users through', () => {
  const source = readRoot('middleware.ts')
  assert.ok(source.includes('isAdminPath'), 'middleware must define and use isAdminPath')
  assert.ok(source.includes('isAdminLikeRole'), 'middleware must call isAdminLikeRole for admin path check')
})

test('middleware has role-to-dashboard mapping for non-admin redirect', () => {
  const source = readRoot('middleware.ts')
  // The redirect helper must handle the known non-admin roles
  assert.ok(source.includes("'builder'") && source.includes("'/builder'"), "middleware must redirect builders to /builder")
  assert.ok(source.includes("'inspector'") && source.includes("'/inspector'"), "middleware must redirect inspectors to /inspector")
  assert.ok(source.includes("'auditor'") && source.includes("'/auditor'"), "middleware must redirect auditors to /auditor")
})

test('middleware login redirect preserves next parameter for unauthenticated admin requests', () => {
  const source = readRoot('middleware.ts')
  // The login redirect at the bottom of middleware sets ?next= — this fires for
  // unauthenticated users hitting /admin (since /admin is now in the matcher).
  assert.ok(
    source.includes("searchParams.set('next'"),
    'middleware must preserve the next parameter in the login redirect'
  )
})

// ===========================================================================
// 3. adminGuard.ts — existence and structure
// ===========================================================================

test('adminGuard.ts exists at src/lib/adminGuard.ts', () => {
  assert.ok(exists('lib/adminGuard.ts'), 'adminGuard.ts must exist at src/lib/adminGuard.ts')
})

test('adminGuard.ts exports requireAdmin', () => {
  const source = read('lib/adminGuard.ts')
  assert.ok(
    source.includes('export async function requireAdmin'),
    'adminGuard must export an async requireAdmin function'
  )
})

test('adminGuard.ts calls supabase auth.getUser()', () => {
  const source = read('lib/adminGuard.ts')
  assert.ok(source.includes('auth.getUser()'), 'requireAdmin must call supabase.auth.getUser()')
})

test('adminGuard.ts queries the profiles table for role (authoritative check)', () => {
  const source = read('lib/adminGuard.ts')
  assert.ok(source.includes("from('profiles')"), 'requireAdmin must query the profiles table for role')
  assert.ok(source.includes(".select('role')"), 'requireAdmin must select the role column')
})

test('adminGuard.ts uses isAdminLikeRole to check admin access', () => {
  const source = read('lib/adminGuard.ts')
  assert.ok(source.includes('isAdminLikeRole'), 'requireAdmin must use isAdminLikeRole for role validation')
})

test('adminGuard.ts redirects unauthenticated users to /login', () => {
  const source = read('lib/adminGuard.ts')
  assert.ok(
    source.includes("redirect('/login')"),
    'requireAdmin must redirect unauthenticated users to /login'
  )
})

test('adminGuard.ts redirects non-admin authenticated users to their role dashboard', () => {
  const source = read('lib/adminGuard.ts')
  // Must have a redirect call for non-admin paths and a role mapping
  assert.ok(source.includes("redirect(redirectPathForRole"), 'requireAdmin must call redirect for non-admin roles')
  assert.ok(source.includes("'/builder'"), 'role mapping must include /builder')
  assert.ok(source.includes("'/inspector'"), 'role mapping must include /inspector')
  assert.ok(source.includes("'/auditor'"), 'role mapping must include /auditor')
})

test('adminGuard.ts does not perform any Supabase write operations', () => {
  const source = read('lib/adminGuard.ts')
  assert.ok(!source.includes('.insert('), 'adminGuard must not call .insert()')
  assert.ok(!source.includes('.update('), 'adminGuard must not call .update()')
  assert.ok(!source.includes('.delete('), 'adminGuard must not call .delete()')
  assert.ok(!source.includes('.upsert('), 'adminGuard must not call .upsert()')
})

// ===========================================================================
// 4. mapping-audit page — requireAdmin called before buildChecklistMappingAudit
// ===========================================================================

test('mapping-audit page imports requireAdmin from adminGuard', () => {
  const source = read('app/admin/checklists/mapping-audit/page.tsx')
  assert.ok(
    source.includes('requireAdmin') && source.includes('adminGuard'),
    'mapping-audit page must import requireAdmin from adminGuard'
  )
})

test('requireAdmin is awaited before buildChecklistMappingAudit in the mapping-audit page', () => {
  const source = read('app/admin/checklists/mapping-audit/page.tsx')
  const requireAdminCallIndex = source.indexOf('await requireAdmin()')
  const buildAuditCallIndex = source.indexOf('await buildChecklistMappingAudit()')
  assert.ok(requireAdminCallIndex !== -1, "page must contain 'await requireAdmin()'")
  assert.ok(buildAuditCallIndex !== -1, "page must contain 'await buildChecklistMappingAudit()'")
  assert.ok(
    requireAdminCallIndex < buildAuditCallIndex,
    'requireAdmin() must be awaited before buildChecklistMappingAudit() — no admin queries should run before auth is verified'
  )
})

// ===========================================================================
// 5. /api/admin routes were not touched in this commit
// ===========================================================================

test('cancellations/review route does not import adminGuard', () => {
  const source = read('app/api/admin/cancellations/review/route.ts')
  assert.ok(!source.includes('adminGuard'), 'API routes are hardened in a separate task')
})

test('payouts/review route does not import adminGuard', () => {
  const source = read('app/api/admin/payouts/review/route.ts')
  assert.ok(!source.includes('adminGuard'), 'API routes are hardened in a separate task')
})

test('standby/activate route does not import adminGuard', () => {
  const source = read('app/api/admin/standby/activate/route.ts')
  assert.ok(!source.includes('adminGuard'), 'API routes are hardened in a separate task')
})

test('reliability/policy route does not import adminGuard', () => {
  const source = read('app/api/admin/reliability/policy/route.ts')
  assert.ok(!source.includes('adminGuard'), 'API routes are hardened in a separate task')
})
