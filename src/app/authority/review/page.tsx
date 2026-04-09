'use client'
export const dynamic = 'force-dynamic'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Shield, FileText, CheckCircle2, XCircle, Minus,
  Eye, Clock, MapPin, User, Tag,
  AlertTriangle, Send,
} from 'lucide-react'
import { getCompletedInspectionByIdAsync } from '@/lib/persistence/completedInspections'
import { generateAuthorityPackageFromCompletedRecord } from '@/lib/packages/authority-package'
import { validateAuthorityAccessGrant } from '@/lib/supabase/authorityAccess'
import { appendGovernanceAuditEvent } from '@/lib/supabase/governance'

// ─── Authority Review Page ───────────────────────────────────────────────────
// Read-only, package-scoped view for authorities.
// Access: /authority/review?id=<recordId>&token=<accessToken>
// Cannot view: full Vault, unrelated projects, builder/inspector onboarding, escrow data.

// ─── Authority Bridge Persistence ─────────────────────────────────────────────
// Stores acknowledgement and comments locally keyed by recordId.
// In production these would persist to a job_authority_events table.

export interface AuthorityComment {
  id: string
  text: string
  type: 'comment' | 'deficiency' | 'request_info'
  at: string
}

export interface AuthorityBridgeState {
  recordId: string
  acknowledged: boolean
  acknowledgedAt?: string
  comments: AuthorityComment[]
}

const BRIDGE_KEY_PREFIX = 'sl_authority_bridge_'

function loadBridgeState(recordId: string): AuthorityBridgeState {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(BRIDGE_KEY_PREFIX + recordId) : null
    if (raw) return JSON.parse(raw) as AuthorityBridgeState
  } catch { /* ignore */ }
  return { recordId, acknowledged: false, comments: [] }
}

function saveBridgeState(state: AuthorityBridgeState) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(BRIDGE_KEY_PREFIX + state.recordId, JSON.stringify(state))
    }
  } catch { /* ignore */ }
}

type ReviewTab = 'summary' | 'checklist' | 'evidence' | 'declaration'

export default function AuthorityReviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060B15] flex items-center justify-center"><div className="w-8 h-8 border-2 border-flame/30 border-t-flame rounded-full animate-spin" /></div>}>
      <AuthorityReviewContent />
    </Suspense>
  )
}

function AuthorityReviewContent() {
  const searchParams = useSearchParams()
  const recordId = searchParams.get('id') ?? ''
  const token = searchParams.get('token') ?? ''

  const [record, setRecord] = useState<Awaited<ReturnType<typeof getCompletedInspectionByIdAsync>>>(undefined)
  const [recordLoaded, setRecordLoaded] = useState(false)
  const [tab, setTab] = useState<ReviewTab>('summary')
  const [bridgeState, setBridgeState] = useState<AuthorityBridgeState>(() => ({ recordId: '', acknowledged: false, comments: [] }))
  const [comment, setComment] = useState('')
  const [commentType, setCommentType] = useState<'comment' | 'deficiency' | 'request_info'>('comment')
  const [accessValidated, setAccessValidated] = useState(false)

  const pkg = useMemo(
    () => (record && record.evidenceItems?.length ? generateAuthorityPackageFromCompletedRecord(record) : null),
    [record]
  )

  useEffect(() => {
    if (!recordId || !token) return
    async function loadReview() {
      setBridgeState(loadBridgeState(recordId))
      const grant = await validateAuthorityAccessGrant(recordId, token)
      if (!grant) {
        setRecord(undefined)
        setAccessValidated(false)
        setRecordLoaded(true)
        return
      }

      setAccessValidated(true)
      const nextRecord = await getCompletedInspectionByIdAsync(recordId)
      setRecord(nextRecord)
      setRecordLoaded(true)
    }

    void loadReview()
  }, [recordId, token])

  // ── Loading / error states ──────────────────────────────────────────────────

  if (!recordId || !token) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="max-w-md text-center px-6">
          <div className="w-14 h-14 bg-fail-red/10 border border-fail-red/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-fail-red" />
          </div>
          <h1 className="font-black text-ink text-xl mb-2">Access Denied</h1>
          <p className="text-muted text-sm">This review link is invalid or has expired. Contact the submitting party for a new link.</p>
        </div>
      </div>
    )
  }

  if (!recordLoaded) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-flame/30 border-t-flame rounded-full animate-spin" />
      </div>
    )
  }

  if (!accessValidated || !record || !pkg) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="max-w-md text-center px-6">
          <div className="w-14 h-14 bg-warning-amber/10 border border-warning-amber/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-warning-amber" />
          </div>
          <h1 className="font-black text-ink text-xl mb-2">Record Not Found</h1>
          <p className="text-muted text-sm">The inspection record may have been archived or the link is no longer valid.</p>
        </div>
      </div>
    )
  }

  const { cover, complianceSummary, evidenceIndex, inspectorDeclaration } = pkg
  // Per New Standard: builder-declined hold ('stopped') is a Fail outcome
  const overallResult = record.result === 'pass' ? 'PASS' : 'FAIL'
  const dateFormatted = new Date(cover.submissionDate).toLocaleString('en-CA', {
    timeZone: 'America/Vancouver',
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const evidencePhotos = record.evidenceItems.filter(e => e.kind === 'photo').length
  const evidenceNotes = record.evidenceItems.filter(e => e.kind === 'voice_note').length

  const tabs: { id: ReviewTab; label: string }[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'checklist', label: 'Checklist' },
    { id: 'evidence', label: 'Evidence' },
    { id: 'declaration', label: 'Declaration' },
  ]

  const handleAddComment = () => {
    if (!comment.trim()) return
    const newComment: AuthorityComment = {
      id: Date.now().toString(36),
      text: comment.trim(),
      type: commentType,
      at: new Date().toISOString(),
    }
    setBridgeState(prev => {
      const updated = { ...prev, comments: [...prev.comments, newComment] }
      saveBridgeState(updated)
      return updated
    })
    void appendGovernanceAuditEvent({
      entityType: 'authority_access',
      entityId: recordId,
      action: 'authority.comment_added',
      actorId: 'authority-review',
      actorRole: 'authority',
      ruleIds: ['R-041'],
      blockerType: 'technical',
      reason: 'Authority reviewer added a package comment.',
      beforeState: {},
      afterState: {
        commentType,
      },
      metadata: {
        recordId,
      },
    })
    setComment('')
  }

  const handleAcknowledge = () => {
    setBridgeState(prev => {
      const updated = { ...prev, acknowledged: true, acknowledgedAt: new Date().toISOString() }
      saveBridgeState(updated)
      return updated
    })
    void appendGovernanceAuditEvent({
      entityType: 'authority_access',
      entityId: recordId,
      action: 'authority.receipt_acknowledged',
      actorId: 'authority-review',
      actorRole: 'authority',
      ruleIds: ['R-041'],
      blockerType: 'technical',
      reason: 'Authority reviewer acknowledged package receipt.',
      beforeState: {},
      afterState: {
        acknowledged: true,
      },
      metadata: {
        recordId,
      },
    })
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header bar */}
      <div className="border-b border-white/5 px-4 sm:px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
            <Eye className="w-3.5 h-3.5 text-muted" />
          </div>
          <span className="text-sm font-black text-ink tracking-tight">
            Site<span className="text-flame">Line</span>
            <span className="text-muted font-normal ml-1.5 text-xs">Authority Review</span>
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Shield className="w-3.5 h-3.5" />
            Read-Only Access
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">

        {/* Package header */}
        <div className="bg-panel border border-white/8 rounded-2xl p-5 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Inspection Submission Package</div>
              <h1 className="font-black text-ink text-xl">{cover.projectName}</h1>
              <p className="text-sm text-muted mt-1">{cover.projectAddress}</p>
            </div>
            <div className={`px-3 py-1.5 rounded-xl text-xs font-black border ${
              record.result === 'pass'
                ? 'bg-success-green/10 text-success-green border-success-green/20'
                : 'bg-fail-red/10 text-fail-red border-fail-red/20'
            }`}>
              {overallResult}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Tag, label: 'Permit', value: cover.permitNumber || '—' },
              { icon: MapPin, label: 'Stage', value: cover.stageName },
              { icon: Clock, label: 'Date', value: dateFormatted },
              { icon: User, label: 'Inspector', value: inspectorDeclaration?.inspectorName ?? record.inspectorName },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-surface border border-white/5 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3 h-3 text-muted" />
                  <span className="text-[10px] font-bold text-muted uppercase tracking-widest">{label}</span>
                </div>
                <div className="text-sm font-semibold text-ink truncate">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex bg-panel border border-white/8 rounded-xl p-1 mb-6">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === t.id ? 'bg-white/10 text-ink' : 'text-muted hover:text-ink'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'summary' && (
          <div className="space-y-4">
            {/* Compliance summary */}
            <div className="bg-panel border border-white/8 rounded-2xl p-5">
              <h2 className="label-mono mb-4">Compliance Summary</h2>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Total', value: complianceSummary.totalItems, color: 'text-ink' },
                  { label: 'Pass', value: complianceSummary.passed, color: 'text-success-green' },
                  { label: 'Fail', value: complianceSummary.failed, color: 'text-fail-red' },
                  { label: 'N/A', value: complianceSummary.na, color: 'text-muted' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-surface border border-white/5 rounded-xl p-3 text-center">
                    <div className={`font-mono font-black text-lg ${color}`}>{value}</div>
                    <div className="text-[10px] text-muted uppercase tracking-widest">{label}</div>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-surface rounded-full overflow-hidden flex">
                {complianceSummary.totalItems > 0 && (
                  <>
                    <div className="h-full bg-success-green" style={{ width: `${(complianceSummary.passed / complianceSummary.totalItems) * 100}%` }} />
                    <div className="h-full bg-fail-red" style={{ width: `${(complianceSummary.failed / complianceSummary.totalItems) * 100}%` }} />
                    <div className="h-full bg-white/10" style={{ width: `${(complianceSummary.na / complianceSummary.totalItems) * 100}%` }} />
                  </>
                )}
              </div>
            </div>

            {/* Evidence overview */}
            <div className="bg-panel border border-white/8 rounded-2xl p-5">
              <h2 className="label-mono mb-4">Evidence Summary</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface border border-white/5 rounded-xl p-3">
                  <div className="font-mono font-black text-lg text-ink">{evidencePhotos}</div>
                  <div className="text-[10px] text-muted uppercase tracking-widest">Photos</div>
                </div>
                <div className="bg-surface border border-white/5 rounded-xl p-3">
                  <div className="font-mono font-black text-lg text-ink">{evidenceNotes}</div>
                  <div className="text-[10px] text-muted uppercase tracking-widest">Field Notes</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'checklist' && (
          <div className="bg-panel border border-white/8 rounded-2xl p-5">
            <h2 className="label-mono mb-4">Checklist Results</h2>
            <div className="space-y-2">
              {record.checklistResults?.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-surface border border-white/5 rounded-xl">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    item.result === 'pass' ? 'bg-success-green/15' :
                    item.result === 'fail' ? 'bg-fail-red/15' :
                    item.result === 'na' ? 'bg-white/5' : 'bg-white/5'
                  }`}>
                    {item.result === 'pass' && <CheckCircle2 className="w-3.5 h-3.5 text-success-green" />}
                    {item.result === 'fail' && <XCircle className="w-3.5 h-3.5 text-fail-red" />}
                    {item.result === 'na' && <Minus className="w-3.5 h-3.5 text-muted" />}
                    {item.result === 'pending' && <Clock className="w-3 h-3 text-muted" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ink truncate">{item.label}</div>
                    {item.note && <div className="text-xs text-muted mt-0.5">{item.note}</div>}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${
                    item.result === 'pass' ? 'text-success-green' :
                    item.result === 'fail' ? 'text-fail-red' : 'text-muted'
                  }`}>
                    {item.result}
                  </span>
                </div>
              )) ?? (
                <p className="text-muted text-sm py-4 text-center">No checklist data available.</p>
              )}
            </div>
          </div>
        )}

        {tab === 'evidence' && (
          <div className="bg-panel border border-white/8 rounded-2xl p-5">
            <h2 className="label-mono mb-4">Evidence Index</h2>
            {evidenceIndex.length === 0 ? (
              <p className="text-muted text-sm py-4 text-center">No evidence items recorded.</p>
            ) : (
              <div className="space-y-2">
                {evidenceIndex.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-surface border border-white/5 rounded-xl">
                    <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ink">{item.kind} — {item.checklistItemRef ?? item.shortRef}</div>
                      <div className="text-xs text-muted">
                        {item.captureTimestamp ? new Date(item.captureTimestamp).toLocaleString('en-CA', { timeZone: 'America/Vancouver' }) : '—'}
                        {item.filename && ` · ${item.filename}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'declaration' && (
          <div className="space-y-4">
            {inspectorDeclaration && (
              <div className="bg-panel border border-white/8 rounded-2xl p-5">
                <h2 className="label-mono mb-4">Inspector Declaration</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <span className="text-muted w-36 shrink-0">Inspector</span>
                    <span className="text-ink font-semibold">{inspectorDeclaration.inspectorName}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-muted w-36 shrink-0">Licence No.</span>
                    <span className="font-mono text-ink">{inspectorDeclaration.licenseNumber}</span>
                  </div>
                  {inspectorDeclaration.discipline && (
                    <div className="flex gap-3">
                      <span className="text-muted w-36 shrink-0">Discipline</span>
                      <span className="text-ink capitalize">{inspectorDeclaration.discipline}</span>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <span className="text-muted w-36 shrink-0">Certificate Ref</span>
                    <span className="font-mono text-ink font-bold">{inspectorDeclaration.certRef}</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-muted w-36 shrink-0">Sealed At</span>
                    <span className="text-ink">{dateFormatted}</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-surface border border-white/5 rounded-xl">
                  <p className="text-xs text-muted italic leading-relaxed">
                    &ldquo;{inspectorDeclaration.statement}&rdquo;
                  </p>
                </div>
              </div>
            )}

            {/* Certificate hash */}
            <div className="bg-panel border border-white/8 rounded-2xl p-5">
              <h2 className="label-mono mb-3">Record Integrity</h2>
              <div className="bg-surface border border-white/5 rounded-xl p-3">
                <div className="text-[10px] text-muted uppercase tracking-widest mb-1">SHA-256 Hash</div>
                <div className="font-mono text-xs text-ink break-all">{pkg.manifestChecksum ?? 'Computed at export'}</div>
              </div>
              <p className="text-[10px] text-subtle mt-2">
                This hash verifies the inspection record has not been modified since it was sealed.
              </p>
            </div>
          </div>
        )}

        {/* Authority actions */}
        <div className="mt-6 space-y-4">
          {/* Comments / deficiency returns */}
          <div className="bg-panel border border-white/8 rounded-2xl p-5">
            <h2 className="label-mono mb-3">Authority Comments & Deficiencies</h2>

            {bridgeState.comments.length > 0 && (
              <div className="space-y-2 mb-4">
                {bridgeState.comments.map((c) => {
                  const typeMeta = {
                    comment:      { label: 'Comment',        cls: 'bg-white/5 text-muted' },
                    deficiency:   { label: 'Deficiency',     cls: 'bg-fail-red/10 text-fail-red' },
                    request_info: { label: 'Info Requested', cls: 'bg-warning-amber/10 text-warning-amber' },
                  }[c.type]
                  return (
                    <div key={c.id} className="bg-surface border border-white/5 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeMeta.cls}`}>{typeMeta.label}</span>
                        <span className="text-[10px] text-subtle">
                          {new Date(c.at).toLocaleString('en-CA', { timeZone: 'America/Vancouver' })}
                        </span>
                      </div>
                      <p className="text-sm text-ink">{c.text}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Comment type selector */}
            <div className="flex gap-1.5 mb-2">
              {(['comment', 'deficiency', 'request_info'] as const).map(type => (
                <button key={type} type="button" onClick={() => setCommentType(type)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all capitalize ${
                    commentType === type
                      ? type === 'deficiency' ? 'bg-fail-red/20 text-fail-red' :
                        type === 'request_info' ? 'bg-warning-amber/20 text-warning-amber' :
                        'bg-white/15 text-ink'
                      : 'bg-white/5 text-muted hover:bg-white/8'
                  }`}>
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={
                  commentType === 'deficiency' ? 'Describe the deficiency...' :
                  commentType === 'request_info' ? 'Specify the information required...' :
                  'Add a comment...'
                }
                className="flex-1 bg-surface border border-white/10 text-ink text-sm rounded-xl px-4 py-2.5 placeholder-subtle focus:outline-none focus:border-white/20 transition-colors"
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              />
              <button onClick={handleAddComment}
                className="px-4 py-2.5 bg-white/10 border border-white/10 text-ink rounded-xl hover:bg-white/15 transition-all">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Acknowledge receipt */}
          {!bridgeState.acknowledged ? (
            <button onClick={handleAcknowledge}
              className="w-full py-3.5 bg-success-green/10 border border-success-green/20 text-success-green font-black text-sm rounded-2xl hover:bg-success-green/15 transition-all flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Acknowledge Receipt of Package
            </button>
          ) : (
            <div className="bg-success-green/10 border border-success-green/20 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success-green shrink-0" />
              <div>
                <div className="font-bold text-success-green text-sm">Receipt Acknowledged</div>
                <div className="text-xs text-muted mt-0.5">
                  {bridgeState.acknowledgedAt
                    ? new Date(bridgeState.acknowledgedAt).toLocaleString('en-CA', { timeZone: 'America/Vancouver' })
                    : '—'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer notice */}
        <p className="text-center text-[10px] text-subtle mt-8 leading-relaxed max-w-md mx-auto">
          This is a read-only authority review portal. You may view the inspection submission package,
          add comments, and acknowledge receipt. You cannot modify the sealed record.
          Access expires when the review link is revoked by the submitting party.
        </p>
      </div>
    </div>
  )
}
