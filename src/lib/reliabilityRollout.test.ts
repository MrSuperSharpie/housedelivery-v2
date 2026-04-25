import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ReliabilityGuarantee } from '@/components/builder/ReliabilityGuarantee'
import { ReliabilityTierDashboard } from '@/components/inspector/ReliabilityTierDashboard'
import { buildInspectorReliabilityDashboardModel } from './reliabilityDashboard'
import { evaluateInspectionPayout } from './reliability'
import {
  buildEmergencyEnforcementDisablePatch,
  evaluateReliabilityRollout,
  isReliabilityFeatureVisible,
} from './reliabilityRollout'

const AS_OF = '2026-04-25T12:00:00.000Z'

test('observe_only calculates only and prevents money movement', () => {
  const rollout = evaluateReliabilityRollout({ enforcementMode: 'observe_only' })
  const payout = evaluateInspectionPayout({
    outcome: 'pass',
    documentedProfessionalWork: true,
    evidenceComplete: true,
    grossPayoutAmount: 1000,
    inspectorTier: 'preferred',
    asOf: AS_OF,
    policyConfig: {
      enforcementMode: 'observe_only',
      reserveHooksEnabled: true,
      tierReservePercents: { preferred: 10 },
    },
  })

  assert.equal(rollout.scoresCalculated, true)
  assert.equal(rollout.adminDataVisible, true)
  assert.equal(rollout.moneyMovementAllowed, false)
  assert.equal(rollout.automaticInspectorRestrictionAllowed, false)
  assert.equal(payout.consequencesEnforced, false)
  assert.equal(payout.reserveLedgerEntries[0].entryType, 'observe_only_projection')
  assert.equal(payout.escrowStatus, 'earned_pending_review')
})

test('soft_enforcement warns but does not auto-penalize money movement', () => {
  const rollout = evaluateReliabilityRollout({
    enforcementMode: 'soft_enforcement',
    inspectorTierDashboardEnabled: true,
    payoutReserveEnabled: true,
  })
  const payout = evaluateInspectionPayout({
    outcome: 'pass',
    documentedProfessionalWork: true,
    evidenceComplete: true,
    grossPayoutAmount: 1000,
    inspectorTier: 'preferred',
    asOf: AS_OF,
    policyConfig: {
      enforcementMode: 'soft_enforcement',
      reserveHooksEnabled: true,
      tierReservePercents: { preferred: 10 },
    },
  })

  assert.equal(rollout.warningNotificationsEnabled, true)
  assert.equal(rollout.adminReviewedConsequencesEnabled, true)
  assert.equal(rollout.inspectorDashboardVisible, true)
  assert.equal(rollout.moneyMovementAllowed, false)
  assert.equal(payout.consequencesEnforced, false)
  assert.equal(payout.reserveLedgerEntries[0].entryType, 'observe_only_projection')
})

test('full_enforcement applies configured consequences only when enabled', () => {
  const rollout = evaluateReliabilityRollout({
    enforcementMode: 'full_enforcement',
    payoutReserveEnabled: true,
    automaticRestrictionRulesEnabled: true,
    automaticSuspensionEnabled: true,
    suspensionsRequireAdminConfirmation: false,
  })
  const payout = evaluateInspectionPayout({
    outcome: 'pass',
    documentedProfessionalWork: true,
    evidenceComplete: true,
    grossPayoutAmount: 1000,
    inspectorTier: 'preferred',
    asOf: AS_OF,
    policyConfig: {
      enforcementMode: 'full_enforcement',
      payoutReserveEnabled: true,
      reserveHooksEnabled: true,
      tierReservePercents: { preferred: 10 },
    },
  })

  assert.equal(rollout.financialConsequencesEnforced, true)
  assert.equal(rollout.automaticInspectorRestrictionAllowed, true)
  assert.equal(rollout.automaticSuspensionAllowed, true)
  assert.equal(rollout.automaticConsequencesAuditRequired, true)
  assert.equal(payout.consequencesEnforced, true)
  assert.equal(payout.reserveLedgerEntries[0].entryType, 'reserve_hold')
  assert.equal(payout.escrowStatus, 'payout_ready')
})

test('emergency kill switch disables automatic enforcement immediately', () => {
  const rollout = evaluateReliabilityRollout({
    enforcementMode: 'full_enforcement',
    emergencyKillSwitch: true,
    payoutReserveEnabled: true,
    automaticRestrictionRulesEnabled: true,
    automaticSuspensionEnabled: true,
    suspensionsRequireAdminConfirmation: false,
  })
  const disablePatch = buildEmergencyEnforcementDisablePatch('Emergency legal review pause.')

  assert.equal(rollout.moneyMovementAllowed, false)
  assert.equal(rollout.financialConsequencesEnforced, false)
  assert.equal(rollout.automaticInspectorRestrictionAllowed, false)
  assert.equal(rollout.automaticSuspensionAllowed, false)
  assert.equal(disablePatch.enforcementMode, 'observe_only')
  assert.equal(disablePatch.patch.emergencyKillSwitch, true)
})

test('suspensions require admin confirmation unless automation is explicit', () => {
  assert.equal(evaluateReliabilityRollout({
    enforcementMode: 'full_enforcement',
    automaticSuspensionEnabled: true,
    suspensionsRequireAdminConfirmation: true,
  }).automaticSuspensionAllowed, false)

  assert.equal(evaluateReliabilityRollout({
    enforcementMode: 'full_enforcement',
    automaticSuspensionEnabled: true,
    suspensionsRequireAdminConfirmation: false,
  }).automaticSuspensionAllowed, true)
})

test('feature flags hide and show UI correctly', () => {
  assert.equal(isReliabilityFeatureVisible('reliabilityGuaranteeBuilderCopyEnabled', {
    reliabilityGuaranteeBuilderCopyEnabled: false,
  }), false)
  assert.equal(isReliabilityFeatureVisible('inspectorTierDashboardEnabled', {
    enforcementMode: 'soft_enforcement',
    inspectorTierDashboardEnabled: true,
  }), true)

  const hiddenGuarantee = renderToStaticMarkup(React.createElement(ReliabilityGuarantee, { enabled: false }))
  const visibleGuarantee = renderToStaticMarkup(React.createElement(ReliabilityGuarantee, { enabled: true, compact: true }))
  const dashboardModel = buildInspectorReliabilityDashboardModel({
    profile: { tierKey: 'preferred', internalScore: 90, credentialStatus: 'approved' },
    events: [],
  })
  const hiddenDashboard = renderToStaticMarkup(React.createElement(ReliabilityTierDashboard, {
    enabled: false,
    model: dashboardModel,
  }))

  assert.equal(hiddenGuarantee, '')
  assert.match(visibleGuarantee, /Vero Reliability Guarantee/)
  assert.equal(hiddenDashboard, '')
})
