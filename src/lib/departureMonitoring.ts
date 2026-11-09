export type ArrivalConfidenceStatus =
  | 'not_monitoring'
  | 'on_track'
  | 'watch'
  | 'at_risk'
  | 'action_required'
  | 'no_longer_feasible'

export type DepartureMonitoringStatus =
  | 'not_monitoring'
  | 'pending'
  | 'monitoring'
  | 'en_route_confirmed'
  | 'hard_ping_required'
  | 'reassignment_pending'
  | 'stopped'

export type DepartureMonitoringStopReason =
  | 'arrived'
  | 'reassigned'
  | 'cancelled'
  | 'completed'
  | 'window_expired'
  | 'admin_disabled'

export type HardPingAction = 'yes_en_route' | 'need_help' | 'cannot_attend'

export type HardPingIssueReason =
  | 'vehicle_issue'
  | 'weather_road_closure'
  | 'safety_concern'
  | 'builder_access_issue'
  | 'emergency'
  | 'app_gps_issue'
  | 'other'

export interface RouteEstimateRequest {
  originLatitude: number
  originLongitude: number
  destinationLatitude: number
  destinationLongitude: number
  departureAt: string
}

export interface RouteEstimate {
  estimatedTravelSeconds: number
  distanceMeters?: number
  provider: string
  calculatedAt: string
  degraded?: boolean
  error?: string
}

export interface RoutingProvider {
  estimateTravelTime(request: RouteEstimateRequest): Promise<RouteEstimate>
}

export interface RequiredDepartureInput {
  scheduledStartAt: string
  estimatedTravelSeconds: number
}

export interface DepartureMonitoringConfig {
  monitoringLeadMinutes: number
  prepLeadMinutes: number
  hardPingDelayMinutes: number
  ripcordDelayMinutes: number
  hardPingResponseGraceMinutes: number
  lowConfidenceThreshold: number
  actionRequiredThreshold: number
  staleLocationMinutes: number
  minimumFeasibleBufferMinutes: number
}

export interface DepartureMonitoringTimeline {
  requiredDepartureAt: string
  monitoringStartsAt: string
  monitoringExpiresAt: string
  prepTriggerAt: string
  criticalTriggerAt: string
  hardPingEligibleAt: string
  ripcordEligibleAt: string
}

export interface ArrivalConfidenceInput {
  monitoringActive: boolean
  asOf: string
  scheduledStartAt: string
  requiredDepartureAt: string
  estimatedTravelSeconds: number
  lastKnownLocationAt?: string | null
  gpsAccuracyMeters?: number | null
  distanceToSiteMeters?: number | null
  previousDistanceToSiteMeters?: number | null
  routeOpenedAt?: string | null
  locationPermissionActive?: boolean
  inspectorRespondedAt?: string | null
  protectedIssueSubmitted?: boolean
  config?: Partial<DepartureMonitoringConfig>
}

export interface ArrivalConfidenceResult {
  confidenceScore: number
  confidenceStatus: ArrivalConfidenceStatus
  arrivalStillFeasible: boolean
  explanation: string
  factors: Record<string, number | boolean | string | null>
}

export interface DepartureMonitoringStateInput {
  status: DepartureMonitoringStatus
  scheduledStartAt: string
  requiredDepartureAt: string
  confidence: ArrivalConfidenceResult
  prepNotificationSentAt?: string | null
  criticalNotificationSentAt?: string | null
  hardPingSentAt?: string | null
  hardPingResponseDueAt?: string | null
  protectedIssueSubmitted?: boolean
}

export interface DepartureMonitoringActionPlan {
  nextStatus: DepartureMonitoringStatus
  sendPrepNotification: boolean
  sendCriticalNotification: boolean
  triggerHardPing: boolean
  beginReassignment: boolean
  stopMonitoring: boolean
  auditActions: string[]
}

export interface HardPingResponseInput {
  action: HardPingAction
  respondedAt: string
  recalculatedEtaSeconds?: number
  issueReason?: HardPingIssueReason
}

export interface HardPingResponseResult {
  nextStatus: DepartureMonitoringStatus
  notifyBuilder: boolean
  notifyAdmin: boolean
  beginReassignment: boolean
  reliabilityImpactAllowed: boolean
  auditAction: string
  builderCopy?: string
}

export interface BuilderDepartureMonitoringViewInput {
  appointmentStatus: ArrivalConfidenceStatus | DepartureMonitoringStatus
  escrowProtected: boolean
  supportEscalationAvailable: boolean
}

export interface BuilderDepartureMonitoringView {
  appointmentStatus: string
  explanatoryText: string
  escrowProtected: boolean
  supportEscalationAvailable: boolean
}

export const DEFAULT_DEPARTURE_MONITORING_CONFIG: DepartureMonitoringConfig = {
  monitoringLeadMinutes: 90,
  prepLeadMinutes: 15,
  hardPingDelayMinutes: 10,
  ripcordDelayMinutes: 15,
  hardPingResponseGraceMinutes: 5,
  lowConfidenceThreshold: 55,
  actionRequiredThreshold: 35,
  staleLocationMinutes: 12,
  minimumFeasibleBufferMinutes: 3,
}

export const INSPECTOR_DEPARTURE_PREP_COPY =
  'Current traffic suggests you should prepare to leave soon to arrive on time.'

export const INSPECTOR_DEPARTURE_CRITICAL_COPY =
  'To protect your scheduled arrival window, please begin your route now.'

export const INSPECTOR_HARD_PING_COPY =
  'Your departure window has passed. Are you still able to attend this inspection?'

export const BUILDER_DEPARTURE_AT_RISK_COPY =
  'Vero is monitoring your inspection appointment. If the assigned inspector becomes unavailable, we will begin reassignment support and keep your escrow protected.'

export const BUILDER_DEPARTURE_REASSIGNMENT_COPY =
  'Vero has begun reassignment support for your inspection. We are prioritizing qualified backup inspectors who match the required credential, region, and inspection stage.'

export const BUILDER_EN_ROUTE_CONFIRMED_COPY =
  'Your inspection remains scheduled. Vero is monitoring the appointment and will notify you if anything changes.'

export function calculateRequiredDepartureAt(input: RequiredDepartureInput): string {
  const scheduledStart = new Date(input.scheduledStartAt)
  return new Date(scheduledStart.getTime() - Math.max(0, input.estimatedTravelSeconds) * 1000).toISOString()
}

export function buildDepartureMonitoringTimeline(
  input: RequiredDepartureInput,
  configInput: Partial<DepartureMonitoringConfig> = {},
): DepartureMonitoringTimeline {
  const config = normalizeDepartureMonitoringConfig(configInput)
  const requiredDepartureAt = calculateRequiredDepartureAt(input)
  const requiredDepartureTime = new Date(requiredDepartureAt).getTime()

  return {
    requiredDepartureAt,
    monitoringStartsAt: new Date(requiredDepartureTime - config.monitoringLeadMinutes * 60_000).toISOString(),
    monitoringExpiresAt: new Date(new Date(input.scheduledStartAt).getTime() + 60 * 60_000).toISOString(),
    prepTriggerAt: new Date(requiredDepartureTime - config.prepLeadMinutes * 60_000).toISOString(),
    criticalTriggerAt: requiredDepartureAt,
    hardPingEligibleAt: new Date(requiredDepartureTime + config.hardPingDelayMinutes * 60_000).toISOString(),
    ripcordEligibleAt: new Date(requiredDepartureTime + config.ripcordDelayMinutes * 60_000).toISOString(),
  }
}

export async function recalculateEta(
  provider: RoutingProvider,
  request: RouteEstimateRequest,
): Promise<RouteEstimate> {
  try {
    const estimate = await provider.estimateTravelTime(request)
    return {
      ...estimate,
      estimatedTravelSeconds: Math.max(0, Math.round(estimate.estimatedTravelSeconds)),
      calculatedAt: estimate.calculatedAt || new Date().toISOString(),
    }
  } catch (error) {
    return {
      estimatedTravelSeconds: Math.max(0, Math.round(haversineDistanceMeters(
        request.originLatitude,
        request.originLongitude,
        request.destinationLatitude,
        request.destinationLongitude,
      ) / 13.4)),
      distanceMeters: haversineDistanceMeters(
        request.originLatitude,
        request.originLongitude,
        request.destinationLatitude,
        request.destinationLongitude,
      ),
      provider: 'fallback_haversine',
      calculatedAt: new Date().toISOString(),
      degraded: true,
      error: error instanceof Error ? error.message : 'Routing provider failed.',
    }
  }
}

export class StaticRoutingProvider implements RoutingProvider {
  constructor(private readonly estimate: Omit<RouteEstimate, 'calculatedAt'> & { calculatedAt?: string }) {}

  async estimateTravelTime(): Promise<RouteEstimate> {
    return {
      ...this.estimate,
      calculatedAt: this.estimate.calculatedAt ?? new Date().toISOString(),
    }
  }
}

export function calculateArrivalConfidence(input: ArrivalConfidenceInput): ArrivalConfidenceResult {
  const config = normalizeDepartureMonitoringConfig(input.config)
  if (!input.monitoringActive) {
    return {
      confidenceScore: 0,
      confidenceStatus: 'not_monitoring',
      arrivalStillFeasible: true,
      explanation: 'Departure assurance is not active for this job.',
      factors: { monitoringActive: false },
    }
  }

  const asOfTime = new Date(input.asOf).getTime()
  const scheduledStartTime = new Date(input.scheduledStartAt).getTime()
  const requiredDepartureTime = new Date(input.requiredDepartureAt).getTime()
  const locationAgeMinutes = input.lastKnownLocationAt
    ? Math.max(0, (asOfTime - new Date(input.lastKnownLocationAt).getTime()) / 60_000)
    : null
  const remainingTravelSeconds = Math.max(0, (scheduledStartTime - asOfTime) / 1000)
  const feasibleBufferSeconds = remainingTravelSeconds - input.estimatedTravelSeconds
  const arrivalStillFeasible = feasibleBufferSeconds >= -(config.minimumFeasibleBufferMinutes * 60)
  const staleLocation = locationAgeMinutes === null || locationAgeMinutes > config.staleLocationMinutes
  const distanceDecreasing = typeof input.distanceToSiteMeters === 'number'
    && typeof input.previousDistanceToSiteMeters === 'number'
    && input.distanceToSiteMeters < input.previousDistanceToSiteMeters
  const routeOpened = Boolean(input.routeOpenedAt)
  const inspectorResponded = Boolean(input.inspectorRespondedAt)
  const locationPermissionActive = input.locationPermissionActive === true
  const hasUsefulLocation = typeof input.distanceToSiteMeters === 'number' && input.distanceToSiteMeters >= 0
  const departedWindowPassed = asOfTime >= requiredDepartureTime

  let score = 45
  if (arrivalStillFeasible) score += 20
  if (hasUsefulLocation) score += 10
  if (!staleLocation) score += 10
  if (distanceDecreasing) score += 15
  if (routeOpened) score += 8
  if (locationPermissionActive) score += 8
  if (inspectorResponded) score += 8
  if ((input.gpsAccuracyMeters ?? 9999) <= 100) score += 6
  if (departedWindowPassed && !routeOpened && !distanceDecreasing) score -= 20
  if (staleLocation) score -= 15
  if (input.protectedIssueSubmitted) score = Math.max(score, 40)
  if (!arrivalStillFeasible && !input.protectedIssueSubmitted) score = Math.min(score, 20)

  const confidenceScore = clampScore(score)
  const confidenceStatus = deriveConfidenceStatus({
    confidenceScore,
    arrivalStillFeasible,
    protectedIssueSubmitted: input.protectedIssueSubmitted === true,
    lowConfidenceThreshold: config.lowConfidenceThreshold,
    actionRequiredThreshold: config.actionRequiredThreshold,
  })

  return {
    confidenceScore,
    confidenceStatus,
    arrivalStillFeasible,
    explanation: buildConfidenceExplanation(confidenceStatus, {
      staleLocation,
      distanceDecreasing,
      routeOpened,
      locationPermissionActive,
      inspectorResponded,
      arrivalStillFeasible,
    }),
    factors: {
      locationAgeMinutes: locationAgeMinutes === null ? null : Math.round(locationAgeMinutes),
      gpsAccuracyMeters: input.gpsAccuracyMeters ?? null,
      distanceToSiteMeters: input.distanceToSiteMeters ?? null,
      previousDistanceToSiteMeters: input.previousDistanceToSiteMeters ?? null,
      estimatedTravelSeconds: input.estimatedTravelSeconds,
      feasibleBufferSeconds: Math.round(feasibleBufferSeconds),
      distanceDecreasing,
      routeOpened,
      locationPermissionActive,
      inspectorResponded,
      protectedIssueSubmitted: input.protectedIssueSubmitted === true,
    },
  }
}

export function evaluateDepartureMonitoringState(
  input: DepartureMonitoringStateInput,
  asOf: string,
  configInput: Partial<DepartureMonitoringConfig> = {},
): DepartureMonitoringActionPlan {
  const config = normalizeDepartureMonitoringConfig(configInput)
  const timeline = buildDepartureMonitoringTimeline({
    scheduledStartAt: input.scheduledStartAt,
    estimatedTravelSeconds: Math.max(0, (new Date(input.scheduledStartAt).getTime() - new Date(input.requiredDepartureAt).getTime()) / 1000),
  }, config)
  const asOfTime = new Date(asOf).getTime()
  const hardPingDueTime = input.hardPingResponseDueAt
    ? new Date(input.hardPingResponseDueAt).getTime()
    : asOfTime + config.hardPingResponseGraceMinutes * 60_000
  const sendPrepNotification = !input.prepNotificationSentAt && asOfTime >= new Date(timeline.prepTriggerAt).getTime()
  const sendCriticalNotification = !input.criticalNotificationSentAt && asOfTime >= new Date(timeline.criticalTriggerAt).getTime()
  const triggerHardPing = !input.hardPingSentAt
    && asOfTime >= new Date(timeline.hardPingEligibleAt).getTime()
    && input.confidence.confidenceScore < config.lowConfidenceThreshold
  const beginReassignment = (
    input.confidence.confidenceStatus === 'no_longer_feasible'
    || (input.status === 'hard_ping_required' && asOfTime >= hardPingDueTime)
  ) && input.protectedIssueSubmitted !== true

  const auditActions: string[] = []
  if (sendPrepNotification) auditActions.push('departure_monitoring.prep_notification_due')
  if (sendCriticalNotification) auditActions.push('departure_monitoring.critical_notification_due')
  if (triggerHardPing) auditActions.push('departure_monitoring.hard_ping_required')
  if (beginReassignment) auditActions.push('departure_monitoring.reassignment_due')

  return {
    nextStatus: beginReassignment ? 'reassignment_pending' : triggerHardPing ? 'hard_ping_required' : input.status,
    sendPrepNotification,
    sendCriticalNotification,
    triggerHardPing,
    beginReassignment,
    stopMonitoring: false,
    auditActions,
  }
}

export function applyHardPingResponse(input: HardPingResponseInput): HardPingResponseResult {
  if (input.action === 'yes_en_route') {
    return {
      nextStatus: 'en_route_confirmed',
      notifyBuilder: true,
      notifyAdmin: false,
      beginReassignment: false,
      reliabilityImpactAllowed: false,
      auditAction: 'departure_monitoring.hard_ping_en_route_confirmed',
      builderCopy: BUILDER_EN_ROUTE_CONFIRMED_COPY,
    }
  }

  if (input.action === 'need_help') {
    return {
      nextStatus: 'hard_ping_required',
      notifyBuilder: false,
      notifyAdmin: true,
      beginReassignment: false,
      reliabilityImpactAllowed: false,
      auditAction: 'departure_monitoring.protected_issue_reported',
    }
  }

  return {
    nextStatus: 'reassignment_pending',
    notifyBuilder: true,
    notifyAdmin: true,
    beginReassignment: true,
    reliabilityImpactAllowed: true,
    auditAction: 'departure_monitoring.inspector_cannot_attend',
    builderCopy: BUILDER_DEPARTURE_REASSIGNMENT_COPY,
  }
}

export function shouldStopDepartureMonitoring(
  jobStatus: string,
  adminDisabled: boolean = false,
): { stop: boolean; reason?: DepartureMonitoringStopReason } {
  if (adminDisabled) return { stop: true, reason: 'admin_disabled' }
  if (jobStatus === 'arrived' || jobStatus === 'in_progress') return { stop: true, reason: 'arrived' }
  if (jobStatus === 'reassigned') return { stop: true, reason: 'reassigned' }
  if (jobStatus === 'cancelled') return { stop: true, reason: 'cancelled' }
  if (jobStatus === 'completed') return { stop: true, reason: 'completed' }
  return { stop: false }
}

export function buildBuilderDepartureMonitoringView(
  input: BuilderDepartureMonitoringViewInput,
): BuilderDepartureMonitoringView {
  const reassignment = input.appointmentStatus === 'reassignment_pending' || input.appointmentStatus === 'no_longer_feasible'
  const atRisk = input.appointmentStatus === 'at_risk'
    || input.appointmentStatus === 'action_required'
    || input.appointmentStatus === 'hard_ping_required'

  return {
    appointmentStatus: reassignment ? 'reassignment in progress' : atRisk ? 'at risk' : 'confirmed',
    explanatoryText: reassignment
      ? BUILDER_DEPARTURE_REASSIGNMENT_COPY
      : atRisk
        ? BUILDER_DEPARTURE_AT_RISK_COPY
        : 'Vero is monitoring the appointment and will notify you if anything changes.',
    escrowProtected: input.escrowProtected,
    supportEscalationAvailable: input.supportEscalationAvailable,
  }
}

export type BuilderInspectionDisplayState =
  | 'on_track'
  | 'monitoring'
  | 'reassignment'
  | 'revised_eta'
  | 'manual_recovery'

export interface BuilderInspectionDisplayInput {
  monitoringStatus?: DepartureMonitoringStatus | null
  confidenceStatus?: ArrivalConfidenceStatus | null
  hardPingRequired?: boolean
  reassignmentInProgress?: boolean
  revisedEtaAt?: string | null
  adminApprovedDelay?: boolean
  manualRecovery?: boolean
  noStandbyAvailable?: boolean
  adminEscalated?: boolean
  escrowProtected?: boolean
  adminApprovedExternalNote?: string | null
}

export interface BuilderInspectionDisplayModel {
  state: BuilderInspectionDisplayState
  headline: string
  supportCopy?: string
  revisedEta?: string
  escrowProtected: boolean
}

export const BUILDER_ON_TRACK_HEADLINE = 'Your inspection is on track.'
export const BUILDER_MONITORING_HEADLINE = "Vero is actively monitoring the inspector's arrival."
export const BUILDER_MONITORING_SECONDARY = 'We will notify you if reassignment support is needed.'
export const BUILDER_REASSIGNMENT_SUPPORT_HEADLINE = 'Vero has initiated reassignment support to protect your schedule.'
export const BUILDER_REASSIGNMENT_SUPPORT_SECONDARY = 'We are dispatching a qualified backup inspector.'
export const BUILDER_MANUAL_RECOVERY_HEADLINE = 'Vero is actively resolving your inspection appointment.'
export const BUILDER_MANUAL_RECOVERY_SECONDARY = 'We will update you as soon as the next step is confirmed.'

export function mapDepartureStateToBuilderDisplay(input: BuilderInspectionDisplayInput): BuilderInspectionDisplayModel {
  const escrowProtected = input.escrowProtected ?? false

  if (input.manualRecovery || input.adminEscalated || (input.noStandbyAvailable && input.reassignmentInProgress)) {
    return {
      state: 'manual_recovery',
      headline: BUILDER_MANUAL_RECOVERY_HEADLINE,
      supportCopy: BUILDER_MANUAL_RECOVERY_SECONDARY,
      escrowProtected,
    }
  }

  if (input.reassignmentInProgress || input.monitoringStatus === 'reassignment_pending') {
    return {
      state: 'reassignment',
      headline: BUILDER_REASSIGNMENT_SUPPORT_HEADLINE,
      supportCopy: BUILDER_REASSIGNMENT_SUPPORT_SECONDARY,
      escrowProtected,
    }
  }

  if (input.revisedEtaAt && (input.adminApprovedDelay || input.monitoringStatus === 'en_route_confirmed')) {
    return {
      state: 'revised_eta',
      headline: 'The inspector has confirmed a revised arrival time.',
      revisedEta: input.revisedEtaAt,
      escrowProtected,
    }
  }

  if (
    input.hardPingRequired
    || input.monitoringStatus === 'hard_ping_required'
    || input.confidenceStatus === 'at_risk'
    || input.confidenceStatus === 'action_required'
    || input.confidenceStatus === 'watch'
    || input.monitoringStatus === 'monitoring'
    || input.monitoringStatus === 'pending'
  ) {
    return {
      state: 'monitoring',
      headline: BUILDER_MONITORING_HEADLINE,
      supportCopy: BUILDER_MONITORING_SECONDARY,
      escrowProtected,
    }
  }

  return {
    state: 'on_track',
    headline: BUILDER_ON_TRACK_HEADLINE,
    escrowProtected,
  }
}

export function normalizeDepartureMonitoringConfig(
  input: Partial<DepartureMonitoringConfig> | null | undefined = {},
): DepartureMonitoringConfig {
  return {
    ...DEFAULT_DEPARTURE_MONITORING_CONFIG,
    ...Object.fromEntries(
      Object.entries(input ?? {}).filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0),
    ),
  }
}

function deriveConfidenceStatus(input: {
  confidenceScore: number
  arrivalStillFeasible: boolean
  protectedIssueSubmitted: boolean
  lowConfidenceThreshold: number
  actionRequiredThreshold: number
}): ArrivalConfidenceStatus {
  if (!input.arrivalStillFeasible && !input.protectedIssueSubmitted) return 'no_longer_feasible'
  if (input.confidenceScore < input.actionRequiredThreshold) return 'action_required'
  if (input.confidenceScore < input.lowConfidenceThreshold) return 'at_risk'
  if (input.confidenceScore < 75) return 'watch'
  return 'on_track'
}

function buildConfidenceExplanation(
  status: ArrivalConfidenceStatus,
  factors: {
    staleLocation: boolean
    distanceDecreasing: boolean
    routeOpened: boolean
    locationPermissionActive: boolean
    inspectorResponded: boolean
    arrivalStillFeasible: boolean
  },
): string {
  if (status === 'no_longer_feasible') return 'Current ETA indicates arrival by the scheduled start is no longer feasible without protected context or Admin intervention.'
  if (status === 'action_required') return 'Departure assurance needs inspector response before Vero can keep confidence in the appointment window.'
  if (status === 'at_risk') return 'Arrival confidence is low based on ETA, location freshness, route status, and inspector response signals.'
  if (status === 'watch') return 'Vero is monitoring live travel signals and will escalate only if arrival confidence drops.'
  if (factors.distanceDecreasing || factors.routeOpened || factors.inspectorResponded) return 'Travel signals indicate the inspector is progressing toward the site.'
  if (factors.staleLocation || !factors.locationPermissionActive) return 'Monitoring is active, but location signals are limited; fallback confirmation remains available.'
  return 'Inspector travel signals are currently on track.'
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score)))
}

function haversineDistanceMeters(
  originLatitude: number,
  originLongitude: number,
  destinationLatitude: number,
  destinationLongitude: number,
): number {
  const earthRadiusMeters = 6371000
  const latitudeDelta = toRadians(destinationLatitude - originLatitude)
  const longitudeDelta = toRadians(destinationLongitude - originLongitude)
  const originLatitudeRadians = toRadians(originLatitude)
  const destinationLatitudeRadians = toRadians(destinationLatitude)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(originLatitudeRadians)
    * Math.cos(destinationLatitudeRadians)
    * Math.sin(longitudeDelta / 2) ** 2

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180
}
