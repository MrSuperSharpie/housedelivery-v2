import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const CLOSE_ERROR = 'Inspection saved, but the assignment could not be closed. Please try again or contact support.'

type ScopedCloseBody = {
  assignmentId?: unknown
  jobId?: unknown
  reportId?: unknown
  stageNumber?: unknown
}

type AssignmentRow = {
  id: string
  job_id: string
  inspector_id: string
  status?: string | null
}

type JobRow = {
  id: string
  status?: string | null
}

type CompletionReportRow = {
  id: string
  assignment_id: string
  job_id: string
  inspector_id: string
  status?: string | null
  submitted_at?: string | null
  seal_payload?: unknown
  current_stage?: number | null
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

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getStageNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isInteger(parsed)) return parsed
  }
  return null
}

function hasStageSignOff(payload: unknown, stageNumber: number | null): boolean {
  if (!stageNumber) return true
  if (!payload || typeof payload !== 'object') return false
  const signOffs = (payload as Record<string, unknown>).stageSignOffs
  if (!signOffs || typeof signOffs !== 'object') return false
  return Object.prototype.hasOwnProperty.call(signOffs, String(stageNumber))
}

function fail(phase: string, error: string, status = 422) {
  return NextResponse.json({ ok: false, phase, error }, { status })
}

export async function POST(req: NextRequest) {
  let body: ScopedCloseBody

  try {
    body = await req.json() as ScopedCloseBody
  } catch {
    return fail('invalid_request', 'Invalid request body.', 400)
  }

  const assignmentId = getString(body.assignmentId)
  const jobId = getString(body.jobId)
  const reportId = getString(body.reportId)
  const stageNumber = getStageNumber(body.stageNumber)

  if (!assignmentId) return fail('invalid_request', 'assignmentId is required.', 400)
  if (!jobId) return fail('invalid_request', 'jobId is required.', 400)

  const sessionSupabase = await createClient()
  const { data: authData, error: authError } = await sessionSupabase.auth.getUser()
  const user = authData.user

  if (authError || !user) {
    console.error('[inspections/complete-scoped-assignment] auth failed', authError)
    return fail('auth_failed', 'Authentication required.', 401)
  }

  const serviceSupabase = getServiceClient()
  if (!serviceSupabase) {
    console.error('[inspections/complete-scoped-assignment] service role client unavailable')
    return fail('server_not_configured', CLOSE_ERROR, 503)
  }

  const { data: assignmentData, error: assignmentError } = await serviceSupabase
    .from('job_assignments')
    .select('id, job_id, inspector_id, status')
    .eq('id', assignmentId)
    .maybeSingle()

  if (assignmentError) {
    console.error('[inspections/complete-scoped-assignment] assignment lookup failed', {
      assignmentId,
      inspectorId: user.id,
      error: assignmentError.message,
    })
    return fail('assignment_lookup_failed', CLOSE_ERROR, 500)
  }

  if (!assignmentData) return fail('assignment_not_found', 'Assignment not found.', 404)

  const assignment = assignmentData as AssignmentRow
  if (assignment.inspector_id !== user.id) {
    console.error('[inspections/complete-scoped-assignment] ownership mismatch', {
      assignmentId,
      authenticatedUserId: user.id,
      assignmentInspectorId: assignment.inspector_id,
    })
    return fail('ownership_failed', 'This assignment does not belong to the signed-in inspector.', 403)
  }

  if (assignment.job_id !== jobId) {
    console.error('[inspections/complete-scoped-assignment] job mismatch', {
      assignmentId,
      suppliedJobId: jobId,
      assignmentJobId: assignment.job_id,
    })
    return fail('job_mismatch', 'Assignment and job do not match.', 409)
  }

  if (assignment.status === 'cancelled' || assignment.status === 'invalidated') {
    return fail('assignment_not_closeable', 'This assignment can no longer be closed by the inspector.', 409)
  }

  const { data: jobData, error: jobError } = await serviceSupabase
    .from('job_opportunities')
    .select('id, status')
    .eq('id', jobId)
    .maybeSingle()

  if (jobError) {
    console.error('[inspections/complete-scoped-assignment] job lookup failed', {
      jobId,
      assignmentId,
      inspectorId: user.id,
      error: jobError.message,
    })
    return fail('job_lookup_failed', CLOSE_ERROR, 500)
  }

  if (!jobData) return fail('job_not_found', 'Job not found for this assignment.', 404)

  // Ownership is already verified above (assignment.inspector_id === user.id).
  // Do not filter by inspector_id here — older reports may carry the app-level
  // user id rather than the Supabase auth uid.
  let reportQuery = serviceSupabase
    .from('inspector_completion_reports')
    .select('id, assignment_id, job_id, inspector_id, status, submitted_at, seal_payload, current_stage')
    .eq('assignment_id', assignmentId)
    .eq('job_id', jobId)

  if (reportId) reportQuery = reportQuery.eq('id', reportId)

  const { data: reportData, error: reportError } = await reportQuery.maybeSingle()

  if (reportError) {
    console.error('[inspections/complete-scoped-assignment] report lookup failed', {
      assignmentId,
      jobId,
      reportId,
      inspectorId: user.id,
      error: reportError.message,
    })
    return fail('report_lookup_failed', CLOSE_ERROR, 500)
  }

  if (!reportData) return fail('report_missing', 'Submitted inspection report was not found.', 409)

  const report = reportData as CompletionReportRow

  if (report.inspector_id !== user.id) {
    console.warn('[inspections/complete-scoped-assignment] report inspector_id differs from auth uid (legacy record)', {
      assignmentId,
      authenticatedUserId: user.id,
      reportInspectorId: report.inspector_id,
    })
  }
  const reportSubmitted = report.status === 'submitted' || report.status === 'sealed' || Boolean(report.submitted_at)
  if (!reportSubmitted) {
    console.error('[inspections/complete-scoped-assignment] report not submitted', {
      assignmentId,
      jobId,
      reportId: report.id,
      reportStatus: report.status,
    })
    return fail('report_not_submitted', 'Inspection report must be saved before the assignment can be closed.', 409)
  }

  if (!hasStageSignOff(report.seal_payload, stageNumber)) {
    console.error('[inspections/complete-scoped-assignment] stage sign-off missing', {
      assignmentId,
      jobId,
      reportId: report.id,
      stageNumber,
    })
    return fail('stage_signoff_missing', 'Stage sign-off was not found on the saved report.', 409)
  }

  const now = new Date().toISOString()
  const previousAssignmentStatus = assignment.status ?? null
  const previousJobStatus = (jobData as JobRow).status ?? null

  const { data: updatedAssignment, error: assignmentUpdateError } = await serviceSupabase
    .from('job_assignments')
    .update({
      status: 'completed',
      updated_at: now,
    })
    .eq('id', assignmentId)
    .select('id, status')
    .maybeSingle()

  if (assignmentUpdateError || !updatedAssignment) {
    console.error('[inspections/complete-scoped-assignment] assignment close failed', {
      assignmentId,
      jobId,
      inspectorId: user.id,
      error: assignmentUpdateError?.message,
    })
    return fail('assignment_close_failed', CLOSE_ERROR, 500)
  }

  const { data: updatedJob, error: jobUpdateError } = await serviceSupabase
    .from('job_opportunities')
    .update({
      status: 'completed',
      updated_at: now,
    })
    .eq('id', jobId)
    .select('id, status')
    .maybeSingle()

  if (jobUpdateError || !updatedJob) {
    console.error('[inspections/complete-scoped-assignment] job close failed', {
      assignmentId,
      jobId,
      inspectorId: user.id,
      error: jobUpdateError?.message,
    })
    return fail('job_close_failed', CLOSE_ERROR, 500)
  }

  const { error: eventError } = await serviceSupabase.from('job_status_events').insert([
    {
      job_id: jobId,
      actor_id: user.id,
      actor_role: 'inspector',
      from_status: previousAssignmentStatus,
      to_status: 'assignment_completed',
      reason: 'Scoped inspection assignment completed.',
      created_at: now,
    },
    {
      job_id: jobId,
      actor_id: user.id,
      actor_role: 'inspector',
      from_status: previousJobStatus,
      to_status: 'completed',
      reason: 'Scoped inspection job completed.',
      created_at: now,
    },
  ])

  if (eventError) {
    console.error('[inspections/complete-scoped-assignment] status event insert failed', {
      assignmentId,
      jobId,
      inspectorId: user.id,
      error: eventError.message,
    })
  }

  const { error: auditError } = await serviceSupabase.from('governance_audit_events').insert({
    entity_type: 'assignment',
    entity_id: assignmentId,
    action: 'assignment.completed',
    actor_id: user.id,
    actor_role: 'inspector',
    rule_ids: ['R-021', 'R-022'],
    blocker_type: 'technical',
    reason: 'Scoped inspection assignment completed by assigned inspector.',
    before_state: {
      status: previousAssignmentStatus,
    },
    after_state: {
      status: 'completed',
    },
    metadata: {
      jobId,
      reportId: report.id,
      stageNumber,
    },
    created_at: now,
  })

  if (auditError) {
    console.error('[inspections/complete-scoped-assignment] governance audit insert failed', {
      assignmentId,
      jobId,
      inspectorId: user.id,
      error: auditError.message,
    })
  }

  return NextResponse.json({
    ok: true,
    assignmentId,
    jobId,
    reportId: report.id,
    assignmentStatus: (updatedAssignment as { status?: string }).status ?? 'completed',
    jobStatus: (updatedJob as { status?: string }).status ?? 'completed',
  })
}
