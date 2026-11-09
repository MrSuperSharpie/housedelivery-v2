import assert from 'node:assert/strict'
import test from 'node:test'
import {
  deriveDepartureTicketState,
  deriveDepartureActionCue,
  deriveDepartureResolutionCue,
  deriveRiskLevel,
  hasPrivatePenaltyLeak,
  isActiveDepartureAssignmentStatus,
  isTerminalDepartureJobStatus,
  sortDepartureInterventionTickets,
  validateDepartureResolution,
  resolutionStatusForAction,
  type DepartureInterventionTicket,
} from './adminDepartureTriage'
import { isAdminLikeRole } from './adminAccess'

const now = new Date('2026-04-25T18:00:00.000Z')

function ticket(overrides: Partial<DepartureInterventionTicket>): DepartureInterventionTicket {
  return {
    id: 'ticket-base',
    jobId: 'job-base',
    assignmentId: 'assignment-base',
    inspectorId: 'inspector-base',
    builderId: 'builder-base',
    state: 'hard_ping_required',
    riskLevel: 'Monitoring',
    scheduledStartAt: '2026-04-25T19:00:00.000Z',
    requiredDepartureAt: '2026-04-25T17:30:00.000Z',
    responseTimestamp: null,
    currentEtaSeconds: 1800,
    etaGapMinutes: -30,
    projectName: 'Base Project',
    inspectionType: 'framing',
    siteAddress: '100 Main St, Vancouver',
    inspectorName: 'Inspector One',
    builderName: 'Builder One',
    reasonCategory: 'pending',
    reasonLabel: 'Awaiting response',
    standbyStatus: 'Standby identified',
    standbyCandidates: [{
      id: 'standby-1',
      inspectorId: 'inspector-standby',
      inspectorName: 'Standby One',
      rank: 1,
      status: 'offered',
      credentialMatch: true,
      regionMatch: true,
    }],
    builderNotificationStatus: 'queued',
    escrowProtected: true,
    lastMonitoringStatus: 'action_required',
    auditTimeline: [],
    ...overrides,
  }
}

test('non-admin roles are not authorized for intervention access', () => {
  assert.equal(isAdminLikeRole('admin'), true)
  assert.equal(isAdminLikeRole('super_admin'), true)
  assert.equal(isAdminLikeRole('builder'), false)
  assert.equal(isAdminLikeRole('inspector'), false)
})

test('ticket state derives needs_help and no_response safely', () => {
  assert.equal(deriveDepartureTicketState({
    status: 'hard_ping_required',
    hardPingResponse: 'need_help',
    protectedIssueSubmitted: true,
  }, now), 'needs_help')

  assert.equal(deriveDepartureTicketState({
    status: 'hard_ping_required',
    hardPingResponseDueAt: '2026-04-25T17:55:00.000Z',
  }, now), 'no_response')
})

test('queue sorting prioritizes overdue no-standby and no-response tickets', () => {
  const normal = ticket({ id: 'normal', scheduledStartAt: '2026-04-25T20:00:00.000Z', riskLevel: 'Monitoring' })
  const noResponse = ticket({ id: 'no-response', state: 'no_response', riskLevel: 'Critical', scheduledStartAt: '2026-04-25T19:30:00.000Z' })
  const overdueNoStandby = ticket({
    id: 'overdue-no-standby',
    scheduledStartAt: '2026-04-25T17:45:00.000Z',
    standbyCandidates: [],
    standbyStatus: 'No standby identified',
    riskLevel: 'Critical',
  })

  const sorted = sortDepartureInterventionTickets([normal, noResponse, overdueNoStandby], now)
  assert.deepEqual(sorted.map(item => item.id), ['overdue-no-standby', 'no-response', 'normal'])
})

test('risk level escalates for no standby, no response, and manual recovery', () => {
  assert.equal(deriveRiskLevel(ticket({ standbyCandidates: [] }), now), 'Critical')
  assert.equal(deriveRiskLevel(ticket({ state: 'no_response' }), now), 'Critical')
  assert.equal(deriveRiskLevel(ticket({ state: 'manual_recovery_required' }), now), 'Manual Recovery')
})

test('action cue gives Admin a direct next move', () => {
  assert.deepEqual(
    deriveDepartureActionCue(ticket({ state: 'no_response' })),
    { label: 'Reassign now', tone: 'Critical' },
  )
  assert.deepEqual(
    deriveDepartureActionCue(ticket({ standbyCandidates: [] })),
    { label: 'Manual recovery', tone: 'Manual Recovery' },
  )
  assert.deepEqual(
    deriveDepartureActionCue(ticket({ state: 'needs_help' })),
    { label: 'Review issue', tone: 'At Risk' },
  )
})

test('resolution cue labels support optimistic action feedback', () => {
  assert.equal(resolutionStatusForAction('protected_reassign'), 'reassigned')
  assert.equal(resolutionStatusForAction('impact_reassign'), 'reassigned')
  assert.equal(resolutionStatusForAction('keep_assigned_delay'), 'resolved')
  assert.equal(resolutionStatusForAction('manual_recovery'), 'manual_recovery')
  assert.deepEqual(deriveDepartureResolutionCue('resolving'), { label: 'Resolving', tone: 'Monitoring' })
  assert.deepEqual(deriveDepartureResolutionCue('manual_recovery'), { label: 'Manual recovery', tone: 'Manual Recovery' })
})

test('active assignment and terminal job guards protect stale triage tickets', () => {
  assert.equal(isActiveDepartureAssignmentStatus('confirmed'), true)
  assert.equal(isActiveDepartureAssignmentStatus('cancelled'), false)
  assert.equal(isActiveDepartureAssignmentStatus('completed'), false)
  assert.equal(isTerminalDepartureJobStatus('cancelled'), true)
  assert.equal(isTerminalDepartureJobStatus('completed'), true)
  assert.equal(isTerminalDepartureJobStatus('live'), false)
})

test('Reliability Impact requires confirmation and Admin note', () => {
  assert.equal(
    validateDepartureResolution({ action: 'impact_reassign', confirmationAccepted: false, adminNote: '' }),
    'Admin confirmation is required for Reliability Impact.',
  )
  assert.equal(
    validateDepartureResolution({ action: 'impact_reassign', confirmationAccepted: true, adminNote: '' }),
    'Admin note is required for Reliability Impact.',
  )
  assert.equal(
    validateDepartureResolution({ action: 'impact_reassign', confirmationAccepted: true, adminNote: 'Unreachable after phone attempt.' }),
    null,
  )
})

test('Keep Assigned requires revised ETA and builder contact method', () => {
  assert.equal(validateDepartureResolution({ action: 'keep_assigned_delay' }), 'Revised ETA is required.')
  assert.equal(
    validateDepartureResolution({ action: 'keep_assigned_delay', revisedEta: '2026-04-25T19:15' }),
    'Builder contact method is required.',
  )
})

test('Manual Recovery does not classify as protected or avoidable', () => {
  assert.equal(
    validateDepartureResolution({ action: 'manual_recovery', escalationReason: 'No standby available', adminNote: 'Builder needs phone call.' }),
    null,
  )
})

test('private penalty detail detector catches forbidden builder-facing/internal phrases', () => {
  assert.equal(hasPrivatePenaltyLeak('Reserve ledger balance: 10'), true)
  assert.equal(hasPrivatePenaltyLeak('Penalty Applied'), true)
  assert.equal(hasPrivatePenaltyLeak('Vero has begun reassignment support.'), false)
})
