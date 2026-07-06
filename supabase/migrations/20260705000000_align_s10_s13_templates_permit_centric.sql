-- ─────────────────────────────────────────────────────────────────────────────
-- Align S10–S13 System B checklist templates to the permit-centric model
-- Migration: 20260705000000_align_s10_s13_templates_permit_centric.sql
--
-- CONTEXT
--   The stage rows for S10–S13 were renamed to a permit-centric model in
--   20260605000000, but their attached checklist templates still carried the
--   old construction-model content (Building Envelope / Insulation & Vapour
--   Barrier / Drywall & Interior Finish / Life Safety Systems). This produced a
--   title↔content mismatch on the System B reference/preview surfaces
--   (inspector/stages page, JobDetailModal scope preview, resolve-template API).
--   See docs/audit/s10-s13-implementation-preflight.md.
--
-- WHAT THIS DOES (Option A — approved)
--   Reseeds the S10–S13 templates/items to match the live System C permit-centric
--   workflow (src/lib/inspectorCompletion.ts RAW_STAGES S10–S13 containers), for
--   both jurisdictions (bcbc_2024, vbbl_2025).
--
-- SAFETY
--   • Version-bump, non-destructive: inserts version = 2 (is_active = true) and
--     deactivates version = 1. Historical v1 rows are PRESERVED (no DELETE).
--   • Verified safe by read-only counts (all zero) prior to authoring:
--       permit_checklist_responses / permit_stage_statuses / inspection_seals
--       for stages 10–13 = 0; global totals = 0. No in-flight/sealed data exists.
--   • Does NOT touch inspection_stages rows, titles, slugs, or UUIDs (already
--     permit-centric and already equal to the System C runtime names).
--   • Does NOT touch S01–S09 or S14–S15, and does NOT alter any response rows.
--   • Fully idempotent (ON CONFLICT DO UPDATE).
--
-- ROLLBACK
--   Reactivate v1 and deactivate v2:
--     update public.stage_checklist_templates sct set is_active = (sct.version = 1)
--       from public.inspection_stages s
--      where sct.stage_id = s.id and s.stage_number in (10,11,12,13);
--   (Additive only; no rows are removed, so rollback restores prior served content.)
--
-- NOT APPLIED to hosted Supabase by this sprint. Draft for review.
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. NEW CANONICAL TEMPLATES (version = 2, active) — S10–S13 × 2 jurisdictions
-- ═══════════════════════════════════════════════════════════════════════════
-- Joined on the CURRENT (permit-centric) stage slugs set by 20260605000000.

insert into public.stage_checklist_templates
  (stage_id, jurisdiction_id, title, version, is_active, effective_from)
select s.id, j.id, tmpl.title, 2, true, current_date
from (values
  ('electrical_permit_and_scope', 'bcbc_2024', 'Electrical Permit and Scope — BC Building Code 2024'),
  ('electrical_permit_and_scope', 'vbbl_2025', 'Electrical Permit and Scope — Vancouver Building By-law 2025'),
  ('gas_mechanical_hvac_scope',   'bcbc_2024', 'Gas Permit and Mechanical / HVAC Scope — BC Building Code 2024'),
  ('gas_mechanical_hvac_scope',   'vbbl_2025', 'Gas Permit and Mechanical / HVAC Scope — Vancouver Building By-law 2025'),
  ('insulation_energy_compliance','bcbc_2024', 'Insulation and Energy Compliance — BC Building Code 2024'),
  ('insulation_energy_compliance','vbbl_2025', 'Insulation and Energy Compliance — Vancouver Building By-law 2025'),
  ('interior_completion',         'bcbc_2024', 'Interior Completion — BC Building Code 2024'),
  ('interior_completion',         'vbbl_2025', 'Interior Completion — Vancouver Building By-law 2025')
) as tmpl(stage_slug, jurisdiction_slug, title)
join public.inspection_stages s on s.slug = tmpl.stage_slug
join public.jurisdictions     j on j.slug = tmpl.jurisdiction_slug
on conflict (stage_id, jurisdiction_id, version) do update
  set title      = excluded.title,
      is_active  = excluded.is_active,
      updated_at = now();


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. DEACTIVATE OLD v1 TEMPLATES for S10–S13 (preserve rows — no delete)
-- ═══════════════════════════════════════════════════════════════════════════

update public.stage_checklist_templates sct
   set is_active    = false,
       effective_to = current_date,
       updated_at   = now()
  from public.inspection_stages s
 where sct.stage_id     = s.id
   and s.stage_number   in (10, 11, 12, 13)
   and sct.version      = 1;


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. CHECKLIST ITEMS (attach to the new v2 templates)
-- ═══════════════════════════════════════════════════════════════════════════
-- One item per System C container. Shared across bcbc_2024 and vbbl_2025 except
-- the S12 Vancouver Step Code overlay (VBBL only, section 3E).


-- ─── 3A. S10 — ELECTRICAL PERMIT AND SCOPE ──────────────────────────────────
with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'electrical_permit_and_scope'
    and j.slug in ('bcbc_2024', 'vbbl_2025')
    and sct.version = 2
),
items (sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url) as (
  values
  (1, 'Electrical Permit and Service Readiness',
      'Confirm the electrical permit is issued, the service and distribution backbone is installed safely, and the project is ready to advance rough wiring before concealment.',
      true, 'BC Safety Standards Act, SBC 2003, c. 39', 'Technical Safety BC', 'https://www.technicalsafetybc.ca/electrical'),
  (2, 'Branch Circuit Rough-In',
      'Confirm branch-circuit rough wiring and device rough-in are installed, supported, protected, and ready for enclosure.',
      true, 'BC Safety Standards Act, SBC 2003, c. 39', 'Technical Safety BC', 'https://www.technicalsafetybc.ca/electrical'),
  (3, 'Life Safety, Specialty Circuits, and Pre-Test Readiness',
      'Confirm life-safety circuit coordination, specialty circuit provisions, and pre-test readiness are in place before concealment.',
      true, 'BCBC 2024 Division B, Part 9', 'British Columbia Building Code 2024', 'https://www.bccodes.ca/bc-building-code.html'),
  (4, 'Electrical Inspection and Documentation Closeout',
      'Confirm the electrical rough-in has cleared the required Technical Safety BC inspection gate and documentation package before concealment or energization proceeds.',
      true, 'BC Safety Standards Act, SBC 2003, c. 39', 'Technical Safety BC', 'https://www.technicalsafetybc.ca/electrical')
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required, legal_reference, source_title, source_url)
select tmpl.template_id, items.sort_order, items.label, items.requirement_text, 'boolean',
       items.is_required, items.legal_reference, items.source_title, items.source_url
from tmpl cross join items
on conflict (template_id, label) do update
  set sort_order = excluded.sort_order, requirement_text = excluded.requirement_text,
      is_required = excluded.is_required, legal_reference = excluded.legal_reference,
      source_title = excluded.source_title, source_url = excluded.source_url, updated_at = now();


-- ─── 3B. S11 — GAS PERMIT AND MECHANICAL / HVAC SCOPE ───────────────────────
with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'gas_mechanical_hvac_scope'
    and j.slug in ('bcbc_2024', 'vbbl_2025')
    and sct.version = 2
),
items (sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url) as (
  values
  (1, 'Mechanical Permit and Equipment Rough-In',
      'Confirm the mechanical permit is issued, core heating, cooling, and ventilation equipment is installed at correct locations with required clearances, and the project is ready to advance the mechanical scope before concealment.',
      true, 'BCBC 2024 Division B, Part 6', 'British Columbia Building Code 2024', 'https://www.bccodes.ca/bc-building-code.html'),
  (2, 'Gas Piping, Venting, and Combustion',
      'Confirm gas piping, appliance venting, and combustion air provisions are installed, protected, and supported by required documentation before concealment.',
      true, 'BC Safety Standards Act, SBC 2003, c. 39', 'Technical Safety BC', 'https://www.technicalsafetybc.ca/gas'),
  (3, 'Ventilation, Exhaust, Duct Coordination, and Fire Assembly Coordination',
      'Confirm the building ventilation strategy, exhaust systems, duct coordination, and fire-rated assembly penetrations are installed and coordinated before enclosure.',
      true, 'BCBC 2024 Division B, Part 6', 'British Columbia Building Code 2024', 'https://www.bccodes.ca/bc-building-code.html'),
  (4, 'Mechanical and Gas Inspection Closeout',
      'Confirm the mechanical and gas scope has cleared the required Technical Safety BC inspection gates and documentation package before concealment or final closeout proceeds.',
      true, 'BC Safety Standards Act, SBC 2003, c. 39', 'Technical Safety BC', 'https://www.technicalsafetybc.ca/gas')
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required, legal_reference, source_title, source_url)
select tmpl.template_id, items.sort_order, items.label, items.requirement_text, 'boolean',
       items.is_required, items.legal_reference, items.source_title, items.source_url
from tmpl cross join items
on conflict (template_id, label) do update
  set sort_order = excluded.sort_order, requirement_text = excluded.requirement_text,
      is_required = excluded.is_required, legal_reference = excluded.legal_reference,
      source_title = excluded.source_title, source_url = excluded.source_url, updated_at = now();


-- ─── 3C. S12 — INSULATION AND ENERGY COMPLIANCE (shared items 1–4) ──────────
with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'insulation_energy_compliance'
    and j.slug in ('bcbc_2024', 'vbbl_2025')
    and sct.version = 2
),
items (sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url) as (
  values
  (1, 'Thermal Insulation and Continuity',
      'Confirm installed insulation packages, R-values, and thermal continuity match the approved design basis before drywall conceals the thermal envelope.',
      true, 'BCBC 2024 Division B, Part 9, Section 9.36; Part 12, Section 12.2', 'British Columbia Building Code 2024', 'https://www.bccodes.ca/bc-building-code.html'),
  (2, 'Air Barrier, Vapour Control, and Penetrations',
      'Confirm the air barrier strategy is continuous and all penetrations are sealed, and that the vapour control layer is appropriate to the assembly type and applicable code path, before drywall conceals the assembly.',
      true, 'BCBC 2024 Division B, Part 9, Section 9.25; Part 12, Section 12.3', 'British Columbia Building Code 2024', 'https://www.bccodes.ca/bc-building-code.html'),
  (3, 'Energy Documentation and Compliance Path',
      'Confirm the energy compliance path is identified and that documentation, modeling, and testing requirements applicable to the project scope and local authority have been addressed before energy package closeout.',
      true, 'BCBC 2024 Division B, Part 9, Section 9.36; Part 10 — Energy Performance', 'British Columbia Building Code 2024', 'https://www.bccodes.ca/bc-building-code.html'),
  (4, 'Insulation Inspection and Energy Closeout',
      'Confirm the insulation inspection gate is passed and all required energy-compliance documentation has been submitted before the project advances to interior wall and finish work.',
      true, 'BCBC 2024 Division B, Part 9, Section 9.36; Part 10 — Energy Performance', 'British Columbia Building Code 2024', 'https://www.bccodes.ca/bc-building-code.html')
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required, legal_reference, source_title, source_url)
select tmpl.template_id, items.sort_order, items.label, items.requirement_text, 'boolean',
       items.is_required, items.legal_reference, items.source_title, items.source_url
from tmpl cross join items
on conflict (template_id, label) do update
  set sort_order = excluded.sort_order, requirement_text = excluded.requirement_text,
      is_required = excluded.is_required, legal_reference = excluded.legal_reference,
      source_title = excluded.source_title, source_url = excluded.source_url, updated_at = now();

-- ─── 3E. S12 VBBL-ONLY OVERLAY (item 5) — Vancouver mandatory Step Code tier ─
-- The one place VBBL genuinely diverges from the BCBC baseline at this stage.
with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'insulation_energy_compliance'
    and j.slug = 'vbbl_2025'
    and sct.version = 2
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required, legal_reference, source_title, source_url)
select tmpl.template_id, 5, 'Vancouver Mandatory Minimum Step Code Tier',
       'Confirm the project meets the mandatory minimum BC Energy Step Code tier required by the City of Vancouver, with supporting energy documentation and acceptance where applicable.',
       'boolean', true, 'VBBL 2025, Division B, Part 10 — Energy Performance', 'Vancouver Building By-law 2025', null
from tmpl
on conflict (template_id, label) do update
  set sort_order = excluded.sort_order, requirement_text = excluded.requirement_text,
      is_required = excluded.is_required, legal_reference = excluded.legal_reference,
      source_title = excluded.source_title, source_url = excluded.source_url, updated_at = now();


-- ─── 3D. S13 — INTERIOR COMPLETION ──────────────────────────────────────────
with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'interior_completion'
    and j.slug in ('bcbc_2024', 'vbbl_2025')
    and sct.version = 2
),
items (sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url) as (
  values
  (1, 'Fire Separation, Rated Assemblies, and Sound Separation',
      'Confirm fire-rated assemblies, shaft walls, service-chase continuity, firestopping at rated penetrations, and sound separation are in place before interior finishes obscure them.',
      true, 'BCBC 2024, Division B, Part 9', 'British Columbia Building Code 2024', 'https://www.bccodes.ca/bc-building-code.html'),
  (2, 'Interior Wall Substrate, Wet-Area, and Concealed Backing',
      'Confirm interior wall substrate types, moisture-resistant and wet-area board installation, waterproofing preparation, and concealed backing are complete before finish closure obscures them.',
      true, 'BCBC 2024, Division B, Part 9', 'British Columbia Building Code 2024', 'https://www.bccodes.ca/bc-building-code.html'),
  (3, 'Interior Life Safety and Egress Readiness',
      'Confirm interior guards, handrails, egress hardware, fire doors, smoke alarms, CO detectors, and emergency lighting are installed and observable before interior closeout proceeds.',
      true, 'BCBC 2024, Division B, Part 9', 'British Columbia Building Code 2024', 'https://www.bccodes.ca/bc-building-code.html'),
  (4, 'Interior Finishes and Systems Trim',
      'Confirm interior finish components and final building systems trim are complete enough for occupancy readiness.',
      true, 'BCBC 2024, Division B, Part 9', 'British Columbia Building Code 2024', 'https://www.bccodes.ca/bc-building-code.html'),
  (5, 'Accessibility, Adaptable Housing, and Interior Closeout',
      'Confirm accessibility clearances, adaptable housing elements, and interior documentation are complete before progressing to exterior finalization and final occupancy stages.',
      true, 'BCBC 2024, Division B, Part 9', 'British Columbia Building Code 2024', 'https://www.bccodes.ca/bc-building-code.html')
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required, legal_reference, source_title, source_url)
select tmpl.template_id, items.sort_order, items.label, items.requirement_text, 'boolean',
       items.is_required, items.legal_reference, items.source_title, items.source_url
from tmpl cross join items
on conflict (template_id, label) do update
  set sort_order = excluded.sort_order, requirement_text = excluded.requirement_text,
      is_required = excluded.is_required, legal_reference = excluded.legal_reference,
      source_title = excluded.source_title, source_url = excluded.source_url, updated_at = now();


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. VERIFICATION QUERY (run after apply on a review env — not hosted prod)
-- ═══════════════════════════════════════════════════════════════════════════
-- Expected active (version = 2) item counts:
--   S10 electrical      bcbc: 4  vbbl: 4
--   S11 gas/mechanical  bcbc: 4  vbbl: 4
--   S12 insulation      bcbc: 4  vbbl: 5   (VBBL Step Code overlay)
--   S13 interior        bcbc: 5  vbbl: 5
--
-- select s.stage_number, s.title, j.slug, sct.version, sct.is_active, count(sci.id)
-- from public.stage_checklist_templates sct
-- join public.inspection_stages s on s.id = sct.stage_id
-- join public.jurisdictions     j on j.id = sct.jurisdiction_id
-- left join public.stage_checklist_items sci on sci.template_id = sct.id
-- where s.stage_number in (10,11,12,13)
-- group by s.stage_number, s.title, j.slug, sct.version, sct.is_active
-- order by s.stage_number, j.slug, sct.version;
