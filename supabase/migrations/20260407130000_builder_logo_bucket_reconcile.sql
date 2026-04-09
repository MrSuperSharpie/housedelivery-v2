insert into storage.buckets (id, name, public)
values ('builder-assets', 'builder-assets', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists builder_assets_select_public on storage.objects;
create policy builder_assets_select_public
on storage.objects
for select
to public
using (
  bucket_id = 'builder-assets'
  and (storage.foldername(name))[1] = 'builder-logos'
);

drop policy if exists builder_assets_insert_own on storage.objects;
create policy builder_assets_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'builder-assets'
  and (storage.foldername(name))[1] = 'builder-logos'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists builder_assets_update_own on storage.objects;
create policy builder_assets_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'builder-assets'
  and (storage.foldername(name))[1] = 'builder-logos'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'builder-assets'
  and (storage.foldername(name))[1] = 'builder-logos'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists builder_assets_delete_own on storage.objects;
create policy builder_assets_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'builder-assets'
  and (storage.foldername(name))[1] = 'builder-logos'
  and (storage.foldername(name))[2] = auth.uid()::text
);
