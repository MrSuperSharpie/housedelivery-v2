import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/lib/types'
import { getGovernedProject, upsertGovernedProject } from '@/lib/supabase/governance'
import { evaluateDbProjectReadiness } from '@/lib/governance/projects'

const supabase = createClient()

type Row = Record<string, unknown>

function emptyGpsCoord() {
  return {
    lat: 0,
    lng: 0,
    accuracy: 0,
    timestamp: '',
    deviceId: '',
  }
}

export function rowToProject(row: Row): Project {
  return {
    id: row.id as string,
    builderId: ((row.builder_id as string) ?? (row.user_id as string) ?? '') as string,
    name: ((row.name as string) ?? 'Unnamed Project') as string,
    address: ((row.address as string) ?? '') as string,
    city: ((row.city as string) ?? '') as string,
    permitNumber: ((row.permit_number as string) ?? '') as string,
    currentStage: ((row.current_stage as number) ?? 1) as number,
    status: ((row.status as Project['status']) ?? 'pending') as Project['status'],
    stages: ((row.stages as Project['stages']) ?? []) as Project['stages'],
    photos: ((row.photos as Project['photos']) ?? []) as Project['photos'],
    gpsCoord: ((row.gps_coord as Project['gpsCoord']) ?? emptyGpsCoord()) as Project['gpsCoord'],
    createdAt: ((row.created_at as string) ?? new Date().toISOString()) as string,
    updatedAt: ((row.updated_at as string) ?? new Date().toISOString()) as string,
    checklistUnlockedAt: (row.checklist_unlocked_at as string | undefined) ?? undefined,
    dispatchTier: (row.dispatch_tier as Project['dispatchTier']) ?? undefined,
    projectScope: (row.project_scope as string | undefined) ?? undefined,
  }
}

export async function listProjectsByBuilder(builderId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .or(`builder_id.eq.${builderId},user_id.eq.${builderId}`)
    .order('created_at', { ascending: false })

  if (error || !data) {
    console.error('listProjectsByBuilder:', error)
    return []
  }

  return (data as Row[]).map(rowToProject)
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error('getProjectById:', error)
    return null
  }

  return rowToProject(data as Row)
}

export async function upsertProject(project: Project, actorId?: string): Promise<Project | null> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('projects')
    .upsert({
      id: project.id,
      builder_id: project.builderId,
      user_id: actorId ?? project.builderId,
      name: project.name,
      address: project.address,
      city: project.city,
      permit_number: project.permitNumber,
      current_stage: project.currentStage,
      status: project.status,
      stages: project.stages,
      photos: project.photos,
      gps_coord: project.gpsCoord,
      checklist_unlocked_at: project.checklistUnlockedAt ?? null,
      dispatch_tier: project.dispatchTier ?? null,
      project_scope: project.projectScope ?? null,
      updated_at: now,
    }, { onConflict: 'id' })
    .select('*')
    .single()

  if (error || !data) {
    console.error('upsertProject:', error)
    return null
  }

  const mapped = rowToProject(data as Row)
  const governed = evaluateDbProjectReadiness(mapped, null)

  await upsertGovernedProject({
    id: mapped.id,
    builderId: mapped.builderId,
    name: mapped.name,
    address: mapped.address,
    city: mapped.city,
    permitNumber: mapped.permitNumber || undefined,
    builderOnboardingStatus: 'approved',
    completenessStatus: governed.ready ? 'complete' : 'needs_info',
    completenessBlockers: governed.blockers.map(message => ({
      ruleId: 'R-010',
      severity: 'error',
      blockerType: 'technical',
      code: 'project_incomplete',
      message,
    })),
    ruleSnapshot: {
      source: 'projects-table',
    },
    metadata: {
      source: 'projects.upsert',
    },
  })

  return mapped
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const { error } = await supabase.from('projects').delete().eq('id', projectId)
  if (error) {
    console.error('deleteProject:', error)
    return false
  }
  return true
}

export async function getDbProjectReadiness(projectId: string): Promise<ReturnType<typeof evaluateDbProjectReadiness>> {
  const [project, governed] = await Promise.all([
    getProjectById(projectId),
    getGovernedProject(projectId),
  ])

  return evaluateDbProjectReadiness(project, governed)
}
