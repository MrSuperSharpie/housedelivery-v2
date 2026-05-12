'use client'

import Link from 'next/link'
import React, { useEffect, useMemo, useState } from 'react'
import { Archive, ArrowRight, Building2, Camera, Copy, ExternalLink, FileText, MapPin, Search, Shield, Video } from 'lucide-react'

import { Navbar } from '@/components/shared/Navbar'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/lib/auth'
import { loadCompletedInspections, loadCompletedInspectionsFromServer } from '@/lib/persistence/completedInspections'
import { createClient } from '@/lib/supabase/client'
import { issueAuthorityAccessGrant } from '@/lib/supabase/authorityAccess'
import { listPackageExports } from '@/lib/supabase/governance'
import { formatDate } from '@/lib/utils'
import { buildCanonicalVaultRecords, filterVaultRecordsForUser, getVaultRoleCopy, type VaultRecord } from '@/lib/vault'

function getNavbarRole(role?: string) {
  if (role === 'builder' || role === 'inspector' || role === 'auditor') return role
  return 'landing'
}

function getResultVariant(result: VaultRecord['result']) {
  if (result === 'pass') return 'statusSuccess'
  return 'statusFail' // 'fail' and 'stopped' (builder-declined hold) both display as Fail per platform standard
}

function getResultLabel(result: VaultRecord['result']) {
  if (result === 'pass') return 'Pass'
  return 'Fail' // 'stopped' = builder declined a hold; per New Standard this is a Fail outcome
}

// ─── Authority Bridge Panel ───────────────────────────────────────────────────

interface BridgeActivity {
  deliveredAt?: string
  acknowledgedAt?: string
  commentCount: number
  deficiencyCount: number
}

function AuthorityBridgePanel({
  record,
  actorId,
}: {
  record: VaultRecord
  actorId?: string
}) {
  const [copied, setCopied] = React.useState(false)
  const [bridgeActivity, setBridgeActivity] = React.useState<BridgeActivity>({
    commentCount: 0,
    deficiencyCount: 0,
  })

  React.useEffect(() => {
    let mounted = true
    void listPackageExports(record.id).then(exports => {
      if (!mounted) return
      const authorityExports = exports.filter(row => row.exportScope === 'authority_scoped_access')
      setBridgeActivity(current => ({
        ...current,
        deliveredAt: authorityExports[0]?.exportedAt,
      }))
    })
    return () => {
      mounted = false
    }
  }, [record.id])

  const createReviewLink = async () => {
    const grant = await issueAuthorityAccessGrant({
      recordId: record.id,
      recipientType: 'authority',
      actorId,
    })

    if (!grant) return null

    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/authority/review?id=${encodeURIComponent(record.id)}&token=${encodeURIComponent(grant.token)}`
  }

  const handleCopy = async () => {
    const reviewLink = await createReviewLink()
    if (!reviewLink) return
    navigator.clipboard.writeText(reviewLink).then(() => {
      setBridgeActivity(prev => ({ ...prev, deliveredAt: new Date().toISOString() }))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handlePreview = async () => {
    const reviewLink = await createReviewLink()
    if (!reviewLink) return
    window.open(reviewLink, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
      <div className="text-xs font-bold uppercase tracking-widest text-subtle mb-3">Authority Bridge</div>

      {/* Delivery link */}
      <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1.5">Secure Review Link</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-[10px] text-muted dark:border-slate-700 dark:bg-slate-900">
            Scoped authority grant link
          </div>
          <button onClick={() => void handleCopy()}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all shrink-0 ${
              copied
                ? 'border border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300'
                : 'border border-slate-200 bg-white text-muted hover:bg-slate-50 hover:text-ink dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/80'
            }`}>
            <Copy className="w-3 h-3" />
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={() => void handlePreview()}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-muted transition-all shrink-0 hover:bg-slate-50 hover:text-ink dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/80">
            <ExternalLink className="w-3 h-3" />
            Preview
          </button>
        </div>
      </div>

      {/* Bridge status */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="text-muted mb-0.5">Delivered</div>
          <div className={`font-semibold ${bridgeActivity.deliveredAt ? 'text-ink' : 'text-subtle'}`}>
            {bridgeActivity.deliveredAt
              ? new Date(bridgeActivity.deliveredAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: 'America/Vancouver' })
              : 'Not yet sent'}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="text-muted mb-0.5">Receipt</div>
          <div className={`font-semibold ${bridgeActivity.acknowledgedAt ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
            {bridgeActivity.acknowledgedAt
              ? new Date(bridgeActivity.acknowledgedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: 'America/Vancouver' })
              : 'Pending'}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="text-muted mb-0.5">Deficiencies</div>
          <div className={`font-semibold ${bridgeActivity.deficiencyCount > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-subtle'}`}>
            {bridgeActivity.deficiencyCount > 0 ? bridgeActivity.deficiencyCount : 'None'}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="text-muted mb-0.5">Comments</div>
          <div className={`font-semibold ${bridgeActivity.commentCount > 0 ? 'text-ink' : 'text-subtle'}`}>
            {bridgeActivity.commentCount > 0 ? bridgeActivity.commentCount : 'None'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VaultPage() {
  const { user, isLoading } = useAuth()
  const [records, setRecords] = useState<VaultRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [reportIdByJobRef, setReportIdByJobRef] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true

    async function load() {
      const [serverRecords, localRecords] = await Promise.all([
        loadCompletedInspectionsFromServer(),
        Promise.resolve(loadCompletedInspections()),
      ])

      if (!active) return
      setRecords(buildCanonicalVaultRecords([...serverRecords, ...localRecords]))
      setLoading(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  // Resolve vault records' jobRef values to inspector_completion_reports.id
  // so the "Open Package" link can target /api/schedule-cb instead of the old package-preview.
  useEffect(() => {
    const jobRefs = [...new Set(records.map(r => r.jobRef).filter((r): r is string => Boolean(r)))]
    if (jobRefs.length === 0) return

    let active = true
    const supabase = createClient()

    supabase
      .from('inspector_completion_reports')
      .select('id, job_id, sealed_at, submitted_at')
      .in('job_id', jobRefs)
      .in('status', ['sealed', 'submitted'])
      .then(({ data }) => {
        if (!active || !data) return
        const map: Record<string, string> = {}
        for (const row of data as Array<{ id: string; job_id: string; sealed_at: string | null; submitted_at: string | null }>) {
          const existing = map[row.job_id]
          if (!existing) {
            map[row.job_id] = row.id
          } else {
            // Prefer the most recently sealed/submitted report if multiple exist for one job
            const existingRow = (data as typeof data).find((r: { id: string }) => r.id === existing) as { sealed_at: string | null; submitted_at: string | null } | undefined
            const existingTs = existingRow?.sealed_at ?? existingRow?.submitted_at ?? ''
            const candidateTs = row.sealed_at ?? row.submitted_at ?? ''
            if (candidateTs > existingTs) map[row.job_id] = row.id
          }
        }
        setReportIdByJobRef(map)
      })

    return () => { active = false }
  }, [records])

  const scopedRecords = useMemo(
    () => filterVaultRecordsForUser(records, user),
    [records, user]
  )

  const filteredRecords = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return scopedRecords

    return scopedRecords.filter(record =>
      [
        record.projectName,
        record.address,
        record.city,
        record.permitNumber,
        record.inspectorName,
        record.inspectorLicense,
        record.jurisdictionName,
        record.certRef,
      ]
        .filter(Boolean)
        .some(value => value!.toLowerCase().includes(normalized))
    )
  }, [query, scopedRecords])

  const passCount = filteredRecords.filter(record => record.result === 'pass').length
  const failCount = filteredRecords.filter(record => record.result === 'fail' || record.result === 'stopped').length
  const totalEvidence = filteredRecords.reduce((sum, record) => sum + record.evidenceCount, 0)
  const roleCopy = getVaultRoleCopy(user)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a]">
      <Navbar role={getNavbarRole(user?.role)} dark />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start gap-4 mb-8">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <Archive className="h-6 w-6 text-ink" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">{roleCopy.title}</h1>
            <p className="text-sm text-muted mt-1">{roleCopy.subtitle}</p>
          </div>
        </div>

        {isLoading || loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-muted shadow-sm dark:border-slate-700 dark:bg-slate-800">
            Loading sealed records...
          </div>
        ) : !user ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="text-lg font-black text-ink">Authentication required</div>
            <p className="text-sm text-muted mt-2">Vault access is scoped to your Vero role.</p>
            <Link href="/sign-in" className="inline-flex items-center gap-2 mt-5 bg-flame text-white font-bold px-4 py-2.5 rounded-xl hover:bg-flame-light transition-colors">
              Sign In
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-4 gap-3 mb-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                <div className="text-xs font-bold uppercase tracking-widest text-subtle">Scoped Records</div>
                <div className="text-3xl font-black text-ink mt-2">{filteredRecords.length}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Passed</div>
                <div className="mt-2 text-3xl font-black text-emerald-700 dark:text-emerald-400">{passCount}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-rose-500/30 dark:bg-rose-500/10">
                <div className="text-xs font-bold uppercase tracking-widest text-rose-700 dark:text-rose-400">Failed</div>
                <div className="mt-2 text-3xl font-black text-rose-700 dark:text-rose-400">{failCount}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                <div className="text-xs font-bold uppercase tracking-widest text-subtle">Evidence Items</div>
                <div className="text-3xl font-black text-ink mt-2">{totalEvidence}</div>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <label className="relative block">
                <Search className="w-4 h-4 text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search by project, permit, certificate, inspector, or jurisdiction..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-ink placeholder-subtle focus:border-electric focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="text-lg font-black text-slate-900 dark:text-white">No vault records in scope</div>
                <p className="text-sm text-muted mt-2">
                  {query ? 'Try a different search term.' : 'No sealed records are available for your role scope yet.'}
                </p>
              </div>
            ) : (
              <div className="grid xl:grid-cols-2 gap-4">
                {filteredRecords.map(record => (
                  <article key={record.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getResultVariant(record.result)}>{getResultLabel(record.result)}</Badge>
                          <Badge variant="info">Sealed</Badge>
                          <Badge variant="dark">{record.retentionTier}</Badge>
                        </div>
                        <h2 className="text-lg font-black text-ink mt-3">{record.projectName}</h2>
                        <p className="text-sm text-muted mt-1">{record.stageName}</p>
                      </div>
                      <Link
                        href={
                          record.jobRef && reportIdByJobRef[record.jobRef]
                            ? `/api/schedule-cb?reportId=${encodeURIComponent(reportIdByJobRef[record.jobRef])}`
                            : `/vault/package-preview?id=${encodeURIComponent(record.id)}`
                        }
                        target={record.jobRef && reportIdByJobRef[record.jobRef] ? '_blank' : undefined}
                        rel={record.jobRef && reportIdByJobRef[record.jobRef] ? 'noopener noreferrer' : undefined}
                        className="inline-flex items-center gap-2 text-sm font-bold text-flame hover:text-flame-light transition-colors"
                      >
                        {record.jobRef && reportIdByJobRef[record.jobRef] ? 'Download Schedule C-B' : 'Open Package'}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 mt-5 text-sm">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                        <div className="text-xs font-bold uppercase tracking-widest text-subtle">Project</div>
                        <div className="text-slate-900 dark:text-white font-semibold mt-2">{record.address}</div>
                        <div className="text-slate-900 dark:text-slate-100 mt-1">{record.city ?? 'City pending'}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                        <div className="text-xs font-bold uppercase tracking-widest text-subtle">Authority Profile</div>
                        <div className="text-slate-900 dark:text-white font-semibold mt-2">{record.authorityName ?? 'Authority pending'}</div>
                        <div className="text-slate-900 dark:text-slate-100 mt-1">{record.packageType}</div>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-3 mt-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-center gap-2 text-subtle text-xs font-bold uppercase tracking-widest">
                          <Shield className="w-3.5 h-3.5" />
                          Certificate
                        </div>
                        <div className="text-slate-900 dark:text-white font-mono text-sm mt-2">{record.certRef}</div>
                        <div className="text-slate-900 dark:text-slate-100 text-xs mt-1">{formatDate(record.completedAt)}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-center gap-2 text-subtle text-xs font-bold uppercase tracking-widest">
                          <Building2 className="w-3.5 h-3.5" />
                          Inspector
                        </div>
                        <div className="text-slate-900 dark:text-white font-semibold text-sm mt-2">{record.inspectorName}</div>
                        <div className="text-slate-900 dark:text-slate-100 text-xs mt-1">{record.inspectorLicense}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-center gap-2 text-subtle text-xs font-bold uppercase tracking-widest">
                          <MapPin className="w-3.5 h-3.5" />
                          Scope
                        </div>
                        <div className="text-slate-900 dark:text-white font-semibold text-sm mt-2">{record.jurisdictionName ?? 'Jurisdiction pending'}</div>
                        <div className="text-slate-900 dark:text-slate-100 text-xs mt-1">{record.permitNumber ?? 'Permit pending'}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" />
                        {record.photos} photos
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5" />
                        {record.videos} videos
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        {record.evidenceCount} evidence items
                      </span>
                      <span>{record.hasGeoEvidence ? 'GPS preserved' : 'No GPS evidence'}</span>
                      {record.offlineEvidenceCount > 0 && <span>{record.offlineEvidenceCount} offline captures</span>}
                    </div>

                    {record.notes.length > 0 && (
                      <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                        <div className="text-xs font-bold uppercase tracking-widest text-subtle mb-2">Field Notes</div>
                        <div className="space-y-2">
                          {record.notes.slice(0, 3).map(note => (
                            <p key={note} className="text-sm text-muted leading-relaxed">{note}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    <AuthorityBridgePanel record={record} actorId={user?.supabaseId ?? user?.id} />
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
