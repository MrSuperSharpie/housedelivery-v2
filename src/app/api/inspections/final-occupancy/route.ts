import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isHoldOpenStatus } from '@/lib/holds/workflow'

export const runtime = 'nodejs'

type FinalOccupancyBody = {
  assignmentId?: unknown
  jobId?: unknown
  reportId?: unknown
  stageNumber?: unknown
  sealedAt?: unknown
  sealReference?: unknown
  sealPayload?: unknown
  completedRecord?: unknown
  items?: unknown
}

type AssignmentRow = {
  id: string
  job_id: string
  inspector_id: string
  status?: string | null
}

type JobRow = {
  id: string
  builder_id?: string | null
  builder_name?: string | null
  project_id?: string | null
  project_name?: string | null
  address?: string | null
  city?: string | null
  stage?: number | null
  status?: string | null
}

type ReportRow = {
  id: string
  assignment_id: string
  job_id: string
  status?: string | null
  submitted_at?: string | null
  seal_payload?: unknown
}

type WorkspaceItemPayload = {
  id?: unknown
  stage_number?: unknown
  stage_name?: unknown
  item_code?: unknown
  item_label?: unknown
  sort_order?: unknown
  is_required?: unknown
  permit_type?: unknown
  responsible_party?: unknown
  document_upload_required?: unknown
  inspection_status?: unknown
  ahj_notes?: unknown
  dependencies?: unknown
  response_note?: unknown
  metadata?: unknown
  documents?: unknown
}

type CompletedRecordPayload = Record<string, unknown>

const BUILDER_STAGE_TO_COMPLETION_STAGE: Record<number, number> = {
  1: 1,
  2: 5,
  3: 6,
  4: 12,
  5: 13,
  6: 14,
  7: 15,
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

function fail(phase: string, error: string, status = 422) {
  return NextResponse.json({ ok: false, phase, error }, { status })
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

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function getItems(value: unknown): WorkspaceItemPayload[] {
  return Array.isArray(value)
    ? value.filter((item): item is WorkspaceItemPayload => !!item && typeof item === 'object' && !Array.isArray(item))
    : []
}

function normalizeProjectIdentity(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function rowMatchesScopedProject(row: JobRow, currentJob: JobRow): boolean {
  const currentProjectId = currentJob.project_id?.trim() ?? ''
  const rowProjectId = row.project_id?.trim() ?? ''

  if (currentProjectId && (rowProjectId === currentProjectId || row.id === currentProjectId)) return true
  if (rowProjectId && rowProjectId === currentJob.id) return true

  return Boolean(
    normalizeProjectIdentity(row.project_name) === normalizeProjectIdentity(currentJob.project_name)
    && normalizeProjectIdentity(row.address) === normalizeProjectIdentity(currentJob.address)
    && normalizeProjectIdentity(row.city) === normalizeProjectIdentity(currentJob.city)
  )
}

function hasStageSignOff(payload: unknown, stageNumber: number): boolean {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false
  const stageSignOffs = (payload as Record<string, unknown>).stageSignOffs
  if (!stageSignOffs || typeof stageSignOffs !== 'object' || Array.isArray(stageSignOffs)) return false
  return Object.prototype.hasOwnProperty.call(stageSignOffs, String(stageNumber))
}

function itemIsRequired(item: WorkspaceItemPayload): boolean {
  return item.is_required !== false
}

function itemIsResolved(item: WorkspaceItemPayload): boolean {
  return item.inspection_status === 'Passed' || item.inspection_status === 'N/A'
}

function validateS15Items(items: WorkspaceItemPayload[]): string | null {
  const s15Items = items.filter(item => item.stage_number === 15)
  if (s15Items.length === 0) return 'S15 checklist items were not provided.'

  const unresolved = s15Items.filter(item => itemIsRequired(item) && !itemIsResolved(item))
  if (unresolved.length > 0) {
    return `S15 required containers are not complete: ${unresolved.map(item => getString(item.item_code) || 'unknown').join(', ')}.`
  }

  const failed = s15Items.filter(item => item.inspection_status === 'Failed')
  if (failed.length > 0) {
    return `S15 failed containers must be resolved before final occupancy: ${failed.map(item => getString(item.item_code) || 'unknown').join(', ')}.`
  }

  const documentGaps = s15Items.filter(item => {
    if (item.document_upload_required !== true) return false
    return !Array.isArray(item.documents) || item.documents.length === 0
  })
  if (documentGaps.length > 0) {
    return `S15 required evidence is missing: ${documentGaps.map(item => getString(item.item_code) || 'unknown').join(', ')}.`
  }

  return null
}

function completedRecordToRow(record: CompletedRecordPayload): Record<string, unknown> {
  return {
    id: record.id,
    project_id: record.projectId ?? null,
    project_name: record.projectName,
    address: record.address,
    city: record.city ?? null,
    stage: record.stage,
    stage_name: record.stageName,
    result: record.result,
    evidence_items: record.evidenceItems ?? [],
    completed_at: record.completedAt,
    builder_id: record.builderId ?? null,
    builder_name: record.builderName ?? null,
    inspector_id: record.inspectorId ?? null,
    inspector_name: record.inspectorName,
    inspector_license: record.inspectorLicense,
    pass_items: record.passItems ?? 0,
    fail_items: record.failItems ?? 0,
    cert_ref: record.certRef,
    job_ref: record.jobRef ?? null,
    permit_number: record.permitNumber ?? null,
    discipline: record.discipline ?? null,
    region: record.region ?? null,
    jurisdiction_id: record.jurisdictionId ?? null,
    jurisdiction_name: record.jurisdictionName ?? null,
    authority_name: record.authorityName ?? null,
    sealed: record.sealed ?? true,
    hold_id: record.holdId ?? null,
    hold_history: record.holdHistory ?? [],
  }
}

function itemToUpsertRow(item: WorkspaceItemPayload, reportId: string, assignmentId: string) {
  return {
    id: getString(item.id) || crypto.randomUUID(),
    report_id: reportId,
    assignment_id: assignmentId,
    stage_number: typeof item.stage_number === 'number' ? item.stage_number : 15,
    stage_name: getString(item.stage_name) || 'Final Occupancy',
    item_code: getString(item.item_code),
    item_label: getString(item.item_label),
    sort_order: typeof item.sort_order === 'number' ? item.sort_order : 0,
    is_required: item.is_required ?? true,
    permit_type: getString(item.permit_type),
    responsible_party: getString(item.responsible_party),
    document_upload_required: item.document_upload_required === true,
    inspection_status: getString(item.inspection_status) || 'Pending',
    ahj_notes: getString(item.ahj_notes),
    dependencies: Array.isArray(item.dependencies) ? item.dependencies : [],
    response_note: getString(item.response_note) || null,
    metadata: getRecord(item.metadata) ?? {},
    updated_at: new Date().toISOString(),
  }
}

export async function POST(req: NextRequest) {
  let body: FinalOccupancyBody

  try {
    body = await req.json() as FinalOccupancyBody
  } catch {
    return fail('invalid_request', 'Invalid request body.', 400)
  }

  const assignmentId = getString(body.assignmentId)
  const jobId = getString(body.jobId)
  const reportId = getString(body.reportId)
  const stageNumber = getStageNumber(body.stageNumber)
  const sealedAt = getString(body.sealedAt)
  const sealReference = getString(body.sealReference)
  const completedRecord = getRecord(body.completedRecord)
  const sealPayload = getRecord(body.sealPayload)
  const items = getItems(body.items)

  if (!assignmentId) return fail('invalid_request', 'assignmentId is required.', 400)
  if (!jobId) return fail('invalid_request', 'jobId is required.', 400)
  if (!reportId) return fail('invalid_request', 'reportId is required.', 400)
  if (stageNumber !== 15) return fail('invalid_request', 'Scoped final occupancy must be submitted from S15.', 400)
  if (!sealedAt) return fail('invalid_request', 'sealedAt is required.', 400)
  if (!sealReference) return fail('invalid_request', 'sealReference is required.', 400)
  if (!completedRecord) return fail('invalid_request', 'completedRecord is required.', 400)
  if (!sealPayload) return fail('invalid_request', 'sealPayload is required.', 400)

  const s15ValidationError = validateS15Items(items)
  if (s15ValidationError) return fail('s15_gate_failed', s15ValidationError, 409)

  const sessionSupabase = await createClient()
  const { data: authData, error: authError } = await sessionSupabase.auth.getUser()
  const user = authData.user

  if (authError || !user) {
    console.error('[inspections/final-occupancy] auth failed', authError)
    return fail('auth_failed', 'Authentication required.', 401)
  }

  const serviceSupabase = getServiceClient()
  if (!serviceSupabase) {
    console.error('[inspections/final-occupancy] service role client unavailable')
    return fail('server_not_configured', 'Final occupancy service is not configured.', 503)
  }

  const { data: assignmentData, error: assignmentError } = await serviceSupabase
    .from('job_assignments')
    .select('id, job_id, inspector_id, status')
    .eq('id', assignmentId)
    .maybeSingle()

  if (assignmentError) {
    console.error('[inspections/final-occupancy] assignment lookup failed', {
      assignmentId,
      inspectorId: user.id,
      error: assignmentError.message,
    })
    return fail('assignment_lookup_failed', 'Could not load the assignment.', 500)
  }

  if (!assignmentData) return fail('assignment_not_found', 'Assignment not found.', 404)

  const assignment = assignmentData as AssignmentRow
  if (assignment.inspector_id !== user.id) {
    return fail('ownership_failed', 'This assignment does not belong to the signed-in inspector.', 403)
  }
  if (assignment.job_id !== jobId) return fail('job_mismatch', 'Assignment and job do not match.', 409)
  if (assignment.status === 'cancelled' || assignment.status === 'invalidated') {
    return fail('assignment_not_closeable', 'This assignment can no longer be finalized.', 409)
  }

  const { data: jobData, error: jobError } = await serviceSupabase
    .from('job_opportunities')
    .select('id, builder_id, builder_name, project_id, project_name, address, city, stage, status')
    .eq('id', jobId)
    .maybeSingle()

  if (jobError) {
    console.error('[inspections/final-occupancy] job lookup failed', { jobId, error: jobError.message })
    return fail('job_lookup_failed', 'Could not load the job.', 500)
  }
  if (!jobData) return fail('job_not_found', 'Job not found.', 404)

  const job = jobData as JobRow
  if (job.stage !== 7) return fail('not_scoped_stage_seven', 'This route only finalizes scoped Builder Stage 7 requests.', 409)

  const { data: openHoldRows, error: holdError } = await serviceSupabase
    .from('job_holds')
    .select('id, status')
    .eq('job_id', jobId)

  if (holdError) {
    console.error('[inspections/final-occupancy] hold lookup failed', { jobId, error: holdError.message })
    return fail('hold_lookup_failed', 'Could not verify hold status.', 500)
  }

  const openHold = (openHoldRows ?? []).find(row => isHoldOpenStatus(String((row as Record<string, unknown>).status ?? '')))
  if (openHold) return fail('open_hold_blocks_final', 'An open Hold must be resolved before final occupancy can be issued.', 409)

  const { data: relatedJobsData, error: relatedJobsError } = await serviceSupabase
    .from('job_opportunities')
    .select('id, builder_id, project_id, project_name, address, city, stage, status')
    .eq('builder_id', job.builder_id)

  if (relatedJobsError) {
    console.error('[inspections/final-occupancy] related job lookup failed', { jobId, error: relatedJobsError.message })
    return fail('related_jobs_lookup_failed', 'Could not verify builder-stage prerequisites.', 500)
  }

  const relatedJobs = ((relatedJobsData ?? []) as JobRow[]).filter(row => rowMatchesScopedProject(row, job))
  const relatedJobIds = relatedJobs.map(row => row.id)
  const { data: relatedReportsData, error: relatedReportsError } = relatedJobIds.length > 0
    ? await serviceSupabase
      .from('inspector_completion_reports')
      .select('id, assignment_id, job_id, status, submitted_at, seal_payload')
      .in('job_id', relatedJobIds)
    : { data: [], error: null }

  if (relatedReportsError) {
    console.error('[inspections/final-occupancy] related report lookup failed', { jobId, error: relatedReportsError.message })
    return fail('related_reports_lookup_failed', 'Could not verify builder-stage reports.', 500)
  }

  const reportsByJob = new Map(((relatedReportsData ?? []) as ReportRow[]).map(report => [report.job_id, report]))
  const missingStages = [1, 2, 3, 4, 5, 6].filter(builderStage => {
    const internalStage = BUILDER_STAGE_TO_COMPLETION_STAGE[builderStage]
    const stageJob = relatedJobs.find(row => row.stage === builderStage)
    if (!stageJob) return true
    const report = reportsByJob.get(stageJob.id)
    return stageJob.status !== 'completed'
      && !(report && (report.status === 'submitted' || report.status === 'sealed' || Boolean(report.submitted_at) || hasStageSignOff(report.seal_payload, internalStage)))
  })

  if (missingStages.length > 0) {
    return fail(
      'scoped_prerequisites_incomplete',
      `Builder Stage ${missingStages.join(', ')} must be passed before final occupancy can be issued.`,
      409,
    )
  }

  const now = new Date().toISOString()
  const completedRow = completedRecordToRow({
    ...completedRecord,
    jobRef: jobId,
    completedAt: sealedAt,
    certRef: sealReference,
    inspectorId: user.id,
  })

  const { error: recordError } = await serviceSupabase
    .from('compliance_completed_records')
    .upsert(completedRow, { onConflict: 'id' })

  if (recordError) {
    console.error('[inspections/final-occupancy] completed record write failed', {
      assignmentId,
      jobId,
      reportId,
      inspectorId: user.id,
      code: recordError.code,
      message: recordError.message,
      details: recordError.details,
      hint: recordError.hint,
    })
    return fail('completed_record_write_failed', recordError.message, 500)
  }

  const itemRows = items.map(item => itemToUpsertRow(item, reportId, assignmentId))
  const { error: itemError } = itemRows.length > 0
    ? await serviceSupabase
      .from('inspector_completion_stage_items')
      .upsert(itemRows, { onConflict: 'report_id,item_code' })
    : { error: null }

  if (itemError) {
    console.error('[inspections/final-occupancy] item upsert failed', {
      assignmentId,
      jobId,
      reportId,
      error: itemError.message,
    })
    return fail('checklist_item_write_failed', itemError.message, 500)
  }

  const { error: reportUpdateError } = await serviceSupabase
    .from('inspector_completion_reports')
    .update({
      status: 'sealed',
      seal_applied: true,
      seal_reference: sealReference,
      seal_payload: sealPayload,
      sealed_at: sealedAt,
      submitted_at: sealedAt,
      updated_at: now,
    })
    .eq('id', reportId)
    .eq('assignment_id', assignmentId)

  if (reportUpdateError) {
    console.error('[inspections/final-occupancy] report seal update failed', {
      assignmentId,
      jobId,
      reportId,
      error: reportUpdateError.message,
    })
    return fail('report_seal_write_failed', reportUpdateError.message, 500)
  }

  const previousAssignmentStatus = assignment.status ?? null
  const previousJobStatus = job.status ?? null

  const { error: assignmentUpdateError } = await serviceSupabase
    .from('job_assignments')
    .update({
      status: 'completed',
      updated_at: now,
    })
    .eq('id', assignmentId)

  if (assignmentUpdateError) {
    console.error('[inspections/final-occupancy] assignment close failed', { assignmentId, jobId, error: assignmentUpdateError.message })
    return fail('assignment_close_failed', assignmentUpdateError.message, 500)
  }

  const { error: jobUpdateError } = await serviceSupabase
    .from('job_opportunities')
    .update({
      status: 'completed',
      updated_at: now,
    })
    .eq('id', jobId)

  if (jobUpdateError) {
    console.error('[inspections/final-occupancy] job close failed', { assignmentId, jobId, error: jobUpdateError.message })
    return fail('job_close_failed', jobUpdateError.message, 500)
  }

  const { error: eventError } = await serviceSupabase.from('job_status_events').insert([
    {
      job_id: jobId,
      actor_id: user.id,
      actor_role: 'inspector',
      from_status: previousAssignmentStatus,
      to_status: 'assignment_completed',
      reason: 'Scoped final occupancy assignment completed.',
      created_at: now,
    },
    {
      job_id: jobId,
      actor_id: user.id,
      actor_role: 'inspector',
      from_status: previousJobStatus,
      to_status: 'completed',
      reason: 'Scoped final occupancy issued and job completed.',
      created_at: now,
    },
  ])

  if (eventError) {
    console.error('[inspections/final-occupancy] status event insert failed', { assignmentId, jobId, error: eventError.message })
  }

  return NextResponse.json({
    ok: true,
    sealReference,
    assignmentStatus: 'completed',
    jobStatus: 'completed',
  })
}
