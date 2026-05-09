-- Align job_assignments.status with the application lifecycle.
-- The app treats "completed" as a terminal assignment status after scoped inspection sign-off.

alter table public.job_assignments
  drop constraint if exists job_assignments_status_check;

alter table public.job_assignments
  add constraint job_assignments_status_check
  check (
    status in (
      'provisional',
      'confirmed',
      'cancelled',
      'invalidated',
      'completed'
    )
  );
