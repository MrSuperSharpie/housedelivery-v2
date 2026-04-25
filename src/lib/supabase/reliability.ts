import { createClient } from '@/lib/supabase/client'
import type { ReliabilityEnforcementMode } from '@/lib/types'

const supabase = createClient()

export interface ReliabilityProfileRow {
  inspectorId: string
  internalScore: number
  tierKey: string
  completedProfessionalWorkCount: number
  claimCommitmentCount: number
  invalidLateCancellationCount: number
  noShowCount: number
  builderSiteNotReadyCount: number
  manualTierOverride?: string
  overrideReason?: string
  updatedAt: string
}

export interface ReliabilityEventRow {
  id: string
  inspectorId: string
  jobId?: string
  assignmentId?: string
  eventType: string
  scoreDelta: number
  adminReviewStatus: string
  createdAt: string
}

export interface ReliabilityCancellationRow {
  id: string
  jobId: string
  assignmentId?: string
  requestedByRole: string
  reasonCode: string
  isLate: boolean
  validityStatus: string
  enforcementMode: string
  createdAt: string
}

export interface SiteReadinessIncidentRow {
  id: string
  jobId: string
  assignmentId?: string
  inspectorId: string
  incidentType: string
  inspectorProtected: boolean
  adminReviewStatus: string
  reportedAt: string
}

export interface ReserveLedgerRow {
  id: string
  inspectorId: string
  jobId?: string
  assignmentId?: string
  entryType: string
  amount: number
  currency: string
  enforcementMode: string
  legalReviewRequired: boolean
  status: string
  createdAt: string
}

export interface ReliabilityAdminSnapshot {
  profiles: ReliabilityProfileRow[]
  events: ReliabilityEventRow[]
  cancellations: ReliabilityCancellationRow[]
  siteReadinessIncidents: SiteReadinessIncidentRow[]
  reserveLedgerEntries: ReserveLedgerRow[]
}

export interface ActiveReliabilityPolicyConfig {
  id: string
  version: string
  enforcementMode: ReliabilityEnforcementMode
  config: Record<string, unknown>
}

type DbRow = Record<string, unknown>

export async function getReliabilityAdminSnapshot(): Promise<ReliabilityAdminSnapshot> {
  const [
    profiles,
    events,
    cancellations,
    siteReadinessIncidents,
    reserveLedgerEntries,
  ] = await Promise.all([
    listReliabilityProfiles(),
    listReliabilityEvents(),
    listReliabilityCancellations(),
    listSiteReadinessIncidents(),
    listReserveLedgerEntries(),
  ])

  return {
    profiles,
    events,
    cancellations,
    siteReadinessIncidents,
    reserveLedgerEntries,
  }
}

export async function getActiveReliabilityPolicyConfig(): Promise<ActiveReliabilityPolicyConfig | null> {
  const { data, error } = await supabase
    .from('reliability_policy_versions')
    .select('id, version, enforcement_mode, config')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  const row = data as DbRow
  const config = isRecord(row.config) ? row.config : {}
  const enforcementMode = isReliabilityEnforcementMode(row.enforcement_mode)
    ? row.enforcement_mode
    : 'observe_only'

  return {
    id: String(row.id ?? ''),
    version: String(row.version ?? ''),
    enforcementMode,
    config: {
      ...config,
      enforcementMode,
    },
  }
}

async function listReliabilityProfiles(): Promise<ReliabilityProfileRow[]> {
  const { data, error } = await supabase
    .from('inspector_reliability_profiles')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return (data as DbRow[]).map(row => ({
    inspectorId: String(row.inspector_id ?? ''),
    internalScore: Number(row.internal_score ?? 0),
    tierKey: String(row.tier_key ?? 'standard'),
    completedProfessionalWorkCount: Number(row.completed_professional_work_count ?? 0),
    claimCommitmentCount: Number(row.claim_commitment_count ?? 0),
    invalidLateCancellationCount: Number(row.invalid_late_cancellation_count ?? 0),
    noShowCount: Number(row.no_show_count ?? 0),
    builderSiteNotReadyCount: Number(row.builder_site_not_ready_count ?? 0),
    manualTierOverride: typeof row.manual_tier_override === 'string' ? row.manual_tier_override : undefined,
    overrideReason: typeof row.override_reason === 'string' ? row.override_reason : undefined,
    updatedAt: String(row.updated_at ?? row.created_at ?? ''),
  }))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isReliabilityEnforcementMode(value: unknown): value is ReliabilityEnforcementMode {
  return value === 'observe_only' || value === 'soft_enforcement' || value === 'full_enforcement'
}

async function listReliabilityEvents(): Promise<ReliabilityEventRow[]> {
  const { data, error } = await supabase
    .from('inspector_reliability_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return (data as DbRow[]).map(row => ({
    id: String(row.id ?? ''),
    inspectorId: String(row.inspector_id ?? ''),
    jobId: typeof row.job_id === 'string' ? row.job_id : undefined,
    assignmentId: typeof row.assignment_id === 'string' ? row.assignment_id : undefined,
    eventType: String(row.event_type ?? ''),
    scoreDelta: Number(row.score_delta ?? 0),
    adminReviewStatus: String(row.admin_review_status ?? 'none'),
    createdAt: String(row.created_at ?? ''),
  }))
}

async function listReliabilityCancellations(): Promise<ReliabilityCancellationRow[]> {
  const { data, error } = await supabase
    .from('inspection_cancellation_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return (data as DbRow[]).map(row => ({
    id: String(row.id ?? ''),
    jobId: String(row.job_id ?? ''),
    assignmentId: typeof row.assignment_id === 'string' ? row.assignment_id : undefined,
    requestedByRole: String(row.requested_by_role ?? ''),
    reasonCode: String(row.reason_code ?? ''),
    isLate: row.is_late === true,
    validityStatus: String(row.validity_status ?? 'pending_review'),
    enforcementMode: String(row.enforcement_mode ?? 'observe_only'),
    createdAt: String(row.created_at ?? ''),
  }))
}

async function listSiteReadinessIncidents(): Promise<SiteReadinessIncidentRow[]> {
  const { data, error } = await supabase
    .from('site_readiness_incidents')
    .select('*')
    .order('reported_at', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return (data as DbRow[]).map(row => ({
    id: String(row.id ?? ''),
    jobId: String(row.job_id ?? ''),
    assignmentId: typeof row.assignment_id === 'string' ? row.assignment_id : undefined,
    inspectorId: String(row.inspector_id ?? ''),
    incidentType: String(row.incident_type ?? ''),
    inspectorProtected: row.inspector_protected !== false,
    adminReviewStatus: String(row.admin_review_status ?? 'pending'),
    reportedAt: String(row.reported_at ?? row.created_at ?? ''),
  }))
}

async function listReserveLedgerEntries(): Promise<ReserveLedgerRow[]> {
  const { data, error } = await supabase
    .from('inspector_reserve_ledger_entries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return (data as DbRow[]).map(row => ({
    id: String(row.id ?? ''),
    inspectorId: String(row.inspector_id ?? ''),
    jobId: typeof row.job_id === 'string' ? row.job_id : undefined,
    assignmentId: typeof row.assignment_id === 'string' ? row.assignment_id : undefined,
    entryType: String(row.entry_type ?? ''),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? 'CAD'),
    enforcementMode: String(row.enforcement_mode ?? 'observe_only'),
    legalReviewRequired: row.legal_review_required !== false,
    status: String(row.status ?? 'pending'),
    createdAt: String(row.created_at ?? ''),
  }))
}
