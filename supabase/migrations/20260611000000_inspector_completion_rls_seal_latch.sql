-- Inspector completion seal-integrity patch 1: RLS + seal latch.
--
-- Scope (three tables only):
--   inspector_completion_reports
--   inspector_completion_stage_items
--   inspector_completion_documents
--
-- Before this migration these tables had no RLS and were fully writable from
-- the browser anon client. This patch makes the database enforce:
--   1. Only the owning inspector can insert/update their report rows, and only
--      while the report is unsealed. The sealing transition itself (unsealed →
--      sealed) remains allowed one-way for the owning inspector.
--   2. Reads are limited to the owning inspector, the builder who owns the
--      linked job (job_opportunities.builder_id), and admin-like roles.
--   3. No client role may delete reports or stage items. The owning inspector
--      may delete evidence documents only while the parent report is unsealed.
--   4. A trigger latch makes sealed/submitted reports (and their child rows)
--      immutable to client roles even if a future policy is misconfigured.
--      Service-role and direct database connections bypass the latch so
--      controlled server-side correction paths keep working.
--
-- Out of scope (later patches): server-generated seal references, S15 gate
-- derivation, compliance_* tables, storage policies.

-- ── Helpers ──────────────────────────────────────────────────────────────────

-- True when the request comes from a PostgREST client role (anon/authenticated).
-- Service-role requests carry role 'service_role'; direct connections (psql,
-- migrations) have no request.jwt.claims at all. Both bypass the latch.
create or replace function public.completion_is_client_request()
returns boolean
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  ) in ('anon', 'authenticated')
$$;

-- A report is locked once sealed or submitted. Both are terminal states in
-- every existing flow (the scoped closeout routes treat submitted_at/status
-- 'submitted' the same as 'sealed').
create or replace function public.completion_report_is_locked(p_report_id text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.inspector_completion_reports r
    where r.id = p_report_id
      and (r.seal_applied or r.status in ('sealed', 'submitted'))
  )
$$;

-- ── Seal latch trigger ───────────────────────────────────────────────────────

create or replace function public.enforce_completion_seal_latch()
returns trigger
language plpgsql
as $$
begin
  if not public.completion_is_client_request() then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_table_name = 'inspector_completion_reports' then
    if old.seal_applied or old.status in ('sealed', 'submitted') then
      raise exception 'Sealed completion reports are immutable.'
        using errcode = 'P0001';
    end if;
  else
    -- stage items / documents: locked when the parent report is locked.
    if public.completion_report_is_locked(old.report_id) then
      raise exception 'Records under a sealed completion report are immutable.'
        using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_completion_reports_seal_latch on inspector_completion_reports;
create trigger trg_completion_reports_seal_latch
  before update or delete on inspector_completion_reports
  for each row execute function public.enforce_completion_seal_latch();

drop trigger if exists trg_completion_stage_items_seal_latch on inspector_completion_stage_items;
create trigger trg_completion_stage_items_seal_latch
  before update or delete on inspector_completion_stage_items
  for each row execute function public.enforce_completion_seal_latch();

drop trigger if exists trg_completion_documents_seal_latch on inspector_completion_documents;
create trigger trg_completion_documents_seal_latch
  before update or delete on inspector_completion_documents
  for each row execute function public.enforce_completion_seal_latch();

-- ── Enable RLS ───────────────────────────────────────────────────────────────

alter table inspector_completion_reports enable row level security;
alter table inspector_completion_stage_items enable row level security;
alter table inspector_completion_documents enable row level security;

-- ── inspector_completion_reports policies ────────────────────────────────────

drop policy if exists completion_reports_select_inspector on inspector_completion_reports;
create policy completion_reports_select_inspector
on inspector_completion_reports
for select
to authenticated
using (inspector_id = (select auth.uid())::text);

drop policy if exists completion_reports_select_builder on inspector_completion_reports;
create policy completion_reports_select_builder
on inspector_completion_reports
for select
to authenticated
using (
  exists (
    select 1
    from public.job_opportunities j
    where j.id::text = inspector_completion_reports.job_id
      and j.builder_id = (select auth.uid())
  )
);

drop policy if exists completion_reports_select_admin on inspector_completion_reports;
create policy completion_reports_select_admin
on inspector_completion_reports
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())::text
      and p.role = 'admin'
  )
);

-- Client inserts are unsealed drafts only: every seal must arrive via the
-- one-way update transition below, never as a birth state.
drop policy if exists completion_reports_insert_inspector on inspector_completion_reports;
create policy completion_reports_insert_inspector
on inspector_completion_reports
for insert
to authenticated
with check (
  inspector_id = (select auth.uid())::text
  and not seal_applied
  and status not in ('sealed', 'submitted')
);

-- USING evaluates the existing row, so an unsealed report can transition to
-- sealed in one update, but a sealed/submitted row can never be updated by a
-- client again (the trigger latch backstops this).
drop policy if exists completion_reports_update_inspector on inspector_completion_reports;
create policy completion_reports_update_inspector
on inspector_completion_reports
for update
to authenticated
using (
  inspector_id = (select auth.uid())::text
  and not seal_applied
  and status not in ('sealed', 'submitted')
)
with check (inspector_id = (select auth.uid())::text);

-- No delete policy on reports: client deletes are denied.

-- ── inspector_completion_stage_items policies ────────────────────────────────

drop policy if exists completion_items_select_inspector on inspector_completion_stage_items;
create policy completion_items_select_inspector
on inspector_completion_stage_items
for select
to authenticated
using (
  exists (
    select 1
    from public.inspector_completion_reports r
    where r.id = inspector_completion_stage_items.report_id
      and r.inspector_id = (select auth.uid())::text
  )
);

drop policy if exists completion_items_select_builder on inspector_completion_stage_items;
create policy completion_items_select_builder
on inspector_completion_stage_items
for select
to authenticated
using (
  exists (
    select 1
    from public.inspector_completion_reports r
    join public.job_opportunities j on j.id::text = r.job_id
    where r.id = inspector_completion_stage_items.report_id
      and j.builder_id = (select auth.uid())
  )
);

drop policy if exists completion_items_select_admin on inspector_completion_stage_items;
create policy completion_items_select_admin
on inspector_completion_stage_items
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())::text
      and p.role = 'admin'
  )
);

drop policy if exists completion_items_insert_inspector on inspector_completion_stage_items;
create policy completion_items_insert_inspector
on inspector_completion_stage_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.inspector_completion_reports r
    where r.id = inspector_completion_stage_items.report_id
      and r.inspector_id = (select auth.uid())::text
      and not (r.seal_applied or r.status in ('sealed', 'submitted'))
  )
);

drop policy if exists completion_items_update_inspector on inspector_completion_stage_items;
create policy completion_items_update_inspector
on inspector_completion_stage_items
for update
to authenticated
using (
  exists (
    select 1
    from public.inspector_completion_reports r
    where r.id = inspector_completion_stage_items.report_id
      and r.inspector_id = (select auth.uid())::text
      and not (r.seal_applied or r.status in ('sealed', 'submitted'))
  )
)
with check (
  exists (
    select 1
    from public.inspector_completion_reports r
    where r.id = inspector_completion_stage_items.report_id
      and r.inspector_id = (select auth.uid())::text
  )
);

-- No delete policy on stage items: client deletes are denied.

-- ── inspector_completion_documents policies ──────────────────────────────────

drop policy if exists completion_documents_select_inspector on inspector_completion_documents;
create policy completion_documents_select_inspector
on inspector_completion_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.inspector_completion_reports r
    where r.id = inspector_completion_documents.report_id
      and r.inspector_id = (select auth.uid())::text
  )
);

drop policy if exists completion_documents_select_builder on inspector_completion_documents;
create policy completion_documents_select_builder
on inspector_completion_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.inspector_completion_reports r
    join public.job_opportunities j on j.id::text = r.job_id
    where r.id = inspector_completion_documents.report_id
      and j.builder_id = (select auth.uid())
  )
);

drop policy if exists completion_documents_select_admin on inspector_completion_documents;
create policy completion_documents_select_admin
on inspector_completion_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())::text
      and p.role = 'admin'
  )
);

drop policy if exists completion_documents_insert_inspector on inspector_completion_documents;
create policy completion_documents_insert_inspector
on inspector_completion_documents
for insert
to authenticated
with check (
  exists (
    select 1
    from public.inspector_completion_reports r
    where r.id = inspector_completion_documents.report_id
      and r.inspector_id = (select auth.uid())::text
      and not (r.seal_applied or r.status in ('sealed', 'submitted'))
  )
);

drop policy if exists completion_documents_update_inspector on inspector_completion_documents;
create policy completion_documents_update_inspector
on inspector_completion_documents
for update
to authenticated
using (
  exists (
    select 1
    from public.inspector_completion_reports r
    where r.id = inspector_completion_documents.report_id
      and r.inspector_id = (select auth.uid())::text
      and not (r.seal_applied or r.status in ('sealed', 'submitted'))
  )
)
with check (
  exists (
    select 1
    from public.inspector_completion_reports r
    where r.id = inspector_completion_documents.report_id
      and r.inspector_id = (select auth.uid())::text
  )
);

-- Evidence documents may be removed by the owning inspector while drafting
-- (re-upload flow), never after the report is sealed/submitted.
drop policy if exists completion_documents_delete_inspector on inspector_completion_documents;
create policy completion_documents_delete_inspector
on inspector_completion_documents
for delete
to authenticated
using (
  exists (
    select 1
    from public.inspector_completion_reports r
    where r.id = inspector_completion_documents.report_id
      and r.inspector_id = (select auth.uid())::text
      and not (r.seal_applied or r.status in ('sealed', 'submitted'))
  )
);
