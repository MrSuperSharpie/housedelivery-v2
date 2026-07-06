# Local-Only Validation Runbook — S10–S13 Alignment Migration

**Branch:** `fix/s10-s13-template-alignment-option-a`
**Migration under test:** `supabase/migrations/20260705000000_align_s10_s13_templates_permit_centric.sql`
**Purpose:** a **review-before-run** helper to validate the migration on a **local** Supabase only.

> ⚠️ **Nothing in this file has been executed.** It is a runbook for *you* to review and run manually.
>
> **HARD RULES — this runbook never targets hosted Supabase:**
> - Never run `supabase db push`. Never pass `--linked`. Never use a hosted `--db-url`.
> - `supabase start`, `supabase migration up --local`, and `supabase db reset --local` operate on the
>   **local Docker Postgres only**.
> - `supabase db reset --local` **destroys LOCAL test data only** (it rebuilds the local DB from
>   `supabase/migrations` + local seed). It does **not** touch any hosted/linked project.
> - No merge, no deploy. No Stripe/payments/auth/job-claiming/Vault/Schedule C-B/production settings.

---

## Step 0 — Copy-paste preflight guard (run this first; it only *checks*, it does not apply anything)

```bash
# LOCAL-ONLY preflight. Refuses to proceed if anything looks hosted/linked.
set -euo pipefail

# 1. Correct branch
want_branch="fix/s10-s13-template-alignment-option-a"
have_branch="$(git branch --show-current)"
[ "$have_branch" = "$want_branch" ] || { echo "✗ On '$have_branch', expected '$want_branch'"; exit 1; }
echo "✓ branch: $have_branch"

# 2. Supabase CLI exists
command -v supabase >/dev/null || { echo "✗ Supabase CLI not installed"; exit 1; }
echo "✓ supabase CLI: $(supabase --version)"

# 3. Docker running
docker info >/dev/null 2>&1 || { echo "✗ Docker daemon is not running"; exit 1; }
echo "✓ docker daemon: running"

# 4. Migration file present
mig="supabase/migrations/20260705000000_align_s10_s13_templates_permit_centric.sql"
[ -f "$mig" ] || { echo "✗ migration file missing: $mig"; exit 1; }
echo "✓ migration file present"

# 5. LINKED-PROJECT GUARD — warn loudly if a hosted project is linked.
#    Local commands below are still safe, but this makes the risk explicit so you
#    never accidentally run a hosted command.
if [ -f "supabase/.temp/project-ref" ]; then
  echo "⚠️  A linked project ref exists ($(cat supabase/.temp/project-ref))."
  echo "    DO NOT run 'supabase db push' or any '--linked' command. Local commands are safe."
else
  echo "✓ no linked project ref detected"
fi

# 6. Refuse if the operator's shell history/intent includes hosted verbs (defensive echo only).
echo "✓ preflight complete — proceed with LOCAL commands only (never 'db push' / '--linked')."
```

---

## Step 1 — Apply the migration to LOCAL Supabase (choose ONE; review first)

```bash
# Option 1 (cold start): boots the local stack and applies ALL migrations in order.
supabase start

# Option 2 (stack already running, migration added afterwards): apply pending migrations LOCALLY.
supabase migration up --local

# Option 3 (rebuild local from scratch — DESTROYS LOCAL TEST DATA ONLY, never hosted):
# supabase db reset --local
```

**Never** run `supabase db push` (that targets the linked hosted project) — it is explicitly out of scope.

Get the local connection details (for the SQL below) — local only:
```bash
supabase status            # shows local DB URL + Studio URL
# Default local DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
# Studio SQL editor:    http://127.0.0.1:54323
```

Run the verification SQL either via Studio (http://127.0.0.1:54323) or:
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f /dev/stdin <<'SQL'
-- paste query 2a here
SQL
```

---

## Step 2 — Verification SQL (identical to `s10-s13-staging-qa-checklist.md`)

### 2a. Active item counts (primary check)
```sql
select s.stage_number, s.title, j.slug as jurisdiction, sct.version, sct.is_active, count(sci.id) as items
from public.stage_checklist_templates sct
join public.inspection_stages s on s.id = sct.stage_id
join public.jurisdictions     j on j.id = sct.jurisdiction_id
left join public.stage_checklist_items sci on sci.template_id = sct.id
where s.stage_number in (10, 11, 12, 13)
group by s.stage_number, s.title, j.slug, sct.version, sct.is_active
order by s.stage_number, j.slug, sct.version;
```

### 2b. Exactly one active template per stage+jurisdiction (no double seal-gate)
```sql
select s.stage_number, j.slug, count(*) as active_templates
from public.stage_checklist_templates sct
join public.inspection_stages s on s.id = sct.stage_id
join public.jurisdictions     j on j.id = sct.jurisdiction_id
where s.stage_number in (10, 11, 12, 13) and sct.is_active = true
group by s.stage_number, j.slug
order by s.stage_number, j.slug;
```

### 2c. Historical rows preserved (nothing deleted)
```sql
select s.stage_number, j.slug, count(*) as total_versions
from public.stage_checklist_templates sct
join public.inspection_stages s on s.id = sct.stage_id
join public.jurisdictions     j on j.id = sct.jurisdiction_id
where s.stage_number in (10, 11, 12, 13)
group by s.stage_number, j.slug
order by s.stage_number, j.slug;
```

### 2d. Title ↔ content spot check (labels now match the stage)
```sql
select s.stage_number, s.title, sci.sort_order, sci.label
from public.stage_checklist_items sci
join public.stage_checklist_templates sct on sct.id = sci.template_id
join public.inspection_stages s on s.id = sct.stage_id
join public.jurisdictions j on j.id = sct.jurisdiction_id
where s.stage_number in (10, 11, 12, 13) and sct.is_active = true and j.slug = 'bcbc_2024'
order by s.stage_number, sci.sort_order;
```

---

## Step 3 — Expected results

**2a — active (version = 2) item counts:**

| stage | jurisdiction | active v2 items |
|---|---|---|
| S10 Electrical Permit and Scope | bcbc_2024 | **4** |
| S10 Electrical Permit and Scope | vbbl_2025 | **4** |
| S11 Gas Permit and Mechanical / HVAC Scope | bcbc_2024 | **4** |
| S11 Gas Permit and Mechanical / HVAC Scope | vbbl_2025 | **4** |
| S12 Insulation and Energy Compliance | bcbc_2024 | **4** |
| S12 Insulation and Energy Compliance | vbbl_2025 | **5** ← Vancouver Step Code overlay |
| S13 Interior Completion | bcbc_2024 | **5** |
| S13 Interior Completion | vbbl_2025 | **5** |

Each row above also has a `version = 1`, `is_active = false` row (the old construction-model template),
still present.

- **2b — active_templates:** must equal **1** for every stage+jurisdiction (v1 deactivated, only v2 active).
- **2c — total_versions:** must equal **2** for every stage+jurisdiction (v1 preserved + v2 added; nothing deleted).
- **2d — labels (BCBC active):** S10 electrical (permit/service, branch circuits, life-safety circuits,
  inspection closeout); S11 gas/mechanical/HVAC; S12 insulation/air-barrier/energy; S13 interior
  (fire separation, wall substrate, life safety/egress, finishes, accessibility). **None** should read
  "Building Envelope", "Vapour Barrier", "Drywall", or "Fire alarm/Life Safety Systems" (those are the
  now-inactive v1 rows).

---

## Step 4 — Manual UI QA checklist (after local apply)

Signed in as an inspector, with one **Vancouver** project and one **non-Vancouver** BC project.
Goal: **every stage title matches the checklist content shown beneath it.**

### `/inspector/stages` (System B reference surface)
- [ ] **S10 — Electrical Permit and Scope** shows electrical items (not Building Envelope).
- [ ] **S11 — Gas Permit and Mechanical / HVAC Scope** shows gas/mechanical/HVAC items (not Insulation).
- [ ] **S12 — Insulation and Energy Compliance** shows insulation/air-barrier/energy items (not Drywall).
- [ ] **S13 — Interior Completion** shows interior/egress/finishes/accessibility items (not Fire Alarm).

### Jurisdiction resolution
- [ ] **Vancouver → `vbbl_2025`:** S12 shows the extra **"Vancouver Mandatory Minimum Step Code Tier"** (5 items).
- [ ] **Non-Vancouver → `bcbc_2024`:** S12 shows **4** items (no Step Code overlay).
- [ ] S10 / S11 / S13 identical in both jurisdictions (4 / 4 / 5).

### `JobDetailModal` (claim scope preview)
- [ ] For an S10–S13 job, the resolved-scope title and its listed items describe the **same** discipline.
- [ ] Vancouver job → `vbbl_2025`; non-Vancouver → `bcbc_2024`.

### Regression safety
- [ ] S01–S09 and S14–S15 unchanged (same titles + items).
- [ ] No stage load errors; seal/lock behaviour unchanged (no in-flight data existed — counts were 0).
- [ ] Schedule C-B packet unchanged (System C untouched).

---

## Step 5 — Rollback (local; if you want to revert without a full reset)

```sql
-- Reactivate v1 and deactivate v2 for S10–S13 (additive; no rows removed).
update public.stage_checklist_templates sct
   set is_active = (sct.version = 1)
  from public.inspection_stages s
 where sct.stage_id = s.id and s.stage_number in (10, 11, 12, 13);
```
Or simply `supabase db reset --local` to rebuild the local DB from migrations (local data only).

---

## Notes
- This runbook targets **local Supabase only**. Hosted application is a separate, explicitly-approved step.
- After local validation passes + human inspector review, the remaining pre-merge steps are tracked in
  `docs/audit/s10-s13-staging-qa-checklist.md` and `docs/audit/s10-s13-implementation-preflight.md`.
