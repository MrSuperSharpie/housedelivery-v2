update auth.users
set encrypted_password = crypt('123456789', gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    confirmed_at = coalesce(confirmed_at, now()),
    updated_at = now()
where email = 'admin@veropermit.com'
returning id, email, email_confirmed_at, confirmed_at, updated_at;