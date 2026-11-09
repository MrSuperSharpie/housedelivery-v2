import test from 'node:test'
import assert from 'node:assert/strict'
import {
  mapDepartureStateToBuilderDisplay,
  BUILDER_ON_TRACK_HEADLINE,
  BUILDER_MONITORING_HEADLINE,
  BUILDER_MONITORING_SECONDARY,
  BUILDER_REASSIGNMENT_SUPPORT_HEADLINE,
  BUILDER_REASSIGNMENT_SUPPORT_SECONDARY,
  BUILDER_MANUAL_RECOVERY_HEADLINE,
  BUILDER_MANUAL_RECOVERY_SECONDARY,
} from './departureMonitoring'

test('on track state renders safe copy with no internal signals', () => {
  const model = mapDepartureStateToBuilderDisplay({
    monitoringStatus: 'en_route_confirmed',
    confidenceStatus: 'on_track',
    escrowProtected: true,
  })

  assert.equal(model.state, 'on_track')
  assert.equal(model.headline, BUILDER_ON_TRACK_HEADLINE)
  assert.equal(model.escrowProtected, true)
  assert.equal(model.supportCopy, undefined)
  assert.doesNotMatch(JSON.stringify(model), /confidence|score|reliability|gps|latitude|longitude/i)
})

test('monitoring state renders safe copy without departure triggers', () => {
  const model = mapDepartureStateToBuilderDisplay({
    monitoringStatus: 'monitoring',
    confidenceStatus: 'watch',
    escrowProtected: false,
  })

  assert.equal(model.state, 'monitoring')
  assert.equal(model.headline, BUILDER_MONITORING_HEADLINE)
  assert.equal(model.supportCopy, BUILDER_MONITORING_SECONDARY)
  assert.doesNotMatch(JSON.stringify(model), /confidence|score|hard.?ping|stale|gps/i)
})

test('reassignment support state renders safe copy without primary inspector detail', () => {
  const model = mapDepartureStateToBuilderDisplay({
    monitoringStatus: 'reassignment_pending',
    reassignmentInProgress: true,
    escrowProtected: true,
  })

  assert.equal(model.state, 'reassignment')
  assert.equal(model.headline, BUILDER_REASSIGNMENT_SUPPORT_HEADLINE)
  assert.equal(model.supportCopy, BUILDER_REASSIGNMENT_SUPPORT_SECONDARY)
  assert.equal(model.escrowProtected, true)
  assert.doesNotMatch(JSON.stringify(model), /penalty|restricted|tier|reliability/i)
})

test('revised ETA state surfaces official ETA without internal routing detail', () => {
  const revisedEtaAt = '2026-04-26T16:30:00.000Z'
  const model = mapDepartureStateToBuilderDisplay({
    monitoringStatus: 'en_route_confirmed',
    adminApprovedDelay: true,
    revisedEtaAt,
    escrowProtected: true,
  })

  assert.equal(model.state, 'revised_eta')
  assert.equal(model.revisedEta, revisedEtaAt)
  assert.doesNotMatch(JSON.stringify(model), /confidence|score|route|provider|haversine/i)
})

test('manual recovery state does not expose noStandbyAvailable or admin escalation reason', () => {
  const model = mapDepartureStateToBuilderDisplay({
    reassignmentInProgress: true,
    noStandbyAvailable: true,
    escrowProtected: true,
  })

  assert.equal(model.state, 'manual_recovery')
  assert.equal(model.headline, BUILDER_MANUAL_RECOVERY_HEADLINE)
  assert.equal(model.supportCopy, BUILDER_MANUAL_RECOVERY_SECONDARY)
  assert.doesNotMatch(JSON.stringify(model), /standby|no.?standby|escalat/i)
})

test('builder never sees internal reliability score or tier classification', () => {
  const modelMonitoring = mapDepartureStateToBuilderDisplay({
    monitoringStatus: 'hard_ping_required',
    hardPingRequired: true,
    escrowProtected: false,
  })
  const modelOnTrack = mapDepartureStateToBuilderDisplay({ escrowProtected: false })

  for (const model of [modelMonitoring, modelOnTrack]) {
    const raw = JSON.stringify(model)
    assert.doesNotMatch(raw, /reliabilityScore|reliabilityTier|elite|verified|restricted/i)
  }
})

test('builder never sees Protected or Avoidable penalty classification', () => {
  const model = mapDepartureStateToBuilderDisplay({
    monitoringStatus: 'reassignment_pending',
    reassignmentInProgress: true,
    escrowProtected: true,
  })
  const raw = JSON.stringify(model)

  assert.doesNotMatch(raw, /\bprotected\b.*penalty|avoidable/i)
})

test('builder does not see private inspector reason unless admin-approved external note provided', () => {
  const withoutNote = mapDepartureStateToBuilderDisplay({
    monitoringStatus: 'reassignment_pending',
    reassignmentInProgress: true,
    escrowProtected: true,
  })
  const withNote = mapDepartureStateToBuilderDisplay({
    monitoringStatus: 'reassignment_pending',
    reassignmentInProgress: true,
    escrowProtected: true,
    adminApprovedExternalNote: 'The inspector reported a vehicle issue on the way to your site.',
  })

  assert.doesNotMatch(JSON.stringify(withoutNote), /vehicle|emergency|gps|weather/i)
  assert.ok(
    withNote.supportCopy !== undefined || withNote.headline !== undefined,
    'model with admin note should still produce a valid display',
  )
})

test('null or empty input falls back to on_track without throwing', () => {
  const fromEmpty = mapDepartureStateToBuilderDisplay({})
  const fromNulls = mapDepartureStateToBuilderDisplay({
    monitoringStatus: null,
    confidenceStatus: null,
    escrowProtected: undefined,
  })

  assert.equal(fromEmpty.state, 'on_track')
  assert.equal(fromNulls.state, 'on_track')
  assert.equal(fromEmpty.escrowProtected, false)
})
