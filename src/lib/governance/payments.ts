export interface PaymentHydrationInput {
  dispatchTier?: 'standard' | 'priority' | 'emergency'
  offeredRate?: number | null
  escrowAmount?: number | null
  platformCommission?: number | null
}

export interface PaymentHydrationResult {
  baseFeeAmount: number
  holdPremiumAmount: number
  sitelineCommissionAmount: number
  usedFallback: boolean
}

export function hydrateGovernedPaymentAmounts(
  input: PaymentHydrationInput,
  defaults: {
    baseFeeAmount?: number
    holdPremiumAmount?: number
    sitelineCommissionAmount?: number
  } = {},
): PaymentHydrationResult {
  const offeredRate = Number(input.offeredRate ?? 0)
  const escrowAmount = Number(input.escrowAmount ?? 0)
  const commission = Number(input.platformCommission ?? 0)

  const holdPremiumAmount = Math.max(0, escrowAmount - offeredRate)
  const baseFeeAmount = offeredRate > 0 ? offeredRate : Number(defaults.baseFeeAmount ?? 0)
  const sitelineCommissionAmount = commission > 0
    ? commission
    : Number(defaults.sitelineCommissionAmount ?? 0)

  return {
    baseFeeAmount,
    holdPremiumAmount: holdPremiumAmount > 0 ? holdPremiumAmount : Number(defaults.holdPremiumAmount ?? 0),
    sitelineCommissionAmount,
    usedFallback: offeredRate <= 0 && escrowAmount <= 0 && commission <= 0,
  }
}
