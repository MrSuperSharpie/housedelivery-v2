/**
 * Rules engine skeleton — jurisdiction and permit triggers.
 * Typed evaluation; seed data and explicit TODOs for full rule tables.
 */

import type { JurisdictionContext, PropertySite } from '@/lib/domain/types'

export interface RuleContext {
  address: string
  city: string
  province: string
  parcelId?: string
  projectScope?: string
}

export interface RuleResult {
  jurisdiction: JurisdictionContext
  /** Vancouver vs broader BC */
  codeSource: 'BCBC' | 'VBBL' | 'both'
  /** Trigger keys that apply (ALR, SDS, riparian, septic, LOA, etc.) */
  triggers: string[]
  /** Permit kinds suggested by rules (not exhaustive) */
  suggestedPermitKinds: string[]
}

/** Seed jurisdictions — Phase 1; expand from config/DB later */
const SEED_JURISDICTIONS: JurisdictionContext[] = [
  { id: 'vancouver', name: 'City of Vancouver', codeSource: 'VBBL', region: 'Metro Vancouver' },
  { id: 'bc', name: 'Province of British Columbia', codeSource: 'BCBC', region: 'BC' },
]

/** Default jurisdiction by city — TODO: replace with real lookup */
function getJurisdictionForContext(ctx: RuleContext): JurisdictionContext {
  const city = (ctx.city ?? '').toLowerCase()
  if (city.includes('vancouver')) return SEED_JURISDICTIONS[0]
  return SEED_JURISDICTIONS[1]
}

/** BC Building Code vs Vancouver Building Bylaw — Vancouver uses VBBL */
function getCodeSource(ctx: RuleContext, jurisdiction: JurisdictionContext): 'BCBC' | 'VBBL' | 'both' {
  if (jurisdiction.codeSource === 'VBBL') return 'VBBL'
  if (jurisdiction.codeSource === 'BCBC') return 'BCBC'
  return 'both'
}

/**
 * Evaluate triggers from address + scope.
 * Phase 1: stub triggers; real implementation will query parcel/ALR/SDS/WSA etc.
 */
function evaluateTriggers(ctx: RuleContext): string[] {
  const triggers: string[] = []
  // TODO: ALR / ALC — query ALC parcel data
  // TODO: SDS / contaminated site — screen by address or parcel
  // TODO: WSA / riparian / stream proximity — spatial or parcel
  // TODO: septic / onsite sewage — parcel or zone
  // TODO: soil movement / site work — project scope
  // TODO: Letters of Assurance — building scope / professional involvement
  // TODO: TSBC — electrical, gas, elevating devices, boilers
  if (ctx.projectScope?.toLowerCase().includes('electrical')) triggers.push('tsbc_electrical')
  if (ctx.projectScope?.toLowerCase().includes('septic')) triggers.push('septic')
  return triggers
}

/** Suggest permit kinds from triggers and scope — minimal Phase 1 logic */
function suggestPermitKinds(ctx: RuleContext, triggers: string[]): string[] {
  const kinds: string[] = ['building']
  if (triggers.includes('alr') || triggers.includes('alc')) kinds.push('alr_alc')
  if (triggers.includes('sds') || triggers.includes('contaminated_site')) kinds.push('contamination_sds')
  if (triggers.includes('wsa') || triggers.includes('riparian') || triggers.includes('stream')) kinds.push('watercourse_riparian')
  if (triggers.includes('septic') || triggers.includes('onsite_sewage')) kinds.push('onsite_sewage_septic')
  if (triggers.includes('loa')) kinds.push('letters_of_assurance')
  if (triggers.includes('tsbc_electrical')) kinds.push('electrical')
  return [...new Set(kinds)]
}

/**
 * Main entry: evaluate rules for a given context.
 * Returns jurisdiction, code source, triggers, and suggested permit kinds.
 */
export function evaluateRules(ctx: RuleContext): RuleResult {
  const jurisdiction = getJurisdictionForContext(ctx)
  const codeSource = getCodeSource(ctx, jurisdiction)
  const triggers = evaluateTriggers(ctx)
  const suggestedPermitKinds = suggestPermitKinds(ctx, triggers)
  return {
    jurisdiction,
    codeSource,
    triggers,
    suggestedPermitKinds,
  }
}

/**
 * Resolve jurisdiction and triggers for a property site.
 * Used when creating or updating a project.
 */
export function evaluatePropertySite(site: Pick<PropertySite, 'address' | 'city'>): RuleResult {
  return evaluateRules({
    address: site.address,
    city: site.city ?? '',
    province: 'BC',
  })
}
