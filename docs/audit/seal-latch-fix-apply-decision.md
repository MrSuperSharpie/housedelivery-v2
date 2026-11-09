# Decision Note — Seal-Latch Fix Apply / Reconciliation

**Branch:** `fix/s10-s13-template-alignment-option-a`
**Migration in question:** `supabase/migrations/20260611000000_inspector_completion_rls_seal_latch.sql`
**Date:** 2026-07-05 · **Type:** governance decision note — documentation only, **no action taken.**
**Status:** ⛔ **OPEN — requires approvals before any hosted apply.** No SQL run, no `db push`, no
`migration repair`, no migration applied. No app/config/Stripe/Vault/auth/production changes.

> Companion to `hosted-migration-ledger-reconciliation-decision.md` and
> `hosted-migration-gap-inventory.md`. This note is specifically about the **one** migration whose effect
> is **missing** on hosted and therefore **must not be ledger-repaired**.
>
> **Execution runbook:** the step-by-step staging apply + verification procedure is in
> **`docs/audit/seal-latch-staging-apply-runbook.md`** (staging first; hosted production must not be
> touched until that runbook is reviewed and approved).

---

## 1. What is missing on hosted

`20260611000000` is an inspection-completion **security/integrity** patch scoped to three tables
(`inspector_completion_reports`, `inspector_completion_stage_items`, `inspector_completion_documents`).
It defines: **3 functions**, **3 triggers**, **16 RLS policies**, and enables RLS on all three tables.

Hosted read-only verification (Round 3, 2026-07-05) found:

| Object type | Migration defines | Present on hosted | Missing |
|---|---|---|---|
| Functions (`completion_is_client_request`, `completion_report_is_locked`, `enforce_completion_seal_latch`) | 3 | **0** | **3** |
| Triggers (`trg_completion_reports_seal_latch`, `trg_completion_stage_items_seal_latch`, `trg_completion_documents_seal_latch`) | 3 | **0** | **3** |
| RLS policies (across the 3 tables) | 16 | **1** | **~15** |
| RLS enabled on the 3 tables | yes | *unknown — pre-check §6* | ? |

So the seal-latch enforcement and virtually all of the intended RLS are **absent on hosted**.

## 2. Why this is an integrity gap (not just a ledger issue)

The migration's own header states these tables previously had **no RLS and were fully writable from the
browser anon client**, and that the patch is what makes the database enforce:
- only the owning inspector may write, and **only while the report is unsealed**;
- reads limited to owning inspector / linked builder / admin;
- **no client delete** of reports or stage items;
- a **trigger latch** that makes **sealed/submitted reports immutable to client roles** even if a policy
  is later misconfigured (service-role / direct connections bypass, so server-side correction still works).

With the functions, triggers, and ~15 policies **absent**, that database-level protection is **not in
effect on hosted**. Concretely this risks:
- **Sealed inspections being editable by client roles** — directly contradicting the project rule *"a
  sealed inspection must not be casually editable"* and the seal/lock integrity model.
- **Browser-side writes** to completion records if RLS is disabled on these tables (matches prior
  backend-audit concerns about anon writes / missing sealed-state guards).
- **False audit posture** if the ledger claims this control is deployed while it is not.

This is a live security-control gap, so the fix is a **security change**, not a cosmetic reconciliation.

## 3. Why ledger repair is NOT allowed for `20260611000000`

`migration repair --status applied` only records that a migration **ran** — it executes **no SQL**.
Marking `20260611000000` "applied" while its objects are absent would:
- **permanently hide the gap** — the CLI/deploy pipeline would treat it as done and **never (re)apply it**,
  so the seal latch would never land;
- make the ledger **assert a security control that does not exist** — the worst possible audit state.

Ledger repair is valid **only** where the effect is already present (the other 9). This one is the
explicit exception.

## 4. Safe fix options (none executed)

### Option 1 — Reviewed forward apply of the existing migration DDL (recommended)
Apply `20260611000000`'s statements to hosted through a controlled, security-reviewed path. The migration
is **fully idempotent** (`create or replace function`, `drop trigger if exists` + `create trigger`,
`drop policy if exists` + `create policy`, idempotent `enable row level security`), so a clean apply
installs the missing objects without conflicting with the one policy already present. **Only after** a
successful apply + §7 verification, record it in the ledger.
- **Pros:** installs exactly the reviewed objects; idempotent; smallest divergence from Git.
- **Cons/risks:** enabling RLS + policies on live tables changes access **immediately** — must confirm
  the policies match current app access (service-role bypass preserved) so inspector/builder flows and
  the completion workspace do not break. Stage on a review env first.

### Option 2 — New forward "repair" migration
Author a new, higher-versioned migration that re-declares the same idempotent objects, and apply it via
the normal migration flow; leave `20260611000000` untouched.
- **Pros:** clean ledger lineage (a real applied row), no manual repair.
- **Cons:** adds a migration file (out of scope for *this* note — would be a separate approved change).

### Option 3 — Staged apply
Apply functions + triggers first (immutability latch), verify, then apply/enable the RLS policies — for a
cautious rollout on busy tables.

### Rejected
- **`migration repair --status applied`** for this version (§3).
- **`supabase db reset`** on hosted (destructive).
- Including this migration in the **blanket/targeted ledger repair** of the other 9.

## 5. Approvals required before any hosted apply

- [ ] **Database/platform owner** sign-off on the chosen option.
- [ ] **Security owner** sign-off — this restores an access-control + immutability guard on live data.
- [ ] **Verified hosted backup/snapshot** immediately before apply.
- [ ] **Staging/review-env dry run** completed with the §7 verification green and app flows unaffected.
- [ ] Written confirmation that **service-role server paths** (completion write/correction routes) remain
      functional (the latch/policies intentionally exempt service-role).
- [ ] Change-window / release approval.

This note authorizes **none** of the above.

## 6. Read-only pre-checks (run BEFORE any apply — SELECT/catalog only)

```sql
-- (a) Is RLS enabled on the three tables?
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relname in ('inspector_completion_reports','inspector_completion_stage_items','inspector_completion_documents');

-- (b) Which policies currently exist (identify the single present policy)?
select tablename, policyname, cmd from pg_policies
where schemaname='public' and tablename in
  ('inspector_completion_reports','inspector_completion_stage_items','inspector_completion_documents')
order by tablename, policyname;

-- (c) Do any of the functions/triggers already partially exist?
select proname from pg_proc
where proname in ('completion_is_client_request','completion_report_is_locked','enforce_completion_seal_latch');
select tgname, tgrelid::regclass as tbl from pg_trigger where tgname like 'trg_completion_%';

-- (d) Dependency: the builder read policy references job_opportunities.builder_id.
select column_name from information_schema.columns
where table_schema='public' and table_name='job_opportunities' and column_name='builder_id';

-- (e) Data footprint: are there sealed/submitted reports the latch will now protect?
select count(*) as total_reports,
       count(*) filter (where status = 'sealed' or submitted_at is not null) as sealed_or_submitted
from public.inspector_completion_reports;
```
Interpretation: if RLS is currently **disabled** (a), applying enables it — confirm the policy set covers
all live read/write paths before enabling. If a **partial** set of objects exists (b/c), the idempotent
apply reconciles it. (d) must return a row or the builder policy will fail. (e) sizes the blast radius.

## 7. Post-apply verification (on staging first, then hosted)

- **Objects present:** 3 functions + 3 triggers + **16** policies returned; RLS enabled on all 3 tables
  (re-run the `hosted-migration-gap-inventory.md` §3.6 checks — now all should return the full sets).
- **Immutability latch works:** as a client (authenticated) role, an attempt to `update`/`delete` a
  **sealed/submitted** report (or its child rows) is **rejected**; the unsealed→sealed transition by the
  owning inspector still succeeds once.
- **Access intact:** owning inspector can still write an **unsealed** draft; the linked **builder** can
  read; **admin** can read; **service-role** correction path still writes (latch bypass).
- **App smoke test:** the inspector completion workspace loads, saves an unsealed item, and seals without
  error; the Schedule C-B packet (System C) is unaffected.
- **Only then** record the ledger entry for `20260611000000` (via `repair --status applied` *at that
  point*, since the effect would then genuinely be present, or via the Option 2 forward migration).

## 8. Relationship to the targeted ledger repair of the other 9 migrations

- The **9 verified-present** migrations (see `hosted-migration-gap-inventory.md` §4) are already applied
  on hosted; their reconciliation is a **ledger-only** `repair --status applied` (with payments-owner
  sign-off for `20260615000000` / `20260622000000`). That work **excludes** `20260611000000`.
- `20260611000000` is on a **separate security-reviewed apply track** (this note). It is a **real apply**,
  not a ledger repair. The two efforts are independent and can proceed in parallel, but **must not be
  merged into one "mark the whole range applied" action.**
- **Sequencing recommendation:** do the seal-latch apply on its own track (staging → approvals → hosted →
  verify → ledger). The 9-migration ledger repair need not wait on it, but neither may absorb it.

---

## 9. Directives in force now

- Do **not** ledger-repair `20260611000000`.
- Do **not** `db push`, `migration up --linked`, `db reset`, or apply any migration from this note.
- Do **not** touch app code, migrations, Supabase config, Stripe, Vault, auth, or production settings.
- Any hosted apply happens only after §5 approvals, §6 pre-checks, and a green §7 staging verification.
