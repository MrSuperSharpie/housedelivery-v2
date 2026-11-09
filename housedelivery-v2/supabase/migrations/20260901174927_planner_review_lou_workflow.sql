alter table public.planner_project_submissions
  add column if not exists review_token_hash text,
  add column if not exists internal_review_status text not null default 'pending' check (
    internal_review_status in (
      'pending',
      'clarification-required',
      'lou-draft-prepared'
    )
  ),
  add column if not exists review_notes jsonb not null default '[]'::jsonb,
  add column if not exists lou_drafts jsonb not null default '[]'::jsonb,
  add column if not exists internal_review_updated_at timestamptz,
  add column if not exists handoff_email_version integer not null default 0 check (
    handoff_email_version >= 0
  ),
  add column if not exists handoff_email_sent_at timestamptz,
  add column if not exists handoff_email_provider_id text;

create unique index if not exists planner_project_review_token_hash_index
  on public.planner_project_submissions (review_token_hash)
  where review_token_hash is not null;

comment on column public.planner_project_submissions.review_token_hash is
  'SHA-256 hash of the project-scoped internal review capability. The usable token is never stored.';

comment on column public.planner_project_submissions.lou_drafts is
  'Append-only Project Development LOU draft revisions prepared by House Delivery. Preparing is not sending or acceptance.';

revoke all on table public.planner_project_submissions from anon, authenticated;
grant select, insert, update on table public.planner_project_submissions to service_role;
