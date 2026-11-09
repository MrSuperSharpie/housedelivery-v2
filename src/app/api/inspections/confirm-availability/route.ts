import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { sendVeroEmail } from '@/lib/email/sendVeroEmail'

export const runtime = 'nodejs'

const APP_URL = 'https://veropermit.com'

type ConfirmAvailabilityBody = {
  assignmentId?: unknown
  // Optional — sent by the client for cross-validation only. The server derives
  // the authoritative job_id from the assignment record and rejects any mismatch.
  jobId?: unknown
}

type AssignmentRow = {
  id: string
  job_id: string
  inspector_id: string
}

type ConfirmationRow = {
  id: string
  inspector_id: string
  status: string
}

type JobRow = {
  id: string
  builder_id?: string | null
  project_name?: string | null
  address?: string | null
  stage_name?: string | null
}

type ClaimedSlot = {
  date?: string
  startTime?: string
  endTime?: string
  flexible?: boolean
}

type AssignmentSlotRow = {
  claimed_slot?: unknown
}

type BuilderOnboardingRow = { contact_email?: string | null; contact_name?: string | null }
type BuilderProfileRow = { email?: string | null; full_name?: string | null }
type InspectorProfileRow = { full_name?: string | null }

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function fail(phase: string, error: string, status = 422) {
  return NextResponse.json({ ok: false, phase, error }, { status })
}

function formatClaimedSlot(slot: ClaimedSlot | null): string | null {
  if (!slot) return null
  if (slot.flexible) return 'Flexible availability'
  if (slot.date && slot.startTime && slot.endTime) {
    return `${slot.date} · ${slot.startTime}–${slot.endTime}`
  }
  if (slot.date) return slot.date
  return null
}

export async function POST(req: NextRequest) {
  let body: ConfirmAvailabilityBody
  try {
    body = await req.json() as ConfirmAvailabilityBody
  } catch {
    return fail('invalid_request', 'Invalid request body.', 400)
  }

  const assignmentId = getString(body.assignmentId)
  const clientJobId = getString(body.jobId)

  if (!assignmentId) return fail('invalid_request', 'assignmentId is required.', 400)

  const sessionSupabase = await createClient()
  const { data: authData, error: authError } = await sessionSupabase.auth.getUser()
  const user = authData.user

  if (authError || !user) {
    console.error('[inspections/confirm-availability] auth failed', authError)
    return fail('auth_failed', 'Authentication required.', 401)
  }

  // Fetch the assignment via session client (RLS scopes to inspector's own rows).
  // This is the authoritative source for job_id — the client-supplied value is never
  // used to drive lookups.
  const { data: assignmentData, error: assignmentError } = await sessionSupabase
    .from('job_assignments')
    .select('id, job_id, inspector_id')
    .eq('id', assignmentId)
    .maybeSingle()

  if (assignmentError) {
    console.error('[inspections/confirm-availability] assignment lookup failed', {
      assignmentId,
      inspectorId: user.id,
      error: assignmentError.message,
    })
    return fail('assignment_lookup_failed', 'Could not look up this assignment. Please try again.', 500)
  }

  if (!assignmentData) {
    return fail('assignment_not_found', 'Assignment not found.', 404)
  }

  const assignment = assignmentData as AssignmentRow

  // Defense-in-depth: RLS should enforce this, but verify explicitly.
  if (assignment.inspector_id !== user.id) {
    console.error('[inspections/confirm-availability] ownership mismatch', {
      assignmentId,
      authenticatedUserId: user.id,
      assignmentInspectorId: assignment.inspector_id,
    })
    return fail('ownership_failed', 'This assignment does not belong to the signed-in inspector.', 403)
  }

  const serverJobId = assignment.job_id

  // If the client sent a jobId, verify it matches the server-derived value.
  if (clientJobId && clientJobId !== serverJobId) {
    console.warn('[inspections/confirm-availability] client jobId mismatch', {
      assignmentId,
      clientJobId,
      serverJobId,
      inspectorId: user.id,
    })
    return fail('job_mismatch', 'The supplied jobId does not match the assignment record.', 409)
  }

  const { data: confirmationRows, error: confirmationError } = await sessionSupabase
    .from('job_attendance_confirmations')
    .select('id, inspector_id, status')
    .eq('assignment_id', assignmentId)
    .eq('status', 'pending')

  if (confirmationError) {
    console.error('[inspections/confirm-availability] confirmation lookup failed', {
      assignmentId,
      inspectorId: user.id,
      error: confirmationError.message,
    })
    return fail('confirmation_lookup_failed', 'Could not look up the pending confirmation. Please try again.', 500)
  }

  const ownedRows = ((confirmationRows ?? []) as ConfirmationRow[]).filter(
    row => row.inspector_id === user.id,
  )

  if (ownedRows.length === 0) {
    return fail('no_pending_confirmation', 'No pending availability confirmation was found for this assignment.', 404)
  }

  let atLeastOneConfirmed = false
  for (const row of ownedRows) {
    const { data: rpcResult, error: rpcError } = await sessionSupabase.rpc('record_job_attendance_confirmation', {
      p_confirmation_id: row.id,
      p_method: 'manual',
      p_metadata: { source: 'inspector_dashboard_confirm_availability' },
    })

    if (rpcError) {
      console.error('[inspections/confirm-availability] RPC error', {
        assignmentId,
        confirmationId: row.id,
        inspectorId: user.id,
        error: rpcError.message,
      })
      continue
    }

    const payload = rpcResult as Record<string, unknown>
    if (payload?.ok !== true) {
      console.error('[inspections/confirm-availability] RPC returned not-ok', {
        assignmentId,
        confirmationId: row.id,
        payload,
      })
      continue
    }

    atLeastOneConfirmed = true
  }

  if (!atLeastOneConfirmed) {
    return fail('confirmation_failed', 'Could not record the availability confirmation. Please try again.', 500)
  }

  console.log('[inspections/confirm-availability] confirmation recorded', {
    assignmentId,
    jobId: serverJobId,
    inspectorId: user.id,
    rowsConfirmed: ownedRows.length,
  })

  // Soft-fail builder email notice
  let emailSent = false
  const serviceSupabase = getServiceClient()

  if (!serviceSupabase) {
    console.warn('[inspections/confirm-availability] builder notice skipped: no service client', { assignmentId })
  } else {
    try {
      const [{ data: jobRow }, { data: assignmentSlotRow }, { data: inspectorProfileRow }] = await Promise.all([
        serviceSupabase
          .from('job_opportunities')
          .select('id, builder_id, project_name, address, stage_name')
          .eq('id', serverJobId)
          .maybeSingle(),
        serviceSupabase
          .from('job_assignments')
          .select('claimed_slot')
          .eq('id', assignmentId)
          .maybeSingle(),
        serviceSupabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle(),
      ])

      const job = jobRow as JobRow | null
      const slotRow = assignmentSlotRow as AssignmentSlotRow | null
      const iProfile = inspectorProfileRow as InspectorProfileRow | null
      const builderId = job?.builder_id

      if (!builderId) {
        console.warn('[inspections/confirm-availability] builder notice skipped: no builder_id', { jobId: serverJobId })
      } else {
        const [{ data: builderOnboarding }, { data: builderProfile }] = await Promise.all([
          serviceSupabase
            .from('builder_onboarding_status')
            .select('contact_email, contact_name')
            .eq('user_id', builderId)
            .maybeSingle(),
          serviceSupabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', builderId)
            .maybeSingle(),
        ])

        const onboarding = builderOnboarding as BuilderOnboardingRow | null
        const bProfile = builderProfile as BuilderProfileRow | null
        const builderEmail = onboarding?.contact_email?.trim() || bProfile?.email?.trim()

        if (!builderEmail) {
          console.warn('[inspections/confirm-availability] builder notice skipped: no builder email', { jobId: serverJobId, builderId })
        } else {
          const claimedSlot = slotRow?.claimed_slot as ClaimedSlot | null
          const slotLabel = formatClaimedSlot(claimedSlot)

          const details: string[] = []
          if (job?.address?.trim()) details.push(`Address: ${job.address.trim()}`)
          if (job?.stage_name?.trim()) details.push(`Inspection stage: ${job.stage_name.trim()}`)
          if (slotLabel) details.push(`Scheduled window: ${slotLabel}`)

          const result = await sendVeroEmail({
            eventKey: 'inspection.availability_confirmed_builder_notice',
            to: builderEmail,
            recipientName: onboarding?.contact_name?.trim() || bProfile?.full_name?.trim() || undefined,
            inspectorName: iProfile?.full_name?.trim() || undefined,
            projectName: job?.project_name?.trim() || undefined,
            details: details.length > 0 ? details : undefined,
            ctaUrl: `${APP_URL}/builder`,
          })

          if (result.ok) {
            emailSent = true
            console.log('[inspections/confirm-availability] builder notice sent', { jobId: serverJobId, builderId })
          } else {
            console.warn('[inspections/confirm-availability] builder notice failed', { jobId: serverJobId, builderId, error: result.error })
          }
        }
      }
    } catch (err) {
      console.warn('[inspections/confirm-availability] builder notice unexpected error', { assignmentId, error: String(err) })
    }
  }

  return NextResponse.json({ ok: true, emailSent })
}
