import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdminLikeRole } from '@/lib/adminAccess'
import { normalizeInspectorRoleLanes } from '@/lib/inspectorRoleLanes'
import {
  CLAIM_AUTHORITY_LANES,
  matchesApprovedLane,
  type CredentialTypeRow,
  type HeldCredentialRow,
} from '@/lib/credentialAuthoritySync'

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
  let body: { userId?: unknown; approvedRoleLanes?: unknown }

  try {
    body = await req.json() as { userId?: unknown; approvedRoleLanes?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  if (!userId) {
    return NextResponse.json({ error: 'Inspector user id is required' }, { status: 400 })
  }

  if (!Array.isArray(body.approvedRoleLanes)) {
    return NextResponse.json({ error: 'Approved work areas are required' }, { status: 400 })
  }

  const approvedRoleLanes = normalizeInspectorRoleLanes(body.approvedRoleLanes)

  const sessionSupabase = await createClient()
  const { data: authData, error: authError } = await sessionSupabase.auth.getUser()
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceSupabase = getServiceClient()
  if (!serviceSupabase) {
    return NextResponse.json({ error: 'Admin credential authority sync is not configured' }, { status: 503 })
  }

  const { data: adminProfile, error: adminProfileError } = await serviceSupabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (adminProfileError) {
    console.error('[admin/inspectors/credential-authority] admin role lookup failed:', adminProfileError)
    return NextResponse.json({ error: 'Could not verify admin access' }, { status: 503 })
  }

  if (!isAdminLikeRole((adminProfile as { role?: unknown } | null)?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: targetProfile, error: targetLookupError } = await serviceSupabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle()

  if (targetLookupError) {
    console.error('[admin/inspectors/credential-authority] target profile lookup failed:', targetLookupError)
    return NextResponse.json({ error: 'Could not verify inspector profile' }, { status: 503 })
  }

  if (!targetProfile) {
    return NextResponse.json({ error: 'Inspector profile was not found' }, { status: 404 })
  }

  if ((targetProfile as { role?: unknown }).role !== 'inspector') {
    return NextResponse.json({ error: 'Target profile is not an inspector' }, { status: 400 })
  }

  const { data: heldRows, error: heldError } = await serviceSupabase
    .from('inspector_held_credentials')
    .select('id, credential_type_id, verification_status')
    .eq('inspector_id', userId)

  if (heldError) {
    console.error('[admin/inspectors/credential-authority] held credential lookup failed:', heldError)
    return NextResponse.json({ error: 'Could not load inspector credential authority records' }, { status: 503 })
  }

  const heldCredentials = (heldRows ?? []) as HeldCredentialRow[]
  const hasApprovedClaimAuthorityLane = approvedRoleLanes.some(lane => CLAIM_AUTHORITY_LANES.has(lane))
  if (heldCredentials.length === 0 && hasApprovedClaimAuthorityLane) {
    return NextResponse.json(
      { error: 'No held credential records exist for the approved work areas' },
      { status: 409 },
    )
  }

  if (heldCredentials.length === 0 || approvedRoleLanes.length === 0) {
    return NextResponse.json({
      ok: true,
      verifiedCredentialIds: [],
      message: 'No credential authority records needed synchronization',
    })
  }

  const credentialTypeIds = [...new Set(heldCredentials.map(row => row.credential_type_id))]
  const { data: credentialTypeRows, error: credentialTypeError } = await serviceSupabase
    .from('credential_types')
    .select('id, authority_level, disciplines')
    .in('id', credentialTypeIds)

  if (credentialTypeError) {
    console.error('[admin/inspectors/credential-authority] credential type lookup failed:', credentialTypeError)
    return NextResponse.json({ error: 'Could not load credential authority definitions' }, { status: 503 })
  }

  const credentialTypes = new Map(
    ((credentialTypeRows ?? []) as CredentialTypeRow[]).map(row => [row.id, row]),
  )

  const matchingCredentials = heldCredentials.filter(row =>
    matchesApprovedLane(row, credentialTypes.get(row.credential_type_id), approvedRoleLanes)
  )

  if (matchingCredentials.length === 0) {
    return NextResponse.json(
      { error: 'No held credential records match the approved work areas' },
      { status: 409 },
    )
  }

  const credentialIds = matchingCredentials.map(row => row.id)
  const now = new Date().toISOString()
  const { data: updatedRows, error: updateError } = await serviceSupabase
    .from('inspector_held_credentials')
    .update({
      verification_status: 'verified',
      verified_by: authData.user.id,
      verified_at: now,
      updated_at: now,
    })
    .in('id', credentialIds)
    .select('id, credential_type_id, verification_status')

  if (updateError) {
    console.error('[admin/inspectors/credential-authority] credential authority sync failed:', updateError)
    return NextResponse.json({ error: 'Could not sync inspector credential authority' }, { status: 503 })
  }

  return NextResponse.json({
    ok: true,
    verifiedCredentialIds: ((updatedRows ?? []) as HeldCredentialRow[]).map(row => row.id),
  })
}
