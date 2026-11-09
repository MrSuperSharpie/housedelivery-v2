import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type      = searchParams.get('type')

  if (tokenHash && type === 'recovery') {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash })

    if (!error) {
      return NextResponse.redirect(`${origin}/reset-password`)
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=link_expired`)
}
