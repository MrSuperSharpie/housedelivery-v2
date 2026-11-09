import test from 'node:test'
import assert from 'node:assert/strict'

import { checkSpecialtyAccess } from './access'
import type { InspectorContext, InspectionStage } from './access'

type Ctx = Pick<InspectorContext, 'isAdmin' | 'isMasterInspector' | 'inspectorSpecialty'>
type Stage = Pick<InspectionStage, 'visibleToSpecialties' | 'requiresMasterSeal'>

const electricalStage: Stage = {
  visibleToSpecialties: ['electrical'],
  requiresMasterSeal: false,
}

const masterSealStage: Stage = {
  visibleToSpecialties: [],
  requiresMasterSeal: true,
}

const multiSpecialtyStage: Stage = {
  visibleToSpecialties: ['structural', 'geotechnical'],
  requiresMasterSeal: false,
}

test('admin bypasses specialty check on regular stage', () => {
  const ctx: Ctx = { isAdmin: true, isMasterInspector: false, inspectorSpecialty: null }
  assert.equal(checkSpecialtyAccess(ctx, electricalStage), true)
})

test('admin bypasses specialty check on master-seal stage', () => {
  const ctx: Ctx = { isAdmin: true, isMasterInspector: false, inspectorSpecialty: null }
  assert.equal(checkSpecialtyAccess(ctx, masterSealStage), true)
})

test('isMasterInspector bypasses specialty check', () => {
  const ctx: Ctx = { isAdmin: false, isMasterInspector: true, inspectorSpecialty: 'electrical' }
  assert.equal(checkSpecialtyAccess(ctx, masterSealStage), true)
})

test('non-admin is blocked from master-seal stage', () => {
  const ctx: Ctx = { isAdmin: false, isMasterInspector: false, inspectorSpecialty: 'electrical' }
  assert.equal(checkSpecialtyAccess(ctx, masterSealStage), false)
})

test('inspector with no specialty is blocked from specialty stage', () => {
  const ctx: Ctx = { isAdmin: false, isMasterInspector: false, inspectorSpecialty: null }
  assert.equal(checkSpecialtyAccess(ctx, electricalStage), false)
})

test('matching specialty grants access', () => {
  const ctx: Ctx = { isAdmin: false, isMasterInspector: false, inspectorSpecialty: 'electrical' }
  assert.equal(checkSpecialtyAccess(ctx, electricalStage), true)
})

test('mismatched specialty is blocked', () => {
  const ctx: Ctx = { isAdmin: false, isMasterInspector: false, inspectorSpecialty: 'plumbing' }
  assert.equal(checkSpecialtyAccess(ctx, electricalStage), false)
})

test('one of multiple specialties grants access', () => {
  const ctx: Ctx = { isAdmin: false, isMasterInspector: false, inspectorSpecialty: 'geotechnical' }
  assert.equal(checkSpecialtyAccess(ctx, multiSpecialtyStage), true)
})

test('specialty not in multi-specialty list is blocked', () => {
  const ctx: Ctx = { isAdmin: false, isMasterInspector: false, inspectorSpecialty: 'electrical' }
  assert.equal(checkSpecialtyAccess(ctx, multiSpecialtyStage), false)
})

// ── QA matrix: realistic stage configurations ─────────────────────────────
// Maps to the manual QA checklist:
//   Stage 8  = electrical-only
//   Stage 9  = plumbing-only
//   Stage 15 = master-seal required (all disciplines sign off)
//
// Lock-dependent scenarios (stage 15 blocked until 8+9 sealed) require
// a live database and must be verified via integration testing or manual QA.

const stage8: Stage = { visibleToSpecialties: ['electrical'], requiresMasterSeal: false }
const stage9: Stage = { visibleToSpecialties: ['plumbing'], requiresMasterSeal: false }
const stage15: Stage = { visibleToSpecialties: [], requiresMasterSeal: true }

test('electrical inspector can seal stage 8', () => {
  const ctx: Ctx = { isAdmin: false, isMasterInspector: false, inspectorSpecialty: 'electrical' }
  assert.equal(checkSpecialtyAccess(ctx, stage8), true)
})

test('electrical inspector cannot seal stage 9', () => {
  const ctx: Ctx = { isAdmin: false, isMasterInspector: false, inspectorSpecialty: 'electrical' }
  assert.equal(checkSpecialtyAccess(ctx, stage9), false)
})

test('plumbing inspector can seal stage 9', () => {
  const ctx: Ctx = { isAdmin: false, isMasterInspector: false, inspectorSpecialty: 'plumbing' }
  assert.equal(checkSpecialtyAccess(ctx, stage9), true)
})

test('plumbing inspector cannot seal stage 8', () => {
  const ctx: Ctx = { isAdmin: false, isMasterInspector: false, inspectorSpecialty: 'plumbing' }
  assert.equal(checkSpecialtyAccess(ctx, stage8), false)
})

test('master inspector can seal stage 15', () => {
  const ctx: Ctx = { isAdmin: false, isMasterInspector: true, inspectorSpecialty: 'electrical' }
  assert.equal(checkSpecialtyAccess(ctx, stage15), true)
})

test('non-master electrical inspector cannot seal stage 15', () => {
  const ctx: Ctx = { isAdmin: false, isMasterInspector: false, inspectorSpecialty: 'electrical' }
  assert.equal(checkSpecialtyAccess(ctx, stage15), false)
})

test('admin can seal stage 15', () => {
  const ctx: Ctx = { isAdmin: true, isMasterInspector: false, inspectorSpecialty: null }
  assert.equal(checkSpecialtyAccess(ctx, stage15), true)
})
