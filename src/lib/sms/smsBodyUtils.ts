export const MAX_SMS_CHARS = 120

// Builds an SMS body by substituting {loc} in template with the given location.
// If the result exceeds MAX_SMS_CHARS, the location is truncated.
// If location is empty or cannot be truncated enough, the fallback is returned.
// Templates and fallbacks must use plain ASCII (printable range 0x20-0x7E only).
export function smsWithLocation(template: string, location: string, fallback: string): string {
  if (!location) return fallback
  const full = template.replace('{loc}', location)
  if (full.length <= MAX_SMS_CHARS) return full
  const overhead = template.replace('{loc}', '').length
  const budget = MAX_SMS_CHARS - overhead - 3 // 3 for '...'
  if (budget >= 8) return template.replace('{loc}', location.slice(0, budget) + '...')
  return fallback
}
