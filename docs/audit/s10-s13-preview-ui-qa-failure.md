# Preview UI QA — FAILED (S10–S13 checklist template content)

**Branch:** `fix/s10-s13-template-alignment-option-a`
**Date:** 2026-07-06 · **Type:** QA failure report + code-path diagnosis — **documentation only, no fix applied.**
**Surface:** Vercel Preview → Admin Workspace → **Checklist Templates** (`/admin/checklists`).
**Result:** ⛔ **FAILED for BOTH British Columbia Building Code 2024 and Vancouver Building By-law 2025.**

> No migration applied, no app code changed, no SQL run, no hosted Supabase writes, no Admin-UI edits,
> no `db push`, no `migration repair`, no deploy/promote. This report diagnoses **why**; it does not fix.

---

## 1. What was observed

On the Preview deployment, in Admin Workspace → Checklist Templates, the **stage dropdown titles are
correct** (they come from `inspection_stages`, renamed by the already-applied `20260605000000`):

- Stage 10 — Electrical Permit and Scope
- Stage 11 — Gas Permit and Mechanical / HVAC Scope
- Stage 12 — Insulation and Energy Compliance
- Stage 13 — Interior Completion

But the **active template content rendered underneath each is still the OLD construction-model checklist**,
and it is **shifted by one stage** relative to the new titles:

| Selected stage (new title) | Content shown (OLD, wrong) | Old construction stage this content belongs to |
|---|---|---|
| S10 — Electrical Permit and Scope | Building Envelope checklist | old S10 "Building Envelope & Weatherproofing" |
| S11 — Gas Permit and Mechanical / HVAC Scope | Insulation & Vapour Barrier checklist | old S11 "Insulation & Vapor Barrier" |
| S12 — Insulation and Energy Compliance | Drywall & Interior Finish checklist | old S12 "Drywall & Interior Finish" |
| S13 — Interior Completion | Life Safety Systems checklist | old S13 "Life Safety Systems" |

This occurs identically for **both** BCBC 2024 and VBBL 2025. The VBBL S12 **"Vancouver Mandatory Minimum
Step Code Tier"** item is **absent** (it only exists in the v2 content this branch drafted).

## 2. Root-cause diagnosis (confirmed from code + migrations)

**The drafted alignment migration `20260705000000_align_s10_s13_templates_permit_centric.sql` has NOT been
applied to the Supabase database backing this Preview deployment.** The screen is showing the exact
**pre-migration state**:

- The old checklist content for S10–S13 was seeded in
  `supabase/migrations/20260428010000_checklist_remaining_stages.sql`, keyed by the **old stage slugs**
  (`building_envelope`, `insulation_vapor_barrier`, `drywall_interior_finish`, `life_safety_systems`).
  Those template rows are attached to the stage by **`stage_id` (UUID)**.
- `20260605000000` later renamed the **stage rows'** `title` and `slug` to the permit-centric model, but it
  **did not touch the attached template rows**. So each stage kept its old-content `version = 1` template
  under a new title — precisely the "shifted content" table in §1.
- `20260705000000` is the migration that inserts the corrected `version = 2` templates (active) and
  deactivates `version = 1`. **If v2 rows existed in this DB, the Admin UI would display them** (see §3).
  Because the UI still shows v1 content, **no `version = 2` row exists in the DB backing Preview** →
  the migration has not reached that database.

This is a **data/deployment gap, not a code bug.** The resolver and Admin API query logic are correct; the
target database simply lacks the v2 rows.

## 3. How the Admin UI selects the template (verified)

**Admin Workspace → Checklist Templates** calls `GET /api/admin/checklists?jurisdictionId=…&stageId=…`
(`src/app/api/admin/checklists/route.ts:46-53`):

```
from stage_checklist_templates
  .eq('stage_id', stageId)
  .eq('jurisdiction_id', jurisdictionId)
  .order('version', { ascending: false })
  .limit(1)
  .maybeSingle()
```

Selection key = **`(stage_id, jurisdiction_id)` → highest `version` → 1 row.**
Notably it does **NOT** filter on `is_active` — it always shows the **highest-version** template (and paints
an Active/Inactive badge from that row's `is_active`). Items come from `stage_checklist_items` for that
template id (`route.ts:69-73`).

- Stage dropdown titles come from `inspection_stages` (`route.ts:20-24`) → already permit-centric
  (`20260605000000` applied) → **correct**.
- Template + item content come from `stage_checklist_templates` / `stage_checklist_items` → only corrected
  by `20260705000000` → **not applied → old v1 content shown.**

Because the Admin API returns the highest version regardless of `is_active`, the moment a `version = 2` row
exists it would be shown. Its continued absence is the proof the migration hasn't landed here.

**The inspector/preview surfaces use a different but consistent selector.**
`src/lib/inspections/resolveActiveTemplate.ts:76-84` selects `(stage_id, jurisdiction_id, is_active=true)`
→ `order version desc` → limit 1, with a fallback to "any active template for this stage" for unmapped
cities. Post-migration both surfaces resolve to v2; pre-migration both resolve to v1. So `/inspector/stages`
and `JobDetailModal` would show the **same** stale content on this Preview DB.

**Selection-key summary (task 5):** neither surface keys off slug or title for content — both key off
**`stage_id` + `jurisdiction_id` + `version` (desc)**; the Admin API ignores `is_active`, the resolver
requires `is_active = true`. Titles are keyed off `inspection_stages`. That split (titles from stage rows,
content from template rows) is exactly why titles look fixed while content does not.

## 4. Is this because `20260705000000` was not applied to the Preview DB? — YES (CONFIRMED read-only, 2026-07-06)

**Confirmed by a targeted read-only SELECT against the exact project Preview uses.** Preview's
`NEXT_PUBLIC_SUPABASE_URL` resolves to Supabase project ref **`llbcoqdtuvbwamptzipo`** (identified
read-only; no keys/secrets recorded). Querying `stage_checklist_templates` there for S10–S13 returned
**only `version = 1` (active) rows carrying the OLD construction titles** — no `version = 2` at all:

| Stage | BCBC 2024 — active v1 title | VBBL 2025 — active v1 title |
|---|---|---|
| S10 | Building Envelope — BC Building Code 2024 | Building Envelope — Vancouver Building By-law 2025 |
| S11 | Insulation & Vapour Barrier — BC Building Code 2024 | Insulation & Vapour Barrier — Vancouver Building By-law 2025 |
| S12 | Drywall & Interior Finish — BC Building Code 2024 | Drywall & Interior Finish — Vancouver Building By-law 2025 |
| S13 | Life Safety Systems — BC Building Code 2024 | Life Safety Systems — Vancouver Building By-law 2025 |

So on `llbcoqdtuvbwamptzipo`: **v2 corrected templates are ABSENT; only v1 old templates exist for both
jurisdictions; `20260705000000` has NOT been applied to this database.** This is the definitive root cause
of the UI QA failure.

**Contradiction RESOLVED.** The earlier "hosted v2 active" note (final handoff §3, reconciliation decision
§1, gap inventory row 10) does **not** hold for the database Preview serves from, and is therefore
**retracted as incorrect or misattributed.** If some other Supabase project holds v2, that project is
unidentified and is **not** the one Preview (or, absent evidence otherwise, production) is wired to — so it
is not authoritative here. The affected docs have been corrected:
`hosted-migration-gap-inventory.md` (Round 5 correction; row 10 → EFFECT ABSENT; totals 9→8) and
`hosted-migration-ledger-reconciliation-decision.md` (scope 9→8; exclude `20260705000000` from ledger
repair).

## 5. What is NOT the cause (ruled out)

- **Not a code bug in the resolver / Admin route** — both select highest version by
  `(stage_id, jurisdiction_id)`; logic is correct (§3).
- **Not a slug/title mismatch in `20260705000000`** — it joins on the current permit-centric slugs set by
  `20260605000000`, which are present (titles render correctly).
- **Not caching** — the content is internally consistent with v1 (old construction content), not a stale
  copy of a partially-applied v2.
- **Not the System C completion workspace** — that path (`src/lib/inspectorCompletion.ts` RAW_STAGES) is
  independent and already permit-centric; this failure is confined to System B template preview/admin.

## 6. Next safe validation path (read-only, no writes)

1. ✅ **DONE (2026-07-06) — Preview DB identified:** project ref **`llbcoqdtuvbwamptzipo`** (from Preview
   `NEXT_PUBLIC_SUPABASE_URL`, read-only; no secrets recorded). §4 contradiction resolved (retracted).
2. ✅ **DONE (2026-07-06) — read-only SELECT run against `llbcoqdtuvbwamptzipo`:** only `version = 1` old
   templates for S10–S13 (both jurisdictions); **no v2**. See §4 table. The reference query used:
   ```sql
   -- Do v2 templates exist for S10–S13 in the DB Preview is using?
   select s.stage_number, j.slug as jurisdiction, sct.version, sct.is_active, sct.title
   from public.stage_checklist_templates sct
   join public.inspection_stages s on s.id = sct.stage_id
   join public.jurisdictions     j on j.id = sct.jurisdiction_id
   where s.stage_number in (10,11,12,13)
   order by s.stage_number, j.slug, sct.version;
   -- PASS if each stage/jurisdiction has a version = 2 row with is_active = true.
   -- FAIL (current expectation) if only version = 1 exists.
   ```
3. **If v2 is absent** (expected): the fix is to **apply `20260705000000` to that database through a
   reviewed, approved path** (staging/preview DB first), then re-run this UI QA. Follow the same
   apply-discipline as the seal-latch runbook (staging → verify → approvals → apply → re-verify). Do **not**
   apply via `db push`, `migration repair`, or the Admin UI edit buttons.
4. **Re-run Preview UI QA** after apply: confirm S10 Electrical / S11 Gas-Mechanical / S12 Insulation-Energy
   (+ VBBL Step Code item) / S13 Interior Completion content matches titles for both jurisdictions.
5. **Reconcile the ledger** for `20260705000000` on that DB only after the effect is verified present.

## 7. Status / directives still in force

- ⛔ This branch remains **docs + one drafted migration + tests** only. **No fix applied here.**
- Do **not** apply `20260705000000` yet, **not** via Admin UI, **not** via `db push`/`migration repair`.
- Do **not** touch hosted Supabase, Stripe/Vault/auth, or deploy/promote.
- The migration itself is validated (local apply + static/tests green, see final handoff §2); the outstanding
  problem is purely that it has **not been applied to the database Preview is served from.**
