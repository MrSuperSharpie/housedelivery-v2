import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdminLikeRole } from '@/lib/adminAccess'
import { sendVeroEmail } from '@/lib/email/sendVeroEmail'
import type { VeroEmailEventKey, VeroEmailSendResult } from '@/lib/email/types'

export const runtime = 'nodejs'

const ADMIN_EMAIL = 'admin@veropermit.com'
const APP_URL = 'https://veropermit.com'

const ACCOUNT_LIFECYCLE_EVENTS = new Set<VeroEmailEventKey>([
  'admin.inspector_application_submitted',
  'inspector.approved',
  'inspector.needs_info',
  'admin.builder_profile_submitted',
  'builder.approved',
  'builder.needs_info',
])

type AccountLifecycleBody = {
  eventKey?: unknown
  userId?: unknown
  reviewerNote?: unknown
}

type ProfileRow = Record<string, unknown>
type BuilderOnboardingRow = Record<string, unknown>
type InspectorOnboardingRow = Record<string, unknown>

type Role = 'admin' | 'inspector' | 'builder'
type LifecycleStatus = 'submitted' | 'under_review' | 'needs_info' | 'approved'

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

function isAccountLifecycleEvent(value: unknown): value is VeroEmailEventKey {
  return typeof value === 'string' && ACCOUNT_LIFECYCLE_EVENTS.has(value as VeroEmailEventKey)
}

function readStr(row: ProfileRow | BuilderOnboardingRow | InspectorOnboardingRow | null | undefined, key: string): string | undefined {
  const value = row?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function nameFromProfile(profile: ProfileRow | null | undefined, email?: string): string {
  const fullName = readStr(profile, 'full_name') ?? readStr(profile, 'name')
  const firstLast = [readStr(profile, 'first_name'), readStr(profile, 'last_name')].filter(Boolean).join(' ')

  return fullName ?? (firstLast || undefined) ?? email?.split('@')[0] ?? 'there'
}

function firmFromProfile(profile: ProfileRow | BuilderOnboardingRow | null | undefined): string {
  return readStr(profile, 'firm_name')
    ?? readStr(profile, 'company_name')
    ?? readStr(profile, 'business_name')
    ?? 'Not provided'
}

function requestedInfoFrom(body: AccountLifecycleBody, row?: ProfileRow | null): string {
  return typeof body.reviewerNote === 'string' && body.reviewerNote.trim()
    ? body.reviewerNote.trim()
    : readStr(row, 'reviewer_note')
      ?? 'Please review the requested information in your Vero Permit account.'
}

function hasRole(row: ProfileRow | null | undefined, role: Role): boolean {
  return readStr(row, 'role') === role
}

function hasStatus(row: ProfileRow | BuilderOnboardingRow | InspectorOnboardingRow | null | undefined, allowed: LifecycleStatus[]): boolean {
  const status = readStr(row, 'onboarding_status') ?? readStr(row, 'status')
  return Boolean(status && allowed.includes(status as LifecycleStatus))
}

function forbidden(message = 'Event is not allowed for this user or lifecycle state.') {
  return NextResponse.json({ error: message }, { status: 403 })
}

function logEmailResult(eventKey: VeroEmailEventKey, result: VeroEmailSendResult) {
  if (!result.ok) {
    console.warn(`[account-lifecycle-email] ${eventKey} email was not sent: ${result.error}`)
  }
}

async function getAdminAllowed(sessionSupabase: Awaited<ReturnType<typeof createClient>>, authUserId: string): Promise<boolean> {
  const { data: adminProfile, error } = await sessionSupabase
    .from('profiles')
    .select('role')
    .eq('id', authUserId)
    .maybeSingle()

  if (error) {
    console.error('[account-lifecycle-email] admin role lookup failed:', error)
    return false
  }

  return isAdminLikeRole((adminProfile as { role?: unknown } | null)?.role)
}

export async function POST(req: NextRequest) {
  let body: AccountLifecycleBody

  try {
    body = await req.json() as AccountLifecycleBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!isAccountLifecycleEvent(body.eventKey)) {
    return NextResponse.json({ error: 'Valid account lifecycle event key is required' }, { status: 400 })
  }

  const eventKey = body.eventKey
  const sessionSupabase = await createClient()
  const { data: authData, error: authError } = await sessionSupabase.auth.getUser()
  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceSupabase = getServiceClient()
  if (!serviceSupabase) {
    return NextResponse.json({ error: 'Email profile lookup is not configured' }, { status: 503 })
  }

  if (eventKey === 'admin.inspector_application_submitted') {
    const userId = authData.user.id
    const [{ data: profile }, { data: inspectorRow }] = await Promise.all([
      serviceSupabase
        .from('profiles')
        .select('id, role, email, full_name, name, first_name, last_name, firm_name, company_name, business_name, onboarding_status')
        .eq('id', userId)
        .maybeSingle(),
      serviceSupabase
        .from('inspector_onboarding_status')
        .select('user_id, status, license_number')
        .eq('user_id', userId)
        .maybeSingle(),
    ])

    const profileRow = (profile as ProfileRow | null) ?? null
    const inspector = (inspectorRow as InspectorOnboardingRow | null) ?? null
    if (!hasRole(profileRow, 'inspector') || !hasStatus(profileRow, ['submitted', 'under_review']) || !hasStatus(inspector, ['submitted', 'under_review'])) {
      return forbidden('Inspector submission email requires the authenticated inspector to have a submitted onboarding record.')
    }

    const email = readStr(profileRow, 'email') ?? authData.user.email ?? undefined
    const result = await sendVeroEmail({
      eventKey,
      to: ADMIN_EMAIL,
      recipientName: 'Vero Permit admin',
      inspectorName: nameFromProfile(profileRow, email),
      ctaUrl: `${APP_URL}/admin/inspectors`,
      details: [
        `Applicant: ${nameFromProfile(profileRow, email)}`,
        `Email: ${email ?? 'Not provided'}`,
        `Firm: ${firmFromProfile(profileRow)}`,
      ],
    })
    logEmailResult(eventKey, result)
    return NextResponse.json({ ok: true, email: result })
  }

  if (eventKey === 'admin.builder_profile_submitted') {
    const userId = authData.user.id
    const [{ data: profile }, { data: builderRow }] = await Promise.all([
      serviceSupabase
        .from('profiles')
        .select('id, role, email, full_name, name, first_name, last_name, firm_name, company_name, business_name, onboarding_status')
        .eq('id', userId)
        .maybeSingle(),
      serviceSupabase
        .from('builder_onboarding_status')
        .select('user_id, status, contact_email, contact_name, company_name, business_number')
        .eq('user_id', userId)
        .maybeSingle(),
    ])

    const profileRow = (profile as ProfileRow | null) ?? null
    const builder = (builderRow as BuilderOnboardingRow | null) ?? null
    if (!hasRole(profileRow, 'builder') || !hasStatus(profileRow, ['submitted', 'under_review']) || !hasStatus(builder, ['submitted', 'under_review'])) {
      return forbidden('Builder submission email requires the authenticated builder to have a submitted onboarding record.')
    }

    const email = readStr(builder, 'contact_email') ?? readStr(profileRow, 'email') ?? authData.user.email ?? undefined
    const builderName = readStr(builder, 'contact_name') ?? nameFromProfile(profileRow, email)
    const firm = firmFromProfile(builder ?? profileRow)
    const result = await sendVeroEmail({
      eventKey,
      to: ADMIN_EMAIL,
      recipientName: 'Vero Permit admin',
      builderName,
      ctaUrl: `${APP_URL}/admin/builders`,
      details: [
        `Builder: ${builderName}`,
        `Email: ${email ?? 'Not provided'}`,
        `Firm: ${firm}`,
        `Business number: ${readStr(builder, 'business_number') ?? 'Not provided'}`,
      ],
    })
    logEmailResult(eventKey, result)
    return NextResponse.json({ ok: true, email: result })
  }

  const isAdmin = await getAdminAllowed(sessionSupabase, authData.user.id)
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  if (!userId) {
    return NextResponse.json({ error: 'Target user id is required' }, { status: 400 })
  }

  if (eventKey === 'inspector.approved' || eventKey === 'inspector.needs_info') {
    const [{ data: profile }, { data: inspectorRow }] = await Promise.all([
      serviceSupabase
        .from('profiles')
        .select('id, role, email, full_name, name, first_name, last_name, firm_name, company_name, business_name, onboarding_status, verified')
        .eq('id', userId)
        .maybeSingle(),
      serviceSupabase
        .from('inspector_onboarding_status')
        .select('user_id, status, reviewer_note, license_number')
        .eq('user_id', userId)
        .maybeSingle(),
    ])

    const profileRow = (profile as ProfileRow | null) ?? null
    const inspector = (inspectorRow as InspectorOnboardingRow | null) ?? null
    const expectedStatus = eventKey === 'inspector.approved' ? 'approved' : 'needs_info'
    if (!hasRole(profileRow, 'inspector') || !hasStatus(profileRow, [expectedStatus])) {
      return forbidden('Inspector email requires the target inspector profile to match the requested lifecycle event.')
    }

    const email = readStr(profileRow, 'email')

    if (!email) {
      console.warn(`[account-lifecycle-email] ${eventKey} skipped: inspector email missing for ${userId}`)
      return NextResponse.json({ ok: true, email: { ok: false, error: 'Inspector email missing' } })
    }

    const result = await sendVeroEmail({
      eventKey,
      to: email,
      recipientName: nameFromProfile(profileRow, email),
      inspectorName: nameFromProfile(profileRow, email),
      reviewerNote: eventKey === 'inspector.needs_info' ? requestedInfoFrom(body, inspector) : undefined,
      ctaUrl: eventKey === 'inspector.approved'
        ? `${APP_URL}/inspector`
        : `${APP_URL}/inspector/profile`,
      details: [
        `Firm: ${firmFromProfile(profileRow)}`,
        `Licence: ${readStr(inspector, 'license_number') ?? 'Not provided'}`,
      ],
    })
    logEmailResult(eventKey, result)
    return NextResponse.json({ ok: true, email: result })
  }

  const [{ data: profile }, { data: builderRow }] = await Promise.all([
    serviceSupabase
      .from('profiles')
      .select('id, role, email, full_name, name, first_name, last_name, firm_name, company_name, business_name, onboarding_status')
      .eq('id', userId)
      .maybeSingle(),
    serviceSupabase
      .from('builder_onboarding_status')
      .select('user_id, status, contact_email, contact_name, company_name, business_number, reviewer_note')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const profileRow = (profile as ProfileRow | null) ?? null
  const builder = (builderRow as BuilderOnboardingRow | null) ?? null
  const expectedStatus = eventKey === 'builder.approved' ? 'approved' : 'needs_info'
  if (!hasRole(profileRow, 'builder') || !hasStatus(profileRow, [expectedStatus]) || !hasStatus(builder, [expectedStatus])) {
    return forbidden('Builder email requires the target builder profile to match the requested lifecycle event.')
  }

  const email = readStr(builder, 'contact_email') ?? readStr(profileRow, 'email')

  if (!email) {
    console.warn(`[account-lifecycle-email] ${eventKey} skipped: builder email missing for ${userId}`)
    return NextResponse.json({ ok: true, email: { ok: false, error: 'Builder email missing' } })
  }

  const builderName = readStr(builder, 'contact_name') ?? nameFromProfile(profileRow, email)
  const result = await sendVeroEmail({
    eventKey,
    to: email,
    recipientName: builderName,
    builderName,
    reviewerNote: eventKey === 'builder.needs_info' ? requestedInfoFrom(body, builder) : undefined,
    ctaUrl: eventKey === 'builder.approved'
      ? `${APP_URL}/builder`
      : `${APP_URL}/builder/onboarding`,
    details: [
      `Firm: ${firmFromProfile(builder ?? profileRow)}`,
      `Business number: ${readStr(builder, 'business_number') ?? 'Not provided'}`,
    ],
  })
  logEmailResult(eventKey, result)
  return NextResponse.json({ ok: true, email: result })
}
