'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Briefcase, User, MapPin, AlertCircle
} from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'
import { useAuth } from '@/lib/auth'
import { useStore } from '@/lib/store'
import { listAllJobOpportunities } from '@/lib/supabase/jobs'
import type { JobOpportunityRow } from '@/lib/supabase/jobs'

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    live:                   { label: 'Live',                cls: 'bg-success-green/20 text-success-green border-success-green/30' },
    pending_validation:     { label: 'Payment Pending',     cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    provisionally_assigned: { label: 'Provisionally Assigned', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    confirmed:              { label: 'Confirmed',           cls: 'bg-electric/20 text-electric border-electric/30' },
    on_hold:                { label: 'On Hold',             cls: 'bg-fail-red/20 text-fail-red border-fail-red/30' },
    completed:              { label: 'Completed',           cls: 'bg-white/10 text-muted border-white/15' },
    cancelled:              { label: 'Cancelled',           cls: 'bg-white/5 text-subtle border-white/10' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-white/5 text-subtle border-white/10' }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cls}`}>
      {label}
    </span>
  )
}

// ─── Application row ──────────────────────────────────────────────────────────

function ApplicationRow({
  app,
  onApprove,
  onDecline,
}: {
  app: ReturnType<typeof useStore>['applications'][number]
  onApprove: (id: string) => void
  onDecline: (id: string) => void
}) {
  const statusColors = {
    pending:  'text-amber-400',
    approved: 'text-success-green',
    declined: 'text-fail-red',
  }

  return (
    <div className="flex items-start gap-3 p-3 bg-surface/50 border border-white/5 rounded-xl">
      <div className="w-9 h-9 bg-flame/10 border border-flame/20 rounded-xl flex items-center justify-center shrink-0">
        <User className="w-4 h-4 text-flame" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-ink">{app.inspectorName}</span>
          <span className="text-[10px] font-mono text-muted">{app.inspectorLicense}</span>
          <span className={`text-[10px] font-bold uppercase ${statusColors[app.status]}`}>
            {app.status}
          </span>
        </div>
        <div className="text-xs text-muted mt-0.5">
          {app.inspectorDisciplines.join(', ')} · {app.inspectorRegions.join(', ')}
        </div>
        {app.credentialExpiryDate && (
          <div className="text-[10px] text-subtle mt-0.5 font-mono">
            Credential expires: {app.credentialExpiryDate}
          </div>
        )}
        {app.note && (
          <div className="text-xs text-muted mt-1 bg-white/3 border border-white/5 rounded-lg px-2 py-1">
            {app.note}
          </div>
        )}
      </div>

      {app.status === 'pending' && (
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => onApprove(app.id)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-success-green/20 border border-success-green/30 text-success-green text-xs font-bold rounded-lg hover:bg-success-green/30 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approve
          </button>
          <button
            onClick={() => onDecline(app.id)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-fail-red/20 border border-fail-red/30 text-fail-red text-xs font-bold rounded-lg hover:bg-fail-red/30 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            Decline
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminJobsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { applications, approveApplication, declineApplication, getJobApplications } = useStore()

  const [jobs, setJobs] = useState<JobOpportunityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState<Record<string, string>>({})
  const [paymentConfirmingIds, setPaymentConfirmingIds] = useState<Set<string>>(new Set())
  const [paymentFeedback, setPaymentFeedback] = useState<Record<string, { ok: boolean; message: string }>>({})

  // Auth guard
  useEffect(() => {
    if (!user) { router.replace('/sign-in'); return }
    if (user.role !== 'admin') { router.replace('/'); return }
  }, [router, user])

  // Load jobs from Supabase
  useEffect(() => {
    listAllJobOpportunities()
      .then(rows => setJobs(rows))
      .catch(err => console.error('[AdminJobsPage] listAllJobOpportunities failed:', err))
      .finally(() => setLoading(false))
  }, [])

  const handleApprove = (applicationId: string) => {
    if (!user?.supabaseId) {
      setActionFeedback(prev => ({ ...prev, [applicationId]: 'Admin user ID not available.' }))
      return
    }

    // approveApplication now requires actorId (admin's user ID) for Blueprint Rule 10 audit trail
    const result = approveApplication(applicationId, user.supabaseId)

    if (!result.eligible) {
      const reason = result.reasons?.join(', ') ?? 'Inspector is not eligible for this job.'
      setActionFeedback(prev => ({ ...prev, [applicationId]: `Blocked: ${reason}` }))
    } else {
      setActionFeedback(prev => ({ ...prev, [applicationId]: 'Approved ✓' }))
    }
  }

  const handleDecline = (applicationId: string) => {
    if (!user?.supabaseId) {
      setActionFeedback(prev => ({ ...prev, [applicationId]: 'Admin user ID not available.' }))
      return
    }
    declineApplication(applicationId, user.supabaseId)
    setActionFeedback(prev => ({ ...prev, [applicationId]: 'Declined' }))
  }

  const handleConfirmPayment = async (jobId: string) => {
    setPaymentConfirmingIds(prev => new Set(prev).add(jobId))
    setPaymentFeedback(prev => { const m = { ...prev }; delete m[jobId]; return m })
    try {
      const res = await fetch('/api/admin/jobs/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })
      const data = await res.json() as { ok: boolean; live?: boolean; newStatus?: string; remainingBlockers?: { message: string }[]; error?: string }
      if (data.ok) {
        const msg = data.live
          ? 'Payment confirmed — job is now live.'
          : `Payment confirmed — job remains pending (${(data.remainingBlockers ?? []).map(b => b.message).join('; ')})`
        setPaymentFeedback(prev => ({ ...prev, [jobId]: { ok: true, message: msg } }))
        setJobs(prev => prev.map(j =>
          j.id === jobId ? { ...j, status: (data.newStatus ?? j.status) as typeof j.status } : j,
        ))
      } else {
        setPaymentFeedback(prev => ({ ...prev, [jobId]: { ok: false, message: data.error ?? 'Could not confirm payment.' } }))
      }
    } catch {
      setPaymentFeedback(prev => ({ ...prev, [jobId]: { ok: false, message: 'Connection error. Please try again.' } }))
    } finally {
      setPaymentConfirmingIds(prev => { const s = new Set(prev); s.delete(jobId); return s })
    }
  }

  if (loading) {
    return (
      <AdminShell
        title="Jobs"
        subtitle="Review and approve inspector applications for posted jobs."
      >
        <div className="flex min-h-[16rem] items-center justify-center">
          <div className="w-8 h-8 border-2 border-flame/30 border-t-flame rounded-full animate-spin" />
        </div>
      </AdminShell>
    )
  }

  const totalPending = applications.filter(a => a.status === 'pending').length

  return (
    <AdminShell
      title="Jobs"
      subtitle="Review and approve inspector applications for posted jobs."
    >
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-black text-ink text-xl">Job Applications</h1>
          <p className="text-sm text-muted mt-1">
            Review and approve inspector applications for posted jobs.
          </p>
          {totalPending > 0 && (
            <div className="inline-flex items-center gap-1.5 mt-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-400">
                {totalPending} pending application{totalPending > 1 ? 's' : ''} require review
              </span>
            </div>
          )}
        </div>

        {/* Job list */}
        {jobs.length === 0 ? (
          <div className="card-dark rounded-2xl p-8 text-center">
            <Briefcase className="w-8 h-8 text-muted mx-auto mb-3" />
            <div className="font-bold text-ink mb-1">No jobs posted yet</div>
            <div className="text-xs text-muted">Jobs will appear here once builders post them.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => {
              const jobApps = getJobApplications(job.id)
              const pendingCount = jobApps.filter(a => a.status === 'pending').length
              const isExpanded = expandedJobId === job.id

              return (
                <div key={job.id} className={`rounded-2xl border overflow-hidden transition-all ${
                  pendingCount > 0 ? 'border-amber-500/30' : 'border-white/8'
                }`}>
                  {/* Job header — click to expand */}
                  <button
                    onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 bg-panel hover:bg-raised transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-flame/10 border border-flame/20 rounded-xl flex items-center justify-center shrink-0">
                      <Briefcase className="w-5 h-5 text-flame" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-ink text-sm truncate">{job.projectName}</div>
                      <div className="flex items-center gap-1 text-xs text-muted mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {job.address}, {job.city}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] font-mono text-subtle">
                          Stage {job.stage} · {job.stageName}
                        </span>
                        <span className="text-[10px] font-mono text-subtle">
                          {job.requiredDiscipline}
                        </span>
                        <StatusBadge status={job.status} />
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {pendingCount > 0 ? (
                        <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md">
                          {pendingCount} pending
                        </span>
                      ) : jobApps.length > 0 ? (
                        <span className="text-[10px] font-bold bg-white/5 text-muted border border-white/10 px-2 py-0.5 rounded-md">
                          {jobApps.length} application{jobApps.length > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-[10px] text-subtle">No applications</span>
                      )}
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-muted" />
                        : <ChevronDown className="w-4 h-4 text-muted" />
                      }
                    </div>
                  </button>

                  {/* Applications list — shown when expanded */}
                  {isExpanded && (
                    <div className="border-t border-white/5 bg-surface/50 px-4 py-4 space-y-3">
                      {jobApps.length === 0 ? (
                        <div className="text-xs text-muted text-center py-4">
                          No applications for this job yet.
                        </div>
                      ) : (
                        jobApps.map(app => (
                          <div key={app.id}>
                            <ApplicationRow
                              app={app}
                              onApprove={handleApprove}
                              onDecline={handleDecline}
                            />
                            {actionFeedback[app.id] && (
                              <div className={`text-xs font-medium mt-1.5 px-3 py-1.5 rounded-lg ${
                                actionFeedback[app.id].startsWith('Blocked')
                                  ? 'bg-fail-red/10 text-fail-red border border-fail-red/20'
                                  : actionFeedback[app.id] === 'Approved ✓'
                                    ? 'bg-success-green/10 text-success-green border border-success-green/20'
                                    : 'bg-white/5 text-muted border border-white/8'
                              }`}>
                                {actionFeedback[app.id]}
                              </div>
                            )}
                          </div>
                        ))
                      )}

                      {/* Payment confirmation — only shown when job is blocked by payment/escrow rule */}
                      {job.status === 'pending_validation' &&
                        (job.validationBlockers ?? []).some(b => b.code === 'escrow_not_authorized') && (
                        <div className="border-t border-white/5 pt-3">
                          {paymentFeedback[job.id] ? (
                            <div className={`text-xs font-medium px-3 py-2 rounded-lg ${
                              paymentFeedback[job.id].ok
                                ? 'bg-success-green/10 text-success-green border border-success-green/20'
                                : 'bg-fail-red/10 text-fail-red border border-fail-red/20'
                            }`}>
                              {paymentFeedback[job.id].message}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleConfirmPayment(job.id)}
                              disabled={paymentConfirmingIds.has(job.id)}
                              className="flex items-center gap-1.5 px-3 py-2 bg-electric/20 border border-electric/30 text-electric text-xs font-bold rounded-lg hover:bg-electric/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {paymentConfirmingIds.has(job.id) ? (
                                <div className="w-3 h-3 border border-electric/40 border-t-electric rounded-full animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              Confirm Payment Received
                            </button>
                          )}
                        </div>
                      )}

                      {/* Job detail footer */}
                      <div className="border-t border-white/5 pt-3 grid grid-cols-2 gap-2 text-[10px] text-muted font-mono">
                        <span>Permit: {job.permitNumber}</span>
                        <span>Rate: ${job.offeredRate}</span>
                        <span>Tier: {job.dispatchTier}</span>
                        <span>Builder ID: {job.builderId?.slice(0, 8)}…</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
