# Vero Permit — Inspection Template Source-of-Truth Stabilization

**Sprint:** LOOP cleanup — audit-defensibility & source-of-truth stabilization
**Branch:** `audit/template-source-of-truth-stabilization` (from `stripe-connect-sandbox-setup`)
**Date:** 2026-07-05 · **Mode:** audit + additive validation only
**Inputs:** `docs/audit/inspection-template-printout.md` (prior packet) and the Deep Research report.

> **No app logic, templates, migrations, Stripe/payments, auth, job-claiming, Vault, or
> Schedule C-B generation were modified.** The only code added is a read-only validation
> script and a source-derived regression test. The S10–S13 hard fix requires a Supabase
> migration and is therefore **documented, not applied** (a product/architecture hard stop).

---

## Executive result

| Question | Answer |
|---|---|
| Does the live inspector **completion workspace** show the S10–S13 mismatch? | **No.** It runs on System C, which is internally consistent (title ↔ content agree). |
| Where **is** the mismatch visible to users? | System B **preview/reference** surfaces only: the claim modal scope preview, the inspector *stage reference* page, the resolve-template API, admin coverage. |
| How many stages are hard-mismatched? | **4** — S10, S11, S12, S13 (validated). S14–S15 are soft (title changed, closeout intent preserved). |
| Is there a safe **code-only** fix that aligns title↔content? | **No** — any code-only title swap in System B merely relocates the inconsistency across systems. The correct fix is a data migration. |
| Is evidence item-bound in the live workspace? | **Yes** — evidence is bound per `item_code`; `required_evidence` guidance is displayed; Pass is gated (a note does not satisfy the gate). |
| Are Passed / Corrections / Hold / N/A / Pending separated? | **Yes**, in the live workspace, with dedicated copy. Gaps are mostly in the **DB template model** and in **N/A applicability**, documented below. |

---

## LOOP 1 — Source-of-truth audit

### The three systems and who actually consumes them

| System | File | Live consumers (non-test) | Role today |
|---|---|---|---|
| **A — legacy phases** | `src/lib/inspectionTemplates.ts` | **None** (`rg` finds no non-test importer in `src`) | **Orphaned / dead.** Not wired to any UI. `StageCodeReferences` uses System C, not A. |
| **B — DB templates** | `src/lib/inspections/resolveActiveTemplate.ts` + seed migrations | `JobDetailModal` (claim scope preview), `src/app/inspector/stages/page.tsx` (+ `StagesClient`), `src/app/api/inspections/resolve-template/route.ts`, `src/app/api/admin/checklists/coverage/route.ts`, `src/lib/catalogue.ts` | **Jurisdiction reference/preview.** The only system that splits `vbbl_2025` vs `bcbc_2024`. Boolean-only items. |
| **C — runtime completion** | `src/lib/inspectorCompletion.ts` (`RAW_STAGES`) | `InspectorCompletionWorkspace`, `store.tsx`, `StageCodeReferences`, `admin/submissions`, `schedule-cb` PDF pipeline, `supabase/inspectorCompletion.ts`, `inspectorDevPreview.ts` | **The workhorse.** Drives the actual checklist the inspector fills in, and the Schedule C-B packet. Carries per-item pass/fail/pending + evidence. |

### Answers to the five audit questions

1. **Which system drives the inspector checklist UI?** Two different UIs, two different systems:
   - The **inspection completion workspace** (where the inspector records pass/fail/evidence and seals) → **System C**.
   - The **claim scope preview** (`JobDetailModal`) and the **stage reference page** (`inspector/stages`) → **System B**.
2. **Which system drives VBBL 2025 vs BCBC 2024?** **Only System B.** `resolveActiveTemplate.cityToJurisdictionSlug` maps `city === 'vancouver' → vbbl_2025`, else `bcbc_2024`. System C is jurisdiction-agnostic (individual code references carry an `isVbblOnly` flag, but items are not split).
3. **Which system contains pass/fail/hold/pending/evidence logic?** **Only System C.** System B items are `item_type='boolean'`, `is_required=true`, with no evidence type, N/A, hold, or pass/fail fields. System A has none of this either.
4. **Does the S10–S13 mismatch affect the live inspector UI, the DB only, or both?** **DB + the System B preview/reference surfaces — not the primary completion workspace.** Because the completion workspace runs on System C (whose S10–S13 titles *and* content are both permit-centric and consistent), an inspector recording an inspection does **not** see a mismatched checklist. The mismatch is user-visible on the System B surfaces (worst case: the `inspector/stages` page, which renders the renamed stage title over the old checklist items — `StagesClient.tsx:386` header `{stage.title}` vs the template items).
5. **Are there three competing sources of truth?** Functionally **two live** (B for jurisdiction reference, C for the workflow) plus **one dead** (A). They disagree on stage numbering, titles, jurisdiction scope, and depth. There is no single governed source.

---

## LOOP 2 — S10–S13 title/content mismatch

### Mechanism

Migration `20260428010000` attached checklist templates to stages by **slug at migration time**
(the original construction-model slugs). Migration `20260605000000` later **renamed the stage rows**
(S10–S15) to a permit-centric model but left the attached templates untouched — and templates join
by **stage UUID**, so the renamed rows kept their old checklist content.

### Per-stage detail (validated by `docs/audit/validate-stage-alignment.mjs`)

| S# | Rendered stage title (DB, current) | Attached template + items (unchanged) | Runtime (System C) content | Live-UX mismatched? |
|---|---|---|---|---|
| **S10** | Electrical Permit and Scope | **Building Envelope** (air barrier, cladding, glazing) | Electrical service/rough/telecom | ❌ Hard — System B surfaces |
| **S11** | Gas Permit and Mechanical / HVAC Scope | **Insulation & Vapour Barrier** (R-values, vapour barrier) | Gas/mechanical/HVAC scope | ❌ Hard — System B surfaces |
| **S12** | Insulation and Energy Compliance | **Drywall & Interior Finish** (fire-rated board, firestop) | Insulation/airtightness/energy | ❌ Hard — System B surfaces |
| **S13** | Interior Completion | **Life Safety Systems** (fire alarm, smoke/CO, egress) | Interior walls/trim/accessibility | ❌ Hard — System B surfaces |
| S14 | Exterior Works and Site Finalization | Final Site Grading (grading/drainage) | Grading/site closeout | ⚠ Soft (intent preserved) |
| S15 | Inspections, Final Approval, and Occupancy | Final Occupancy Permit (occupancy/LOA) | Final approvals/occupancy | ⚠ Soft (intent preserved) |

Note the secondary finding surfaced by the validator: **S1–S9 DB titles do not match System C's
S1–S9 names either** (e.g. DB S01 "Site Survey & Excavation" vs System C S01 "Project Setup and
Jurisdiction Check"). The two models only converged titles on the renamed S10–S15. This is a
deeper numbering-model divergence for the canonical reconciliation to resolve — but it is **not** a
title/content mismatch inside either system (each system is internally self-consistent for S1–S9).

### Why no code-only fix was applied (and what would be faking it)

Within **System B**, the attached template title and its items already agree (both construction-model);
the outlier is the renamed **stage-row title**. Within **System C**, title and content also agree
(both permit-centric). The two systems simply hold **different checklists for the same stage number**
(e.g. envelope content vs electrical content at S10). Therefore:

- A code-only change that swaps the System B heading to the template's own subject would make
  title↔content agree *on that one surface* — but it would then contradict the workspace (System C),
  which shows a genuinely different checklist for the same stage. That trades a visible inconsistency
  for a hidden cross-system one. **That is relocating the defect, not fixing it.**
- The Deep Research report reaches the same conclusion: *"do not patch wording in place … update stage
  discipline, dependencies, UI title, and template attachment in the same migration."*

**Decision:** the correct fix is a Supabase migration (a canonical data-model decision). Per the sprint's
hard-stop rules, that is **documented here, not applied.** A validation guard is added so drift cannot
regress silently.

### Required migration (canonical fix) — needs product/architecture approval

Pick **one** direction intentionally (do not let it drift):

- **Option A — permit-centric (recommended by the report).** Migrate the S10–S13 *templates* (title +
  items) to match the runtime permit-centric model (System C): S10 electrical permit/scope, S11
  gas/mechanical, S12 insulation/energy, S13 interior completion. Larger change; must version-lock
  in-flight permits and add regression coverage before applying.
- **Option B — restore construction titles (narrowest).** Re-`UPDATE public.inspection_stages` so
  S10–S13 titles/slugs return to `building_envelope`, `insulation_vapor_barrier`,
  `drywall_interior_finish`, `life_safety_systems` (matching their still-attached content). This
  re-desyncs the DB from System C's S10–S15 names, so it is only sensible if System C is *also*
  reverted — i.e. it abandons the permit-centric direction.

Either way the migration must, in one atomic change, keep **stage title + slug + discipline +
`visible_to_specialties` + dependency graph + attached template + System C runtime name** mutually
consistent, and must **not** reassign stage UUIDs for existing active permits (version-lock template
resolution per permit if needed). Do **not** copy System C text into System B blindly — reconcile.

### Validation evidence (runnable now — no DB, no packages)

`node docs/audit/validate-stage-alignment.mjs` → **FAIL, 4 HARD mismatches (S10–S13)**, exit 1.
Regression test `src/lib/inspections/stageAlignment.test.ts` (Node `tsx --test`) is **green today** and:
- fails if a **new** title/content hard-mismatch is introduced beyond the known S10–S13 set;
- fails if a renamed stage's DB title drifts from the System C runtime name.
Once the canonical migration lands, `validate-stage-alignment.mjs` should return **PASS / exit 0**.

---

## LOOP 3 — Evidence requirement stabilization

**Scope inspected:** `InspectorCompletionWorkspace.tsx` (`RequiredEvidenceActionPanel`,
`checklistEntryNeedsEvidence`, `isStageItemReadyForSignOff`, `focusRequiredEvidenceUpload`,
`REQUIRED_EVIDENCE_LOCK_MESSAGE`), `FieldMediaUploader.tsx`, and System C's per-item
`required_evidence` / `evidence_mode` / `document_upload_required`.

### Findings — the live workspace already satisfies the product rule

- **Evidence is item-bound**, not generic. Uploads are keyed by `item_code`
  (`evidenceUploadRefs.current[itemCode]`, `focusRequiredEvidenceUpload(itemCode)`), and the Pass gate
  is evaluated per item (`evidence_mode === 'required_upload' && document_upload_required`).
- **Required evidence is displayed at the item**, and prefers specific guidance over generic text:
  `RequiredEvidenceActionPanel` renders `item.required_evidence` when present, and only falls back to a
  generic "a photo, video, file, or note…" line when the item defines none
  (`InspectorCompletionWorkspace.tsx:933`). This already meets the acceptance criterion *"required
  evidence must not be presented as vague when the item has more specific guidance available."*
- **Pass is blocked until required evidence is attached.** `REQUIRED_EVIDENCE_LOCK_MESSAGE`
  ("A regular note/comment does not satisfy this requirement unless captured as evidence") and the
  "X of 1 required evidence items captured" counter enforce and communicate the gate.
- **Missing-evidence messaging names the item/container** (dependency-lock and required-evidence
  notices reference the specific `itemCode`/container).

### Is evidence item-bound, container-bound, or generic?
**Item-bound** (per `item_code`), surfaced within its checklist container. Evidence attached to one
item **cannot** satisfy another item's gate (uploads are stored against the item code).

### Can unrelated evidence satisfy the gate?
**Partially.** The gate is **quantitative** — it requires **≥1 evidence item attached to that specific
item**. It cannot verify that the attached file is *semantically* the right shot; the UI already warns
"Required evidence must support the inspection decision — not just satisfy a file check"
(`InspectorCompletionWorkspace.tsx:966`). So: a wrong-but-attached-to-this-item file would pass the
count; a file attached to a *different* item would **not**. Cross-item leakage is prevented; intra-item
semantic correctness is an inherent limitation and is already disclaimed in copy.

### Documented gaps (for the canonical refactor — no safe code change this sprint)
- **System B (DB templates) carry no evidence metadata at all** (boolean-only). The rich per-item
  evidence lives only in System C. Reconciliation must move evidence rules into the canonical source so
  the jurisdiction templates are not evidence-blind.
- **Evidence-type specificity:** `evidence_mode` distinguishes `required_upload` vs `verify_existing`,
  but the *type* (photo vs video vs pin-drop vs document) is expressed as free-text in
  `required_evidence`, not as a typed, enforceable field. A typed evidence schema would let the UI
  demand "a photo" specifically. Documented; not implemented (would require the canonical model).

**No code change made in LOOP 3** — the live behaviour already meets the acceptance criteria, so editing
this protected, safety-critical file would be gratuitous churn.

---

## LOOP 4 — Hold / Corrections Required / N/A / Pending pass-gate audit

**Scope inspected:** the Section Outcome controls and status copy in `InspectorCompletionWorkspace.tsx`
(`SECTION_OUTCOME_HELPER`, `HOLD_SAME_DAY_HELPER`, `FAIL_SECTION_*`, `STAGE_BLOCKER_HELPER`,
`Corrections Required` panel, `inspection_status` values), plus `isItemEffectivelyComplete`.

### Findings — states are already separated in the live workspace

| State | Status value | Copy / behaviour |
|---|---|---|
| **Passed** | `Passed` | Blocked until required evidence complete and dependencies passed. |
| **Corrections Required** | `Failed` (rendered "Corrections Required") | For observed deficiencies; requires a deficiency note + evidence before submit (`FAIL_SECTION_DOC_REQUIRED_MESSAGE`). |
| **Hold** | hold flow | Explicitly framed as a **minor same-day** correction: *"Use Hold when a minor correction can likely be completed while you are still on site … If it is not corrected before you leave, mark Corrections Required."* (`HOLD_SAME_DAY_HELPER`). |
| **N/A** | `N/A` | Treated as effectively complete (`isItemEffectivelyComplete` = Passed \|\| N/A). |
| **Pending / Draft** | `Pending` | Default draft state until an outcome is chosen (`SECTION_OUTCOME_HELPER`). |

Specific checks requested:
- **Is Hold described as same-day only?** ✅ Yes (`HOLD_SAME_DAY_HELPER`).
- **Is Hold used too narrowly?** Somewhat — Hold currently means "minor same-day fix." The report's
  richer AHJ hold taxonomy (site **unsafe**, **inaccessible**, **not ready**, **progressed beyond the
  inspection point / requires uncovering**) is **not modelled**. The "Important Clearance Notes" panel
  (`STAGE_BLOCKER_HELPER`) is reference copy only; the Stage-Blocker workflow is explicitly "not built
  yet." **Documented gap.**
- **Can N/A be selected when evidence is required?** ⚠ **Yes** — `isItemEffectivelyComplete` treats
  `N/A` as complete and bypasses the required-evidence gate (`evidenceExpectations`/pass checks return
  early on `N/A`). For genuinely non-applicable items that is correct, but there is **no template-level
  control over which items may be N/A'd** (System B has no N/A path; System C `is_required` logic is
  inferred). Flagged for the canonical model: N/A applicability should be a governed per-item rule.
- **Is Passed blocked until required evidence is complete?** ✅ Yes (LOOP 3).
- **Do missing-evidence messages identify the item/container?** ✅ Yes.

### Documented gaps (for the next canonical-template refactor)
1. **Hold taxonomy is too narrow.** Add governed hold reasons: *unsafe*, *inaccessible*, *not ready*,
   *beyond inspection point (uncover required)* — distinct from same-day minor correction. Behavioural
   change → not a wording tweak → deferred.
2. **N/A must be governed per item/jurisdiction.** Specialty/conditional stages (fire suppression on
   non-sprinklered projects, gas items on all-electric, deep foundations, occupancy permits for
   houses/laneway) should be N/A-eligible by rule; universally-required items should not be N/A-able.
   Requires the canonical model + a migration.
3. **S15 conflation** (platform status vs municipal final vs occupancy permit vs agency approvals vs
   LOA) — the report's most important content fix after S10–S13. Requires content rework in the
   canonical source, not a wording pass.

**No code change made in LOOP 4** — the existing state separation and copy are already strong and were
recently refined; the remaining items are behavioural/data-model changes that are out of safe scope for
this sprint.

---

## What was fixed vs. documented

**Delivered (safe, additive):**
- `docs/audit/template-source-of-truth-stabilization.md` — this report.
- `docs/audit/validate-stage-alignment.mjs` — runnable, DB-free stage-alignment validator (currently
  FAILs with 4 hard mismatches; will PASS after the canonical migration).
- `src/lib/inspections/stageAlignment.test.ts` — source-derived regression guard (3 tests, green) that
  catches new drift and title/runtime desync using the project's existing `tsx --test` runner.

**Documented only (require product/architecture approval — hard stops):**
- The S10–S13 canonical fix (Supabase migration; Option A vs B decision).
- Reconciling System B (jurisdiction split) with System C (evidence/status logic) into one governed
  source; deprecating/dead-coding System A.
- Typed evidence schema; governed N/A applicability; richer Hold taxonomy; S15 de-conflation.

## Next loop
1. Product/architecture decision on canonical direction (Option A recommended).
2. Author the reconciliation migration under version-lock + expand `stageAlignment.test.ts` to assert
   the post-fix invariant (0 hard mismatches).
3. Wire `validate-stage-alignment.mjs` into CI once green.
4. Content rework: S15 subsections, N/A rules, Hold taxonomy, VBBL overlays.

## How to run the checks
```
node docs/audit/validate-stage-alignment.mjs      # stage title↔content alignment (exit 1 until fixed)
npx tsx --test src/lib/inspections/stageAlignment.test.ts   # regression guard (green)
```
