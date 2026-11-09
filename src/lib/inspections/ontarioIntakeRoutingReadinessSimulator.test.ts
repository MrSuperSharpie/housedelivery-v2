import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveTemplateJurisdiction } from './jurisdictionResolver'
import { getDormantOntarioAdminResolverDryRun } from './ontarioAdminResolverDryRun'
import { getDormantOntarioProjectTaxonomyFoundation } from './ontarioProjectTaxonomyFoundation'
import { getDormantOntarioSmallResidentialTemplateFoundation } from './ontarioSmallResidentialTemplateFoundation'
import { getDormantOntarioStageAlignedTemplateMatrix } from './ontarioStageAlignedTemplateMatrix'
import { getDormantOntarioTemplateGovernance } from './ontarioTemplateGovernance'
import {
  DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR,
  getDormantOntarioIntakeRoutingReadinessSimulator,
} from './ontarioIntakeRoutingReadinessSimulator'

test('Ontario intake simulator preserves BC Vancouver and BC fallback resolver behavior', () => {
  const vancouverResolution = resolveTemplateJurisdiction({ city: 'Vancouver' })
  const bcResolution = resolveTemplateJurisdiction({ city: 'Burnaby' })

  assert.equal(vancouverResolution.status, 'active')
  assert.equal(vancouverResolution.slug, 'vbbl_2025')
  assert.equal(vancouverResolution.allowTemplateFallback, true)

  assert.equal(bcResolution.status, 'active')
  assert.equal(bcResolution.slug, 'bcbc_2024')
  assert.equal(bcResolution.allowTemplateFallback, true)
})

test('Ontario intake simulator is dormant and does not enable workflows', () => {
  const simulator = getDormantOntarioIntakeRoutingReadinessSimulator()

  assert.equal(simulator, DORMANT_ONTARIO_INTAKE_ROUTING_READINESS_SIMULATOR)
  assert.equal(simulator.status, 'draft_internal_dormant_not_active')
  assert.equal(simulator.intakeEnabled, false)
  assert.equal(simulator.publicRoutingEnabled, false)
  assert.equal(simulator.dispatchEnabled, false)
  assert.equal(simulator.inspectorClaimingEnabled, false)
  assert.equal(simulator.activeDbTemplateResolutionEnabled, false)
  assert.equal(simulator.checklistResponsesExpected, false)
  assert.equal(simulator.productionApprovalGranted, false)
})

test('Ontario intake simulator sample scenarios use planned dormant slugs only', () => {
  const simulator = getDormantOntarioIntakeRoutingReadinessSimulator()

  assert.deepEqual(
    simulator.scenarios.map(scenario => scenario.scenarioName),
    [
      'Ontario province-level small residential project',
      'Toronto additional residential unit / garden suite readiness',
      'Ottawa small residential permit readiness',
      'Mississauga detached/semi-detached residential readiness',
    ],
  )
  assert.deepEqual(
    simulator.scenarios.map(scenario => scenario.plannedJurisdictionSlug),
    ['obc_2024', 'toronto_obc_2024', 'ottawa_obc_2024', 'mississauga_obc_2024'],
  )
  assert.deepEqual(
    simulator.scenarios.map(scenario => scenario.plannedMunicipalOverlaySlug),
    [null, 'toronto_obc_2024', 'ottawa_obc_2024', 'mississauga_obc_2024'],
  )
})

test('Ontario intake simulator scenarios expose required planning flags and blockers', () => {
  const simulator = getDormantOntarioIntakeRoutingReadinessSimulator()

  assert.ok(simulator.scenarios.every(scenario => scenario.sourceReviewRequired === true))
  assert.ok(simulator.scenarios.every(scenario => scenario.municipalReviewRequired === true))
  assert.ok(simulator.scenarios.every(scenario => scenario.professionalAhjReviewRequired === true))
  assert.ok(simulator.scenarios.every(scenario => scenario.productionApprovalGranted === false))
  assert.ok(simulator.scenarios.every(scenario => scenario.activationBlockers.includes('Ontario intake is not enabled.')))
  assert.ok(
    simulator.scenarios.every(scenario =>
      scenario.activationBlockers.includes('Ontario simulator does not participate in active DB template resolution.'),
    ),
  )
  assert.ok(simulator.scenarios.every(scenario => scenario.stagePlanningCoverage.length > 0))
  assert.ok(simulator.scenarios.every(scenario => scenario.expectedDormantTemplateCategories.length > 0))
})

test('Ontario intake simulator reuses existing Ontario metadata rather than a second workflow', () => {
  const simulator = getDormantOntarioIntakeRoutingReadinessSimulator()
  const taxonomy = getDormantOntarioProjectTaxonomyFoundation()
  const foundation = getDormantOntarioSmallResidentialTemplateFoundation()
  const stageMatrix = getDormantOntarioStageAlignedTemplateMatrix()
  const governance = getDormantOntarioTemplateGovernance()
  const dryRun = getDormantOntarioAdminResolverDryRun()

  assert.equal(simulator.usesExistingOntarioFoundation, true)
  assert.equal(simulator.usesExistingOntarioTaxonomy, true)
  assert.equal(simulator.usesExistingOntarioStageMatrix, true)
  assert.equal(simulator.usesExistingOntarioGovernance, true)
  assert.equal(simulator.standaloneWorkflowCreated, false)
  assert.equal(taxonomy.standaloneWorkflowCreated, false)
  assert.equal(foundation.participatesInActiveDbResolution, false)
  assert.equal(stageMatrix.participatesInActiveDbResolution, false)
  assert.equal(governance.activeTemplateResolutionEnabled, false)
  assert.equal(dryRun.activeDbTemplateResolutionEnabled, false)
})

test('explicit Ontario simulator context remains dormant and blocks BCBC fallback', () => {
  for (const city of ['Toronto', 'Ottawa', 'Mississauga']) {
    const result = resolveTemplateJurisdiction({
      city,
      province: 'ON',
      context: 'Ontario intake routing readiness simulator',
    })

    assert.equal(result.status, 'dormant')
    assert.equal(result.family, 'ontario')
    assert.equal(result.slug, null)
    assert.equal(result.dormantSlug, 'obc_2024')
    assert.equal(result.allowTemplateFallback, false)
  }
})
