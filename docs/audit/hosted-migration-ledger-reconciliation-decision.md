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

**Data — S10–S13 templates: RETRACTED / NOT correct on the Preview DB (Round 5, 2026-07-06).**
> ⚠️ The Round 3/4 note below ("`version = 2` active…") could **not** be reproduced on the Supabase
> project the Vercel Preview uses (project ref **`llbcoqdtuvbwamptzipo`**). A targeted read-only re-check
> found **only `version = 1` old templates** for S10–S13 (Building Envelope / Insulation & Vapour Barrier
> / Drywall & Interior Finish / Life Safety Systems), both jurisdictions; **`version = 2` is ABSENT** and
> the VBBL S12 Step Code item is **absent**. So `20260705000000` is **NOT applied** to that database. The
> original claim is treated as **incorrect or misattributed**. See `s10-s13-preview-ui-qa-failure.md`.
>
> ~~S10–S13 active `version = 2` templates carry the permit-centric content; v1 inactive; VBBL S12 Step
> Code item present; content spot-check passed.~~ *(superseded)*

**Ledger — NOT aligned with Git history (Round 1 hosted check confirmed 2026-07-05):**
- `supabase_migrations.schema_migrations` returned **"Success. No rows"** for **all 10** versions from
  `20260501010000` through `20260705000000` → the **entire 202605–202607 range is unledgered**.
- **`public.profiles.id` = `uuid`** on hosted (systemic FK ambiguity resolved).
- **`builder_documents` table EXISTS** on hosted (`to_regclass` returned it) → the local `profiles.id
  text` blocker is local-only; that migration's effect is present.

**Verification phase COMPLETE (Rounds 1–4, 2026-07-05; `20260705000000` corrected Round 5, 2026-07-06).**
**Eight of ten** effects are verified present on hosted: `20260501010000` (builder_documents),
`20260501020000` (builder doc storage policies), `20260501030000` (inspector admin storage policy),
`20260509132000` (job-assignment `'completed'` status), `20260605000000` (stage labels), `20260615000000`
(inspector_payment_accounts — payments), `20260622000000` (hold_payment_gate — payments/Stripe),
`20260623000000` (catalogue_model_code).

**⛔ Two migrations are NOT safe to ledger-repair (effect not present):**
- `20260611000000_inspector_completion_rls_seal_latch` — three functions + three triggers **absent on
  hosted** (only 1 of 16 policies present). Real reviewed apply/fix required → `seal-latch-fix-apply-decision.md`.
- `20260705000000_align_s10_s13_templates_permit_centric` — **effect ABSENT** on the Preview DB
  `llbcoqdtuvbwamptzipo` (only v1 old templates; no v2). The Round 4 "verified present" is **retracted**.
  Real reviewed apply required → `s10-s13-preview-ui-qa-failure.md`.

Their existence proves a **blanket "mark the whole 202605–202607 range applied" is unsafe** — the range
must be reconciled per-migration, and these two must be **excluded** from any ledger repair.

**Interpretation:** the hosted data reflects the *effects* of migrations that the ledger does not record
as applied. Corrections/features reached hosted **out-of-band** (e.g. direct SQL / Studio), so the ledger
under-reports what has actually been applied, across the **whole 202605→202607 range** in Git.

**Next step (governance):** verification is complete. Convene the §5 approvals to execute a **targeted**
Option A repair covering **only the 8 verified-present** migrations (with payments-owner sign-off for
`20260615000000` and `20260622000000`), and **exclude BOTH `20260611000000` and `20260705000000`**. The
two excluded migrations are handled on separate real-apply tracks — `20260611000000` (security) per
**`seal-latch-fix-apply-decision.md`**, and `20260705000000` (S10–S13 templates) per
**`s10-s13-preview-ui-qa-failure.md`** — each a real apply/fix, **not** a ledger repair. No hosted writes.

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
- ~~**Re-applying `20260705000000`** (unnecessary — data already correct).~~ **REVISED (Round 5):** its
  effect is **absent** on the Preview DB, so it **does** need a real reviewed apply (not a ledger repair);
  that is tracked separately in `s10-s13-preview-ui-qa-failure.md`, and it is **excluded** from the
  ledger-repair scope here.
- **`supabase db push`** (would replay the whole gap).
- **`supabase db reset` on hosted** (destructive — never).

---

## 4. Required pre-work before ANY option (read-only)

> **Required evidence packet — COMPLETE (2026-07-05):** the gap inventory + per-migration read-only
> verification checks in **`docs/audit/hosted-migration-gap-inventory.md`** are done for all 10 versions.
> Result (corrected Round 5, 2026-07-06): **8 effect-verified present, 2 effect-not-present
> (`20260611000000` partial, `20260705000000` absent on Preview DB).** This satisfies the
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

- The S10–S13 migration (`20260705000000`) is **not applied** on the Preview DB (Round 5). Do **not**
  ledger-repair it; any real apply goes through the reviewed path in `s10-s13-preview-ui-qa-failure.md`.
- Do **not** run `supabase db push`.
- Do **not** run `supabase migration repair` yet.
- Do **not** merge or promote to production until the ledger reconciliation option is approved (§5) and
  the S10–S13 pre-merge items in `s10-s13-implementation-preflight.md` are complete.
- Ledger reconciliation must **not** change already-correct data.

## 7. Recommendation

Pursue **Option A** (targeted `migration repair --status applied`) **scoped only to the 8 effect-verified
migrations**, after the §5 approvals (including **payments-owner sign-off** for `20260615000000` and
`20260622000000`) — and **exclude BOTH** `20260611000000_inspector_completion_rls_seal_latch` (functions
+ triggers **missing** on hosted) **and** `20260705000000_align_s10_s13_templates_permit_centric` (S10–S13
v2 **absent** on the Preview DB, Round 5). Those two are the concrete instances of the "escalate
separately" rule: each needs a **real, reviewed apply/fix**, **not** a ledger repair (seal-latch →
`seal-latch-fix-apply-decision.md`; S10–S13 → `s10-s13-preview-ui-qa-failure.md`). Under no circumstances
blanket-mark the whole 202605–202607 range as applied.
