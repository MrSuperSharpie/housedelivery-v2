-- Builder verification document metadata.
-- Files are stored in a private Storage bucket; this table stores reviewable
-- references for builder onboarding/admin approval.

create table if not exists public.builder_documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null references public.profiles(id) on delete cascade,
  document_type text not null,
  file_name     text not null,
  storage_path  text not null,
  status        text not null default 'uploaded'
                check (status in ('uploaded', 'under_review', 'accepted', 'rejected', 'needs_info')),
  is_required   boolean not null default false,
  reviewer_note text,
  expires_at    timestamptz,
  uploaded_at   timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists builder_documents_user_id_idx
  on public.builder_documents(user_id);

create index if not exists builder_documents_status_idx
  on public.builder_documents(status);

drop trigger if exists trg_builder_documents_updated_at on public.builder_documents;
create trigger trg_builder_documents_updated_at
  before update on public.builder_documents
  for each row execute function public.set_updated_at();

alter table public.builder_documents enable row level security;

drop policy if exists "builder_documents_builder_manage_own" on public.builder_documents;
create policy "builder_documents_builder_manage_own"
  on public.builder_documents
  for all
  to authenticated
  using ((select auth.uid())::text = user_id)
  with check ((select auth.uid())::text = user_id);

drop policy if exists "builder_documents_admin_read" on public.builder_documents;
create policy "builder_documents_admin_read"
  on public.builder_documents
  for select
  to authenticated
  using (
    coalesce(
      auth.jwt() ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role'
    ) = 'admin'
  );

drop policy if exists "builder_documents_admin_update" on public.builder_documents;
create policy "builder_documents_admin_update"
  on public.builder_documents
  for update
  to authenticated
  using (
    coalesce(
      auth.jwt() ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role'
    ) = 'admin'
  )
  with check (
    coalesce(
      auth.jwt() ->> 'role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'role'
    ) = 'admin'
  );
