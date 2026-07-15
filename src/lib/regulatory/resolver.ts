import type {
  IsoDate,
  RegulatoryAssertion,
  RegulatorySource,
  RegulatorySourceLayer,
} from './types'

const LAYER_PRECEDENCE: Record<RegulatorySourceLayer, number> = {
  statute: 0,
  adopted_rule: 1,
  code: 2,
  local_amendment: 3,
  local_procedure: 4,
  project_requirement: 5,
  vero_best_practice: 6,
}

export type RegulatoryRejectionReason =
  | 'not_yet_effective'
  | 'no_longer_effective'
  | 'superseded'
  | 'withdrawn'
  | 'unverified'
  | 'stale'
  | 'source_conflict'
  | 'ai_draft'
  | 'missing_human_attribution'

export interface RejectedRegulatoryAssertion<T> {
  assertion: RegulatoryAssertion<T>
  reason: RegulatoryRejectionReason
}

export interface RegulatoryConflict<T> {
  ruleKey: string
  assertionIds: string[]
  sourceIds: string[]
  values: T[]
}

export interface RegulatoryResolution<T> {
  status: 'resolved' | 'blocked' | 'conflict'
  authorityFacingAllowed: boolean
  selected: RegulatoryAssertion<T>[]
  rejected: Array<RejectedRegulatoryAssertion<T>>
  conflicts: Array<RegulatoryConflict<T>>
}

function rejectionReason(source: RegulatorySource, asOf: IsoDate): RegulatoryRejectionReason | null {
  if (source.lifecycle === 'superseded') return 'superseded'
  if (source.lifecycle === 'withdrawn') return 'withdrawn'
  if (source.contentOrigin === 'ai_draft') return 'ai_draft'
  if (source.verificationStatus === 'unverified') return 'unverified'
  if (source.verificationStatus === 'stale') return 'stale'
  if (source.verificationStatus === 'conflict') return 'source_conflict'
  if (!source.verifiedBy || !source.verifiedAt || !source.publishedBy) return 'missing_human_attribution'
  if (asOf < source.effectiveFrom) return 'not_yet_effective'
  if (source.effectiveTo && asOf >= source.effectiveTo) return 'no_longer_effective'
  return null
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

/**
 * Resolves verified assertions at an explicit project-relevant date. Contradictory
 * active assertions are never silently layered; authority-facing use fails closed.
 */
export function resolveRegulatoryAssertions<T>(
  assertions: Array<RegulatoryAssertion<T>>,
  asOf: IsoDate,
): RegulatoryResolution<T> {
  const rejected: Array<RejectedRegulatoryAssertion<T>> = []
  const eligible: Array<RegulatoryAssertion<T>> = []

  for (const assertion of assertions) {
    const reason = rejectionReason(assertion.source, asOf)
    if (reason) rejected.push({ assertion, reason })
    else eligible.push(assertion)
  }

  const byRule = new Map<string, Array<RegulatoryAssertion<T>>>()
  for (const assertion of eligible) {
    const values = byRule.get(assertion.ruleKey) ?? []
    values.push(assertion)
    byRule.set(assertion.ruleKey, values)
  }

  const selected: Array<RegulatoryAssertion<T>> = []
  const conflicts: Array<RegulatoryConflict<T>> = []

  for (const [ruleKey, candidates] of byRule) {
    const first = candidates[0]
    const contradicts = candidates.some(candidate => !sameValue(candidate.value, first.value))
    if (contradicts) {
      conflicts.push({
        ruleKey,
        assertionIds: candidates.map(candidate => candidate.id).sort(),
        sourceIds: candidates.map(candidate => candidate.source.id).sort(),
        values: candidates.map(candidate => candidate.value),
      })
      continue
    }

    selected.push([...candidates].sort((left, right) => {
      const layerDifference = LAYER_PRECEDENCE[left.source.layer] - LAYER_PRECEDENCE[right.source.layer]
      if (layerDifference !== 0) return layerDifference
      const effectiveDifference = right.source.effectiveFrom.localeCompare(left.source.effectiveFrom)
      if (effectiveDifference !== 0) return effectiveDifference
      return left.source.id.localeCompare(right.source.id)
    })[0])
  }

  selected.sort((left, right) => left.ruleKey.localeCompare(right.ruleKey))

  if (conflicts.length > 0) {
    return { status: 'conflict', authorityFacingAllowed: false, selected, rejected, conflicts }
  }

  if (selected.length === 0) {
    return { status: 'blocked', authorityFacingAllowed: false, selected, rejected, conflicts }
  }

  return { status: 'resolved', authorityFacingAllowed: true, selected, rejected, conflicts }
}
