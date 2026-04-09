/**
 * On-site inspection report — DB access layer.
 *
 * Table: inspection_reports
 * Bucket: inspection-evidence
 */

import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
import type { JobStatus } from '@/lib/supabase/jobs'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ItemResult = 'pass' | 'fail' | 'na'

/** Metadata captured at the moment a photo/video is attached to a checklist item. */
export interface ItemEvidence {
  path: string       // Supabase storage path in inspection-evidence bucket
  timestamp: string  // ISO-8601 capture time
  lat?: number       // GPS latitude (omitted if denied/unavailable)
  lng?: number       // GPS longitude
}

export interface ChecklistItemResponse {
  itemId: string
  result: ItemResult | null
  note?: string
  evidence?: ItemEvidence[]  // per-item media, stored in checklist_responses JSONB
}

export type ReportStatus = 'draft' | 'submitted'

export interface InspectionReportRow {
  id: string
  assignmentId: string
  jobId: string
  inspectorId: string
  phaseId: string
  checklistResponses: ChecklistItemResponse[]
  inspectorNotes: string
  status: ReportStatus
  evidenceUrls: string[]      // storage paths (use createSignedUrl to read)
  submittedAt?: string
  createdAt: string
  updatedAt: string
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToReport(row: Record<string, unknown>): InspectionReportRow {
  return {
    id:                  row.id as string,
    assignmentId:        row.assignment_id as string,
    jobId:               row.job_id as string,
    inspectorId:         row.inspector_id as string,
    phaseId:             row.phase_id as string,
    checklistResponses:  (row.checklist_responses as ChecklistItemResponse[]) ?? [],
    inspectorNotes:      (row.inspector_notes as string) ?? '',
    status:              row.status as ReportStatus,
    evidenceUrls:        (row.evidence_urls as string[]) ?? [],
    submittedAt:         (row.submitted_at as string) ?? undefined,
    createdAt:           row.created_at as string,
    updatedAt:           row.updated_at as string,
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getReportByAssignment(
  assignmentId: string
): Promise<InspectionReportRow | null> {
  const { data, error } = await supabase
    .from('inspection_reports')
    .select('*')
    .eq('assignment_id', assignmentId)
    .maybeSingle()

  if (error) {
    console.error('getReportByAssignment:', error)
    return null
  }
  if (!data) return null
  return rowToReport(data as Record<string, unknown>)
}

// ─── Upsert (create or update draft) ─────────────────────────────────────────

export async function upsertReport(
  report: Pick<InspectionReportRow, 'assignmentId' | 'jobId' | 'inspectorId' | 'phaseId'> &
    Partial<Pick<InspectionReportRow, 'checklistResponses' | 'inspectorNotes' | 'evidenceUrls'>>
): Promise<InspectionReportRow | null> {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('inspection_reports')
    .upsert(
      {
        assignment_id:        report.assignmentId,
        job_id:               report.jobId,
        inspector_id:         report.inspectorId,
        phase_id:             report.phaseId,
        checklist_responses:  report.checklistResponses ?? [],
        inspector_notes:      report.inspectorNotes ?? '',
        evidence_urls:        report.evidenceUrls ?? [],
        status:               'draft',
        updated_at:           now,
      },
      { onConflict: 'assignment_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('upsertReport:', error)
    return null
  }
  return rowToReport(data as Record<string, unknown>)
}

/** Patch only the checklist_responses and inspector_notes fields on an existing report. */
export async function patchReportChecklist(
  reportId: string,
  checklistResponses: ChecklistItemResponse[],
  inspectorNotes: string
): Promise<boolean> {
  const { error } = await supabase
    .from('inspection_reports')
    .update({
      checklist_responses: checklistResponses,
      inspector_notes:     inspectorNotes,
      updated_at:          new Date().toISOString(),
    })
    .eq('id', reportId)

  if (error) console.error('patchReportChecklist:', error)
  return !error
}

/** Append a new evidence path to evidence_urls. */
export async function appendEvidenceUrl(
  reportId: string,
  storagePath: string
): Promise<boolean> {
  // Use Postgres array append via RPC or re-fetch-then-update pattern.
  // Simple re-fetch approach to avoid requiring a custom RPC function.
  const { data: existing } = await supabase
    .from('inspection_reports')
    .select('evidence_urls')
    .eq('id', reportId)
    .single()

  const current: string[] = (existing as { evidence_urls: string[] } | null)?.evidence_urls ?? []
  const next = [...current, storagePath]

  const { error } = await supabase
    .from('inspection_reports')
    .update({ evidence_urls: next, updated_at: new Date().toISOString() })
    .eq('id', reportId)

  if (error) console.error('appendEvidenceUrl:', error)
  return !error
}

// ─── Submit ───────────────────────────────────────────────────────────────────

/**
 * Mark report as submitted, transition the parent job to 'completed',
 * and move escrow to 'earned_pending_review'.
 *
 * Policy — Trap 4 fix: the inspection OUTCOME (pass/fail) does NOT gate the
 * base inspection fee. A validly performed inspection always earns the base fee
 * regardless of whether the work passed or failed.  The question is:
 *   "Was the inspection service validly performed?"  ← earns fee
 * NOT:
 *   "Did the underlying construction work pass?"    ← irrelevant to fee
 *
 * A reinspection triggered by a fail result is a separate billable event with
 * its own escrow record.
 */
export async function submitReport(
  reportId: string,
  jobId: string
): Promise<boolean> {
  const now = new Date().toISOString()

  const { error: reportErr } = await supabase
    .from('inspection_reports')
    .update({ status: 'submitted', submitted_at: now, updated_at: now })
    .eq('id', reportId)

  if (reportErr) {
    console.error('submitReport (report update):', reportErr)
    return false
  }

  // Transition job to completed
  const { error: jobErr } = await supabase
    .from('job_opportunities')
    .update({ status: 'completed' as JobStatus, updated_at: now })
    .eq('id', jobId)

  if (jobErr) console.error('submitReport (job update):', jobErr)

  // Transition escrow to earned_pending_review regardless of pass/fail outcome.
  // Pass/fail is the construction result; it has no bearing on whether the
  // inspector earned their fee for performing the service.
  const { error: escrowErr } = await supabase
    .from('job_assignments')
    .update({ escrow_status: 'earned_pending_review', updated_at: now })
    .eq('job_id', jobId)

  if (escrowErr) console.error('submitReport (escrow update):', escrowErr)

  return !reportErr
}

// ─── Hold ─────────────────────────────────────────────────────────────────────

export type HoldReason = 'site_not_ready' | 'safety_issue'

/**
 * Place a job on hold from the field.
 * Updates job_opportunities.status to 'on_hold' and records the reason in notes.
 */
export async function placeJobOnHold(
  jobId: string,
  reason: HoldReason
): Promise<boolean> {
  const reasonLabel = reason === 'site_not_ready' ? 'Site Not Ready' : 'Safety Issue'
  const { error } = await supabase
    .from('job_opportunities')
    .update({
      status:     'on_hold',
      notes:      `[HOLD — ${reasonLabel}] Placed on hold by inspector on ${new Date().toLocaleDateString('en-CA')}.`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  if (error) console.error('placeJobOnHold:', error)
  return !error
}

// ─── Evidence upload ──────────────────────────────────────────────────────────

/**
 * Upload a file to the inspection-evidence bucket.
 * Returns the storage path on success, null on failure.
 */
export async function uploadEvidence(
  inspectorId: string,
  assignmentId: string,
  file: File
): Promise<string | null> {
  const path = `${inspectorId}/${assignmentId}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`

  const { error } = await supabase.storage
    .from('inspection-evidence')
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) {
    console.error('uploadEvidence:', error)
    return null
  }

  return path
}

/** Get a 1-hour signed URL for an evidence file. */
export async function getEvidenceSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('inspection-evidence')
    .createSignedUrl(storagePath, 3600)

  if (error || !data) return null
  return data.signedUrl
}
