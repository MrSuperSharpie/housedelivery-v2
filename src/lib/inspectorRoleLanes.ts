import type { InspectorRoleLane } from '@/lib/types'

export const INSPECTOR_ROLE_LANE_CONFIG: Record<InspectorRoleLane, {
  label: string
  description: string
}> = {
  permit_coordinator_non_signing: {
    label: 'Permit Coordinator (Non-Signing)',
    description: 'Coordinates submissions, documents, scheduling, and communications without sign-off authority.',
  },
  architect: {
    label: 'Architect',
    description: 'AIBC-registered architectural services lane for design and field review scopes.',
  },
  engineer: {
    label: 'Engineer',
    description: 'EGBC-registered engineering services lane with discipline-fit requirements.',
  },
  certified_professional: {
    label: 'Certified Professional (CP)',
    description: 'Additional CP badge layered on top of the underlying architect or engineer lane.',
  },
  electrical_fsr: {
    label: 'Electrical permit / field safety role (FSR)',
    description: 'Contractor-side electrical permit declaration or field safety authority lane.',
  },
  official_authority: {
    label: 'Building Official / Plumbing Official / AHJ authority',
    description: 'Restricted official-authority lane requiring AHJ or employer authorization.',
  },
}

export const INSPECTOR_ROLE_LANES = Object.keys(INSPECTOR_ROLE_LANE_CONFIG) as InspectorRoleLane[]

export function getInspectorRoleLaneLabel(lane: InspectorRoleLane): string {
  return INSPECTOR_ROLE_LANE_CONFIG[lane].label
}

export function normalizeInspectorRoleLanes(value: unknown): InspectorRoleLane[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is InspectorRoleLane => (
    typeof entry === 'string' && entry in INSPECTOR_ROLE_LANE_CONFIG
  ))
}
