create table if not exists public.job_payment_decisions (
  id uuid primary key default gen_random_uuid(),
  job_id text not null unique,
  assignment_id text,
  payment_status text not null,
  payout_status text not null,
  base_fee_amount numeric(10,2) not null default 0,
  hold_premium_amount numeric(10,2) not null default 0,
  siteline_commission_amount numeric(10,2) not null default 0,
  blocked_reason text,
  decision_note text,
  decided_by_id text,
  decided_at timestamptz not null default now(),
  released_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.job_disputes (
  id uuid primary key default gen_random_uuid(),
  job_id text not null,
  assignment_id text,
  opened_by_id text,
  opened_by_role text,
  reason text not null,
  status text not null default 'open',
  commercial_block boolean not null default true,
  resolution_note text,
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.vault_archive_events (
  id uuid primary key default gen_random_uuid(),
  record_id text not null references public.compliance_completed_records(id) on delete cascade,
  package_seal_id text references public.compliance_package_seals(id) on delete set null,
  retention_tier text not null,
  event_type text not null,
  archived_by_id text,
  archived_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.job_payment_decisions enable row level security;
alter table public.job_disputes enable row level security;
alter table public.vault_archive_events enable row level security;

drop policy if exists job_payment_decisions_authenticated_all on public.job_payment_decisions;
create policy job_payment_decisions_authenticated_all
  on public.job_payment_decisions
  for all
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists job_disputes_authenticated_all on public.job_disputes;
create policy job_disputes_authenticated_all
  on public.job_disputes
  for all
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists vault_archive_events_authenticated_all on public.vault_archive_events;
create policy vault_archive_events_authenticated_all
  on public.vault_archive_events
  for all
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
