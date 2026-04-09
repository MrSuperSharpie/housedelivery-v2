create extension if not exists pgcrypto;

create or replace function public.set_governance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.governance_audit_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  actor_id text,
  actor_role text,
  rule_ids text[] not null default '{}',
  blocker_type text,
  reason text,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_governance_audit_entity
  on public.governance_audit_events(entity_type, entity_id, created_at desc);

create index if not exists idx_governance_audit_created_at
  on public.governance_audit_events(created_at desc);

alter table public.governance_audit_events enable row level security;

drop policy if exists governance_audit_events_select_authenticated on public.governance_audit_events;
create policy governance_audit_events_select_authenticated
  on public.governance_audit_events
  for select
  to authenticated
  using (auth.uid() is not null);

drop policy if exists governance_audit_events_insert_authenticated on public.governance_audit_events;
create policy governance_audit_events_insert_authenticated
  on public.governance_audit_events
  for insert
  to authenticated
  with check (auth.uid() is not null);
