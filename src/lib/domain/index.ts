/**
 * Vero domain model — public API
 */

export * from './types'

// ─── Rule 11: No sealing while a hold is open ─────────────────────────────────

import type { SubmissionStatus } from './types'

export interface SealResult {
  allowed: boolean
  reason?: string
}

/**
 * Rule 11 — A submission may only be sealed when no hold point is open.
 * Returns { allowed: true } when the transition is permitted, or
 * { allowed: false, reason: string } when it is blocked.
 */
export function canSealSubmission(currentStatus: SubmissionStatus): SealResult {
  if (currentStatus === 'hold_open') {
    return {
      allowed: false,
      reason: 'Rule 11: Submission cannot be sealed while a hold point is open. Resolve the hold first.',
    }
  }
  if (currentStatus === 'sealed' || currentStatus === 'archived') {
    return {
      allowed: false,
      reason: `Submission is already ${currentStatus} — no further sealing action is required.`,
    }
  }
  return { allowed: true }
}
