import { createClient } from '@/lib/supabase/client'
import {
  appendGovernanceAuditEvent,
  getPackageSeal,
  recordPackageExport,
} from '@/lib/supabase/governance'

const supabase = createClient()

const GRANTS = 'authority_access_grants'

type Row = Record<string, unknown>

export interface AuthorityAccessGrantRow {
  id: string
  recordId: string
  packageSealId?: string
  recipientType: string
  recipientIdentity?: string
  accessScope: string
  tokenHash: string
  issuedById?: string
  issuedAt: string
  expiresAt: string
  revokedAt?: string
  lastAccessedAt?: string
  metadata: Record<string, unknown>
}

async function hashToken(token: string): Promise<string> {
  const encoded = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest))
    .map(value => value.toString(16).padStart(2, '0'))
    .join('')
}

function generateToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map(value => value.toString(16).padStart(2, '0'))
    .join('')
}

function rowToGrant(row: Row): AuthorityAccessGrantRow {
  return {
    id: row.id as string,
    recordId: row.record_id as string,
    packageSealId: (row.package_seal_id as string) ?? undefined,
    recipientType: row.recipient_type as string,
    recipientIdentity: (row.recipient_identity as string) ?? undefined,
    accessScope: row.access_scope as string,
    tokenHash: row.token_hash as string,
    issuedById: (row.issued_by_id as string) ?? undefined,
    issuedAt: row.issued_at as string,
    expiresAt: row.expires_at as string,
    revokedAt: (row.revoked_at as string) ?? undefined,
    lastAccessedAt: (row.last_accessed_at as string) ?? undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }
}

export async function issueAuthorityAccessGrant(input: {
  recordId: string
  recipientType: 'authority' | 'auditor' | 'builder'
  recipientIdentity?: string
  actorId?: string
  expiresInHours?: number
}): Promise<{ token: string; grant: AuthorityAccessGrantRow } | null> {
  const token = generateToken()
  const tokenHash = await hashToken(token)
  const issuedAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + (input.expiresInHours ?? 72) * 3600 * 1000).toISOString()
  const seal = await getPackageSeal(`seal-${input.recordId}`)

  const { data, error } = await supabase
    .from(GRANTS)
    .insert({
      id: crypto.randomUUID(),
      record_id: input.recordId,
      package_seal_id: seal?.id ?? null,
      recipient_type: input.recipientType,
      recipient_identity: input.recipientIdentity ?? null,
      access_scope: 'read_only_package',
      token_hash: tokenHash,
      issued_by_id: input.actorId ?? null,
      issued_at: issuedAt,
      expires_at: expiresAt,
      metadata: {
        policy: 'package_scoped_read_only',
      },
    })
    .select('*')
    .single()

  if (error || !data) {
    console.error('issueAuthorityAccessGrant:', error)
    return null
  }

  await recordPackageExport({
    recordId: input.recordId,
    packageSealId: seal?.id ?? `seal-${input.recordId}`,
    exportedById: input.actorId,
    exportScope: 'authority_scoped_access',
    recipientType: input.recipientType,
    recipientIdentity: input.recipientIdentity,
    exportMethod: 'authority_link_issued',
    destination: input.recipientIdentity,
    exportHash: tokenHash,
    metadata: {
      recipientType: input.recipientType,
      recipientIdentity: input.recipientIdentity ?? null,
      method: 'authority_link_issued',
      actorId: input.actorId ?? null,
    },
  })

  await appendGovernanceAuditEvent({
    entityType: 'authority_access',
    entityId: (data as Row).id as string,
    action: 'authority.access_issued',
    actorId: input.actorId,
    actorRole: 'builder',
    ruleIds: ['R-039', 'R-040', 'R-041'],
    blockerType: 'technical',
    reason: 'Issued scoped authority review access.',
    beforeState: {},
    afterState: {
      recordId: input.recordId,
      recipientType: input.recipientType,
      recipientIdentity: input.recipientIdentity ?? null,
      expiresAt,
    },
    metadata: {
      packageSealId: seal?.id ?? null,
    },
  })

  return {
    token,
    grant: rowToGrant(data as Row),
  }
}

export async function validateAuthorityAccessGrant(recordId: string, token: string): Promise<AuthorityAccessGrantRow | null> {
  const tokenHash = await hashToken(token)
  const { data, error } = await supabase
    .from(GRANTS)
    .select('*')
    .eq('record_id', recordId)
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error('validateAuthorityAccessGrant:', error)
    return null
  }

  const grant = rowToGrant(data as Row)
  if (new Date(grant.expiresAt).getTime() <= Date.now()) {
    return null
  }

  const now = new Date().toISOString()
  await supabase.from(GRANTS).update({ last_accessed_at: now }).eq('id', grant.id)

  await appendGovernanceAuditEvent({
    entityType: 'authority_access',
    entityId: grant.id,
    action: 'authority.access_validated',
    actorId: grant.recipientIdentity,
    actorRole: grant.recipientType,
    ruleIds: ['R-039', 'R-040', 'R-041'],
    blockerType: 'technical',
    reason: 'Authority access token validated.',
    beforeState: {
      lastAccessedAt: grant.lastAccessedAt ?? null,
    },
    afterState: {
      lastAccessedAt: now,
      recordId,
    },
    metadata: {
      accessScope: grant.accessScope,
    },
  })

  return {
    ...grant,
    lastAccessedAt: now,
  }
}
