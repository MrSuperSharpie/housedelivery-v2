-- Phase 7: Compliance workflow server-backed persistence
-- Run this in Supabase SQL editor to create tables if they don't exist.

-- Completed inspection records (structured evidence + metadata)
CREATE TABLE IF NOT EXISTS compliance_completed_records (
  id text PRIMARY KEY,
  project_id text NOT NULL,
  project_name text NOT NULL,
  address text NOT NULL,
  stage smallint NOT NULL,
  stage_name text NOT NULL,
  result text NOT NULL CHECK (result IN ('pass', 'fail')),
  evidence_items jsonb NOT NULL DEFAULT '[]',
  completed_at timestamptz NOT NULL,
  inspector_name text NOT NULL,
  inspector_license text NOT NULL,
  pass_items smallint NOT NULL DEFAULT 0,
  fail_items smallint NOT NULL DEFAULT 0,
  cert_ref text NOT NULL,
  job_ref text,
  sealed boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Deficiencies against a completed record/package
CREATE TABLE IF NOT EXISTS compliance_deficiencies (
  id text PRIMARY KEY,
  record_id text NOT NULL,
  checklist_item_ref text,
  evidence_item_ref text,
  reviewer_comment text NOT NULL,
  response text,
  status text NOT NULL CHECK (status IN ('open', 'responded', 'resolved')),
  resolved_in_version smallint,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

-- Resubmission/package version history
CREATE TABLE IF NOT EXISTS compliance_package_versions (
  id text PRIMARY KEY,
  record_id text NOT NULL,
  version smallint NOT NULL,
  created_at timestamptz NOT NULL,
  note text
);

-- Inspector onboarding status (Live Board gate)
CREATE TABLE IF NOT EXISTS inspector_onboarding_status (
  user_id text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('draft', 'submitted', 'under_review', 'needs_info', 'approved', 'rejected', 'suspended')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Optional: enable RLS and add policies for your app role/anon
-- ALTER TABLE compliance_completed_records ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE compliance_deficiencies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE compliance_package_versions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE inspector_onboarding_status ENABLE ROW LEVEL SECURITY;

-- Inspector credential documents (uploaded by inspectors; reviewed by SiteLine)
CREATE TABLE IF NOT EXISTS inspector_credentials (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  credential_type text NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  uploaded_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('uploaded', 'under_review', 'accepted', 'rejected', 'needs_info')),
  reviewer_note text,
  is_required boolean NOT NULL DEFAULT false,
  expires_at timestamptz
);

-- Optional reviewer notes column for onboarding status (used by admin UI)
ALTER TABLE inspector_onboarding_status ADD COLUMN IF NOT EXISTS reviewer_note text;
