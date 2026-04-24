-- Transition Live Board claims to an open market.
--
-- Preserved:
--   • Onboarding status gate (must be 'approved')
--   • Credential authority check
--   • 60-minute standard / 30-minute emergency / 1-hour priority objection windows
--   • Assignment insert, job status update, status event logging
--   • unique_violation exception handler
--
-- Removed:
--   • Region gate on inspector_onboarding_status.regions

create or replace function public.claim_live_job_if_eligible(
  p_job_id text,
  p_claimed_slot jsonb default null
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
  v_authority_check jsonb;
  v_required_action text;
  v_now timestamptz := now();
  v_window interval := interval '60 minutes';
  v_claimed_slot jsonb := coalesce(
    p_claimed_slot,
    jsonb_build_object('date', '', 'startTime', '', 'endTime', '', 'flexible', true)
  );
begin
  if v_inspector_id is null then
    return jsonb_build_object('ok', false, 'error', 'Inspector is not authenticated.');
  end if;

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
  elsif v_job.dispatch_tier = 'priority' then
    v_window := interval '1 hour';
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
    v_now
  )
  returning *
  into v_assignment;

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
    'Inspector claimed job from Live Board',
    v_now
  );

  return jsonb_build_object('ok', true, 'assignment', to_jsonb(v_assignment));
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'Job has already been claimed.');
end;
$$;

grant execute on function public.claim_live_job_if_eligible(text, jsonb) to authenticated;
