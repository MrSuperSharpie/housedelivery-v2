-- Foundation migration: creates all core job-system tables that predate the
-- migration-based workflow.  Every subsequent migration assumes these exist.

-- ─── Enums ────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.user_role as enum ('builder', 'inspector', 'admin');
exception when duplicate_object then null; end $$;

-- ─── profiles ─────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id                   text primary key,
  role                 public.user_role,
  first_name           text,
  last_name            text,
  full_name            text,
  email                text,
  phone                text,
  discipline           text,
  license_number       text,
  inspector_license_no text,
  inspector_status     text,
  onboarding_status    text,
  verified             boolean default false,
  logo_url             text,
  digital_seal_url     text,
  firm_name            text,
  business_address     text,
  license_expiry       text,
  insurance_expiry     text,
  created_at           timestamptz default now()
);

-- ─── builder_onboarding_status ────────────────────────────────────────────────

create table if not exists public.builder_onboarding_status (
  user_id             text primary key,
  status              text not null default 'draft',
  company_name        text,
  contact_name        text,
  contact_email       text,
  contact_phone       text,
  address             text,
  city                text,
  province            text not null default 'BC',
  postal_code         text,
  website             text,
  business_number     text,
  jurisdictions       text[] not null default '{}',
  permitted_families  text[] not null default '{}',
  requested_families  text[] not null default '{}',
  submitted_at        timestamptz,
  reviewed_at         timestamptz,
  reviewed_by         text,
  reviewer_note       text,
  updated_at          timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

-- ─── inspector_onboarding_status ──────────────────────────────────────────────

create table if not exists public.inspector_onboarding_status (
  user_id               text primary key,
  status                text not null default 'draft',
  contact_name          text,
  contact_email         text,
  contact_phone         text,
  designation           text,
  license_number        text,
  region                text,
  disciplines           text[],
  regions               text[] not null default '{}',
  credential_expires_at timestamptz,
  approved_role_lanes   text[] not null default '{}',
  requested_role_lanes  text[] not null default '{}',
  reviewer_note         text,
  submitted_at          timestamptz,
  updated_at            timestamptz not null default now()
);

-- ─── job_opportunities ────────────────────────────────────────────────────────

create table if not exists public.job_opportunities (
  id                    uuid primary key default gen_random_uuid(),
  builder_id            uuid,
  builder_name          text not null default '',
  address               text,
  city                  text,
  region                text,
  permit_number         text,
  permit_family         text,
  stage                 integer,
  stage_name            text,
  required_discipline   text,
  offered_rate          numeric,
  status                text default 'live',
  notes                 text,
  project_name          text,
  project_type          text,
  requested_at          timestamptz not null default now(),
  scheduled_for         timestamptz,
  updated_at            timestamptz not null default now(),
  created_at            timestamptz default now()
);

create index if not exists idx_job_opportunities_status   on public.job_opportunities(status);
create index if not exists idx_job_opportunities_region   on public.job_opportunities(region);
create index if not exists idx_job_opportunities_builder  on public.job_opportunities(builder_id);

-- ─── job_assignments ──────────────────────────────────────────────────────────

create table if not exists public.job_assignments (
  id                        uuid primary key default gen_random_uuid(),
  job_id                    uuid references public.job_opportunities(id) on delete cascade,
  inspector_id              uuid,
  assigned_by               uuid,
  status                    text not null default 'provisional',
  confirmation_status       text not null default 'pending',
  objection_state           text not null default 'none',
  objection_window_closes_at timestamptz,
  objected_at               timestamptz,
  objection_reason          text,
  objection_note            text,
  confirmed_at              timestamptz,
  inspector_confirmed_at    timestamptz,
  arrived_at                timestamptz,
  en_route_at               timestamptz,
  escrow_amount             numeric,
  escrow_status             text,
  admin_note                text,
  cancelled_at              timestamptz,
  invalidated_at            timestamptz,
  scheduled_start_at        timestamptz,
  scheduled_end_at          timestamptz,
  commitment_accepted       boolean not null default false,
  commitment_accepted_at    timestamptz,
  commitment_version        text,
  assigned_at               timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  created_at                timestamptz default now()
);

create index if not exists idx_job_assignments_job_id       on public.job_assignments(job_id);
create index if not exists idx_job_assignments_inspector_id on public.job_assignments(inspector_id);
create index if not exists idx_job_assignments_status       on public.job_assignments(status);

-- ─── job_status_events ────────────────────────────────────────────────────────

create table if not exists public.job_status_events (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid references public.job_opportunities(id) on delete cascade,
  actor_id    uuid,
  actor_role  text,
  status      text,
  from_status text,
  to_status   text,
  reason      text,
  created_at  timestamptz default now()
);

create index if not exists idx_job_status_events_job_id on public.job_status_events(job_id);

-- ─── updated_at triggers ──────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_job_opportunities_updated_at on public.job_opportunities;
create trigger trg_job_opportunities_updated_at
  before update on public.job_opportunities
  for each row execute function public.set_updated_at();

drop trigger if exists trg_job_assignments_updated_at on public.job_assignments;
create trigger trg_job_assignments_updated_at
  before update on public.job_assignments
  for each row execute function public.set_updated_at();

-- ─── RLS (permissive for local dev — production policies in later migrations) ──

alter table public.profiles                    enable row level security;
alter table public.builder_onboarding_status   enable row level security;
alter table public.inspector_onboarding_status enable row level security;
alter table public.job_opportunities           enable row level security;
alter table public.job_assignments             enable row level security;
alter table public.job_status_events           enable row level security;

create policy "service_role_all" on public.profiles                    for all using (true);
create policy "service_role_all" on public.builder_onboarding_status   for all using (true);
create policy "service_role_all" on public.inspector_onboarding_status for all using (true);
create policy "service_role_all" on public.job_opportunities           for all using (true);
create policy "service_role_all" on public.job_assignments             for all using (true);
create policy "service_role_all" on public.job_status_events           for all using (true);
