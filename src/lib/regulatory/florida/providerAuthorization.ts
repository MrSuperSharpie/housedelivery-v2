import type { IsoDate } from '../types'

export type FloridaPrivateProviderServiceScope = 'plans' | 'inspections' | 'both'
export type FloridaProfessionalCategory =
  | 'architect'
  | 'professional_engineer'
  | 'building_code_administrator'
  | 'building_code_inspector'
  | 'plans_examiner'
  | 'home_inspector'
  | 'other'

export interface FloridaProviderAuthorizationInput {
  asOf: IsoDate
  providerOfRecord: {
    present: boolean
    active: boolean
    serviceScope?: FloridaPrivateProviderServiceScope
  }
  requestedService: 'plans' | 'inspections'
  ownerAuthorization: {
    required: boolean
    present: boolean
  }
  professional: {
    category?: FloridaProfessionalCategory
    licenceActive: boolean
    licensedDisciplines: string[]
    requiredDiscipline: string
  }
  representative: {
    role: 'provider' | 'duly_authorized_representative'
    employmentVerified?: boolean
    providerAuthorizationVerified?: boolean
  }
  insurance: {
    verified: boolean
    expiresOn?: IsoDate
  }
  ahjRegistration: {
    required: boolean
    verified: boolean
  }
  conflictScreening: 'passed' | 'failed' | 'not_completed'
}

export type FloridaProviderAuthorizationBlocker =
  | 'provider_of_record_missing'
  | 'provider_of_record_inactive'
  | 'service_scope_mismatch'
  | 'owner_authorization_missing'
  | 'professional_licence_inactive'
  | 'professional_category_ineligible'
  | 'discipline_mismatch'
  | 'dar_employment_unverified'
  | 'dar_provider_authorization_unverified'
  | 'insurance_unverified'
  | 'insurance_expired'
  | 'ahj_registration_missing'
  | 'conflict_screening_failed'
  | 'conflict_screening_incomplete'

export interface FloridaProviderAuthorizationResult {
  status: 'authorized' | 'blocked'
  authorized: boolean
  blockers: FloridaProviderAuthorizationBlocker[]
  professionalResponsibility: 'licensed_florida_private_provider_or_firm'
  platformRole: 'technology_and_workflow_only'
}

const ELIGIBLE_PROVIDER_OF_RECORD_CATEGORIES = new Set<FloridaProfessionalCategory>([
  'architect',
  'professional_engineer',
  'building_code_administrator',
])

const ELIGIBLE_DAR_CATEGORIES = new Set<FloridaProfessionalCategory>([
  'architect',
  'professional_engineer',
  'building_code_administrator',
  'building_code_inspector',
  'plans_examiner',
])

export function evaluateFloridaProviderAuthorization(
  input: FloridaProviderAuthorizationInput,
): FloridaProviderAuthorizationResult {
  const blockers: FloridaProviderAuthorizationBlocker[] = []

  if (!input.providerOfRecord.present) blockers.push('provider_of_record_missing')
  else if (!input.providerOfRecord.active) blockers.push('provider_of_record_inactive')

  const serviceScope = input.providerOfRecord.serviceScope
  if (!serviceScope || (serviceScope !== 'both' && serviceScope !== input.requestedService)) {
    blockers.push('service_scope_mismatch')
  }

  if (input.ownerAuthorization.required && !input.ownerAuthorization.present) {
    blockers.push('owner_authorization_missing')
  }

  if (!input.professional.licenceActive) blockers.push('professional_licence_inactive')
  const eligibleCategories = input.representative.role === 'duly_authorized_representative'
    ? ELIGIBLE_DAR_CATEGORIES
    : ELIGIBLE_PROVIDER_OF_RECORD_CATEGORIES
  if (!input.professional.category || !eligibleCategories.has(input.professional.category)) {
    blockers.push('professional_category_ineligible')
  }
  if (!input.professional.licensedDisciplines.includes(input.professional.requiredDiscipline)) {
    blockers.push('discipline_mismatch')
  }

  if (input.representative.role === 'duly_authorized_representative') {
    if (!input.representative.employmentVerified) blockers.push('dar_employment_unverified')
    if (!input.representative.providerAuthorizationVerified) {
      blockers.push('dar_provider_authorization_unverified')
    }
  }

  if (!input.insurance.verified) blockers.push('insurance_unverified')
  if (!input.insurance.expiresOn || input.insurance.expiresOn < input.asOf) {
    blockers.push('insurance_expired')
  }

  if (input.ahjRegistration.required && !input.ahjRegistration.verified) {
    blockers.push('ahj_registration_missing')
  }

  if (input.conflictScreening === 'failed') blockers.push('conflict_screening_failed')
  if (input.conflictScreening === 'not_completed') blockers.push('conflict_screening_incomplete')

  return {
    status: blockers.length === 0 ? 'authorized' : 'blocked',
    authorized: blockers.length === 0,
    blockers,
    professionalResponsibility: 'licensed_florida_private_provider_or_firm',
    platformRole: 'technology_and_workflow_only',
  }
}
