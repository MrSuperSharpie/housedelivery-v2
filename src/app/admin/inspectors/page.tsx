'use client'
export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HardHat, Shield, Loader2, CheckCircle2, AlertCircle, FileText, MailCheck, Info, Lock } from 'lucide-react'
import { AdminShell, ActionButton, StatusPill } from '@/components/admin/AdminShell'
import { useAuth, DEMO_USERS } from '@/lib/auth'
import { listInspectorOnboardingStatuses, setInspectorOnboardingStatus } from '@/lib/persistence/inspectorOnboarding'
import type { InspectorCredentialType, InspectorDiscipline, InspectorOnboardingStatus, InspectorRoleLane, Region } from '@/lib/types'
import { listInspectorCredentials, selectInspectorEligibility, type InspectorCredentialRow, upsertInspectorEligibility } from '@/lib/supabase/compliance'
import { createClient } from '@/lib/supabase/client'
import { getInspectorRoleLaneLabel, INSPECTOR_ROLE_LANES } from '@/lib/inspectorRoleLanes'
import {
  BASELINE_REQUIREMENTS,
  LANE_REQUIREMENTS,
  NON_SIGNING_LANES,
  CP_BASE_LANES,
  checkPackageReadiness,
  isCPBaseEligible,
} from '@/lib/inspectorCredentialRequirements'
const supabase = createClient()

const REVIEW_STATUSES: InspectorOnboardingStatus[] = [
  'submitted',
  'under_review',
  'needs_info',
  'rejected',
  'suspended',
]

const INSPECTOR_DOCUMENT_BUCKET = 'inspection-evidence'

const REQUIREMENT_TYPE_ALIASES: Partial<Record<InspectorRoleLane, Partial<Record<InspectorCredentialType, InspectorCredentialType[]>>>> = {
  architect: {
    firm_practice_cert: ['professional_designation'],
  },
  engineer: {
    primary_license: ['professional_designation'],
  },
  electrical_fsr: {
    tsbc_or_fsr: ['primary_license'],
  },
}

type InspectorIdentity = {
  displayName: string
  companyName?: string
  secondaryName?: string
  email?: string
}

type ProfileHint = Record<string, unknown>

function readStr(obj: ProfileHint | undefined, key: string): string | undefined {
  const v = obj?.[key]
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

function getRequirementAliases(lane: InspectorRoleLane, requirementType: InspectorCredentialType): InspectorCredentialType[] {
  return REQUIREMENT_TYPE_ALIASES[lane]?.[requirementType] ?? []
}

function expandUploadedTypesForReview(
  requestedLanes: InspectorRoleLane[],
  uploadedTypes: Set<InspectorCredentialType>,
): Set<InspectorCredentialType> {
  const expanded = new Set(uploadedTypes)
  for (const lane of requestedLanes) {
    const aliases = REQUIREMENT_TYPE_ALIASES[lane] ?? {}
    for (const [requirementType, equivalentTypes] of Object.entries(aliases) as [InspectorCredentialType, InspectorCredentialType[]][]) {
      if (equivalentTypes.some(type => uploadedTypes.has(type))) expanded.add(requirementType)
    }
  }
  return expanded
}

function findCredentialForRequirement(
  creds: InspectorCredentialRow[],
  requirementType: InspectorCredentialType,
  lane?: InspectorRoleLane,
): InspectorCredentialRow | undefined {
  return creds.find(c => c.credentialType === requirementType)
    ?? (lane
      ? creds.find(c => getRequirementAliases(lane, requirementType).includes(c.credentialType))
      : undefined)
}

function formatCredentialTypeLabel(credentialType: InspectorCredentialType): string {
  const baseline = BASELINE_REQUIREMENTS.find(req => req.type === credentialType)
  if (baseline) return baseline.label

  for (const requirements of Object.values(LANE_REQUIREMENTS)) {
    const match = requirements.find(req => req.type === credentialType)
    if (match) return match.label
  }

  return credentialType
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Document'
}

function hasMissingDocuments(readiness: ReturnType<typeof checkPackageReadiness>): boolean {
  return readiness.baselineMissing.length > 0 || readiness.perLane.some(lane => lane.missing.length > 0)
}

function buildMissingDocumentNote(readiness: ReturnType<typeof checkPackageReadiness>): string {
  const sections: string[] = []

  if (readiness.baselineMissing.length > 0) {
    sections.push(
      `Baseline documents:\n${readiness.baselineMissing.map(req => `- ${req.label}`).join('\n')}`
    )
  }

  for (const lane of readiness.perLane) {
    if (lane.missing.length === 0) continue
    sections.push(
      `${getInspectorRoleLaneLabel(lane.lane)}:\n${lane.missing.map(req => `- ${req.label}`).join('\n')}`
    )
  }

  const missingList = sections.length > 0
    ? sections.join('\n\n')
    : '- No missing required documents are currently listed in the admin checklist.'
  const receivedCopy = readiness.baselineMissing.length === 0
    ? 'We have received your baseline documents.'
    : 'We have reviewed the documents received so far.'

  return `Thank you for your submission. ${receivedCopy} Before we can approve your inspector profile, please upload the following additional documents:\n\n${missingList}\n\nOnce uploaded, your application will be reviewed again.`
}

function buildInspectorIdentity(
  userId: string,
  licenseNumber: string | undefined,
  creds: InspectorCredentialRow[],
  profileHint?: ProfileHint,
): InspectorIdentity {
  const demo = DEMO_USERS.find(d => d.id === userId || d.supabaseId === userId)
  if (demo) {
    return {
      displayName: demo.name,
      companyName: demo.company,
      secondaryName: demo.designation,
      email: demo.email,
    }
  }

  // Primary: full_name and firm_name written directly to profiles during signup.
  // Fallbacks cover older accounts or alternate trigger schemas.
  const fullName =
    readStr(profileHint, 'full_name') ??
    readStr(profileHint, 'name') ??
    ([readStr(profileHint, 'first_name'), readStr(profileHint, 'last_name')].filter(Boolean).join(' ') || undefined)

  const firmName =
    readStr(profileHint, 'firm_name') ??
    readStr(profileHint, 'company_name') ??
    readStr(profileHint, 'business_name')

  const email =
    readStr(profileHint, 'email') ??
    readStr(profileHint, 'contact_email')

  const displayName = fullName ?? email ?? (licenseNumber ? `Inspector ${licenseNumber}` : 'Inspector account')

  return {
    displayName,
    companyName: firmName,
    secondaryName: licenseNumber ? `Licence ${licenseNumber}` : undefined,
    email,
  }
}


export default function AdminInspectorsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listInspectorOnboardingStatuses>>>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [openingCredentialId, setOpeningCredentialId] = useState<string | null>(null)
  const [openingSealUserId, setOpeningSealUserId] = useState<string | null>(null)
  const [credentialsByUser, setCredentialsByUser] = useState<Record<string, InspectorCredentialRow[]>>({})
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [needsInfoFeedback, setNeedsInfoFeedback] = useState<Record<string, { tone: 'success' | 'warning' | 'error'; message: string }>>({})
  const [profileHintsByUser, setProfileHintsByUser] = useState<Record<string, ProfileHint>>({})
  const [approvedLaneDrafts, setApprovedLaneDrafts] = useState<Record<string, InspectorRoleLane[]>>({})
  // Per-inspector toggle: when true, lane approval checkboxes ignore doc-readiness check
  const [laneOverrides, setLaneOverrides] = useState<Record<string, boolean>>({})

  const reloadInspectorReview = async () => {
    const data = await listInspectorOnboardingStatuses()
    setRows(data)

    const profileHints: Record<string, ProfileHint> = {}
    const userIds = data.map(row => row.userId)
    if (userIds.length > 0) {
      const res = await fetch(`/api/admin/inspectors/profiles?ids=${userIds.map(encodeURIComponent).join(',')}`)
      if (res.ok) {
        const body = await res.json() as { profiles?: unknown[] }
        for (const row of (body.profiles ?? []) as ProfileHint[]) {
          const id = typeof row.id === 'string' ? row.id : null
          if (id) profileHints[id] = row
        }
      }
    }

    // Supplement with the current user's own auth metadata — covers the case where
    // an admin reviews their own inspector application and the profiles query returns
    // empty due to RLS or the full_name column was null from an older signup.
    const { data: { user: currentAuthUser } } = await supabase.auth.getUser()
    if (currentAuthUser && userIds.includes(currentAuthUser.id)) {
      const m = (currentAuthUser.user_metadata ?? {}) as Record<string, unknown>
      const existing = profileHints[currentAuthUser.id] ?? {}
      profileHints[currentAuthUser.id] = {
        ...existing,
        full_name: existing.full_name ?? m.name ?? ([m.first_name, m.last_name].filter(Boolean).join(' ') || null),
        firm_name: existing.firm_name ?? m.firm_name ?? null,
        email: existing.email ?? currentAuthUser.email ?? null,
      }
    }

    const creds: Record<string, InspectorCredentialRow[]> = {}
    await Promise.all(
      data.map(async row => {
        creds[row.userId] = await listInspectorCredentials(row.userId)
      }),
    )
    setProfileHintsByUser(profileHints)
    setCredentialsByUser(creds)
    setNoteDrafts(
      Object.fromEntries(data.map(row => [row.userId, row.reviewerNote ?? ''])),
    )
    setApprovedLaneDrafts(
      Object.fromEntries(data.map(row => [row.userId, row.approvedRoleLanes])),
    )
  }

  useEffect(() => {
    if (!user) {
      router.replace('/sign-in')
      return
    }
    setLoading(true)
    reloadInspectorReview().finally(() => setLoading(false))
  }, [user, router])

  const handleStatusChange = async (
    rowUserId: string,
    status: InspectorOnboardingStatus,
    reviewerNote?: string
  ) => {
    const currentRow = rows.find(row => row.userId === rowUserId)
    const previousStatus = currentRow?.status
    const laneDraft = approvedLaneDrafts[rowUserId] ?? currentRow?.approvedRoleLanes ?? []
    setSavingId(rowUserId)
    setNeedsInfoFeedback(prev => ({ ...prev, [rowUserId]: { tone: 'warning', message: 'Saving review state…' } }))
    try {
      const existing = await selectInspectorEligibility(rowUserId)
      const onboardingSaved = await upsertInspectorEligibility({
        ...(existing ?? {
          userId: rowUserId,
          disciplines: (currentRow?.disciplines ?? []) as InspectorDiscipline[],
          regions: (currentRow?.regions ?? []) as Region[],
          requestedRoleLanes: currentRow?.requestedRoleLanes ?? [],
          approvedRoleLanes: currentRow?.approvedRoleLanes ?? [],
          licenseNumber: currentRow?.licenseNumber,
        }),
        status,
        reviewerNote,
        approvedRoleLanes: laneDraft,
      })
      if (!onboardingSaved) {
        setNeedsInfoFeedback(prev => ({
          ...prev,
          [rowUserId]: { tone: 'error', message: 'Could not save inspector review status. No profile changes were applied.' },
        }))
        return
      }

      if (status === 'approved') {
        const authoritySyncResponse = await fetch('/api/admin/inspectors/credential-authority', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: rowUserId, approvedRoleLanes: laneDraft }),
        })

        if (!authoritySyncResponse.ok) {
          const result = await authoritySyncResponse.json().catch(() => null) as { error?: string } | null
          console.error('Inspector credential authority sync failed:', result?.error ?? authoritySyncResponse.statusText)
          setNeedsInfoFeedback(prev => ({
            ...prev,
            [rowUserId]: { tone: 'error', message: 'Review status was saved, but credential authority sync failed. Please verify the inspector credential records before notifying the inspector.' },
          }))
          return
        }
      }

      const profileSyncResponse = await fetch('/api/admin/inspectors/profile-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: rowUserId, status }),
      })

      if (!profileSyncResponse.ok) {
        const result = await profileSyncResponse.json().catch(() => null) as { error?: string } | null
        console.error('Inspector profile status sync failed:', result?.error ?? profileSyncResponse.statusText)
        setNeedsInfoFeedback(prev => ({
          ...prev,
          [rowUserId]: { tone: 'error', message: 'Review status was saved, but profile status sync failed. Please try again before notifying the inspector.' },
        }))
        return
      }

      if (previousStatus !== status && (status === 'approved' || status === 'needs_info' || status === 'rejected')) {
        const profileHint = profileHintsByUser[rowUserId]
        const email = readStr(profileHint, 'email') ?? readStr(profileHint, 'contact_email')
        const inspectorName = buildInspectorIdentity(rowUserId, existing?.licenseNumber, credentialsByUser[rowUserId] ?? [], profileHint).displayName
        if (email) {
          void fetch('/api/mail/application-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: email,
              inspectorName,
              status,
              reviewerNote,
            }),
          })
        }
      }
      setNeedsInfoFeedback(prev => ({ ...prev, [rowUserId]: { tone: 'success', message: 'Review state saved, credential authority synced, and profile status synced.' } }))
      await reloadInspectorReview()
    } finally {
      setSavingId(null)
    }
  }

  const handleNeedsInfoRequest = async (rowUserId: string, reviewerNote: string) => {
    const note = reviewerNote.trim()
    const laneDraft = approvedLaneDrafts[rowUserId] ?? []

    setSavingId(rowUserId)
    setNeedsInfoFeedback(prev => ({ ...prev, [rowUserId]: { tone: 'warning', message: 'Saving needs info request…' } }))

    try {
      const existing = await selectInspectorEligibility(rowUserId)
      if (existing) {
        const ok = await upsertInspectorEligibility({
          ...existing,
          status: 'needs_info',
          reviewerNote: note || undefined,
          approvedRoleLanes: laneDraft,
        })
        if (!ok) {
          setNeedsInfoFeedback(prev => ({ ...prev, [rowUserId]: { tone: 'error', message: 'Could not save needs info request.' } }))
          return
        }
      } else {
        await setInspectorOnboardingStatus('needs_info', undefined, rowUserId, note || undefined)
      }

      const profileSyncResponse = await fetch('/api/admin/inspectors/needs-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: rowUserId }),
      })

      if (!profileSyncResponse.ok) {
        const result = await profileSyncResponse.json().catch(() => null) as { error?: string } | null
        setNeedsInfoFeedback(prev => ({
          ...prev,
          [rowUserId]: {
            tone: 'error',
            message: result?.error ?? 'Needs info was saved, but profile status sync failed.',
          },
        }))
        return
      }

      const profileHint = profileHintsByUser[rowUserId]
      const email = readStr(profileHint, 'email') ?? readStr(profileHint, 'contact_email')
      const inspectorName = buildInspectorIdentity(rowUserId, existing?.licenseNumber, credentialsByUser[rowUserId] ?? [], profileHint).displayName
      let notificationSent = false

      if (email) {
        const response = await fetch('/api/mail/application-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            inspectorName,
            status: 'needs_info',
            reviewerNote: note || undefined,
          }),
        })
        notificationSent = response.ok
      }

      setNeedsInfoFeedback(prev => ({
        ...prev,
        [rowUserId]: {
          tone: notificationSent ? 'success' : 'warning',
          message: notificationSent
            ? 'Needs info request saved and notification sent.'
            : 'Needs info request saved. No notification was sent because no inspector email is available or the mail service did not confirm delivery.',
        },
      }))
      await reloadInspectorReview()
    } catch (error) {
      console.error('Needs info request failed:', error)
      setNeedsInfoFeedback(prev => ({ ...prev, [rowUserId]: { tone: 'error', message: 'Could not send needs info request.' } }))
    } finally {
      setSavingId(null)
    }
  }

  const handleViewSeal = async (userId: string, storagePath: string) => {
    setOpeningSealUserId(userId)
    try {
      const { data, error } = await supabase.storage
        .from(INSPECTOR_DOCUMENT_BUCKET)
        .createSignedUrl(storagePath, 60)

      if (error || !data?.signedUrl) {
        console.error('Inspector digital seal view failed:', error)
        return
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setOpeningSealUserId(null)
    }
  }

  const handleViewCredential = async (credential: InspectorCredentialRow) => {
    setOpeningCredentialId(credential.id)
    try {
      const { data, error } = await supabase.storage
        .from(INSPECTOR_DOCUMENT_BUCKET)
        .createSignedUrl(credential.storagePath, 60)

      if (error || !data?.signedUrl) {
        console.error('Inspector credential view failed:', error)
        return
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setOpeningCredentialId(null)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-flame animate-spin" />
      </div>
    )
  }

  return (
    <AdminShell title="Inspector Review" subtitle="Approve or reject inspector access to the Live Board">
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex items-center gap-2 bg-flame/10 border border-flame/20 rounded-full px-3 py-1">
          <Shield className="w-3.5 h-3.5 text-flame" />
          <span className="text-[11px] font-bold text-flame tracking-wide uppercase">Internal · Vero reviewer</span>
        </div>
        <Link href="/inspector/onboarding-status" className="text-xs text-flame font-semibold hover:underline">
          Inspector-facing status →
        </Link>
      </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-flame animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="border border-dashed border-subtle rounded-2xl p-8 text-center text-sm text-muted">
            No inspector onboarding records found yet.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map(row => {
              const isApproved = row.status === 'approved'
              const approvedRoleLanes = approvedLaneDrafts[row.userId] ?? row.approvedRoleLanes
              const canAccessLiveBoard = isApproved
              const creds = credentialsByUser[row.userId] ?? []
              const identity = buildInspectorIdentity(row.userId, row.licenseNumber, creds, profileHintsByUser[row.userId])
              const digitalSealPath = readStr(profileHintsByUser[row.userId], 'digital_seal_url')
              const note = noteDrafts[row.userId] ?? row.reviewerNote ?? ''
              const uploadedTypes = new Set(creds.map(c => c.credentialType))
              const reviewUploadedTypes = expandUploadedTypesForReview(row.requestedRoleLanes, uploadedTypes)
              const readiness = checkPackageReadiness(row.requestedRoleLanes, reviewUploadedTypes)
              const overrideActive = laneOverrides[row.userId] ?? false
              const canApproveOverall = readiness.ready || overrideActive
              const missingDocumentsExist = hasMissingDocuments(readiness)
              const suggestedMissingDocumentNote = buildMissingDocumentNote(readiness)
              const needsInfoFeedbackForRow = needsInfoFeedback[row.userId]
              const savedRoleLanes = [...row.approvedRoleLanes].sort()
              const draftRoleLanes = [...approvedRoleLanes].sort()
              const approvedWorkAreasChanged =
                savedRoleLanes.length !== draftRoleLanes.length ||
                savedRoleLanes.some((lane, idx) => lane !== draftRoleLanes[idx])
              const approvedWorkAreasSummary = approvedRoleLanes.length > 0
                ? approvedRoleLanes.map(getInspectorRoleLaneLabel).join(', ')
                : 'No approved work areas yet'
              const reviewStatusLabel = row.status.replace(/_/g, ' ')
              const decisionTitle =
                row.status === 'approved' ? 'Inspector approved' :
                row.status === 'under_review' ? 'Inspector under review' :
                row.status === 'needs_info' ? 'More information requested' :
                row.status === 'rejected' ? 'Inspector not approved' :
                row.status === 'suspended' ? 'Inspector suspended' :
                'Inspector submitted for review'
              const decisionSummary = canAccessLiveBoard
                ? 'Live Board access is enabled. This inspector can claim eligible jobs for the approved work areas below.'
                : 'Live Board access remains blocked until approval is complete.'

              // Per-lane approvability: baseline + all lane-specific docs must be uploaded.
              // CP additionally requires at least one base lane (Architect or Engineer) to have
              // its own documents ready before CP itself can be approved.
              const laneApprovability = Object.fromEntries(
                INSPECTOR_ROLE_LANES.map(lane => {
                  const laneUploadedTypes = expandUploadedTypesForReview([lane], uploadedTypes)
                  const laneReady = checkPackageReadiness([lane], laneUploadedTypes).ready
                  if (lane === 'certified_professional') {
                    const baseReady = CP_BASE_LANES.some(
                      base => checkPackageReadiness([base], expandUploadedTypesForReview([base], uploadedTypes)).ready
                    )
                    return [lane, laneReady && baseReady]
                  }
                  return [lane, laneReady]
                })
              ) as Record<string, boolean>

              return (
                <div
                  key={row.userId}
                  className="rounded-2xl border border-white/8 bg-panel overflow-hidden flex flex-col"
                >
                  {/* Status accent stripe */}
                  <div className={`h-1 w-full shrink-0 ${
                    row.status === 'approved'    ? 'bg-success-green' :
                    row.status === 'rejected' || row.status === 'suspended' ? 'bg-fail-red' :
                    row.status === 'needs_info'  ? 'bg-warning-amber' :
                    'bg-electric/40'
                  }`} />
                  <div className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-flame/15 border border-flame/30 flex items-center justify-center text-sm font-black text-flame shrink-0">
                        {identity.displayName
                          .split(' ')
                          .map(w => w[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink text-sm">{identity.displayName}</span>
                          {canAccessLiveBoard && (
                            <CheckCircle2 className="w-4 h-4 text-success-green" />
                          )}
                        </div>
                        {identity.companyName && (
                          <div className="text-[11px] text-muted mt-0.5">
                            {identity.companyName}
                          </div>
                        )}
                        {identity.secondaryName && (
                          <div className="text-[11px] text-muted mt-0.5">
                            {identity.secondaryName}
                          </div>
                        )}
                        <div className="text-[11px] text-subtle mt-0.5">
                          user_id: <span className="font-mono">{row.userId}</span>
                          {identity.email && (
                            <>
                              {' '}· <span>{identity.email}</span>
                            </>
                          )}
                        </div>
                        <div className="text-[11px] text-muted mt-0.5">
                          Updated {new Date(row.updatedAt).toLocaleString('en-CA')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-[11px]">
                      <div className="text-muted mb-1">Live Board access</div>
                      <div
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${
                          canAccessLiveBoard
                            ? 'bg-success-green/15 text-success-green'
                            : 'bg-subtle text-muted'
                        }`}
                      >
                        <HardHat className="w-3 h-3" />
                        {canAccessLiveBoard ? 'Enabled' : isApproved ? 'Restricted' : 'Blocked'}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/8 bg-white/5 px-3 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-[12px] font-black text-ink">{decisionTitle}</div>
                        <div className="mt-0.5 text-[11px] text-muted">{decisionSummary}</div>
                      </div>
                      <div className="text-[10px] text-subtle">
                        Last reviewed {new Date(row.updatedAt).toLocaleString('en-CA')}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      <div className="rounded-lg bg-surface/50 px-2.5 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">Approval status</div>
                        <div className="mt-0.5 text-[11px] font-semibold capitalize text-ink">{reviewStatusLabel}</div>
                      </div>
                      <div className="rounded-lg bg-surface/50 px-2.5 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">Live Board access</div>
                        <div className={`mt-0.5 text-[11px] font-semibold ${canAccessLiveBoard ? 'text-success-green' : 'text-muted'}`}>
                          {canAccessLiveBoard ? 'Enabled' : 'Blocked'}
                        </div>
                      </div>
                      <div className="rounded-lg bg-surface/50 px-2.5 py-2">
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">Approved work areas</div>
                        <div className="mt-0.5 truncate text-[11px] font-semibold text-ink">{approvedWorkAreasSummary}</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/8 bg-white/5 px-3 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle">Requested role lanes</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {row.requestedRoleLanes.length > 0 ? row.requestedRoleLanes.map(lane => (
                        <span key={lane} className="rounded-full border border-electric/20 bg-electric/10 px-2.5 py-1 text-[11px] font-semibold text-electric">
                          {getInspectorRoleLaneLabel(lane)}
                        </span>
                      )) : (
                        <span className="text-[11px] text-muted">No role lanes selected yet.</span>
                      )}
                    </div>
                    {row.regions.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-white/5">
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-subtle mb-1.5">Service regions</div>
                        <div className="flex flex-wrap gap-1.5">
                          {row.regions.map(r => (
                            <span key={r} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-muted capitalize">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {!isApproved && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted">Review state</span>
                        <select
                          className="bg-surface border border-white/10 rounded-lg px-2 py-1 text-xs text-ink focus:outline-none focus:border-flame"
                          value={row.status}
                          onChange={e =>
                            handleStatusChange(row.userId, e.target.value as InspectorOnboardingStatus, note || undefined)
                          }
                          disabled={savingId === row.userId}
                        >
                          {REVIEW_STATUSES.map(s => (
                            <option key={s} value={s}>
                              {s.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <StatusPill status={row.status} />
                    <div className="text-[11px] text-subtle flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Review state can move between submitted, under review, needs info, rejected, or suspended. Live Board access still follows the inspector’s overall approval status.
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/8 bg-white/5 px-3 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle">Approved work areas</div>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[10px]">
                        <input
                          type="checkbox"
                          checked={laneOverrides[row.userId] ?? false}
                          onChange={e => setLaneOverrides(prev => ({ ...prev, [row.userId]: e.target.checked }))}
                          className="shrink-0"
                        />
                        <span className={laneOverrides[row.userId] ? 'text-warning-amber font-bold' : 'text-subtle'}>
                          {laneOverrides[row.userId] ? 'Override active' : 'Admin override'}
                        </span>
                      </label>
                    </div>
                    {!overrideActive && (
                      <div className="text-[10px] text-subtle flex items-center gap-1 mb-2">
                        <Lock className="w-2.5 h-2.5" /> Lanes locked until required docs uploaded — enable override to bypass
                      </div>
                    )}
                    <div className="grid gap-2 md:grid-cols-2">
                      {INSPECTOR_ROLE_LANES.map(lane => {
                        const docReady = laneApprovability[lane] ?? false
                        const canApprove = docReady || overrideActive
                        const isChecked = approvedRoleLanes.includes(lane)
                        return (
                          <label
                            key={lane}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] transition-opacity ${
                              canApprove
                                ? 'border-white/8 bg-surface/50 text-muted cursor-pointer'
                                : 'border-white/5 bg-surface/20 text-subtle opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="shrink-0"
                              checked={isChecked}
                              onChange={() => {
                                if (!canApprove) return
                                setApprovedLaneDrafts(prev => {
                                  const current = prev[row.userId] ?? row.approvedRoleLanes
                                  const next = current.includes(lane)
                                    ? current.filter(existing => existing !== lane)
                                    : [...current, lane]
                                  return { ...prev, [row.userId]: next }
                                })
                              }}
                              disabled={savingId === row.userId || !canApprove}
                            />
                            <span className="flex-1 leading-snug">{getInspectorRoleLaneLabel(lane)}</span>
                            {docReady
                              ? <CheckCircle2 className="w-3 h-3 text-success-green shrink-0" />
                              : overrideActive
                                ? <AlertCircle className="w-3 h-3 text-warning-amber shrink-0" />
                                : <Lock className="w-3 h-3 text-warning-amber shrink-0" />
                            }
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isApproved ? (
                      <ActionButton
                        variant={approvedWorkAreasChanged || overrideActive ? 'approve' : 'ghost'}
                        onClick={() => handleStatusChange(row.userId, 'approved', note || undefined)}
                        disabled={savingId === row.userId || ((approvedWorkAreasChanged || overrideActive) && !canApproveOverall)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {approvedWorkAreasChanged || overrideActive ? 'Apply approval changes' : 'Re-sync credential authority'}
                      </ActionButton>
                    ) : (
                      <ActionButton
                        variant="approve"
                        onClick={() => handleStatusChange(row.userId, 'approved', note || undefined)}
                        disabled={savingId === row.userId || !canApproveOverall}
                      >
                        <MailCheck className="w-3.5 h-3.5" /> Approve inspector
                      </ActionButton>
                    )}
                    {isApproved && !approvedWorkAreasChanged && !overrideActive && (
                      <div className="inline-flex items-center gap-1.5 rounded-xl border border-success-green/20 bg-success-green/10 px-3 py-2 text-[11px] font-black text-success-green">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approved work areas saved
                      </div>
                    )}
                    {!readiness.ready && (
                      <div className="flex items-center gap-1.5 text-[10px] text-warning-amber">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {overrideActive
                          ? 'Admin override enabled — approval can proceed with incomplete checklist'
                          : `${readiness.totalUploaded}/${readiness.totalRequired} required docs present — enable admin override to approve anyway`}
                      </div>
                    )}
                    <div className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-[11px] text-muted">
                      Approved work areas determine which Live Board jobs this inspector can claim. Live Board access still follows the overall approval status.
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] text-muted">Reviewer notes (visible to inspector)</div>
                      {missingDocumentsExist && (
                        <button
                          type="button"
                          onClick={() =>
                            setNoteDrafts(prev => ({ ...prev, [row.userId]: suggestedMissingDocumentNote }))
                          }
                          disabled={savingId === row.userId}
                          className="text-[10px] font-bold text-flame hover:underline disabled:opacity-50"
                        >
                          Insert missing-document note
                        </button>
                      )}
                    </div>
                    {row.status === 'needs_info' && missingDocumentsExist && !note.trim() && (
                      <div className="mb-2 flex items-start gap-1.5 rounded-xl border border-warning-amber/20 bg-warning-amber/10 px-3 py-2 text-[11px] text-warning-amber">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>
                          Missing documents are listed below. Add a reviewer note before saving needs info so the inspector knows what to upload.
                        </span>
                      </div>
                    )}
                    <textarea
                      value={note}
                      onChange={e =>
                        setNoteDrafts(prev => ({ ...prev, [row.userId]: e.target.value }))
                      }
                      onBlur={e =>
                        handleStatusChange(row.userId, row.status, e.target.value || undefined)
                      }
                      placeholder="Reviewer note shown to the inspector when more information is requested"
                      rows={2}
                      className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-xs text-ink placeholder-subtle focus:outline-none focus:border-flame resize-none"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleNeedsInfoRequest(row.userId, note)}
                        disabled={savingId === row.userId || (missingDocumentsExist && !note.trim())}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-black disabled:cursor-not-allowed disabled:opacity-50 ${
                          isApproved
                            ? 'border-white/10 bg-white/5 text-muted hover:bg-white/8'
                            : 'border-warning-amber/30 bg-warning-amber/10 text-warning-amber hover:bg-warning-amber/15'
                        }`}
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        Send Needs Info Request
                      </button>
                      {missingDocumentsExist && !note.trim() && (
                        <span className="text-[10px] text-warning-amber">
                          Add or insert a reviewer note before sending.
                        </span>
                      )}
                    </div>
                    {needsInfoFeedbackForRow && (
                      <div className={`mt-2 rounded-xl border px-3 py-2 text-[11px] ${
                        needsInfoFeedbackForRow.tone === 'success'
                          ? 'border-success-green/20 bg-success-green/10 text-success-green'
                          : needsInfoFeedbackForRow.tone === 'error'
                            ? 'border-fail-red/20 bg-fail-red/10 text-fail-red'
                            : 'border-warning-amber/20 bg-warning-amber/10 text-warning-amber'
                      }`}>
                        {needsInfoFeedbackForRow.message}
                      </div>
                    )}
                  </div>

                  {/* Credential package — role-based document review */}
                  <div className="mt-2 border-t border-white/5 pt-3">

                    {/* Overall readiness header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle flex items-center gap-1.5">
                        <FileText className="w-3 h-3" /> Required documents matched to this application
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        readiness.ready
                          ? 'bg-success-green/15 text-success-green'
                          : row.requestedRoleLanes.length === 0
                            ? 'bg-white/5 text-muted'
                            : 'bg-warning-amber/15 text-warning-amber'
                      }`}>
                        {readiness.ready
                          ? 'Required documents complete'
                          : row.requestedRoleLanes.length === 0
                            ? 'No lanes selected'
                            : `${readiness.totalUploaded} / ${readiness.totalRequired} required present`
                        }
                      </span>
                    </div>

                    {/* Baseline requirements — every applicant */}
                    <div className="mb-2 rounded-xl border border-white/8 bg-surface/50 px-3 py-2">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-subtle mb-1.5">
                        Baseline — all applicants
                      </div>
                      {BASELINE_REQUIREMENTS.map(req => {
                        const doc = findCredentialForRequirement(creds, req.type)
                        return (
                          <div key={req.type} className="flex items-center justify-between gap-2 py-0.5 text-[11px]">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              {doc
                                ? <CheckCircle2 className="w-3 h-3 text-success-green shrink-0" />
                                : <AlertCircle className="w-3 h-3 text-warning-amber shrink-0" />
                              }
                              <span className={doc ? 'text-muted truncate' : 'text-warning-amber truncate'}>
                                {req.label}
                              </span>
                            </div>
                            {doc ? (
                              <button
                                type="button"
                                onClick={() => handleViewCredential(doc)}
                                disabled={openingCredentialId === doc.id}
                                className="text-[10px] text-flame font-semibold hover:underline shrink-0"
                              >
                                {openingCredentialId === doc.id ? '…' : 'View'}
                              </button>
                            ) : (
                              <span className="text-[10px] text-warning-amber font-bold shrink-0">Missing</span>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Per-lane requirements */}
                    {row.requestedRoleLanes.length === 0 ? (
                      <p className="text-[11px] text-muted italic">
                        No role lanes requested yet — lane-specific document requirements will appear once lanes are selected.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {readiness.perLane.map(({ lane, ready: laneReady, missing }) => {
                          const laneReqs = LANE_REQUIREMENTS[lane] ?? []
                          return (
                            <div key={lane} className="rounded-xl border border-white/8 bg-surface/50 px-3 py-2">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-semibold text-ink">
                                  {getInspectorRoleLaneLabel(lane)}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                  laneReady
                                    ? 'bg-success-green/15 text-success-green'
                                    : 'bg-warning-amber/15 text-warning-amber'
                                }`}>
                                  {laneReady ? '✓ Lane documents complete' : `${missing.length} missing`}
                                </span>
                              </div>

                              {NON_SIGNING_LANES.has(lane) && (
                                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-warning-amber bg-warning-amber/10 border border-warning-amber/20 rounded-lg px-2 py-1">
                                  <Info className="w-3 h-3 shrink-0" />
                                  Non-signing lane — does not grant regulated inspection or sign-off authority
                                </div>
                              )}

                              {lane === 'certified_professional' && !isCPBaseEligible(row.requestedRoleLanes) && (
                                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-fail-red bg-fail-red/10 border border-fail-red/20 rounded-lg px-2 py-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  CP dependency not met — {CP_BASE_LANES.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(' or ')} lane must also be requested
                                </div>
                              )}
                              {lane === 'certified_professional' && (
                                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] text-muted bg-electric/5 border border-electric/15 rounded-lg px-2 py-1">
                                  <Info className="w-3 h-3 shrink-0" />
                                  CP badge requires underlying Architect or Engineer lane qualification
                                </div>
                              )}

                              {laneReqs.length === 0 ? (
                                <p className="text-[11px] text-muted">
                                  No additional documents beyond baseline for this lane.
                                </p>
                              ) : (
                                laneReqs.map(req => {
                                  const doc = findCredentialForRequirement(creds, req.type, lane)
                                  return (
                                    <div key={req.type} className="flex items-center justify-between gap-2 py-0.5 text-[11px]">
                                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                        {doc
                                          ? <CheckCircle2 className="w-3 h-3 text-success-green shrink-0" />
                                          : <AlertCircle className="w-3 h-3 text-warning-amber shrink-0" />
                                        }
                                        <span className={doc ? 'text-muted truncate' : 'text-warning-amber truncate'}>
                                          {req.label}
                                        </span>
                                        {doc && (
                                          <span className="text-[10px] text-subtle ml-1 truncate">
                                            {doc.fileName}
                                          </span>
                                        )}
                                      </div>
                                      {doc ? (
                                        <button
                                          type="button"
                                          onClick={() => handleViewCredential(doc)}
                                          disabled={openingCredentialId === doc.id}
                                          className="text-[10px] text-flame font-semibold hover:underline shrink-0"
                                        >
                                          {openingCredentialId === doc.id ? '…' : 'View'}
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-warning-amber font-bold shrink-0">Missing</span>
                                      )}
                                    </div>
                                  )
                                })
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* All uploaded files */}
                    {creds.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[11px] text-subtle">
                          All uploaded files ({creds.length})
                        </div>
                        <div className="mb-1 text-[10px] text-subtle">
                          Reference list only. Required documents are matched above.
                        </div>
                        <div className="space-y-1">
                          {creds.map(c => (
                            <div key={c.id} className="flex items-center justify-between gap-2 text-[11px]">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-ink truncate">
                                  {formatCredentialTypeLabel(c.credentialType)}
                                </div>
                                <div className="text-[10px] font-normal text-muted truncate">
                                  {c.fileName}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleViewCredential(c)}
                                disabled={openingCredentialId === c.id}
                                className="text-[10px] text-flame font-semibold hover:underline shrink-0"
                              >
                                {openingCredentialId === c.id ? '…' : 'View'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {digitalSealPath && (
                      <div className="mt-2 rounded-xl border border-white/8 bg-surface/50 px-3 py-2">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <div className="min-w-0">
                            <div className="font-bold text-ink">Professional digital seal</div>
                            <div className="truncate text-subtle">{digitalSealPath}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleViewSeal(row.userId, digitalSealPath)}
                            disabled={openingSealUserId === row.userId}
                            className="text-[10px] text-flame font-semibold hover:underline shrink-0"
                          >
                            {openingSealUserId === row.userId ? '…' : 'View seal'}
                          </button>
                        </div>
                      </div>
                    )}

                    {creds.length === 0 && (
                      <p className="text-[11px] text-muted mt-1">
                        No documents uploaded yet — mark status as needs_info to request them.
                      </p>
                    )}
                  </div>
                </div>
                </div>
              )
            })}
          </div>
        )}
    </AdminShell>
  )
}
