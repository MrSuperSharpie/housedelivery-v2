import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ReliabilityEnforcementMode } from '@/lib/types'
import { requireAdminApi } from '@/lib/adminApiGuard'

interface AdminPolicyUpdateRequestBody {
  policyVersionId: string
  configPatch?: Record<string, unknown>
  enforcementMode?: ReliabilityEnforcementMode
  adminNote: string
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdminApi()
  if (!auth.authorized) return auth.response

  let body: AdminPolicyUpdateRequestBody
  try {
    body = await req.json() as AdminPolicyUpdateRequestBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.policyVersionId || !body.adminNote) {
    return NextResponse.json(
      { ok: false, error: 'policyVersionId and adminNote are required.' },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_update_reliability_policy_config', {
    p_policy_version_id: body.policyVersionId,
    p_config_patch: body.configPatch ?? {},
    p_enforcement_mode: body.enforcementMode ?? null,
    p_admin_note: body.adminNote,
  })

  if (error) {
    console.error('[admin/reliability/policy] RPC error', {
      policyVersionId: body.policyVersionId,
      error: error.message,
    })
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const payload = data as Record<string, unknown>
  return NextResponse.json(payload, { status: payload?.ok === true ? 200 : 422 })
}
