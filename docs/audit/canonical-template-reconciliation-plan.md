# Canonical Inspection Template Reconciliation Plan

**Sprint:** LOOP — canonical reconciliation planning (planning only; no code/migration applied)
**Branch:** `audit/template-source-of-truth-stabilization`
**Date:** 2026-07-05 · **Status:** Awaiting product/architecture approval before any migration
**Predecessor:** `docs/audit/template-source-of-truth-stabilization.md`

> **This document is a plan, not an implementation.** No template was rewritten, no migration was
> created, nothing was merged or deployed. It exists so the next sprint can execute a precise,
> approved change. Restricted systems (Stripe/payments, auth/session, Vault storage, Schedule C-B
> generation, job-claiming) are **out of scope** and untouched.

---

## 0. TL;DR

- **Recommended: Option A — make the permit-centric runtime model (System C) canonical, then
  regenerate the DB jurisdiction templates (System B) from it.**
- **Why:** System C already drives the live workspace + Schedule C-B and already carries the
  evidence/pass/fail/pending/N-A/Hold logic and a VBBL flag (`isVbblOnly`). Option B (reverting titles
  to the construction model) would force reverting System C too and abandons the permit-driven model BC
  and Vancouver guidance actually follow. Option B is a **temporary hotfix only**, not a destination.
- **The S10–S13 fix is a data migration** (re-seed those stages' DB templates from the canonical
  source, version-bumped). It requires approval and must protect in-flight permits.
- **First, a mandatory pre-migration investigation:** confirm whether `permit_checklist_responses`
  (System B) holds live data and how `seal_inspection_stage` consumes it, because re-seeding item rows
  changes which items the seal gate checks. This gates the whole migration design.

---

## LOOP 2 — Canonical direction decision

### Option A — Permit-centric (System C) canonical; regenerate System B from it  ✅ RECOMMENDED

| Dimension | Assessment |
|---|---|
| **Pros** | One governed source. Keeps the model the live workspace + Schedule C-B already use. Retains System C's evidence/status/pass-fail/N-A/Hold logic and `isVbblOnly` jurisdiction lever. Fixes S10–S13 by making System B *match* System C (the model users already inspect against). Aligns with permit-driven BC/Vancouver guidance. |
| **Risks** | Larger change. Requires a canonical schema + a generator/seed path from System C → DB. Re-seeding `stage_checklist_items` mints new UUIDs → must protect in-flight `permit_checklist_responses`. Needs regression coverage before apply. |
| **Files affected** | Canonical source (new, e.g. `src/lib/inspections/canonicalTemplates.ts` **derived from** `inspectorCompletion.ts`); a new Supabase migration re-seeding `stage_checklist_templates` + `stage_checklist_items` (version-bumped) for S10–S13 (then optionally all 15); `resolveActiveTemplate.ts` unchanged in shape (still reads active version); validators + tests updated. **No change** to `inspectorCompletion.ts` runtime behaviour. |
| **Migration risk** | Medium. Data-only (no schema change needed if we reuse existing columns; a schema *extension* for typed evidence/N-A is a later, separate migration). Idempotent upserts + version bump. |
| **Impact on existing permits** | **The key risk.** New item UUIDs would not match responses already recorded against old item UUIDs. Mitigation: version-bump (insert new `version=2` templates `is_active=true`, set old `version=1` `is_active=false`) **and** resolve the template version pinned to each permit/assignment where responses exist. See LOOP 5. |
| **Impact on inspector UI (workspace)** | **None** — the workspace runs on System C, which is already correct. This change makes the *reference/preview* surfaces agree with it. |
| **Impact on reference/preview pages** | `inspector/stages`, `JobDetailModal`, `resolve-template` API, admin coverage begin showing S10–S13 content that matches their titles. Positive. |
| **Impact on VBBL vs BCBC split** | Preserved and improved. The canonical source expresses jurisdiction via overlays (promote `isVbblOnly` from code-reference flag to item/overlay level); the generator emits `vbbl_2025` and `bcbc_2024` templates as it does today (VBBL = BCBC + Vancouver overlays). |
| **Validation that proves success** | `validate-stage-alignment.mjs` → PASS / exit 0 (0 hard mismatches). `stageAlignment.test.ts` extended to assert 0 hard mismatches. New resolver test: for each stage+jurisdiction, resolved template title matches the stage's canonical title and item subjects. In-flight permit fixture keeps its recorded responses after migration. |

### Option B — Restore DB/reference titles to the construction-stage content

| Dimension | Assessment |
|---|---|
| **Pros** | Narrowest possible change: `UPDATE inspection_stages` titles/slugs for S10–S13 back to `building_envelope` / `insulation_vapor_barrier` / `drywall_interior_finish` / `life_safety_systems`. No item re-seed → no UUID churn → in-flight `permit_checklist_responses` untouched. Immediately makes System B title↔content agree. |
| **Risks** | **Re-desyncs System B from System C.** System C's S10–S15 names are permit-centric; reverting DB titles makes DB and the live workspace disagree again (the opposite drift). `stageAlignment.test.ts`'s "renamed titles stay synced with runtime" guard would then fail unless System C is *also* reverted — which is a large backward step and abandons the permit-driven direction. |
| **Files affected** | One migration (`UPDATE inspection_stages` × 4). No item changes. |
| **Migration risk** | Low mechanically, high strategically. |
| **Impact on existing permits** | Minimal (no item UUID change). |
| **Impact on inspector UI (workspace)** | Would now **disagree** with the reference pages unless System C is reverted too. |
| **Impact on reference/preview pages** | Titles match their old content again. |
| **Impact on VBBL vs BCBC split** | Unchanged (still shallow). |
| **Validation** | `validate-stage-alignment.mjs` would need its `renamed` set / runtime-sync assertion revisited, because "renamed" would no longer apply. |

**Verdict:** **Option A.** Option B is only justified as a **stop-gap hotfix** if a pilot must ship
*this week* and the canonical migration cannot be ready; even then it should be paired with reverting
System C titles to avoid a new cross-system split, and it is explicitly throwaway.

---

## LOOP 3 — S10–S13 correction table (Option A)

Canonical direction = permit-centric (adopt System C titles + content; regenerate DB templates).

| Field | **S10** | **S11** | **S12** | **S13** |
|---|---|---|---|---|
| Current DB / reference title | Electrical Permit and Scope | Gas Permit and Mechanical / HVAC Scope | Insulation and Energy Compliance | Interior Completion |
| Current attached template content | Building Envelope items (air barrier, cladding, glazing) | Insulation & Vapour Barrier items (R-values, vapour barrier) | Drywall & Interior Finish items (fire-rated board, firestop) | Life Safety Systems items (fire alarm, smoke/CO, egress) |
| Current System C runtime title / content | Electrical Permit and Scope — service, rough wiring, life-safety circuits, telecom | Gas Permit and Mechanical / HVAC — gas/mechanical/HVAC scope, approvals | Insulation and Energy Compliance — thermal envelope, airtightness, energy docs | Interior Completion — interior walls, trim, accessibility |
| **Recommended final canonical title** | **Electrical Permit and Scope** | **Gas Permit and Mechanical / HVAC Scope** | **Insulation and Energy Compliance** | **Interior Completion** |
| **Recommended final checklist subject** | Adopt System C S10 containers (electrical) | Adopt System C S11 containers (gas/mechanical/HVAC) | Adopt System C S12 containers (insulation/energy) | Adopt System C S13 containers (interior completion) |
| **VBBL vs BCBC differ?** | Base identical; VBBL overlays where System C S10 has `isVbblOnly` refs | Base identical; VBBL overlays per `isVbblOnly` | **Yes — VBBL should differ more** (energy/GHG/commissioning per 2025 VBBL guide); VBBL overlays required | Base identical; VBBL overlays for existing-building / TI context |
| **Migration required?** | Yes (re-seed template + items, version-bump) | Yes | Yes | Yes |
| **In-flight version-lock needed?** | Yes if `permit_checklist_responses` has live S10 rows (see LOOP 5 gate) | Yes | Yes | Yes |
| **Exact acceptance test** | `resolveActiveTemplate(10, 'vancouver')` title = "Electrical Permit and Scope" and item subjects are electrical; `validate-stage-alignment.mjs` S10 = OK | same for S11 (gas/mechanical) | same for S12 (insulation/energy), and VBBL S12 item count > BCBC S12 | same for S13 (interior completion) |

Also record the deeper structural note (not part of the S10–S13 hotfix, for the full reconciliation):
**S1–S9 DB titles also diverge from System C's S1–S9 names** (construction vs permit-centric). The full
canonical pass should reconcile the *entire* 15-stage numbering to one model; the S10–S13 correction is
the audit-critical subset.

---

## LOOP 4 — Evidence model reconciliation design (design only — no evidence code changed)

### What System C already has (the raw material)
Per-item, in `CompletionChecklistItemDefinition` / `StructuredStageItemDefinition`:
`pass_when[]`, `fail_when[]`, `pending_when[]`, `required_evidence[]`, `optional_evidence[]`,
`evidence_mode: 'required_upload' | 'verify_existing'`, `document_upload_required`,
`is_required: boolean | string` (**free-text conditional prose** carries N/A + Hold triggers today),
`responsible_party: 'Builder'|'Inspector'|'Auditor'|'AHJ'`, `inspection_status:
'Pending'|'Passed'|'Failed'|'N/A'`, `code_references[]` with `isVbblOnly`.

### What System B (DB templates) has
Only `label`, `requirement_text`, `item_type='boolean'`, `is_required=true`, `legal_reference`,
`source_title`, `source_url`. **No evidence, N/A, Hold, pass/fail.** This is the gap.

### Canonical representation (target model)
Each canonical checklist item should carry these governed fields (superset of System C, typed):

| Canonical field | Source today | Target shape | Notes |
|---|---|---|---|
| **required evidence text** | `required_evidence[]` | `string[]` (kept) | Human guidance; already shown in `RequiredEvidenceActionPanel`. |
| **evidence type** | free-text inside `required_evidence` | **new typed enum**: `photo \| video \| document \| pin_drop \| note \| verify_existing` (multi) | Promote from prose to enforceable type so UI can demand "a photo". |
| **item/container binding** | `item_code` | keep — evidence binds to `item_code`; container = checklist container | Already item-bound in the live workspace; preserve. |
| **pass gate** | `evidence_mode` + `document_upload_required` | `evidence_required: boolean` + `evidence_min_count` (default 1) | Encodes today's "≥1 evidence before Pass". |
| **N/A interaction** | `is_required` prose ("Applicability-gated … mark Not Applicable") | **structured** `applicability: 'always' \| 'conditional'` + `na_allowed: boolean` + `na_trigger_text` | Governs *which* items may be N/A'd; removes today's inferred/ungoverned N/A. |
| **Hold interaction** | `is_required` / `pending_when` prose ("If unclear, Hold for AHJ or QP") | **structured** `hold_reasons: ('unsafe'\|'inaccessible'\|'not_ready'\|'beyond_inspection_point'\|'awaiting_ahj')[]` | Broadens today's same-day-only Hold; still a later behavioural change. |
| **inspector attestation / caption** | evidence upload caption (workspace) | `attestation_required: boolean`, `caption_required: boolean` | Make caption expectations explicit per item. |
| **supporting vs required evidence** | `required_evidence[]` vs `optional_evidence[]` | keep the distinction; `optional_*` never gates Pass | Already distinguished in System C. |
| **jurisdiction overlay** | `code_references[].isVbblOnly` | promote to item-level `jurisdictions: ['bcbc_2024','vbbl_2025']` + per-item VBBL overlay | Lets VBBL add/replace items, not just flag references. |

### Live evidence-binding gaps — confirmation
From the prior sprint, re-confirmed: in the **live workspace** evidence is **item-bound** (keyed by
`item_code`), specific `required_evidence` is shown when present, and **Pass is gated** (a note does not
satisfy). **Remaining gaps (data-model, not live bugs):**
1. Evidence *type* is free-text, not an enforceable enum.
2. N/A applicability is inferred from prose, not governed → an item can be N/A'd even when evidence is
   required (correct for truly-N/A items, but ungoverned).
3. System B templates are evidence-blind — only System C has the logic; reconciliation must move it into
   the canonical/DB source so jurisdiction reference surfaces are not evidence-blind.
4. Intra-item semantic correctness of an attached file is not verifiable (inherent; already disclaimed).

---

## LOOP 5 — Migration safety plan (Option A; drafted, NOT applied)

### Mandatory pre-migration investigation (gates everything)
Before writing the migration, confirm:
- Does `permit_checklist_responses` (System B) contain live/production rows? (Prod-safe read only.)
- How does `seal_inspection_stage` consume them, and does any live flow seal via System B vs System C?
- Are System C completion responses stored separately (keyed by `item_code` strings, not
  `stage_checklist_items` UUIDs)? If so, re-seeding System B items does **not** affect System C progress
  — which greatly lowers risk and may make version-lock unnecessary for the workspace.

### Migration strategy (data-only, idempotent)
1. Author canonical S10–S13 content (electrical / gas-mechanical / insulation-energy / interior) as a
   reviewed source derived from System C — **not** copied blindly (report's guidance).
2. In one migration: `INSERT` new `stage_checklist_templates` rows at `version = 2`, `is_active = true`
   for S10–S13 × {bcbc_2024, vbbl_2025}; `INSERT` their `stage_checklist_items`; then set the old
   `version = 1` templates `is_active = false`. Do **not** delete v1 rows, do **not** touch stage UUIDs.
3. VBBL templates = BCBC items + Vancouver overlays (start with S12 energy/GHG per 2025 VBBL guide).
4. Optionally in the same migration, correct S10–S13 `inspection_stages.discipline` /
   `visible_to_specialties` to match the electrical/mechanical/architectural realities.

### Rollback strategy
- Reversible by flipping `is_active`: reactivate `version = 1`, deactivate `version = 2`. Because v1 rows
  are never deleted and item UUIDs are additive, rollback restores the prior served content exactly.
- Keep the migration free of destructive `DELETE`/`DROP`. Provide a companion "down" note in the file.

### Versioning strategy
- Use the existing `stage_checklist_templates.version` + `is_active` + `effective_from/effective_to`.
- Resolver already selects the latest active version. For in-flight protection, resolve the version by
  `effective_from <= permit.created_at` (pin per permit) **if** the investigation shows live responses
  bound to v1 items.

### Active / in-flight permit protection
- If System C stores workspace progress separately (likely): workspace is unaffected; only the
  reference/preview surfaces change → low risk, version-lock optional.
- If System B `permit_checklist_responses` has live S10–S13 rows: pin those permits to `version = 1`
  (via effective-date resolution) so their recorded responses and seal state remain valid; new permits
  get `version = 2`.

### Validation tests
- `validate-stage-alignment.mjs` → exit 0.
- `stageAlignment.test.ts` → extend: assert HARD set is **empty**; keep the runtime-sync assertion.
- New resolver unit/integration test: resolved title ↔ item subjects agree per stage+jurisdiction; VBBL
  S12 item count > BCBC S12.
- In-flight fixture test: a permit with v1 responses still resolves v1 and keeps its responses.

### Manual QA checklist (staging/local only — never hosted prod)
- [ ] `inspector/stages` shows S10 electrical content under the S10 electrical title (all 15 sane).
- [ ] `JobDetailModal` scope preview matches stage title for S10–S13, both cities.
- [ ] Vancouver project → `vbbl_2025`; non-Vancouver → `bcbc_2024` (unchanged).
- [ ] A pre-existing in-flight permit shows unchanged progress and seal state.
- [ ] Seal gate still blocks on incomplete required items for a new permit.
- [ ] Schedule C-B packet unchanged (System C untouched).

---

## LOOP 6 — Deliverable summary

1. **Recommended option:** **A** (permit-centric System C canonical; regenerate System B).
2. **Why:** single governed source that matches what the live workspace + Schedule C-B already use and
   the permit-driven BC/Vancouver reality; fixes S10–S13 by aligning B to C rather than reverting C.
3. **S10–S13 correction table:** see LOOP 3.
4. **Evidence model reconciliation:** see LOOP 4 (structure System C's prose into typed evidence-type,
   governed N/A applicability, Hold reasons, jurisdiction overlays; keep item binding + Pass gate).
5. **Migration/refactor plan:** see LOOP 5 (pre-investigation gate → version-bumped data migration →
   reversible via `is_active` → in-flight pin by effective date).
6. **Tests/validators needed:** extended `stageAlignment.test.ts` (0 hard), resolver alignment test,
   in-flight fixture test, `validate-stage-alignment.mjs` → exit 0.
7. **Files likely affected (next sprint):** new canonical source module; new Supabase migration
   (S10–S13 template/item re-seed, version-bumped); possibly `inspection_stages` discipline fields;
   validators/tests. `resolveActiveTemplate.ts` behaviour unchanged.
8. **Explicit no-touch files/systems:** Stripe/payments/checkout/escrow/Connect/pricing; auth/session;
   Vault storage; **Schedule C-B generation** (`ScheduleCBGenerator.tsx`, `schedule-cb` route,
   `src/lib/pdf/*`); job-claiming; `src/lib/inspectorCompletion.ts` **runtime behaviour** (read as the
   canonical *source of content*, but do not change its logic in the reconciliation migration);
   `src/app/admin/builders/page.tsx` (protected).
9. **Next implementation prompt for Claude Code:** see below.

---

## Next implementation prompt (for the approved migration sprint)

> Continue on `audit/template-source-of-truth-stabilization` (or a child branch). Execute Option A for
> **S10–S13 only** (do not touch S1–S9 or S14–S15 content yet).
> 1. **Pre-flight (read-only):** determine whether `permit_checklist_responses` has live rows and how
>    `seal_inspection_stage` uses them; confirm whether System C workspace progress is stored separately
>    (by `item_code`). Report findings before writing SQL. **Stop and confirm** the version-lock decision.
> 2. Author a reviewed canonical S10–S13 content set derived from `inspectorCompletion.ts` (electrical /
>    gas-mechanical / insulation-energy / interior), with BCBC base + VBBL overlays (start S12 energy/GHG).
> 3. Write ONE idempotent, reversible Supabase migration: insert `version=2` active templates + items for
>    S10–S13 × {bcbc_2024, vbbl_2025}; deactivate `version=1`; never delete rows or reassign stage UUIDs.
>    **Do not apply to hosted Supabase.**
> 4. Extend `stageAlignment.test.ts` (assert 0 hard mismatches) and add a resolver alignment test.
> 5. Run `node docs/audit/validate-stage-alignment.mjs` (expect exit 0), `npm run check:imports`,
>    `npx tsx --test src/lib/inspections/*.test.ts`, `npm run build`.
> 6. Commit + push. **No merge. No deploy. No hosted migration.** Restricted systems remain untouched.
