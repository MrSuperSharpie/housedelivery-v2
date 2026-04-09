alter table public.job_assignments
  add column if not exists objection_state text not null default 'none',
  add column if not exists cancelled_at timestamptz;

update public.job_assignments
set
  status = 'provisional',
  objection_state = 'pending_review'
where status = 'objected';

alter table public.compliance_package_exports
  add column if not exists recipient_type text,
  add column if not exists recipient_identity text,
  add column if not exists export_method text;

create table if not exists public.authority_access_grants (
  id text primary key,
  record_id text not null,
  package_seal_id text references public.compliance_package_seals(id) on delete set null,
  recipient_type text not null,
  recipient_identity text,
  access_scope text not null default 'read_only_package',
  token_hash text not null,
  issued_by_id text,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_authority_access_grants_record_id
  on public.authority_access_grants(record_id);

create index if not exists idx_authority_access_grants_token_hash
  on public.authority_access_grants(token_hash);

create table if not exists public.field_geo_anomalies (
  id text primary key,
  assignment_id text not null,
  job_id text not null,
  report_id text,
  document_id text,
  anomaly_type text not null,
  review_status text not null default 'pending_review',
  distance_meters integer,
  threshold_meters integer,
  explanation text,
  inspector_id text,
  admin_decision text,
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_field_geo_anomalies_job_id
  on public.field_geo_anomalies(job_id);

create index if not exists idx_field_geo_anomalies_report_id
  on public.field_geo_anomalies(report_id);
