alter table public.inspector_onboarding_status
  add column if not exists requested_role_lanes text[] not null default '{}',
  add column if not exists approved_role_lanes text[] not null default '{}';
