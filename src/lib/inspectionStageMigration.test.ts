import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))

function readMigration(): string {
  return readFileSync(
    resolve(ROOT, 'supabase/migrations/20260605000000_correct_inspection_stage_labels_s10_s15.sql'),
    'utf8',
  )
}

// ── safety constraints ────────────────────────────────────────────────────────

test('migration contains no insert statements', () => {
  const sql = readMigration()
  assert.ok(!sql.match(/\binsert\b/i), 'migration must not contain insert')
})

test('migration contains no delete statements', () => {
  const sql = readMigration()
  assert.ok(!sql.match(/\bdelete\b/i), 'migration must not contain delete')
})

test('migration contains no alter table statements', () => {
  const sql = readMigration()
  assert.ok(!sql.match(/\balter\s+table\b/i), 'migration must not contain alter table')
})

test('migration does not reference job_opportunities', () => {
  const sql = readMigration()
  assert.ok(!sql.includes('job_opportunities'), 'migration must not reference job_opportunities')
})

test('migration does not reference inspection_stage_id', () => {
  const sql = readMigration()
  assert.ok(!sql.includes('inspection_stage_id'), 'migration must not reference inspection_stage_id')
})

test('migration only updates public.inspection_stages', () => {
  const sql = readMigration()
  assert.ok(sql.includes('update public.inspection_stages'), 'migration must update public.inspection_stages')
  const updateTargets = sql.match(/\bupdate\s+[\w.]+/gi) ?? []
  for (const match of updateTargets) {
    assert.ok(
      match.toLowerCase().includes('inspection_stages'),
      `migration must only update inspection_stages, found: ${match}`,
    )
  }
})

// ── stage_number coverage ─────────────────────────────────────────────────────

test('migration targets stage_number 10', () => {
  assert.ok(readMigration().includes('stage_number = 10'), 'must target stage_number = 10')
})

test('migration targets stage_number 11', () => {
  assert.ok(readMigration().includes('stage_number = 11'), 'must target stage_number = 11')
})

test('migration targets stage_number 12', () => {
  assert.ok(readMigration().includes('stage_number = 12'), 'must target stage_number = 12')
})

test('migration targets stage_number 13', () => {
  assert.ok(readMigration().includes('stage_number = 13'), 'must target stage_number = 13')
})

test('migration targets stage_number 14', () => {
  assert.ok(readMigration().includes('stage_number = 14'), 'must target stage_number = 14')
})

test('migration targets stage_number 15', () => {
  assert.ok(readMigration().includes('stage_number = 15'), 'must target stage_number = 15')
})

// ── corrected titles ──────────────────────────────────────────────────────────

test('migration sets S10 title to Electrical Permit and Scope', () => {
  assert.ok(
    readMigration().includes("'Electrical Permit and Scope'"),
    'S10 title must be Electrical Permit and Scope',
  )
})

test('migration sets S11 title to Gas Permit and Mechanical / HVAC Scope', () => {
  assert.ok(
    readMigration().includes("'Gas Permit and Mechanical / HVAC Scope'"),
    'S11 title must be Gas Permit and Mechanical / HVAC Scope',
  )
})

test('migration sets S12 title to Insulation and Energy Compliance', () => {
  assert.ok(
    readMigration().includes("'Insulation and Energy Compliance'"),
    'S12 title must be Insulation and Energy Compliance',
  )
})

test('migration sets S13 title to Interior Completion', () => {
  assert.ok(
    readMigration().includes("'Interior Completion'"),
    'S13 title must be Interior Completion',
  )
})

test('migration sets S14 title to Exterior Works and Site Finalization', () => {
  assert.ok(
    readMigration().includes("'Exterior Works and Site Finalization'"),
    'S14 title must be Exterior Works and Site Finalization',
  )
})

test('migration sets S15 title to Inspections, Final Approval, and Occupancy', () => {
  assert.ok(
    readMigration().includes("'Inspections, Final Approval, and Occupancy'"),
    'S15 title must be Inspections, Final Approval, and Occupancy',
  )
})

// ── corrected slugs ───────────────────────────────────────────────────────────

test('migration sets S10 slug to electrical_permit_and_scope', () => {
  assert.ok(
    readMigration().includes("'electrical_permit_and_scope'"),
    'S10 slug must be electrical_permit_and_scope',
  )
})

test('migration sets S11 slug to gas_mechanical_hvac_scope', () => {
  assert.ok(
    readMigration().includes("'gas_mechanical_hvac_scope'"),
    'S11 slug must be gas_mechanical_hvac_scope',
  )
})

test('migration sets S12 slug to insulation_energy_compliance', () => {
  assert.ok(
    readMigration().includes("'insulation_energy_compliance'"),
    'S12 slug must be insulation_energy_compliance',
  )
})

test('migration sets S13 slug to interior_completion', () => {
  assert.ok(
    readMigration().includes("'interior_completion'"),
    'S13 slug must be interior_completion',
  )
})

test('migration sets S14 slug to exterior_works_site_finalization', () => {
  assert.ok(
    readMigration().includes("'exterior_works_site_finalization'"),
    'S14 slug must be exterior_works_site_finalization',
  )
})

test('migration sets S15 slug to final_approval_and_occupancy', () => {
  assert.ok(
    readMigration().includes("'final_approval_and_occupancy'"),
    'S15 slug must be final_approval_and_occupancy',
  )
})

// ── discipline and seal correctness ──────────────────────────────────────────

test('migration sets S10 discipline to electrical', () => {
  assert.ok(
    readMigration().includes("= 'electrical'"),
    'migration must set discipline = electrical for S10',
  )
})

test('migration sets S11 discipline to mechanical', () => {
  assert.ok(
    readMigration().includes("= 'mechanical'"),
    'migration must set discipline = mechanical for S11',
  )
})

test('migration sets S15 requires_master_seal to true', () => {
  assert.ok(
    readMigration().includes('requires_master_seal   = true'),
    'S15 must set requires_master_seal = true',
  )
})
