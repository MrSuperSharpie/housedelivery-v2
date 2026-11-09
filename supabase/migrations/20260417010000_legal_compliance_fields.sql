-- Legal compliance architecture additions
-- 1. inspector_license_no on profiles and inspector_completion_reports
-- 2. first_name / last_name on profiles (columns may already exist; guarded)
-- 3. manual_location_note on inspector_completion_documents

-- profiles: explicit name columns and dedicated license number field
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists inspector_license_no text;

-- inspector_completion_reports: denormalized license number for PDF / audit trail
alter table public.inspector_completion_reports
  add column if not exists inspector_license_no text;

-- inspector_completion_documents: fallback location annotation when GPS EXIF drops out
alter table public.inspector_completion_documents
  add column if not exists manual_location_note text;
