'use client'

import type { AuthUser } from '@/lib/auth'

function resolveFlag(): boolean {
  const explicit = process.env.NEXT_PUBLIC_VERO_INSPECTOR_TEST_OVERRIDE
  if (explicit === 'true') return true
  if (explicit === 'false') return false
  return process.env.NODE_ENV !== 'production'
}

export function isInspectorTestModeEnabled(user?: (Pick<AuthUser, 'role'> & { supabaseId?: string }) | null): boolean {
  if (user?.role && user.role !== 'inspector') return false
  // Real Supabase accounts must go through normal onboarding gates — never override them.
  if (user?.supabaseId) return false
  return resolveFlag()
}
