'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'builder' | 'inspector' | 'auditor' | 'admin'

export interface AuthUser {
  id: string
  name: string
  firstName: string
  role: UserRole
  email: string
  phone: string
  avatar: string         // initials
  logoUrl?: string
  // builder
  company?: string
  position?: string
  // inspector
  licenseNumber?: string
  /** Formal license/registration number for authority-facing documents (BC Schedule C-B). */
  inspectorLicenseNo?: string
  designation?: string
  disciplines?: import('@/lib/types').InspectorDiscipline[]
  regions?: import('@/lib/types').Region[]
  rating?: number
  earningsToday?: number
  earningsWeek?: number
  earningsMonth?: number
  credentialExpiryDate?: string
  // auditor
  jurisdiction?: string
  title?: string
  // inspector onboarding (Vero reviews first; only approved can access Live Board)
  onboardingStatus?: 'draft' | 'submitted' | 'under_review' | 'needs_info' | 'approved' | 'rejected' | 'suspended'
  // supabase user id (when using real auth)
  supabaseId?: string
}

interface AuthContextValue {
  user: AuthUser | null
  login: (user: AuthUser) => void
  logout: () => void
  isLoading: boolean
}

// ─── Demo users ───────────────────────────────────────────────────────────────

export const DEMO_USERS: AuthUser[] = [
  {
    id:           'wyatt-davis',
    name:         'Wyatt Davis',
    firstName:    'Wyatt',
    role:         'builder',
    email:        'wyatt@coastaldevelopments.ca',
    phone:        '604-555-0142',
    avatar:       'WD',
    company:      'Coastal Developments Inc.',
    position:     'Owner / Project Manager',
  },
  {
    id:               'sarah-chen',
    name:             'Dr. Sarah Chen',
    firstName:        'Sarah',
    role:             'inspector',
    email:            'sarah.chen@getvero.ca',
    phone:            '604-555-0198',
    avatar:           'SC',
    licenseNumber:    'BC-ENG-29847',
    designation:      'P.Eng — Structural',
    disciplines:      ['structural', 'geotech'],
    regions:          ['vancouver', 'burnaby', 'richmond'],
    rating:           4.97,
    earningsToday:    590,
    earningsWeek:     2655,
    earningsMonth:    10620,
    onboardingStatus: 'approved',
  },
  {
    id:           'james-park',
    name:         'James Park',
    firstName:    'James',
    role:         'auditor',
    email:        'jpark@vancouver.ca',
    phone:        '604-873-7000',
    avatar:       'JP',
    jurisdiction: 'City of Vancouver',
    title:        'Senior Building Inspector',
  },
  {
    id:       'vero-admin',
    name:     'Vero Admin',
    firstName:'Admin',
    role:     'admin',
    email:    'admin@getvero.ca',
    phone:    '604-555-0001',
    avatar:   'SA',
    position: 'Platform Administrator',
  },
]

// ─── Supabase Auth helpers ────────────────────────────────────────────────────

/**
 * Get the currently authenticated Supabase user.
 * Returns null if not authenticated or if Supabase is not configured.
 */
export async function getUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) return null
    return user
  } catch {
    return null
  }
}

/**
 * Sign in with email/password via Supabase Auth.
 * Returns { user, error }.
 */
export async function signInWithSupabase(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { user: data?.user ?? null, error }
  } catch (err) {
    return { user: null, error: err as Error }
  }
}

/**
 * Sign out from Supabase Auth.
 */
export async function signOutFromSupabase() {
  try {
    await supabase.auth.signOut()
  } catch { /* ignore */ }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
})

const STORAGE_KEY = 'vero_auth_user'

function readMetadataString(metadata: Record<string, unknown> | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return undefined
}

function readMetadataArray<T extends string>(metadata: Record<string, unknown> | undefined, key: string): T[] {
  const value = metadata?.[key]
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is T => typeof entry === 'string')
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]         = useState<AuthUser | null>(null)
  const [isLoading, setLoading] = useState(true)

  // Hydrate from Supabase cookie session (written by @supabase/ssr middleware).
  // Falls back to localStorage only for demo accounts that have no Supabase session.
  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(async ({ data: { user: sbUser } }) => {
      if (!mounted) return
      if (sbUser) {
        // Real Supabase session found — reconstruct AuthUser.
        // Preserve the role that was stored by login() during sign-in,
        // since Supabase user_metadata may not have it for older accounts.
        let role: UserRole = (sbUser.user_metadata?.role as UserRole) ?? 'builder'
        try {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw) {
            const stored = JSON.parse(raw) as AuthUser
            if (stored.supabaseId === sbUser.id) role = stored.role
          }
        } catch { /* ignore */ }
        const metadata = (sbUser.user_metadata ?? {}) as Record<string, unknown>
        const name = readMetadataString(metadata, 'name') ?? sbUser.email?.split('@')[0] ?? 'User'
        let onboardingStatus: string | undefined
        let logoUrl: string | undefined
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('onboarding_status, logo_url')
            .eq('id', sbUser.id)
            .single()
          if (profileData?.onboarding_status) onboardingStatus = profileData.onboarding_status
          if (typeof profileData?.logo_url === 'string' && profileData.logo_url.trim()) {
            logoUrl = profileData.logo_url
          }
        } catch { /* ignore */ }
        console.log('AUTH DEBUG onboardingStatus:', onboardingStatus)
        setUser({
          id:              sbUser.id,
          supabaseId:      sbUser.id,
          name,
          firstName:       name.split(' ')[0],
          role,
          email:           sbUser.email ?? '',
          phone:           sbUser.user_metadata?.phone ?? '',
          avatar:          name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
          logoUrl:         logoUrl ?? readMetadataString(metadata, 'logo_url', 'logoUrl'),
          company:         sbUser.user_metadata?.company,
          position:        sbUser.user_metadata?.position,
          licenseNumber:   readMetadataString(metadata, 'licenseNumber', 'license_number'),
          designation:     readMetadataString(metadata, 'designation'),
          disciplines:     readMetadataArray(metadata, 'disciplines'),
          regions:         readMetadataArray(metadata, 'regions'),
          credentialExpiryDate: readMetadataString(metadata, 'credentialExpiryDate', 'credential_expiry_date', 'credential_expires_at'),
          onboardingStatus: onboardingStatus as AuthUser['onboardingStatus'],
        })
      } else {
        // No Supabase session — restore demo users from localStorage only
        // (demo accounts never have supabaseId set)
        try {
          const raw = localStorage.getItem(STORAGE_KEY)
          if (raw) {
            const stored = JSON.parse(raw) as AuthUser
            if (!stored.supabaseId) setUser(stored)
          }
        } catch { /* ignore */ }
      }
      if (mounted) setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  // Subscribe to Supabase auth state changes
  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event === 'SIGNED_IN' && session?.user) {
        // If we have a Supabase session but no local user, try to fetch profile
        const localRaw = localStorage.getItem(STORAGE_KEY)
        if (!localRaw) {
          // Build a minimal AuthUser from Supabase session
          const sbUser = session.user
          const email = sbUser.email ?? ''
          const metadata = (sbUser.user_metadata ?? {}) as Record<string, unknown>
          const name = readMetadataString(metadata, 'name') ?? email.split('@')[0] ?? 'User'
          const role: UserRole = (metadata.role as UserRole) ?? 'builder'

          let onboardingStatus: string | undefined
          let logoUrl: string | undefined
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('onboarding_status, logo_url')
              .eq('id', sbUser.id)
              .single()
            if (profileData?.onboarding_status) onboardingStatus = profileData.onboarding_status
            if (typeof profileData?.logo_url === 'string' && profileData.logo_url.trim()) {
              logoUrl = profileData.logo_url
            }
          } catch { /* ignore */ }

          const authUser: AuthUser = {
            id: sbUser.id,
            supabaseId: sbUser.id,
            name,
            firstName: name.split(' ')[0],
            role,
            email,
            phone: sbUser.user_metadata?.phone ?? '',
            avatar: name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
            logoUrl: logoUrl ?? readMetadataString(metadata, 'logo_url', 'logoUrl'),
            company: sbUser.user_metadata?.company,
            position: sbUser.user_metadata?.position,
            licenseNumber: readMetadataString(metadata, 'licenseNumber', 'license_number'),
            designation: readMetadataString(metadata, 'designation'),
            disciplines: readMetadataArray(metadata, 'disciplines'),
            regions: readMetadataArray(metadata, 'regions'),
            credentialExpiryDate: readMetadataString(metadata, 'credentialExpiryDate', 'credential_expiry_date', 'credential_expires_at'),
            onboardingStatus: onboardingStatus as AuthUser['onboardingStatus'],
          }

          console.log('AUTH DEBUG onboardingStatus:', onboardingStatus)
          setUser(authUser)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser))
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        localStorage.removeItem(STORAGE_KEY)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback((u: AuthUser) => {
    setUser(u)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
  }, [])

  const logout = useCallback(async () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    // Also sign out from Supabase if active session
    try {
      await supabase.auth.signOut()
    } catch { /* ignore */ }
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
