import React from 'react'
import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { DepartureTriageView } from './DepartureInterventionsClient'
import type { DepartureInterventionTicket } from '@/lib/adminDepartureTriage'

const ticket: DepartureInterventionTicket = {
  id: 'ticket-1',
  jobId: 'job-123456789',
  assignmentId: 'assignment-1',
  inspectorId: 'inspector-1',
  builderId: 'builder-1',
  state: 'needs_help',
  riskLevel: 'At Risk',
  scheduledStartAt: '2026-04-25T19:00:00.000Z',
  requiredDepartureAt: '2026-04-25T17:30:00.000Z',
  responseTimestamp: '2026-04-25T17:45:00.000Z',
  currentEtaSeconds: 3600,
  etaGapMinutes: 15,
  projectName: 'Harbour Framing',
  inspectionType: 'framing',
  siteAddress: '22 Water St, Vancouver',
  inspectorName: 'Sam Inspector',
  inspectorPhone: '604-555-0100',
  builderName: 'Coastal Builder',
  builderPhone: '604-555-0101',
  reasonCategory: 'vehicle_issue',
  reasonLabel: 'Vehicle issue',
  inspectorDetails: 'Tire failure. Tow truck is en route.',
  standbyStatus: 'Standby accepted',
  standbyCandidates: [{
    id: 'standby-1',
    inspectorId: 'standby-inspector',
    inspectorName: 'Alex Standby',
    rank: 1,
    status: 'accepted',
    credentialMatch: true,
    regionMatch: true,
  }],
  builderNotificationStatus: 'queued',
  escrowProtected: true,
  lastMonitoringStatus: 'action_required',
  auditTimeline: [{ at: '2026-04-25T17:40:00.000Z', label: 'Hard ping sent', actor: 'system' }],
}

function render(params: {
  tickets?: DepartureInterventionTicket[]
  pendingAction?: Parameters<typeof DepartureTriageView>[0]['pendingAction']
  ticketOutcomes?: Parameters<typeof DepartureTriageView>[0]['ticketOutcomes']
  successMessage?: string
} = {}) {
  const tickets = params.tickets ?? [ticket]
  return renderToStaticMarkup(
    <DepartureTriageView
      tickets={tickets}
      loading={false}
      error={null}
      successMessage={params.successMessage}
      selectedTicketId={tickets[0]?.id ?? null}
      pendingAction={params.pendingAction}
      ticketOutcomes={params.ticketOutcomes}
      onSelectTicket={() => {}}
      onRefresh={() => {}}
      onResolveTicket={() => {}}
    />,
  )
}

test('active intervention queue renders operational row and context panel', () => {
  const html = render()
  assert.match(html, /Active Departure Triage/)
  assert.match(html, /Harbour Framing/)
  assert.match(html, /Vehicle issue/)
  assert.match(html, /Review issue/)
  assert.match(html, /Sam Inspector/)
  assert.match(html, /Coastal Builder/)
})

test('context panel shows inspector reason, typed details, and standby availability', () => {
  const html = render()
  assert.match(html, /Tire failure\. Tow truck is en route\./)
  assert.match(html, /Alex Standby/)
  assert.match(html, /Credential match/)
  assert.match(html, /Region match/)
})

test('resolution controls include protected, reliability impact, keep assigned, and manual recovery actions', () => {
  const html = render()
  assert.match(html, /Reassign — Protected Event/)
  assert.match(html, /Reassign — Reliability Impact/)
  assert.match(html, /Keep Assigned — Builder Accepted Delay/)
  assert.match(html, /Escalate \/ Manual Recovery/)
})

test('resolving state disables duplicate submit controls', () => {
  const html = render({
    pendingAction: { ticketId: ticket.id, action: 'protected_reassign' },
    ticketOutcomes: { [ticket.id]: 'resolving' },
  })
  assert.match(html, /disabled=""/)
  assert.match(html, /Resolving/)
  assert.match(html, /Submitting action/)
})

test('resolved reassignment shows success and disables further action', () => {
  const html = render({
    ticketOutcomes: { [ticket.id]: 'reassigned' },
    successMessage: 'Reassignment action recorded. Vero is updating recovery state.',
  })
  assert.match(html, /Reassigned/)
  assert.match(html, /Further actions are disabled/)
  assert.match(html, /Reassignment action recorded/)
})

test('manual recovery status remains visible without accidental reliability classification', () => {
  const html = render({
    ticketOutcomes: { [ticket.id]: 'manual_recovery' },
    successMessage: 'Manual recovery status recorded. This ticket remains visible for follow-up.',
  })
  assert.match(html, /Manual recovery/)
  assert.match(html, /Manual recovery status recorded/)
  assert.doesNotMatch(html, /Reliability Impact event<\/span>/)
})

test('builder and private penalty details are not rendered', () => {
  const leakyTicket = {
    ...ticket,
    inspectorDetails: 'Inspector reported an app issue.',
    internalReliabilityScore: 12,
    reserveLedgerBalance: 500,
    adminPrivatePenaltyDetails: 'Penalty Applied',
  } as DepartureInterventionTicket
  const html = render({ tickets: [leakyTicket] })
  assert.doesNotMatch(html, /internalReliabilityScore|reserveLedgerBalance|adminPrivatePenaltyDetails|Penalty Applied/)
})
