import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Storage bucket that holds inspector-uploaded Hold evidence.
const EVIDENCE_BUCKET = 'inspection-evidence'
// Short-lived signed URL: long enough to open, short enough to not leak.
const SIGNED_URL_TTL_SECONDS = 300

// Service-role client: resolves the evidence -> hold -> owner chain and mints
// the signed URL. The builder is NOT the uploader, so browser-side storage
// permissions cannot be relied upon; authorization is enforced here instead.
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

// POST /api/builder/holds/evidence-url
// Returns a short-lived signed URL for one Hold evidence item, but ONLY after
// verifying the authenticated builder owns the Hold that the evidence belongs to.
// The browser supplies just an evidenceId; the storage path is resolved
// server-side and never trusted from the client.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 })
  }

  let body: { evidenceId?: unknown }
  try {
    body = await req.json() as { evidenceId?: unknown }
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const evidenceId = getString(body.evidenceId)
  if (!evidenceId) {
    return NextResponse.json({ ok: false, error: 'evidenceId is required.' }, { status: 400 })
  }

  const service = getServiceClient()
  if (!service) {
    console.error('[builder/holds/evidence-url] service role client unavailable')
    return NextResponse.json({ ok: false, error: 'Service client unavailable.' }, { status: 503 })
  }

  // Resolve the evidence row server-side. The storage path comes from the DB,
  // never from the browser.
  const { data: evidenceData, error: evidenceError } = await service
    .from('job_hold_evidence')
    .select('id, hold_id, storage_path')
    .eq('id', evidenceId)
    .maybeSingle()

  if (evidenceError) {
    console.error('[builder/holds/evidence-url] evidence fetch failed', { evidenceId, error: evidenceError.message })
    return NextResponse.json({ ok: false, error: 'Could not load evidence.' }, { status: 500 })
  }
  if (!evidenceData) {
    return NextResponse.json({ ok: false, error: 'Evidence not found.' }, { status: 404 })
  }

  const evidence = evidenceData as { id: string; hold_id?: string | null; storage_path?: string | null }
  const holdId = getString(evidence.hold_id)
  const storagePath = getString(evidence.storage_path)

  if (!holdId) {
    return NextResponse.json({ ok: false, error: 'Evidence is not linked to a hold.' }, { status: 409 })
  }
  // Note-only evidence has no file to open.
  if (!storagePath) {
    return NextResponse.json({ ok: false, error: 'This evidence has no viewable file.' }, { status: 409 })
  }

  // Verify the Hold (resolved from the evidence row) belongs to this builder.
  // This single check enforces BOTH that the evidence belongs to the Hold and
  // that the builder is authorized to view it.
  const { data: holdData, error: holdError } = await service
    .from('job_holds')
    .select('id, builder_id')
    .eq('id', holdId)
    .maybeSingle()

  if (holdError) {
    console.error('[builder/holds/evidence-url] hold fetch failed', { holdId, error: holdError.message })
    return NextResponse.json({ ok: false, error: 'Could not load hold.' }, { status: 500 })
  }
  if (!holdData) {
    return NextResponse.json({ ok: false, error: 'Hold not found.' }, { status: 404 })
  }

  const hold = holdData as { id: string; builder_id?: string | null }
  if (hold.builder_id !== user.id) {
    return NextResponse.json({ ok: false, error: 'You do not have access to this evidence.' }, { status: 403 })
  }

  // Mint a short-lived signed URL from the existing evidence bucket.
  const { data: signed, error: signError } = await service.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)

  if (signError || !signed?.signedUrl) {
    console.error('[builder/holds/evidence-url] signed url failed', { evidenceId, error: signError?.message })
    return NextResponse.json({ ok: false, error: 'Could not generate a preview link.' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, url: signed.signedUrl })
}
