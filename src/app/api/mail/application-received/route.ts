import { NextRequest, NextResponse } from 'next/server'
import { sendApplicationReceived } from '@/lib/mail'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: { to: string; inspectorName: string }
  try {
    body = await req.json() as { to: string; inspectorName: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { to, inspectorName } = body ?? {}
  if (!to || !inspectorName) {
    return NextResponse.json({ error: 'Missing to or inspectorName' }, { status: 400 })
  }

  const result = await sendApplicationReceived({ to, inspectorName })
  return NextResponse.json(result, { status: result.ok ? 200 : 503 })
}
