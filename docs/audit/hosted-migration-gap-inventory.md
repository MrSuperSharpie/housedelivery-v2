# Hosted Migration Gap Inventory (202605 → 202607)

**Branch:** `fix/s10-s13-template-alignment-option-a`
**Date:** 2026-07-05 · **Type:** documentation only — no hosted SQL run, no ledger repair, no writes.
**Companion to:** `docs/audit/hosted-migration-ledger-reconciliation-decision.md`

> Evidence packet required **before** any hosted migration-ledger repair decision. Every SQL block below
> is **read-only** (SELECT / catalog inspection) — provided for a human to run against hosted. **Nothing
> here has been executed against hosted Supabase.** Do not `db push`, `migration repair`,
> `migration up --linked`, or any hosted write. Do not modify migration files.

---

## 0. Context

- Hosted **S10–S13 data** was verified correct (see decision note).
- The hosted ledger `supabase_migrations.schema_migrations` shows entries only **through the 202604
  series**, and returned **no rows** for `20260605000000` or `20260705000000`.
- Therefore the gap is broader than S10–S13: **every** local migration from `20260501…` (May 2026)
  through `20260705…` (Jul 2026) is presumed **missing from the hosted ledger**, even where the data
  effect is already present (applied out-of-band).

This inventory lists all 10 migrations in that range, classifies each, and gives the exact read-only
checks to determine whether the *effect* is actually present in hosted.

---

## Hosted verification log — Round 1 (2026-07-05)

First hosted **read-only** check completed. Results:
- **Ledger presence (§1):** query returned **"Success. No rows"** for all 10 versions →
  **all 10 migrations are missing from the hosted ledger.** The full 202605–202607 range is unledgered.
- **`public.profiles.id` type (§2):** **`uuid`.** The systemic `profiles.id` ambiguity is resolved on
  hosted — hosted uses `uuid`.
- **`builder_documents` (§3.1a):** `to_regclass('public.builder_documents')` returned
  `builder_documents` → **the table EXISTS on hosted.** Because hosted `profiles.id` is `uuid`, the local
  `profiles.id text` blocker **does not apply to hosted**, so this migration's effect is present (the
  top-risk "effect missing" concern is cleared).

**Interim conclusion:** hosted carries at least some effects of the missing range (stage labels,
S10–S13 templates, and `builder_documents`), while the ledger records none of it. **Next:** verify the
remaining migrations' effects **one small group at a time** (§3.2–§3.4, then §3.6, then §3.9, then the
payments pair §3.7–§3.8) before any ledger-repair decision. No hosted writes.

## Hosted verification log — Round 2 (2026-07-05)

Second hosted **read-only** group completed — three more effects **verified present**:
- **§3.2 `20260501020000_builder_document_storage_policies`:** all **5** expected `storage.objects`
  policies returned (`builder_documents_admin_select`, `_delete_own`, `_insert_own`, `_select_own`,
  `_update_own`). ✅
- **§3.3 `20260501030000_inspector_document_admin_storage_policy`:** `inspector_documents_admin_select`
  returned. ✅
- **§3.4 `20260509132000_allow_completed_job_assignments`:** `job_assignments_status_check` includes
  `provisional, confirmed, cancelled, invalidated, completed` → `'completed'` present. ✅

**Running total: 6 of 10** missing-ledger migrations now have **verified effects present**.
**Remaining unverified (4):** `20260611000000` (completion RLS/seal-latch), `20260615000000`
(inspector_payment_accounts — payments), `20260622000000` (hold_payment_gate — payments/Stripe),
`20260623000000` (catalogue_model_code). Verify these next (payments pair needs domain-owner sign-off
before any repair). No hosted writes.

## Hosted verification log — Round 3 (2026-07-05)

- **§3.9 `20260623000000_catalogue_model_code`:** hosted `job_opportunities.catalogue_model_code` exists
  (`text`, `is_nullable = YES`). → **Effect verified present.** ✅
- **§3.6 `20260611000000_inspector_completion_rls_seal_latch`:** ⚠ **PARTIAL / EFFECT MISSING.** Hosted
  completion-policy count returned **1**, but the three expected **functions**
  (`completion_is_client_request`, `completion_report_is_locked`, `enforce_completion_seal_latch`) and
  the three expected **triggers** (`trg_completion_reports_seal_latch`,
  `trg_completion_stage_items_seal_latch`, `trg_completion_documents_seal_latch`) **all returned no
  rows**. The seal-latch enforcement objects are **absent on hosted**.
  - ⛔ **Must NOT be marked applied via ledger repair.** Marking it applied would falsely record the
    seal-latch enforcement as deployed while it is not — hiding a real integrity gap in completion
    sealing. This migration requires a **real, reviewed apply/fix path** later (separate, approved).

**Running total: 7 of 10 verified present · 1 of 10 partial/effect-missing (`20260611000000`).**
**Remaining unverified (2):** `20260615000000` (inspector_payment_accounts — payments),
`20260622000000` (hold_payment_gate — payments/Stripe) — payments-owner sign-off required. No hosted writes.

## Hosted verification log — Round 4 · FINAL (2026-07-05)

Final hosted **read-only** group (payments pair) completed — both **verified present**:
- **§3.8 `20260622000000_hold_payment_gate`:** hosted `job_holds` has all 4 columns — `hold_paid_at`
  (timestamptz), `hold_payment_status` (text), `stripe_checkout_session_id` (text),
  `stripe_payment_intent_id` (text); and `job_holds_hold_payment_status_check` allows
  `unpaid, paid, failed, cancelled`. ✅
- **§3.7 `20260615000000_inspector_payment_accounts`:** hosted table has all expected columns
  (`inspector_id` uuid, `stripe_account_id`, `account_type`, `charges_enabled`, `payouts_enabled`,
  `details_submitted`, `requirements_currently_due` jsonb, `onboarding_started_at`,
  `onboarding_completed_at`, `created_at`, `updated_at`) and policy `inspector_payment_accounts_select_own`
  is present. ✅ *(Neutral note: hosted `inspector_id` is `uuid`, matching hosted `profiles.id = uuid`;
  the migration file declares it `text`. Effect is present either way; noted for the reconciliation
  record.)*
- Both are **payments/Stripe-adjacent** → any ledger repair for them still requires **payments-owner
  sign-off**. This inventory does not touch Stripe/payment logic.

**FINAL TOTALS: 9 of 10 verified effects present · 1 of 10 partial/effect-missing
(`20260611000000_inspector_completion_rls_seal_latch`).** All 10 versions verified — verification phase
complete. **A blanket ledger repair is unsafe.** Any future targeted repair must **exclude
`20260611000000`** and include **only the 9 verified-present** migrations, with **payments-owner sign-off**
for `20260615000000` and `20260622000000`. No hosted writes.

---

## 1. Ledger presence check (run once, for all versions)

```sql
-- Read-only. Which of the gap migrations does the hosted ledger already record?
select version
from supabase_migrations.schema_migrations
where version in (
  '20260501010000','20260501020000','20260501030000','20260509132000',
  '20260605000000','20260611000000','20260615000000','20260622000000',
  '20260623000000','20260705000000'
)
order by version;
-- Expectation from the reported finding: 0 rows (all missing). Any rows returned
-- narrow the gap. Re-confirm before any repair.
```

---

## 2. Summary table

| # | Version | File | Domain | Ledger | Effect classification |
|---|---------|------|--------|--------|-----------------------|
| 1 | 20260501010000 | builder_documents | Builder docs metadata table | Missing | ✅ **Effect present (2026-07-05)** — table exists on hosted; hosted `profiles.id` is `uuid`, so the local `profiles.id text` blocker does not apply. (Columns/policies not yet spot-checked — §3.1c/d.) |
| 2 | 20260501020000 | builder_document_storage_policies | `storage.objects` RLS policies | Missing | ✅ **Effect verified present (2026-07-05)** — all 5 policies returned |
| 3 | 20260501030000 | inspector_document_admin_storage_policy | `storage.objects` RLS policy | Missing | ✅ **Effect verified present (2026-07-05)** — `inspector_documents_admin_select` returned |
| 4 | 20260509132000 | allow_completed_job_assignments | `job_assignments` status check constraint | Missing | ✅ **Effect verified present (2026-07-05)** — check includes `'completed'` |
| 5 | 20260605000000 | correct_inspection_stage_labels_s10_s15 | `inspection_stages` titles/slugs | Missing | **Effect VERIFIED PRESENT** (S10–S13 hosted titles permit-centric) |
| 6 | 20260611000000 | inspector_completion_rls_seal_latch | Functions + triggers + RLS on `inspector_completion_*` | Missing | ⛔ **PARTIAL / EFFECT MISSING (2026-07-05)** — 3 functions + 3 triggers absent (only 1 policy present). **Do NOT ledger-repair; needs a real reviewed apply/fix.** |
| 7 | 20260615000000 | inspector_payment_accounts | `inspector_payment_accounts` table + RLS | Missing | ✅ **Effect verified present (2026-07-05)** — table + columns + `select_own` policy present · **PAYMENTS: ledger repair needs payments-owner sign-off** |
| 8 | 20260622000000 | hold_payment_gate | `job_holds` Stripe columns + check | Missing | ✅ **Effect verified present (2026-07-05)** — 4 columns + status check present · **PAYMENTS/Stripe: ledger repair needs payments-owner sign-off** |
| 9 | 20260623000000 | catalogue_model_code | `job_opportunities.catalogue_model_code` column | Missing | ✅ **Effect verified present (2026-07-05)** — column exists (`text`, nullable) |
| 10 | 20260705000000 | align_s10_s13_templates_permit_centric | `stage_checklist_templates/items` S10–S13 v2 | Missing | **Effect VERIFIED PRESENT** (v2 active, v1 inactive) |

**Classification legend:** *Missing from hosted ledger* · *Effect verified present* · *Effect not yet
verified* · *Effect missing* · *Unsafe to mark applied without deeper review*.

---

## 3. Per-migration read-only verification checks

### 1 — `20260501010000_builder_documents.sql`  · ✅ Effect present (table confirmed 2026-07-05)
Creates `public.builder_documents` (FK `user_id uuid → profiles(id)`), indexes, `updated_at` trigger,
and RLS policies. **Round 1 result:** `to_regclass('public.builder_documents')` returned the table, and
hosted `profiles.id` is `uuid`, so the local `profiles.id text` blocker does not apply. Risk cleared. The
remaining checks (c/d) are an optional completeness spot-check of columns and policies.
```sql
-- (a) Does the table exist? NULL = absent = Effect missing.
select to_regclass('public.builder_documents') as builder_documents_table;
-- (b) profiles.id type — explains whether the uuid FK could have applied at all.
select data_type from information_schema.columns
where table_schema='public' and table_name='profiles' and column_name='id';
-- (c) Expected columns present?
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='builder_documents'
order by ordinal_position;
-- (d) RLS policies present?
select policyname from pg_policies
where schemaname='public' and tablename='builder_documents' order by policyname;
```
**Verdict rule:** if (a) is NULL → **Effect missing** (needs a real, approved apply, not a repair). If the
table exists with the columns/policies → Effect present.

### 2 — `20260501020000_builder_document_storage_policies.sql`  · ✅ verified present (2026-07-05)
Creates `storage.objects` RLS policies for the builder-documents bucket. Hosted returned all 5 policies.
```sql
select policyname from pg_policies
where schemaname='storage' and tablename='objects'
  and policyname in (
    'builder_documents_select_own','builder_documents_insert_own',
    'builder_documents_update_own','builder_documents_delete_own',
    'builder_documents_admin_select'
  )
order by policyname;
-- Expected: 5 rows if effect present.
```

### 3 — `20260501030000_inspector_document_admin_storage_policy.sql`  · ✅ verified present (2026-07-05)
```sql
select policyname from pg_policies
where schemaname='storage' and tablename='objects'
  and policyname = 'inspector_documents_admin_select';
-- Expected: 1 row if effect present.
```

### 4 — `20260509132000_allow_completed_job_assignments.sql`  · ✅ verified present (2026-07-05)
Replaces `job_assignments_status_check` to add `'completed'` to the allowed statuses. Hosted CHECK
includes `provisional, confirmed, cancelled, invalidated, completed`.
```sql
select pg_get_constraintdef(oid) as def
from pg_constraint where conname = 'job_assignments_status_check';
-- Effect present if the returned CHECK includes 'completed'
-- (alongside provisional, confirmed, cancelled, invalidated).
```

### 5 — `20260605000000_correct_inspection_stage_labels_s10_s15.sql`  · ✅ verified present
UPDATEs `inspection_stages` S10–S15 to permit-centric titles/slugs.
```sql
select stage_number, slug, title from public.inspection_stages
where stage_number in (10,11,12,13,14,15) order by stage_number;
-- Effect present (confirmed): 10 electrical_permit_and_scope 'Electrical Permit and Scope';
-- 11 gas_mechanical_hvac_scope; 12 insulation_energy_compliance; 13 interior_completion;
-- 14 exterior_works_site_finalization; 15 final_approval_and_occupancy.
```

### 6 — `20260611000000_inspector_completion_rls_seal_latch.sql`  · ⛔ PARTIAL / EFFECT MISSING (2026-07-05)
Adds seal-latch functions, triggers, and RLS on the `inspector_completion_*` tables. **Round 3 result:**
only **1** completion policy present; all **3 functions** and **3 triggers** returned **no rows** →
seal-latch enforcement is **absent on hosted**. **Do NOT mark applied via ledger repair** — requires a
real, reviewed apply/fix path (separate, approved).
```sql
-- Functions
select proname from pg_proc
where proname in ('completion_is_client_request','completion_report_is_locked','enforce_completion_seal_latch')
order by proname;                     -- expected: 3 rows
-- Triggers
select tgname from pg_trigger
where tgname in ('trg_completion_reports_seal_latch','trg_completion_stage_items_seal_latch','trg_completion_documents_seal_latch')
order by tgname;                      -- expected: 3 rows
-- Sample RLS policy presence
select count(*) as completion_policies from pg_policies
where schemaname='public' and tablename in
  ('inspector_completion_reports','inspector_completion_stage_items','inspector_completion_documents');
```

### 7 — `20260615000000_inspector_payment_accounts.sql`  · ✅ verified present (2026-07-05) · PAYMENTS (sign-off req.)
Creates `public.inspector_payment_accounts` (FK `inspector_id → profiles(id)`) + read-own RLS. Hosted has
all expected columns (hosted `inspector_id` is `uuid`, matching hosted `profiles.id`) and the
`inspector_payment_accounts_select_own` policy. Effect present; ledger repair still needs payments-owner
sign-off.
```sql
select to_regclass('public.inspector_payment_accounts') as inspector_payment_accounts_table;
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='inspector_payment_accounts' order by ordinal_position;
select policyname from pg_policies
where schemaname='public' and tablename='inspector_payment_accounts';
```
**Note:** payments-domain object — even if the effect is present, marking this "applied" in the ledger
requires the payments owner's sign-off (see decision note §5). Do not touch Stripe wiring.

### 8 — `20260622000000_hold_payment_gate.sql`  · ✅ verified present (2026-07-05) · PAYMENTS/Stripe (sign-off req.)
Adds `hold_payment_status`, `stripe_checkout_session_id`, `stripe_payment_intent_id`, `hold_paid_at` to
`public.job_holds`, plus a status check constraint. Hosted has all 4 columns and the check allowing
`unpaid, paid, failed, cancelled`. Effect present; ledger repair still needs payments-owner sign-off.
```sql
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='job_holds'
  and column_name in ('hold_payment_status','stripe_checkout_session_id','stripe_payment_intent_id','hold_paid_at')
order by column_name;                 -- expected: 4 rows if present
select pg_get_constraintdef(oid) from pg_constraint where conname='job_holds_hold_payment_status_check';
-- expected CHECK: hold_payment_status in ('unpaid','paid','failed','cancelled')
```

### 9 — `20260623000000_catalogue_model_code.sql`  · ✅ verified present (2026-07-05)
Adds `public.job_opportunities.catalogue_model_code text` (nullable, no backfill). Hosted column exists
(`text`, `is_nullable = YES`).
```sql
select column_name, data_type, is_nullable from information_schema.columns
where table_schema='public' and table_name='job_opportunities' and column_name='catalogue_model_code';
-- expected: 1 row (text, nullable) if effect present.
```

### 10 — `20260705000000_align_s10_s13_templates_permit_centric.sql`  · ✅ verified present
Re-seeds S10–S13 `stage_checklist_templates`/`items` (v2 active, v1 inactive).
```sql
select s.stage_number, j.slug, sct.version, sct.is_active, count(sci.id) as items
from public.stage_checklist_templates sct
join public.inspection_stages s on s.id = sct.stage_id
join public.jurisdictions     j on j.id = sct.jurisdiction_id
left join public.stage_checklist_items sci on sci.template_id = sct.id
where s.stage_number in (10,11,12,13)
group by s.stage_number, j.slug, sct.version, sct.is_active
order by s.stage_number, j.slug, sct.version;
-- Effect present (confirmed): version 2 active with 4/4/4·5/5 items; version 1 inactive.
```

---

## 4. Findings & cautions for the reconciliation decision

- **All 10 versions are missing from the hosted ledger** (Round 1 confirmed) — the full 202605–202607
  range is unledgered.
- **Verification phase COMPLETE — all 10 versions checked (Rounds 1–4).**
- **Nine migrations are effect-verified present:** `20260501010000` (builder_documents), `20260501020000`
  (builder doc storage policies), `20260501030000` (inspector admin storage policy), `20260509132000`
  (job-assignment `'completed'` status), `20260605000000` (stage labels), `20260615000000`
  (inspector_payment_accounts — PAYMENTS), `20260622000000` (hold_payment_gate — PAYMENTS/Stripe),
  `20260623000000` (catalogue_model_code), `20260705000000` (S10–S13 templates).
- **One migration is PARTIAL / EFFECT MISSING:** `20260611000000_inspector_completion_rls_seal_latch` —
  its functions + triggers are **absent on hosted**. **It must NOT be marked "applied" via ledger
  repair** (that would hide a real integrity gap in completion seal-latch enforcement). It needs a
  **real, reviewed apply/fix** later.
- **Therefore a blanket ledger repair is unsafe.** Any future targeted repair must **exclude
  `20260611000000`** and include **only the 9 verified-present** migrations, with **payments-owner
  sign-off** for the two payments migrations (`20260615000000`, `20260622000000`). This inventory does
  **not** touch Stripe/payment logic.
- **`profiles.id` ambiguity RESOLVED on hosted → `uuid`.** The earlier `builder_documents` "effect
  missing" risk is **cleared** (hosted `profiles.id` is `uuid`, not `text`; the local blocker is
  local-only). `inspector_payment_accounts` uses a `text` FK to the same `uuid` column — note this for
  §3.7 (its effect check confirms whether that table applied cleanly on hosted regardless).
- **Payments-domain migrations (`20260615000000`, `20260622000000`) remain "unsafe to mark applied without
  deeper review."** Even if effects are present, ledger repair for these needs the payments owner's
  sign-off. This inventory does **not** touch Stripe/payment logic.
- A migration marked "applied" in the ledger while its effect is **absent** would hide real drift — hence
  every version needs an explicit §3 effect check before repair.

---

## 5. What this packet does NOT do

- Does not run any hosted SQL, does not repair the ledger, does not `db push` / `migration up --linked`.
- Does not modify migration files, app code, Supabase config, or restricted systems.
- Does not decide the reconciliation — that is the decision note, which now requires this packet as input.
