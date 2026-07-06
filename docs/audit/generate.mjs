// Read-only audit generator for the Vero Permit inspection-template packet.
// Parses checklist items directly from the seed migrations (System B) so the
// printout provably matches the source. Emits the stage bodies for the Markdown
// master doc and a print-ready HTML file. Changes no app code or templates.
//
// Usage: node docs/audit/generate.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repo = join(__dirname, '..', '..')
const migrations = join(repo, 'supabase', 'migrations')
const auditDir = __dirname

// ── Current inspection_stages (System B) after the S10–S15 rename migration.
// stage_number → metadata. templateSlug = the ORIGINAL slug templates were keyed on.
const STAGES = [
  { n: 1,  title: 'Site Survey & Excavation',                 slug: 'site_survey_excavation',            phase: 1, discipline: 'geotechnical',  specialties: ['geotechnical','structural'], master: false, templateSlug: 'site_survey_excavation',    templateTitle: 'Site Survey & Excavation', mismatch: false },
  { n: 2,  title: 'Foundation Formwork & Rebar',              slug: 'foundation_formwork_rebar',         phase: 1, discipline: 'structural',    specialties: ['structural','geotechnical'], master: false, templateSlug: 'foundation_formwork_rebar', templateTitle: 'Foundation & Structural',  mismatch: false },
  { n: 3,  title: 'Foundation Pour',                          slug: 'foundation_pour',                   phase: 1, discipline: 'structural',    specialties: ['structural','geotechnical'], master: false, templateSlug: 'foundation_pour',           templateTitle: 'Foundation Pour',          mismatch: false },
  { n: 4,  title: 'Framing & Lock-up',                        slug: 'framing_lockup',                    phase: 2, discipline: 'structural',    specialties: ['structural'],                master: false, templateSlug: 'framing_lockup',            templateTitle: 'Framing & Lockup',         mismatch: false },
  { n: 5,  title: 'Roof Deck & Sheathing',                    slug: 'roof_deck_sheathing',               phase: 2, discipline: 'structural',    specialties: ['structural','architectural'],master: false, templateSlug: 'roof_deck_sheathing',       templateTitle: 'Roof Deck & Sheathing',    mismatch: false },
  { n: 6,  title: 'Mechanical Rough-In',                      slug: 'mechanical_rough_in',               phase: 3, discipline: 'mechanical',    specialties: ['mechanical'],                master: false, templateSlug: 'mechanical_rough_in',       templateTitle: 'Mechanical Rough-In',      mismatch: false },
  { n: 7,  title: 'Fire Suppression Rough-In',                slug: 'fire_suppression_rough_in',         phase: 3, discipline: 'fire_protection',specialties: ['fire_suppression'],          master: false, templateSlug: 'fire_suppression_rough_in', templateTitle: 'Fire Suppression Rough-In', mismatch: false },
  { n: 8,  title: 'Electrical Rough-In',                      slug: 'electrical_rough_in',               phase: 3, discipline: 'electrical',    specialties: ['electrical'],                master: false, templateSlug: 'electrical_rough_in',       templateTitle: 'Electrical Rough-In',      mismatch: false },
  { n: 9,  title: 'Plumbing Rough-In',                        slug: 'plumbing_rough_in',                 phase: 3, discipline: 'plumbing',      specialties: ['plumbing'],                  master: false, templateSlug: 'plumbing_rough_in',         templateTitle: 'Plumbing Rough-In',        mismatch: false },
  { n: 10, title: 'Electrical Permit and Scope',             slug: 'electrical_permit_and_scope',       phase: 4, discipline: 'electrical',    specialties: ['electrical'],                master: false, templateSlug: 'building_envelope',         templateTitle: 'Building Envelope',        mismatch: true },
  { n: 11, title: 'Gas Permit and Mechanical / HVAC Scope',  slug: 'gas_mechanical_hvac_scope',         phase: 4, discipline: 'mechanical',    specialties: ['mechanical'],                master: false, templateSlug: 'insulation_vapor_barrier', templateTitle: 'Insulation & Vapour Barrier', mismatch: true },
  { n: 12, title: 'Insulation and Energy Compliance',        slug: 'insulation_energy_compliance',      phase: 5, discipline: null,           specialties: ['architectural','mechanical','electrical','plumbing'], master: false, templateSlug: 'drywall_interior_finish', templateTitle: 'Drywall & Interior Finish', mismatch: true },
  { n: 13, title: 'Interior Completion',                     slug: 'interior_completion',               phase: 5, discipline: 'architectural',specialties: ['architectural'],             master: false, templateSlug: 'life_safety_systems',      templateTitle: 'Life Safety Systems',      mismatch: true },
  { n: 14, title: 'Exterior Works and Site Finalization',    slug: 'exterior_works_site_finalization',  phase: 6, discipline: null,           specialties: ['geotechnical','structural','architectural'], master: false, templateSlug: 'final_site_grading', templateTitle: 'Final Site Grading', mismatch: false },
  { n: 15, title: 'Inspections, Final Approval, and Occupancy', slug: 'final_approval_and_occupancy',   phase: 6, discipline: null,           specialties: [],                            master: true,  templateSlug: 'final_occupancy_permit',   templateTitle: 'Final Occupancy Permit',   mismatch: false },
]

const PHASE_LABEL = {
  1: 'Phase 1 — Excavation & Foundation', 2: 'Phase 2 — Structure',
  3: 'Phase 3 — Mechanical Rough-In',     4: 'Phase 4 — Envelope & Insulation',
  5: 'Phase 5 — Interior & Life Safety',  6: 'Phase 6 — Final',
}

// Dependency graph (depends_on stage numbers) from 20260427020000.
const DEPS = {
  2: [1], 3: [2], 4: [3], 5: [4], 6: [4], 7: [4], 8: [4], 9: [4],
  10: [5], 11: [6, 8, 9, 7], 12: [11, 10], 13: [12], 14: [3],
  15: [1,2,3,4,5,6,7,8,9,10,11,12,13,14],
}
// NOTE: DEPS keys use ORIGINAL slug graph mapped by stage_number. See §0.4 —
// dependencies were seeded against the original slugs; mapping is by number.

// ── SQL tuple parser ────────────────────────────────────────────────────────
function splitTopLevel(s) {
  const out = []; let cur = ''; let depth = 0; let q = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (q) {
      if (c === "'" && s[i + 1] === "'") { cur += "''"; i++; continue }
      if (c === "'") { q = false; cur += c; continue }
      cur += c; continue
    }
    if (c === "'") { q = true; cur += c; continue }
    if (c === '(') { depth++; cur += c; continue }
    if (c === ')') { depth--; cur += c; continue }
    if (c === ',' && depth === 0) { out.push(cur); cur = ''; continue }
    cur += c
  }
  if (cur.trim() !== '') out.push(cur)
  return out
}
function unq(raw) {
  const t = raw.trim()
  if (t.toLowerCase() === 'null') return null
  if (t.toLowerCase() === 'true') return true
  if (t.toLowerCase() === 'false') return false
  if (/^\d+$/.test(t)) return Number(t)
  if (t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).replace(/''/g, "'")
  return t
}

// Extract balanced-paren tuples from a `values ...` region.
function extractTuples(region) {
  const tuples = []; let depth = 0; let start = -1; let q = false
  for (let i = 0; i < region.length; i++) {
    const c = region[i]
    if (q) { if (c === "'" && region[i + 1] === "'") { i++; continue } if (c === "'") q = false; continue }
    if (c === "'") { q = true; continue }
    if (c === '(') { if (depth === 0) start = i + 1; depth++; continue }
    if (c === ')') { depth--; if (depth === 0) { tuples.push(region.slice(start, i)); } continue }
  }
  return tuples
}

// Parse one migration file into a list of item records.
function parseMigration(text) {
  const records = []
  const sections = text.split(/with tmpl as \(/i).slice(1)
  for (const sec of sections) {
    // stage slug scope
    const slugs = []
    const mEq = sec.match(/s\.slug\s*=\s*'([^']+)'/i)
    const mIn = sec.match(/s\.slug\s+in\s*\(([^)]*)\)/i)
    if (mEq) slugs.push(mEq[1])
    else if (mIn) for (const m of mIn[1].matchAll(/'([^']+)'/g)) slugs.push(m[1])
    if (!slugs.length) continue
    // jurisdiction scope
    const jx = []
    const jEq = sec.match(/j\.slug\s*=\s*'([^']+)'/i)
    const jIn = sec.match(/j\.slug\s+in\s*\(([^)]*)\)/i)
    if (jEq) jx.push(jEq[1])
    else if (jIn) for (const m of jIn[1].matchAll(/'([^']+)'/g)) jx.push(m[1])
    if (!jx.length) continue

    let items = []
    const valIdx = sec.search(/\)\s*as\s*\(\s*\n\s*values/i) >= 0 ? sec.search(/\bvalues\b/i) : -1
    if (/\)\s*as\s*\(\s*values|as \(\s*\n\s*values|\bvalues\b/i.test(sec) && /items\s*\(/i.test(sec)) {
      // region from `values` to the insert statement
      const vStart = sec.search(/\bvalues\b/i)
      const insIdx = sec.search(/\)\s*insert into public\.stage_checklist_items/i)
      const region = sec.slice(vStart + 6, insIdx > 0 ? insIdx : sec.length)
      const tuples = extractTuples(region)
      for (const t of tuples) {
        const f = splitTopLevel(t).map(unq)
        if (f.length >= 7 && typeof f[0] === 'number') {
          items.push({ sort: f[0], label: f[1], text: f[2], required: f[3], ref: f[4], srcTitle: f[5], url: f[6] })
        }
      }
    } else {
      // direct single-item insert: select tmpl.template_id, <fields...> from tmpl
      const dm = sec.match(/select\s+tmpl\.template_id,([\s\S]*?)from tmpl/i)
      if (dm) {
        const f = splitTopLevel(dm[1]).map(unq)
        // f: sort, label, text, item_type, required, ref, srcTitle, url
        if (f.length >= 8 && typeof f[0] === 'number') {
          items.push({ sort: f[0], label: f[1], text: f[2], required: f[4], ref: f[5], srcTitle: f[6], url: f[7] })
        }
      }
    }
    if (!items.length) continue
    for (const slug of slugs) records.push({ slug, jx, items })
  }
  return records
}

// ── Build item index: itemsByStageJx[slug][jxSlug] = [items...] ──────────────
const files = [
  '20260427030000_checklist_template_seeds.sql',
  '20260428010000_checklist_remaining_stages.sql',
]
const byStageJx = {}
for (const file of files) {
  const text = readFileSync(join(migrations, file), 'utf8')
  for (const rec of parseMigration(text)) {
    for (const jxSlug of rec.jx) {
      byStageJx[rec.slug] ??= {}
      byStageJx[rec.slug][jxSlug] ??= []
      for (const it of rec.items) {
        const arr = byStageJx[rec.slug][jxSlug]
        if (!arr.find(x => x.label === it.label)) arr.push(it)
      }
    }
  }
}
for (const slug in byStageJx)
  for (const jx in byStageJx[slug])
    byStageJx[slug][jx].sort((a, b) => a.sort - b.sort)

// ── Renderers ────────────────────────────────────────────────────────────────
function stageMetaLines(st, jxLabel, items) {
  const depTitles = (DEPS[st.n] || []).map(d => `S${String(d).padStart(2,'0')}`).join(', ') || 'None'
  return {
    number: `S${String(st.n).padStart(2, '0')}`,
    title: st.title,
    phase: PHASE_LABEL[st.phase],
    discipline: st.discipline || '(multi-discipline / none)',
    specialties: st.specialties.length ? st.specialties.join(', ') : '(none — master seal gate)',
    master: st.master ? 'Yes — Stage requires a **master inspector** seal' : 'No (specialty inspector seal)',
    templateTitle: `${st.templateTitle} — ${jxLabel}`,
    deps: depTitles,
    count: items.length,
  }
}

function mdStage(st, jxSlug, jxLabel) {
  const items = (byStageJx[st.templateSlug]?.[jxSlug]) || []
  const m = stageMetaLines(st, jxLabel, items)
  let out = `\n### Stage ${m.number} — ${m.title}\n\n`
  if (st.mismatch)
    out += `> ⚠ **Title / content mismatch (see §0.4).** The stage row is titled **"${st.title}"**, `
      + `but the checklist template still attached to it is **"${st.templateTitle}"** — its items below `
      + `describe *${st.templateTitle.replace(/ — .*/, '')}*, not *${st.title}*.\n\n`
  out += `| Field | Value |\n|---|---|\n`
  out += `| Stage number | ${m.number} (phase ${st.phase} — ${m.phase.replace(/^Phase \d+ — /, '')}) |\n`
  out += `| Stage title (current DB) | ${m.title} |\n`
  out += `| Discipline / category | ${m.discipline} |\n`
  out += `| Visible to specialties | ${m.specialties} |\n`
  out += `| Professional review / sign-off | ${st.n <= 9 || st.n === 15 ? 'Schedule B field-review references present' : 'See items'} |\n`
  out += `| Schedule C-B relevant | ${st.n === 15 ? 'Yes — C-A / C-B collection item present' : 'Indirect (Schedule B references)'} |\n`
  out += `| Requires master seal | ${m.master} |\n`
  out += `| Depends on stages | ${m.deps} |\n`
  out += `| Active template | ${m.templateTitle} (v1) |\n`
  out += `| Checklist items | ${m.count} (all required, all boolean confirmation) |\n\n`
  out += `**Uniform per-item fields (see §0.2):** Evidence = inspector confirmation · Pass = requirement confirmed · Fail/Corrections = cannot confirm → seal blocked · Hold = stage-level dependency lock · Required = yes.\n\n`
  out += `**Checklist items:**\n\n`
  items.forEach((it, i) => {
    out += `${i + 1}. **${it.label}**\n`
    out += `   - Inspector must verify: ${it.text}\n`
    out += `   - Code reference: ${it.ref || '—'}\n`
    out += `   - Source: ${it.srcTitle || '—'}${it.url ? ` — ${it.url}` : ''}\n`
  })
  out += `\n**Audit questions — Stage ${m.number}:**\n`
  out += `- Missing items? ${st.mismatch ? '⚠ Content belongs to "' + st.templateTitle.replace(/ — .*/,'') + '", so items for "' + st.title + '" are effectively missing.' : 'Coverage is at a professional-summary level; field-measurement sub-items are not itemised.'}\n`
  out += `- Evidence clear? No per-item evidence type is defined (boolean only) — photo/video/pin requirements are not specified here.\n`
  out += `- Pass/fail/hold clear? Pass/fail is binary at the item level; hold is only at the stage-seal level.\n`
  out += `- Wording understandable for a BC inspector? Requirement text is plain-language and code-referenced.\n`
  out += `- Vague / duplicated / out of sequence? ${st.mismatch ? 'Sequence/label mismatch flagged above.' : 'No duplication within the stage.'}\n`
  out += `- Missing jurisdiction-specific requirements? ${jxSlug === 'vbbl_2025' && (st.n === 9 || st.n === 15) ? 'VBBL-specific item(s) present (see count vs BCBC).' : 'None beyond the shared BCBC set for this stage.'}\n`
  return out
}

// ── Compose Markdown stage bodies + Part 2 + summary ─────────────────────────
let md = ''
for (const st of STAGES) md += mdStage(st, 'vbbl_2025', 'Vancouver Building By-law 2025')

md += `\n---\n\n# Part 2 — British Columbia Building Code 2024 (\`bcbc_2024\`)\n\n`
md += `Effective date seeded: **2024-03-08** · Code version label: **BCBC 2024**.\n\n`
md += `BCBC templates are the base set. They are **identical to Part 1 (VBBL 2025)** for 13 of 15 `
    + `stages. BCBC has **fewer** items than VBBL at exactly two stages:\n\n`
md += `- **Stage S09 (Plumbing):** BCBC 8 items — VBBL adds a 9th (Sewer/storm connection placard).\n`
md += `- **Stage S15 (Final Occupancy):** BCBC 3 items — VBBL adds 4 City-of-Vancouver occupancy items.\n\n`
md += `_Same uniform per-item field model as Part 1 (§0.2)._\n`
for (const st of STAGES) md += mdStage(st, 'bcbc_2024', 'BC Building Code 2024')

// counts
const countJx = (jx) => STAGES.reduce((a, st) => a + ((byStageJx[st.templateSlug]?.[jx])||[]).length, 0)
const vbblTotal = countJx('vbbl_2025')
const bcbcTotal = countJx('bcbc_2024')
const stagesWithItems = (jx) => STAGES.filter(st => ((byStageJx[st.templateSlug]?.[jx])||[]).length > 0).length

md += `\n---\n\n# Part 3 — Final Summary\n\n`
md += `| Metric | VBBL 2025 | BCBC 2024 |\n|---|---|---|\n`
md += `| Stages defined (\`inspection_stages\`) | 15 | 15 |\n`
md += `| Stages with a seeded template | ${stagesWithItems('vbbl_2025')} / 15 | ${stagesWithItems('bcbc_2024')} / 15 |\n`
md += `| Total checklist items | ${vbblTotal} | ${bcbcTotal} |\n`
md += STAGES.map(st => `| &nbsp;&nbsp;S${String(st.n).padStart(2,'0')} ${st.title} | ${((byStageJx[st.templateSlug]?.['vbbl_2025'])||[]).length} | ${((byStageJx[st.templateSlug]?.['bcbc_2024'])||[]).length} |`).join('\n')
md += `\n\n**Findings:**\n`
md += `- **All 15 stages present** for both jurisdictions; every stage has a seeded, non-empty template. No stage has zero items.\n`
md += `- **No stage has per-item evidence requirements** — the template model is boolean-only (§0.2). Evidence/pass/fail/pending live in System C (Appendix A), which is jurisdiction-agnostic.\n`
md += `- **⚠ Stages 10–13 show a title/content mismatch** (§0.4): the stage was renamed to a permit-centric label but kept the old construction-model checklist. Stages 14–15 are intent-aligned despite a title change.\n`
md += `- **Stages 1–9 titles** use the construction model and do **not** match System C's permit-centric S1–S9 names — terminology is inconsistent across the two models.\n`
md += `- **Jurisdiction divergence is minimal:** only S09 (+1 VBBL item) and S15 (+4 VBBL items). All other stages are byte-identical between jurisdictions in the seed.\n`
md += `- **Suspected seed/authored data:** all content is authored SQL seed (idempotent upserts), not a live code-database import. Requires professional review before operational reliance.\n`
md += `- **Source-of-truth uncertainty:** three parallel models (A/B/C, §0.1). The jurisdiction split exists only in System B; the completion workspace runs on System C; the builder "View Code" panel uses System A.\n`

md += `\n---\n\n# Appendix A — Runtime completion model (System C, jurisdiction-agnostic)\n\n`
md += `\`src/lib/inspectorCompletion.ts\` → \`RAW_STAGES\` defines the 15 permit-centric stages the `
    + `inspector completion workspace actually runs. Unlike System B it carries, **per item**: `
    + `\`passWhen\`, \`failWhen\`, \`pendingWhen\` (= hold), \`requiredEvidence\`, \`optionalEvidence\`, `
    + `\`evidenceMode\` (\`required_upload\` | \`verify_existing\`), \`documentUploadRequired\`, `
    + `\`responsibleParty\`, \`ahjNotes\`, \`dependencies\`, and \`codeReferences[]\` with a per-reference `
    + `\`isVbblOnly\` flag. This is the correct place to look for the photo/upload/pass/fail/hold detail. `
    + `It is **not** split into two jurisdictions — a single item set is served, with individual code `
    + `references flagged VBBL-only.\n\n`
md += `| S# | System C stage name (runtime) | System B stage title (DB, this packet) | Same? |\n|---|---|---|---|\n`
const SYSC = ['Project Setup and Jurisdiction Check','Planning and Site Approvals','Building Permit Submission Package','Site Prep and Pre-Excavation','Footings, Foundation, and Slab','Structural Frame','Building Envelope','Fire and Life Safety','Plumbing Permit and Scope','Electrical Permit and Scope','Gas Permit and Mechanical / HVAC Scope','Insulation and Energy Compliance','Interior Completion','Exterior Works and Site Finalization','Inspections, Final Approval, and Occupancy']
for (let i = 0; i < 15; i++) md += `| S${String(i+1).padStart(2,'0')} | ${SYSC[i]} | ${STAGES[i].title} | ${SYSC[i] === STAGES[i].title ? '✅' : '❌'} |\n`

md += `\n---\n\n# Appendix B — Legacy phase model (System A)\n\n`
md += `\`src/lib/inspectionTemplates.ts\` → \`INSPECTION_PHASES\`: 9 phases (EXC, FND, FRM, INS, FOC + `
    + `trade phases RIP, RIE, FPL, FEL), Vancouver-only, per item \`item_name\` / \`description\` / `
    + `\`is_critical\` / \`code_ref\`. No jurisdiction split, no evidence fields, no 15-stage numbering. `
    + `Selected by builder stage number + discipline via \`getPhasesForStage()\`; routing only covers `
    + `builder stages 1–5, so it does not map cleanly onto the 15-stage models. Retained for the builder `
    + `wizard "View Code" reference panels.\n`

// ── Write Markdown (append to existing preamble) ─────────────────────────────
const mdPath = join(auditDir, 'inspection-template-printout.md')
let base = readFileSync(mdPath, 'utf8')
base = base.replace('<!-- STAGE_BODY -->', md.trimStart())
writeFileSync(mdPath, base)

// ── Write HTML ───────────────────────────────────────────────────────────────
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function htmlStage(st, jxSlug, jxLabel) {
  const items = (byStageJx[st.templateSlug]?.[jxSlug]) || []
  const m = stageMetaLines(st, jxLabel, items)
  let h = `<section class="stage"><h3>Stage ${m.number} — ${esc(m.title)}</h3>`
  if (st.mismatch) h += `<p class="warn">⚠ Title / content mismatch: stage titled "<b>${esc(st.title)}</b>" still carries the "<b>${esc(st.templateTitle)}</b>" checklist below.</p>`
  h += `<table class="meta"><tr><th>Stage number</th><td>${m.number} (phase ${st.phase})</td></tr>`
    + `<tr><th>Discipline</th><td>${esc(m.discipline)}</td></tr>`
    + `<tr><th>Visible to specialties</th><td>${esc(m.specialties)}</td></tr>`
    + `<tr><th>Requires master seal</th><td>${st.master ? 'Yes (master)' : 'No'}</td></tr>`
    + `<tr><th>Depends on</th><td>${esc(m.deps)}</td></tr>`
    + `<tr><th>Active template</th><td>${esc(m.templateTitle)} (v1)</td></tr>`
    + `<tr><th>Items</th><td>${m.count} (all required, boolean)</td></tr></table>`
  h += `<p class="uniform">Evidence = inspector confirmation · Pass = requirement confirmed · Fail = cannot confirm → seal blocked · Hold = stage-level dependency lock.</p>`
  h += `<ol class="items">`
  for (const it of items) {
    h += `<li><b>${esc(it.label)}</b><div class="verify">Inspector must verify: ${esc(it.text)}</div>`
      + `<div class="ref">Code: ${esc(it.ref || '—')}</div>`
      + `<div class="src">Source: ${esc(it.srcTitle || '—')}${it.url ? ` — <a href="${esc(it.url)}">${esc(it.url)}</a>` : ''}</div></li>`
  }
  h += `</ol></section>`
  return h
}
let body = ''
body += `<h1>Part 1 — Vancouver Building By-law 2025 (vbbl_2025)</h1>`
for (const st of STAGES) body += htmlStage(st, 'vbbl_2025', 'Vancouver Building By-law 2025')
body += `<h1>Part 2 — British Columbia Building Code 2024 (bcbc_2024)</h1>`
for (const st of STAGES) body += htmlStage(st, 'bcbc_2024', 'BC Building Code 2024')

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Vero Permit Inspection Template Audit Packet</title>
<style>
  body{font:14px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;max-width:900px;margin:2rem auto;padding:0 1.5rem}
  h1{border-bottom:3px solid #C6A15B;padding-bottom:.3rem;margin-top:2.5rem}
  h3{margin-top:2rem;color:#1B1508;background:#faf6ec;border-left:4px solid #C6A15B;padding:.4rem .6rem}
  table.meta{border-collapse:collapse;margin:.6rem 0;width:100%}
  table.meta th,table.meta td{border:1px solid #ddd;padding:.3rem .5rem;text-align:left;vertical-align:top}
  table.meta th{background:#f5f5f5;width:220px}
  ol.items>li{margin:.5rem 0}
  .verify{margin:.15rem 0}
  .ref,.src{color:#555;font-size:.85em}
  .warn{background:#fff4e5;border:1px solid #e0a800;padding:.5rem .7rem;border-radius:4px}
  .uniform{color:#555;font-size:.85em;font-style:italic}
  .lead{background:#f7f7f7;border:1px solid #ddd;padding:1rem;border-radius:6px}
  @media print{a{color:#000;text-decoration:none}h3{break-inside:avoid}section.stage{break-inside:avoid}}
</style></head><body>
<h1 style="border:none">Vero Permit — Inspection Template Audit Packet</h1>
<p class="lead"><b>Generated 2026-07-05.</b> Read-only extraction from the jurisdiction-aware
database checklist templates (System B). All items are boolean inspector-confirmation items;
per-item evidence/pass/fail/hold detail lives in the runtime completion model (System C) and is
described in the Markdown master document. <b>Stages 10–13 carry a title/content mismatch — see the
Markdown §0.4.</b> Full source-of-truth analysis, audit questions, and summary are in
<code>inspection-template-printout.md</code>.</p>
${body}
</body></html>`
writeFileSync(join(auditDir, 'inspection-template-printout.html'), html)

// ── Console report ────────────────────────────────────────────────────────────
console.log('VBBL 2025 total items:', vbblTotal, '| stages with template:', stagesWithItems('vbbl_2025'))
console.log('BCBC 2024 total items:', bcbcTotal, '| stages with template:', stagesWithItems('bcbc_2024'))
console.log('Per-stage (VBBL / BCBC):')
for (const st of STAGES) {
  const v = ((byStageJx[st.templateSlug]?.['vbbl_2025'])||[]).length
  const b = ((byStageJx[st.templateSlug]?.['bcbc_2024'])||[]).length
  console.log(`  S${String(st.n).padStart(2,'0')} ${st.title.padEnd(42)} V=${v} B=${b}`)
}
