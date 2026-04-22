-- Schedule C-B PDF prep: digital seal path and firm data on inspector profiles.
-- digital_seal_url stores the Supabase Storage path; PDF generation resolves a
-- signed URL at render time.

alter table public.profiles
  add column if not exists digital_seal_url text,
  add column if not exists firm_name text,
  add column if not exists business_address text;
