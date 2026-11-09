-- Private builder verification document storage policies.
-- Documents live in the inspection-evidence bucket under:
-- builder_documents/{auth.uid()}/{document_type}/{filename}

drop policy if exists builder_documents_select_own on storage.objects;
create policy builder_documents_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'inspection-evidence'
  and (storage.foldername(name))[1] = 'builder_documents'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists builder_documents_insert_own on storage.objects;
create policy builder_documents_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'inspection-evidence'
  and (storage.foldername(name))[1] = 'builder_documents'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists builder_documents_update_own on storage.objects;
create policy builder_documents_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'inspection-evidence'
  and (storage.foldername(name))[1] = 'builder_documents'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'inspection-evidence'
  and (storage.foldername(name))[1] = 'builder_documents'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists builder_documents_delete_own on storage.objects;
create policy builder_documents_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'inspection-evidence'
  and (storage.foldername(name))[1] = 'builder_documents'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists builder_documents_admin_select on storage.objects;
create policy builder_documents_admin_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'inspection-evidence'
  and (storage.foldername(name))[1] = 'builder_documents'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);
