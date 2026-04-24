-- Contact identity fields used for pre-signup duplicate prevention.
-- These are intentionally simple profile-level values; Supabase Auth remains
-- the source of truth for credentials and password/session management.

alter table public.profiles
  add column if not exists email text,
  add column if not exists phone text;

create index if not exists profiles_email_lookup_idx
  on public.profiles (lower(email))
  where email is not null;

create index if not exists profiles_phone_lookup_idx
  on public.profiles (phone)
  where phone is not null;
