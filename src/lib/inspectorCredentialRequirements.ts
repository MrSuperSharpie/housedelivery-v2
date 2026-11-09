/**
 * Role-based inspector credential requirements.
 *
 * Used by the admin review page to show exactly which documents are required
 * for each requested role lane, which have been uploaded, and whether the
 * package is ready for approval.
 *
 * The signup flow collects a subset of these docs; additional docs are
 * uploaded via the inspector profile page or flagged by admin as needs_info.
 */

import type { InspectorCredentialType, InspectorRoleLane } from '@/lib/types'

export interface CredentialRequirement {
  type: InspectorCredentialType
  label: string
  note: string
}

// ─── Baseline requirements (every applicant, every lane) ─────────────────────

export const BASELINE_REQUIREMENTS: CredentialRequirement[] = [
  {
    type: 'government_id',
    label: 'Government-issued photo ID',
    note: 'Passport, driver\'s licence, or BC Services Card',
  },
  {
    type: 'insurance',
    label: 'Certificate of insurance',
    note: 'Current certificate — minimum $2M E&O / general liability',
  },
  {
    type: 'resume',
    label: 'Resume or experience summary',
    note: 'Professional background relevant to the requested role(s)',
  },
  {
    type: 'conflict_of_interest_declaration',
    label: 'Signed conflict-of-interest declaration',
    note: 'Confirms no material conflicts with any builder or project on the Vero platform',
  },
  {
    type: 'data_handling_acknowledgement',
    label: 'Signed evidence / data-handling acknowledgement',
    note: 'Confirms understanding of Vero evidence immutability, data retention, and chain-of-custody rules',
  },
]

// ─── Lane-specific additional requirements ───────────────────────────────────
//
// These are IN ADDITION to BASELINE_REQUIREMENTS.
// Lanes with no entry here rely entirely on the baseline.

export const LANE_REQUIREMENTS: Record<InspectorRoleLane, CredentialRequirement[]> = {
  permit_coordinator_non_signing: [
    {
      type: 'non_signing_declaration',
      label: 'Signed non-signing / non-issuing declaration',
      note: 'Confirms this lane does not include sign-off authority or regulated inspection outcomes',
    },
  ],

  architect: [
    {
      type: 'primary_license',
      label: 'Active AIBC individual registration',
      note: 'AIBC registration number and current membership certificate',
    },
    {
      type: 'good_standing_proof',
      label: 'Proof of current good standing (AIBC registry)',
      note: 'Current status from AIBC public registry or active-member letter',
    },
    {
      type: 'firm_practice_cert',
      label: 'AIBC Certificate of Practice (firm)',
      note: 'Certificate of Practice for the firm, or confirmation of practising through a qualifying firm',
    },
  ],

  engineer: [
    {
      type: 'primary_license',
      label: 'Active EGBC individual registration',
      note: 'EGBC registration number and current membership certificate',
    },
    {
      type: 'good_standing_proof',
      label: 'Proof of current good standing (EGBC registry)',
      note: 'Current status from EGBC public registry or active-member letter',
    },
    {
      type: 'firm_practice_cert',
      label: 'EGBC Permit to Practice (firm)',
      note: 'Permit to Practice for the firm, or confirmation of practising through a qualifying firm',
    },
    {
      type: 'professional_designation',
      label: 'Discipline declaration',
      note: 'Confirms engineering discipline: Structural, Geotechnical, Mechanical, or Electrical',
    },
  ],

  certified_professional: [
    {
      type: 'primary_license',
      label: 'Underlying architect or engineer registration',
      note: 'Must first satisfy Architect or Engineer lane requirements — CP is layered on top',
    },
    {
      type: 'cp_qualification',
      label: 'CP qualification / CP program status',
      note: 'Proof of CP qualification or CP program completion issued by the relevant body',
    },
  ],

  electrical_fsr: [
    {
      type: 'tsbc_or_fsr',
      label: 'Active TSBC FSR certificate (with FSR class)',
      note: 'Current FSR certificate — FSR class must match the declared scope',
    },
    {
      type: 'good_standing_proof',
      label: 'Proof of active FSR status',
      note: 'Confirmation that the FSR certificate is current and not suspended',
    },
    {
      type: 'employer_evidence',
      label: 'Employer / contractor relationship evidence',
      note: 'Contractor licence evidence where the scope requires it',
    },
  ],

  official_authority: [
    {
      type: 'boabc_qualification',
      label: 'BOABC class / qualification details',
      note: 'Qualified building official or plumbing official credential with BOABC class',
    },
    {
      type: 'good_standing_proof',
      label: 'Proof of current BOABC standing',
      note: 'Current BOABC status confirmation',
    },
    {
      type: 'ahj_authorization',
      label: 'AHJ employment or appointment letter',
      note: 'Jurisdiction authorization — confirms the inspector is appointed by or employed by the AHJ',
    },
  ],
}

// ─── Lanes that carry no regulated sign-off authority ────────────────────────

export const NON_SIGNING_LANES = new Set<InspectorRoleLane>([
  'permit_coordinator_non_signing',
])

// ─── Lanes that depend on a base qualification from another lane ──────────────

export const CP_BASE_LANES: InspectorRoleLane[] = ['architect', 'engineer']

/** Returns true if the requested lanes include at least one CP base lane (Architect or Engineer). */
export function isCPBaseEligible(requestedLanes: InspectorRoleLane[]): boolean {
  return CP_BASE_LANES.some(base => requestedLanes.includes(base))
}

// ─── Readiness check ─────────────────────────────────────────────────────────

export interface LaneReadiness {
  lane: InspectorRoleLane
  ready: boolean
  missing: CredentialRequirement[]
}

export interface PackageReadiness {
  ready: boolean
  baselineReady: boolean
  baselineMissing: CredentialRequirement[]
  perLane: LaneReadiness[]
  totalRequired: number
  totalUploaded: number
}

/**
 * Check approval readiness for an inspector given their requested lanes
 * and the set of credential types they have already uploaded.
 *
 * Returns a structured report used by the admin review page.
 */
export function checkPackageReadiness(
  requestedLanes: InspectorRoleLane[],
  uploadedTypes: Set<InspectorCredentialType>,
): PackageReadiness {
  const baselineMissing = BASELINE_REQUIREMENTS.filter(r => !uploadedTypes.has(r.type))

  const perLane: LaneReadiness[] = requestedLanes.map(lane => {
    const reqs = LANE_REQUIREMENTS[lane] ?? []
    return {
      lane,
      ready: reqs.every(r => uploadedTypes.has(r.type)),
      missing: reqs.filter(r => !uploadedTypes.has(r.type)),
    }
  })

  // Unique required types across baseline + all requested lanes
  const allRequiredTypes = new Set<InspectorCredentialType>(
    BASELINE_REQUIREMENTS.map(r => r.type),
  )
  for (const lane of requestedLanes) {
    for (const r of LANE_REQUIREMENTS[lane] ?? []) {
      allRequiredTypes.add(r.type)
    }
  }

  const totalRequired = allRequiredTypes.size
  const totalUploaded = [...allRequiredTypes].filter(t => uploadedTypes.has(t)).length

  return {
    ready: baselineMissing.length === 0 && perLane.every(l => l.ready),
    baselineReady: baselineMissing.length === 0,
    baselineMissing,
    perLane,
    totalRequired,
    totalUploaded,
  }
}
