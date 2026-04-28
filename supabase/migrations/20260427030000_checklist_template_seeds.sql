-- ─────────────────────────────────────────────────────────────────────────────
-- Checklist Template Seeds
-- Migration: 20260427030000_checklist_template_seeds.sql
--
-- Seeds professional checklist templates and items for four inspection stages:
--   • foundation_formwork_rebar  — Foundation & Structural
--   • electrical_rough_in        — Stage 8 Electrical
--   • plumbing_rough_in          — Stage 9 Plumbing
--   • final_occupancy_permit     — Stage 15 Final Occupancy Seal
--
-- Jurisdictions seeded:
--   • bcbc_2024  — British Columbia Building Code 2024
--   • vbbl_2025  — Vancouver Building By-law 2025
--
-- Templates are seeded for both jurisdictions.  The VBBL_2025 templates
-- contain all BCBC items plus Vancouver-specific additions where present.
-- This lets the application select the appropriate template based on the
-- project jurisdiction without hard-coding content in React.
--
-- All statements are fully idempotent (ON CONFLICT DO UPDATE).
-- Checklist items use a unique constraint on (template_id, label) added below.
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════
-- 0. UNIQUE CONSTRAINT ON CHECKLIST ITEMS
--    Enables ON CONFLICT DO UPDATE upserts keyed on (template_id, label).
-- ═══════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'uq_checklist_item_template_label'
       and conrelid = 'public.stage_checklist_items'::regclass
  ) then
    alter table public.stage_checklist_items
      add constraint uq_checklist_item_template_label
      unique (template_id, label);
  end if;
end $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. JURISDICTIONS
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.jurisdictions (slug, name, code_version, effective_date, is_active)
values
  (
    'bcbc_2024',
    'British Columbia Building Code 2024',
    'BCBC 2024',
    '2024-03-08',
    true
  ),
  (
    'vbbl_2025',
    'Vancouver Building By-law 2025',
    'VBBL 2025',
    '2025-01-01',
    true
  )
on conflict (slug) do update
  set name           = excluded.name,
      code_version   = excluded.code_version,
      effective_date = excluded.effective_date,
      is_active      = excluded.is_active,
      updated_at     = now();


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. TEMPLATES
--    One per (stage, jurisdiction) pair — 4 stages × 2 jurisdictions = 8 rows.
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.stage_checklist_templates
  (stage_id, jurisdiction_id, title, version, is_active, effective_from)
select
  s.id,
  j.id,
  tmpl.title,
  1,
  true,
  j.effective_date
from (values
  ('foundation_formwork_rebar', 'bcbc_2024', 'Foundation & Structural — BC Building Code 2024'),
  ('foundation_formwork_rebar', 'vbbl_2025', 'Foundation & Structural — Vancouver Building By-law 2025'),
  ('electrical_rough_in',       'bcbc_2024', 'Electrical Rough-In — BC Building Code 2024'),
  ('electrical_rough_in',       'vbbl_2025', 'Electrical Rough-In — Vancouver Building By-law 2025'),
  ('plumbing_rough_in',         'bcbc_2024', 'Plumbing Rough-In — BC Building Code 2024'),
  ('plumbing_rough_in',         'vbbl_2025', 'Plumbing Rough-In — Vancouver Building By-law 2025'),
  ('final_occupancy_permit',    'bcbc_2024', 'Final Occupancy Permit — BC Building Code 2024'),
  ('final_occupancy_permit',    'vbbl_2025', 'Final Occupancy Permit — Vancouver Building By-law 2025')
) as tmpl(stage_slug, jurisdiction_slug, title)
join public.inspection_stages s on s.slug = tmpl.stage_slug
join public.jurisdictions j     on j.slug = tmpl.jurisdiction_slug
on conflict (stage_id, jurisdiction_id, version) do update
  set title        = excluded.title,
      is_active    = excluded.is_active,
      updated_at   = now();


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. CHECKLIST ITEMS
-- ═══════════════════════════════════════════════════════════════════════════
-- Pattern for each section:
--   CTE `tmpl` resolves the template UUID(s) by stage/jurisdiction slug.
--   CTE `items` holds the content rows as a VALUES list.
--   Final INSERT cross-joins both and upserts.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── 3A. FOUNDATION & STRUCTURAL ─────────────────────────────────────────────
-- Identical content for BCBC_2024 and VBBL_2025.
-- (VBBL incorporates BCBC; no Vancouver-specific foundation additions exist in
--  the provided checklist content.)

with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug in ('foundation_formwork_rebar')
    and j.slug in ('bcbc_2024', 'vbbl_2025')
    and sct.version = 1
),
items (sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url) as (
  values
  (
    1,
    'Structural capacity, anchorage, and seismic restraint',
    'Confirm structural capacity of foundation-related structural components, including anchorage and seismic restraint.',
    true,
    'BCBC 2024 Schedule B, Structural 2.1',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    2,
    'Deep foundations',
    'Confirm structural aspects of deep foundations where applicable.',
    true,
    'BCBC 2024 Schedule B, Structural 2.2',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    3,
    'Structural shop drawings',
    'Confirm review of applicable structural shop drawings.',
    true,
    'BCBC 2024 Schedule B, Structural 2.3',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    4,
    'Dampproofing and waterproofing below grade',
    'Confirm dampproofing and/or waterproofing of walls and slabs below grade where applicable.',
    true,
    'BCBC 2024 Schedule B, Architectural 1.17',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    5,
    'Site and foundation drainage',
    'Confirm site and foundation drainage systems where applicable.',
    true,
    'BCBC 2024 Schedule B, Plumbing 4.2',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    6,
    'Geotechnical bearing capacity of soil',
    'Confirm geotechnical bearing capacity of soil where applicable.',
    true,
    'BCBC 2024 Schedule B, Geotechnical Permanent 8.1',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    7,
    'Compaction of engineered fill',
    'Confirm compaction of engineered fill where applicable.',
    true,
    'BCBC 2024 Schedule B, Geotechnical Permanent 8.3',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    8,
    'Backfill and permanent dewatering',
    'Confirm backfill and permanent dewatering requirements where applicable.',
    true,
    'BCBC 2024 Schedule B, Geotechnical Permanent 8.5 and 8.6',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  )
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required,
   legal_reference, source_title, source_url)
select
  tmpl.template_id,
  items.sort_order,
  items.label,
  items.requirement_text,
  'boolean',
  items.is_required,
  items.legal_reference,
  items.source_title,
  items.source_url
from tmpl cross join items
on conflict (template_id, label) do update
  set sort_order       = excluded.sort_order,
      requirement_text = excluded.requirement_text,
      is_required      = excluded.is_required,
      legal_reference  = excluded.legal_reference,
      source_title     = excluded.source_title,
      source_url       = excluded.source_url,
      updated_at       = now();


-- ─── 3B. ELECTRICAL ROUGH-IN ─────────────────────────────────────────────────
-- Items 1–8 are identical for both BCBC_2024 and VBBL_2025.
-- (Item 1 legal_reference cites VBBL guidance; this is intentionally included
--  in both templates as VBBL inspection guidance aligns with BCBC Schedule B.)

with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'electrical_rough_in'
    and j.slug in ('bcbc_2024', 'vbbl_2025')
    and sct.version = 1
),
items (sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url) as (
  values
  (
    1,
    'Electrical systems match approved permit scope',
    'Confirm electrical systems and devices match the approved permit scope.',
    true,
    'VBBL inspection guidance / BCBC Schedule B, Electrical 6.1',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    2,
    'Fire separation continuity at electrical penetrations',
    'Confirm continuity of fire separations at electrical penetrations.',
    true,
    'BCBC 2024 Schedule B, Electrical 6.2',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    3,
    'Functional testing of electrical fire emergency systems',
    'Confirm functional testing of electrical-related fire emergency systems and devices where applicable.',
    true,
    'BCBC 2024 Schedule B, Electrical 6.3',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    4,
    'Electrical systems maintenance manuals',
    'Confirm electrical systems and device maintenance manuals where required.',
    true,
    'BCBC 2024 Schedule B, Electrical 6.4',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    5,
    'Structural capacity and seismic restraint of electrical components',
    'Confirm structural capacity, anchorage, and seismic restraint of electrical components where applicable.',
    true,
    'BCBC 2024 Schedule B, Electrical 6.5',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    6,
    'Clearances from buildings for electrical utility equipment',
    'Confirm required clearances from buildings for electrical utility equipment.',
    true,
    'BCBC 2024 Schedule B, Electrical 6.6',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    7,
    'Fire protection of wiring for emergency systems',
    'Confirm fire protection of wiring for emergency systems where applicable.',
    true,
    'BCBC 2024 Schedule B, Electrical 6.7',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    8,
    'Electrical shop drawings',
    'Confirm review of applicable electrical shop drawings.',
    true,
    'BCBC 2024 Schedule B, Electrical 6.8',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  )
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required,
   legal_reference, source_title, source_url)
select
  tmpl.template_id,
  items.sort_order,
  items.label,
  items.requirement_text,
  'boolean',
  items.is_required,
  items.legal_reference,
  items.source_title,
  items.source_url
from tmpl cross join items
on conflict (template_id, label) do update
  set sort_order       = excluded.sort_order,
      requirement_text = excluded.requirement_text,
      is_required      = excluded.is_required,
      legal_reference  = excluded.legal_reference,
      source_title     = excluded.source_title,
      source_url       = excluded.source_url,
      updated_at       = now();


-- ─── 3C. PLUMBING ROUGH-IN (BCBC + VBBL shared items 1–8) ───────────────────

with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'plumbing_rough_in'
    and j.slug in ('bcbc_2024', 'vbbl_2025')
    and sct.version = 1
),
items (sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url) as (
  values
  (
    1,
    'Plumbing systems match approved permit scope',
    'Confirm plumbing systems and devices match the approved permit scope.',
    true,
    'BC Plumbing Code 2024 / BCBC Schedule B, Plumbing 4.3',
    'BC Plumbing Code 2024',
    'https://www.bccodes.ca/bc-plumbing-code.html'
  ),
  (
    2,
    'Roof drainage systems',
    'Confirm roof drainage systems where applicable.',
    true,
    'BCBC 2024 Schedule B, Plumbing 4.1',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    3,
    'Site and foundation drainage systems',
    'Confirm site and foundation drainage systems where applicable.',
    true,
    'BCBC 2024 Schedule B, Plumbing 4.2',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    4,
    'Fire separation continuity at plumbing penetrations',
    'Confirm continuity of fire separations at plumbing penetrations.',
    true,
    'BCBC 2024 Schedule B, Plumbing 4.4',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    5,
    'Functional testing of plumbing fire emergency systems',
    'Confirm functional testing of plumbing-related fire emergency systems and devices where applicable.',
    true,
    'BCBC 2024 Schedule B, Plumbing 4.5',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    6,
    'Plumbing systems maintenance manuals',
    'Confirm plumbing systems maintenance manuals where required.',
    true,
    'BCBC 2024 Schedule B, Plumbing 4.6',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    7,
    'Structural capacity and seismic restraint of plumbing components',
    'Confirm structural capacity, anchorage, and seismic restraint of plumbing components where applicable.',
    true,
    'BCBC 2024 Schedule B, Plumbing 4.7',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    8,
    'Plumbing shop drawings',
    'Confirm review of applicable plumbing shop drawings.',
    true,
    'BCBC 2024 Schedule B, Plumbing 4.8',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  )
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required,
   legal_reference, source_title, source_url)
select
  tmpl.template_id,
  items.sort_order,
  items.label,
  items.requirement_text,
  'boolean',
  items.is_required,
  items.legal_reference,
  items.source_title,
  items.source_url
from tmpl cross join items
on conflict (template_id, label) do update
  set sort_order       = excluded.sort_order,
      requirement_text = excluded.requirement_text,
      is_required      = excluded.is_required,
      legal_reference  = excluded.legal_reference,
      source_title     = excluded.source_title,
      source_url       = excluded.source_url,
      updated_at       = now();

-- ─── 3C-2. PLUMBING ROUGH-IN (VBBL_2025 only — item 9, Vancouver-specific) ──
-- Sewer/storm connection placard is a City of Vancouver inspection requirement
-- that does not exist in the general BCBC framework.

with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'plumbing_rough_in'
    and j.slug = 'vbbl_2025'
    and sct.version = 1
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required,
   legal_reference, source_title, source_url)
select
  tmpl.template_id,
  9,
  'Sewer/storm connection placard data',
  'Confirm sewer/storm connection placard data is complete and matches installed conditions where Vancouver sewer/storm inspection applies.',
  'boolean',
  true,
  'City of Vancouver sewer connection placard inspection guidance',
  'City of Vancouver — Plumbing and Drainage Permits',
  'https://vancouver.ca/home-property-development/plumbing-drainage-permits.aspx'
from tmpl
on conflict (template_id, label) do update
  set sort_order       = excluded.sort_order,
      requirement_text = excluded.requirement_text,
      is_required      = excluded.is_required,
      legal_reference  = excluded.legal_reference,
      source_title     = excluded.source_title,
      source_url       = excluded.source_url,
      updated_at       = now();


-- ─── 3D. FINAL OCCUPANCY PERMIT (shared items for both jurisdictions) ─────────
-- Items 1, 2, and 5 apply under both BCBC and VBBL.

with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'final_occupancy_permit'
    and j.slug in ('bcbc_2024', 'vbbl_2025')
    and sct.version = 1
),
items (sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url) as (
  values
  (
    1,
    'Prerequisite specialty stages digitally sealed',
    'Confirm all required prerequisite specialty stages are digitally sealed.',
    true,
    'Vero Permit dependency rule',
    'Vero Permit — Stage Dependency Gate',
    null
  ),
  (
    2,
    'Final inspection passed or ready for authority review',
    'Confirm final inspection has passed or is ready for authority review.',
    true,
    'BC building permit process — final inspection guidance',
    'BC Housing — Building Permit Process',
    'https://www.bchousing.org/licensing-consumer-protection/building-safety/building-permits'
  ),
  (
    5,
    'Schedules C-A and C-B or equivalent letters of assurance',
    'Confirm Schedules C-A and C-B or equivalent letters of assurance are collected where required.',
    true,
    'BC Letters of Assurance guidance',
    'BC Housing — Letters of Assurance',
    'https://www.bchousing.org/licensing-consumer-protection/building-safety/letters-of-assurance'
  )
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required,
   legal_reference, source_title, source_url)
select
  tmpl.template_id,
  items.sort_order,
  items.label,
  items.requirement_text,
  'boolean',
  items.is_required,
  items.legal_reference,
  items.source_title,
  items.source_url
from tmpl cross join items
on conflict (template_id, label) do update
  set sort_order       = excluded.sort_order,
      requirement_text = excluded.requirement_text,
      is_required      = excluded.is_required,
      legal_reference  = excluded.legal_reference,
      source_title     = excluded.source_title,
      source_url       = excluded.source_url,
      updated_at       = now();

-- ─── 3D-2. FINAL OCCUPANCY PERMIT (VBBL_2025 only — items 3, 4, 6, 7) ────────
-- These items reference City of Vancouver occupancy permit process steps.
-- They are not seeded for the BCBC template as the CoV process is
-- Vancouver-specific; equivalent requirements exist in other jurisdictions
-- under different instruments and can be added by admins later.

with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'final_occupancy_permit'
    and j.slug = 'vbbl_2025'
    and sct.version = 1
),
items (sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url) as (
  values
  (
    3,
    'Occupancy permit identified for commercial or multi-unit residential',
    'Confirm required occupancy permit is identified for commercial or multi-unit residential occupancy before use.',
    true,
    'City of Vancouver Occupancy Permit guidance',
    'City of Vancouver — Occupancy Permits',
    'https://vancouver.ca/home-property-development/occupancy-permits.aspx'
  ),
  (
    4,
    'Issued permits in place before occupancy application',
    'Confirm issued permits authorizing the work are in place before occupancy permit application.',
    true,
    'City of Vancouver Occupancy Permit Step 2',
    'City of Vancouver — Occupancy Permits',
    'https://vancouver.ca/home-property-development/occupancy-permits.aspx'
  ),
  (
    6,
    'Required agency reviews complete',
    'Confirm required fire/life-safety, Vancouver Fire and Rescue, Vancouver Coastal Health, Environmental Protection, grease interceptor, or similar agency reviews are complete where applicable.',
    true,
    'City of Vancouver Occupancy Permit Step 3',
    'City of Vancouver — Occupancy Permits',
    'https://vancouver.ca/home-property-development/occupancy-permits.aspx'
  ),
  (
    7,
    'Permit terms and outstanding deficiencies resolved',
    'Confirm permit terms, conditions, and outstanding deficiencies are resolved or clearly recorded.',
    true,
    'City of Vancouver Occupancy Permit guidance',
    'City of Vancouver — Occupancy Permits',
    'https://vancouver.ca/home-property-development/occupancy-permits.aspx'
  )
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required,
   legal_reference, source_title, source_url)
select
  tmpl.template_id,
  items.sort_order,
  items.label,
  items.requirement_text,
  'boolean',
  items.is_required,
  items.legal_reference,
  items.source_title,
  items.source_url
from tmpl cross join items
on conflict (template_id, label) do update
  set sort_order       = excluded.sort_order,
      requirement_text = excluded.requirement_text,
      is_required      = excluded.is_required,
      legal_reference  = excluded.legal_reference,
      source_title     = excluded.source_title,
      source_url       = excluded.source_url,
      updated_at       = now();


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. VERIFICATION QUERY
-- ═══════════════════════════════════════════════════════════════════════════
-- Run after applying the migration to confirm all templates and items are
-- correctly seeded.  Output should show 8 templates and correct item counts:
--
--   Foundation     BCBC: 8 items   VBBL: 8 items
--   Electrical     BCBC: 8 items   VBBL: 8 items
--   Plumbing       BCBC: 8 items   VBBL: 9 items
--   Final Occ.     BCBC: 3 items   VBBL: 7 items

select
  s.stage_number,
  s.slug                                      as stage_slug,
  j.slug                                      as jurisdiction,
  sct.title                                   as template_title,
  sct.version,
  count(sci.id)                               as item_count,
  jsonb_agg(
    jsonb_build_object(
      'sort_order',       sci.sort_order,
      'label',            sci.label,
      'is_required',      sci.is_required,
      'legal_reference',  sci.legal_reference
    )
    order by sci.sort_order
  )                                           as items
from public.stage_checklist_templates sct
join public.inspection_stages   s   on s.id   = sct.stage_id
join public.jurisdictions       j   on j.id   = sct.jurisdiction_id
left join public.stage_checklist_items sci on sci.template_id = sct.id
where s.slug in (
  'foundation_formwork_rebar',
  'electrical_rough_in',
  'plumbing_rough_in',
  'final_occupancy_permit'
)
group by s.stage_number, s.slug, j.slug, sct.title, sct.version
order by s.stage_number, j.slug;
