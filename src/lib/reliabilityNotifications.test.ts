import test from 'node:test'
import assert from 'node:assert/strict'

import {
  RELIABILITY_NOTIFICATION_TEMPLATES,
  buildNotificationDeliveryStatusUpdate,
  buildReliabilityDeepLink,
  buildReliabilityNotificationEvent,
  canSendReliabilityNotification,
  isBuilderSafeReliabilityNotification,
  resolveReliabilityTemplateForSystemEvent,
  type ReliabilityNotificationTemplateKey,
} from './reliabilityNotifications'

test('defines all required inspector notification templates', () => {
  assert.equal(RELIABILITY_NOTIFICATION_TEMPLATES['inspector.claim_confirmed'].subject, 'Inspection claimed — professional commitment confirmed')
  assert.equal(RELIABILITY_NOTIFICATION_TEMPLATES['inspector.reconfirmation_24h'].body, 'Please reconfirm your appointment. Reliable attendance protects the builder’s schedule and strengthens your Vero tier.')
  assert.equal(RELIABILITY_NOTIFICATION_TEMPLATES['inspector.reconfirmation_4h'].subject, 'Action required — inspection reconfirmation')
  assert.match(RELIABILITY_NOTIFICATION_TEMPLATES['inspector.reconfirmation_90m'].body, /structured cancellation immediately/)
  assert.equal(RELIABILITY_NOTIFICATION_TEMPLATES['inspector.invalid_cancellation_notice'].subject, 'Cancellation under review')
  assert.equal(RELIABILITY_NOTIFICATION_TEMPLATES['inspector.protected_cancellation_notice'].subject, 'Cancellation recorded as protected')
  assert.equal(RELIABILITY_NOTIFICATION_TEMPLATES['inspector.tier_improvement'].subject, 'Your Vero tier improved')
})

test('defines builder templates without internal enforcement details', () => {
  const builderKeys: ReliabilityNotificationTemplateKey[] = [
    'builder.inspector_assigned',
    'builder.appointment_confirmed',
    'builder.appointment_at_risk',
    'builder.reassignment_started',
    'builder.no_show_recovery',
  ]

  assert.equal(RELIABILITY_NOTIFICATION_TEMPLATES['builder.inspector_assigned'].subject, 'Your Vero inspection is assigned')
  assert.equal(RELIABILITY_NOTIFICATION_TEMPLATES['builder.appointment_at_risk'].body, 'We are monitoring your inspection appointment. If the assigned inspector becomes unavailable, Vero will begin reassignment support.')
  assert.equal(RELIABILITY_NOTIFICATION_TEMPLATES['builder.reassignment_started'].subject, 'Vero has begun reassignment support')

  for (const key of builderKeys) {
    assert.equal(isBuilderSafeReliabilityNotification(key), true)
  }
})

test('defines all admin alert templates as internal only', () => {
  const adminKeys = Object.keys(RELIABILITY_NOTIFICATION_TEMPLATES)
    .filter(key => key.startsWith('admin.')) as ReliabilityNotificationTemplateKey[]

  assert.deepEqual(adminKeys.sort(), [
    'admin.cancellation_review_required',
    'admin.missed_4h_confirmation',
    'admin.missed_90m_confirmation',
    'admin.no_show_detected',
    'admin.payout_blocked',
    'admin.reliability_threshold_breached',
    'admin.standby_activation_failed',
  ].sort())

  for (const key of adminKeys) {
    assert.equal(RELIABILITY_NOTIFICATION_TEMPLATES[key].internalOnly, true)
    assert.equal(RELIABILITY_NOTIFICATION_TEMPLATES[key].recipientRole, 'admin')
  }
})

test('recipient permissions prevent cross-role template leakage', () => {
  assert.equal(canSendReliabilityNotification({
    actorRole: 'admin',
    recipientRole: 'builder',
    templateKey: 'builder.appointment_at_risk',
  }), true)
  assert.equal(canSendReliabilityNotification({
    actorRole: 'builder',
    recipientRole: 'builder',
    templateKey: 'admin.payout_blocked',
  }), false)
  assert.equal(canSendReliabilityNotification({
    actorRole: 'inspector',
    recipientRole: 'builder',
    templateKey: 'inspector.reconfirmation_4h',
  }), false)
})

test('notification draft includes subject body deep link and queued delivery status', () => {
  const draft = buildReliabilityNotificationEvent({
    templateKey: 'inspector.reconfirmation_90m',
    recipientUserId: 'inspector-1',
    recipientRole: 'inspector',
    channel: 'email',
    actorRole: 'admin',
    context: {
      jobId: 'job-1',
      assignmentId: 'assignment-1',
      confirmationId: 'confirmation-1',
    },
    scheduledFor: '2026-04-25T15:00:00.000Z',
  })

  assert.equal(draft.eventKey, 'inspector.reconfirmation_90m')
  assert.equal(draft.channel, 'email')
  assert.equal(draft.status, 'queued')
  assert.equal(draft.payload.subject, 'Final confirmation required')
  assert.match(draft.payload.deepLink, /^\/inspector\?/)
  assert.match(draft.payload.deepLink, /jobId=job-1/)
})

test('maps existing reliability system events to templates', () => {
  assert.equal(resolveReliabilityTemplateForSystemEvent({ eventKey: 'inspector.claim_commitment_accepted' }), 'inspector.claim_confirmed')
  assert.equal(resolveReliabilityTemplateForSystemEvent({ eventKey: 'builder.assignment_claimed' }), 'builder.inspector_assigned')
  assert.equal(resolveReliabilityTemplateForSystemEvent({ eventKey: 'inspector.attendance_confirmation_reminder', checkpoint: 't_4h' }), 'inspector.reconfirmation_4h')
  assert.equal(resolveReliabilityTemplateForSystemEvent({ eventType: 'CONFIRMATION_MISSED', checkpoint: 't_90m' }), 'admin.missed_90m_confirmation')
  assert.equal(resolveReliabilityTemplateForSystemEvent({ eventType: 'NO_SHOW', recipientRole: 'builder' }), 'builder.no_show_recovery')
})

test('delivery status logging model records attempted delivery state', () => {
  const update = buildNotificationDeliveryStatusUpdate({
    notificationId: 'notification-1',
    status: 'failed',
    attemptedAt: '2026-04-25T15:05:00.000Z',
    error: 'Email provider unavailable',
  })

  assert.equal(update.notificationId, 'notification-1')
  assert.equal(update.status, 'failed')
  assert.equal(update.attemptedAt, '2026-04-25T15:05:00.000Z')
  assert.equal(update.error, 'Email provider unavailable')
})

test('deep links point to role-appropriate dashboards', () => {
  assert.match(buildReliabilityDeepLink('admin.no_show_detected', { jobId: 'job-1' }), /^\/admin\/reliability\?/)
  assert.match(buildReliabilityDeepLink('builder.no_show_recovery', { jobId: 'job-1' }), /^\/builder\?/)
  assert.match(buildReliabilityDeepLink('inspector.claim_confirmed', { assignmentId: 'assignment-1' }), /^\/inspector\?/)
})
