create table if not exists public.compliance_package_seals (
  id text primary key,
  record_id text not null unique references public.compliance_completed_records(id) on delete cascade,
  package_hash text not null,
  verification_code text not null unique,
  version_number integer not null default 1,
  seal_status text not null default 'sealed',
  sealed_at timestamptz not null,
  sealed_by_id text,
  sealed_by_name text,
  manifest jsonb not null default '{}'::jsonb,
  export_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_compliance_package_seals_updated_at on public.compliance_package_seals;
create trigger trg_compliance_package_seals_updated_at
  before update on public.compliance_package_seals
  for each row execute function public.set_governance_updated_at();

create table if not exists public.compliance_package_exports (
  id uuid primary key default gen_random_uuid(),
  record_id text not null references public.compliance_completed_records(id) on delete cascade,
  package_seal_id text not null references public.compliance_package_seals(id) on delete cascade,
  exported_by_id text,
  export_scope text not null,
  destination text,
  export_hash text,
  exported_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.compliance_package_seals enable row level security;
alter table public.compliance_package_exports enable row level security;

drop policy if exists compliance_package_seals_authenticated_all on public.compliance_package_seals;
create policy compliance_package_seals_authenticated_all
  on public.compliance_package_seals
  for all
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists compliance_package_exports_authenticated_all on public.compliance_package_exports;
create policy compliance_package_exports_authenticated_all
  on public.compliance_package_exports
  for all
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);
