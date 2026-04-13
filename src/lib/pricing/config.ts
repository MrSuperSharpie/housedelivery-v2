import type {
  DispatchPricing,
  DispatchTier,
  PricingInspectionType,
  PricingMode,
  SpecialistCredentialClass,
  SpecialistRoleId,
} from '@/lib/types'

export const PLATFORM_COMMISSION_RATE = 0.10
export const HOLD_PREMIUM_MULTIPLIER = 1.5
export const SPECIALIST_MINIMUM_HOURS = 1.5
export const FIXED_DISPATCH_HOLD_BASE_RATE = 250

export interface SpecialistRolePricing {
  id: SpecialistRoleId
  label: string
  rateRangeLabel: string
  defaultRate: number
  minimumHours: number
  description: string
}

export const DISPATCH_PRICING: DispatchPricing[] = [
  {
    tier: 'standard',
    label: 'Standard',
    description: 'Scheduled within 5–7 business days',
    timeframe: '5–7 business days',
    baseRate: 295,
    multiplier: 1,
    price: 325,
  },
  {
    tier: 'priority',
    label: 'Priority',
    description: 'Confirmed within 2–3 business days',
    timeframe: '2–3 business days',
    baseRate: 295,
    multiplier: 1.5,
    price: 487,
  },
  {
    tier: 'emergency',
    label: 'Emergency',
    description: 'Inspector on-site within 24 hours or next available day',
    timeframe: 'Within 24 hrs / next day',
    baseRate: 295,
    multiplier: 2,
    price: 649,
  },
]

export const DISPATCH_MULTIPLIERS: Record<DispatchTier, number> = {
  standard: 1.0,
  priority: 1.5,
  emergency: 2.0,
}

export const SPECIALIST_ROLE_PRICING: Record<SpecialistRoleId, SpecialistRolePricing> = {
  technologist_support: {
    id: 'technologist_support',
    label: 'Technologist Support / Evidence QA / Package Prep',
    rateRangeLabel: '$225-$290/hr',
    defaultRate: 250,
    minimumHours: SPECIALIST_MINIMUM_HOURS,
    description: 'For document QA, field evidence packaging, and professional support scope.',
  },
  electrical_engineer_specialist_review: {
    id: 'electrical_engineer_specialist_review',
    label: 'Electrical Engineer Specialist Review',
    rateRangeLabel: '$250-$325/hr',
    defaultRate: 295,
    minimumHours: SPECIALIST_MINIMUM_HOURS,
    description: 'For electrical specialist review, sign-off support, and governed technical review.',
  },
  structural_engineer_field_review: {
    id: 'structural_engineer_field_review',
    label: 'Structural Engineer Field Review / Sign-Off',
    rateRangeLabel: '$295-$375/hr',
    defaultRate: 345,
    minimumHours: SPECIALIST_MINIMUM_HOURS,
    description: 'For structural field review, sealed review, and sign-off scope.',
  },
  senior_specialist_urgent_sealed_review: {
    id: 'senior_specialist_urgent_sealed_review',
    label: 'Senior Specialist / Urgent Sealed Review',
    rateRangeLabel: '$375-$425/hr',
    defaultRate: 395,
    minimumHours: SPECIALIST_MINIMUM_HOURS,
    description: 'For urgent registered-professional review and high-accountability sealed deliverables.',
  },
}

export const SPECIALIST_ROLE_OPTIONS = Object.values(SPECIALIST_ROLE_PRICING)

export const SPECIALIST_PRICING_AUTO_SWITCH = {
  credentialClasses: ['PENG', 'AIBC', 'CP', 'SPECIALIST'] as SpecialistCredentialClass[],
  disciplines: ['structural', 'electrical_specialist', 'mechanical', 'geotechnical', 'geotech', 'architectural'] as const,
  inspectionTypes: ['field_review'] as PricingInspectionType[],
}

export function getDispatchPricing(tier: DispatchTier): DispatchPricing {
  return DISPATCH_PRICING.find(pricing => pricing.tier === tier) ?? DISPATCH_PRICING[0]
}

export function getSpecialistRolePricing(roleId: SpecialistRoleId): SpecialistRolePricing {
  return SPECIALIST_ROLE_PRICING[roleId]
}

export function getFixedDispatchHoldBaseRate(): number {
  return FIXED_DISPATCH_HOLD_BASE_RATE
}

export function getDefaultSpecialistRole(input: {
  discipline?: string
  credentialClass?: string
  inspectionType?: string
  requiresProfessionalSeal?: boolean
  requiresCP?: boolean
}): SpecialistRoleId {
  const discipline = input.discipline?.toLowerCase()
  const credentialClass = input.credentialClass?.toUpperCase()
  const inspectionType = input.inspectionType?.toLowerCase()

  if (discipline === 'structural') return 'structural_engineer_field_review'
  if (discipline === 'electrical' || discipline === 'electrical_specialist') return 'electrical_engineer_specialist_review'
  if (
    credentialClass === 'CP'
    || input.requiresCP
    || input.requiresProfessionalSeal
    || inspectionType === 'field_review'
    || discipline === 'architectural'
    || discipline === 'mechanical'
    || discipline === 'geotechnical'
    || discipline === 'geotech'
  ) {
    return 'senior_specialist_urgent_sealed_review'
  }
  return 'technologist_support'
}

export function resolvePricingMode(input: {
  pricingMode?: PricingMode
  requiresProfessionalSeal?: boolean
  requiresCP?: boolean
  inspectionType?: string
  credentialClass?: string
  discipline?: string
  specialistRole?: SpecialistRoleId | null
}): PricingMode {
  if (input.pricingMode) return input.pricingMode
  if (input.specialistRole) return 'specialist_hourly'

  const credentialClass = input.credentialClass?.toUpperCase()
  const inspectionType = input.inspectionType?.toLowerCase()
  const discipline = input.discipline?.toLowerCase()

  if (input.requiresProfessionalSeal || input.requiresCP) return 'specialist_hourly'
  if (inspectionType === 'field_review') return 'specialist_hourly'
  if (credentialClass && SPECIALIST_PRICING_AUTO_SWITCH.credentialClasses.includes(credentialClass as SpecialistCredentialClass)) {
    return 'specialist_hourly'
  }
  if (
    discipline
    && SPECIALIST_PRICING_AUTO_SWITCH.disciplines.includes(discipline as (typeof SPECIALIST_PRICING_AUTO_SWITCH.disciplines)[number])
  ) {
    return 'specialist_hourly'
  }
  return 'dispatch_fixed'
}

export function resolveHoldBaseRate(input: {
  pricingMode?: PricingMode
  specialistRole?: SpecialistRoleId | null
  discipline?: string
  credentialClass?: string
  inspectionType?: string
  requiresProfessionalSeal?: boolean
  requiresCP?: boolean
}): {
  pricingMode: PricingMode
  baseRate: number
  label: string
  specialistRole?: SpecialistRoleId
} {
  const pricingMode = resolvePricingMode({
    pricingMode: input.pricingMode,
    specialistRole: input.specialistRole,
    discipline: input.discipline,
    credentialClass: input.credentialClass,
    inspectionType: input.inspectionType,
    requiresProfessionalSeal: input.requiresProfessionalSeal,
    requiresCP: input.requiresCP,
  })

  if (pricingMode === 'specialist_hourly') {
    const specialistRole = input.specialistRole ?? getDefaultSpecialistRole({
      discipline: input.discipline,
      credentialClass: input.credentialClass,
      inspectionType: input.inspectionType,
      requiresProfessionalSeal: input.requiresProfessionalSeal,
      requiresCP: input.requiresCP,
    })
    const specialistConfig = getSpecialistRolePricing(specialistRole)
    return {
      pricingMode,
      baseRate: specialistConfig.defaultRate,
      label: specialistConfig.label,
      specialistRole,
    }
  }

  return {
    pricingMode,
    baseRate: getFixedDispatchHoldBaseRate(),
    label: 'Fixed Dispatch Hold Base Rate',
  }
}
