import type {
  DispatchTier,
  PricingInspectionType,
  PricingMode,
  SpecialistCredentialClass,
  SpecialistRoleId,
} from '@/lib/types'
import {
  BASE_HOLD_SERVICE_FEE_MULTIPLIER,
  DISPATCH_MULTIPLIERS,
  HOLD_PREMIUM_MULTIPLIER,
  PLATFORM_COMMISSION_RATE,
  getDispatchPricing,
  resolveHoldBaseRate,
  resolvePricingMode,
} from '@/lib/pricing/config'

export { PLATFORM_COMMISSION_RATE }

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function clampPositive(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export interface PricingBreakdownInput {
  dispatchTier: DispatchTier
  pricingMode?: PricingMode
  specialistRole?: SpecialistRoleId | null
  hourlyRate?: number
  billableHours?: number
  holdHours?: number
  holdHourlyRate?: number
  holdPremium?: number
  baseFee?: number
  requiresProfessionalSeal?: boolean
  requiresCP?: boolean
  inspectionType?: PricingInspectionType | string
  credentialClass?: SpecialistCredentialClass | string
  discipline?: string
}

export interface PricingBreakdown {
  pricingMode: PricingMode
  dispatchTier: DispatchTier
  urgencyLabel: string
  multiplier: number
  specialistRole?: SpecialistRoleId
  specialistRoleLabel?: string
  minimumHours?: number
  baseFee: number
  hourlyRate: number
  effectiveHourlyRate: number
  billableHours: number
  dispatchFee: number
  priorityAdjustment: number
  urgencyAdjustment: number
  holdHours: number
  holdHourlyRate: number
  holdPremiumMultiplier: number
  holdPremium: number
  holdCost: number
  totalTransactionVolume: number
  platformCommission: number
  builderEscrowTotal: number
  inspectorPayout: number
}

const roundMoney = roundCurrency

export function calculateHoldCost(baseRate: number, holdHours: number): number {
  const normalizedBaseRate = clampPositive(Number(baseRate), 0)
  const normalizedHoldHours = Math.max(0, Number(holdHours) || 0)
  return roundMoney(normalizedBaseRate * normalizedHoldHours * HOLD_PREMIUM_MULTIPLIER)
}

/**
 * Base Hold Service Fee — flat fee always charged when a same-day Hold is accepted.
 * Covers deficiency documentation, notes, photo upload, and re-verification rights.
 * Formula: baseRate × BASE_HOLD_SERVICE_FEE_MULTIPLIER (0.5)
 */
export function calculateBaseHoldServiceFee(baseRate: number): number {
  return roundMoney(clampPositive(Number(baseRate), 0) * BASE_HOLD_SERVICE_FEE_MULTIPLIER)
}

/**
 * Reserved Correction Window Fee — charged based on the builder's selected window.
 * Formula: baseRate × (windowMinutes / 60) × HOLD_PREMIUM_MULTIPLIER (1.5)
 */
export function calculateWindowFee(baseRate: number, windowMinutes: number): number {
  return calculateHoldCost(baseRate, Math.max(0, windowMinutes) / 60)
}

export function calculateEscrowEstimate(input: PricingBreakdownInput): PricingBreakdown {
  const dispatchConfig = getDispatchPricing(input.dispatchTier)
  const pricingMode = resolvePricingMode({
    pricingMode: input.pricingMode,
    requiresProfessionalSeal: input.requiresProfessionalSeal,
    requiresCP: input.requiresCP,
    inspectionType: input.inspectionType,
    credentialClass: input.credentialClass,
    discipline: input.discipline,
    specialistRole: input.specialistRole,
  })

  const multiplier = DISPATCH_MULTIPLIERS[input.dispatchTier] ?? dispatchConfig.multiplier
  const urgencyLabel = dispatchConfig.label
  const holdHours = clampPositive(Number(input.holdHours ?? 0), 0)
  const holdBaseRate = resolveHoldBaseRate({
    pricingMode,
    specialistRole: input.specialistRole,
    discipline: input.discipline,
    credentialClass: input.credentialClass,
    inspectionType: input.inspectionType,
    requiresProfessionalSeal: input.requiresProfessionalSeal,
    requiresCP: input.requiresCP,
  }).baseRate

  if (pricingMode === 'specialist_hourly') {
    const holdDetails = resolveHoldBaseRate({
      pricingMode,
      specialistRole: input.specialistRole,
      discipline: input.discipline,
      credentialClass: input.credentialClass,
      inspectionType: input.inspectionType,
      requiresProfessionalSeal: input.requiresProfessionalSeal,
      requiresCP: input.requiresCP,
    })
    const specialistRole = holdDetails.specialistRole!
    const baseHourlyRate = roundMoney(clampPositive(Number(input.hourlyRate ?? holdBaseRate), holdBaseRate))
    const minimumHours = 1.5
    const billableHours = Math.max(minimumHours, Number(input.billableHours ?? minimumHours))
    const preUrgencySubtotal = roundCurrency(baseHourlyRate * billableHours)
    const urgencyAdjustedSubtotal = roundCurrency(preUrgencySubtotal * multiplier)
    const effectiveHourlyRate = roundCurrency(baseHourlyRate * multiplier)
    const urgencyAdjustment = urgencyAdjustedSubtotal - preUrgencySubtotal
    const holdHourlyRate = roundMoney(holdBaseRate)
    const holdCost = calculateHoldCost(holdBaseRate, holdHours)
    const totalTransactionVolume = urgencyAdjustedSubtotal + holdCost
    const platformCommission = roundCurrency(totalTransactionVolume * PLATFORM_COMMISSION_RATE)
    const builderEscrowTotal = totalTransactionVolume + platformCommission

    return {
      pricingMode,
      dispatchTier: input.dispatchTier,
      urgencyLabel,
      multiplier,
      specialistRole,
      specialistRoleLabel: holdDetails.label,
      minimumHours,
      baseFee: preUrgencySubtotal,
      hourlyRate: baseHourlyRate,
      effectiveHourlyRate,
      billableHours,
      dispatchFee: urgencyAdjustedSubtotal,
      priorityAdjustment: urgencyAdjustment,
      urgencyAdjustment,
      holdHours,
      holdHourlyRate,
      holdPremiumMultiplier: HOLD_PREMIUM_MULTIPLIER,
      holdPremium: holdCost,
      holdCost,
      totalTransactionVolume,
      platformCommission,
      builderEscrowTotal,
      inspectorPayout: totalTransactionVolume,
    }
  }

  const resolvedBaseFee = roundCurrency(input.baseFee ?? dispatchConfig.baseRate)
  const dispatchFee = roundCurrency(resolvedBaseFee * multiplier)
  const urgencyAdjustment = dispatchFee - resolvedBaseFee
  const effectiveHourlyRate = roundMoney(holdBaseRate)
  const holdHourlyRate = roundMoney(holdBaseRate)
  const holdCost = calculateHoldCost(holdBaseRate, holdHours)
  const configuredDispatchTotal = roundCurrency(dispatchConfig.price)
  const basePlatformCommission = roundCurrency(configuredDispatchTotal - dispatchFee)
  const holdPlatformCommission = roundCurrency(holdCost * PLATFORM_COMMISSION_RATE)
  const platformCommission = basePlatformCommission + holdPlatformCommission
  const totalTransactionVolume = dispatchFee + holdCost
  const builderEscrowTotal = configuredDispatchTotal + holdCost + holdPlatformCommission

  return {
    pricingMode,
    dispatchTier: input.dispatchTier,
    urgencyLabel,
    multiplier,
    baseFee: resolvedBaseFee,
    hourlyRate: effectiveHourlyRate,
    effectiveHourlyRate,
    billableHours: 0,
    dispatchFee,
    priorityAdjustment: urgencyAdjustment,
    urgencyAdjustment,
    holdHours,
    holdHourlyRate,
    holdPremiumMultiplier: HOLD_PREMIUM_MULTIPLIER,
    holdPremium: holdCost,
    holdCost,
    totalTransactionVolume,
    platformCommission,
    builderEscrowTotal,
    inspectorPayout: totalTransactionVolume,
  }
}

export function calculatePricingBreakdown(input: PricingBreakdownInput): PricingBreakdown {
  return calculateEscrowEstimate(input)
}

export type VaultRetentionTier = 'standard' | 'professional' | 'legacy'

export interface VaultRetentionOption {
  tier: VaultRetentionTier
  label: string
  duration: string
  price: number
  monthlyPrice?: number
  description: string
  badge?: string
}

export const VAULT_RETENTION_OPTIONS: VaultRetentionOption[] = [
  {
    tier: 'standard',
    label: 'Standard',
    duration: '0 – 2 Years',
    price: 0,
    description: 'Included in the 10% platform commission. Full operational access and immediate record availability for 24 months following project completion.',
    badge: 'Included',
  },
  {
    tier: 'professional',
    label: 'Professional',
    duration: '2 – 10 Years',
    price: 49,
    description: 'One-time premium fee. Designed for professional and commercial risk management, defect-discovery, and documentation-retention realities.',
    badge: 'Most Popular',
  },
  {
    tier: 'legacy',
    label: 'Legacy',
    duration: 'Life of Building',
    price: 0,
    monthlyPrice: 9,
    description: 'Ongoing subscription. Supports long-term asset management, future refinancing, resale due diligence, and multi-decade property record continuity.',
    badge: 'Long-Term',
  },
]
