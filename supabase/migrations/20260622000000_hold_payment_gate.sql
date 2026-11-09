-- Hold / Same-Day Correction payment gate.
--
-- A Hold must not become active, fee-locked, or inspector re-check ready until
-- Stripe payment is completed and confirmed server-side by the Stripe webhook.
-- Workflow status (job_holds.status) and payment status are tracked separately:
-- this migration adds payment-tracking columns ONLY and does NOT touch the
-- existing job_holds.status values or its CHECK constraint.
alter table public.job_holds
  add column if not exists hold_payment_status text not null default 'unpaid',
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists hold_paid_at timestamptz;

-- Allowed payment states. Workflow status is intentionally left untouched.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'job_holds_hold_payment_status_check'
  ) then
    alter table public.job_holds
      add constraint job_holds_hold_payment_status_check
      check (hold_payment_status in ('unpaid', 'paid', 'failed', 'cancelled'));
  end if;
end $$;
