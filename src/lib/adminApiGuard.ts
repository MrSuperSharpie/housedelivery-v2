import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminLikeRole } from '@/lib/adminAccess'

type AdminApiResult =
  | { authorized: true; userId: string }
  | { authorized: false; response: NextResponse }

export async function requireAdminApi(): Promise<AdminApiResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 }),
    }
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
    return {
      authorized: false,
      response: NextResponse.json({ ok: false, error: 'Admin role required.' }, { status: 403 }),
    }
  }

  return { authorized: true, userId: user.id }
}
