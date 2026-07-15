import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveRegulatoryAssertions } from './resolver'
import type {
  IsoDate,
  RegulatoryAssertion,
  RegulatorySource,
  RegulatorySourceLayer,
} from './types'

function source(
  id: string,
  layer: RegulatorySourceLayer,
  overrides: Partial<RegulatorySource> = {},
): RegulatorySource {
  return {
    id,
    layer,
    authority: { id: 'authority', name: 'Official Authority', jurisdictionId: 'jurisdiction' },
    title: `Source ${id}`,
    url: `https://example.gov/${id}`,
    family: 'test-family',
    jurisdictionId: 'jurisdiction',
    effectiveFrom: '2025-01-01',
    verificationStatus: 'verified',
    verifiedAt: '2025-01-02T00:00:00.000Z',
    verifiedBy: 'human-reviewer',
    publishedBy: 'official-publisher',
    contentOrigin: 'official',
    lifecycle: 'active',
    ...overrides,
  }
}

function assertion<T>(id: string, ruleKey: string, value: T, regulatorySource: RegulatorySource): RegulatoryAssertion<T> {
  return { id, ruleKey, value, source: regulatorySource }
}

test('uses deterministic source-layer precedence when verified sources agree', () => {
  const layers: RegulatorySourceLayer[] = [
    'vero_best_practice',
    'local_procedure',
    'local_amendment',
    'code',
    'adopted_rule',
    'statute',
    'project_requirement',
  ]
  const assertions = layers.map(layer => assertion(layer, 'inspection-window', 10, source(layer, layer)))

  const result = resolveRegulatoryAssertions(assertions, '2025-06-01')

  assert.equal(result.status, 'resolved')
  assert.equal(result.selected.length, 1)
  assert.equal(result.selected[0].source.layer, 'statute')
  assert.equal(result.authorityFacingAllowed, true)
})

test('treats effectiveFrom as inclusive and effectiveTo as exclusive', () => {
  const dated = assertion('dated', 'form', 'A', source('dated', 'adopted_rule', {
    effectiveFrom: '2025-02-01',
    effectiveTo: '2025-03-01',
  }))

  assert.equal(resolveRegulatoryAssertions([dated], '2025-01-31').rejected[0].reason, 'not_yet_effective')
  assert.equal(resolveRegulatoryAssertions([dated], '2025-02-01').status, 'resolved')
  assert.equal(resolveRegulatoryAssertions([dated], '2025-02-28').status, 'resolved')
  assert.equal(resolveRegulatoryAssertions([dated], '2025-03-01').rejected[0].reason, 'no_longer_effective')
})

test('rejects superseded sources from new authority-facing resolution', () => {
  const superseded = assertion('old', 'form', 'old', source('old', 'adopted_rule', {
    lifecycle: 'superseded',
    supersededBySourceId: 'new',
  }))

  const result = resolveRegulatoryAssertions([superseded], '2025-06-01')

  assert.equal(result.status, 'blocked')
  assert.equal(result.authorityFacingAllowed, false)
  assert.equal(result.rejected[0].reason, 'superseded')
})

test('reports contradictory active sources as a conflict instead of silently merging', () => {
  const result = resolveRegulatoryAssertions([
    assertion('code-value', 'required-setback', 10, source('code', 'code')),
    assertion('amendment-value', 'required-setback', 12, source('amendment', 'local_amendment')),
  ], '2025-06-01')

  assert.equal(result.status, 'conflict')
  assert.equal(result.authorityFacingAllowed, false)
  assert.equal(result.selected.length, 0)
  assert.deepEqual(result.conflicts[0].sourceIds, ['amendment', 'code'])
})

test('unverified and AI-drafted assertions cannot publish automatically', () => {
  const asOf: IsoDate = '2025-06-01'
  const result = resolveRegulatoryAssertions([
    assertion('unverified', 'rule-a', true, source('unverified', 'local_procedure', {
      verificationStatus: 'unverified',
    })),
    assertion('ai', 'rule-b', true, source('ai', 'vero_best_practice', {
      contentOrigin: 'ai_draft',
    })),
  ], asOf)

  assert.equal(result.status, 'blocked')
  assert.equal(result.authorityFacingAllowed, false)
  assert.deepEqual(result.rejected.map(item => item.reason).sort(), ['ai_draft', 'unverified'])
})
