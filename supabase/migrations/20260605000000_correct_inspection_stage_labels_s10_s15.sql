-- ─────────────────────────────────────────────────────────────────────────────
-- Correct inspection_stages S10–S15 to match the runtime completion model
-- Migration: 20260605000000_correct_inspection_stage_labels_s10_s15.sql
--
-- The runtime stage model (inspectorCompletion.ts RAW_STAGES) defines a
-- permit-centric 15-stage sequence. The original seed (20260427020000) used a
-- construction-phase model that is now misaligned with what the inspector
-- completion workspace, admin checklist picker, and stage visibility logic use.
--
-- Changes per stage:
--   S10  Building Envelope & Weatherproofing -> Electrical Permit and Scope
--   S11  Insulation & Vapor Barrier          -> Gas Permit and Mechanical / HVAC Scope
--   S12  Drywall & Interior Finish           -> Insulation and Energy Compliance
--   S13  Life Safety Systems                 -> Interior Completion
--   S14  Final Site & Grading               -> Exterior Works and Site Finalization
--   S15  Final Occupancy Permit             -> Inspections, Final Approval, and Occupancy
--
-- Preserved (unchanged):
--   phase_number      -- cosmetic grouping not used in access or seal logic
--   schema            -- no column additions or structural changes
--   rows S01-S09      -- only stage_number IN (10, 11, 12, 13, 14, 15) are touched
--   other tables      -- not referenced; no backfill; no FK additions
--
-- Each stage updated by stage_number. Rows are guaranteed to exist from
-- 20260427020000_inspection_stage_seeds.sql.
-- ─────────────────────────────────────────────────────────────────────────────

-- S10: electrical permit stage -- single-discipline
update public.inspection_stages
set
  title                  = 'Electrical Permit and Scope',
  slug                   = 'electrical_permit_and_scope',
  discipline             = 'electrical',
  visible_to_specialties = ARRAY['electrical'],
  requires_master_seal   = false,
  updated_at             = now()
where stage_number = 10;

-- S11: gas and mechanical permit stage -- single-discipline
update public.inspection_stages
set
  title                  = 'Gas Permit and Mechanical / HVAC Scope',
  slug                   = 'gas_mechanical_hvac_scope',
  discipline             = 'mechanical',
  visible_to_specialties = ARRAY['mechanical'],
  requires_master_seal   = false,
  updated_at             = now()
where stage_number = 11;

-- S12: multi-trade energy compliance stage -- all rough-in trades sign off before wall closure
update public.inspection_stages
set
  title                  = 'Insulation and Energy Compliance',
  slug                   = 'insulation_energy_compliance',
  discipline             = null,
  visible_to_specialties = ARRAY['architectural', 'mechanical', 'electrical', 'plumbing'],
  requires_master_seal   = false,
  updated_at             = now()
where stage_number = 12;

-- S13: interior finish stage -- architectural scope only
update public.inspection_stages
set
  title                  = 'Interior Completion',
  slug                   = 'interior_completion',
  discipline             = 'architectural',
  visible_to_specialties = ARRAY['architectural'],
  requires_master_seal   = false,
  updated_at             = now()
where stage_number = 13;

-- S14: exterior site closeout -- no single primary discipline; geotechnical, structural, architectural involved
update public.inspection_stages
set
  title                  = 'Exterior Works and Site Finalization',
  slug                   = 'exterior_works_site_finalization',
  discipline             = null,
  visible_to_specialties = ARRAY['geotechnical', 'structural', 'architectural'],
  requires_master_seal   = false,
  updated_at             = now()
where stage_number = 14;

-- S15: master-seal gate -- visible_to_specialties empty; isMasterInspector bypasses specialty filter
update public.inspection_stages
set
  title                  = 'Inspections, Final Approval, and Occupancy',
  slug                   = 'final_approval_and_occupancy',
  discipline             = null,
  visible_to_specialties = ARRAY[]::text[],
  requires_master_seal   = true,
  updated_at             = now()
where stage_number = 15;
