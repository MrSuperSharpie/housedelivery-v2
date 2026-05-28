import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdminLikeRole } from '@/lib/adminAccess'

// Mirrors the client-side dashboardForRole in roleGuard.tsx.
// Defined independently here to avoid importing 'use client' modules in server code.
function redirectPathForRole(role: unknown): string {
  if (role === 'builder')   return '/builder'
  if (role === 'inspector') return '/inspector'
  if (role === 'auditor')   return '/auditor'
  return '/login'
}

/**
 * Server-side admin guard for async server component pages.
 *
 * Checks the Supabase session cookie, then cross-checks the caller's
 * role against the profiles table (authoritative source). Redirects
 * unauthenticated callers to /login and non-admin callers to their
 * role dashboard. Returns the verified Supabase User on success.
 *
 * Call this at the top of any server component page under /admin
 * before performing Supabase reads or other business logic.
 *
 * Limitation: the middleware layer provides a first-pass role check
 * from the JWT user_metadata (fast, no DB round-trip). This guard
 * provides a second-pass check from the profiles table, which catches
 * stale JWTs where the role was updated after the token was issued.
 */
export async function requireAdmin(): Promise<User> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const profileRole = (profile as { role?: unknown } | null)?.role
  const metadataRole = user.user_metadata?.role
  const role = profileRole ?? metadataRole

  if (!isAdminLikeRole(role)) {
    redirect(redirectPathForRole(role))
  }

  return user
}
