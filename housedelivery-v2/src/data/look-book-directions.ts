/** Four printed design directions, each available in both inclusion tiers. */
export function createLookBookDirections<T>(
  directions: readonly [T, T, T, T],
) {
  return (["premium", "signature"] as const).flatMap((level) =>
    directions.map((direction, index) => ({
      ...direction,
      level,
      optionNumber: String(index + 1),
    })),
  );
}
