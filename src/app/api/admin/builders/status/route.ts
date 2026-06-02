import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdminLikeRole } from '@/lib/adminAccess'

export const runtime = 'nodejs'

const BUILDER_STATUSES = [
  'submitted',
  'under_review',
  'needs_info',
  'approved',
  'rejected',
  'suspended',
] as const

type BuilderLifecycleStatus = typeof BUILDER_STATUSES[number]

function isBuilderStatus(value: unknown): value is BuilderLifecycleStatus {
  return typeof value === 'string' && (BUILDER_STATUSES as readonly string[]).includes(value)
}

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
  let body: { userId?: unknown; status?: unknown; reviewerNote?: unknown }

  try {
    body = await req.json() as { userId?: unknown; status?: unknown; reviewerNote?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  if (!userId) {
    return NextResponse.json({ error: 'Builder user id is required' }, { status: 400 })
  }

  if (!isBuilderStatus(body.status)) {
    return NextResponse.json({ error: 'Valid builder status is required' }, { status: 400 })
  }
  const status = body.status

  const reviewerNote = typeof body.reviewerNote === 'string' ? body.reviewerNote.trim() || null : null

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
    console.error('[admin/builders/status] admin role lookup failed:', adminProfileError)
    return NextResponse.json({ error: 'Could not verify admin access' }, { status: 503 })
  }

  if (!isAdminLikeRole((adminProfile as { role?: unknown } | null)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const serviceSupabase = getServiceClient()
  if (!serviceSupabase) {
    return NextResponse.json({ error: 'Admin builder status update is not configured' }, { status: 503 })
  }

  const { data: targetProfile, error: targetLookupError } = await serviceSupabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle()

  if (targetLookupError) {
    console.error('[admin/builders/status] target profile lookup failed:', targetLookupError)
    return NextResponse.json({ error: 'Could not verify builder profile' }, { status: 503 })
  }

  if (!targetProfile) {
    return NextResponse.json({ error: 'Builder profile was not found' }, { status: 404 })
  }

  if ((targetProfile as { role?: unknown }).role !== 'builder') {
    return NextResponse.json({ error: 'Target profile is not a builder' }, { status: 400 })
  }

  const now = new Date().toISOString()

  const { error: statusError } = await serviceSupabase
    .from('builder_onboarding_status')
    .update({
      status,
      reviewer_note: reviewerNote,
      reviewed_at: now,
      reviewed_by: authData.user.id,
      updated_at: now,
    })
    .eq('user_id', userId)

  if (statusError) {
    console.error('[admin/builders/status] builder_onboarding_status update failed:', statusError)
    return NextResponse.json({ error: 'Could not update builder status' }, { status: 503 })
  }

  const { error: profileError } = await serviceSupabase
    .from('profiles')
    .update({ onboarding_status: status })
    .eq('id', userId)

  if (profileError) {
    console.error('[admin/builders/status] profiles sync failed:', profileError)
    return NextResponse.json({ error: 'Could not sync builder profile status' }, { status: 503 })
  }

  console.log(`[admin/builders/status] userId=${userId} status=${status} by=${authData.user.id}`)
  return NextResponse.json({ ok: true })
}
