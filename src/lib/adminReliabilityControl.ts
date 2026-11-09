import type {
  JobAttendanceConfirmationRow,
  ReliabilityAdminSnapshot,
  ReliabilityAppointmentRow,
  ReliabilityCancellationRow,
  ReliabilityEventRow,
  ReliabilityNotificationRow,
  ReliabilityProfileRow,
  ReliabilityStandbyCandidateRow,
  ReserveLedgerRow,
  PayoutReviewRow,
} from '@/lib/supabase/reliability'
import type { UserRole } from '@/lib/auth'
import type { ReliabilityEnforcementMode } from '@/lib/types'

export type AdminReliabilitySection =
  | 'overview'
  | 'inspector_detail'
  | 'job_timeline'
  | 'cancellation_review'
  | 'payout_review'
  | 'policy_config'

export interface AdminReliabilityOverviewMetric {
  key: string
  label: string
  value: number
  tone: 'neutral' | 'watch' | 'critical' | 'success'
}

export interface AdminInspectorReliabilityDetail {
  inspectorId: string
  currentTier: string
  reliabilityScore: number
  attendanceRate: number
  cancellationHistory: {
    valid: number
    invalidLate: number
    openReviews: number
  }
  noShowHistory: number
  evidenceCompleteness: string
  credentialStatus: string
  disputeHistory: number
  reserveRequirement: string
  payoutSpeed: string
  recentEvents: ReliabilityEventRow[]
  adminNotes: string[]
  tierHistory: Array<{ tier: string; at: string; reason?: string }>
}

export interface JobReliabilityTimelineItem {
  id: string
  at: string
  label: string
  detail: string
  status: 'complete' | 'pending' | 'risk' | 'admin'
}

export interface AdminAuditLogDraft {
  entityType: string
  entityId: string
  action: string
  actorRole: 'admin'
  reason: string
  metadata: Record<string, unknown>
}

export interface PolicyConfigUpdateInput {
  policyVersionId: string
  currentConfig: Record<string, unknown>
  patch: Record<string, unknown>
  enforcementMode?: ReliabilityEnforcementMode
  adminNote: string
}

export interface CancellationReviewActionInput {
  cancellationRequestId: string
  jobId: string
  assignmentId?: string
  reasonCode: string
  isLate: boolean
  decision: 'approved' | 'rejected' | 'overridden' | 'more_information'
  adminNote: string
  applyConsequence?: boolean
  waiveConsequence?: boolean
  triggerReassignment?: boolean
}

export interface CancellationReviewOutcome {
  validityStatus: 'valid' | 'invalid' | 'admin_overridden' | 'pending_review'
  financialConsequenceStatus: 'applied' | 'waived' | 'not_applied' | 'observe_only_projection'
  reliabilityEvents: Array<{ eventType: 'valid_cancellation' | 'LATE_CANCELLATION'; jobId: string; assignmentId?: string }>
  audit: AdminAuditLogDraft
}

export interface PayoutReviewActionInput {
  assignmentId: string
  decision: 'approve_payout' | 'reduce_payout' | 'block_payout' | 'apply_reserve' | 'waive_consequence' | 'issue_builder_credit'
  adminNote: string
  payoutReductionAmount?: number
  builderCreditAmount?: number
}

export interface PayoutReviewOutcome {
  payoutStatus: 'payout_ready' | 'blocked' | 'review'
  adminReviewStatus: 'approved' | 'reduced' | 'blocked' | 'waived' | 'pending'
  audit: AdminAuditLogDraft
}

export function canAccessAdminReliabilitySection(
  role: UserRole | null | undefined,
  section: AdminReliabilitySection,
): boolean {
  void section
  return role === 'admin'
}

export function canViewInspectorReliabilityDetail(input: {
  viewerRole: UserRole | null | undefined
  viewerId?: string | null
  inspectorId: string
}): 'admin' | 'self_public' | 'denied' {
  if (input.viewerRole === 'admin') return 'admin'
  if (input.viewerRole === 'inspector' && input.viewerId && input.viewerId === input.inspectorId) {
    return 'self_public'
  }
  return 'denied'
}

export function buildReliabilityOverviewMetrics(
  snapshot: ReliabilityAdminSnapshot,
  now: Date = new Date(),
): AdminReliabilityOverviewMetric[] {
  const [dayStart, dayEnd] = getLocalDayBounds(now)
  const assignedToday = snapshot.appointments.filter(appointment => {
    const start = parseTime(appointment.scheduledStartAt)
    return start >= dayStart && start < dayEnd && appointment.status !== 'cancelled'
  }).length
  const missedConfirmations = snapshot.confirmations.filter(confirmation => confirmation.status === 'missed').length
  const noShows = snapshot.events.filter(event => event.eventType === 'NO_SHOW' || event.eventType === 'no_show').length

  return [
    metric('assigned_today', 'Assigned inspections today', assignedToday, assignedToday > 0 ? 'success' : 'neutral'),
    metric('at_risk', 'At-risk appointments', countAtRiskAppointments(snapshot), 'watch'),
    metric('missed_confirmations', 'Missed confirmations', missedConfirmations, missedConfirmations > 0 ? 'critical' : 'neutral'),
    metric('late_cancellations', 'Late cancellations', snapshot.cancellations.filter(row => row.isLate).length, 'watch'),
    metric('no_shows', 'No-shows', noShows, noShows > 0 ? 'critical' : 'neutral'),
    metric('standby_activations', 'Standby activations', countStandbyActivations(snapshot.standbyCandidates), 'watch'),
    metric('payout_blocks', 'Payout blocks', snapshot.payoutReviews.filter(row => row.payoutStatus === 'blocked').length, 'critical'),
    metric('open_cancellation_reviews', 'Open cancellation reviews', snapshot.cancellations.filter(row => row.validityStatus === 'pending_review' || row.appealStatus === 'submitted').length, 'watch'),
    metric('watchlist', 'Inspectors on watchlist', snapshot.profiles.filter(isWatchlistProfile).length, 'watch'),
  ]
}

export function buildInspectorReliabilityDetail(input: {
  profile: ReliabilityProfileRow
  events: ReliabilityEventRow[]
  cancellations: ReliabilityCancellationRow[]
  reserveEntries: ReserveLedgerRow[]
  credentialStatus?: string | null
  adminNotes?: string[]
  tierHistory?: Array<{ tier: string; at: string; reason?: string }>
}): AdminInspectorReliabilityDetail {
  const inspectorEvents = input.events.filter(event => event.inspectorId === input.profile.inspectorId)
  const missedConfirmations = inspectorEvents.filter(event => event.eventType === 'CONFIRMATION_MISSED' || event.eventType === 'pre_site_confirmation_missed').length
  const attendanceDenominator = Math.max(1, input.profile.claimCommitmentCount)
  const attendanceRate = Math.max(0, Math.round(((attendanceDenominator - input.profile.noShowCount - missedConfirmations) / attendanceDenominator) * 100))
  const evidenceEvents = inspectorEvents.filter(event => event.eventType === 'evidence_incomplete' || event.eventType === 'completed_professional_work')
  const incompleteEvidence = evidenceEvents.filter(event => event.eventType === 'evidence_incomplete').length

  return {
    inspectorId: input.profile.inspectorId,
    currentTier: input.profile.manualTierOverride ?? input.profile.tierKey,
    reliabilityScore: input.profile.internalScore,
    attendanceRate,
    cancellationHistory: {
      valid: input.profile.validCancellationCount ?? 0,
      invalidLate: input.profile.invalidLateCancellationCount,
      openReviews: input.cancellations.filter(row => row.assignmentId && row.validityStatus === 'pending_review').length,
    },
    noShowHistory: input.profile.noShowCount,
    evidenceCompleteness: evidenceEvents.length === 0
      ? 'No evidence history yet'
      : `${Math.round(((evidenceEvents.length - incompleteEvidence) / evidenceEvents.length) * 100)}% complete`,
    credentialStatus: input.credentialStatus ?? 'unknown',
    disputeHistory: inspectorEvents.filter(event => event.eventType === 'dispute_opened').length,
    reserveRequirement: summarizeReserveRequirement(input.reserveEntries.filter(entry => entry.inspectorId === input.profile.inspectorId)),
    payoutSpeed: payoutSpeedLabel(input.profile.manualTierOverride ?? input.profile.tierKey),
    recentEvents: inspectorEvents.slice(0, 10),
    adminNotes: input.adminNotes ?? [],
    tierHistory: input.tierHistory ?? [],
  }
}

export function sanitizeInspectorReliabilityDetailForViewer(
  detail: AdminInspectorReliabilityDetail,
  viewer: { role: UserRole | null | undefined; id?: string | null },
): Partial<AdminInspectorReliabilityDetail> | null {
  const access = canViewInspectorReliabilityDetail({
    viewerRole: viewer.role,
    viewerId: viewer.id,
    inspectorId: detail.inspectorId,
  })

  if (access === 'denied') return null
  if (access === 'admin') return detail

  return {
    inspectorId: detail.inspectorId,
    currentTier: detail.currentTier,
    attendanceRate: detail.attendanceRate,
    evidenceCompleteness: detail.evidenceCompleteness,
    credentialStatus: detail.credentialStatus,
    payoutSpeed: detail.payoutSpeed,
  }
}

export function buildJobReliabilityTimeline(input: {
  jobId: string
  appointments: ReliabilityAppointmentRow[]
  confirmations: JobAttendanceConfirmationRow[]
  notifications: ReliabilityNotificationRow[]
  events: ReliabilityEventRow[]
  cancellations: ReliabilityCancellationRow[]
  standbyCandidates: ReliabilityStandbyCandidateRow[]
  payoutReviews: PayoutReviewRow[]
}): JobReliabilityTimelineItem[] {
  const items: JobReliabilityTimelineItem[] = []
  const appointments = input.appointments.filter(row => row.jobId === input.jobId)
  const confirmations = input.confirmations.filter(row => row.jobId === input.jobId)
  const notifications = input.notifications.filter(row => row.jobId === input.jobId)
  const events = input.events.filter(row => row.jobId === input.jobId)
  const cancellations = input.cancellations.filter(row => row.jobId === input.jobId)
  const standby = input.standbyCandidates.filter(row => row.jobId === input.jobId)
  const payouts = input.payoutReviews.filter(row => row.jobId === input.jobId)

  for (const appointment of appointments) {
    addTimelineItem(items, appointment.commitmentAcceptedAt, 'Commitment accepted', `Inspector commitment ${appointment.commitmentVersion}`, 'complete')
    addTimelineItem(items, appointment.inspectorConfirmedAt, 'Inspector response', 'Inspector confirmed attendance.', 'complete')
    addTimelineItem(items, appointment.enRouteAt, 'Departure confirmed', 'Inspector marked en route.', 'complete')
    addTimelineItem(items, appointment.arrivedAt, 'Arrival check-in', 'Inspector arrived or checked in on site.', 'complete')
    addTimelineItem(items, appointment.completedAt, 'Inspection completed', 'Inspection workflow completed.', 'complete')
  }

  for (const confirmation of confirmations) {
    const status = confirmation.status === 'missed'
      ? 'risk'
      : confirmation.status === 'pending'
        ? 'pending'
        : 'complete'
    addTimelineItem(
      items,
      confirmation.confirmedAt ?? confirmation.missedAt ?? confirmation.requiredAt ?? confirmation.createdAt,
      confirmation.checkpoint.replaceAll('_', ' '),
      `${confirmation.status} · escalation ${confirmation.escalationStatus}`,
      status,
    )
  }

  for (const notification of notifications) {
    addTimelineItem(items, notification.sentAt ?? notification.scheduledFor ?? notification.createdAt, 'Notification sent', notification.eventKey, notification.status === 'failed' ? 'risk' : 'complete')
  }

  for (const event of events) {
    addTimelineItem(items, event.createdAt, event.eventType.replaceAll('_', ' '), `Score delta ${event.scoreDelta} · ${event.adminReviewStatus}`, event.adminReviewStatus === 'pending' ? 'admin' : 'complete')
  }

  for (const cancellation of cancellations) {
    addTimelineItem(items, cancellation.createdAt, 'Cancellation / no-show review', `${cancellation.reasonCode} · ${cancellation.validityStatus}`, cancellation.validityStatus === 'invalid' ? 'risk' : 'admin')
  }

  for (const candidate of standby) {
    addTimelineItem(items, candidate.acceptedAt ?? candidate.offeredAt ?? candidate.createdAt, 'Standby activation', `Rank ${candidate.rank} · ${candidate.status}`, candidate.status === 'accepted' ? 'complete' : 'admin')
  }

  for (const payout of payouts) {
    addTimelineItem(items, payout.decidedAt, 'Payout status', `${payout.payoutStatus} · ${payout.adminReviewStatus}`, payout.payoutStatus === 'blocked' ? 'risk' : 'admin')
  }

  return items.sort((a, b) => parseTime(a.at) - parseTime(b.at))
}

export function buildPolicyConfigUpdate(input: PolicyConfigUpdateInput): {
  nextConfig: Record<string, unknown>
  audit: AdminAuditLogDraft
} {
  if (!input.adminNote.trim()) {
    throw new Error('Admin rationale is required for policy updates.')
  }

  const nextConfig = {
    ...input.currentConfig,
    ...input.patch,
    ...(input.enforcementMode ? { enforcementMode: input.enforcementMode } : {}),
  }

  return {
    nextConfig,
    audit: {
      entityType: 'reliability_policy_version',
      entityId: input.policyVersionId,
      action: 'reliability.policy_config_updated',
      actorRole: 'admin',
      reason: input.adminNote,
      metadata: {
        patch: input.patch,
        enforcementMode: input.enforcementMode,
      },
    },
  }
}

export function buildCancellationReviewOutcome(input: CancellationReviewActionInput): CancellationReviewOutcome {
  if (!input.adminNote.trim()) throw new Error('Admin rationale is required for cancellation review.')

  const validityStatus = input.decision === 'approved'
    ? 'valid'
    : input.decision === 'rejected'
      ? 'invalid'
      : input.decision === 'overridden'
        ? 'admin_overridden'
        : 'pending_review'

  const financialConsequenceStatus = input.waiveConsequence
    ? 'waived'
    : input.applyConsequence
      ? 'applied'
      : 'not_applied'

  const reliabilityEvents: CancellationReviewOutcome['reliabilityEvents'] = []
  if (validityStatus === 'valid') {
    reliabilityEvents.push({ eventType: 'valid_cancellation', jobId: input.jobId, assignmentId: input.assignmentId })
  }
  if (validityStatus === 'invalid' && input.isLate) {
    reliabilityEvents.push({ eventType: 'LATE_CANCELLATION', jobId: input.jobId, assignmentId: input.assignmentId })
  }

  return {
    validityStatus,
    financialConsequenceStatus,
    reliabilityEvents,
    audit: {
      entityType: 'cancellation_request',
      entityId: input.cancellationRequestId,
      action: 'cancellation.admin_reviewed',
      actorRole: 'admin',
      reason: input.adminNote,
      metadata: {
        decision: input.decision,
        reasonCode: input.reasonCode,
        triggerReassignment: input.triggerReassignment === true,
        financialConsequenceStatus,
      },
    },
  }
}

export function buildPayoutReviewOutcome(input: PayoutReviewActionInput): PayoutReviewOutcome {
  if (!input.adminNote.trim()) throw new Error('Admin rationale is required for payout review.')

  const payoutStatus = input.decision === 'block_payout'
    ? 'blocked'
    : input.decision === 'apply_reserve' || input.decision === 'issue_builder_credit'
      ? 'review'
      : 'payout_ready'
  const adminReviewStatus = input.decision === 'block_payout'
    ? 'blocked'
    : input.decision === 'reduce_payout'
      ? 'reduced'
      : input.decision === 'waive_consequence'
        ? 'waived'
        : input.decision === 'apply_reserve' || input.decision === 'issue_builder_credit'
          ? 'approved'
          : 'approved'

  return {
    payoutStatus,
    adminReviewStatus,
    audit: {
      entityType: 'job_payment_decision',
      entityId: input.assignmentId,
      action: 'payout.admin_reviewed',
      actorRole: 'admin',
      reason: input.adminNote,
      metadata: {
        decision: input.decision,
        payoutReductionAmount: input.payoutReductionAmount ?? 0,
        builderCreditAmount: input.builderCreditAmount ?? 0,
      },
    },
  }
}

function metric(
  key: string,
  label: string,
  value: number,
  tone: AdminReliabilityOverviewMetric['tone'],
): AdminReliabilityOverviewMetric {
  return { key, label, value, tone }
}

function countAtRiskAppointments(snapshot: ReliabilityAdminSnapshot): number {
  const fromConfirmations = new Set(
    snapshot.confirmations
      .filter(row => row.escalationStatus !== 'none' || row.status === 'missed')
      .map(row => row.assignmentId),
  )
  const fromAppointments = snapshot.appointments
    .filter(row => row.status === 'no_show' || row.status === 'reassigned')
    .map(row => row.assignmentId)

  return new Set([...fromConfirmations, ...fromAppointments]).size
}

function countStandbyActivations(candidates: ReliabilityStandbyCandidateRow[]): number {
  return candidates.filter(row => row.status === 'offered' || row.status === 'accepted' || row.status === 'soft_alerted').length
}

function isWatchlistProfile(profile: ReliabilityProfileRow): boolean {
  return profile.internalScore < 70
    || profile.tierKey === 'restricted'
    || profile.manualTierOverride === 'restricted'
    || profile.noShowCount > 0
    || profile.invalidLateCancellationCount > 1
}

function summarizeReserveRequirement(entries: ReserveLedgerRow[]): string {
  const active = entries.filter(entry => entry.status === 'pending' || entry.status === 'posted')
  if (active.length === 0) return 'No active reserve hold'
  const amount = active.reduce((sum, entry) => sum + entry.amount, 0)
  return `CAD ${amount.toFixed(2)} active reserve`
}

function payoutSpeedLabel(tier: string): string {
  if (tier === 'premier' || tier === 'elite') return 'Fastest'
  if (tier === 'priority') return 'Faster'
  if (tier === 'preferred') return 'Slightly faster'
  if (tier === 'restricted') return 'Admin hold'
  return 'Standard'
}

function addTimelineItem(
  items: JobReliabilityTimelineItem[],
  at: string | undefined,
  label: string,
  detail: string,
  status: JobReliabilityTimelineItem['status'],
) {
  if (!at) return
  items.push({
    id: `${label}-${at}-${items.length}`,
    at,
    label,
    detail,
    status,
  })
}

function getLocalDayBounds(now: Date): [number, number] {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 1)
  return [start.getTime(), end.getTime()]
}

function parseTime(value?: string): number {
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}
