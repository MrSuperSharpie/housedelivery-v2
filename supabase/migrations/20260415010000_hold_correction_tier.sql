-- Add hold_correction_tier column to job_holds.
-- Captures which of the three service tiers applies to this hold:
--   inline_correction  → correction fits within current inspection window; flat convenience fee
--   reserved_same_day  → inspector reserves same-day time within the visit; flat reservation fee
--   extended_retainer  → correction extends beyond planned inspection window; premium hourly retainer
alter table public.job_holds
  add column if not exists hold_correction_tier text
    check (
      hold_correction_tier is null
      or hold_correction_tier in ('inline_correction', 'reserved_same_day', 'extended_retainer')
    );
