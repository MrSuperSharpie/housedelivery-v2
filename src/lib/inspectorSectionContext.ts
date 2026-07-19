export const INSPECTOR_SECTION_CONTEXT_ANCHOR_PX = 128

export interface InspectorSectionPosition {
  code: string
  top: number
}

/** Returns the last checklist section whose top has reached the sticky context bar. */
export function getActiveInspectorSectionCode(
  positions: readonly InspectorSectionPosition[],
  anchorPx = INSPECTOR_SECTION_CONTEXT_ANCHOR_PX,
): string | null {
  if (positions.length === 0) return null

  let activeCode = positions[0].code
  for (const position of positions) {
    if (position.top > anchorPx) break
    activeCode = position.code
  }

  return activeCode
}
