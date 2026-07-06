# Seal-Latch Staging Apply Runbook

**Branch:** `fix/s10-s13-template-alignment-option-a`
**Migration:** `supabase/migrations/20260611000000_inspector_completion_rls_seal_latch.sql`
**Date:** 2026-07-05 · **Type:** review-before-run runbook — documentation only.
**Decision context:** `docs/audit/seal-latch-fix-apply-decision.md`

> ⛔ **Nothing here has been executed.** This is a runbook for a human to review and run on a
> **non-production / staging** environment only.
> **DO NOT touch hosted production. DO NOT `db push`. DO NOT `migration repair`. DO NOT modify migrations
> or app code.** Hosted production must **not** be touched until this runbook has been reviewed and
> approved (see §9).

---

## 1. Objective

Install the **missing** inspector-completion seal-latch enforcement from `20260611000000` on a
**staging** database, and prove it works, so the change can later be approved for a real (non-repair)
hosted apply. The migration adds, scoped to `inspector_completion_reports`,
`inspector_completion_stage_items`, `inspector_completion_documents`:
- **3 functions:** `completion_is_client_request`, `completion_report_is_locked`,
  `enforce_completion_seal_latch`
- **3 triggers:** `trg_completion_reports_seal_latch`, `trg_completion_stage_items_seal_latch`,
  `trg_completion_documents_seal_latch`
- **16 RLS policies** + RLS enabled on the three tables

Effect on hosted today: functions + triggers absent, only 1 of 16 policies present → seal-latch
immutability is **not enforced**. This runbook validates the fix on staging first. **This is a security
change**, not a ledger reconciliation — it must never be ledger-repaired.

## 2. Required approvals before staging or hosted apply

**Before staging apply:**
- [ ] Change owner identified; this runbook reviewed.
- [ ] Staging environment is confirmed **non-production** (see §4 guard).

**Before any hosted apply (in addition — from `seal-latch-fix-apply-decision.md` §5):**
- [ ] **Database/platform owner** sign-off.
- [ ] **Security owner** sign-off (restores an access-control + immutability guard on live data).
- [ ] **Verified hosted backup/snapshot** taken immediately before apply.
- [ ] Staging §5 verification + §6 smoke test **green**, with app flows unaffected.
- [ ] Written confirmation **service-role server paths** still function (latch/policies exempt service-role).
- [ ] Change-window / release approval.

## 3. Read-only pre-check SQL (run on staging FIRST — SELECT/catalog only)

```sql
-- (a) RLS state on the three tables
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relname in ('inspector_completion_reports','inspector_completion_stage_items','inspector_completion_documents');

-- (b) Existing policies (identify any already present)
select tablename, policyname, cmd from pg_policies
where schemaname='public' and tablename in
  ('inspector_completion_reports','inspector_completion_stage_items','inspector_completion_documents')
order by tablename, policyname;

-- (c) Partial pre-existing functions/triggers?
select proname from pg_proc
where proname in ('completion_is_client_request','completion_report_is_locked','enforce_completion_seal_latch');
select tgname, tgrelid::regclass as tbl from pg_trigger where tgname like 'trg_completion_%';

-- (d) DEPENDENCIES the policies/functions require (must exist or apply will fail):
--     job_opportunities.builder_id (builder read), reports.job_id, reports.inspector_id,
--     reports.status, reports.seal_applied
select column_name from information_schema.columns
where table_schema='public' and table_name='job_opportunities' and column_name='builder_id';
select column_name from information_schema.columns
where table_schema='public' and table_name='inspector_completion_reports'
  and column_name in ('id','job_id','inspector_id','status','seal_applied','submitted_at')
order by column_name;

-- (e) Data footprint (blast radius): sealed/submitted reports the latch will protect
select count(*) as total_reports,
       count(*) filter (where seal_applied or status in ('sealed','submitted')) as locked_reports
from public.inspector_completion_reports;
```
**Stop if:** (d) returns fewer than the expected columns (missing dependency → do not apply). Record (a),
(b), (e) as the pre-state baseline.

## 4. Recommended staging / local apply method

> **Environment guard — confirm this is NOT production before running anything.**
> ```bash
> # Refuse if the target looks like production. Set STAGING_DB_URL to the staging DB only.
> case "${STAGING_DB_URL:-}" in
>   *prod*|*production*) echo "✗ target looks like PRODUCTION — abort"; exit 1;;
>   "") echo "✗ STAGING_DB_URL not set"; exit 1;;
>   *) echo "✓ target: $STAGING_DB_URL (confirm this is staging)";;
> esac
> ```

Pick **one** (never `supabase db push`, never production):

- **Option A — dedicated staging Supabase project (preferred).** The migration is **idempotent**
  (`create or replace function`, `drop trigger if exists`+`create trigger`, `drop policy if exists`+
  `create policy`, idempotent `enable row level security`), so apply the file directly:
  ```bash
  psql "$STAGING_DB_URL" -f supabase/migrations/20260611000000_inspector_completion_rls_seal_latch.sql
  ```
- **Option B — local Supabase stack.** A full `supabase migration up --local` currently fails earlier on
  the unrelated `20260501010000_builder_documents` chain issue (see gap docs). Workaround: after the §3
  dependency checks pass locally, apply **only this migration's file** as in Option A against the local DB
  URL (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`). Do **not** `db reset` a shared env.

Do **not** record anything in `supabase_migrations.schema_migrations` yet — ledger entry comes only after
a real, approved hosted apply + verification (per the decision note).

## 5. Post-apply verification SQL (staging)

```sql
-- Objects installed
select proname from pg_proc
where proname in ('completion_is_client_request','completion_report_is_locked','enforce_completion_seal_latch')
order by proname;                                             -- expect 3
select tgname from pg_trigger
where tgname in ('trg_completion_reports_seal_latch','trg_completion_stage_items_seal_latch','trg_completion_documents_seal_latch')
order by tgname;                                              -- expect 3
select tablename, count(*) as policies from pg_policies
where schemaname='public' and tablename in
  ('inspector_completion_reports','inspector_completion_stage_items','inspector_completion_documents')
group by tablename order by tablename;                        -- expect 16 total (5/6/... per table)
select relname, relrowsecurity from pg_class
where relname in ('inspector_completion_reports','inspector_completion_stage_items','inspector_completion_documents');
-- expect relrowsecurity = true on all three
```

**Latch functional check (optional SQL, on a throwaway staging row):** simulate a client (authenticated)
role and confirm a **locked** report cannot be mutated, while an unsealed draft can. Use a test row and a
role/JWT-claims simulation, e.g. within a transaction:
```sql
-- Illustrative only; adapt to your staging harness. As an authenticated (non-service) role:
-- 1) updating a report where seal_applied/status in ('sealed','submitted') must RAISE / be denied.
-- 2) updating an unsealed draft owned by the same inspector must succeed.
-- 3) service_role update on a sealed row must still succeed (latch bypass).
```

## 6. Functional smoke test checklist (staging app pointed at the staging DB)

- [ ] Inspector completion workspace **loads**; an **unsealed** item can be saved by the owning inspector.
- [ ] Owning inspector can **seal** a report once (unsealed → sealed transition succeeds).
- [ ] After sealing, the owning inspector **cannot** edit/delete that report or its items/documents
      (latch/policy denies it).
- [ ] The **linked builder** (job `builder_id`) can **read** the report/items/documents.
- [ ] **Admin** can read.
- [ ] **Service-role** server correction path can still write a sealed row (controlled bypass).
- [ ] No regression in unrelated flows (Schedule C-B packet unaffected — System C).

## 7. Rollback / stop conditions (staging)

**Stop and do not proceed to hosted if:** any §3 dependency is missing; the apply errors; §5 shows fewer
than 3/3/16 objects or RLS not enabled; or §6 shows **legitimate** inspector/builder/admin/service access
is broken.

**Rollback (staging only).** Prefer **fixing policies** over disabling protection. If you must revert:
```sql
-- Remove the objects this migration added (reverts to pre-apply state).
drop trigger if exists trg_completion_reports_seal_latch      on public.inspector_completion_reports;
drop trigger if exists trg_completion_stage_items_seal_latch  on public.inspector_completion_stage_items;
drop trigger if exists trg_completion_documents_seal_latch    on public.inspector_completion_documents;
-- drop all 16 policies by name (see decision note / migration for the full list), e.g.:
--   drop policy if exists completion_reports_select_inspector on public.inspector_completion_reports; ...
drop function if exists public.enforce_completion_seal_latch();
drop function if exists public.completion_report_is_locked(text);
drop function if exists public.completion_is_client_request();
-- CAUTION: `alter table ... disable row level security;` re-opens client writes — the very hole this
-- migration closes. Only disable RLS on staging for diagnosis, never as a resolution.
```
On a local stack, `supabase db reset --local` also returns to a clean pre-apply state (local data only).

## 8. Production apply gate

Proceed to a hosted apply **only** when **all** of the following hold:
1. §2 hosted approvals complete (DB owner + **security owner** + backup + change window).
2. Staging §5 verification **green** and §6 smoke test **green**.
3. §7 stop conditions **not** triggered.
4. The hosted apply uses a **real reviewed apply** of the migration DDL (idempotent), **not**
   `migration repair`, and **not** `db push`.
5. Immediately after a green hosted verification, the ledger entry for `20260611000000` is recorded
   (per the decision note) — never before the effect is actually present.

## 9. Hard rule

**Hosted production must NOT be touched until this staging runbook has been reviewed and approved** and
the §8 gate is satisfied. This runbook performs no actions on its own; it is documentation for a human to
execute under approval. No `db push`, no `migration repair`, no production/deploy changes, and no changes
to Stripe, Vault, auth, or migrations/app code.
