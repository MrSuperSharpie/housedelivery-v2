import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@/lib/supabase/server'
import { generateScheduleCB, type ScheduleCBOptions } from '@/lib/pdf/scheduleCBGenerator'
import { generateScheduleCBPacket } from '@/lib/pdf/scheduleCBPacketGenerator'
import type { InspectorCompletionReportRow } from '@/lib/supabase/inspectorCompletion'
import type { AhjOverlayContext } from '@/lib/inspectorCompletion'
import type {
  ScheduleCBPacketDocumentRecord,
  ScheduleCBPacketItemRecord,
} from '@/lib/pdf/scheduleCBPacketTypes'

const REPORTS = 'inspector_completion_reports'
const ITEMS = 'inspector_completion_stage_items'
const DOCUMENTS = 'inspector_completion_documents'
const JOBS = 'job_opportunities'
const STORAGE_BUCKET = 'inspection-evidence'

async function loadBrandLogoDataUri(): Promise<string> {
  const logoPath = path.join(process.cwd(), 'public', 'vero-permit-light.png')
  const buffer = await readFile(logoPath)
  return `data:image/png;base64,${buffer.toString('base64')}`
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
    sealedAt: (row.sealed_at as string) ?? undefined,
    lastSavedAt: (row.last_saved_at as string) ?? new Date().toISOString(),
    submittedAt: (row.submitted_at as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function pickMeta(meta: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = meta[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

function toPacketItem(row: Record<string, unknown>): ScheduleCBPacketItemRecord {
  return {
    itemCode: row.item_code as string,
    itemLabel: row.item_label as string,
    responseNote: (row.response_note as string) ?? undefined,
    stageNumber: (row.stage_number as number) ?? 0,
    stageName: (row.stage_name as string) ?? '',
    inspectionStatus: (row.inspection_status as 'Pending' | 'Passed' | 'Failed' | 'N/A') ?? undefined,
  }
}

/**
 * Returns the names of required authority-facing fields that are missing.
 * An empty array means the export is safe to proceed.
 *
 * Required for a Schedule C-B authority-facing submission:
 *   - inspectorName      — signatory identity
 *   - inspectorLicense   — licence/registration number (BC practice standard)
 *   - discipline         — professional discipline (form field + AHJ expectation)
 *   - firmName           — firm or practice name (Schedule C-B "Print name of firm")
 *   - inspectorContact   — phone/email so AHJ can reach the RP
 */
function missingAuthorityFields(options: ScheduleCBOptions): string[] {
  const missing: string[] = []
  if (!options.inspectorName?.trim()) missing.push('Inspector name')
  if (!options.inspectorLicense?.trim()) missing.push('License or registration number')
  if (!options.discipline?.trim()) missing.push('Professional discipline')
  if (!options.firmName?.trim()) missing.push('Firm or practice name')
  if (!options.inspectorContact?.trim()) missing.push('Contact information (phone or email)')
  return missing
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  avif: 'image/avif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  pdf: 'application/pdf',
}

function inferMimeType(storedMime: string | null | undefined, fileName: string): string | undefined {
  if (storedMime) return storedMime
  const ext = fileName.toLowerCase().split('.').pop()
  return ext ? MIME_BY_EXT[ext] : undefined
}

function toPacketDocument(row: Record<string, unknown>): ScheduleCBPacketDocumentRecord {
  const captureGeo = (row.capture_geo as Record<string, unknown> | null) ?? null
  const fileName = row.file_name as string
  const mimeType = inferMimeType(row.mime_type as string | null | undefined, fileName)
  return {
    id: row.id as string,
    itemCode: row.item_code as string,
    fileName,
    storagePath: (row.storage_path as string | null) ?? '',
    mimeType,
    createdAt: row.created_at as string,
    capturedAt: (row.original_captured_at as string) ?? undefined,
    latitude: typeof captureGeo?.latitude === 'number' ? captureGeo.latitude : null,
    longitude: typeof captureGeo?.longitude === 'number' ? captureGeo.longitude : null,
  }
}

function buildFileName(projectName: string, variant: 'packet' | 'form-only'): string {
  const safeName = projectName
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '_') || 'Schedule_CB'

  return variant === 'packet'
    ? `Schedule_CB_Packet_${safeName}.pdf`
    : `Schedule_CB_${safeName}.pdf`
}

// ─── Dev preview shortcut ────────────────────────────────────────────────────
// Accessible only in non-production environments.
// Usage: GET /api/schedule-cb?preview=true[&variant=form-only]
// Bypasses auth and Supabase — uses the same hardcoded dummy data as the
// local smoke-test script so you can paste the URL directly into a browser.

const DEV_PREVIEW_OVERLAY: AhjOverlayContext = {
  type: 'vancouver',
  label: 'City of Vancouver (CoV)',
  jurisdictionName: 'City of Vancouver',
  signals: ['cov_detected'],
  summary: 'City of Vancouver AHJ overlay active. Schedule C-B required for all Part 5 field reviews.',
}

const DEV_PREVIEW_REPORT: InspectorCompletionReportRow = (() => {
  const ts = '2026-04-12T10:00:00.000Z'
  return {
    id: 'dev-preview-report',
    assignmentId: 'dev-preview',
    jobId: 'dev-preview-job',
    inspectorId: 'dev-preview-inspector',
    projectId: 'dev-preview-project',
    projectName: 'West 8th Mixed-Use Podium',
    address: '1288 W 8th Ave',
    city: 'Vancouver',
    region: 'Lower Mainland',
    projectType: 'SFH',
    currentStage: 15,
    stageCount: 15,
    jurisdictionName: 'City of Vancouver',
    ahjOverlayType: 'vancouver',
    ahjOverlayLabel: 'City of Vancouver (CoV)',
    overlaySnapshot: DEV_PREVIEW_OVERLAY,
    checklistSnapshot: [],
    status: 'sealed',
    sealApplied: true,
    sealReference: 'VERO-IC-2026-A3F9B1',
    sealPayload: {
      overallResult: 'pass',
      sealedAt: ts,
      sealedBy: 'Dr. Sarah Chen',
      sealedById: 'dev-preview-inspector',
      stageSignOffs: {},
      holdHistory: [
        {
          holdId: 'hold-dev-preview-1',
          placedAt: '2026-04-12T08:15:00.000Z',
          status: 'hold_resolved_pass',
          reason: 'Vent support deficiency found during Stage 15 final review.',
          deficiencyReason: 'Mechanical vent at final run lacks code-required support within 300 mm of terminal. Contractor agreed to correct on site.',
          category: 'minor_deficiency',
          affectedItemSummaries: ['Gas venting routed and supported?', 'Mechanical penetrations sealed?'],
          builderAcceptedAt: '2026-04-12T08:20:00.000Z',
          premiumRateType: 'hourly',
          premiumRateAmount: 120,
          holdCapAmount: 180,
          actualRetainedMinutes: 37,
          premiumChargeAmount: 74,
          resolution: 'pass',
          resolutionNotes: 'Vent support bracket installed and confirmed secure. Inspector re-reviewed. Compliant.',
          holdEndedAt: '2026-04-12T08:52:00.000Z',
          events: [
            {
              eventType: 'hold_created',
              actorRole: 'inspector',
              actorId: 'dev-preview-inspector',
              note: 'Vent support deficiency identified. Hold placed pending on-site correction.',
              createdAt: '2026-04-12T08:15:00.000Z',
            },
            {
              eventType: 'hold_resolved_pass',
              actorRole: 'inspector',
              actorId: 'dev-preview-inspector',
              note: 'Correction complete. Support bracket installed and confirmed compliant on re-review.',
              createdAt: '2026-04-12T08:52:00.000Z',
            },
          ],
        },
      ],
    },
    lastSavedAt: ts,
    submittedAt: ts,
    createdAt: ts,
    updatedAt: ts,
  }
})()

const DEV_PREVIEW_ITEMS: ScheduleCBPacketItemRecord[] = [
  { itemCode: 'S01-01', itemLabel: 'Site Preparation & Layout',  stageNumber: 1,  stageName: 'Site Preparation',  responseNote: 'Verified on site — compliant.' },
  { itemCode: 'S02-01', itemLabel: 'Foundation Formwork',        stageNumber: 2,  stageName: 'Foundation',         responseNote: 'Formwork dimensions confirmed.' },
  { itemCode: 'S15-01', itemLabel: 'Final Occupancy Inspection', stageNumber: 15, stageName: 'Final Occupancy',    responseNote: 'All items resolved.' },
]

const DEV_PREVIEW_OPTIONS: ScheduleCBOptions = {
  inspectorName:        'Dr. Sarah Chen',
  inspectorLicense:     'BC-ENG-29847',
  discipline:           'Structural Engineering',
  firmName:             'Chen Structural Consulting Ltd.',
  inspectorContact:     '604-555-0198  ·  sarah.chen@veropermit.com',
  inspectorAddress:     '1050 West Hastings Street, Suite 2200',
  inspectorAddressCont: 'Vancouver, BC  V6E 2E9',
  buildingPermitNumber: 'BP-DEV-48219',
}

async function handleDevPreview(
  variant: 'packet' | 'form-only',
  exportMode: 'platform_preview' | 'authority_facing',
): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Preview mode is not available in production' }, { status: 403 })
  }

  try {
    let pdfBytes: Uint8Array
    if (variant === 'form-only') {
      pdfBytes = await generateScheduleCB(DEV_PREVIEW_REPORT, DEV_PREVIEW_OPTIONS)
    } else {
      const brandLogoSrc = await loadBrandLogoDataUri()
      pdfBytes = await generateScheduleCBPacket({
        report: DEV_PREVIEW_REPORT,
        items: DEV_PREVIEW_ITEMS,
        documents: [],
        officialFormOptions: DEV_PREVIEW_OPTIONS,
        brandLogoSrc,
        buildingPermitNumber: 'BP-DEV-48219',
        generatedAtIso: new Date().toISOString(),
        verificationId: 'VERO-IC-2026-A3F9B1',
        exportMode,
      })
    }

    const body = Buffer.from(pdfBytes)
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        // inline — renders in the browser tab rather than forcing a download
        'Content-Disposition': 'inline; filename="Schedule_CB_DEV_PREVIEW.pdf"',
        'Content-Length': body.byteLength.toString(),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[schedule-cb] Dev preview generation failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Dev preview generation failed' },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  const variant = req.nextUrl.searchParams.get('variant') === 'form-only' ? 'form-only' : 'packet'
  const exportMode: 'platform_preview' | 'authority_facing' =
    req.nextUrl.searchParams.get('mode') === 'authority_facing' ? 'authority_facing' : 'platform_preview'

  // Dev preview shortcut — no auth, no DB
  if (req.nextUrl.searchParams.get('preview') === 'true') {
    return handleDevPreview(variant, exportMode)
  }

  const reportId = req.nextUrl.searchParams.get('reportId')
  const permitNumberFromQuery = req.nextUrl.searchParams.get('permitNumber') ?? undefined

  if (!reportId || reportId.trim() === '') {
    return NextResponse.json(
      { error: 'Missing required query parameter: reportId' },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  const user = authData.user

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized — valid session required' },
      { status: 401 },
    )
  }

  const { data: reportRow, error: reportError } = await supabase
    .from(REPORTS)
    .select('*')
    .eq('id', reportId.trim())
    .maybeSingle()

  if (reportError) {
    console.error('[schedule-cb] Supabase fetch error:', reportError)
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 },
    )
  }

  if (!reportRow) {
    return NextResponse.json(
      { error: `Report not found: ${reportId}` },
      { status: 404 },
    )
  }

  const reportRecord = reportRow as Record<string, unknown>
  if (reportRecord.inspector_id !== user.id) {
    return NextResponse.json(
      { error: 'Forbidden — you do not own this report' },
      { status: 403 },
    )
  }

  const report = rowToReport(reportRecord)

  // ─── Identity: prefer profiles table over raw auth metadata ────────────────
  // user_metadata is populated at sign-up and may be stale or absent for some
  // accounts. The profiles table is the authoritative source for inspector
  // identity fields needed by the Schedule C-B.
  let profileRow: Record<string, unknown> | null = null
  try {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('first_name, last_name, inspector_license_no')
      .eq('id', user.id)
      .maybeSingle()
    profileRow = (profileData as Record<string, unknown> | null) ?? null
  } catch {
    console.warn('[schedule-cb] profiles lookup failed — falling back to user_metadata')
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>

  const profileFirstName = typeof profileRow?.first_name === 'string' ? profileRow.first_name.trim() : ''
  const profileLastName = typeof profileRow?.last_name === 'string' ? profileRow.last_name.trim() : ''
  const profileFullName = [profileFirstName, profileLastName].filter(Boolean).join(' ')

  // Resolve inspector name: profiles > user_metadata > email local-part
  const inspectorName =
    profileFullName ||
    pickMeta(meta, 'name') ||
    (() => {
      // Never use a raw email address as a display name on legal documents
      const localPart = user.email?.split('@')[0] ?? ''
      return localPart.replace(/[+_.-]+/g, ' ').trim() || undefined
    })()

  // Resolve license: profiles.inspector_license_no > user_metadata
  const inspectorLicense =
    (typeof profileRow?.inspector_license_no === 'string' && profileRow.inspector_license_no.trim()
      ? profileRow.inspector_license_no.trim()
      : undefined) ??
    pickMeta(meta, 'licenseNumber', 'license_number')

  const discipline = pickMeta(meta, 'designation')
    ?? (Array.isArray(meta.disciplines) && meta.disciplines.length > 0 ? String(meta.disciplines[0]) : undefined)
  const firmName = pickMeta(meta, 'company', 'firm', 'firm_name')
  const phone = pickMeta(meta, 'phone')
  const email = user.email ?? undefined
  const inspectorContact = phone && email ? `${phone} · ${email}` : phone ?? email
  const inspectorAddress = pickMeta(meta, 'address', 'office_address')
  const inspectorAddressCont = pickMeta(meta, 'address_cont', 'office_address_cont', 'city_province_postal')

  let buildingPermitNumber = permitNumberFromQuery
  if (!buildingPermitNumber) {
    const { data: jobRow, error: jobError } = await supabase
      .from(JOBS)
      .select('permit_number')
      .eq('id', report.jobId)
      .maybeSingle()

    if (jobError) {
      console.warn('[schedule-cb] Permit number lookup failed:', jobError)
    } else {
      buildingPermitNumber = (jobRow?.permit_number as string) ?? undefined
    }
  }

  const officialFormOptions: ScheduleCBOptions = {
    inspectorName,
    inspectorLicense,
    discipline,
    firmName,
    inspectorContact,
    inspectorAddress,
    inspectorAddressCont,
    buildingPermitNumber,
  }

  // Authority-facing exports require complete professional credentials.
  // Missing mandatory fields are not silently omitted — the export is blocked.
  if (exportMode === 'authority_facing') {
    const missing = missingAuthorityFields(officialFormOptions)
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: 'Authority-facing export requires complete professional credentials. Update your profile and retry.',
          missingFields: missing,
        },
        { status: 400 },
      )
    }
  }

  try {
    let pdfBytes: Uint8Array

    if (variant === 'form-only') {
      pdfBytes = await generateScheduleCB(report, officialFormOptions)
    } else {
      const brandLogoSrc = await loadBrandLogoDataUri()
      const [{ data: itemRows, error: itemsError }, { data: documentRows, error: documentsError }] = await Promise.all([
        supabase
          .from(ITEMS)
          .select('item_code, item_label, response_note, stage_number, stage_name, inspection_status')
          .eq('report_id', report.id)
          .order('stage_number', { ascending: true })
          .order('sort_order', { ascending: true }),
        supabase
          .from(DOCUMENTS)
          .select('*')
          .eq('report_id', report.id)
          .order('created_at', { ascending: true }),
      ])

      if (itemsError) {
        console.error('[schedule-cb] Failed to fetch stage items:', itemsError)
        return NextResponse.json(
          { error: 'Failed to fetch packet checklist data' },
          { status: 500 },
        )
      }

      if (documentsError) {
        console.error('[schedule-cb] Failed to fetch packet documents:', documentsError)
        return NextResponse.json(
          { error: 'Failed to fetch packet evidence data' },
          { status: 500 },
        )
      }

      const packetItems = ((itemRows as Record<string, unknown>[] | null) ?? []).map(toPacketItem)
      const rawDocuments = ((documentRows as Record<string, unknown>[] | null) ?? []).map(toPacketDocument)

      // 7-day signed URLs for every evidence document — powers the clickable
      // hyperlinks in the appendix (and the inline <img> preview for images).
      const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7
      const packetDocuments = await Promise.all(rawDocuments.map(async document => {
        if (!document.storagePath) return document

        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(document.storagePath, SIGNED_URL_TTL_SECONDS)

        if (error) {
          console.warn('[schedule-cb] Signed URL generation failed:', document.storagePath, error)
          return document
        }

        const isImage = document.mimeType?.startsWith('image/') ?? false
        return {
          ...document,
          signedUrl: data.signedUrl,
          imageUrl: isImage ? data.signedUrl : document.imageUrl,
        }
      }))

      pdfBytes = await generateScheduleCBPacket({
        report,
        items: packetItems,
        documents: packetDocuments,
        officialFormOptions,
        brandLogoSrc,
        buildingPermitNumber,
        generatedAtIso: new Date().toISOString(),
        verificationId: report.sealReference ?? report.id,
        exportMode,
      })
    }

    const body = Buffer.from(pdfBytes)

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${buildFileName(report.projectName, variant)}"`,
        'Content-Length': body.byteLength.toString(),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[schedule-cb] PDF generation failed:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'PDF generation failed',
      },
      { status: 500 },
    )
  }
}
