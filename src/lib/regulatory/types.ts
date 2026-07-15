export type IsoDate = `${number}-${number}-${number}`

export type RegulatorySourceLayer =
  | 'statute'
  | 'adopted_rule'
  | 'code'
  | 'local_amendment'
  | 'local_procedure'
  | 'project_requirement'
  | 'vero_best_practice'

export type RegulatoryVerificationStatus =
  | 'verified'
  | 'unverified'
  | 'stale'
  | 'conflict'

export type RegulatoryContentOrigin =
  | 'official'
  | 'human_authored'
  | 'ai_draft'
  | 'imported'

export type RegulatorySourceLifecycle = 'active' | 'superseded' | 'withdrawn'

export interface RegulatoryAuthorityRef {
  id: string
  name: string
  jurisdictionId: string
}

export interface RegulatorySource {
  id: string
  layer: RegulatorySourceLayer
  authority: RegulatoryAuthorityRef
  title: string
  url: string
  family: string
  edition?: string
  supplement?: string
  jurisdictionId: string
  effectiveFrom: IsoDate
  /** Exclusive end date. */
  effectiveTo?: IsoDate
  verificationStatus: RegulatoryVerificationStatus
  verifiedAt?: string
  verifiedBy?: string
  publishedBy?: string
  contentOrigin: RegulatoryContentOrigin
  lifecycle: RegulatorySourceLifecycle
  supersedesSourceId?: string
  supersededBySourceId?: string
}

export interface RegulatoryAssertion<T = unknown> {
  id: string
  ruleKey: string
  value: T
  source: RegulatorySource
}

export type JurisdictionLevel =
  | 'country'
  | 'state_province'
  | 'county'
  | 'municipality'
  | 'district'

export interface RegulatoryJurisdiction {
  id: string
  name: string
  level: JurisdictionLevel
  parentJurisdictionId?: string
  countryCode: string
  subdivisionCode?: string
}

export type AuthorityFunction = 'building' | 'fire' | 'flood'

export interface RegulatoryAuthority extends RegulatoryAuthorityRef {
  function: AuthorityFunction
  parentAuthorityId?: string
}

export interface AhjAdapterMetadata {
  portal?: {
    name: string
    url?: string
  }
  registration?: {
    required: boolean
    instructionsUrl?: string
  }
  inspectionCodes?: Record<string, string>
  submission?: {
    methods: Array<'portal' | 'email' | 'in_person' | 'other'>
    instructionsUrl?: string
  }
}

export interface AhjAdapter {
  id: string
  jurisdictionId: string
  version: string
  effectiveFrom: IsoDate
  effectiveTo?: IsoDate
  buildingAuthorityId: string
  fireAuthorityId?: string
  floodAuthorityId?: string
  metadata: AhjAdapterMetadata
  sourceIds: string[]
  verificationStatus: RegulatoryVerificationStatus
  publicRoutingEnabled: boolean
}

export interface ProjectRegulatoryProfile {
  jurisdiction: RegulatoryJurisdiction
  adapter?: AhjAdapter
  authorityIds: {
    building: string
    fire?: string
    flood?: string
  }
  codeFamily?: string
  codeEdition?: string
  resolvedAsOf?: IsoDate
  status: 'resolved' | 'review_required' | 'blocked'
  authorityFacingAllowed: boolean
  reasons: string[]
}

/**
 * Small type-only bridge for the canonical completion engine. Phase 1A stores no
 * Florida checklist content and the engine intentionally does not consume this yet.
 */
export type CompletionRegulatoryProfileBridge = Pick<
  ProjectRegulatoryProfile,
  'codeFamily' | 'codeEdition' | 'status' | 'authorityFacingAllowed' | 'reasons'
> & {
  jurisdictionId: string
  adapterId?: string
}
