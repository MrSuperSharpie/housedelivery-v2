-- Inspector Reliability feature flags and rollout controls.
--
-- Safe default remains observe_only: calculate and show Admin data, but do not
-- move money, auto-restrict inspectors, or suspend without explicit policy.

update public.reliability_policy_versions
set
  enforcement_mode = coalesce(nullif(enforcement_mode, ''), 'observe_only'),
  config = jsonb_build_object(
    'featureFlags', jsonb_build_object(
      'inspectorReliabilityEnabled', true,
      'inspectorTierDashboardEnabled', false,
      'confirmationLadderEnabled', true,
      'standbyReassignmentEnabled', true,
      'payoutReserveEnabled', true,
      'reliabilityGuaranteeBuilderCopyEnabled', true,
      'adminReliabilityControlCentreEnabled', true
    ),
    'enforcementMode', coalesce(nullif(enforcement_mode, ''), 'observe_only'),
    'emergencyKillSwitch', false,
    'automaticRestrictionRulesEnabled', false,
    'automaticSuspensionEnabled', false,
    'suspensionsRequireAdminConfirmation', true
  ) || coalesce(config, '{}'::jsonb)
where status = 'active';

create or replace function public.admin_disable_reliability_enforcement(
  p_policy_version_id uuid,
  p_admin_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id text := auth.uid()::text;
  v_now timestamptz := now();
  v_before record;
  v_next_config jsonb;
begin
  if public.current_jwt_role() <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin role required.');
  end if;

  if nullif(trim(coalesce(p_admin_note, '')), '') is null then
    return jsonb_build_object('ok', false, 'error', 'Admin rationale is required.');
  end if;

  select *
  into v_before
  from public.reliability_policy_versions
  where id = p_policy_version_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Reliability policy version not found.');
  end if;

  v_next_config := coalesce(v_before.config, '{}'::jsonb)
    || jsonb_build_object(
      'enforcementMode', 'observe_only',
      'emergencyKillSwitch', true,
      'automaticRestrictionRulesEnabled', false,
      'automaticSuspensionEnabled', false,
      'suspensionsRequireAdminConfirmation', true
    );

  update public.reliability_policy_versions
  set
    enforcement_mode = 'observe_only',
    config = v_next_config,
    notes = p_admin_note,
    legal_review_required = true,
    updated_at = v_now
  where id = p_policy_version_id;

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
    'reliability_policy_version',
    p_policy_version_id::text,
    'reliability.enforcement_disabled',
    v_actor_id,
    'admin',
    array['R-RELIABILITY-ROLLOUT-001'],
    'policy',
    p_admin_note,
    to_jsonb(v_before),
    jsonb_build_object('enforcementMode', 'observe_only', 'config', v_next_config),
    jsonb_build_object(
      'emergencyKillSwitch', true,
      'moneyMovementAllowed', false,
      'automaticConsequencesDisabled', true
    )
  );

  return jsonb_build_object(
    'ok', true,
    'enforcementMode', 'observe_only',
    'emergencyKillSwitch', true,
    'moneyMovementAllowed', false
  );
end;
$$;

grant execute on function public.admin_disable_reliability_enforcement(uuid, text) to authenticated;
