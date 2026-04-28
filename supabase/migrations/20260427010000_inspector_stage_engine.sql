-- ─────────────────────────────────────────────────────────────────────────────
-- Inspector Stage Engine
-- Migration: 20260427010000_inspector_stage_engine.sql
--
-- A.  inspector_specialty on profiles
-- B.  inspection_stages / inspection_stage_dependencies
-- C.  permit_stage_statuses (per-permit stage progress)
-- D.  inspection_seals (immutable audit log)
-- E.  jurisdictions / stage_checklist_templates / stage_checklist_items
--     / permit_checklist_responses
-- F.  RPCs: get_visible_inspection_stages, get_stage_lock_state,
--     seal_inspection_stage
-- G.  RLS policies
-- H.  updated_at triggers
--
-- SCHEMA ASSUMPTIONS
--   1. public.profiles.id is uuid (= auth.users.id). The table is shadowed
--      from auth.users and pre-dates migrations — it is NOT re-created here.
--   2. public.projects.id is TEXT (not uuid). permit_id columns use text to
--      remain join-compatible.
--      TODO: migrate permit_id to uuid when projects is re-keyed.
--   3. public.current_jwt_role() and public.set_governance_updated_at()
--      already exist (20260425060000 / 20260407010000).
--   4. pgcrypto is enabled (20260407010000).
--   5. Role is in JWT user_metadata only — NOT a column in public.profiles.
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══════════════════════════════════════════════════════════════════════════
-- A. INSPECTOR SPECIALTY ON PROFILES
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists inspector_specialty text
    check (inspector_specialty is null or inspector_specialty in (
      'master',
      'electrical',
      'plumbing',
      'structural',
      'mechanical',
      'fire_suppression',
      'geotechnical',
      'architectural'
    ));

-- Index for RPC lookups
create index if not exists profiles_inspector_specialty_idx
  on public.profiles (inspector_specialty)
  where inspector_specialty is not null;


-- ═══════════════════════════════════════════════════════════════════════════
-- B. INSPECTION STAGE DEFINITION TABLES
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.inspection_stages (
  id                      uuid primary key default gen_random_uuid(),
  stage_number            integer not null unique,
  slug                    text not null unique,
  title                   text not null,
  phase_number            integer not null,
  discipline              text,
  visible_to_specialties  text[] not null default '{}',
  requires_master_seal    boolean not null default false,
  is_active               boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

drop trigger if exists trg_inspection_stages_updated_at on public.inspection_stages;
create trigger trg_inspection_stages_updated_at
  before update on public.inspection_stages
  for each row execute function public.set_governance_updated_at();

create table if not exists public.inspection_stage_dependencies (
  id                  uuid primary key default gen_random_uuid(),
  stage_id            uuid not null references public.inspection_stages(id) on delete cascade,
  depends_on_stage_id uuid not null references public.inspection_stages(id) on delete cascade,
  dependency_reason   text,
  created_at          timestamptz not null default now(),
  unique(stage_id, depends_on_stage_id)
);

create index if not exists idx_stage_deps_stage_id
  on public.inspection_stage_dependencies (stage_id);
create index if not exists idx_stage_deps_depends_on
  on public.inspection_stage_dependencies (depends_on_stage_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- C. PER-PERMIT STAGE STATUS
-- ═══════════════════════════════════════════════════════════════════════════

-- permit_id is TEXT to match public.projects.id (which uses text PKs).
-- TODO: change to uuid with FK constraint when projects is re-keyed to uuid.

create table if not exists public.permit_stage_statuses (
  id          uuid primary key default gen_random_uuid(),
  permit_id   text not null,
  stage_id    uuid not null references public.inspection_stages(id) on delete cascade,
  status      text not null default 'not_started'
                check (status in ('not_started', 'in_review', 'sealed', 'rejected')),
  sealed_by   uuid references auth.users(id),
  sealed_at   timestamptz,
  seal_notes  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(permit_id, stage_id)
);

drop trigger if exists trg_permit_stage_statuses_updated_at on public.permit_stage_statuses;
create trigger trg_permit_stage_statuses_updated_at
  before update on public.permit_stage_statuses
  for each row execute function public.set_governance_updated_at();

create index if not exists idx_permit_stage_statuses_permit_id
  on public.permit_stage_statuses (permit_id);
create index if not exists idx_permit_stage_statuses_stage_id
  on public.permit_stage_statuses (stage_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- D. IMMUTABLE SEAL AUDIT TABLE
-- ═══════════════════════════════════════════════════════════════════════════

-- Rows are INSERT-only. UPDATE and DELETE are blocked by RLS policy.
-- permit_id is TEXT — see C note above.

create table if not exists public.inspection_seals (
  id           uuid primary key default gen_random_uuid(),
  permit_id    text not null,
  stage_id     uuid references public.inspection_stages(id),
  sealed_by    uuid references auth.users(id),
  sealed_at    timestamptz not null default now(),
  seal_kind    text not null default 'digital_seal',
  seal_payload jsonb not null default '{}',
  seal_hash    text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_inspection_seals_permit_id
  on public.inspection_seals (permit_id);
create index if not exists idx_inspection_seals_stage_id
  on public.inspection_seals (stage_id);
create index if not exists idx_inspection_seals_sealed_by
  on public.inspection_seals (sealed_by);


-- ═══════════════════════════════════════════════════════════════════════════
-- E. CHECKLIST CONTENT TABLES
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.jurisdictions (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  code_version    text,
  effective_date  date,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_jurisdictions_updated_at on public.jurisdictions;
create trigger trg_jurisdictions_updated_at
  before update on public.jurisdictions
  for each row execute function public.set_governance_updated_at();

create table if not exists public.stage_checklist_templates (
  id              uuid primary key default gen_random_uuid(),
  stage_id        uuid not null references public.inspection_stages(id) on delete cascade,
  jurisdiction_id uuid not null references public.jurisdictions(id) on delete cascade,
  title           text not null,
  version         integer not null default 1,
  is_active       boolean not null default true,
  effective_from  date,
  effective_to    date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(stage_id, jurisdiction_id, version)
);

drop trigger if exists trg_stage_checklist_templates_updated_at on public.stage_checklist_templates;
create trigger trg_stage_checklist_templates_updated_at
  before update on public.stage_checklist_templates
  for each row execute function public.set_governance_updated_at();

create index if not exists idx_checklist_templates_stage_id
  on public.stage_checklist_templates (stage_id);
create index if not exists idx_checklist_templates_jurisdiction_id
  on public.stage_checklist_templates (jurisdiction_id);

create table if not exists public.stage_checklist_items (
  id               uuid primary key default gen_random_uuid(),
  template_id      uuid not null references public.stage_checklist_templates(id) on delete cascade,
  sort_order       integer not null,
  label            text not null,
  requirement_text text not null,
  item_type        text not null default 'boolean',
  is_required      boolean not null default true,
  legal_reference  text,
  source_title     text,
  source_url       text,
  admin_notes      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists trg_stage_checklist_items_updated_at on public.stage_checklist_items;
create trigger trg_stage_checklist_items_updated_at
  before update on public.stage_checklist_items
  for each row execute function public.set_governance_updated_at();

create index if not exists idx_checklist_items_template_id
  on public.stage_checklist_items (template_id);

-- permit_id is TEXT — see C note above.

create table if not exists public.permit_checklist_responses (
  id                uuid primary key default gen_random_uuid(),
  permit_id         text not null,
  stage_id          uuid not null references public.inspection_stages(id) on delete cascade,
  checklist_item_id uuid not null references public.stage_checklist_items(id) on delete cascade,
  response          jsonb not null default '{}',
  response_status   text not null default 'pending'
                      check (response_status in ('pending', 'completed', 'approved', 'flagged')),
  completed_by      uuid references auth.users(id),
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(permit_id, checklist_item_id)
);

drop trigger if exists trg_permit_checklist_responses_updated_at on public.permit_checklist_responses;
create trigger trg_permit_checklist_responses_updated_at
  before update on public.permit_checklist_responses
  for each row execute function public.set_governance_updated_at();

create index if not exists idx_checklist_responses_permit_stage
  on public.permit_checklist_responses (permit_id, stage_id);
create index if not exists idx_checklist_responses_item_id
  on public.permit_checklist_responses (checklist_item_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- F. RPCS
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── F1. get_visible_inspection_stages ────────────────────────────────────
-- Returns active inspection_stages the calling user is permitted to act on.
--   • admin / master → all active stages
--   • specialty inspector → stages where specialty ∈ visible_to_specialties
--   • builder / other → empty (no inspector-only sealing controls exposed)
--
-- p_user_id defaults to auth.uid() so clients can omit it.

create or replace function public.get_visible_inspection_stages(
  p_user_id uuid default null
)
returns setof public.inspection_stages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid := coalesce(p_user_id, auth.uid());
  v_specialty text;
  v_role      text := public.current_jwt_role();
begin
  if v_user_id is null then
    return;
  end if;

  -- Admins see everything.
  if v_role = 'admin' then
    return query
      select * from public.inspection_stages
      where is_active = true
      order by stage_number;
    return;
  end if;

  -- Look up specialty from profiles.
  select inspector_specialty
    into v_specialty
    from public.profiles
   where id = v_user_id;

  -- No specialty set → builder or non-inspector account; return nothing.
  if v_specialty is null then
    return;
  end if;

  -- Master inspectors see all stages (they can seal any stage).
  if v_specialty = 'master' then
    return query
      select * from public.inspection_stages
      where is_active = true
      order by stage_number;
    return;
  end if;

  -- Specialty inspectors see only their designated stages.
  return query
    select * from public.inspection_stages
    where is_active = true
      and v_specialty = any(visible_to_specialties)
    order by stage_number;
end;
$$;


-- ─── F2. get_stage_lock_state ──────────────────────────────────────────────
-- Returns {is_locked: bool, missing_dependencies: [{stage_id, title, slug}]}
-- A stage is locked when any dependency stage is not yet sealed.

create or replace function public.get_stage_lock_state(
  p_permit_id text,
  p_stage_id  uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_missing jsonb := '[]'::jsonb;
  v_dep     record;
begin
  for v_dep in
    select
      dep.depends_on_stage_id,
      s.title,
      s.slug,
      coalesce(pss.status, 'not_started') as dep_status
    from public.inspection_stage_dependencies dep
    join public.inspection_stages s
      on s.id = dep.depends_on_stage_id
    left join public.permit_stage_statuses pss
      on pss.stage_id = dep.depends_on_stage_id
     and pss.permit_id = p_permit_id
    where dep.stage_id = p_stage_id
  loop
    if v_dep.dep_status <> 'sealed' then
      v_missing := v_missing || jsonb_build_object(
        'stage_id', v_dep.depends_on_stage_id,
        'title',    v_dep.title,
        'slug',     v_dep.slug,
        'status',   v_dep.dep_status
      );
    end if;
  end loop;

  return jsonb_build_object(
    'is_locked',             jsonb_array_length(v_missing) > 0,
    'missing_dependencies',  v_missing
  );
end;
$$;


-- ─── F3. seal_inspection_stage ─────────────────────────────────────────────
-- Seals a stage for a permit.  Runs as SECURITY DEFINER so that the
-- permit_stage_statuses INSERT/UPDATE is not blocked by table-level RLS.
--
-- Returns {ok: true} on success.
-- Raises an exception with a descriptive message on failure.
--
-- Rejection reasons:
--   • user lacks inspector_specialty
--   • stage requires_master_seal but user is not master
--   • user specialty not in stage visible_to_specialties
--   • stage is locked (dependencies not yet sealed)
--   • required checklist items for this stage are not completed

create or replace function public.seal_inspection_stage(
  p_permit_id text,
  p_stage_id  uuid,
  p_user_id   uuid  default null,
  p_notes     text  default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id       uuid := coalesce(p_user_id, auth.uid());
  v_role          text := public.current_jwt_role();
  v_specialty     text;
  v_stage         record;
  v_lock          jsonb;
  v_incomplete    bigint;
  v_seal_id       uuid;
  v_payload       jsonb;
begin
  -- 1. Authenticated user required.
  if v_user_id is null then
    raise exception 'Authentication required to seal a stage.';
  end if;

  -- 2. Load stage.
  select * into v_stage
    from public.inspection_stages
   where id = p_stage_id;

  if not found then
    raise exception 'Inspection stage not found.';
  end if;

  if not v_stage.is_active then
    raise exception 'Stage "%" is not active.', v_stage.title;
  end if;

  -- 3. Permission check.
  if v_role <> 'admin' then
    -- Load specialty from profiles.
    select inspector_specialty into v_specialty
      from public.profiles
     where id = v_user_id;

    if v_specialty is null then
      raise exception
        'Inspector specialty is required to seal a stage. '
        'Contact admin to configure your account.';
    end if;

    -- Master seal stages require a master inspector.
    if v_stage.requires_master_seal and v_specialty <> 'master' then
      raise exception
        'Stage "%" requires a master inspector seal. '
        'Your current specialty is "%".', v_stage.title, v_specialty;
    end if;

    -- Specialty inspectors may only act on their designated stages.
    if v_specialty <> 'master'
       and not (v_specialty = any(v_stage.visible_to_specialties)) then
      raise exception
        'Your specialty "%" is not authorised for stage "%". '
        'Authorised specialties: %.',
        v_specialty,
        v_stage.title,
        array_to_string(v_stage.visible_to_specialties, ', ');
    end if;
  end if;

  -- 4. Dependency lock check.
  v_lock := public.get_stage_lock_state(p_permit_id, p_stage_id);
  if (v_lock ->> 'is_locked')::boolean then
    raise exception
      'Stage "%" is locked. The following dependency stages must be sealed first: %.',
      v_stage.title,
      v_lock -> 'missing_dependencies';
  end if;

  -- 5. Checklist completion check.
  -- Required items (across all active templates for this stage) must have a
  -- completed or approved response for this permit.
  select count(*) into v_incomplete
    from public.stage_checklist_items sci
    join public.stage_checklist_templates sct
      on sct.id = sci.template_id
   where sct.stage_id  = p_stage_id
     and sct.is_active = true
     and sci.is_required = true
     and not exists (
       select 1
         from public.permit_checklist_responses pcr
        where pcr.permit_id         = p_permit_id
          and pcr.checklist_item_id = sci.id
          and pcr.response_status   in ('completed', 'approved')
     );

  if v_incomplete > 0 then
    raise exception
      '% required checklist item(s) for stage "%" are not yet completed.',
      v_incomplete, v_stage.title;
  end if;

  -- 6. Insert immutable seal record.
  v_payload := jsonb_build_object(
    'stage_number', v_stage.stage_number,
    'stage_slug',   v_stage.slug,
    'stage_title',  v_stage.title,
    'permit_id',    p_permit_id,
    'sealed_by',    v_user_id,
    'specialty',    coalesce(v_specialty, 'admin'),
    'notes',        p_notes
  );

  insert into public.inspection_seals (
    permit_id, stage_id, sealed_by, seal_kind, seal_payload, seal_hash
  ) values (
    p_permit_id,
    p_stage_id,
    v_user_id,
    'digital_seal',
    v_payload,
    encode(digest(v_payload::text, 'sha256'), 'hex')
  )
  returning id into v_seal_id;

  -- 7. Upsert stage status to sealed.
  insert into public.permit_stage_statuses (
    permit_id, stage_id, status, sealed_by, sealed_at, seal_notes
  ) values (
    p_permit_id, p_stage_id, 'sealed', v_user_id, now(), p_notes
  )
  on conflict (permit_id, stage_id) do update
    set status     = 'sealed',
        sealed_by  = excluded.sealed_by,
        sealed_at  = excluded.sealed_at,
        seal_notes = excluded.seal_notes,
        updated_at = now();

  return jsonb_build_object(
    'ok',       true,
    'seal_id',  v_seal_id,
    'stage_id', p_stage_id,
    'permit_id', p_permit_id
  );
end;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
-- G. ROW-LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── inspection_stages ────────────────────────────────────────────────────

alter table public.inspection_stages enable row level security;

drop policy if exists stages_read_authenticated    on public.inspection_stages;
drop policy if exists stages_write_admin           on public.inspection_stages;

create policy stages_read_authenticated
  on public.inspection_stages
  for select
  to authenticated
  using (true);

create policy stages_write_admin
  on public.inspection_stages
  for all
  to authenticated
  using (public.current_jwt_role() = 'admin')
  with check (public.current_jwt_role() = 'admin');


-- ─── inspection_stage_dependencies ───────────────────────────────────────

alter table public.inspection_stage_dependencies enable row level security;

drop policy if exists stage_deps_read_authenticated on public.inspection_stage_dependencies;
drop policy if exists stage_deps_write_admin        on public.inspection_stage_dependencies;

create policy stage_deps_read_authenticated
  on public.inspection_stage_dependencies
  for select
  to authenticated
  using (true);

create policy stage_deps_write_admin
  on public.inspection_stage_dependencies
  for all
  to authenticated
  using (public.current_jwt_role() = 'admin')
  with check (public.current_jwt_role() = 'admin');


-- ─── permit_stage_statuses ────────────────────────────────────────────────
-- Authenticated users can read. Direct write is blocked — use the
-- seal_inspection_stage RPC (SECURITY DEFINER) to mutate rows.

alter table public.permit_stage_statuses enable row level security;

drop policy if exists pss_read_authenticated on public.permit_stage_statuses;
drop policy if exists pss_write_admin        on public.permit_stage_statuses;

create policy pss_read_authenticated
  on public.permit_stage_statuses
  for select
  to authenticated
  using (true);

create policy pss_write_admin
  on public.permit_stage_statuses
  for all
  to authenticated
  using (public.current_jwt_role() = 'admin')
  with check (public.current_jwt_role() = 'admin');


-- ─── inspection_seals ─────────────────────────────────────────────────────
-- Insert-only via the seal RPC (SECURITY DEFINER).
-- No authenticated user can directly INSERT, UPDATE, or DELETE.

alter table public.inspection_seals enable row level security;

drop policy if exists seals_read_authenticated on public.inspection_seals;

create policy seals_read_authenticated
  on public.inspection_seals
  for select
  to authenticated
  using (true);

-- Intentionally no INSERT / UPDATE / DELETE policy for authenticated users.
-- All writes go through seal_inspection_stage (SECURITY DEFINER).


-- ─── jurisdictions ────────────────────────────────────────────────────────

alter table public.jurisdictions enable row level security;

drop policy if exists jurisdictions_read_authenticated on public.jurisdictions;
drop policy if exists jurisdictions_write_admin        on public.jurisdictions;

create policy jurisdictions_read_authenticated
  on public.jurisdictions
  for select
  to authenticated
  using (true);

create policy jurisdictions_write_admin
  on public.jurisdictions
  for all
  to authenticated
  using (public.current_jwt_role() = 'admin')
  with check (public.current_jwt_role() = 'admin');


-- ─── stage_checklist_templates ────────────────────────────────────────────

alter table public.stage_checklist_templates enable row level security;

drop policy if exists checklist_templates_read_authenticated on public.stage_checklist_templates;
drop policy if exists checklist_templates_write_admin        on public.stage_checklist_templates;

create policy checklist_templates_read_authenticated
  on public.stage_checklist_templates
  for select
  to authenticated
  using (true);

create policy checklist_templates_write_admin
  on public.stage_checklist_templates
  for all
  to authenticated
  using (public.current_jwt_role() = 'admin')
  with check (public.current_jwt_role() = 'admin');


-- ─── stage_checklist_items ────────────────────────────────────────────────

alter table public.stage_checklist_items enable row level security;

drop policy if exists checklist_items_read_authenticated on public.stage_checklist_items;
drop policy if exists checklist_items_write_admin        on public.stage_checklist_items;

create policy checklist_items_read_authenticated
  on public.stage_checklist_items
  for select
  to authenticated
  using (true);

create policy checklist_items_write_admin
  on public.stage_checklist_items
  for all
  to authenticated
  using (public.current_jwt_role() = 'admin')
  with check (public.current_jwt_role() = 'admin');


-- ─── permit_checklist_responses ───────────────────────────────────────────
-- Inspectors can insert/update their own responses.
-- Builders can read all responses for their permits (via project lookup).
-- Admins have full access.

alter table public.permit_checklist_responses enable row level security;

drop policy if exists pcr_read_authenticated on public.permit_checklist_responses;
drop policy if exists pcr_inspector_write    on public.permit_checklist_responses;
drop policy if exists pcr_admin_all          on public.permit_checklist_responses;

create policy pcr_read_authenticated
  on public.permit_checklist_responses
  for select
  to authenticated
  using (true);

create policy pcr_inspector_write
  on public.permit_checklist_responses
  for insert
  to authenticated
  with check (
    completed_by = auth.uid()
    and public.current_jwt_role() in ('inspector', 'admin')
  );

create policy pcr_inspector_update
  on public.permit_checklist_responses
  for update
  to authenticated
  using (
    completed_by = auth.uid()
    and public.current_jwt_role() in ('inspector', 'admin')
  )
  with check (
    completed_by = auth.uid()
    and public.current_jwt_role() in ('inspector', 'admin')
  );

create policy pcr_admin_all
  on public.permit_checklist_responses
  for all
  to authenticated
  using (public.current_jwt_role() = 'admin')
  with check (public.current_jwt_role() = 'admin');
