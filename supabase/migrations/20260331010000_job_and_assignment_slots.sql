alter table public.job_opportunities
  add column if not exists available_slots jsonb not null default '[]'::jsonb;

alter table public.job_assignments
  add column if not exists claimed_slot jsonb;
