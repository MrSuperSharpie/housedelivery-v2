import type { RuleResult } from '@/lib/rules/engine'

// ─── Enums ───────────────────────────────────────────────────────────────────

export type DispatchTier = 'standard' | 'priority' | 'emergency'
export type PermitFamily = 'building' | 'electrical' | 'plumbing' | 'mechanical' | 'demolition' | 'other'
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
export type Region = 'burnaby' | 'vancouver' | 'surrey' | 'coquitlam' | 'richmond'

/** Inspector onboarding / credential review status. SiteLine reviews first; only approved inspectors access the Live Board. */
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
  credentialExpiresAt?: string
  updatedAt?: string
  reviewerNote?: string
}

/** Types of inspector credentials uploaded to SiteLine for review. */
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
  name: string
  licenseNumber: string
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

export interface InspectionJob {
  id: string
  projectId: string
  projectName: string
  address: string
  city: string
  permitNumber?: string
  projectType?: string   // e.g. "Single Family Duplex", "Commercial Podium"
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
  // Scheduling
  availableSlots?: JobTimeSlot[]
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
  | 'earned_pending_review' // inspection complete; awaiting SiteLine release approval
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
  | 'open'               // hold placed; awaiting builder response
  | 'builder_approved'   // builder acknowledged; on-site correction authorised
  | 'builder_declined'   // builder declined; job transitioned to 'stopped' [C3]
  | 'expired'            // expires_at elapsed with no builder response; escalation triggered
  | 'admin_resolved'     // admin manually closed the hold

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
  placedAt: string
  /** [C1] Computed server-side only. Never supplied by the client. */
  expiresAt: string
  /** [C2] Stored as a JSON array in Postgres and normalized to string[] in the app. */
  checklistItemIds: string[]
  status: HoldStatus
  reason: string
  builderNote?: string
  resolvedAt?: string
  expiredAt?: string
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
  /** Actual elapsed seconds. */
  elapsedSeconds: number
  /** Whether the session is currently running. */
  status: RetentionSessionStatus
  /** Defect item IDs that were fixed during retention. */
  resolvedDefectIds: string[]
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

/** Premium hourly rate schedule by dispatch tier. */
export const RETENTION_RATES: Record<DispatchTier, number> = {
  standard:  85,
  priority:  120,
  emergency: 175,
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
  builderId: string
  inspectorId: string
  inspectorName: string
  inspectorLicense: string
  inspectorDisciplines: InspectorDiscipline[]
  inspectorRegions: Region[]
  claimedAt: string               // ISO
  objectionWindowClosesAt: string // ISO — tier-based: emergency=2h, priority=12h, standard=24h
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
