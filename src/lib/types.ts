import type { RuleResult } from '@/lib/rules/engine'

// ─── Enums ───────────────────────────────────────────────────────────────────

export type DispatchTier = 'standard' | 'priority' | 'emergency'
export type PermitFamily = 'building' | 'electrical' | 'plumbing' | 'mechanical' | 'demolition' | 'other'
export type PricingMode = 'dispatch_fixed' | 'specialist_hourly'
export type SpecialistRoleId =
  | 'technologist_support'
  | 'electrical_engineer_specialist_review'
  | 'structural_engineer_field_review'
  | 'senior_specialist_urgent_sealed_review'
export type SpecialistCredentialClass = 'PENG' | 'AIBC' | 'CP' | 'SPECIALIST'
export type PricingInspectionType = 'dispatch' | 'field_review'
/** Job-lifecycle and stage status. Job statuses follow the blueprint state machine; stage statuses are a subset. */
export type InspectionStatus =
  // ── Job-lifecycle states (InspectionJob.status) ──────────────────────────
  | 'pending_validation'     // job created, awaiting system/admin validation before posting
  | 'live'                   // posted to the board — claimable by eligible inspectors
  | 'provisionally_assigned' // inspector claimed a slot; builder objection window open
  | 'confirmed'              // objection window closed with no objection (or admin confirmed)
  | 'in_progress'            // inspector en route or on-site
  | 'on_hold'                // hold point raised; work paused pending builder response
  | 'completed'              // inspection concluded; pass/fail outcome recorded separately
  | 'cancelled'              // job cancelled by builder or admin before completion
  | 'disputed'               // outcome under formal dispute; escrow frozen
  | 'stopped'                // terminal: builder declined a hold — inspection terminated
  // ── Stage-level states (StageProgress.status, Project.status) ────────────
  | 'pending'                // stage not yet started
  | 'pass'                   // stage inspection passed
  | 'fail'                   // stage inspection failed
  | 'awaiting_reinspection'  // stage failed; awaiting re-inspection booking
export type ChecklistResult = 'pass' | 'fail' | 'na' | 'pending'
export type InspectorDiscipline =
  | 'structural'
  | 'geotech'
  | 'electrical'
  | 'mechanical'
  | 'plumbing'
  | 'architectural'
  | 'fire_protection'
export type Region = 'burnaby' | 'vancouver' | 'surrey' | 'coquitlam' | 'richmond'

/** Inspector onboarding / credential review status. Vero reviews first; only approved inspectors access the Live Board. */
export type InspectorOnboardingStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'needs_info'
  | 'approved'
  | 'rejected'
  | 'suspended'

export type InspectorRoleLane =
  | 'permit_coordinator_non_signing'
  | 'architect'
  | 'engineer'
  | 'certified_professional'
  | 'electrical_fsr'
  | 'official_authority'

export interface InspectorEligibilityProfile {
  userId: string
  status: InspectorOnboardingStatus
  disciplines: InspectorDiscipline[]
  regions: Region[]
  requestedRoleLanes: InspectorRoleLane[]
  approvedRoleLanes: InspectorRoleLane[]
  licenseNumber?: string
  /** Formal license/registration number for authority-facing documents (BC Schedule C-B). */
  inspectorLicenseNo?: string
  credentialExpiresAt?: string
  updatedAt?: string
  reviewerNote?: string
}

/** Types of inspector credentials uploaded to Vero for review. */
export type InspectorCredentialType =
  | 'government_id'
  | 'primary_license'
  | 'insurance'
  | 'worksafe'
  | 'tsbc_or_fsr'
  | 'gas_ticket'
  | 'professional_designation'
  | 'other'
  // Role-lane-specific credential types (Phase 1 role-lane model)
  | 'resume'                       // Resume or experience summary (global)
  | 'good_standing_proof'          // Proof of current good standing / active registry match
  | 'firm_practice_cert'           // AIBC Certificate of Practice or EGBC Permit to Practice (firm)
  | 'cp_qualification'             // CP program qualification or status
  | 'non_signing_declaration'      // Signed declaration: non-signing / cannot issue inspection outcomes
  | 'employer_evidence'            // Employer / contractor relationship evidence (Electrical FSR)
  | 'ahj_authorization'            // AHJ employment or appointment letter (Official Authority)
  | 'boabc_qualification'          // BOABC class / qualification details (Official Authority)
  | 'conflict_of_interest_declaration' // Signed conflict-of-interest declaration (all applicants)
  | 'data_handling_acknowledgement'    // Signed evidence / data-handling acknowledgement (all applicants)
  | 'digital_seal'                     // Professional digital seal image for Schedule C-B signature block

// ─── GPS / Location ───────────────────────────────────────────────────────────

export interface GPSCoord {
  lat: number
  lng: number
  accuracy: number // meters
  timestamp: string // ISO 8601
  deviceId: string
}

// ─── Users ───────────────────────────────────────────────────────────────────

export interface InspectorProfile {
  id: string
  firstName: string
  lastName: string
  name: string
  licenseNumber: string
  /** Formal license/registration number for authority-facing documents (BC Schedule C-B). */
  inspectorLicenseNo?: string
  discipline: InspectorDiscipline[]
  region: Region[]
  rating: number
  completedInspections: number
  photoUrl?: string
  isAvailable: boolean
  currentLocation?: GPSCoord
  earningsToday: number
  earningsWeek: number
  earningsMonth: number
  /** Firm or practice name — maps to Schedule C-B "Print name of firm" field. */
  firmName?: string
  /** Business / practice address for authority-facing documents. */
  businessAddress?: string
  /** Storage path of the professional digital seal for Schedule C-B signature block injection. */
  digitalSealUrl?: string
}

export interface BuilderProfile {
  id: string
  companyName: string
  contactName: string
  email: string
  phone: string
  activeProjects: number
}

// ─── Projects ────────────────────────────────────────────────────────────────

/** Legacy: single permit number; prefer permits[] from getBuilderProjectView. */
export interface Project {
  id: string
  builderId: string
  name: string
  address: string
  city: string
  /** @deprecated Legacy single permit; use getBuilderProjectView(project).permits for multi-permit. */
  permitNumber: string
  currentStage: number // 1-5
  stages: StageProgress[]
  status: InspectionStatus
  photos: InspectionPhoto[]
  gpsCoord: GPSCoord
  createdAt: string
  updatedAt: string
  /** When the stage checklist is unlocked for city staff. Emergency = immediately (requestedAt); others = requestedAt + tier delay. */
  checklistUnlockedAt?: string
  /** Dispatch tier for the current inspection request; used to derive checklist unlock. */
  dispatchTier?: DispatchTier
  /** Scope used for rules evaluation (e.g. project name or description). */
  projectScope?: string
  /** Result of rules engine; set on project create/load for builder compliance view. */
  ruleResult?: RuleResult
}

/** One permit in the builder project view (current or suggested). */
export interface ProjectPermitSummary {
  kind: string
  label: string
  permitNumber?: string
  /** From rules suggestion vs existing on project */
  source: 'existing' | 'suggested'
}

/** Runtime view for builder project detail: compliance + permits from domain/rules. */
export interface BuilderProjectView {
  /** Underlying legacy project ref */
  project: Project
  propertySite: { address: string; city: string; province: string }
  jurisdiction: { id: string; name: string; region?: string }
  codeSource: 'BCBC' | 'VBBL' | 'both'
  triggers: string[]
  suggestedPermitKinds: string[]
  /** Current + suggested permits for display; no longer single permitNumber only. */
  permits: ProjectPermitSummary[]
}

export interface StageProgress {
  stageNumber: number
  stageName: string
  status: InspectionStatus
  completedAt?: string
  inspectorId?: string
  scheduleC_B?: string // URL to PDF
}

// ─── Inspection Stages & Checklist ───────────────────────────────────────────

export interface InspectionStage {
  id: number
  name: string
  shortName: string
  description: string
  items: ChecklistItemDef[]
}

export interface ChecklistItemDef {
  id: string
  label: string
  description?: string
}

export interface ChecklistItemState {
  itemId: string
  result: ChecklistResult
  photos: InspectionPhoto[]
  voiceNote?: string
  failNote?: string
  pins: PinAnnotation[]
  resolvedAt?: string
}

export interface PinAnnotation {
  id: string
  x: number // 0-100 percentage
  y: number // 0-100 percentage
  note: string
  photoId: string
}

// ─── Inspection Jobs ─────────────────────────────────────────────────────────

export interface JobTimeSlot {
  date: string       // YYYY-MM-DD
  startTime: string  // HH:MM
  endTime: string    // HH:MM
  flexible?: boolean
}

export type ReliabilityEnforcementMode = 'observe_only' | 'soft_enforcement' | 'full_enforcement'

export interface ClaimCommitment {
  accepted: boolean
  version: string
  acceptedAt: string
  policyMode?: ReliabilityEnforcementMode
}

export interface InspectionJob {
  id: string
  projectId: string
  projectName: string
  address: string
  city: string
  permitNumber?: string
  projectType?: string   // e.g. "Single Family Duplex", "Commercial Podium"
  catalogueModelCode?: string  // Small-housing catalogue model (display/metadata only)
  stage: number
  stageName: string
  dispatchTier: DispatchTier
  offeredRate: number
  estimatedDuration: number // minutes
  distance: number // km
  region: Region
  requiredDiscipline: InspectorDiscipline
  status: InspectionStatus
  requestedAt: string
  scheduledFor?: string
  claimedBy?: string
  escrowAmount: number
  pricingMode?: PricingMode
  specialistRole?: SpecialistRoleId
  baseHourlyRate?: number
  effectiveHourlyRate?: number
  billableHours?: number
  holdHours?: number
  holdCost?: number
  urgencyMultiplier?: number
  platformCommissionAmount?: number
  requiresProfessionalSeal?: boolean
  requiresCP?: boolean
  inspectionType?: PricingInspectionType
  credentialClass?: SpecialistCredentialClass
  // Scheduling
  availableSlots?: JobTimeSlot[]
  attendanceConfirmations?: JobAttendanceConfirmation[]
  nextAttendanceCheckIn?: NextAttendanceCheckIn
  // Builder context
  builderId?: string
  builderName?: string
  builderRating?: number
  builderCompletedJobs?: number
  builderNotes?: string
  // Re-inspection
  isReinspection?: boolean
  previousFailNotes?: string[]
  // Gear / requirements
  requiredGear?: string[]
}

export type AttendanceConfirmationCheckpoint =
  | 'initial_claim'
  | 't_24h'
  | 't_4h'
  | 't_90m'
  | 'departure'
  | 'arrival'

export type AttendanceConfirmationStatus =
  | 'pending'
  | 'confirmed'
  | 'missed'
  | 'not_required'
  | 'cancelled'

export type AttendanceEscalationStatus =
  | 'none'
  | 'at_risk'
  | 'admin_alerted'
  | 'standby_prepared'
  | 'standby_activation_requested'

export type AttendanceProximityStatus =
  | 'not_checked'
  | 'within_range'
  | 'outside_range'
  | 'manual_evidence_required'

export interface JobAttendanceConfirmation {
  id?: string
  confirmationToken?: string
  jobId?: string
  assignmentId?: string
  appointmentId?: string
  inspectorId?: string
  builderId?: string
  checkpoint: AttendanceConfirmationCheckpoint
  status: AttendanceConfirmationStatus
  escalationStatus?: AttendanceEscalationStatus
  requiredAt?: string | null
  scheduledStartAt?: string | null
  reminderScheduledAt?: string | null
  reminderSentAt?: string | null
  confirmedAt?: string | null
  missedAt?: string | null
  criticalAlertOnMiss?: boolean
  standbyPrepareOnMiss?: boolean
  standbyActivateOnMiss?: boolean
  proximityStatus?: AttendanceProximityStatus | null
  evidenceRequired?: boolean
}

export interface NextAttendanceCheckIn {
  checkpoint: AttendanceConfirmationCheckpoint
  status: AttendanceConfirmationStatus
  confirmationId?: string
  confirmationToken?: string
  requiredAt?: string | null
  label?: string
  critical?: boolean
  manualTrigger?: boolean
  geoFenced?: boolean
}

// ─── Active Inspection ────────────────────────────────────────────────────────

export interface ActiveInspection {
  id: string
  jobId: string
  inspectorId: string
  projectId: string
  projectName: string
  address: string
  stage: number
  stageName: string
  permitNumber?: string
  startedAt: string
  timerSeconds: number
  checklistState: Record<string, ChecklistItemState>
  preFlightPhotos: InspectionPhoto[]
  gpsAtArrival?: GPSCoord
  digitalSealApplied: boolean
  scheduleC_B_url?: string
  offlineQueue: OfflineAction[]
}

export interface OfflineAction {
  id: string
  type: 'checklist_update' | 'photo_upload' | 'pin_drop' | 'voice_note'
  payload: Record<string, unknown>
  timestamp: string
  synced: boolean
}

// ─── Photos ───────────────────────────────────────────────────────────────────

export interface InspectionPhoto {
  id: string
  url: string
  thumbnailUrl: string
  takenAt: string
  gps?: GPSCoord
  /** Free-text location description used when GPS EXIF data is unavailable. */
  manualLocationNote?: string
  pins: PinAnnotation[]
  stage?: number
  itemId?: string
  deviceId?: string
}

// ─── Completed Inspections (Auditor Vault) ────────────────────────────────────

export interface CompletedInspection {
  id: string
  permitNumber: string
  address: string
  city: string
  stage: number
  stageName: string
  inspectorName: string
  inspectorLicense: string
  status: 'pass' | 'fail' | 'stopped'
  completedAt: string
  gpsAtArrival: GPSCoord
  cryptoHash: string
  deviceId: string
  scheduleC_B_url: string
  photos: InspectionPhoto[]
  checklistSummary: {
    total: number
    passed: number
    failed: number
    na: number
  }
}

// ─── Domain re-exports (permit compliance model) ──────────────────────────────
// Canonical domain: Project, Permit, Authority, Submission, Evidence, Deficiency in lib/domain
export type {
  EvidenceItem as DomainEvidenceItem,
  EvidenceManifest as DomainEvidenceManifest,
  EvidenceArchive as DomainEvidenceArchive,
  Deficiency as DomainDeficiency,
  Permit as DomainPermit,
  Authority as DomainAuthority,
  Submission as DomainSubmission,
  Project as DomainProject,
} from '@/lib/domain/types'

// ─── Payments / Escrow ────────────────────────────────────────────────────────

/** Blueprint 9-state payment lifecycle for an inspection job's escrow. */
export type EscrowStatus =
  | 'authorized'           // payment authorised by Stripe; not yet captured
  | 'held'                 // funds captured and held in escrow
  | 'reserved'             // portion ring-fenced for a provisional assignment
  | 'earned_pending_review' // inspection complete; awaiting Vero release approval
  | 'payout_ready'         // approved for payout; queued for transfer to inspector
  | 'released'             // funds transferred to inspector
  | 'refunded'             // funds returned to builder (cancellation / failed dispute)
  | 'disputed'             // outcome contested; funds frozen pending resolution
  | 'blocked'              // admin-blocked (fraud review, compliance hold, etc.)

export interface EscrowRecord {
  jobId: string
  amount: number
  status: EscrowStatus
  stripePaymentIntentId: string
  heldAt: string
  releasedAt?: string
}

// ─── Hold Aging ───────────────────────────────────────────────────────────────

/** Lifecycle status of a single hold point raised during an active inspection. */
export type HoldStatus =
  | 'hold_offered'              // inspector created the hold proposal
  | 'hold_pending_builder_ack'  // builder has been notified; awaiting commercial decision
  | 'hold_active'               // builder accepted; on-site retainer is active
  | 'hold_resolved_pass'        // inspector resolved the correction as pass
  | 'hold_resolved_fail'        // inspector resolved the correction as fail
  | 'hold_declined'             // builder declined commercial terms
  | 'hold_expired'              // expiry elapsed with no builder response
  | 'admin_resolved'            // admin manually closed the hold

// Payment state for a Hold's re-verification fee. Tracked separately from the
// workflow status: a Hold is only active/fee-locked once payment is 'paid'.
export type HoldPaymentStatus = 'unpaid' | 'paid' | 'failed' | 'cancelled'

export type HoldPremiumRateType = 'hourly' | 'flat'
export type HoldCategory =
  | 'minor_deficiency'
  | 'coordination'
  | 'access'
  | 'safety'
  | 'documentation'
  | 'other'
export type HoldResolution = 'pass' | 'fail'
export type HoldEvidenceType = 'photo' | 'video' | 'note' | 'attachment'
export type HoldEvidenceRole = 'deficiency' | 'correction'

/**
 * A hold point raised by an inspector against an active inspection job.
 *
 * Aging windows (derived from dispatch tier at hold-placement time):
 *   standard  → 4 hours
 *   priority  → 2 hours
 *   emergency → 1 hour
 *
 * [C1] expiresAt is read-only from the client's perspective. It is computed
 * exclusively by the service layer (holds.ts → placeHold) as:
 *   placed_at + tier_interval
 * It is never accepted as a parameter from any client call site.
 */
export interface HoldRecord {
  id: string
  jobId: string
  inspectorId: string
  builderId: string
  createdByInspectorId: string
  relatedInspectionId: string
  placedAt: string
  /** [C1] Computed server-side only. Never supplied by the client. */
  expiresAt: string
  /** [C2] Stored as a JSON array in Postgres and normalized to string[] in the app. */
  checklistItemIds: string[]
  status: HoldStatus
  /** Re-verification payment state. Defaults to 'unpaid'; only the verified Stripe webhook sets 'paid'. */
  holdPaymentStatus: HoldPaymentStatus
  reason: string
  deficiencyReason?: string
  holdCategory: HoldCategory
  holdEligibleForOnSiteCorrection: boolean
  estimatedCorrectionMinutes: number
  premiumRateType: HoldPremiumRateType
  premiumRateAmount: number
  holdCapAmount: number
  builderAcceptedAt?: string
  builderDeclinedAt?: string
  holdStartedAt?: string
  holdEndedAt?: string
  holdResolution?: HoldResolution
  holdResolutionNotes?: string
  holdResolvedByUserId?: string
  linkedCorrectionEvidenceIds: string[]
  affectedItemSummaries: string[]
  premiumChargeAmount: number
  actualRetainedMinutes: number
  extensionCount: number
  builderNote?: string
  resolutionSummary?: string
  resolvedAt?: string
  expiredAt?: string
  lastNotifiedAt?: string
  lastBuilderResponseAt?: string
  /** Set by the builder at acceptance — the correction window they reserved (minutes). */
  builderSelectedCorrectionMinutes?: number
  createdAt: string
  updatedAt: string
}

// ─── Retention / Premium Hourly ─────────────────────────────────────────────

export type RetentionSessionStatus =
  | 'pending_approval'
  | 'active'
  | 'extended'
  | 'completed'
  | 'cancelled'

/** An on-site retention session authorised by the builder during a hold. */
export interface RetentionSession {
  id: string
  holdId: string
  jobId: string
  inspectorId: string
  builderId: string
  dispatchTier: DispatchTier
  /** Premium hourly rate charged to builder (escrow add-on). */
  hourlyRate: number
  /** Initial block in hours (1–3). */
  initialHours: number
  /** Total hours booked (initial + extensions). */
  totalHoursBooked: number
  /** Total minutes authorized for this hold window. */
  totalMinutesBooked?: number
  /** Actual elapsed seconds. */
  elapsedSeconds: number
  /** Maximum builder exposure for the hold. */
  chargeCapAmount?: number
  /** Current accrued premium amount after cap enforcement. */
  accruedChargeAmount?: number
  /** Whether the session is currently running. */
  status: RetentionSessionStatus
  /** Defect item IDs that were fixed during retention. */
  resolvedDefectIds: string[]
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

export interface DispatchPricing {
  tier: DispatchTier
  label: string
  description: string
  timeframe: string
  baseRate: number
  multiplier: number
  price: number
}

// ─── Assignment (blueprint claim model) ───────────────────────────────────────

/** Reasons a builder may object to a provisional assignment. Only these five are accepted. */
export type ObjectionReason =
  | 'conflict_of_interest'
  | 'access_concern'
  | 'continuity_requirement'
  | 'credential_mismatch'
  | 'prior_admin_restriction'

export type AssignmentStatus =
  | 'provisional'    // inspector claimed; builder objection window open
  | 'confirmed'      // window closed with no objection, or admin confirmed
  | 'cancelled'      // admin sustained the objection and cancelled the assignment
  | 'invalidated'    // admin override
  | 'completed'      // inspection sealed and assignment closed

export interface Assignment {
  id: string
  jobId: string
  projectName?: string
  builderId: string
  inspectorId: string
  inspectorName: string
  inspectorLicense: string
  inspectorDisciplines: InspectorDiscipline[]
  inspectorRegions: Region[]
  claimedAt: string               // ISO
  objectionWindowClosesAt: string // ISO — tier-based: emergency=30m, priority=1h, standard=1h
  claimedSlot: JobTimeSlot
  status: AssignmentStatus
  objectionState?: 'none' | 'pending_review' | 'sustained' | 'overruled'
  objectionReason?: ObjectionReason
  objectionNote?: string
  objectedAt?: string
  confirmedAt?: string
  adminNote?: string
  invalidatedAt?: string
}
