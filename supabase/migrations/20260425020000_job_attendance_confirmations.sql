-- Vero Permit pre-site attendance confirmation ladder.
--
-- LEGAL REVIEW REQUIRED before missed checkpoints are used for automatic
-- reserve, payout holdback, account restriction, or removal decisions.
--
-- Scheduler wiring: no dedicated cron table exists in this repo yet. Run
-- public.process_due_attendance_confirmations() every 1-5 minutes from
-- Supabase cron, pg_cron, or the external queue worker that drains
-- notification_events.

create extension if not exists pgcrypto;

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
    'CONFIRMATION_COMPLETED',
    'CONFIRMATION_MISSED',
    'DEPARTURE_CONFIRMED',
    'ARRIVAL_CONFIRMED',
    'LATE_ARRIVAL',
    'ON_TIME_ARRIVAL'
  ));

create table if not exists public.job_attendance_confirmations (
  id uuid primary key default gen_random_uuid(),
  confirmation_token text not null default (
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  ) unique,
  job_id uuid not null references public.job_opportunities(id) on delete cascade,
  assignment_id uuid not null references public.job_assignments(id) on delete cascade,
  appointment_id uuid references public.inspection_appointments(id) on delete cascade,
  inspector_id uuid not null,
  builder_id uuid,
  checkpoint text not null
    check (checkpoint in ('initial_claim', 't_24h', 't_4h', 't_90m', 'departure', 'arrival')),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'missed', 'not_required', 'cancelled')),
  escalation_status text not null default 'none'
    check (escalation_status in ('none', 'at_risk', 'admin_alerted', 'standby_prepared', 'standby_activation_requested')),
  required_at timestamptz,
  scheduled_start_at timestamptz,
  reminder_scheduled_at timestamptz,
  reminder_sent_at timestamptz,
  confirmed_at timestamptz,
  missed_at timestamptz,
  confirmation_method text
    check (confirmation_method is null or confirmation_method in ('claim_commitment', 'manual', 'notification_link', 'system', 'geo_fence')),
  latitude numeric(10,7),
  longitude numeric(10,7),
  accuracy_meters numeric(8,2),
  proximity_status text
    check (proximity_status is null or proximity_status in ('not_checked', 'within_range', 'outside_range', 'manual_evidence_required')),
  distance_from_site_meters numeric(10,2),
  evidence_required boolean not null default false,
  evidence jsonb not null default '{}'::jsonb,
  critical_alert_on_miss boolean not null default false,
  standby_prepare_on_miss boolean not null default false,
  standby_activate_on_miss boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(assignment_id, checkpoint)
);

drop trigger if exists trg_job_attendance_confirmations_updated_at on public.job_attendance_confirmations;
create trigger trg_job_attendance_confirmations_updated_at
  before update on public.job_attendance_confirmations
  for each row execute function public.set_governance_updated_at();

create index if not exists idx_attendance_confirmations_due
  on public.job_attendance_confirmations(status, required_at)
  where status = 'pending';

create index if not exists idx_attendance_confirmations_inspector_due
  on public.job_attendance_confirmations(inspector_id, status, required_at);

create index if not exists idx_attendance_confirmations_job
  on public.job_attendance_confirmations(job_id, checkpoint);

alter table public.job_attendance_confirmations enable row level security;

drop policy if exists attendance_confirmations_self_or_admin_read on public.job_attendance_confirmations;
create policy attendance_confirmations_self_or_admin_read
  on public.job_attendance_confirmations for select to authenticated
  using (
    inspector_id = auth.uid()
    or coalesce(
      auth.jwt() ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    ) = 'admin'
  );

create or replace function public.seed_job_attendance_confirmation_ladder(
  p_job_id uuid,
  p_assignment_id uuid,
  p_appointment_id uuid,
  p_inspector_id uuid,
  p_builder_id uuid,
  p_scheduled_start_at timestamptz,
  p_claimed_at timestamptz default now(),
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.job_attendance_confirmations (
    job_id,
    assignment_id,
    appointment_id,
    inspector_id,
    builder_id,
    checkpoint,
    status,
    required_at,
    scheduled_start_at,
    reminder_scheduled_at,
    confirmed_at,
    confirmation_method,
    critical_alert_on_miss,
    standby_prepare_on_miss,
    standby_activate_on_miss,
    metadata
  )
  values
    (
      p_job_id,
      p_assignment_id,
      p_appointment_id,
      p_inspector_id,
      p_builder_id,
      'initial_claim',
      'confirmed',
      p_claimed_at,
      p_scheduled_start_at,
      null,
      p_claimed_at,
      'claim_commitment',
      false,
      false,
      false,
      p_metadata || jsonb_build_object('label', 'Initial at Claim')
    ),
    (
      p_job_id,
      p_assignment_id,
      p_appointment_id,
      p_inspector_id,
      p_builder_id,
      't_24h',
      case
        when p_scheduled_start_at is null then 'not_required'
        when p_scheduled_start_at - interval '24 hours' <= p_claimed_at then 'not_required'
        else 'pending'
      end,
      case when p_scheduled_start_at is null then null else p_scheduled_start_at - interval '24 hours' end,
      p_scheduled_start_at,
      case when p_scheduled_start_at is null then null else p_scheduled_start_at - interval '24 hours' end,
      null,
      null,
      false,
      false,
      false,
      p_metadata || jsonb_build_object('label', 'T-24h Soft Check')
    ),
    (
      p_job_id,
      p_assignment_id,
      p_appointment_id,
      p_inspector_id,
      p_builder_id,
      't_4h',
      case
        when p_scheduled_start_at is null then 'not_required'
        when p_scheduled_start_at - interval '4 hours' <= p_claimed_at then 'not_required'
        else 'pending'
      end,
      case when p_scheduled_start_at is null then null else p_scheduled_start_at - interval '4 hours' end,
      p_scheduled_start_at,
      case when p_scheduled_start_at is null then null else p_scheduled_start_at - interval '4 hours' end,
      null,
      null,
      true,
      true,
      false,
      p_metadata || jsonb_build_object('label', 'T-4h Critical Alert')
    ),
    (
      p_job_id,
      p_assignment_id,
      p_appointment_id,
      p_inspector_id,
      p_builder_id,
      't_90m',
      case
        when p_scheduled_start_at is null then 'not_required'
        when p_scheduled_start_at - interval '90 minutes' <= p_claimed_at then 'not_required'
        else 'pending'
      end,
      case when p_scheduled_start_at is null then null else p_scheduled_start_at - interval '90 minutes' end,
      p_scheduled_start_at,
      case when p_scheduled_start_at is null then null else p_scheduled_start_at - interval '90 minutes' end,
      null,
      null,
      true,
      true,
      true,
      p_metadata || jsonb_build_object('label', 'T-90m Go/No-Go')
    ),
    (
      p_job_id,
      p_assignment_id,
      p_appointment_id,
      p_inspector_id,
      p_builder_id,
      'departure',
      case when p_scheduled_start_at is null then 'not_required' else 'pending' end,
      case when p_scheduled_start_at is null then null else p_scheduled_start_at - interval '90 minutes' end,
      p_scheduled_start_at,
      null,
      null,
      null,
      false,
      false,
      false,
      p_metadata || jsonb_build_object('label', 'Departure Manual Trigger')
    ),
    (
      p_job_id,
      p_assignment_id,
      p_appointment_id,
      p_inspector_id,
      p_builder_id,
      'arrival',
      case when p_scheduled_start_at is null then 'not_required' else 'pending' end,
      p_scheduled_start_at,
      p_scheduled_start_at,
      null,
      null,
      null,
      false,
      false,
      false,
      p_metadata || jsonb_build_object('label', 'Arrival Geo-fenced Check')
    )
  on conflict (assignment_id, checkpoint) do nothing;

  insert into public.notification_events (
    event_key,
    recipient_user_id,
    recipient_role,
    channel,
    payload,
    scheduled_for
  )
  select
    'inspector.attendance_confirmation_reminder',
    c.inspector_id,
    'inspector',
    'in_app',
    jsonb_build_object(
      'jobId', c.job_id,
      'assignmentId', c.assignment_id,
      'appointmentId', c.appointment_id,
      'confirmationId', c.id,
      'confirmationToken', c.confirmation_token,
      'checkpoint', c.checkpoint,
      'requiredAt', c.required_at,
      'copy', 'Please reconfirm your Vero inspection appointment. Reliable attendance improves your Vero tier, job access, and payout speed.'
    ),
    c.reminder_scheduled_at
  from public.job_attendance_confirmations c
  where c.assignment_id = p_assignment_id
    and c.status = 'pending'
    and c.reminder_scheduled_at is not null
    and c.checkpoint in ('t_24h', 't_4h', 't_90m');

  if p_builder_id is not null then
    insert into public.notification_events (
      event_key,
      recipient_user_id,
      recipient_role,
      channel,
      payload,
      scheduled_for
    )
    values (
      'builder.inspection_confirmed_monitoring',
      p_builder_id,
      'builder',
      'in_app',
      jsonb_build_object(
        'jobId', p_job_id,
        'assignmentId', p_assignment_id,
        'appointmentId', p_appointment_id,
        'copy', 'Your inspection is confirmed. Vero is monitoring the appointment and will notify you if anything changes.'
      ),
      p_claimed_at
    );
  end if;
end;
$$;

create or replace function public.record_job_attendance_confirmation(
  p_confirmation_id uuid,
  p_confirmation_token text default null,
  p_method text default 'manual',
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_accuracy_meters numeric default null,
  p_eta_minutes integer default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_confirmation record;
  v_actor_id uuid := auth.uid();
  v_now timestamptz := now();
  v_site_lat numeric;
  v_site_lng numeric;
  v_distance numeric;
  v_proximity_status text := 'not_checked';
  v_evidence_required boolean := false;
  v_arrival_event_type text;
  v_job record;
  v_required_action text;
  v_authority_check jsonb;
begin
  select *
  into v_confirmation
  from public.job_attendance_confirmations
  where id = p_confirmation_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Attendance confirmation not found.');
  end if;

  if not (
    (v_actor_id is not null and v_confirmation.inspector_id = v_actor_id)
    or (p_confirmation_token is not null and p_confirmation_token = v_confirmation.confirmation_token)
  ) then
    return jsonb_build_object('ok', false, 'error', 'Not authorized to confirm this checkpoint.');
  end if;

  if v_confirmation.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'Checkpoint is not pending.');
  end if;

  if v_confirmation.checkpoint in ('departure', 'arrival') then
    select *
    into v_job
    from public.job_opportunities
    where id = v_confirmation.job_id;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'Job not found for attendance confirmation.');
    end if;

    v_required_action := case
      when v_job.requires_professional_seal = true then 'design_signoff'
      else 'field_review'
    end;

    v_authority_check := public.check_credential_authority(
      v_confirmation.inspector_id::text,
      v_job.required_discipline::text,
      v_required_action
    );

    if (v_authority_check ->> 'ok')::boolean is not true then
      update public.job_attendance_confirmations
      set
        metadata = metadata || jsonb_build_object(
          'credentialContinuityCheckedAt', v_now,
          'credentialContinuityStatus', 'failed',
          'credentialContinuityError', coalesce(v_authority_check ->> 'error', 'Credential authority check failed')
        ),
        updated_at = v_now
      where id = v_confirmation.id;

      insert into public.notification_events (
        event_key,
        recipient_role,
        channel,
        payload,
        scheduled_for
      )
      values (
        'admin.credential_continuity_failed',
        'admin',
        'in_app',
        jsonb_build_object(
          'jobId', v_confirmation.job_id,
          'assignmentId', v_confirmation.assignment_id,
          'appointmentId', v_confirmation.appointment_id,
          'inspectorId', v_confirmation.inspector_id,
          'checkpoint', v_confirmation.checkpoint,
          'error', coalesce(v_authority_check ->> 'error', 'Credential authority check failed')
        ),
        v_now
      );

      return jsonb_build_object(
        'ok', false,
        'error', 'Credential authority must be current before departure or arrival check-in.',
        'requiresAdminReview', true
      );
    end if;
  end if;

  if v_confirmation.checkpoint = 'arrival' then
    v_site_lat := coalesce(
      nullif(p_metadata ->> 'siteLatitude', '')::numeric,
      nullif(v_confirmation.metadata ->> 'siteLatitude', '')::numeric
    );
    v_site_lng := coalesce(
      nullif(p_metadata ->> 'siteLongitude', '')::numeric,
      nullif(v_confirmation.metadata ->> 'siteLongitude', '')::numeric
    );

    if p_latitude is not null and p_longitude is not null and v_site_lat is not null and v_site_lng is not null then
      v_distance := 6371000 * 2 * asin(sqrt(
        power(sin(radians((p_latitude - v_site_lat) / 2)), 2)
        + cos(radians(v_site_lat)) * cos(radians(p_latitude))
        * power(sin(radians((p_longitude - v_site_lng) / 2)), 2)
      ));
      v_proximity_status := case when v_distance <= 250 then 'within_range' else 'outside_range' end;
      v_evidence_required := v_distance > 250;
    else
      v_proximity_status := 'manual_evidence_required';
      v_evidence_required := true;
    end if;
  end if;

  update public.job_attendance_confirmations
  set
    status = 'confirmed',
    confirmed_at = v_now,
    confirmation_method = p_method,
    latitude = p_latitude,
    longitude = p_longitude,
    accuracy_meters = p_accuracy_meters,
    proximity_status = case when v_confirmation.checkpoint = 'arrival' then v_proximity_status else proximity_status end,
    distance_from_site_meters = case when v_confirmation.checkpoint = 'arrival' then v_distance else distance_from_site_meters end,
    evidence_required = case when v_confirmation.checkpoint = 'arrival' then v_evidence_required else evidence_required end,
    evidence = evidence || coalesce(p_metadata -> 'evidence', '{}'::jsonb),
    metadata = metadata || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('etaMinutes', p_eta_minutes),
    updated_at = v_now
  where id = p_confirmation_id;

  if v_confirmation.checkpoint in ('t_24h', 't_4h', 't_90m') then
    update public.job_assignments
    set confirmation_status = 'confirmed', inspector_confirmed_at = v_now, updated_at = v_now
    where id = v_confirmation.assignment_id;

    update public.inspection_appointments
    set confirmation_status = 'confirmed', inspector_confirmed_at = v_now, updated_at = v_now
    where id = v_confirmation.appointment_id;

    insert into public.inspector_reliability_events (
      inspector_id,
      job_id,
      assignment_id,
      appointment_id,
      event_type,
      score_delta,
      actor_id,
      actor_role,
      metadata
    )
    values (
      v_confirmation.inspector_id,
      v_confirmation.job_id,
      v_confirmation.assignment_id,
      v_confirmation.appointment_id,
      'CONFIRMATION_COMPLETED',
      0.5,
      coalesce(v_actor_id::text, 'notification_link'),
      'inspector',
      jsonb_build_object('checkpoint', v_confirmation.checkpoint, 'method', p_method)
    );
  elsif v_confirmation.checkpoint = 'departure' then
    update public.job_assignments
    set en_route_at = v_now, updated_at = v_now
    where id = v_confirmation.assignment_id;

    update public.inspection_appointments
    set status = 'en_route', en_route_at = v_now, updated_at = v_now
    where id = v_confirmation.appointment_id;

    insert into public.inspector_reliability_events (
      inspector_id,
      job_id,
      assignment_id,
      appointment_id,
      event_type,
      score_delta,
      actor_id,
      actor_role,
      metadata
    )
    values (
      v_confirmation.inspector_id,
      v_confirmation.job_id,
      v_confirmation.assignment_id,
      v_confirmation.appointment_id,
      'DEPARTURE_CONFIRMED',
      0.5,
      coalesce(v_actor_id::text, 'notification_link'),
      'inspector',
      jsonb_build_object('checkpoint', v_confirmation.checkpoint, 'method', p_method, 'etaMinutes', p_eta_minutes)
    );

    if v_confirmation.builder_id is not null then
      insert into public.notification_events (
        event_key,
        recipient_user_id,
        recipient_role,
        channel,
        payload,
        scheduled_for
      )
      values (
        'builder.inspector_departure_confirmed',
        v_confirmation.builder_id,
        'builder',
        'in_app',
        jsonb_build_object(
          'jobId', v_confirmation.job_id,
          'assignmentId', v_confirmation.assignment_id,
          'appointmentId', v_confirmation.appointment_id,
          'etaMinutes', p_eta_minutes
        ),
        v_now
      );
    end if;
  elsif v_confirmation.checkpoint = 'arrival' then
    update public.job_assignments
    set arrived_at = v_now, updated_at = v_now
    where id = v_confirmation.assignment_id;

    update public.inspection_appointments
    set status = 'arrived', arrived_at = v_now, checked_in_at = v_now, updated_at = v_now
    where id = v_confirmation.appointment_id;

    update public.job_opportunities
    set status = 'in_progress', updated_at = v_now
    where id = v_confirmation.job_id
      and status in ('provisionally_assigned', 'confirmed');

    v_arrival_event_type := case
      when v_confirmation.scheduled_start_at is not null and v_now > v_confirmation.scheduled_start_at + interval '15 minutes' then 'LATE_ARRIVAL'
      else 'ON_TIME_ARRIVAL'
    end;

    insert into public.inspector_reliability_events (
      inspector_id,
      job_id,
      assignment_id,
      appointment_id,
      event_type,
      score_delta,
      actor_id,
      actor_role,
      metadata
    )
    values
      (
        v_confirmation.inspector_id,
        v_confirmation.job_id,
        v_confirmation.assignment_id,
        v_confirmation.appointment_id,
        'ARRIVAL_CONFIRMED',
        1,
        coalesce(v_actor_id::text, 'notification_link'),
        'inspector',
        jsonb_build_object(
          'checkpoint', v_confirmation.checkpoint,
          'method', p_method,
          'latitude', p_latitude,
          'longitude', p_longitude,
          'accuracyMeters', p_accuracy_meters,
          'proximityStatus', v_proximity_status,
          'distanceFromSiteMeters', v_distance,
          'evidenceRequired', v_evidence_required
        )
      ),
      (
        v_confirmation.inspector_id,
        v_confirmation.job_id,
        v_confirmation.assignment_id,
        v_confirmation.appointment_id,
        v_arrival_event_type,
        case when v_arrival_event_type = 'ON_TIME_ARRIVAL' then 1 else -3 end,
        coalesce(v_actor_id::text, 'notification_link'),
        'inspector',
        jsonb_build_object('scheduledStartAt', v_confirmation.scheduled_start_at, 'arrivedAt', v_now)
      );
  end if;

  return jsonb_build_object(
    'ok', true,
    'checkpoint', v_confirmation.checkpoint,
    'proximityStatus', v_proximity_status,
    'evidenceRequired', v_evidence_required
  );
end;
$$;

create or replace function public.process_due_attendance_confirmations(
  p_as_of timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_policy_id uuid;
  v_policy_enforcement_mode text := 'observe_only';
  v_policy_config jsonb := '{}'::jsonb;
  v_standby_activation_enabled boolean := false;
  v_missed_count integer := 0;
  v_admin_alert_count integer := 0;
  v_standby_prepared_count integer := 0;
  v_standby_activation_count integer := 0;
  v_confirmation record;
begin
  select id, enforcement_mode, coalesce(config, '{}'::jsonb)
  into v_policy_id, v_policy_enforcement_mode, v_policy_config
  from public.reliability_policy_versions
  where status = 'active'
  order by created_at desc
  limit 1;

  v_standby_activation_enabled := coalesce((v_policy_config ->> 'standbyActivationEnabled')::boolean, false);

  for v_confirmation in
    update public.job_attendance_confirmations
    set
      status = 'missed',
      missed_at = p_as_of,
      confirmation_method = 'system',
      escalation_status = case
        when checkpoint = 't_24h' then 'at_risk'
        when checkpoint = 't_4h' then 'standby_prepared'
        when checkpoint = 't_90m' and v_standby_activation_enabled then 'standby_activation_requested'
        when checkpoint = 't_90m' then 'standby_prepared'
        else escalation_status
      end,
      updated_at = p_as_of
    where status = 'pending'
      and required_at is not null
      and required_at <= p_as_of
      and checkpoint in ('t_24h', 't_4h', 't_90m')
      and exists (
        select 1
        from public.job_assignments ja
        left join public.inspection_appointments ia on ia.id = job_attendance_confirmations.appointment_id
        where ja.id = job_attendance_confirmations.assignment_id
          and coalesce(ja.status, '') not in ('cancelled', 'completed')
          and coalesce(ia.status, 'scheduled') not in ('cancelled', 'completed', 'no_show', 'reassigned')
          and (
            ia.id is null
            or ia.scheduled_start_at is not distinct from job_attendance_confirmations.scheduled_start_at
          )
      )
    returning *
  loop
    v_missed_count := v_missed_count + 1;

    insert into public.inspector_reliability_events (
      inspector_id,
      job_id,
      assignment_id,
      appointment_id,
      event_type,
      score_delta,
      policy_version_id,
      actor_id,
      actor_role,
      metadata
    )
    values (
      v_confirmation.inspector_id,
      v_confirmation.job_id,
      v_confirmation.assignment_id,
      v_confirmation.appointment_id,
      'CONFIRMATION_MISSED',
      -2,
      v_policy_id,
      'system',
      'system',
      jsonb_build_object(
        'checkpoint', v_confirmation.checkpoint,
        'requiredAt', v_confirmation.required_at,
        'scheduledStartAt', v_confirmation.scheduled_start_at,
        'enforcementMode', v_policy_enforcement_mode
      )
    );

    update public.job_assignments
    set confirmation_status = 'missed', updated_at = p_as_of
    where id = v_confirmation.assignment_id;

    update public.inspection_appointments
    set confirmation_status = 'missed', updated_at = p_as_of
    where id = v_confirmation.appointment_id;

    if v_confirmation.builder_id is not null and v_confirmation.checkpoint = 't_24h' then
      insert into public.notification_events (
        event_key,
        recipient_user_id,
        recipient_role,
        channel,
        payload,
        scheduled_for
      )
      values (
        'builder.inspection_at_risk_monitoring',
        v_confirmation.builder_id,
        'builder',
        'in_app',
        jsonb_build_object(
          'jobId', v_confirmation.job_id,
          'assignmentId', v_confirmation.assignment_id,
          'appointmentId', v_confirmation.appointment_id,
          'copy', 'Vero is monitoring your inspection appointment. If the assigned inspector becomes unavailable, we will begin reassignment support.'
        ),
        p_as_of
      );
    end if;

    if v_confirmation.critical_alert_on_miss then
      v_admin_alert_count := v_admin_alert_count + 1;

      insert into public.notification_events (
        event_key,
        recipient_role,
        channel,
        payload,
        scheduled_for
      )
      values (
        'admin.critical_attendance_risk',
        'admin',
        'in_app',
        jsonb_build_object(
          'jobId', v_confirmation.job_id,
          'assignmentId', v_confirmation.assignment_id,
          'appointmentId', v_confirmation.appointment_id,
          'inspectorId', v_confirmation.inspector_id,
          'checkpoint', v_confirmation.checkpoint,
          'requiredAt', v_confirmation.required_at,
          'standbyPrepareOnMiss', v_confirmation.standby_prepare_on_miss,
          'standbyActivateOnMiss', v_confirmation.standby_activate_on_miss
        ),
        p_as_of
      );
    end if;

    if v_confirmation.standby_prepare_on_miss then
      v_standby_prepared_count := v_standby_prepared_count + 1;

      insert into public.notification_events (
        event_key,
        recipient_role,
        channel,
        payload,
        scheduled_for
      )
      values (
        'standby.search_prepared',
        'admin',
        'in_app',
        jsonb_build_object(
          'jobId', v_confirmation.job_id,
          'assignmentId', v_confirmation.assignment_id,
          'appointmentId', v_confirmation.appointment_id,
          'checkpoint', v_confirmation.checkpoint,
          'reason', 'missed_confirmation'
        ),
        p_as_of
      );
    end if;

    if v_confirmation.checkpoint = 't_90m'
      and v_confirmation.standby_activate_on_miss
      and v_standby_activation_enabled
    then
      v_standby_activation_count := v_standby_activation_count + 1;

      insert into public.notification_events (
        event_key,
        recipient_role,
        channel,
        payload,
        scheduled_for
      )
      values (
        'standby.activation_requested',
        'admin',
        'in_app',
        jsonb_build_object(
          'jobId', v_confirmation.job_id,
          'assignmentId', v_confirmation.assignment_id,
          'appointmentId', v_confirmation.appointment_id,
          'checkpoint', v_confirmation.checkpoint,
          'policyVersionId', v_policy_id
        ),
        p_as_of
      );
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'missedCount', v_missed_count,
    'adminAlertCount', v_admin_alert_count,
    'standbyPreparedCount', v_standby_prepared_count,
    'standbyActivationCount', v_standby_activation_count,
    'standbyActivationEnabled', v_standby_activation_enabled
  );
end;
$$;

create or replace function public.handle_attendance_confirmation_schedule_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('cancelled', 'completed', 'no_show', 'reassigned') then
    update public.job_attendance_confirmations
    set
      status = 'cancelled',
      metadata = metadata || jsonb_build_object(
        'cancelledBecauseAppointmentStatus', new.status,
        'cancelledAt', now()
      ),
      updated_at = now()
    where appointment_id = new.id
      and status = 'pending';

    update public.notification_events
    set
      status = 'skipped',
      error = 'Attendance reminder skipped because appointment is no longer active.'
    where status = 'queued'
      and event_key = 'inspector.attendance_confirmation_reminder'
      and payload ->> 'appointmentId' = new.id::text;

    return new;
  end if;

  if old.scheduled_start_at is distinct from new.scheduled_start_at then
    update public.job_attendance_confirmations
    set
      status = case
        when checkpoint in ('t_24h', 't_4h', 't_90m', 'departure', 'arrival') and new.scheduled_start_at is not null then 'pending'
        when checkpoint = 'initial_claim' then status
        else 'not_required'
      end,
      scheduled_start_at = new.scheduled_start_at,
      required_at = case checkpoint
        when 't_24h' then new.scheduled_start_at - interval '24 hours'
        when 't_4h' then new.scheduled_start_at - interval '4 hours'
        when 't_90m' then new.scheduled_start_at - interval '90 minutes'
        when 'departure' then new.scheduled_start_at - interval '90 minutes'
        when 'arrival' then new.scheduled_start_at
        else required_at
      end,
      reminder_scheduled_at = case checkpoint
        when 't_24h' then new.scheduled_start_at - interval '24 hours'
        when 't_4h' then new.scheduled_start_at - interval '4 hours'
        when 't_90m' then new.scheduled_start_at - interval '90 minutes'
        else reminder_scheduled_at
      end,
      missed_at = null,
      escalation_status = 'none',
      metadata = metadata || jsonb_build_object(
        'rescheduledFrom', old.scheduled_start_at,
        'rescheduledTo', new.scheduled_start_at,
        'rescheduledAt', now()
      ),
      updated_at = now()
    where appointment_id = new.id
      and status in ('pending', 'missed', 'not_required')
      and checkpoint <> 'initial_claim';

    update public.notification_events n
    set
      scheduled_for = c.reminder_scheduled_at,
      status = case when c.reminder_scheduled_at is null then 'skipped' else 'queued' end,
      payload = n.payload
        || jsonb_build_object(
          'requiredAt', c.required_at,
          'scheduledStartAt', c.scheduled_start_at,
          'rescheduledAt', now()
        ),
      error = case when c.reminder_scheduled_at is null then 'Attendance reminder skipped because appointment has no scheduled start.' else null end
    from public.job_attendance_confirmations c
    where n.status in ('queued', 'skipped')
      and n.event_key = 'inspector.attendance_confirmation_reminder'
      and n.payload ->> 'confirmationId' = c.id::text
      and c.appointment_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_attendance_confirmation_schedule_guard on public.inspection_appointments;
create trigger trg_attendance_confirmation_schedule_guard
  after update of status, scheduled_start_at on public.inspection_appointments
  for each row execute function public.handle_attendance_confirmation_schedule_guard();

drop function if exists public.claim_live_job_if_eligible(text, jsonb);

create or replace function public.claim_live_job_if_eligible(
  p_job_id text,
  p_claimed_slot jsonb default null,
  p_claim_commitment jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inspector_id text := auth.uid()::text;
  v_job record;
  v_eligibility record;
  v_assignment record;
  v_appointment record;
  v_authority_check jsonb;
  v_required_action text;
  v_now timestamptz := now();
  v_window interval := interval '60 minutes';
  v_claimed_slot jsonb := coalesce(
    p_claimed_slot,
    jsonb_build_object('date', '', 'startTime', '', 'endTime', '', 'flexible', true)
  );
  v_commitment_accepted boolean := coalesce((p_claim_commitment ->> 'accepted')::boolean, false);
  v_commitment_version text := coalesce(nullif(p_claim_commitment ->> 'version', ''), 'reliability-commitment-v1');
  v_policy_id uuid;
  v_scheduled_start_at timestamptz;
  v_scheduled_end_at timestamptz;
begin
  if v_inspector_id is null then
    return jsonb_build_object('ok', false, 'error', 'Inspector is not authenticated.');
  end if;

  if v_commitment_accepted is not true then
    return jsonb_build_object('ok', false, 'error', 'You must accept the binding attendance commitment before claiming this job.');
  end if;

  select id
  into v_policy_id
  from public.reliability_policy_versions
  where status = 'active'
  order by created_at desc
  limit 1;

  select *
  into v_job
  from public.job_opportunities
  where id = p_job_id::uuid
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Job not found.');
  end if;

  if coalesce(v_job.status, '') <> 'live' then
    return jsonb_build_object('ok', false, 'error', 'Job is not available.');
  end if;

  select *
  into v_eligibility
  from public.inspector_onboarding_status
  where user_id = v_inspector_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Inspector eligibility profile not found.');
  end if;

  if v_eligibility.status <> 'approved' then
    return jsonb_build_object('ok', false, 'error', 'Onboarding not approved');
  end if;

  v_required_action := case
    when v_job.requires_professional_seal = true then 'design_signoff'
    else 'field_review'
  end;

  v_authority_check := public.check_credential_authority(
    v_inspector_id,
    v_job.required_discipline::text,
    v_required_action
  );

  if (v_authority_check ->> 'ok')::boolean is not true then
    return jsonb_build_object(
      'ok', false,
      'error', coalesce(v_authority_check ->> 'error', 'Credential authority check failed')
    );
  end if;

  if v_job.dispatch_tier = 'emergency' then
    v_window := interval '30 minutes';
  end if;

  if coalesce(v_claimed_slot ->> 'flexible', 'false') <> 'true'
    and nullif(v_claimed_slot ->> 'date', '') is not null
    and nullif(v_claimed_slot ->> 'startTime', '') is not null
    and nullif(v_claimed_slot ->> 'endTime', '') is not null
  then
    v_scheduled_start_at := (((v_claimed_slot ->> 'date') || ' ' || (v_claimed_slot ->> 'startTime'))::timestamp at time zone 'America/Vancouver');
    v_scheduled_end_at := (((v_claimed_slot ->> 'date') || ' ' || (v_claimed_slot ->> 'endTime'))::timestamp at time zone 'America/Vancouver');
  end if;

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
    updated_at
  )
  values (
    p_job_id::uuid,
    v_inspector_id::uuid,
    v_inspector_id::uuid,
    v_now,
    'provisional',
    v_now + v_window,
    v_claimed_slot,
    coalesce(v_job.offered_rate, 0),
    'held',
    true,
    v_commitment_version,
    v_now,
    v_scheduled_start_at,
    v_scheduled_end_at,
    v_now
  )
  returning *
  into v_assignment;

  insert into public.inspection_appointments (
    job_id,
    assignment_id,
    inspector_id,
    builder_id,
    scheduled_start_at,
    scheduled_end_at,
    commitment_version,
    commitment_accepted_at,
    metadata
  )
  values (
    p_job_id::uuid,
    v_assignment.id,
    v_inspector_id::uuid,
    v_job.builder_id,
    v_scheduled_start_at,
    v_scheduled_end_at,
    v_commitment_version,
    v_now,
    jsonb_build_object(
      'claimedSlot', v_claimed_slot,
      'dispatchTier', v_job.dispatch_tier,
      'source', 'claim_live_job_if_eligible'
    )
  )
  returning *
  into v_appointment;

  perform public.seed_job_attendance_confirmation_ladder(
    p_job_id::uuid,
    v_assignment.id,
    v_appointment.id,
    v_inspector_id::uuid,
    v_job.builder_id,
    v_scheduled_start_at,
    v_now,
    jsonb_build_object('dispatchTier', v_job.dispatch_tier)
  );

  insert into public.inspector_reliability_profiles (
    inspector_id,
    claim_commitment_count,
    last_event_at,
    policy_version_id
  )
  values (
    v_inspector_id::uuid,
    1,
    v_now,
    v_policy_id
  )
  on conflict (inspector_id) do update set
    claim_commitment_count = public.inspector_reliability_profiles.claim_commitment_count + 1,
    last_event_at = excluded.last_event_at,
    policy_version_id = coalesce(public.inspector_reliability_profiles.policy_version_id, excluded.policy_version_id),
    updated_at = v_now;

  insert into public.inspector_reliability_events (
    inspector_id,
    job_id,
    assignment_id,
    appointment_id,
    event_type,
    score_delta,
    policy_version_id,
    actor_id,
    actor_role,
    metadata
  )
  values (
    v_inspector_id::uuid,
    p_job_id::uuid,
    v_assignment.id,
    v_appointment.id,
    'claim_commitment_accepted',
    0,
    v_policy_id,
    v_inspector_id,
    'inspector',
    jsonb_build_object(
      'commitmentVersion', v_commitment_version,
      'dispatchTier', v_job.dispatch_tier,
      'scheduledStartAt', v_scheduled_start_at,
      'scheduledEndAt', v_scheduled_end_at
    )
  );

  update public.job_opportunities
  set
    status = 'provisionally_assigned',
    updated_at = v_now
  where id = p_job_id::uuid;

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
    p_job_id::uuid,
    v_inspector_id::uuid,
    'inspector',
    v_job.status,
    'provisionally_assigned',
    'Inspector claimed job from Live Board after accepting binding attendance commitment',
    v_now
  );

  insert into public.notification_events (
    event_key,
    recipient_user_id,
    recipient_role,
    channel,
    payload,
    scheduled_for
  )
  values
    (
      'inspector.claim_commitment_accepted',
      v_inspector_id::uuid,
      'inspector',
      'in_app',
      jsonb_build_object(
        'jobId', p_job_id,
        'assignmentId', v_assignment.id,
        'appointmentId', v_appointment.id,
        'commitmentVersion', v_commitment_version
      ),
      v_now
    ),
    (
      'builder.assignment_claimed',
      v_job.builder_id,
      'builder',
      'in_app',
      jsonb_build_object(
        'jobId', p_job_id,
        'assignmentId', v_assignment.id,
        'appointmentId', v_appointment.id,
        'objectionWindowClosesAt', v_now + v_window
      ),
      v_now
    );

  insert into public.governance_audit_events (
    entity_type,
    entity_id,
    action,
    actor_id,
    actor_role,
    rule_ids,
    blocker_type,
    reason,
    before_state,
    after_state,
    metadata
  )
  values (
    'assignment',
    v_assignment.id::text,
    'assignment.claim_commitment_accepted',
    v_inspector_id,
    'inspector',
    array['R-RELIABILITY-001'],
    'commercial',
    'Inspector accepted binding attendance commitment before job claim.',
    jsonb_build_object('jobStatus', v_job.status),
    jsonb_build_object('assignmentStatus', 'provisional', 'commitmentAccepted', true),
    jsonb_build_object('appointmentId', v_appointment.id, 'policyVersionId', v_policy_id)
  );

  return jsonb_build_object(
    'ok', true,
    'assignment', to_jsonb(v_assignment),
    'appointment', to_jsonb(v_appointment)
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'Job has already been claimed.');
end;
$$;

grant execute on function public.seed_job_attendance_confirmation_ladder(uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz, jsonb) to authenticated;
grant execute on function public.record_job_attendance_confirmation(uuid, text, text, numeric, numeric, numeric, integer, jsonb) to authenticated;
grant execute on function public.record_job_attendance_confirmation(uuid, text, text, numeric, numeric, numeric, integer, jsonb) to anon;
grant execute on function public.process_due_attendance_confirmations(timestamptz) to authenticated;
grant execute on function public.claim_live_job_if_eligible(text, jsonb, jsonb) to authenticated;
