import test from 'node:test'
import assert from 'node:assert/strict'

import { calculateHoldCost, calculatePricingBreakdown } from '@/utils/pricing'
import { getFixedDispatchHoldBaseRate, resolvePricingMode } from '@/lib/pricing/config'

test('dispatch-fixed pricing preserves gross card math and commission', () => {
  const pricing = calculatePricingBreakdown({
    dispatchTier: 'priority',
  })

  assert.equal(pricing.pricingMode, 'dispatch_fixed')
  assert.equal(pricing.baseFee, 295)
  assert.equal(pricing.dispatchFee, 442.5)
  assert.equal(pricing.platformCommission, 44.5)
  assert.equal(pricing.builderEscrowTotal, 487)
})

test('specialist pricing applies urgency multiplier and hold premium to escrow', () => {
  const pricing = calculatePricingBreakdown({
    dispatchTier: 'emergency',
    pricingMode: 'specialist_hourly',
    specialistRole: 'structural_engineer_field_review',
    hourlyRate: 345,
    billableHours: 1.5,
    holdHours: 1,
  })

  assert.equal(pricing.pricingMode, 'specialist_hourly')
  assert.equal(pricing.baseFee, 517.5)
  assert.equal(pricing.dispatchFee, 1035)
  assert.equal(pricing.holdCost, 517.5)
  assert.equal(pricing.platformCommission, 155.25)
  assert.equal(pricing.builderEscrowTotal, 1707.75)
})

test('dispatch-fixed hold pricing uses the shared fixed base rate', () => {
  const pricing = calculatePricingBreakdown({
    dispatchTier: 'standard',
    holdHours: 1,
  })

  assert.equal(pricing.pricingMode, 'dispatch_fixed')
  assert.equal(pricing.holdHourlyRate, getFixedDispatchHoldBaseRate())
  assert.equal(pricing.holdCost, 375)
})

test('calculateHoldCost uses one shared formula', () => {
  assert.equal(calculateHoldCost(345, 1), 517.5)
  assert.equal(calculateHoldCost(345, 1.5), 776.25)
  assert.equal(calculateHoldCost(getFixedDispatchHoldBaseRate(), 1), 375)
})

test('specialist mode auto-switches for professional-review disciplines', () => {
  assert.equal(resolvePricingMode({ discipline: 'structural' }), 'specialist_hourly')
  assert.equal(resolvePricingMode({ discipline: 'plumbing' }), 'dispatch_fixed')
  assert.equal(resolvePricingMode({ inspectionType: 'field_review' }), 'specialist_hourly')
})
