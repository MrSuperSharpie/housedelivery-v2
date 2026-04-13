alter table public.job_opportunities
  add column if not exists pricing_mode text not null default 'dispatch_fixed',
  add column if not exists specialist_role text,
  add column if not exists base_hourly_rate numeric,
  add column if not exists effective_hourly_rate numeric,
  add column if not exists billable_hours numeric,
  add column if not exists hold_hours numeric not null default 0,
  add column if not exists hold_cost numeric not null default 0,
  add column if not exists urgency_multiplier numeric not null default 1,
  add column if not exists platform_commission_amount numeric,
  add column if not exists escrow_estimate_total numeric,
  add column if not exists requires_professional_seal boolean not null default false,
  add column if not exists requires_cp boolean not null default false,
  add column if not exists inspection_type text,
  add column if not exists credential_class text;

update public.job_opportunities
set
  pricing_mode = coalesce(pricing_mode, 'dispatch_fixed'),
  urgency_multiplier = coalesce(
    nullif(urgency_multiplier, 0),
    case
      when dispatch_tier = 'emergency' then 2
      when dispatch_tier = 'priority' then 1.5
      else 1
    end
  ),
  hold_hours = coalesce(hold_hours, 0),
  hold_cost = coalesce(hold_cost, 0),
  platform_commission_amount = coalesce(platform_commission_amount, round(coalesce(offered_rate, 0) * 0.10)),
  escrow_estimate_total = coalesce(escrow_estimate_total, coalesce(offered_rate, 0) + round(coalesce(offered_rate, 0) * 0.10))
where true;
