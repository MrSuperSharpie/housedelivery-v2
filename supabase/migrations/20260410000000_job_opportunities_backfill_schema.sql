-- Add extended columns to job_opportunities that were originally defined in
-- migration 20260407020000_project_job_validation.sql but were never applied
-- to the live database.
--
-- Why this migration is separate:
--   20260407020000 was blocked because the claim RPC in that same migration
--   referenced validation_status in a way that caused a runtime crash on jobs
--   that had not been through the validation flow.  The RPC issue was resolved
--   in migrations 20260409010000 and 20260409020000.  The column additions
--   themselves are safe and are required for:
--
--   • InspectorCompletionWorkspace — reads project_id to look up GPS coords
--   • rowToJob mapper in jobs.ts   — maps all extended columns
--   • Builder job-post flow        — writes validation_status / escrow_authorized
--
-- All statements use ADD COLUMN IF NOT EXISTS so this migration is idempotent
-- and can be re-run safely even if 20260407020000 was partially applied.

alter table public.job_opportunities
  add column if not exists project_id              text,
  add column if not exists builder_onboarding_status text,
  add column if not exists validation_status       text not null default 'pending_validation',
  add column if not exists validation_blockers     jsonb not null default '[]'::jsonb,
  add column if not exists escrow_authorized       boolean not null default false,
  add column if not exists validation_completed_at timestamptz,
  add column if not exists published_at            timestamptz;

-- Back-fill: mark existing live/provisionally_assigned jobs as validated so
-- they are not blocked by any future code that checks validation_status.
update public.job_opportunities
set
  builder_onboarding_status  = coalesce(builder_onboarding_status, 'approved'),
  validation_status          = 'validated',
  escrow_authorized          = true,
  validation_completed_at    = coalesce(validation_completed_at, updated_at, created_at, now()),
  published_at               = coalesce(published_at, created_at, now())
where status in ('live', 'provisionally_assigned', 'assigned', 'active')
  and coalesce(nullif(permit_number, ''), nullif(project_name, '')) is not null
  and required_discipline is not null
  and region is not null
  and stage_name is not null;
