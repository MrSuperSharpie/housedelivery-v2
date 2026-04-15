-- Ensure notification-tracking columns exist on job_holds.
-- These were introduced in 20260412010000_governed_hold_site_retainer.sql but may not
-- have been present when that migration was first applied to some environments.
alter table public.job_holds
  add column if not exists last_notified_at timestamptz,
  add column if not exists last_builder_response_at timestamptz;
