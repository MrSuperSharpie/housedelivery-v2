alter table if exists public.compliance_completed_records
  add column if not exists city text,
  add column if not exists builder_id text,
  add column if not exists builder_name text,
  add column if not exists inspector_id text,
  add column if not exists permit_number text,
  add column if not exists discipline text,
  add column if not exists region text,
  add column if not exists jurisdiction_id text,
  add column if not exists jurisdiction_name text,
  add column if not exists authority_name text,
  add column if not exists hold_id text,
  add column if not exists hold_history jsonb not null default '[]'::jsonb;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.compliance_completed_records'::regclass
      and conname = 'compliance_completed_records_result_check'
  ) then
    alter table public.compliance_completed_records
      drop constraint compliance_completed_records_result_check;
  end if;

  alter table public.compliance_completed_records
    add constraint compliance_completed_records_result_check
    check (result in ('pass', 'fail', 'stopped'));
exception
  when duplicate_object then
    null;
end $$;
