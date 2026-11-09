export const BUILDER_RELIABILITY_GUARANTEE_TITLE = 'Vero Reliability Guarantee'

export const BUILDER_RELIABILITY_GUARANTEE_BODY =
  'When an inspection is confirmed through Vero Permit, we stand behind the appointment. If an assigned inspector becomes unavailable or fails to attend without a valid reason, Vero will protect your payment, begin reassignment support, preserve the audit trail, and take action under our reliability rules.'

export const BUILDER_RELIABILITY_GUARANTEE_BULLETS = [
  'Confirmed inspector commitment',
  'Pre-site attendance checks',
  'Payment protection',
  'Reassignment support',
  'Admin-reviewed dispute and payout controls',
  'Defensible inspection record',
] as const

export const BUILDER_APPOINTMENT_AT_RISK_COPY =
  'Vero is monitoring your inspection appointment. If the assigned inspector becomes unavailable, we will begin reassignment support and keep your payment protected.'

export const BUILDER_REASSIGNMENT_STARTED_COPY =
  'Vero has begun reassignment support for your inspection. We are prioritizing qualified inspectors who match the required credential, region, and inspection stage.'

export type BuilderAppointmentConfidenceStatus =
  | 'confirmed'
  | 'awaiting_reconfirmation'
  | 'at_risk'
  | 'reassignment_in_progress'
  | 'completed'

export interface BuilderAppointmentStatusInput {
  assignmentStatus?: string | null
  jobStatus?: string | null
  nextConfirmationCheckpoint?: string | null
  nextConfirmationRequiredAt?: string | null
  missedCriticalConfirmation?: boolean
  standbyActivationRequested?: boolean
  reassignmentInProgress?: boolean
  completed?: boolean
}

export interface BuilderReliabilityStatusModel {
  status: BuilderAppointmentConfidenceStatus
  label: string
  copy: string
  veroAction: string
  escrowProtection: string
  supportEscalationPath: string
  nextConfirmationCheckpoint: string
}

const STATUS_LABELS: Record<BuilderAppointmentConfidenceStatus, string> = {
  confirmed: 'Confirmed',
  awaiting_reconfirmation: 'Awaiting reconfirmation',
  at_risk: 'At risk',
  reassignment_in_progress: 'Reassignment in progress',
  completed: 'Completed',
}

const STATUS_COPY: Record<BuilderAppointmentConfidenceStatus, string> = {
  confirmed:
    'Your inspector is assigned. Vero is monitoring the appointment and will notify you if anything changes.',
  awaiting_reconfirmation:
    'Your appointment is confirmed and Vero is waiting for the next scheduled inspector reconfirmation.',
  at_risk: BUILDER_APPOINTMENT_AT_RISK_COPY,
  reassignment_in_progress: BUILDER_REASSIGNMENT_STARTED_COPY,
  completed:
    'Inspection workflow is complete. Your audit trail and inspection record remain preserved in Vero.',
}

const STATUS_ACTIONS: Record<BuilderAppointmentConfidenceStatus, string> = {
  confirmed: 'Monitoring pre-site attendance checkpoints.',
  awaiting_reconfirmation: 'Waiting for the next required inspector check-in.',
  at_risk: 'Monitoring risk signals and preparing reassignment support if needed.',
  reassignment_in_progress: 'Activating qualified backup inspectors under governed dispatch rules.',
  completed: 'Preserving the completed inspection record and audit trail.',
}

export function deriveBuilderAppointmentStatus(
  input: BuilderAppointmentStatusInput,
): BuilderAppointmentConfidenceStatus {
  const assignmentStatus = input.assignmentStatus?.toLowerCase()
  const jobStatus = input.jobStatus?.toLowerCase()

  if (input.completed || assignmentStatus === 'completed' || jobStatus === 'completed' || jobStatus === 'closed') {
    return 'completed'
  }

  if (
    input.reassignmentInProgress
    || input.standbyActivationRequested
    || assignmentStatus === 'cancelled'
    || assignmentStatus === 'invalidated'
    || jobStatus === 'standby_activation_requested'
    || jobStatus === 'reassignment_in_progress'
  ) {
    return 'reassignment_in_progress'
  }

  if (
    input.missedCriticalConfirmation
    || jobStatus === 'at_risk'
    || jobStatus === 'standby_prepared'
  ) {
    return 'at_risk'
  }

  if (input.nextConfirmationCheckpoint || input.nextConfirmationRequiredAt) {
    return 'awaiting_reconfirmation'
  }

  return 'confirmed'
}

export function buildBuilderReliabilityStatus(
  input: BuilderAppointmentStatusInput,
): BuilderReliabilityStatusModel {
  const status = deriveBuilderAppointmentStatus(input)

  return {
    status,
    label: STATUS_LABELS[status],
    copy: STATUS_COPY[status],
    veroAction: STATUS_ACTIONS[status],
    escrowProtection: 'Payment remains protected while Vero monitors, completes, or recovers the appointment.',
    supportEscalationPath: 'Builder support and Admin review are available from the job record if the appointment changes.',
    nextConfirmationCheckpoint: formatNextCheckpoint(input),
  }
}

function formatNextCheckpoint(input: BuilderAppointmentStatusInput): string {
  const checkpoint = input.nextConfirmationCheckpoint?.trim()
  const requiredAt = input.nextConfirmationRequiredAt?.trim()

  if (!checkpoint && !requiredAt) {
    return 'No additional builder action required'
  }

  if (!requiredAt) return checkpoint ?? 'Next scheduled check-in'

  const parsed = new Date(requiredAt)
  const formatted = Number.isNaN(parsed.getTime())
    ? requiredAt
    : new Intl.DateTimeFormat('en-CA', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(parsed)

  return checkpoint ? `${checkpoint} · ${formatted}` : formatted
}
