begin;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'job_holds'
      and column_name = 'checklist_item_ids'
      and udt_name <> 'jsonb'
  ) then
    execute 'alter table public.job_holds alter column checklist_item_ids drop default';
    execute $sql$
      alter table public.job_holds
      alter column checklist_item_ids type jsonb
      using case
        when checklist_item_ids is null then '[]'::jsonb
        else to_jsonb(checklist_item_ids)
      end
    $sql$;
  end if;
end
$$;

alter table public.job_holds
  add column if not exists placed_at timestamptz,
  add column if not exists status text,
  add column if not exists checklist_item_ids jsonb,
  add column if not exists builder_note text,
  add column if not exists resolved_at timestamptz,
  add column if not exists expired_at timestamptz;

update public.job_holds
set placed_at = coalesce(placed_at, created_at, now())
where placed_at is null;

update public.job_holds
set status = 'open'
where status is null or btrim(status) = '';

update public.job_holds
set checklist_item_ids = '[]'::jsonb
where checklist_item_ids is null;

alter table public.job_holds
  alter column placed_at set default now(),
  alter column placed_at set not null,
  alter column status set default 'open',
  alter column status set not null,
  alter column checklist_item_ids set default '[]'::jsonb,
  alter column checklist_item_ids set not null;

alter table public.job_holds
  drop constraint if exists job_holds_status_check;

alter table public.job_holds
  add constraint job_holds_status_check
  check (status in ('open', 'builder_approved', 'builder_declined', 'expired', 'admin_resolved'));

alter table public.job_holds
  drop constraint if exists job_holds_job_id_fkey;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'job_holds_job_id_fkey'
      and conrelid = 'public.job_holds'::regclass
  ) then
    alter table public.job_holds
      add constraint job_holds_job_id_fkey
      foreign key (job_id)
      references public.job_opportunities(id)
      on delete cascade
      not valid;
  end if;
end
$$;

create index if not exists idx_job_holds_status on public.job_holds(status);
create index if not exists idx_job_holds_placed_at on public.job_holds(placed_at desc);

alter table public.job_holds enable row level security;

drop policy if exists job_holds_select_participants on public.job_holds;
create policy job_holds_select_participants
  on public.job_holds
  for select
  to authenticated
  using (
    auth.uid() is not null
    and (
      auth.uid()::text = inspector_id::text
      or auth.uid()::text = builder_id::text
      or coalesce(
        auth.jwt() ->> 'role',
        auth.jwt() -> 'app_metadata' ->> 'role',
        auth.jwt() -> 'user_metadata' ->> 'role',
        ''
      ) = 'admin'
    )
  );

drop policy if exists job_holds_insert_inspector on public.job_holds;
create policy job_holds_insert_inspector
  on public.job_holds
  for insert
  to authenticated
  with check (
    auth.uid() is not null
    and (
      auth.uid()::text = inspector_id::text
      or coalesce(
        auth.jwt() ->> 'role',
        auth.jwt() -> 'app_metadata' ->> 'role',
        auth.jwt() -> 'user_metadata' ->> 'role',
        ''
      ) = 'admin'
    )
  );

drop policy if exists job_holds_update_participants on public.job_holds;
create policy job_holds_update_participants
  on public.job_holds
  for update
  to authenticated
  using (
    auth.uid() is not null
    and (
      auth.uid()::text = inspector_id::text
      or auth.uid()::text = builder_id::text
      or coalesce(
        auth.jwt() ->> 'role',
        auth.jwt() -> 'app_metadata' ->> 'role',
        auth.jwt() -> 'user_metadata' ->> 'role',
        ''
      ) = 'admin'
    )
  )
  with check (
    auth.uid() is not null
    and (
      auth.uid()::text = inspector_id::text
      or auth.uid()::text = builder_id::text
      or coalesce(
        auth.jwt() ->> 'role',
        auth.jwt() -> 'app_metadata' ->> 'role',
        auth.jwt() -> 'user_metadata' ->> 'role',
        ''
      ) = 'admin'
    )
  );

create table if not exists public.job_hold_retention_sessions (
  id text primary key,
  hold_id uuid not null references public.job_holds(id) on delete cascade,
  job_id uuid not null references public.job_opportunities(id) on delete cascade,
  inspector_id uuid not null,
  builder_id uuid not null,
  dispatch_tier text not null,
  hourly_rate numeric(10, 2) not null,
  initial_hours integer not null default 1,
  total_hours_booked integer not null default 1,
  elapsed_seconds integer not null default 0,
  status text not null default 'pending_approval',
  resolved_defect_ids jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hold_id)
);

alter table public.job_hold_retention_sessions
  drop constraint if exists job_hold_retention_sessions_dispatch_tier_check,
  drop constraint if exists job_hold_retention_sessions_status_check;

alter table public.job_hold_retention_sessions
  add constraint job_hold_retention_sessions_dispatch_tier_check
  check (dispatch_tier in ('standard', 'priority', 'emergency')),
  add constraint job_hold_retention_sessions_status_check
  check (status in ('pending_approval', 'active', 'extended', 'completed', 'cancelled'));

create index if not exists idx_job_hold_retention_sessions_job_id
  on public.job_hold_retention_sessions(job_id);
create index if not exists idx_job_hold_retention_sessions_inspector_id
  on public.job_hold_retention_sessions(inspector_id);
create index if not exists idx_job_hold_retention_sessions_builder_id
  on public.job_hold_retention_sessions(builder_id);
create index if not exists idx_job_hold_retention_sessions_status
  on public.job_hold_retention_sessions(status);

drop trigger if exists trg_job_hold_retention_sessions_updated_at on public.job_hold_retention_sessions;
create trigger trg_job_hold_retention_sessions_updated_at
  before update on public.job_hold_retention_sessions
  for each row execute function public.set_job_holds_updated_at();

alter table public.job_hold_retention_sessions enable row level security;

drop policy if exists job_hold_retention_sessions_select_participants on public.job_hold_retention_sessions;
create policy job_hold_retention_sessions_select_participants
  on public.job_hold_retention_sessions
  for select
  to authenticated
  using (
    auth.uid() is not null
    and (
      auth.uid()::text = inspector_id::text
      or auth.uid()::text = builder_id::text
      or coalesce(
        auth.jwt() ->> 'role',
        auth.jwt() -> 'app_metadata' ->> 'role',
        auth.jwt() -> 'user_metadata' ->> 'role',
        ''
      ) = 'admin'
    )
  );

drop policy if exists job_hold_retention_sessions_insert_participants on public.job_hold_retention_sessions;
create policy job_hold_retention_sessions_insert_participants
  on public.job_hold_retention_sessions
  for insert
  to authenticated
  with check (
    auth.uid() is not null
    and (
      auth.uid()::text = inspector_id::text
      or auth.uid()::text = builder_id::text
      or coalesce(
        auth.jwt() ->> 'role',
        auth.jwt() -> 'app_metadata' ->> 'role',
        auth.jwt() -> 'user_metadata' ->> 'role',
        ''
      ) = 'admin'
    )
  );

drop policy if exists job_hold_retention_sessions_update_participants on public.job_hold_retention_sessions;
create policy job_hold_retention_sessions_update_participants
  on public.job_hold_retention_sessions
  for update
  to authenticated
  using (
    auth.uid() is not null
    and (
      auth.uid()::text = inspector_id::text
      or auth.uid()::text = builder_id::text
      or coalesce(
        auth.jwt() ->> 'role',
        auth.jwt() -> 'app_metadata' ->> 'role',
        auth.jwt() -> 'user_metadata' ->> 'role',
        ''
      ) = 'admin'
    )
  )
  with check (
    auth.uid() is not null
    and (
      auth.uid()::text = inspector_id::text
      or auth.uid()::text = builder_id::text
      or coalesce(
        auth.jwt() ->> 'role',
        auth.jwt() -> 'app_metadata' ->> 'role',
        auth.jwt() -> 'user_metadata' ->> 'role',
        ''
      ) = 'admin'
    )
  );

create or replace function public.decline_hold_and_stop_job(
  p_hold_id text,
  p_builder_note text default null,
  p_actor_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_actor_id text := coalesce(nullif(p_actor_id, ''), auth.uid()::text);
  v_hold public.job_holds%rowtype;
  v_job public.job_opportunities%rowtype;
begin
  select *
  into v_hold
  from public.job_holds
  where id::text = p_hold_id
  for update;

  if not found then
    raise exception 'Hold % not found', p_hold_id;
  end if;

  if coalesce(v_hold.status, '') not in ('open', 'builder_approved') then
    raise exception 'Hold % is not declineable from status %', p_hold_id, v_hold.status;
  end if;

  select *
  into v_job
  from public.job_opportunities
  where id = v_hold.job_id
  for update;

  if not found then
    raise exception 'Parent job % not found for hold %', v_hold.job_id, p_hold_id;
  end if;

  update public.job_holds
  set
    status = 'builder_declined',
    builder_note = coalesce(p_builder_note, builder_note),
    resolved_at = v_now,
    updated_at = v_now
  where id = v_hold.id;

  update public.job_hold_retention_sessions
  set
    status = 'cancelled',
    completed_at = coalesce(completed_at, v_now),
    updated_at = v_now
  where hold_id = v_hold.id
    and status in ('pending_approval', 'active', 'extended');

  update public.job_opportunities
  set
    status = 'stopped',
    updated_at = v_now
  where id = v_hold.job_id;

  insert into public.job_status_events (
    job_id,
    actor_id,
    actor_role,
    from_status,
    to_status,
    reason,
    created_at
  )
  values (
    v_hold.job_id,
    coalesce(v_actor_id, 'system:hold_decline'),
    'builder',
    v_job.status,
    'stopped',
    coalesce(nullif(p_builder_note, ''), 'Builder declined on-site hold'),
    v_now
  );

  return true;
end;
$$;

grant execute on function public.decline_hold_and_stop_job(text, text, text) to authenticated;

commit;
