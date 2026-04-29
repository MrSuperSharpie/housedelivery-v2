-- ─────────────────────────────────────────────────────────────────────────────
-- Checklist Templates — Remaining 11 Stages
-- Migration: 20260428010000_checklist_remaining_stages.sql
--
-- Seeds bcbc_2024 and vbbl_2025 templates for stages that have no template:
--   1  site_survey_excavation
--   3  foundation_pour
--   4  framing_lockup
--   5  roof_deck_sheathing
--   6  mechanical_rough_in
--   7  fire_suppression_rough_in
--  10  building_envelope
--  11  insulation_vapor_barrier
--  12  drywall_interior_finish
--  13  life_safety_systems
--  14  final_site_grading
--
-- All statements are idempotent (ON CONFLICT DO UPDATE / DO NOTHING).
-- Jurisdictions bcbc_2024 and vbbl_2025 are assumed to already exist from
-- 20260427030000_checklist_template_seeds.sql.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. TEMPLATES (11 stages × 2 jurisdictions = 22 rows)
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
  ('site_survey_excavation',    'bcbc_2024', 'Site Survey & Excavation — BC Building Code 2024'),
  ('site_survey_excavation',    'vbbl_2025', 'Site Survey & Excavation — Vancouver Building By-law 2025'),
  ('foundation_pour',           'bcbc_2024', 'Foundation Pour — BC Building Code 2024'),
  ('foundation_pour',           'vbbl_2025', 'Foundation Pour — Vancouver Building By-law 2025'),
  ('framing_lockup',            'bcbc_2024', 'Framing & Lockup — BC Building Code 2024'),
  ('framing_lockup',            'vbbl_2025', 'Framing & Lockup — Vancouver Building By-law 2025'),
  ('roof_deck_sheathing',       'bcbc_2024', 'Roof Deck & Sheathing — BC Building Code 2024'),
  ('roof_deck_sheathing',       'vbbl_2025', 'Roof Deck & Sheathing — Vancouver Building By-law 2025'),
  ('mechanical_rough_in',       'bcbc_2024', 'Mechanical Rough-In — BC Building Code 2024'),
  ('mechanical_rough_in',       'vbbl_2025', 'Mechanical Rough-In — Vancouver Building By-law 2025'),
  ('fire_suppression_rough_in', 'bcbc_2024', 'Fire Suppression Rough-In — BC Building Code 2024'),
  ('fire_suppression_rough_in', 'vbbl_2025', 'Fire Suppression Rough-In — Vancouver Building By-law 2025'),
  ('building_envelope',         'bcbc_2024', 'Building Envelope — BC Building Code 2024'),
  ('building_envelope',         'vbbl_2025', 'Building Envelope — Vancouver Building By-law 2025'),
  ('insulation_vapor_barrier',  'bcbc_2024', 'Insulation & Vapour Barrier — BC Building Code 2024'),
  ('insulation_vapor_barrier',  'vbbl_2025', 'Insulation & Vapour Barrier — Vancouver Building By-law 2025'),
  ('drywall_interior_finish',   'bcbc_2024', 'Drywall & Interior Finish — BC Building Code 2024'),
  ('drywall_interior_finish',   'vbbl_2025', 'Drywall & Interior Finish — Vancouver Building By-law 2025'),
  ('life_safety_systems',       'bcbc_2024', 'Life Safety Systems — BC Building Code 2024'),
  ('life_safety_systems',       'vbbl_2025', 'Life Safety Systems — Vancouver Building By-law 2025'),
  ('final_site_grading',        'bcbc_2024', 'Final Site Grading — BC Building Code 2024'),
  ('final_site_grading',        'vbbl_2025', 'Final Site Grading — Vancouver Building By-law 2025')
) as tmpl(stage_slug, jurisdiction_slug, title)
join public.inspection_stages s on s.slug = tmpl.stage_slug
join public.jurisdictions     j on j.slug = tmpl.jurisdiction_slug
on conflict (stage_id, jurisdiction_id, version) do update
  set title     = excluded.title,
      is_active = excluded.is_active,
      updated_at = now();


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. CHECKLIST ITEMS
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── STAGE 1: SITE SURVEY & EXCAVATION ──────────────────────────────────────

with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'site_survey_excavation'
    and j.slug in ('bcbc_2024', 'vbbl_2025')
    and sct.version = 1
),
items (sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url) as (
  values
  (
    1,
    'Survey pins and property setbacks verified',
    'Confirm survey pins are in place and building location complies with required property setbacks per approved site plan.',
    true,
    'BCBC 2024 Part 8 / municipal zoning setback requirements',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    2,
    'Excavation dimensions match structural drawings',
    'Confirm excavation depth, width, and extent match the approved structural and site drawings.',
    true,
    'BCBC 2024 Schedule B, Geotechnical Permanent 8.1',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    3,
    'Underground utilities located and protected',
    'Confirm all underground utilities have been located and are adequately protected from excavation damage.',
    true,
    'BC One Call / municipal utility locate requirements',
    'BC One Call',
    'https://www.bconecall.bc.ca'
  ),
  (
    4,
    'Temporary erosion and sediment control in place',
    'Confirm silt fencing, rock check dams, or equivalent temporary erosion and sediment control measures are installed and functional.',
    true,
    'BCBC 2024 Part 8 / municipal stormwater requirements',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    5,
    'Soil conditions consistent with geotechnical report',
    'Confirm exposed subgrade soil conditions are consistent with the geotechnical engineer''s report; no unexpected soft spots, fill, or groundwater.',
    true,
    'BCBC 2024 Schedule B, Geotechnical Permanent 8.1',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    6,
    'Excavation shoring and worker safety measures',
    'Confirm excavation shoring, benching, or sloping complies with WorkSafeBC regulations for worker safety.',
    true,
    'WorkSafeBC OHS Regulation Part 20',
    'WorkSafeBC — Occupational Health and Safety Regulation',
    'https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-20-construction-excavation-and-demolition'
  )
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required,
   legal_reference, source_title, source_url)
select
  tmpl.template_id, items.sort_order, items.label, items.requirement_text,
  'boolean', items.is_required, items.legal_reference, items.source_title, items.source_url
from tmpl cross join items
on conflict (template_id, label) do update
  set sort_order       = excluded.sort_order,
      requirement_text = excluded.requirement_text,
      is_required      = excluded.is_required,
      legal_reference  = excluded.legal_reference,
      source_title     = excluded.source_title,
      source_url       = excluded.source_url,
      updated_at       = now();


-- ─── STAGE 3: FOUNDATION POUR ────────────────────────────────────────────────

with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'foundation_pour'
    and j.slug in ('bcbc_2024', 'vbbl_2025')
    and sct.version = 1
),
items (sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url) as (
  values
  (
    1,
    'Concrete mix design and compressive strength confirmed',
    'Confirm concrete mix design meets specified compressive strength and that cylinder test reports are on file.',
    true,
    'BCBC 2024 Schedule B, Structural 2.1',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    2,
    'Foundation dimensions match structural drawings',
    'Confirm formed and poured foundation dimensions (width, depth, wall thickness) match approved structural drawings.',
    true,
    'BCBC 2024 Schedule B, Structural 2.1',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    3,
    'Anchor bolts, hold-downs, and embedded hardware correct',
    'Confirm anchor bolt size, spacing, embedment depth, hold-down hardware, and any embedded plates match structural drawings.',
    true,
    'BCBC 2024 Schedule B, Structural 2.1',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    4,
    'Drainage sleeves and utility penetrations in place',
    'Confirm all drainage sleeves, conduit sleeves, and utility penetrations are correctly placed before pour.',
    true,
    'BCBC 2024 Schedule B, Plumbing 4.2',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    5,
    'Damp-proofing or waterproofing applied',
    'Confirm damp-proofing or waterproofing membrane is applied to exterior of foundation walls below grade as required.',
    true,
    'BCBC 2024 Schedule B, Architectural 1.17',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    6,
    'Curing and cold-weather protection measures',
    'Confirm adequate concrete curing measures are in place; cold-weather protection applied if ambient temperature is below 5°C.',
    true,
    'BCBC 2024 Schedule B, Structural 2.1 / CSA A23.1',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  )
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required,
   legal_reference, source_title, source_url)
select
  tmpl.template_id, items.sort_order, items.label, items.requirement_text,
  'boolean', items.is_required, items.legal_reference, items.source_title, items.source_url
from tmpl cross join items
on conflict (template_id, label) do update
  set sort_order       = excluded.sort_order,
      requirement_text = excluded.requirement_text,
      is_required      = excluded.is_required,
      legal_reference  = excluded.legal_reference,
      source_title     = excluded.source_title,
      source_url       = excluded.source_url,
      updated_at       = now();


-- ─── STAGE 4: FRAMING & LOCKUP ───────────────────────────────────────────────

with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'framing_lockup'
    and j.slug in ('bcbc_2024', 'vbbl_2025')
    and sct.version = 1
),
items (sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url) as (
  values
  (
    1,
    'Structural framing matches approved drawings',
    'Confirm stud size, spacing, header and beam sizes, joist spans, and rafter spans match approved structural drawings.',
    true,
    'BCBC 2024 Schedule B, Structural 2.1',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    2,
    'Shear wall nailing, hold-downs, and straps',
    'Confirm shear wall sheathing nailing pattern, hold-down hardware, and strap connections match lateral design drawings.',
    true,
    'BCBC 2024 Schedule B, Structural 2.1',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    3,
    'Fire blocking and draft stopping installed',
    'Confirm fire blocking is installed at all concealed stud spaces at floor/ceiling intersections, stairs, and changes of direction; draft stopping in attic spaces.',
    true,
    'BCBC 2024 Part 3 / Part 9 — Fire blocking requirements',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    4,
    'Structural shop drawings reviewed',
    'Confirm review of applicable structural shop drawings including engineered wood products and custom connectors.',
    true,
    'BCBC 2024 Schedule B, Structural 2.3',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    5,
    'Weather-resistant barrier installed',
    'Confirm building wrap or equivalent weather-resistant barrier is installed with correct lapping, taping, and integration with window/door flanges.',
    true,
    'BCBC 2024 Part 5 — Dampproofing, Waterproofing and Water Management',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    6,
    'Windows and exterior doors installed and flashed',
    'Confirm windows and exterior doors are installed, plumb, and correctly flashed at head, jambs, and sill per manufacturer requirements.',
    true,
    'BCBC 2024 Schedule B, Architectural 1.1',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    7,
    'Roof structure and bracing complete',
    'Confirm roof rafter or truss layout, bracing, and ridge connections are complete and match structural drawings.',
    true,
    'BCBC 2024 Schedule B, Structural 2.1',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  )
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required,
   legal_reference, source_title, source_url)
select
  tmpl.template_id, items.sort_order, items.label, items.requirement_text,
  'boolean', items.is_required, items.legal_reference, items.source_title, items.source_url
from tmpl cross join items
on conflict (template_id, label) do update
  set sort_order       = excluded.sort_order,
      requirement_text = excluded.requirement_text,
      is_required      = excluded.is_required,
      legal_reference  = excluded.legal_reference,
      source_title     = excluded.source_title,
      source_url       = excluded.source_url,
      updated_at       = now();


-- ─── STAGE 5: ROOF DECK & SHEATHING ─────────────────────────────────────────

with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'roof_deck_sheathing'
    and j.slug in ('bcbc_2024', 'vbbl_2025')
    and sct.version = 1
),
items (sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url) as (
  values
  (
    1,
    'Roof sheathing grade and nailing pattern',
    'Confirm roof sheathing panel grade and nailing pattern (size, spacing at field and edges) match structural drawings.',
    true,
    'BCBC 2024 Schedule B, Structural 2.1',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    2,
    'Roof slope and drainage direction correct',
    'Confirm roof slope meets minimum requirements (typically 1:6 for shingles) and drains correctly to eaves or interior drains.',
    true,
    'BCBC 2024 Part 5 / Part 9 — Roof drainage',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    3,
    'Ice and water shield at eaves and valleys',
    'Confirm self-adhering ice and water shield membrane is installed at eaves (minimum 900mm past interior wall face) and in all valleys.',
    true,
    'BCBC 2024 Part 5 / Part 9 — Roofing',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    4,
    'Roofing underlayment installed',
    'Confirm roofing underlayment is installed over the full deck surface with correct lapping before finish roofing.',
    true,
    'BCBC 2024 Part 5 / Part 9 — Roofing',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    5,
    'Attic ventilation provisions installed',
    'Confirm attic ventilation ratio meets requirements (minimum 1:300 of attic floor area) with inlet at eaves and outlet at ridge or high on roof.',
    true,
    'BCBC 2024 Part 9 — Attic and Roof Space Ventilation',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    6,
    'Roof penetration and skylight flashings',
    'Confirm all roof penetrations (plumbing stacks, mechanical vents, skylights) are correctly flashed and counter-flashed.',
    true,
    'BCBC 2024 Part 5 / Part 9 — Flashings',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  )
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required,
   legal_reference, source_title, source_url)
select
  tmpl.template_id, items.sort_order, items.label, items.requirement_text,
  'boolean', items.is_required, items.legal_reference, items.source_title, items.source_url
from tmpl cross join items
on conflict (template_id, label) do update
  set sort_order       = excluded.sort_order,
      requirement_text = excluded.requirement_text,
      is_required      = excluded.is_required,
      legal_reference  = excluded.legal_reference,
      source_title     = excluded.source_title,
      source_url       = excluded.source_url,
      updated_at       = now();


-- ─── STAGE 6: MECHANICAL ROUGH-IN ────────────────────────────────────────────

with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'mechanical_rough_in'
    and j.slug in ('bcbc_2024', 'vbbl_2025')
    and sct.version = 1
),
items (sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url) as (
  values
  (
    1,
    'Mechanical systems match approved permit scope',
    'Confirm HVAC equipment, ductwork, and controls match the approved mechanical permit scope.',
    true,
    'BCBC 2024 Schedule B, Mechanical 5.1',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    2,
    'Gas line pressure test completed and documented',
    'Confirm gas piping pressure test has been completed, witnessed, and documented to the satisfaction of the authority having jurisdiction.',
    true,
    'BCBC 2024 Schedule B, Mechanical 5.2 / CSA B149.1',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    3,
    'Combustion air and venting requirements met',
    'Confirm combustion air supply and flue venting for all fuel-burning appliances meet code requirements and are correctly routed.',
    true,
    'BCBC 2024 Schedule B, Mechanical 5.3',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    4,
    'Fire dampers at rated assemblies',
    'Confirm fire dampers are installed where HVAC ducts penetrate fire-rated floor/ceiling or wall assemblies.',
    true,
    'BCBC 2024 Schedule B, Mechanical 5.4',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    5,
    'Duct support, clearances, and fire separation continuity',
    'Confirm duct hangers and supports are correct, clearances to combustibles are maintained, and fire separation continuity is preserved at penetrations.',
    true,
    'BCBC 2024 Schedule B, Mechanical 5.5',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    6,
    'Exhaust fan ducting to exterior',
    'Confirm all exhaust fan ducting (kitchen, bathrooms, dryers) terminates to exterior with approved termination cap and backdraft damper.',
    true,
    'BCBC 2024 Part 9 — Ventilation',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    7,
    'Mechanical shop drawings reviewed',
    'Confirm review of applicable mechanical shop drawings including custom equipment and controls.',
    true,
    'BCBC 2024 Schedule B, Mechanical 5.6',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  )
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required,
   legal_reference, source_title, source_url)
select
  tmpl.template_id, items.sort_order, items.label, items.requirement_text,
  'boolean', items.is_required, items.legal_reference, items.source_title, items.source_url
from tmpl cross join items
on conflict (template_id, label) do update
  set sort_order       = excluded.sort_order,
      requirement_text = excluded.requirement_text,
      is_required      = excluded.is_required,
      legal_reference  = excluded.legal_reference,
      source_title     = excluded.source_title,
      source_url       = excluded.source_url,
      updated_at       = now();


-- ─── STAGE 7: FIRE SUPPRESSION ROUGH-IN ──────────────────────────────────────

with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'fire_suppression_rough_in'
    and j.slug in ('bcbc_2024', 'vbbl_2025')
    and sct.version = 1
),
items (sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url) as (
  values
  (
    1,
    'Sprinkler system matches approved hydraulic calculations',
    'Confirm sprinkler pipe sizing, head layout, and system design match the approved hydraulic calculations.',
    true,
    'BCBC 2024 Part 3 / NFPA 13 — Sprinkler Systems',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    2,
    'Pipe supports and hangers correct',
    'Confirm sprinkler pipe hangers, supports, and sway bracing are installed per NFPA 13 and match the approved drawings.',
    true,
    'BCBC 2024 Part 3 / NFPA 13',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    3,
    'Sprinkler head placement and coverage',
    'Confirm sprinkler head spacing, type, and orientation meet coverage requirements for the hazard classification.',
    true,
    'BCBC 2024 Part 3 / NFPA 13',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    4,
    'Concealed areas inspected before enclosure',
    'Confirm sprinkler piping in concealed spaces has been inspected and approved before wall or ceiling surfaces are installed.',
    true,
    'BCBC 2024 Part 3 / NFPA 13',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    5,
    'Water supply connection and backflow preventer',
    'Confirm water supply connection size and backflow preventer are correctly installed at the sprinkler system inlet.',
    true,
    'BCBC 2024 Part 3 / NFPA 13 / BC Plumbing Code',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    6,
    'System pressure test completed and documented',
    'Confirm hydrostatic pressure test has been completed at 200 psi (or 50 psi above system working pressure) for two hours, with results documented.',
    true,
    'BCBC 2024 Part 3 / NFPA 13 Section 24.2',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  )
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required,
   legal_reference, source_title, source_url)
select
  tmpl.template_id, items.sort_order, items.label, items.requirement_text,
  'boolean', items.is_required, items.legal_reference, items.source_title, items.source_url
from tmpl cross join items
on conflict (template_id, label) do update
  set sort_order       = excluded.sort_order,
      requirement_text = excluded.requirement_text,
      is_required      = excluded.is_required,
      legal_reference  = excluded.legal_reference,
      source_title     = excluded.source_title,
      source_url       = excluded.source_url,
      updated_at       = now();


-- ─── STAGE 10: BUILDING ENVELOPE ─────────────────────────────────────────────

with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'building_envelope'
    and j.slug in ('bcbc_2024', 'vbbl_2025')
    and sct.version = 1
),
items (sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url) as (
  values
  (
    1,
    'Building enclosure design and performance confirmed',
    'Confirm building enclosure design, materials, and performance criteria have been reviewed and comply with the approved drawings.',
    true,
    'BCBC 2024 Schedule B, Architectural 1.1',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    2,
    'Weather-resistant barrier continuity at penetrations',
    'Confirm weather-resistant barrier is continuous at all penetrations, window/door rough openings, and transitions between cladding systems.',
    true,
    'BCBC 2024 Schedule B, Architectural 1.2',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    3,
    'Cladding drainage plane and ventilation gap',
    'Confirm exterior cladding has a functional drainage plane and ventilation gap (rainscreen) where required by the enclosure design.',
    true,
    'BCBC 2024 Schedule B, Architectural 1.3',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    4,
    'Glazing systems and curtain wall performance',
    'Confirm glazing system or curtain wall installation matches approved specifications; thermal performance requirements met.',
    true,
    'BCBC 2024 Schedule B, Architectural 1.4',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    5,
    'Air barrier continuity confirmed',
    'Confirm air barrier is continuous across all six faces of the building envelope with properly sealed transitions and penetrations.',
    true,
    'BCBC 2024 Schedule B, Architectural 1.5 / Part 5',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    6,
    'Building enclosure shop drawings reviewed',
    'Confirm review of applicable building enclosure shop drawings including window systems, curtain wall, and specialty cladding.',
    true,
    'BCBC 2024 Schedule B, Architectural 1.6',
    'BC Building Code 2024 — Schedule B Letters of Assurance',
    'https://www.bccodes.ca/bc-building-code.html'
  )
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required,
   legal_reference, source_title, source_url)
select
  tmpl.template_id, items.sort_order, items.label, items.requirement_text,
  'boolean', items.is_required, items.legal_reference, items.source_title, items.source_url
from tmpl cross join items
on conflict (template_id, label) do update
  set sort_order       = excluded.sort_order,
      requirement_text = excluded.requirement_text,
      is_required      = excluded.is_required,
      legal_reference  = excluded.legal_reference,
      source_title     = excluded.source_title,
      source_url       = excluded.source_url,
      updated_at       = now();


-- ─── STAGE 11: INSULATION & VAPOUR BARRIER ───────────────────────────────────

with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'insulation_vapor_barrier'
    and j.slug in ('bcbc_2024', 'vbbl_2025')
    and sct.version = 1
),
items (sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url) as (
  values
  (
    1,
    'Insulation R-values meet energy code requirements',
    'Confirm insulation R-values in walls, ceilings, and floors meet or exceed BCBC Part 10 / Step Code energy requirements for the climate zone.',
    true,
    'BCBC 2024 Part 10 — Energy and Water Efficiency / BC Energy Step Code',
    'BC Building Code 2024 — Part 10',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    2,
    'Vapour barrier continuity (6 mil poly or equivalent)',
    'Confirm vapour barrier (minimum 6 mil polyethylene or approved equivalent) is installed on the warm side of insulation with sealed laps and penetrations.',
    true,
    'BCBC 2024 Part 9 — Vapour Barriers / Part 5',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    3,
    'Air sealing at electrical boxes and penetrations',
    'Confirm electrical boxes, plumbing penetrations, and all other vapour barrier penetrations are air-sealed with approved sealant or gaskets.',
    true,
    'BCBC 2024 Part 9 — Air Barriers',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    4,
    'Attic insulation baffles installed',
    'Confirm attic ventilation baffles are installed at eaves to maintain minimum 63mm clear airway above insulation.',
    true,
    'BCBC 2024 Part 9 — Attic and Roof Space Ventilation',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    5,
    'Rim joist insulation and air sealing',
    'Confirm rim joists are insulated and air-sealed to prevent thermal bridging and convective heat loss at floor perimeters.',
    true,
    'BCBC 2024 Part 9 / BC Energy Step Code',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    6,
    'Thermal bridging at intersecting assemblies addressed',
    'Confirm thermal bridging is addressed at all structural penetrations, corners, and intersections between insulated assemblies.',
    true,
    'BCBC 2024 Part 10 / BC Energy Step Code',
    'BC Building Code 2024 — Part 10',
    'https://www.bccodes.ca/bc-building-code.html'
  )
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required,
   legal_reference, source_title, source_url)
select
  tmpl.template_id, items.sort_order, items.label, items.requirement_text,
  'boolean', items.is_required, items.legal_reference, items.source_title, items.source_url
from tmpl cross join items
on conflict (template_id, label) do update
  set sort_order       = excluded.sort_order,
      requirement_text = excluded.requirement_text,
      is_required      = excluded.is_required,
      legal_reference  = excluded.legal_reference,
      source_title     = excluded.source_title,
      source_url       = excluded.source_url,
      updated_at       = now();


-- ─── STAGE 12: DRYWALL & INTERIOR FINISH ─────────────────────────────────────

with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'drywall_interior_finish'
    and j.slug in ('bcbc_2024', 'vbbl_2025')
    and sct.version = 1
),
items (sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url) as (
  values
  (
    1,
    'Fire-rated assemblies correctly constructed',
    'Confirm fire-rated wall and floor/ceiling assemblies are constructed with correct ULC-listed board type, thickness, fastener pattern, and number of layers.',
    true,
    'BCBC 2024 Part 3 / Part 9 — Fire Resistance Ratings',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    2,
    'Fire-rated penetration firestopping',
    'Confirm all penetrations through fire-rated assemblies (plumbing, electrical, mechanical) are firestopped with ULC-listed systems matching the assembly rating.',
    true,
    'BCBC 2024 Part 3 — Penetrations in Fire Separations',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    3,
    'Suite-to-suite sound insulation',
    'Confirm sound insulation (minimum STC 50) is installed in party walls and floor/ceiling assemblies between dwelling units.',
    true,
    'BCBC 2024 Part 9 — Sound Transmission',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    4,
    'Shaft wall and service chase construction',
    'Confirm shaft walls enclosing elevator hoistways, mechanical shafts, and service chases are built to the required fire resistance rating.',
    true,
    'BCBC 2024 Part 3 — Vertical Openings and Shafts',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    5,
    'Stairwell and corridor fire separation continuity',
    'Confirm fire separation continuity at stairwells and exit corridors including at ceiling/floor junctions and at concealed spaces.',
    true,
    'BCBC 2024 Part 3 — Means of Egress',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  )
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required,
   legal_reference, source_title, source_url)
select
  tmpl.template_id, items.sort_order, items.label, items.requirement_text,
  'boolean', items.is_required, items.legal_reference, items.source_title, items.source_url
from tmpl cross join items
on conflict (template_id, label) do update
  set sort_order       = excluded.sort_order,
      requirement_text = excluded.requirement_text,
      is_required      = excluded.is_required,
      legal_reference  = excluded.legal_reference,
      source_title     = excluded.source_title,
      source_url       = excluded.source_url,
      updated_at       = now();


-- ─── STAGE 13: LIFE SAFETY SYSTEMS ───────────────────────────────────────────

with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'life_safety_systems'
    and j.slug in ('bcbc_2024', 'vbbl_2025')
    and sct.version = 1
),
items (sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url) as (
  values
  (
    1,
    'Fire alarm system functional test completed',
    'Confirm fire alarm system has been functionally tested to ULC-S537 by a qualified technician and test report is on file.',
    true,
    'BCBC 2024 Part 3 / ULC-S537 — Fire Alarm Systems',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    2,
    'Smoke and CO detector placement',
    'Confirm smoke alarms are installed on every floor, outside sleeping areas, and inside bedrooms; CO alarms installed adjacent to sleeping areas where required.',
    true,
    'BCBC 2024 Part 9 — Smoke and CO Alarms',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    3,
    'Emergency lighting and exit signs functional',
    'Confirm emergency lighting provides minimum 10 lux at floor level on egress paths; exit signs are illuminated and visible from required distances.',
    true,
    'BCBC 2024 Part 3 — Emergency Lighting and Exit Signs',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    4,
    'Sprinkler system final acceptance test',
    'Confirm sprinkler system final acceptance test has been completed per NFPA 13 including main drain test and inspector test flow.',
    true,
    'BCBC 2024 Part 3 / NFPA 13',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    5,
    'Means of egress complete and unobstructed',
    'Confirm all exit doors, corridors, and stairwells meet required widths, door swing, hardware, and are clear of obstructions.',
    true,
    'BCBC 2024 Part 3 — Means of Egress',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    6,
    'Building civic address visible from street',
    'Confirm civic address numbers are installed and clearly visible from the street and from the direction of emergency vehicle approach.',
    true,
    'BCBC 2024 Part 3 / municipal addressing bylaw',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  )
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required,
   legal_reference, source_title, source_url)
select
  tmpl.template_id, items.sort_order, items.label, items.requirement_text,
  'boolean', items.is_required, items.legal_reference, items.source_title, items.source_url
from tmpl cross join items
on conflict (template_id, label) do update
  set sort_order       = excluded.sort_order,
      requirement_text = excluded.requirement_text,
      is_required      = excluded.is_required,
      legal_reference  = excluded.legal_reference,
      source_title     = excluded.source_title,
      source_url       = excluded.source_url,
      updated_at       = now();


-- ─── STAGE 14: FINAL SITE GRADING ────────────────────────────────────────────

with tmpl as (
  select sct.id as template_id
  from public.stage_checklist_templates sct
  join public.inspection_stages s on s.id = sct.stage_id
  join public.jurisdictions     j on j.id = sct.jurisdiction_id
  where s.slug = 'final_site_grading'
    and j.slug in ('bcbc_2024', 'vbbl_2025')
    and sct.version = 1
),
items (sort_order, label, requirement_text, is_required, legal_reference, source_title, source_url) as (
  values
  (
    1,
    'Grade slopes away from foundation',
    'Confirm finished grade slopes away from the building at minimum 2% (1:50) for at least 1.5m from the foundation wall on all sides.',
    true,
    'BCBC 2024 Part 9 — Site Drainage',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    2,
    'Swales and drainage channels functional',
    'Confirm surface swales and drainage channels are graded and positioned to direct stormwater away from the building and to the approved discharge point.',
    true,
    'BCBC 2024 Part 9 — Site Drainage / municipal stormwater requirements',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    3,
    'Paved surfaces sloped to drain',
    'Confirm driveways, walkways, and paved areas are sloped at minimum 1% to drain away from the building and toward catch basins or curbs.',
    true,
    'BCBC 2024 Part 9 — Site Drainage',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    4,
    'Retaining walls permitted and inspected',
    'Confirm any retaining walls over 1.0m in height have been permitted, engineered, and inspected.',
    true,
    'BCBC 2024 Part 4 / Part 9 — Retaining Walls',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    5,
    'Stormwater management compliant with municipal requirements',
    'Confirm stormwater management measures (infiltration, detention, or connection to municipal storm) comply with municipal requirements and the approved site servicing design.',
    true,
    'Municipal stormwater management requirements / BCBC 2024 Part 9',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  ),
  (
    6,
    'Erosion and sediment controls removed or stabilized',
    'Confirm temporary erosion and sediment controls have been removed and disturbed areas are stabilized with vegetation, mulch, or hard landscaping.',
    true,
    'BCBC 2024 Part 9 / municipal stormwater requirements',
    'BC Building Code 2024',
    'https://www.bccodes.ca/bc-building-code.html'
  )
)
insert into public.stage_checklist_items
  (template_id, sort_order, label, requirement_text, item_type, is_required,
   legal_reference, source_title, source_url)
select
  tmpl.template_id, items.sort_order, items.label, items.requirement_text,
  'boolean', items.is_required, items.legal_reference, items.source_title, items.source_url
from tmpl cross join items
on conflict (template_id, label) do update
  set sort_order       = excluded.sort_order,
      requirement_text = excluded.requirement_text,
      is_required      = excluded.is_required,
      legal_reference  = excluded.legal_reference,
      source_title     = excluded.source_title,
      source_url       = excluded.source_url,
      updated_at       = now();
