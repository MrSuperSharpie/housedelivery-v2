export function normalizeInspectorFirmName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const firmName = value.trim()
  return firmName || undefined
}
