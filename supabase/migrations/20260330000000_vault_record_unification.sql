-- Canonical vault record enrichment for sealed compliance records.
-- Supports builder / inspector / jurisdiction scoped retrieval in /vault.

ALTER TABLE compliance_completed_records
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS builder_id text,
  ADD COLUMN IF NOT EXISTS builder_name text,
  ADD COLUMN IF NOT EXISTS inspector_id text,
  ADD COLUMN IF NOT EXISTS permit_number text,
  ADD COLUMN IF NOT EXISTS discipline text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS jurisdiction_id text,
  ADD COLUMN IF NOT EXISTS jurisdiction_name text,
  ADD COLUMN IF NOT EXISTS authority_name text;
