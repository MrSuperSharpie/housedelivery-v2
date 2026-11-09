/**
 * Reconciles the legacy builder-facing inspection stages (integer 1–7, used by
 * the dispatch flow and stored on job_opportunities.stage) with the DB-backed
 * permit-centric inspection_stages model (stage_number 1–15).
 *
 * This is the single source of truth for that mapping. It was previously
 * duplicated inline in src/app/inspector/page.tsx (and, separately, in the
 * final-occupancy governance route, which is intentionally left untouched in
 * Phase 0). New code must import from here rather than copy the table again.
 */

/** Builder stage (1–7) → DB inspection_stages.stage_number. */
export const BUILDER_STAGE_TO_INSPECTION_STAGE: Record<number, number> = {
  1: 1,
  2: 5,
  3: 6,
  4: 12,
  5: 13,
  6: 14,
  7: 15,
}

/**
 * Builder stage 3 fans out to discipline-specific permit/scope stages. When a
 * discipline override exists it takes precedence over the base mapping.
 */
export const DISCIPLINE_INSPECTION_STAGE_OVERRIDE: Partial<
  Record<string, Partial<Record<number, number>>>
> = {
  architectural:   { 3: 7 },
  fire_protection: { 3: 8 },
  plumbing:        { 3: 9 },
  electrical:      { 3: 10 },
  mechanical:      { 3: 11 },
}

/**
 * Resolves a builder stage (+ optional discipline) to the DB
 * inspection_stages.stage_number. Discipline override wins; otherwise the base
 * map is used. Returns null when the builder stage is not a finite number or
 * has no mapping.
 */
export function resolveInspectionStageNumber(
  builderStage: number | undefined | null,
  discipline?: string | null,
): number | null {
  if (typeof builderStage !== 'number' || !Number.isFinite(builderStage)) return null
  const stage = Math.trunc(builderStage)
  const override = discipline ? DISCIPLINE_INSPECTION_STAGE_OVERRIDE[discipline]?.[stage] : undefined
  const stageNum = override ?? BUILDER_STAGE_TO_INSPECTION_STAGE[stage]
  return stageNum ?? null
}
