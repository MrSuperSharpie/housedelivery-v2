export interface DbProjectReadinessInput {
  id: string
  name?: string
  address?: string
  city?: string
  permitNumber?: string
  builderOnboardingStatus?: string
  status?: string
  localOnly?: boolean
}

export interface GovernedProjectSnapshotInput {
  completenessStatus?: 'complete' | 'needs_info'
  completenessBlockers?: Array<{ ruleId: string; message: string }>
}

export interface ProjectReadinessSnapshot {
  projectId: string
  ready: boolean
  source: 'database'
  blockers: string[]
}

export function evaluateDbProjectReadiness(
  project: DbProjectReadinessInput | null | undefined,
  governed: GovernedProjectSnapshotInput | null | undefined,
): ProjectReadinessSnapshot {
  if (!project) {
    return {
      projectId: 'unknown-project',
      ready: false,
      source: 'database',
      blockers: ['Project was not found in the database.'],
    }
  }

  const blockers: string[] = []

  if (project.localOnly) {
    blockers.push('Local-only project state is not an eligible governance source.')
  }

  if (!project.name?.trim()) blockers.push('Project name is required.')
  if (!project.address?.trim()) blockers.push('Project address is required.')
  if (!project.city?.trim()) blockers.push('Project city is required.')
  if (!project.permitNumber?.trim()) blockers.push('Permit number is required.')

  if (project.builderOnboardingStatus && project.builderOnboardingStatus !== 'approved') {
    blockers.push(`Builder onboarding must be approved, received '${project.builderOnboardingStatus}'.`)
  }

  if (governed?.completenessStatus === 'needs_info') {
    blockers.push(
      ...(governed.completenessBlockers ?? []).map(issue => `${issue.ruleId}: ${issue.message}`),
    )
  }

  return {
    projectId: project.id,
    ready: blockers.length === 0,
    source: 'database',
    blockers,
  }
}
