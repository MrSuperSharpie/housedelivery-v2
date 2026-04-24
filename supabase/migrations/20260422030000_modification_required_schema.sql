-- Migration: 20260422030000_modification_required_schema.sql
--
-- Introduces the 3-pathway "Modification Required" model to replace the
-- simple hold concept. Three governed pathways:
--   1. On-Site Correction Hold  (type = 'onsite')
--   2. Same-Day Return Hold     (type = 'same_day_return')
--   3. Reinspection Required    (type = 'reinspection')
--
-- Creates four new tables:
--   • inspection_jobs      — the authoritative job record for this model
--   • inspection_holds     — a hold/modification event on a job
--   • hold_time_logs       — billable time segments within a hold
--   • reinspections        — a scheduled re-inspection linked to a hold
--
-- DOES NOT modify or drop existing tables (job_opportunities, job_holds,
-- job_assignments). Existing functionality is unaffected.

-- ── ENUMs ─────────────────────────────────────────────────────────────────────

create type public.inspection_job_status as enum (
  'confirmed',
  'in_progress',
  'hold_active',
  'awaiting_return',
  'closed_mod_required',
  'submitted',
  'sealed'
);

create type public.inspection_hold_type as enum (
  'onsite',
  'same_day_return',
  'reinspection'
);

create type public.inspection_hold_status as enum (
  'proposed',
  'acknowledged',
  'declined',
  'active',
  'awaiting_return',
  'converted',
  'resolved_pass',
  'resolved_fail'
);

create type public.inspection_hold_reason_code as enum (
  'framing',
  'foundation',
  'envelope',
  'electrical',
  'plumbing',
  'other'
);

create type public.inspection_hold_created_by as enum (
  'inspector',
  'builder'
);

create type public.reinspection_status as enum (
  'scheduled',
  'completed',
  'failed',
  'passed'
);

-- ── inspection_jobs ───────────────────────────────────────────────────────────
-- project_id is stored as text to accommodate external project reference formats.
-- current_hold_id FK is added after inspection_holds is created (circular ref).

create table public.inspection_jobs (
  id               uuid        primary key default gen_random_uuid(),
  project_id       text        not null,
  inspector_id     uuid        references auth.users(id),
  builder_id       uuid        references auth.users(id),
  status           public.inspection_job_status not null default 'confirmed',
  started_at       timestamptz,
  completed_at     timestamptz,
  base_fee         numeric(10, 2) not null default 0,
  hold_fee_total   numeric(10, 2) not null default 0,
  return_fee_total numeric(10, 2) not null default 0,
  current_hold_id  uuid,                           -- FK wired below
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── inspection_holds ──────────────────────────────────────────────────────────
-- linked_reinspection_id FK is added after reinspections is created.

create table public.inspection_holds (
  id                      uuid        primary key default gen_random_uuid(),
  inspection_id           uuid        not null
                            references public.inspection_jobs(id) on delete cascade,
  type                    public.inspection_hold_type        not null,
  status                  public.inspection_hold_status      not null default 'proposed',
  reason_code             public.inspection_hold_reason_code not null,
  notes                   text,
  is_blocking             boolean     not null default true,
  estimated_fix_minutes   integer,
  created_by              public.inspection_hold_created_by  not null default 'inspector',
  builder_acknowledged    boolean     not null default false,
  builder_acknowledged_at timestamptz,
  started_at              timestamptz,
  ended_at                timestamptz,
  return_window_start     timestamptz,
  return_window_end       timestamptz,
  linked_reinspection_id  uuid,                              -- FK wired below
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Wire current_hold_id → inspection_holds now that the table exists.
alter table public.inspection_jobs
  add constraint inspection_jobs_current_hold_id_fkey
  foreign key (current_hold_id) references public.inspection_holds(id);

-- ── hold_time_logs ────────────────────────────────────────────────────────────
-- billable_minutes and total_cost may be null until the log segment is closed.

create table public.hold_time_logs (
  id               uuid        primary key default gen_random_uuid(),
  hold_id          uuid        not null
                     references public.inspection_holds(id) on delete cascade,
  start_time       timestamptz not null,
  end_time         timestamptz,
  billable_minutes integer,
  rate_applied     numeric(10, 4),                -- cost per billable minute
  total_cost       numeric(10, 2),
  created_at       timestamptz not null default now()
);

-- ── reinspections ─────────────────────────────────────────────────────────────

create table public.reinspections (
  id                     uuid        primary key default gen_random_uuid(),
  original_inspection_id uuid        not null
                           references public.inspection_jobs(id) on delete restrict,
  hold_id                uuid
                           references public.inspection_holds(id),
  scheduled_at           timestamptz,
  inspector_id           uuid        references auth.users(id),
  status                 public.reinspection_status not null default 'scheduled',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Wire linked_reinspection_id → reinspections now that the table exists.
alter table public.inspection_holds
  add constraint inspection_holds_linked_reinspection_id_fkey
  foreign key (linked_reinspection_id) references public.reinspections(id);

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index on public.inspection_jobs (inspector_id);
create index on public.inspection_jobs (builder_id);
create index on public.inspection_jobs (status);
create index on public.inspection_jobs (project_id);

create index on public.inspection_holds (inspection_id);
create index on public.inspection_holds (status);
create index on public.inspection_holds (type);

create index on public.hold_time_logs (hold_id);

create index on public.reinspections (original_inspection_id);
create index on public.reinspections (inspector_id);
create index on public.reinspections (status);

-- ── Row-Level Security ────────────────────────────────────────────────────────
-- Baseline policies: each party sees only their own records.
-- Admin/service-role access is unrestricted by RLS.

alter table public.inspection_jobs      enable row level security;
alter table public.inspection_holds     enable row level security;
alter table public.hold_time_logs       enable row level security;
alter table public.reinspections        enable row level security;

-- inspection_jobs --
create policy "inspection_jobs: inspector read own"
  on public.inspection_jobs for select
  using (inspector_id = auth.uid());

create policy "inspection_jobs: builder read own"
  on public.inspection_jobs for select
  using (builder_id = auth.uid());

-- inspection_holds --
-- Both inspector and builder on the parent job can read holds.
create policy "inspection_holds: parties read own"
  on public.inspection_holds for select
  using (
    inspection_id in (
      select id from public.inspection_jobs
      where inspector_id = auth.uid()
         or builder_id   = auth.uid()
    )
  );

-- hold_time_logs --
-- Inspectors see time logs for holds on their jobs.
create policy "hold_time_logs: inspector read own"
  on public.hold_time_logs for select
  using (
    hold_id in (
      select h.id
      from   public.inspection_holds h
      join   public.inspection_jobs  j on j.id = h.inspection_id
      where  j.inspector_id = auth.uid()
    )
  );

-- reinspections --
create policy "reinspections: parties read own"
  on public.reinspections for select
  using (
    original_inspection_id in (
      select id from public.inspection_jobs
      where inspector_id = auth.uid()
         or builder_id   = auth.uid()
    )
  );
