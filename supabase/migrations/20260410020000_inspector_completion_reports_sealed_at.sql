alter table public.inspector_completion_reports
  add column if not exists sealed_at timestamptz;

update public.inspector_completion_reports
set sealed_at = coalesce(sealed_at, submitted_at, (seal_payload ->> 'sealedAt')::timestamptz)
where seal_applied = true
  and sealed_at is null
  and (
    submitted_at is not null
    or (seal_payload ? 'sealedAt')
  );
