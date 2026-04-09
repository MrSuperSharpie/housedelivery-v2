/**
 * Builder project adapter: legacy Project → BuilderProjectView.
 * Runs rules engine when ruleResult missing; builds permits[] from legacy permitNumber + suggested kinds.
 */

import type { Project, BuilderProjectView, ProjectPermitSummary } from '@/lib/types'
import { evaluateRules } from '@/lib/rules/engine'
import { getPermitTaxonomy } from '@/lib/rules/permit-taxonomy'
import type { PermitKind } from '@/lib/domain/types'

export function getBuilderProjectView(project: Project): BuilderProjectView {
  const ruleResult =
    project.ruleResult ??
    evaluateRules({
      address: project.address,
      city: project.city ?? '',
      province: 'BC',
      projectScope: project.projectScope ?? project.name,
    })

  const permits: ProjectPermitSummary[] = []

  if (project.permitNumber?.trim()) {
    permits.push({
      kind: 'building',
      label: 'Building Permit',
      permitNumber: project.permitNumber.trim(),
      source: 'existing',
    })
  }

  const suggestedSet = new Set(permits.map((p) => p.kind))
  for (const kind of ruleResult.suggestedPermitKinds) {
    if (suggestedSet.has(kind)) continue
    suggestedSet.add(kind)
    const entry = getPermitTaxonomy(kind as PermitKind)
    permits.push({
      kind,
      label: entry?.label ?? kind,
      source: 'suggested',
    })
  }

  return {
    project,
    propertySite: {
      address: project.address,
      city: project.city ?? '',
      province: 'BC',
    },
    jurisdiction: {
      id: ruleResult.jurisdiction.id,
      name: ruleResult.jurisdiction.name,
      region: ruleResult.jurisdiction.region,
    },
    codeSource: ruleResult.codeSource,
    triggers: ruleResult.triggers,
    suggestedPermitKinds: ruleResult.suggestedPermitKinds,
    permits,
  }
}
