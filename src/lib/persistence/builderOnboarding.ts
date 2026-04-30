/**
 * Builder onboarding status for dashboard access gate.
 * Mirrors inspectorOnboarding.ts — server-backed (Supabase profiles) when
 * available; localStorage fallback otherwise.
 *
 * New / unknown accounts default to 'draft' (not approved) so they are
 * hard-redirected to /builder/onboarding until an admin approves them.
 */

import type { InspectorOnboardingStatus } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Re-use the same status union (both roles share the same set of states)
export type BuilderOnboardingStatus = InspectorOnboardingStatus

const STORAGE_KEY = 'vero_builder_onboarding'

type Stored = Record<string, BuilderOnboardingStatus>

function readLocal(): Stored {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Stored) : {}
  } catch {
    return {}
  }
}

function writeLocal(map: Stored) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

/**
 * Demo builder IDs pre-approved for the no-Supabase-session demo flow only.
 * These IDs are NEVER consulted when a real Supabase session is present —
 * real accounts must go through the proper admin approval flow.
 */
const APPROVED_DEMO_IDS = ['wyatt-davis']

/**
 * Get builder onboarding status (async).
 * Tries Supabase `profiles` table first, then falls back to localStorage.
 * Unknown / new accounts default to 'draft'.
 *
 * When `supabaseId` is present the caller has a real Supabase session and the
 * demo bypass is never applied — real accounts always go through admin review.
 */
export async function getBuilderOnboardingStatusAsync(
  userId?: string,
  supabaseId?: string,
): Promise<BuilderOnboardingStatus> {
  const serverKey = supabaseId ?? userId
  if (serverKey) {
    try {
      const { data: builderStatus } = await supabase
        .from('builder_onboarding_status')
        .select('status')
        .eq('user_id', serverKey)
        .maybeSingle()
      if (builderStatus?.status) return builderStatus.status as BuilderOnboardingStatus

      const { data } = await supabase
        .from('profiles')
        .select('onboarding_status')
        .eq('id', serverKey)
        .single()
      if (data?.onboarding_status) return data.onboarding_status as BuilderOnboardingStatus
    } catch {
      // fallback to local
    }
  }
  if (supabaseId) return 'draft'
  return getBuilderOnboardingStatus(userId)
}

/**
 * Get builder onboarding status (sync, local only).
 * Unknown accounts default to 'draft'.
 *
 * @param skipDemoBypass - Set to true for real Supabase accounts so the
 *   hardcoded demo list is never consulted. Defaults to false (demo-safe).
 */
export function getBuilderOnboardingStatus(
  userId?: string,
  skipDemoBypass = false,
): BuilderOnboardingStatus {
  if (userId) {
    const map = readLocal()
    const s = map[userId]
    if (s) return s
    // Only apply the demo bypass when there is no active Supabase session.
    if (!skipDemoBypass && APPROVED_DEMO_IDS.some(id => userId === id || userId.startsWith(id))) {
      return 'approved'
    }
    return 'draft'
  }
  return 'draft'
}

/**
 * Set builder onboarding status. Writes to localStorage (and Supabase profiles
 * if supabaseId provided).
 */
export async function setBuilderOnboardingStatus(
  status: BuilderOnboardingStatus,
  userId?: string,
  supabaseId?: string,
): Promise<void> {
  const serverKey = supabaseId ?? userId
  if (serverKey) {
    try {
      await supabase
        .from('profiles')
        .upsert({ id: serverKey, onboarding_status: status, updated_at: new Date().toISOString() })
    } catch {
      // fallback to local only
    }
  }
  if (userId) {
    const map = readLocal()
    map[userId] = status
    writeLocal(map)
  }
}

/** Form fields collected during builder onboarding. */
export interface BuilderOnboardingFormData {
  legalBusinessName: string
  builderType: string
  primaryContactName: string
  signatoryTitle: string
  businessEmail: string
  businessPhone: string
  businessAddress: string
  regions: string[]
  entityType: string
  companyNumber: string
  provinceOfIncorporation: string
  yearsOperating: string
  website: string
  bcHousingLicenceNumber: string
  bcHousingLicenceType: string
  newResidentialConstruction: boolean
  complianceHasIssues: boolean | null
  complianceExplanation: string
  autoPermitFamilies: string[]
}

/**
 * Upsert the full onboarding form to `builder_onboarding_status`.
 * Called on submission before setBuilderOnboardingStatus.
 * Returns true on success, false on any error.
 */
export async function submitBuilderOnboarding(
  supabaseId: string,
  form: BuilderOnboardingFormData,
): Promise<boolean> {
  const now = new Date().toISOString()

  const row = {
    user_id:              supabaseId,
    status:               'submitted',
    company_name:         form.legalBusinessName || null,
    business_number:      form.companyNumber || null,
    contact_name:         form.primaryContactName || null,
    contact_email:        form.businessEmail || null,
    contact_phone:        form.businessPhone || null,
    address:              form.businessAddress || null,
    website:              form.website || null,
    requested_families:   form.autoPermitFamilies,
    jurisdictions:        form.regions,
    submitted_at:         now,
    updated_at:           now,
  }

  console.log('[BuilderOnboarding] upserting to builder_onboarding_status', { supabaseId, row })

  const { error } = await supabase
    .from('builder_onboarding_status')
    .upsert(row, { onConflict: 'user_id' })

  if (error) {
    console.error('[BuilderOnboarding] upsert failed', error)
    return false
  }

  console.log('[BuilderOnboarding] upsert succeeded')
  return true
}
