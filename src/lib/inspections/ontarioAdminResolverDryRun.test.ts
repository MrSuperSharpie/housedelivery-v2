import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveTemplateJurisdiction } from './jurisdictionResolver'
import { getDormantOntarioMunicipalOverlayFoundation } from './ontarioMunicipalOverlayFoundation'
import {
  DORMANT_ONTARIO_ADMIN_RESOLVER_DRY_RUN,
  getDormantOntarioAdminResolverDryRun,
} from './ontarioAdminResolverDryRun'

test('Ontario admin dry-run preserves BC Vancouver and BC fallback resolver behavior', () => {
  const vancouverResolution = resolveTemplateJurisdiction({ city: 'Vancouver' })
  const bcResolution = resolveTemplateJurisdiction({ city: 'Burnaby' })
  const emptyResolution = resolveTemplateJurisdiction({})

  assert.equal(vancouverResolution.status, 'active')
  assert.equal(vancouverResolution.slug, 'vbbl_2025')
  assert.equal(vancouverResolution.allowTemplateFallback, true)

  assert.equal(bcResolution.status, 'active')
  assert.equal(bcResolution.slug, 'bcbc_2024')
  assert.equal(bcResolution.allowTemplateFallback, true)

  assert.equal(emptyResolution.status, 'active')
  assert.equal(emptyResolution.slug, 'bcbc_2024')
  assert.equal(emptyResolution.allowTemplateFallback, true)
})

test('Ontario admin dry-run is internal planning only and never activates live resolution', () => {
  const dryRun = getDormantOntarioAdminResolverDryRun()

  assert.equal(dryRun, DORMANT_ONTARIO_ADMIN_RESOLVER_DRY_RUN)
  assert.equal(dryRun.status, 'internal_planning_only')
  assert.equal(dryRun.publicRoutingEnabled, false)
  assert.equal(dryRun.dispatchEnabled, false)
  assert.equal(dryRun.inspectorClaimingEnabled, false)
  assert.equal(dryRun.activeDbTemplateResolutionEnabled, false)
  assert.equal(dryRun.checklistResponsesExpected, false)
  assert.equal(dryRun.productionApprovalGranted, false)
})

test('Ontario admin dry-run reports province and municipal planned dormant slugs', () => {
  const dryRun = getDormantOntarioAdminResolverDryRun()

  assert.deepEqual(
    dryRun.cases.map(dryRunCase => dryRunCase.plannedDormantJurisdictionSlug),
    ['obc_2024', 'toronto_obc_2024', 'ottawa_obc_2024', 'mississauga_obc_2024'],
  )
  assert.deepEqual(
    dryRun.cases.map(dryRunCase => dryRunCase.label),
    ['Ontario province-level / OBC 2024', 'Toronto', 'Ottawa', 'Mississauga'],
  )
})

test('Ontario admin dry-run cases remain dormant and block BCBC fallback', () => {
  const dryRun = getDormantOntarioAdminResolverDryRun()

  for (const dryRunCase of dryRun.cases) {
    const resolution = resolveTemplateJurisdiction(dryRunCase.sampleInput)

    assert.equal(dryRunCase.resolverStatus, 'dormant')
    assert.equal(dryRunCase.fallbackToBcbcBlocked, true)
    assert.equal(dryRunCase.activeDbTemplateResolutionEnabled, false)
    assert.equal(dryRunCase.publicRoutingEnabled, false)
    assert.equal(dryRunCase.dispatchEnabled, false)
    assert.equal(dryRunCase.inspectorClaimingEnabled, false)
    assert.equal(dryRunCase.checklistResponsesExpected, false)
    assert.equal(dryRunCase.sourceReviewRequired, true)
    assert.equal(dryRunCase.professionalAhjReviewRequired, true)
    assert.equal(dryRunCase.productionApprovalGranted, false)
    assert.equal(resolution.status, 'dormant')
    assert.equal(resolution.slug, null)
    assert.equal(resolution.allowTemplateFallback, false)
  }
})

test('Ontario admin dry-run uses existing Ontario metadata rather than a second workflow', () => {
  const dryRun = getDormantOntarioAdminResolverDryRun()
  const overlayFoundation = getDormantOntarioMunicipalOverlayFoundation()

  assert.equal(dryRun.usesExistingOntarioMetadata, true)
  assert.equal(dryRun.standaloneWorkflowCreated, false)
  assert.deepEqual(
    dryRun.cases.slice(1).map(dryRunCase => dryRunCase.plannedDormantJurisdictionSlug),
    overlayFoundation.overlays.map(overlay => overlay.plannedSlug),
  )
  assert.ok(
    dryRun.cases.every(dryRunCase =>
      dryRunCase.activationBlockers.some(blocker => blocker.includes('active DB template resolution')),
    ),
  )
})
