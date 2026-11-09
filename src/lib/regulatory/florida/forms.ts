import type { IsoDate, RegulatoryContentOrigin, RegulatoryVerificationStatus } from '../types'

export type FloridaFormStatus =
  | 'adopted_effective'
  | 'adopted_future'
  | 'draft_proposed'
  | 'local_legacy'
  | 'superseded'

export interface FloridaFormRecord {
  id: string
  status: FloridaFormStatus
  effectiveFrom?: IsoDate
  effectiveTo?: IsoDate
  verificationStatus: RegulatoryVerificationStatus
  contentOrigin: RegulatoryContentOrigin
  verifiedBy?: string
  publishedBy?: string
}

export interface FloridaFormUseDecision {
  authorityFacingAllowed: boolean
  previewAllowed: boolean
  historicalOnly: boolean
  reviewRequired: boolean
  reason: string
}

export function evaluateFloridaFormUse(form: FloridaFormRecord, asOf: IsoDate): FloridaFormUseDecision {
  if (form.status === 'superseded') {
    return {
      authorityFacingAllowed: false,
      previewAllowed: false,
      historicalOnly: true,
      reviewRequired: false,
      reason: 'Superseded forms are retained for historical records only.',
    }
  }

  if (form.status === 'local_legacy') {
    return {
      authorityFacingAllowed: false,
      previewAllowed: true,
      historicalOnly: false,
      reviewRequired: true,
      reason: 'Local legacy forms require human and AHJ review before new use.',
    }
  }

  if (form.status === 'adopted_future' || form.status === 'draft_proposed') {
    return {
      authorityFacingAllowed: false,
      previewAllowed: true,
      historicalOnly: false,
      reviewRequired: form.status === 'draft_proposed',
      reason: 'Future and proposed forms are preview-only until adopted and effective.',
    }
  }

  const isEffective = (!form.effectiveFrom || asOf >= form.effectiveFrom)
    && (!form.effectiveTo || asOf < form.effectiveTo)
  const isHumanPublished = form.contentOrigin !== 'ai_draft'
    && form.verificationStatus === 'verified'
    && Boolean(form.verifiedBy)
    && Boolean(form.publishedBy)

  if (!isEffective || !isHumanPublished) {
    return {
      authorityFacingAllowed: false,
      previewAllowed: true,
      historicalOnly: false,
      reviewRequired: true,
      reason: 'The form is not currently effective or lacks verified human publication.',
    }
  }

  return {
    authorityFacingAllowed: true,
    previewAllowed: true,
    historicalOnly: false,
    reviewRequired: false,
    reason: 'The form is adopted, effective, verified, and human-published.',
  }
}
