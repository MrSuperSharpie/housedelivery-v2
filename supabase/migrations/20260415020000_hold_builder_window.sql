-- Add builder_selected_correction_minutes to job_holds.
-- Stores the correction window chosen by the builder at acceptance time.
-- Nullable: remains null until the builder accepts and picks a window.
-- The inspector no longer drives the priced duration; the builder does.
alter table public.job_holds
  add column if not exists builder_selected_correction_minutes integer;
