-- Fix: Job Holds Table and Trigger
-- Updated to include DROP TRIGGER IF EXISTS to prevent "already exists" errors

-- 1. Create the table
CREATE TABLE IF NOT EXISTS job_holds (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.job_opportunities(id) on delete cascade,
  inspector_id uuid NOT NULL,
  builder_id   uuid NOT NULL,
  reason       text NOT NULL,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- 2. Create Indexes
CREATE INDEX IF NOT EXISTS idx_job_holds_job_id ON job_holds(job_id);
CREATE INDEX IF NOT EXISTS idx_job_holds_expires_at ON job_holds(expires_at);
CREATE INDEX IF NOT EXISTS idx_job_holds_inspector_id ON job_holds(inspector_id);
CREATE INDEX IF NOT EXISTS idx_job_holds_builder_id ON job_holds(builder_id);

-- 3. Create Update Function
CREATE OR REPLACE FUNCTION set_job_holds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create Trigger (With Drop to avoid ERROR: trigger already exists)
DROP TRIGGER IF EXISTS trg_job_holds_updated_at ON job_holds;
CREATE TRIGGER trg_job_holds_updated_at
  BEFORE UPDATE ON job_holds
  FOR EACH ROW EXECUTE FUNCTION set_job_holds_updated_at();

-- 5. Enable RLS
ALTER TABLE job_holds ENABLE ROW LEVEL SECURITY;

-- 6. Simple Policy
DROP POLICY IF EXISTS "anyone_authenticated_can_read_holds" ON job_holds;
CREATE POLICY "anyone_authenticated_can_read_holds"
  ON job_holds FOR SELECT TO authenticated USING (true);