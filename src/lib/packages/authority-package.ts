/**
 * Authority package domain model and service interface.
 * Supports cover page, compliance summary, declarations, evidence index,
 * photos, video refs, as-builts, audit trail, integrity/manifest summary.
 */

import type { EvidenceItem } from '@/lib/domain/types'
import type { CompletedInspectionRecord } from '@/lib/persistence/completedInspections'

export interface AuthorityPackageCover {
  projectName: string
  projectAddress: string
  permitNumber?: string
  authorityName: string
  submissionDate: string
  stageName?: string
  preparedBy?: string
}

export interface ComplianceSummary {
  totalItems: number
  passed: number
  failed: number
  na: number
  pending?: number
}

export interface DeclarationForm {
  id: string
  title: string
  signedBy?: string
  signedAt?: string
  contentRef?: string
}

export interface EvidenceIndexEntry {
  evidenceItemId: string
  shortRef: string
  kind: string
  filename?: string
  caption?: string
  captureTimestamp?: string
  /** Checklist item id from inspection (e.g. s2-1). */
  checklistItemRef?: string
  /** Stage number (1–5). */
  stageRef?: number
  /** Permit or ref (e.g. building). */
  permitRef?: string
  notes?: string
  /** GPS coordinates captured at time of evidence collection. */
  lat?: number
  lng?: number
  geoAccuracy?: number
  /** Identity of the person who uploaded or captured this item. */
  uploadedBy?: string
  capturedBy?: string
  /** Integrity hash for tamper-evidence. */
  checksum?: string
  hashPlaceholder?: string
}

export interface InspectorDeclaration {
  inspectorName: string
  licenseNumber: string
  /** Primary inspection discipline (e.g. 'structural'). */
  discipline: string
  /** Credential class derived from the licence number (e.g. 'P.Eng'). */
  credentialClass: string
  inspectionDate: string
  certRef: string
  /** Standard BC attestation statement. */
  statement: string
}

export interface AuthorityPackage {
  id: string
  submissionId: string
  generatedAt: string
  cover: AuthorityPackageCover
  complianceSummary: ComplianceSummary
  declarations: DeclarationForm[]
  /** SFH inspector declaration — auto-generated from sealed record. */
  inspectorDeclaration?: InspectorDeclaration
  evidenceIndex: EvidenceIndexEntry[]
  /** References to evidence items (photos, videos, etc.) */
  evidenceItems: EvidenceItem[]
  /** As-builts / markups refs */
  asBuiltRefs?: string[]
  /** Audit trail entries */
  auditTrailRefs?: string[]
  /** Integrity / manifest checksum placeholder */
  manifestChecksum?: string
  metadata?: Record<string, unknown>
}

export interface IAuthorityPackageGenerator {
  generate(submissionId: string, options?: { includeAuditTrail: boolean }): Promise<AuthorityPackage>
}

/** Build evidence index entries from structured evidence for package output. */
function buildEvidenceIndexFromItems(items: EvidenceItem[]): EvidenceIndexEntry[] {
  return items.map((item, i) => {
    const meta = item.metadata ?? {}
    const checklistId = meta.checklistItemId as string | undefined
    const stageNum = meta.stageNumber as number | undefined
    const permitRef = meta.permitIdRef as string | undefined
    return {
      evidenceItemId: item.id,
      shortRef: `EV-${String(i + 1).padStart(3, '0')}`,
      kind: item.kind,
      filename: item.originalFilename,
      caption: item.caption,
      captureTimestamp: item.captureTimestamp,
      checklistItemRef: checklistId,
      stageRef: stageNum,
      permitRef,
      notes: item.notes,
      lat: item.geo?.lat,
      lng: item.geo?.lng,
      geoAccuracy: item.geo?.accuracy,
      uploadedBy: item.uploadedBy,
      capturedBy: item.capturedBy,
      checksum: item.checksum,
      hashPlaceholder: item.hashPlaceholder,
    }
  })
}

const SFH_DECLARATION_STATEMENT =
  'I hereby certify that I personally carried out the inspection described in this report, ' +
  'that the work was inspected in accordance with the applicable provisions of the BC Building Code ' +
  'and the conditions of the permit, and that the information contained in this package is true ' +
  'and accurate to the best of my knowledge and belief.'

/**
 * Generate an authority package from a persisted completed inspection record.
 * Uses stored evidence as source of truth; no cryptographic or official claims.
 */
export function generateAuthorityPackageFromCompletedRecord(
  record: CompletedInspectionRecord
): AuthorityPackage {
  const evidenceIndex = buildEvidenceIndexFromItems(record.evidenceItems)
  const totalItems = record.passItems + record.failItems
  // Derive credential class from the licence number prefix (e.g. 'BC-ENG-...' → 'P.Eng').
  // CompletedInspectionRecord carries no dedicated discipline or credentialClass field.
  const credentialClass = record.inspectorLicense.includes('ENG') ? 'P.Eng' : ''
  const inspectorDeclaration: InspectorDeclaration = {
    inspectorName: record.inspectorName,
    licenseNumber: record.inspectorLicense,
    discipline: record.discipline ?? '',
    credentialClass,
    inspectionDate: record.completedAt,
    certRef: record.certRef,
    statement: SFH_DECLARATION_STATEMENT,
  }
  return {
    id: `pkg-${record.id}`,
    submissionId: record.id,
    generatedAt: new Date().toISOString(),
    cover: {
      projectName: record.projectName,
      projectAddress: record.address,
      permitNumber: record.permitNumber,
      authorityName: record.authorityName ?? record.jurisdictionName ?? 'Authority not declared',
      submissionDate: record.completedAt,
      stageName: record.stageName,
      preparedBy: record.inspectorName,
    },
    complianceSummary: {
      totalItems,
      passed: record.passItems,
      failed: record.failItems,
      na: 0,
    },
    declarations: [],
    inspectorDeclaration,
    evidenceIndex,
    evidenceItems: record.evidenceItems,
  }
}
