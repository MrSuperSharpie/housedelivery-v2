-- Payout and reserve hooks for Inspector Reliability.
--
-- LEGAL REVIEW REQUIRED before any money movement, reserve application, payout
-- reduction, or builder credit is enforced beyond observe_only projections.

alter table public.job_payment_decisions
  add column if not exists payout_block_reason_code text,
  add column if not exists admin_review_status text not null default 'pending'
    check (admin_review_status in ('pending', 'approved', 'reduced', 'blocked', 'waived', 'released')),
  add column if not exists payout_reduction_amount numeric(10,2) not null default 0,
  add column if not exists reserve_withheld_amount numeric(10,2) not null default 0,
  add column if not exists builder_credit_amount numeric(10,2) not null default 0,
  add column if not exists policy_version_id uuid references public.reliability_policy_versions(id) on delete set null,
  add column if not exists enforcement_mode text not null default 'observe_only'
    check (enforcement_mode in ('observe_only', 'soft_enforcement', 'full_enforcement')),
  add column if not exists reliability_event_ids jsonb not null default '[]'::jsonb,
  add column if not exists release_eligible_at timestamptz,
  add column if not exists released_by_admin_id text,
  add column if not exists audit_trail jsonb not null default '[]'::jsonb;

alter table public.inspector_reserve_ledger_entries
  drop constraint if exists inspector_reserve_ledger_entries_entry_type_check,
  drop constraint if exists inspector_reserve_ledger_entries_status_check;

alter table public.inspector_reserve_ledger_entries
  add constraint inspector_reserve_ledger_entries_entry_type_check
  check (entry_type in (
    'observe_only_projection',
    'reserve_hold',
    'reserve_release',
    'reserve_applied_to_builder_credit',
    'payout_hold',
    'payout_release',
    'admin_adjustment'
  )),
  add constraint inspector_reserve_ledger_entries_status_check
  check (status in ('pending', 'posted', 'released', 'voided', 'approved', 'applied'));

alter table public.inspector_reserve_ledger_entries
  add column if not exists release_eligible_at timestamptz,
  add column if not exists admin_decision_status text
    check (admin_decision_status is null or admin_decision_status in ('pending', 'approved', 'waived', 'applied')),
  add column if not exists admin_approved_by text,
  add column if not exists admin_approved_at timestamptz,
  add column if not exists audit_trail jsonb not null default '[]'::jsonb;

create table if not exists public.builder_refund_credit_hooks (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_opportunities(id) on delete cascade,
  assignment_id uuid references public.job_assignments(id) on delete set null,
  builder_id uuid,
  trigger_reason text not null
    check (trigger_reason in ('no_show', 'invalid_late_cancellation', 'builder_site_not_ready', 'admin_adjustment')),
  amount numeric(10,2) not null default 0,
  currency text not null default 'CAD',
  status text not null default 'pending_admin_review'
    check (status in ('projected', 'pending_admin_review', 'approved', 'issued', 'waived')),
  funding_source text not null default 'policy_configured'
    check (funding_source in ('policy_configured', 'escrow_refund', 'platform_budget', 'rush_budget', 'inspector_reserve')),
  enforcement_mode text not null default 'observe_only'
    check (enforcement_mode in ('observe_only', 'soft_enforcement', 'full_enforcement')),
  requires_admin_approval boolean not null default true,
  policy_version_id uuid references public.reliability_policy_versions(id) on delete set null,
  admin_reviewed_by text,
  admin_reviewed_at timestamptz,
  admin_note text,
  metadata jsonb not null default '{}'::jsonb,
  audit_trail jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, assignment_id, trigger_reason)
);

drop trigger if exists trg_builder_refund_credit_hooks_updated_at on public.builder_refund_credit_hooks;
create trigger trg_builder_refund_credit_hooks_updated_at
  before update on public.builder_refund_credit_hooks
  for each row execute function public.set_governance_updated_at();

alter table public.builder_refund_credit_hooks enable row level security;

drop policy if exists builder_credit_hooks_admin_read on public.builder_refund_credit_hooks;
create policy builder_credit_hooks_admin_read
  on public.builder_refund_credit_hooks for select to authenticated
  using (
    coalesce(
      auth.jwt() ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    ) = 'admin'
  );

create index if not exists idx_payment_decisions_admin_review
  on public.job_payment_decisions(admin_review_status, decided_at desc);

create index if not exists idx_builder_credit_hooks_status
  on public.builder_refund_credit_hooks(status, created_at desc);

create or replace function public.evaluate_assignment_payout_hooks(
  p_assignment_id uuid,
  p_context jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment record;
  v_job record;
  v_profile record;
  v_policy record;
  v_policy_config jsonb := '{}'::jsonb;
  v_policy_id uuid;
  v_enforcement_mode text := 'observe_only';
  v_legal_review_required boolean := true;
  v_now timestamptz := now();
  v_has_dispute boolean := false;
  v_has_no_show boolean := false;
  v_has_invalid_late_cancellation boolean := false;
  v_has_builder_site_not_ready boolean := false;
  v_evidence_complete boolean := true;
  v_payout_status text := 'payout_ready';
  v_payment_status text := 'earned_pending_review';
  v_block_reason text;
  v_admin_review_status text := 'pending';
  v_gross_amount numeric(10,2) := 0;
  v_base_fee_amount numeric(10,2) := 0;
  v_hold_premium_amount numeric(10,2) := 0;
  v_reserve_percent numeric(5,2) := 0;
  v_reserve_amount numeric(10,2) := 0;
  v_reserve_release_days integer := 30;
  v_reserve_hooks_enabled boolean := false;
  v_builder_credit_hooks_enabled boolean := false;
  v_invalid_late_cancellation_action text := 'review';
  v_tier_key text := 'standard';
  v_builder_credit_amount numeric(10,2) := 0;
  v_builder_credit_status text := 'projected';
  v_reliability_event_ids jsonb := '[]'::jsonb;
  v_release_eligible_at timestamptz;
  v_payment_decision_id uuid;
begin
  select *
  into v_assignment
  from public.job_assignments
  where id = p_assignment_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Assignment not found.');
  end if;

  if auth.uid() is not null
    and v_assignment.inspector_id <> auth.uid()
    and coalesce(
      auth.jwt() ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    ) <> 'admin'
  then
    return jsonb_build_object('ok', false, 'error', 'Not authorized to evaluate this payout.');
  end if;

  select *
  into v_job
  from public.job_opportunities
  where id = v_assignment.job_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Job not found.');
  end if;

  select *
  into v_profile
  from public.inspector_reliability_profiles
  where inspector_id = v_assignment.inspector_id;

  if found then
    v_tier_key := coalesce(v_profile.manual_tier_override, v_profile.tier_key, 'standard');
  end if;

  select *
  into v_policy
  from public.reliability_policy_versions
  where status = 'active'
  order by created_at desc
  limit 1;

  if found then
    v_policy_id := v_policy.id;
    v_policy_config := coalesce(v_policy.config, '{}'::jsonb);
    v_enforcement_mode := coalesce(nullif(v_policy.enforcement_mode, ''), 'observe_only');
    v_legal_review_required := v_policy.legal_review_required;
  end if;

  v_evidence_complete := coalesce((p_context ->> 'evidenceComplete')::boolean, true);
  v_hold_premium_amount := greatest(coalesce((p_context ->> 'holdPremiumAmount')::numeric, 0), 0);
  v_base_fee_amount := greatest(coalesce(v_assignment.escrow_amount, v_job.offered_rate, 0), 0);
  v_gross_amount := v_base_fee_amount + v_hold_premium_amount;
  v_reserve_hooks_enabled := coalesce((v_policy_config ->> 'reserveHooksEnabled')::boolean, false);
  v_builder_credit_hooks_enabled := coalesce((v_policy_config ->> 'builderCreditHooksEnabled')::boolean, false);
  v_invalid_late_cancellation_action := coalesce(nullif(v_policy_config ->> 'invalidLateCancellationPayoutAction', ''), 'review');
  v_reserve_release_days := coalesce((v_policy_config ->> 'reserveReleaseDays')::integer, 30);
  v_builder_credit_amount := greatest(coalesce((v_policy_config ->> 'builderCreditAmount')::numeric, 0), 0);

  select coalesce(jsonb_agg(id), '[]'::jsonb)
  into v_reliability_event_ids
  from public.inspector_reliability_events
  where assignment_id = p_assignment_id
    and event_type in (
      'NO_SHOW',
      'no_show',
      'LATE_CANCELLATION',
      'invalid_late_cancellation',
      'builder_site_not_ready',
      'evidence_incomplete',
      'dispute_opened'
    );

  select exists (
    select 1
    from public.job_disputes d
    where d.assignment_id = p_assignment_id::text
      and d.status = 'open'
      and d.commercial_block = true
  )
  into v_has_dispute;

  select exists (
    select 1
    from public.inspector_reliability_events e
    where e.assignment_id = p_assignment_id
      and e.event_type in ('NO_SHOW', 'no_show')
  )
  into v_has_no_show;

  select exists (
    select 1
    from public.inspector_reliability_events e
    where e.assignment_id = p_assignment_id
      and e.event_type in ('LATE_CANCELLATION', 'invalid_late_cancellation')
  ) or exists (
    select 1
    from public.inspection_cancellation_requests c
    where c.assignment_id = p_assignment_id
      and c.validity_status = 'invalid'
      and c.is_late = true
  )
  into v_has_invalid_late_cancellation;

  select exists (
    select 1
    from public.inspector_reliability_events e
    where e.assignment_id = p_assignment_id
      and e.event_type = 'builder_site_not_ready'
  ) or exists (
    select 1
    from public.site_readiness_incidents s
    where s.assignment_id = p_assignment_id
      and s.inspector_protected = true
  )
  into v_has_builder_site_not_ready;

  if v_has_no_show then
    v_payout_status := 'blocked';
    v_block_reason := 'no_show';
    v_admin_review_status := 'blocked';
  elsif v_has_dispute then
    v_payout_status := 'blocked';
    v_block_reason := 'active_dispute';
    v_admin_review_status := 'blocked';
  elsif not v_evidence_complete then
    v_payout_status := 'review';
    v_block_reason := 'incomplete_evidence';
    v_admin_review_status := 'pending';
  elsif v_has_invalid_late_cancellation then
    v_payout_status := case when v_invalid_late_cancellation_action = 'blocked' then 'blocked' else 'review' end;
    v_block_reason := 'invalid_late_cancellation';
    v_admin_review_status := case when v_invalid_late_cancellation_action = 'blocked' then 'blocked' else 'pending' end;
  else
    v_payout_status := case when v_enforcement_mode = 'observe_only' then 'observe_only_projected' else 'payout_ready' end;
    v_admin_review_status := case when v_enforcement_mode = 'observe_only' then 'pending' else 'approved' end;
    v_block_reason := case when v_has_builder_site_not_ready then 'builder_site_not_ready_protected' else null end;
  end if;

  if v_reserve_hooks_enabled then
    v_reserve_percent := greatest(coalesce(
      (v_policy_config -> 'tierReservePercents' ->> v_tier_key)::numeric,
      0
    ), 0);
  end if;

  v_reserve_amount := round(v_gross_amount * v_reserve_percent / 100, 2);
  v_release_eligible_at := v_now + make_interval(days => v_reserve_release_days);

  insert into public.job_payment_decisions (
    job_id,
    assignment_id,
    payment_status,
    payout_status,
    base_fee_amount,
    hold_premium_amount,
    siteline_commission_amount,
    blocked_reason,
    decision_note,
    decided_by_id,
    decided_at,
    released_at,
    payout_block_reason_code,
    admin_review_status,
    reserve_withheld_amount,
    builder_credit_amount,
    policy_version_id,
    enforcement_mode,
    reliability_event_ids,
    release_eligible_at,
    audit_trail,
    metadata
  )
  values (
    v_assignment.job_id::text,
    v_assignment.id::text,
    v_payment_status,
    v_payout_status,
    v_base_fee_amount,
    v_hold_premium_amount,
    0,
    v_block_reason,
    'Payout evaluated by reliability hooks.',
    'system',
    v_now,
    null,
    v_block_reason,
    v_admin_review_status,
    v_reserve_amount,
    case when v_has_no_show or v_has_invalid_late_cancellation then v_builder_credit_amount else 0 end,
    v_policy_id,
    v_enforcement_mode,
    v_reliability_event_ids,
    v_release_eligible_at,
    jsonb_build_array(jsonb_build_object(
      'event', 'payout.evaluated',
      'at', v_now,
      'enforcementMode', v_enforcement_mode,
      'payoutStatus', v_payout_status,
      'blockReason', v_block_reason
    )),
    jsonb_build_object(
      'source', 'evaluate_assignment_payout_hooks',
      'inspectionOutcome', p_context ->> 'inspectionOutcome',
      'evidenceComplete', v_evidence_complete,
      'builderSiteNotReadyProtected', v_has_builder_site_not_ready
    )
  )
  on conflict (job_id) do update set
    assignment_id = excluded.assignment_id,
    payment_status = excluded.payment_status,
    payout_status = excluded.payout_status,
    base_fee_amount = excluded.base_fee_amount,
    hold_premium_amount = excluded.hold_premium_amount,
    blocked_reason = excluded.blocked_reason,
    decision_note = excluded.decision_note,
    decided_by_id = excluded.decided_by_id,
    decided_at = excluded.decided_at,
    payout_block_reason_code = excluded.payout_block_reason_code,
    admin_review_status = excluded.admin_review_status,
    reserve_withheld_amount = excluded.reserve_withheld_amount,
    builder_credit_amount = excluded.builder_credit_amount,
    policy_version_id = excluded.policy_version_id,
    enforcement_mode = excluded.enforcement_mode,
    reliability_event_ids = excluded.reliability_event_ids,
    release_eligible_at = excluded.release_eligible_at,
    audit_trail = public.job_payment_decisions.audit_trail || excluded.audit_trail,
    metadata = public.job_payment_decisions.metadata || excluded.metadata
  returning id
  into v_payment_decision_id;

  if v_payout_status = 'payout_ready' and v_enforcement_mode <> 'observe_only' then
    update public.job_assignments
    set escrow_status = 'payout_ready', updated_at = v_now
    where id = p_assignment_id;
  elsif v_payout_status = 'blocked' and v_enforcement_mode <> 'observe_only' then
    update public.job_assignments
    set escrow_status = 'blocked', updated_at = v_now
    where id = p_assignment_id;
  end if;

  if v_reserve_amount > 0 then
    insert into public.inspector_reserve_ledger_entries (
      inspector_id,
      job_id,
      assignment_id,
      entry_type,
      amount,
      currency,
      enforcement_mode,
      legal_review_required,
      reason,
      status,
      metadata,
      release_eligible_at,
      audit_trail
    )
    values (
      v_assignment.inspector_id,
      v_assignment.job_id,
      v_assignment.id,
      case when v_enforcement_mode = 'observe_only' then 'observe_only_projection' else 'reserve_hold' end,
      v_reserve_amount,
      'CAD',
      v_enforcement_mode,
      v_legal_review_required,
      'Tier-based reserve hook calculated for eligible payout.',
      case when v_enforcement_mode = 'observe_only' then 'pending' else 'posted' end,
      jsonb_build_object(
        'paymentDecisionId', v_payment_decision_id,
        'tierKey', v_tier_key,
        'reservePercent', v_reserve_percent,
        'grossAmount', v_gross_amount
      ),
      v_release_eligible_at,
      jsonb_build_array(jsonb_build_object('event', 'reserve.calculated', 'at', v_now))
    );
  end if;

  if (v_has_no_show or v_has_invalid_late_cancellation) then
    v_builder_credit_status := case
      when v_enforcement_mode = 'observe_only' then 'projected'
      when v_builder_credit_hooks_enabled then 'pending_admin_review'
      else 'projected'
    end;

    insert into public.builder_refund_credit_hooks (
      job_id,
      assignment_id,
      builder_id,
      trigger_reason,
      amount,
      status,
      funding_source,
      enforcement_mode,
      policy_version_id,
      metadata,
      audit_trail
    )
    values (
      v_assignment.job_id,
      v_assignment.id,
      v_job.builder_id,
      case when v_has_no_show then 'no_show' else 'invalid_late_cancellation' end,
      v_builder_credit_amount,
      v_builder_credit_status,
      coalesce(nullif(v_policy_config ->> 'builderCreditFundingSource', ''), 'policy_configured'),
      v_enforcement_mode,
      v_policy_id,
      jsonb_build_object(
        'paymentDecisionId', v_payment_decision_id,
        'escrowProtected', true,
        'message', 'Escrow remains protected while Vero resolves the appointment.'
      ),
      jsonb_build_array(jsonb_build_object('event', 'builder_credit.projected', 'at', v_now))
    )
    on conflict (job_id, assignment_id, trigger_reason) do update set
      amount = excluded.amount,
      status = excluded.status,
      funding_source = excluded.funding_source,
      enforcement_mode = excluded.enforcement_mode,
      policy_version_id = excluded.policy_version_id,
      metadata = public.builder_refund_credit_hooks.metadata || excluded.metadata,
      audit_trail = public.builder_refund_credit_hooks.audit_trail || excluded.audit_trail,
      updated_at = v_now;
  end if;

  return jsonb_build_object(
    'ok', true,
    'assignmentId', p_assignment_id,
    'paymentDecisionId', v_payment_decision_id,
    'payoutStatus', v_payout_status,
    'blockReason', v_block_reason,
    'reserveAmount', v_reserve_amount,
    'reservePercent', v_reserve_percent,
    'builderCreditAmount', case when v_has_no_show or v_has_invalid_late_cancellation then v_builder_credit_amount else 0 end,
    'enforcementMode', v_enforcement_mode,
    'observeOnly', v_enforcement_mode = 'observe_only'
  );
end;
$$;

create or replace function public.admin_review_payout_hook(
  p_assignment_id uuid,
  p_decision text,
  p_admin_note text,
  p_payout_reduction_amount numeric default 0,
  p_apply_reserve boolean default false,
  p_issue_builder_credit boolean default false,
  p_builder_credit_amount numeric default 0,
  p_waive_consequence boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id text := auth.uid()::text;
  v_now timestamptz := now();
  v_assignment record;
  v_job record;
  v_decision record;
  v_new_payout_status text;
  v_new_review_status text;
  v_builder_credit_status text;
begin
  if coalesce(
    auth.jwt() ->> 'role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    ''
  ) <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin role required.');
  end if;

  if nullif(trim(coalesce(p_admin_note, '')), '') is null then
    return jsonb_build_object('ok', false, 'error', 'Admin rationale is required.');
  end if;

  if p_decision not in ('approve_payout', 'reduce_payout', 'block_payout', 'apply_reserve', 'waive_consequence', 'issue_builder_credit') then
    return jsonb_build_object('ok', false, 'error', 'Unsupported payout decision.');
  end if;

  select *
  into v_assignment
  from public.job_assignments
  where id = p_assignment_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Assignment not found.');
  end if;

  select *
  into v_job
  from public.job_opportunities
  where id = v_assignment.job_id;

  select *
  into v_decision
  from public.job_payment_decisions
  where assignment_id = p_assignment_id::text
  for update;

  if not found then
    perform public.evaluate_assignment_payout_hooks(p_assignment_id, '{}'::jsonb);

    select *
    into v_decision
    from public.job_payment_decisions
    where assignment_id = p_assignment_id::text
    for update;
  end if;

  v_new_payout_status := case
    when p_decision = 'approve_payout' then 'payout_ready'
    when p_decision = 'reduce_payout' then 'payout_ready'
    when p_decision = 'block_payout' then 'blocked'
    when p_decision = 'waive_consequence' or p_waive_consequence then 'payout_ready'
    else v_decision.payout_status
  end;

  v_new_review_status := case
    when p_decision = 'approve_payout' then 'approved'
    when p_decision = 'reduce_payout' then 'reduced'
    when p_decision = 'block_payout' then 'blocked'
    when p_decision = 'apply_reserve' then 'approved'
    when p_decision = 'issue_builder_credit' then 'approved'
    when p_decision = 'waive_consequence' or p_waive_consequence then 'waived'
    else v_decision.admin_review_status
  end;

  update public.job_payment_decisions
  set
    payout_status = v_new_payout_status,
    admin_review_status = v_new_review_status,
    payout_reduction_amount = greatest(coalesce(p_payout_reduction_amount, 0), 0),
    builder_credit_amount = case
      when p_issue_builder_credit then greatest(coalesce(p_builder_credit_amount, 0), 0)
      else builder_credit_amount
    end,
    released_at = case when v_new_payout_status = 'payout_ready' then v_now else released_at end,
    released_by_admin_id = case when v_new_payout_status = 'payout_ready' then v_actor_id else released_by_admin_id end,
    blocked_reason = case when p_decision = 'block_payout' then coalesce(blocked_reason, 'admin_blocked') else blocked_reason end,
    decision_note = p_admin_note,
    decided_by_id = v_actor_id,
    decided_at = v_now,
    audit_trail = audit_trail || jsonb_build_array(jsonb_build_object(
      'event', 'payout.admin_reviewed',
      'at', v_now,
      'actorId', v_actor_id,
      'decision', p_decision,
      'note', p_admin_note,
      'payoutReductionAmount', greatest(coalesce(p_payout_reduction_amount, 0), 0),
      'applyReserve', p_apply_reserve,
      'issueBuilderCredit', p_issue_builder_credit,
      'waiveConsequence', p_waive_consequence
    ))
  where id = v_decision.id;

  if v_new_payout_status = 'payout_ready' then
    update public.job_assignments
    set escrow_status = 'payout_ready', updated_at = v_now
    where id = p_assignment_id;
  elsif v_new_payout_status = 'blocked' then
    update public.job_assignments
    set escrow_status = 'blocked', updated_at = v_now
    where id = p_assignment_id;
  end if;

  if p_apply_reserve then
    update public.inspector_reserve_ledger_entries
    set
      entry_type = 'reserve_applied_to_builder_credit',
      status = 'applied',
      admin_decision_status = 'applied',
      admin_approved_by = v_actor_id,
      admin_approved_at = v_now,
      audit_trail = audit_trail || jsonb_build_array(jsonb_build_object(
        'event', 'reserve.applied_by_admin',
        'at', v_now,
        'actorId', v_actor_id,
        'note', p_admin_note
      ))
    where assignment_id = p_assignment_id
      and status in ('pending', 'posted', 'approved');
  end if;

  if p_issue_builder_credit then
    v_builder_credit_status := 'approved';

    insert into public.builder_refund_credit_hooks (
      job_id,
      assignment_id,
      builder_id,
      trigger_reason,
      amount,
      status,
      funding_source,
      enforcement_mode,
      admin_reviewed_by,
      admin_reviewed_at,
      admin_note,
      audit_trail
    )
    values (
      v_assignment.job_id,
      p_assignment_id,
      v_job.builder_id,
      'admin_adjustment',
      greatest(coalesce(p_builder_credit_amount, 0), 0),
      v_builder_credit_status,
      case when p_apply_reserve then 'inspector_reserve' else 'policy_configured' end,
      coalesce(v_decision.enforcement_mode, 'observe_only'),
      v_actor_id,
      v_now,
      p_admin_note,
      jsonb_build_array(jsonb_build_object(
        'event', 'builder_credit.admin_approved',
        'at', v_now,
        'actorId', v_actor_id,
        'note', p_admin_note
      ))
    )
    on conflict (job_id, assignment_id, trigger_reason) do update set
      amount = excluded.amount,
      status = excluded.status,
      funding_source = excluded.funding_source,
      admin_reviewed_by = excluded.admin_reviewed_by,
      admin_reviewed_at = excluded.admin_reviewed_at,
      admin_note = excluded.admin_note,
      audit_trail = public.builder_refund_credit_hooks.audit_trail || excluded.audit_trail,
      updated_at = v_now;
  end if;

  return jsonb_build_object(
    'ok', true,
    'assignmentId', p_assignment_id,
    'decision', p_decision,
    'payoutStatus', v_new_payout_status,
    'adminReviewStatus', v_new_review_status
  );
end;
$$;

create or replace function public.handle_assignment_payout_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.escrow_status = 'earned_pending_review'
    and old.escrow_status is distinct from new.escrow_status
  then
    perform public.evaluate_assignment_payout_hooks(new.id, '{}'::jsonb);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assignment_payout_review on public.job_assignments;
create trigger trg_assignment_payout_review
  after update of escrow_status on public.job_assignments
  for each row execute function public.handle_assignment_payout_review();

create or replace view public.admin_payout_review_queue as
select
  jpd.id as payment_decision_id,
  jpd.job_id,
  jpd.assignment_id,
  ja.inspector_id,
  jo.builder_id,
  jpd.payout_status,
  jpd.payment_status,
  jpd.payout_block_reason_code,
  jpd.admin_review_status,
  jpd.base_fee_amount,
  jpd.hold_premium_amount,
  jpd.reserve_withheld_amount,
  jpd.payout_reduction_amount,
  jpd.builder_credit_amount,
  jpd.enforcement_mode,
  jpd.reliability_event_ids,
  jpd.audit_trail,
  jpd.decided_at
from public.job_payment_decisions jpd
left join public.job_assignments ja on ja.id::text = jpd.assignment_id
left join public.job_opportunities jo on jo.id::text = jpd.job_id
where coalesce(
  auth.jwt() ->> 'role',
  auth.jwt() -> 'app_metadata' ->> 'role',
  auth.jwt() -> 'user_metadata' ->> 'role',
  ''
) = 'admin';

grant select on public.admin_payout_review_queue to authenticated;
grant execute on function public.evaluate_assignment_payout_hooks(uuid, jsonb) to authenticated;
grant execute on function public.admin_review_payout_hook(uuid, text, text, numeric, boolean, boolean, numeric, boolean) to authenticated;
