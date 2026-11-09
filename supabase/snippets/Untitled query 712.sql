update auth.users
set encrypted_password = crypt('123456789', gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
where lower(email) = lower('admin@veropermit.com')
returning
  id,
  email,
  encrypted_password is not null as has_password,
  email_confirmed_at,
  confirmed_at,
  updated_at;