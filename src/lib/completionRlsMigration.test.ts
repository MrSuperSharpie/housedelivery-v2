import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

function readMigration(): string {
  return readFileSync(
    resolve(ROOT, 'supabase/migrations/20260611000000_inspector_completion_rls_seal_latch.sql'),
    'utf8',
  )
}

const TABLES = [
  'inspector_completion_reports',
  'inspector_completion_stage_items',
  'inspector_completion_documents',
] as const

// ── safety constraints ────────────────────────────────────────────────────────

test('migration contains no data mutation statements', () => {
  const sql = readMigration()
  assert.ok(!sql.match(/\binsert\s+into\b/i), 'migration must not insert data')
  assert.ok(!sql.match(/\bupdate\s+\w+\s+set\b/i), 'migration must not update data')
  assert.ok(!sql.match(/\bdelete\s+from\b/i), 'migration must not delete data')
  assert.ok(!sql.match(/\btruncate\b/i), 'migration must not truncate')
})

test('migration drops no tables or columns', () => {
  const sql = readMigration()
  assert.ok(!sql.match(/\bdrop\s+table\b/i), 'migration must not drop tables')
  assert.ok(!sql.match(/\bdrop\s+column\b/i), 'migration must not drop columns')
})

test('alter table statements only target the three completion tables', () => {
  const sql = readMigration()
  const alters = sql.match(/\balter\s+table\s+([\w.]+)/gi) ?? []
  assert.ok(alters.length > 0, 'migration must contain alter table statements')
  for (const statement of alters) {
    assert.ok(
      TABLES.some(table => statement.includes(table)),
      `alter table must only target completion tables, found: ${statement}`,
    )
  }
})

test('alter table statements only enable row level security', () => {
  const sql = readMigration()
  const alters = sql.match(/\balter\s+table\s+[\w.]+\s+([\s\S]*?);/gi) ?? []
  for (const statement of alters) {
    assert.ok(
      /enable\s+row\s+level\s+security/i.test(statement),
      `alter table must only enable RLS, found: ${statement}`,
    )
  }
})

// ── RLS coverage ──────────────────────────────────────────────────────────────

for (const table of TABLES) {
  test(`migration enables RLS on ${table}`, () => {
    const sql = readMigration()
    const pattern = new RegExp(
      `alter\\s+table\\s+${table}\\s+enable\\s+row\\s+level\\s+security`,
      'i',
    )
    assert.ok(pattern.test(sql), `must enable row level security on ${table}`)
  })
}

// ── policy coverage ───────────────────────────────────────────────────────────

const EXPECTED_POLICIES = [
  'completion_reports_select_inspector',
  'completion_reports_select_builder',
  'completion_reports_select_admin',
  'completion_reports_insert_inspector',
  'completion_reports_update_inspector',
  'completion_items_select_inspector',
  'completion_items_select_builder',
  'completion_items_select_admin',
  'completion_items_insert_inspector',
  'completion_items_update_inspector',
  'completion_documents_select_inspector',
  'completion_documents_select_builder',
  'completion_documents_select_admin',
  'completion_documents_insert_inspector',
  'completion_documents_update_inspector',
  'completion_documents_delete_inspector',
]

for (const policy of EXPECTED_POLICIES) {
  test(`migration creates policy ${policy}`, () => {
    const sql = readMigration()
    const pattern = new RegExp(`create\\s+policy\\s+${policy}\\b`, 'i')
    assert.ok(pattern.test(sql), `must create policy ${policy}`)
  })
}

test('migration creates no unexpected policies', () => {
  const sql = readMigration()
  const created = sql.match(/create\s+policy\s+(\w+)/gi) ?? []
  assert.equal(
    created.length,
    EXPECTED_POLICIES.length,
    `expected exactly ${EXPECTED_POLICIES.length} policies, found ${created.length}`,
  )
})

test('the only delete policy is the inspector document delete', () => {
  const sql = readMigration()
  const policyBlocks = sql.split(/create\s+policy/i).slice(1)
  const deleteBlocks = policyBlocks.filter(block => /for\s+delete/i.test(block))
  assert.equal(deleteBlocks.length, 1, 'exactly one delete policy is allowed')
  assert.ok(
    deleteBlocks[0].includes('completion_documents_delete_inspector'),
    'the delete policy must be completion_documents_delete_inspector',
  )
})

test('no policy targets the anon role', () => {
  const sql = readMigration()
  assert.ok(!sql.match(/\bto\s+anon\b/i), 'policies must not grant access to anon')
})

test('report insert policy only permits unsealed drafts', () => {
  const sql = readMigration()
  const insertBlock = sql
    .split(/create\s+policy/i)
    .find(block => block.trimStart().startsWith('completion_reports_insert_inspector'))
  assert.ok(insertBlock, 'report insert policy block must exist')
  assert.ok(
    /not\s+seal_applied/i.test(insertBlock!),
    'insert policy must reject seal_applied rows',
  )
  assert.ok(
    /status\s+not\s+in\s+\('sealed',\s*'submitted'\)/i.test(insertBlock!),
    'insert policy must reject sealed and submitted statuses',
  )
})

test('update policy preserves one-way sealing and blocks sealed rows', () => {
  const sql = readMigration()
  const updateBlock = sql
    .split(/create\s+policy/i)
    .find(block => block.trimStart().startsWith('completion_reports_update_inspector'))
  assert.ok(updateBlock, 'update policy block must exist')
  assert.ok(
    /not\s+seal_applied/i.test(updateBlock!),
    'update policy must exclude seal_applied rows',
  )
  assert.ok(
    /status\s+not\s+in\s+\('sealed',\s*'submitted'\)/i.test(updateBlock!),
    'update policy must exclude sealed and submitted statuses',
  )
})

// ── seal latch trigger coverage ───────────────────────────────────────────────

test('migration creates the seal latch trigger function', () => {
  const sql = readMigration()
  assert.ok(
    /create\s+or\s+replace\s+function\s+public\.enforce_completion_seal_latch/i.test(sql),
    'must create enforce_completion_seal_latch',
  )
})

for (const table of TABLES) {
  test(`migration attaches the seal latch trigger to ${table}`, () => {
    const sql = readMigration()
    const pattern = new RegExp(
      `create\\s+trigger\\s+trg_\\w+_seal_latch\\s+before\\s+update\\s+or\\s+delete\\s+on\\s+${table}\\b`,
      'i',
    )
    assert.ok(pattern.test(sql), `must attach a before update-or-delete latch trigger to ${table}`)
  })
}

test('seal latch bypasses non-client (service role / direct) requests', () => {
  const sql = readMigration()
  assert.ok(
    /completion_is_client_request/i.test(sql),
    'latch must check completion_is_client_request',
  )
  assert.ok(
    /'anon',\s*'authenticated'/i.test(sql),
    'client request check must cover anon and authenticated roles only',
  )
  assert.ok(
    !sql.match(/'service_role'\s*\)?\s*in/i),
    'service_role must not be treated as a client role',
  )
})

test('seal latch treats sealed and submitted reports as locked', () => {
  const sql = readMigration()
  assert.ok(
    /seal_applied\s+or\s+r?\.?\s*status\s+in\s+\('sealed',\s*'submitted'\)/i.test(sql)
    || /seal_applied\s+or\s+old\.status\s+in\s+\('sealed',\s*'submitted'\)/i.test(sql),
    'locked-state check must cover seal_applied, sealed, and submitted',
  )
})

// ── scope guard ───────────────────────────────────────────────────────────────

function stripSqlComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, '')
}

test('migration does not touch compliance tables or storage', () => {
  const sql = stripSqlComments(readMigration())
  assert.ok(!sql.includes('compliance_'), 'must not reference compliance tables')
  assert.ok(!sql.includes('storage.objects'), 'must not touch storage policies')
  assert.ok(!sql.includes('authority_access_grants'), 'must not reference authority_access_grants')
})

test('migration does not introduce seal reference generation', () => {
  const sql = readMigration()
  assert.ok(!sql.match(/seal_reference\s+text/i), 'must not alter seal_reference column')
  assert.ok(!sql.match(/\bsequence\b/i), 'must not create sequences (server seal refs are patch 3)')
})
