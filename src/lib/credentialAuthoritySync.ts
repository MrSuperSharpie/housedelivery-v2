import type { InspectorRoleLane } from '@/lib/types'

export type HeldCredentialRow = {
  id: string
  credential_type_id: string
  verification_status: string
}

export type CredentialTypeRow = {
  id: string
  authority_level: string
  disciplines: string[]
}

export const ELECTRICAL_FSR_CREDENTIALS = new Set(['fsr_class_a', 'fsr_class_b'])

export const CLAIM_AUTHORITY_LANES = new Set<InspectorRoleLane>([
  'architect',
  'engineer',
  'certified_professional',
  'electrical_fsr',
  'official_authority',
])

/**
 * Decides whether a held credential should be verified for the given approved
 * work-area lanes.
 *
 * The `official_authority` lane is "Building Official / Plumbing Official / AHJ
 * authority", which grants the plumbing discipline in the shared eligibility
 * model (see resolveClaimEligibleDisciplines / normalizeDiscipline). So it must
 * match not only broad municipal-official credentials but also plumbing-discipline
 * credentials — otherwise an inspector approved for plumbing authority whose held
 * credential is a plumbing trade credential (rather than the broad municipal type)
 * is never flipped to verified, and inspector_verified_disciplines() reports the
 * Live Board discipline as unverified. Only plumbing-covering credentials match,
 * so no discipline is granted beyond what the credential already lists.
 */
export function matchesApprovedLane(
  credential: HeldCredentialRow,
  credentialType: CredentialTypeRow | undefined,
  approvedLanes: InspectorRoleLane[],
): boolean {
  if (!credentialType) return false

  return (
    (approvedLanes.includes('architect') && credentialType.authority_level === 'architect') ||
    (approvedLanes.includes('engineer') && credentialType.authority_level === 'professional_engineer') ||
    (approvedLanes.includes('certified_professional') && credentialType.authority_level === 'certified_professional') ||
    (approvedLanes.includes('electrical_fsr') && ELECTRICAL_FSR_CREDENTIALS.has(credential.credential_type_id)) ||
    (approvedLanes.includes('official_authority') && (
      credentialType.authority_level === 'municipal_official' ||
      credentialType.disciplines.includes('plumbing')
    ))
  )
}
