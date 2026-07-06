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

**Data — already correct (read-only SELECTs):**
- S10–S13 active `version = 2` templates carry the permit-centric content: Electrical Permit and Scope /
  Gas Permit and Mechanical / HVAC Scope / Insulation and Energy Compliance / Interior Completion.
- `version = 1` rows are preserved and **inactive**; `version = 2` rows are **active**.
- VBBL S12 includes "Vancouver Mandatory Minimum Step Code Tier". Content spot-check passed.

**Ledger — NOT aligned with Git history:**
- `supabase_migrations.schema_migrations` returned **no rows** for `20260605000000`
  (stage-label rename) or `20260705000000` (S10–S13 alignment).
- Recent ledger entries show migrations only **through the 202604 series**.

**Interpretation:** the hosted data reflects the *effects* of migrations that the ledger does not record
as applied. In other words, corrections reached hosted **out-of-band** (e.g. direct SQL / Studio), so the
ledger under-reports what has actually been applied. The gap is **not limited to the two S10–S13
migrations** — the ledger appears to be missing the entire 202605→202607 range that exists in Git.

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
- **Re-applying `20260705000000`** (unnecessary — data already correct).
- **`supabase db push`** (would replay the whole gap).
- **`supabase db reset` on hosted** (destructive — never).

---

## 4. Required pre-work before ANY option (read-only)

1. **Inventory the gap:** list every Git migration with version > the last ledgered version (≈ end of
   202604) through `20260705000000`, and classify each as data-changing vs schema-changing and
   idempotent vs not.
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

- Do **not** apply the S10–S13 migration again (hosted data is already correct).
- Do **not** run `supabase db push`.
- Do **not** run `supabase migration repair` yet.
- Do **not** merge or promote to production until the ledger reconciliation option is approved (§5) and
  the S10–S13 pre-merge items in `s10-s13-implementation-preflight.md` are complete.
- Ledger reconciliation must **not** change already-correct data.

## 7. Recommendation

Pursue **Option A** (targeted `migration repair --status applied`) **scoped to the full verified gap**,
but only after the §4 read-only inventory + per-migration effect verification and the §5 approvals. If the
inventory reveals any gap migration whose effect is **not** present in hosted, escalate that migration
separately — do not blanket-mark the range as applied.
