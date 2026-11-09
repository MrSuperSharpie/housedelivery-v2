import type { InspectorDiscipline, InspectorOnboardingStatus, InspectorRoleLane, Region } from './types'

// ─── Permit family → allowed disciplines ─────────────────────────────────────
// Building permit disciplines: structural/geotech/mechanical/architectural.
// Electrical permit disciplines: electrical only.
// Electrical-only credentials cannot satisfy building permit roles.

export const BUILDING_PERMIT_DISCIPLINES: InspectorDiscipline[] = [
  'structural',
  'geotech',
  'mechanical',
  'architectural',
]

export const ELECTRICAL_DISCIPLINE: InspectorDiscipline = 'electrical'

/** Returns true if the required discipline belongs to a building permit family (not electrical). */
function isBuildingPermitDiscipline(d: InspectorDiscipline): boolean {
  return BUILDING_PERMIT_DISCIPLINES.includes(d)
}

export interface EligibilityResult {
  eligible: boolean
  reasons: string[]
}

function normalizeDiscipline(value: string): InspectorDiscipline | null {
  const normalized = value.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  switch (normalized) {
    case 'structural':
    case 'framing':
      return 'structural'
    case 'geotech':
    case 'geotechnical':
      return 'geotech'
    case 'electrical':
      return 'electrical'
    case 'mechanical':
      return 'mechanical'
    case 'plumbing':
    case 'red_seal_plumber':
    case 'building_official':
    case 'plumbing_official':
    case 'ahj_authority':
    case 'official_authority':
    case 'building_official_plumbing_official_ahj_authority':
      return 'plumbing'
    case 'architectural':
    case 'architecture':
      return 'architectural'
    case 'fire_protection':
    case 'fire':
      return 'fire_protection'
    default:
      return null
  }
}

/** Resolves the credential and approved-lane labels that may claim each discipline. */
export function resolveClaimEligibleDisciplines(
  inspectorDisciplines: readonly string[],
  approvedRoleLanes: readonly InspectorRoleLane[] = [],
): InspectorDiscipline[] {
  const resolved = new Set(
    inspectorDisciplines
      .map(value => normalizeDiscipline(value))
      .filter((value): value is InspectorDiscipline => value !== null),
  )

  if (approvedRoleLanes.includes('official_authority')) {
    resolved.add('plumbing')
  }

  return [...resolved]
}

/**
 * Returns true if the inspector's resolved disciplines cover the job's required
 * discipline. This is the single, shared discipline-coverage check used by both
 * the claim flow and the Live Board — so approved Building Official / Plumbing
 * Official / AHJ authority and Red Seal Plumber credentials (which resolve to
 * `plumbing`) are recognised in one place, with no duplicate mapping.
 */
export function coversRequiredDiscipline(
  requiredDiscipline: InspectorDiscipline,
  inspectorDisciplines: readonly string[],
  approvedRoleLanes: readonly InspectorRoleLane[] = [],
): boolean {
  const normalizedRequired = normalizeDiscipline(requiredDiscipline) ?? requiredDiscipline
  return resolveClaimEligibleDisciplines(inspectorDisciplines, approvedRoleLanes)
    .includes(normalizedRequired)
}

/**
 * Validates whether an inspector can be assigned to a job.
 *
 * Rules:
 * 1. Inspector's disciplines must include the job's requiredDiscipline.
 * 2. If the job's requiredDiscipline is a building-permit discipline,
 *    an inspector whose ONLY discipline is electrical is ineligible.
 * 3. If credentialExpiryDate is provided and is in the past, assignment is blocked.
 */
export function checkInspectorEligibility(
  requiredDiscipline: InspectorDiscipline,
  _jobRegion: Region,
  inspectorDisciplines: InspectorDiscipline[],
  _inspectorRegions: Region[],
  credentialExpiryDate?: string,
  onboardingStatus?: InspectorOnboardingStatus | null,
): EligibilityResult {
  const reasons: string[] = []
  const normalizedRequiredDiscipline = normalizeDiscipline(requiredDiscipline) ?? requiredDiscipline
  const normalizedInspectorDisciplines = resolveClaimEligibleDisciplines(inspectorDisciplines)

  if (onboardingStatus !== 'approved') {
    reasons.push('Onboarding not approved')
  }

  // Rule 1 — discipline match
  if (!normalizedInspectorDisciplines.includes(normalizedRequiredDiscipline)) {
    reasons.push(`${normalizedRequiredDiscipline.charAt(0).toUpperCase()}${normalizedRequiredDiscipline.slice(1)} credential required`)
  }

  // Rule 2 — electrical-only block on building permit roles
  if (
    isBuildingPermitDiscipline(normalizedRequiredDiscipline) &&
    normalizedInspectorDisciplines.length > 0 &&
    normalizedInspectorDisciplines.every(d => d === ELECTRICAL_DISCIPLINE)
  ) {
    reasons.push('Building permit credential required')
  }

  // Rule 3 — open market: region never blocks eligibility.

  // Rule 4 — credential expiry
  if (credentialExpiryDate) {
    const expiry = new Date(credentialExpiryDate)
    if (!isNaN(expiry.getTime()) && expiry < new Date()) {
      reasons.push('Credential expired')
    }
  }

  return { eligible: reasons.length === 0, reasons }
}
