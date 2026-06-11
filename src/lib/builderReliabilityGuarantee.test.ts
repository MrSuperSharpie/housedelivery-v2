import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ReliabilityGuarantee } from '../components/builder/ReliabilityGuarantee'
import {
  BUILDER_APPOINTMENT_AT_RISK_COPY,
  BUILDER_REASSIGNMENT_STARTED_COPY,
  BUILDER_RELIABILITY_GUARANTEE_BODY,
  BUILDER_RELIABILITY_GUARANTEE_BULLETS,
  BUILDER_RELIABILITY_GUARANTEE_TITLE,
  buildBuilderReliabilityStatus,
  deriveBuilderAppointmentStatus,
} from './builderReliabilityGuarantee'

test('guarantee component renders in booking flow format', () => {
  const html = renderToStaticMarkup(React.createElement(ReliabilityGuarantee, { compact: true }))

  assert.match(html, new RegExp(BUILDER_RELIABILITY_GUARANTEE_TITLE))
  assert.match(html, new RegExp(BUILDER_RELIABILITY_GUARANTEE_BODY.slice(0, 64)))
  for (const bullet of BUILDER_RELIABILITY_GUARANTEE_BULLETS) {
    assert.match(html, new RegExp(bullet))
  }
})

test('status changes reflect confirmation state', () => {
  assert.equal(deriveBuilderAppointmentStatus({ assignmentStatus: 'confirmed' }), 'confirmed')
  assert.equal(
    deriveBuilderAppointmentStatus({
      assignmentStatus: 'confirmed',
      nextConfirmationCheckpoint: '24-hour attendance reconfirmation',
    }),
    'awaiting_reconfirmation',
  )
  assert.equal(deriveBuilderAppointmentStatus({ missedCriticalConfirmation: true }), 'at_risk')
  assert.equal(deriveBuilderAppointmentStatus({ standbyActivationRequested: true }), 'reassignment_in_progress')
  assert.equal(deriveBuilderAppointmentStatus({ assignmentStatus: 'completed' }), 'completed')
})

test('builder status model does not expose private inspector scoring or reserve details', () => {
  const model = buildBuilderReliabilityStatus({
    assignmentStatus: 'confirmed',
    nextConfirmationCheckpoint: 'T-4h critical check',
    missedCriticalConfirmation: false,
    ...({
      internalInspectorScore: 42,
      reserveBalanceCents: 12000,
      penaltyDetails: 'private',
    } as Record<string, unknown>),
  })

  const serialized = JSON.stringify(model).toLowerCase()
  assert.doesNotMatch(serialized, /score/)
  assert.doesNotMatch(serialized, /reservebalance|reserve balance|penalty/)
})

test('reassignment copy appears during standby activation', () => {
  const status = buildBuilderReliabilityStatus({ standbyActivationRequested: true })

  assert.equal(status.status, 'reassignment_in_progress')
  assert.equal(status.copy, BUILDER_REASSIGNMENT_STARTED_COPY)
})

test('payment protection status displays correctly for at-risk appointments', () => {
  const status = buildBuilderReliabilityStatus({ missedCriticalConfirmation: true })
  const html = renderToStaticMarkup(React.createElement(ReliabilityGuarantee, {
    compact: true,
    showStatus: true,
    inspectorName: 'Avery Chen',
    status,
  }))

  assert.equal(status.copy, BUILDER_APPOINTMENT_AT_RISK_COPY)
  assert.match(html, /Payment protection/)
  assert.match(html, /payment remains protected/i)
  assert.match(html, /Avery Chen/)
})
