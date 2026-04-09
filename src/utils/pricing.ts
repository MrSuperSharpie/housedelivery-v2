import { DISPATCH_PRICING } from '@/lib/mockData'
import { RETENTION_RATES } from '@/lib/types'
import type { DispatchTier } from '@/lib/types'

export const PLATFORM_COMMISSION_RATE = 0.10

function roundCurrency(value: number) {
  return Math.round(value)
}

function getTierConfig(dispatchTier: DispatchTier) {
  return DISPATCH_PRICING.find(pricing => pricing.tier === dispatchTier) ?? DISPATCH_PRICING[0]
}

export interface PricingBreakdownInput {
  dispatchTier: DispatchTier
  baseFee?: number
  holdHours?: number
  holdHourlyRate?: number
  holdPremium?: number
}

export interface PricingBreakdown {
  baseFee: number
  multiplier: number
  dispatchFee: number
  priorityAdjustment: number
  holdHours: number
  holdHourlyRate: number
  holdPremium: number
  totalTransactionVolume: number
  platformCommission: number
  builderEscrowTotal: number
  inspectorPayout: number
}

export function calculatePricingBreakdown({
  dispatchTier,
  baseFee,
  holdHours = 0,
  holdHourlyRate,
  holdPremium,
}: PricingBreakdownInput): PricingBreakdown {
  const tierConfig = getTierConfig(dispatchTier)
  const resolvedBaseFee = roundCurrency(baseFee ?? tierConfig.baseRate)
  const multiplier = tierConfig.multiplier
  const dispatchFee = roundCurrency(resolvedBaseFee * multiplier)
  const priorityAdjustment = dispatchFee - resolvedBaseFee
  const resolvedHoldHourlyRate = roundCurrency(holdHourlyRate ?? RETENTION_RATES[dispatchTier])
  const resolvedHoldPremium = roundCurrency(
    holdPremium ?? (holdHours > 0 ? resolvedHoldHourlyRate * holdHours : 0)
  )
  const totalTransactionVolume = dispatchFee + resolvedHoldPremium
  const platformCommission = roundCurrency(totalTransactionVolume * PLATFORM_COMMISSION_RATE)
  const builderEscrowTotal = totalTransactionVolume + platformCommission

  return {
    baseFee: resolvedBaseFee,
    multiplier,
    dispatchFee,
    priorityAdjustment,
    holdHours,
    holdHourlyRate: resolvedHoldHourlyRate,
    holdPremium: resolvedHoldPremium,
    totalTransactionVolume,
    platformCommission,
    builderEscrowTotal,
    inspectorPayout: totalTransactionVolume,
  }
}

// ─── Vault Retention Tier Pricing ────────────────────────────────────────────
// Per New Standard §11: Three retention tiers. Standard is included in the
// 10% commission. Professional and Legacy are add-ons billed to the builder.

export type VaultRetentionTier = 'standard' | 'professional' | 'legacy'

export interface VaultRetentionOption {
  tier: VaultRetentionTier
  label: string
  duration: string
  price: number        // CAD one-time fee (0 = included)
  monthlyPrice?: number // for Legacy subscription
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
