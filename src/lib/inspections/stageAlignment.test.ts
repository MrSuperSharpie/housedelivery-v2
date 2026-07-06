/**
 * Stage source-of-truth alignment guard (audit sprint: template stabilization).
 *
 * Source-derived regression test. It independently parses three definitions and
 * guards the invariants that keep inspector-facing stage titles consistent with
 * the checklist content attached to them:
 *
 *   1. DB stage titles   — supabase/migrations 20260427020000 + 20260605000000
 *   2. Attached template — supabase/migrations 20260427030000 + 20260428010000
 *   3. Runtime (System C)— src/lib/inspectorCompletion.ts RAW_STAGES
 *
 * Design: both assertions are GREEN today, catch NEW drift, and tolerate the
 * eventual canonical migration that fixes S10–S13 (see
 * docs/audit/template-source-of-truth-stabilization.md §LOOP 2).
 *
 * Reads files only. No database, no network, no app behaviour touched.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const migrations = join(process.cwd(), 'supabase', 'migrations')
const mig = (f: string) => readFileSync(join(migrations, f), 'utf8')
const src = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')

// Slug → stage_number (original + current permit-centric slugs; later migrations
// override earlier per stage number in parseTemplateSubjects).
const SLUG_TO_NUM: Record<string, number> = {
  site_survey_excavation: 1, foundation_formwork_rebar: 2, foundation_pour: 3,
  framing_lockup: 4, roof_deck_sheathing: 5, mechanical_rough_in: 6,
  fire_suppression_rough_in: 7, electrical_rough_in: 8, plumbing_rough_in: 9,
  building_envelope: 10, insulation_vapor_barrier: 11, drywall_interior_finish: 12,
  life_safety_systems: 13, final_site_grading: 14, final_occupancy_permit: 15,
  electrical_permit_and_scope: 10, gas_mechanical_hvac_scope: 11,
  insulation_energy_compliance: 12, interior_completion: 13,
}

function parseDbTitles(): Record<number, string> {
  const out: Record<number, string> = {}
  const seed = mig('20260427020000_inspection_stage_seeds.sql')
  for (const m of seed.matchAll(/\(\s*(\d+),\s*\n\s*'([^']+)',\s*\n\s*'([^']+)',/g)) out[Number(m[1])] = m[3]
  const rename = mig('20260605000000_correct_inspection_stage_labels_s10_s15.sql')
  for (const block of rename.split(/update public\.inspection_stages/).slice(1)) {
    const t = block.match(/title\s*=\s*'([^']+)'/)
    const n = block.match(/where stage_number\s*=\s*(\d+)/)
    if (t && n) out[Number(n[1])] = t[1]
  }
  return out
}

function parseTemplateSubjects(): Record<number, string> {
  const out: Record<number, string> = {}
  // Parsed in order; later migration overrides earlier for the same stage, so the
  // S10–S13 re-seed supersedes the original construction-model subjects.
  for (const f of [
    '20260427030000_checklist_template_seeds.sql',
    '20260428010000_checklist_remaining_stages.sql',
    '20260705000000_align_s10_s13_templates_permit_centric.sql',
  ]) {
    for (const m of mig(f).matchAll(/\('([a-z_]+)',\s*'bcbc_2024',\s*'([^']+)'\)/g)) {
      const num = SLUG_TO_NUM[m[1]]
      if (num) out[num] = m[2].replace(/\s*[—-]\s*(BC Building Code 2024|British Columbia Building Code 2024).*/, '').trim()
    }
  }
  return out
}

function parseRuntimeNames(): Record<number, string> {
  const out: Record<number, string> = {}
  for (const m of src('src/lib/inspectorCompletion.ts').matchAll(/stageNumber:\s*(\d+),\s*\n\s*stageName:\s*'([^']+)'/g)) {
    out[Number(m[1])] = m[2]
  }
  return out
}

function renamedStageNumbers(): Set<number> {
  const set = new Set<number>()
  for (const m of mig('20260605000000_correct_inspection_stage_labels_s10_s15.sql').matchAll(/where stage_number\s*=\s*(\d+)/g)) {
    set.add(Number(m[1]))
  }
  return set
}

const STOP = new Set(['and', 'the', 'of', 'for', 'permit', 'scope', 'systems'])
const tokenize = (s: string) => new Set(s.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)))
const overlaps = (a: string, b: string) => { const B = tokenize(b); for (const w of tokenize(a)) if (B.has(w)) return true; return false }
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

test('parsers resolve all 15 stages from every source', () => {
  const db = parseDbTitles(), tm = parseTemplateSubjects(), rt = parseRuntimeNames()
  for (let n = 1; n <= 15; n++) {
    assert.ok(db[n], `DB title missing for stage ${n}`)
    assert.ok(tm[n], `template subject missing for stage ${n}`)
    assert.ok(rt[n], `runtime name missing for stage ${n}`)
  }
})

test('no title/content hard-mismatch on any stage (S10–S13 alignment applied)', () => {
  const db = parseDbTitles(), tm = parseTemplateSubjects(), renamed = renamedStageNumbers()
  const hard: number[] = []
  // Hard = a renamed stage whose title shares no significant word with its
  // attached checklist subject. Post-alignment this set must be empty.
  for (const n of renamed) if (!overlaps(db[n], tm[n])) hard.push(n)
  assert.deepEqual(hard, [], `title/content hard-mismatch present at S${hard.join(', S')}. `
    + `A stage renders a title over unrelated checklist content — fix the alignment migration.`)
})

test('renamed stage titles stay synchronised with the runtime (System C) model', () => {
  const db = parseDbTitles(), rt = parseRuntimeNames()
  for (const n of renamedStageNumbers()) {
    assert.equal(db[n], rt[n], `DB stage title for S${n} ("${db[n]}") is out of sync with the runtime `
      + `completion model ("${rt[n]}"). Rename both together.`)
  }
})

// Jurisdiction resolution: source-derived assertion on resolveActiveTemplate's
// city → jurisdiction mapping (Vancouver → vbbl_2025; everything else → bcbc_2024).
test('resolver maps Vancouver to vbbl_2025 and non-Vancouver to bcbc_2024', () => {
  const resolver = src('src/lib/inspections/resolveActiveTemplate.ts')
  assert.match(resolver, /=== 'vancouver'\s*\?\s*'vbbl_2025'\s*:\s*'bcbc_2024'/,
    'Vancouver → vbbl_2025 / else → bcbc_2024 mapping not found in resolveActiveTemplate.ts')
  assert.match(resolver, /if \(!city\) return 'bcbc_2024'/,
    'null-city default → bcbc_2024 not found in resolveActiveTemplate.ts')
})

// Specific proof of the S10–S13 alignment migration: each stage's active
// template subject now equals its permit-centric DB stage title.
test('S10–S13 active template subject equals the permit-centric stage title', () => {
  const db = parseDbTitles(), tm = parseTemplateSubjects()
  for (const n of [10, 11, 12, 13]) {
    assert.equal(norm(tm[n]), norm(db[n]), `S${n} template subject ("${tm[n]}") does not match `
      + `its stage title ("${db[n]}"). The S10–S13 alignment re-seed is missing or regressed.`)
  }
})
