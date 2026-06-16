import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { sendVeroEmail } from '@/lib/email/sendVeroEmail'
import { formatCurrency } from '@/lib/utils'

export const runtime = 'nodejs'

// Safer MVP sender: use the known-working Vero notifications sender so delivery
// is not blocked if payments@veropermit.com is not yet accepted as a Resend
// sender in this environment. Reply-To and the in-body instructions still point
// the builder at payments@veropermit.com.
const VERO_PAYMENTS_SENDER = 'Vero Permit <notifications@veropermit.com>'
const VERO_PAYMENTS_REPLY_TO = 'payments@veropermit.com'

// Service-role client: reads the authoritative job record (amount, address,
// stage) server-side. Nothing here changes status or escrow_authorized — this
// route never releases a job.
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '') || 'http://localhost:3000'
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

// POST /api/builder/payments/interac-instructions
// Best-effort: emails the authenticated builder the Interac e-Transfer payment
// instructions for a pending job. The job must already exist and still be
// awaiting payment. This route does NOT change job state and does NOT release
// the job — Interac stays manual/admin-confirmed.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 })
  }

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

  const service = getServiceClient()
  if (!service) {
    console.error('[builder/payments/interac-instructions] service role client unavailable')
    return NextResponse.json({ ok: false, error: 'Service client unavailable.' }, { status: 503 })
  }

  const { data: jobData, error: jobError } = await service
    .from('job_opportunities')
    .select('id, builder_id, status, escrow_authorized, validation_blockers, escrow_estimate_total, address, city, stage, stage_name, project_name')
    .eq('id', jobId)
    .maybeSingle()

  if (jobError) {
    console.error('[builder/payments/interac-instructions] job fetch failed', { jobId, error: jobError.message })
    return NextResponse.json({ ok: false, error: 'Could not load job.' }, { status: 500 })
  }
  if (!jobData) {
    return NextResponse.json({ ok: false, error: 'Job not found.' }, { status: 404 })
  }

  const job = jobData as {
    id: string
    builder_id?: string | null
    status?: string | null
    escrow_authorized?: boolean | null
    validation_blockers?: Array<{ code?: string }> | null
    escrow_estimate_total?: number | null
    address?: string | null
    city?: string | null
    stage?: number | null
    stage_name?: string | null
    project_name?: string | null
  }

  // Strict ownership: the job must belong to the authenticated builder.
  if (job.builder_id !== user.id) {
    return NextResponse.json({ ok: false, error: 'You do not have access to this job.' }, { status: 403 })
  }

  // Only email instructions while the job is genuinely awaiting payment.
  const blockers = Array.isArray(job.validation_blockers) ? job.validation_blockers : []
  const hasPaymentBlocker = blockers.some(b => b?.code === 'escrow_not_authorized')
  if (job.status !== 'pending_validation' || job.escrow_authorized === true || !hasPaymentBlocker) {
    return NextResponse.json(
      { ok: false, error: 'This job is not awaiting payment verification.' },
      { status: 409 },
    )
  }

  const recipient = getString(user.email)
  if (!recipient) {
    return NextResponse.json({ ok: false, error: 'No email on file for your account.' }, { status: 422 })
  }

  // Amount and address are read server-side, never from the browser.
  const amount = typeof job.escrow_estimate_total === 'number' ? job.escrow_estimate_total : null
  const addressLine = [getString(job.address), getString(job.city)].filter(Boolean).join(', ')
  const stageLabel = job.stage_name
    ? `Stage ${job.stage ?? ''} — ${getString(job.stage_name)}`.replace('Stage  —', 'Stage —').trim()
    : (typeof job.stage === 'number' ? `Stage ${job.stage}` : 'Stage not specified')

  const details = [
    `Request reference: ${job.id}`,
    `Project address: ${addressLine || 'Not specified'}`,
    stageLabel,
    `Amount due: ${amount !== null ? formatCurrency(amount) : 'To be confirmed'}`,
  ]

  const result = await sendVeroEmail({
    eventKey: 'inspection.payment_required_interac',
    to: recipient,
    from: VERO_PAYMENTS_SENDER,
    replyTo: VERO_PAYMENTS_REPLY_TO,
    paymentReference: job.id,
    projectName: getString(job.project_name) || undefined,
    details,
    ctaUrl: `${getAppUrl()}/builder`,
  })

  if (!result.ok) {
    // Best-effort: surface a soft signal, but the job already exists and is
    // unaffected. The client ignores this and the builder still sees on-screen
    // instructions. Log both the code and the provider error message (never a
    // secret/API key) so the actual Resend failure reason is diagnosable.
    console.warn('[builder/payments/interac-instructions] email send failed', {
      jobId,
      code: result.code,
      error: result.error,
    })
    // Non-production only: include a safe diagnostic code so the failure is
    // actionable in dev/preview. Production stays minimal.
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ ok: true, emailed: false, emailCode: result.code })
    }
    return NextResponse.json({ ok: true, emailed: false })
  }

  return NextResponse.json({ ok: true, emailed: true })
}
