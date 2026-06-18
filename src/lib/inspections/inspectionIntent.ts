/**
 * Plain-language builder inspection intent layer.
 *
 * Builders should not have to understand stage numbers, disciplines, code
 * references, or checklist templates. They pick what they need in plain
 * language; this module recommends the existing builder stage (1–7) and
 * discipline behind the scenes. It sits ABOVE the 7-stage model — it only
 * pre-fills the values the DispatchModal already collects and persists. It
 * changes no governance, pricing, or storage behaviour.
 *
 * Mapping guarantees:
 *   • Every option (including "Not Sure") resolves to a concrete, non-null
 *     builder stage and discipline so governance/escrow never receive nulls.
 *   • Disciplines are existing DispatchModal DISCIPLINES ids, so the advanced
 *     "Change inspection details" step highlights the matching card.
 */

export type IntentConfidence = 'high' | 'medium' | 'low'

export interface InspectionIntentOption {
  /** Stable id used by the UI and tests. */
  id: string
  /** Plain-language label shown to the builder. */
  label: string
  /** One-line plain description — no codes or stage numbers. */
  helperText: string
  /** Existing builder stage (1–7) this intent maps to. */
  builderStage: number
  /** Existing DispatchModal discipline id this intent maps to. */
  discipline: string
  confidence: IntentConfidence
}

// Order here is the order shown to the builder.
export const INSPECTION_INTENT_OPTIONS: InspectionIntentOption[] = [
  {
    id: 'site_excavation',
    label: 'Site / Excavation',
    helperText: 'Site conditions, layout, and excavation readiness before concrete.',
    builderStage: 1,
    discipline: 'geotech',
    confidence: 'high',
  },
  {
    id: 'foundation',
    label: 'Foundation',
    helperText: 'Formwork and reinforcement before the concrete pour.',
    builderStage: 2,
    discipline: 'structural',
    confidence: 'high',
  },
  {
    id: 'framing',
    label: 'Framing',
    helperText: 'Structural framing and load paths before closing up.',
    builderStage: 3,
    discipline: 'structural',
    confidence: 'high',
  },
  {
    id: 'plumbing',
    label: 'Plumbing',
    helperText: 'Drainage, supply, and fixtures rough-in.',
    builderStage: 3,
    discipline: 'plumbing',
    confidence: 'high',
  },
  {
    id: 'electrical',
    label: 'Electrical',
    helperText: 'Electrical rough-in, grounding, and bonding.',
    builderStage: 3,
    discipline: 'electrical',
    confidence: 'high',
  },
  {
    id: 'mechanical_hvac',
    label: 'Mechanical / HVAC',
    helperText: 'Heating, ventilation, and air-handling rough-in.',
    builderStage: 3,
    discipline: 'mechanical',
    confidence: 'high',
  },
  {
    id: 'fire_rough_in',
    label: 'Fire / Life Safety Rough-In',
    helperText: 'Concealed fire and life-safety systems before closure.',
    builderStage: 3,
    discipline: 'fire_protection',
    confidence: 'high',
  },
  {
    id: 'fire_alarm_sprinkler_testing',
    label: 'Fire Alarm / Sprinkler Testing',
    helperText: 'Functional testing of fire alarm and sprinkler systems.',
    builderStage: 3,
    discipline: 'fire_protection',
    confidence: 'medium',
  },
  {
    id: 'insulation_energy',
    label: 'Insulation / Energy',
    helperText: 'Thermal, vapour, and energy-compliance before drywall.',
    builderStage: 4,
    discipline: 'architectural',
    confidence: 'high',
  },
  {
    id: 'interior_completion',
    label: 'Interior Completion',
    helperText: 'Interior finishes, fixtures, and completion items.',
    builderStage: 5,
    discipline: 'architectural',
    confidence: 'high',
  },
  {
    id: 'final_life_safety_occupancy',
    label: 'Final Life Safety / Occupancy Readiness',
    helperText: 'Final life-safety and occupancy sign-off readiness.',
    builderStage: 7,
    discipline: 'architectural',
    confidence: 'high',
  },
  {
    id: 'not_sure',
    label: 'Not Sure',
    helperText: 'Vero will confirm the right inspection with you and your inspector.',
    builderStage: 3,
    discipline: 'structural',
    confidence: 'low',
  },
]

/**
 * Plain-language follow-up shown when the builder picks "Not Sure". These are
 * broad, approximate buckets — never stage numbers or disciplines. Each maps to
 * a concrete, valid stage + discipline (low confidence) so the request is
 * always submittable; the inspector confirms exact scope downstream. Copy must
 * avoid implying Vero knows the precise scope.
 */
export interface NotSureBucketOption {
  id: string
  label: string
  builderStage: number
  discipline: string
  confidence: IntentConfidence
}

export const NOT_SURE_DISAMBIGUATION: NotSureBucketOption[] = [
  {
    id: 'unsure_structure_site',
    label: 'Site, excavation, foundation, or framing',
    builderStage: 3,
    discipline: 'structural',
    confidence: 'low',
  },
  {
    id: 'unsure_plumbing',
    label: 'Plumbing',
    builderStage: 3,
    discipline: 'plumbing',
    confidence: 'low',
  },
  {
    id: 'unsure_electrical',
    label: 'Electrical',
    builderStage: 3,
    discipline: 'electrical',
    confidence: 'low',
  },
  {
    id: 'unsure_mechanical_hvac',
    label: 'Mechanical / HVAC',
    builderStage: 3,
    discipline: 'mechanical',
    confidence: 'low',
  },
  {
    id: 'unsure_fire_life_safety',
    label: 'Fire / life safety',
    builderStage: 3,
    discipline: 'fire_protection',
    confidence: 'low',
  },
  {
    id: 'unsure_final_occupancy',
    label: 'Final inspection or occupancy readiness',
    builderStage: 7,
    discipline: 'architectural',
    confidence: 'low',
  },
]

export interface ResolvedIntent {
  builderStage: number
  discipline: string
  confidence: IntentConfidence
}

// Safe default for unknown ids — never null. Mirrors "Not Sure".
const FALLBACK_INTENT: ResolvedIntent = {
  builderStage: 3,
  discipline: 'structural',
  confidence: 'low',
}

/**
 * Resolves a plain-language intent id to a concrete builder stage + discipline.
 * Always returns non-null values; unknown ids fall back to a safe default so
 * downstream governance/escrow never receive a null stage or discipline.
 */
export function resolveIntentToStageDiscipline(intentId: string | null | undefined): ResolvedIntent {
  const option = INSPECTION_INTENT_OPTIONS.find(o => o.id === intentId)
    ?? NOT_SURE_DISAMBIGUATION.find(o => o.id === intentId)
  if (!option) return { ...FALLBACK_INTENT }
  return {
    builderStage: option.builderStage,
    discipline: option.discipline,
    confidence: option.confidence,
  }
}

/** Looks up the full option (for label/helper/confidence copy). */
export function getInspectionIntentOption(intentId: string | null | undefined): InspectionIntentOption | undefined {
  return INSPECTION_INTENT_OPTIONS.find(o => o.id === intentId)
}

/** Looks up a "Not Sure" follow-up bucket by id. */
export function getNotSureBucketOption(intentId: string | null | undefined): NotSureBucketOption | undefined {
  return NOT_SURE_DISAMBIGUATION.find(o => o.id === intentId)
}
