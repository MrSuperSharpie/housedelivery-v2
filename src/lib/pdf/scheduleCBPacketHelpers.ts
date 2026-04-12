import type { InspectorCompletionReportRow } from '@/lib/supabase/inspectorCompletion'
import { SCHEDULE_CB_PACKET_TEMPLATE_MANIFEST } from './scheduleCBPacketTemplateManifest'
import type {
  ScheduleCBPacketAppendixEntry,
  ScheduleCBPacketData,
  ScheduleCBPacketDocumentRecord,
  ScheduleCBPacketItemRecord,
  ScheduleCBPacketSource,
} from './scheduleCBPacketTypes'

export const APPENDIX_PAGE_SIZE = 4

interface StageSignOffPayload {
  stageNumber?: number
  signedAt?: string
  latitude?: number | null
  longitude?: number | null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function formatCoordinates(latitude?: number | null, longitude?: number | null): string {
  const lat = asNumber(latitude)
  const lng = asNumber(longitude)
  if (lat === null || lng === null) return 'Not captured'
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

export function formatForensicTimestamp(value?: string | null): string {
  if (!value) return 'Not captured'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not captured'
  return date.toISOString()
}

export function formatDisplayTimestamp(value?: string | null): string {
  if (!value) return 'Not captured'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not captured'

  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).formatToParts(date)

  const valueByType = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${valueByType.month} ${valueByType.day}, ${valueByType.year} ${valueByType.hour}:${valueByType.minute}:${valueByType.second} UTC`
}

export function toDisplayFileKind(mimeType?: string, fileName?: string): string {
  if (mimeType?.startsWith('image/')) return 'Photo Evidence'
  if (mimeType?.startsWith('video/')) return 'Video Evidence'
  if (mimeType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf')) return 'PDF Attachment'
  if (mimeType?.startsWith('text/')) return 'Field Note'
  return 'Evidence Attachment'
}

export function chunkAppendixEntries<T>(entries: T[], size = APPENDIX_PAGE_SIZE): T[][] {
  if (size <= 0) return [entries]
  const chunks: T[][] = []
  for (let index = 0; index < entries.length; index += size) {
    chunks.push(entries.slice(index, index + size))
  }
  return chunks
}

export function makePlaceholderEvidenceDataUri(label: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <rect width="1200" height="900" fill="#f4f1ea"/>
      <rect x="48" y="48" width="1104" height="804" rx="28" fill="#ffffff" stroke="#1f2937" stroke-width="3"/>
      <line x1="96" y1="160" x2="1104" y2="160" stroke="#d1d5db" stroke-width="2"/>
      <line x1="96" y1="220" x2="1104" y2="220" stroke="#e5e7eb" stroke-width="2"/>
      <line x1="96" y1="280" x2="1104" y2="280" stroke="#e5e7eb" stroke-width="2"/>
      <text x="96" y="118" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#111827">Vero Permit Appendix Fixture</text>
      <text x="96" y="420" font-family="Helvetica, Arial, sans-serif" font-size="72" font-weight="700" fill="#111827">${label}</text>
      <text x="96" y="494" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#4b5563">Placeholder evidence preview for PDF layout testing</text>
    </svg>
  `.trim()

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function pickLatestStageSignOff(payload: Record<string, unknown>): StageSignOffPayload | null {
  const candidate = payload.stageSignOffs
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null

  const signOffs = Object.values(candidate as Record<string, unknown>)
    .filter((entry): entry is StageSignOffPayload => typeof entry === 'object' && entry !== null)
    .sort((left, right) => {
      const leftStage = left.stageNumber ?? 0
      const rightStage = right.stageNumber ?? 0
      if (leftStage !== rightStage) return rightStage - leftStage
      return String(right.signedAt ?? '').localeCompare(String(left.signedAt ?? ''))
    })

  return signOffs[0] ?? null
}

export function extractAuditCoordinates(report: InspectorCompletionReportRow): {
  latitude: number | null
  longitude: number | null
  source: string
} {
  const certifiedLocation = (report.sealPayload.certifiedLocation as Record<string, unknown> | undefined) ?? undefined
  const certifiedLat = asNumber(certifiedLocation?.latitude)
  const certifiedLng = asNumber(certifiedLocation?.longitude)
  if (certifiedLat !== null && certifiedLng !== null) {
    return {
      latitude: certifiedLat,
      longitude: certifiedLng,
      source: 'Certified seal location',
    }
  }

  const latestSignOff = pickLatestStageSignOff(report.sealPayload)
  if (latestSignOff) {
    return {
      latitude: asNumber(latestSignOff.latitude),
      longitude: asNumber(latestSignOff.longitude),
      source: `Stage ${latestSignOff.stageNumber ?? report.currentStage} sign-off`,
    }
  }

  return {
    latitude: null,
    longitude: null,
    source: 'No GPS coordinate captured',
  }
}

function buildRequirementReference(item?: ScheduleCBPacketItemRecord): string {
  if (!item) return 'Unmapped requirement reference'
  return `Stage ${item.stageNumber} · ${item.itemCode} — ${item.itemLabel}`
}

function buildAppendixCaption(
  document: ScheduleCBPacketDocumentRecord,
  item?: ScheduleCBPacketItemRecord,
): string {
  const base = item?.responseNote?.trim() || item?.itemLabel || document.fileName
  return compactWhitespace(base)
}

function normalizeIso(value: string | undefined, fallback: string): string {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

export function buildScheduleCBPacketData(source: ScheduleCBPacketSource): ScheduleCBPacketData {
  const generatedAtIso = normalizeIso(source.generatedAtIso, new Date().toISOString())
  const report = source.report
  const certificationTimestamp = report.sealedAt ?? report.submittedAt ?? generatedAtIso
  const itemMap = new Map(source.items.map(item => [item.itemCode, item]))
  const overallResult = String(report.sealPayload.overallResult ?? 'pass')
  const complianceTone = overallResult === 'fail' ? 'review_required' : 'compliant'
  const complianceBlockLabel = complianceTone === 'compliant'
    ? 'SEALED & COMPLIANT'
    : 'SEALED & REVIEW REQUIRED'

  const projectAddressParts = [report.address].filter(Boolean)
  const projectLocaleParts = [report.city, report.region].filter(Boolean)
  const auditCoordinates = extractAuditCoordinates(report)

  const appendixEntries: ScheduleCBPacketAppendixEntry[] = [...source.documents]
    .sort((left, right) => {
      const leftItem = itemMap.get(left.itemCode)
      const rightItem = itemMap.get(right.itemCode)
      const leftStage = leftItem?.stageNumber ?? Number.MAX_SAFE_INTEGER
      const rightStage = rightItem?.stageNumber ?? Number.MAX_SAFE_INTEGER
      if (leftStage !== rightStage) return leftStage - rightStage

      const leftCode = leftItem?.itemCode ?? left.itemCode
      const rightCode = rightItem?.itemCode ?? right.itemCode
      if (leftCode !== rightCode) return leftCode.localeCompare(rightCode)

      return left.createdAt.localeCompare(right.createdAt)
    })
    .map(document => {
      const item = itemMap.get(document.itemCode)
      const capturedAtIso = normalizeIso(document.capturedAt ?? document.createdAt, generatedAtIso)

      return {
        id: document.id,
        fileName: document.fileName,
        fileKindLabel: toDisplayFileKind(document.mimeType, document.fileName),
        caption: buildAppendixCaption(document, item),
        requirementReference: buildRequirementReference(item),
        capturedAtIso,
        capturedAtDisplay: formatDisplayTimestamp(capturedAtIso),
        coordinatesText: formatCoordinates(document.latitude, document.longitude),
        imageUrl: document.imageUrl,
      }
    })

  return {
    templateVersion: SCHEDULE_CB_PACKET_TEMPLATE_MANIFEST.packetTemplateVersion,
    brandLogoSrc: source.brandLogoSrc ?? '',
    generatedAtIso,
    complianceBlockLabel,
    complianceTone,
    project: {
      name: report.projectName,
      addressLine1: projectAddressParts.join(', '),
      addressLine2: projectLocaleParts.join(', ') || 'British Columbia',
      permitNumber: source.buildingPermitNumber,
      jurisdictionName: report.jurisdictionName ?? report.overlaySnapshot.jurisdictionName,
      overlayLabel: report.ahjOverlayLabel,
    },
    inspector: {
      name: source.officialFormOptions.inspectorName ?? 'Inspector of Record',
      license: source.officialFormOptions.inspectorLicense,
      discipline: source.officialFormOptions.discipline,
      firmName: source.officialFormOptions.firmName,
      contact: source.officialFormOptions.inspectorContact,
      addressLine1: source.officialFormOptions.inspectorAddress,
      addressLine2: source.officialFormOptions.inspectorAddressCont,
    },
    summary: {
      overallResult,
      currentStage: report.currentStage,
      stageCount: report.stageCount,
      stageStatusLabel: `Stage ${report.currentStage} of ${report.stageCount}`,
      sealReference: report.sealReference,
      verificationId: source.verificationId ?? report.sealReference ?? report.id,
    },
    auditTrail: {
      inspectorName: source.officialFormOptions.inspectorName ?? 'Inspector of Record',
      inspectorLicense: source.officialFormOptions.inspectorLicense,
      discipline: source.officialFormOptions.discipline,
      firmName: source.officialFormOptions.firmName,
      exactTimestampIso: formatForensicTimestamp(certificationTimestamp),
      exactTimestampDisplay: formatDisplayTimestamp(certificationTimestamp),
      generatedAtIso,
      generatedAtDisplay: formatDisplayTimestamp(generatedAtIso),
      verificationId: source.verificationId ?? report.sealReference ?? report.id,
      sourceReportId: report.id,
      assignmentId: report.assignmentId,
      jobId: report.jobId,
      coordinatesText: formatCoordinates(auditCoordinates.latitude, auditCoordinates.longitude),
      coordinatesSource: auditCoordinates.source,
      overlayUsed: {
        label: report.ahjOverlayLabel,
        jurisdictionName: report.overlaySnapshot.jurisdictionName,
        type: report.ahjOverlayType,
        summary: report.overlaySnapshot.summary,
        signals: report.overlaySnapshot.signals,
      },
    },
    appendixEntries,
    legal: {
      statutoryTemplateVersion: SCHEDULE_CB_PACKET_TEMPLATE_MANIFEST.statutoryTemplateVersion,
      statutoryTemplatePath: SCHEDULE_CB_PACKET_TEMPLATE_MANIFEST.statutoryTemplatePath,
      complianceTodos: SCHEDULE_CB_PACKET_TEMPLATE_MANIFEST.complianceTodos,
    },
  }
}
