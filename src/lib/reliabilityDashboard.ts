import type { ReliabilityEventInput } from '@/lib/reliability'

export type InspectorOpportunityTier = 'verified' | 'preferred' | 'priority' | 'elite'
export type DashboardMetricStatus = 'strong' | 'steady' | 'review'

export interface ReliabilityDashboardProfileInput {
  tierKey?: string | null
  manualTierOverride?: string | null
  internalScore?: number | null
  completedProfessionalWorkCount?: number | null
  claimCommitmentCount?: number | null
  invalidLateCancellationCount?: number | null
  noShowCount?: number | null
  credentialStatus?: string | null
}

export type ReliabilityDashboardEventInput = ReliabilityEventInput & {
  adminReviewStatus?: string | null
}

export interface ReliabilityDashboardMetric {
  label: string
  value: string
  helper: string
  status: DashboardMetricStatus
}

export interface ReliabilityDashboardModel {
  tier: InspectorOpportunityTier
  tierLabel: string
  score: number
  benefits: string[]
  metrics: ReliabilityDashboardMetric[]
  helpfulActions: string[]
  protectedEvents: string[]
  disputedEventCount: number
  isNewInspector: boolean
}

export const INSPECTOR_TIER_BENEFITS: Record<InspectorOpportunityTier, string[]> = {
  verified: [
    'Access to standard inspections',
    'Standard payout timing',
    'Standard reserve requirement',
  ],
  preferred: [
    'Better job visibility',
    'Improved builder trust',
    'Faster payout eligibility',
    'Lower reserve requirement',
  ],
  priority: [
    'First access to rush jobs',
    'Priority dispatch weighting',
    'Faster payouts',
    'Lower reserve requirement',
  ],
  elite: [
    'Premium professional badge',
    'Fastest payout eligibility',
    'Lowest reserve requirement',
    'Priority access to complex, rush, and commercial work',
  ],
}

export const RELIABILITY_HELPFUL_ACTIONS = [
  'Show up on time',
  'Confirm appointments',
  'Complete inspection-grade evidence',
  'Communicate early',
  'Keep credentials current',
  'Accept and complete priority jobs',
]

export const RELIABILITY_PROTECTED_EVENTS = [
  'Issuing a Fail when properly documented',
  'Unsafe site cancellation',
  'Builder site not ready',
  'No access',
  'Missing required documents',
  'Approved emergency cancellation',
]

export function buildInspectorReliabilityDashboardModel(input: {
  profile?: ReliabilityDashboardProfileInput | null
  events?: ReliabilityDashboardEventInput[]
}): ReliabilityDashboardModel {
  const profile = input.profile ?? {}
  const events = input.events ?? []
  const tier = normalizeOpportunityTier(profile.manualTierOverride ?? profile.tierKey)
  const completed = Math.max(0, profile.completedProfessionalWorkCount ?? countEvents(events, ['completed_professional_work']))
  const commitments = Math.max(0, profile.claimCommitmentCount ?? countEvents(events, ['claim_commitment_accepted']))
  const invalidLateCancellations = Math.max(0, profile.invalidLateCancellationCount ?? countEvents(events, ['invalid_late_cancellation', 'LATE_CANCELLATION']))
  const noShows = Math.max(0, profile.noShowCount ?? countEvents(events, ['no_show', 'NO_SHOW']))
  const confirmationsCompleted = countEvents(events, ['CONFIRMATION_COMPLETED', 'pre_site_confirmation_completed'])
  const confirmationsMissed = countEvents(events, ['CONFIRMATION_MISSED', 'pre_site_confirmation_missed'])
  const evidenceIncomplete = countEvents(events, ['evidence_incomplete'])
  const disputes = countEvents(events, ['dispute_opened', 'dispute_resolved_inspector_fault'])
  const disputedEventCount = events.filter(event => event.adminReviewStatus === 'pending' || event.metadata?.appealStatus === 'submitted').length

  return {
    tier,
    tierLabel: formatTier(tier),
    score: clampDashboardScore(profile.internalScore ?? 75),
    benefits: INSPECTOR_TIER_BENEFITS[tier],
    helpfulActions: RELIABILITY_HELPFUL_ACTIONS,
    protectedEvents: RELIABILITY_PROTECTED_EVENTS,
    disputedEventCount,
    isNewInspector: completed === 0 && commitments === 0 && events.length === 0,
    metrics: [
      buildAttendanceMetric(completed, invalidLateCancellations, noShows),
      buildConfirmationMetric(confirmationsCompleted, confirmationsMissed),
      {
        label: 'Completed assigned jobs',
        value: completed.toString(),
        helper: completed === 0 ? 'Your completed work history will appear here.' : 'Completed Pass, Fail, Hold, and Modification Required inspections count as professional work when documented properly.',
        status: completed > 0 ? 'strong' : 'steady',
      },
      {
        label: 'Documentation completeness',
        value: evidenceIncomplete === 0 ? 'Complete' : 'Review',
        helper: evidenceIncomplete === 0 ? 'No evidence completeness concerns are currently recorded.' : 'Some records need more complete inspection-grade evidence.',
        status: evidenceIncomplete === 0 ? 'strong' : 'review',
      },
      {
        label: 'Dispute history',
        value: disputes === 0 ? 'Clear' : `${disputes} review${disputes === 1 ? '' : 's'}`,
        helper: disputes === 0 ? 'No inspector-fault dispute history is currently recorded.' : 'Disputed events can be reviewed with Vero Admin.',
        status: disputes === 0 ? 'strong' : 'review',
      },
      {
        label: 'Evidence quality',
        value: evidenceIncomplete === 0 ? 'Strong' : 'Needs review',
        helper: 'Photos, notes, GPS, and audit details help create authority-ready records.',
        status: evidenceIncomplete === 0 ? 'strong' : 'review',
      },
      {
        label: 'Credential status',
        value: credentialStatusLabel(profile.credentialStatus),
        helper: 'Keeping credentials current protects your job access.',
        status: profile.credentialStatus === 'expired' || profile.credentialStatus === 'suspended' ? 'review' : 'strong',
      },
    ],
  }
}

export function normalizeOpportunityTier(tier?: string | null): InspectorOpportunityTier {
  switch (tier) {
    case 'elite':
    case 'premier':
      return 'elite'
    case 'priority':
      return 'priority'
    case 'preferred':
      return 'preferred'
    default:
      return 'verified'
  }
}

function buildAttendanceMetric(
  completed: number,
  invalidLateCancellations: number,
  noShows: number,
): ReliabilityDashboardMetric {
  const obligations = completed + invalidLateCancellations + noShows
  if (obligations === 0) {
    return {
      label: 'Attendance reliability',
      value: 'Building',
      helper: 'Your attendance record starts building after your first assignments.',
      status: 'steady',
    }
  }

  const rate = Math.max(0, (completed / obligations) * 100)
  return {
    label: 'Attendance reliability',
    value: `${Math.round(rate)}%`,
    helper: 'Based on completed assigned jobs, invalid late cancellations, and no-shows.',
    status: rate >= 95 ? 'strong' : rate >= 85 ? 'steady' : 'review',
  }
}

function buildConfirmationMetric(completed: number, missed: number): ReliabilityDashboardMetric {
  const total = completed + missed
  if (total === 0) {
    return {
      label: 'Confirmation responsiveness',
      value: 'Building',
      helper: 'Appointment confirmations will appear as you claim scheduled work.',
      status: 'steady',
    }
  }

  const rate = Math.max(0, (completed / total) * 100)
  return {
    label: 'Confirmation responsiveness',
    value: `${Math.round(rate)}%`,
    helper: 'Timely confirmations help Vero protect builder schedules.',
    status: rate >= 95 ? 'strong' : rate >= 85 ? 'steady' : 'review',
  }
}

function countEvents(events: ReliabilityDashboardEventInput[], eventTypes: string[]): number {
  return events.filter(event => eventTypes.includes(event.eventType)).length
}

function credentialStatusLabel(status?: string | null): string {
  if (!status || status === 'compliant' || status === 'approved') return 'Current'
  return status.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function formatTier(tier: InspectorOpportunityTier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1)
}

function clampDashboardScore(score: number): number {
  if (!Number.isFinite(score)) return 75
  return Math.max(0, Math.min(100, Math.round(score)))
}
