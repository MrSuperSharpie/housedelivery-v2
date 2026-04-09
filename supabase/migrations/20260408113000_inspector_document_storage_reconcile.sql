-- Reconcile the private inspector document bucket + per-user storage policies.
-- Documents live in the inspection-evidence bucket under:
-- inspector_documents/{auth.uid()}/{document_type}/{filename}

insert into storage.buckets (id, name, public)
values ('inspection-evidence', 'inspection-evidence', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists inspector_documents_select_own on storage.objects;
create policy inspector_documents_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'inspection-evidence'
  and (storage.foldername(name))[1] = 'inspector_documents'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists inspector_documents_insert_own on storage.objects;
create policy inspector_documents_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'inspection-evidence'
  and (storage.foldername(name))[1] = 'inspector_documents'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists inspector_documents_update_own on storage.objects;
create policy inspector_documents_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'inspection-evidence'
  and (storage.foldername(name))[1] = 'inspector_documents'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'inspection-evidence'
  and (storage.foldername(name))[1] = 'inspector_documents'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists inspector_documents_delete_own on storage.objects;
create policy inspector_documents_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'inspection-evidence'
  and (storage.foldername(name))[1] = 'inspector_documents'
  and (storage.foldername(name))[2] = auth.uid()::text
);
