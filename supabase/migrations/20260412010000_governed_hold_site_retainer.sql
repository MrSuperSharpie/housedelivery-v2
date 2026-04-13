begin;

alter table public.job_holds
  add column if not exists deficiency_reason text,
  add column if not exists hold_category text,
  add column if not exists hold_eligible_for_on_site_correction boolean,
  add column if not exists estimated_correction_minutes integer,
  add column if not exists premium_rate_type text,
  add column if not exists premium_rate_amount numeric(10, 2),
  add column if not exists hold_cap_amount numeric(10, 2),
  add column if not exists builder_accepted_at timestamptz,
  add column if not exists builder_declined_at timestamptz,
  add column if not exists hold_started_at timestamptz,
  add column if not exists hold_ended_at timestamptz,
  add column if not exists hold_resolution text,
  add column if not exists hold_resolution_notes text,
  add column if not exists hold_resolved_by_user_id uuid,
  add column if not exists linked_correction_evidence_ids jsonb,
  add column if not exists created_by_inspector_id uuid,
  add column if not exists related_inspection_id text,
  add column if not exists affected_item_summaries jsonb,
  add column if not exists premium_charge_amount numeric(10, 2),
  add column if not exists actual_retained_minutes integer,
  add column if not exists extension_count integer,
  add column if not exists last_notified_at timestamptz,
  add column if not exists last_builder_response_at timestamptz;

update public.job_holds
set
  deficiency_reason = coalesce(deficiency_reason, reason),
  hold_category = coalesce(nullif(hold_category, ''), 'minor_deficiency'),
  hold_eligible_for_on_site_correction = coalesce(hold_eligible_for_on_site_correction, true),
  estimated_correction_minutes = coalesce(estimated_correction_minutes, 60),
  premium_rate_type = coalesce(nullif(premium_rate_type, ''), 'hourly'),
  premium_rate_amount = coalesce(premium_rate_amount, 0),
  hold_cap_amount = coalesce(hold_cap_amount, premium_rate_amount, 0),
  builder_accepted_at = coalesce(builder_accepted_at, accepted_at),
  builder_declined_at = coalesce(builder_declined_at, declined_at),
  hold_resolution_notes = coalesce(hold_resolution_notes, resolution_summary),
  linked_correction_evidence_ids = coalesce(linked_correction_evidence_ids, '[]'::jsonb),
  created_by_inspector_id = coalesce(created_by_inspector_id, inspector_id),
  related_inspection_id = coalesce(related_inspection_id, job_id::text),
  affected_item_summaries = coalesce(affected_item_summaries, checklist_item_ids, '[]'::jsonb),
  premium_charge_amount = coalesce(premium_charge_amount, 0),
  actual_retained_minutes = coalesce(actual_retained_minutes, 0),
  extension_count = coalesce(extension_count, 0)
where true;

update public.job_holds
set status = case
  when status = 'open' then 'hold_pending_builder_ack'
  when status = 'builder_approved' then 'hold_active'
  when status = 'builder_declined' then 'hold_declined'
  when status = 'expired' then 'hold_expired'
  else status
end
where status in ('open', 'builder_approved', 'builder_declined', 'expired');

alter table public.job_holds
  alter column hold_category set default 'minor_deficiency',
  alter column hold_category set not null,
  alter column hold_eligible_for_on_site_correction set default true,
  alter column hold_eligible_for_on_site_correction set not null,
  alter column estimated_correction_minutes set default 60,
  alter column estimated_correction_minutes set not null,
  alter column premium_rate_type set default 'hourly',
  alter column premium_rate_type set not null,
  alter column premium_rate_amount set default 0,
  alter column premium_rate_amount set not null,
  alter column hold_cap_amount set default 0,
  alter column hold_cap_amount set not null,
  alter column linked_correction_evidence_ids set default '[]'::jsonb,
  alter column linked_correction_evidence_ids set not null,
  alter column created_by_inspector_id set not null,
  alter column related_inspection_id set not null,
  alter column affected_item_summaries set default '[]'::jsonb,
  alter column affected_item_summaries set not null,
  alter column premium_charge_amount set default 0,
  alter column premium_charge_amount set not null,
  alter column actual_retained_minutes set default 0,
  alter column actual_retained_minutes set not null,
  alter column extension_count set default 0,
  alter column extension_count set not null;

alter table public.job_holds
  drop constraint if exists job_holds_status_check,
  drop constraint if exists job_holds_hold_category_check,
  drop constraint if exists job_holds_premium_rate_type_check,
  drop constraint if exists job_holds_hold_resolution_check;

alter table public.job_holds
  add constraint job_holds_status_check
  check (
    status in (
      'hold_offered',
      'hold_pending_builder_ack',
      'hold_active',
      'hold_resolved_pass',
      'hold_resolved_fail',
      'hold_declined',
      'hold_expired',
      'admin_resolved'
    )
  ),
  add constraint job_holds_hold_category_check
  check (hold_category in ('minor_deficiency', 'coordination', 'access', 'safety', 'documentation', 'other')),
  add constraint job_holds_premium_rate_type_check
  check (premium_rate_type in ('hourly', 'flat')),
  add constraint job_holds_hold_resolution_check
  check (hold_resolution is null or hold_resolution in ('pass', 'fail'));

create index if not exists idx_job_holds_related_inspection_id on public.job_holds(related_inspection_id);
create index if not exists idx_job_holds_created_by_inspector_id on public.job_holds(created_by_inspector_id);

create table if not exists public.job_hold_events (
  id text primary key,
  hold_id uuid not null references public.job_holds(id) on delete cascade,
  job_id uuid not null references public.job_opportunities(id) on delete cascade,
  event_type text not null,
  actor_id uuid,
  actor_role text not null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.job_hold_events
  drop constraint if exists job_hold_events_event_type_check,
  drop constraint if exists job_hold_events_actor_role_check;

alter table public.job_hold_events
  add constraint job_hold_events_event_type_check
  check (
    event_type in (
      'hold_created',
      'hold_builder_notified',
      'hold_accepted',
      'hold_declined',
      'hold_started',
      'hold_extended',
      'evidence_added',
      'hold_resolved_pass',
      'hold_resolved_fail',
      'hold_expired',
      'hold_review_requested'
    )
  ),
  add constraint job_hold_events_actor_role_check
  check (actor_role in ('inspector', 'builder', 'admin', 'system'));

create index if not exists idx_job_hold_events_hold_id_created_at
  on public.job_hold_events(hold_id, created_at desc);

alter table public.job_hold_events enable row level security;

drop policy if exists job_hold_events_select_participants on public.job_hold_events;
create policy job_hold_events_select_participants
  on public.job_hold_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.job_holds h
      where h.id = hold_id
        and (
          auth.uid()::text = h.inspector_id::text
          or auth.uid()::text = h.builder_id::text
          or coalesce(
            auth.jwt() ->> 'role',
            auth.jwt() -> 'app_metadata' ->> 'role',
            auth.jwt() -> 'user_metadata' ->> 'role',
            ''
          ) = 'admin'
        )
    )
  );

drop policy if exists job_hold_events_insert_participants on public.job_hold_events;
create policy job_hold_events_insert_participants
  on public.job_hold_events
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.job_holds h
      where h.id = hold_id
        and (
          auth.uid()::text = h.inspector_id::text
          or auth.uid()::text = h.builder_id::text
          or coalesce(
            auth.jwt() ->> 'role',
            auth.jwt() -> 'app_metadata' ->> 'role',
            auth.jwt() -> 'user_metadata' ->> 'role',
            ''
          ) = 'admin'
        )
    )
  );

create table if not exists public.job_hold_evidence (
  id text primary key,
  hold_id uuid not null references public.job_holds(id) on delete cascade,
  job_id uuid not null references public.job_opportunities(id) on delete cascade,
  checklist_item_id text,
  evidence_role text not null default 'correction',
  evidence_type text not null,
  file_name text,
  mime_type text,
  file_size bigint,
  storage_path text,
  note_text text,
  capture_geo jsonb not null default '{}'::jsonb,
  captured_at timestamptz,
  created_by_user_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_hold_evidence
  drop constraint if exists job_hold_evidence_role_check,
  drop constraint if exists job_hold_evidence_type_check;

alter table public.job_hold_evidence
  add constraint job_hold_evidence_role_check
  check (evidence_role in ('deficiency', 'correction')),
  add constraint job_hold_evidence_type_check
  check (evidence_type in ('photo', 'video', 'note', 'attachment'));

create index if not exists idx_job_hold_evidence_hold_id on public.job_hold_evidence(hold_id, created_at desc);

drop trigger if exists trg_job_hold_evidence_updated_at on public.job_hold_evidence;
create trigger trg_job_hold_evidence_updated_at
  before update on public.job_hold_evidence
  for each row execute function public.set_job_holds_updated_at();

alter table public.job_hold_evidence enable row level security;

drop policy if exists job_hold_evidence_select_participants on public.job_hold_evidence;
create policy job_hold_evidence_select_participants
  on public.job_hold_evidence
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.job_holds h
      where h.id = hold_id
        and (
          auth.uid()::text = h.inspector_id::text
          or auth.uid()::text = h.builder_id::text
          or coalesce(
            auth.jwt() ->> 'role',
            auth.jwt() -> 'app_metadata' ->> 'role',
            auth.jwt() -> 'user_metadata' ->> 'role',
            ''
          ) = 'admin'
        )
    )
  );

drop policy if exists job_hold_evidence_insert_participants on public.job_hold_evidence;
create policy job_hold_evidence_insert_participants
  on public.job_hold_evidence
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.job_holds h
      where h.id = hold_id
        and (
          auth.uid()::text = h.inspector_id::text
          or auth.uid()::text = h.builder_id::text
          or coalesce(
            auth.jwt() ->> 'role',
            auth.jwt() -> 'app_metadata' ->> 'role',
            auth.jwt() -> 'user_metadata' ->> 'role',
            ''
          ) = 'admin'
        )
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

  if coalesce(v_hold.status, '') not in ('hold_offered', 'hold_pending_builder_ack', 'hold_active') then
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
    status = 'hold_declined',
    builder_note = coalesce(p_builder_note, builder_note),
    builder_declined_at = v_now,
    hold_ended_at = coalesce(hold_ended_at, v_now),
    last_builder_response_at = v_now,
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
    coalesce(nullif(p_builder_note, ''), 'Builder declined Hold / Site Retainer terms'),
    v_now
  );

  return true;
end;
$$;

create or replace function public.escalate_aged_holds()
returns void
language plpgsql
security definer
as $$
declare
  v_hold record;
  v_now timestamptz := now();
begin
  for v_hold in
    select
      h.id as hold_id,
      h.job_id,
      h.expires_at,
      j.status as job_status
    from public.job_holds h
    join public.job_opportunities j on j.id = h.job_id
    where h.status in ('hold_offered', 'hold_pending_builder_ack')
      and h.expires_at < v_now
    for update of h
  loop
    update public.job_holds
    set
      status = 'hold_expired',
      expired_at = v_now,
      hold_ended_at = coalesce(hold_ended_at, v_now),
      updated_at = v_now
    where id = v_hold.hold_id;

    insert into public.job_status_events (
      job_id,
      actor_id,
      actor_role,
      from_status,
      to_status,
      reason,
      created_at
    ) values (
      v_hold.job_id,
      'system:hold_aging_cron',
      'system',
      v_hold.job_status,
      v_hold.job_status,
      'hold_aged_out',
      v_now
    );
  end loop;
end;
$$;

commit;
