-- ─────────────────────────────────────────────────────────────────────────────
-- Inspection Stage Seeds
-- Migration: 20260427020000_inspection_stage_seeds.sql
--
-- Seeds 15 inspection stages for BC residential / small-commercial permits.
-- Preserves all 5 existing stage names from the app's mock data:
--   Stage  1 → Site Survey & Excavation        (existing id:1)
--   Stage  3 → Foundation Pour                 (existing id:2)
--   Stage  4 → Framing & Lock-up               (existing id:3)
--   Stage 11 → Insulation & Vapor Barrier       (existing id:4)
--   Stage 15 → Final Occupancy Permit           (existing id:5)
--
-- Required positions:
--   Stage  8 → Electrical Rough-In
--   Stage  9 → Plumbing Rough-In
--   Stage 15 → Final Occupancy Permit (requires_master_seal = true)
--
-- Stage 15 depends on all 14 preceding stages (occupancy requires all trades
-- signed off). Dependencies are inserted via _seed_stage_dependency(), which
-- resolves by slug so no UUIDs are hard-coded.
--
-- All statements are idempotent (ON CONFLICT DO UPDATE / DO NOTHING).
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. HELPER: slug-based dependency seeder
-- ═══════════════════════════════════════════════════════════════════════════
-- Drop-and-recreate so re-runs are safe.

drop function if exists public._seed_stage_dependency(text, text, text);

create function public._seed_stage_dependency(
  p_stage_slug      text,
  p_depends_on_slug text,
  p_reason          text default null
)
returns void
language plpgsql
as $$
declare
  v_stage_id    uuid;
  v_dep_id      uuid;
begin
  select id into v_stage_id
    from public.inspection_stages
   where slug = p_stage_slug;

  if v_stage_id is null then
    raise exception '_seed_stage_dependency: stage slug "%" not found', p_stage_slug;
  end if;

  select id into v_dep_id
    from public.inspection_stages
   where slug = p_depends_on_slug;

  if v_dep_id is null then
    raise exception '_seed_stage_dependency: dependency slug "%" not found', p_depends_on_slug;
  end if;

  insert into public.inspection_stage_dependencies
    (stage_id, depends_on_stage_id, dependency_reason)
  values
    (v_stage_id, v_dep_id, p_reason)
  on conflict (stage_id, depends_on_stage_id) do update
    set dependency_reason = excluded.dependency_reason;
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. SEED INSPECTION STAGES
-- ═══════════════════════════════════════════════════════════════════════════
-- Conflict target: stage_number (unique).
-- slug is also unique; a slug change here triggers an UPDATE, not an error.

insert into public.inspection_stages (
  stage_number,
  slug,
  title,
  phase_number,
  discipline,
  visible_to_specialties,
  requires_master_seal,
  is_active
)
values
  -- ── Phase 1: Excavation & Foundation (stages 1–3) ────────────────────────
  (
    1,
    'site_survey_excavation',
    'Site Survey & Excavation',
    1,
    'geotechnical',
    ARRAY['geotechnical', 'structural'],
    false,
    true
  ),
  (
    2,
    'foundation_formwork_rebar',
    'Foundation Formwork & Rebar',
    1,
    'structural',
    ARRAY['structural', 'geotechnical'],
    false,
    true
  ),
  (
    3,
    'foundation_pour',
    'Foundation Pour',
    1,
    'structural',
    ARRAY['structural', 'geotechnical'],
    false,
    true
  ),

  -- ── Phase 2: Structure (stages 4–5) ──────────────────────────────────────
  (
    4,
    'framing_lockup',
    'Framing & Lock-up',
    2,
    'structural',
    ARRAY['structural'],
    false,
    true
  ),
  (
    5,
    'roof_deck_sheathing',
    'Roof Deck & Sheathing',
    2,
    'structural',
    ARRAY['structural', 'architectural'],
    false,
    true
  ),

  -- ── Phase 3: Mechanical Rough-In (stages 6–9) ────────────────────────────
  (
    6,
    'mechanical_rough_in',
    'Mechanical Rough-In',
    3,
    'mechanical',
    ARRAY['mechanical'],
    false,
    true
  ),
  (
    7,
    'fire_suppression_rough_in',
    'Fire Suppression Rough-In',
    3,
    'fire_protection',
    ARRAY['fire_suppression'],
    false,
    true
  ),
  (
    8,
    'electrical_rough_in',
    'Electrical Rough-In',
    3,
    'electrical',
    ARRAY['electrical'],
    false,
    true
  ),
  (
    9,
    'plumbing_rough_in',
    'Plumbing Rough-In',
    3,
    'plumbing',
    ARRAY['plumbing'],
    false,
    true
  ),

  -- ── Phase 4: Envelope & Insulation (stages 10–11) ────────────────────────
  (
    10,
    'building_envelope',
    'Building Envelope & Weatherproofing',
    4,
    'architectural',
    ARRAY['architectural', 'structural'],
    false,
    true
  ),
  (
    11,
    'insulation_vapor_barrier',
    'Insulation & Vapor Barrier',
    4,
    'architectural',
    ARRAY['architectural'],
    false,
    true
  ),

  -- ── Phase 5: Interior & Life Safety (stages 12–13) ───────────────────────
  (
    12,
    'drywall_interior_finish',
    'Drywall & Interior Finish',
    5,
    'architectural',
    ARRAY['architectural'],
    false,
    true
  ),
  (
    13,
    'life_safety_systems',
    'Life Safety Systems',
    5,
    'fire_protection',
    ARRAY['fire_suppression', 'electrical', 'mechanical'],
    false,
    true
  ),

  -- ── Phase 6: Final (stages 14–15) ────────────────────────────────────────
  (
    14,
    'final_site_grading',
    'Final Site & Grading',
    6,
    'geotechnical',
    ARRAY['geotechnical', 'structural'],
    false,
    true
  ),
  (
    15,
    'final_occupancy_permit',
    'Final Occupancy Permit',
    6,
    null,
    ARRAY[]::text[],   -- master seal: specialty filter does not apply
    true,              -- requires_master_seal
    true
  )

on conflict (stage_number) do update
  set slug                   = excluded.slug,
      title                  = excluded.title,
      phase_number           = excluded.phase_number,
      discipline             = excluded.discipline,
      visible_to_specialties = excluded.visible_to_specialties,
      requires_master_seal   = excluded.requires_master_seal,
      is_active              = excluded.is_active,
      updated_at             = now();


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. SEED STAGE DEPENDENCIES
-- ═══════════════════════════════════════════════════════════════════════════
-- All 14 preceding stages must be sealed before Final Occupancy Permit.
-- Additional intra-phase dependencies reflect construction sequencing:
--   pour cannot happen before formwork; framing follows a sealed foundation;
--   rough-in follows framing; insulation follows rough-in; etc.

-- ── Phase 1: internal sequencing ─────────────────────────────────────────

select public._seed_stage_dependency(
  'foundation_formwork_rebar', 'site_survey_excavation',
  'Soil bearing and excavation depth must be verified before setting formwork'
);

select public._seed_stage_dependency(
  'foundation_pour', 'foundation_formwork_rebar',
  'Formwork, rebar, and embedded hardware must be inspected before concrete pour'
);

-- ── Phase 2: structure follows sealed foundation ─────────────────────────

select public._seed_stage_dependency(
  'framing_lockup', 'foundation_pour',
  'Foundation must be poured and cured before framing begins'
);

select public._seed_stage_dependency(
  'roof_deck_sheathing', 'framing_lockup',
  'Structural framing must be inspected before sheathing conceals it'
);

-- ── Phase 3: rough-in follows framing ────────────────────────────────────

select public._seed_stage_dependency(
  'mechanical_rough_in', 'framing_lockup',
  'Mechanical rough-in runs inside framed cavities'
);

select public._seed_stage_dependency(
  'fire_suppression_rough_in', 'framing_lockup',
  'Sprinkler and suppression piping is installed inside framing'
);

select public._seed_stage_dependency(
  'electrical_rough_in', 'framing_lockup',
  'Electrical rough-in wiring runs inside framed cavities'
);

select public._seed_stage_dependency(
  'plumbing_rough_in', 'framing_lockup',
  'Plumbing rough-in pipes run inside framed cavities'
);

-- ── Phase 4: envelope follows structure; insulation follows all rough-in ──

select public._seed_stage_dependency(
  'building_envelope', 'roof_deck_sheathing',
  'Weatherproofing requires sheathing to be complete'
);

select public._seed_stage_dependency(
  'insulation_vapor_barrier', 'mechanical_rough_in',
  'Insulation covers mechanical rough-in — must be inspected first'
);

select public._seed_stage_dependency(
  'insulation_vapor_barrier', 'electrical_rough_in',
  'Insulation covers electrical rough-in — must be inspected first'
);

select public._seed_stage_dependency(
  'insulation_vapor_barrier', 'plumbing_rough_in',
  'Insulation covers plumbing rough-in — must be inspected first'
);

select public._seed_stage_dependency(
  'insulation_vapor_barrier', 'fire_suppression_rough_in',
  'Insulation covers suppression piping — must be inspected first'
);

-- ── Phase 5: interior follows insulation; life safety follows interior ────

select public._seed_stage_dependency(
  'drywall_interior_finish', 'insulation_vapor_barrier',
  'Drywall conceals insulation — vapor barrier must be approved first'
);

select public._seed_stage_dependency(
  'drywall_interior_finish', 'building_envelope',
  'Interior finishes require a weathertight envelope to prevent moisture damage'
);

select public._seed_stage_dependency(
  'life_safety_systems', 'drywall_interior_finish',
  'Life safety device placement and wiring must be confirmed after finishing'
);

-- ── Phase 6: final grading follows structure ──────────────────────────────

select public._seed_stage_dependency(
  'final_site_grading', 'foundation_pour',
  'Final grading must slope away from the sealed foundation'
);

-- ── Stage 15: Final Occupancy Permit depends on all 14 prior stages ───────

select public._seed_stage_dependency(
  'final_occupancy_permit', 'site_survey_excavation',
  'Site conditions and legal boundaries confirmed'
);

select public._seed_stage_dependency(
  'final_occupancy_permit', 'foundation_formwork_rebar',
  'Foundation reinforcement verified'
);

select public._seed_stage_dependency(
  'final_occupancy_permit', 'foundation_pour',
  'Foundation concrete approved'
);

select public._seed_stage_dependency(
  'final_occupancy_permit', 'framing_lockup',
  'Structural framing sealed'
);

select public._seed_stage_dependency(
  'final_occupancy_permit', 'roof_deck_sheathing',
  'Roof deck and sheathing sealed'
);

select public._seed_stage_dependency(
  'final_occupancy_permit', 'mechanical_rough_in',
  'Mechanical rough-in sealed'
);

select public._seed_stage_dependency(
  'final_occupancy_permit', 'fire_suppression_rough_in',
  'Fire suppression rough-in sealed'
);

select public._seed_stage_dependency(
  'final_occupancy_permit', 'electrical_rough_in',
  'Electrical rough-in sealed — required for occupancy'
);

select public._seed_stage_dependency(
  'final_occupancy_permit', 'plumbing_rough_in',
  'Plumbing rough-in sealed — required for occupancy'
);

select public._seed_stage_dependency(
  'final_occupancy_permit', 'building_envelope',
  'Building envelope sealed'
);

select public._seed_stage_dependency(
  'final_occupancy_permit', 'insulation_vapor_barrier',
  'Insulation and vapor barrier sealed'
);

select public._seed_stage_dependency(
  'final_occupancy_permit', 'drywall_interior_finish',
  'Interior finish sealed'
);

select public._seed_stage_dependency(
  'final_occupancy_permit', 'life_safety_systems',
  'Life safety systems commissioned and sealed'
);

select public._seed_stage_dependency(
  'final_occupancy_permit', 'final_site_grading',
  'Final site grading sealed'
);


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. VERIFICATION QUERY
-- ═══════════════════════════════════════════════════════════════════════════
-- Shows every stage with its specialty visibility and all dependencies.
-- Run this after applying the migration to confirm the seed is correct.

select
  s.stage_number,
  s.slug,
  s.title,
  s.phase_number,
  s.visible_to_specialties,
  s.requires_master_seal,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'depends_on_stage', dep_s.stage_number,
          'slug',             dep_s.slug,
          'title',            dep_s.title
        )
        order by dep_s.stage_number
      )
      from public.inspection_stage_dependencies d
      join public.inspection_stages dep_s on dep_s.id = d.depends_on_stage_id
      where d.stage_id = s.id
    ),
    '[]'::jsonb
  ) as dependencies
from public.inspection_stages s
where s.is_active = true
order by s.stage_number;
