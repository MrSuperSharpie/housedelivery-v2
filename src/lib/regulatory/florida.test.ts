import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCompletionChecklist } from '../inspectorCompletion'
import {
  FLORIDA_CODE_EDITIONS,
  FLORIDA_PHASE_1A_ENABLED,
  evaluateFloridaFormUse,
  evaluateFloridaProviderAuthorization,
  evaluateFloridaSupportedScope,
  resolveFloridaCodeEdition,
  resolveFloridaPilotAhj,
} from './florida'
import type { FloridaProviderAuthorizationInput } from './florida'
import { resolveTemplateJurisdiction } from '../inspections/jurisdictionResolver'

test('Florida edition resolver uses project facts and preserves vested open permits', () => {
  assert.equal(resolveFloridaCodeEdition({
    applicationDate: '2026-12-30',
    permitStatus: 'application',
  }).edition, FLORIDA_CODE_EDITIONS.eighth.id)

  assert.equal(resolveFloridaCodeEdition({
    applicationDate: '2026-12-31',
    permitStatus: 'application',
  }).edition, FLORIDA_CODE_EDITIONS.ninth.id)

  const vested = resolveFloridaCodeEdition({
    applicationDate: '2027-02-01',
    permitStatus: 'issued_open',
    vestedEdition: FLORIDA_CODE_EDITIONS.eighth.id,
    vestingConfirmed: true,
  })
  assert.equal(vested.status, 'resolved')
  assert.equal(vested.edition, FLORIDA_CODE_EDITIONS.eighth.id)
})

test('current date alone cannot determine an edition and incomplete vesting requires review', () => {
  assert.deepEqual(resolveFloridaCodeEdition({}), {
    status: 'blocked',
    edition: null,
    reason: 'Application, permit, or confirmed vesting facts are required; current date alone cannot select an edition.',
  })

  const incomplete = resolveFloridaCodeEdition({
    permitStatus: 'issued_open',
    vestedEdition: FLORIDA_CODE_EDITIONS.eighth.id,
  })
  assert.equal(incomplete.status, 'review_required')
  assert.equal(incomplete.edition, null)
})

test('Florida form policy limits authority-facing use to effective verified forms', () => {
  const base = {
    id: 'form',
    verificationStatus: 'verified' as const,
    contentOrigin: 'official' as const,
    verifiedBy: 'reviewer',
    publishedBy: 'authority',
  }

  assert.equal(evaluateFloridaFormUse({
    ...base,
    status: 'adopted_effective',
    effectiveFrom: '2025-01-01',
  }, '2025-06-01').authorityFacingAllowed, true)

  const future = evaluateFloridaFormUse({ ...base, status: 'adopted_future' }, '2025-06-01')
  assert.equal(future.authorityFacingAllowed, false)
  assert.equal(future.previewAllowed, true)

  const draft = evaluateFloridaFormUse({
    ...base,
    status: 'draft_proposed',
    contentOrigin: 'ai_draft',
    verificationStatus: 'unverified',
  }, '2025-06-01')
  assert.equal(draft.authorityFacingAllowed, false)
  assert.equal(draft.previewAllowed, true)

  const legacy = evaluateFloridaFormUse({ ...base, status: 'local_legacy' }, '2025-06-01')
  assert.equal(legacy.reviewRequired, true)
  assert.equal(legacy.authorityFacingAllowed, false)

  const superseded = evaluateFloridaFormUse({ ...base, status: 'superseded' }, '2025-06-01')
  assert.equal(superseded.historicalOnly, true)
  assert.equal(superseded.authorityFacingAllowed, false)
})

test('pilot AHJs resolve without enabling Florida routing', () => {
  assert.equal(resolveFloridaPilotAhj({ county: 'Indian River County' })?.id, 'fl-indian-river-county')
  assert.equal(resolveFloridaPilotAhj({ city: 'Vero Beach', county: 'Indian River County' })?.id, 'fl-vero-beach')
  assert.equal(resolveFloridaPilotAhj({ county: 'Pinellas County' })?.id, 'fl-pinellas-county')
  assert.equal(resolveFloridaPilotAhj({ county: 'Seminole County' })?.id, 'fl-seminole-county')
  assert.equal(FLORIDA_PHASE_1A_ENABLED, false)
  assert.equal(evaluateFloridaSupportedScope({
    county: 'Pinellas County',
    projectScope: 'conventional_residential',
    thresholdBuilding: 'no',
  }).scopeEligible, true)
})

test('supported-scope controls fail closed for exclusions and uncertain scope', () => {
  const evaluate = (overrides: Partial<Parameters<typeof evaluateFloridaSupportedScope>[0]> = {}) =>
    evaluateFloridaSupportedScope({
      county: 'Pinellas County',
      projectScope: 'small_commercial',
      thresholdBuilding: 'no',
      ...overrides,
    })

  assert.equal(evaluate().status, 'blocked')
  assert.equal(evaluate().scopeEligible, true)
  assert.ok(evaluate({ county: 'Orange County' }).blockers.includes('unsupported_ahj'))
  assert.ok(evaluate({ county: 'Miami-Dade County' }).blockers.includes('miami_dade_hvhz_excluded'))
  assert.ok(evaluate({ county: 'Broward County' }).blockers.includes('broward_hvhz_excluded'))
  assert.ok(evaluate({ thresholdBuilding: 'yes' }).blockers.includes('threshold_building_excluded'))
  assert.equal(evaluate({ thresholdBuilding: 'review' }).status, 'review_required')
  assert.ok(evaluate({ projectScope: 'specialty' }).blockers.includes('unsupported_specialty_scope'))
  assert.equal(evaluate({ projectScope: 'ambiguous' }).status, 'review_required')
})

function qualifiedProvider(): FloridaProviderAuthorizationInput {
  return {
    asOf: '2026-06-01',
    providerOfRecord: { present: true, active: true, serviceScope: 'both' },
    requestedService: 'inspections',
    ownerAuthorization: { required: true, present: true },
    professional: {
      category: 'professional_engineer',
      licenceActive: true,
      licensedDisciplines: ['structural'],
      requiredDiscipline: 'structural',
    },
    representative: { role: 'provider' },
    insurance: { verified: true, expiresOn: '2027-01-01' },
    ahjRegistration: { required: true, verified: true },
    conflictScreening: 'passed',
  }
}

test('provider authorization fails closed for every required control', () => {
  const cases: Array<[
    string,
    (input: FloridaProviderAuthorizationInput) => void,
  ]> = [
    ['provider_of_record_missing', input => { input.providerOfRecord.present = false }],
    ['professional_category_ineligible', input => { input.professional.category = 'home_inspector' }],
    ['discipline_mismatch', input => { input.professional.licensedDisciplines = ['electrical'] }],
    ['dar_employment_unverified', input => {
      input.representative = {
        role: 'duly_authorized_representative',
        employmentVerified: false,
        providerAuthorizationVerified: true,
      }
    }],
    ['dar_provider_authorization_unverified', input => {
      input.representative = {
        role: 'duly_authorized_representative',
        employmentVerified: true,
        providerAuthorizationVerified: false,
      }
    }],
    ['insurance_expired', input => { input.insurance.expiresOn = '2026-05-31' }],
    ['ahj_registration_missing', input => { input.ahjRegistration.verified = false }],
    ['conflict_screening_failed', input => { input.conflictScreening = 'failed' }],
  ]

  for (const [expectedBlocker, mutate] of cases) {
    const input = qualifiedProvider()
    mutate(input)
    const result = evaluateFloridaProviderAuthorization(input)
    assert.equal(result.authorized, false)
    assert.ok(result.blockers.includes(expectedBlocker as typeof result.blockers[number]))
  }

  const authorized = evaluateFloridaProviderAuthorization(qualifiedProvider())
  assert.equal(authorized.status, 'authorized')
  assert.equal(authorized.authorized, true)
  assert.deepEqual(authorized.blockers, [])
  assert.equal(authorized.platformRole, 'technology_and_workflow_only')
})

test('BC/Vancouver resolution and canonical 15-stage output remain unchanged', () => {
  assert.equal(resolveTemplateJurisdiction({ city: 'Vancouver' }).slug, 'vbbl_2025')
  assert.equal(resolveTemplateJurisdiction({ city: 'Burnaby' }).slug, 'bcbc_2024')

  const context = { city: 'Vancouver', address: '123 Main Street' }
  const existing = buildCompletionChecklist(context)
  const withFloridaBridge = buildCompletionChecklist({
    ...context,
    regulatoryProfile: {
      jurisdictionId: 'fl-pinellas-county',
      adapterId: 'fl-pinellas-county-adapter-v1-draft',
      codeFamily: 'Florida Building Code',
      codeEdition: FLORIDA_CODE_EDITIONS.eighth.id,
      status: 'blocked',
      authorityFacingAllowed: false,
      reasons: ['florida_feature_disabled'],
    },
  })

  assert.equal(existing.stages.length, 15)
  assert.equal(existing.stages.reduce((count, stage) => count + stage.items.length, 0), 62)
  assert.equal(existing.stages.reduce(
    (count, stage) => count + stage.items.filter(item => item.is_required === true).length,
    0,
  ), 53)
  assert.deepEqual(withFloridaBridge, existing)
})
