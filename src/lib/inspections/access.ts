import { createClient } from '@/lib/supabase/server'
import { isAdminLikeRole } from '@/lib/adminAccess'

// ─── Exported Types ───────────────────────────────────────────────────────────

export type InspectorSpecialty =
  | 'master'
  | 'electrical'
  | 'plumbing'
  | 'mechanical'
  | 'structural'
  | 'geotechnical'
  | 'architectural'
  | 'fire_suppression'

export interface InspectorContext {
  userId: string
  role: string | null
  inspectorSpecialty: InspectorSpecialty | null
  isAdmin: boolean
  isMasterInspector: boolean
}

export interface InspectionStage {
  id: string
  stageNumber: number
  slug: string
  title: string
  phaseNumber: number
  discipline: string | null
  visibleToSpecialties: string[]
  requiresMasterSeal: boolean
  isActive: boolean
}

export interface StageLockState {
  isLocked: boolean
  missingDependencies: Array<{
    stageId: string
    slug: string
    title: string
  }>
}

export interface ChecklistItem {
  id: string
  templateId: string
  label: string
  requirementText: string
  sortOrder: number
  itemType: string
  isRequired: boolean
  legalReference: string | null
}

export interface ChecklistResponse {
  itemId: string
  status: string  // 'pending' | 'completed' | 'approved' | 'flagged'
  notes: string | null
}

export interface SealResult {
  allowed: boolean
  reason?: string
}

// ─── Pure helper (exported for testing) ──────────────────────────────────────

/** Returns true if ctx is permitted to seal the given stage. Admin/master bypass specialty gating. */
export function checkSpecialtyAccess(
  ctx: Pick<InspectorContext, 'isAdmin' | 'isMasterInspector' | 'inspectorSpecialty'>,
  stage: Pick<InspectionStage, 'visibleToSpecialties' | 'requiresMasterSeal'>
): boolean {
  if (ctx.isAdmin || ctx.isMasterInspector) return true
  if (stage.requiresMasterSeal) return false
  if (!ctx.inspectorSpecialty) return false
  return stage.visibleToSpecialties.includes(ctx.inspectorSpecialty)
}

// ─── DB functions ─────────────────────────────────────────────────────────────

export async function getInspectorContext(userId: string): Promise<InspectorContext> {
  const supabase = await createClient()

  const [{ data: profile }, { data: authData }] = await Promise.all([
    supabase.from('profiles').select('inspector_specialty').eq('id', userId).single(),
    supabase.auth.getUser(),
  ])

  const user = authData.user
  const role =
    typeof user?.user_metadata?.role === 'string'
      ? user.user_metadata.role
      : typeof user?.app_metadata?.role === 'string'
        ? user.app_metadata.role
        : null

  const isAdmin = isAdminLikeRole(role)
  const inspectorSpecialty = (profile?.inspector_specialty as InspectorSpecialty | null) ?? null

  return {
    userId,
    role,
    inspectorSpecialty,
    isAdmin,
    isMasterInspector: isAdmin || inspectorSpecialty === 'master',
  }
}

export async function getVisibleStagesForUser(userId: string): Promise<InspectionStage[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_visible_inspection_stages', {
    p_user_id: userId,
  })

  if (error) throw error

  return ((data as unknown[]) ?? []).map((row) => {
    const r = row as Record<string, unknown>
    return {
      id: r.id as string,
      stageNumber: r.stage_number as number,
      slug: r.slug as string,
      title: r.title as string,
      phaseNumber: r.phase_number as number,
      discipline: (r.discipline as string | null) ?? null,
      visibleToSpecialties: (r.visible_to_specialties as string[]) ?? [],
      requiresMasterSeal: r.requires_master_seal as boolean,
      isActive: r.is_active as boolean,
    }
  })
}

export async function getStageLockState(
  permitId: string,
  stageId: string
): Promise<StageLockState> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_stage_lock_state', {
    p_permit_id: permitId,
    p_stage_id: stageId,
  })

  if (error) throw error

  const result = (Array.isArray(data) ? data[0] : data) as {
    is_locked: boolean
    missing_dependencies: Array<{
      stage_id: string
      slug: string
      title: string
    }>
  } | null

  return {
    isLocked: result?.is_locked ?? true,
    missingDependencies: (result?.missing_dependencies ?? []).map((dep) => ({
      stageId: dep.stage_id,
      slug: dep.slug,
      title: dep.title,
    })),
  }
}

export async function canUserSealStage(
  userId: string,
  permitId: string,
  stageId: string
): Promise<SealResult> {
  const supabase = await createClient()

  const [ctx, lockState, { data: stageRow }] = await Promise.all([
    getInspectorContext(userId),
    getStageLockState(permitId, stageId),
    supabase
      .from('inspection_stages')
      .select('visible_to_specialties, requires_master_seal')
      .eq('id', stageId)
      .single(),
  ])

  if (!stageRow) {
    return { allowed: false, reason: 'Stage not found.' }
  }

  const stage = {
    visibleToSpecialties: (stageRow.visible_to_specialties as string[]) ?? [],
    requiresMasterSeal: stageRow.requires_master_seal as boolean,
  }

  if (!checkSpecialtyAccess(ctx, stage)) {
    return { allowed: false, reason: 'Your specialty does not permit sealing this stage.' }
  }

  if (lockState.isLocked) {
    const names = lockState.missingDependencies.map((d) => d.title).join(', ')
    return { allowed: false, reason: `Dependencies not yet sealed: ${names}.` }
  }

  // All required checklist items must have a completed response for this permit
  const { data: templates } = await supabase
    .from('stage_checklist_templates')
    .select('id')
    .eq('stage_id', stageId)

  const templateIds = (templates ?? []).map((t: { id: string }) => t.id)

  if (templateIds.length > 0) {
    const { data: requiredItems } = await supabase
      .from('stage_checklist_items')
      .select('id')
      .in('template_id', templateIds)
      .eq('is_required', true)

    const requiredIds = (requiredItems ?? []).map((i: { id: string }) => i.id)

    if (requiredIds.length > 0) {
      const { count } = await supabase
        .from('permit_checklist_responses')
        .select('id', { count: 'exact', head: true })
        .eq('permit_id', permitId)
        .in('response_status', ['completed', 'approved'])
        .in('checklist_item_id', requiredIds)

      if ((count ?? 0) < requiredIds.length) {
        return { allowed: false, reason: 'Required checklist items are not all complete.' }
      }
    }
  }

  return { allowed: true }
}
