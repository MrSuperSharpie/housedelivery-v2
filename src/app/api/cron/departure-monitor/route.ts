import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export function isAuthorizedDepartureCronRequest(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false

  const authorization = req.headers.get('authorization')
  const cronHeader = req.headers.get('x-cron-secret')
  const requestUrl = new URL(req.url)
  const querySecret = requestUrl.searchParams.get('secret')

  return authorization === `Bearer ${cronSecret}`
    || cronHeader === cronSecret
    || querySecret === cronSecret
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedDepartureCronRequest(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized cron request.' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { ok: false, error: 'Departure monitor cron is missing Supabase service configuration.' },
      { status: 500 },
    )
  }

  const asOf = new Date().toISOString()
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data, error } = await supabase.rpc('process_departure_monitoring', {
    p_as_of: asOf,
    p_limit: 50,
  })

  if (error) {
    console.error('[cron/departure-monitor] RPC error', { asOf, error: error.message })
    return NextResponse.json({ ok: false, error: error.message, asOf }, { status: 500 })
  }

  return NextResponse.json({
    ...(data as Record<string, unknown>),
    asOf,
  })
}
