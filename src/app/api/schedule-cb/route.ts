/**
 * GET /api/schedule-cb?reportId=<id>
 *
 * Fetches a sealed InspectorCompletionReportRow, populates the Schedule C-B
 * PDF template with project + inspector details, and returns the PDF as a
 * browser file download.
 *
 * Auth: Requires a valid Supabase session cookie (managed by middleware.ts).
 *       The requesting user must be the inspector who owns the report.
 *
 * Query params:
 *   reportId  (required)  — UUID of the inspector_completion_reports row.
 *
 * Response:
 *   200  application/pdf  — PDF bytes with Content-Disposition: attachment
 *   400  application/json — Missing reportId
 *   401  application/json — No valid session
 *   403  application/json — Session user is not the report owner
 *   404  application/json — Report not found
 *   500  application/json — PDF generation error
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateScheduleCB } from '@/lib/pdf/scheduleCBGenerator'
import type { InspectorCompletionReportRow } from '@/lib/supabase/inspectorCompletion'
import type { AhjOverlayContext } from '@/lib/inspectorCompletion'

// ─── DB table constant (mirrors inspectorCompletion.ts) ──────────────────────
const REPORTS = 'inspector_completion_reports'

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {

  // ── 1. Parse + validate query params ────────────────────────────────────────
  const reportId           = req.nextUrl.searchParams.get('reportId')
  // Optional — lives on the job record, not the report row.  The UI that builds
  // the download link already has access to the job, so it passes it here.
  const buildingPermitNumber = req.nextUrl.searchParams.get('permitNumber') ?? undefined

  if (!reportId || reportId.trim() === '') {
    return NextResponse.json(
      { error: 'Missing required query parameter: reportId' },
      { status: 400 },
    )
  }

  // ── 2. Authenticate — server-side cookie session ─────────────────────────
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized — valid session required' },
      { status: 401 },
    )
  }

  // ── 3. Fetch the report row ──────────────────────────────────────────────
  const { data: row, error: fetchError } = await supabase
    .from(REPORTS)
    .select('*')
    .eq('id', reportId.trim())
    .maybeSingle()

  if (fetchError) {
    console.error('[schedule-cb] Supabase fetch error:', fetchError)
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 },
    )
  }

  if (!row) {
    return NextResponse.json(
      { error: `Report not found: ${reportId}` },
      { status: 404 },
    )
  }

  // ── 4. Ownership check — the session user must own this report ───────────
  //
  // inspector_id on the report row is the Supabase user UUID (set at creation
  // time via the inspectorId field).  We compare against user.id, which is the
  // same Supabase auth UUID carried in the session cookie.
  //
  const dbRow = row as Record<string, unknown>

  if (dbRow.inspector_id !== user.id) {
    return NextResponse.json(
      { error: 'Forbidden — you do not own this report' },
      { status: 403 },
    )
  }

  // ── 5. Map DB row → InspectorCompletionReportRow ─────────────────────────
  //
  // rowToReport() in inspectorCompletion.ts is private and uses the browser
  // client, so we inline the same mapping here against the server client's
  // query result.
  //
  const report: InspectorCompletionReportRow = {
    id:              dbRow.id as string,
    assignmentId:    dbRow.assignment_id as string,
    jobId:           dbRow.job_id as string,
    inspectorId:     dbRow.inspector_id as string,
    projectId:       (dbRow.project_id as string) ?? undefined,
    projectName:     dbRow.project_name as string,
    address:         dbRow.address as string,
    city:            (dbRow.city as string) ?? undefined,
    region:          (dbRow.region as string) ?? undefined,
    projectType:     (dbRow.project_type as string) ?? undefined,
    currentStage:    (dbRow.current_stage as number) ?? 1,
    stageCount:      (dbRow.stage_count as number) ?? 15,
    jurisdictionName:(dbRow.jurisdiction_name as string) ?? undefined,
    ahjOverlayType:  dbRow.ahj_overlay_type as AhjOverlayContext['type'],
    ahjOverlayLabel: dbRow.ahj_overlay_label as string,
    overlaySnapshot: (dbRow.overlay_snapshot as AhjOverlayContext) ?? {
      type: 'province_base',
      label: 'Province-Wide Base',
      jurisdictionName: 'Province of BC',
      signals: [],
      summary: '',
    },
    checklistSnapshot: (dbRow.checklist_snapshot as Record<string, unknown>[]) ?? [],
    status:          (dbRow.status as InspectorCompletionReportRow['status']) ?? 'draft',
    sealApplied:     (dbRow.seal_applied as boolean) ?? false,
    sealReference:   (dbRow.seal_reference as string) ?? undefined,
    sealPayload:     (dbRow.seal_payload as Record<string, unknown>) ?? {},
    lastSavedAt:     (dbRow.last_saved_at as string) ?? new Date().toISOString(),
    submittedAt:     (dbRow.submitted_at as string) ?? undefined,
    createdAt:       dbRow.created_at as string,
    updatedAt:       dbRow.updated_at as string,
  }

  // ── 6. Resolve inspector identity from user_metadata ────────────────────
  //
  // All inspector fields live in Supabase user_metadata, not in the report row.
  // The auth layer stores them under both camelCase and snake_case keys
  // (see auth.tsx readMetadataString) — we try both for each field.
  //
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>

  function pickMeta(...keys: string[]): string | undefined {
    for (const key of keys) {
      const v = meta[key]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
    return undefined
  }

  // "Name" field — license number appended in parens by the generator
  const inspectorName    = pickMeta('name') ?? user.email?.split('@')[0]
  const inspectorLicense = pickMeta('licenseNumber', 'license_number')

  // "Discipline (e.g. Architectural, etc.)" — prefer the free-text designation
  // (e.g. "P.Eng — Structural") over the raw discipline array
  const discipline = pickMeta('designation')
    ?? (Array.isArray(meta.disciplines) && meta.disciplines.length > 0
      ? String(meta.disciplines[0])
      : undefined)

  // "Print name of firm" — stored as 'company' on builder accounts; inspectors
  // may also have it set if they practice through a firm
  const firmName = pickMeta('company', 'firm', 'firm_name')

  // "Phone Number and Email Address" — combine if both present
  const phone = pickMeta('phone')
  const email = user.email ?? undefined
  const inspectorContact = phone && email
    ? `${phone}  ·  ${email}`
    : phone ?? email

  // "Address" / "Address (cont.)" — office mailing address (optional)
  const inspectorAddress     = pickMeta('address', 'office_address')
  const inspectorAddressCont = pickMeta('address_cont', 'office_address_cont', 'city_province_postal')

  // ── 7. Generate the PDF ──────────────────────────────────────────────────
  let pdfBytes: Uint8Array
  try {
    pdfBytes = await generateScheduleCB(report, {
      inspectorName,
      inspectorLicense,
      discipline,
      firmName,
      inspectorContact,
      inspectorAddress,
      inspectorAddressCont,
      buildingPermitNumber,
    })
  } catch (err) {
    console.error('[schedule-cb] PDF generation failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'PDF generation failed' },
      { status: 500 },
    )
  }

  // ── 8. Build a safe filename ─────────────────────────────────────────────
  //
  // Strip characters that cause problems in Content-Disposition headers or on
  // Windows / macOS file systems: anything that isn't a letter, digit, hyphen,
  // underscore, or space.  Collapse runs of spaces into a single underscore.
  //
  const safeName = report.projectName
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '_') || 'Schedule_CB'

  const filename = `Schedule_CB_${safeName}.pdf`

  // ── 9. Return PDF download response ─────────────────────────────────────
  //
  // Wrap in Buffer (Node.js BodyInit-compatible) to satisfy TypeScript 5's
  // stricter Uint8Array<ArrayBufferLike> generic constraint.
  //
  const body = Buffer.from(pdfBytes)

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      body.byteLength.toString(),
      // Prevent caching — the PDF is generated on demand from live DB data.
      'Cache-Control':       'no-store',
    },
  })
}
