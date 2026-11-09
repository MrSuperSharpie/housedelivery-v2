-- Structured cancellation and no-show policy workflow.
--
-- LEGAL REVIEW REQUIRED before financial consequence enforcement moves beyond
-- observe_only projections. Cancellation distinguishes protected human events
-- from avoidable professional failures.

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
    'NO_SHOW'
  ));

alter table public.inspection_cancellation_requests
  add column if not exists preliminary_classification text
    check (preliminary_classification is null or preliminary_classification in ('likely_valid', 'likely_invalid', 'admin_review_required')),
  add column if not exists final_classification text
    check (final_classification is null or final_classification in ('valid', 'invalid', 'admin_overridden')),
  add column if not exists reason_category text
    check (reason_category is null or reason_category in ('protected', 'avoidable')),
  add column if not exists evidence_required boolean not null default false,
  add column if not exists appeal_status text not null default 'available'
    check (appeal_status in ('available', 'submitted', 'under_review', 'resolved', 'waived')),
  add column if not exists appeal_note text,
  add column if not exists appealed_at timestamptz,
  add column if not exists financial_consequence_status text not null default 'not_applied'
    check (financial_consequence_status in ('not_applied', 'observe_only_projection', 'applied', 'waived')),
  add column if not exists payout_blocked boolean not null default false,
  add column if not exists builder_resolution_status text not null default 'reassignment_support'
    check (builder_resolution_status in ('reassignment_support', 'refund_pending', 'credit_pending', 'resolved')),
  add column if not exists builder_notified_at timestamptz,
  add column if not exists inspector_notified_at timestamptz,
  add column if not exists reassignment_triggered_at timestamptz,
  add column if not exists audit_trail jsonb not null default '[]'::jsonb;

create index if not exists idx_cancellation_requests_classification
  on public.inspection_cancellation_requests(preliminary_classification, validity_status, created_at desc);

create index if not exists idx_cancellation_requests_appeal
  on public.inspection_cancellation_requests(appeal_status, created_at desc)
  where appeal_status <> 'waived';

insert into public.valid_cancellation_reasons (
  code,
  label,
  actor_scope,
  protects_reliability_score,
  requires_evidence,
  requires_admin_review,
  metadata
) values
  ('illness', 'Illness', '{inspector}', true, true, true, '{"category":"protected"}'),
  ('accident', 'Accident', '{inspector}', true, true, true, '{"category":"protected"}'),
  ('documented_vehicle_failure', 'Documented vehicle failure', '{inspector}', true, true, true, '{"category":"protected"}'),
  ('family_emergency', 'Family emergency', '{inspector}', true, true, true, '{"category":"protected"}'),
  ('unsafe_site', 'Unsafe site', '{inspector,builder,admin}', true, true, true, '{"category":"protected"}'),
  ('severe_weather_road_closure', 'Severe weather or road closure', '{inspector,builder,admin}', true, true, true, '{"category":"protected"}'),
  ('builder_site_not_ready', 'Builder site not ready', '{inspector,builder,admin}', true, true, true, '{"category":"protected"}'),
  ('no_access', 'No access', '{inspector,builder,admin}', true, true, true, '{"category":"protected"}'),
  ('missing_required_documents', 'Missing required documents', '{inspector,builder,admin}', true, true, true, '{"category":"protected"}'),
  ('too_far', 'Too far', '{inspector}', false, false, true, '{"category":"avoidable"}'),
  ('too_busy', 'Too busy', '{inspector}', false, false, true, '{"category":"avoidable"}'),
  ('double_booked', 'Double-booked', '{inspector}', false, false, true, '{"category":"avoidable"}'),
  ('changed_mind', 'Changed mind', '{inspector}', false, false, true, '{"category":"avoidable"}'),
  ('unsupported_other_reason', 'Unsupported other reason', '{inspector}', false, false, true, '{"category":"avoidable"}')
on conflict (code) do update set
  label = excluded.label,
  actor_scope = excluded.actor_scope,
  protects_reliability_score = excluded.protects_reliability_score,
  requires_evidence = excluded.requires_evidence,
  requires_admin_review = excluded.requires_admin_review,
  metadata = excluded.metadata,
  active = true;

create or replace function public.request_inspection_cancellation(
  p_assignment_id uuid,
  p_reason_code text,
  p_explanation text,
  p_evidence jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_now timestamptz := now();
  v_assignment record;
  v_appointment record;
  v_reason record;
  v_policy record;
  v_policy_config jsonb := '{}'::jsonb;
  v_protected_window_minutes integer := 240;
  v_evidence_count integer := 0;
  v_reason_category text;
  v_preliminary text;
  v_validity_status text;
  v_is_late boolean := false;
  v_cancellation record;
  v_reliability_event_id uuid;
  v_inspector_copy text;
begin
  if v_actor_id is null then
    return jsonb_build_object('ok', false, 'error', 'Inspector is not authenticated.');
  end if;

  if nullif(trim(coalesce(p_explanation, '')), '') is null then
    return jsonb_build_object('ok', false, 'error', 'Cancellation explanation is required.');
  end if;

  select *
  into v_assignment
  from public.job_assignments
  where id = p_assignment_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Assignment not found.');
  end if;

  if v_assignment.inspector_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'error', 'Not authorized to cancel this assignment.');
  end if;

  select *
  into v_appointment
  from public.inspection_appointments
  where assignment_id = p_assignment_id
  order by created_at desc
  limit 1;

  select *
  into v_reason
  from public.valid_cancellation_reasons
  where code = p_reason_code
    and active = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Cancellation reason is not supported.');
  end if;

  select *
  into v_policy
  from public.reliability_policy_versions
  where status = 'active'
  order by created_at desc
  limit 1;

  if found then
    v_policy_config := coalesce(v_policy.config, '{}'::jsonb);
  end if;

  v_protected_window_minutes := coalesce((v_policy_config ->> 'cancellationProtectedWindowMinutes')::integer, 240);
  v_evidence_count := coalesce(jsonb_array_length(case when jsonb_typeof(p_evidence) = 'array' then p_evidence else '[]'::jsonb end), 0);
  v_reason_category := coalesce(v_reason.metadata ->> 'category', case when v_reason.protects_reliability_score then 'protected' else 'avoidable' end);
  v_is_late := coalesce(v_assignment.scheduled_start_at, v_appointment.scheduled_start_at) is not null
    and coalesce(v_assignment.scheduled_start_at, v_appointment.scheduled_start_at) - v_now <= make_interval(mins => v_protected_window_minutes);

  v_preliminary := case
    when v_reason_category = 'protected' and v_reason.requires_evidence and v_evidence_count = 0 then 'admin_review_required'
    when v_reason_category = 'protected' then 'likely_valid'
    else 'likely_invalid'
  end;
  v_validity_status := case
    when v_preliminary = 'likely_valid' then 'valid'
    when v_preliminary = 'likely_invalid' then 'invalid'
    else 'pending_review'
  end;
  v_inspector_copy := case
    when v_validity_status = 'invalid' and v_is_late then
      'This cancellation has been recorded as reliability-impacting because it occurred inside the protected appointment window without a supported reason. You may submit an appeal or additional context for Admin review.'
    else
      'This cancellation has been recorded as protected. Your reliability tier will not be materially affected.'
  end;

  insert into public.inspection_cancellation_requests (
    appointment_id,
    job_id,
    assignment_id,
    requested_by_id,
    requested_by_role,
    reason_code,
    reason_note,
    requested_at,
    scheduled_start_at,
    is_late,
    validity_status,
    preliminary_classification,
    final_classification,
    reason_category,
    evidence_required,
    evidence,
    policy_version_id,
    enforcement_mode,
    financial_consequence_status,
    builder_resolution_status,
    builder_notified_at,
    inspector_notified_at,
    audit_trail
  )
  values (
    v_appointment.id,
    v_assignment.job_id,
    v_assignment.id,
    v_actor_id,
    'inspector',
    p_reason_code,
    p_explanation,
    v_now,
    coalesce(v_assignment.scheduled_start_at, v_appointment.scheduled_start_at),
    v_is_late,
    v_validity_status,
    v_preliminary,
    case when v_validity_status in ('valid', 'invalid') then v_validity_status else null end,
    v_reason_category,
    v_reason.requires_evidence,
    coalesce(p_evidence, '{}'::jsonb),
    v_policy.id,
    coalesce(v_policy.enforcement_mode, 'observe_only'),
    case when v_validity_status = 'invalid' and v_is_late then 'observe_only_projection' else 'not_applied' end,
    'reassignment_support',
    v_now,
    v_now,
    jsonb_build_array(jsonb_build_object(
      'action', 'cancellation.requested',
      'actorId', v_actor_id,
      'actorRole', 'inspector',
      'at', v_now,
      'preliminaryClassification', v_preliminary,
      'validityStatus', v_validity_status
    ))
  )
  returning *
  into v_cancellation;

  if v_validity_status = 'invalid' and v_is_late then
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
      admin_review_status,
      metadata
    )
    values (
      v_actor_id,
      v_assignment.job_id,
      v_assignment.id,
      v_appointment.id,
      'LATE_CANCELLATION',
      -12,
      v_policy.id,
      v_actor_id::text,
      'inspector',
      'pending',
      jsonb_build_object(
        'cancellationRequestId', v_cancellation.id,
        'reasonCode', p_reason_code,
        'protectedWindowMinutes', v_protected_window_minutes
      )
    )
    returning id into v_reliability_event_id;

    update public.inspector_reliability_profiles
    set
      invalid_late_cancellation_count = invalid_late_cancellation_count + 1,
      last_event_at = v_now,
      updated_at = v_now
    where inspector_id = v_actor_id;
  elsif v_validity_status = 'valid' then
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
      v_actor_id,
      v_assignment.job_id,
      v_assignment.id,
      v_appointment.id,
      case when p_reason_code = 'builder_site_not_ready' then 'builder_site_not_ready' else 'valid_cancellation' end,
      0,
      v_policy.id,
      v_actor_id::text,
      'inspector',
      jsonb_build_object('cancellationRequestId', v_cancellation.id, 'reasonCode', p_reason_code)
    );
  end if;

  update public.job_assignments
  set status = 'cancelled', cancelled_at = v_now, updated_at = v_now
  where id = v_assignment.id;

  update public.inspection_appointments
  set status = 'cancelled', updated_at = v_now
  where id = v_appointment.id;

  update public.job_opportunities
  set status = 'live', updated_at = v_now
  where id = v_assignment.job_id
    and status in ('provisionally_assigned', 'confirmed');

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
      'builder.assignment_reassignment_support',
      v_appointment.builder_id,
      'builder',
      'in_app',
      jsonb_build_object(
        'jobId', v_assignment.job_id,
        'assignmentId', v_assignment.id,
        'cancellationRequestId', v_cancellation.id,
        'copy', 'The assigned inspector is no longer available. Vero has begun reassignment support to protect your schedule. Your escrow remains protected while we resolve the appointment.'
      ),
      v_now
    ),
    (
      'inspector.cancellation_recorded',
      v_actor_id,
      'inspector',
      'in_app',
      jsonb_build_object(
        'jobId', v_assignment.job_id,
        'assignmentId', v_assignment.id,
        'cancellationRequestId', v_cancellation.id,
        'classification', v_preliminary,
        'appealAvailable', true,
        'copy', v_inspector_copy
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
    after_state,
    metadata
  )
  values (
    'cancellation_request',
    v_cancellation.id::text,
    'cancellation.requested',
    v_actor_id::text,
    'inspector',
    array['R-RELIABILITY-CANCEL-001'],
    'commercial',
    p_explanation,
    to_jsonb(v_cancellation),
    jsonb_build_object('reliabilityEventId', v_reliability_event_id)
  );

  return jsonb_build_object(
    'ok', true,
    'cancellationRequestId', v_cancellation.id,
    'preliminaryClassification', v_preliminary,
    'validityStatus', v_validity_status,
    'appealAvailable', true,
    'builderNotificationSent', true,
    'reliabilityEventId', v_reliability_event_id
  );
end;
$$;

create or replace function public.admin_review_inspection_cancellation(
  p_cancellation_request_id uuid,
  p_decision text,
  p_admin_note text,
  p_trigger_reassignment boolean default false,
  p_apply_financial_consequence boolean default false,
  p_waive_financial_consequence boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id text := auth.uid()::text;
  v_now timestamptz := now();
  v_request record;
  v_final_classification text;
  v_financial_status text;
begin
  if coalesce(
    auth.jwt() ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    ''
  ) <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin role required.');
  end if;

  if p_decision not in ('approved', 'rejected', 'overridden') then
    return jsonb_build_object('ok', false, 'error', 'Unsupported admin decision.');
  end if;

  select *
  into v_request
  from public.inspection_cancellation_requests
  where id = p_cancellation_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Cancellation request not found.');
  end if;

  v_final_classification := case
    when p_decision = 'approved' then 'valid'
    when p_decision = 'rejected' then 'invalid'
    else 'admin_overridden'
  end;

  v_financial_status := case
    when p_waive_financial_consequence then 'waived'
    when p_apply_financial_consequence then 'applied'
    when v_request.financial_consequence_status = 'observe_only_projection' then 'observe_only_projection'
    else 'not_applied'
  end;

  update public.inspection_cancellation_requests
  set
    validity_status = case when v_final_classification = 'admin_overridden' then 'admin_overridden' else v_final_classification end,
    final_classification = v_final_classification,
    admin_reviewed_by = v_actor_id,
    admin_reviewed_at = v_now,
    admin_note = p_admin_note,
    financial_consequence_status = v_financial_status,
    reassignment_triggered_at = case when p_trigger_reassignment then v_now else reassignment_triggered_at end,
    appeal_status = case when appeal_status in ('submitted', 'under_review') then 'resolved' else appeal_status end,
    audit_trail = audit_trail || jsonb_build_array(jsonb_build_object(
      'action', 'cancellation.admin_reviewed',
      'actorId', v_actor_id,
      'actorRole', 'admin',
      'at', v_now,
      'decision', p_decision,
      'finalClassification', v_final_classification,
      'financialConsequenceStatus', v_financial_status,
      'note', p_admin_note
    )),
    updated_at = v_now
  where id = p_cancellation_request_id;

  insert into public.governance_audit_events (
    entity_type,
    entity_id,
    action,
    actor_id,
    actor_role,
    rule_ids,
    blocker_type,
    reason,
    metadata
  )
  values (
    'cancellation_request',
    p_cancellation_request_id::text,
    'cancellation.admin_reviewed',
    v_actor_id,
    'admin',
    array['R-RELIABILITY-CANCEL-002'],
    'commercial',
    p_admin_note,
    jsonb_build_object(
      'decision', p_decision,
      'finalClassification', v_final_classification,
      'financialConsequenceStatus', v_financial_status,
      'triggerReassignment', p_trigger_reassignment
    )
  );

  return jsonb_build_object(
    'ok', true,
    'finalClassification', v_final_classification,
    'financialConsequenceStatus', v_financial_status,
    'reassignmentTriggered', p_trigger_reassignment
  );
end;
$$;

create or replace function public.submit_cancellation_appeal(
  p_cancellation_request_id uuid,
  p_appeal_note text,
  p_evidence jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_now timestamptz := now();
  v_request record;
begin
  select *
  into v_request
  from public.inspection_cancellation_requests
  where id = p_cancellation_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Cancellation request not found.');
  end if;

  if v_actor_id is null or v_request.requested_by_id <> v_actor_id then
    return jsonb_build_object('ok', false, 'error', 'Not authorized to appeal this cancellation.');
  end if;

  update public.inspection_cancellation_requests
  set
    appeal_status = 'submitted',
    appeal_note = p_appeal_note,
    appealed_at = v_now,
    evidence = evidence || coalesce(p_evidence, '{}'::jsonb),
    audit_trail = audit_trail || jsonb_build_array(jsonb_build_object(
      'action', 'cancellation.appeal_submitted',
      'actorId', v_actor_id,
      'actorRole', 'inspector',
      'at', v_now,
      'note', p_appeal_note
    )),
    updated_at = v_now
  where id = p_cancellation_request_id;

  insert into public.notification_events (
    event_key,
    recipient_role,
    channel,
    payload,
    scheduled_for
  )
  values (
    'admin.cancellation_appeal_submitted',
    'admin',
    'in_app',
    jsonb_build_object(
      'cancellationRequestId', p_cancellation_request_id,
      'jobId', v_request.job_id,
      'assignmentId', v_request.assignment_id
    ),
    v_now
  );

  return jsonb_build_object('ok', true, 'appealStatus', 'submitted');
end;
$$;

create or replace function public.record_inspection_no_show(
  p_assignment_id uuid,
  p_detected_at timestamptz default now(),
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment record;
  v_appointment record;
  v_policy record;
  v_reliability_event_id uuid;
begin
  select *
  into v_assignment
  from public.job_assignments
  where id = p_assignment_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Assignment not found.');
  end if;

  select *
  into v_appointment
  from public.inspection_appointments
  where assignment_id = p_assignment_id
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Appointment not found for no-show review.');
  end if;

  if v_appointment.status in ('cancelled', 'completed', 'reassigned') then
    return jsonb_build_object('ok', false, 'error', 'No-show cannot be recorded for a non-active appointment.');
  end if;

  if v_appointment.scheduled_start_at is not null
    and p_detected_at < v_appointment.scheduled_start_at + interval '15 minutes'
  then
    return jsonb_build_object(
      'ok', false,
      'error', 'No-show cannot be recorded before the active appointment grace window has elapsed.',
      'scheduledStartAt', v_appointment.scheduled_start_at
    );
  end if;

  select *
  into v_policy
  from public.reliability_policy_versions
  where status = 'active'
  order by created_at desc
  limit 1;

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
    admin_review_status,
    metadata
  )
  values (
    v_assignment.inspector_id,
    v_assignment.job_id,
    v_assignment.id,
    v_appointment.id,
    'NO_SHOW',
    -25,
    v_policy.id,
    'system',
    'system',
    'pending',
    jsonb_build_object('payoutBlocked', true, 'note', p_note)
  )
  returning id into v_reliability_event_id;

  update public.job_assignments
  set status = 'cancelled', cancelled_at = p_detected_at, updated_at = p_detected_at
  where id = v_assignment.id;

  update public.inspection_appointments
  set status = 'no_show', updated_at = p_detected_at
  where id = v_appointment.id;

  update public.inspector_reliability_profiles
  set
    no_show_count = no_show_count + 1,
    last_event_at = p_detected_at,
    updated_at = p_detected_at
  where inspector_id = v_assignment.inspector_id;

  insert into public.inspector_reserve_ledger_entries (
    inspector_id,
    job_id,
    assignment_id,
    reliability_event_id,
    entry_type,
    amount,
    enforcement_mode,
    legal_review_required,
    reason,
    status,
    metadata
  )
  values (
    v_assignment.inspector_id,
    v_assignment.job_id,
    v_assignment.id,
    v_reliability_event_id,
    'payout_hold',
    0,
    coalesce(v_policy.enforcement_mode, 'observe_only'),
    true,
    'No-show blocks payout for this job pending admin review.',
    'pending',
    jsonb_build_object('reviewRequired', true)
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
      'builder.assignment_reassignment_support',
      v_appointment.builder_id,
      'builder',
      'in_app',
      jsonb_build_object(
        'jobId', v_assignment.job_id,
        'assignmentId', v_assignment.id,
        'copy', 'The assigned inspector is no longer available. Vero has begun reassignment support to protect your schedule. Your escrow remains protected while we resolve the appointment.',
        'refundCreditWorkflow', coalesce(v_policy.config -> 'builderNoShowResolution', jsonb_build_object('mode', 'policy_configured'))
      ),
      p_detected_at
    ),
    (
      'inspector.no_show_recorded',
      v_assignment.inspector_id,
      'inspector',
      'in_app',
      jsonb_build_object(
        'jobId', v_assignment.job_id,
        'assignmentId', v_assignment.id,
        'appealAvailable', true,
        'copy', 'This cancellation has been recorded as reliability-impacting because it occurred inside the protected appointment window without a supported reason. You may submit an appeal or additional context for Admin review.'
      ),
      p_detected_at
    );

  return jsonb_build_object(
    'ok', true,
    'reliabilityEventId', v_reliability_event_id,
    'payoutBlocked', true,
    'adminReviewRequired', true,
    'appealAvailable', true
  );
end;
$$;

grant execute on function public.request_inspection_cancellation(uuid, text, text, jsonb) to authenticated;
grant execute on function public.admin_review_inspection_cancellation(uuid, text, text, boolean, boolean, boolean) to authenticated;
grant execute on function public.submit_cancellation_appeal(uuid, text, jsonb) to authenticated;
grant execute on function public.record_inspection_no_show(uuid, timestamptz, text) to authenticated;
