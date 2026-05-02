-- Allow authenticated Vero admins to read private inspector credential documents.
-- Documents live in the inspection-evidence bucket under:
-- inspector_documents/{auth.uid()}/{document_type}/{filename}

drop policy if exists inspector_documents_admin_select on storage.objects;
create policy inspector_documents_admin_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'inspection-evidence'
  and (storage.foldername(name))[1] = 'inspector_documents'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);
