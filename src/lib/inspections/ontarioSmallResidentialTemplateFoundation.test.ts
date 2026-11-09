import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveTemplateJurisdiction } from './jurisdictionResolver'
import {
  DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION,
  getDormantOntarioSmallResidentialTemplateFoundation,
} from './ontarioSmallResidentialTemplateFoundation'

const expectedCategoryTitles = [
  'Ontario Building Code 2024 small residential core',
  'Application for a Permit to Construct or Demolish',
  'Schedule 1 Designer Information',
  'BCIN/designer information placeholders',
  'Site plan',
  'Architectural drawings',
  'Structural drawings/details where applicable',
  'Energy efficiency / SB-12 placeholder where applicable',
  'HVAC / mechanical scope placeholder',
  'Plumbing scope placeholder',
  'Electrical authority boundary placeholder',
  'Applicable law / zoning / municipal precheck placeholder',
  'Final inspection / occupancy readiness placeholder',
]

test('Ontario small residential template foundation is dormant and not publicly enabled', () => {
  const foundation = getDormantOntarioSmallResidentialTemplateFoundation()

  assert.equal(foundation, DORMANT_ONTARIO_SMALL_RESIDENTIAL_TEMPLATE_FOUNDATION)
  assert.equal(foundation.isActive, false)
  assert.equal(foundation.templatesActive, false)
  assert.equal(foundation.publicRoutingEnabled, false)
  assert.equal(foundation.dispatchEnabled, false)
  assert.equal(foundation.participatesInActiveDbResolution, false)
  assert.equal(foundation.checklistResponsesExpected, false)
})

test('Ontario template foundation categories are draft planning only', () => {
  const foundation = getDormantOntarioSmallResidentialTemplateFoundation()

  assert.deepEqual(
    foundation.categories.map(category => category.title),
    expectedCategoryTitles,
  )
  assert.ok(foundation.categories.every(category => category.status === 'draft_planned_dormant_requires_review'))
  assert.ok(foundation.categories.every(category => category.requiresReview === true))
  assert.ok(foundation.categories.every(category => category.isActive === false))
  assert.ok(foundation.categories.every(category => category.participatesInActiveResolution === false))
})

test('Ontario municipal overlays are future review-required placeholders only', () => {
  const foundation = getDormantOntarioSmallResidentialTemplateFoundation()

  assert.deepEqual(
    foundation.municipalOverlays.map(overlay => overlay.slug),
    ['toronto_obc_2024', 'ottawa_obc_2024', 'mississauga_obc_2024'],
  )
  assert.ok(foundation.municipalOverlays.every(overlay => overlay.status === 'future_review_required'))
  assert.ok(foundation.municipalOverlays.every(overlay => overlay.requiresReview === true))
  assert.ok(foundation.municipalOverlays.every(overlay => overlay.isActive === false))
  assert.ok(foundation.municipalOverlays.every(overlay => overlay.templatesActive === false))
})

test('Ontario template foundation does not participate in active DB template resolution', () => {
  const ontarioResolution = resolveTemplateJurisdiction({ city: 'Toronto', province: 'ON' })
  const vancouverResolution = resolveTemplateJurisdiction({ city: 'Vancouver' })
  const bcResolution = resolveTemplateJurisdiction({ city: 'Burnaby' })

  assert.equal(ontarioResolution.status, 'dormant')
  assert.equal(ontarioResolution.slug, null)
  assert.equal(ontarioResolution.allowTemplateFallback, false)
  assert.equal(vancouverResolution.status, 'active')
  assert.equal(vancouverResolution.slug, 'vbbl_2025')
  assert.equal(bcResolution.status, 'active')
  assert.equal(bcResolution.slug, 'bcbc_2024')
})
