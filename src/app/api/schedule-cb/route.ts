import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { generateScheduleCB, type ScheduleCBOptions } from '@/lib/pdf/scheduleCBGenerator'
import { generateScheduleCBPacket } from '@/lib/pdf/scheduleCBPacketGenerator'
import type { InspectorCompletionReportRow } from '@/lib/supabase/inspectorCompletion'
import type { AhjOverlayContext } from '@/lib/inspectorCompletion'
import { normalizeInspectorFirmName } from '@/lib/inspectorFirm'
import { makePlaceholderEvidenceDataUri } from '@/lib/pdf/scheduleCBPacketHelpers'
import type {
  ScheduleCBPacketDocumentRecord,
  ScheduleCBPacketItemRecord,
  ScheduleCBPacketSource,
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
    ahjNotes: (row.ahj_notes as string) ?? undefined,
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

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Absolute origin of the Vero app, used to build in-app Field Note Record links
// inside the generated packet. Prefers the origin the user is actually browsing
// (Origin / forwarded host) so a packet opened on a Preview URL links back to
// the same origin where the viewer's session cookie lives. Falls back to the
// configured app URL, then localhost.
function getAppBaseUrl(req: NextRequest): string {
  const origin = (req.headers.get('origin') ?? '').trim()
  if (origin) return origin.replace(/\/+$/, '')
  const forwardedHost = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '').trim()
  if (forwardedHost) {
    const proto = (req.headers.get('x-forwarded-proto') ?? 'https').trim()
    return `${proto}://${forwardedHost}`.replace(/\/+$/, '')
  }
  return (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '') || 'http://localhost:3000'
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

function numberFrom(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function getReportSignedStageNumbers(row: Record<string, unknown>): number[] {
  const currentStage = numberFrom(row.current_stage) ?? 1
  const payload = row.seal_payload && typeof row.seal_payload === 'object' && !Array.isArray(row.seal_payload)
    ? row.seal_payload as Record<string, unknown>
    : {}
  const stageSignOffs = payload.stageSignOffs

  if (!stageSignOffs || typeof stageSignOffs !== 'object' || Array.isArray(stageSignOffs)) {
    return [currentStage]
  }

  const signedStages = Object.entries(stageSignOffs as Record<string, unknown>)
    .map(([stageKey, rawSignOff]) => {
      const fromPayload = rawSignOff && typeof rawSignOff === 'object' && !Array.isArray(rawSignOff)
        ? numberFrom((rawSignOff as Record<string, unknown>).stageNumber)
        : null
      return fromPayload ?? numberFrom(Number(stageKey))
    })
    .filter((stageNumber): stageNumber is number => stageNumber !== null)

  return signedStages.length > 0
    ? [...new Set(signedStages)].sort((left, right) => left - right)
    : [currentStage]
}

function shouldBuildFullProjectPacket(report: InspectorCompletionReportRow, reportRecord: Record<string, unknown>): boolean {
  const signedStages = getReportSignedStageNumbers(reportRecord)
  return report.currentStage >= report.stageCount || signedStages.includes(report.stageCount)
}

function itemStatusRank(status: unknown): number {
  if (status === 'Passed' || status === 'Failed' || status === 'N/A') return 3
  if (status === 'Pending') return 1
  return 0
}

function filterScopedPacketItemRows(
  rows: Record<string, unknown>[],
  reportStageScopeById: Map<string, Set<number>>,
): Record<string, unknown>[] {
  const deduped = new Map<string, Record<string, unknown>>()

  for (const row of rows) {
    const reportId = typeof row.report_id === 'string' ? row.report_id : null
    const stageNumber = numberFrom(row.stage_number)
    if (!reportId || stageNumber === null) continue
    if (!reportStageScopeById.get(reportId)?.has(stageNumber)) continue

    const itemCode = typeof row.item_code === 'string' ? row.item_code : ''
    const key = `${stageNumber}:${itemCode}`
    const existing = deduped.get(key)
    if (!existing || itemStatusRank(row.inspection_status) > itemStatusRank(existing.inspection_status)) {
      deduped.set(key, row)
    }
  }

  return [...deduped.values()].sort((left, right) => {
    const leftStage = numberFrom(left.stage_number) ?? Number.MAX_SAFE_INTEGER
    const rightStage = numberFrom(right.stage_number) ?? Number.MAX_SAFE_INTEGER
    if (leftStage !== rightStage) return leftStage - rightStage

    const leftSort = numberFrom(left.sort_order) ?? Number.MAX_SAFE_INTEGER
    const rightSort = numberFrom(right.sort_order) ?? Number.MAX_SAFE_INTEGER
    if (leftSort !== rightSort) return leftSort - rightSort

    return String(left.item_code ?? '').localeCompare(String(right.item_code ?? ''))
  })
}

const DISCIPLINE_DISPLAY: Record<string, string> = {
  structural:      'Structural Engineering',
  mechanical:      'Mechanical Engineering',
  electrical:      'Electrical / Field Safety',
  architectural:   'Architectural',
  geotech:         'Geotechnical',
  plumbing:        'Plumbing',
  fire_protection: 'Fire Protection',
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
    id: '775cb186-a1a2-4e11-b333-123456789abc',
    assignmentId: 'a8f37c11-a1a2-4e11-b333-123456789abc',
    jobId: 'e6d0bf5a-a1a2-4e11-b333-123456789abc',
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
    sealReference: 'fdb54dcd-a1a2-4e11-b333-123456789abc',
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
  { itemCode: 'S01-01', itemLabel: 'Site Preparation & Layout', stageNumber: 1, stageName: 'Site Preparation', inspectionStatus: 'Passed', responseNote: 'Verified on site — compliant. Survey control points, setbacks, and excavation limits were visible at the reviewed locations.', ahjNotes: 'Confirm the issued permit set remains available on site for subsequent municipal reviews.' },
  { itemCode: 'S02-01', itemLabel: 'Foundation Formwork and Reinforcement Review', stageNumber: 2, stageName: 'Foundation', inspectionStatus: 'Passed', responseNote: 'Formwork dimensions confirmed. Reinforcing placement, cover, hold-down locations, and embedded services were reviewed before concrete placement.\n\nNo unresolved field observations remained at submission.', ahjNotes: 'Jurisdiction review remains subject to the approved drawings and any required registered-professional field-review letters.' },
  { itemCode: 'S15-01', itemLabel: 'Life-Safety Systems Final Verification', stageNumber: 15, stageName: 'Inspections, Final Approval, and Occupancy', inspectionStatus: 'Passed', responseNote: 'Life-safety systems confirmed operable at reviewed locations. Video evidence records the final walkthrough and visible closeout conditions.', ahjNotes: 'Occupancy authorization remains exclusively with the authority having jurisdiction.' },
]

const DEV_PREVIEW_PHOTO = makePlaceholderEvidenceDataUri('Photo Evidence · S01-01')
const DEV_PREVIEW_DOCUMENTS: ScheduleCBPacketDocumentRecord[] = [
  {
    id: '91e2ac71-a1a2-4e11-b333-123456789abc',
    itemCode: 'S01-01',
    fileName: 'site-layout-control-points.jpg',
    storagePath: 'fixture://site-layout-control-points.jpg',
    mimeType: 'image/jpeg',
    createdAt: '2026-04-12T09:10:00.000Z',
    capturedAt: '2026-04-12T09:10:00.000Z',
    latitude: 49.263521,
    longitude: -123.133812,
    imageUrl: DEV_PREVIEW_PHOTO,
    signedUrl: DEV_PREVIEW_PHOTO,
  },
  {
    id: 'b5d53a92-a1a2-4e11-b333-123456789abc',
    itemCode: 'S02-01',
    fileName: 'foundation-field-observation.txt',
    storagePath: 'fixture://foundation-field-observation.txt',
    mimeType: 'text/plain',
    createdAt: '2026-04-12T09:25:00.000Z',
    capturedAt: '2026-04-12T09:25:00.000Z',
    latitude: 49.263525,
    longitude: -123.133808,
    signedUrl: 'data:text/plain;charset=utf-8,Demonstration%20field%20note%20evidence',
  },
  {
    id: 'c702d8f4-a1a2-4e11-b333-123456789abc',
    itemCode: 'S15-01',
    fileName: 'final-life-safety-walkthrough.mp4',
    storagePath: 'fixture://final-life-safety-walkthrough.mp4',
    mimeType: 'video/mp4',
    createdAt: '2026-04-12T09:42:00.000Z',
    capturedAt: '2026-04-12T09:42:00.000Z',
    latitude: 49.263529,
    longitude: -123.133803,
    signedUrl: 'data:text/plain;charset=utf-8,Demonstration%20video%20evidence',
  },
]

const DEV_PREVIEW_OPTIONS: ScheduleCBOptions = {
  inspectorName:        'Dr. Sarah Chen',
  inspectorLicense:     'DEMONSTRATION CREDENTIAL — BC-ENG-29847',
  discipline:           'Structural Engineering',
  firmName:             'Chen Structural Consulting Ltd.',
  inspectorContact:     '604-555-0198  ·  sarah.chen@veropermit.com',
  inspectorAddress:     '1050 West Hastings Street, Suite 2200',
  inspectorAddressCont: 'Vancouver, BC  V6E 2E9',
  buildingPermitNumber: 'BP-DEV-48219',
}

async function handleDevPreview(
  req: NextRequest,
  variant: 'packet' | 'form-only',
  exportMode: 'platform_preview' | 'authority_facing',
): Promise<NextResponse> {
  if (process.env.VERCEL_ENV === 'production') {
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
        documents: DEV_PREVIEW_DOCUMENTS,
        officialFormOptions: DEV_PREVIEW_OPTIONS,
        brandLogoSrc,
        buildingPermitNumber: 'BP-DEV-48219',
        generatedAtIso: new Date().toISOString(),
        verificationId: 'fdb54dcd-a1a2-4e11-b333-123456789abc',
        exportMode,
        appBaseUrl: getAppBaseUrl(req),
        packetScope: {
          mode: 'full_project',
          stageNumbers: [1, 2, 15],
        },
        builderStage: {
          number: 7,
          label: 'Final Approval and Occupancy',
          total: 7,
        },
        seal: {
          explicitDemo: true,
        },
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
    return handleDevPreview(req, variant, exportMode)
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

  // Fetch the job row upfront: needed for ownership check (builder_id) and
  // permit number resolution. A single query replaces the later conditional fetch.
  const { data: jobRow, error: jobError } = await supabase
    .from(JOBS)
    .select('builder_id, permit_number, project_id, stage, stage_name')
    .eq('id', (reportRecord.job_id as string) ?? '')
    .maybeSingle()

  if (jobError) {
    console.warn('[schedule-cb] Job lookup failed:', jobError)
  }

  const isInspector = reportRecord.inspector_id === user.id
  const isBuilderOwner = Boolean(jobRow?.builder_id && jobRow.builder_id === user.id)

  if (!isInspector && !isBuilderOwner) {
    return NextResponse.json(
      { error: 'Forbidden — you do not own this report' },
      { status: 403 },
    )
  }

  const report = rowToReport(reportRecord)

  // ─── Inspector identity ───────────────────────────────────────────────────
  // The named inspector on a Schedule C-B is always the report's inspector,
  // never the requesting user. When a builder downloads the packet, user.id is
  // the builder — the session profile must not be used as the signatory.
  const svcClient = getServiceClient()
  const reportInspectorId = reportRecord.inspector_id as string

  let inspectorName: string | undefined
  let inspectorLicense: string | undefined
  let discipline: string | undefined
  let firmName: string | undefined
  let inspectorContact: string | undefined
  let inspectorAddress: string | undefined
  let inspectorAddressCont: string | undefined
  let digitalSealPath: string | undefined

  if (isInspector) {
    // Requesting user is the inspector — read own profile + user_metadata.
    let profileRow: Record<string, unknown> | null = null
    try {
      const [profileResult, sealResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('first_name, last_name, inspector_license_no, firm_name')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('digital_seal_url')
          .eq('id', user.id)
          .maybeSingle(),
      ])
      const profileData = profileResult.data
      profileRow = (profileData as Record<string, unknown> | null) ?? null
      const sealData = sealResult.data as Record<string, unknown> | null
      if (sealData?.digital_seal_url) {
        profileRow = { ...(profileRow ?? {}), digital_seal_url: sealData.digital_seal_url }
      }
    } catch {
      console.warn('[schedule-cb] profiles lookup failed — falling back to user_metadata')
    }

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>

    const profileFirstName = typeof profileRow?.first_name === 'string' ? profileRow.first_name.trim() : ''
    const profileLastName = typeof profileRow?.last_name === 'string' ? profileRow.last_name.trim() : ''
    const profileFullName = [profileFirstName, profileLastName].filter(Boolean).join(' ')

    // Resolve inspector name: profiles > user_metadata > email local-part
    inspectorName =
      profileFullName ||
      pickMeta(meta, 'name') ||
      (() => {
        // Never use a raw email address as a display name on legal documents
        const localPart = user.email?.split('@')[0] ?? ''
        return localPart.replace(/[+_.-]+/g, ' ').trim() || undefined
      })()

    // Resolve license: profiles.inspector_license_no > user_metadata
    inspectorLicense =
      (typeof profileRow?.inspector_license_no === 'string' && profileRow.inspector_license_no.trim()
        ? profileRow.inspector_license_no.trim()
        : undefined) ??
      pickMeta(meta, 'licenseNumber', 'license_number')

    discipline = pickMeta(meta, 'designation')
      ?? (Array.isArray(meta.disciplines) && meta.disciplines.length > 0 ? String(meta.disciplines[0]) : undefined)
    firmName = normalizeInspectorFirmName(profileRow?.firm_name)
      ?? normalizeInspectorFirmName(pickMeta(meta, 'company', 'firm', 'firm_name'))
    digitalSealPath = typeof profileRow?.digital_seal_url === 'string' && profileRow.digital_seal_url.trim()
      ? profileRow.digital_seal_url.trim()
      : undefined
    const phone = pickMeta(meta, 'phone')
    const email = user.email ?? undefined
    inspectorContact = phone && email ? `${phone} · ${email}` : phone ?? email
    inspectorAddress = pickMeta(meta, 'address', 'office_address')
    inspectorAddressCont = pickMeta(meta, 'address_cont', 'office_address_cont', 'city_province_postal')
  } else {
    // Requesting user is the builder — use service role to read the inspector's
    // profile and onboarding record. The session client cannot read another
    // user's rows through RLS.
    let inspProfileRow: Record<string, unknown> | null = null
    let onboardingRow: Record<string, unknown> | null = null

    if (svcClient) {
      const [profileResult, onboardingResult] = await Promise.allSettled([
        svcClient
          .from('profiles')
          .select('first_name, last_name, inspector_license_no, license_number, firm_name, email, phone, digital_seal_url')
          .eq('id', reportInspectorId)
          .maybeSingle(),
        svcClient
          .from('inspector_onboarding_status')
          .select('license_number, disciplines, contact_email, contact_phone')
          .eq('user_id', reportInspectorId)
          .maybeSingle(),
      ])

      if (profileResult.status === 'fulfilled') {
        inspProfileRow = (profileResult.value.data as Record<string, unknown> | null) ?? null
      } else {
        console.warn('[schedule-cb] Inspector profile lookup (service role) failed')
      }
      if (onboardingResult.status === 'fulfilled') {
        onboardingRow = (onboardingResult.value.data as Record<string, unknown> | null) ?? null
      } else {
        console.warn('[schedule-cb] Inspector onboarding lookup (service role) failed')
      }
    }

    const inspFirstName = typeof inspProfileRow?.first_name === 'string' ? inspProfileRow.first_name.trim() : ''
    const inspLastName = typeof inspProfileRow?.last_name === 'string' ? inspProfileRow.last_name.trim() : ''
    const inspProfileFullName = [inspFirstName, inspLastName].filter(Boolean).join(' ')
    // sealPayload.sealedBy is the inspector's display name recorded at seal time — reliable fallback.
    const sealedByName = typeof report.sealPayload?.sealedBy === 'string'
      ? (report.sealPayload.sealedBy as string).trim()
      : ''

    inspectorName = inspProfileFullName || sealedByName || undefined

    // License: profiles.inspector_license_no → profiles.license_number → onboarding.license_number
    inspectorLicense =
      (typeof inspProfileRow?.inspector_license_no === 'string' && inspProfileRow.inspector_license_no.trim()
        ? inspProfileRow.inspector_license_no.trim()
        : undefined) ??
      (typeof inspProfileRow?.license_number === 'string' && inspProfileRow.license_number.trim()
        ? inspProfileRow.license_number.trim()
        : undefined) ??
      (typeof onboardingRow?.license_number === 'string' && onboardingRow.license_number.trim()
        ? onboardingRow.license_number.trim()
        : undefined)

    // Discipline: map stored codes from onboarding.disciplines to readable labels.
    const rawDisciplines = Array.isArray(onboardingRow?.disciplines)
      ? (onboardingRow.disciplines as unknown[]).filter((d): d is string => typeof d === 'string')
      : []
    discipline = rawDisciplines.length > 0
      ? rawDisciplines.map(d => DISCIPLINE_DISPLAY[d] ?? d).join(', ')
      : undefined

    // Firm: profiles.firm_name only — no other accessible source, not fabricated.
    firmName = normalizeInspectorFirmName(inspProfileRow?.firm_name)
    digitalSealPath = typeof inspProfileRow?.digital_seal_url === 'string' && inspProfileRow.digital_seal_url.trim()
      ? inspProfileRow.digital_seal_url.trim()
      : undefined

    // Contact: onboarding contact fields → profiles email/phone
    const onboardingPhone = typeof onboardingRow?.contact_phone === 'string' && onboardingRow.contact_phone.trim()
      ? onboardingRow.contact_phone.trim() : undefined
    const onboardingEmail = typeof onboardingRow?.contact_email === 'string' && onboardingRow.contact_email.trim()
      ? onboardingRow.contact_email.trim() : undefined
    const profilePhone = typeof inspProfileRow?.phone === 'string' && inspProfileRow.phone.trim()
      ? inspProfileRow.phone.trim() : undefined
    const profileEmail = typeof inspProfileRow?.email === 'string' && inspProfileRow.email.trim()
      ? inspProfileRow.email.trim() : undefined

    const resolvedPhone = onboardingPhone ?? profilePhone
    const resolvedEmail = onboardingEmail ?? profileEmail
    inspectorContact = resolvedPhone && resolvedEmail
      ? `${resolvedPhone} · ${resolvedEmail}`
      : resolvedPhone ?? resolvedEmail

    inspectorAddress = undefined
    inspectorAddressCont = undefined
  }

  let actualSealSrc: string | undefined
  if (digitalSealPath) {
    const { data: sealBlob, error: sealDownloadError } = await (svcClient ?? supabase).storage
      .from(STORAGE_BUCKET)
      .download(digitalSealPath)

    if (sealDownloadError || !sealBlob) {
      console.warn('[schedule-cb] Professional seal download failed — statutory seal area will remain blank.')
    } else if (sealBlob.type === 'image/png' || sealBlob.type === 'image/jpeg' || sealBlob.type === 'image/jpg') {
      const sealBytes = Buffer.from(await sealBlob.arrayBuffer())
      const sealMimeType = sealBlob.type === 'image/jpg' ? 'image/jpeg' : sealBlob.type
      actualSealSrc = `data:${sealMimeType};base64,${sealBytes.toString('base64')}`
    } else {
      console.warn('[schedule-cb] Professional seal is not a supported PNG or JPEG image — statutory seal area will remain blank.')
    }
  }

  const buildingPermitNumber = permitNumberFromQuery ?? ((jobRow?.permit_number as string) ?? undefined)
  const builderStageNumber = typeof jobRow?.stage === 'number' ? jobRow.stage : undefined
  const builderStageLabel = typeof jobRow?.stage_name === 'string' ? jobRow.stage_name : undefined

  const officialFormOptions: ScheduleCBOptions = {
    inspectorName,
    inspectorLicense,
    discipline,
    firmName,
    inspectorContact,
    inspectorAddress,
    inspectorAddressCont,
    buildingPermitNumber,
    sealImageSrc: actualSealSrc,
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

  // Derive project scope for binder aggregation.
  // projectId is nullable — older or monolithic reports may not have it set.
  const projectId = (jobRow?.project_id as string | null) ?? null

  try {
    let pdfBytes: Uint8Array

    if (variant === 'form-only') {
      pdfBytes = await generateScheduleCB(report, officialFormOptions)
    } else {
      const brandLogoSrc = await loadBrandLogoDataUri()

      const fullProjectPacket = shouldBuildFullProjectPacket(report, reportRecord)
      const primarySignedStages = getReportSignedStageNumbers(reportRecord)
      let allReportIds: string[] = [report.id]
      const reportStageScopeById = new Map<string, Set<number>>([
        [report.id, new Set(primarySignedStages)],
      ])
      let packetScope: ScheduleCBPacketSource['packetScope'] = {
        mode: fullProjectPacket ? 'full_project' : 'stage_level',
        stageNumbers: primarySignedStages,
      }

      // ── Final/full sibling report aggregation ─────────────────────────────
      // For final scoped projects each builder stage can produce its own
      // submitted report. A full packet includes only each report's signed stage
      // slice, avoiding future Pending rows from each report's full checklist.
      if (fullProjectPacket && projectId && svcClient) {
        try {
          const { data: siblingJobs } = await svcClient
            .from(JOBS)
            .select('id')
            .eq('project_id', projectId)
            .eq('builder_id', String(jobRow?.builder_id ?? ''))

          // The root/Stage-1 job has project_id = NULL so it is not returned by
          // the query above. Seed the set with the primary job and projectId
          // (which IS the root job id in this model) before appending query results.
          const jobIdSet = new Set<string>([report.jobId, projectId])
          for (const j of (siblingJobs as { id: string }[] | null) ?? []) {
            jobIdSet.add(j.id)
          }

          const { data: siblingReports } = await svcClient
            .from(REPORTS)
            .select('id, current_stage, seal_payload')
            .in('job_id', [...jobIdSet])
            .in('status', ['submitted', 'sealed'])
            .order('current_stage', { ascending: true })

          if (siblingReports && siblingReports.length > 0) {
            const siblingIds = (siblingReports as Array<Record<string, unknown>>)
              .map(r => typeof r.id === 'string' ? r.id : null)
              .filter((id): id is string => id !== null)
            allReportIds = [...new Set([...siblingIds, report.id])]
            for (const siblingReport of siblingReports as Array<Record<string, unknown>>) {
              const siblingReportId = typeof siblingReport.id === 'string' ? siblingReport.id : null
              if (!siblingReportId) continue
              reportStageScopeById.set(siblingReportId, new Set(getReportSignedStageNumbers(siblingReport)))
            }
            reportStageScopeById.set(report.id, new Set(primarySignedStages))
            packetScope = {
              mode: 'full_project',
              stageNumbers: [...new Set(
                [...reportStageScopeById.values()].flatMap(stageSet => [...stageSet])
              )].sort((left, right) => left - right),
            }
          }
        } catch {
          console.warn('[schedule-cb] Sibling report aggregation failed — falling back to single report')
          allReportIds = [report.id]
          reportStageScopeById.clear()
          reportStageScopeById.set(report.id, new Set(primarySignedStages))
          packetScope = {
            mode: fullProjectPacket ? 'full_project' : 'stage_level',
            stageNumbers: primarySignedStages,
          }
        }
      }

      const dbClient = svcClient ?? supabase
      const [{ data: itemRows, error: itemsError }, { data: documentRows, error: documentsError }] = await Promise.all([
        dbClient
          .from(ITEMS)
          .select('report_id, item_code, item_label, response_note, ahj_notes, stage_number, stage_name, inspection_status, sort_order')
          .in('report_id', allReportIds)
          .order('stage_number', { ascending: true })
          .order('sort_order', { ascending: true }),
        dbClient
          .from(DOCUMENTS)
          .select('*')
          .in('report_id', allReportIds)
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

      const packetItems = filterScopedPacketItemRows(
        (itemRows as Record<string, unknown>[] | null) ?? [],
        reportStageScopeById,
      ).map(toPacketItem)
      const packetItemCodes = new Set(packetItems.map(item => item.itemCode))
      const rawDocuments = ((documentRows as Record<string, unknown>[] | null) ?? [])
        .map(toPacketDocument)
        .filter(document => packetItemCodes.has(document.itemCode))

      // 7-day signed URLs for every evidence document — powers the clickable
      // hyperlinks in the appendix (and the inline <img> preview for images).
      const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7
      const packetDocuments = await Promise.all(rawDocuments.map(async document => {
        if (!document.storagePath) return document

        const { data, error } = await (svcClient ?? supabase).storage
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
        appBaseUrl: getAppBaseUrl(req),
        packetScope,
        builderStage: builderStageNumber
          ? {
              number: builderStageNumber,
              label: builderStageLabel,
              total: 7,
            }
          : undefined,
        seal: {
          actualSealSrc,
        },
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
