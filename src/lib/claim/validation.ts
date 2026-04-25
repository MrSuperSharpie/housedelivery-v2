export interface ClaimEligibilityContext {
  onboardingStatus: string
  credentialExpiresAt?: string | null
  reliabilityTier?: string | null
  manualTierOverride?: string | null
}

export interface ClaimValidationResult {
  ok: boolean
  error?: string
}

// Matches the unique_violation error returned by claim_live_job_if_eligible RPC.
export const DUPLICATE_CLAIM_ERROR = 'Job has already been claimed.'

// Notification event keys queued by the RPC on successful claim.
export const INSPECTOR_CLAIM_EVENT_KEY = 'inspector.claim_commitment_accepted'
export const BUILDER_ASSIGNMENT_EVENT_KEY = 'builder.assignment_claimed'

export function validateClaimEligibility(ctx: ClaimEligibilityContext): ClaimValidationResult {
  if (ctx.onboardingStatus === 'suspended') {
    return { ok: false, error: 'Your account is suspended. Contact support.' }
  }
  if (ctx.onboardingStatus !== 'approved') {
    return { ok: false, error: 'Onboarding not approved.' }
  }

  const effectiveTier = ctx.manualTierOverride ?? ctx.reliabilityTier
  if (effectiveTier === 'restricted') {
    return { ok: false, error: 'Your dispatch access is currently restricted. Contact support for details.' }
  }

  if (ctx.credentialExpiresAt) {
    const expiry = new Date(ctx.credentialExpiresAt)
    if (expiry < new Date()) {
      return { ok: false, error: 'Your credential has expired. Please renew before claiming inspections.' }
    }
  }

  return { ok: true }
}
