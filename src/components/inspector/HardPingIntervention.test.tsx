import React from 'react'
import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { HardPingIntervention } from './HardPingIntervention'
import type { ActiveHardPing, HardPingResponseResult } from '@/lib/hardPingTypes'

const hardPing: ActiveHardPing = {
  id: 'monitoring-1',
  jobId: 'job-1',
  assignmentId: 'assignment-1',
  inspectorId: 'inspector-1',
  status: 'hard_ping_required',
  projectName: 'Seawall House',
  siteAddress: '100 Main St, Vancouver',
  scheduledStartAt: '2026-04-25T19:30:00.000Z',
  currentEtaSeconds: 1800,
  confidenceScore: 30,
  confidenceStatus: 'action_required',
}

const onRespond = async (): Promise<HardPingResponseResult> => ({ ok: true })

test('intervention renders when an inspector has an active hard ping', () => {
  const html = renderToStaticMarkup(
    <HardPingIntervention hardPing={hardPing} userRole="inspector" onRespond={onRespond} />,
  )

  assert.match(html, /role="alertdialog"/)
  assert.match(html, /Your departure window has passed/)
  assert.match(html, /Yes, I am en route/)
  assert.match(html, /I need help \/ report issue/)
  assert.match(html, /I cannot attend/)
  assert.match(html, /Seawall House/)
  assert.match(html, /100 Main St, Vancouver/)
})

test('intervention does not render for non-inspector users', () => {
  const html = renderToStaticMarkup(
    <HardPingIntervention hardPing={hardPing} userRole="builder" onRespond={onRespond} />,
  )

  assert.equal(html, '')
})

test('intervention does not render when no hard ping is active', () => {
  const html = renderToStaticMarkup(
    <HardPingIntervention hardPing={null} userRole="inspector" onRespond={onRespond} />,
  )

  assert.equal(html, '')
})

test('help step renders reason options and admin details field', () => {
  const html = renderToStaticMarkup(
    <HardPingIntervention hardPing={hardPing} userRole="inspector" onRespond={onRespond} initialStep="help" />,
  )

  assert.match(html, /What is preventing you from departing on time/)
  assert.match(html, /Vehicle issue/)
  assert.match(html, /Weather \/ road closure/)
  assert.match(html, /App \/ GPS issue/)
  assert.match(html, /Add details for Vero Admin/)
  assert.match(html, /Send report/)
})

test('cannot attend step requires confirmation before submit', () => {
  const html = renderToStaticMarkup(
    <HardPingIntervention hardPing={hardPing} userRole="inspector" onRespond={onRespond} initialStep="cannot_attend" />,
  )

  assert.match(html, /Confirm you cannot attend/)
  assert.match(html, /Go back/)
  assert.match(html, /Confirm I cannot attend/)
})

test('builder and admin-only data is not rendered', () => {
  const leakyHardPing = {
    ...hardPing,
    internalReliabilityScore: 12,
    reserveLedgerBalance: 500,
    adminNotes: 'private note',
    builderPrivateNotes: 'gate code',
    standbyInspectorDetails: 'backup inspector',
  } as ActiveHardPing

  const html = renderToStaticMarkup(
    <HardPingIntervention hardPing={leakyHardPing} userRole="inspector" onRespond={onRespond} />,
  )

  assert.doesNotMatch(html, /internalReliabilityScore|reserveLedgerBalance|private note|gate code|backup inspector/)
})

