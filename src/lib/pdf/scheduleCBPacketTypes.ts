import type { AhjOverlayContext } from '@/lib/inspectorCompletion'
import type { InspectorCompletionReportRow } from '@/lib/supabase/inspectorCompletion'
import type { ScheduleCBOptions } from './scheduleCBGenerator'

export interface ScheduleCBPacketItemRecord {
  itemCode: string
  itemLabel: string
  responseNote?: string
  stageNumber: number
  stageName: string
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

export interface ScheduleCBPacketData {
  templateVersion: string
  brandLogoSrc: string
  generatedAtIso: string
  complianceBlockLabel: string
  complianceTone: 'compliant' | 'review_required'
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
    sealReference?: string
    verificationId?: string
  }
  auditTrail: ScheduleCBPacketAuditTrail
  appendixEntries: ScheduleCBPacketAppendixEntry[]
  legal: {
    statutoryTemplateVersion: string
    statutoryTemplatePath: string
    complianceTodos: readonly string[]
  }
}
