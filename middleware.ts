import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const LOGIN_PATH = '/login'
const PUBLIC_PROTECTED_PATHS = ['/inspector/signup']

function matchesPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (PUBLIC_PROTECTED_PATHS.some(prefix => matchesPath(pathname, prefix))) {
    const { response } = await updateSession(request)
    return response
  }

  const { response, user } = await updateSession(request)

  if (user) {
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
  ],
}
