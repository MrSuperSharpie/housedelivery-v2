import type { InspectorCompletionReportRow } from '@/lib/supabase/inspectorCompletion'
import { SCHEDULE_CB_PACKET_TEMPLATE_MANIFEST } from './scheduleCBPacketTemplateManifest'
import type {
  ChecklistSummary,
  HoldHistoryEntry,
  ScheduleCBPacketAppendixEntry,
  ScheduleCBPacketData,
  ScheduleCBPacketDocumentRecord,
  ScheduleCBPacketItemRecord,
  ScheduleCBPacketSource,
} from './scheduleCBPacketTypes'

export const APPENDIX_PAGE_SIZE = 4
const FINAL_OCCUPANCY_STAGE_NUMBER = 15

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

// A field note is a plain-text evidence object whose message body lives in the
// file content. These open as a formal in-app Field Note Record rather than the
// raw .txt file.
export function isFieldNoteDocument(mimeType?: string, fileName?: string): boolean {
  return toDisplayFileKind(mimeType, fileName) === 'Field Note'
}

// Builds the absolute URL to the formal Field Note Record for one evidence
// document. Returns undefined when no app base URL is available (the appendix
// then falls back to linking the raw signed file).
export function buildFieldNoteRecordUrl(appBaseUrl: string | undefined, documentId: string): string | undefined {
  const base = (appBaseUrl ?? '').replace(/\/+$/, '')
  if (!base || !documentId) return undefined
  return `${base}/field-note/${encodeURIComponent(documentId)}`
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

function builderDecisionFromEntry(
  r: Record<string, unknown>,
  events: Array<Record<string, unknown>>,
): HoldHistoryEntry['builderDecision'] {
  if (typeof r.builderAcceptedAt === 'string') return 'accepted'
  const status = String(r.status ?? '')
  if (status === 'hold_declined' || events.some(e => e.eventType === 'hold_declined')) return 'declined'
  if (status === 'hold_expired' || typeof r.expiredAt === 'string') return 'expired'
  return 'pending'
}

export function coerceHoldHistoryEntry(raw: unknown): HoldHistoryEntry | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>

  const events: Array<Record<string, unknown>> = Array.isArray(r.events)
    ? (r.events as unknown[]).filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
    : []

  // Initiator: actor role from the hold_created event, or fallback to 'inspector'
  const createdEvent = events.find(e => e.eventType === 'hold_created' || e.eventType === 'hold_offered')
  const initiatedByRole = typeof createdEvent?.actorRole === 'string' ? createdEvent.actorRole : 'inspector'

  // Correction evidence refs: notes from non-creation events, up to 2
  const actionEvents = events.filter(
    e =>
      e.eventType !== 'hold_created' &&
      e.eventType !== 'hold_offered' &&
      typeof e.note === 'string' &&
      (e.note as string).trim() !== '',
  )
  const correctionEvidenceRefs = actionEvents.slice(0, 2).map(e => (e.note as string).trim())

  return {
    holdId: String(r.holdId ?? ''),
    placedAt: String(r.placedAt ?? ''),
    status: String(r.status ?? ''),
    reason: String(r.reason ?? ''),
    deficiencyReason: typeof r.deficiencyReason === 'string' ? r.deficiencyReason : undefined,
    category: typeof r.category === 'string' ? r.category : undefined,
    affectedItemSummaries: Array.isArray(r.affectedItemSummaries)
      ? (r.affectedItemSummaries as unknown[]).filter((s): s is string => typeof s === 'string')
      : [],
    initiatedByRole,
    builderDecision: builderDecisionFromEntry(r, events),
    builderAcceptedAt: typeof r.builderAcceptedAt === 'string' ? r.builderAcceptedAt : undefined,
    premiumRateType: typeof r.premiumRateType === 'string' ? r.premiumRateType : undefined,
    premiumRateAmount: typeof r.premiumRateAmount === 'number' ? r.premiumRateAmount : undefined,
    holdCapAmount: typeof r.holdCapAmount === 'number' ? r.holdCapAmount : undefined,
    actualRetainedMinutes: typeof r.actualRetainedMinutes === 'number' ? r.actualRetainedMinutes : undefined,
    premiumChargeAmount: typeof r.premiumChargeAmount === 'number' ? r.premiumChargeAmount : undefined,
    resolution: typeof r.resolution === 'string' ? r.resolution : undefined,
    resolutionNotes: typeof r.resolutionNotes === 'string' ? r.resolutionNotes : undefined,
    holdEndedAt: typeof r.holdEndedAt === 'string' ? r.holdEndedAt : undefined,
    correctionEvidenceCount: actionEvents.length,
    correctionEvidenceRefs,
  }
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
      source: `Checklist ${formatChecklistStageCode(latestSignOff.stageNumber ?? report.currentStage)} sign-off`,
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
  return `Checklist ${formatChecklistStageCode(item.stageNumber)} · ${item.itemCode} — ${item.itemLabel}`
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

function getSignedStageNumbers(report: InspectorCompletionReportRow): number[] {
  const candidate = report.sealPayload.stageSignOffs
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return [report.currentStage]
  }

  const signedStages = Object.entries(candidate as Record<string, unknown>)
    .map(([stageKey, rawSignOff]) => {
      const fromPayload = rawSignOff && typeof rawSignOff === 'object' && !Array.isArray(rawSignOff)
        ? asNumber((rawSignOff as Record<string, unknown>).stageNumber)
        : null
      return fromPayload ?? asNumber(Number(stageKey))
    })
    .filter((stageNumber): stageNumber is number => stageNumber !== null)

  return signedStages.length > 0
    ? [...new Set(signedStages)].sort((left, right) => left - right)
    : [report.currentStage]
}

function resolvePacketStageNumbers(source: ScheduleCBPacketSource): Set<number> {
  const explicitStageNumbers = source.packetScope?.stageNumbers
    .filter(stageNumber => Number.isFinite(stageNumber) && stageNumber > 0)
  const stageNumbers = explicitStageNumbers && explicitStageNumbers.length > 0
    ? explicitStageNumbers
    : getSignedStageNumbers(source.report)

  return new Set(stageNumbers)
}

function inspectionStatusRank(status: ScheduleCBPacketItemRecord['inspectionStatus']): number {
  if (status === 'Passed' || status === 'Failed' || status === 'N/A') return 3
  if (status === 'Pending') return 1
  return 0
}

function builderStageForInternalChecklistStage(internalStage: number): number {
  if (internalStage === 1) return 1
  if (internalStage === 5) return 2
  if (internalStage >= 6 && internalStage <= 11) return 3
  if (internalStage === 12) return 4
  if (internalStage === 13) return 5
  if (internalStage === 14) return 6
  if (internalStage === 15) return 7
  return internalStage
}

function defaultBuilderStageLabel(stageNumber: number): string {
  switch (stageNumber) {
    case 1: return 'Site Survey & Excavation'
    case 2: return 'Foundation Pour'
    case 3: return 'Framing & Lock-up'
    case 4: return 'Insulation & Energy Compliance'
    case 5: return 'Interior Completion'
    case 6: return 'Exterior Works and Site Finalization'
    case 7: return 'Final Approval and Occupancy'
    default: return `Stage ${stageNumber}`
  }
}

function formatChecklistStageCode(stageNumber: number): string {
  return `S${String(stageNumber).padStart(2, '0')}`
}

function buildStageDisplayLabels(source: ScheduleCBPacketSource, scopedItems: ScheduleCBPacketItemRecord[]): {
  stageStatusLabel: string
  checklistScopeLabel: string
} {
  const scopedStageNumbers = [...new Set(scopedItems.map(item => item.stageNumber))]
    .sort((left, right) => left - right)
  const primaryChecklistStage = scopedStageNumbers[scopedStageNumbers.length - 1] ?? source.report.currentStage
  const builderStageNumber = source.builderStage?.number ?? builderStageForInternalChecklistStage(primaryChecklistStage)
  const builderStageTotal = source.builderStage?.total ?? 7
  const builderStageLabel = source.builderStage?.label?.trim() || defaultBuilderStageLabel(builderStageNumber)
  const stageStatusLabel = `Builder Stage ${builderStageNumber} of ${builderStageTotal} — ${builderStageLabel}`

  if ((source.packetScope?.mode ?? 'stage_level') === 'full_project' && scopedStageNumbers.length > 1) {
    return {
      stageStatusLabel,
      checklistScopeLabel: `Checklist Scope: Signed stages ${scopedStageNumbers.map(formatChecklistStageCode).join(', ')}`,
    }
  }

  const checklistStageName = scopedItems.find(item => item.stageNumber === primaryChecklistStage)?.stageName
    || `Stage ${primaryChecklistStage}`

  return {
    stageStatusLabel,
    checklistScopeLabel: `Checklist Scope: ${formatChecklistStageCode(primaryChecklistStage)} — ${checklistStageName}`,
  }
}

function getScopedItems(source: ScheduleCBPacketSource): ScheduleCBPacketItemRecord[] {
  const includedStages = resolvePacketStageNumbers(source)
  const scoped = source.items.filter(item => includedStages.has(item.stageNumber))
  const deduped = new Map<string, ScheduleCBPacketItemRecord>()

  for (const item of scoped) {
    const existing = deduped.get(item.itemCode)
    if (!existing || inspectionStatusRank(item.inspectionStatus) > inspectionStatusRank(existing.inspectionStatus)) {
      deduped.set(item.itemCode, item)
    }
  }

  return [...deduped.values()].sort((left, right) => {
    if (left.stageNumber !== right.stageNumber) return left.stageNumber - right.stageNumber
    return left.itemCode.localeCompare(right.itemCode)
  })
}

export function buildScheduleCBPacketData(source: ScheduleCBPacketSource): ScheduleCBPacketData {
  const generatedAtIso = normalizeIso(source.generatedAtIso, new Date().toISOString())
  const report = source.report
  const exportMode = source.exportMode ?? 'platform_preview'
  const isAuthority = exportMode === 'authority_facing'
  const packetScopeMode = source.packetScope?.mode ?? 'stage_level'

  const rawHoldHistory = Array.isArray(report.sealPayload.holdHistory)
    ? (report.sealPayload.holdHistory as unknown[])
    : []
  const holdHistory = rawHoldHistory
    .map(coerceHoldHistoryEntry)
    .filter((entry): entry is HoldHistoryEntry => entry !== null)
  const certificationTimestamp = report.sealedAt ?? report.submittedAt ?? generatedAtIso
  const scopedItems = getScopedItems(source)
  const scopedItemCodes = new Set(scopedItems.map(item => item.itemCode))
  const scopedDocuments = source.documents.filter(document => scopedItemCodes.has(document.itemCode))
  const itemMap = new Map(scopedItems.map(item => [item.itemCode, item]))
  const stageDisplayLabels = buildStageDisplayLabels(source, scopedItems)

  // ─── Checklist summary (computed before overallResult so we can gate it) ────
  const itemsWithStatus = scopedItems.filter(item => item.inspectionStatus != null)
  const checklistSummary: ChecklistSummary = {
    hasData: itemsWithStatus.length > 0,
    passCount: itemsWithStatus.filter(i => i.inspectionStatus === 'Passed').length,
    failCount: itemsWithStatus.filter(i => i.inspectionStatus === 'Failed').length,
    naCount: itemsWithStatus.filter(i => i.inspectionStatus === 'N/A').length,
    pendingCount: itemsWithStatus.filter(i => i.inspectionStatus === 'Pending').length,
    totalCount: scopedItems.length,
  }

  // ─── Overall result — guard against legal contradiction ─────────────────────
  // A sealed payload may claim 'pass' even when the checklist has no reviewed
  // items (all Pending, or no items at all). A 'pass' outcome is only valid
  // when at least one item was explicitly reviewed and none failed.
  const rawResult = String(report.sealPayload.overallResult ?? 'pass')
  const overallResult: string = (() => {
    if (rawResult !== 'pass') return rawResult
    // Only downgrade a 'pass' claim when explicit failures exist.
    // Zero reviewed items alone does not justify a 'fail' — a sealed inspection
    // with all-Pending items (e.g. status not persisted before sealing) should not
    // produce a misleading 'fail' outcome on a legitimate sealed record.
    if (checklistSummary.failCount > 0) return 'fail'
    return 'pass'
  })()

  const usesNamedInspectorPassWording =
    exportMode === 'platform_preview' &&
    packetScopeMode === 'stage_level' &&
    report.currentStage < FINAL_OCCUPANCY_STAGE_NUMBER &&
    overallResult === 'pass' &&
    checklistSummary.hasData &&
    checklistSummary.passCount === checklistSummary.totalCount &&
    checklistSummary.failCount === 0 &&
    checklistSummary.pendingCount === 0 &&
    checklistSummary.naCount === 0

  const complianceTone = overallResult === 'fail' ? 'review_required' : 'compliant'
  const complianceBlockLabel = isAuthority
    ? (complianceTone === 'compliant' ? 'SEALED & COMPLIANT' : 'SEALED & REVIEW REQUIRED')
    : (complianceTone === 'compliant'
        ? (usesNamedInspectorPassWording ? 'FIELD REVIEW COMPLETE' : 'STAGE COMPLETE')
        : 'STAGE REVIEW REQUIRED')

  // ─── Mode-switched display labels ──────────────────────────────────────────
  const coverEyebrow = isAuthority ? 'Vero Permit · Municipal Audit Packet' : 'Vero Permit · Platform Record'
  const coverSubtitle = isAuthority
    ? 'Compliance summary and supporting record prepared for city audit, statutory filing, and project archive.'
    : 'Field inspection record and supporting evidence generated by the Vero platform.'
  const documentTitle = isAuthority
    ? 'Schedule C-B Assurance of Professional Field Review'
    : 'Stage Inspection Record'
  const certificationStatusLabel = isAuthority ? 'Certification Status' : 'Record Reference'
  const trailEyebrow = isAuthority ? 'Forensic Audit Trail' : 'Inspection Record Trail'
  const trailTitle = isAuthority
    ? 'Certification Metadata and Verification Chain'
    : 'Record Metadata and Reference Chain'
  const certifiedAtLabel = isAuthority ? 'Certified' : 'Submitted'
  // null = suppress the row entirely in platform_preview mode
  const sealOutcomeLabel: string | null = isAuthority ? 'Seal Outcome' : null
  const disclaimerText = isAuthority
    ? 'The statutory Schedule C-B page that follows is preserved as the official form record. Supplemental branding and supporting evidence are confined to the wrapper pages in this packet.'
    : 'This package is generated by the Vero platform from field inputs provided by the named inspector. It is not a building permit, occupancy authorization, authority decision, or substitute for any document required by the authority having jurisdiction. This is a platform record only.'

  const projectAddressParts = [report.address].filter(Boolean)
  const projectLocaleParts = [report.city, report.region].filter(Boolean)
  const auditCoordinates = extractAuditCoordinates(report)

  // ─── Evidence filtering: only include real persisted documents ──────────────
  // Documents without a non-empty storagePath are template prompts or capture
  // stubs that were never uploaded — exclude them from the evidence appendix.
  const persistedDocuments = scopedDocuments.filter(
    doc => typeof doc.storagePath === 'string' && doc.storagePath.trim() !== '',
  )

  // Track which item codes have at least one attached document so note-only
  // items can be identified and included as text-only appendix entries.
  const itemCodesWithDocuments = new Set(persistedDocuments.map(doc => doc.itemCode))

  const documentAppendixEntries: ScheduleCBPacketAppendixEntry[] = [...persistedDocuments]
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
      // Field notes (plain text) open as a formal in-app record; other evidence
      // (photo/video/PDF) keeps linking to its raw signed file.
      const recordUrl = isFieldNoteDocument(document.mimeType, document.fileName)
        ? buildFieldNoteRecordUrl(source.appBaseUrl, document.id)
        : undefined

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
        signedUrl: document.signedUrl,
        recordUrl,
      }
    })

  // Note-only entries: scoped items that have an inspector field note but no
  // attached document. These would otherwise be invisible in the final PDF.
  const noteOnlyEntries: ScheduleCBPacketAppendixEntry[] = scopedItems
    .filter(item =>
      !itemCodesWithDocuments.has(item.itemCode) &&
      Boolean(item.responseNote?.trim()),
    )
    .map(item => ({
      id: `note-${item.itemCode}`,
      fileName: `Field observation · ${item.itemCode}`,
      fileKindLabel: 'Field Observation',
      caption: item.responseNote?.trim() ?? '',
      requirementReference: buildRequirementReference(item),
      capturedAtIso: certificationTimestamp,
      capturedAtDisplay: formatDisplayTimestamp(certificationTimestamp),
      coordinatesText: 'Not captured',
    }))

  const appendixEntries = [...documentAppendixEntries, ...noteOnlyEntries]

  return {
    templateVersion: SCHEDULE_CB_PACKET_TEMPLATE_MANIFEST.packetTemplateVersion,
    brandLogoSrc: source.brandLogoSrc ?? '',
    generatedAtIso,
    complianceBlockLabel,
    complianceTone,
    exportMode,
    packetScopeMode,
    usesNamedInspectorPassWording,
    documentCount: scopedDocuments.length,
    checklistSummary,
    coverEyebrow,
    coverSubtitle,
    documentTitle,
    certificationStatusLabel,
    trailEyebrow,
    trailTitle,
    certifiedAtLabel,
    sealOutcomeLabel,
    disclaimerText,
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
      stageStatusLabel: stageDisplayLabels.stageStatusLabel,
      checklistScopeLabel: stageDisplayLabels.checklistScopeLabel,
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
    items: scopedItems,
    holdHistory,
    legal: {
      statutoryTemplateVersion: SCHEDULE_CB_PACKET_TEMPLATE_MANIFEST.statutoryTemplateVersion,
      statutoryTemplatePath: SCHEDULE_CB_PACKET_TEMPLATE_MANIFEST.statutoryTemplatePath,
      complianceTodos: SCHEDULE_CB_PACKET_TEMPLATE_MANIFEST.complianceTodos,
    },
  }
}
