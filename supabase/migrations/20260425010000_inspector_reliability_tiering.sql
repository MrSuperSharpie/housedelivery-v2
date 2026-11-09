-- Inspector Reliability and Tiering System foundation.
--
-- Reliability measures attendance, communication, valid cancellations, and
-- professional completion. It must never reward a Pass outcome over a properly
-- performed and documented Fail / Hold / Modification Required outcome.
--
-- LEGAL REVIEW REQUIRED before moving any reserve, penalty, payout holdback, or
-- account restriction from observe_only to full_enforcement.

create extension if not exists pgcrypto;

-- ─── Policy configuration ───────────────────────────────────────────────────

create table if not exists public.reliability_policy_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  enforcement_mode text not null default 'observe_only'
    check (enforcement_mode in ('observe_only', 'soft_enforcement', 'full_enforcement')),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'retired')),
  legal_review_required boolean not null default true,
  legal_reviewed_at timestamptz,
  legal_reviewed_by text,
  notes text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_reliability_policy_versions_updated_at on public.reliability_policy_versions;
create trigger trg_reliability_policy_versions_updated_at
  before update on public.reliability_policy_versions
  for each row execute function public.set_governance_updated_at();

create table if not exists public.reliability_policy_rules (
  id uuid primary key default gen_random_uuid(),
  policy_version_id uuid not null references public.reliability_policy_versions(id) on delete cascade,
  rule_key text not null,
  rule_type text not null
    check (rule_type in ('score_adjustment', 'tier_threshold', 'notification', 'reserve_hook', 'access_hook')),
  enforcement_mode text not null default 'observe_only'
    check (enforcement_mode in ('observe_only', 'soft_enforcement', 'full_enforcement')),
  legal_review_required boolean not null default true,
  active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(policy_version_id, rule_key)
);

drop trigger if exists trg_reliability_policy_rules_updated_at on public.reliability_policy_rules;
create trigger trg_reliability_policy_rules_updated_at
  before update on public.reliability_policy_rules
  for each row execute function public.set_governance_updated_at();

create table if not exists public.reliability_tier_definitions (
  id uuid primary key default gen_random_uuid(),
  policy_version_id uuid not null references public.reliability_policy_versions(id) on delete cascade,
  tier_key text not null
    check (tier_key in ('provisional', 'standard', 'preferred', 'premier', 'restricted')),
  label text not null,
  min_score numeric(5,2) not null default 0,
  max_score numeric(5,2) not null default 100,
  opportunity_rank integer not null default 100,
  benefits jsonb not null default '{}'::jsonb,
  restrictions jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(policy_version_id, tier_key)
);

-- ─── Inspector-level reliability state ──────────────────────────────────────

create table if not exists public.inspector_reliability_profiles (
  inspector_id uuid primary key,
  internal_score numeric(5,2) not null default 100
    check (internal_score >= 0 and internal_score <= 100),
  tier_key text not null default 'standard'
    check (tier_key in ('provisional', 'standard', 'preferred', 'premier', 'restricted')),
  completed_professional_work_count integer not null default 0,
  claim_commitment_count integer not null default 0,
  valid_cancellation_count integer not null default 0,
  invalid_late_cancellation_count integer not null default 0,
  no_show_count integer not null default 0,
  builder_site_not_ready_count integer not null default 0,
  last_event_at timestamptz,
  manual_tier_override text
    check (manual_tier_override is null or manual_tier_override in ('provisional', 'standard', 'preferred', 'premier', 'restricted')),
  override_reason text,
  override_by text,
  override_at timestamptz,
  policy_version_id uuid references public.reliability_policy_versions(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_inspector_reliability_profiles_updated_at on public.inspector_reliability_profiles;
create trigger trg_inspector_reliability_profiles_updated_at
  before update on public.inspector_reliability_profiles
  for each row execute function public.set_governance_updated_at();

create table if not exists public.inspector_reliability_events (
  id uuid primary key default gen_random_uuid(),
  inspector_id uuid not null,
  job_id uuid,
  assignment_id uuid,
  appointment_id uuid,
  event_type text not null
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
      'admin_override'
    )),
  score_delta numeric(5,2) not null default 0,
  score_after numeric(5,2),
  tier_before text,
  tier_after text,
  enforcement_mode text not null default 'observe_only'
    check (enforcement_mode in ('observe_only', 'soft_enforcement', 'full_enforcement')),
  policy_version_id uuid references public.reliability_policy_versions(id) on delete set null,
  valid_reason_code text,
  actor_id text,
  actor_role text,
  admin_review_status text not null default 'none'
    check (admin_review_status in ('none', 'pending', 'approved', 'rejected', 'overridden')),
  admin_note text,
  evidence jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_reliability_events_inspector_created
  on public.inspector_reliability_events(inspector_id, created_at desc);

create index if not exists idx_reliability_events_admin_review
  on public.inspector_reliability_events(admin_review_status, created_at desc)
  where admin_review_status <> 'none';

-- ─── Appointment lifecycle and commitment fields ────────────────────────────

alter table public.job_assignments
  add column if not exists commitment_accepted boolean not null default false,
  add column if not exists commitment_version text,
  add column if not exists commitment_accepted_at timestamptz,
  add column if not exists scheduled_start_at timestamptz,
  add column if not exists scheduled_end_at timestamptz,
  add column if not exists confirmation_status text not null default 'pending'
    check (confirmation_status in ('pending', 'confirmed', 'missed', 'not_required')),
  add column if not exists inspector_confirmed_at timestamptz,
  add column if not exists en_route_at timestamptz,
  add column if not exists arrived_at timestamptz;

create table if not exists public.inspection_appointments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  assignment_id uuid not null unique,
  inspector_id uuid not null,
  builder_id uuid,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  commitment_version text not null,
  commitment_accepted_at timestamptz not null,
  confirmation_status text not null default 'pending'
    check (confirmation_status in ('pending', 'confirmed', 'missed', 'not_required')),
  inspector_confirmed_at timestamptz,
  en_route_at timestamptz,
  arrived_at timestamptz,
  checked_in_at timestamptz,
  completed_at timestamptz,
  site_ready_status text not null default 'unknown'
    check (site_ready_status in ('unknown', 'ready', 'not_ready', 'unsafe', 'access_blocked')),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'confirmed', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_show', 'reassigned')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_inspection_appointments_updated_at on public.inspection_appointments;
create trigger trg_inspection_appointments_updated_at
  before update on public.inspection_appointments
  for each row execute function public.set_governance_updated_at();

create index if not exists idx_inspection_appointments_inspector_start
  on public.inspection_appointments(inspector_id, scheduled_start_at);

create index if not exists idx_inspection_appointments_status_start
  on public.inspection_appointments(status, scheduled_start_at);

-- ─── Cancellation, standby, site readiness, notifications, and reserve hooks ─

create table if not exists public.valid_cancellation_reasons (
  code text primary key,
  label text not null,
  actor_scope text[] not null default '{inspector}',
  protects_reliability_score boolean not null default false,
  requires_evidence boolean not null default true,
  requires_admin_review boolean not null default true,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.inspection_cancellation_requests (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.inspection_appointments(id) on delete set null,
  job_id uuid not null,
  assignment_id uuid,
  requested_by_id uuid not null,
  requested_by_role text not null check (requested_by_role in ('inspector', 'builder', 'admin', 'system')),
  reason_code text not null references public.valid_cancellation_reasons(code),
  reason_note text,
  requested_at timestamptz not null default now(),
  scheduled_start_at timestamptz,
  is_late boolean not null default false,
  validity_status text not null default 'pending_review'
    check (validity_status in ('pending_review', 'valid', 'invalid', 'admin_overridden')),
  admin_reviewed_by text,
  admin_reviewed_at timestamptz,
  admin_note text,
  evidence jsonb not null default '{}'::jsonb,
  policy_version_id uuid references public.reliability_policy_versions(id) on delete set null,
  enforcement_mode text not null default 'observe_only'
    check (enforcement_mode in ('observe_only', 'soft_enforcement', 'full_enforcement')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_inspection_cancellation_requests_updated_at on public.inspection_cancellation_requests;
create trigger trg_inspection_cancellation_requests_updated_at
  before update on public.inspection_cancellation_requests
  for each row execute function public.set_governance_updated_at();

create table if not exists public.site_readiness_incidents (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.inspection_appointments(id) on delete set null,
  job_id uuid not null,
  assignment_id uuid,
  inspector_id uuid not null,
  builder_id uuid,
  incident_type text not null
    check (incident_type in ('site_not_ready', 'unsafe_conditions', 'access_blocked', 'wrong_stage', 'builder_cancelled_late')),
  inspector_protected boolean not null default true,
  admin_review_status text not null default 'pending'
    check (admin_review_status in ('pending', 'approved', 'rejected', 'overridden')),
  evidence jsonb not null default '{}'::jsonb,
  inspector_note text,
  builder_note text,
  admin_note text,
  reported_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.standby_inspector_invites (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  original_assignment_id uuid,
  inspector_id uuid not null,
  invite_reason text not null
    check (invite_reason in ('backup_pool', 'missed_confirmation', 'late_cancellation', 'no_show', 'admin_requested')),
  status text not null default 'invited'
    check (status in ('invited', 'accepted', 'declined', 'expired', 'assigned', 'cancelled')),
  priority_rank integer not null default 100,
  expires_at timestamptz not null,
  responded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_standby_invites_job_status
  on public.standby_inspector_invites(job_id, status, priority_rank);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  recipient_user_id uuid,
  recipient_role text,
  channel text not null default 'email'
    check (channel in ('email', 'sms', 'push', 'in_app')),
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'skipped')),
  payload jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_notification_events_queue
  on public.notification_events(status, scheduled_for);

create table if not exists public.inspector_reserve_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  inspector_id uuid not null,
  job_id uuid,
  assignment_id uuid,
  reliability_event_id uuid references public.inspector_reliability_events(id) on delete set null,
  entry_type text not null
    check (entry_type in ('observe_only_projection', 'reserve_hold', 'reserve_release', 'payout_hold', 'payout_release', 'admin_adjustment')),
  amount numeric(10,2) not null default 0,
  currency text not null default 'CAD',
  enforcement_mode text not null default 'observe_only'
    check (enforcement_mode in ('observe_only', 'soft_enforcement', 'full_enforcement')),
  legal_review_required boolean not null default true,
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'posted', 'released', 'voided')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_reserve_ledger_inspector_created
  on public.inspector_reserve_ledger_entries(inspector_id, created_at desc);

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table public.reliability_policy_versions enable row level security;
alter table public.reliability_policy_rules enable row level security;
alter table public.reliability_tier_definitions enable row level security;
alter table public.inspector_reliability_profiles enable row level security;
alter table public.inspector_reliability_events enable row level security;
alter table public.inspection_appointments enable row level security;
alter table public.valid_cancellation_reasons enable row level security;
alter table public.inspection_cancellation_requests enable row level security;
alter table public.site_readiness_incidents enable row level security;
alter table public.standby_inspector_invites enable row level security;
alter table public.notification_events enable row level security;
alter table public.inspector_reserve_ledger_entries enable row level security;

drop policy if exists reliability_policy_authenticated_read on public.reliability_policy_versions;
create policy reliability_policy_authenticated_read
  on public.reliability_policy_versions for select to authenticated
  using (auth.uid() is not null);

drop policy if exists reliability_policy_rules_authenticated_read on public.reliability_policy_rules;
create policy reliability_policy_rules_authenticated_read
  on public.reliability_policy_rules for select to authenticated
  using (auth.uid() is not null);

drop policy if exists reliability_tiers_authenticated_read on public.reliability_tier_definitions;
create policy reliability_tiers_authenticated_read
  on public.reliability_tier_definitions for select to authenticated
  using (auth.uid() is not null);

drop policy if exists valid_cancellation_reasons_authenticated_read on public.valid_cancellation_reasons;
create policy valid_cancellation_reasons_authenticated_read
  on public.valid_cancellation_reasons for select to authenticated
  using (active = true);

drop policy if exists reliability_profiles_self_or_admin_read on public.inspector_reliability_profiles;
create policy reliability_profiles_self_or_admin_read
  on public.inspector_reliability_profiles for select to authenticated
  using (
    inspector_id = auth.uid()
    or coalesce(
      auth.jwt() ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    ) = 'admin'
  );

drop policy if exists reliability_events_self_or_admin_read on public.inspector_reliability_events;
create policy reliability_events_self_or_admin_read
  on public.inspector_reliability_events for select to authenticated
  using (
    inspector_id = auth.uid()
    or coalesce(
      auth.jwt() ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    ) = 'admin'
  );

drop policy if exists appointments_party_or_admin_read on public.inspection_appointments;
create policy appointments_party_or_admin_read
  on public.inspection_appointments for select to authenticated
  using (
    inspector_id = auth.uid()
    or builder_id = auth.uid()
    or coalesce(
      auth.jwt() ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    ) = 'admin'
  );

drop policy if exists cancellation_requests_party_or_admin_read on public.inspection_cancellation_requests;
create policy cancellation_requests_party_or_admin_read
  on public.inspection_cancellation_requests for select to authenticated
  using (
    requested_by_id = auth.uid()
    or coalesce(
      auth.jwt() ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    ) = 'admin'
  );

drop policy if exists site_readiness_party_or_admin_read on public.site_readiness_incidents;
create policy site_readiness_party_or_admin_read
  on public.site_readiness_incidents for select to authenticated
  using (
    inspector_id = auth.uid()
    or builder_id = auth.uid()
    or coalesce(
      auth.jwt() ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    ) = 'admin'
  );

drop policy if exists standby_invites_self_or_admin_read on public.standby_inspector_invites;
create policy standby_invites_self_or_admin_read
  on public.standby_inspector_invites for select to authenticated
  using (
    inspector_id = auth.uid()
    or coalesce(
      auth.jwt() ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    ) = 'admin'
  );

drop policy if exists notification_events_self_or_admin_read on public.notification_events;
create policy notification_events_self_or_admin_read
  on public.notification_events for select to authenticated
  using (
    recipient_user_id = auth.uid()
    or coalesce(
      auth.jwt() ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    ) = 'admin'
  );

drop policy if exists reserve_ledger_self_or_admin_read on public.inspector_reserve_ledger_entries;
create policy reserve_ledger_self_or_admin_read
  on public.inspector_reserve_ledger_entries for select to authenticated
  using (
    inspector_id = auth.uid()
    or coalesce(
      auth.jwt() ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    ) = 'admin'
  );

-- ─── Seed observe-only policy and valid reasons ─────────────────────────────

insert into public.reliability_policy_versions (
  version,
  enforcement_mode,
  status,
  legal_review_required,
  notes,
  config
) values (
  '2026-04-25-observe-only',
  'observe_only',
  'active',
  true,
  'Initial Vero Permit reliability policy. Observe-only until legal review approves enforcement.',
  jsonb_build_object(
    'completionEventCountsPassFailHoldEqually', true,
    'lateCancellationWindowMinutes', 120,
    'arrivalGraceMinutes', 15,
    'confirmationLadderMinutesBeforeStart', jsonb_build_array(1440, 240, 60),
    'reserveHooksEnabled', false
  )
) on conflict (version) do nothing;

insert into public.reliability_tier_definitions (
  policy_version_id,
  tier_key,
  label,
  min_score,
  max_score,
  opportunity_rank,
  benefits,
  restrictions
)
select p.id, tier_key, label, min_score, max_score, opportunity_rank, benefits, restrictions
from public.reliability_policy_versions p
cross join (
  values
    ('restricted', 'Restricted', 0::numeric, 59.99::numeric, 500, '{}'::jsonb, '{"adminReviewRequired":true}'::jsonb),
    ('provisional', 'Provisional', 60::numeric, 74.99::numeric, 300, '{"guidedAccess":true}'::jsonb, '{}'::jsonb),
    ('standard', 'Standard', 75::numeric, 89.99::numeric, 200, '{"standardBoardAccess":true}'::jsonb, '{}'::jsonb),
    ('preferred', 'Preferred', 90::numeric, 96.99::numeric, 100, '{"earlierStandbyAccess":true,"fasterPayoutEligibility":true}'::jsonb, '{}'::jsonb),
    ('premier', 'Premier', 97::numeric, 100::numeric, 50, '{"topOpportunityAccess":true,"lowestReserveEligibility":true}'::jsonb, '{}'::jsonb)
) as t(tier_key, label, min_score, max_score, opportunity_rank, benefits, restrictions)
where p.version = '2026-04-25-observe-only'
on conflict (policy_version_id, tier_key) do nothing;

insert into public.valid_cancellation_reasons (
  code,
  label,
  actor_scope,
  protects_reliability_score,
  requires_evidence,
  requires_admin_review,
  metadata
) values
  ('medical_or_emergency', 'Medical or personal emergency', '{inspector}', true, true, true, '{}'),
  ('unsafe_site_conditions', 'Unsafe site conditions', '{inspector,builder,admin}', true, true, true, '{}'),
  ('builder_site_not_ready', 'Builder site not ready', '{inspector,builder,admin}', true, true, true, '{}'),
  ('access_blocked', 'Site access blocked', '{inspector,builder,admin}', true, true, true, '{}'),
  ('severe_weather', 'Severe weather or unsafe travel', '{inspector,builder,admin}', true, true, true, '{}'),
  ('authority_delay', 'Authority or permit delay', '{builder,admin}', true, true, true, '{}'),
  ('credential_conflict_discovered', 'Credential or conflict issue discovered', '{inspector,admin}', true, true, true, '{}'),
  ('inspector_schedule_conflict', 'Inspector schedule conflict', '{inspector}', false, true, true, '{}'),
  ('admin_exception', 'Admin-approved exception', '{admin}', true, false, true, '{}')
on conflict (code) do update set
  label = excluded.label,
  actor_scope = excluded.actor_scope,
  protects_reliability_score = excluded.protects_reliability_score,
  requires_evidence = excluded.requires_evidence,
  requires_admin_review = excluded.requires_admin_review,
  metadata = excluded.metadata;

-- ─── Latest claim RPC with binding commitment and appointment creation ──────
--
-- Preserves latest open-market behavior:
--   • onboarding_status gate
--   • credential authority check
--   • no region gate
--   • 30-minute emergency / 1-hour priority+standard objection windows
--   • unique active claim protection

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

grant execute on function public.claim_live_job_if_eligible(text, jsonb, jsonb) to authenticated;
