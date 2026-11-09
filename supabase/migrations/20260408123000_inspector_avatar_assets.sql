insert into storage.buckets (id, name, public)
values ('builder-assets', 'builder-assets', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists builder_assets_select_public_inspector_avatars on storage.objects;
create policy builder_assets_select_public_inspector_avatars
on storage.objects
for select
to public
using (
  bucket_id = 'builder-assets'
  and (storage.foldername(name))[1] = 'inspector-avatars'
);

drop policy if exists builder_assets_insert_own_inspector_avatars on storage.objects;
create policy builder_assets_insert_own_inspector_avatars
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'builder-assets'
  and (storage.foldername(name))[1] = 'inspector-avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists builder_assets_update_own_inspector_avatars on storage.objects;
create policy builder_assets_update_own_inspector_avatars
on storage.objects
for update
to authenticated
using (
  bucket_id = 'builder-assets'
  and (storage.foldername(name))[1] = 'inspector-avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'builder-assets'
  and (storage.foldername(name))[1] = 'inspector-avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists builder_assets_delete_own_inspector_avatars on storage.objects;
create policy builder_assets_delete_own_inspector_avatars
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'builder-assets'
  and (storage.foldername(name))[1] = 'inspector-avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);
