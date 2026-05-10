import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type LiveRequestBody = {
  jobId?: unknown
  availableSlots?: unknown
}

type JobTimeSlot = {
  date: string
  startTime: string
  endTime: string
}

type LiveJobRow = {
  id: string
  builder_id: string
  status?: string | null
  validation_status?: string | null
  available_slots?: unknown
}

const ACTIVE_ASSIGNMENT_STATUSES = ['provisional', 'confirmed', 'completed']

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

function fail(phase: string, error: string, status = 422) {
  return NextResponse.json({ ok: false, phase, error }, { status })
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeSlot(value: unknown): JobTimeSlot | null {
  if (!value || typeof value !== 'object') return null
  const slot = value as Record<string, unknown>
  const date = getString(slot.date)
  const startTime = getString(slot.startTime)
  const endTime = getString(slot.endTime)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  if (!/^\d{2}:\d{2}$/.test(startTime)) return null
  if (!/^\d{2}:\d{2}$/.test(endTime)) return null
  if (endTime <= startTime) return null

  return { date, startTime, endTime }
}

function normalizeSlots(value: unknown): JobTimeSlot[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 3) return null
  const slots = value.map(normalizeSlot)
  if (slots.some(slot => slot === null)) return null
  return slots as JobTimeSlot[]
}

async function getAuthorizedLiveJob(body: LiveRequestBody) {
  const jobId = getString(body.jobId)
  if (!jobId) {
    return {
      response: fail('invalid_request', 'jobId is required.', 400),
      serviceSupabase: null,
      userId: null,
      job: null,
    }
  }

  const sessionSupabase = await createClient()
  const { data: authData, error: authError } = await sessionSupabase.auth.getUser()
  const user = authData.user

  if (authError || !user) {
    console.error('[jobs/live-request] auth failed', authError)
    return {
      response: fail('auth_failed', 'Authentication required.', 401),
      serviceSupabase: null,
      userId: null,
      job: null,
    }
  }

  const serviceSupabase = getServiceClient()
  if (!serviceSupabase) {
    console.error('[jobs/live-request] service role client unavailable')
    return {
      response: fail('server_not_configured', 'Live request management is not configured.', 503),
      serviceSupabase: null,
      userId: user.id,
      job: null,
    }
  }

  const { data: jobData, error: jobError } = await serviceSupabase
    .from('job_opportunities')
    .select('id, builder_id, status, validation_status, available_slots')
    .eq('id', jobId)
    .maybeSingle()

  if (jobError) {
    console.error('[jobs/live-request] job lookup failed', { jobId, builderId: user.id, error: jobError.message })
    return {
      response: fail('job_lookup_failed', 'Could not load this live request.', 500),
      serviceSupabase,
      userId: user.id,
      job: null,
    }
  }

  if (!jobData) {
    return {
      response: fail('job_not_found', 'Live request not found.', 404),
      serviceSupabase,
      userId: user.id,
      job: null,
    }
  }

  const job = jobData as LiveJobRow
  if (job.builder_id !== user.id) {
    console.error('[jobs/live-request] ownership mismatch', {
      jobId,
      authenticatedUserId: user.id,
      jobBuilderId: job.builder_id,
    })
    return {
      response: fail('ownership_failed', 'This request does not belong to the signed-in builder.', 403),
      serviceSupabase,
      userId: user.id,
      job: null,
    }
  }

  if (job.status !== 'live' || job.validation_status !== 'validated') {
    return {
      response: fail('request_not_manageable', 'This request can no longer be managed because it is not live and awaiting inspector claim.', 409),
      serviceSupabase,
      userId: user.id,
      job: null,
    }
  }

  const { data: assignmentData, error: assignmentError } = await serviceSupabase
    .from('job_assignments')
    .select('id, status')
    .eq('job_id', jobId)
    .in('status', ACTIVE_ASSIGNMENT_STATUSES)

  if (assignmentError) {
    console.error('[jobs/live-request] assignment lookup failed', { jobId, builderId: user.id, error: assignmentError.message })
    return {
      response: fail('assignment_lookup_failed', 'Could not confirm whether this request has been claimed.', 500),
      serviceSupabase,
      userId: user.id,
      job: null,
    }
  }

  if ((assignmentData ?? []).length > 0) {
    return {
      response: fail('request_already_claimed', 'This request has already been claimed and can no longer be edited or cancelled here.', 409),
      serviceSupabase,
      userId: user.id,
      job: null,
    }
  }

  return {
    response: null,
    serviceSupabase,
    userId: user.id,
    job,
  }
}

export async function PATCH(req: NextRequest) {
  let body: LiveRequestBody

  try {
    body = await req.json() as LiveRequestBody
  } catch {
    return fail('invalid_request', 'Invalid request body.', 400)
  }

  const slots = normalizeSlots(body.availableSlots)
  if (!slots) {
    return fail('invalid_slots', 'Add one to three valid availability windows before saving.', 400)
  }

  const authorized = await getAuthorizedLiveJob(body)
  if (authorized.response) return authorized.response

  const { serviceSupabase, userId, job } = authorized
  if (!serviceSupabase || !userId || !job) return fail('server_error', 'Could not manage this live request.', 500)

  const now = new Date().toISOString()
  const { error: updateError } = await serviceSupabase
    .from('job_opportunities')
    .update({
      available_slots: slots,
      updated_at: now,
    })
    .eq('id', job.id)

  if (updateError) {
    console.error('[jobs/live-request] slot update failed', { jobId: job.id, builderId: userId, error: updateError.message })
    return fail('slot_update_failed', 'Could not update this request. Please try again.', 500)
  }

  const { error: auditError } = await serviceSupabase.from('governance_audit_events').insert({
    entity_type: 'job',
    entity_id: job.id,
    action: 'job.live_request_windows_updated',
    actor_id: userId,
    actor_role: 'builder',
    rule_ids: ['R-010'],
    blocker_type: 'technical',
    reason: 'Builder updated availability windows for a live unclaimed request.',
    before_state: {
      availableSlots: job.available_slots ?? [],
    },
    after_state: {
      availableSlots: slots,
    },
    metadata: {},
    created_at: now,
  })

  if (auditError) {
    console.error('[jobs/live-request] audit insert failed', { jobId: job.id, builderId: userId, error: auditError.message })
  }

  return NextResponse.json({ ok: true, availableSlots: slots })
}

export async function DELETE(req: NextRequest) {
  let body: LiveRequestBody

  try {
    body = await req.json() as LiveRequestBody
  } catch {
    return fail('invalid_request', 'Invalid request body.', 400)
  }

  const authorized = await getAuthorizedLiveJob(body)
  if (authorized.response) return authorized.response

  const { serviceSupabase, userId, job } = authorized
  if (!serviceSupabase || !userId || !job) return fail('server_error', 'Could not manage this live request.', 500)

  const now = new Date().toISOString()
  const { error: updateError } = await serviceSupabase
    .from('job_opportunities')
    .update({
      status: 'cancelled',
      cancelled_at: now,
      updated_at: now,
    })
    .eq('id', job.id)

  if (updateError) {
    console.error('[jobs/live-request] cancel failed', { jobId: job.id, builderId: userId, error: updateError.message })
    return fail('cancel_failed', 'Could not cancel this request. Please try again.', 500)
  }

  const { error: eventError } = await serviceSupabase.from('job_status_events').insert({
    job_id: job.id,
    actor_id: userId,
    actor_role: 'builder',
    from_status: 'live',
    to_status: 'cancelled',
    reason: 'Builder cancelled live unclaimed request.',
    created_at: now,
  })

  if (eventError) {
    console.error('[jobs/live-request] status event insert failed', { jobId: job.id, builderId: userId, error: eventError.message })
  }

  return NextResponse.json({ ok: true })
}
