import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  buildAttendanceConfirmationLadder,
  buildAttendanceReschedulePlan,
  calculateInspectorReliability,
  evaluateArrivalCheckIn,
  evaluateCancellationPolicy,
  evaluateInspectionPayout,
  evaluatePreInspectionCredentialContinuity,
} from './reliability'

const ATTENDANCE_MIGRATION = 'supabase/migrations/20260425020000_job_attendance_confirmations.sql'
const CANCELLATION_MIGRATION = 'supabase/migrations/20260425030000_structured_cancellation_no_show_policy.sql'
const STANDBY_MIGRATION = 'supabase/migrations/20260425040000_standby_inspector_reassignment.sql'

test('edge: inspector credential expiry before inspection blocks departure or arrival', () => {
  const continuity = evaluatePreInspectionCredentialContinuity({
    credentialComplianceStatus: 'expired',
    checkedAt: '2026-04-26T15:30:00.000Z',
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
  })
  const reliability = calculateInspectorReliability({
    asOf: '2026-04-26T15:30:00.000Z',
    credentialComplianceStatus: 'expired',
    events: [],
  })
  const migration = readFileSync(ATTENDANCE_MIGRATION, 'utf8')

  assert.equal(continuity.canProceed, false)
  assert.equal(continuity.requiresAdminReview, true)
  assert.equal(continuity.action, 'block_departure_or_arrival')
  assert.equal(reliability.credentialComplianceStatus, 'expired')
  assert.match(migration, /Credential authority must be current before departure or arrival check-in/)
})

test('edge: inspector network loss during arrival queues audit-safe check-in evidence', () => {
  const arrival = evaluateArrivalCheckIn({
    arrivedAt: '2026-04-26T15:55:00.000Z',
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    latitude: 49.2827,
    longitude: -123.1207,
    siteLatitude: 49.2828,
    siteLongitude: -123.1208,
    networkAvailable: false,
  })

  assert.equal(arrival.jobStatus, 'in_progress')
  assert.equal(arrival.syncStatus, 'queued_for_sync')
  assert.equal(arrival.evidenceRequired, true)
  assert.equal(arrival.reliabilityEvents[0]?.metadata?.offlineQueued, true)
})

test('edge: rescheduling regenerates confirmation timing and cancels old pending checkpoints', () => {
  const original = buildAttendanceConfirmationLadder({
    claimedAt: '2026-04-25T08:00:00.000Z',
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
  }).map((confirmation, index) => ({ ...confirmation, id: `confirmation-${index}` }))
  const plan = buildAttendanceReschedulePlan({
    confirmations: original,
    newScheduledStartAt: '2026-04-27T18:00:00.000Z',
    rescheduledAt: '2026-04-25T12:00:00.000Z',
  })
  const t4h = plan.replacementConfirmations.find(confirmation => confirmation.checkpoint === 't_4h')
  const migration = readFileSync(ATTENDANCE_MIGRATION, 'utf8')

  assert.ok(plan.cancelledConfirmationIds.includes('confirmation-2'))
  assert.equal(t4h?.requiredAt, '2026-04-27T14:00:00.000Z')
  assert.match(migration, /handle_attendance_confirmation_schedule_guard/)
  assert.match(migration, /rescheduledFrom/)
})

test('edge: builder cancellation after departure protects inspector payout path', () => {
  const payout = evaluateInspectionPayout({
    outcome: 'hold',
    documentedProfessionalWork: true,
    evidenceComplete: true,
    builderCancelledAfterDeparture: true,
    grossPayoutAmount: 500,
    inspectorTier: 'preferred',
    policyConfig: {
      enforcementMode: 'full_enforcement',
      builderSiteNotReadyFeeAmount: 75,
    },
    asOf: '2026-04-26T16:30:00.000Z',
  })

  assert.equal(payout.payoutStatus, 'eligible')
  assert.equal(payout.inspectorProtected, true)
  assert.equal(payout.blockReason, 'builder_cancelled_after_departure_protected')
  assert.equal(payout.builderCreditHook?.status, 'pending_admin_review')
})

test('edge: concurrent standby acceptance is guarded by row locks and a post-lock recheck', () => {
  const migration = readFileSync(STANDBY_MIGRATION, 'utf8')

  assert.match(migration, /where id = p_standby_invite_id\s+for update/)
  assert.match(migration, /where id = v_invite\.original_assignment_id\s+for update/)
  assert.match(migration, /acceptance_lost_concurrency_race/)
  assert.match(migration, /Another standby inspector already accepted this offer/)
})

test('edge: dispute opened after payout release creates review without pretending funds are blocked', () => {
  const payout = evaluateInspectionPayout({
    outcome: 'pass',
    documentedProfessionalWork: true,
    evidenceComplete: true,
    hasActiveDispute: true,
    payoutAlreadyReleasedAt: '2026-04-26T20:00:00.000Z',
    grossPayoutAmount: 500,
    inspectorTier: 'priority',
    policyConfig: { enforcementMode: 'full_enforcement' },
    asOf: '2026-04-27T12:00:00.000Z',
  })

  assert.equal(payout.payoutStatus, 'review')
  assert.equal(payout.blockReason, 'post_release_dispute')
  assert.ok(payout.auditEvents.includes('payout.post_release_dispute_review'))
})

test('edge: enforcement mode change during active job changes projections without retroactive money movement in observe-only', () => {
  const observeOnly = evaluateInspectionPayout({
    outcome: 'pass',
    documentedProfessionalWork: true,
    evidenceComplete: true,
    grossPayoutAmount: 500,
    inspectorTier: 'verified',
    policyConfig: {
      enforcementMode: 'observe_only',
      reserveHooksEnabled: true,
      tierReservePercents: { verified: 10 },
    },
    asOf: '2026-04-26T18:00:00.000Z',
  })
  const fullEnforcement = evaluateInspectionPayout({
    outcome: 'pass',
    documentedProfessionalWork: true,
    evidenceComplete: true,
    grossPayoutAmount: 500,
    inspectorTier: 'verified',
    policyConfig: {
      enforcementMode: 'full_enforcement',
      reserveHooksEnabled: true,
      tierReservePercents: { verified: 10 },
    },
    asOf: '2026-04-26T18:00:00.000Z',
  })

  assert.equal(observeOnly.consequencesEnforced, false)
  assert.equal(observeOnly.reserveLedgerEntries[0]?.entryType, 'observe_only_projection')
  assert.equal(fullEnforcement.reserveLedgerEntries[0]?.entryType, 'reserve_hold')
})

test('edge: inspector appeal remains available after a reliability-impacting consequence', () => {
  const cancellation = evaluateCancellationPolicy({
    reasonCode: 'changed_mind',
    explanation: 'Cannot attend now.',
    requestedAt: '2026-04-26T14:45:00.000Z',
    scheduledStartAt: '2026-04-26T16:00:00.000Z',
    protectedWindowMinutes: 240,
  })
  const migration = readFileSync(CANCELLATION_MIGRATION, 'utf8')

  assert.equal(cancellation.preliminaryClassification, 'likely_invalid')
  assert.equal(cancellation.appealAvailable, true)
  assert.match(migration, /submit_cancellation_appeal/)
  assert.match(migration, /admin\.cancellation_appeal_submitted/)
})

test('edge: daylight-saving boundaries use absolute appointment instants for checkpoint math', () => {
  const ladder = buildAttendanceConfirmationLadder({
    claimedAt: '2026-03-07T12:00:00.000Z',
    scheduledStartAt: '2026-03-08T10:00:00-07:00',
  })
  const start = new Date('2026-03-08T10:00:00-07:00').getTime()
  const t24 = new Date(ladder.find(confirmation => confirmation.checkpoint === 't_24h')?.requiredAt ?? '').getTime()
  const t90 = new Date(ladder.find(confirmation => confirmation.checkpoint === 't_90m')?.requiredAt ?? '').getTime()

  assert.equal(start - t24, 24 * 60 * 60_000)
  assert.equal(start - t90, 90 * 60_000)
})

test('edge: cancelled or rescheduled jobs do not keep live scheduled reminder/no-show paths', () => {
  const attendanceMigration = readFileSync(ATTENDANCE_MIGRATION, 'utf8')
  const cancellationMigration = readFileSync(CANCELLATION_MIGRATION, 'utf8')

  assert.match(attendanceMigration, /status = 'skipped'/)
  assert.match(attendanceMigration, /appointment is no longer active/)
  assert.match(attendanceMigration, /ia\.scheduled_start_at is not distinct from job_attendance_confirmations\.scheduled_start_at/)
  assert.match(cancellationMigration, /No-show cannot be recorded before the active appointment grace window has elapsed/)
  assert.match(cancellationMigration, /No-show cannot be recorded for a non-active appointment/)
})
