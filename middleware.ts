import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { isAdminLikeRole } from '@/lib/adminAccess'

const LOGIN_PATH = '/login'
const PUBLIC_PROTECTED_PATHS = ['/inspector/signup', '/inspector/onboarding']
const INSPECTOR_REVIEW_STATUSES = new Set(['submitted', 'under_review', 'needs_info', 'rejected', 'suspended'])

function matchesPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function getRole(userMetadata: Record<string, unknown> | undefined) {
  const role = userMetadata?.role
  return typeof role === 'string' ? role : undefined
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  return NextResponse.redirect(url)
}

// Destination for an authenticated non-admin user who attempted an /admin path.
// Mirrors the client-side dashboardForRole in roleGuard.tsx; defined independently
// here to avoid importing 'use client' modules in middleware.
function adminRedirectForRole(role: string | undefined): string {
  if (role === 'builder')   return '/builder'
  if (role === 'inspector') return '/inspector'
  if (role === 'auditor')   return '/auditor'
  return LOGIN_PATH
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  const isInspectorSignup = matchesPath(pathname, '/inspector/signup')
  const isInspectorOnboarding = matchesPath(pathname, '/inspector/onboarding')
  const isInspectorDashboard = pathname === '/inspector'
  const isLiveBoard = matchesPath(pathname, '/live-board')
  const isAdminPath = matchesPath(pathname, '/admin')
  const isPublicProtectedPath = PUBLIC_PROTECTED_PATHS.some(prefix => matchesPath(pathname, prefix))

  if (isPublicProtectedPath) {
    const { response, user, supabase } = await updateSession(request)
    if (!user) return response

    const role = getRole(user.user_metadata as Record<string, unknown> | undefined)
    if (role && role !== 'inspector') return response

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_status, verified')
      .eq('id', user.id)
      .maybeSingle()

    const onboardingStatus = typeof profile?.onboarding_status === 'string'
      ? profile.onboarding_status
      : null
    const verified = profile?.verified === true

    if (onboardingStatus === 'approved' || verified) {
      return redirectTo(request, '/inspector')
    }

    if (INSPECTOR_REVIEW_STATUSES.has(onboardingStatus ?? '')) {
      if (isInspectorSignup) return redirectTo(request, '/inspector/onboarding')
      return response
    }

    if (isInspectorOnboarding) {
      return redirectTo(request, '/inspector/signup')
    }

    return response
  }

  const { response, user, supabase } = await updateSession(request)

  if (user) {
    if (isInspectorDashboard || isLiveBoard) {
      const role = getRole(user.user_metadata as Record<string, unknown> | undefined)
      if (!role || role === 'inspector') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_status, verified')
          .eq('id', user.id)
          .maybeSingle()

        const onboardingStatus = typeof profile?.onboarding_status === 'string'
          ? profile.onboarding_status
          : null
        const verified = profile?.verified === true

        if (onboardingStatus === 'approved' || verified) return response
        if (INSPECTOR_REVIEW_STATUSES.has(onboardingStatus ?? '')) {
          return redirectTo(request, '/inspector/onboarding')
        }
        return redirectTo(request, '/inspector/signup')
      }
    }

    // Admin path protection: authenticated non-admin users are sent to their
    // role dashboard. Unauthenticated users are caught by the login redirect below.
    // A second-pass check against the profiles table is performed by requireAdmin()
    // inside server component pages.
    if (isAdminPath) {
      const role = getRole(user.user_metadata as Record<string, unknown> | undefined)
      if (!isAdminLikeRole(role)) {
        return redirectTo(request, adminRedirectForRole(role))
      }
    }

    return response
  }

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = LOGIN_PATH
  loginUrl.search = ''
  loginUrl.searchParams.set('next', `${pathname}${search}`)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/inspector/:path*',
    '/vault/:path*',
    '/live-board/:path*',
    '/admin/:path*',
  ],
}
