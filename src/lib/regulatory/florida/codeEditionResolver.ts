import type { IsoDate } from '../types'

export const FLORIDA_CODE_EDITIONS = {
  eighth: {
    id: 'florida-building-code-8th-2023',
    label: '8th Edition (2023) Florida Building Code',
  },
  ninth: {
    id: 'florida-building-code-9th-2026',
    label: '9th Edition (2026) Florida Building Code',
  },
} as const

export const FLORIDA_NINTH_EDITION_TRANSITION_DATE: IsoDate = '2026-12-31'

export type FloridaCodeEditionId = typeof FLORIDA_CODE_EDITIONS[keyof typeof FLORIDA_CODE_EDITIONS]['id']

export interface FloridaCodeEditionFacts {
  authorityConfirmedEdition?: FloridaCodeEditionId
  vestedEdition?: FloridaCodeEditionId
  applicationDate?: IsoDate
  permitIssuedDate?: IsoDate
  permitStatus?: 'application' | 'issued_open' | 'closed'
  vestingConfirmed?: boolean
}

export type FloridaCodeEditionResolution =
  | {
      status: 'resolved'
      edition: FloridaCodeEditionId
      reason: string
    }
  | {
      status: 'review_required' | 'blocked'
      edition: null
      reason: string
    }

/** Resolves from permit/vesting facts only; the wall-clock date is intentionally absent. */
export function resolveFloridaCodeEdition(facts: FloridaCodeEditionFacts): FloridaCodeEditionResolution {
  if (facts.authorityConfirmedEdition) {
    return {
      status: 'resolved',
      edition: facts.authorityConfirmedEdition,
      reason: 'The authority-confirmed code edition controls.',
    }
  }

  if (facts.vestedEdition && facts.vestingConfirmed) {
    return {
      status: 'resolved',
      edition: facts.vestedEdition,
      reason: 'The confirmed vested edition remains controlling for this permit.',
    }
  }

  if (facts.permitStatus === 'issued_open' && facts.vestedEdition) {
    return {
      status: 'review_required',
      edition: null,
      reason: 'The open permit has an edition recorded, but vesting must be confirmed before authority-facing use.',
    }
  }

  const qualifyingDate = facts.permitIssuedDate ?? facts.applicationDate
  if (!qualifyingDate) {
    return {
      status: 'blocked',
      edition: null,
      reason: 'Application, permit, or confirmed vesting facts are required; current date alone cannot select an edition.',
    }
  }

  return qualifyingDate < FLORIDA_NINTH_EDITION_TRANSITION_DATE
    ? {
        status: 'resolved',
        edition: FLORIDA_CODE_EDITIONS.eighth.id,
        reason: 'Qualifying project facts predate the scheduled 9th Edition transition.',
      }
    : {
        status: 'resolved',
        edition: FLORIDA_CODE_EDITIONS.ninth.id,
        reason: 'Qualifying project facts fall on or after the scheduled 9th Edition transition.',
      }
}
