import { createClient } from '@/lib/supabase/client'
import type {
  AhjOverlayContext,
  CompletionInspectionStatus,
  CompletionRequiredLogic,
  CompletionResponsibleParty,
} from '@/lib/inspectorCompletion'
import { evaluateGeofence } from '@/lib/geofence'
import { validateEvidenceUpload } from '@/lib/governance'
import { appendGovernanceAuditEvent } from '@/lib/supabase/governance'

const supabase = createClient()

const REPORTS = 'inspector_completion_reports'
const ITEMS = 'inspector_completion_stage_items'
const DOCUMENTS = 'inspector_completion_documents'
const ANOMALIES = 'field_geo_anomalies'
const STORAGE_BUCKET = 'inspection-evidence'

export interface InspectorCompletionReportRow {
  id: string
  assignmentId: string
  jobId: string
  inspectorId: string
  projectId?: string
  projectName: string
  address: string
  city?: string
  region?: string
  projectType?: string
  currentStage: number
  stageCount: number
  jurisdictionName?: string
  ahjOverlayType: AhjOverlayContext['type']
  ahjOverlayLabel: string
  overlaySnapshot: AhjOverlayContext
  checklistSnapshot: Record<string, unknown>[]
  status: 'draft' | 'sealed' | 'submitted'
  sealApplied: boolean
  sealReference?: string
  sealPayload: Record<string, unknown>
  lastSavedAt: string
  submittedAt?: string
  createdAt: string
  updatedAt: string
}

export interface InspectorCompletionChecklistItemRow {
  id: string
  reportId: string
  assignmentId: string
  stageNumber: number
  stageName: string
  itemCode: string
  itemLabel: string
  sortOrder: number
  isRequired: CompletionRequiredLogic
  permitType: string
  responsibleParty: CompletionResponsibleParty
  documentUploadRequired: boolean
  inspectionStatus: CompletionInspectionStatus
  ahjNotes: string
  dependencies: string[]
  responseNote?: string
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface InspectorCompletionDocumentRow {
  id: string
  reportId: string
  assignmentId: string
  itemCode: string
  fileName: string
  storagePath: string
  mimeType?: string
  fileSize?: number
  uploadedBy?: string
  createdAt: string
  /** Blob URL for inline preview — client-only, never persisted to DB. */
  previewUrl?: string
}

export interface FieldGeoAnomalyRow {
  id: string
  assignmentId: string
  jobId: string
  reportId?: string
  documentId?: string
  anomalyType: string
  reviewStatus: string
  distanceMeters?: number
  thresholdMeters?: number
  explanation?: string
  inspectorId?: string
  adminDecision?: string
  adminNote?: string
  createdAt: string
  reviewedAt?: string
  metadata: Record<string, unknown>
}

function rowToReport(row: Record<string, unknown>): InspectorCompletionReportRow {
  return {
    id: row.id as string,
    assignmentId: row.assignment_id as string,
    jobId: row.job_id as string,
    inspectorId: row.inspector_id as string,
    projectId: (row.project_id as string) ?? undefined,
    projectName: row.project_name as string,
    address: row.address as string,
    city: (row.city as string) ?? undefined,
    region: (row.region as string) ?? undefined,
    projectType: (row.project_type as string) ?? undefined,
    currentStage: (row.current_stage as number) ?? 1,
    stageCount: (row.stage_count as number) ?? 15,
    jurisdictionName: (row.jurisdiction_name as string) ?? undefined,
    ahjOverlayType: row.ahj_overlay_type as AhjOverlayContext['type'],
    ahjOverlayLabel: row.ahj_overlay_label as string,
    overlaySnapshot: (row.overlay_snapshot as AhjOverlayContext) ?? {
      type: 'province_base',
      label: 'Province-Wide Base',
      jurisdictionName: 'Province of BC',
      signals: [],
      summary: '',
    },
    checklistSnapshot: (row.checklist_snapshot as Record<string, unknown>[]) ?? [],
    status: (row.status as InspectorCompletionReportRow['status']) ?? 'draft',
    sealApplied: (row.seal_applied as boolean) ?? false,
    sealReference: (row.seal_reference as string) ?? undefined,
    sealPayload: (row.seal_payload as Record<string, unknown>) ?? {},
    lastSavedAt: (row.last_saved_at as string) ?? new Date().toISOString(),
    submittedAt: (row.submitted_at as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function rowToItem(row: Record<string, unknown>): InspectorCompletionChecklistItemRow {
  return {
    id: row.id as string,
    reportId: row.report_id as string,
    assignmentId: row.assignment_id as string,
    stageNumber: row.stage_number as number,
    stageName: row.stage_name as string,
    itemCode: row.item_code as string,
    itemLabel: row.item_label as string,
    sortOrder: row.sort_order as number,
    isRequired: (row.is_required as CompletionRequiredLogic) ?? true,
    permitType: row.permit_type as string,
    responsibleParty: row.responsible_party as CompletionResponsibleParty,
    documentUploadRequired: (row.document_upload_required as boolean) ?? false,
    inspectionStatus: (row.inspection_status as CompletionInspectionStatus) ?? 'Pending',
    ahjNotes: (row.ahj_notes as string) ?? '',
    dependencies: (row.dependencies as string[]) ?? [],
    responseNote: (row.response_note as string) ?? undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function rowToDocument(row: Record<string, unknown>): InspectorCompletionDocumentRow {
  return {
    id: row.id as string,
    reportId: row.report_id as string,
    assignmentId: row.assignment_id as string,
    itemCode: row.item_code as string,
    fileName: row.file_name as string,
    storagePath: row.storage_path as string,
    mimeType: (row.mime_type as string) ?? undefined,
    fileSize: (row.file_size as number) ?? undefined,
    uploadedBy: (row.uploaded_by as string) ?? undefined,
    createdAt: row.created_at as string,
  }
}

function rowToGeoAnomaly(row: Record<string, unknown>): FieldGeoAnomalyRow {
  return {
    id: row.id as string,
    assignmentId: row.assignment_id as string,
    jobId: row.job_id as string,
    reportId: (row.report_id as string) ?? undefined,
    documentId: (row.document_id as string) ?? undefined,
    anomalyType: row.anomaly_type as string,
    reviewStatus: row.review_status as string,
    distanceMeters: (row.distance_meters as number) ?? undefined,
    thresholdMeters: (row.threshold_meters as number) ?? undefined,
    explanation: (row.explanation as string) ?? undefined,
    inspectorId: (row.inspector_id as string) ?? undefined,
    adminDecision: (row.admin_decision as string) ?? undefined,
    adminNote: (row.admin_note as string) ?? undefined,
    createdAt: row.created_at as string,
    reviewedAt: (row.reviewed_at as string) ?? undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }
}

async function checksumFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map(chunk => chunk.toString(16).padStart(2, '0'))
    .join('')
}

export async function getInspectorCompletionBundle(assignmentId: string): Promise<{
  report: InspectorCompletionReportRow | null
  items: InspectorCompletionChecklistItemRow[]
  documents: InspectorCompletionDocumentRow[]
}> {
  const { data: reportData, error: reportError } = await supabase
    .from(REPORTS)
    .select('*')
    .eq('assignment_id', assignmentId)
    .maybeSingle()

  if (reportError || !reportData) {
    return { report: null, items: [], documents: [] }
  }

  const report = rowToReport(reportData as Record<string, unknown>)

  const [{ data: itemData }, { data: documentData }] = await Promise.all([
    supabase
      .from(ITEMS)
      .select('*')
      .eq('report_id', report.id)
      .order('stage_number', { ascending: true })
      .order('sort_order', { ascending: true }),
    supabase
      .from(DOCUMENTS)
      .select('*')
      .eq('report_id', report.id)
      .order('created_at', { ascending: true }),
  ])

  return {
    report,
    items: ((itemData as Record<string, unknown>[] | null) ?? []).map(rowToItem),
    documents: ((documentData as Record<string, unknown>[] | null) ?? []).map(rowToDocument),
  }
}

export async function upsertInspectorCompletionReport(
  input: Omit<InspectorCompletionReportRow, 'createdAt' | 'updatedAt' | 'lastSavedAt'>
): Promise<InspectorCompletionReportRow | null> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from(REPORTS)
    .upsert(
      {
        id: input.id,
        assignment_id: input.assignmentId,
        job_id: input.jobId,
        inspector_id: input.inspectorId,
        project_id: input.projectId ?? null,
        project_name: input.projectName,
        address: input.address,
        city: input.city ?? null,
        region: input.region ?? null,
        project_type: input.projectType ?? null,
        current_stage: input.currentStage,
        stage_count: input.stageCount,
        jurisdiction_name: input.jurisdictionName ?? null,
        ahj_overlay_type: input.ahjOverlayType,
        ahj_overlay_label: input.ahjOverlayLabel,
        overlay_snapshot: input.overlaySnapshot,
        checklist_snapshot: input.checklistSnapshot,
        status: input.status,
        seal_applied: input.sealApplied,
        seal_reference: input.sealReference ?? null,
        seal_payload: input.sealPayload,
        last_saved_at: now,
        submitted_at: input.submittedAt ?? null,
        updated_at: now,
      },
      { onConflict: 'assignment_id' }
    )
    .select('*')
    .single()

  if (error || !data) {
    console.error('upsertInspectorCompletionReport:', error)
    return null
  }

  return rowToReport(data as Record<string, unknown>)
}

export async function upsertInspectorCompletionItems(
  items: Array<Omit<InspectorCompletionChecklistItemRow, 'createdAt' | 'updatedAt'>>
): Promise<boolean> {
  if (items.length === 0) return true
  const now = new Date().toISOString()
  const payload = items.map(item => ({
    id: item.id,
    report_id: item.reportId,
    assignment_id: item.assignmentId,
    stage_number: item.stageNumber,
    stage_name: item.stageName,
    item_code: item.itemCode,
    item_label: item.itemLabel,
    sort_order: item.sortOrder,
    is_required: item.isRequired,
    permit_type: item.permitType,
    responsible_party: item.responsibleParty,
    document_upload_required: item.documentUploadRequired,
    inspection_status: item.inspectionStatus,
    ahj_notes: item.ahjNotes,
    dependencies: item.dependencies,
    response_note: item.responseNote ?? null,
    metadata: item.metadata,
    updated_at: now,
  }))

  const { error } = await supabase
    .from(ITEMS)
    .upsert(payload, { onConflict: 'report_id,item_code' })

  if (error) {
    console.error('upsertInspectorCompletionItems:', error)
    return false
  }

  return true
}

export async function uploadInspectorCompletionDocument(
  reportId: string,
  assignmentId: string,
  itemCode: string,
  uploadedBy: string,
  file: File,
  options?: {
    jobId?: string
    capturedAt?: string
    captureLatitude?: number | null
    captureLongitude?: number | null
    projectLatitude?: number | null
    projectLongitude?: number | null
    anomalyExplanation?: string
    source?: string
  },
): Promise<InspectorCompletionDocumentRow | null> {
  const governance = validateEvidenceUpload({
    mimeType: file.type,
    fileSize: file.size,
    maxSizeMb: 25,
  })
  if (!governance.ok) {
    console.error('uploadInspectorCompletionDocument governance:', governance.blockers)
    return null
  }

  const safeName = file.name.replace(/\s+/g, '_')
  const storagePath = `completion/${assignmentId}/${itemCode}/${Date.now()}-${safeName}`
  const evidenceChecksum = await checksumFile(file)

  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, { cacheControl: '3600', upsert: false })

  if (storageError) {
    console.error('uploadInspectorCompletionDocument:', storageError)
    return null
  }

  const now = options?.capturedAt ?? new Date().toISOString()
  const captureGeo = {
    latitude: options?.captureLatitude ?? null,
    longitude: options?.captureLongitude ?? null,
  }
  const geofence = evaluateGeofence({
    projectPoint: options?.projectLatitude != null && options?.projectLongitude != null
      ? { latitude: options.projectLatitude, longitude: options.projectLongitude }
      : null,
    capturePoint: options?.captureLatitude != null && options?.captureLongitude != null
      ? { latitude: options.captureLatitude, longitude: options.captureLongitude }
      : null,
    thresholdMeters: 250,
  })
  const anomalyFlags = geofence.state === 'anomalous'
    ? [{
        type: 'geofence_out_of_range',
        distanceMeters: geofence.distanceMeters,
        thresholdMeters: geofence.thresholdMeters,
        explanation: options?.anomalyExplanation ?? null,
      }]
    : []
  const row = {
    id: crypto.randomUUID(),
    report_id: reportId,
    assignment_id: assignmentId,
    item_code: itemCode,
    file_name: file.name,
    storage_path: storagePath,
    mime_type: file.type || null,
    file_size: file.size || null,
    evidence_checksum: evidenceChecksum,
    original_captured_at: now,
    capture_geo: captureGeo,
    integrity_status: 'recorded',
    anomaly_flags: anomalyFlags,
    uploaded_by: uploadedBy,
    created_at: now,
  }

  const { data, error } = await supabase.from(DOCUMENTS).insert(row).select('*').single()
  if (error || !data) {
    console.error('uploadInspectorCompletionDocument insert:', error)
    return null
  }

  await appendGovernanceAuditEvent({
    entityType: 'evidence',
    entityId: row.id,
    action: 'evidence.recorded',
    actorId: uploadedBy,
    actorRole: 'inspector',
    ruleIds: ['R-025', 'R-026'],
    blockerType: 'technical',
    reason: 'Inspector completion evidence stored immutably.',
    beforeState: {},
    afterState: {
      reportId,
      assignmentId,
      itemCode,
      storagePath,
      evidenceChecksum,
      geofenceState: geofence.state,
    },
    metadata: {
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    },
  })

  if (geofence.state === 'anomalous' && options?.jobId) {
    const { data: anomalyData, error: anomalyError } = await supabase
      .from(ANOMALIES)
      .insert({
        id: crypto.randomUUID(),
        assignment_id: assignmentId,
        job_id: options.jobId,
        report_id: reportId,
        document_id: row.id,
        anomaly_type: 'geofence_out_of_range',
        review_status: 'pending_review',
        distance_meters: geofence.distanceMeters,
        threshold_meters: geofence.thresholdMeters,
        explanation: options.anomalyExplanation ?? null,
        inspector_id: uploadedBy,
        metadata: {
          source: options.source ?? 'field_capture',
        },
      })
      .select('*')
      .single()

    if (anomalyError) {
      console.error('uploadInspectorCompletionDocument anomaly:', anomalyError)
    } else if (anomalyData) {
      await appendGovernanceAuditEvent({
        entityType: 'anomaly',
        entityId: (anomalyData as Record<string, unknown>).id as string,
        action: 'anomaly.flagged',
        actorId: uploadedBy,
        actorRole: 'inspector',
        ruleIds: ['R-024', 'R-025', 'R-026', 'R-027'],
        blockerType: 'technical',
        reason: 'Evidence capture occurred outside the expected geofence and entered review.',
        beforeState: {},
        afterState: {
          jobId: options.jobId,
          reportId,
          documentId: row.id,
          reviewStatus: 'pending_review',
        },
        metadata: {
          distanceMeters: geofence.distanceMeters,
          thresholdMeters: geofence.thresholdMeters,
        },
      })
    }
  }

  return rowToDocument(data as Record<string, unknown>)
}

export async function listFieldGeoAnomalies(jobId?: string): Promise<FieldGeoAnomalyRow[]> {
  let query = supabase
    .from(ANOMALIES)
    .select('*')
    .order('created_at', { ascending: false })

  if (jobId) {
    query = query.eq('job_id', jobId)
  }

  const { data, error } = await query
  if (error || !data) {
    if (error) console.error('listFieldGeoAnomalies:', error)
    return []
  }

  return (data as Record<string, unknown>[]).map(rowToGeoAnomaly)
}

export async function createFieldGeoAnomaly(input: {
  assignmentId: string
  jobId: string
  reportId?: string
  documentId?: string
  anomalyType: string
  distanceMeters?: number | null
  thresholdMeters?: number | null
  explanation?: string
  inspectorId?: string
  metadata?: Record<string, unknown>
}): Promise<FieldGeoAnomalyRow | null> {
  const { data, error } = await supabase
    .from(ANOMALIES)
    .insert({
      id: crypto.randomUUID(),
      assignment_id: input.assignmentId,
      job_id: input.jobId,
      report_id: input.reportId ?? null,
      document_id: input.documentId ?? null,
      anomaly_type: input.anomalyType,
      review_status: 'pending_review',
      distance_meters: input.distanceMeters ?? null,
      threshold_meters: input.thresholdMeters ?? null,
      explanation: input.explanation ?? null,
      inspector_id: input.inspectorId ?? null,
      metadata: input.metadata ?? {},
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('createFieldGeoAnomaly:', error)
    return null
  }

  return rowToGeoAnomaly(data as Record<string, unknown>)
}

export async function getInspectorCompletionDocumentSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600)

  if (error || !data) return null
  return data.signedUrl
}
