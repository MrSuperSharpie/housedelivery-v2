import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCompletionChecklist } from './inspectorCompletion'
import {
  EVIDENCE_CLASSES,
  EVIDENCE_TYPES,
  INSPECTION_EVIDENCE_POLICY,
  INSPECTION_EVIDENCE_POLICY_BY_CODE,
  LAUNCH_PRIORITIES,
  SYSTEM_STATE_EVIDENCE_CONTROLS,
  UNIVERSAL_OUTCOME_NOTE_RULE,
} from './inspectionEvidencePolicy'

const activeChecklist = buildCompletionChecklist({
  city: 'Vancouver',
  region: 'vancouver',
  projectType: 'General building permit',
})

const activeItems = activeChecklist.stages.flatMap(stage =>
  stage.items.map(item => ({
    stageId: `S${String(stage.stage_number).padStart(2, '0')}`,
    itemCode: item.item_code,
    itemLabel: item.item_label,
  })),
)

test('every active completion checklist row has a reconciled evidence policy entry', () => {
  assert.equal(INSPECTION_EVIDENCE_POLICY.length, activeItems.length)

  const missing = activeItems
    .filter(item => !INSPECTION_EVIDENCE_POLICY_BY_CODE.has(item.itemCode))
    .map(item => item.itemCode)

  assert.deepEqual(missing, [])
})

test('evidence policy entries match current active checklist row labels', () => {
  const activeByCode = new Map(activeItems.map(item => [item.itemCode, item]))

  for (const entry of INSPECTION_EVIDENCE_POLICY) {
    const active = activeByCode.get(entry.itemCode)
    assert.ok(active, `${entry.itemCode} must exist in the active checklist`)
    assert.equal(entry.stageId, active.stageId)
    assert.equal(entry.itemLabel, active.itemLabel)
  }
})

test('evidence policy uses only allowed evidence classes, evidence types, and launch priorities', () => {
  const classes = new Set(EVIDENCE_CLASSES)
  const types = new Set(EVIDENCE_TYPES)
  const priorities = new Set(LAUNCH_PRIORITIES)

  for (const entry of INSPECTION_EVIDENCE_POLICY) {
    assert.ok(classes.has(entry.reconciledClass), `${entry.itemCode} has invalid reconciled class`)
    assert.ok(priorities.has(entry.launchPriority), `${entry.itemCode} has invalid launch priority`)

    for (const proClass of entry.proMatrixClasses) {
      assert.ok(classes.has(proClass), `${entry.itemCode} has invalid Pro matrix class`)
    }

    for (const evidenceType of entry.evidenceTypes) {
      assert.ok(types.has(evidenceType), `${entry.itemCode} has invalid evidence type ${evidenceType}`)
    }

    if (entry.reconciledClass === 'F') {
      assert.deepEqual(entry.evidenceTypes, [], `${entry.itemCode} class F entries must not require evidence types`)
    }
  }
})

test('S15.1 prerequisite specialty-stage seal remains system-state logic, not upload-driven evidence', () => {
  const sealControl = SYSTEM_STATE_EVIDENCE_CONTROLS.find(control => control.id === 'S15.1')

  assert.ok(sealControl, 'S15.1 must be documented as a system-state control')
  assert.equal(sealControl.evidenceClass, 'F')
  assert.equal(sealControl.uploadDriven, false)
  assert.equal(
    INSPECTION_EVIDENCE_POLICY.some(entry => entry.itemCode === 'S15.1'),
    false,
    'S15.1 must not appear as an upload-driven active checklist evidence row',
  )
})

test('S10-S13 policy uses the current corrected active rows instead of stale Pro packet mismatch labels', () => {
  const expectedLabels = new Map([
    [
      'S10',
      [
        'Electrical Permit and Service Readiness',
        'Branch Circuit Rough-In',
        'Life Safety, Specialty Circuits, and Pre-Test Readiness',
        'Electrical Inspection and Documentation Closeout',
      ],
    ],
    [
      'S11',
      [
        'Mechanical Permit and Equipment Rough-In',
        'Gas Piping, Venting, and Combustion',
        'Ventilation, Exhaust, Duct Coordination, and Fire Assembly Coordination',
        'Mechanical and Gas Inspection Closeout',
      ],
    ],
    [
      'S12',
      [
        'Thermal Insulation and Continuity',
        'Air Barrier, Vapour Control, and Penetrations',
        'Energy Documentation and Compliance Path',
        'Insulation Inspection and Energy Closeout',
      ],
    ],
    [
      'S13',
      [
        'Fire Separation, Rated Assemblies, and Sound Separation',
        'Interior Wall Substrate, Wet-Area, and Concealed Backing',
        'Interior Life Safety and Egress Readiness',
        'Interior Finishes and Systems Trim',
        'Accessibility, Adaptable Housing, and Interior Closeout',
      ],
    ],
  ])

  for (const [stageId, labels] of expectedLabels) {
    const actualLabels = INSPECTION_EVIDENCE_POLICY
      .filter(entry => entry.stageId === stageId)
      .map(entry => entry.itemLabel)

    assert.deepEqual(actualLabels, labels)
  }

  const activeLabels = INSPECTION_EVIDENCE_POLICY.map(entry => entry.itemLabel)
  assert.equal(activeLabels.includes('Building enclosure design and performance confirmed'), false)
  assert.equal(activeLabels.includes('Insulation R-values meet energy code requirements'), false)
  assert.equal(activeLabels.includes('Fire-rated assemblies correctly constructed'), false)
})

test('no row is assigned evidence merely because a checklist row exists', () => {
  for (const entry of INSPECTION_EVIDENCE_POLICY) {
    assert.ok(entry.sourceMatrixRows.length > 0, `${entry.itemCode} must cite source matrix basis`)
    assert.ok(entry.reason.length > 30, `${entry.itemCode} must include a specific reconciliation reason`)
    assert.doesNotMatch(entry.reason, /assigned .*because .*row exists|required .*because .*row exists/i)
  }
})

test('universal exception outcomes require at least field-note support', () => {
  assert.equal(UNIVERSAL_OUTCOME_NOTE_RULE.correctionsRequired, 'field note')
  assert.equal(UNIVERSAL_OUTCOME_NOTE_RULE.holdCannotProceed, 'field note')
  assert.equal(UNIVERSAL_OUTCOME_NOTE_RULE.notApplicable, 'field note')
})
