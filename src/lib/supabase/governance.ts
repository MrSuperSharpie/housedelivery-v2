import { createClient } from '@/lib/supabase/client'
import type {
  GovernanceIssue,
  GovernanceRuleId,
  GovernanceValidationStatus,
} from '@/lib/governance'

const supabase = createClient()

const AUDIT = 'governance_audit_events'
const PROJECTS = 'governed_projects'
const JOB_VALIDATIONS = 'job_validation_results'
const PACKAGE_SEALS = 'compliance_package_seals'
const PACKAGE_EXPORTS = 'compliance_package_exports'
const PAYMENTS = 'job_payment_decisions'
const DISPUTES = 'job_disputes'
const ARCHIVE = 'vault_archive_events'
let governanceAuditUnavailableLogged = false

type Row = Record<string, unknown>

function toIssues(value: unknown): GovernanceIssue[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is GovernanceIssue => typeof entry === 'object' && entry != null)
}

export interface GovernanceAuditEventRow {
  id: string
  entityType: string
  entityId: string
  action: string
  actorId?: string
  actorRole?: string
  ruleIds: GovernanceRuleId[]
  blockerType?: string
  reason?: string
  beforeState: Record<string, unknown>
  afterState: Record<string, unknown>
  metadata: Record<string, unknown>
  createdAt: string
}

export interface GovernedProjectRow {
  id: string
  builderId: string
  name: string
  address: string
  city: string
  permitNumber?: string
  builderOnboardingStatus: string
  completenessStatus: 'complete' | 'needs_info'
  completenessBlockers: GovernanceIssue[]
  ruleSnapshot: Record<string, unknown>
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface JobValidationResultRow {
  id: string
  jobId: string
  projectId?: string
  builderId?: string
  validationStatus: GovernanceValidationStatus
  blockers: GovernanceIssue[]
  warnings: GovernanceIssue[]
  validatorVersion: string
  validatedAt: string
  metadata: Record<string, unknown>
}

export interface PackageSealRow {
  id: string
  recordId: string
  packageHash: string
  verificationCode: string
  versionNumber: number
  sealStatus: 'sealed' | 'exported' | 'revoked'
  sealedAt: string
  sealedById?: string
  sealedByName?: string
  manifest: Record<string, unknown>
  exportCount: number
  createdAt: string
  updatedAt: string
}

export interface PackageExportRow {
  id: string
  recordId: string
  packageSealId: string
  exportedById?: string
  exportScope: string
  recipientType?: string
  recipientIdentity?: string
  exportMethod?: string
  destination?: string
  exportHash?: string
  exportedAt: string
  metadata: Record<string, unknown>
}

export interface PaymentDecisionRow {
  id: string
  jobId: string
  assignmentId?: string
  paymentStatus: string
  payoutStatus: string
  baseFeeAmount: number
  holdPremiumAmount: number
  sitelineCommissionAmount: number
  blockedReason?: string
  decisionNote?: string
  decidedById?: string
  decidedAt: string
  releasedAt?: string
  metadata: Record<string, unknown>
}

export interface DisputeRow {
  id: string
  jobId: string
  assignmentId?: string
  openedById?: string
  openedByRole?: string
  reason: string
  status: string
  commercialBlock: boolean
  resolutionNote?: string
  openedAt: string
  resolvedAt?: string
  metadata: Record<string, unknown>
}

export interface VaultArchiveEventRow {
  id: string
  recordId: string
  packageSealId?: string
  retentionTier: string
  eventType: string
  archivedById?: string
  archivedAt: string
  metadata: Record<string, unknown>
}

function rowToAudit(row: Row): GovernanceAuditEventRow {
  return {
    id: row.id as string,
    entityType: row.entity_type as string,
    entityId: row.entity_id as string,
    action: row.action as string,
    actorId: (row.actor_id as string) ?? undefined,
    actorRole: (row.actor_role as string) ?? undefined,
    ruleIds: ((row.rule_ids as GovernanceRuleId[]) ?? []) as GovernanceRuleId[],
    blockerType: (row.blocker_type as string) ?? undefined,
    reason: (row.reason as string) ?? undefined,
    beforeState: (row.before_state as Record<string, unknown>) ?? {},
    afterState: (row.after_state as Record<string, unknown>) ?? {},
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
  }
}

function rowToProject(row: Row): GovernedProjectRow {
  return {
    id: row.id as string,
    builderId: row.builder_id as string,
    name: row.name as string,
    address: row.address as string,
    city: row.city as string,
    permitNumber: (row.permit_number as string) ?? undefined,
    builderOnboardingStatus: row.builder_onboarding_status as string,
    completenessStatus: row.completeness_status as GovernedProjectRow['completenessStatus'],
    completenessBlockers: toIssues(row.completeness_blockers),
    ruleSnapshot: (row.rule_snapshot as Record<string, unknown>) ?? {},
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function rowToJobValidation(row: Row): JobValidationResultRow {
  return {
    id: row.id as string,
    jobId: row.job_id as string,
    projectId: (row.project_id as string) ?? undefined,
    builderId: (row.builder_id as string) ?? undefined,
    validationStatus: row.validation_status as GovernanceValidationStatus,
    blockers: toIssues(row.blockers),
    warnings: toIssues(row.warnings),
    validatorVersion: (row.validator_version as string) ?? '2026-04-07',
    validatedAt: row.validated_at as string,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }
}

function rowToPackageSeal(row: Row): PackageSealRow {
  return {
    id: row.id as string,
    recordId: row.record_id as string,
    packageHash: row.package_hash as string,
    verificationCode: row.verification_code as string,
    versionNumber: row.version_number as number,
    sealStatus: row.seal_status as PackageSealRow['sealStatus'],
    sealedAt: row.sealed_at as string,
    sealedById: (row.sealed_by_id as string) ?? undefined,
    sealedByName: (row.sealed_by_name as string) ?? undefined,
    manifest: (row.manifest as Record<string, unknown>) ?? {},
    exportCount: (row.export_count as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function rowToPackageExport(row: Row): PackageExportRow {
  return {
    id: row.id as string,
    recordId: row.record_id as string,
    packageSealId: row.package_seal_id as string,
    exportedById: (row.exported_by_id as string) ?? undefined,
    exportScope: row.export_scope as string,
    recipientType: (row.recipient_type as string) ?? undefined,
    recipientIdentity: (row.recipient_identity as string) ?? undefined,
    exportMethod: (row.export_method as string) ?? undefined,
    destination: (row.destination as string) ?? undefined,
    exportHash: (row.export_hash as string) ?? undefined,
    exportedAt: row.exported_at as string,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }
}

function rowToPaymentDecision(row: Row): PaymentDecisionRow {
  return {
    id: row.id as string,
    jobId: row.job_id as string,
    assignmentId: (row.assignment_id as string) ?? undefined,
    paymentStatus: row.payment_status as string,
    payoutStatus: row.payout_status as string,
    baseFeeAmount: Number(row.base_fee_amount ?? 0),
    holdPremiumAmount: Number(row.hold_premium_amount ?? 0),
    sitelineCommissionAmount: Number(row.siteline_commission_amount ?? 0),
    blockedReason: (row.blocked_reason as string) ?? undefined,
    decisionNote: (row.decision_note as string) ?? undefined,
    decidedById: (row.decided_by_id as string) ?? undefined,
    decidedAt: row.decided_at as string,
    releasedAt: (row.released_at as string) ?? undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }
}

function rowToDispute(row: Row): DisputeRow {
  return {
    id: row.id as string,
    jobId: row.job_id as string,
    assignmentId: (row.assignment_id as string) ?? undefined,
    openedById: (row.opened_by_id as string) ?? undefined,
    openedByRole: (row.opened_by_role as string) ?? undefined,
    reason: row.reason as string,
    status: row.status as string,
    commercialBlock: row.commercial_block === true,
    resolutionNote: (row.resolution_note as string) ?? undefined,
    openedAt: row.opened_at as string,
    resolvedAt: (row.resolved_at as string) ?? undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }
}

function rowToArchiveEvent(row: Row): VaultArchiveEventRow {
  return {
    id: row.id as string,
    recordId: row.record_id as string,
    packageSealId: (row.package_seal_id as string) ?? undefined,
    retentionTier: row.retention_tier as string,
    eventType: row.event_type as string,
    archivedById: (row.archived_by_id as string) ?? undefined,
    archivedAt: row.archived_at as string,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }
}

export async function appendGovernanceAuditEvent(
  input: Omit<GovernanceAuditEventRow, 'id' | 'createdAt'>,
): Promise<boolean> {
  const { error } = await supabase.from(AUDIT).insert({
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    actor_id: input.actorId ?? null,
    actor_role: input.actorRole ?? null,
    rule_ids: input.ruleIds,
    blocker_type: input.blockerType ?? null,
    reason: input.reason ?? null,
    before_state: input.beforeState,
    after_state: input.afterState,
    metadata: input.metadata,
  })

  if (error) {
    const status = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : ''
    const message = typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : ''

    if (status === '404' || message.includes('relation') || message.includes(AUDIT)) {
      if (!governanceAuditUnavailableLogged) {
        console.warn('appendGovernanceAuditEvent: governance audit table unavailable in this environment; audit inserts will be skipped')
        governanceAuditUnavailableLogged = true
      }
      return false
    }

    console.error('appendGovernanceAuditEvent:', error)
    return false
  }

  return true
}

export async function listGovernanceAuditEvents(limit = 100): Promise<GovernanceAuditEventRow[]> {
  const { data, error } = await supabase
    .from(AUDIT)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return (data as Row[]).map(rowToAudit)
}

export async function upsertGovernedProject(
  input: Omit<GovernedProjectRow, 'createdAt' | 'updatedAt'>,
): Promise<GovernedProjectRow | null> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from(PROJECTS)
    .upsert({
      id: input.id,
      builder_id: input.builderId,
      name: input.name,
      address: input.address,
      city: input.city,
      permit_number: input.permitNumber ?? null,
      builder_onboarding_status: input.builderOnboardingStatus,
      completeness_status: input.completenessStatus,
      completeness_blockers: input.completenessBlockers,
      rule_snapshot: input.ruleSnapshot,
      metadata: input.metadata,
      updated_at: now,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('upsertGovernedProject:', error)
    return null
  }

  return rowToProject(data as Row)
}

export async function getGovernedProject(projectId: string): Promise<GovernedProjectRow | null> {
  const { data, error } = await supabase
    .from(PROJECTS)
    .select('*')
    .eq('id', projectId)
    .maybeSingle()

  if (error || !data) return null
  return rowToProject(data as Row)
}

export async function upsertJobValidationResult(
  input: Omit<JobValidationResultRow, 'id'> & { id?: string },
): Promise<JobValidationResultRow | null> {
  const { data, error } = await supabase
    .from(JOB_VALIDATIONS)
    .upsert({
      id: input.id ?? crypto.randomUUID(),
      job_id: input.jobId,
      project_id: input.projectId ?? null,
      builder_id: input.builderId ?? null,
      validation_status: input.validationStatus,
      blockers: input.blockers,
      warnings: input.warnings,
      validator_version: input.validatorVersion,
      validated_at: input.validatedAt,
      metadata: input.metadata,
    }, { onConflict: 'job_id' })
    .select('*')
    .single()

  if (error || !data) {
    console.error('upsertJobValidationResult:', error)
    return null
  }

  return rowToJobValidation(data as Row)
}

export async function getJobValidationResult(jobId: string): Promise<JobValidationResultRow | null> {
  const { data, error } = await supabase
    .from(JOB_VALIDATIONS)
    .select('*')
    .eq('job_id', jobId)
    .maybeSingle()

  if (error || !data) return null
  return rowToJobValidation(data as Row)
}

export async function upsertPackageSeal(
  input: Omit<PackageSealRow, 'createdAt' | 'updatedAt'>,
): Promise<PackageSealRow | null> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from(PACKAGE_SEALS)
    .upsert({
      id: input.id,
      record_id: input.recordId,
      package_hash: input.packageHash,
      verification_code: input.verificationCode,
      version_number: input.versionNumber,
      seal_status: input.sealStatus,
      sealed_at: input.sealedAt,
      sealed_by_id: input.sealedById ?? null,
      sealed_by_name: input.sealedByName ?? null,
      manifest: input.manifest,
      export_count: input.exportCount,
      updated_at: now,
    }, { onConflict: 'record_id' })
    .select('*')
    .single()

  if (error || !data) {
    console.error('upsertPackageSeal:', error)
    return null
  }

  return rowToPackageSeal(data as Row)
}

export async function getPackageSeal(recordId: string): Promise<PackageSealRow | null> {
  const { data, error } = await supabase
    .from(PACKAGE_SEALS)
    .select('*')
    .eq('record_id', recordId)
    .maybeSingle()

  if (error || !data) return null
  return rowToPackageSeal(data as Row)
}

export async function listPackageSeals(): Promise<PackageSealRow[]> {
  const { data, error } = await supabase
    .from(PACKAGE_SEALS)
    .select('*')
    .order('sealed_at', { ascending: false })

  if (error || !data) return []
  return (data as Row[]).map(rowToPackageSeal)
}

export async function insertPackageExport(
  input: Omit<PackageExportRow, 'id'> & { id?: string },
): Promise<PackageExportRow | null> {
  const { data, error } = await supabase
    .from(PACKAGE_EXPORTS)
    .insert({
      id: input.id ?? crypto.randomUUID(),
      record_id: input.recordId,
      package_seal_id: input.packageSealId,
      exported_by_id: input.exportedById ?? null,
      export_scope: input.exportScope,
      recipient_type: input.recipientType ?? null,
      recipient_identity: input.recipientIdentity ?? null,
      export_method: input.exportMethod ?? null,
      destination: input.destination ?? null,
      export_hash: input.exportHash ?? null,
      exported_at: input.exportedAt,
      metadata: input.metadata,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('insertPackageExport:', error)
    return null
  }

  return rowToPackageExport(data as Row)
}

export async function recordPackageExport(
  input: Omit<PackageExportRow, 'id'> & { id?: string },
): Promise<PackageExportRow | null> {
  const row = await insertPackageExport(input)
  if (!row) return null

  const currentSeal = await getPackageSeal(input.recordId)
  if (!currentSeal) return row

  await upsertPackageSeal({
    ...currentSeal,
    exportCount: currentSeal.exportCount + 1,
  })

  return row
}

export async function listPackageExports(recordId?: string): Promise<PackageExportRow[]> {
  let query = supabase
    .from(PACKAGE_EXPORTS)
    .select('*')
    .order('exported_at', { ascending: false })

  if (recordId) query = query.eq('record_id', recordId)

  const { data, error } = await query
  if (error || !data) return []
  return (data as Row[]).map(rowToPackageExport)
}

export async function upsertPaymentDecision(
  input: Omit<PaymentDecisionRow, 'id'> & { id?: string },
): Promise<PaymentDecisionRow | null> {
  const { data, error } = await supabase
    .from(PAYMENTS)
    .upsert({
      id: input.id ?? crypto.randomUUID(),
      job_id: input.jobId,
      assignment_id: input.assignmentId ?? null,
      payment_status: input.paymentStatus,
      payout_status: input.payoutStatus,
      base_fee_amount: input.baseFeeAmount,
      hold_premium_amount: input.holdPremiumAmount,
      siteline_commission_amount: input.sitelineCommissionAmount,
      blocked_reason: input.blockedReason ?? null,
      decision_note: input.decisionNote ?? null,
      decided_by_id: input.decidedById ?? null,
      decided_at: input.decidedAt,
      released_at: input.releasedAt ?? null,
      metadata: input.metadata,
    }, { onConflict: 'job_id' })
    .select('*')
    .single()

  if (error || !data) {
    console.error('upsertPaymentDecision:', error)
    return null
  }

  return rowToPaymentDecision(data as Row)
}

export async function listPaymentDecisions(): Promise<PaymentDecisionRow[]> {
  const { data, error } = await supabase
    .from(PAYMENTS)
    .select('*')
    .order('decided_at', { ascending: false })

  if (error || !data) return []
  return (data as Row[]).map(rowToPaymentDecision)
}

export async function createDispute(
  input: Omit<DisputeRow, 'id'> & { id?: string },
): Promise<DisputeRow | null> {
  const { data, error } = await supabase
    .from(DISPUTES)
    .insert({
      id: input.id ?? crypto.randomUUID(),
      job_id: input.jobId,
      assignment_id: input.assignmentId ?? null,
      opened_by_id: input.openedById ?? null,
      opened_by_role: input.openedByRole ?? null,
      reason: input.reason,
      status: input.status,
      commercial_block: input.commercialBlock,
      resolution_note: input.resolutionNote ?? null,
      opened_at: input.openedAt,
      resolved_at: input.resolvedAt ?? null,
      metadata: input.metadata,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('createDispute:', error)
    return null
  }

  return rowToDispute(data as Row)
}

export async function listDisputes(): Promise<DisputeRow[]> {
  const { data, error } = await supabase
    .from(DISPUTES)
    .select('*')
    .order('opened_at', { ascending: false })

  if (error || !data) return []
  return (data as Row[]).map(rowToDispute)
}

export async function resolveDispute(
  disputeId: string,
  resolutionNote: string,
  status = 'resolved',
): Promise<boolean> {
  const { error } = await supabase
    .from(DISPUTES)
    .update({
      status,
      resolution_note: resolutionNote,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', disputeId)

  if (error) {
    console.error('resolveDispute:', error)
    return false
  }

  return true
}

export async function insertVaultArchiveEvent(
  input: Omit<VaultArchiveEventRow, 'id'> & { id?: string },
): Promise<VaultArchiveEventRow | null> {
  const { data, error } = await supabase
    .from(ARCHIVE)
    .insert({
      id: input.id ?? crypto.randomUUID(),
      record_id: input.recordId,
      package_seal_id: input.packageSealId ?? null,
      retention_tier: input.retentionTier,
      event_type: input.eventType,
      archived_by_id: input.archivedById ?? null,
      archived_at: input.archivedAt,
      metadata: input.metadata,
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('insertVaultArchiveEvent:', error)
    return null
  }

  return rowToArchiveEvent(data as Row)
}

export async function listVaultArchiveEvents(recordId?: string): Promise<VaultArchiveEventRow[]> {
  let query = supabase
    .from(ARCHIVE)
    .select('*')
    .order('archived_at', { ascending: false })

  if (recordId) query = query.eq('record_id', recordId)

  const { data, error } = await query
  if (error || !data) return []
  return (data as Row[]).map(rowToArchiveEvent)
}
