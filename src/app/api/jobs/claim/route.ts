import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ClaimCommitment, JobTimeSlot } from '@/lib/types'
import { validateClaimEligibility } from '@/lib/claim/validation'

interface ClaimRequestBody {
  jobId: string
  claimedSlot?: JobTimeSlot | null
  commitment?: ClaimCommitment | null
}

export async function POST(req: NextRequest) {
  let body: ClaimRequestBody
  try {
    body = await req.json() as ClaimRequestBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { jobId, claimedSlot, commitment } = body

  if (!jobId || typeof jobId !== 'string') {
    return NextResponse.json({ ok: false, error: 'jobId is required.' }, { status: 400 })
  }
  if (!commitment?.accepted) {
    return NextResponse.json({ ok: false, error: 'Commitment acknowledgement is required.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 })
  }

  // Fetch onboarding status and reliability profile in parallel
  const [onboardingResult, profileResult] = await Promise.all([
    supabase
      .from('inspector_onboarding_status')
      .select('status, credential_expires_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('inspector_reliability_profiles')
      .select('tier_key, manual_tier_override')
      .eq('inspector_id', user.id)
      .maybeSingle(),
  ])

  type OnboardingRow = { status: string; credential_expires_at?: string | null }
  type ProfileRow = { tier_key?: string | null; manual_tier_override?: string | null }

  const onboarding = onboardingResult.data as OnboardingRow | null
  const profile = profileResult.data as ProfileRow | null

  const eligibilityCheck = validateClaimEligibility({
    onboardingStatus: onboarding?.status ?? 'unknown',
    credentialExpiresAt: onboarding?.credential_expires_at,
    reliabilityTier: profile?.tier_key,
    manualTierOverride: profile?.manual_tier_override,
  })

  if (!eligibilityCheck.ok) {
    return NextResponse.json({ ok: false, error: eligibilityCheck.error }, { status: 403 })
  }

  // Schedule conflict check — only applies when a concrete slot is selected
  if (
    claimedSlot &&
    !claimedSlot.flexible &&
    claimedSlot.date &&
    claimedSlot.startTime &&
    claimedSlot.endTime
  ) {
    const slotStart = new Date(`${claimedSlot.date}T${claimedSlot.startTime}:00`)
    const slotEnd = new Date(`${claimedSlot.date}T${claimedSlot.endTime}:00`)

    const { data: appointments } = await supabase
      .from('inspection_appointments')
      .select('scheduled_start_at, scheduled_end_at')
      .eq('inspector_id', user.id)
      .in('status', ['scheduled', 'confirmed'])
      .not('scheduled_start_at', 'is', null)
      .not('scheduled_end_at', 'is', null)

    type ApptRow = { scheduled_start_at: string; scheduled_end_at: string }
    const hasConflict = ((appointments ?? []) as ApptRow[]).some(a => {
      const start = new Date(a.scheduled_start_at)
      const end = new Date(a.scheduled_end_at)
      return slotStart < end && slotEnd > start
    })

    if (hasConflict) {
      return NextResponse.json(
        { ok: false, error: 'You have a scheduling conflict at this time. Please select a different slot.' },
        { status: 409 }
      )
    }
  }

  // RPC enforces auth.uid() identity — no inspector_id param needed
  const { data, error } = await supabase.rpc('claim_live_job_if_eligible', {
    p_job_id: jobId,
    p_claimed_slot: claimedSlot ?? null,
    p_claim_commitment: commitment,
  })

  if (error) {
    console.error('[jobs/claim] RPC error', { jobId, error: error.message })
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to claim this job.' },
      { status: 500 }
    )
  }

  const payload = data as Record<string, unknown>
  if (payload?.ok !== true) {
    return NextResponse.json(
      { ok: false, error: (payload?.error as string) ?? 'Failed to claim this job.' },
      { status: 422 }
    )
  }

  console.log('[jobs/claim] accepted', {
    jobId,
    inspectorId: user.id,
    assignmentId: (payload.assignment as Record<string, unknown>)?.id,
    ts: new Date().toISOString(),
  })

  return NextResponse.json(payload)
}
