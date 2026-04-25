-- Standby Inspector Reassignment System.
--
-- Standby is recovery infrastructure, not a second marketplace. Candidates are
-- identified by the same governed dispatch posture used for primary assignment,
-- held in reserve, then activated only when attendance risk becomes critical.

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
    'ON_TIME_ARRIVAL',
    'LATE_CANCELLATION',
    'NO_SHOW',
    'STANDBY_CANDIDATE_IDENTIFIED',
    'STANDBY_SOFT_ALERTED',
    'STANDBY_OFFERED',
    'STANDBY_ACCEPTED',
    'PRIMARY_REASSIGNED'
  ));

alter table public.standby_inspector_invites
  drop constraint if exists standby_inspector_invites_invite_reason_check,
  drop constraint if exists standby_inspector_invites_status_check;

alter table public.standby_inspector_invites
  add constraint standby_inspector_invites_invite_reason_check
  check (invite_reason in (
    'backup_pool',
    'missed_confirmation',
    'critical_confirmation_miss',
    'invalid_cancellation',
    'late_cancellation',
    'no_show',
    'admin_requested'
  )),
  add constraint standby_inspector_invites_status_check
  check (status in (
    'identified',
    'soft_alerted',
    'offered',
    'accepted',
    'declined',
    'expired',
    'invited',
    'assigned',
    'cancelled'
  ));

alter table public.standby_inspector_invites
  alter column status set default 'identified',
  add column if not exists candidate_rank integer,
  add column if not exists offered_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists soft_alerted_at timestamptz,
  add column if not exists rush_multiplier_offered numeric(5,2),
  add column if not exists audit_trail jsonb not null default '[]'::jsonb;

update public.standby_inspector_invites
set candidate_rank = priority_rank
where candidate_rank is null;

alter table public.standby_inspector_invites
  alter column candidate_rank set default 100;

create index if not exists idx_standby_invites_assignment_status
  on public.standby_inspector_invites(original_assignment_id, status, candidate_rank);

create unique index if not exists idx_standby_invites_one_active_candidate
  on public.standby_inspector_invites(job_id, inspector_id)
  where status in ('identified', 'soft_alerted', 'offered');

create or replace function public.identify_standby_candidates_for_assignment(
  p_assignment_id uuid,
  p_limit integer default 2
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment record;
  v_job record;
  v_required_action text;
  v_candidate_count integer := 0;
begin
  select *
  into v_assignment
  from public.job_assignments
  where id = p_assignment_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Assignment not found.');
  end if;

  select *
  into v_job
  from public.job_opportunities
  where id = v_assignment.job_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Job not found.');
  end if;

  v_required_action := case
    when v_job.requires_professional_seal = true then 'design_signoff'
    else 'field_review'
  end;

  with eligible as (
    select
      ios.user_id::uuid as inspector_id,
      row_number() over (
        order by
          case coalesce(rp.manual_tier_override, rp.tier_key, 'standard')
            when 'premier' then 1
            when 'preferred' then 2
            when 'standard' then 3
            when 'provisional' then 4
            else 50
          end,
          coalesce(rp.internal_score, 75) desc,
          ios.updated_at desc
      ) as candidate_rank,
      coalesce(rp.manual_tier_override, rp.tier_key, 'standard') as reliability_tier,
      coalesce(rp.internal_score, 75) as reliability_score
    from public.inspector_onboarding_status ios
    left join public.inspector_reliability_profiles rp
      on rp.inspector_id = ios.user_id::uuid
    where ios.status = 'approved'
      and ios.user_id::uuid <> v_assignment.inspector_id
      and not exists (
        select 1
        from public.job_assignments previous_assignment
        where previous_assignment.job_id = v_assignment.job_id
          and previous_assignment.inspector_id = ios.user_id::uuid
      )
      and coalesce(rp.manual_tier_override, rp.tier_key, 'standard') not in ('restricted', 'suspension_review')
      and coalesce(ios.disciplines, '{}'::text[]) @> array[v_job.required_discipline::text]
      and (
        v_job.region is null
        or coalesce(ios.regions, '{}'::text[]) @> array[v_job.region::text]
      )
      and coalesce((public.check_credential_authority(
        ios.user_id,
        v_job.required_discipline::text,
        v_required_action
      ) ->> 'ok')::boolean, false) is true
      and not exists (
        select 1
        from public.inspection_appointments ia
        where ia.inspector_id = ios.user_id::uuid
          and ia.status in ('scheduled', 'confirmed', 'en_route', 'arrived', 'in_progress')
          and v_assignment.scheduled_start_at is not null
          and ia.scheduled_start_at is not null
          and tstzrange(
            ia.scheduled_start_at,
            coalesce(ia.scheduled_end_at, ia.scheduled_start_at + interval '2 hours'),
            '[)'
          ) && tstzrange(
            v_assignment.scheduled_start_at,
            coalesce(v_assignment.scheduled_end_at, v_assignment.scheduled_start_at + interval '2 hours'),
            '[)'
          )
      )
    limit greatest(coalesce(p_limit, 2), 0)
  ),
  inserted as (
    insert into public.standby_inspector_invites (
      job_id,
      original_assignment_id,
      inspector_id,
      invite_reason,
      status,
      priority_rank,
      candidate_rank,
      expires_at,
      metadata,
      audit_trail
    )
    select
      v_assignment.job_id,
      v_assignment.id,
      eligible.inspector_id,
      'backup_pool',
      'identified',
      eligible.candidate_rank,
      eligible.candidate_rank,
      coalesce(v_assignment.scheduled_start_at, now() + interval '24 hours'),
      jsonb_build_object(
        'permitFamily', v_job.permit_family,
        'discipline', v_job.required_discipline,
        'region', v_job.region,
        'stageName', v_job.stage_name,
        'reliabilityTier', eligible.reliability_tier,
        'reliabilityScore', eligible.reliability_score,
        'identifiedBy', 'standby_reassignment_system'
      ),
      jsonb_build_array(jsonb_build_object(
        'event', 'identified',
        'at', now(),
        'source', 'identify_standby_candidates_for_assignment'
      ))
    from eligible
    on conflict do nothing
    returning id
  )
  select count(*)
  into v_candidate_count
  from inserted;

  insert into public.inspector_reliability_events (
    inspector_id,
    job_id,
    assignment_id,
    event_type,
    score_delta,
    actor_role,
    metadata
  )
  select
    inspector_id,
    job_id,
    original_assignment_id,
    'STANDBY_CANDIDATE_IDENTIFIED',
    0,
    'system',
    jsonb_build_object('standbyInviteId', id, 'candidateRank', candidate_rank)
  from public.standby_inspector_invites
  where original_assignment_id = p_assignment_id
    and status = 'identified'
    and created_at >= now() - interval '5 seconds'
  on conflict do nothing;

  return jsonb_build_object(
    'ok', true,
    'assignmentId', p_assignment_id,
    'candidateCount', v_candidate_count
  );
end;
$$;

create or replace function public.soft_alert_standby_candidates(
  p_assignment_id uuid,
  p_reason text default 'missed_confirmation'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_policy_config jsonb := '{}'::jsonb;
  v_notifications_enabled boolean := true;
  v_updated_count integer := 0;
begin
  select coalesce(config, '{}'::jsonb)
  into v_policy_config
  from public.reliability_policy_versions
  where status = 'active'
  order by created_at desc
  limit 1;

  v_notifications_enabled := coalesce((v_policy_config ->> 'standbyNotificationsEnabled')::boolean, true);

  if not exists (
    select 1
    from public.standby_inspector_invites
    where original_assignment_id = p_assignment_id
      and status in ('identified', 'soft_alerted', 'offered')
  ) then
    perform public.identify_standby_candidates_for_assignment(p_assignment_id, 2);
  end if;

  if v_notifications_enabled then
    update public.standby_inspector_invites
    set
      status = 'soft_alerted',
      invite_reason = p_reason,
      soft_alerted_at = now(),
      audit_trail = audit_trail || jsonb_build_array(jsonb_build_object(
        'event', 'soft_alerted',
        'at', now(),
        'reason', p_reason
      ))
    where original_assignment_id = p_assignment_id
      and status = 'identified';

    get diagnostics v_updated_count = row_count;

    insert into public.notification_events (
      event_key,
      recipient_user_id,
      recipient_role,
      channel,
      payload,
      scheduled_for
    )
    select
      'standby.soft_alerted',
      inspector_id,
      'inspector',
      'in_app',
      jsonb_build_object(
        'jobId', job_id,
        'assignmentId', original_assignment_id,
        'standbyInviteId', id,
        'message', 'A priority Vero inspection is available due to reassignment. Accepting and completing priority work can improve your tier standing and earnings.',
        'reason', p_reason
      ),
      now()
    from public.standby_inspector_invites
    where original_assignment_id = p_assignment_id
      and status = 'soft_alerted'
      and soft_alerted_at >= now() - interval '5 seconds';
  end if;

  insert into public.inspector_reliability_events (
    inspector_id,
    job_id,
    assignment_id,
    event_type,
    score_delta,
    actor_role,
    metadata
  )
  select
    inspector_id,
    job_id,
    original_assignment_id,
    'STANDBY_SOFT_ALERTED',
    0,
    'system',
    jsonb_build_object('standbyInviteId', id, 'reason', p_reason)
  from public.standby_inspector_invites
  where original_assignment_id = p_assignment_id
    and status = 'soft_alerted'
    and soft_alerted_at >= now() - interval '5 seconds';

  return jsonb_build_object(
    'ok', true,
    'assignmentId', p_assignment_id,
    'softAlertedCount', v_updated_count,
    'notificationsEnabled', v_notifications_enabled
  );
end;
$$;

create or replace function public.activate_standby_candidates(
  p_assignment_id uuid,
  p_reason text default 'critical_confirmation_miss',
  p_manual boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment record;
  v_job record;
  v_policy_config jsonb := '{}'::jsonb;
  v_notifications_enabled boolean := true;
  v_rush_multiplier numeric(5,2) := 1.00;
  v_offer_expiry_minutes integer := 15;
  v_updated_count integer := 0;
begin
  select *
  into v_assignment
  from public.job_assignments
  where id = p_assignment_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Assignment not found.');
  end if;

  select *
  into v_job
  from public.job_opportunities
  where id = v_assignment.job_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Job not found.');
  end if;

  select coalesce(config, '{}'::jsonb)
  into v_policy_config
  from public.reliability_policy_versions
  where status = 'active'
  order by created_at desc
  limit 1;

  v_notifications_enabled := coalesce((v_policy_config ->> 'standbyNotificationsEnabled')::boolean, true);
  v_rush_multiplier := coalesce((v_policy_config ->> 'standbyRushMultiplier')::numeric, 1.00);
  v_offer_expiry_minutes := coalesce((v_policy_config ->> 'standbyOfferExpiryMinutes')::integer, 15);

  if not exists (
    select 1
    from public.standby_inspector_invites
    where original_assignment_id = p_assignment_id
      and status in ('identified', 'soft_alerted', 'offered')
  ) then
    perform public.identify_standby_candidates_for_assignment(p_assignment_id, 2);
  end if;

  update public.standby_inspector_invites
  set
    status = 'offered',
    invite_reason = p_reason,
    offered_at = now(),
    expires_at = now() + make_interval(mins => v_offer_expiry_minutes),
    rush_multiplier_offered = v_rush_multiplier,
    audit_trail = audit_trail || jsonb_build_array(jsonb_build_object(
      'event', 'offered',
      'at', now(),
      'reason', p_reason,
      'manual', p_manual,
      'rushMultiplier', v_rush_multiplier
    ))
  where original_assignment_id = p_assignment_id
    and status in ('identified', 'soft_alerted');

  get diagnostics v_updated_count = row_count;

  if v_notifications_enabled then
    insert into public.notification_events (
      event_key,
      recipient_user_id,
      recipient_role,
      channel,
      payload,
      scheduled_for
    )
    select
      'standby.offer_sent',
      inspector_id,
      'inspector',
      'in_app',
      jsonb_build_object(
        'jobId', job_id,
        'assignmentId', original_assignment_id,
        'standbyInviteId', id,
        'rushMultiplierOffered', rush_multiplier_offered,
        'expiresAt', expires_at,
        'message', 'A priority Vero inspection is available due to reassignment. Accepting and completing priority work can improve your tier standing and earnings.'
      ),
      now()
    from public.standby_inspector_invites
    where original_assignment_id = p_assignment_id
      and status = 'offered'
      and offered_at >= now() - interval '5 seconds';
  end if;

  insert into public.notification_events (
    event_key,
    recipient_user_id,
    recipient_role,
    channel,
    payload,
    scheduled_for
  )
  values (
    'builder.standby_activation_started',
    v_job.builder_id,
    'builder',
    'in_app',
    jsonb_build_object(
      'jobId', v_job.id,
      'assignmentId', p_assignment_id,
      'reason', p_reason,
      'message', 'Vero is protecting your inspection window. We are activating a qualified backup inspector and will confirm the updated assignment shortly.'
    ),
    now()
  );

  insert into public.inspector_reliability_events (
    inspector_id,
    job_id,
    assignment_id,
    event_type,
    score_delta,
    actor_role,
    metadata
  )
  select
    inspector_id,
    job_id,
    original_assignment_id,
    'STANDBY_OFFERED',
    0,
    'system',
    jsonb_build_object(
      'standbyInviteId', id,
      'reason', p_reason,
      'rushMultiplierOffered', rush_multiplier_offered
    )
  from public.standby_inspector_invites
  where original_assignment_id = p_assignment_id
    and status = 'offered'
    and offered_at >= now() - interval '5 seconds';

  return jsonb_build_object(
    'ok', true,
    'assignmentId', p_assignment_id,
    'offeredCount', v_updated_count,
    'rushMultiplierOffered', v_rush_multiplier,
    'notificationsEnabled', v_notifications_enabled
  );
end;
$$;

create or replace function public.admin_activate_standby_candidates(
  p_assignment_id uuid,
  p_reason text default 'admin_requested'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(
    auth.jwt() ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    ''
  ) <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin role required.');
  end if;

  return public.activate_standby_candidates(p_assignment_id, p_reason, true);
end;
$$;

create or replace function public.accept_standby_offer(
  p_standby_invite_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_invite record;
  v_original_assignment record;
  v_original_appointment record;
  v_job record;
  v_new_assignment record;
  v_new_appointment record;
  v_policy_id uuid;
  v_now timestamptz := now();
  v_commitment_version text;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'error', 'Inspector is not authenticated.');
  end if;

  select *
  into v_invite
  from public.standby_inspector_invites
  where id = p_standby_invite_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Standby offer not found.');
  end if;

  if v_invite.inspector_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'error', 'This standby offer is not assigned to you.');
  end if;

  if v_invite.status <> 'offered' then
    return jsonb_build_object('ok', false, 'error', 'This standby offer is no longer open.');
  end if;

  if v_invite.expires_at <= v_now then
    update public.standby_inspector_invites
    set
      status = 'expired',
      audit_trail = audit_trail || jsonb_build_array(jsonb_build_object('event', 'expired', 'at', v_now))
    where id = v_invite.id;

    return jsonb_build_object('ok', false, 'error', 'This standby offer has expired.');
  end if;

  if exists (
    select 1
    from public.standby_inspector_invites
    where original_assignment_id = v_invite.original_assignment_id
      and status = 'accepted'
      and id <> v_invite.id
  ) then
    return jsonb_build_object('ok', false, 'error', 'Another standby inspector already accepted this offer.');
  end if;

  select *
  into v_original_assignment
  from public.job_assignments
  where id = v_invite.original_assignment_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Original assignment not found.');
  end if;

  if exists (
    select 1
    from public.standby_inspector_invites
    where original_assignment_id = v_invite.original_assignment_id
      and status = 'accepted'
      and id <> v_invite.id
  ) then
    update public.standby_inspector_invites
    set
      status = 'expired',
      audit_trail = audit_trail || jsonb_build_array(jsonb_build_object(
        'event', 'acceptance_lost_concurrency_race',
        'at', v_now
      ))
    where id = v_invite.id
      and status = 'offered';

    return jsonb_build_object('ok', false, 'error', 'Another standby inspector already accepted this offer.');
  end if;

  if coalesce(v_original_assignment.status, '') = 'cancelled' then
    return jsonb_build_object('ok', false, 'error', 'Original assignment has already been reassigned or cancelled.');
  end if;

  select *
  into v_original_appointment
  from public.inspection_appointments
  where assignment_id = v_original_assignment.id
  order by created_at desc
  limit 1
  for update;

  select *
  into v_job
  from public.job_opportunities
  where id = v_invite.job_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Job not found.');
  end if;

  select id
  into v_policy_id
  from public.reliability_policy_versions
  where status = 'active'
  order by created_at desc
  limit 1;

  v_commitment_version := coalesce(v_original_assignment.commitment_version, 'reliability-commitment-v1');

  update public.job_assignments
  set
    status = 'cancelled',
    confirmation_status = 'missed',
    updated_at = v_now
  where id = v_original_assignment.id;

  update public.inspection_appointments
  set
    status = 'reassigned',
    confirmation_status = 'missed',
    updated_at = v_now,
    metadata = metadata || jsonb_build_object(
      'reassignedToInspectorId', v_actor_id,
      'reassignedAt', v_now,
      'standbyInviteId', v_invite.id
    )
  where assignment_id = v_original_assignment.id;

  update public.job_attendance_confirmations
  set
    status = case when status = 'pending' then 'cancelled' else status end,
    updated_at = v_now,
    metadata = metadata || jsonb_build_object(
      'cancelledByStandbyReassignment', true,
      'standbyInviteId', v_invite.id
    )
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
    v_invite.job_id,
    v_actor_id,
    v_actor_id,
    v_now,
    'confirmed',
    v_now,
    v_original_assignment.claimed_slot,
    v_original_assignment.escrow_amount,
    coalesce(v_original_assignment.escrow_status, 'held'),
    true,
    v_commitment_version,
    v_now,
    v_original_assignment.scheduled_start_at,
    v_original_assignment.scheduled_end_at,
    'confirmed',
    v_now,
    v_now
  )
  returning *
  into v_new_assignment;

  insert into public.inspection_appointments (
    job_id,
    assignment_id,
    inspector_id,
    builder_id,
    scheduled_start_at,
    scheduled_end_at,
    commitment_version,
    commitment_accepted_at,
    confirmation_status,
    inspector_confirmed_at,
    status,
    metadata
  )
  values (
    v_invite.job_id,
    v_new_assignment.id,
    v_actor_id,
    v_job.builder_id,
    v_original_assignment.scheduled_start_at,
    v_original_assignment.scheduled_end_at,
    v_commitment_version,
    v_now,
    'confirmed',
    v_now,
    'confirmed',
    jsonb_build_object(
      'source', 'standby_reassignment',
      'originalAssignmentId', v_original_assignment.id,
      'standbyInviteId', v_invite.id,
      'rushMultiplierOffered', v_invite.rush_multiplier_offered
    )
  )
  returning *
  into v_new_appointment;

  perform public.seed_job_attendance_confirmation_ladder(
    v_invite.job_id,
    v_new_assignment.id,
    v_new_appointment.id,
    v_actor_id,
    v_job.builder_id,
    v_original_assignment.scheduled_start_at,
    v_now,
    jsonb_build_object(
      'source', 'standby_reassignment',
      'originalAssignmentId', v_original_assignment.id,
      'standbyInviteId', v_invite.id
    )
  );

  update public.standby_inspector_invites
  set
    status = 'accepted',
    accepted_at = v_now,
    responded_at = v_now,
    audit_trail = audit_trail || jsonb_build_array(jsonb_build_object(
      'event', 'accepted',
      'at', v_now,
      'newAssignmentId', v_new_assignment.id
    ))
  where id = v_invite.id;

  update public.standby_inspector_invites
  set
    status = 'expired',
    responded_at = coalesce(responded_at, v_now),
    audit_trail = audit_trail || jsonb_build_array(jsonb_build_object(
      'event', 'expired_after_competing_acceptance',
      'at', v_now,
      'acceptedInviteId', v_invite.id
    ))
  where original_assignment_id = v_invite.original_assignment_id
    and id <> v_invite.id
    and status = 'offered';

  update public.job_opportunities
  set
    status = 'assigned',
    updated_at = v_now
  where id = v_invite.job_id;

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
    v_invite.job_id,
    v_actor_id,
    'inspector',
    coalesce(v_job.status, 'provisionally_assigned'),
    'assigned',
    'Standby inspector accepted reassignment offer',
    v_now
  );

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
  values
    (
      v_original_assignment.inspector_id,
      v_invite.job_id,
      v_original_assignment.id,
      v_original_appointment.id,
      'PRIMARY_REASSIGNED',
      0,
      v_policy_id,
      v_actor_id::text,
      'system',
      jsonb_build_object(
        'standbyInviteId', v_invite.id,
        'newAssignmentId', v_new_assignment.id,
        'reason', v_invite.invite_reason,
        'reliabilitySourceEventExpected', v_invite.invite_reason in ('critical_confirmation_miss', 'invalid_cancellation', 'no_show')
      )
    ),
    (
      v_actor_id,
      v_invite.job_id,
      v_new_assignment.id,
      v_new_appointment.id,
      'STANDBY_ACCEPTED',
      1,
      v_policy_id,
      v_actor_id::text,
      'inspector',
      jsonb_build_object(
        'standbyInviteId', v_invite.id,
        'originalAssignmentId', v_original_assignment.id,
        'rushMultiplierOffered', v_invite.rush_multiplier_offered
      )
    ),
    (
      v_actor_id,
      v_invite.job_id,
      v_new_assignment.id,
      v_new_appointment.id,
      'standby_assigned',
      1,
      v_policy_id,
      v_actor_id::text,
      'inspector',
      jsonb_build_object(
        'standbyInviteId', v_invite.id,
        'originalAssignmentId', v_original_assignment.id
      )
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
      'builder.standby_assignment_confirmed',
      v_job.builder_id,
      'builder',
      'in_app',
      jsonb_build_object(
        'jobId', v_invite.job_id,
        'assignmentId', v_new_assignment.id,
        'originalAssignmentId', v_original_assignment.id,
        'message', 'Vero is protecting your inspection window. We are activating a qualified backup inspector and will confirm the updated assignment shortly.'
      ),
      v_now
    ),
    (
      'inspector.standby_offer_accepted',
      v_actor_id,
      'inspector',
      'in_app',
      jsonb_build_object(
        'jobId', v_invite.job_id,
        'assignmentId', v_new_assignment.id,
        'standbyInviteId', v_invite.id
      ),
      v_now
    );

  return jsonb_build_object(
    'ok', true,
    'jobId', v_invite.job_id,
    'originalAssignmentId', v_original_assignment.id,
    'newAssignmentId', v_new_assignment.id,
    'newAppointmentId', v_new_appointment.id,
    'acceptedStandbyInviteId', v_invite.id
  );
end;
$$;

create or replace function public.handle_assignment_standby_identification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('provisional', 'confirmed') then
    perform public.identify_standby_candidates_for_assignment(new.id, 2);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assignment_standby_identification on public.job_assignments;
create trigger trg_assignment_standby_identification
  after insert on public.job_assignments
  for each row execute function public.handle_assignment_standby_identification();

create or replace function public.handle_missed_attendance_standby()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status and new.status = 'missed' then
    if new.checkpoint = 't_4h' then
      perform public.soft_alert_standby_candidates(new.assignment_id, 'missed_confirmation');
    elsif new.checkpoint = 't_90m' then
      perform public.activate_standby_candidates(new.assignment_id, 'critical_confirmation_miss', false);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_missed_attendance_standby on public.job_attendance_confirmations;
create trigger trg_missed_attendance_standby
  after update on public.job_attendance_confirmations
  for each row execute function public.handle_missed_attendance_standby();

create or replace function public.handle_invalid_cancellation_standby()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.validity_status = 'invalid'
    and new.is_late = true
    and new.assignment_id is not null
    and (
      tg_op = 'INSERT'
      or old.validity_status is distinct from new.validity_status
      or old.is_late is distinct from new.is_late
    )
  then
    perform public.activate_standby_candidates(new.assignment_id, 'invalid_cancellation', false);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_invalid_cancellation_standby on public.inspection_cancellation_requests;
create trigger trg_invalid_cancellation_standby
  after insert or update on public.inspection_cancellation_requests
  for each row execute function public.handle_invalid_cancellation_standby();

create or replace view public.admin_standby_reassignment_status as
select
  ja.id as primary_assignment_id,
  ja.job_id,
  ja.inspector_id as primary_inspector_id,
  ja.status as primary_assignment_status,
  ja.confirmation_status as primary_confirmation_status,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'checkpoint', jac.checkpoint,
      'missedAt', jac.missed_at,
      'escalationStatus', jac.escalation_status
    ) order by jac.required_at)
    from public.job_attendance_confirmations jac
    where jac.assignment_id = ja.id
      and jac.status = 'missed'
  ), '[]'::jsonb) as missed_confirmations,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'standbyInviteId', sii.id,
      'inspectorId', sii.inspector_id,
      'rank', coalesce(sii.candidate_rank, sii.priority_rank),
      'status', sii.status,
      'offeredAt', sii.offered_at,
      'acceptedAt', sii.accepted_at,
      'expiresAt', sii.expires_at,
      'rushMultiplierOffered', sii.rush_multiplier_offered,
      'auditTrail', sii.audit_trail
    ) order by coalesce(sii.candidate_rank, sii.priority_rank), sii.created_at)
    from public.standby_inspector_invites sii
    where sii.original_assignment_id = ja.id
  ), '[]'::jsonb) as standby_candidates,
  ja.updated_at
from public.job_assignments ja
where exists (
  select 1
  from public.standby_inspector_invites sii
  where sii.original_assignment_id = ja.id
)
and coalesce(
  auth.jwt() ->> 'role',
  auth.jwt() -> 'app_metadata' ->> 'role',
  auth.jwt() -> 'user_metadata' ->> 'role',
  ''
) = 'admin';

grant select on public.admin_standby_reassignment_status to authenticated;
revoke execute on function public.identify_standby_candidates_for_assignment(uuid, integer) from public, anon, authenticated;
revoke execute on function public.soft_alert_standby_candidates(uuid, text) from public, anon, authenticated;
revoke execute on function public.activate_standby_candidates(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.admin_activate_standby_candidates(uuid, text) to authenticated;
grant execute on function public.accept_standby_offer(uuid) to authenticated;
