create table if not exists public.planner_project_submissions (
  id text primary key,
  submission_id text not null unique,
  opportunity_report_reference text not null,
  community text not null,
  lifecycle_status text not null check (
    lifecycle_status in (
      'draft',
      'submitted-for-review',
      'house-delivery-review',
      'lou-prepared',
      'lou-sent',
      'lou-accepted',
      'design-development-authorization-required',
      'design-development-authorized',
      'payment-pending',
      'design-development-paid',
      'ready-for-factory',
      'sent-to-factory',
      'factory-design-in-progress',
      'factory-design-complete',
      'final-pricing-in-development',
      'final-pricing-ready'
    )
  ),
  project_state jsonb not null,
  design_packages jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz not null
);

alter table public.planner_project_submissions enable row level security;

comment on table public.planner_project_submissions is
  'One durable First Nations Planner project record. Server service-role access only; Design Groups reference existing saved Look Books.';

comment on column public.planner_project_submissions.design_packages is
  'Unique Design Group handoff metadata and saved Look Book IDs. One package per design output, not per physical home.';
