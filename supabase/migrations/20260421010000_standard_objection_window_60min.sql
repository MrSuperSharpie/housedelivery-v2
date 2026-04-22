-- Shorten standard-tier objection window from 24 hours to 60 minutes.
--
-- All three tiers are now:
--   emergency = 30 minutes
--   priority  = 1 hour
--   standard  = 60 minutes (was 24 hours)
--
-- Rationale: the 24-hour window stalls instant-dispatch momentum for standard
-- jobs. A 60-minute window still gives builders time to raise a legitimate
-- objection while keeping the assignment cycle tight.

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

  -- NOTE: validation_status check intentionally absent — column does not exist
  -- in the live DB (migration 20260407020000 not yet applied).

  -- inspector_onboarding_status.user_id is text — no cast needed
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

  if not (coalesce(v_eligibility.disciplines, '{}'::text[]) @> array[v_job.required_discipline::text]) then
    return jsonb_build_object('ok', false, 'error', initcap(v_job.required_discipline::text) || ' credential required');
  end if;

  if not (coalesce(v_eligibility.regions, '{}'::text[]) @> array[v_job.region::text]) then
    return jsonb_build_object('ok', false, 'error', initcap(v_job.region::text) || ' authorization required');
  end if;

  if v_eligibility.credential_expires_at is not null and v_eligibility.credential_expires_at < v_now then
    return jsonb_build_object('ok', false, 'error', 'Credential expired');
  end if;

  -- Objection windows (all tiers are now within the hour)
  if v_job.dispatch_tier = 'emergency' then
    v_window := interval '30 minutes';
  elsif v_job.dispatch_tier = 'priority' then
    v_window := interval '1 hour';
  end if;
  -- standard tier uses the 60-minute default declared above

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
