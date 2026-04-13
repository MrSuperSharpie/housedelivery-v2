alter table if exists public.compliance_completed_records
  add column if not exists hold_id text,
  add column if not exists hold_history jsonb not null default '[]'::jsonb;
