import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getInspectorContext } from '@/lib/inspections/access'
import { resolveInspectionStageNumber } from '@/lib/inspections/builderStageMapping'
import { resolveActiveTemplate } from '@/lib/inspections/resolveActiveTemplate'

export const runtime = 'nodejs'

// GET /api/inspections/resolve-template?jobId=<uuid>
//
// Read-only. Resolves the active, jurisdiction-scoped DB checklist template for
// a job's stage and returns it as a blank reference scope (no permit responses,
// no progress). This drives the inspector-facing "Vero-resolved inspection
// scope" panel. It performs no writes and never uses the service role.
//
// Authorization (do NOT trust the client-passed jobId alone): the job is read
// server-side via the RLS-scoped session client and the caller must be allowed
// to view it — admin, the assigned inspector, the owning builder, or any
// authenticated user when the job is live on the open board.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated.' }, { status: 401 })
  }

  const jobId = req.nextUrl.searchParams.get('jobId')?.trim()
  if (!jobId) {
    return NextResponse.json({ ok: false, error: 'jobId is required.' }, { status: 400 })
  }

  // Authoritative job fields come from the DB, never from the client.
  const { data: job, error: jobError } = await supabase
    .from('job_opportunities')
    .select('id, builder_id, status, stage, required_discipline, city')
    .eq('id', jobId)
    .maybeSingle()

  if (jobError) {
    console.error('[resolve-template] job fetch failed', { jobId, error: jobError.message })
    return NextResponse.json({ ok: false, error: 'Could not load job.' }, { status: 500 })
  }
  if (!job) {
    return NextResponse.json({ ok: false, error: 'Job not found.' }, { status: 404 })
  }

  // ── Authorization: caller must be allowed to view this job ──────────────────
  const ctx = await getInspectorContext(user.id)
  const isOwningBuilder = job.builder_id === user.id
  const isLiveOnBoard = job.status === 'live'

  let isAssignedInspector = false
  if (!ctx.isAdmin && !isOwningBuilder && !isLiveOnBoard) {
    const { data: assignment } = await supabase
      .from('job_assignments')
      .select('id')
      .eq('job_id', jobId)
      .eq('inspector_id', user.id)
      .maybeSingle()
    isAssignedInspector = Boolean(assignment?.id)
  }

  if (!ctx.isAdmin && !isOwningBuilder && !isLiveOnBoard && !isAssignedInspector) {
    return NextResponse.json({ ok: false, error: 'You do not have access to this job.' }, { status: 403 })
  }

  // ── Resolve stage number, then the active template ──────────────────────────
  const stageNumber = resolveInspectionStageNumber(
    typeof job.stage === 'number' ? job.stage : null,
    typeof job.required_discipline === 'string' ? job.required_discipline : null,
  )
  if (stageNumber === null) {
    return NextResponse.json({ ok: true, scope: { resolved: false } })
  }

  const scope = await resolveActiveTemplate(supabase, {
    stageNumber,
    city: typeof job.city === 'string' ? job.city : null,
  })

  return NextResponse.json({ ok: true, scope })
}
