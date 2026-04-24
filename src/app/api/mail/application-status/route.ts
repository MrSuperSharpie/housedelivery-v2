import { NextRequest, NextResponse } from 'next/server'
import { sendApplicationStatus } from '@/lib/mail'

export const runtime = 'nodejs'

type ApplicationStatus = 'approved' | 'needs_info' | 'rejected'

function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return value === 'approved' || value === 'needs_info' || value === 'rejected'
}

export async function POST(req: NextRequest) {
  let body: {
    to?: string
    inspectorName?: string
    status?: unknown
    reviewerNote?: string
  }

  try {
    body = await req.json() as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { to, inspectorName, status, reviewerNote } = body ?? {}
  if (!to || !inspectorName || !isApplicationStatus(status)) {
    return NextResponse.json({ error: 'Missing to, inspectorName, or valid status' }, { status: 400 })
  }

  const result = await sendApplicationStatus({ to, inspectorName, status, reviewerNote })
  return NextResponse.json(result, { status: result.ok ? 200 : 503 })
}
