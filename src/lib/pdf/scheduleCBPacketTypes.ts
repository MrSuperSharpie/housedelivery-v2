import type { AhjOverlayContext } from '@/lib/inspectorCompletion'
import type { InspectorCompletionReportRow } from '@/lib/supabase/inspectorCompletion'
import type { ScheduleCBOptions } from './scheduleCBGenerator'
import type { PacketEvidencePreviewAssets, PacketSealPresentation } from './scheduleCBPacketPresentation'

export interface ScheduleCBPacketItemRecord {
  itemCode: string
  itemLabel: string
  responseNote?: string
  ahjNotes?: string
  stageNumber: number
  stageName: string
  inspectionStatus?: 'Pending' | 'Passed' | 'Failed' | 'N/A'
}

export interface ChecklistSummary {
  hasData: boolean
  passCount: number
  failCount: number
  naCount: number
  pendingCount: number
  totalCount: number
}

export interface ScheduleCBPacketDocumentRecord {
  id: string
  itemCode: string
  fileName: string
  storagePath: string
  mimeType?: string
  createdAt: string
  capturedAt?: string
  latitude?: number | null
  longitude?: number | null
  imageUrl?: string
  signedUrl?: string
}

export interface ScheduleCBPacketSource {
  report: InspectorCompletionReportRow
  items: ScheduleCBPacketItemRecord[]
  documents: ScheduleCBPacketDocumentRecord[]
  officialFormOptions: ScheduleCBOptions
  brandLogoSrc?: string
  buildingPermitNumber?: string
  generatedAtIso?: string
  verificationId?: string
  exportMode?: 'platform_preview' | 'authority_facing'
  // Absolute origin of the Vero app (e.g. https://app.veropermit.com). When
  // present, field-note appendix entries link to the formal in-app Field Note
  // Record (/field-note/<id>) instead of the raw signed .txt storage object.
  appBaseUrl?: string
  packetScope?: {
    mode: 'stage_level' | 'full_project'
    stageNumbers: number[]
  }
  builderStage?: {
    number: number
    label?: string
    total?: number
  }
  presentationAssets?: PacketEvidencePreviewAssets & {
    mockDemoSealSrc?: string
  }
  seal?: {
    actualSealSrc?: string
    explicitDemo?: boolean
    credentialIsDemonstration?: boolean
  }
}

export interface ScheduleCBPacketAppendixEntry {
  id: string
  fileName: string
  fileKindLabel: string
  caption: string
  requirementReference: string
  capturedAtIso: string
  capturedAtDisplay: string
  coordinatesText: string
  imageUrl?: string
  previewImageUrl: string
  signedUrl?: string
  // For field-note (text) evidence: the in-app formal Field Note Record URL.
  // When set, the appendix links here instead of the raw signed .txt file.
  recordUrl?: string
  linkLabel: string
}

export interface ScheduleCBPacketAuditTrail {
  inspectorName: string
  inspectorLicense?: string
  discipline?: string
  firmName?: string
  exactTimestampIso: string
  exactTimestampDisplay: string
  generatedAtIso: string
  generatedAtDisplay: string
  verificationId?: string
  sourceReportId: string
  assignmentId: string
  jobId: string
  coordinatesText: string
  coordinatesSource: string
  overlayUsed: {
    label: string
    jurisdictionName: string
    type: AhjOverlayContext['type']
    summary: string
    signals: string[]
  }
}

export interface ScheduleCBPacketProjectSummary {
  name: string
  addressLine1: string
  addressLine2: string
  permitNumber?: string
  jurisdictionName: string
  overlayLabel: string
}

export interface HoldHistoryEntry {
  holdId: string
  placedAt: string
  status: string
  reason: string
  deficiencyReason?: string
  category?: string
  affectedItemSummaries: string[]
  initiatedByRole: string
  builderDecision: 'accepted' | 'declined' | 'expired' | 'pending'
  builderAcceptedAt?: string
  premiumRateType?: string
  premiumRateAmount?: number
  holdCapAmount?: number
  actualRetainedMinutes?: number
  premiumChargeAmount?: number
  resolution?: string
  resolutionNotes?: string
  holdEndedAt?: string
  correctionEvidenceCount: number
  correctionEvidenceRefs: string[]
}

export interface ScheduleCBPacketData {
  templateVersion: string
  brandLogoSrc: string
  generatedAtIso: string
  complianceBlockLabel: string
  complianceTone: 'compliant' | 'review_required'
  // Export mode and mode-switched display strings (all computed in buildScheduleCBPacketData)
  exportMode: 'platform_preview' | 'authority_facing'
  packetScopeMode: 'stage_level' | 'full_project'
  usesNamedInspectorPassWording: boolean
  documentCount: number
  checklistSummary: ChecklistSummary
  coverEyebrow: string
  coverSubtitle: string
  documentTitle: string
  certificationStatusLabel: string
  trailEyebrow: string
  trailTitle: string
  certifiedAtLabel: string
  /** null means suppress the row entirely (platform_preview mode) */
  sealOutcomeLabel: string | null
  disclaimerText: string
  displayIds: {
    verification?: string
    sourceReport: string
    assignment: string
    job: string
  }
  seal: PacketSealPresentation
  project: ScheduleCBPacketProjectSummary
  inspector: {
    name: string
    license?: string
    discipline?: string
    firmName?: string
    contact?: string
    addressLine1?: string
    addressLine2?: string
  }
  summary: {
    overallResult: string
    currentStage: number
    stageCount: number
    stageStatusLabel: string
    checklistScopeLabel: string
    sealReference?: string
    verificationId?: string
  }
  auditTrail: ScheduleCBPacketAuditTrail
  appendixEntries: ScheduleCBPacketAppendixEntry[]
  items: ScheduleCBPacketItemRecord[]
  holdHistory: HoldHistoryEntry[]
  legal: {
    statutoryTemplateVersion: string
    statutoryTemplatePath: string
    complianceTodos: readonly string[]
  }
}
