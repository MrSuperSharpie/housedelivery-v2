create table if not exists public.governed_projects (
  id text primary key,
  builder_id text not null,
  name text not null,
  address text not null,
  city text not null,
  permit_number text,
  builder_onboarding_status text not null default 'draft',
  completeness_status text not null default 'needs_info',
  completeness_blockers jsonb not null default '[]'::jsonb,
  rule_snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_governed_projects_updated_at on public.governed_projects;
create trigger trg_governed_projects_updated_at
  before update on public.governed_projects
  for each row execute function public.set_governance_updated_at();

alter table public.governed_projects enable row level security;

drop policy if exists governed_projects_select_owner_or_admin on public.governed_projects;
create policy governed_projects_select_owner_or_admin
  on public.governed_projects
  for select
  to authenticated
  using (
    auth.uid()::text = builder_id
    or coalesce(
      auth.jwt() ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    ) = 'admin'
  );

drop policy if exists governed_projects_insert_owner_or_admin on public.governed_projects;
create policy governed_projects_insert_owner_or_admin
  on public.governed_projects
  for insert
  to authenticated
  with check (
    auth.uid()::text = builder_id
    or coalesce(
      auth.jwt() ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    ) = 'admin'
  );

drop policy if exists governed_projects_update_owner_or_admin on public.governed_projects;
create policy governed_projects_update_owner_or_admin
  on public.governed_projects
  for update
  to authenticated
  using (
    auth.uid()::text = builder_id
    or coalesce(
      auth.jwt() ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    ) = 'admin'
  )
  with check (
    auth.uid()::text = builder_id
    or coalesce(
      auth.jwt() ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    ) = 'admin'
  );

alter table public.job_opportunities
  add column if not exists project_id text,
  add column if not exists builder_onboarding_status text,
  add column if not exists validation_status text not null default 'pending_validation',
  add column if not exists validation_blockers jsonb not null default '[]'::jsonb,
  add column if not exists escrow_authorized boolean not null default false,
  add column if not exists validation_completed_at timestamptz,
  add column if not exists published_at timestamptz;

update public.job_opportunities
set
  builder_onboarding_status = coalesce(builder_onboarding_status, 'approved'),
  validation_status = 'validated',
  escrow_authorized = true,
  validation_completed_at = coalesce(validation_completed_at, updated_at, created_at, now()),
  published_at = coalesce(published_at, created_at, now())
where status = 'live'
  and coalesce(nullif(permit_number, ''), nullif(project_name, '')) is not null
  and required_discipline is not null
  and region is not null
  and stage_name is not null;

create table if not exists public.job_validation_results (
  id uuid primary key default gen_random_uuid(),
  job_id text not null unique,
  project_id text,
  builder_id text,
  validation_status text not null,
  blockers jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  validator_version text not null default '2026-04-07',
  validated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.job_validation_results enable row level security;

drop policy if exists job_validation_results_authenticated_select on public.job_validation_results;
create policy job_validation_results_authenticated_select
  on public.job_validation_results
  for select
  to authenticated
  using (auth.uid() is not null);

drop policy if exists job_validation_results_authenticated_upsert on public.job_validation_results;
create policy job_validation_results_authenticated_upsert
  on public.job_validation_results
  for all
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
