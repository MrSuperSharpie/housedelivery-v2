alter table public.inspector_onboarding_status
  add column if not exists disciplines text[] not null default '{}',
  add column if not exists regions text[] not null default '{}',
  add column if not exists license_number text,
  add column if not exists credential_expires_at timestamptz;

insert into public.inspector_onboarding_status (
  user_id,
  status,
  disciplines,
  regions,
  license_number,
  updated_at
)
select
  au.id::text,
  case
    when coalesce(au.raw_user_meta_data ->> 'onboarding_status', '') in ('draft', 'submitted', 'under_review', 'needs_info', 'approved', 'rejected', 'suspended')
      then (au.raw_user_meta_data ->> 'onboarding_status')
    else 'submitted'
  end,
  case
    when jsonb_typeof(au.raw_user_meta_data -> 'disciplines') = 'array'
      then array(select jsonb_array_elements_text(au.raw_user_meta_data -> 'disciplines'))
    else '{}'::text[]
  end,
  case
    when jsonb_typeof(au.raw_user_meta_data -> 'regions') = 'array'
      then array(select jsonb_array_elements_text(au.raw_user_meta_data -> 'regions'))
    else '{}'::text[]
  end,
  nullif(coalesce(au.raw_user_meta_data ->> 'license_number', au.raw_user_meta_data ->> 'licenseNumber'), ''),
  now()
from auth.users au
where lower(coalesce(au.raw_user_meta_data ->> 'role', '')) = 'inspector'
on conflict (user_id) do nothing;

update public.inspector_onboarding_status ios
set
  disciplines = case
    when jsonb_typeof(au.raw_user_meta_data -> 'disciplines') = 'array'
      then array(select jsonb_array_elements_text(au.raw_user_meta_data -> 'disciplines'))
    else ios.disciplines
  end,
  regions = case
    when jsonb_typeof(au.raw_user_meta_data -> 'regions') = 'array'
      then array(select jsonb_array_elements_text(au.raw_user_meta_data -> 'regions'))
    else ios.regions
  end,
  license_number = coalesce(
    nullif(au.raw_user_meta_data ->> 'license_number', ''),
    nullif(au.raw_user_meta_data ->> 'licenseNumber', ''),
    ios.license_number
  )
from auth.users au
where au.id::text = ios.user_id;

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
  v_window interval := interval '24 hours';
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
  where id = p_job_id
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

  if not (coalesce(v_eligibility.disciplines, '{}'::text[]) @> array[v_job.required_discipline::text]) then
    return jsonb_build_object(
      'ok', false,
      'error', initcap(v_job.required_discipline::text) || ' credential required'
    );
  end if;

  if not (coalesce(v_eligibility.regions, '{}'::text[]) @> array[v_job.region::text]) then
    return jsonb_build_object(
      'ok', false,
      'error', initcap(v_job.region::text) || ' authorization required'
    );
  end if;

  if v_eligibility.credential_expires_at is not null and v_eligibility.credential_expires_at < v_now then
    return jsonb_build_object('ok', false, 'error', 'Credential expired');
  end if;

  if exists (
    select 1
    from public.job_assignments
    where job_id = p_job_id
      and status in ('provisional', 'confirmed')
  ) then
    return jsonb_build_object('ok', false, 'error', 'Job has already been claimed.');
  end if;

  if v_job.dispatch_tier = 'emergency' then
    v_window := interval '2 hours';
  elsif v_job.dispatch_tier = 'priority' then
    v_window := interval '12 hours';
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
    p_job_id,
    v_inspector_id,
    v_inspector_id,
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
  where id = p_job_id;

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
    p_job_id,
    v_inspector_id,
    'inspector',
    v_job.status,
    'provisionally_assigned',
    'Inspector claimed job from Live Board',
    v_now
  );

  return jsonb_build_object(
    'ok', true,
    'assignment', to_jsonb(v_assignment)
  );
end;
$$;

grant execute on function public.claim_live_job_if_eligible(text, jsonb) to authenticated;
