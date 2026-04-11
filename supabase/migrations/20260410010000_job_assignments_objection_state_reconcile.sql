alter table public.job_assignments
  add column if not exists objection_state text not null default 'none';

update public.job_assignments
set objection_state = 'pending_review'
where status = 'objected'
  and objection_state = 'none';
