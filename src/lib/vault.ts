import type { AuthUser } from '@/lib/auth'
import { MOCK_BUILDER } from '@/lib/mockData'
import type { CompletedInspectionRecord } from '@/lib/persistence/completedInspections'
import type { Region } from '@/lib/types'

export type VaultRetentionTier = 'standard' | 'professional' | 'legacy'

export interface VaultRecord {
  id: string
  projectId: string
  projectName: string
  address: string
  city?: string
  jurisdictionId?: string
  jurisdictionName?: string
  authorityName?: string
  region?: string
  builderId?: string
  builderName?: string
  inspectorId?: string
  inspectorName: string
  inspectorLicense: string
  permitNumber?: string
  discipline?: string
  permitFamily?: string
  stage: number
  stageName: string
  result: CompletedInspectionRecord['result']
  completedAt: string
  certRef: string
  sealed: boolean
  jobRef?: string
  retentionTier: VaultRetentionTier
  packageType: string
  photos: number
  videos: number
  notes: string[]
  evidenceCount: number
  hasGeoEvidence: boolean
  offlineEvidenceCount: number
  record: CompletedInspectionRecord
}

function normalizeCity(raw?: string) {
  if (!raw) return undefined
  return raw.split(',')[0]?.trim() || undefined
}

function inferRegion(city?: string): Region | undefined {
  const normalized = normalizeCity(city)?.toLowerCase()
  if (!normalized) return undefined
  if (normalized.includes('vancouver')) return 'vancouver'
  if (normalized.includes('burnaby')) return 'burnaby'
  if (normalized.includes('surrey')) return 'surrey'
  if (normalized.includes('coquitlam')) return 'coquitlam'
  if (normalized.includes('richmond')) return 'richmond'
  return undefined
}

function inferJurisdiction(city?: string) {
  const normalized = normalizeCity(city)
  if (!normalized) return { jurisdictionId: undefined, jurisdictionName: undefined }
  return {
    jurisdictionId: normalized.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    jurisdictionName: normalized.toLowerCase().includes('nation') ? normalized : `City of ${normalized}`,
  }
}

function inferRetentionTier(completedAt: string): VaultRetentionTier {
  const completed = new Date(completedAt)
  const now = new Date()
  const diffYears = (now.getTime() - completed.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  if (diffYears <= 2) return 'standard'
  if (diffYears <= 10) return 'professional'
  return 'legacy'
}

function formatDiscipline(discipline?: string) {
  if (!discipline) return undefined
  return discipline
    .split(/[_-]/g)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function derivePermitFamily(discipline?: string) {
  const normalized = discipline?.toLowerCase()
  if (!normalized) return undefined
  if (normalized.includes('elect')) return 'electrical'
  if (normalized.includes('plumb')) return 'plumbing'
  if (normalized.includes('mechan')) return 'mechanical'
  return 'building'
}

function deriveBuilderName(builderId?: string) {
  if (!builderId) return undefined
  if (builderId === MOCK_BUILDER.id) return MOCK_BUILDER.companyName
  return undefined
}

export function toVaultRecord(record: CompletedInspectionRecord): VaultRecord {
  const city = record.city
  const inferredJurisdiction = inferJurisdiction(city)
  const region = record.region ?? inferRegion(city)
  const notes = record.evidenceItems
    .filter(item => (item.kind === 'voice_note' || item.kind === 'other') && item.notes?.trim())
    .map(item => item.notes!.trim())

  const discipline = formatDiscipline(record.discipline)
  const builderId = record.builderId
  const builderName = record.builderName ?? deriveBuilderName(builderId)

  return {
    id: record.id,
    projectId: record.projectId,
    projectName: record.projectName,
    address: record.address,
    city,
    jurisdictionId: record.jurisdictionId ?? inferredJurisdiction.jurisdictionId,
    jurisdictionName: record.jurisdictionName ?? inferredJurisdiction.jurisdictionName,
    authorityName: record.authorityName ?? record.jurisdictionName ?? inferredJurisdiction.jurisdictionName,
    region,
    builderId,
    builderName,
    inspectorId: record.inspectorId,
    inspectorName: record.inspectorName,
    inspectorLicense: record.inspectorLicense,
    permitNumber: record.permitNumber,
    discipline,
    permitFamily: derivePermitFamily(record.discipline),
    stage: record.stage,
    stageName: record.stageName,
    result: record.result,
    completedAt: record.completedAt,
    certRef: record.certRef,
    sealed: record.sealed,
    jobRef: record.jobRef,
    retentionTier: inferRetentionTier(record.completedAt),
    packageType: record.result === 'pass'
      ? 'Residential Authority Submission Package'
      : 'Trade Inspection Record',
    photos: record.evidenceItems.filter(item => item.kind === 'photo').length,
    videos: record.evidenceItems.filter(item => item.kind === 'video').length,
    notes,
    evidenceCount: record.evidenceItems.length,
    hasGeoEvidence: record.evidenceItems.some(item => item.geo != null),
    offlineEvidenceCount: record.evidenceItems.filter(item => item.metadata?.offlineCapture === true).length,
    record,
  }
}

export function buildCanonicalVaultRecords(records: CompletedInspectionRecord[]) {
  const deduped = new Map<string, CompletedInspectionRecord>()
  for (const record of records) {
    deduped.set(record.id, record)
  }
  return Array.from(deduped.values())
    .map(toVaultRecord)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
}

function matchesBuilderScope(record: VaultRecord, user: AuthUser) {
  const company = user.company?.trim().toLowerCase()
  const builderIds = new Set([user.id, user.supabaseId, MOCK_BUILDER.id].filter(Boolean))
  return (
    (record.builderId ? builderIds.has(record.builderId) : false) ||
    (company != null && company.length > 0 && record.builderName?.trim().toLowerCase() === company)
  )
}

function matchesInspectorScope(record: VaultRecord, user: AuthUser) {
  const name = user.name.trim().toLowerCase()
  const license = user.licenseNumber?.trim().toLowerCase()
  return (
    record.inspectorId === user.id ||
    record.inspectorId === user.supabaseId ||
    (license != null && record.inspectorLicense.trim().toLowerCase() === license) ||
    record.inspectorName.trim().toLowerCase() === name
  )
}

function matchesAuditorScope(record: VaultRecord, user: AuthUser) {
  const jurisdiction = user.jurisdiction?.trim().toLowerCase()
  if (!jurisdiction) return false
  return record.jurisdictionName?.trim().toLowerCase() === jurisdiction
}

export function filterVaultRecordsForUser(records: VaultRecord[], user: AuthUser | null) {
  if (!user) return []
  if (user.role === 'admin') return records
  if (user.role === 'builder') return records.filter(record => matchesBuilderScope(record, user))
  if (user.role === 'inspector') return records.filter(record => matchesInspectorScope(record, user))
  if (user.role === 'auditor') return records.filter(record => matchesAuditorScope(record, user))
  return []
}

export function getVaultRoleCopy(user: AuthUser | null) {
  if (!user) {
    return {
      title: 'Vero Permit Vault',
      subtitle: 'Sign in to view your sealed records.',
    }
  }

  if (user.role === 'builder') {
    return {
      title: 'Project Vault',
      subtitle: 'Sealed records scoped to your projects and retained under the Vero vault standard.',
    }
  }

  if (user.role === 'inspector') {
    return {
      title: 'Submitted Records Vault',
      subtitle: 'Only sealed records you submitted appear here.',
    }
  }

  if (user.role === 'auditor') {
    return {
      title: `${user.jurisdiction ?? 'Jurisdiction'} Vault`,
      subtitle: 'Read-only sealed records scoped to your jurisdiction.',
    }
  }

  return {
    title: 'Vault Control Plane',
    subtitle: 'All sealed records across builders, inspectors, and jurisdictions.',
  }
}
