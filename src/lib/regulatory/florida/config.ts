import type { AhjAdapter, RegulatoryJurisdiction } from '../types'

export const FLORIDA_PHASE_1A_ENABLED = false as const

export type FloridaPilotAhjId =
  | 'fl-indian-river-county'
  | 'fl-vero-beach'
  | 'fl-pinellas-county'
  | 'fl-seminole-county'

export interface FloridaPilotAhj {
  id: FloridaPilotAhjId
  aliases: string[]
  jurisdiction: RegulatoryJurisdiction
  adapter: AhjAdapter
}

function pilotAhj(
  id: FloridaPilotAhjId,
  name: string,
  level: 'county' | 'municipality',
  aliases: string[],
  parentJurisdictionId = 'us-florida',
): FloridaPilotAhj {
  return {
    id,
    aliases,
    jurisdiction: {
      id,
      name,
      level,
      parentJurisdictionId,
      countryCode: 'US',
      subdivisionCode: 'US-FL',
    },
    adapter: {
      id: `${id}-adapter-v1-draft`,
      jurisdictionId: id,
      version: '1.0.0-draft',
      effectiveFrom: '2023-12-31',
      buildingAuthorityId: `${id}-building-authority`,
      fireAuthorityId: `${id}-fire-authority`,
      floodAuthorityId: `${id}-flood-authority`,
      metadata: {
        registration: { required: true },
        submission: { methods: ['portal', 'email'] },
      },
      sourceIds: [],
      verificationStatus: 'unverified',
      publicRoutingEnabled: false,
    },
  }
}

export const FLORIDA_PILOT_AHJS: readonly FloridaPilotAhj[] = [
  pilotAhj(
    'fl-indian-river-county',
    'Indian River County',
    'county',
    ['indian river', 'indian river county'],
  ),
  pilotAhj(
    'fl-vero-beach',
    'City of Vero Beach',
    'municipality',
    ['vero beach', 'city of vero beach'],
    'fl-indian-river-county',
  ),
  pilotAhj(
    'fl-pinellas-county',
    'Pinellas County',
    'county',
    ['pinellas', 'pinellas county'],
  ),
  pilotAhj(
    'fl-seminole-county',
    'Seminole County',
    'county',
    ['seminole', 'seminole county'],
  ),
] as const

export type FloridaProjectScope =
  | 'conventional_residential'
  | 'small_commercial'
  | 'specialty'
  | 'ambiguous'

export interface FloridaSupportedScopeInput {
  city?: string
  county?: string
  projectScope: FloridaProjectScope
  thresholdBuilding: 'no' | 'yes' | 'review'
}

export interface FloridaSupportedScopeResult {
  status: 'supported' | 'blocked' | 'review_required'
  scopeEligible: boolean
  ahj: FloridaPilotAhj | null
  blockers: string[]
  publicRoutingEnabled: false
}

function normalize(value?: string): string {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ') ?? ''
}

function containsAlias(value: string, alias: string): boolean {
  return value === alias || value.includes(` ${alias} `) || value.startsWith(`${alias} `) || value.endsWith(` ${alias}`)
}

export function resolveFloridaPilotAhj(input: { city?: string; county?: string }): FloridaPilotAhj | null {
  const city = normalize(input.city)
  const county = normalize(input.county)
  const cityMatch = FLORIDA_PILOT_AHJS.find(ahj => {
    const aliases = ahj.aliases.map(normalize)
    return aliases.some(alias => containsAlias(city, alias))
  })
  if (cityMatch) return cityMatch

  return FLORIDA_PILOT_AHJS.find(ahj =>
    ahj.aliases.map(normalize).some(alias => containsAlias(county, alias))) ?? null
}

export function evaluateFloridaSupportedScope(
  input: FloridaSupportedScopeInput,
): FloridaSupportedScopeResult {
  const location = normalize(`${input.city ?? ''} ${input.county ?? ''}`)
  const ahj = resolveFloridaPilotAhj(input)
  const blockers: string[] = []

  if (!FLORIDA_PHASE_1A_ENABLED) blockers.push('florida_feature_disabled')
  if (location.includes('miami dade') || location.includes('miami-dade')) {
    blockers.push('miami_dade_hvhz_excluded')
  }
  if (location.includes('broward')) blockers.push('broward_hvhz_excluded')
  if (!ahj) blockers.push('unsupported_ahj')
  if (input.thresholdBuilding === 'yes') blockers.push('threshold_building_excluded')
  if (input.thresholdBuilding === 'review') blockers.push('threshold_status_requires_review')
  if (input.projectScope === 'specialty') blockers.push('unsupported_specialty_scope')
  if (input.projectScope === 'ambiguous') blockers.push('ambiguous_scope_requires_professional_review')

  const reviewRequired = blockers.some(blocker =>
    blocker === 'threshold_status_requires_review'
      || blocker === 'ambiguous_scope_requires_professional_review')

  const scopeEligible = blockers.every(blocker => blocker === 'florida_feature_disabled')

  return {
    status: blockers.length === 0 ? 'supported' : reviewRequired ? 'review_required' : 'blocked',
    scopeEligible,
    ahj,
    blockers,
    publicRoutingEnabled: false,
  }
}
