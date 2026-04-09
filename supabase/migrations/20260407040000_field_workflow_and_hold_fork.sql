alter table if exists public.inspector_completion_documents
  add column if not exists evidence_checksum text,
  add column if not exists original_captured_at timestamptz,
  add column if not exists capture_geo jsonb not null default '{}'::jsonb,
  add column if not exists integrity_status text not null default 'recorded',
  add column if not exists anomaly_flags jsonb not null default '[]'::jsonb;

alter table public.job_holds
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_at timestamptz,
  add column if not exists resolution_summary text;
