/**
 * Inspector onboarding status for Live Board access gate.
 * Server-backed (Supabase) when available; local (localStorage) fallback.
 */

import type { InspectorOnboardingStatus } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import {
  selectInspectorOnboardingStatus as selectServer,
  upsertInspectorOnboardingStatus as upsertServer,
  selectAllInspectorOnboardingStatuses,
  type InspectorOnboardingRow,
} from '@/lib/supabase/compliance'

const supabase = createClient()
const STORAGE_KEY = 'vero_inspector_onboarding'
const ANON_KEY = 'vero_inspector_onboarding_anonymous'

type Stored = Record<string, InspectorOnboardingStatus>

function readByUserLocal(): Stored {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Stored) : {}
  } catch {
    return {}
  }
}

function writeByUserLocal(map: Stored) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

function readAnonymousLocal(): InspectorOnboardingStatus | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(ANON_KEY)
    return raw as InspectorOnboardingStatus | null
  } catch {
    return null
  }
}

function writeAnonymousLocal(status: InspectorOnboardingStatus) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ANON_KEY, status)
  } catch {
    // ignore
  }
}

const APPROVED_DEMO_IDS = ['sarah-chen', 'sarah-chen-vero-ca']

/**
 * Get onboarding status. Tries server when userId or supabaseId is provided, then local, then demo approved list.
 */
export async function getInspectorOnboardingStatusAsync(
  userId?: string,
  supabaseId?: string
): Promise<InspectorOnboardingStatus> {
  const serverKey = supabaseId ?? userId
  if (serverKey) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_status, verified')
        .eq('id', serverKey)
        .maybeSingle()
      if (typeof profile?.onboarding_status === 'string') {
        return profile.onboarding_status as InspectorOnboardingStatus
      }
      if (profile?.verified === true) return 'approved'
    } catch {
      // fallback
    }
    try {
      const s = await selectServer(serverKey)
      if (s) return s
    } catch {
      // fallback
    }
  }
  return getInspectorOnboardingStatus(userId)
}

/**
 * Get onboarding status (sync). Uses local and demo list only. Use getInspectorOnboardingStatusAsync for server-backed read.
 */
export function getInspectorOnboardingStatus(userId?: string): InspectorOnboardingStatus {
  if (userId) {
    const map = readByUserLocal()
    const s = map[userId]
    if (s) return s
    if (APPROVED_DEMO_IDS.some(id => userId.startsWith(id) || userId === id)) return 'approved'
    return 'draft'
  }
  const anon = readAnonymousLocal()
  return anon ?? 'draft'
}

/**
 * Set onboarding status: server first (when userId or supabaseId provided), then local.
 */
export async function setInspectorOnboardingStatus(
  status: InspectorOnboardingStatus,
  userId?: string,
  supabaseId?: string,
  reviewerNote?: string
): Promise<void> {
  const serverKey = supabaseId ?? userId
  if (serverKey) {
    try {
      const ok = await upsertServer(serverKey, status, reviewerNote)
      if (ok) { /* also write local so sync read works */ }
    } catch {
      // fallback
    }
    try {
      await supabase
        .from('profiles')
        .update({
          onboarding_status: status,
          verified: status === 'approved',
        })
        .eq('id', serverKey)
    } catch {
      // fallback
    }
  }
  if (userId) {
    const map = readByUserLocal()
    map[userId] = status
    writeByUserLocal(map)
  } else {
    writeAnonymousLocal(status)
  }
}

// ─── Admin helpers ────────────────────────────────────────────────────────────

export async function listInspectorOnboardingStatuses(): Promise<InspectorOnboardingRow[]> {
  try {
    return await selectAllInspectorOnboardingStatuses()
  } catch {
    // Fallback: synthesize from local map if server call fails
    const map = readByUserLocal()
    return Object.entries(map).map(([userId, status]) => ({
      userId,
      status,
      updatedAt: new Date().toISOString(),
      requestedRoleLanes: [],
      approvedRoleLanes: [],
      regions: [],
      disciplines: [],
    }))
  }
}
