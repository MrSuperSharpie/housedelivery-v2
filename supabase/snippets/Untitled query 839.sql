select id, email, role, onboarding_status, verified
from public.profiles
where lower(email) = lower('admin@veropermit.com');