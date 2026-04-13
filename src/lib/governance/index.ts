export type DispatchTier = 'standard' | 'priority' | 'emergency'
export type EscrowStatus =
  | 'authorized'
  | 'held'
  | 'reserved'
  | 'earned_pending_review'
  | 'payout_ready'
  | 'released'
  | 'refunded'
  | 'disputed'
  | 'blocked'
export type InspectorDiscipline =
  | 'structural'
  | 'geotech'
  | 'electrical'
  | 'mechanical'
  | 'plumbing'
  | 'architectural'
export type InspectorOnboardingStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'needs_info'
  | 'approved'
  | 'rejected'
  | 'suspended'
export type Region = 'burnaby' | 'vancouver' | 'surrey' | 'coquitlam' | 'richmond'

export interface RuleResult {
  jurisdiction: {
    id: string
    name: string
    codeSource: 'BCBC' | 'VBBL' | 'both'
    region?: string
    metadata?: Record<string, unknown>
  }
  codeSource: 'BCBC' | 'VBBL' | 'both'
  triggers: string[]
  suggestedPermitKinds: string[]
}

export type GovernanceRuleId = `R-${string}`
export type GovernanceBlockerType = 'technical' | 'commercial' | 'access'
export type GovernanceValidationStatus = 'validated' | 'blocked'

export interface GovernanceIssue {
  ruleId: GovernanceRuleId
  code: string
  message: string
  blockerType: GovernanceBlockerType
  hardBlocker: boolean
  adminOverride: boolean
  metadata?: Record<string, unknown>
}

export interface GovernanceResult {
  ok: boolean
  blockers: GovernanceIssue[]
  warnings: GovernanceIssue[]
}

export interface ProjectGovernanceInput {
  builderId?: string
  builderStatus?: InspectorOnboardingStatus | null
  name: string
  address: string
  city: string
  permitNumber?: string
  projectScope?: string
  ruleResult?: RuleResult
}

export interface ProjectGovernanceResult extends GovernanceResult {
  completenessStatus: 'complete' | 'needs_info'
  ruleResult: RuleResult
}

export interface JobPostingGovernanceInput {
  jobId?: string
  projectId?: string
  builderId?: string
  builderStatus?: InspectorOnboardingStatus | null
  projectName: string
  address: string
  city: string
  permitFamily: string
  permitNumber?: string
  requiredDiscipline: InspectorDiscipline
  region: Region
  stage: number
  stageName: string
  projectComplete?: boolean
  dependencySealed?: boolean
  escrowAuthorized?: boolean
}

export interface JobPostingGovernanceResult extends GovernanceResult {
  status: 'live' | 'pending_validation'
}

export interface ClaimGovernanceInput {
  jobStatus: string
  jobValidationStatus?: string | null
  permitFamily: string
  requiredDiscipline: InspectorDiscipline
  region: Region
  inspectorDisciplines: InspectorDiscipline[]
  inspectorRegions: Region[]
  onboardingStatus?: InspectorOnboardingStatus | null
  credentialExpiryDate?: string
  assignmentLocked?: boolean
}

export interface EvidenceUploadGovernanceInput {
  mimeType?: string
  fileSize?: number
  maxSizeMb?: number
}

export interface OutcomeGovernanceInput {
  outcome: 'pass' | 'hold' | 'fail'
  requiredChecklistComplete: boolean
  evidenceCount: number
  hasOpenHold: boolean
  actorRole: 'inspector' | 'builder' | 'admin'
}

export interface HoldResolutionGovernanceInput {
  action: 'accept' | 'decline' | 'resolve'
  holdStatus: string
  technicalResolved?: boolean
}

export interface SealGovernanceInput {
  submissionStatus?: string
  hasOpenHold: boolean
  hasTechnicalBlockers: boolean
  evidenceCount: number
  sealed: boolean
  checklistPendingCount?: number
}

export interface ExportGovernanceInput {
  sealed: boolean
  hasTechnicalBlockers: boolean
  hasReadinessBlockers: boolean
  hasOpenHold: boolean
}

export interface PayoutGovernanceInput {
  escrowStatus: EscrowStatus
  hasBlockingDispute: boolean
  hasControlPlaneException: boolean
}

export interface PackageIntegrityInput {
  recordId: string
  versionNumber: number
  sealedAt: string
  sealedById?: string
  manifest: Record<string, unknown>
}

export interface PackageIntegritySnapshot {
  versionNumber: number
  packageHash: string
  verificationCode: string
  sealedAt: string
  sealedById?: string
}

const PERMIT_DISCIPLINE_MATRIX: Record<string, InspectorDiscipline[]> = {
  building: ['structural', 'geotech', 'mechanical', 'architectural'],
  electrical: ['electrical'],
  plumbing: ['plumbing'],
  mechanical: ['mechanical'],
  demolition: ['structural', 'architectural'],
  other: ['structural', 'geotech', 'electrical', 'mechanical', 'plumbing', 'architectural'],
}

function blocker(
  ruleId: GovernanceRuleId,
  code: string,
  message: string,
  blockerType: GovernanceBlockerType,
  metadata?: Record<string, unknown>,
): GovernanceIssue {
  return {
    ruleId,
    code,
    message,
    blockerType,
    hardBlocker: true,
    adminOverride: blockerType !== 'access',
    metadata,
  }
}

function warning(
  ruleId: GovernanceRuleId,
  code: string,
  message: string,
  blockerType: GovernanceBlockerType,
  metadata?: Record<string, unknown>,
): GovernanceIssue {
  return {
    ruleId,
    code,
    message,
    blockerType,
    hardBlocker: false,
    adminOverride: true,
    metadata,
  }
}

function result(blockers: GovernanceIssue[], warnings: GovernanceIssue[] = []): GovernanceResult {
  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
  }
}

export function normalizePermitFamily(permitFamily?: string): string {
  const normalized = permitFamily?.trim().toLowerCase() ?? 'other'
  return PERMIT_DISCIPLINE_MATRIX[normalized] ? normalized : 'other'
}

export function getAllowedDisciplinesForPermitFamily(permitFamily?: string): InspectorDiscipline[] {
  return PERMIT_DISCIPLINE_MATRIX[normalizePermitFamily(permitFamily)]
}

export function validateProjectGovernance(input: ProjectGovernanceInput): ProjectGovernanceResult {
  const blockers: GovernanceIssue[] = []
  const warnings: GovernanceIssue[] = []

  if (input.builderStatus !== 'approved') {
    blockers.push(
      blocker(
        'R-010',
        'builder_not_approved',
        'Builder approval is required before governed projects can be created.',
        'access',
        { builderId: input.builderId, builderStatus: input.builderStatus ?? 'draft' },
      ),
    )
  }

  if (!input.name.trim() || !input.address.trim() || !input.city.trim()) {
    blockers.push(
      blocker(
        'R-011',
        'project_identity_incomplete',
        'Project name, address, and city are required before jobs can be governed against this project.',
        'technical',
      ),
    )
  }

  if (!input.permitNumber?.trim()) {
    warnings.push(
      warning(
        'R-011',
        'permit_number_missing',
        'Permit number is not present yet. Jobs for this project should remain non-live until permit identity is complete.',
        'technical',
      ),
    )
  }

  const ruleResult = input.ruleResult ?? inferRuleResult(input)

  return {
    ...result(blockers, warnings),
    completenessStatus: blockers.length === 0 ? 'complete' : 'needs_info',
    ruleResult,
  }
}

function inferRuleResult(input: Pick<ProjectGovernanceInput, 'address' | 'city' | 'projectScope' | 'name'>): RuleResult {
  const city = input.city.toLowerCase()
  const scope = (input.projectScope ?? input.name).toLowerCase()
  const triggers: string[] = []
  const suggestedPermitKinds = ['building']

  if (scope.includes('electrical')) {
    triggers.push('tsbc_electrical')
    suggestedPermitKinds.push('electrical')
  }
  if (scope.includes('septic')) {
    triggers.push('septic')
    suggestedPermitKinds.push('onsite_sewage_septic')
  }

  const jurisdiction = city.includes('vancouver')
    ? { id: 'vancouver', name: 'City of Vancouver', codeSource: 'VBBL' as const, region: 'Metro Vancouver' }
    : { id: 'bc', name: 'Province of British Columbia', codeSource: 'BCBC' as const, region: 'BC' }

  return {
    jurisdiction,
    codeSource: jurisdiction.codeSource,
    triggers,
    suggestedPermitKinds,
  }
}

export function validateJobPostingGovernance(input: JobPostingGovernanceInput): JobPostingGovernanceResult {
  const blockers: GovernanceIssue[] = []

  if (input.builderStatus !== 'approved') {
    blockers.push(
      blocker(
        'R-012',
        'builder_not_approved',
        'Builder approval is required before a job can go live.',
        'access',
        { builderId: input.builderId, builderStatus: input.builderStatus ?? 'draft' },
      ),
    )
  }

  if (!input.projectName.trim() || !input.address.trim() || !input.city.trim() || !input.stageName.trim()) {
    blockers.push(
      blocker(
        'R-011',
        'job_identity_incomplete',
        'Project name, address, city, and stage name are required before governed dispatch.',
        'technical',
      ),
    )
  }

  if (input.projectComplete === false || !input.permitNumber?.trim()) {
    blockers.push(
      blocker(
        'R-012',
        'project_not_complete',
        'Project identity and permit details must be complete before live posting.',
        'technical',
        { projectId: input.projectId },
      ),
    )
  }

  const permitFamily = normalizePermitFamily(input.permitFamily)
  const allowedDisciplines = getAllowedDisciplinesForPermitFamily(permitFamily)
  if (!allowedDisciplines.includes(input.requiredDiscipline)) {
    blockers.push(
      blocker(
        'R-014',
        'discipline_mismatch',
        `${input.requiredDiscipline} does not satisfy the ${permitFamily} permit family.`,
        'technical',
        { permitFamily, requiredDiscipline: input.requiredDiscipline, allowedDisciplines },
      ),
    )
  }

  if (!PERMIT_DISCIPLINE_MATRIX[permitFamily]) {
    blockers.push(
      blocker(
        'R-013',
        'invalid_permit_family',
        'Job permit family is not recognized by the governed dispatch matrix.',
        'technical',
        { permitFamily: input.permitFamily },
      ),
    )
  }

  if (input.dependencySealed === false) {
    blockers.push(
      blocker(
        'R-015',
        'dependency_not_sealed',
        'A prior required stage is not sealed yet, so this job cannot progress to live posting.',
        'technical',
        { projectId: input.projectId, stage: input.stage },
      ),
    )
  }

  if (input.escrowAuthorized !== true) {
    blockers.push(
      blocker(
        'R-016',
        'escrow_not_authorized',
        'Escrow authorization must be green before the job can go live.',
        'commercial',
        { jobId: input.jobId, projectId: input.projectId },
      ),
    )
  }

  const validation = result(blockers)
  return {
    ...validation,
    status: validation.ok ? 'live' : 'pending_validation',
  }
}

export function validateClaimGovernance(input: ClaimGovernanceInput): GovernanceResult {
  const blockers: GovernanceIssue[] = []

  if (input.jobStatus !== 'live') {
    blockers.push(
      blocker(
        'R-018',
        'job_not_live',
        'Only live governed jobs can be claimed.',
        'technical',
        { jobStatus: input.jobStatus },
      ),
    )
  }

  if (input.jobValidationStatus && input.jobValidationStatus !== 'validated') {
    blockers.push(
      blocker(
        'R-018',
        'job_not_validated',
        'Job validation is incomplete or blocked, so governed claim is denied.',
        'technical',
        { jobValidationStatus: input.jobValidationStatus },
      ),
    )
  }

  if (input.onboardingStatus !== 'approved') {
    blockers.push(
      blocker(
        'R-006',
        'inspector_not_approved',
        'Inspector approval is required before governed dispatch participation.',
        'access',
        { onboardingStatus: input.onboardingStatus ?? 'draft' },
      ),
    )
  }

  const allowedDisciplines = getAllowedDisciplinesForPermitFamily(input.permitFamily)
  if (!allowedDisciplines.includes(input.requiredDiscipline) || !input.inspectorDisciplines.includes(input.requiredDiscipline)) {
    blockers.push(
      blocker(
        'R-018',
        'discipline_ineligible',
        'Inspector credentials do not satisfy the permit family and discipline required for this claim.',
        'technical',
        {
          permitFamily: normalizePermitFamily(input.permitFamily),
          requiredDiscipline: input.requiredDiscipline,
          inspectorDisciplines: input.inspectorDisciplines,
        },
      ),
    )
  }

  if (!input.inspectorRegions.includes(input.region)) {
    blockers.push(
      blocker(
        'R-018',
        'region_ineligible',
        'Inspector is not approved for the job region.',
        'technical',
        { region: input.region, inspectorRegions: input.inspectorRegions },
      ),
    )
  }

  if (input.credentialExpiryDate) {
    const expiry = new Date(input.credentialExpiryDate)
    if (!Number.isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
      blockers.push(
        blocker(
          'R-009',
          'credential_expired',
          'Critical inspector credentials are expired.',
          'access',
          { credentialExpiryDate: input.credentialExpiryDate },
        ),
      )
    }
  }

  if (input.assignmentLocked) {
    blockers.push(
      blocker(
        'R-019',
        'assignment_locked',
        'A provisional or confirmed assignment already exists for this job.',
        'technical',
      ),
    )
  }

  return result(blockers)
}

export function validateEvidenceUpload(input: EvidenceUploadGovernanceInput): GovernanceResult {
  const blockers: GovernanceIssue[] = []
  const maxBytes = (input.maxSizeMb ?? 25) * 1024 * 1024

  if (!input.mimeType?.trim()) {
    blockers.push(
      blocker(
        'R-025',
        'unsupported_file',
        'Evidence upload requires a supported MIME type.',
        'technical',
      ),
    )
  }

  if (typeof input.fileSize === 'number' && input.fileSize <= 0) {
    blockers.push(
      blocker(
        'R-025',
        'corrupt_upload',
        'Evidence upload appears corrupt or empty.',
        'technical',
      ),
    )
  }

  if (typeof input.fileSize === 'number' && input.fileSize > maxBytes) {
    blockers.push(
      blocker(
        'R-025',
        'file_too_large',
        `Evidence upload exceeds the ${input.maxSizeMb ?? 25} MB governed size limit.`,
        'technical',
      ),
    )
  }

  return result(blockers)
}

export function validateOutcomeSelection(input: OutcomeGovernanceInput): GovernanceResult {
  const blockers: GovernanceIssue[] = []

  if (input.outcome === 'pass') {
    if (!input.requiredChecklistComplete || input.evidenceCount <= 0 || input.hasOpenHold) {
      blockers.push(
        blocker(
          'R-028',
          'pass_blocked',
          'Pass requires all required items complete, evidence present, and no open Hold.',
          'technical',
          {
            requiredChecklistComplete: input.requiredChecklistComplete,
            evidenceCount: input.evidenceCount,
            hasOpenHold: input.hasOpenHold,
          },
        ),
      )
    }
  }

  if (input.outcome === 'hold' && input.actorRole !== 'inspector') {
    blockers.push(
      blocker(
        'R-029',
        'hold_actor_invalid',
        'Only the inspector can initiate a governed Hold.',
        'access',
      ),
    )
  }

  return result(blockers)
}

export function validateHoldResolution(input: HoldResolutionGovernanceInput): GovernanceResult {
  const blockers: GovernanceIssue[] = []
  const actionableStatuses = ['hold_offered', 'hold_pending_builder_ack', 'open']
  const activeStatuses = ['hold_active', 'builder_approved']

  if (input.action === 'accept' && !actionableStatuses.includes(input.holdStatus)) {
    blockers.push(
      blocker(
        'R-031',
        'hold_not_open_for_acceptance',
        'Only an open Hold can move to the builder acceptance path.',
        'technical',
        { holdStatus: input.holdStatus },
      ),
    )
  }

  if (input.action === 'decline' && !actionableStatuses.includes(input.holdStatus)) {
    blockers.push(
      blocker(
        'R-032',
        'hold_not_open_for_decline',
        'Only an open Hold can be declined into an immediate fail path.',
        'technical',
        { holdStatus: input.holdStatus },
      ),
    )
  }

  if (input.action === 'resolve') {
    if (!activeStatuses.includes(input.holdStatus)) {
      blockers.push(
        blocker(
          'R-033',
          'hold_not_acknowledged',
          'Hold resolution requires builder acknowledgment first.',
          'technical',
          { holdStatus: input.holdStatus },
        ),
      )
    }
    if (input.technicalResolved !== true) {
      blockers.push(
        blocker(
          'R-033',
          'technical_resolution_incomplete',
          'Inspector cannot resolve the Hold while technical blockers remain.',
          'technical',
        ),
      )
    }
  }

  return result(blockers)
}

export function validateSealSubmissionRequest(input: SealGovernanceInput): GovernanceResult {
  const blockers: GovernanceIssue[] = []

  if (input.sealed) {
    blockers.push(
      blocker(
        'R-036',
        'already_sealed',
        'Submission is already sealed.',
        'technical',
      ),
    )
  }

  if (input.hasOpenHold || input.submissionStatus === 'hold_open') {
    blockers.push(
      blocker(
        'R-036',
        'open_hold_blocks_seal',
        'Open Holds block submission sealing.',
        'technical',
      ),
    )
  }

  if (input.hasTechnicalBlockers || (input.checklistPendingCount ?? 0) > 0 || input.evidenceCount <= 0) {
    blockers.push(
      blocker(
        'R-036',
        'technical_blocker_prevents_seal',
        'Submission sealing is blocked until required evidence and technical checks are complete.',
        'technical',
        {
          checklistPendingCount: input.checklistPendingCount ?? 0,
          evidenceCount: input.evidenceCount,
          hasTechnicalBlockers: input.hasTechnicalBlockers,
        },
      ),
    )
  }

  return result(blockers)
}

export function validatePackageExportRequest(input: ExportGovernanceInput): GovernanceResult {
  const blockers: GovernanceIssue[] = []

  if (!input.sealed) {
    blockers.push(
      blocker(
        'R-039',
        'package_not_sealed',
        'Package export requires a sealed submission.',
        'technical',
      ),
    )
  }

  if (input.hasOpenHold || input.hasTechnicalBlockers || input.hasReadinessBlockers) {
    blockers.push(
      blocker(
        'R-039',
        'package_export_blocked',
        'Technical or readiness blockers prevent export.',
        'technical',
        {
          hasOpenHold: input.hasOpenHold,
          hasTechnicalBlockers: input.hasTechnicalBlockers,
          hasReadinessBlockers: input.hasReadinessBlockers,
        },
      ),
    )
  }

  return result(blockers)
}

export function validatePayoutRelease(input: PayoutGovernanceInput): GovernanceResult {
  const blockers: GovernanceIssue[] = []

  if (input.hasBlockingDispute) {
    blockers.push(
      blocker(
        'R-047',
        'blocking_dispute',
        'Payout cannot be released while a blocking dispute remains open.',
        'commercial',
      ),
    )
  }

  if (input.hasControlPlaneException) {
    blockers.push(
      blocker(
        'R-047',
        'control_plane_exception',
        'Payout cannot be released while a Vero control-plane exception remains unresolved.',
        'commercial',
      ),
    )
  }

  if (input.escrowStatus !== 'payout_ready') {
    blockers.push(
      blocker(
        'R-047',
        'escrow_not_ready',
        `Payout release requires escrow status 'payout_ready', received '${input.escrowStatus}'.`,
        'commercial',
      ),
    )
  }

  return result(blockers)
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(entry => stableSerialize(entry)).join(',')}]`
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)

  return `{${entries.join(',')}}`
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map(chunk => chunk.toString(16).padStart(2, '0'))
    .join('')
}

export function deriveVerificationCode(packageHash: string): string {
  return packageHash
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 12)
    .toUpperCase()
    .replace(/(.{4})/g, '$1-')
    .replace(/-$/, '')
}

export async function createPackageIntegritySnapshot(
  input: PackageIntegrityInput,
): Promise<PackageIntegritySnapshot> {
  const packageHash = await sha256Hex(stableSerialize({
    recordId: input.recordId,
    versionNumber: input.versionNumber,
    sealedAt: input.sealedAt,
    sealedById: input.sealedById ?? null,
    manifest: input.manifest,
  }))

  return {
    versionNumber: input.versionNumber,
    packageHash,
    verificationCode: deriveVerificationCode(packageHash),
    sealedAt: input.sealedAt,
    sealedById: input.sealedById,
  }
}

export function deriveArchiveRetentionTier(completedAt: string): 'standard' | 'professional' | 'legacy' {
  const completed = new Date(completedAt)
  if (Number.isNaN(completed.getTime())) return 'standard'

  const ageYears = (Date.now() - completed.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  if (ageYears <= 2) return 'standard'
  if (ageYears <= 10) return 'professional'
  return 'legacy'
}

export function getHoldObjectionWindowHours(dispatchTier: DispatchTier): number {
  if (dispatchTier === 'emergency') return 2
  if (dispatchTier === 'priority') return 12
  return 24
}
