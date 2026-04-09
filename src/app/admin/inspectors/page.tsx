'use client'
export const dynamic = 'force-dynamic'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HardHat, Shield, Loader2, CheckCircle2, AlertCircle, FileText, MailCheck, Info, Lock } from 'lucide-react'
import { AdminShell, ActionButton, StatusPill } from '@/components/admin/AdminShell'
import { useAuth, DEMO_USERS } from '@/lib/auth'
import { listInspectorOnboardingStatuses, setInspectorOnboardingStatus } from '@/lib/persistence/inspectorOnboarding'
import type { InspectorOnboardingStatus, InspectorRoleLane } from '@/lib/types'
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

type InspectorIdentity = {
  displayName: string
  secondaryName?: string
  email?: string
}

type ProfileHint = Record<string, unknown>

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
      secondaryName: demo.designation ?? demo.company,
      email: demo.email,
    }
  }

  const hintedName = typeof profileHint?.name === 'string' && profileHint.name.trim()
    ? profileHint.name.trim()
    : undefined
  const firstName = typeof profileHint?.first_name === 'string' && profileHint.first_name.trim()
    ? profileHint.first_name.trim()
    : undefined
  const lastName = typeof profileHint?.last_name === 'string' && profileHint.last_name.trim()
    ? profileHint.last_name.trim()
    : undefined
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || undefined
  const businessName = typeof profileHint?.company_name === 'string' && profileHint.company_name.trim()
    ? profileHint.company_name.trim()
    : typeof profileHint?.business_name === 'string' && profileHint.business_name.trim()
      ? profileHint.business_name.trim()
      : typeof profileHint?.contact_name === 'string' && profileHint.contact_name.trim()
        ? profileHint.contact_name.trim()
        : undefined
  const profileEmail = typeof profileHint?.email === 'string' && profileHint.email.trim()
    ? profileHint.email.trim()
    : typeof profileHint?.contact_email === 'string' && profileHint.contact_email.trim()
      ? profileHint.contact_email.trim()
      : undefined

  const optionalBusinessDoc = creds.find(cred => cred.credentialType === 'professional_designation')
  const fileStem = optionalBusinessDoc?.fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim()
  const readableStem = fileStem && /\s/.test(fileStem) ? fileStem : undefined
  const displayName = hintedName ?? fullName ?? businessName ?? readableStem ?? (licenseNumber ? `Inspector ${licenseNumber}` : 'Inspector account')

  return {
    displayName,
    secondaryName: displayName !== businessName && businessName
      ? businessName
      : licenseNumber
        ? `Licence ${licenseNumber}`
        : undefined,
    email: profileEmail,
  }
}


export default function AdminInspectorsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listInspectorOnboardingStatuses>>>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [openingCredentialId, setOpeningCredentialId] = useState<string | null>(null)
  const [credentialsByUser, setCredentialsByUser] = useState<Record<string, InspectorCredentialRow[]>>({})
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [profileHintsByUser, setProfileHintsByUser] = useState<Record<string, ProfileHint>>({})
  const [approvedLaneDrafts, setApprovedLaneDrafts] = useState<Record<string, InspectorRoleLane[]>>({})

  const reloadInspectorReview = async () => {
    const data = await listInspectorOnboardingStatuses()
    setRows(data)

    const profileHints: Record<string, ProfileHint> = {}
    const userIds = data.map(row => row.userId)
    if (userIds.length > 0) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)

      for (const row of (profileRows ?? []) as ProfileHint[]) {
        const id = typeof row.id === 'string' ? row.id : null
        if (id) profileHints[id] = row
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
    const previousStatus = rows.find(row => row.userId === rowUserId)?.status
    const laneDraft = approvedLaneDrafts[rowUserId] ?? []
    setSavingId(rowUserId)
    try {
      const existing = await selectInspectorEligibility(rowUserId)
      if (existing) {
        await upsertInspectorEligibility({
          ...existing,
          status,
          reviewerNote,
          approvedRoleLanes: laneDraft,
        })
      } else {
        await setInspectorOnboardingStatus(status, undefined, rowUserId, reviewerNote)
      }
      if (previousStatus !== 'approved' && status === 'approved') {
        console.info('[AdminInspectorApprovalEmail]', {
          userId: rowUserId,
          action: 'approval_activated',
          emailHook: 'pending',
          approvedRoleLanes: laneDraft,
        })
      }
      await reloadInspectorReview()
    } finally {
      setSavingId(null)
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
          <span className="text-[11px] font-bold text-flame tracking-wide uppercase">Internal · SiteLine reviewer</span>
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
              const note = noteDrafts[row.userId] ?? row.reviewerNote ?? ''
              const uploadedTypes = new Set(creds.map(c => c.credentialType))
              const readiness = checkPackageReadiness(row.requestedRoleLanes, uploadedTypes)

              // Per-lane approvability: baseline + all lane-specific docs must be uploaded.
              // CP additionally requires at least one base lane (Architect or Engineer) to have
              // its own documents ready before CP itself can be approved.
              const laneApprovability = Object.fromEntries(
                INSPECTOR_ROLE_LANES.map(lane => {
                  const laneReady = checkPackageReadiness([lane], uploadedTypes).ready
                  if (lane === 'certified_professional') {
                    const baseReady = CP_BASE_LANES.some(
                      base => checkPackageReadiness([base], uploadedTypes).ready
                    )
                    return [lane, laneReady && baseReady]
                  }
                  return [lane, laneReady]
                })
              ) as Record<string, boolean>

              return (
                <div
                  key={row.userId}
                  className="rounded-2xl border border-white/8 bg-panel p-4 flex flex-col gap-3"
                >
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
                      <div className="text-muted mb-1">Marketplace access</div>
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
                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle">Approved role lanes</div>
                      <div className="text-[10px] text-subtle flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Locked until required docs uploaded
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {INSPECTOR_ROLE_LANES.map(lane => {
                        const canApprove = laneApprovability[lane] ?? false
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
                            {canApprove
                              ? <CheckCircle2 className="w-3 h-3 text-success-green shrink-0" />
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
                        variant="approve"
                        onClick={() => handleStatusChange(row.userId, 'approved', note || undefined)}
                        disabled={savingId === row.userId}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Save approved lanes
                      </ActionButton>
                    ) : (
                      <ActionButton
                        variant="approve"
                        onClick={() => handleStatusChange(row.userId, 'approved', note || undefined)}
                        disabled={savingId === row.userId}
                      >
                        <MailCheck className="w-3.5 h-3.5" /> Approve inspector
                      </ActionButton>
                    )}
                    {!isApproved && !readiness.ready && (
                      <div className="flex items-center gap-1.5 text-[10px] text-warning-amber">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {readiness.totalUploaded}/{readiness.totalRequired} required docs present{' — '}review document checklist below before approving
                      </div>
                    )}
                    <div className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-[11px] text-muted">
                      Approved role lanes are recorded for future scope controls. Current Live Board access still follows the overall inspector approval status.
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-muted mb-1">Reviewer notes (optional)</div>
                    <textarea
                      value={note}
                      onChange={e =>
                        setNoteDrafts(prev => ({ ...prev, [row.userId]: e.target.value }))
                      }
                      onBlur={e =>
                        handleStatusChange(row.userId, row.status, e.target.value || undefined)
                      }
                      placeholder="Internal notes for SiteLine reviewers (not visible to inspectors yet)"
                      rows={2}
                      className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-xs text-ink placeholder-subtle focus:outline-none focus:border-flame resize-none"
                    />
                  </div>

                  {/* Credential package — role-based document review */}
                  <div className="mt-2 border-t border-white/5 pt-3">

                    {/* Overall readiness header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle flex items-center gap-1.5">
                        <FileText className="w-3 h-3" /> Document review
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        readiness.ready
                          ? 'bg-success-green/15 text-success-green'
                          : row.requestedRoleLanes.length === 0
                            ? 'bg-white/5 text-muted'
                            : 'bg-warning-amber/15 text-warning-amber'
                      }`}>
                        {readiness.ready
                          ? 'Package complete'
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
                        const doc = creds.find(c => c.credentialType === req.type)
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
                                  {laneReady ? '✓ Ready' : `${missing.length} missing`}
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
                                  const doc = creds.find(c => c.credentialType === req.type)
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

                    {/* All uploaded documents */}
                    {creds.length > 0 && (
                      <div className="mt-2">
                        <div className="text-[11px] text-subtle mb-1">
                          All uploaded ({creds.length} file{creds.length === 1 ? '' : 's'})
                        </div>
                        <div className="space-y-1">
                          {creds.map(c => (
                            <div key={c.id} className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="text-muted truncate flex-1 min-w-0">
                                {c.credentialType} · {c.fileName}
                              </span>
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

                    {creds.length === 0 && (
                      <p className="text-[11px] text-muted mt-1">
                        No documents uploaded yet — mark status as needs_info to request them.
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
    </AdminShell>
  )
}
