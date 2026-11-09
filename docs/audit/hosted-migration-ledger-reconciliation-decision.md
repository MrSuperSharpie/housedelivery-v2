# Decision Note — Hosted Migration Ledger Reconciliation

**Branch:** `fix/s10-s13-template-alignment-option-a`
**Date:** 2026-07-05 · **Type:** governance decision note (documentation only — no action taken)
**Status:** ⛔ **OPEN — requires approvals before any ledger change.** No `db push`, no `migration repair`,
no re-apply performed or authorized by this note.

> This note documents a discovered drift between the **hosted database state** and the **hosted migration
> ledger** (`supabase_migrations.schema_migrations`). It outlines safe options, risks, and required
> approvals. It **changes nothing**. Do not act on it without the approvals listed in §5.

---

## 1. What was found (hosted read-only verification, 2026-07-05)

**Data — S10–S13 templates: RETRACTED (Round 5) → RESOLVED by apply (Round 6, 2026-07-06).**
> ⚠️ The Round 3/4 note ("`version = 2` active…") could **not** be reproduced on the project the Vercel
> Preview uses (ref **`llbcoqdtuvbwamptzipo`**) — Round 5 found **only v1 old templates**, v2 ABSENT
> (`20260705000000` not applied there).
> ✅ **Resolved Round 6 (2026-07-06):** `20260705000000` was **applied + verified** on
> `llbcoqdtuvbwamptzipo` — S10–S13 **`version = 2` active** (4/4/4·5/5 items; VBBL S12 Step Code item
> present); `version = 1` **preserved + inactive**. So the data is now genuinely correct on the Preview DB
> **via the applied migration**, and its **ledger entry is still pending** (effect present, unledgered).
> See `s10-s13-preview-ui-qa-failure.md` (RESOLUTION).

**Ledger — NOT aligned with Git history (Round 1 hosted check confirmed 2026-07-05):**
- `supabase_migrations.schema_migrations` returned **"Success. No rows"** for **all 10** versions from
  `20260501010000` through `20260705000000` → the **entire 202605–202607 range is unledgered**.
- **`public.profiles.id` = `uuid`** on hosted (systemic FK ambiguity resolved).
- **`builder_documents` table EXISTS** on hosted (`to_regclass` returned it) → the local `profiles.id
  text` blocker is local-only; that migration's effect is present.

**Verification phase COMPLETE (Rounds 1–4, 2026-07-05; `20260705000000` corrected Round 5 then applied +
verified Round 6, 2026-07-06).** **Nine of ten** effects are verified present: `20260501010000`
(builder_documents), `20260501020000` (builder doc storage policies), `20260501030000` (inspector admin
storage policy), `20260509132000` (job-assignment `'completed'` status), `20260605000000` (stage labels),
`20260615000000` (inspector_payment_accounts — payments), `20260622000000` (hold_payment_gate —
payments/Stripe), `20260623000000` (catalogue_model_code), `20260705000000` (S10–S13 templates —
**applied + verified on `llbcoqdtuvbwamptzipo`, Round 6**; ledger entry still pending).

**⛔ One migration is NOT safe to ledger-repair (effect not present):**
- `20260611000000_inspector_completion_rls_seal_latch` — three functions + three triggers **absent on
  hosted** (only 1 of 16 policies present). Real reviewed apply/fix required → `seal-latch-fix-apply-decision.md`.

Its existence proves a **blanket "mark the whole 202605–202607 range applied" is unsafe** — the range must
be reconciled per-migration, and `20260611000000` must be **excluded** from any ledger repair.

**Interpretation:** the hosted data reflects the *effects* of migrations that the ledger does not record
as applied. Corrections/features reached hosted **out-of-band** (e.g. direct SQL / Studio), so the ledger
under-reports what has actually been applied, across the **whole 202605→202607 range** in Git.

**Next step (governance):** verification is complete. Convene the §5 approvals to execute a **targeted**
Option A repair covering **only the 9 verified-present** migrations (now including `20260705000000`, whose
effect is present but unledgered after the Round 6 apply), with payments-owner sign-off for `20260615000000`
and `20260622000000`, and **exclude `20260611000000`**. That one remains on a separate security-reviewed
apply track per **`seal-latch-fix-apply-decision.md`** — a real apply/fix, **not** a ledger repair. No
hosted writes.

---

## 2. Why this matters (risk if left unreconciled)

- **CLI will try to "apply" already-applied migrations.** Any future `supabase db push` or
  `supabase migration up` against hosted would attempt to run every migration the ledger thinks is
  missing. For idempotent migrations (like `20260705000000`, which uses `ON CONFLICT DO UPDATE`) this is
  data-safe, but **non-idempotent** migrations in the same gap could error or double-apply.
- **Audit defensibility.** The ledger is the system of record for "what schema/data state is deployed."
  A ledger that disagrees with reality undermines change traceability — exactly the property this whole
  audit stream is trying to protect.
- **Merge/promotion hazard.** Merging and promoting while the ledger is drifted invites a future deploy
  pipeline to replay the gap unpredictably.

---

## 3. Options (safe → heavier). None executed.

### Option A — Targeted `migration repair --status applied` for the verified gap (recommended candidate)
Mark the missing versions as applied in the ledger **without running their SQL**, only after verifying
each migration's effect is already present in hosted.
- **Mechanism:** `supabase migration repair --status applied <version> …` (per version), or an equivalent
  reviewed `INSERT` into `supabase_migrations.schema_migrations`.
- **Pros:** does not touch data; aligns ledger to reality; smallest change.
- **Cons/risks:** marking a version "applied" is a **claim** — if a migration in the gap was *not* fully
  applied, this hides real drift. Requires a per-migration effect check first (see §4).
- **Precondition:** full inventory + verification of every migration in the gap, not just S10–S13.

### Option B — Full ledger backfill from a verified baseline
Reconcile the entire 202605→202607 gap in one reviewed batch after inventorying each migration's effect.
- **Pros:** brings the whole ledger current, not just S10–S13.
- **Cons/risks:** larger surface; must verify each migration individually; higher chance of mislabeling.

### Option C — Leave ledger as-is; manage hosted manually; never CLI-push
- **Pros:** zero immediate action.
- **Cons/risks:** drift persists and grows; blocks safe CLI-based deploys; not sustainable; poor audit
  posture. Not recommended beyond a short holding period.

### Explicitly rejected for now
- ~~**Re-applying `20260705000000`** (unnecessary — data already correct).~~ **REVISED (Round 5 → 6):** its
  effect was **absent** on the Preview DB (Round 5), so it needed a real reviewed apply — which was **done +
  verified on `llbcoqdtuvbwamptzipo` (Round 6, 2026-07-06)**. It now needs **only its ledger entry**
  (in-scope for the targeted repair), **not** re-application.
- **`supabase db push`** (would replay the whole gap).
- **`supabase db reset` on hosted** (destructive — never).

---

## 4. Required pre-work before ANY option (read-only)

> **Required evidence packet — COMPLETE (2026-07-05):** the gap inventory + per-migration read-only
> verification checks in **`docs/audit/hosted-migration-gap-inventory.md`** are done for all 10 versions.
> Result (Round 6, 2026-07-06): **9 effect-verified present** (incl. `20260705000000`, applied + verified
> on `llbcoqdtuvbwamptzipo`), **1 effect-not-present (`20260611000000` partial).** This satisfies the
> "confirm every version's effect present/absent before choosing a repair option" precondition.

1. **Inventory the gap:** list every Git migration with version > the last ledgered version (≈ end of
   202604) through `20260705000000`, and classify each as data-changing vs schema-changing and
   idempotent vs not. → **done in `hosted-migration-gap-inventory.md` §2 (10 migrations, May–Jul 2026).**
2. **Per-migration effect verification (read-only):** for each gap migration, confirm its effect is
   present in hosted (tables/columns/constraints/seed rows/policies as applicable). Only migrations whose
   effect is confirmed present may be marked "applied".
3. **Flag any migration whose effect is missing** — those need a real (approved) apply, not a repair.
4. **Take a hosted snapshot/backup** immediately before any ledger write.

---

## 5. Required approvals

- [ ] **Database/platform owner** sign-off on the chosen option and the gap inventory (§4).
- [ ] **Verified hosted backup/snapshot** captured immediately prior to any ledger change.
- [ ] **Change-window / release** approval (ledger writes done deliberately, not via an ad-hoc deploy).
- [ ] Written confirmation that **no already-correct data will be modified** by the chosen action.

Only after all boxes are checked may a follow-up sprint execute the selected option. This note authorizes
**none** of it.

---

## 6. Governance directives (in force now)

- The S10–S13 migration (`20260705000000`) is **applied + verified** on the Preview DB
  `llbcoqdtuvbwamptzipo` (Round 6). Its **ledger entry is pending** and is in-scope for the targeted
  repair; do **not** re-apply it.
- Do **not** run `supabase db push`.
- Do **not** run `supabase migration repair` yet.
- Do **not** merge or promote to production until the ledger reconciliation option is approved (§5) and
  the S10–S13 pre-merge items in `s10-s13-implementation-preflight.md` are complete.
- Ledger reconciliation must **not** change already-correct data.

## 7. Recommendation

Pursue **Option A** (targeted `migration repair --status applied`) **scoped only to the 9 effect-verified
migrations** (now including `20260705000000`, whose effect is present but unledgered after the Round 6
apply), after the §5 approvals (including **payments-owner sign-off** for `20260615000000` and
`20260622000000`) — and **exclude** `20260611000000_inspector_completion_rls_seal_latch` (functions +
triggers **missing** on hosted). That one is the concrete instance of the "escalate separately" rule: it
needs a **real, reviewed apply/fix**, **not** a ledger repair (→ `seal-latch-fix-apply-decision.md`). Under
no circumstances blanket-mark the whole 202605–202607 range as applied.
