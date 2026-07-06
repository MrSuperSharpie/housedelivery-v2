# S10–S13 Alignment — Staging Validation & UI QA Checklist

**Branch:** `fix/s10-s13-template-alignment-option-a`
**Migration under test:** `supabase/migrations/20260705000000_align_s10_s13_templates_permit_centric.sql`
**Date:** 2026-07-05 · **Status:** migration DRAFTED & statically validated; **not applied to hosted Supabase.**

> Review/staging validation only. Do not apply to hosted production without explicit approval.
> No merge, no deploy, no `supabase db push` against production. No restricted systems touched.

---

## 1. Environment availability

A local/review database could **not** be stood up in this environment:

| Tool | State |
|---|---|
| Supabase CLI | **not installed** (installing is out of scope — no package installs) |
| Docker daemon | present but **not running** |
| `psql` | **not installed** |
| `supabase/config.toml` | present (project is Supabase-ready) |

**Consequence:** the migration was validated **statically** here (below). The DB-apply verification must
be run by you after applying the migration to a **local or review/staging** Supabase — **not** hosted prod.

### Static validation performed here (no DB)
- ✅ 8 template rows declared: S10–S13 × {`bcbc_2024`, `vbbl_2025`}.
- ✅ Item counts per stage block: S10 = 4, S11 = 4, S12 = 4 shared + 1 VBBL overlay, S13 = 5.
- ✅ v1 deactivation scoped strictly to `stage_number in (10, 11, 12, 13)`.
- ✅ **0** destructive statements (`DELETE` / `DROP` / `TRUNCATE`).
- ✅ No `inspection_stages` / `permit_checklist_responses` writes.
- ✅ `validate-stage-alignment.mjs` → 0 hard mismatches (exit 0); `stageAlignment.test.ts` → 5/5 pass.

---

## 2. How to apply on a LOCAL Supabase (only if you choose to; not run here)

```bash
# Requires Supabase CLI + Docker running. This targets the LOCAL stack only.
supabase start                # boots local Postgres + applies migrations in supabase/migrations
# or, if the stack is already up and you added the migration afterwards:
supabase migration up         # apply pending local migrations
# Reset-from-scratch alternative (LOCAL only — wipes local data):
# supabase db reset
```
**Do NOT** run `supabase db push` (that targets the linked hosted project). Local only.

---

## 3. DB verification query (run after applying to local/staging)

### 3a. Active item counts (primary check)
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

**Expected result:**

| stage_number | title | jurisdiction | version | is_active | items |
|---|---|---|---|---|---|
| 10 | Electrical Permit and Scope | bcbc_2024 | 1 | **false** | 6 (old envelope, preserved) |
| 10 | Electrical Permit and Scope | bcbc_2024 | **2** | **true** | **4** |
| 10 | Electrical Permit and Scope | vbbl_2025 | 1 | false | 6 |
| 10 | Electrical Permit and Scope | vbbl_2025 | **2** | **true** | **4** |
| 11 | Gas Permit and Mechanical / HVAC Scope | bcbc_2024 | 2 | true | **4** |
| 11 | Gas Permit and Mechanical / HVAC Scope | vbbl_2025 | 2 | true | **4** |
| 12 | Insulation and Energy Compliance | bcbc_2024 | 2 | true | **4** |
| 12 | Insulation and Energy Compliance | vbbl_2025 | 2 | true | **5** ← Step Code overlay |
| 13 | Interior Completion | bcbc_2024 | 2 | true | **5** |
| 13 | Interior Completion | vbbl_2025 | 2 | true | **5** |

(v1 rows for S11–S13 likewise remain present with `is_active = false`.)

### 3b. Exactly one active template per stage+jurisdiction (no double-gate)
```sql
select s.stage_number, j.slug, count(*) as active_templates
from public.stage_checklist_templates sct
join public.inspection_stages s on s.id = sct.stage_id
join public.jurisdictions     j on j.id = sct.jurisdiction_id
where s.stage_number in (10, 11, 12, 13) and sct.is_active = true
group by s.stage_number, j.slug
order by s.stage_number, j.slug;
```
**Expected:** `active_templates = 1` for all 8 rows (v1 deactivated, only v2 active).

### 3c. Historical rows preserved (nothing deleted)
```sql
select s.stage_number, j.slug, count(*) as total_versions
from public.stage_checklist_templates sct
join public.inspection_stages s on s.id = sct.stage_id
join public.jurisdictions     j on j.id = sct.jurisdiction_id
where s.stage_number in (10, 11, 12, 13)
group by s.stage_number, j.slug
order by s.stage_number, j.slug;
```
**Expected:** `total_versions = 2` for all 8 (v1 kept + v2 added).

### 3d. Title ↔ content spot check (labels now match the stage)
```sql
select s.stage_number, s.title, sci.sort_order, sci.label
from public.stage_checklist_items sci
join public.stage_checklist_templates sct on sct.id = sci.template_id
join public.inspection_stages s on s.id = sct.stage_id
join public.jurisdictions j on j.id = sct.jurisdiction_id
where s.stage_number in (10, 11, 12, 13) and sct.is_active = true and j.slug = 'bcbc_2024'
order by s.stage_number, sci.sort_order;
```
**Expected labels (BCBC):** S10 → Electrical Permit and Service Readiness / Branch Circuit Rough-In /
Life Safety, Specialty Circuits… / Electrical Inspection…; S11 → Mechanical Permit… / Gas Piping… /
Ventilation… / Mechanical and Gas Inspection Closeout; S12 → Thermal Insulation… / Air Barrier… /
Energy Documentation… / Insulation Inspection…; S13 → Fire Separation… / Interior Wall Substrate… /
Interior Life Safety… / Interior Finishes… / Accessibility…. **None** should read "Building Envelope",
"Vapour Barrier", "Drywall", or "Fire alarm/Life Safety Systems" (those are the old, now-inactive v1).

---

## 4. Manual UI QA checklist (after staging apply)

Precondition: signed in as an inspector; have one **Vancouver** project and one **non-Vancouver** BC
project. Goal: **every stage title matches the checklist content shown beneath it.**

### 4a. Inspector stage reference page (`/inspector/stages`) — System B surface
- [ ] **S10 — Electrical Permit and Scope** shows **electrical** items (permit/service, branch circuits,
      life-safety circuits, inspection closeout) — **not** Building Envelope.
- [ ] **S11 — Gas Permit and Mechanical / HVAC Scope** shows **gas/mechanical/HVAC** items — not Insulation.
- [ ] **S12 — Insulation and Energy Compliance** shows **insulation/air-barrier/energy** items — not Drywall.
- [ ] **S13 — Interior Completion** shows **interior/egress/finishes/accessibility** items — not Fire Alarm.
- [ ] No stage renders a title over unrelated content anywhere in S10–S13.

### 4b. Jurisdiction resolution
- [ ] **Vancouver project → `vbbl_2025`**: S12 shows the extra **"Vancouver Mandatory Minimum Step Code
      Tier"** item (5 items vs BCBC 4).
- [ ] **Non-Vancouver project → `bcbc_2024`**: S12 shows **4** items (no Step Code overlay).
- [ ] S10, S11, S13 show the same item set in both jurisdictions (4/4/5).

### 4c. Claim scope preview (`JobDetailModal`)
- [ ] For an S10–S13 job, the "resolved scope" preview title (`scope.title` / `stageLabel`) and its listed
      checklist items describe the **same** discipline (electrical/gas/insulation/interior).
- [ ] Vancouver job preview reflects `vbbl_2025`; non-Vancouver reflects `bcbc_2024`.

### 4d. Regression safety
- [ ] S01–S09 and S14–S15 are unchanged (same titles + items as before).
- [ ] No error loading any stage; seal/lock behaviour unchanged (no in-flight data existed — counts were 0).
- [ ] Schedule C-B packet unchanged (System C untouched).

---

## 5. Remaining blocker before merge

1. **Apply on local/review Supabase** (not hosted prod) and run §3a–§3d — confirm expected results.
2. **Complete the §4 manual UI QA** with a Vancouver and a non-Vancouver project.
3. **Human inspector review** of S10–S13 titles, item wording, and the VBBL Step Code overlay.
4. On approval, apply to hosted (separate approved step) → then merge.

**Not blocking / out of scope this sprint:** full 15-stage reconciliation, typed evidence schema,
governed N/A, richer Hold taxonomy (tracked in `canonical-template-reconciliation-plan.md`).
