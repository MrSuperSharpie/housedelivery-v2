-- Saved Look Books use UUID bearer identifiers. Only the server-side service role
-- may read or write this table; no anonymous/authenticated browser policy exists.
create table if not exists public.lookbook_configurations (
  id uuid primary key,
  home_slug text not null,
  home_display_name text not null,
  home_family text not null check (
    home_family in ('custom-home', 'laneway-carriage-home', 'pre-approved-home')
  ),
  configurator_version integer not null,
  configuration jsonb not null,
  selections jsonb not null,
  contact jsonb not null,
  lead_state text not null check (
    lead_state in ('known_engaged', 'qualified_inquiry')
  ),
  follow_up_requested boolean not null default false,
  follow_up_requested_at timestamptz,
  follow_up_source text check (
    follow_up_source is null or follow_up_source in (
      'email_assistance_checkbox',
      'property_check'
    )
  ),
  property_feasibility jsonb,
  attribution jsonb not null default '{}'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  completed_at timestamptz not null,
  email_requested_at timestamptz
);

create index if not exists lookbook_configurations_email_index
  on public.lookbook_configurations ((lower(contact ->> 'email')));

create index if not exists lookbook_configurations_campaign_index
  on public.lookbook_configurations ((attribution ->> 'utmCampaign'));

create index if not exists lookbook_configurations_lead_state_index
  on public.lookbook_configurations (lead_state, updated_at desc);

alter table public.lookbook_configurations enable row level security;

comment on table public.lookbook_configurations is
  'House Delivery saved Look Books and explicit property/follow-up requests. Server service-role access only.';
