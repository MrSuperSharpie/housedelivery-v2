import type { Region } from './types'

/**
 * Maps BC city/municipality names to their Vero inspector regions.
 *
 * All new Lower Mainland municipalities are grouped into the nearest existing
 * region so that jobs posted in these cities have a non-empty region and
 * inspector eligibility works without requiring new Region values or schema
 * changes. Ordered most-specific → least-specific; the first substring match
 * wins, though every group in this list currently resolves to one region so
 * ordering does not affect the result.
 *
 * Launch service area: Metro Vancouver / Lower Mainland only.
 * Vancouver Island, Interior, Northern BC, and Sea-to-Sky are not included.
 */
const CITY_REGION_MAP: Array<{ city: string; region: Region }> = [
  // ── Original five regions ───────────────────────────────────────────────────
  { city: 'Vancouver',       region: 'vancouver' },
  { city: 'Burnaby',         region: 'burnaby'   },
  { city: 'Surrey',          region: 'surrey'    },
  { city: 'Coquitlam',       region: 'coquitlam' },
  { city: 'Richmond',        region: 'richmond'  },

  // ── North Shore → vancouver ─────────────────────────────────────────────────
  // Substring "North Vancouver" also matches "City of North Vancouver" /
  // "District of North Vancouver" without needing separate entries.
  { city: 'North Vancouver', region: 'vancouver' },
  { city: 'West Vancouver',  region: 'vancouver' },

  // ── Tri-Cities → coquitlam ──────────────────────────────────────────────────
  { city: 'Port Coquitlam',  region: 'coquitlam' },
  { city: 'Port Moody',      region: 'coquitlam' },
  { city: 'Maple Ridge',     region: 'coquitlam' },

  // ── South Fraser → surrey ───────────────────────────────────────────────────
  // "Langley" also matches "Langley City", "City of Langley", and
  // "Township of Langley" via substring without extra entries.
  { city: 'Langley',         region: 'surrey'   },
  { city: 'White Rock',      region: 'surrey'   },

  // ── South of Fraser River → richmond ────────────────────────────────────────
  // "Delta" also matches "North Delta" / "South Delta" via substring.
  { city: 'Delta',           region: 'richmond' },

  // ── Central Lower Mainland → burnaby ────────────────────────────────────────
  { city: 'New Westminster', region: 'burnaby'  },
]

/**
 * Returns the Vero inspector region for a given BC city name, or null if the
 * city is not in the launch service area.
 *
 * Matching is case-insensitive substring: "Township of Langley" → 'surrey',
 * "District of North Vancouver" → 'vancouver', etc.
 */
export function normalizeRegionFromCity(city?: string): Region | null {
  const value = city?.trim().toLowerCase().replace(/\s+/g, ' ') ?? ''
  return CITY_REGION_MAP.find(({ city: c }) => value.includes(c.toLowerCase()))?.region ?? null
}
