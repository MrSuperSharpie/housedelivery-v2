import type { HardPingIssueReason } from '@/lib/hardPingTypes'

export const HARD_PING_COPY = {
  title: 'Your departure window has passed. Are you still able to attend this inspection?',
  support: 'Vero needs your response now so we can protect the builder’s schedule and avoid unnecessary reassignment.',
  enRouteSuccess: 'Thanks. Vero will update your ETA and continue monitoring your arrival.',
  helpQuestion: 'What is preventing you from departing on time?',
  helpDetailsLabel: 'Add details for Vero Admin',
  helpSuccess: 'Your issue has been sent to Vero Admin. We will review before taking further action.',
  cannotAttendTitle: 'Confirm you cannot attend',
  cannotAttendBody:
    'If you cannot attend, Vero will begin reassignment support to protect the builder’s schedule. This may be reviewed under Vero’s reliability policy.',
  cannotAttendSuccess: 'Vero has begun reassignment support. Thank you for confirming quickly.',
  offline: 'Waiting for network. Keep this screen open and try again when your connection returns.',
  stale: 'This prompt is no longer active. Vero is refreshing your assignment state.',
  genericError: 'We could not send your response. Please check your connection and try again.',
} as const

export const HARD_PING_REASON_LABELS: Record<HardPingIssueReason, string> = {
  vehicle_issue: 'Vehicle issue',
  weather_road_closure: 'Weather / road closure',
  safety_concern: 'Safety concern',
  builder_access_issue: 'Builder access issue',
  emergency: 'Emergency',
  app_gps_issue: 'App / GPS issue',
  other: 'Other',
}

export const HARD_PING_REASON_OPTIONS = Object.entries(HARD_PING_REASON_LABELS).map(([value, label]) => ({
  value: value as HardPingIssueReason,
  label,
}))

