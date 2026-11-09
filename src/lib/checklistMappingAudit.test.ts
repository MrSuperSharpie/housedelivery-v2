import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

// ---------------------------------------------------------------------------
// Fixture note — buildCompletionChecklist() variant
//
// buildChecklistMappingAudit() calls buildCompletionChecklist() with hardcoded
// parameters: { city: 'Vancouver', region: 'vancouver', projectType: 'General
// building permit' }. These tests exercise static mapping configuration and
// source-level guarantees only. They do not invoke buildChecklistMappingAudit(),
// which requires a live Supabase connection. If the product expands to additional
// jurisdictions or project types, the audit constants must be reviewed for those
// paths.
//
// Pending task — /admin middleware hardening
//
// The /admin route group is currently protected by a client-side RoleGuard only.
// The Next.js middleware matcher does not cover /admin/:path*. This is a
// pre-existing concern shared by all admin pages and is tracked as a separate
// security hardening task. It is intentionally out of scope for this commit.
// ---------------------------------------------------------------------------

// src/lib/ is one level up from the test file's URL directory
const SRC = fileURLToPath(new URL('..', import.meta.url))

function read(relPath: string): string {
  return readFileSync(resolve(SRC, relPath), 'utf8')
}

function srcExists(relPath: string): boolean {
  return existsSync(resolve(SRC, relPath))
}

// Extract the source text block belonging to a named SEMANTIC_MAPPINGS entry.
// Slices from the first occurrence of `id: '<id>'` up to (but not including)
// the next `id: '...'` entry, so each block captures a single mapping object.
function mappingBlock(source: string, id: string): string {
  const idStr = `id: '${id}'`
  const start = source.indexOf(idStr)
  assert.ok(start !== -1, `SEMANTIC_MAPPINGS entry with id '${id}' not found in source`)
  const afterId = start + idStr.length
  const nextId = source.slice(afterId).search(/\bid: '[a-z][a-z-]*'/)
  return nextId === -1 ? source.slice(start) : source.slice(start, afterId + nextId)
}

// ===========================================================================
// 1. Runtime safety — no Supabase write operations
// ===========================================================================

test('checklistMappingAudit.ts contains no Supabase insert calls', () => {
  const source = read('lib/checklistMappingAudit.ts')
  assert.ok(!source.includes('.insert('), 'source must not contain .insert(')
})

test('checklistMappingAudit.ts contains no Supabase update calls', () => {
  const source = read('lib/checklistMappingAudit.ts')
  assert.ok(!source.includes('.update('), 'source must not contain .update(')
})

test('checklistMappingAudit.ts contains no Supabase delete calls', () => {
  const source = read('lib/checklistMappingAudit.ts')
  assert.ok(!source.includes('.delete('), 'source must not contain .delete(')
})

test('checklistMappingAudit.ts contains no Supabase upsert calls', () => {
  const source = read('lib/checklistMappingAudit.ts')
  assert.ok(!source.includes('.upsert('), 'source must not contain .upsert(')
})

test('all Supabase .from() chains in checklistMappingAudit.ts use .select()', () => {
  const source = read('lib/checklistMappingAudit.ts')
  // Capture the method that immediately follows every .from('table') call
  const chainPattern = /\.from\([^)]+\)\s*\n?\s*\.(\w+)\(/g
  for (const match of source.matchAll(chainPattern)) {
    const method = match[1]
    assert.equal(
      method,
      'select',
      `Supabase .from() chain uses .${method}() — only .select() is permitted`
    )
  }
})

test('inspectorCompletion.ts does not import from checklistMappingAudit', () => {
  const source = read('lib/inspectorCompletion.ts')
  assert.ok(
    !source.includes('checklistMappingAudit'),
    'inspectorCompletion.ts must not depend on the audit module — dependency must flow one way only'
  )
})

test('checklistMappingAudit.ts does not import from Schedule C-B or final occupancy routes', () => {
  const source = read('lib/checklistMappingAudit.ts')
  assert.ok(!source.includes('scheduleCB'), 'audit module must not import scheduleCB')
  assert.ok(!source.includes('finalOccupancy'), 'audit module must not import finalOccupancy')
  assert.ok(!source.includes('compliance_completed'), 'audit module must not reference compliance_completed records')
})

// ===========================================================================
// 2. Stage-number mismatch protection — DB stages referenced by slug, not number
// ===========================================================================

test('Stage 9 Plumbing references DB stage by slug, not by raw stage number', () => {
  const source = read('lib/checklistMappingAudit.ts')
  const block = mappingBlock(source, 'plumbing')
  assert.ok(block.includes('tsStageNumber: 9'), 'plumbing domain must declare tsStageNumber 9')
  assert.ok(block.includes("'plumbing_rough_in'"), 'plumbing domain must reference DB stage by slug plumbing_rough_in')
  // dbStageSlugs must not hold a bare numeric string
  assert.ok(
    !block.match(/dbStageSlugs:\s*\[\s*\d+\s*\]/),
    'dbStageSlugs must be a slug array, not a numeric array'
  )
})

test('Stage 14 Exterior Works and Site Finalization references DB stage by slug, not by raw stage number', () => {
  const source = read('lib/checklistMappingAudit.ts')
  const block = mappingBlock(source, 'final-site')
  assert.ok(block.includes('tsStageNumber: 14'), 'final-site domain must declare tsStageNumber 14')
  assert.ok(block.includes("'exterior_works_site_finalization'"), 'final-site domain must reference DB stage by slug exterior_works_site_finalization')
})

test('Stage 15 Inspections Final Approval and Occupancy references DB stage by slug, not by raw stage number', () => {
  const source = read('lib/checklistMappingAudit.ts')
  const block = mappingBlock(source, 'final-occupancy')
  assert.ok(block.includes('tsStageNumber: 15'), 'final-occupancy domain must declare tsStageNumber 15')
  assert.ok(block.includes("'final_approval_and_occupancy'"), 'final-occupancy must reference DB stage by slug final_approval_and_occupancy')
})

test('stage-number mismatch is documented in at least two mapping entries', () => {
  const source = read('lib/checklistMappingAudit.ts')
  // Notes of the form "TS SXX maps to DB SYY" confirm semantic mapping was used
  // rather than assuming TS stage number == DB stage number.
  // Threshold is 2 (not 4) because the S10-S15 DB correction aligns S10, S11, S12
  // with their TS counterparts — those three mismatch notes were removed as obsolete.
  // Remaining genuine mismatches: S04->S01 (site-prep) and S06->S04 (structural-frame).
  const pattern = /TS S\d+ maps to DB S\d+|avoid stage.number/gi
  const matches = source.match(pattern) ?? []
  assert.ok(
    matches.length >= 2,
    `expected at least 2 stage-number-mismatch notes in SEMANTIC_MAPPINGS, found ${matches.length}`
  )
})

// ===========================================================================
// 3. Pilot candidate and risk-level integrity
// ===========================================================================

test('Stage 9 Plumbing is the first feature-flag pilot candidate', () => {
  const source = read('lib/checklistMappingAudit.ts')
  const block = mappingBlock(source, 'plumbing')
  assert.ok(
    block.includes("recommendation: 'feature_flag_pilot_candidate'"),
    'plumbing domain must carry recommendation feature_flag_pilot_candidate'
  )
  assert.ok(block.includes("riskLevel: 'medium'"), 'plumbing pilot must be medium risk')
})

test('Stage 14 Final Site & Grading is the second pilot candidate', () => {
  const source = read('lib/checklistMappingAudit.ts')
  const block = mappingBlock(source, 'final-site')
  assert.ok(
    block.includes("recommendation: 'feature_flag_pilot_candidate'"),
    'final-site domain must carry recommendation feature_flag_pilot_candidate'
  )
})

test('Stage 15 Final Occupancy is do-not-touch with deferred recommendation and explanatory note', () => {
  const source = read('lib/checklistMappingAudit.ts')
  const block = mappingBlock(source, 'final-occupancy')
  assert.ok(block.includes("riskLevel: 'do_not_touch'"), 'final-occupancy riskLevel must be do_not_touch')
  assert.ok(block.includes("recommendation: 'defer'"), 'final-occupancy recommendation must be defer')
  // The note must reference the reason so future developers understand the constraint
  const hasSensitivityNote =
    block.includes('final occupancy') ||
    block.includes('Schedule C-B') ||
    block.includes('sealed')
  assert.ok(hasSensitivityNote, 'final-occupancy must carry a note explaining its sensitivity (final occupancy / Schedule C-B / sealed records)')
})

test('exactly two domains carry feature_flag_pilot_candidate (Stage 9 and Stage 14 only)', () => {
  const source = read('lib/checklistMappingAudit.ts')
  const pilots = source.match(/recommendation: 'feature_flag_pilot_candidate'/g) ?? []
  assert.equal(
    pilots.length,
    2,
    `expected exactly 2 pilot candidates (Stage 9 and Stage 14), found ${pilots.length}`
  )
})

test('only Stage 1 (project-setup) and Stage 15 (final-occupancy) carry do_not_touch risk level', () => {
  const source = read('lib/checklistMappingAudit.ts')
  const doNotTouch = source.match(/riskLevel: 'do_not_touch'/g) ?? []
  assert.equal(
    doNotTouch.length,
    2,
    `expected exactly 2 do_not_touch domains (project-setup, final-occupancy), found ${doNotTouch.length}`
  )
})

test('JURISDICTIONS constant declares both bcbc_2024 and vbbl_2025', () => {
  const source = read('lib/checklistMappingAudit.ts')
  assert.ok(source.includes("'bcbc_2024'"), "JURISDICTIONS must include 'bcbc_2024'")
  assert.ok(source.includes("'vbbl_2025'"), "JURISDICTIONS must include 'vbbl_2025'")
  // Both slugs must be distinct entries in the JURISDICTIONS array
  const bcbcCount = (source.match(/'bcbc_2024'/g) ?? []).length
  const vbblCount = (source.match(/'vbbl_2025'/g) ?? []).length
  assert.ok(bcbcCount >= 1, 'bcbc_2024 must appear at least once')
  assert.ok(vbblCount >= 1, 'vbbl_2025 must appear at least once')
})

// ===========================================================================
// 4. UI / access safety — route placement and nav isolation
// ===========================================================================

test('mapping audit page exists at the correct admin route path', () => {
  assert.ok(
    srcExists('app/admin/checklists/mapping-audit/page.tsx'),
    'page must be at src/app/admin/checklists/mapping-audit/page.tsx'
  )
})

test('mapping audit page uses AdminShell, not a builder or inspector shell', () => {
  const source = read('app/admin/checklists/mapping-audit/page.tsx')
  assert.ok(source.includes('AdminShell'), 'page must render inside AdminShell')
  assert.ok(!source.includes('BuilderShell'), 'page must not use BuilderShell')
  assert.ok(!source.includes('InspectorShell'), 'page must not use InspectorShell')
})

test('mapping audit page does not exist anywhere in the builder app tree', () => {
  assert.ok(
    !srcExists('app/builder/checklists/mapping-audit/page.tsx'),
    'mapping audit page must not be routable under /builder'
  )
})

test('mapping audit page does not exist anywhere in the inspector app tree', () => {
  assert.ok(
    !srcExists('app/inspector/checklists/mapping-audit/page.tsx'),
    'mapping audit page must not be routable under /inspector'
  )
})

test('builder dashboard page does not reference the mapping audit module or route', () => {
  const source = read('app/builder/page.tsx')
  assert.ok(!source.includes('checklistMappingAudit'), 'builder dashboard must not reference checklistMappingAudit')
  assert.ok(!source.includes('mapping-audit'), 'builder dashboard must not link to the mapping-audit route')
})

test('inspector dashboard page does not reference the mapping audit module or route', () => {
  const source = read('app/inspector/page.tsx')
  assert.ok(!source.includes('checklistMappingAudit'), 'inspector dashboard must not reference checklistMappingAudit')
  assert.ok(!source.includes('mapping-audit'), 'inspector dashboard must not link to the mapping-audit route')
})

test('builder layout does not link to the mapping audit route', () => {
  const source = read('app/builder/layout.tsx')
  assert.ok(!source.includes('mapping-audit'), 'builder layout must not link to mapping-audit')
})

test('inspector layout does not link to the mapping audit route', () => {
  const source = read('app/inspector/layout.tsx')
  assert.ok(!source.includes('mapping-audit'), 'inspector layout must not link to mapping-audit')
})

test('ChecklistMappingAuditClient component contains no form submission or mutation handlers', () => {
  const source = read('components/admin/ChecklistMappingAuditClient.tsx')
  assert.ok(!source.includes('onSubmit'), 'client component must not have form onSubmit handlers')
  assert.ok(!source.includes("method: 'POST'"), 'client component must not make POST requests')
  assert.ok(!source.includes("method: 'PUT'"), 'client component must not make PUT requests')
  assert.ok(!source.includes("method: 'DELETE'"), 'client component must not make DELETE requests')
  assert.ok(!source.includes('supabase'), 'client component must not call Supabase directly')
})
