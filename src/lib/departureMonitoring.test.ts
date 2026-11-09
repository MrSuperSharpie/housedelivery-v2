import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { NextRequest } from 'next/server'

import {
  applyHardPingResponse,
  buildBuilderDepartureMonitoringView,
  buildDepartureMonitoringTimeline,
  calculateArrivalConfidence,
  calculateRequiredDepartureAt,
  evaluateDepartureMonitoringState,
  recalculateEta,
  shouldStopDepartureMonitoring,
  StaticRoutingProvider,
} from './departureMonitoring'
import { selectStandbyInspectorCandidates } from './reliability'
import { GET, isAuthorizedDepartureCronRequest } from '../app/api/cron/departure-monitor/route'

const DEPARTURE_MIGRATION = 'supabase/migrations/20260425090000_departure_monitoring.sql'

test('required departure time calculation subtracts ETA from scheduled start in UTC', () => {
  assert.equal(
    calculateRequiredDepartureAt({
      scheduledStartAt: '2026-04-26T16:00:00.000Z',
      estimatedTravelSeconds: 2700,
    }),
    '2026-04-26T15:15:00.000Z',
  )
})

test('ETA recalculation uses provider-neutral routing abstraction', async () => {
  const estimate = await recalculateEta(
    new StaticRoutingProvider({
      estimatedTravelSeconds: 1800,
      distanceMeters: 12500,
      provider: 'test_provider',
    }),
    {
      originLatitude: 49.2827,
      originLongitude: -123.1207,
      destinationLatitude: 49.2463,
      destinationLongitude: -123.1162,
      departureAt: '2026-04-26T15:15:00.000Z',
    },
  )

  assert.equal(estimate.estimatedTravelSeconds, 1800)
  assert.equal(estimate.provider, 'test_provider')
})

test('prep notification is due once before required departure', () => {
  const timeline = buildDepartureMonitoringTimeline({
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    estimatedTravelSeconds: 2700,
  })
  const confidence = calculateArrivalConfidence({
    monitoringActive: true,
    asOf: timeline.prepTriggerAt,
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    requiredDepartureAt: timeline.requiredDepartureAt,
    estimatedTravelSeconds: 2700,
    lastKnownLocationAt: '2026-04-26T14:58:00.000Z',
    distanceToSiteMeters: 12000,
    previousDistanceToSiteMeters: 14000,
    routeOpenedAt: '2026-04-26T14:55:00.000Z',
    locationPermissionActive: true,
  })
  const firstRun = evaluateDepartureMonitoringState({
    status: 'monitoring',
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    requiredDepartureAt: timeline.requiredDepartureAt,
    confidence,
  }, timeline.prepTriggerAt)
  const secondRun = evaluateDepartureMonitoringState({
    status: 'monitoring',
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    requiredDepartureAt: timeline.requiredDepartureAt,
    confidence,
    prepNotificationSentAt: timeline.prepTriggerAt,
  }, timeline.prepTriggerAt)
  const migration = readFileSync(DEPARTURE_MIGRATION, 'utf8')

  assert.equal(firstRun.sendPrepNotification, true)
  assert.equal(secondRun.sendPrepNotification, false)
  assert.match(migration, /departure-prep:/)
  assert.match(migration, /on conflict \(dedupe_key\) do nothing/)
})

test('critical notification is due once at required departure', () => {
  const timeline = buildDepartureMonitoringTimeline({
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    estimatedTravelSeconds: 2700,
  })
  const confidence = calculateArrivalConfidence({
    monitoringActive: true,
    asOf: timeline.criticalTriggerAt,
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    requiredDepartureAt: timeline.requiredDepartureAt,
    estimatedTravelSeconds: 2700,
    routeOpenedAt: '2026-04-26T15:10:00.000Z',
    locationPermissionActive: true,
    inspectorRespondedAt: '2026-04-26T15:12:00.000Z',
  })
  const firstRun = evaluateDepartureMonitoringState({
    status: 'monitoring',
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    requiredDepartureAt: timeline.requiredDepartureAt,
    confidence,
  }, timeline.criticalTriggerAt)
  const secondRun = evaluateDepartureMonitoringState({
    status: 'monitoring',
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    requiredDepartureAt: timeline.requiredDepartureAt,
    confidence,
    criticalNotificationSentAt: timeline.criticalTriggerAt,
  }, timeline.criticalTriggerAt)

  assert.equal(firstRun.sendCriticalNotification, true)
  assert.equal(secondRun.sendCriticalNotification, false)
})

test('hard ping triggers only when departure is late and arrival confidence is low', () => {
  const timeline = buildDepartureMonitoringTimeline({
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    estimatedTravelSeconds: 2700,
  })
  const lowConfidence = calculateArrivalConfidence({
    monitoringActive: true,
    asOf: timeline.hardPingEligibleAt,
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    requiredDepartureAt: timeline.requiredDepartureAt,
    estimatedTravelSeconds: 2700,
    lastKnownLocationAt: '2026-04-26T14:30:00.000Z',
    distanceToSiteMeters: 30000,
    previousDistanceToSiteMeters: 29000,
    locationPermissionActive: false,
  })
  const highConfidence = calculateArrivalConfidence({
    monitoringActive: true,
    asOf: '2026-04-26T15:25:00.000Z',
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    requiredDepartureAt: '2026-04-26T15:00:00.000Z',
    estimatedTravelSeconds: 900,
    lastKnownLocationAt: '2026-04-26T15:24:00.000Z',
    distanceToSiteMeters: 6000,
    previousDistanceToSiteMeters: 12000,
    routeOpenedAt: '2026-04-26T15:15:00.000Z',
    locationPermissionActive: true,
    inspectorRespondedAt: '2026-04-26T15:16:00.000Z',
  })

  assert.equal(evaluateDepartureMonitoringState({
    status: 'monitoring',
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    requiredDepartureAt: timeline.requiredDepartureAt,
    confidence: lowConfidence,
  }, timeline.hardPingEligibleAt).triggerHardPing, true)
  assert.equal(evaluateDepartureMonitoringState({
    status: 'monitoring',
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    requiredDepartureAt: '2026-04-26T15:00:00.000Z',
    confidence: highConfidence,
  }, timeline.hardPingEligibleAt).triggerHardPing, false)
})

test('stale GPS alone does not automatically penalize or reassign', () => {
  const timeline = buildDepartureMonitoringTimeline({
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    estimatedTravelSeconds: 900,
  })
  const confidence = calculateArrivalConfidence({
    monitoringActive: true,
    asOf: '2026-04-26T15:20:00.000Z',
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    requiredDepartureAt: timeline.requiredDepartureAt,
    estimatedTravelSeconds: 900,
    lastKnownLocationAt: '2026-04-26T14:55:00.000Z',
    distanceToSiteMeters: 5000,
    routeOpenedAt: '2026-04-26T15:05:00.000Z',
    locationPermissionActive: false,
  })
  const plan = evaluateDepartureMonitoringState({
    status: 'monitoring',
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    requiredDepartureAt: timeline.requiredDepartureAt,
    confidence,
  }, '2026-04-26T15:20:00.000Z')

  assert.notEqual(confidence.confidenceStatus, 'no_longer_feasible')
  assert.equal(plan.beginReassignment, false)
})

test('hard ping Yes response confirms en route and notifies builder without penalty', () => {
  const response = applyHardPingResponse({
    action: 'yes_en_route',
    respondedAt: '2026-04-26T15:28:00.000Z',
    recalculatedEtaSeconds: 1500,
  })

  assert.equal(response.nextStatus, 'en_route_confirmed')
  assert.equal(response.notifyBuilder, true)
  assert.equal(response.reliabilityImpactAllowed, false)
})

test('hard ping need-help creates admin review path without automatic penalty', () => {
  const response = applyHardPingResponse({
    action: 'need_help',
    issueReason: 'app_gps_issue',
    respondedAt: '2026-04-26T15:28:00.000Z',
  })
  const migration = readFileSync(DEPARTURE_MIGRATION, 'utf8')

  assert.equal(response.notifyAdmin, true)
  assert.equal(response.beginReassignment, false)
  assert.equal(response.reliabilityImpactAllowed, false)
  assert.match(migration, /admin\.departure_help_requested/)
})

test('hard ping cannot-attend begins reassignment support', () => {
  const response = applyHardPingResponse({
    action: 'cannot_attend',
    respondedAt: '2026-04-26T15:28:00.000Z',
  })

  assert.equal(response.nextStatus, 'reassignment_pending')
  assert.equal(response.beginReassignment, true)
  assert.equal(response.notifyBuilder, true)
})

test('no response after hard-ping grace begins reassignment', () => {
  const timeline = buildDepartureMonitoringTimeline({
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    estimatedTravelSeconds: 2700,
  })
  const confidence = calculateArrivalConfidence({
    monitoringActive: true,
    asOf: '2026-04-26T15:40:00.000Z',
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    requiredDepartureAt: timeline.requiredDepartureAt,
    estimatedTravelSeconds: 2700,
    distanceToSiteMeters: 40000,
    previousDistanceToSiteMeters: 40000,
  })
  const plan = evaluateDepartureMonitoringState({
    status: 'hard_ping_required',
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    requiredDepartureAt: timeline.requiredDepartureAt,
    confidence,
    hardPingSentAt: '2026-04-26T15:25:00.000Z',
    hardPingResponseDueAt: '2026-04-26T15:30:00.000Z',
  }, '2026-04-26T15:40:00.000Z')

  assert.equal(plan.beginReassignment, true)
})

test('reassignment transaction is atomic and guarded against duplicate reassignment', () => {
  const migration = readFileSync(DEPARTURE_MIGRATION, 'utf8')

  assert.match(migration, /create or replace function public\.atomic_departure_reassign_to_standby/)
  assert.match(migration, /for update/)
  assert.match(migration, /Job already has a confirmed replacement assignment/)
  assert.match(migration, /Accepted standby invite required for atomic reassignment/)
})

test('duplicate cron runs cannot double-notify or double-reassign', () => {
  const migration = readFileSync(DEPARTURE_MIGRATION, 'utf8')

  assert.match(migration, /idx_notification_events_dedupe_key/)
  assert.match(migration, /on conflict \(dedupe_key\) do nothing/)
  assert.match(migration, /for update of s skip locked/)
  assert.match(migration, /status <> 'reassignment_pending'/)
})

test('standby inspector eligibility excludes restricted inspectors and ranks higher-tier inspectors first', () => {
  const candidates = selectStandbyInspectorCandidates({
    jobId: 'job-1',
    primaryInspectorId: 'primary',
    permitFamily: 'building',
    requiredDiscipline: 'structural',
    region: 'vancouver',
    stageName: 'Framing',
  }, [
    {
      inspectorId: 'restricted',
      onboardingStatus: 'approved',
      disciplines: ['structural'],
      regions: ['vancouver'],
      permitFamilies: ['building'],
      stageEligibility: ['Framing'],
      reliabilityTier: 'restricted',
      reliabilityScore: 99,
      available: true,
    },
    {
      inspectorId: 'elite',
      onboardingStatus: 'approved',
      disciplines: ['structural'],
      regions: ['vancouver'],
      permitFamilies: ['building'],
      stageEligibility: ['Framing'],
      reliabilityTier: 'elite',
      reliabilityScore: 90,
      available: true,
    },
    {
      inspectorId: 'verified',
      onboardingStatus: 'approved',
      disciplines: ['structural'],
      regions: ['vancouver'],
      permitFamilies: ['building'],
      stageEligibility: ['Framing'],
      reliabilityTier: 'verified',
      reliabilityScore: 95,
      available: true,
    },
  ])

  assert.deepEqual(candidates.map(candidate => candidate.inspectorId), ['elite', 'verified'])
})

test('builder departure view hides internal coordinates, reliability score, and penalties', () => {
  const view = buildBuilderDepartureMonitoringView({
    appointmentStatus: 'action_required',
    escrowProtected: true,
    supportEscalationAvailable: true,
  })

  assert.equal(view.appointmentStatus, 'at risk')
  assert.equal(view.escrowProtected, true)
  assert.doesNotMatch(JSON.stringify(view), /latitude|longitude|reserve|penalty|reliabilityScore/i)
})

test('monitoring stops after arrival, reassignment, cancellation, or completion', () => {
  assert.deepEqual(shouldStopDepartureMonitoring('arrived'), { stop: true, reason: 'arrived' })
  assert.deepEqual(shouldStopDepartureMonitoring('reassigned'), { stop: true, reason: 'reassigned' })
  assert.deepEqual(shouldStopDepartureMonitoring('cancelled'), { stop: true, reason: 'cancelled' })
  assert.deepEqual(shouldStopDepartureMonitoring('completed'), { stop: true, reason: 'completed' })
  assert.deepEqual(shouldStopDepartureMonitoring('scheduled'), { stop: false })
})

test('departure monitor cron rejects unauthorized calls', async () => {
  const previousSecret = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'test-cron-secret'

  try {
    const unauthorizedRequest = new NextRequest('https://veropermit.test/api/cron/departure-monitor')
    const authorizedRequest = new NextRequest('https://veropermit.test/api/cron/departure-monitor', {
      headers: { authorization: 'Bearer test-cron-secret' },
    })
    const response = await GET(unauthorizedRequest)

    assert.equal(isAuthorizedDepartureCronRequest(unauthorizedRequest), false)
    assert.equal(isAuthorizedDepartureCronRequest(authorizedRequest), true)
    assert.equal(response.status, 401)
  } finally {
    if (previousSecret === undefined) {
      delete process.env.CRON_SECRET
    } else {
      process.env.CRON_SECRET = previousSecret
    }
  }
})
