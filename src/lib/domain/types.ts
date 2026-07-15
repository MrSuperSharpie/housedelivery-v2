import type { ProjectRegulatoryProfile } from '@/lib/regulatory/types'

/**
 * Vero Domain Model — Phase 1
 * Permit compliance operating system: doers, verifiers, authorities.
 * BC residential permitting; Vancouver first jurisdiction.
 */

// ─── Roles & Parties ─────────────────────────────────────────────────────────

export type UserRole = 'builder' | 'inspector' | 'auditor'

/** Doer / verifier / authority — permit governance model */
export type PartyRole = 'doer' | 'trade' | 'verifier' | 'inspector' | 'professional' | 'authority'

// ─── Location & Jurisdiction ─────────────────────────────────────────────────

export interface GeoCoord {
  lat: number
  lng: number
  accuracy?: number
  timestamp?: string
  deviceId?: string
}

export interface JurisdictionContext {
  id: string
  /** e.g. "City of Vancouver", "Province of BC" */
  name: string
  /** Vancouver Building Bylaw vs BC Building Code */
  codeSource: 'BCBC' | 'VBBL' | 'both'
  region?: string
  /** For future: bylaw version, effective date */
  metadata?: Record<string, unknown>
}

export interface PropertySite {
  id: string
  address: string
  city: string
  province: string
  postalCode?: string
  geo?: GeoCoord
  /** Parcel / folio for land title */
  parcelId?: string
  /** ALR / ALC / riparian / SDS etc. determined by rules engine */
  triggers?: string[]
}

// ─── Authority ──────────────────────────────────────────────────────────────

export interface Authority {
  id: string
  name: string
  jurisdictionId: string
  /** Building, plumbing, electrical, etc. */
  authorityType: string
  contactEmail?: string
  contactPhone?: string
  /** Accepts electronic submissions */
  acceptsElectronic?: boolean
  metadata?: Record<string, unknown>
}

// ─── Permit & Requirements ───────────────────────────────────────────────────

export type PermitKind =
  | 'land_use'
  | 'zoning'
  | 'rezoning'
  | 'development_permit'
  | 'subdivision'
  | 'heritage'
  | 'alr_alc'
  | 'contamination_sds'
  | 'watercourse_riparian'
  | 'grading'
  | 'excavation'
  | 'esc'
  | 'trees'
  | 'street_use'
  | 'driveway'
  | 'service_connections'
  | 'building'
  | 'demolition'
  | 'occupancy'
  | 'plumbing'
  | 'electrical'
  | 'gas'
  | 'mechanical_hvac'
  | 'fire_protection'
  | 'elevating_devices'
  | 'boilers_pressure_vessels'
  | 'refrigeration'
  | 'onsite_sewage_septic'
  | 'letters_of_assurance'
  | 'worksafe_nop'
  | 'builder_licence'
  | 'home_warranty'
  | 'other'

export interface PermitRequirement {
  id: string
  permitId: string
  /** Stage or hold point this requirement applies to */
  stageId?: string
  holdPointId?: string
  requirementType: string
  description?: string
  /** BCBC / VBBL section ref */
  codeReference?: string
  required: boolean
  metadata?: Record<string, unknown>
}

export interface PermitStage {
  id: string
  permitId: string
  stageNumber: number
  name: string
  shortName?: string
  description?: string
  order: number
  metadata?: Record<string, unknown>
}

export interface HoldPoint {
  id: string
  permitId: string
  stageId?: string
  name: string
  description?: string
  /** Work must stop until verified */
  mandatoryStop: boolean
  order: number
  metadata?: Record<string, unknown>
}

export interface Permit {
  id: string
  projectId: string
  authorityId: string
  kind: PermitKind
  /** Permit number from authority */
  permitNumber?: string
  status: PermitStatus
  stages: PermitStage[]
  holdPoints?: HoldPoint[]
  requirements?: PermitRequirement[]
  issuedAt?: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
  metadata?: Record<string, unknown>
}

export type PermitStatus =
  | 'draft'
  | 'applied'
  | 'in_review'
  | 'approved'
  | 'issued'
  | 'suspended'
  | 'closed'

// ─── Project ────────────────────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  /** Primary site; project can have multiple sites */
  propertySiteId: string
  /** Builder / owner org */
  builderId: string
  jurisdictionContextId: string
  /** Multiple permits per project */
  permitIds: string[]
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  /** Optional resolved legal context; Phase 1A does not change runtime routing. */
  regulatoryProfile?: ProjectRegulatoryProfile
  metadata?: Record<string, unknown>
}

export type ProjectStatus =
  | 'draft'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'cancelled'

// ─── Submissions & Versions ──────────────────────────────────────────────────

export interface SubmissionVersion {
  id: string
  submissionId: string
  versionNumber: number
  submittedAt: string
  submittedBy: string
  /** Delta or full package */
  changeType: 'initial' | 'resubmission' | 'amendment'
  authorityPackageId?: string
  status: SubmissionVersionStatus
  createdAt: string
  metadata?: Record<string, unknown>
}

export type SubmissionVersionStatus = 'draft' | 'submitted' | 'accepted' | 'rejected'

export interface Submission {
  id: string
  projectId: string
  permitId: string
  authorityId: string
  stageId?: string
  holdPointId?: string
  versions: SubmissionVersion[]
  currentVersionId: string
  status: SubmissionStatus
  createdAt: string
  updatedAt: string
  metadata?: Record<string, unknown>
}

/** Blueprint M2 submission lifecycle. Rule 11: sealing is blocked while status is hold_open. */
export type SubmissionStatus =
  | 'draft'                // builder is composing the submission package
  | 'submitted_for_review' // package submitted to authority for review
  | 'hold_open'            // authority raised a hold point; work must pause (Rule 11: blocks sealing)
  | 'hold_resolved'        // builder responded; hold lifted; authority reviewing
  | 'sealed'               // authority accepted and digitally sealed the submission
  | 'archived'             // submission closed and archived (rejected, superseded, or withdrawn)

// ─── Evidence ────────────────────────────────────────────────────────────────

export type EvidenceKind =
  | 'photo'
  | 'video'
  | 'document'
  | 'as_built'
  | 'markup'
  | 'voice_note'
  | 'measurement'
  | 'other'

export interface EvidenceItem {
  id: string
  projectId: string
  permitId?: string
  submissionId?: string
  stageId?: string
  holdPointId?: string
  kind: EvidenceKind
  fileType?: string
  originalFilename?: string
  storagePath?: string
  storageKey?: string
  captureTimestamp: string
  uploadedBy?: string
  capturedBy?: string
  notes?: string
  caption?: string
  geo?: GeoCoord
  /** Free-text location description used when GPS EXIF data is unavailable. */
  manualLocationNote?: string
  validationState: EvidenceValidationState
  checksum?: string
  hashPlaceholder?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type EvidenceValidationState = 'pending' | 'validated' | 'invalid' | 'quarantined'

export interface EvidenceManifest {
  id: string
  submissionId?: string
  authorityPackageId?: string
  items: EvidenceItem[]
  generatedAt: string
  checksum?: string
  metadata?: Record<string, unknown>
}

export interface EvidenceArchive {
  id: string
  projectId: string
  permitId?: string
  manifestId: string
  archivedAt: string
  retentionPolicy?: string
  metadata?: Record<string, unknown>
}

// ─── Deficiency & Resubmission ────────────────────────────────────────────────

export type DeficiencyStatus =
  | 'open'
  | 'responded'
  | 'under_review'
  | 'resolved'
  | 'disputed'
  | 'closed'

export interface Deficiency {
  id: string
  projectId: string
  permitId: string
  submissionId: string
  authorityId: string
  authorityComment: string
  /** Reference to requirement or checklist item */
  requirementId?: string
  stageId?: string
  status: DeficiencyStatus
  tradeResponse?: string
  respondedAt?: string
  respondedBy?: string
  resubmissionVersionId?: string
  createdAt: string
  updatedAt: string
  metadata?: Record<string, unknown>
}

// ─── Credentials & Trust ─────────────────────────────────────────────────────

export interface Credential {
  id: string
  partyId: string
  partyRole: PartyRole
  /** Licence number, class, issuer */
  licenceNumber?: string
  licenceClass?: string
  issuer?: string
  expiry?: string
  verifiedAt?: string
  metadata?: Record<string, unknown>
}

export interface InsuranceRecord {
  id: string
  partyId: string
  type: string
  provider?: string
  policyNumber?: string
  expiry?: string
  verifiedAt?: string
  metadata?: Record<string, unknown>
}

export interface WorkSafeRecord {
  id: string
  partyId: string
  registrationNumber?: string
  status?: string
  expiry?: string
  verifiedAt?: string
  metadata?: Record<string, unknown>
}

export interface BuilderQualification {
  id: string
  builderId: string
  licenceType?: string
  homeWarranty?: string
  expiry?: string
  verifiedAt?: string
  metadata?: Record<string, unknown>
}

export interface ProfessionalAssurance {
  id: string
  projectId: string
  permitId: string
  professionalId: string
  /** Letter of Assurance type */
  assuranceType: string
  signedAt?: string
  documentId?: string
  metadata?: Record<string, unknown>
}

// ─── Audit ──────────────────────────────────────────────────────────────────

export interface AuditEvent {
  id: string
  projectId?: string
  permitId?: string
  submissionId?: string
  actorId: string
  actorRole: PartyRole
  action: string
  payload?: Record<string, unknown>
  timestamp: string
  metadata?: Record<string, unknown>
}
