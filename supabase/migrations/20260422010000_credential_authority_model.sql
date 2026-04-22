-- ============================================================================
-- VERO CREDENTIAL AUTHORITY MODEL v1
--
-- Establishes the canonical legal meaning of each BC construction credential,
-- per-inspector verified credential records, and authority-checking functions
-- that gate the Live Board and regulated workflows.
--
-- Design:
--   credential_types        — read-only reference table: what each credential means
--   inspector_held_credentials — per-inspector claims with verification + expiry
--   check_credential_authority() — enforces all 6 hardcoded safety rules
--   inspector_verified_disciplines() — returns eligible disciplines for board filtering
--
-- Safety rules (hardcoded, defense-in-depth):
--   1. AScT cannot issue Schedule C-B
--   2. FSR cannot sign structural or architectural reviews
--   3. Expired credentials block authority actions
--   4. Missing insurance blocks final compliance actions
--   5. Discipline mismatch blocks sign-off
--   6. Unverified credentials cannot unlock regulated workflows
-- ============================================================================


-- ============================================================================
-- 1. CREDENTIAL TYPES — canonical reference table
-- ============================================================================

create table if not exists public.credential_types (
  id                      text primary key,
  display_name            text not null,
  jurisdiction            text not null default 'BC',
  governing_body          text not null,
  disciplines             text[] not null default '{}',

  authority_level         text not null
    check (authority_level in (
      'professional_engineer',
      'architect',
      'certified_professional',
      'technologist',
      'tradesperson',
      'field_verifier',
      'municipal_official',
      'administrative'
    )),

  -- Authority flags
  can_design_signoff      boolean not null default false,
  can_field_review        boolean not null default false,
  can_place_hold          boolean not null default false,
  can_release_hold        boolean not null default false,
  can_generate_schedule_cb boolean not null default false,
  can_submit_permit_package boolean not null default false,
  observe_only            boolean not null default false,

  -- Verification requirements
  required_documents      text[] not null default '{}',
  requires_insurance      boolean not null default false,
  requires_expiry_tracking boolean not null default false,

  created_at              timestamptz not null default now()
);


-- ============================================================================
-- 2. INSPECTOR HELD CREDENTIALS — per-inspector credential instances
-- ============================================================================

create table if not exists public.inspector_held_credentials (
  id                      uuid primary key default gen_random_uuid(),
  inspector_id            text not null,
  credential_type_id      text not null references public.credential_types(id),

  license_number          text,
  -- For generalist credentials (AScT, CTech, QA) whose credential_types.disciplines
  -- is '{}': the inspector declares which disciplines they cover.  Ignored when the
  -- credential type already specifies fixed disciplines.
  discipline_scope        text[] not null default '{}',

  issued_at               date,
  expires_at              date,
  insurance_policy_number text,
  insurance_expires_at    date,

  verification_status     text not null default 'unverified'
    check (verification_status in (
      'unverified',
      'pending_review',
      'verified',
      'rejected',
      'expired',
      'suspended'
    )),
  verified_by             text,
  verified_at             timestamptz,
  rejection_reason        text,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  unique (inspector_id, credential_type_id)
);

create index if not exists idx_ihc_inspector_id
  on public.inspector_held_credentials(inspector_id);

create index if not exists idx_ihc_credential_type_id
  on public.inspector_held_credentials(credential_type_id);

create index if not exists idx_ihc_verification_status
  on public.inspector_held_credentials(verification_status)
  where verification_status = 'verified';


-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

-- 3a. credential_types — public read, no write through RLS
alter table public.credential_types enable row level security;

drop policy if exists credential_types_public_read on public.credential_types;
create policy credential_types_public_read
  on public.credential_types
  for select
  to authenticated, anon
  using (true);

-- 3b. inspector_held_credentials — inspectors manage own records
alter table public.inspector_held_credentials enable row level security;

-- Inspectors can read their own credential records
drop policy if exists ihc_select_own on public.inspector_held_credentials;
create policy ihc_select_own
  on public.inspector_held_credentials
  for select
  to authenticated
  using (inspector_id = auth.uid()::text);

-- Inspectors can submit new credentials (forced to unverified status)
drop policy if exists ihc_insert_own on public.inspector_held_credentials;
create policy ihc_insert_own
  on public.inspector_held_credentials
  for insert
  to authenticated
  with check (
    inspector_id = auth.uid()::text
    and verification_status = 'unverified'
  );

-- No UPDATE or DELETE policy — inspectors cannot change submitted credentials.
-- Admin verification uses security definer functions which bypass RLS.

-- Admin read access (role = 'admin' in auth.users metadata)
drop policy if exists ihc_select_admin on public.inspector_held_credentials;
create policy ihc_select_admin
  on public.inspector_held_credentials
  for select
  to authenticated
  using (
    coalesce(
      (select raw_user_meta_data ->> 'role' from auth.users where id = auth.uid()),
      ''
    ) = 'admin'
  );


-- ============================================================================
-- 4. HELPER FUNCTION — inspector_verified_disciplines
--
-- Returns the flat array of all disciplines an inspector holds verified,
-- non-expired credentials for.  Intended for Live Board filtering:
--
--   WHERE required_discipline = ANY(
--     public.inspector_verified_disciplines(auth.uid()::text)
--   )
-- ============================================================================

create or replace function public.inspector_verified_disciplines(p_inspector_id text)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct d), '{}'::text[])
  from (
    select unnest(
      case
        when ct.disciplines <> '{}' then ct.disciplines
        else ihc.discipline_scope
      end
    ) as d
    from public.inspector_held_credentials ihc
    join public.credential_types ct on ct.id = ihc.credential_type_id
    where ihc.inspector_id = p_inspector_id
      and ihc.verification_status = 'verified'
      and (ihc.expires_at is null or ihc.expires_at >= current_date)
  ) sub;
$$;


-- ============================================================================
-- 5. AUTHORITY CHECK FUNCTION — check_credential_authority
--
-- Full authority gate with all 6 hardcoded safety rules.
-- Returns jsonb: { ok: true, credential_id, credential_type, authority_level }
--            or: { ok: false, error: "..." }
--
-- p_action is one of:
--   'design_signoff', 'field_review', 'place_hold', 'release_hold',
--   'generate_schedule_cb', 'submit_permit_package'
-- ============================================================================

create or replace function public.check_credential_authority(
  p_inspector_id text,
  p_discipline   text,
  p_action       text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cred record;
  v_today date := current_date;
  v_action_allowed boolean;
begin
  -- -------------------------------------------------------
  -- Find the best matching credential (highest authority)
  -- that is verified and covers the requested discipline.
  -- -------------------------------------------------------
  select
    ihc.id                    as held_credential_id,
    ihc.expires_at            as credential_expires_at,
    ihc.insurance_expires_at,
    ihc.verification_status,
    ct.id                     as credential_type_id,
    ct.display_name,
    ct.authority_level,
    ct.can_design_signoff,
    ct.can_field_review,
    ct.can_place_hold,
    ct.can_release_hold,
    ct.can_generate_schedule_cb,
    ct.can_submit_permit_package,
    ct.observe_only,
    ct.requires_insurance
  into v_cred
  from public.inspector_held_credentials ihc
  join public.credential_types ct on ct.id = ihc.credential_type_id
  where ihc.inspector_id = p_inspector_id
    and ihc.verification_status = 'verified'
    and (
      (ct.disciplines <> '{}' and p_discipline = any(ct.disciplines))
      or
      (ct.disciplines = '{}' and p_discipline = any(ihc.discipline_scope))
    )
  order by case ct.authority_level
    when 'professional_engineer' then 1
    when 'architect'             then 2
    when 'certified_professional' then 3
    when 'municipal_official'    then 4
    when 'technologist'          then 5
    when 'tradesperson'          then 6
    when 'field_verifier'        then 7
    when 'administrative'        then 8
  end
  limit 1;

  -- ----- SAFETY RULE 6: unverified credentials cannot unlock regulated workflows -----
  if not found then
    -- Determine the most helpful error: is it a missing credential or an unverified one?
    if exists (
      select 1
      from public.inspector_held_credentials ihc
      join public.credential_types ct on ct.id = ihc.credential_type_id
      where ihc.inspector_id = p_inspector_id
        and ihc.verification_status <> 'verified'
        and (
          (ct.disciplines <> '{}' and p_discipline = any(ct.disciplines))
          or
          (ct.disciplines = '{}' and p_discipline = any(ihc.discipline_scope))
        )
    ) then
      return jsonb_build_object('ok', false, 'error',
        'Credential for ' || initcap(p_discipline) || ' is not yet verified');
    end if;

    return jsonb_build_object('ok', false, 'error',
      'No verified credential covers ' || initcap(p_discipline));
  end if;

  -- ----- SAFETY RULE 3: expired credentials block authority actions -----
  if v_cred.credential_expires_at is not null and v_cred.credential_expires_at < v_today then
    return jsonb_build_object('ok', false, 'error',
      'Credential expired on ' || v_cred.credential_expires_at::text);
  end if;

  -- ----- Observe-only credentials cannot perform any regulated action -----
  if v_cred.observe_only then
    return jsonb_build_object('ok', false, 'error',
      v_cred.display_name || ' is observe-only and cannot perform ' || replace(p_action, '_', ' '));
  end if;

  -- ----- SAFETY RULE 4: missing insurance blocks final compliance actions -----
  if v_cred.requires_insurance
    and p_action in ('generate_schedule_cb', 'submit_permit_package', 'design_signoff')
  then
    if v_cred.insurance_expires_at is null then
      return jsonb_build_object('ok', false, 'error',
        'Proof of insurance required for ' || replace(p_action, '_', ' '));
    end if;
    if v_cred.insurance_expires_at < v_today then
      return jsonb_build_object('ok', false, 'error',
        'Insurance expired on ' || v_cred.insurance_expires_at::text);
    end if;
  end if;

  -- ----- SAFETY RULE 5: check if the specific action is allowed by this credential type -----
  v_action_allowed := case p_action
    when 'design_signoff'        then v_cred.can_design_signoff
    when 'field_review'          then v_cred.can_field_review
    when 'place_hold'            then v_cred.can_place_hold
    when 'release_hold'          then v_cred.can_release_hold
    when 'generate_schedule_cb'  then v_cred.can_generate_schedule_cb
    when 'submit_permit_package' then v_cred.can_submit_permit_package
    else false
  end;

  if not v_action_allowed then
    return jsonb_build_object('ok', false, 'error',
      v_cred.display_name || ' does not grant ' || replace(p_action, '_', ' ') || ' authority');
  end if;

  -- ----- SAFETY RULE 1 (defense-in-depth): AScT cannot generate Schedule C-B -----
  if v_cred.credential_type_id = 'asct' and p_action = 'generate_schedule_cb' then
    return jsonb_build_object('ok', false, 'error',
      'AScT credential cannot generate Schedule C-B');
  end if;

  -- ----- SAFETY RULE 2 (defense-in-depth): FSR cannot sign structural or architectural -----
  if v_cred.credential_type_id in ('fsr_class_a', 'fsr_class_b')
    and p_action in ('design_signoff', 'field_review')
    and p_discipline in ('structural', 'architectural')
  then
    return jsonb_build_object('ok', false, 'error',
      'FSR credential cannot authorize ' || initcap(p_discipline) || ' work');
  end if;

  -- ----- All checks passed -----
  return jsonb_build_object(
    'ok',              true,
    'credential_id',   v_cred.held_credential_id,
    'credential_type', v_cred.credential_type_id,
    'authority_level', v_cred.authority_level
  );
end;
$$;


-- ============================================================================
-- 6. ADMIN FUNCTION — verify_inspector_credential
--
-- Allows Vero admin to change credential verification status.
-- Caller must have role = 'admin' in auth.users metadata.
-- ============================================================================

create or replace function public.verify_inspector_credential(
  p_credential_id uuid,
  p_new_status    text,
  p_note          text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_cred record;
begin
  -- Admin gate
  select coalesce(raw_user_meta_data ->> 'role', '')
  into v_caller_role
  from auth.users
  where id = auth.uid();

  if v_caller_role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin role required');
  end if;

  -- Validate target status
  if p_new_status not in ('verified', 'rejected', 'suspended', 'pending_review') then
    return jsonb_build_object('ok', false, 'error',
      'Invalid status. Must be: verified, rejected, suspended, or pending_review');
  end if;

  update public.inspector_held_credentials
  set
    verification_status = p_new_status,
    verified_by         = case when p_new_status = 'verified' then auth.uid()::text else verified_by end,
    verified_at         = case when p_new_status = 'verified' then now() else verified_at end,
    rejection_reason    = case when p_new_status = 'rejected' then p_note else rejection_reason end,
    updated_at          = now()
  where id = p_credential_id
  returning *
  into v_cred;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Credential not found');
  end if;

  return jsonb_build_object(
    'ok',     true,
    'status', p_new_status,
    'credential_id', p_credential_id
  );
end;
$$;


-- ============================================================================
-- 7. SEED DATA — 21 canonical BC credential types
-- ============================================================================

insert into public.credential_types (
  id, display_name, jurisdiction, governing_body, disciplines, authority_level,
  can_design_signoff, can_field_review, can_place_hold, can_release_hold,
  can_generate_schedule_cb, can_submit_permit_package, observe_only,
  required_documents, requires_insurance, requires_expiry_tracking
) values
  -- ---- Professional Engineers (EGBC) ----
  ('peng_structural',
   'P.Eng Structural', 'BC', 'Engineers and Geoscientists BC',
   '{structural}', 'professional_engineer',
   true, true, true, true, true, true, false,
   '{peng_certificate,proof_of_insurance}', true, true),

  ('peng_mechanical',
   'P.Eng Mechanical', 'BC', 'Engineers and Geoscientists BC',
   '{mechanical}', 'professional_engineer',
   true, true, true, true, true, true, false,
   '{peng_certificate,proof_of_insurance}', true, true),

  ('peng_electrical',
   'P.Eng Electrical', 'BC', 'Engineers and Geoscientists BC',
   '{electrical}', 'professional_engineer',
   true, true, true, true, true, true, false,
   '{peng_certificate,proof_of_insurance}', true, true),

  ('civil_engineer',
   'Civil Engineer', 'BC', 'Engineers and Geoscientists BC',
   '{structural,geotech}', 'professional_engineer',
   true, true, true, true, true, true, false,
   '{peng_certificate,proof_of_insurance}', true, true),

  ('geotech_engineer',
   'Geotechnical Engineer', 'BC', 'Engineers and Geoscientists BC',
   '{geotech}', 'professional_engineer',
   true, true, true, true, true, true, false,
   '{peng_certificate,proof_of_insurance}', true, true),

  ('fire_protection_engineer',
   'Fire Protection Engineer', 'BC', 'Engineers and Geoscientists BC',
   '{fire_protection}', 'professional_engineer',
   true, true, true, true, true, true, false,
   '{peng_certificate,proof_of_insurance}', true, true),

  -- ---- Architect ----
  ('architect_aibc',
   'Architect (AIBC)', 'BC', 'Architectural Institute of BC',
   '{architectural}', 'architect',
   true, true, true, true, true, true, false,
   '{aibc_certificate,proof_of_insurance}', true, true),

  -- ---- Certified Professionals ----
  ('building_envelope',
   'Building Envelope Professional', 'BC', 'Homeowner Protection Office',
   '{architectural}', 'certified_professional',
   true, true, true, true, true, true, false,
   '{bep_certificate,proof_of_insurance}', true, true),

  ('energy_advisor',
   'Energy Advisor', 'BC', 'Natural Resources Canada',
   '{mechanical}', 'certified_professional',
   false, true, false, false, false, false, false,
   '{ea_certificate}', false, true),

  -- ---- Tradespersons — Electrical ----
  ('fsr_class_a',
   'FSR Class A', 'BC', 'Technical Safety BC',
   '{electrical}', 'tradesperson',
   false, true, true, true, false, false, false,
   '{fsr_certificate}', false, true),

  ('fsr_class_b',
   'FSR Class B', 'BC', 'Technical Safety BC',
   '{electrical}', 'tradesperson',
   false, true, false, false, false, false, false,
   '{fsr_certificate}', false, true),

  -- ---- Tradespersons — Mechanical / Gas ----
  ('gas_fitter_class_a',
   'Gas Fitter Class A', 'BC', 'Technical Safety BC',
   '{mechanical}', 'tradesperson',
   false, true, true, true, false, false, false,
   '{gas_fitter_certificate}', false, true),

  ('gas_fitter_class_b',
   'Gas Fitter Class B', 'BC', 'Technical Safety BC',
   '{mechanical}', 'tradesperson',
   false, true, false, false, false, false, false,
   '{gas_fitter_certificate}', false, true),

  -- ---- Tradespersons — Plumbing ----
  ('red_seal_plumber',
   'Red Seal Plumber', 'BC', 'Industry Training Authority BC',
   '{plumbing}', 'tradesperson',
   false, true, true, true, false, false, false,
   '{red_seal_certificate}', false, true),

  -- ---- Tradespersons — HVAC ----
  ('hvac_refrigeration',
   'Refrigeration Mechanic / HVAC Technician', 'BC', 'Technical Safety BC',
   '{mechanical}', 'tradesperson',
   false, true, false, false, false, false, false,
   '{trade_certificate}', false, true),

  -- ---- Technologists (ASTTBC) ----
  -- disciplines = '{}': inspector must declare discipline_scope on their held credential
  ('asct',
   'Applied Science Technologist (AScT)', 'BC',
   'Applied Science Technologists and Technicians of BC',
   '{}', 'technologist',
   false, true, true, false, false, false, false,
   '{asttbc_certificate}', false, true),

  ('ctech',
   'Certified Technician (CTech)', 'BC',
   'Applied Science Technologists and Technicians of BC',
   '{}', 'technologist',
   false, true, false, false, false, false, false,
   '{asttbc_certificate}', false, true),

  -- ---- Field / QA ----
  -- disciplines = '{}': inspector must declare discipline_scope on their held credential
  ('qa_field_verifier',
   'QA / Field Verifier', 'BC', 'Employer / Project Authority',
   '{}', 'field_verifier',
   false, true, false, false, false, false, false,
   '{employer_letter}', false, false),

  -- ---- Municipal Authority ----
  -- Broad discipline coverage by statutory authority
  ('municipal_inspector',
   'Municipal Inspector / Reviewer', 'BC', 'Local Municipality',
   '{structural,architectural,mechanical,electrical,plumbing,fire_protection,geotech}',
   'municipal_official',
   false, true, true, true, false, false, false,
   '{municipal_appointment}', false, false),

  -- ---- Administrative / Non-technical ----
  ('builder_contractor',
   'Builder / Contractor', 'BC', 'BC Housing / Local Municipality',
   '{}', 'administrative',
   false, false, false, false, false, false, true,
   '{business_license}', true, true),

  ('admin',
   'Vero Admin', 'BC', 'Vero Permit',
   '{}', 'administrative',
   false, false, false, false, false, false, true,
   '{}', false, false)

on conflict (id) do nothing;


-- ============================================================================
-- 8. GRANTS
-- ============================================================================

grant select on public.credential_types to authenticated, anon;
grant select, insert on public.inspector_held_credentials to authenticated;
grant execute on function public.inspector_verified_disciplines(text) to authenticated;
grant execute on function public.check_credential_authority(text, text, text) to authenticated;
grant execute on function public.verify_inspector_credential(uuid, text, text) to authenticated;
