import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  checkSpecialtyAccess,
  getVisibleStagesForUser,
  getInspectorContext,
  getStageLockState,
} from '@/lib/inspections/access'
import type { InspectionStage, ChecklistItem, ChecklistResponse, StageLockState } from '@/lib/inspections/access'
import { resolveTemplateJurisdiction } from '@/lib/inspections/jurisdictionResolver'
import { StagesClient } from './StagesClient'

// null = error fetching lock state
export type LockMap = Record<string, StageLockState | null>

interface SchemaDependency {
  stageNumber: number
  title: string
}

interface Props {
  searchParams: Promise<{ stage?: string; permitId?: string }>
}

export default async function InspectorStagesPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in?role=inspector')

  const { stage: stageParam, permitId = null } = await searchParams
  const selectedNumber = stageParam ? parseInt(stageParam, 10) : null

  const [visibleStages, ctx] = await Promise.all([
    getVisibleStagesForUser(user.id),
    getInspectorContext(user.id),
  ])

  const selectedStage: InspectionStage | null = selectedNumber != null
    ? (visibleStages.find(s => s.stageNumber === selectedNumber) ?? null)
    : null

  // ── Lock states for ALL visible stages (sidebar indicators) ──────────────────
  // Only fetch when a permitId is present; otherwise the page is a reference view.
  const lockMap: LockMap = {}
  if (permitId) {
    const results = await Promise.allSettled(
      visibleStages.map(s => getStageLockState(permitId, s.id))
    )
    visibleStages.forEach((stage, i) => {
      const r = results[i]
      lockMap[stage.id] = r.status === 'fulfilled' ? r.value : null
    })
  }

  // ── Per-stage data for selected stage ────────────────────────────────────────
  let checklistItems: ChecklistItem[] = []
  let checklistResponses: ChecklistResponse[] = []
  let schemaDependencies: SchemaDependency[] = []
  let completedChecklistCount = 0
  let stageStatus: { status: string; sealedAt: string | null; sealedByName: string | null } | null = null

  if (selectedStage) {
    // ── Active template selection (jurisdiction-aware) ──────────────────────
    // projects.id is numeric; the stage engine stores permit_id as its text form.
    let activeTemplateId: string | null = null
    const projectIdNum = permitId ? parseInt(permitId, 10) : NaN

    if (!isNaN(projectIdNum)) {
      const { data: project } = await supabase
        .from('projects')
        .select('city')
        .eq('id', projectIdNum)
        .single()

      const jurisdictionResolution = resolveTemplateJurisdiction({ city: project?.city ?? null })

      if (jurisdictionResolution.status === 'active') {
        const { data: jx } = await supabase
          .from('jurisdictions')
          .select('id')
          .eq('slug', jurisdictionResolution.slug)
          .maybeSingle()

        if (jx?.id) {
          const { data: tmpl } = await supabase
            .from('stage_checklist_templates')
            .select('id')
            .eq('stage_id', selectedStage.id)
            .eq('jurisdiction_id', jx.id)
            .eq('is_active', true)
            .order('version', { ascending: false })
            .limit(1)
            .maybeSingle()
          activeTemplateId = tmpl?.id ?? null
        }
      }
    }

    // Fallback: any active template for this stage (e.g. reference view or unknown city)
    if (!activeTemplateId) {
      const { data: tmpl } = await supabase
        .from('stage_checklist_templates')
        .select('id')
        .eq('stage_id', selectedStage.id)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()
      activeTemplateId = tmpl?.id ?? null
    }

    // ── Checklist items ─────────────────────────────────────────────────────
    if (activeTemplateId) {
      const { data: rawItems } = await supabase
        .from('stage_checklist_items')
        .select('id, template_id, label, requirement_text, sort_order, item_type, is_required, legal_reference')
        .eq('template_id', activeTemplateId)
        .neq('is_active', false)
        .order('sort_order')

      checklistItems = (rawItems ?? []).map((i: Record<string, unknown>) => ({
        id: i.id as string,
        templateId: i.template_id as string,
        label: i.label as string,
        requirementText: (i.requirement_text as string | null) ?? '',
        sortOrder: i.sort_order as number,
        itemType: i.item_type as string,
        isRequired: i.is_required as boolean,
        legalReference: (i.legal_reference as string | null) ?? null,
      }))
    }

    // ── Schema dependencies (reference view, shown when no permitId) ────────
    const { data: depRows } = await supabase
      .from('inspection_stage_dependencies')
      .select('depends_on_stage_id')
      .eq('stage_id', selectedStage.id)

    const depIds = (depRows ?? []).map((d: { depends_on_stage_id: string }) => d.depends_on_stage_id)
    if (depIds.length > 0) {
      const { data: depStages } = await supabase
        .from('inspection_stages')
        .select('stage_number, title')
        .in('id', depIds)
        .order('stage_number')

      schemaDependencies = (depStages ?? []).map((s: Record<string, unknown>) => ({
        stageNumber: s.stage_number as number,
        title: s.title as string,
      }))
    }

    // ── Existing responses + completion count ───────────────────────────────
    if (permitId && checklistItems.length > 0) {
      const itemIds = checklistItems.map(i => i.id)
      const requiredIds = checklistItems.filter(i => i.isRequired).map(i => i.id)

      const [responsesResult, countResult] = await Promise.all([
        supabase
          .from('permit_checklist_responses')
          .select('checklist_item_id, response_status, response')
          .eq('permit_id', permitId)
          .in('checklist_item_id', itemIds),
        requiredIds.length > 0
          ? supabase
              .from('permit_checklist_responses')
              .select('id', { count: 'exact', head: true })
              .eq('permit_id', permitId)
              .in('response_status', ['completed', 'approved'])
              .in('checklist_item_id', requiredIds)
          : Promise.resolve({ count: 0, data: null, error: null }),
      ])

      checklistResponses = (responsesResult.data ?? []).map((r: Record<string, unknown>) => ({
        itemId: r.checklist_item_id as string,
        status: r.response_status as string,
        notes: ((r.response as Record<string, unknown> | null)?.notes as string | null) ?? null,
      }))

      completedChecklistCount = countResult.count ?? 0
    }

    // ── Seal status for this stage (shown after sealing) ───────────────────
    if (permitId) {
      const { data: statusRow } = await supabase
        .from('permit_stage_statuses')
        .select('status, sealed_at, sealed_by')
        .eq('permit_id', permitId)
        .eq('stage_id', selectedStage.id)
        .maybeSingle()

      if (statusRow) {
        let sealedByName: string | null = null
        if (statusRow.status === 'sealed' && statusRow.sealed_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', statusRow.sealed_by)
            .single()
          if (profile) {
            sealedByName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null
          }
        }
        stageStatus = {
          status: statusRow.status as string,
          sealedAt: (statusRow.sealed_at as string | null) ?? null,
          sealedByName,
        }
      }
    }
  }

  // ── Seal gate computation ────────────────────────────────────────────────────
  const selectedLockState = selectedStage && permitId
    ? (lockMap[selectedStage.id] ?? null)
    : undefined  // undefined = no permit context

  function sealGate(): { allowed: boolean; reason: string | null } {
    if (!selectedStage || !permitId) return { allowed: false, reason: null }
    if (selectedLockState === undefined) return { allowed: false, reason: 'Permit context not available.' }
    if (selectedLockState === null) return { allowed: false, reason: 'Unable to verify prerequisite status.' }
    if (selectedLockState.isLocked) return { allowed: false, reason: 'Locked until prerequisite seals are complete.' }
    if (!checkSpecialtyAccess(ctx, selectedStage)) return { allowed: false, reason: 'Your specialty does not allow sealing this stage.' }
    const requiredCount = checklistItems.filter(i => i.isRequired).length
    if (requiredCount > 0 && completedChecklistCount < requiredCount) {
      return { allowed: false, reason: 'Complete all required checklist items first.' }
    }
    return { allowed: true, reason: null }
  }

  const { allowed: sealAllowed, reason: sealBlockReason } = sealGate()

  return (
    <StagesClient
      visibleStages={visibleStages}
      selectedStageNumber={selectedNumber}
      selectedStage={selectedStage}
      checklistItems={checklistItems}
      checklistResponses={checklistResponses}
      schemaDependencies={schemaDependencies}
      isAdmin={ctx.isAdmin}
      permitId={permitId}
      lockMap={lockMap}
      selectedLockState={selectedLockState}
      sealAllowed={sealAllowed}
      sealBlockReason={sealBlockReason}
      checklistProgress={{ completed: completedChecklistCount, total: checklistItems.filter(i => i.isRequired).length }}
      stageStatus={stageStatus}
    />
  )
}
