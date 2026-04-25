import type { UserRole } from '@/lib/auth'

export type ReliabilityNotificationChannel = 'email' | 'in_app' | 'sms' | 'push'

export type ReliabilityNotificationTemplateKey =
  | 'inspector.claim_confirmed'
  | 'inspector.reconfirmation_24h'
  | 'inspector.reconfirmation_4h'
  | 'inspector.reconfirmation_90m'
  | 'inspector.invalid_cancellation_notice'
  | 'inspector.protected_cancellation_notice'
  | 'inspector.tier_improvement'
  | 'builder.inspector_assigned'
  | 'builder.appointment_confirmed'
  | 'builder.appointment_at_risk'
  | 'builder.reassignment_started'
  | 'builder.no_show_recovery'
  | 'admin.missed_4h_confirmation'
  | 'admin.missed_90m_confirmation'
  | 'admin.no_show_detected'
  | 'admin.cancellation_review_required'
  | 'admin.payout_blocked'
  | 'admin.standby_activation_failed'
  | 'admin.reliability_threshold_breached'

export interface ReliabilityNotificationTemplate {
  key: ReliabilityNotificationTemplateKey
  recipientRole: Extract<UserRole, 'inspector' | 'builder' | 'admin'>
  subject: string
  body: string
  deepLinkPath: string
  internalOnly?: boolean
}

export interface ReliabilityNotificationContext {
  jobId?: string
  assignmentId?: string
  appointmentId?: string
  confirmationId?: string
  cancellationRequestId?: string
  payoutDecisionId?: string
  inspectorId?: string
  standbyInviteId?: string
}

export interface ReliabilityNotificationEventDraft {
  eventKey: ReliabilityNotificationTemplateKey
  recipientUserId?: string
  recipientRole: ReliabilityNotificationTemplate['recipientRole']
  channel: ReliabilityNotificationChannel
  status: 'queued'
  payload: {
    templateKey: ReliabilityNotificationTemplateKey
    subject: string
    body: string
    deepLink: string
    context: ReliabilityNotificationContext
    internalOnly: boolean
  }
  scheduledFor: string
}

export interface ReliabilityNotificationSystemEvent {
  eventKey?: string
  eventType?: string
  checkpoint?: string
  recipientRole?: UserRole | null
  status?: string
}

export interface NotificationDeliveryStatusUpdate {
  notificationId: string
  status: 'queued' | 'sent' | 'failed' | 'skipped'
  attemptedAt: string
  error?: string
}

export const RELIABILITY_NOTIFICATION_TEMPLATES: Record<ReliabilityNotificationTemplateKey, ReliabilityNotificationTemplate> = {
  'inspector.claim_confirmed': {
    key: 'inspector.claim_confirmed',
    recipientRole: 'inspector',
    subject: 'Inspection claimed — professional commitment confirmed',
    body: 'You have claimed this inspection. Please attend at the scheduled time, complete required evidence, and reconfirm when prompted. Reliable attendance improves your Vero tier, job access, and payout speed.',
    deepLinkPath: '/inspector',
  },
  'inspector.reconfirmation_24h': {
    key: 'inspector.reconfirmation_24h',
    recipientRole: 'inspector',
    subject: 'Reconfirm your Vero inspection',
    body: 'Please reconfirm your appointment. Reliable attendance protects the builder’s schedule and strengthens your Vero tier.',
    deepLinkPath: '/inspector',
  },
  'inspector.reconfirmation_4h': {
    key: 'inspector.reconfirmation_4h',
    recipientRole: 'inspector',
    subject: 'Action required — inspection reconfirmation',
    body: 'Please reconfirm your inspection. Missing this checkpoint may trigger Admin review or standby support.',
    deepLinkPath: '/inspector',
  },
  'inspector.reconfirmation_90m': {
    key: 'inspector.reconfirmation_90m',
    recipientRole: 'inspector',
    subject: 'Final confirmation required',
    body: 'Please confirm you are still attending. If you are unable to attend, submit a structured cancellation immediately.',
    deepLinkPath: '/inspector',
  },
  'inspector.invalid_cancellation_notice': {
    key: 'inspector.invalid_cancellation_notice',
    recipientRole: 'inspector',
    subject: 'Cancellation under review',
    body: 'This cancellation occurred inside the protected appointment window and may affect your reliability record. You may submit additional context for Admin review.',
    deepLinkPath: '/inspector',
  },
  'inspector.protected_cancellation_notice': {
    key: 'inspector.protected_cancellation_notice',
    recipientRole: 'inspector',
    subject: 'Cancellation recorded as protected',
    body: 'This cancellation has been recorded as protected. Your reliability tier will not be materially affected.',
    deepLinkPath: '/inspector',
  },
  'inspector.tier_improvement': {
    key: 'inspector.tier_improvement',
    recipientRole: 'inspector',
    subject: 'Your Vero tier improved',
    body: 'Your reliability record has moved you into a higher tier, giving you stronger access to priority work and payout benefits.',
    deepLinkPath: '/inspector',
  },
  'builder.inspector_assigned': {
    key: 'builder.inspector_assigned',
    recipientRole: 'builder',
    subject: 'Your Vero inspection is assigned',
    body: 'A qualified inspector has claimed your inspection. Vero will monitor confirmation checkpoints ahead of the appointment.',
    deepLinkPath: '/builder',
  },
  'builder.appointment_confirmed': {
    key: 'builder.appointment_confirmed',
    recipientRole: 'builder',
    subject: 'Your inspection is confirmed',
    body: 'Your inspector has reconfirmed attendance. Your escrow remains protected through the Vero workflow.',
    deepLinkPath: '/builder',
  },
  'builder.appointment_at_risk': {
    key: 'builder.appointment_at_risk',
    recipientRole: 'builder',
    subject: 'Vero is monitoring your inspection',
    body: 'We are monitoring your inspection appointment. If the assigned inspector becomes unavailable, Vero will begin reassignment support.',
    deepLinkPath: '/builder',
  },
  'builder.reassignment_started': {
    key: 'builder.reassignment_started',
    recipientRole: 'builder',
    subject: 'Vero has begun reassignment support',
    body: 'The assigned inspector is no longer available. Vero is prioritizing qualified backup inspectors to protect your schedule.',
    deepLinkPath: '/builder',
  },
  'builder.no_show_recovery': {
    key: 'builder.no_show_recovery',
    recipientRole: 'builder',
    subject: 'Vero is resolving your inspection appointment',
    body: 'Your escrow remains protected while Vero reviews the missed appointment and begins recovery steps.',
    deepLinkPath: '/builder',
  },
  'admin.missed_4h_confirmation': {
    key: 'admin.missed_4h_confirmation',
    recipientRole: 'admin',
    subject: 'Missed 4-hour confirmation',
    body: 'An inspector missed the 4-hour confirmation checkpoint. Review appointment risk and standby readiness.',
    deepLinkPath: '/admin/reliability',
    internalOnly: true,
  },
  'admin.missed_90m_confirmation': {
    key: 'admin.missed_90m_confirmation',
    recipientRole: 'admin',
    subject: 'Missed 90-minute confirmation',
    body: 'An inspector missed the final confirmation checkpoint. Review standby activation and builder recovery status.',
    deepLinkPath: '/admin/reliability',
    internalOnly: true,
  },
  'admin.no_show_detected': {
    key: 'admin.no_show_detected',
    recipientRole: 'admin',
    subject: 'No-show detected',
    body: 'A possible no-show has been detected. Review attendance evidence, payout hold status, and recovery actions.',
    deepLinkPath: '/admin/reliability',
    internalOnly: true,
  },
  'admin.cancellation_review_required': {
    key: 'admin.cancellation_review_required',
    recipientRole: 'admin',
    subject: 'Cancellation review required',
    body: 'A cancellation requires Admin classification. Review reason, evidence, protected-window status, and reassignment needs.',
    deepLinkPath: '/admin/reliability',
    internalOnly: true,
  },
  'admin.payout_blocked': {
    key: 'admin.payout_blocked',
    recipientRole: 'admin',
    subject: 'Payout blocked',
    body: 'A job payout is blocked or pending review. Review reliability events, disputes, evidence status, and policy configuration.',
    deepLinkPath: '/admin/reliability',
    internalOnly: true,
  },
  'admin.standby_activation_failed': {
    key: 'admin.standby_activation_failed',
    recipientRole: 'admin',
    subject: 'Standby activation failed',
    body: 'Standby activation did not produce an accepted backup inspector. Review manual reassignment options and builder communications.',
    deepLinkPath: '/admin/reliability',
    internalOnly: true,
  },
  'admin.reliability_threshold_breached': {
    key: 'admin.reliability_threshold_breached',
    recipientRole: 'admin',
    subject: 'Inspector reliability threshold breached',
    body: 'An inspector crossed a reliability review threshold. Review recent events, credential status, payout controls, and any active appeals.',
    deepLinkPath: '/admin/reliability',
    internalOnly: true,
  },
}

const SUPPORTED_CHANNELS: ReliabilityNotificationChannel[] = ['email', 'in_app', 'sms', 'push']

export function getReliabilityNotificationTemplate(
  key: ReliabilityNotificationTemplateKey,
): ReliabilityNotificationTemplate {
  return RELIABILITY_NOTIFICATION_TEMPLATES[key]
}

export function resolveReliabilityTemplateForSystemEvent(
  event: ReliabilityNotificationSystemEvent,
): ReliabilityNotificationTemplateKey | null {
  if (event.eventKey && event.eventKey in RELIABILITY_NOTIFICATION_TEMPLATES) {
    return event.eventKey as ReliabilityNotificationTemplateKey
  }

  if (event.eventKey === 'inspector.claim_commitment_accepted') return 'inspector.claim_confirmed'
  if (event.eventKey === 'builder.assignment_claimed') return 'builder.inspector_assigned'
  if (event.eventKey === 'builder.inspection_confirmed_monitoring') return 'builder.appointment_confirmed'
  if (event.eventKey === 'builder.assignment_reassignment_support') return 'builder.reassignment_started'
  if (event.eventKey === 'admin.cancellation_appeal_submitted') return 'admin.cancellation_review_required'
  if (event.eventKey === 'inspector.cancellation_more_information_requested') return 'inspector.invalid_cancellation_notice'

  if (event.eventKey === 'inspector.attendance_confirmation_reminder') {
    if (event.checkpoint === 't_24h') return 'inspector.reconfirmation_24h'
    if (event.checkpoint === 't_4h') return 'inspector.reconfirmation_4h'
    if (event.checkpoint === 't_90m') return 'inspector.reconfirmation_90m'
    return 'inspector.reconfirmation_24h'
  }

  if (event.eventType === 'CONFIRMATION_MISSED' || event.eventType === 'pre_site_confirmation_missed') {
    if (event.checkpoint === 't_90m') return 'admin.missed_90m_confirmation'
    if (event.checkpoint === 't_4h') return 'admin.missed_4h_confirmation'
  }

  if (event.eventType === 'NO_SHOW' || event.eventType === 'no_show') {
    return event.recipientRole === 'builder' ? 'builder.no_show_recovery' : 'admin.no_show_detected'
  }
  if (event.eventType === 'LATE_CANCELLATION' || event.eventType === 'invalid_late_cancellation') return 'inspector.invalid_cancellation_notice'
  if (event.eventType === 'valid_cancellation' || event.eventKey === 'inspector.cancellation_recorded') return 'inspector.protected_cancellation_notice'
  if (event.eventType === 'STANDBY_ACCEPTED' || event.eventType === 'PRIMARY_REASSIGNED') return 'builder.reassignment_started'
  if (event.eventType === 'payout_blocked') return 'admin.payout_blocked'

  return null
}

export function canSendReliabilityNotification(input: {
  actorRole?: UserRole | null
  recipientRole: UserRole
  templateKey: ReliabilityNotificationTemplateKey
}): boolean {
  const template = getReliabilityNotificationTemplate(input.templateKey)
  if (!template || template.recipientRole !== input.recipientRole) return false
  if (input.actorRole === 'admin') return true
  if (template.internalOnly) return false
  return input.actorRole === template.recipientRole
}

export function buildReliabilityDeepLink(
  templateKey: ReliabilityNotificationTemplateKey,
  context: ReliabilityNotificationContext = {},
): string {
  const template = getReliabilityNotificationTemplate(templateKey)
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(context)) {
    if (value) params.set(key, value)
  }

  const query = params.toString()
  return query ? `${template.deepLinkPath}?${query}` : template.deepLinkPath
}

export function buildReliabilityNotificationEvent(input: {
  templateKey: ReliabilityNotificationTemplateKey
  recipientUserId?: string
  recipientRole: ReliabilityNotificationTemplate['recipientRole']
  channel?: ReliabilityNotificationChannel
  context?: ReliabilityNotificationContext
  scheduledFor?: string
  actorRole?: UserRole | null
}): ReliabilityNotificationEventDraft {
  const template = getReliabilityNotificationTemplate(input.templateKey)
  const channel = input.channel ?? 'in_app'

  if (!SUPPORTED_CHANNELS.includes(channel)) {
    throw new Error(`Unsupported notification channel: ${channel}`)
  }

  if (!canSendReliabilityNotification({
    actorRole: input.actorRole ?? template.recipientRole,
    recipientRole: input.recipientRole,
    templateKey: input.templateKey,
  })) {
    throw new Error('Recipient role is not permitted for this reliability notification template.')
  }

  return {
    eventKey: input.templateKey,
    recipientUserId: input.recipientUserId,
    recipientRole: template.recipientRole,
    channel,
    status: 'queued',
    payload: {
      templateKey: template.key,
      subject: template.subject,
      body: template.body,
      deepLink: buildReliabilityDeepLink(input.templateKey, input.context),
      context: input.context ?? {},
      internalOnly: template.internalOnly === true,
    },
    scheduledFor: input.scheduledFor ?? new Date().toISOString(),
  }
}

export function buildNotificationDeliveryStatusUpdate(input: {
  notificationId: string
  status: NotificationDeliveryStatusUpdate['status']
  attemptedAt?: string
  error?: string
}): NotificationDeliveryStatusUpdate {
  if (!input.notificationId) throw new Error('notificationId is required.')

  return {
    notificationId: input.notificationId,
    status: input.status,
    attemptedAt: input.attemptedAt ?? new Date().toISOString(),
    error: input.error,
  }
}

export function isBuilderSafeReliabilityNotification(templateKey: ReliabilityNotificationTemplateKey): boolean {
  const template = getReliabilityNotificationTemplate(templateKey)
  if (template.recipientRole !== 'builder') return true
  const prohibited = /penalt|score|reserve|threshold|payout block|enforcement/i
  return !prohibited.test(`${template.subject} ${template.body}`)
}
