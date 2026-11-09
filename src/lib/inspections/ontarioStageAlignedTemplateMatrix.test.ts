import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveTemplateJurisdiction } from './jurisdictionResolver'
import { getDormantOntarioSmallResidentialTemplateFoundation } from './ontarioSmallResidentialTemplateFoundation'
import {
  DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX,
  getDormantOntarioStageAlignedTemplateMatrix,
} from './ontarioStageAlignedTemplateMatrix'

const existingVeroStageIds = [
  'S01',
  'S02',
  'S03',
  'S04',
  'S05',
  'S06',
  'S07',
  'S08',
  'S09',
  'S10',
  'S11',
  'S12',
  'S13',
  'S14',
  'S15',
]

test('Ontario stage-aligned matrix is dormant and not publicly enabled', () => {
  const matrix = getDormantOntarioStageAlignedTemplateMatrix()

  assert.equal(matrix, DORMANT_ONTARIO_STAGE_ALIGNED_TEMPLATE_MATRIX)
  assert.equal(matrix.isActive, false)
  assert.equal(matrix.templatesActive, false)
  assert.equal(matrix.publicRoutingEnabled, false)
  assert.equal(matrix.dispatchEnabled, false)
  assert.equal(matrix.participatesInActiveDbResolution, false)
  assert.equal(matrix.checklistResponsesExpected, false)
  assert.equal(matrix.usesExistingVeroStageArchitecture, true)
})

test('Ontario stage matrix references existing Vero S01-S15 stages rather than a second workflow', () => {
  const matrix = getDormantOntarioStageAlignedTemplateMatrix()

  assert.deepEqual(
    matrix.stages.map(stage => stage.stageId),
    existingVeroStageIds,
  )
  assert.deepEqual(
    matrix.stages.map(stage => stage.stageNumber),
    Array.from({ length: 15 }, (_, index) => index + 1),
  )
  assert.ok(matrix.stages.every(stage => stage.stageTitle.length > 0))
})

test('Ontario stage matrix entries are draft planning only', () => {
  const matrix = getDormantOntarioStageAlignedTemplateMatrix()

  assert.ok(matrix.stages.every(stage => stage.status === 'draft_planned_dormant_requires_review'))
  assert.ok(matrix.stages.every(stage => stage.requiresReview === true))
  assert.ok(matrix.stages.every(stage => stage.isActive === false))
  assert.ok(matrix.stages.every(stage => stage.participatesInActiveResolution === false))
})

test('Ontario stage matrix only references dormant foundation categories', () => {
  const foundationCategoryIds = new Set(
    getDormantOntarioSmallResidentialTemplateFoundation().categories.map(category => category.id),
  )
  const matrix = getDormantOntarioStageAlignedTemplateMatrix()

  for (const stage of matrix.stages) {
    assert.ok(stage.foundationCategoryIds.length > 0)
    assert.ok(stage.foundationCategoryIds.every(categoryId => foundationCategoryIds.has(categoryId)))
  }
})

test('Ontario stage matrix includes requested discipline and closeout placeholders', () => {
  const matrix = getDormantOntarioStageAlignedTemplateMatrix()
  const byStage = new Map(matrix.stages.map(stage => [stage.stageId, stage]))

  assert.deepEqual(byStage.get('S09')?.foundationCategoryIds, ['plumbing-scope', 'obc-2024-small-residential-core'])
  assert.deepEqual(byStage.get('S10')?.foundationCategoryIds, [
    'electrical-authority-boundary',
    'obc-2024-small-residential-core',
  ])
  assert.deepEqual(byStage.get('S11')?.foundationCategoryIds, [
    'hvac-mechanical-scope',
    'obc-2024-small-residential-core',
  ])
  assert.deepEqual(byStage.get('S12')?.foundationCategoryIds, [
    'energy-efficiency-sb-12',
    'obc-2024-small-residential-core',
  ])
  assert.ok(byStage.get('S15')?.foundationCategoryIds.includes('final-inspection-occupancy-readiness'))
})

test('Ontario stage matrix does not participate in active DB template resolution', () => {
  const matrix = getDormantOntarioStageAlignedTemplateMatrix()
  const ontarioResolution = resolveTemplateJurisdiction({ city: 'Toronto', province: 'ON' })
  const vancouverResolution = resolveTemplateJurisdiction({ city: 'Vancouver' })
  const bcResolution = resolveTemplateJurisdiction({ city: 'Burnaby' })

  assert.equal(matrix.participatesInActiveDbResolution, false)
  assert.equal(ontarioResolution.status, 'dormant')
  assert.equal(ontarioResolution.slug, null)
  assert.equal(ontarioResolution.allowTemplateFallback, false)
  assert.equal(vancouverResolution.status, 'active')
  assert.equal(vancouverResolution.slug, 'vbbl_2025')
  assert.equal(bcResolution.status, 'active')
  assert.equal(bcResolution.slug, 'bcbc_2024')
})
