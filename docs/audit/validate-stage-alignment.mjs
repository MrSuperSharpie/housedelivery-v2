// Read-only stage-alignment validator (audit sprint: template source-of-truth).
//
// Independently parses THREE sources and reports, per stage, whether the
// rendered DB stage title agrees with the checklist template still attached to
// it and with the runtime (System C) stage name:
//   1. DB stage titles  — supabase/migrations/20260427020000 (seed) + 20260605000000 (S10–S15 rename)
//   2. Attached template subjects — 20260427030000 + 20260428010000 (bcbc rows, suffix stripped)
//   3. Runtime names — src/lib/inspectorCompletion.ts (RAW_STAGES `stageName`)
//
// Runs with plain `node`. Reads no database, changes nothing, installs nothing.
// Exit code is non-zero if any HARD mismatch (S10–S13 class) is detected, so it
// can gate CI once the canonical migration lands.
//
// Usage: node docs/audit/validate-stage-alignment.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const mig = (f) => readFileSync(join(repo, 'supabase', 'migrations', f), 'utf8')
const src = (f) => readFileSync(join(repo, f), 'utf8')

// Original slug (how templates were keyed) → stage_number.
const SLUG_TO_NUM = {
  site_survey_excavation: 1, foundation_formwork_rebar: 2, foundation_pour: 3,
  framing_lockup: 4, roof_deck_sheathing: 5, mechanical_rough_in: 6,
  fire_suppression_rough_in: 7, electrical_rough_in: 8, plumbing_rough_in: 9,
  building_envelope: 10, insulation_vapor_barrier: 11, drywall_interior_finish: 12,
  life_safety_systems: 13, final_site_grading: 14, final_occupancy_permit: 15,
}

// ── 1. DB stage titles ───────────────────────────────────────────────────────
const dbTitle = {}
{
  // seed: values ( <num>, '<slug>', '<title>', ... )
  const seed = mig('20260427020000_inspection_stage_seeds.sql')
  for (const m of seed.matchAll(/\(\s*(\d+),\s*\n\s*'([^']+)',\s*\n\s*'([^']+)',/g)) {
    dbTitle[Number(m[1])] = m[3]
  }
  // rename overrides S10–S15: update ... set title = '...' ... where stage_number = N;
  const rename = mig('20260605000000_correct_inspection_stage_labels_s10_s15.sql')
  for (const block of rename.split(/update public\.inspection_stages/).slice(1)) {
    const t = block.match(/title\s*=\s*'([^']+)'/)
    const n = block.match(/where stage_number\s*=\s*(\d+)/)
    if (t && n) dbTitle[Number(n[1])] = t[1]
  }
}

// ── 2. Attached template subjects (bcbc rows; strip " — BC Building Code 2024") ─
const tmplSubject = {}
for (const f of ['20260427030000_checklist_template_seeds.sql', '20260428010000_checklist_remaining_stages.sql']) {
  const text = mig(f)
  for (const m of text.matchAll(/\('([a-z_]+)',\s*'bcbc_2024',\s*'([^']+)'\)/g)) {
    const num = SLUG_TO_NUM[m[1]]
    if (num) tmplSubject[num] = m[2].replace(/\s*[—-]\s*(BC Building Code 2024|British Columbia Building Code 2024).*/, '').trim()
  }
}

// ── 3. Runtime (System C) stage names ────────────────────────────────────────
const runtimeName = {}
{
  const ic = src('src/lib/inspectorCompletion.ts')
  const re = /stageNumber:\s*(\d+),\s*\n\s*stageName:\s*'([^']+)'/g
  for (const m of ic.matchAll(re)) runtimeName[Number(m[1])] = m[2]
}

// ── Which stages did the rename migration touch? Only these can desync, because
//    their title was changed AFTER the template was attached. Stages never
//    renamed keep title/content from the same era (cosmetic wording deltas OK).
const renamed = new Set()
{
  const rename = mig('20260605000000_correct_inspection_stage_labels_s10_s15.sql')
  for (const m of rename.matchAll(/where stage_number\s*=\s*(\d+)/g)) renamed.add(Number(m[1]))
}

// ── Compare ──────────────────────────────────────────────────────────────────
// HARD mismatch: a renamed stage whose new title shares NO significant word with
// the checklist subject still attached to it (title names a different discipline).
// SOFT: renamed but the title still overlaps the retained content (intent kept).
const STOP = new Set(['and', 'the', 'of', 'for', 'a', 'to', 'in', 'with', 'permit', 'scope', 'systems'])
const tokens = (s) => new Set(s.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)))
const overlaps = (a, b) => { const A = tokens(a), B = tokens(b); for (const w of A) if (B.has(w)) return true; return false }

const rows = []
let hard = 0
for (let n = 1; n <= 15; n++) {
  const db = dbTitle[n] ?? '(missing)'
  const tm = tmplSubject[n] ?? '(missing)'
  const rt = runtimeName[n] ?? '(missing)'
  const dbRuntimeAgree = db === rt
  let status
  if (!renamed.has(n)) status = 'OK'
  else if (overlaps(db, tm)) status = 'SOFT (title changed, intent preserved)'
  else { status = 'HARD MISMATCH'; hard++ }
  rows.push({ n, db, tm, rt, dbRuntimeAgree, status })
}

// ── Report ───────────────────────────────────────────────────────────────────
const pad = (s, w) => String(s).padEnd(w)
console.log('Stage alignment — DB title vs attached template subject vs runtime (System C) name\n')
console.log(pad('S#', 4) + pad('DB stage title', 42) + pad('Attached template subject', 30) + 'Status')
console.log('-'.repeat(110))
for (const r of rows) {
  console.log(pad('S' + String(r.n).padStart(2, '0'), 4) + pad(r.db, 42) + pad(r.tm, 30) + r.status)
}
console.log('\nDB-title == runtime-name (System C) per stage:')
for (const r of rows) console.log(`  S${String(r.n).padStart(2,'0')} ${r.dbRuntimeAgree ? '==' : '!='} runtime  (db="${r.db}" | runtime="${r.rt}")`)
console.log(`\nHARD mismatches (title describes a different discipline than its checklist): ${hard}`)
console.log(hard === 0
  ? 'PASS — every DB stage title agrees with the checklist content attached to it.'
  : `FAIL — ${hard} stage(s) render a title over unrelated checklist content. See docs/audit/template-source-of-truth-stabilization.md §LOOP 2.`)
process.exit(hard === 0 ? 0 : 1)
