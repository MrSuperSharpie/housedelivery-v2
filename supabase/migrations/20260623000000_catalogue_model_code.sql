-- Small Housing Catalogue Alignment (Phase 1) — metadata / display only.
--
-- Records which Build Canada Homes / small-housing catalogue model an inspection
-- request is associated with (e.g. duplex, rowhouse, BC fourplex, sixplex).
--
-- This is descriptive metadata ONLY. It is NOT read by the checklist resolver,
-- which remains keyed on inspection stage + jurisdiction
-- (see src/lib/inspections/resolveActiveTemplate.ts). The column is nullable with
-- no default and no backfill: existing rows stay NULL and behave exactly as they
-- do today. Selecting a model never changes which checklist template is served.
alter table public.job_opportunities
  add column if not exists catalogue_model_code text;
