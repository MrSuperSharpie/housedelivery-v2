import { createClient } from '@/lib/supabase/client'
import type { ReliabilityEnforcementMode } from '@/lib/types'
import type { ReliabilityEventType } from '@/lib/reliability'
import type {
  ReliabilityDashboardEventInput,
  ReliabilityDashboardProfileInput,
} from '@/lib/reliabilityDashboard'

const supabase = createClient()

export interface ReliabilityProfileRow {
  inspectorId: string
  internalScore: number
  tierKey: string
  completedProfessionalWorkCount: number
  claimCommitmentCount: number
  validCancellationCount: number
  invalidLateCancellationCount: number
  noShowCount: number
  builderSiteNotReadyCount: number
  manualTierOverride?: string
  overrideReason?: string
  updatedAt: string
}

export interface ReliabilityEventRow {
  id: string
  inspectorId: string
  jobId?: string
  assignmentId?: string
  eventType: string
  scoreDelta: number
  adminReviewStatus: string
  createdAt: string
}

export interface ReliabilityAppointmentRow {
  id: string
  jobId: string
  assignmentId: string
  inspectorId: string
  builderId?: string
  scheduledStartAt?: string
  scheduledEndAt?: string
  commitmentVersion: string
  commitmentAcceptedAt: string
  confirmationStatus: string
  inspectorConfirmedAt?: string
  enRouteAt?: string
  arrivedAt?: string
  checkedInAt?: string
  completedAt?: string
  status: string
  createdAt: string
}

export interface JobAttendanceConfirmationRow {
  id: string
  jobId: string
  assignmentId: string
  appointmentId?: string
  inspectorId: string
  builderId?: string
  checkpoint: string
  status: string
  escalationStatus: string
  requiredAt?: string
  scheduledStartAt?: string
  reminderScheduledAt?: string
  reminderSentAt?: string
  confirmedAt?: string
  missedAt?: string
  criticalAlertOnMiss: boolean
  standbyPrepareOnMiss: boolean
  standbyActivateOnMiss: boolean
  createdAt: string
}

export interface ReliabilityNotificationRow {
  id: string
  eventKey: string
  recipientRole?: string
  recipientUserId?: string
  channel: string
  status: string
  jobId?: string
  assignmentId?: string
  scheduledFor: string
  sentAt?: string
  createdAt: string
}

export interface ReliabilityStandbyCandidateRow {
  id: string
  jobId: string
  assignmentId?: string
  inspectorId: string
  rank: number
  status: string
  inviteReason: string
  offeredAt?: string
  acceptedAt?: string
  expiresAt?: string
  rushMultiplierOffered?: number
  createdAt: string
}

export interface GovernanceAuditEventRow {
  id: string
  entityType: string
  entityId: string
  action: string
  actorId?: string
  actorRole?: string
  reason?: string
  createdAt: string
}

export interface ReliabilityCancellationRow {
  id: string
  jobId: string
  assignmentId?: string
  requestedByRole: string
  reasonCode: string
  isLate: boolean
  validityStatus: string
  preliminaryClassification?: string
  finalClassification?: string
  appealStatus?: string
  financialConsequenceStatus?: string
  payoutBlocked: boolean
  builderResolutionStatus?: string
  enforcementMode: string
  createdAt: string
}

export interface SiteReadinessIncidentRow {
  id: string
  jobId: string
  assignmentId?: string
  inspectorId: string
  incidentType: string
  inspectorProtected: boolean
  adminReviewStatus: string
  reportedAt: string
}

export interface ReserveLedgerRow {
  id: string
  inspectorId: string
  jobId?: string
  assignmentId?: string
  entryType: string
  amount: number
  currency: string
  enforcementMode: string
  legalReviewRequired: boolean
  status: string
  createdAt: string
}

export interface PayoutReviewRow {
  id: string
  jobId: string
  assignmentId?: string
  payoutStatus: string
  paymentStatus: string
  blockReason?: string
  adminReviewStatus: string
  baseFeeAmount: number
  holdPremiumAmount: number
  reserveWithheldAmount: number
  payoutReductionAmount: number
  builderCreditAmount: number
  enforcementMode: string
  decidedAt: string
}

export interface BuilderCreditHookRow {
  id: string
  jobId: string
  assignmentId?: string
  triggerReason: string
  amount: number
  status: string
  fundingSource: string
  enforcementMode: string
  createdAt: string
}

export interface ReliabilityAdminSnapshot {
  profiles: ReliabilityProfileRow[]
  events: ReliabilityEventRow[]
  appointments: ReliabilityAppointmentRow[]
  confirmations: JobAttendanceConfirmationRow[]
  notifications: ReliabilityNotificationRow[]
  standbyCandidates: ReliabilityStandbyCandidateRow[]
  cancellations: ReliabilityCancellationRow[]
  siteReadinessIncidents: SiteReadinessIncidentRow[]
  reserveLedgerEntries: ReserveLedgerRow[]
  payoutReviews: PayoutReviewRow[]
  builderCreditHooks: BuilderCreditHookRow[]
  auditEvents: GovernanceAuditEventRow[]
}

export interface ActiveReliabilityPolicyConfig {
  id: string
  version: string
  enforcementMode: ReliabilityEnforcementMode
  config: Record<string, unknown>
}

export interface InspectorReliabilityDashboardData {
  profile: ReliabilityDashboardProfileInput | null
  events: ReliabilityDashboardEventInput[]
}

type DbRow = Record<string, unknown>

export async function getReliabilityAdminSnapshot(): Promise<ReliabilityAdminSnapshot> {
  const [
    profiles,
    events,
    appointments,
    confirmations,
    notifications,
    standbyCandidates,
    cancellations,
    siteReadinessIncidents,
    reserveLedgerEntries,
    payoutReviews,
    builderCreditHooks,
    auditEvents,
  ] = await Promise.all([
    listReliabilityProfiles(),
    listReliabilityEvents(),
    listAppointments(),
    listAttendanceConfirmations(),
    listReliabilityNotifications(),
    listStandbyCandidates(),
    listReliabilityCancellations(),
    listSiteReadinessIncidents(),
    listReserveLedgerEntries(),
    listPayoutReviews(),
    listBuilderCreditHooks(),
    listGovernanceAuditEvents(),
  ])

  return {
    profiles,
    events,
    appointments,
    confirmations,
    notifications,
    standbyCandidates,
    cancellations,
    siteReadinessIncidents,
    reserveLedgerEntries,
    payoutReviews,
    builderCreditHooks,
    auditEvents,
  }
}

export async function getActiveReliabilityPolicyConfig(): Promise<ActiveReliabilityPolicyConfig | null> {
  const { data, error } = await supabase
    .from('reliability_policy_versions')
    .select('id, version, enforcement_mode, config')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  const row = data as DbRow
  const config = isRecord(row.config) ? row.config : {}
  const enforcementMode = isReliabilityEnforcementMode(row.enforcement_mode)
    ? row.enforcement_mode
    : 'observe_only'

  return {
    id: String(row.id ?? ''),
    version: String(row.version ?? ''),
    enforcementMode,
    config: {
      ...config,
      enforcementMode,
    },
  }
}

export async function getInspectorReliabilityDashboardData(
  inspectorId: string,
  credentialStatus?: string | null,
): Promise<InspectorReliabilityDashboardData> {
  const [profileResult, eventsResult] = await Promise.all([
    supabase
      .from('inspector_reliability_profiles')
      .select('*')
      .eq('inspector_id', inspectorId)
      .maybeSingle(),
    supabase
      .from('inspector_reliability_events')
      .select('*')
      .eq('inspector_id', inspectorId)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const profileRow = profileResult.data as DbRow | null
  const eventRows = (eventsResult.data ?? []) as DbRow[]

  return {
    profile: profileRow
      ? {
          tierKey: typeof profileRow.tier_key === 'string' ? profileRow.tier_key : undefined,
          manualTierOverride: typeof profileRow.manual_tier_override === 'string' ? profileRow.manual_tier_override : undefined,
          internalScore: Number(profileRow.internal_score ?? 75),
          completedProfessionalWorkCount: Number(profileRow.completed_professional_work_count ?? 0),
          claimCommitmentCount: Number(profileRow.claim_commitment_count ?? 0),
          invalidLateCancellationCount: Number(profileRow.invalid_late_cancellation_count ?? 0),
          noShowCount: Number(profileRow.no_show_count ?? 0),
          credentialStatus,
        }
      : { credentialStatus },
    events: eventRows.map(row => ({
      eventType: String(row.event_type ?? 'admin_override') as ReliabilityEventType,
      scoreDelta: Number(row.score_delta ?? 0),
      occurredAt: typeof row.created_at === 'string' ? row.created_at : undefined,
      createdAt: typeof row.created_at === 'string' ? row.created_at : undefined,
      adminReviewStatus: typeof row.admin_review_status === 'string' ? row.admin_review_status : undefined,
      metadata: isRecord(row.metadata) ? row.metadata : {},
    })),
  }
}

async function listReliabilityProfiles(): Promise<ReliabilityProfileRow[]> {
  const { data, error } = await supabase
    .from('inspector_reliability_profiles')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return (data as DbRow[]).map(row => ({
    inspectorId: String(row.inspector_id ?? ''),
    internalScore: Number(row.internal_score ?? 0),
    tierKey: String(row.tier_key ?? 'standard'),
    completedProfessionalWorkCount: Number(row.completed_professional_work_count ?? 0),
    claimCommitmentCount: Number(row.claim_commitment_count ?? 0),
    validCancellationCount: Number(row.valid_cancellation_count ?? 0),
    invalidLateCancellationCount: Number(row.invalid_late_cancellation_count ?? 0),
    noShowCount: Number(row.no_show_count ?? 0),
    builderSiteNotReadyCount: Number(row.builder_site_not_ready_count ?? 0),
    manualTierOverride: typeof row.manual_tier_override === 'string' ? row.manual_tier_override : undefined,
    overrideReason: typeof row.override_reason === 'string' ? row.override_reason : undefined,
    updatedAt: String(row.updated_at ?? row.created_at ?? ''),
  }))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isReliabilityEnforcementMode(value: unknown): value is ReliabilityEnforcementMode {
  return value === 'observe_only' || value === 'soft_enforcement' || value === 'full_enforcement'
}

async function listReliabilityEvents(): Promise<ReliabilityEventRow[]> {
  const { data, error } = await supabase
    .from('inspector_reliability_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return (data as DbRow[]).map(row => ({
    id: String(row.id ?? ''),
    inspectorId: String(row.inspector_id ?? ''),
    jobId: typeof row.job_id === 'string' ? row.job_id : undefined,
    assignmentId: typeof row.assignment_id === 'string' ? row.assignment_id : undefined,
    eventType: String(row.event_type ?? ''),
    scoreDelta: Number(row.score_delta ?? 0),
    adminReviewStatus: String(row.admin_review_status ?? 'none'),
    createdAt: String(row.created_at ?? ''),
  }))
}

async function listAppointments(): Promise<ReliabilityAppointmentRow[]> {
  const { data, error } = await supabase
    .from('inspection_appointments')
    .select('*')
    .order('scheduled_start_at', { ascending: true })
    .limit(100)

  if (error || !data) return []
  return (data as DbRow[]).map(row => ({
    id: String(row.id ?? ''),
    jobId: String(row.job_id ?? ''),
    assignmentId: String(row.assignment_id ?? ''),
    inspectorId: String(row.inspector_id ?? ''),
    builderId: typeof row.builder_id === 'string' ? row.builder_id : undefined,
    scheduledStartAt: typeof row.scheduled_start_at === 'string' ? row.scheduled_start_at : undefined,
    scheduledEndAt: typeof row.scheduled_end_at === 'string' ? row.scheduled_end_at : undefined,
    commitmentVersion: String(row.commitment_version ?? ''),
    commitmentAcceptedAt: String(row.commitment_accepted_at ?? row.created_at ?? ''),
    confirmationStatus: String(row.confirmation_status ?? 'pending'),
    inspectorConfirmedAt: typeof row.inspector_confirmed_at === 'string' ? row.inspector_confirmed_at : undefined,
    enRouteAt: typeof row.en_route_at === 'string' ? row.en_route_at : undefined,
    arrivedAt: typeof row.arrived_at === 'string' ? row.arrived_at : undefined,
    checkedInAt: typeof row.checked_in_at === 'string' ? row.checked_in_at : undefined,
    completedAt: typeof row.completed_at === 'string' ? row.completed_at : undefined,
    status: String(row.status ?? 'scheduled'),
    createdAt: String(row.created_at ?? ''),
  }))
}

async function listAttendanceConfirmations(): Promise<JobAttendanceConfirmationRow[]> {
  const { data, error } = await supabase
    .from('job_attendance_confirmations')
    .select('*')
    .order('required_at', { ascending: true })
    .limit(200)

  if (error || !data) return []
  return (data as DbRow[]).map(row => ({
    id: String(row.id ?? ''),
    jobId: String(row.job_id ?? ''),
    assignmentId: String(row.assignment_id ?? ''),
    appointmentId: typeof row.appointment_id === 'string' ? row.appointment_id : undefined,
    inspectorId: String(row.inspector_id ?? ''),
    builderId: typeof row.builder_id === 'string' ? row.builder_id : undefined,
    checkpoint: String(row.checkpoint ?? ''),
    status: String(row.status ?? 'pending'),
    escalationStatus: String(row.escalation_status ?? 'none'),
    requiredAt: typeof row.required_at === 'string' ? row.required_at : undefined,
    scheduledStartAt: typeof row.scheduled_start_at === 'string' ? row.scheduled_start_at : undefined,
    reminderScheduledAt: typeof row.reminder_scheduled_at === 'string' ? row.reminder_scheduled_at : undefined,
    reminderSentAt: typeof row.reminder_sent_at === 'string' ? row.reminder_sent_at : undefined,
    confirmedAt: typeof row.confirmed_at === 'string' ? row.confirmed_at : undefined,
    missedAt: typeof row.missed_at === 'string' ? row.missed_at : undefined,
    criticalAlertOnMiss: row.critical_alert_on_miss === true,
    standbyPrepareOnMiss: row.standby_prepare_on_miss === true,
    standbyActivateOnMiss: row.standby_activate_on_miss === true,
    createdAt: String(row.created_at ?? ''),
  }))
}

async function listReliabilityNotifications(): Promise<ReliabilityNotificationRow[]> {
  const { data, error } = await supabase
    .from('notification_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error || !data) return []
  return (data as DbRow[]).map(row => {
    const payload = isRecord(row.payload) ? row.payload : {}
    return {
      id: String(row.id ?? ''),
      eventKey: String(row.event_key ?? ''),
      recipientRole: typeof row.recipient_role === 'string' ? row.recipient_role : undefined,
      recipientUserId: typeof row.recipient_user_id === 'string' ? row.recipient_user_id : undefined,
      channel: String(row.channel ?? 'in_app'),
      status: String(row.status ?? 'queued'),
      jobId: typeof payload.jobId === 'string' ? payload.jobId : undefined,
      assignmentId: typeof payload.assignmentId === 'string' ? payload.assignmentId : undefined,
      scheduledFor: String(row.scheduled_for ?? row.created_at ?? ''),
      sentAt: typeof row.sent_at === 'string' ? row.sent_at : undefined,
      createdAt: String(row.created_at ?? ''),
    }
  })
}

async function listStandbyCandidates(): Promise<ReliabilityStandbyCandidateRow[]> {
  const { data, error } = await supabase
    .from('standby_inspector_invites')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error || !data) return []
  return (data as DbRow[]).map(row => ({
    id: String(row.id ?? ''),
    jobId: String(row.job_id ?? ''),
    assignmentId: typeof row.original_assignment_id === 'string' ? row.original_assignment_id : undefined,
    inspectorId: String(row.inspector_id ?? ''),
    rank: Number(row.candidate_rank ?? row.priority_rank ?? 100),
    status: String(row.status ?? 'identified'),
    inviteReason: String(row.invite_reason ?? 'backup_pool'),
    offeredAt: typeof row.offered_at === 'string' ? row.offered_at : undefined,
    acceptedAt: typeof row.accepted_at === 'string' ? row.accepted_at : undefined,
    expiresAt: typeof row.expires_at === 'string' ? row.expires_at : undefined,
    rushMultiplierOffered: typeof row.rush_multiplier_offered === 'number' ? row.rush_multiplier_offered : undefined,
    createdAt: String(row.created_at ?? ''),
  }))
}

async function listReliabilityCancellations(): Promise<ReliabilityCancellationRow[]> {
  const { data, error } = await supabase
    .from('inspection_cancellation_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return (data as DbRow[]).map(row => ({
    id: String(row.id ?? ''),
    jobId: String(row.job_id ?? ''),
    assignmentId: typeof row.assignment_id === 'string' ? row.assignment_id : undefined,
    requestedByRole: String(row.requested_by_role ?? ''),
    reasonCode: String(row.reason_code ?? ''),
    isLate: row.is_late === true,
    validityStatus: String(row.validity_status ?? 'pending_review'),
    preliminaryClassification: typeof row.preliminary_classification === 'string' ? row.preliminary_classification : undefined,
    finalClassification: typeof row.final_classification === 'string' ? row.final_classification : undefined,
    appealStatus: typeof row.appeal_status === 'string' ? row.appeal_status : undefined,
    financialConsequenceStatus: typeof row.financial_consequence_status === 'string' ? row.financial_consequence_status : undefined,
    payoutBlocked: row.payout_blocked === true,
    builderResolutionStatus: typeof row.builder_resolution_status === 'string' ? row.builder_resolution_status : undefined,
    enforcementMode: String(row.enforcement_mode ?? 'observe_only'),
    createdAt: String(row.created_at ?? ''),
  }))
}

async function listSiteReadinessIncidents(): Promise<SiteReadinessIncidentRow[]> {
  const { data, error } = await supabase
    .from('site_readiness_incidents')
    .select('*')
    .order('reported_at', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return (data as DbRow[]).map(row => ({
    id: String(row.id ?? ''),
    jobId: String(row.job_id ?? ''),
    assignmentId: typeof row.assignment_id === 'string' ? row.assignment_id : undefined,
    inspectorId: String(row.inspector_id ?? ''),
    incidentType: String(row.incident_type ?? ''),
    inspectorProtected: row.inspector_protected !== false,
    adminReviewStatus: String(row.admin_review_status ?? 'pending'),
    reportedAt: String(row.reported_at ?? row.created_at ?? ''),
  }))
}

async function listReserveLedgerEntries(): Promise<ReserveLedgerRow[]> {
  const { data, error } = await supabase
    .from('inspector_reserve_ledger_entries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return (data as DbRow[]).map(row => ({
    id: String(row.id ?? ''),
    inspectorId: String(row.inspector_id ?? ''),
    jobId: typeof row.job_id === 'string' ? row.job_id : undefined,
    assignmentId: typeof row.assignment_id === 'string' ? row.assignment_id : undefined,
    entryType: String(row.entry_type ?? ''),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? 'CAD'),
    enforcementMode: String(row.enforcement_mode ?? 'observe_only'),
    legalReviewRequired: row.legal_review_required !== false,
    status: String(row.status ?? 'pending'),
    createdAt: String(row.created_at ?? ''),
  }))
}

async function listPayoutReviews(): Promise<PayoutReviewRow[]> {
  const { data, error } = await supabase
    .from('job_payment_decisions')
    .select('*')
    .order('decided_at', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return (data as DbRow[]).map(row => ({
    id: String(row.id ?? ''),
    jobId: String(row.job_id ?? ''),
    assignmentId: typeof row.assignment_id === 'string' ? row.assignment_id : undefined,
    payoutStatus: String(row.payout_status ?? ''),
    paymentStatus: String(row.payment_status ?? ''),
    blockReason: typeof row.payout_block_reason_code === 'string'
      ? row.payout_block_reason_code
      : typeof row.blocked_reason === 'string' ? row.blocked_reason : undefined,
    adminReviewStatus: String(row.admin_review_status ?? 'pending'),
    baseFeeAmount: Number(row.base_fee_amount ?? 0),
    holdPremiumAmount: Number(row.hold_premium_amount ?? 0),
    reserveWithheldAmount: Number(row.reserve_withheld_amount ?? 0),
    payoutReductionAmount: Number(row.payout_reduction_amount ?? 0),
    builderCreditAmount: Number(row.builder_credit_amount ?? 0),
    enforcementMode: String(row.enforcement_mode ?? 'observe_only'),
    decidedAt: String(row.decided_at ?? ''),
  }))
}

async function listBuilderCreditHooks(): Promise<BuilderCreditHookRow[]> {
  const { data, error } = await supabase
    .from('builder_refund_credit_hooks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return (data as DbRow[]).map(row => ({
    id: String(row.id ?? ''),
    jobId: String(row.job_id ?? ''),
    assignmentId: typeof row.assignment_id === 'string' ? row.assignment_id : undefined,
    triggerReason: String(row.trigger_reason ?? ''),
    amount: Number(row.amount ?? 0),
    status: String(row.status ?? 'pending_admin_review'),
    fundingSource: String(row.funding_source ?? 'policy_configured'),
    enforcementMode: String(row.enforcement_mode ?? 'observe_only'),
    createdAt: String(row.created_at ?? ''),
  }))
}

async function listGovernanceAuditEvents(): Promise<GovernanceAuditEventRow[]> {
  const { data, error } = await supabase
    .from('governance_audit_events')
    .select('*')
    .in('entity_type', [
      'reliability_policy_version',
      'cancellation_request',
      'job_payment_decision',
      'standby_invite',
    ])
    .order('created_at', { ascending: false })
    .limit(100)

  if (error || !data) return []
  return (data as DbRow[]).map(row => ({
    id: String(row.id ?? ''),
    entityType: String(row.entity_type ?? ''),
    entityId: String(row.entity_id ?? ''),
    action: String(row.action ?? ''),
    actorId: typeof row.actor_id === 'string' ? row.actor_id : undefined,
    actorRole: typeof row.actor_role === 'string' ? row.actor_role : undefined,
    reason: typeof row.reason === 'string' ? row.reason : undefined,
    createdAt: String(row.created_at ?? ''),
  }))
}
