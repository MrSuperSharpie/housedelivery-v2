// Dev-only: seed a fully sealed completion report with 15 stages of dummy
// evidence so a test PDF can be generated in seconds instead of walking the
// full 15-stage field flow. Gated hard on NODE_ENV !== 'production' — never
// exposes production data mutation.
//
// POST /api/dev/seed-certified-project
//   → { reportId }
// Then: GET /api/schedule-cb?reportId=<reportId>
//
// Note: storage paths are fabricated. The schedule-cb route will log a
// signed-URL-generation warning for each seeded document (no real file
// exists) and the appendix will render placeholder cards. That is intended
// — this seed is for dev iteration on the report / PDF pipeline, not for
// exercising Supabase Storage.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const STAGE_NAMES = [
  'Site Preparation',
  'Foundation',
  'Underground Services',
  'Framing',
  'Roofing',
  'Exterior Envelope',
  'Insulation & Vapour Barrier',
  'Drywall',
  'Plumbing Rough-In',
  'Electrical Rough-In',
  'Mechanical Rough-In',
  'Fire Separations',
  'Interior Finishes',
  'Pre-Occupancy',
  'Final Occupancy',
] as const

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  const user = authData.user
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized — sign in first' }, { status: 401 })
  }

  const now = new Date()
  const nowIso = now.toISOString()
  const suffix = now.getTime().toString(36)
  const reportId = `dev-seed-report-${suffix}`
  const assignmentId = `dev-seed-assignment-${suffix}`
  const jobId = `dev-seed-job-${suffix}`
  const sealReference = `VERO-IC-DEV-${suffix.toUpperCase()}`

  const stageSignOffs: Record<string, unknown> = {}
  STAGE_NAMES.forEach((name, i) => {
    stageSignOffs[String(i + 1)] = {
      stageNumber: i + 1,
      stageName: name,
      signedAt: nowIso,
      latitude: 49.2646,
      longitude: -123.1385,
    }
  })

  const reportRow = {
    id: reportId,
    assignment_id: assignmentId,
    job_id: jobId,
    inspector_id: user.id,
    project_id: null,
    project_name: `Dev Fast-Track Project (${suffix})`,
    address: '1288 W 8th Ave',
    city: 'Vancouver',
    region: 'Lower Mainland',
    project_type: 'SFH',
    current_stage: 15,
    stage_count: 15,
    jurisdiction_name: 'City of Vancouver',
    ahj_overlay_type: 'vancouver',
    ahj_overlay_label: 'City of Vancouver (CoV)',
    overlay_snapshot: {
      type: 'vancouver',
      label: 'City of Vancouver (CoV)',
      jurisdictionName: 'City of Vancouver',
      signals: ['cov_detected'],
      summary: 'City of Vancouver AHJ overlay active. Schedule C-B required for all Part 5 field reviews.',
    },
    checklist_snapshot: [],
    status: 'sealed',
    seal_applied: true,
    seal_reference: sealReference,
    seal_payload: {
      overallResult: 'pass',
      sealedAt: nowIso,
      sealedBy: user.email ?? 'Dev Seed Inspector',
      sealedById: user.id,
      stageSignOffs,
      holdHistory: [],
      certifiedLocation: { latitude: 49.2646, longitude: -123.1385 },
    },
    sealed_at: nowIso,
    last_saved_at: nowIso,
    submitted_at: nowIso,
  }

  const { error: reportError } = await supabase
    .from('inspector_completion_reports')
    .insert(reportRow)

  if (reportError) {
    console.error('[dev/seed] report insert failed:', reportError)
    return NextResponse.json(
      { error: 'Seed failed (report insert)', detail: reportError.message },
      { status: 500 },
    )
  }

  const stageItems = STAGE_NAMES.map((stageName, i) => {
    const stageNumber = i + 1
    const itemCode = `S${String(stageNumber).padStart(2, '0')}-01`
    return {
      id: `${reportId}-item-${itemCode}`,
      report_id: reportId,
      assignment_id: assignmentId,
      stage_number: stageNumber,
      stage_name: stageName,
      item_code: itemCode,
      item_label: `${stageName} — primary field check`,
      sort_order: 1,
      permit_type: 'SFH',
      responsible_party: 'Inspector',
      document_upload_required: true,
      inspection_status: 'Passed',
      response_note: `Verified on site during ${stageName.toLowerCase()} review. Compliant.`,
    }
  })

  const { error: itemsError } = await supabase
    .from('inspector_completion_stage_items')
    .insert(stageItems)

  if (itemsError) {
    console.error('[dev/seed] stage items insert failed:', itemsError)
    return NextResponse.json(
      { error: 'Seed failed (stage items insert)', detail: itemsError.message },
      { status: 500 },
    )
  }

  const documents = STAGE_NAMES.map((stageName, i) => {
    const stageNumber = i + 1
    const itemCode = `S${String(stageNumber).padStart(2, '0')}-01`
    return {
      id: `${reportId}-doc-${itemCode}`,
      report_id: reportId,
      assignment_id: assignmentId,
      item_code: itemCode,
      file_name: `${stageName.replace(/\s+/g, '_').toLowerCase()}_evidence.jpg`,
      storage_path: `dev-seed/${reportId}/stage-${String(stageNumber).padStart(2, '0')}.jpg`,
      mime_type: 'image/jpeg',
      uploaded_by: user.id,
    }
  })

  const { error: docsError } = await supabase
    .from('inspector_completion_documents')
    .insert(documents)

  if (docsError) {
    console.error('[dev/seed] documents insert failed:', docsError)
    return NextResponse.json(
      { error: 'Seed failed (documents insert)', detail: docsError.message },
      { status: 500 },
    )
  }

  return NextResponse.json({
    reportId,
    assignmentId,
    pdfUrl: `/api/schedule-cb?reportId=${encodeURIComponent(reportId)}`,
  })
}
