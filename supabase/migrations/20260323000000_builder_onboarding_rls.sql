-- Fix: RLS policies for builder_onboarding_status
-- Updated for standard PostgreSQL compatibility (Removing IF NOT EXISTS on policies)

-- 1. Create table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS builder_onboarding_status (
  user_id            text PRIMARY KEY,
  status             text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','submitted','under_review','needs_info','approved','rejected','suspended')),
  company_name       text,
  business_number    text,
  contact_name       text,
  contact_email      text,
  contact_phone      text,
  address            text,
  website            text,
  requested_families text[],
  permitted_families text[],
  jurisdictions      text[],
  reviewer_note      text,
  reviewed_by        text,
  reviewed_at        timestamptz,
  submitted_at       timestamptz,
  updated_at         timestamptz DEFAULT now(),
  created_at         timestamptz DEFAULT now()
);

-- 2. Add permit_number column to compliance_completed_records if not yet present
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='compliance_completed_records' AND column_name='permit_number') THEN
    ALTER TABLE compliance_completed_records ADD COLUMN permit_number text;
  END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE builder_onboarding_status ENABLE ROW LEVEL SECURITY;

-- 4. Builders: can upsert their own row
-- We drop first to ensure a clean slate, then create.
DROP POLICY IF EXISTS "builder_can_upsert_own" ON builder_onboarding_status;
CREATE POLICY "builder_can_upsert_own"
  ON builder_onboarding_status
  FOR ALL
  TO authenticated
  USING     (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- 5. Admins: can read and update any row
DROP POLICY IF EXISTS "admin_full_access" ON builder_onboarding_status;
CREATE POLICY "admin_full_access"
  ON builder_onboarding_status
  FOR ALL
  TO authenticated
  USING     (auth.jwt() ->> 'email' LIKE '%@siteline.ca')
  WITH CHECK (auth.jwt() ->> 'email' LIKE '%@siteline.ca');

-- 6. Verify: check what rows exist and what policies are active
SELECT * FROM builder_onboarding_status;

SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'builder_onboarding_status';