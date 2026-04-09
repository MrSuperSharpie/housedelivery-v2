-- Add discipline column to compliance_completed_records.
-- Stores the inspector's primary discipline (e.g. 'structural') at seal time.
-- Nullable so existing rows are unaffected.
ALTER TABLE compliance_completed_records
  ADD COLUMN IF NOT EXISTS discipline text;
