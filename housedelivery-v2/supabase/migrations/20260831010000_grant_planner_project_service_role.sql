-- Planner submissions are written only by the server-side repository. Keep
-- browser roles denied while granting the same privileges used by the
-- established lookbook_configurations persistence path.
revoke all on table public.planner_project_submissions from anon, authenticated;
grant select, insert, update on table public.planner_project_submissions to service_role;
