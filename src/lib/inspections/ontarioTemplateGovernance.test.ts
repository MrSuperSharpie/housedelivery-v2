import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveTemplateJurisdiction } from './jurisdictionResolver'
import { getDormantOntarioStageAlignedTemplateMatrix } from './ontarioStageAlignedTemplateMatrix'
import { getDormantOntarioSmallResidentialTemplateFoundation } from './ontarioSmallResidentialTemplateFoundation'
import {
  DORMANT_ONTARIO_TEMPLATE_GOVERNANCE,
  getDormantOntarioTemplateGovernance,
} from './ontarioTemplateGovernance'

test('Ontario template governance is dormant and not active', () => {
  const governance = getDormantOntarioTemplateGovernance()

  assert.equal(governance, DORMANT_ONTARIO_TEMPLATE_GOVERNANCE)
  assert.equal(governance.governanceStatus, 'draft_dormant_not_active')
  assert.equal(governance.foundationStatus, 'draft_dormant_not_active')
  assert.equal(governance.stageMatrixStatus, 'draft_dormant_not_active')
  assert.equal(governance.productionApprovalStatus, 'not_granted')
})

test('Ontario governance keeps public routing dispatch and inspector claiming disabled', () => {
  const governance = getDormantOntarioTemplateGovernance()

  assert.equal(governance.publicEnabled, false)
  assert.equal(governance.dispatchEnabled, false)
  assert.equal(governance.inspectorClaimingEnabled, false)
  assert.equal(governance.activeTemplateResolutionEnabled, false)
  assert.equal(governance.checklistResponsesExpected, false)
})

test('Ontario governance requires source professional and municipal overlay review before activation', () => {
  const governance = getDormantOntarioTemplateGovernance()

  assert.equal(governance.sourceReviewStatus, 'required_before_activation')
  assert.equal(governance.professionalReviewStatus, 'required_before_activation')
  assert.equal(governance.municipalOverlayReviewStatus, 'future_review_required')
  assert.ok(governance.activationBlockers.some(blocker => blocker.includes('source review')))
  assert.ok(governance.activationBlockers.some(blocker => blocker.includes('Professional/AHJ review')))
  assert.ok(governance.activationBlockers.some(blocker => blocker.includes('Production approval')))
})

test('Ontario governance references existing dormant foundation and stage matrix', () => {
  const governance = getDormantOntarioTemplateGovernance()
  const foundation = getDormantOntarioSmallResidentialTemplateFoundation()
  const stageMatrix = getDormantOntarioStageAlignedTemplateMatrix()

  assert.equal(governance.referencesExistingFoundation, true)
  assert.equal(governance.referencesExistingStageMatrix, true)
  assert.equal(governance.foundationScopeLabel, foundation.scopeLabel)
  assert.equal(governance.stageMatrixScopeLabel, stageMatrix.scopeLabel)
  assert.equal(foundation.participatesInActiveDbResolution, false)
  assert.equal(stageMatrix.participatesInActiveDbResolution, false)
})

test('Ontario governance source categories cover required draft references', () => {
  const governance = getDormantOntarioTemplateGovernance()

  assert.deepEqual(
    governance.sourceCategories.map(category => category.label),
    [
      'Ontario Building Code 2024 / OBC core',
      'Municipal building department requirements',
      'Schedule 1 Designer Information',
      'BCIN/designer information',
      'Applicable law / zoning / municipal precheck',
      'Energy efficiency / SB-12',
      'Plumbing / mechanical / electrical authority boundaries',
      'Final inspection / occupancy readiness',
      'Future Toronto, Ottawa, and Mississauga overlays',
    ],
  )
  assert.ok(governance.sourceCategories.every(category => category.status === 'required_before_activation'))
})

test('Ontario governance cannot make Ontario production approved or active in resolver', () => {
  const governance = getDormantOntarioTemplateGovernance()
  const ontarioResolution = resolveTemplateJurisdiction({ city: 'Toronto', province: 'ON' })
  const vancouverResolution = resolveTemplateJurisdiction({ city: 'Vancouver' })
  const bcResolution = resolveTemplateJurisdiction({ city: 'Burnaby' })

  assert.notEqual(governance.productionApprovalStatus, 'granted')
  assert.equal(ontarioResolution.status, 'dormant')
  assert.equal(ontarioResolution.slug, null)
  assert.equal(ontarioResolution.allowTemplateFallback, false)
  assert.equal(vancouverResolution.status, 'active')
  assert.equal(vancouverResolution.slug, 'vbbl_2025')
  assert.equal(bcResolution.status, 'active')
  assert.equal(bcResolution.slug, 'bcbc_2024')
})
