export const ACTIVE_BC_TEMPLATE_JURISDICTIONS = {
  provinceBase: 'bcbc_2024',
  vancouver: 'vbbl_2025',
} as const

export const DORMANT_ONTARIO_JURISDICTION_FAMILY = {
  family: 'ontario',
  province: 'ON',
  baseSlug: 'obc_2024',
  name: 'Ontario Building Code 2024',
  codeVersion: 'OBC 2024',
  isActive: false,
  publicRoutingEnabled: false,
  futureOverlays: [
    { slug: 'toronto_obc_2024', municipality: 'Toronto', isActive: false },
    { slug: 'ottawa_obc_2024', municipality: 'Ottawa', isActive: false },
    { slug: 'mississauga_obc_2024', municipality: 'Mississauga', isActive: false },
  ],
} as const

export interface TemplateJurisdictionInput {
  city?: string | null
  province?: string | null
  context?: string | null
}

export type TemplateJurisdictionResolution =
  | {
      status: 'active'
      family: 'bc'
      slug: typeof ACTIVE_BC_TEMPLATE_JURISDICTIONS.provinceBase | typeof ACTIVE_BC_TEMPLATE_JURISDICTIONS.vancouver
      allowTemplateFallback: true
      reason: string
    }
  | {
      status: 'dormant'
      family: 'ontario'
      slug: null
      dormantSlug: typeof DORMANT_ONTARIO_JURISDICTION_FAMILY.baseSlug
      allowTemplateFallback: false
      reason: string
    }

function normalize(value?: string | null): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function hasExplicitOntarioContext(input: TemplateJurisdictionInput): boolean {
  const province = normalize(input.province).replace(/\./g, '')
  if (province === 'on' || province === 'ontario') return true

  const context = normalize(input.context)
  if (/\b(ontario|obc|o\.?\s*reg\.?\s*163\/24)\b/i.test(context)) return true

  const city = normalize(input.city)
  return /,\s*(on|ontario)\b/i.test(city)
}

/**
 * Resolves the currently active DB checklist jurisdiction.
 *
 * BC launch behavior is intentionally preserved:
 * - Vancouver resolves to VBBL 2025.
 * - empty, unknown, and non-Vancouver BC cities resolve to BCBC 2024.
 *
 * Ontario is documented as a dormant family only. When Ontario context is
 * explicit, the helper refuses to fall back to BCBC so future Ontario pilots do
 * not silently receive a BC checklist.
 */
export function resolveTemplateJurisdiction(
  input: TemplateJurisdictionInput = {},
): TemplateJurisdictionResolution {
  if (hasExplicitOntarioContext(input)) {
    return {
      status: 'dormant',
      family: 'ontario',
      slug: null,
      dormantSlug: DORMANT_ONTARIO_JURISDICTION_FAMILY.baseSlug,
      allowTemplateFallback: false,
      reason: 'Ontario scaffold is dormant and must not resolve to BCBC.',
    }
  }

  const city = normalize(input.city)
  if (city === 'vancouver') {
    return {
      status: 'active',
      family: 'bc',
      slug: ACTIVE_BC_TEMPLATE_JURISDICTIONS.vancouver,
      allowTemplateFallback: true,
      reason: 'Vancouver resolves to VBBL 2025.',
    }
  }

  return {
    status: 'active',
    family: 'bc',
    slug: ACTIVE_BC_TEMPLATE_JURISDICTIONS.provinceBase,
    allowTemplateFallback: true,
    reason: 'BC launch fallback resolves to BCBC 2024.',
  }
}
