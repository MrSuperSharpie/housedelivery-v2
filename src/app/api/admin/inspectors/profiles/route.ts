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

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get('ids')
  const userIds = idsParam ? idsParam.split(',').map(s => s.trim()).filter(Boolean) : []
  if (userIds.length === 0) {
    return NextResponse.json({ profiles: [] })
  }

  const sessionSupabase = await createClient()
  const { data: authData, error: authError } = await sessionSupabase.auth.getUser()
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: adminProfile, error: adminProfileError } = await sessionSupabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (adminProfileError) {
    console.error('[admin/inspectors/profiles] admin role lookup failed:', adminProfileError)
    return NextResponse.json({ error: 'Could not verify admin access' }, { status: 503 })
  }

  const profileRole = (adminProfile as { role?: unknown } | null)?.role
  const metadataRole = authData.user.user_metadata?.role
  if (!isAdminLikeRole(profileRole ?? metadataRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const serviceSupabase = getServiceClient()
  if (!serviceSupabase) {
    return NextResponse.json({ error: 'Admin profile read is not configured' }, { status: 503 })
  }

  const { data: profileRows, error: profilesError } = await serviceSupabase
    .from('profiles')
    .select('id, full_name, firm_name, email, first_name, last_name, digital_seal_url')
    .in('id', userIds)

  if (profilesError) {
    console.error('[admin/inspectors/profiles] profiles read failed:', profilesError)
    return NextResponse.json({ error: 'Could not read inspector profiles' }, { status: 503 })
  }

  return NextResponse.json({ profiles: profileRows ?? [] })
}
