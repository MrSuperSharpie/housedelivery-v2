/**
 * Server-backed persistence for compliance workflow.
 * Tables: compliance_completed_records, compliance_deficiencies, compliance_package_versions, inspector_onboarding_status.
 * On error or missing table, callers fall back to local persistence.
 */

import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
import type { CompletedInspectionRecord } from '@/lib/persistence/completedInspections'
import type { RecordDeficiency } from '@/lib/persistence/deficiencies'
import type { PackageVersionRecord } from '@/lib/persistence/packageVersions'
import type {
  InspectorCredentialType,
  InspectorEligibilityProfile,
  InspectorOnboardingStatus,
  InspectorRoleLane,
} from '@/lib/types'
import {
  createPackageIntegritySnapshot,
  deriveArchiveRetentionTier,
  validateSealSubmissionRequest,
} from '@/lib/governance'
import {
  appendGovernanceAuditEvent,
  insertVaultArchiveEvent,
  upsertPackageSeal,
  upsertPaymentDecision,
} from '@/lib/supabase/governance'
import { hasOpenHoldForJob } from '@/lib/supabase/holds'
import { calculatePricingBreakdown } from '@/utils/pricing'
import { hydrateGovernedPaymentAmounts } from '@/lib/governance/payments'
import { normalizeInspectorRoleLanes } from '@/lib/inspectorRoleLanes'

const COMPLETED = 'compliance_completed_records'
const DEFICIENCIES = 'compliance_deficiencies'
const VERSIONS = 'compliance_package_versions'
const ONBOARDING = 'inspector_onboarding_status'
const CREDENTIALS = 'inspector_credentials'

// ─── Completed records ───────────────────────────────────────────────────────

function completedToRow(r: CompletedInspectionRecord): Record<string, unknown> {
  return {
    id: r.id,
    project_id: r.projectId,
    project_name: r.projectName,
    address: r.address,
    city: r.city ?? null,
    stage: r.stage,
    stage_name: r.stageName,
    result: r.result,
    evidence_items: r.evidenceItems,
    completed_at: r.completedAt,
    builder_id: r.builderId ?? null,
    builder_name: r.builderName ?? null,
    inspector_id: r.inspectorId ?? null,
    inspector_name: r.inspectorName,
    inspector_license: r.inspectorLicense,
    pass_items: r.passItems,
    fail_items: r.failItems,
    cert_ref: r.certRef,
    job_ref: r.jobRef ?? null,
    permit_number: r.permitNumber ?? null,
    discipline: r.discipline ?? null,
    region: r.region ?? null,
    jurisdiction_id: r.jurisdictionId ?? null,
    jurisdiction_name: r.jurisdictionName ?? null,
    authority_name: r.authorityName ?? null,
    sealed: r.sealed,
    hold_id: r.holdId ?? null,
    hold_history: r.holdHistory ?? [],
  }
}

function rowToCompleted(row: Record<string, unknown>): CompletedInspectionRecord {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    projectName: row.project_name as string,
    address: row.address as string,
    city: (row.city as string) ?? undefined,
    stage: row.stage as number,
    stageName: row.stage_name as string,
    result: row.result as 'pass' | 'fail' | 'stopped',
    evidenceItems: (row.evidence_items as CompletedInspectionRecord['evidenceItems']) ?? [],
    completedAt: row.completed_at as string,
    builderId: (row.builder_id as string) ?? undefined,
    builderName: (row.builder_name as string) ?? undefined,
    inspectorId: (row.inspector_id as string) ?? undefined,
    inspectorName: row.inspector_name as string,
    inspectorLicense: row.inspector_license as string,
    passItems: (row.pass_items as number) ?? 0,
    failItems: (row.fail_items as number) ?? 0,
    certRef: row.cert_ref as string,
    jobRef: (row.job_ref as string) ?? undefined,
    permitNumber: (row.permit_number as string) ?? undefined,
    discipline: (row.discipline as string) ?? undefined,
    region: (row.region as string) ?? undefined,
    jurisdictionId: (row.jurisdiction_id as string) ?? undefined,
    jurisdictionName: (row.jurisdiction_name as string) ?? undefined,
    authorityName: (row.authority_name as string) ?? undefined,
    sealed: (row.sealed as boolean) ?? true,
    holdId: (row.hold_id as string) ?? undefined,
    holdHistory: (row.hold_history as Record<string, unknown>[]) ?? [],
  }
}

export async function insertCompletedRecord(record: CompletedInspectionRecord): Promise<boolean> {
  const result = await insertCompletedRecordStrict(record)
  return result.ok
}

export async function insertCompletedRecordStrict(record: CompletedInspectionRecord): Promise<{
  ok: boolean
  error?: string
}> {
  const hasOpenHold = record.jobRef ? await hasOpenHoldForJob(record.jobRef) : false
  const sealGovernance = validateSealSubmissionRequest({
    submissionStatus: record.sealed ? 'submitted_for_review' : 'draft',
    hasOpenHold,
    hasTechnicalBlockers: record.evidenceItems.length === 0,
    evidenceCount: record.evidenceItems.length,
    sealed: false,
    checklistPendingCount: record.checklistResults?.filter(item => item.result === 'pending').length ?? 0,
  })

  if (!sealGovernance.ok) {
    return {
      ok: false,
      error: sealGovernance.blockers.map(issue => issue.message).join(' '),
    }
  }

  const { error } = await supabase.from(COMPLETED).insert(completedToRow(record))

  if (error) {
    console.error('insertCompletedRecord:', error)
    return {
      ok: false,
      error: error.message,
    }
  }

  if (record.sealed) {
    // Deep manifest: hash the full evidentiary chain so any downstream mutation
    // (swapped file, altered geo, stripped anomaly flag) breaks the package seal.
    const evidenceManifest = [...record.evidenceItems]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(item => {
        const metadata = (item.metadata as Record<string, unknown> | undefined) ?? {}
        const anomalyFlags = Array.isArray(metadata.anomalyFlags) ? metadata.anomalyFlags : []
        return {
          id: item.id,
          storagePath: item.storagePath ?? null,
          checksum: item.checksum ?? null,
          captureTimestamp: item.captureTimestamp,
          kind: item.kind,
          geo: item.geo
            ? {
                lat: item.geo.lat,
                lng: item.geo.lng,
                accuracy: item.geo.accuracy ?? null,
              }
            : null,
          manualLocationNote: item.manualLocationNote ?? null,
          validationState: item.validationState,
          integrityStatus: (metadata.integrityStatus as string | undefined) ?? null,
          anomalyFlags,
        }
      })

    const checklistManifest = [...(record.checklistResults ?? [])]
      .sort((a, b) => a.itemId.localeCompare(b.itemId))
      .map(item => ({
        itemId: item.itemId,
        result: item.result,
        note: item.note ?? null,
      }))

    const integrity = await createPackageIntegritySnapshot({
      recordId: record.id,
      versionNumber: 1,
      sealedAt: record.completedAt,
      sealedById: record.inspectorId,
      manifest: {
        recordId: record.id,
        result: record.result,
        certRef: record.certRef,
        inspectorId: record.inspectorId ?? null,
        inspectorLicense: record.inspectorLicense,
        jobRef: record.jobRef ?? null,
        permitNumber: record.permitNumber ?? null,
        jurisdictionId: record.jurisdictionId ?? null,
        completedAt: record.completedAt,
        passItems: record.passItems,
        failItems: record.failItems,
        evidenceCount: evidenceManifest.length,
        evidence: evidenceManifest,
        checklistResults: checklistManifest,
      },
    })

    await upsertPackageSeal({
      id: `seal-${record.id}`,
      recordId: record.id,
      packageHash: integrity.packageHash,
      verificationCode: integrity.verificationCode,
      versionNumber: integrity.versionNumber,
      sealStatus: 'sealed',
      sealedAt: integrity.sealedAt,
      sealedById: record.inspectorId,
      sealedByName: record.inspectorName,
      manifest: {
        certRef: record.certRef,
        projectName: record.projectName,
        permitNumber: record.permitNumber ?? null,
        result: record.result,
      },
      exportCount: 0,
    })

    await insertVaultArchiveEvent({
      recordId: record.id,
      packageSealId: `seal-${record.id}`,
      retentionTier: deriveArchiveRetentionTier(record.completedAt),
      eventType: 'sealed_record_archived',
      archivedById: record.inspectorId,
      archivedAt: record.completedAt,
      metadata: {
        jobRef: record.jobRef ?? null,
        result: record.result,
      },
    })

    if (record.jobRef) {
      const [{ data: jobData }, { data: assignmentData }] = await Promise.all([
        supabase
          .from('job_opportunities')
          .select('*')
          .eq('id', record.jobRef)
          .maybeSingle(),
        supabase
          .from('job_assignments')
          .select('escrow_amount')
          .eq('job_id', record.jobRef)
          .maybeSingle(),
      ])

      const pricing = calculatePricingBreakdown({
        dispatchTier: ((jobData?.dispatch_tier as 'standard' | 'priority' | 'emergency' | undefined) ?? 'standard'),
        pricingMode: (jobData?.pricing_mode as 'dispatch_fixed' | 'specialist_hourly' | undefined) ?? undefined,
        specialistRole: (jobData?.specialist_role as import('@/lib/types').SpecialistRoleId | undefined) ?? undefined,
        hourlyRate: Number(jobData?.base_hourly_rate ?? 0) || undefined,
        billableHours: Number(jobData?.billable_hours ?? 0) || undefined,
        holdHours: Number(jobData?.hold_hours ?? 0) || undefined,
        discipline: (jobData?.required_discipline as string | undefined) ?? undefined,
        inspectionType: (jobData?.inspection_type as string | undefined) ?? undefined,
        credentialClass: (jobData?.credential_class as string | undefined) ?? undefined,
      })
      const paymentAmounts = hydrateGovernedPaymentAmounts({
        dispatchTier: (jobData?.dispatch_tier as 'standard' | 'priority' | 'emergency' | undefined) ?? 'standard',
        offeredRate: Number(jobData?.offered_rate ?? 0),
        escrowAmount: Number(assignmentData?.escrow_amount ?? 0),
        platformCommission: pricing.platformCommission,
      }, {
        veroCommissionAmount: pricing.platformCommission,
      })

      await upsertPaymentDecision({
        jobId: record.jobRef,
        assignmentId: undefined,
        paymentStatus: 'earned_pending_review',
        payoutStatus: 'blocked',
        baseFeeAmount: paymentAmounts.baseFeeAmount,
        holdPremiumAmount: paymentAmounts.holdPremiumAmount,
        veroCommissionAmount: paymentAmounts.veroCommissionAmount,
        blockedReason: paymentAmounts.usedFallback
          ? 'Awaiting admin review and payout release. Upstream payment details are not yet wired.'
          : 'Awaiting admin review and payout release.',
        decisionNote: 'Created automatically when a sealed inspection record entered the governed archive.',
        decidedById: record.inspectorId,
        decidedAt: record.completedAt,
        releasedAt: undefined,
        metadata: {
          recordId: record.id,
          certRef: record.certRef,
          paymentHydrationUsedFallback: paymentAmounts.usedFallback,
        },
      })
    }

    await appendGovernanceAuditEvent({
      entityType: 'submission',
      entityId: record.id,
      action: 'submission.sealed',
      actorId: record.inspectorId,
      actorRole: 'inspector',
      ruleIds: ['R-036', 'R-037', 'R-038', 'R-048'],
      blockerType: 'technical',
      reason: 'Completed inspection record sealed and archived.',
      beforeState: {
        sealed: false,
      },
      afterState: {
        sealed: true,
        packageHash: integrity.packageHash,
        verificationCode: integrity.verificationCode,
      },
      metadata: {
        certRef: record.certRef,
        evidenceCount: record.evidenceItems.length,
      },
    })
  }

  return { ok: true }
}

export async function selectCompletedRecords(): Promise<CompletedInspectionRecord[]> {
  const { data, error } = await supabase.from(COMPLETED).select('*').order('completed_at', { ascending: false })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToCompleted)
}

export async function selectCompletedRecordById(id: string): Promise<CompletedInspectionRecord | null> {
  const { data, error } = await supabase.from(COMPLETED).select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  return rowToCompleted(data as Record<string, unknown>)
}

// ─── Deficiencies ─────────────────────────────────────────────────────────────

function deficiencyToRow(d: RecordDeficiency): Record<string, unknown> {
  return {
    id: d.id,
    record_id: d.recordId,
    checklist_item_ref: d.checklistItemRef ?? null,
    evidence_item_ref: d.evidenceItemRef ?? null,
    reviewer_comment: d.reviewerComment,
    response: d.response ?? null,
    status: d.status,
    resolved_in_version: d.resolvedInVersion ?? null,
    created_at: d.createdAt,
    updated_at: d.updatedAt,
  }
}

function rowToDeficiency(row: Record<string, unknown>): RecordDeficiency {
  return {
    id: row.id as string,
    recordId: row.record_id as string,
    checklistItemRef: (row.checklist_item_ref as string) ?? undefined,
    evidenceItemRef: (row.evidence_item_ref as string) ?? undefined,
    reviewerComment: row.reviewer_comment as string,
    response: (row.response as string) ?? undefined,
    status: row.status as RecordDeficiency['status'],
    resolvedInVersion: (row.resolved_in_version as number) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export async function insertDeficiency(def: RecordDeficiency): Promise<boolean> {
  const { error } = await supabase.from(DEFICIENCIES).insert(deficiencyToRow(def))
  return !error
}

export async function updateDeficiencyRow(
  id: string,
  updates: Partial<Pick<RecordDeficiency, 'response' | 'status' | 'resolvedInVersion'>>
): Promise<boolean> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.response !== undefined) row.response = updates.response
  if (updates.status !== undefined) row.status = updates.status
  if (updates.resolvedInVersion !== undefined) row.resolved_in_version = updates.resolvedInVersion
  const { error } = await supabase.from(DEFICIENCIES).update(row).eq('id', id)
  return !error
}

export async function selectDeficienciesByRecordId(recordId: string): Promise<RecordDeficiency[]> {
  const { data, error } = await supabase.from(DEFICIENCIES).select('*').eq('record_id', recordId).order('created_at', { ascending: true })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToDeficiency)
}

// ─── Package versions ─────────────────────────────────────────────────────────

function versionToRow(v: PackageVersionRecord): Record<string, unknown> {
  return {
    id: v.id,
    record_id: v.recordId,
    version: v.version,
    created_at: v.createdAt,
    note: v.note ?? null,
  }
}

function rowToVersion(row: Record<string, unknown>): PackageVersionRecord {
  return {
    id: row.id as string,
    recordId: row.record_id as string,
    version: row.version as number,
    createdAt: row.created_at as string,
    note: (row.note as string) ?? undefined,
  }
}

export async function insertPackageVersion(v: PackageVersionRecord): Promise<boolean> {
  const { error } = await supabase.from(VERSIONS).insert(versionToRow(v))
  return !error
}

export async function selectVersionsByRecordId(recordId: string): Promise<PackageVersionRecord[]> {
  const { data, error } = await supabase.from(VERSIONS).select('*').eq('record_id', recordId).order('version', { ascending: true })
  if (error || !data) return []
  return (data as Record<string, unknown>[]).map(rowToVersion)
}

// ─── Inspector onboarding status ──────────────────────────────────────────────

export interface InspectorOnboardingRow {
  userId: string
  status: InspectorOnboardingStatus
  updatedAt: string
  reviewerNote?: string
  licenseNumber?: string
  requestedRoleLanes: InspectorRoleLane[]
  approvedRoleLanes: InspectorRoleLane[]
}

function normalizeTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string')
}

export async function upsertInspectorOnboardingStatus(
  userId: string,
  status: InspectorOnboardingStatus,
  reviewerNote?: string
): Promise<boolean> {
  const { error } = await supabase.from(ONBOARDING).upsert(
    {
      user_id: userId,
      status,
      reviewer_note: reviewerNote ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  return !error
}

export async function selectInspectorOnboardingStatus(userId: string): Promise<InspectorOnboardingStatus | null> {
  const { data, error } = await supabase.from(ONBOARDING).select('status').eq('user_id', userId).maybeSingle()
  if (error || !data) return null
  return (data as { status: InspectorOnboardingStatus }).status
}

export async function selectAllInspectorOnboardingStatuses(): Promise<InspectorOnboardingRow[]> {
  const { data, error } = await supabase
    .from(ONBOARDING)
    .select('user_id, status, updated_at, reviewer_note, license_number, requested_role_lanes, approved_role_lanes')
    .order('updated_at', { ascending: false })
  if (error || !data) return []
  return (data as {
    user_id: string
    status: InspectorOnboardingStatus
    updated_at: string
    reviewer_note?: string
    license_number?: string | null
    requested_role_lanes?: unknown
    approved_role_lanes?: unknown
  }[])
    .map(row => ({
      userId: row.user_id,
      status: row.status,
      updatedAt: row.updated_at,
      reviewerNote: row.reviewer_note ?? undefined,
      licenseNumber: row.license_number ?? undefined,
      requestedRoleLanes: normalizeInspectorRoleLanes(row.requested_role_lanes),
      approvedRoleLanes: normalizeInspectorRoleLanes(row.approved_role_lanes),
    }))
}

export async function upsertInspectorEligibility(
  profile: InspectorEligibilityProfile
): Promise<boolean> {
  const { error } = await supabase.from(ONBOARDING).upsert(
    {
      user_id: profile.userId,
      status: profile.status,
      disciplines: profile.disciplines,
      regions: profile.regions,
      requested_role_lanes: profile.requestedRoleLanes,
      approved_role_lanes: profile.approvedRoleLanes,
      license_number: profile.licenseNumber ?? null,
      credential_expires_at: profile.credentialExpiresAt ?? null,
      reviewer_note: profile.reviewerNote ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  return !error
}

export async function selectInspectorEligibility(
  userId: string
): Promise<InspectorEligibilityProfile | null> {
  const { data, error } = await supabase
    .from(ONBOARDING)
    .select('user_id, status, disciplines, regions, requested_role_lanes, approved_role_lanes, license_number, credential_expires_at, updated_at, reviewer_note')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null

  const row = data as Record<string, unknown>
  return {
    userId: row.user_id as string,
    status: row.status as InspectorOnboardingStatus,
    disciplines: normalizeTextArray(row.disciplines) as InspectorEligibilityProfile['disciplines'],
    regions: normalizeTextArray(row.regions) as InspectorEligibilityProfile['regions'],
    requestedRoleLanes: normalizeInspectorRoleLanes(row.requested_role_lanes),
    approvedRoleLanes: normalizeInspectorRoleLanes(row.approved_role_lanes),
    licenseNumber: (row.license_number as string) ?? undefined,
    credentialExpiresAt: (row.credential_expires_at as string) ?? undefined,
    updatedAt: (row.updated_at as string) ?? undefined,
    reviewerNote: (row.reviewer_note as string) ?? undefined,
  }
}

// ─── Inspector credentials ────────────────────────────────────────────────────

export type InspectorCredentialStatus = 'uploaded' | 'under_review' | 'accepted' | 'rejected' | 'needs_info'

export interface InspectorCredentialRow {
  id: string
  userId: string
  credentialType: InspectorCredentialType
  fileName: string
  storagePath: string
  uploadedAt: string
  status: InspectorCredentialStatus
  reviewerNote?: string
  isRequired: boolean
  expiresAt?: string
}

export async function insertInspectorCredential(input: Omit<InspectorCredentialRow, 'uploadedAt' | 'status'>): Promise<boolean> {
  const { error } = await supabase.from(CREDENTIALS).insert({
    id: input.id,
    user_id: input.userId,
    credential_type: input.credentialType,
    file_name: input.fileName,
    storage_path: input.storagePath,
    uploaded_at: new Date().toISOString(),
    status: 'uploaded',
    reviewer_note: input.reviewerNote ?? null,
    is_required: input.isRequired,
    expires_at: input.expiresAt ?? null,
  })
  return !error
}

export async function listInspectorCredentials(userId: string): Promise<InspectorCredentialRow[]> {
  const { data, error } = await supabase
    .from(CREDENTIALS)
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false })
  if (error || !data) return []
  return (data as {
    id: string
    user_id: string
    credential_type: InspectorCredentialType
    file_name: string
    storage_path: string
    uploaded_at: string
    status: InspectorCredentialStatus
    reviewer_note?: string
    is_required: boolean
    expires_at?: string | null
  }[]).map(row => ({
    id: row.id,
    userId: row.user_id,
    credentialType: row.credential_type,
    fileName: row.file_name,
    storagePath: row.storage_path,
    uploadedAt: row.uploaded_at,
    status: row.status,
    reviewerNote: row.reviewer_note ?? undefined,
    isRequired: row.is_required,
    expiresAt: row.expires_at ?? undefined,
  }))
}

export async function updateInspectorCredentialStatus(
  id: string,
  status: InspectorCredentialStatus,
  reviewerNote?: string
): Promise<boolean> {
  const { error } = await supabase.from(CREDENTIALS).update({
    status,
    reviewer_note: reviewerNote ?? null,
  }).eq('id', id)
  return !error
}
