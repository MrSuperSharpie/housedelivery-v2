import { NextResponse } from 'next/server'
import { isEmailConfigured, verifyEmailDns } from '@/lib/mail'

export async function GET() {
  const emailDns = await verifyEmailDns()
  return NextResponse.json({
    emailConfigured: isEmailConfigured(),
    emailDns,
  })
}
