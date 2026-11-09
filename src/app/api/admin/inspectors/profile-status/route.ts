import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdminLikeRole } from '@/lib/adminAccess'
import type { InspectorOnboardingStatus } from '@/lib/types'

export const runtime = 'nodejs'

const INSPECTOR_STATUSES: InspectorOnboardingStatus[] = [
  'draft',
  'submitted',
  'under_review',
  'needs_info',
  'approved',
  'rejected',
  'suspended',
]

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

function isInspectorStatus(value: unknown): value is InspectorOnboardingStatus {
  return typeof value === 'string' && INSPECTOR_STATUSES.includes(value as InspectorOnboardingStatus)
}

export async function POST(req: NextRequest) {
  let body: { userId?: unknown; status?: unknown }

  try {
    body = await req.json() as { userId?: unknown; status?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  if (!userId) {
    return NextResponse.json({ error: 'Inspector user id is required' }, { status: 400 })
  }

  if (!isInspectorStatus(body.status)) {
    return NextResponse.json({ error: 'Valid inspector status is required' }, { status: 400 })
  }
  const status = body.status

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
    console.error('[admin/inspectors/profile-status] admin role lookup failed:', adminProfileError)
    return NextResponse.json({ error: 'Could not verify admin access' }, { status: 503 })
  }

  if (!isAdminLikeRole((adminProfile as { role?: unknown } | null)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const serviceSupabase = getServiceClient()
  if (!serviceSupabase) {
    return NextResponse.json({ error: 'Admin profile sync is not configured' }, { status: 503 })
  }

  const { data: targetProfile, error: targetLookupError } = await serviceSupabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle()

  if (targetLookupError) {
    console.error('[admin/inspectors/profile-status] target profile lookup failed:', targetLookupError)
    return NextResponse.json({ error: 'Could not verify inspector profile' }, { status: 503 })
  }

  if (!targetProfile) {
    return NextResponse.json({ error: 'Inspector profile was not found' }, { status: 404 })
  }

  if ((targetProfile as { role?: unknown }).role !== 'inspector') {
    return NextResponse.json({ error: 'Target profile is not an inspector' }, { status: 400 })
  }

  const { data: updatedProfile, error: updateError } = await serviceSupabase
    .from('profiles')
    .update({
      onboarding_status: status,
      verified: status === 'approved',
    })
    .eq('id', userId)
    .select('id, onboarding_status, verified')
    .maybeSingle()

  if (updateError) {
    console.error('[admin/inspectors/profile-status] profile sync failed:', updateError)
    return NextResponse.json({ error: 'Could not sync inspector profile status' }, { status: 503 })
  }

  if (!updatedProfile) {
    return NextResponse.json({ error: 'Inspector profile was not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, profile: updatedProfile })
}
