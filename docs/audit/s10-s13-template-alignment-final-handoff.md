# Branch Handoff — `fix/s10-s13-template-alignment-option-a`

**Date:** 2026-07-05 · **Type:** final handoff summary — documentation only.
**Base:** branched from `stripe-connect-sandbox-setup` · **Head:** `55ac170`
**Status:** ✅ code + validation complete and pushed · ⛔ **not merged, not deployed, no hosted writes.**

> This branch is **docs + one drafted migration + tests/validator only**. No app code, no Supabase
> config, no Stripe/Vault/auth/production/deploy changes. Nothing was applied to hosted Supabase.

---

## 1. What the branch fixed

Resolved the **S10–S13 title/content mismatch** in the DB checklist templates (System B). Stage rows for
S10–S13 had been renamed to a permit-centric model (`20260605000000`) but kept their old construction-model
checklist content, so reference/preview surfaces (`/inspector/stages`, `JobDetailModal`, resolve-template
API) rendered a permit-centric title over the wrong checklist.

**Fix (Option A — permit-centric System C is canonical):** drafted migration
`supabase/migrations/20260705000000_align_s10_s13_templates_permit_centric.sql` that version-bumps the
S10–S13 templates to `version = 2` (active) with content sourced from the live System C runtime model, and
deactivates `version = 1` (preserved, not deleted). No `inspection_stages` rows/UUIDs changed; S01–S09 and
S14–S15 untouched.

Resulting active content: **S10 Electrical Permit and Scope · S11 Gas Permit and Mechanical / HVAC Scope ·
S12 Insulation and Energy Compliance · S13 Interior Completion**, with VBBL S12 carrying the Vancouver-only
"Vancouver Mandatory Minimum Step Code Tier" overlay.

## 2. What was validated locally

- **Migration applied on a local Supabase** (on top of the prerequisite label migration `20260605000000`).
- Counts confirmed: **S10 4/4 · S11 4/4 · S12 4 (BCBC) / 5 (VBBL) · S13 5/5**; exactly **1 active v2**
  template per stage+jurisdiction; **v1 preserved + inactive**; active labels match the stage discipline;
  no active S10–S13 row retains old Building Envelope / Vapour Barrier / Drywall / Life Safety content.
- **Static + test validation (green):** `docs/audit/validate-stage-alignment.mjs` → **0 hard mismatches
  (exit 0)**; `src/lib/inspections/stageAlignment.test.ts` → **5/5**; `npm run build` pass;
  `check:imports` pass; `git diff --check` clean.
- **Unrelated local blocker documented:** a full `supabase migration up --local` fails earlier at
  `20260501010000_builder_documents.sql` (local `profiles.id text` vs a `uuid` FK). This is local-only and
  does not affect S10–S13 (hosted `profiles.id` is `uuid`).

## 3. What was verified on hosted Supabase (read-only)

- **S10–S13 data already correct on hosted:** active `version = 2` = permit-centric titles; `version = 1`
  preserved + inactive; VBBL S12 Step Code item present; content spot-check passed.
  > ⚠️ **2026-07-06 CONTRADICTION:** Preview UI QA (§8.2) found only old `version = 1` content on the DB
  > backing Preview — i.e. **no v2 rows there**. This read-only finding may have been taken against a
  > **different Supabase project/branch DB** than Preview uses, or was misattributed. Treat this "already
  > correct" claim as **unconfirmed for the Preview environment** until reconciled read-only per
  > `s10-s13-preview-ui-qa-failure.md` §6.
- **Ledger drift discovered:** `supabase_migrations.schema_migrations` records the range only **through
  202604**; **all 10** migrations `20260501010000 → 20260705000000` are **missing** from the ledger,
  though (most of) their effects are present — i.e. changes reached hosted **out-of-band**.
- **`public.profiles.id = uuid`** on hosted (systemic FK ambiguity resolved).
- All checks were **read-only** (SELECT / catalog). **No hosted writes.**

## 4. Final migration-ledger finding

Verification of all 10 unledgered migrations is **complete**:

- **9 of 10 have verified effects present:** `20260501010000` (builder_documents), `20260501020000`
  (builder doc storage policies), `20260501030000` (inspector admin storage policy), `20260509132000`
  (job-assignment `'completed'`), `20260605000000` (stage labels), `20260615000000`
  (inspector_payment_accounts — PAYMENTS), `20260622000000` (hold_payment_gate — PAYMENTS/Stripe),
  `20260623000000` (catalogue_model_code), `20260705000000` (S10–S13 templates).
- **1 of 10 is PARTIAL / EFFECT MISSING:** `20260611000000_inspector_completion_rls_seal_latch` — its
  **3 functions** and **3 triggers** are absent on hosted, and only **1 of 16** RLS policies is present.

## 5. Why a blanket ledger repair is unsafe

`migration repair --status applied` writes to the ledger but runs **no SQL**. Marking the whole
202605–202607 range "applied" would falsely record `20260611000000`'s seal-latch as deployed while it is
**absent** — the CLI/deploy pipeline would then **never (re)apply it**, so the protection never lands, and
the ledger would assert a security control that does not exist. Any repair must therefore be **targeted**
and per-migration, covering only effect-verified versions.

## 6. Why `20260611000000` must be a real apply/fix, not a ledger repair

It is a **security/integrity** migration: it adds RLS + a seal latch making sealed/submitted completion
reports **immutable to browser client roles** (the three `inspector_completion_*` tables were previously
writable from the anon client). With its functions/triggers/policies absent on hosted, that protection is
**not enforced in production** — a live gap (sealed inspections potentially mutable; possible browser-side
writes). The remedy is to **actually install the objects** via a reviewed, security-approved apply
(staging first), **then** record the ledger entry — never a ledger-only repair.

## 7. Documents created on this branch

Core S10–S13 alignment:
- `docs/audit/template-source-of-truth-stabilization.md` — the source-of-truth audit (three systems).
- `docs/audit/canonical-template-reconciliation-plan.md` — Option A vs B decision + plan.
- `docs/audit/s10-s13-implementation-preflight.md` — data-risk preflight + target map.
- `docs/audit/s10-s13-staging-qa-checklist.md` — DB + UI QA checklist.
- `docs/audit/local-s10-s13-validation-runbook.md` — local apply/validation + results.
- `supabase/migrations/20260705000000_align_s10_s13_templates_permit_centric.sql` — drafted migration.
- `src/lib/inspections/stageAlignment.test.ts` + `docs/audit/validate-stage-alignment.mjs` — guards.

Hosted ledger + seal-latch (the four requested):
- `docs/audit/hosted-migration-gap-inventory.md` — 10-migration inventory + read-only verification SQL + 4 rounds of results.
- `docs/audit/hosted-migration-ledger-reconciliation-decision.md` — reconciliation options, approvals, recommendation (targeted Option A, exclude `20260611000000`).
- `docs/audit/seal-latch-fix-apply-decision.md` — why `20260611000000` is a real apply, not a repair.
- `docs/audit/seal-latch-staging-apply-runbook.md` — staging-first apply + verification procedure.

(Also present from the earlier audit stream: `inspection-template-printout.md/.html`, `generate.mjs`.)

## 8. What remains before merge or production promotion

1. ✅ **DONE — human PRODUCT review of S10–S13 wording (2026-07-05):** S10, S11, S12, and S13 were
   **accepted for product QA**; the VBBL S12 "Vancouver Mandatory Minimum Step Code Tier" item is
   **present**; no old mismatched content was found. See `s10-s13-human-review-packet.md`. **This is
   product-level acceptance only — NOT a professional inspector / code sign-off** (that remains a separate
   later step before treating the content as final legal/code advice).
2. ⛔ **FAILED — Vercel Preview UI QA (2026-07-06):** on the Preview deployment, Admin Workspace →
   Checklist Templates shows **correct S10–S13 stage titles but still the OLD construction-model template
   content** (S10→Building Envelope, S11→Insulation & Vapour Barrier, S12→Drywall & Interior Finish,
   S13→Life Safety Systems), for **both BCBC 2024 and VBBL 2025**; the VBBL S12 Step Code item is absent.
   **Diagnosis:** the drafted migration `20260705000000` has **not been applied to the database backing
   Preview** — the screen is the exact pre-migration state (stage rows renamed by the applied
   `20260605000000`, but the `version = 1` old-content templates still attached by `stage_id`; no
   `version = 2` rows present). This **contradicts** §3's earlier "hosted already correct (v2 active)"
   note and must be reconciled read-only (Preview may point at a different Supabase DB than the one
   verified). Full report + read-only next-steps: **`s10-s13-preview-ui-qa-failure.md`**.
   Not fixed here — no apply, no `db push`, no `migration repair`, no Admin-UI edit.
3. **Decision on the targeted ledger repair** for the **9 verified-present** migrations — approvals per
   `hosted-migration-ledger-reconciliation-decision.md` §5, with **payments-owner sign-off** for
   `20260615000000` and `20260622000000`; **exclude `20260611000000`**.
4. **Separate staged apply/fix for the seal-latch** (`20260611000000`) — follow
   `seal-latch-staging-apply-runbook.md`: staging → verify → security + DB owner approval → hosted apply →
   then record its ledger entry.
5. **No hosted writes until approvals** — everything above is gated on human sign-off.
6. **Open item — evidence requirement clarity (out of scope for this branch):** this branch aligned
   S10–S13 titles/content but did **not** correct evidence-requirement clarity (typed evidence, per-item
   evidence binding/wording). That should be handled in a **separate evidence-requirements audit**, not
   here. (Context in `canonical-template-reconciliation-plan.md` §LOOP 4.)

## 9. Do-not-do list

- ❌ **No `supabase db push`.**
- ❌ **No `migration repair` for `20260611000000`** (its effect is missing — repair would hide the gap).
- ❌ **No blanket ledger repair** of the 202605–202607 range — only a targeted, per-migration repair of
  the 9 verified-present versions, with payments-owner sign-off for the two payments migrations.
- ❌ **No production apply without staging approval** — staging verification + DB/security-owner sign-off
  + backup are prerequisites for any hosted apply.
- ❌ **No merge / no deploy** from this branch until items §8.1–§8.4 are satisfied.
- ❌ Do not modify migrations, app code, Supabase config, Stripe, Vault, auth, or production/deploy settings
  as part of reconciliation without a separate approved change.
