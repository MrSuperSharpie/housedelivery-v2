import type { HardPingIssueReason } from '@/lib/hardPingTypes'

export type DepartureInterventionTicketState =
  | 'hard_ping_required'
  | 'needs_help'
  | 'cannot_attend'
  | 'no_response'
  | 'ripcord_pending'
  | 'reassignment_failed'
  | 'manual_recovery_required'
  | 'delay_approved_keep_assigned'

export type DepartureInterventionRiskLevel = 'Critical' | 'At Risk' | 'Monitoring' | 'Manual Recovery'

export type DepartureInterventionAction =
  | 'protected_reassign'
  | 'impact_reassign'
  | 'keep_assigned_delay'
  | 'manual_recovery'

export type DepartureResolutionStatus = 'resolving' | 'reassigned' | 'resolved' | 'manual_recovery'

export interface DepartureTriageStandbyCandidate {
  id: string
  inspectorId: string
  inspectorName?: string
  rank: number
  status: 'identified' | 'soft_alerted' | 'offered' | 'accepted' | 'declined' | 'expired' | 'assigned' | 'cancelled' | 'invited'
  expiresAt?: string | null
  offeredAt?: string | null
  acceptedAt?: string | null
  rushMultiplierOffered?: number | null
  credentialMatch?: boolean
  regionMatch?: boolean
  estimatedArrivalAt?: string | null
}

export interface DepartureTriageTimelineItem {
  at: string
  label: string
  actor?: string
}

export interface DepartureInterventionTicket {
  id: string
  jobId: string
  assignmentId: string
  inspectorId: string
  builderId?: string | null
  state: DepartureInterventionTicketState
  riskLevel: DepartureInterventionRiskLevel
  scheduledStartAt: string
  requiredDepartureAt?: string | null
  responseTimestamp?: string | null
  currentEtaSeconds?: number | null
  etaGapMinutes?: number | null
  projectName: string
  inspectionType?: string | null
  siteAddress?: string | null
  inspectorName: string
  inspectorEmail?: string | null
  inspectorPhone?: string | null
  builderName: string
  builderEmail?: string | null
  builderPhone?: string | null
  reasonCategory?: HardPingIssueReason | 'unreachable' | 'unsupported' | 'pending' | null
  reasonLabel: string
  inspectorDetails?: string | null
  standbyStatus: string
  standbyCandidates: DepartureTriageStandbyCandidate[]
  builderNotificationStatus: 'not_sent' | 'queued' | 'sent' | 'failed' | 'unknown'
  escrowProtected: boolean
  lastMonitoringStatus: string
  auditTimeline: DepartureTriageTimelineItem[]
}

export interface DepartureInterventionResolutionInput {
  action: DepartureInterventionAction
  adminNote?: string
  confirmationAccepted?: boolean
  revisedEta?: string
  builderContactMethod?: 'phone' | 'email' | 'sms' | 'in_app' | 'other'
  escalationReason?: string
}

export interface DepartureActionCue {
  label: string
  tone: DepartureInterventionRiskLevel
}

export interface DepartureResolutionCue {
  label: string
  tone: DepartureInterventionRiskLevel
}

export const BUILDER_TRIAGE_COPY = {
  atRisk:
    'Vero is monitoring your inspection appointment. If the assigned inspector becomes unavailable, we will begin reassignment support and keep your escrow protected.',
  reassignment:
    'Vero has begun reassignment support for your inspection. We are prioritizing qualified backup inspectors who match the required credential, region, and inspection stage.',
  delayAccepted:
    'Your inspection remains assigned. Vero has updated the estimated arrival time and will continue monitoring the appointment.',
} as const

export const INSPECTOR_TRIAGE_COPY = {
  protectedEvent:
    'Your issue has been reviewed and recorded as protected. Vero has reassigned the inspection to protect the builder’s schedule.',
  reliabilityImpact:
    'This event has been reviewed as reliability-impacting under Vero’s platform policy. You may request further review if you believe important context is missing.',
  delayAccepted:
    'Vero has confirmed the revised ETA. Please proceed to the site and continue to follow the inspection workflow.',
} as const

const REASON_LABELS: Record<string, string> = {
  vehicle_issue: 'Vehicle issue',
  weather_road_closure: 'Weather / road closure',
  safety_concern: 'Safety concern',
  builder_access_issue: 'Builder access issue',
  emergency: 'Emergency',
  app_gps_issue: 'App / GPS issue',
  other: 'Other',
  unreachable: 'Inspector unreachable',
  unsupported: 'Unsupported reason',
  pending: 'Awaiting response',
}

export function labelDepartureReason(reason: DepartureInterventionTicket['reasonCategory']): string {
  if (!reason) return 'Awaiting response'
  return REASON_LABELS[reason] ?? String(reason).replace(/_/g, ' ')
}

export function minutesUntilScheduledStart(ticket: Pick<DepartureInterventionTicket, 'scheduledStartAt'>, now = new Date()): number {
  return Math.round((new Date(ticket.scheduledStartAt).getTime() - now.getTime()) / 60_000)
}

export function formatStartDelta(ticket: Pick<DepartureInterventionTicket, 'scheduledStartAt'>, now = new Date()): string {
  const minutes = minutesUntilScheduledStart(ticket, now)
  if (minutes < 0) return `${Math.abs(minutes)} min overdue`
  if (minutes === 0) return 'Starts now'
  return `${minutes} min until start`
}

export function deriveDepartureTicketState(input: {
  status: string
  hardPingResponse?: string | null
  hardPingResponseDueAt?: string | null
  protectedIssueSubmitted?: boolean | null
  triageState?: string | null
}, now = new Date()): DepartureInterventionTicketState {
  if (input.triageState === 'manual_recovery_required') return 'manual_recovery_required'
  if (input.triageState === 'delay_approved_keep_assigned') return 'delay_approved_keep_assigned'
  if (input.status === 'reassignment_pending') return 'ripcord_pending'
  if (input.hardPingResponse === 'cannot_attend') return 'cannot_attend'
  if (input.hardPingResponse === 'need_help' || input.protectedIssueSubmitted) return 'needs_help'
  if (
    input.status === 'hard_ping_required'
    && input.hardPingResponseDueAt
    && new Date(input.hardPingResponseDueAt).getTime() <= now.getTime()
  ) {
    return 'no_response'
  }
  return 'hard_ping_required'
}

export function deriveRiskLevel(ticket: {
  state: DepartureInterventionTicketState
  scheduledStartAt: string
  standbyCandidates: DepartureTriageStandbyCandidate[]
}, now = new Date()): DepartureInterventionRiskLevel {
  if (ticket.state === 'manual_recovery_required' || ticket.state === 'reassignment_failed') return 'Manual Recovery'
  if (minutesUntilScheduledStart(ticket, now) < 0) return 'Critical'
  if (ticket.standbyCandidates.length === 0) return 'Critical'
  if (ticket.state === 'no_response' || ticket.state === 'cannot_attend' || ticket.state === 'ripcord_pending') return 'Critical'
  if (ticket.state === 'needs_help') return 'At Risk'
  return 'Monitoring'
}

export function deriveDepartureActionCue(ticket: {
  state: DepartureInterventionTicketState
  standbyCandidates: DepartureTriageStandbyCandidate[]
  builderNotificationStatus: DepartureInterventionTicket['builderNotificationStatus']
}): DepartureActionCue {
  if (ticket.state === 'manual_recovery_required' || ticket.standbyCandidates.length === 0) {
    return { label: 'Manual recovery', tone: 'Manual Recovery' }
  }

  if (ticket.state === 'no_response' || ticket.state === 'cannot_attend' || ticket.state === 'ripcord_pending') {
    return { label: 'Reassign now', tone: 'Critical' }
  }

  if (ticket.state === 'needs_help') {
    return { label: 'Review issue', tone: 'At Risk' }
  }

  if (ticket.builderNotificationStatus === 'not_sent' || ticket.builderNotificationStatus === 'unknown') {
    return { label: 'Notify builder', tone: 'At Risk' }
  }

  return { label: 'Monitor', tone: 'Monitoring' }
}

export function resolutionStatusForAction(action: DepartureInterventionAction): DepartureResolutionStatus {
  if (action === 'manual_recovery') return 'manual_recovery'
  if (action === 'keep_assigned_delay') return 'resolved'
  return 'reassigned'
}

export function deriveDepartureResolutionCue(status: DepartureResolutionStatus): DepartureResolutionCue {
  if (status === 'resolving') return { label: 'Resolving', tone: 'Monitoring' }
  if (status === 'reassigned') return { label: 'Reassigned', tone: 'Critical' }
  if (status === 'manual_recovery') return { label: 'Manual recovery', tone: 'Manual Recovery' }
  return { label: 'Resolved', tone: 'Monitoring' }
}

export function isActiveDepartureAssignmentStatus(status: string | null | undefined): boolean {
  return status === 'confirmed'
    || status === 'pending'
    || status === 'provisional'
    || status === 'provisionally_assigned'
}

export function isTerminalDepartureJobStatus(status: string | null | undefined): boolean {
  return status === 'completed'
    || status === 'cancelled'
    || status === 'stopped'
    || status === 'reassigned'
}

function riskRank(riskLevel: DepartureInterventionRiskLevel) {
  if (riskLevel === 'Critical') return 0
  if (riskLevel === 'Manual Recovery') return 1
  if (riskLevel === 'At Risk') return 2
  return 3
}

function builderNotificationRank(status: DepartureInterventionTicket['builderNotificationStatus']) {
  return status === 'not_sent' || status === 'unknown' ? 0 : 1
}

export function sortDepartureInterventionTickets(
  tickets: DepartureInterventionTicket[],
  now = new Date(),
): DepartureInterventionTicket[] {
  return [...tickets].sort((left, right) => {
    const leftOverdue = minutesUntilScheduledStart(left, now) < 0 ? 0 : 1
    const rightOverdue = minutesUntilScheduledStart(right, now) < 0 ? 0 : 1
    if (leftOverdue !== rightOverdue) return leftOverdue - rightOverdue

    const leftNoStandby = left.standbyCandidates.length === 0 ? 0 : 1
    const rightNoStandby = right.standbyCandidates.length === 0 ? 0 : 1
    if (leftNoStandby !== rightNoStandby) return leftNoStandby - rightNoStandby

    const leftUnreachable = left.state === 'no_response' ? 0 : 1
    const rightUnreachable = right.state === 'no_response' ? 0 : 1
    if (leftUnreachable !== rightUnreachable) return leftUnreachable - rightUnreachable

    const notification = builderNotificationRank(left.builderNotificationStatus) - builderNotificationRank(right.builderNotificationStatus)
    if (notification !== 0) return notification

    const risk = riskRank(left.riskLevel) - riskRank(right.riskLevel)
    if (risk !== 0) return risk

    return new Date(left.scheduledStartAt).getTime() - new Date(right.scheduledStartAt).getTime()
  })
}

export function validateDepartureResolution(input: DepartureInterventionResolutionInput): string | null {
  if (input.action === 'impact_reassign') {
    if (!input.confirmationAccepted) return 'Admin confirmation is required for Reliability Impact.'
    if (!input.adminNote?.trim()) return 'Admin note is required for Reliability Impact.'
  }

  if (input.action === 'keep_assigned_delay') {
    if (!input.revisedEta) return 'Revised ETA is required.'
    if (!input.builderContactMethod) return 'Builder contact method is required.'
    if (!input.adminNote?.trim()) return 'Admin note is required.'
  }

  if (input.action === 'manual_recovery') {
    if (!input.escalationReason?.trim()) return 'Escalation reason is required.'
    if (!input.adminNote?.trim()) return 'Admin note is required.'
  }

  return null
}

export function hasPrivatePenaltyLeak(text: string): boolean {
  return /penalty applied|reserve ledger|internal reliability score|live private coordinate/i.test(text)
}
