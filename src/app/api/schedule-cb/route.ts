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
  const logoPath = path.join(process.cwd(), 'public', 'vero-logo-dark.png')
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
  }
}

function toPacketDocument(row: Record<string, unknown>): ScheduleCBPacketDocumentRecord {
  const captureGeo = (row.capture_geo as Record<string, unknown> | null) ?? null
  return {
    id: row.id as string,
    itemCode: row.item_code as string,
    fileName: row.file_name as string,
    storagePath: row.storage_path as string,
    mimeType: (row.mime_type as string) ?? undefined,
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

export async function GET(req: NextRequest) {
  const reportId = req.nextUrl.searchParams.get('reportId')
  const variant = req.nextUrl.searchParams.get('variant') === 'form-only' ? 'form-only' : 'packet'
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
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const inspectorName = pickMeta(meta, 'name') ?? user.email?.split('@')[0]
  const inspectorLicense = pickMeta(meta, 'licenseNumber', 'license_number')
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

  try {
    let pdfBytes: Uint8Array

    if (variant === 'form-only') {
      pdfBytes = await generateScheduleCB(report, officialFormOptions)
    } else {
      const brandLogoSrc = await loadBrandLogoDataUri()
      const [{ data: itemRows, error: itemsError }, { data: documentRows, error: documentsError }] = await Promise.all([
        supabase
          .from(ITEMS)
          .select('item_code, item_label, response_note, stage_number, stage_name')
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

      const packetDocuments = await Promise.all(rawDocuments.map(async document => {
        if (!document.mimeType?.startsWith('image/')) return document

        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(document.storagePath, 60 * 10)

        if (error) {
          console.warn('[schedule-cb] Signed URL generation failed:', document.storagePath, error)
          return document
        }

        return {
          ...document,
          imageUrl: data.signedUrl,
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
