# S10–S13 Template Alignment — Implementation Preflight (Option A)

**Sprint:** implementation-preflight LOOP (Option A approved)
**Branch:** `fix/s10-s13-template-alignment-option-a` (from `audit/template-source-of-truth-stabilization`)
**Date:** 2026-07-05 · **Status:** ✅ **Live-data blocker cleared (all counts zero) — migration DRAFTED, not applied.**
**No merge, no deploy, no hosted migration, no `supabase db push`. No restricted systems touched.**

### Live-data results (queries A + B, run by product on the hosted DB)
Global System B counts — `total_responses: 0`, `total_stage_statuses: 0`, `total_seals: 0`.
Per-stage S10–S13 — all of `checklist_responses`, `permits_with_responses`, `sealed_rows`,
`in_flight_unsealed_rows` = **0** for every stage. **Decision rule → "all zero" → the version-bump
re-seed is clearly safe.** Blocker cleared; migration authored below.

**Migration file:** `supabase/migrations/20260705000000_align_s10_s13_templates_permit_centric.sql`
(draft — **not** applied to hosted Supabase).

---

## LOOP 1 — Pre-flight data-risk audit (code + migrations only)

### 1. Which tables the live runtime uses

| Table | Written by | Read by | Live? |
|---|---|---|---|
| `inspector_completion_reports` / `inspector_completion_stage_items` / `inspector_completion_documents` (**System C**) | `src/lib/supabase/inspectorCompletion.ts` (`upsert onConflict: 'report_id,item_code'`) | Inspector Completion Workspace, Schedule C-B pipeline | **Yes — primary workspace** |
| `permit_checklist_responses` (**System B**) | `/api/inspections/checklist-response` (called from `inspector/stages` → `StagesClient`) | `inspector/stages` page, `seal_inspection_stage` RPC, admin checklists routes, `access.ts` | **Yes — the reference/seal surface** |
| `stage_checklist_templates` / `stage_checklist_items` (**System B**) | seed migrations + admin checklist CRUD routes | `resolveActiveTemplate`, `inspector/stages`, admin routes | Yes (reference/preview) |
| `inspection_stages` | seed migrations | resolver, stages page, seal RPC, access | Yes |
| `jurisdictions` | seed migrations | resolver, stages page | Yes |

### 2. Does the live Completion Workspace use System B rows or System C runtime data?
**System C runtime data.** The workspace reads/writes `inspector_completion_*` tables keyed by
`item_code` **strings** — it never touches `stage_checklist_items` UUIDs or `permit_checklist_responses`.

### 3. Would changing System B S10–S13 templates affect active inspector completion records?
- **Completion Workspace (System C): NO.** Its records are keyed by `item_code` in a separate table set;
  re-seeding System B item rows does not touch them.
- **System B seal path: POTENTIALLY YES.** `permit_checklist_responses.checklist_item_id` is a FK to
  `stage_checklist_items.id` (a UUID). Re-seeding S10–S13 items mints **new UUIDs**. The
  `seal_inspection_stage` RPC counts *required, active* items missing a completed response — and it keys
  on `is_active`, **not** version. So if v1 is deactivated and v2 activated, an in-flight permit that
  recorded v1 responses would suddenly show the new v2 items as incomplete → its S10–S13 stage could
  become un-sealable until re-inspected. Already-`sealed` stages are safe (seal lives in
  `permit_stage_statuses` + immutable `inspection_seals`, keyed by `stage_id`, not item).

### 4. Do active/in-flight permits need version-lock protection?
**Yes, conditionally — and the current schema only partially supports it.** `stage_checklist_templates`
has `version` / `is_active` / `effective_from|to`, but **`seal_inspection_stage` ignores all of them
except `is_active`.** So a version-bump protects the *resolver display* but **not** the *seal gate* for
in-flight permits. Full protection would require making the seal RPC version-aware (or effective-date /
per-permit pinned) — a logic change **outside** the "S10–S13 templates only" scope.

### 5. Is a read-only Supabase count required before migration approval? **YES → now satisfied.**
Whether §3/§4 was a real problem depended on live row counts that cannot be read from code. The counts
(above) came back **all zero**, so the version-bump re-seed is safe and the migration has been drafted.
The queries used are retained below for the audit record.

#### Read-only query A — is the System B seal path even populated?
```sql
-- Read-only. Safe on any environment.
select
  (select count(*) from public.permit_checklist_responses) as total_responses,
  (select count(*) from public.permit_stage_statuses)      as total_stage_statuses,
  (select count(*) from public.inspection_seals)           as total_seals;
```

#### Read-only query B — S10–S13 in-flight exposure (the decision-maker)
```sql
-- Read-only. Counts live System B state bound to stages 10–13.
with target as (
  select id, stage_number, title
  from public.inspection_stages
  where stage_number in (10, 11, 12, 13)
)
select
  t.stage_number,
  t.title,
  (select count(*) from public.permit_checklist_responses r
     where r.stage_id = t.id)                                             as checklist_responses,
  (select count(distinct r.permit_id) from public.permit_checklist_responses r
     where r.stage_id = t.id)                                             as permits_with_responses,
  (select count(*) from public.permit_stage_statuses s
     where s.stage_id = t.id and s.status = 'sealed')                     as sealed_rows,
  (select count(*) from public.permit_stage_statuses s
     where s.stage_id = t.id and s.status in ('in_review','rejected'))    as in_flight_unsealed_rows
from target t
order by t.stage_number;
```

**Decision rule:**
- **All zero** (`checklist_responses = 0` and `in_flight_unsealed_rows = 0` for all four stages) →
  the version-bump re-seed is **clearly safe**; proceed to author the migration next sprint.
- **Any non-zero** → do **not** version-bump alone. First make the seal path version/effective-date
  aware (separate, approved change), or migrate only after those permits close. This is the documented
  schema/logic gap (stop condition: *"version-lock protection is required but schema support is missing"*).

---

## LOOP 2 — S10–S13 final target map

Canonical direction = adopt System C (permit-centric) titles + container content; regenerate System B.
Container labels below are the exact `StructuredStageItemDefinition` labels in `inspectorCompletion.ts`.

| Field | **S10** | **S11** | **S12** | **S13** |
|---|---|---|---|---|
| Current DB stage title | Electrical Permit and Scope | Gas Permit and Mechanical / HVAC Scope | Insulation and Energy Compliance | Interior Completion |
| Current attached DB template subject | Building Envelope | Insulation & Vapour Barrier | Drywall & Interior Finish | Life Safety Systems |
| Current System C title | Electrical Permit and Scope | Gas Permit and Mechanical / HVAC Scope | Insulation and Energy Compliance | Interior Completion |
| **Recommended canonical title** | Electrical Permit and Scope | Gas Permit and Mechanical / HVAC Scope | Insulation and Energy Compliance | Interior Completion |
| **Recommended canonical checklist subject (System C containers)** | 1. Electrical Permit & Service Readiness · 2. Branch Circuit Rough-In · 3. Life Safety, Specialty Circuits & Pre-Test Readiness · 4. Electrical Inspection & Documentation Closeout | 1. Mechanical Permit & Equipment Rough-In · 2. Gas Piping, Venting & Combustion · 3. Ventilation, Exhaust, Duct & Fire-Assembly Coordination · 4. Mechanical & Gas Inspection Closeout | 1. Thermal Insulation & Continuity · 2. Air Barrier, Vapour Control & Penetrations · 3. Energy Documentation & Compliance Path · 4. Insulation Inspection & Energy Closeout | 1. Fire Separation, Rated & Sound Separation · 2. Interior Wall Substrate, Wet-Area & Concealed Backing · 3. Interior Life Safety & Egress Readiness · 4. Interior Finishes & Systems Trim · 5. Accessibility, Adaptable Housing & Interior Closeout |
| **VBBL differs from BCBC?** | Yes — each container has a VBBL-specific reference (EV-readiness / VBBL electrical) | Yes — VBBL mechanical/gas/ventilation refs | **Yes, strongest** — VBBL mandatory Step Code tier + energy/GHG | Yes — VBBL suite separation / sound / interior finish refs |
| **Rows to replace / deactivate** | Deactivate `building_envelope`→(stage 10) template v1 (both jx); insert v2 electrical templates + items | Deactivate `insulation_vapor_barrier` (stage 11) v1; insert v2 gas/mech | Deactivate `drywall_interior_finish` (stage 12) v1; insert v2 insulation/energy | Deactivate `life_safety_systems` (stage 13) v1; insert v2 interior |
| **Insert new rows (not update old)?** | **Yes** — insert v2, keep v1 (historical); never mutate/delete v1 | Yes | Yes | Yes |
| **Exact acceptance test** | `resolveActiveTemplate(10,'vancouver')` title = "Electrical Permit and Scope" with electrical items; validator S10 = OK | same, gas/mechanical | same, insulation/energy; VBBL S12 items > BCBC S12 | same, interior |

Note: the DB stage **rows** for S10–S13 already carry the correct permit-centric titles (from the rename
migration) and already equal System C names — so **only the attached templates/items need re-seeding**,
no `inspection_stages` UUID or title change is required for the S10–S13 hotfix.

---

## LOOP 3 — Migration (DRAFTED as a file; NOT applied)

**Migration file authored:** `supabase/migrations/20260705000000_align_s10_s13_templates_permit_centric.sql`.
It is a draft for review — **not applied to hosted Supabase, no `supabase db push`.** Safe because the
live counts are all zero (§1.5). What it does / does not do:

**Changes (S10–S13 only, both jurisdictions):**
- Inserts `version = 2`, `is_active = true` `stage_checklist_templates` for S10–S13 × {`bcbc_2024`,
  `vbbl_2025`} with permit-centric titles, then deactivates the `version = 1` rows.
- Inserts `stage_checklist_items` from the live System C S10–S13 containers (verbatim `purpose` →
  `requirement_text`; governing code reference → `legal_reference`). Counts: S10 = 4, S11 = 4, S12 = 4
  (BCBC) / 5 (VBBL, +Vancouver mandatory Step Code tier overlay), S13 = 5.
- Fully idempotent (`ON CONFLICT DO UPDATE`); inline rollback note (reactivate v1 / deactivate v2).

**Does NOT change:** `inspection_stages` (rows/titles/slugs/UUIDs — already permit-centric),
`permit_checklist_responses` or any response/seal rows, S01–S09, S14–S15, the seal RPC, or System C.
No `DELETE` — historical v1 rows preserved.

### Safe pattern (as implemented)

1. Author canonical S10–S13 content as a reviewed source derived from `inspectorCompletion.ts` (the four
   container sets above), BCBC base + VBBL overlays (promote each container's `isVbblOnly` reference /
   VBBL requirement into a VBBL-specific item or note).
2. One idempotent migration: `INSERT` `stage_checklist_templates` at `version = 2`, `is_active = true`,
   `effective_from = now()` for S10–S13 × {`bcbc_2024`, `vbbl_2025`}; `INSERT` their
   `stage_checklist_items`; then `UPDATE ... set is_active = false` on the `version = 1` S10–S13
   templates. **Preserve** all v1 rows (no `DELETE`). **Do not** touch `inspection_stages`,
   `permit_checklist_responses`, or stage UUIDs.
3. Keep `bcbc_2024` and `vbbl_2025` rows explicit; VBBL = BCBC items + Vancouver overlays.
4. Provide an inline "rollback" note: reactivate v1, deactivate v2 (fully reversible; additive only).

**Schema-support caveat (must be resolved before apply if counts are non-zero):** the seal RPC
`seal_inspection_stage` is not version-aware. Either (a) counts are all-zero → safe as-is, or (b) make
the seal gate resolve the version pinned per permit/effective-date — a separate approved change.

---

## LOOP 4 — Tests and validators (implemented, safe)

`src/lib/inspections/stageAlignment.test.ts` — **5 tests, 5 pass, 0 fail, 0 todo** (parses the new
migration as the active template state):
1. parsers resolve all 15 stages from every source.
2. **no title/content hard-mismatch on any stage** (was the subset guard; now asserts the set is empty
   post-alignment — strengthened, not weakened).
3. renamed stage titles stay synced with System C runtime names.
4. resolver maps Vancouver → `vbbl_2025`, non-Vancouver / null → `bcbc_2024` (source-derived).
5. **S10–S13 active template subject equals the permit-centric stage title** (specific proof of this
   migration; replaces the earlier `todo` placeholder).

`docs/audit/validate-stage-alignment.mjs` — the **fail-before / pass-after** gate. It now parses the new
migration and reports **0 hard mismatches, exit 0** (was 4 / exit 1 before the migration existed).
Proves items #1–#7 of the sprint's validation requirements. No existing assertion was weakened; the
guard is stronger (any reintroduced mismatch fails both the script and test #2).

---

## LOOP 5 — Evidence model guardrail (no evidence code changed)

Re-confirmed against `InspectorCompletionWorkspace.tsx` + `src/lib/supabase/inspectorCompletion.ts`:
- **Live workspace evidence is item-bound** — uploads key on `item_code`
  (`upsert onConflict: 'report_id,item_code'`; `focusRequiredEvidenceUpload(itemCode)`).
- **Pass gating is item/container-aware** — `RequiredEvidenceActionPanel` + `REQUIRED_EVIDENCE_LOCK_MESSAGE`
  block Pass per item until ≥1 evidence is attached to *that* item; a note does not satisfy it.
- **Unrelated item evidence cannot satisfy another item's requirement** — evidence is stored against the
  item's `item_code`; there is no cross-item fallback.
- **Remaining gap is semantic correctness, not binding** — the gate is quantitative (≥1 file on the
  correct item); it cannot verify the file is the *right* shot (already disclaimed in UI copy).
- **Future canonical model should type evidence requirements** — promote `required_evidence` prose to a
  typed enum (`photo | video | document | pin_drop | note | verify_existing`) so the gate can demand a
  specific evidence type. See `canonical-template-reconciliation-plan.md` §LOOP 4.

No evidence code was modified.

---

## Status & what remains before merge

- **Migration:** ✅ **drafted** (`20260705000000_align_s10_s13_templates_permit_centric.sql`) and
  ✅ **locally validated** (see `local-s10-s13-validation-runbook.md` → "Local validation results").
  **Not applied to hosted Supabase.**
- **Local validation (2026-07-05): PASSED.** Applied locally on top of the prerequisite stage-label
  migration; counts confirmed **S10 4/4 · S11 4/4 · S12 4/5 · S13 5/5**, exactly one active v2 template
  per stage+jurisdiction, v1 preserved+inactive, labels now match the stage discipline, and VBBL S12
  carries the Vancouver-only Step Code item. Hosted Supabase was **not** modified.
- **Unrelated local blocker (documented, not ours):** a full `supabase migration up --local` fails
  earlier in the chain at `20260501010000_builder_documents.sql` — that migration references
  `public.profiles(id)` via `user_id uuid`, but local `public.profiles.id` is `text`. This is a
  pre-existing migration-chain type mismatch **unrelated to S10–S13**; it did not affect this validation
  (the prerequisite label migration + the S10–S13 migration were applied directly).
- **Validators/tests green:** `validate-stage-alignment.mjs` → **0 hard mismatches, exit 0**;
  `stageAlignment.test.ts` → **5/5**.
- **Live-data query needed:** No — counts confirmed all-zero previously; blocker cleared.
- **Hosted read-only verification (2026-07-05): data already correct, but ledger drifted.**
  A hosted **read-only** check found the S10–S13 hosted **data is already in the corrected state**:
  active `version = 2` = Electrical Permit and Scope / Gas Permit and Mechanical / HVAC Scope /
  Insulation and Energy Compliance / Interior Completion; `version = 1` rows preserved + inactive;
  VBBL S12 includes "Vancouver Mandatory Minimum Step Code Tier"; content spot-check passed.
  **However**, `supabase_migrations.schema_migrations` returned **no rows** for `20260605000000` or
  `20260705000000`, and the hosted ledger shows entries only through the **202604** series. So the
  hosted **data appears corrected out-of-band while the migration ledger is NOT aligned with the Git
  migration history.** This is a governance issue tracked separately in
  **`docs/audit/hosted-migration-ledger-reconciliation-decision.md`**.
- **Governance directives (in force):** do **not** re-apply the S10–S13 migration; do **not**
  `supabase db push`; do **not** run `supabase migration repair` yet. Ledger reconciliation requires a
  separate decision note + approvals (see the linked doc).
- **Before merge (remaining):**
  1. ✅ **DONE — hosted read-only verification** (above): S10–S13 hosted data confirmed correct.
  2. **Resolve the hosted migration-ledger drift** via the decision note
     (`hosted-migration-ledger-reconciliation-decision.md`) — approvals + safe option selected — **before**
     merge/production promotion. Do not change already-correct data.
  3. **Human inspector review** of the S10–S13 content (titles, item wording, VBBL Step Code overlay).
  4. Confirm `inspector/stages` + `JobDetailModal` render S10–S13 content matching their titles, and
     Vancouver→`vbbl_2025` / non-Vancouver→`bcbc_2024`.
  5. Then merge. (Full 15-stage reconciliation, typed evidence schema, governed N/A, and richer Hold
     taxonomy remain future work per `canonical-template-reconciliation-plan.md`.)
  6. *(Optional, separate)* fix the unrelated `20260501010000_builder_documents.sql` profiles FK type
     mismatch so the full local migration chain runs clean.

**No-touch (unchanged):** Stripe/payments/checkout/escrow/Connect/pricing, auth/session, Vault storage,
Schedule C-B generation, job-claiming, `inspectorCompletion.ts` runtime logic, `admin/builders/page.tsx`.
