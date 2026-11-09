import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { requireAdminApi } from '@/lib/adminApiGuard'
import { confirmJobPayment } from '@/lib/payments/confirmJobPayment'

export const runtime = 'nodejs'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi()
  if (!auth.authorized) return auth.response

  let body: { jobId?: unknown }
  try {
    body = await req.json() as { jobId?: unknown }
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const jobId = getString(body.jobId)
  if (!jobId) {
    return NextResponse.json({ ok: false, error: 'jobId is required.' }, { status: 400 })
  }

  const serviceClient = getServiceClient()
  if (!serviceClient) {
    console.error('[admin/jobs/confirm-payment] service role client unavailable')
    return NextResponse.json({ ok: false, error: 'Service client unavailable.' }, { status: 503 })
  }

  const result = await confirmJobPayment(serviceClient, {
    jobId,
    actorId: auth.userId,
    actorRole: 'admin',
    reason: 'Admin manually confirmed payment received.',
    paymentConfirmationSource: 'admin_manual',
    statusEventActorId: auth.userId,
  })

  switch (result.code) {
    case 'released':
    case 'authorized_still_blocked':
      return NextResponse.json({
        ok: true,
        jobId,
        live: result.live,
        newStatus: result.newStatus,
        remainingBlockers: result.live ? [] : result.remainingBlockers,
      })
    case 'job_not_found':
      return NextResponse.json({ ok: false, error: 'Job not found.' }, { status: 404 })
    case 'not_pending':
      return NextResponse.json({ ok: false, error: 'Job is not in pending_validation state.' }, { status: 409 })
    case 'no_payment_blocker':
      return NextResponse.json({ ok: false, error: 'This job does not have a pending payment blocker.' }, { status: 409 })
    case 'fetch_error':
      return NextResponse.json({ ok: false, error: 'Could not fetch job record.' }, { status: 500 })
    case 'write_error':
    default:
      return NextResponse.json({ ok: false, error: 'Payment confirmation failed to persist.' }, { status: 500 })
  }
}
