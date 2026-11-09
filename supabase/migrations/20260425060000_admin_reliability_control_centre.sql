-- Admin Reliability Control Centre protections and audit hooks.
--
-- Internal reliability policy configuration, payout decisions, cancellation
-- classifications, and reserve/credit actions must remain Admin-only and
-- auditable. Legal review is still required before monetary enforcement.

create or replace function public.current_jwt_role()
returns text
language sql
stable
as $$
  select coalesce(
    auth.jwt() ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    ''
  );
$$;

drop policy if exists reliability_policy_authenticated_read on public.reliability_policy_versions;
create policy reliability_policy_admin_read
  on public.reliability_policy_versions for select to authenticated
  using (public.current_jwt_role() = 'admin');

drop policy if exists reliability_policy_rules_authenticated_read on public.reliability_policy_rules;
create policy reliability_policy_rules_admin_read
  on public.reliability_policy_rules for select to authenticated
  using (public.current_jwt_role() = 'admin');

drop policy if exists reliability_tiers_authenticated_read on public.reliability_tier_definitions;
create policy reliability_tiers_admin_read
  on public.reliability_tier_definitions for select to authenticated
  using (public.current_jwt_role() = 'admin');

create or replace function public.admin_update_reliability_policy_config(
  p_policy_version_id uuid,
  p_config_patch jsonb default '{}'::jsonb,
  p_enforcement_mode text default null,
  p_admin_note text default null
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
  v_next_enforcement_mode text;
  v_next_config jsonb;
begin
  if public.current_jwt_role() <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin role required.');
  end if;

  if nullif(trim(coalesce(p_admin_note, '')), '') is null then
    return jsonb_build_object('ok', false, 'error', 'Admin rationale is required.');
  end if;

  if p_enforcement_mode is not null
    and p_enforcement_mode not in ('observe_only', 'soft_enforcement', 'full_enforcement')
  then
    return jsonb_build_object('ok', false, 'error', 'Unsupported enforcement mode.');
  end if;

  select *
  into v_before
  from public.reliability_policy_versions
  where id = p_policy_version_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Reliability policy version not found.');
  end if;

  v_next_enforcement_mode := coalesce(p_enforcement_mode, v_before.enforcement_mode, 'observe_only');
  v_next_config := coalesce(v_before.config, '{}'::jsonb)
    || coalesce(p_config_patch, '{}'::jsonb)
    || jsonb_build_object('enforcementMode', v_next_enforcement_mode);

  update public.reliability_policy_versions
  set
    enforcement_mode = v_next_enforcement_mode,
    config = v_next_config,
    notes = coalesce(p_admin_note, notes),
    legal_review_required = case
      when v_next_enforcement_mode = 'observe_only' then legal_review_required
      else true
    end,
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
    'reliability.policy_config_updated',
    v_actor_id,
    'admin',
    array['R-RELIABILITY-POLICY-001'],
    'policy',
    p_admin_note,
    to_jsonb(v_before),
    jsonb_build_object(
      'config', v_next_config,
      'enforcementMode', v_next_enforcement_mode
    ),
    jsonb_build_object(
      'configPatch', coalesce(p_config_patch, '{}'::jsonb),
      'legalReviewRequired', v_next_enforcement_mode <> 'observe_only'
    )
  );

  return jsonb_build_object(
    'ok', true,
    'policyVersionId', p_policy_version_id,
    'enforcementMode', v_next_enforcement_mode,
    'legalReviewRequired', v_next_enforcement_mode <> 'observe_only'
  );
end;
$$;

create or replace function public.admin_request_cancellation_information(
  p_cancellation_request_id uuid,
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
  v_request record;
begin
  if public.current_jwt_role() <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin role required.');
  end if;

  if nullif(trim(coalesce(p_admin_note, '')), '') is null then
    return jsonb_build_object('ok', false, 'error', 'Admin rationale is required.');
  end if;

  select *
  into v_request
  from public.inspection_cancellation_requests
  where id = p_cancellation_request_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Cancellation request not found.');
  end if;

  update public.inspection_cancellation_requests
  set
    validity_status = 'pending_review',
    admin_reviewed_by = v_actor_id,
    admin_reviewed_at = v_now,
    admin_note = p_admin_note,
    appeal_status = 'under_review',
    audit_trail = audit_trail || jsonb_build_array(jsonb_build_object(
      'action', 'cancellation.more_information_requested',
      'actorId', v_actor_id,
      'actorRole', 'admin',
      'at', v_now,
      'note', p_admin_note
    )),
    updated_at = v_now
  where id = p_cancellation_request_id;

  insert into public.notification_events (
    event_key,
    recipient_user_id,
    recipient_role,
    channel,
    payload,
    scheduled_for
  )
  values (
    'inspector.cancellation_more_information_requested',
    v_request.requested_by_id,
    v_request.requested_by_role,
    'in_app',
    jsonb_build_object(
      'cancellationRequestId', p_cancellation_request_id,
      'jobId', v_request.job_id,
      'assignmentId', v_request.assignment_id,
      'copy', 'Admin needs additional context before final cancellation classification.'
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
    metadata
  )
  values (
    'cancellation_request',
    p_cancellation_request_id::text,
    'cancellation.more_information_requested',
    v_actor_id,
    'admin',
    array['R-RELIABILITY-CANCEL-003'],
    'commercial',
    p_admin_note,
    jsonb_build_object(
      'jobId', v_request.job_id,
      'assignmentId', v_request.assignment_id
    )
  );

  return jsonb_build_object(
    'ok', true,
    'validityStatus', 'pending_review',
    'appealStatus', 'under_review'
  );
end;
$$;

create or replace function public.audit_admin_payout_review_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.decided_by_id is null then
    return new;
  end if;

  if old.admin_review_status is not distinct from new.admin_review_status
    and old.payout_status is not distinct from new.payout_status
    and old.decision_note is not distinct from new.decision_note
  then
    return new;
  end if;

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
    'job_payment_decision',
    new.id::text,
    'payout.admin_reviewed',
    new.decided_by_id,
    'admin',
    array['R-RELIABILITY-PAYOUT-002'],
    'commercial',
    new.decision_note,
    to_jsonb(old),
    to_jsonb(new),
    jsonb_build_object(
      'assignmentId', new.assignment_id,
      'jobId', new.job_id,
      'payoutStatus', new.payout_status,
      'adminReviewStatus', new.admin_review_status,
      'enforcementMode', new.enforcement_mode
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_audit_admin_payout_review_update on public.job_payment_decisions;
create trigger trg_audit_admin_payout_review_update
  after update on public.job_payment_decisions
  for each row execute function public.audit_admin_payout_review_update();

grant execute on function public.admin_update_reliability_policy_config(uuid, jsonb, text, text) to authenticated;
grant execute on function public.admin_request_cancellation_information(uuid, text) to authenticated;
