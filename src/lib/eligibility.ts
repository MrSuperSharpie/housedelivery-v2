import type { InspectorDiscipline, InspectorOnboardingStatus, Region } from './types'

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
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_')

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
  const normalizedInspectorDisciplines = inspectorDisciplines
    .map(value => normalizeDiscipline(value))
    .filter((value): value is InspectorDiscipline => value !== null)

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
