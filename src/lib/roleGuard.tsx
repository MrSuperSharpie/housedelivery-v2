'use client'

import React, { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useAuth, type UserRole } from '@/lib/auth'

// ─── Role → home dashboard mapping ───────────────────────────────────────────

export function dashboardForRole(role: UserRole): string {
  switch (role) {
    case 'builder':   return '/builder'
    case 'inspector': return '/inspector'
    case 'admin':     return '/admin'
    case 'auditor':   return '/auditor'
  }
}

// ─── RoleGuard ────────────────────────────────────────────────────────────────

/**
 * Client-side role enforcement for demo/localStorage users.
 * Supabase-authenticated users are additionally protected by middleware.
 *
 * @param allowedRole  The single role permitted to view this route group.
 * @param publicPaths  Sub-paths that bypass the check (e.g. signup flows).
 */
export function RoleGuard({
  allowedRole,
  publicPaths = [],
  children,
}: {
  allowedRole: UserRole
  publicPaths?: string[]
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  const isPublicPath = publicPaths.some(
    p => pathname === p || pathname.startsWith(p + '/')
  )

  useEffect(() => {
    if (isLoading || isPublicPath) return

    if (!user) {
      const loginHref = pathname
        ? `/login?next=${encodeURIComponent(pathname)}`
        : '/login'
      router.replace(loginHref)
      return
    }

    if (user.role !== allowedRole) {
      router.replace(dashboardForRole(user.role))
    }
  }, [user, isLoading, allowedRole, router, isPublicPath, pathname])

  // Public sub-paths (signup, onboarding-status, etc.) always render
  if (isPublicPath) return <>{children}</>

  // Show spinner while auth state hydrates or while redirecting
  if (isLoading || !user || user.role !== allowedRole) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-flame animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
