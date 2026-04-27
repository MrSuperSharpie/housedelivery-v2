-- Automated Departure Assurance foundation.
--
-- Purpose: protect builder schedules without all-day inspector surveillance.
-- Monitoring is job-specific, time-limited, consent-backed, and scoped to
-- arrival assurance, reassignment support, auditability, and escrow protection.

create extension if not exists pgcrypto;

alter table public.notification_events
  add column if not exists dedupe_key text;

create unique index if not exists idx_notification_events_dedupe_key
  on public.notification_events(dedupe_key)
  where dedupe_key is not null;

alter table public.inspector_reliability_events
  drop constraint if exists inspector_reliability_events_event_type_check;

alter table public.inspector_reliability_events
  add constraint inspector_reliability_events_event_type_check
  check (event_type in (
    'claim_commitment_accepted',
    'assignment_confirmed',
    'pre_site_confirmation_sent',
    'pre_site_confirmation_completed',
    'pre_site_confirmation_missed',
    'en_route_marked',
    'arrival_confirmed',
    'completed_professional_work',
    'valid_cancellation',
    'invalid_late_cancellation',
    'no_show',
    'builder_site_not_ready',
    'standby_invited',
    'standby_assigned',
    'admin_override',
    'evidence_incomplete',
    'dispute_opened',
    'dispute_resolved_inspector_fault',
    'dispute_resolved_no_fault',
    'response_recorded',
    'CONFIRMATION_COMPLETED',
    'CONFIRMATION_MISSED',
    'DEPARTURE_CONFIRMED',
    'ARRIVAL_CONFIRMED',
    'LATE_ARRIVAL',
    'ON_TIME_ARRIVAL',
    'LATE_CANCELLATION',
    'NO_SHOW',
    'STANDBY_CANDIDATE_IDENTIFIED',
    'STANDBY_SOFT_ALERTED',
    'STANDBY_OFFERED',
    'STANDBY_ACCEPTED',
    'PRIMARY_REASSIGNED',
    'DEPARTURE_MONITORING_STARTED',
    'DEPARTURE_PREP_NOTIFICATION_SENT',
    'DEPARTURE_CRITICAL_NOTIFICATION_SENT',
    'DEPARTURE_HARD_PING_REQUIRED',
    'DEPARTURE_HARD_PING_RESPONDED',
    'DEPARTURE_PROTECTED_ISSUE_REPORTED',
    'DEPARTURE_RIPCORD_REASSIGNMENT_REQUESTED',
    'DEPARTURE_ROUTE_ETA_UPDATED',
    'DEPARTURE_MONITORING_STOPPED'
  ));

alter table public.job_opportunities
  add column if not exists departure_monitoring_state text not null default 'not_monitoring'
    check (departure_monitoring_state in ('not_monitoring', 'pending', 'monitoring', 'en_route_confirmed', 'hard_ping_required', 'reassignment_pending', 'stopped'));

create table if not exists public.inspector_tracking_acknowledgements (
  inspector_id uuid primary key,
  tracking_purpose_acknowledged boolean not null default false,
  tracking_window_acknowledged boolean not null default false,
  location_use_acknowledged boolean not null default false,
  location_retention_acknowledged boolean not null default false,
  acknowledged_policy_version text not null default 'departure-assurance-v1',
  acknowledged_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_tracking_acknowledgements_updated_at on public.inspector_tracking_acknowledgements;
create trigger trg_tracking_acknowledgements_updated_at
  before update on public.inspector_tracking_acknowledgements
  for each row execute function public.set_governance_updated_at();

alter table public.inspector_tracking_acknowledgements enable row level security;

drop policy if exists tracking_ack_self_or_admin_read on public.inspector_tracking_acknowledgements;
create policy tracking_ack_self_or_admin_read
  on public.inspector_tracking_acknowledgements for select to authenticated
  using (inspector_id = auth.uid() or public.current_jwt_role() = 'admin');

drop policy if exists tracking_ack_self_upsert on public.inspector_tracking_acknowledgements;
create policy tracking_ack_self_upsert
  on public.inspector_tracking_acknowledgements for insert to authenticated
  with check (inspector_id = auth.uid());

create table if not exists public.job_departure_monitoring_states (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_opportunities(id) on delete cascade,
  assignment_id uuid not null references public.job_assignments(id) on delete cascade,
  appointment_id uuid references public.inspection_appointments(id) on delete set null,
  inspector_id uuid not null,
  builder_id uuid,
  status text not null default 'pending'
    check (status in ('not_monitoring', 'pending', 'monitoring', 'en_route_confirmed', 'hard_ping_required', 'reassignment_pending', 'stopped')),
  confidence_status text not null default 'not_monitoring'
    check (confidence_status in ('not_monitoring', 'on_track', 'watch', 'at_risk', 'action_required', 'no_longer_feasible')),
  confidence_score integer not null default 0 check (confidence_score between 0 and 100),
  scheduled_start_at timestamptz not null,
  estimated_travel_seconds integer not null default 0,
  required_departure_at timestamptz not null,
  monitoring_starts_at timestamptz not null,
  monitoring_expires_at timestamptz not null,
  prep_notification_sent_at timestamptz,
  critical_notification_sent_at timestamptz,
  hard_ping_sent_at timestamptz,
  hard_ping_response_due_at timestamptz,
  hard_ping_responded_at timestamptz,
  hard_ping_response text
    check (hard_ping_response is null or hard_ping_response in ('yes_en_route', 'need_help', 'cannot_attend')),
  protected_issue_submitted boolean not null default false,
  protected_issue_reason text
    check (protected_issue_reason is null or protected_issue_reason in ('vehicle_issue', 'weather_road_closure', 'safety_concern', 'builder_access_issue', 'emergency', 'app_gps_issue', 'other')),
  route_opened_at timestamptz,
  location_permission_active boolean,
  last_route_estimated_at timestamptz,
  route_provider text,
  last_snapshot_id uuid,
  last_location_at timestamptz,
  previous_distance_to_site_meters numeric(10,2),
  last_distance_to_site_meters numeric(10,2),
  gps_accuracy_meters numeric(8,2),
  tracking_active boolean not null default false,
  tracking_purpose_acknowledged boolean not null default false,
  tracking_window_acknowledged boolean not null default false,
  location_use_acknowledged boolean not null default false,
  location_retention_acknowledged boolean not null default false,
  retention_policy text not null default 'retain operational events; expire raw snapshots after 30 days unless audit hold applies',
  admin_disabled_at timestamptz,
  stopped_at timestamptz,
  stop_reason text
    check (stop_reason is null or stop_reason in ('arrived', 'reassigned', 'cancelled', 'completed', 'window_expired', 'admin_disabled')),
  metadata jsonb not null default '{}'::jsonb,
  audit_trail jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(assignment_id)
);

drop trigger if exists trg_departure_monitoring_states_updated_at on public.job_departure_monitoring_states;
create trigger trg_departure_monitoring_states_updated_at
  before update on public.job_departure_monitoring_states
  for each row execute function public.set_governance_updated_at();

create index if not exists idx_departure_monitoring_due
  on public.job_departure_monitoring_states(status, monitoring_starts_at, required_departure_at)
  where status in ('pending', 'monitoring', 'hard_ping_required', 'en_route_confirmed');

create index if not exists idx_departure_monitoring_inspector
  on public.job_departure_monitoring_states(inspector_id, scheduled_start_at desc);

alter table public.job_departure_monitoring_states enable row level security;

drop policy if exists departure_monitoring_self_or_admin_read on public.job_departure_monitoring_states;
create policy departure_monitoring_self_or_admin_read
  on public.job_departure_monitoring_states for select to authenticated
  using (inspector_id = auth.uid() or public.current_jwt_role() = 'admin');

create table if not exists public.inspector_location_snapshots (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_opportunities(id) on delete cascade,
  assignment_id uuid not null references public.job_assignments(id) on delete cascade,
  monitoring_state_id uuid references public.job_departure_monitoring_states(id) on delete cascade,
  inspector_id uuid not null,
  captured_at timestamptz not null,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  accuracy_meters numeric(8,2),
  distance_to_site_meters numeric(10,2),
  location_permission_active boolean,
  route_opened boolean not null default false,
  source text not null default 'departure_assurance'
    check (source in ('departure_assurance', 'manual_fallback', 'arrival_check_in')),
  retention_expires_at timestamptz not null default now() + interval '30 days',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_location_snapshots_assignment_captured
  on public.inspector_location_snapshots(assignment_id, captured_at desc);

alter table public.inspector_location_snapshots enable row level security;

drop policy if exists location_snapshots_self_or_admin_read on public.inspector_location_snapshots;
create policy location_snapshots_self_or_admin_read
  on public.inspector_location_snapshots for select to authenticated
  using (inspector_id = auth.uid() or public.current_jwt_role() = 'admin');

create table if not exists public.departure_monitoring_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_opportunities(id) on delete cascade,
  assignment_id uuid references public.job_assignments(id) on delete set null,
  monitoring_state_id uuid references public.job_departure_monitoring_states(id) on delete cascade,
  inspector_id uuid,
  builder_id uuid,
  event_type text not null,
  actor_id text,
  actor_role text not null default 'system',
  confidence_score integer,
  confidence_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_departure_events_assignment_created
  on public.departure_monitoring_events(assignment_id, created_at desc);

alter table public.departure_monitoring_events enable row level security;

drop policy if exists departure_events_self_or_admin_read on public.departure_monitoring_events;
create policy departure_events_self_or_admin_read
  on public.departure_monitoring_events for select to authenticated
  using (inspector_id = auth.uid() or public.current_jwt_role() = 'admin');

create or replace function public.seed_departure_monitoring_state_for_assignment(
  p_assignment_id uuid,
  p_estimated_travel_seconds integer,
  p_monitoring_lead_minutes integer default 90,
  p_retention_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment record;
  v_appointment record;
  v_ack record;
  v_state record;
  v_required_departure_at timestamptz;
  v_now timestamptz := now();
begin
  select *
  into v_assignment
  from public.job_assignments
  where id = p_assignment_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Assignment not found.');
  end if;

  select *
  into v_appointment
  from public.inspection_appointments
  where assignment_id = p_assignment_id
  order by created_at desc
  limit 1;

  if not found or v_appointment.scheduled_start_at is null then
    return jsonb_build_object('ok', false, 'error', 'Scheduled appointment required for departure monitoring.');
  end if;

  select *
  into v_ack
  from public.inspector_tracking_acknowledgements
  where inspector_id = v_assignment.inspector_id;

  v_required_departure_at := v_appointment.scheduled_start_at - make_interval(secs => greatest(coalesce(p_estimated_travel_seconds, 0), 0));

  insert into public.job_departure_monitoring_states (
    job_id,
    assignment_id,
    appointment_id,
    inspector_id,
    builder_id,
    status,
    scheduled_start_at,
    estimated_travel_seconds,
    required_departure_at,
    monitoring_starts_at,
    monitoring_expires_at,
    tracking_purpose_acknowledged,
    tracking_window_acknowledged,
    location_use_acknowledged,
    location_retention_acknowledged,
    retention_policy,
    metadata,
    audit_trail
  )
  values (
    v_assignment.job_id,
    v_assignment.id,
    v_appointment.id,
    v_assignment.inspector_id,
    v_appointment.builder_id,
    'pending',
    v_appointment.scheduled_start_at,
    greatest(coalesce(p_estimated_travel_seconds, 0), 0),
    v_required_departure_at,
    v_required_departure_at - make_interval(mins => greatest(coalesce(p_monitoring_lead_minutes, 90), 0)),
    v_appointment.scheduled_start_at + interval '1 hour',
    coalesce(v_ack.tracking_purpose_acknowledged, false),
    coalesce(v_ack.tracking_window_acknowledged, false),
    coalesce(v_ack.location_use_acknowledged, false),
    coalesce(v_ack.location_retention_acknowledged, false),
    'retain raw snapshots until ' || (v_now + make_interval(days => greatest(coalesce(p_retention_days, 30), 1)))::text,
    jsonb_build_object('retentionDays', greatest(coalesce(p_retention_days, 30), 1)),
    jsonb_build_array(jsonb_build_object('event', 'departure_monitoring.seeded', 'at', v_now))
  )
  on conflict (assignment_id) do update
    set
      scheduled_start_at = excluded.scheduled_start_at,
      estimated_travel_seconds = excluded.estimated_travel_seconds,
      required_departure_at = excluded.required_departure_at,
      monitoring_starts_at = excluded.monitoring_starts_at,
      monitoring_expires_at = excluded.monitoring_expires_at,
      tracking_purpose_acknowledged = excluded.tracking_purpose_acknowledged,
      tracking_window_acknowledged = excluded.tracking_window_acknowledged,
      location_use_acknowledged = excluded.location_use_acknowledged,
      location_retention_acknowledged = excluded.location_retention_acknowledged,
      audit_trail = public.job_departure_monitoring_states.audit_trail || excluded.audit_trail,
      updated_at = v_now
  returning *
  into v_state;

  update public.job_opportunities
  set departure_monitoring_state = v_state.status
  where id = v_state.job_id;

  return jsonb_build_object(
    'ok', true,
    'monitoringStateId', v_state.id,
    'requiredDepartureAt', v_state.required_departure_at,
    'monitoringStartsAt', v_state.monitoring_starts_at
  );
end;
$$;

create or replace function public.record_departure_route_estimate(
  p_assignment_id uuid,
  p_estimated_travel_seconds integer,
  p_route_provider text default 'unconfigured',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state record;
  v_now timestamptz := now();
begin
  select *
  into v_state
  from public.job_departure_monitoring_states
  where assignment_id = p_assignment_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Departure monitoring state not found.');
  end if;

  update public.job_departure_monitoring_states
  set
    estimated_travel_seconds = greatest(coalesce(p_estimated_travel_seconds, 0), 0),
    required_departure_at = scheduled_start_at - make_interval(secs => greatest(coalesce(p_estimated_travel_seconds, 0), 0)),
    monitoring_starts_at = scheduled_start_at - make_interval(secs => greatest(coalesce(p_estimated_travel_seconds, 0), 0)) - interval '90 minutes',
    last_route_estimated_at = v_now,
    route_provider = p_route_provider,
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    audit_trail = audit_trail || jsonb_build_array(jsonb_build_object(
      'event', 'departure_monitoring.route_eta_updated',
      'at', v_now,
      'provider', p_route_provider,
      'estimatedTravelSeconds', greatest(coalesce(p_estimated_travel_seconds, 0), 0)
    )),
    updated_at = v_now
  where id = v_state.id
  returning *
  into v_state;

  insert into public.departure_monitoring_events (
    job_id,
    assignment_id,
    monitoring_state_id,
    inspector_id,
    builder_id,
    event_type,
    actor_role,
    metadata
  )
  values (
    v_state.job_id,
    v_state.assignment_id,
    v_state.id,
    v_state.inspector_id,
    v_state.builder_id,
    'departure_monitoring.route_eta_updated',
    'system',
    jsonb_build_object('provider', p_route_provider, 'estimatedTravelSeconds', v_state.estimated_travel_seconds)
  );

  return jsonb_build_object('ok', true, 'requiredDepartureAt', v_state.required_departure_at);
end;
$$;

create or replace function public.record_inspector_departure_location_snapshot(
  p_assignment_id uuid,
  p_latitude numeric,
  p_longitude numeric,
  p_accuracy_meters numeric default null,
  p_distance_to_site_meters numeric default null,
  p_captured_at timestamptz default now(),
  p_location_permission_active boolean default true,
  p_route_opened boolean default false,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_state record;
  v_snapshot record;
begin
  select *
  into v_state
  from public.job_departure_monitoring_states
  where assignment_id = p_assignment_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Departure monitoring state not found.');
  end if;

  if v_actor_id is null or v_actor_id <> v_state.inspector_id then
    return jsonb_build_object('ok', false, 'error', 'Not authorized to record departure monitoring location.');
  end if;

  if v_state.status not in ('pending', 'monitoring', 'en_route_confirmed', 'hard_ping_required') then
    return jsonb_build_object('ok', false, 'error', 'Departure monitoring is not active for this assignment.');
  end if;

  insert into public.inspector_location_snapshots (
    job_id,
    assignment_id,
    monitoring_state_id,
    inspector_id,
    captured_at,
    latitude,
    longitude,
    accuracy_meters,
    distance_to_site_meters,
    location_permission_active,
    route_opened,
    metadata
  )
  values (
    v_state.job_id,
    v_state.assignment_id,
    v_state.id,
    v_state.inspector_id,
    p_captured_at,
    p_latitude,
    p_longitude,
    p_accuracy_meters,
    p_distance_to_site_meters,
    p_location_permission_active,
    p_route_opened,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning *
  into v_snapshot;

  update public.job_departure_monitoring_states
  set
    last_snapshot_id = v_snapshot.id,
    last_location_at = p_captured_at,
    gps_accuracy_meters = p_accuracy_meters,
    previous_distance_to_site_meters = last_distance_to_site_meters,
    last_distance_to_site_meters = p_distance_to_site_meters,
    location_permission_active = p_location_permission_active,
    route_opened_at = case when p_route_opened then coalesce(route_opened_at, p_captured_at) else route_opened_at end,
    tracking_active = true,
    updated_at = now()
  where id = v_state.id;

  return jsonb_build_object('ok', true, 'snapshotId', v_snapshot.id);
end;
$$;

create or replace function public.process_departure_monitoring(
  p_as_of timestamptz default now(),
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state record;
  v_processed integer := 0;
  v_prep_count integer := 0;
  v_critical_count integer := 0;
  v_hard_ping_count integer := 0;
  v_reassignment_count integer := 0;
begin
  for v_state in
    select s.*
    from public.job_departure_monitoring_states s
    left join public.inspection_appointments ia on ia.id = s.appointment_id
    where s.status in ('pending', 'monitoring', 'en_route_confirmed', 'hard_ping_required')
      and coalesce(ia.status, 'scheduled') not in ('cancelled', 'completed', 'no_show', 'reassigned')
      and s.admin_disabled_at is null
      and s.monitoring_starts_at <= p_as_of
      and s.monitoring_expires_at >= p_as_of
    order by s.required_departure_at asc
    limit greatest(coalesce(p_limit, 50), 1)
    for update of s skip locked
  loop
    v_processed := v_processed + 1;

    if v_state.status = 'pending' then
      update public.job_departure_monitoring_states
      set
        status = 'monitoring',
        confidence_status = case when confidence_score >= 75 then 'on_track' else 'watch' end,
        tracking_active = true,
        audit_trail = audit_trail || jsonb_build_array(jsonb_build_object('event', 'departure_monitoring.started', 'at', p_as_of)),
        updated_at = p_as_of
      where id = v_state.id;

      update public.job_opportunities
      set departure_monitoring_state = 'monitoring'
      where id = v_state.job_id;

      insert into public.departure_monitoring_events (
        job_id,
        assignment_id,
        monitoring_state_id,
        inspector_id,
        builder_id,
        event_type,
        actor_role,
        confidence_score,
        confidence_status
      )
      values (
        v_state.job_id,
        v_state.assignment_id,
        v_state.id,
        v_state.inspector_id,
        v_state.builder_id,
        'departure_monitoring.started',
        'system',
        v_state.confidence_score,
        v_state.confidence_status
      );
    end if;

    if v_state.prep_notification_sent_at is null
      and p_as_of >= v_state.required_departure_at - interval '15 minutes'
    then
      insert into public.notification_events (
        event_key,
        dedupe_key,
        recipient_user_id,
        recipient_role,
        channel,
        payload,
        scheduled_for
      )
      values (
        'inspector.departure_prep',
        'departure-prep:' || v_state.assignment_id::text,
        v_state.inspector_id,
        'inspector',
        'push',
        jsonb_build_object(
          'jobId', v_state.job_id,
          'assignmentId', v_state.assignment_id,
          'copy', 'Current traffic suggests you should prepare to leave soon to arrive on time.'
        ),
        p_as_of
      )
      on conflict (dedupe_key) do nothing;

      update public.job_departure_monitoring_states
      set prep_notification_sent_at = p_as_of
      where id = v_state.id
        and prep_notification_sent_at is null;

      v_prep_count := v_prep_count + 1;
    end if;

    if v_state.critical_notification_sent_at is null
      and p_as_of >= v_state.required_departure_at
    then
      insert into public.notification_events (
        event_key,
        dedupe_key,
        recipient_user_id,
        recipient_role,
        channel,
        payload,
        scheduled_for
      )
      values (
        'inspector.departure_critical',
        'departure-critical:' || v_state.assignment_id::text,
        v_state.inspector_id,
        'inspector',
        'push',
        jsonb_build_object(
          'jobId', v_state.job_id,
          'assignmentId', v_state.assignment_id,
          'copy', 'To protect your scheduled arrival window, please begin your route now.'
        ),
        p_as_of
      )
      on conflict (dedupe_key) do nothing;

      update public.job_departure_monitoring_states
      set critical_notification_sent_at = p_as_of
      where id = v_state.id
        and critical_notification_sent_at is null;

      v_critical_count := v_critical_count + 1;
    end if;

    if v_state.hard_ping_sent_at is null
      and p_as_of >= v_state.required_departure_at + interval '10 minutes'
      and v_state.confidence_score < 55
      and v_state.confidence_status in ('at_risk', 'action_required', 'no_longer_feasible', 'watch')
    then
      insert into public.notification_events (
        event_key,
        dedupe_key,
        recipient_user_id,
        recipient_role,
        channel,
        payload,
        scheduled_for
      )
      values (
        'inspector.departure_hard_ping',
        'departure-hard-ping:' || v_state.assignment_id::text,
        v_state.inspector_id,
        'inspector',
        'push',
        jsonb_build_object(
          'jobId', v_state.job_id,
          'assignmentId', v_state.assignment_id,
          'copy', 'Your departure window has passed. Are you still able to attend this inspection?',
          'actions', jsonb_build_array('yes_en_route', 'need_help', 'cannot_attend')
        ),
        p_as_of
      )
      on conflict (dedupe_key) do nothing;

      update public.job_departure_monitoring_states
      set
        status = 'hard_ping_required',
        hard_ping_sent_at = p_as_of,
        hard_ping_response_due_at = p_as_of + interval '5 minutes',
        confidence_status = case when confidence_status = 'no_longer_feasible' then 'no_longer_feasible' else 'action_required' end,
        updated_at = p_as_of
      where id = v_state.id
        and hard_ping_sent_at is null;

      update public.job_opportunities
      set departure_monitoring_state = 'hard_ping_required'
      where id = v_state.job_id;

      v_hard_ping_count := v_hard_ping_count + 1;
    end if;

    if p_as_of >= v_state.required_departure_at + interval '15 minutes'
      and v_state.protected_issue_submitted is false
      and (
        v_state.confidence_status = 'no_longer_feasible'
        or (
          v_state.status = 'hard_ping_required'
          and v_state.hard_ping_response_due_at is not null
          and p_as_of >= v_state.hard_ping_response_due_at
        )
      )
    then
      update public.job_departure_monitoring_states
      set
        status = 'reassignment_pending',
        tracking_active = false,
        audit_trail = audit_trail || jsonb_build_array(jsonb_build_object('event', 'departure_monitoring.ripcord_reassignment_requested', 'at', p_as_of)),
        updated_at = p_as_of
      where id = v_state.id
        and status <> 'reassignment_pending';

      update public.job_opportunities
      set departure_monitoring_state = 'reassignment_pending'
      where id = v_state.job_id;

      perform public.activate_standby_candidates(v_state.assignment_id, 'critical_confirmation_miss', false);

      insert into public.departure_monitoring_events (
        job_id,
        assignment_id,
        monitoring_state_id,
        inspector_id,
        builder_id,
        event_type,
        actor_role,
        confidence_score,
        confidence_status,
        metadata
      )
      values (
        v_state.job_id,
        v_state.assignment_id,
        v_state.id,
        v_state.inspector_id,
        v_state.builder_id,
        'departure_monitoring.ripcord_reassignment_requested',
        'system',
        v_state.confidence_score,
        v_state.confidence_status,
        jsonb_build_object('reason', 'hard_ping_no_response_or_no_longer_feasible')
      );

      v_reassignment_count := v_reassignment_count + 1;
    end if;
  end loop;

  update public.job_departure_monitoring_states s
  set
    status = 'stopped',
    tracking_active = false,
    stopped_at = p_as_of,
    stop_reason = case
      when ia.status in ('arrived', 'in_progress') then 'arrived'
      when ia.status = 'reassigned' then 'reassigned'
      when ia.status = 'cancelled' then 'cancelled'
      when ia.status = 'completed' then 'completed'
      else 'window_expired'
    end,
    updated_at = p_as_of
  from public.inspection_appointments ia
  where ia.id = s.appointment_id
    and s.status <> 'stopped'
    and (
      ia.status in ('arrived', 'in_progress', 'reassigned', 'cancelled', 'completed')
      or s.monitoring_expires_at < p_as_of
    );

  return jsonb_build_object(
    'ok', true,
    'processedCount', v_processed,
    'prepNotificationCount', v_prep_count,
    'criticalNotificationCount', v_critical_count,
    'hardPingCount', v_hard_ping_count,
    'reassignmentRequestCount', v_reassignment_count
  );
end;
$$;

create or replace function public.record_departure_hard_ping_response(
  p_assignment_id uuid,
  p_action text,
  p_issue_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_state record;
  v_now timestamptz := now();
begin
  select *
  into v_state
  from public.job_departure_monitoring_states
  where assignment_id = p_assignment_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Departure monitoring state not found.');
  end if;

  if v_actor_id is null or v_actor_id <> v_state.inspector_id then
    return jsonb_build_object('ok', false, 'error', 'Not authorized to respond to this departure prompt.');
  end if;

  if p_action not in ('yes_en_route', 'need_help', 'cannot_attend') then
    return jsonb_build_object('ok', false, 'error', 'Unsupported hard ping response.');
  end if;

  update public.job_departure_monitoring_states
  set
    status = case
      when p_action = 'yes_en_route' then 'en_route_confirmed'
      when p_action = 'cannot_attend' then 'reassignment_pending'
      else 'hard_ping_required'
    end,
    hard_ping_response = p_action,
    hard_ping_responded_at = v_now,
    protected_issue_submitted = p_action = 'need_help',
    protected_issue_reason = case when p_action = 'need_help' then p_issue_reason else protected_issue_reason end,
    tracking_active = p_action <> 'cannot_attend',
    audit_trail = audit_trail || jsonb_build_array(jsonb_build_object(
      'event', 'departure_monitoring.hard_ping_response',
      'at', v_now,
      'action', p_action,
      'issueReason', p_issue_reason
    )),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
    updated_at = v_now
  where id = v_state.id;

  if p_action = 'yes_en_route' then
    update public.job_assignments
    set en_route_at = coalesce(en_route_at, v_now), updated_at = v_now
    where id = v_state.assignment_id;

    insert into public.notification_events (
      event_key,
      dedupe_key,
      recipient_user_id,
      recipient_role,
      channel,
      payload,
      scheduled_for
    )
    values (
      'builder.departure_en_route_confirmed',
      'builder-departure-en-route:' || v_state.assignment_id::text,
      v_state.builder_id,
      'builder',
      'in_app',
      jsonb_build_object(
        'jobId', v_state.job_id,
        'assignmentId', v_state.assignment_id,
        'copy', 'Your inspection remains scheduled. Vero is monitoring the appointment and will notify you if anything changes.'
      ),
      v_now
    )
    on conflict (dedupe_key) do nothing;
  elsif p_action = 'need_help' then
    insert into public.notification_events (
      event_key,
      dedupe_key,
      recipient_role,
      channel,
      payload,
      scheduled_for
    )
    values (
      'admin.departure_help_requested',
      'admin-departure-help:' || v_state.assignment_id::text,
      'admin',
      'in_app',
      jsonb_build_object(
        'jobId', v_state.job_id,
        'assignmentId', v_state.assignment_id,
        'inspectorId', v_state.inspector_id,
        'issueReason', p_issue_reason
      ),
      v_now
    )
    on conflict (dedupe_key) do nothing;
  elsif p_action = 'cannot_attend' then
    perform public.activate_standby_candidates(v_state.assignment_id, 'critical_confirmation_miss', false);
  end if;

  insert into public.departure_monitoring_events (
    job_id,
    assignment_id,
    monitoring_state_id,
    inspector_id,
    builder_id,
    event_type,
    actor_id,
    actor_role,
    confidence_score,
    confidence_status,
    metadata
  )
  values (
    v_state.job_id,
    v_state.assignment_id,
    v_state.id,
    v_state.inspector_id,
    v_state.builder_id,
    'departure_monitoring.hard_ping_response',
    v_actor_id::text,
    'inspector',
    v_state.confidence_score,
    v_state.confidence_status,
    jsonb_build_object('action', p_action, 'issueReason', p_issue_reason)
  );

  return jsonb_build_object(
    'ok', true,
    'action', p_action,
    'beginReassignment', p_action = 'cannot_attend',
    'autoPenaltyApplied', false
  );
end;
$$;

create or replace function public.atomic_departure_reassign_to_standby(
  p_assignment_id uuid,
  p_standby_invite_id uuid,
  p_reason text default 'departure_ripcord'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text := coalesce(public.current_jwt_role(), 'system');
  v_original_assignment record;
  v_original_appointment record;
  v_invite record;
  v_new_assignment record;
  v_now timestamptz := now();
begin
  select *
  into v_original_assignment
  from public.job_assignments
  where id = p_assignment_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Original assignment not found.');
  end if;

  if v_original_assignment.status not in ('confirmed', 'pending', 'provisionally_assigned') then
    return jsonb_build_object('ok', false, 'error', 'Assignment is not in a revocable state.');
  end if;

  select *
  into v_invite
  from public.standby_inspector_invites
  where id = p_standby_invite_id
    and original_assignment_id = p_assignment_id
  for update;

  if not found or v_invite.status <> 'accepted' then
    return jsonb_build_object('ok', false, 'error', 'Accepted standby invite required for atomic reassignment.');
  end if;

  if exists (
    select 1
    from public.job_assignments ja
    where ja.job_id = v_original_assignment.job_id
      and ja.status = 'confirmed'
      and ja.id <> v_original_assignment.id
  ) then
    return jsonb_build_object('ok', false, 'error', 'Job already has a confirmed replacement assignment.');
  end if;

  select *
  into v_original_appointment
  from public.inspection_appointments
  where assignment_id = v_original_assignment.id
  order by created_at desc
  limit 1
  for update;

  update public.job_assignments
  set status = 'cancelled', confirmation_status = 'missed', updated_at = v_now
  where id = v_original_assignment.id;

  update public.inspection_appointments
  set status = 'reassigned', updated_at = v_now
  where assignment_id = v_original_assignment.id;

  insert into public.job_assignments (
    job_id,
    inspector_id,
    assigned_by,
    assigned_at,
    status,
    objection_window_closes_at,
    claimed_slot,
    escrow_amount,
    escrow_status,
    commitment_accepted,
    commitment_version,
    commitment_accepted_at,
    scheduled_start_at,
    scheduled_end_at,
    confirmation_status,
    inspector_confirmed_at,
    updated_at
  )
  values (
    v_original_assignment.job_id,
    v_invite.inspector_id,
    v_invite.inspector_id,
    v_now,
    'confirmed',
    v_now,
    v_original_assignment.claimed_slot,
    v_original_assignment.escrow_amount,
    coalesce(v_original_assignment.escrow_status, 'held'),
    true,
    coalesce(v_original_assignment.commitment_version, 'reliability-commitment-v1'),
    v_now,
    v_original_assignment.scheduled_start_at,
    v_original_assignment.scheduled_end_at,
    'confirmed',
    v_now,
    v_now
  )
  returning *
  into v_new_assignment;

  update public.standby_inspector_invites
  set status = case when id = v_invite.id then 'assigned' else 'expired' end,
      audit_trail = audit_trail || jsonb_build_array(jsonb_build_object('event', 'departure_atomic_reassignment', 'at', v_now))
  where original_assignment_id = p_assignment_id
    and status in ('accepted', 'offered', 'soft_alerted', 'identified');

  update public.job_departure_monitoring_states
  set
    status = 'stopped',
    tracking_active = false,
    stopped_at = v_now,
    stop_reason = 'reassigned',
    audit_trail = audit_trail || jsonb_build_array(jsonb_build_object('event', 'departure_monitoring.atomic_reassigned', 'at', v_now, 'standbyInviteId', p_standby_invite_id)),
    updated_at = v_now
  where assignment_id = p_assignment_id;

  update public.job_opportunities
  set
    claimed_by = v_invite.inspector_id::text,
    departure_monitoring_state = 'stopped',
    updated_at = v_now
  where id = v_original_assignment.job_id;

  insert into public.inspector_reliability_events (
    inspector_id,
    job_id,
    assignment_id,
    event_type,
    score_delta,
    actor_id,
    actor_role,
    admin_review_status,
    metadata
  )
  values
    (
      v_original_assignment.inspector_id,
      v_original_assignment.job_id,
      v_original_assignment.id,
      'DEPARTURE_RIPCORD_REASSIGNMENT_REQUESTED',
      -5,
      'system',
      'system',
      'pending',
      jsonb_build_object('reason', p_reason, 'standbyInviteId', p_standby_invite_id)
    ),
    (
      v_invite.inspector_id,
      v_original_assignment.job_id,
      v_new_assignment.id,
      'standby_assigned',
      1,
      'system',
      'system',
      'none',
      jsonb_build_object('sourceAssignmentId', p_assignment_id, 'standbyInviteId', p_standby_invite_id)
    );

  insert into public.notification_events (
    event_key,
    dedupe_key,
    recipient_user_id,
    recipient_role,
    channel,
    payload,
    scheduled_for
  )
  values
    (
      'builder.departure_reassignment_started',
      'builder-departure-reassignment:' || p_assignment_id::text,
      v_original_appointment.builder_id,
      'builder',
      'in_app',
      jsonb_build_object(
        'jobId', v_original_assignment.job_id,
        'assignmentId', v_new_assignment.id,
        'copy', 'Vero has begun reassignment support for your inspection. We are prioritizing qualified backup inspectors who match the required credential, region, and inspection stage.'
      ),
      v_now
    ),
    (
      'inspector.standby_assignment_confirmed',
      'inspector-standby-confirmed:' || v_new_assignment.id::text,
      v_invite.inspector_id,
      'inspector',
      'in_app',
      jsonb_build_object('jobId', v_original_assignment.job_id, 'assignmentId', v_new_assignment.id),
      v_now
    )
  on conflict (dedupe_key) do nothing;

  insert into public.governance_audit_events (
    entity_type,
    entity_id,
    action,
    actor_id,
    actor_role,
    reason,
    before_state,
    after_state,
    metadata
  )
  values (
    'job_assignment',
    p_assignment_id::text,
    'departure_monitoring.atomic_reassigned',
    'system',
    v_actor_role,
    p_reason,
    to_jsonb(v_original_assignment),
    jsonb_build_object('newAssignmentId', v_new_assignment.id, 'standbyInviteId', p_standby_invite_id),
    jsonb_build_object('source', 'automated_departure_assurance')
  );

  return jsonb_build_object('ok', true, 'newAssignmentId', v_new_assignment.id, 'standbyInspectorId', v_invite.inspector_id);
end;
$$;

grant execute on function public.seed_departure_monitoring_state_for_assignment(uuid, integer, integer, integer) to authenticated;
grant execute on function public.record_departure_route_estimate(uuid, integer, text, jsonb) to authenticated;
grant execute on function public.record_inspector_departure_location_snapshot(uuid, numeric, numeric, numeric, numeric, timestamptz, boolean, boolean, jsonb) to authenticated;
grant execute on function public.process_departure_monitoring(timestamptz, integer) to authenticated;
grant execute on function public.record_departure_hard_ping_response(uuid, text, text, jsonb) to authenticated;
grant execute on function public.atomic_departure_reassign_to_standby(uuid, uuid, text) to authenticated;
