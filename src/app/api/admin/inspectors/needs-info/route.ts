import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdminLikeRole } from '@/lib/adminAccess'

export const runtime = 'nodejs'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) return null

  return createServiceClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(req: NextRequest) {
  let body: { userId?: unknown }

  try {
    body = await req.json() as { userId?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  if (!userId) {
    return NextResponse.json({ error: 'Inspector user id is required' }, { status: 400 })
  }

  const sessionSupabase = await createClient()
  const { data: authData, error: authError } = await sessionSupabase.auth.getUser()
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceSupabase = getServiceClient()
  if (!serviceSupabase) {
    return NextResponse.json({ error: 'Admin profile sync is not configured' }, { status: 503 })
  }

  const { data: adminProfile, error: adminProfileError } = await serviceSupabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (adminProfileError) {
    console.error('[admin/inspectors/needs-info] admin role lookup failed:', adminProfileError)
    return NextResponse.json({ error: 'Could not verify admin access' }, { status: 503 })
  }

  if (!isAdminLikeRole((adminProfile as { role?: unknown } | null)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: updatedProfile, error: updateError } = await serviceSupabase
    .from('profiles')
    .update({
      onboarding_status: 'needs_info',
      verified: false,
    })
    .eq('id', userId)
    .select('id, onboarding_status, verified')
    .maybeSingle()

  if (updateError) {
    console.error('[admin/inspectors/needs-info] profile sync failed:', updateError)
    return NextResponse.json({ error: 'Could not sync inspector profile status' }, { status: 503 })
  }

  if (!updatedProfile) {
    return NextResponse.json({ error: 'Inspector profile was not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, profile: updatedProfile })
}
