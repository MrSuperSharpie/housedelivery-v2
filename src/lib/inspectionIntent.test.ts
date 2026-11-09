import test from 'node:test'
import assert from 'node:assert/strict'
import {
  INSPECTION_INTENT_OPTIONS,
  NOT_SURE_DISAMBIGUATION,
  resolveIntentToStageDiscipline,
  getInspectionIntentOption,
  getNotSureBucketOption,
} from './inspections/inspectionIntent'

// Existing DispatchModal DISCIPLINES ids — every intent discipline must be one
// of these so the advanced override step highlights the matching card.
const VALID_DISCIPLINES = new Set([
  'structural', 'geotech', 'mechanical', 'electrical', 'plumbing', 'architectural', 'fire_protection',
])

// Expected mapping per the confirmed product decisions.
const EXPECTED: Record<string, { stage: number; discipline: string; confidence: string }> = {
  site_excavation:               { stage: 1, discipline: 'geotech',         confidence: 'high' },
  foundation:                    { stage: 2, discipline: 'structural',      confidence: 'high' },
  framing:                       { stage: 3, discipline: 'structural',      confidence: 'high' },
  plumbing:                      { stage: 3, discipline: 'plumbing',        confidence: 'high' },
  electrical:                    { stage: 3, discipline: 'electrical',      confidence: 'high' },
  mechanical_hvac:               { stage: 3, discipline: 'mechanical',      confidence: 'high' },
  fire_rough_in:                 { stage: 3, discipline: 'fire_protection', confidence: 'high' },
  fire_alarm_sprinkler_testing:  { stage: 3, discipline: 'fire_protection', confidence: 'medium' },
  insulation_energy:             { stage: 4, discipline: 'architectural',   confidence: 'high' },
  interior_completion:           { stage: 5, discipline: 'architectural',   confidence: 'high' },
  final_life_safety_occupancy:   { stage: 7, discipline: 'architectural',   confidence: 'high' },
  not_sure:                      { stage: 3, discipline: 'structural',      confidence: 'low' },
}

test('all twelve confirmed builder-facing options are present in order coverage', () => {
  const ids = INSPECTION_INTENT_OPTIONS.map(o => o.id)
  assert.equal(ids.length, 12, 'must expose exactly the 12 confirmed options')
  for (const id of Object.keys(EXPECTED)) {
    assert.ok(ids.includes(id), `missing intent option: ${id}`)
  }
})

test('each option maps to the confirmed builder stage, discipline, and confidence', () => {
  for (const [id, exp] of Object.entries(EXPECTED)) {
    const resolved = resolveIntentToStageDiscipline(id)
    assert.equal(resolved.builderStage, exp.stage, `${id} stage`)
    assert.equal(resolved.discipline, exp.discipline, `${id} discipline`)
    assert.equal(resolved.confidence, exp.confidence, `${id} confidence`)
  }
})

test('every option resolves to a valid, non-null stage (1-7) and known discipline', () => {
  for (const option of INSPECTION_INTENT_OPTIONS) {
    assert.ok(
      Number.isInteger(option.builderStage) && option.builderStage >= 1 && option.builderStage <= 7,
      `${option.id} must map to a builder stage in 1-7`,
    )
    assert.ok(VALID_DISCIPLINES.has(option.discipline), `${option.id} discipline must be a known DISCIPLINES id`)
    assert.ok(option.label.trim().length > 0, `${option.id} must have a plain-language label`)
    assert.ok(option.helperText.trim().length > 0, `${option.id} must have helper text`)
  }
})

test('Not Sure never resolves to a null stage or null discipline', () => {
  const resolved = resolveIntentToStageDiscipline('not_sure')
  assert.ok(resolved.builderStage != null && Number.isInteger(resolved.builderStage), 'Not Sure stage must be concrete')
  assert.ok(typeof resolved.discipline === 'string' && resolved.discipline.length > 0, 'Not Sure discipline must be concrete')
  assert.equal(resolved.confidence, 'low')
})

test('unknown / null intent ids fall back to a safe non-null default', () => {
  for (const bad of ['', 'does_not_exist', null, undefined] as Array<string | null | undefined>) {
    const resolved = resolveIntentToStageDiscipline(bad)
    assert.ok(
      Number.isInteger(resolved.builderStage) && resolved.builderStage >= 1 && resolved.builderStage <= 7,
      'fallback stage must be valid',
    )
    assert.ok(VALID_DISCIPLINES.has(resolved.discipline), 'fallback discipline must be known')
  }
})

test('Not Sure follow-up offers the six plain-language buckets with separate trades', () => {
  const ids = NOT_SURE_DISAMBIGUATION.map(o => o.id)
  assert.equal(ids.length, 6, 'must offer exactly six Not Sure buckets')
  assert.deepEqual(ids, [
    'unsure_structure_site',
    'unsure_plumbing',
    'unsure_electrical',
    'unsure_mechanical_hvac',
    'unsure_fire_life_safety',
    'unsure_final_occupancy',
  ])
})

test('Not Sure trade buckets each map to their own discipline (no broad plumbing default)', () => {
  const expected: Record<string, { stage: number; discipline: string }> = {
    unsure_structure_site:   { stage: 3, discipline: 'structural' },
    unsure_plumbing:         { stage: 3, discipline: 'plumbing' },
    unsure_electrical:       { stage: 3, discipline: 'electrical' },
    unsure_mechanical_hvac:  { stage: 3, discipline: 'mechanical' },
    unsure_fire_life_safety: { stage: 3, discipline: 'fire_protection' },
    unsure_final_occupancy:  { stage: 7, discipline: 'architectural' },
  }
  for (const [id, exp] of Object.entries(expected)) {
    const resolved = resolveIntentToStageDiscipline(id)
    assert.equal(resolved.builderStage, exp.stage, `${id} stage`)
    assert.equal(resolved.discipline, exp.discipline, `${id} discipline`)
    assert.equal(resolved.confidence, 'low', `${id} confidence`)
  }
})

test('every Not Sure bucket maps to a valid non-null stage + discipline at low confidence', () => {
  for (const bucket of NOT_SURE_DISAMBIGUATION) {
    assert.ok(
      Number.isInteger(bucket.builderStage) && bucket.builderStage >= 1 && bucket.builderStage <= 7,
      `${bucket.id} must map to a builder stage in 1-7`,
    )
    assert.ok(VALID_DISCIPLINES.has(bucket.discipline), `${bucket.id} discipline must be a known DISCIPLINES id`)
    assert.equal(bucket.confidence, 'low', `${bucket.id} must stay low confidence`)
    assert.ok(bucket.label.trim().length > 0, `${bucket.id} must have a plain-language label`)

    // Resolvable through the shared resolver with non-null values.
    const resolved = resolveIntentToStageDiscipline(bucket.id)
    assert.equal(resolved.builderStage, bucket.builderStage)
    assert.equal(resolved.discipline, bucket.discipline)
    assert.equal(resolved.confidence, 'low')
    assert.ok(getNotSureBucketOption(bucket.id), `${bucket.id} must be retrievable`)
  }
})

test('Not Sure buckets never expose stage numbers or disciplines in their labels', () => {
  for (const bucket of NOT_SURE_DISAMBIGUATION) {
    assert.ok(!/stage\s*\d/i.test(bucket.label), `${bucket.id} label must not contain a stage number`)
  }
})

test('fire-related work is separated into three distinct options', () => {
  const fireRoughIn = getInspectionIntentOption('fire_rough_in')
  const fireTesting = getInspectionIntentOption('fire_alarm_sprinkler_testing')
  const finalLifeSafety = getInspectionIntentOption('final_life_safety_occupancy')

  assert.ok(fireRoughIn && fireTesting && finalLifeSafety, 'all three fire/life-safety options must exist')
  // Rough-in and testing both route to the fire discipline / stage 3 (resolves
  // to S08 via the existing stage-3 override); testing stays medium confidence.
  assert.equal(fireRoughIn!.discipline, 'fire_protection')
  assert.equal(fireTesting!.discipline, 'fire_protection')
  assert.equal(fireTesting!.confidence, 'medium')
  // Final life safety is the occupancy-readiness stage (7), not a rough-in.
  assert.equal(finalLifeSafety!.builderStage, 7)
  assert.notEqual(finalLifeSafety!.builderStage, fireRoughIn!.builderStage)
})
