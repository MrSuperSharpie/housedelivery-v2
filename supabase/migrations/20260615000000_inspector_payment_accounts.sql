-- Inspector payout accounts: one Stripe Connect (Express-style) connected
-- account per inspector, used so Vero can later pay inspectors for completed
-- and submitted inspection reports.
--
-- Scope (one table only): inspector_payment_accounts.
--
-- Trust model:
--   * One-to-one with profiles(id) (the inspector's auth user id).
--   * Inspectors may READ their own payout-account status (to drive the
--     "Set up payouts" UI), and nothing else.
--   * Clients may NOT insert, update, or delete. Stripe account ids and the
--     charges/payouts capability flags are written only by the service-role
--     server route (and, later, Stripe webhooks). RLS with a single select-own
--     policy denies all client writes by omission; service-role bypasses RLS.
--
-- Out of scope (later patches): account.updated webhooks, payout release /
-- transfers, builder card payments. This patch only persists the connected
-- account id and the capability snapshot returned at account-creation time.

create table if not exists public.inspector_payment_accounts (
  inspector_id               text primary key references public.profiles(id) on delete cascade,
  stripe_account_id          text unique,
  account_type               text not null default 'express',
  charges_enabled            boolean not null default false,
  payouts_enabled            boolean not null default false,
  details_submitted          boolean not null default false,
  requirements_currently_due jsonb not null default '[]'::jsonb,
  onboarding_started_at      timestamptz,
  onboarding_completed_at    timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

alter table public.inspector_payment_accounts enable row level security;

-- Read-own only. There is intentionally no insert/update/delete policy: with
-- RLS enabled, client roles (anon/authenticated) cannot write these rows at
-- all. The service-role connection used by the connect route bypasses RLS.
drop policy if exists inspector_payment_accounts_select_own on public.inspector_payment_accounts;
create policy inspector_payment_accounts_select_own
  on public.inspector_payment_accounts
  for select
  to authenticated
  using (inspector_id = (select auth.uid())::text);
