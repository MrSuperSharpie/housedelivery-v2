import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const SRC = fileURLToPath(new URL('..', import.meta.url))

function read(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), 'utf8')
}

function exists(relPath: string): boolean {
  return existsSync(resolve(SRC, relPath))
}

// ===========================================================================
// 1. adminApiGuard.ts — existence and structure
// ===========================================================================

test('adminApiGuard.ts exists at src/lib/adminApiGuard.ts', () => {
  assert.ok(exists('lib/adminApiGuard.ts'), 'adminApiGuard.ts must exist at src/lib/adminApiGuard.ts')
})

test('adminApiGuard.ts exports requireAdminApi', () => {
  const source = read('lib/adminApiGuard.ts')
  assert.ok(
    source.includes('export async function requireAdminApi'),
    'adminApiGuard must export an async requireAdminApi function'
  )
})

test('adminApiGuard.ts calls supabase auth.getUser()', () => {
  const source = read('lib/adminApiGuard.ts')
  assert.ok(source.includes('auth.getUser()'), 'requireAdminApi must call supabase.auth.getUser()')
})

test('adminApiGuard.ts queries the profiles table for role (authoritative check)', () => {
  const source = read('lib/adminApiGuard.ts')
  assert.ok(source.includes("from('profiles')"), 'requireAdminApi must query the profiles table for role')
  assert.ok(source.includes(".select('role')"), 'requireAdminApi must select the role column')
})

test('adminApiGuard.ts uses isAdminLikeRole to check admin access', () => {
  const source = read('lib/adminApiGuard.ts')
  assert.ok(source.includes('isAdminLikeRole'), 'requireAdminApi must use isAdminLikeRole for role validation')
})

test('adminApiGuard.ts returns a 401 response for unauthenticated callers', () => {
  const source = read('lib/adminApiGuard.ts')
  assert.ok(source.includes('status: 401'), 'requireAdminApi must return 401 for unauthenticated callers')
})

test('adminApiGuard.ts returns a 403 response for non-admin authenticated callers', () => {
  const source = read('lib/adminApiGuard.ts')
  assert.ok(source.includes('status: 403'), 'requireAdminApi must return 403 for non-admin callers')
})

test('adminApiGuard.ts does not perform any Supabase write operations', () => {
  const source = read('lib/adminApiGuard.ts')
  assert.ok(!source.includes('.insert('), 'adminApiGuard must not call .insert()')
  assert.ok(!source.includes('.update('), 'adminApiGuard must not call .update()')
  assert.ok(!source.includes('.delete('), 'adminApiGuard must not call .delete()')
  assert.ok(!source.includes('.upsert('), 'adminApiGuard must not call .upsert()')
})

// ===========================================================================
// 2. Group A routes — requireAdminApi added before RPC calls (no prior auth)
// ===========================================================================

test('cancellations/review route imports requireAdminApi from adminApiGuard', () => {
  const source = read('app/api/admin/cancellations/review/route.ts')
  assert.ok(
    source.includes('requireAdminApi') && source.includes('adminApiGuard'),
    'cancellations/review must import requireAdminApi from adminApiGuard'
  )
})

test('requireAdminApi is called before RPC in cancellations/review', () => {
  const source = read('app/api/admin/cancellations/review/route.ts')
  const authIndex = source.indexOf('requireAdminApi()')
  const rpcIndex = source.indexOf('.rpc(')
  assert.ok(authIndex !== -1, 'cancellations/review must call requireAdminApi()')
  assert.ok(rpcIndex !== -1, 'cancellations/review must contain an RPC call')
  assert.ok(authIndex < rpcIndex, 'requireAdminApi() must be called before the RPC — no admin operations before auth is verified')
})

test('payouts/review route imports requireAdminApi from adminApiGuard', () => {
  const source = read('app/api/admin/payouts/review/route.ts')
  assert.ok(
    source.includes('requireAdminApi') && source.includes('adminApiGuard'),
    'payouts/review must import requireAdminApi from adminApiGuard'
  )
})

test('requireAdminApi is called before RPC in payouts/review', () => {
  const source = read('app/api/admin/payouts/review/route.ts')
  const authIndex = source.indexOf('requireAdminApi()')
  const rpcIndex = source.indexOf('.rpc(')
  assert.ok(authIndex !== -1, 'payouts/review must call requireAdminApi()')
  assert.ok(rpcIndex !== -1, 'payouts/review must contain an RPC call')
  assert.ok(authIndex < rpcIndex, 'requireAdminApi() must be called before the RPC')
})

test('standby/activate route imports requireAdminApi from adminApiGuard', () => {
  const source = read('app/api/admin/standby/activate/route.ts')
  assert.ok(
    source.includes('requireAdminApi') && source.includes('adminApiGuard'),
    'standby/activate must import requireAdminApi from adminApiGuard'
  )
})

test('requireAdminApi is called before RPC in standby/activate', () => {
  const source = read('app/api/admin/standby/activate/route.ts')
  const authIndex = source.indexOf('requireAdminApi()')
  const rpcIndex = source.indexOf('.rpc(')
  assert.ok(authIndex !== -1, 'standby/activate must call requireAdminApi()')
  assert.ok(rpcIndex !== -1, 'standby/activate must contain an RPC call')
  assert.ok(authIndex < rpcIndex, 'requireAdminApi() must be called before the RPC')
})

test('reliability/policy route imports requireAdminApi from adminApiGuard', () => {
  const source = read('app/api/admin/reliability/policy/route.ts')
  assert.ok(
    source.includes('requireAdminApi') && source.includes('adminApiGuard'),
    'reliability/policy must import requireAdminApi from adminApiGuard'
  )
})

test('requireAdminApi is called before RPC in reliability/policy', () => {
  const source = read('app/api/admin/reliability/policy/route.ts')
  const authIndex = source.indexOf('requireAdminApi()')
  const rpcIndex = source.indexOf('.rpc(')
  assert.ok(authIndex !== -1, 'reliability/policy must call requireAdminApi()')
  assert.ok(rpcIndex !== -1, 'reliability/policy must contain an RPC call')
  assert.ok(authIndex < rpcIndex, 'requireAdminApi() must be called before the RPC')
})

// ===========================================================================
// 3. Group B routes — requireAdminApi replaces bare getUser() check
// ===========================================================================

const GROUP_B_ROUTES = [
  'app/api/admin/checklists/route.ts',
  'app/api/admin/checklists/items/route.ts',
  'app/api/admin/checklists/items/[id]/route.ts',
  'app/api/admin/checklists/templates/[id]/route.ts',
  'app/api/admin/checklists/templates/[id]/new-version/route.ts',
] as const

for (const routePath of GROUP_B_ROUTES) {
  test(`${routePath} imports requireAdminApi from adminApiGuard`, () => {
    const source = read(routePath)
    assert.ok(
      source.includes('requireAdminApi') && source.includes('adminApiGuard'),
      `${routePath} must import requireAdminApi from adminApiGuard`
    )
  })

  test(`requireAdminApi is called before first .from() in ${routePath}`, () => {
    const source = read(routePath)
    const authIndex = source.indexOf('requireAdminApi()')
    const fromIndex = source.indexOf('.from(')
    assert.ok(authIndex !== -1, `${routePath} must call requireAdminApi()`)
    assert.ok(fromIndex !== -1, `${routePath} must contain a .from() call`)
    assert.ok(authIndex < fromIndex, `requireAdminApi() must be called before .from() in ${routePath}`)
  })

  test(`${routePath} does not call auth.getUser() directly`, () => {
    const source = read(routePath)
    assert.ok(
      !source.includes('auth.getUser()'),
      `${routePath} must not call auth.getUser() directly — requireAdminApi() encapsulates auth`
    )
  })
}

// ===========================================================================
// 4. Group C routes — already protected, must not be touched
// ===========================================================================

test('inspectors/profiles route does not import adminApiGuard', () => {
  const source = read('app/api/admin/inspectors/profiles/route.ts')
  assert.ok(!source.includes('adminApiGuard'), 'Group C routes must not be modified — already protected')
})

test('departure-interventions route does not import adminApiGuard', () => {
  const source = read('app/api/admin/departure-interventions/route.ts')
  assert.ok(!source.includes('adminApiGuard'), 'Group C routes must not be modified — already protected')
})
