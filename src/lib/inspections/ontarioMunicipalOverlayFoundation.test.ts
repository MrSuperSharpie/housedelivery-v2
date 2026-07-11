import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveTemplateJurisdiction } from './jurisdictionResolver'
import { getDormantOntarioSmallResidentialTemplateFoundation } from './ontarioSmallResidentialTemplateFoundation'
import { getDormantOntarioTemplateGovernance } from './ontarioTemplateGovernance'
import {
  DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION,
  assertDormantOntarioMunicipalOverlayReferences,
  getDormantOntarioMunicipalOverlayFoundation,
} from './ontarioMunicipalOverlayFoundation'

const plannedMunicipalOverlays = [
  { municipalityName: 'Toronto', plannedSlug: 'toronto_obc_2024' },
  { municipalityName: 'Ottawa', plannedSlug: 'ottawa_obc_2024' },
  { municipalityName: 'Mississauga', plannedSlug: 'mississauga_obc_2024' },
]

const plannedSourceCategoryLabels = [
  'Municipal permit application requirements',
  'Municipal zoning / applicable law precheck',
  'Municipal drawing submission expectations',
  'Municipal inspection naming differences',
  'Municipal portal / submission process',
  'Local forms and supplemental documents',
  'External authority dependencies where applicable',
  'Future reviewed checklist overlays',
]

test('BC Vancouver and non-Vancouver resolver behavior remains unchanged', () => {
  const vancouverResolution = resolveTemplateJurisdiction({ city: 'Vancouver' })
  const bcResolution = resolveTemplateJurisdiction({ city: 'Burnaby' })
  const emptyResolution = resolveTemplateJurisdiction({ city: '' })

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

test('Ontario municipal overlay foundation is dormant and not publicly enabled', () => {
  const foundation = getDormantOntarioMunicipalOverlayFoundation()

  assert.equal(foundation, DORMANT_ONTARIO_MUNICIPAL_OVERLAY_FOUNDATION)
  assert.equal(foundation.overlayStatus, 'planned_dormant_not_active')
  assert.equal(foundation.publicRoutingEnabled, false)
  assert.equal(foundation.dispatchEnabled, false)
  assert.equal(foundation.inspectorClaimingEnabled, false)
  assert.equal(foundation.activeTemplateResolutionEnabled, false)
  assert.equal(foundation.checklistResponsesExpected, false)
  assert.equal(foundation.productionApprovalStatus, 'not_granted')
})

test('Toronto Ottawa and Mississauga overlays remain dormant', () => {
  const foundation = getDormantOntarioMunicipalOverlayFoundation()

  assert.deepEqual(
    foundation.overlays.map(overlay => ({
      municipalityName: overlay.municipalityName,
      plannedSlug: overlay.plannedSlug,
    })),
    plannedMunicipalOverlays,
  )

  assert.ok(foundation.overlays.every(overlay => overlay.parentJurisdictionSlug === 'obc_2024'))
  assert.ok(foundation.overlays.every(overlay => overlay.overlayStatus === 'planned_dormant_not_active'))
  assert.ok(foundation.overlays.every(overlay => overlay.publicEnabled === false))
  assert.ok(foundation.overlays.every(overlay => overlay.dispatchEnabled === false))
  assert.ok(foundation.overlays.every(overlay => overlay.inspectorClaimingEnabled === false))
  assert.ok(foundation.overlays.every(overlay => overlay.activeTemplateResolutionEnabled === false))
  assert.ok(foundation.overlays.every(overlay => overlay.checklistResponsesExpected === false))
  assert.ok(foundation.overlays.every(overlay => overlay.productionApprovalStatus === 'not_granted'))
})

test('municipal overlays require source and professional review before activation', () => {
  const foundation = getDormantOntarioMunicipalOverlayFoundation()

  assert.equal(foundation.municipalSourceReviewStatus, 'requires_review')
  assert.equal(foundation.professionalReviewStatus, 'requires_review')
  assert.ok(foundation.overlays.every(overlay => overlay.municipalSourceReviewStatus === 'requires_review'))
  assert.ok(foundation.overlays.every(overlay => overlay.professionalReviewStatus === 'requires_review'))
  assert.ok(
    foundation.overlays.every(overlay =>
      overlay.activationBlockers.some(blocker => blocker.includes('municipal source review')),
    ),
  )
  assert.ok(
    foundation.overlays.every(overlay =>
      overlay.activationBlockers.some(blocker => blocker.includes('Professional/AHJ review')),
    ),
  )
})

test('municipal overlay source categories are draft review-only planning references', () => {
  const foundation = getDormantOntarioMunicipalOverlayFoundation()

  for (const overlay of foundation.overlays) {
    assert.deepEqual(
      overlay.plannedSourceCategories.map(category => category.label),
      plannedSourceCategoryLabels,
    )
    assert.ok(overlay.plannedSourceCategories.every(category => category.reviewStatus === 'requires_review'))
  }
})

test('municipal overlays connect to existing dormant Ontario foundation and governance', () => {
  const overlayFoundation = getDormantOntarioMunicipalOverlayFoundation()
  const templateFoundation = getDormantOntarioSmallResidentialTemplateFoundation()
  const templateGovernance = getDormantOntarioTemplateGovernance()

  assert.doesNotThrow(() => assertDormantOntarioMunicipalOverlayReferences())
  assert.equal(overlayFoundation.referencesExistingOntarioFoundation, true)
  assert.equal(overlayFoundation.referencesExistingOntarioGovernance, true)
  assert.equal(overlayFoundation.standaloneWorkflowCreated, false)
  assert.equal(templateFoundation.participatesInActiveDbResolution, false)
  assert.equal(templateGovernance.activeTemplateResolutionEnabled, false)
})

test('explicit Ontario municipal context does not route into active DB template resolution', () => {
  const foundation = getDormantOntarioMunicipalOverlayFoundation()

  for (const overlay of foundation.overlays) {
    const result = resolveTemplateJurisdiction({
      city: overlay.municipalityName,
      province: overlay.province,
    })

    assert.equal(result.status, 'dormant')
    assert.equal(result.family, 'ontario')
    assert.equal(result.slug, null)
    assert.equal(result.dormantSlug, 'obc_2024')
    assert.equal(result.allowTemplateFallback, false)
  }
})
