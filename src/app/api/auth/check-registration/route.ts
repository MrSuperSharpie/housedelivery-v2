import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function normalizePhone(value: unknown) {
  return typeof value === 'string' ? value.replace(/\D/g, '') : ''
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) return null

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(req: NextRequest) {
  let body: { email?: unknown; phone?: unknown }

  try {
    body = await req.json() as { email?: unknown; phone?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = normalizeEmail(body.email)
  const phone = normalizePhone(body.phone)

  if (!email && !phone) {
    return NextResponse.json({ error: 'Email or phone is required' }, { status: 400 })
  }

  const supabase = getAdminClient()
  if (!supabase) {
    return NextResponse.json(
      { error: 'Registration verification is not configured' },
      { status: 503 },
    )
  }

  if (email) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .limit(1)

    if (error) {
      console.error('[check-registration] email lookup failed:', error)
      return NextResponse.json({ error: 'Could not verify registration status' }, { status: 503 })
    }

    if ((data ?? []).length > 0) {
      return NextResponse.json({
        conflict: 'email',
        message: 'This email is already registered. Please Sign In to continue.',
      }, { status: 409 })
    }
  }

  if (phone) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .limit(1)

    if (error) {
      console.error('[check-registration] phone lookup failed:', error)
      return NextResponse.json({ error: 'Could not verify registration status' }, { status: 503 })
    }

    if ((data ?? []).length > 0) {
      return NextResponse.json({
        conflict: 'phone',
        message: 'This phone is already registered. Please Sign In to continue.',
      }, { status: 409 })
    }
  }

  return NextResponse.json({ ok: true })
}
