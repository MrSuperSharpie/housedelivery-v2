// Small Housing Catalogue (Phase 1) — Build Canada Homes / small-housing model
// reference.
//
// DISPLAY / METADATA ONLY. A job's catalogue model is descriptive and never
// influences checklist template resolution, which stays keyed on inspection
// stage + jurisdiction (see src/lib/inspections/resolveActiveTemplate.ts). Do not
// wire any field below into the resolver, pricing, or stage logic.

export type CatalogueModelCode =
  | 'micro_adu'
  | 'mini_home'
  | 'duplex'
  | 'rowhouse'
  | 'bc_fourplex_1'
  | 'bc_fourplex_2'
  | 'sixplex'

export type CatalogueBuildingCategory =
  | 'accessory_dwelling'
  | 'single_family'
  | 'two_unit'
  | 'multi_unit'

export interface CatalogueModel {
  code: CatalogueModelCode
  /** Builder-facing label shown in UI. */
  housingModel: string
  buildingCategory: CatalogueBuildingCategory
  /** Definitional dwelling-unit count for the model. */
  unitCount: number
  /** Definitional entry-door count for the model. */
  doorCount: number
}

// Unit and door counts are definitional for each catalogue model. Floor area is
// intentionally omitted in Phase 1: it varies by site and we do not assert an
// approximate square footage as authoritative on a municipal-grade record.
export const CATALOGUE_MODELS: Record<CatalogueModelCode, CatalogueModel> = {
  micro_adu:     { code: 'micro_adu',     housingModel: 'Micro / ADU',       buildingCategory: 'accessory_dwelling', unitCount: 1, doorCount: 1 },
  mini_home:     { code: 'mini_home',     housingModel: 'Mini / Small Home', buildingCategory: 'single_family',      unitCount: 1, doorCount: 1 },
  duplex:        { code: 'duplex',        housingModel: 'Duplex',            buildingCategory: 'two_unit',           unitCount: 2, doorCount: 2 },
  rowhouse:      { code: 'rowhouse',      housingModel: 'Rowhouse',          buildingCategory: 'multi_unit',         unitCount: 4, doorCount: 4 },
  bc_fourplex_1: { code: 'bc_fourplex_1', housingModel: 'BC Fourplex 1',     buildingCategory: 'multi_unit',         unitCount: 4, doorCount: 4 },
  bc_fourplex_2: { code: 'bc_fourplex_2', housingModel: 'BC Fourplex 2',     buildingCategory: 'multi_unit',         unitCount: 4, doorCount: 4 },
  sixplex:       { code: 'sixplex',       housingModel: 'Sixplex',           buildingCategory: 'multi_unit',         unitCount: 6, doorCount: 6 },
}

// Ordered list (smallest → largest) for selection menus.
export const CATALOGUE_MODEL_OPTIONS: CatalogueModel[] = [
  CATALOGUE_MODELS.micro_adu,
  CATALOGUE_MODELS.mini_home,
  CATALOGUE_MODELS.duplex,
  CATALOGUE_MODELS.rowhouse,
  CATALOGUE_MODELS.bc_fourplex_1,
  CATALOGUE_MODELS.bc_fourplex_2,
  CATALOGUE_MODELS.sixplex,
]

export function getCatalogueModel(code?: string | null): CatalogueModel | undefined {
  if (!code) return undefined
  return CATALOGUE_MODELS[code as CatalogueModelCode]
}

// Short display label, safe for any surface. Returns undefined for unknown or
// absent codes so callers render nothing for legacy / no-model jobs.
export function getCatalogueModelLabel(code?: string | null): string | undefined {
  return getCatalogueModel(code)?.housingModel
}
