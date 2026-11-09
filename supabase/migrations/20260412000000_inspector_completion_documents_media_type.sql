alter table if exists public.inspector_completion_documents
  add column if not exists media_type text not null default 'document';

update public.inspector_completion_documents
set media_type = case
  when mime_type like 'image/%' then 'camera'
  when mime_type like 'video/%' then 'video'
  when mime_type like 'audio/%' then 'audio'
  when mime_type like 'text/%' then 'text'
  else 'document'
end
where coalesce(media_type, 'document') = 'document';
