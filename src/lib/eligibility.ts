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

/**
 * Validates whether an inspector can be assigned to a job.
 *
 * Rules:
 * 1. Inspector's disciplines must include the job's requiredDiscipline.
 * 2. If the job's requiredDiscipline is a building-permit discipline,
 *    an inspector whose ONLY discipline is electrical is ineligible.
 * 3. Inspector's regions must include the job's region.
 * 4. If credentialExpiryDate is provided and is in the past, assignment is blocked.
 */
export function checkInspectorEligibility(
  requiredDiscipline: InspectorDiscipline,
  jobRegion: Region,
  inspectorDisciplines: InspectorDiscipline[],
  inspectorRegions: Region[],
  credentialExpiryDate?: string,
  onboardingStatus?: InspectorOnboardingStatus | null,
): EligibilityResult {
  const reasons: string[] = []

  if (onboardingStatus !== 'approved') {
    reasons.push('Onboarding not approved')
  }

  // Rule 1 — discipline match
  if (!inspectorDisciplines.includes(requiredDiscipline)) {
    reasons.push(`${requiredDiscipline.charAt(0).toUpperCase()}${requiredDiscipline.slice(1)} credential required`)
  }

  // Rule 2 — electrical-only block on building permit roles
  if (
    isBuildingPermitDiscipline(requiredDiscipline) &&
    inspectorDisciplines.length > 0 &&
    inspectorDisciplines.every(d => d === ELECTRICAL_DISCIPLINE)
  ) {
    reasons.push('Building permit credential required')
  }

  // Rule 3 — jurisdiction match
  if (!inspectorRegions.includes(jobRegion)) {
    reasons.push(`${jobRegion.charAt(0).toUpperCase()}${jobRegion.slice(1)} authorization required`)
  }

  // Rule 4 — credential expiry
  if (credentialExpiryDate) {
    const expiry = new Date(credentialExpiryDate)
    if (!isNaN(expiry.getTime()) && expiry < new Date()) {
      reasons.push('Credential expired')
    }
  }

  return { eligible: reasons.length === 0, reasons }
}
