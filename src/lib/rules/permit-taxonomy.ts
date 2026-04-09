/**
 * Permit / approval taxonomy — typed model for BC permit types.
 * Capable of representing land use, building, trade, and specialist approvals.
 */

import type { PermitKind } from '@/lib/domain/types'

export interface PermitTaxonomyEntry {
  kind: PermitKind
  label: string
  description?: string
  /** Typical authority types */
  authorityTypes?: string[]
  /** Trigger keys from rules engine */
  triggerKeys?: string[]
}

/** Minimum taxonomy for Phase 1; expand per municipality later */
export const PERMIT_TAXONOMY: PermitTaxonomyEntry[] = [
  { kind: 'land_use', label: 'Land Use', authorityTypes: ['municipal'] },
  { kind: 'zoning', label: 'Zoning', authorityTypes: ['municipal'] },
  { kind: 'rezoning', label: 'Rezoning', authorityTypes: ['municipal'] },
  { kind: 'development_permit', label: 'Development Permit', authorityTypes: ['municipal'] },
  { kind: 'subdivision', label: 'Subdivision', authorityTypes: ['municipal'] },
  { kind: 'heritage', label: 'Heritage', authorityTypes: ['municipal'] },
  { kind: 'alr_alc', label: 'ALR / ALC', authorityTypes: ['ALC'], triggerKeys: ['alr', 'alc'] },
  { kind: 'contamination_sds', label: 'Contamination / SDS', authorityTypes: ['municipal', 'provincial'], triggerKeys: ['sds', 'contaminated_site'] },
  { kind: 'watercourse_riparian', label: 'Watercourse / Riparian', authorityTypes: ['municipal', 'provincial'], triggerKeys: ['wsa', 'riparian', 'stream'] },
  { kind: 'grading', label: 'Grading', authorityTypes: ['municipal'] },
  { kind: 'excavation', label: 'Excavation', authorityTypes: ['municipal'] },
  { kind: 'esc', label: 'Erosion & Sediment Control', authorityTypes: ['municipal'] },
  { kind: 'trees', label: 'Tree Protection', authorityTypes: ['municipal'] },
  { kind: 'street_use', label: 'Street Use', authorityTypes: ['municipal'] },
  { kind: 'driveway', label: 'Driveway', authorityTypes: ['municipal'] },
  { kind: 'service_connections', label: 'Service Connections', authorityTypes: ['municipal', 'utility'] },
  { kind: 'building', label: 'Building Permit', authorityTypes: ['municipal'] },
  { kind: 'demolition', label: 'Demolition', authorityTypes: ['municipal'] },
  { kind: 'occupancy', label: 'Occupancy', authorityTypes: ['municipal'] },
  { kind: 'plumbing', label: 'Plumbing', authorityTypes: ['municipal'] },
  { kind: 'electrical', label: 'Electrical', authorityTypes: ['municipal', 'BCSA'] },
  { kind: 'gas', label: 'Gas', authorityTypes: ['municipal', 'Technical Safety BC'] },
  { kind: 'mechanical_hvac', label: 'Mechanical / HVAC', authorityTypes: ['municipal'] },
  { kind: 'fire_protection', label: 'Fire Protection', authorityTypes: ['municipal'] },
  { kind: 'elevating_devices', label: 'Elevating Devices', authorityTypes: ['Technical Safety BC'] },
  { kind: 'boilers_pressure_vessels', label: 'Boilers / Pressure Vessels', authorityTypes: ['Technical Safety BC'] },
  { kind: 'refrigeration', label: 'Refrigeration', authorityTypes: ['Technical Safety BC'] },
  { kind: 'onsite_sewage_septic', label: 'Onsite Sewage / Septic', authorityTypes: ['municipal', 'health'], triggerKeys: ['septic', 'onsite_sewage'] },
  { kind: 'letters_of_assurance', label: 'Letters of Assurance', authorityTypes: ['municipal'], triggerKeys: ['loa'] },
  { kind: 'worksafe_nop', label: 'WorkSafe NOP', authorityTypes: ['WorkSafe BC'] },
  { kind: 'builder_licence', label: 'Builder Licensing', authorityTypes: ['provincial'] },
  { kind: 'home_warranty', label: 'Home Warranty', authorityTypes: ['provincial'] },
  { kind: 'other', label: 'Other', authorityTypes: [] },
]

export function getPermitTaxonomy(kind: PermitKind): PermitTaxonomyEntry | undefined {
  return PERMIT_TAXONOMY.find((e) => e.kind === kind)
}
