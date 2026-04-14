'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, TrendingUp, DollarSign, ChevronRight, MapPin,
  CheckCircle2, Clock,
  Navigation, AlertTriangle, Zap, Lock, ExternalLink
} from 'lucide-react'
import { Navbar } from '@/components/shared/Navbar'
import { ProjectCard } from '@/components/builder/ProjectCard'
import { DispatchModal } from '@/components/builder/DispatchModal'
import { EnRouteTracker } from '@/components/builder/EnRouteTracker'
import { DailyFlash } from '@/components/builder/DailyFlash'
import { MOCK_BUILDER } from '@/lib/mockData'
import { useAuth } from '@/lib/auth'
import { useStore } from '@/lib/store'
import type { Assignment, ObjectionReason } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { getBuilderOnboardingStatusAsync } from '@/lib/persistence/builderOnboarding'
import type { BuilderOnboardingStatus } from '@/lib/persistence/builderOnboarding'
import type { Project, DispatchTier, InspectionStatus } from '@/lib/types'
import type { HoldRecord } from '@/lib/types'
import {
  builderApproveHold,
  builderDeclineHold,
  listHoldsForJob,
  requestOnSiteCorrectionReview,
} from '@/lib/supabase/holds'
import { listJobsByBuilder } from '@/lib/supabase/jobs'
import type { JobOpportunityRow } from '@/lib/supabase/jobs'
import { getJobWorkflowLabel, getJobWorkflowState } from '@/lib/workflow'
import { isHoldOpenStatus } from '@/lib/holds/workflow'
import { resolveHoldBaseRate } from '@/lib/pricing/config'
import { calculateHoldCost } from '@/utils/pricing'
import { resolveReportDataMode } from '@/lib/dataSourceMode'

// FIX #1: createClient() must not be called between import statements.
// Moved here, after all imports, as a module-level constant.
const supabase = createClient()

// ─── Assignment panel helpers ──────────────────────────────────────────────────

const OBJECTION_REASONS: { value: ObjectionReason; label: string; desc: string }[] = [
  { value: 'conflict_of_interest',    label: 'Conflict of interest',      desc: 'Inspector has a personal or financial conflict with this project.' },
  { value: 'access_concern',          label: 'Access concern',            desc: 'Inspector cannot safely or practically access the site.' },
  { value: 'continuity_requirement',  label: 'Continuity requirement',    desc: 'Prior inspection continuity requires a specific inspector.' },
  { value: 'credential_mismatch',     label: 'Credential mismatch',       desc: "Inspector's credentials do not match stage requirements." },
  { value: 'prior_admin_restriction', label: 'Prior admin restriction',   desc: 'Admin has previously restricted this inspector from this project.' },
]

function useCountdown(targetIso: string) {
  const [remaining, setRemaining] = React.useState(() => {
    const ms = new Date(targetIso).getTime() - Date.now()
    return Math.max(0, ms)
  })
  React.useEffect(() => {
    const t = setInterval(() => {
      const ms = new Date(targetIso).getTime() - Date.now()
      setRemaining(Math.max(0, ms))
    }, 1000)
    return () => clearInterval(t)
  }, [targetIso])
  const h = Math.floor(remaining / 3600000)
  const m = Math.floor((remaining % 3600000) / 60000)
  const s = Math.floor((remaining % 60000) / 1000)
  const expired = remaining === 0
  return { h, m, s, expired, remaining }
}

function ProvisionalAssignmentPanel({
  assignment,
  jobName,
  onObject,
}: {
  assignment: Assignment
  jobName: string
  onObject: (reason: ObjectionReason, note: string) => void
}) {
  const { h, m, s, expired } = useCountdown(assignment.objectionWindowClosesAt)
  const [showForm, setShowForm] = React.useState(false)
  const [reason, setReason] = React.useState<ObjectionReason | ''>('')
  const [note, setNote] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [objected, setObjected] = React.useState(false)

  if (assignment.objectionState === 'pending_review' || objected) {
    return (
      <div className="mb-6 rounded-2xl border border-warning-amber/25 bg-warning-amber/5 overflow-hidden">
        <div className="px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning-amber shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-ink text-sm mb-0.5">Objection filed — admin review required</div>
            <div className="text-xs text-muted">Your objection has been recorded. Admin will review and either uphold or reject it. If rejected, the provisional assignment stands.</div>
            <div className="text-[11px] font-mono text-subtle mt-1">{jobName}</div>
          </div>
        </div>
      </div>
    )
  }

  if (assignment.status === 'confirmed' || expired) {
    return (
      <div className="mb-6 rounded-2xl border border-success-green/20 bg-success-green/5 overflow-hidden">
        <div className="px-5 py-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-success-green shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-ink text-sm mb-0.5">Assignment confirmed — {assignment.inspectorName}</div>
            <div className="text-xs text-muted">Objection window closed. Inspector is confirmed for this job.</div>
            <div className="text-[11px] font-mono text-subtle mt-1 font-semibold text-success-green">{assignment.inspectorLicense}</div>
          </div>
        </div>
      </div>
    )
  }

  const handleObject = async () => {
    if (!reason || !note.trim()) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 700))
    setObjected(true)
    onObject(reason as ObjectionReason, note)
    setSubmitting(false)
  }

  return (
    <div className="mb-6 rounded-2xl border border-electric/25 bg-electric/5 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-electric/15">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-electric/15 border border-electric/25 rounded-xl flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-electric" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-ink text-sm">Provisional Assignment</span>
                <span className="text-[10px] font-bold bg-electric/20 text-electric border border-electric/30 px-1.5 py-0.5 rounded-full uppercase">Active</span>
              </div>
              <div className="text-xs text-muted">{jobName}</div>
            </div>
          </div>
          {/* Countdown */}
          <div className="text-right shrink-0">
            <div className="text-[10px] text-muted mb-0.5">Objection window</div>
            <div className={`text-sm font-black font-mono ${h === 0 && m < 30 ? 'text-warning-amber' : 'text-ink'}`}>
              {h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`}
            </div>
          </div>
        </div>
      </div>

      {/* Inspector info */}
      <div className="px-5 py-3 border-b border-electric/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-flame/15 border border-flame/25 rounded-xl flex items-center justify-center font-black text-flame text-sm shrink-0">
            {assignment.inspectorName.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-ink text-sm">{assignment.inspectorName}</div>
            <div className="text-xs font-mono text-muted">{assignment.inspectorLicense}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted">Claimed</div>
            <div className="text-xs text-ink">{new Date(assignment.claimedAt).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
        <div className="mt-2 text-[11px] text-muted flex items-center gap-1.5">
          <Clock className="w-3 h-3 shrink-0" />
          {assignment.claimedSlot.flexible
            ? 'Timing: Flexible / any time works'
            : `Slot: ${new Date(assignment.claimedSlot.date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })} · ${assignment.claimedSlot.startTime}–${assignment.claimedSlot.endTime}`}
        </div>
      </div>

      {/* Notice */}
      <div className="px-5 py-3 text-xs text-muted border-b border-electric/10">
        This assignment becomes <span className="text-success-green font-bold">confirmed</span> when the objection window closes. You may only raise an objection for the specific reasons below — all objections are reviewed by Vero admin.
      </div>

      {/* Objection form toggle */}
      {!showForm ? (
        <div className="px-5 py-3">
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-warning-amber font-bold hover:underline flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3" /> Raise an objection
          </button>
        </div>
      ) : (
        <div className="px-5 py-4 space-y-3">
          <div className="text-[11px] font-bold text-muted uppercase tracking-wide">Select objection reason</div>
          <div className="space-y-2">
            {OBJECTION_REASONS.map(r => (
              <label key={r.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${reason === r.value ? 'border-warning-amber/40 bg-warning-amber/8' : 'border-white/8 bg-surface hover:border-white/15'}`}>
                <input
                  type="radio"
                  name="objection"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="mt-0.5 accent-amber-500 shrink-0"
                />
                <div>
                  <div className="text-xs font-bold text-ink">{r.label}</div>
                  <div className="text-[11px] text-muted mt-0.5 leading-relaxed">{r.desc}</div>
                </div>
              </label>
            ))}
          </div>
          <div>
            <div className="text-[11px] font-bold text-muted uppercase tracking-wide mb-1.5">Supporting note (required)</div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Provide specific details to support your objection. Admin will review this before deciding."
              rows={3}
              className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-xs text-ink placeholder-subtle focus:outline-none focus:border-warning-amber resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              disabled={!reason || !note.trim() || submitting}
              onClick={handleObject}
              className="flex-1 bg-warning-amber text-[#080D18] text-xs font-black py-2.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Filing…' : 'File Objection'}
            </button>
            <button
              onClick={() => { setShowForm(false); setReason(''); setNote('') }}
              className="px-4 bg-white/5 border border-white/10 text-muted text-xs font-semibold rounded-xl hover:bg-white/8 transition-all"
            >
              Cancel
            </button>
          </div>
          <p className="text-[10px] text-subtle">All objections require admin review. Unfounded objections are rejected and the assignment stands.</p>
        </div>
      )}
    </div>
  )
}

// ─── Job status badge ─────────────────────────────────────────────────────────

const WORKFLOW_BADGE_CONFIG: Record<string, { cls: string; icon?: React.ReactNode }> = {
  draft:        { cls: 'bg-white/5 text-white/40 border-white/10' },
  submitted:    { cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  under_review: { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  live:         { cls: 'bg-flame/15 text-flame border-flame/30' },
  closed:       { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: <Lock className="w-2.5 h-2.5" /> },
  archived:     { cls: 'bg-white/5 text-white/40 border-white/10' },
}

function StatusBadge({ job }: { job: Pick<JobOpportunityRow, 'status' | 'validationStatus'> }) {
  const workflowState = getJobWorkflowState(job)
  const cfg = WORKFLOW_BADGE_CONFIG[workflowState] ?? { cls: 'bg-white/5 text-white/40 border-white/10' }
  const label = getJobWorkflowLabel(job)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${cfg.cls}`}>
      {cfg.icon}
      {label}
    </span>
  )
}

export default function BuilderDashboard() {
  const { user }  = useAuth()
  const store     = useStore()
  const router    = useRouter()

  // Blueprint Rule #3: only approved builders may access the dashboard
  const [onboardingStatus, setOnboardingStatus] = useState<BuilderOnboardingStatus | null>(null)

  useEffect(() => {
    if (!user) { router.replace('/sign-in?role=builder'); return }
    if (user.role !== 'builder') { router.replace('/'); return }
    getBuilderOnboardingStatusAsync(user.id, user.supabaseId).then(setOnboardingStatus)
  }, [router, user])

  useEffect(() => {
    if (!user || user.role !== 'builder' || onboardingStatus === null) return
    if (onboardingStatus !== 'approved') router.replace('/builder/onboarding')
  }, [user, onboardingStatus, router])

  const [dispatchProject, setDispatchProject]   = useState<Project | null>(null)
  const [isDispatchOpen, setIsDispatchOpen]     = useState(false)
  const [isTrackerOpen, setIsTrackerOpen]       = useState(false)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  // FIX #4: separate loading flag for jobs so the spinner doesn't hang indefinitely
  const [isLoadingJobs, setIsLoadingJobs]       = useState(false)
  const [supabaseProjects, setSupabaseProjects] = useState<Project[] | null>(null)
  const [dbJobs, setDbJobs]                     = useState<JobOpportunityRow[] | null>(null)
  const [completedRecords, setCompletedRecords] = useState<Record<string, { certRef: string; result: string; completedAt: string }>>({})
  const [activeHolds, setActiveHolds]           = useState<HoldRecord[]>([])
  const [holdResponding, setHoldResponding]     = useState<string | null>(null)
  const [holdReviewRequesting, setHoldReviewRequesting] = useState<string | null>(null)
  // FIX #7: per-hold decline notes instead of one shared string
  const [declineNotes, setDeclineNotes]         = useState<Record<string, string>>({})

  // ─── DATA BRIDGE: MATCH LOCAL AUTH ID OR SUPABASE ID ─────────────────────────
  const builderLocalId    = user?.id ?? ''
  const builderSupabaseId = user?.supabaseId ?? ''
  const isMatch = (id: string | undefined) =>
    !!id && (id === builderLocalId || id === builderSupabaseId)

  const storeProjects = store.projects.filter(p => isMatch(p.builderId))
  const builderJobs   = store.jobs.filter(j => isMatch(j.builderId))

  // Fetch projects from Supabase
  useEffect(() => {
    if (!user?.supabaseId) return
    const supabaseId = user.supabaseId
    async function loadProjects() {
      setIsLoadingProjects(true)
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', supabaseId)
        .order('created_at', { ascending: false })

      setIsLoadingProjects(false)
      if (!error && data && data.length > 0) {
        const mapped: Project[] = (data as Record<string, unknown>[]).map((row) => ({
          id:                 row.id as string,
          builderId:          (row.builder_id ?? row.user_id) as string,
          name:               (row.name ?? 'Unnamed Project') as string,
          address:            (row.address ?? '') as string,
          city:               (row.city ?? '') as string,
          permitNumber:       (row.permit_number ?? '') as string,
          currentStage:       (row.current_stage ?? 1) as number,
          status:             (row.status ?? 'pending') as Project['status'],
          stages:             (row.stages as Project['stages']) ?? [],
          photos:             (row.photos as Project['photos']) ?? [],
          gpsCoord:           (row.gps_coord as Project['gpsCoord']) ?? { lat: 0, lng: 0, accuracy: 0, timestamp: '', deviceId: '' },
          createdAt:          (row.created_at ?? '') as string,
          updatedAt:          (row.updated_at ?? '') as string,
          checklistUnlockedAt:(row.checklist_unlocked_at as string | undefined) ?? undefined,
          dispatchTier:       (row.dispatch_tier as Project['dispatchTier']) ?? undefined,
        }))
        setSupabaseProjects(mapped)
      }
    }
    void loadProjects()
  }, [user?.supabaseId])

  // Fetch job_opportunities directly by builder_id
  useEffect(() => {
    const builderSupabaseUserId = user?.supabaseId
    if (!builderSupabaseUserId) return
    async function loadJobs() {
      setIsLoadingJobs(true)
      try {
        const nextJobs = await listJobsByBuilder(builderSupabaseUserId)
        setDbJobs(nextJobs)
      } finally {
        setIsLoadingJobs(false)
      }
    }
    void loadJobs()
  }, [user?.supabaseId])

  // Fetch completed records for any completed jobs
  useEffect(() => {
    const completedIds = (dbJobs ?? []).filter(j => j.status === 'completed').map(j => j.id)
    if (completedIds.length === 0) return
    supabase
      .from('compliance_completed_records')
      .select('job_ref, cert_ref, result, completed_at')
      .in('job_ref', completedIds)
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, { certRef: string; result: string; completedAt: string }> = {}
        for (const row of data as Record<string, string>[]) {
          map[row.job_ref] = { certRef: row.cert_ref, result: row.result, completedAt: row.completed_at }
        }
        setCompletedRecords(map)
      })
  }, [dbJobs])

  // Fetch active holds for builder's on_hold jobs
  useEffect(() => {
    async function loadActiveHolds() {
      const onHoldJobs = (dbJobs ?? []).filter(j => j.status === 'on_hold')
      if (onHoldJobs.length === 0) { setActiveHolds([]); return }
      const results = await Promise.all(onHoldJobs.map(j => listHoldsForJob(j.id)))
      const allHolds = results.flat().filter(h => isHoldOpenStatus(h.status))
      setActiveHolds(allHolds)
    }
    void loadActiveHolds()
  }, [dbJobs])

  // ─── DATA BRIDGE: MAP STANDALONE JOBS TO PROJECTS ARRAY ──────────────────────
  const standaloneJobsAsProjects: Project[] = builderJobs.map(job => {
    let derivedStatus: Project['status'] = 'pending'
    if (['provisionally_assigned', 'confirmed', 'in_progress'].includes(job.status)) {
      derivedStatus = 'in_progress'
    } else if (job.status === 'completed') {
      derivedStatus = 'pass'
    }
    return {
      id:           job.id,
      builderId:    job.builderId ?? '',
      name:         job.projectName || 'Standalone Request',
      address:      job.address,
      city:         job.city,
      permitNumber: job.permitNumber ?? '',
      currentStage: job.stage,
      status:       derivedStatus,
      // FIX #5: include all required Stage fields so the type is satisfied
      stages: [{
        id:          String(job.stage),
        name:        job.stageName,
        stageNumber: job.stage,
        stageName:   job.stageName,
        status:      'pending' as InspectionStatus,
        items:       [],
      }],
      photos:       [],
      gpsCoord:     { lat: 0, lng: 0, accuracy: 0, timestamp: '', deviceId: '' },
      createdAt:    job.requestedAt,
      updatedAt:    job.requestedAt,
      dispatchTier: job.dispatchTier,
    }
  })

  // Map job_opportunities rows to project display format
  const dbJobsAsProjects: Project[] = (dbJobs ?? []).map(job => {
    let derivedStatus: InspectionStatus = 'pending'
    if (['provisionally_assigned', 'confirmed', 'in_progress'].includes(job.status)) {
      derivedStatus = 'in_progress'
    } else if (job.status === 'completed') {
      derivedStatus = 'pass'
    }
    return {
      id:           job.id,
      builderId:    job.builderId,
      name:         job.projectName,
      address:      job.address,
      city:         job.city,
      permitNumber: job.permitNumber ?? '',
      currentStage: job.stage,
      status:       derivedStatus,
      // FIX #5: same required Stage fields here
      stages: [{
        id:          String(job.stage),
        name:        job.stageName,
        stageNumber: job.stage,
        stageName:   job.stageName,
        status:      'pending' as InspectionStatus,
        items:       [],
      }],
      photos:       [],
      gpsCoord:     { lat: 0, lng: 0, accuracy: 0, timestamp: '', deviceId: '' },
      createdAt:    job.requestedAt,
      updatedAt:    job.updatedAt,
      dispatchTier: job.dispatchTier,
    }
  })

  // Combine: Supabase projects table + direct job_opportunities + store fallback
  const projects = [
    ...(supabaseProjects ?? storeProjects),
    ...(dbJobs !== null ? dbJobsAsProjects : standaloneJobsAsProjects),
  ]
  const dailyFlashMode = resolveReportDataMode(Boolean(user?.supabaseId))
  const dailyFlashProjects = dailyFlashMode === 'live'
    ? [
        ...(supabaseProjects ?? []),
        ...(dbJobs !== null ? dbJobsAsProjects : []),
      ]
    : [
        ...storeProjects,
        ...standaloneJobsAsProjects,
      ]

  // FIX #6: wrap confirm() in a try/catch — it throws in some SSR/edge environments
  const handleDeleteProject = async (projectId: string) => {
    try {
      if (!window.confirm('Delete this project?')) return
    } catch {
      return
    }
    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId)
      if (!error) {
        setSupabaseProjects(prev => prev ? prev.filter(p => p.id !== projectId) : prev)
      }
    } catch (err) {
      console.error('Failed to delete project:', err)
    }
  }

  const handleRequestInspection = (project: Project) => {
    setDispatchProject(project)
    setIsDispatchOpen(true)
  }

  const handleNewRequest = () => {
    setDispatchProject(null)
    setIsDispatchOpen(true)
  }

  const handleApproveHold = async (hold: HoldRecord) => {
    setHoldResponding(hold.id)
    const ok = await builderApproveHold(hold.id, 'Approved for on-site correction')
    if (ok) setActiveHolds(prev => prev.filter(h => h.id !== hold.id))
    setHoldResponding(null)
  }

  const handleDeclineHold = async (hold: HoldRecord) => {
    const note = declineNotes[hold.id] ?? ''
    if (!note.trim()) return
    setHoldResponding(hold.id)
    const ok = await builderDeclineHold(hold.id, builderSupabaseId || builderLocalId, note)
    if (ok) {
      setActiveHolds(prev => prev.filter(h => h.id !== hold.id))
      setDeclineNotes(prev => { const next = { ...prev }; delete next[hold.id]; return next })
    }
    setHoldResponding(null)
  }

  const handleRequestReview = async (hold: HoldRecord) => {
    setHoldReviewRequesting(hold.id)
    await requestOnSiteCorrectionReview(
      hold.id,
      builderSupabaseId || builderLocalId,
      'Builder requested on-site correction review.',
    )
    setHoldReviewRequesting(null)
  }

  const handleDispatch = (_dispatchTier: DispatchTier) => {
    // Job creation handled inside DispatchModal via store.addJob()
    void _dispatchTier
  }

  // Active assignment — drives the en-route tracker
  const activeAssignment = store.assignments.find(
    a => isMatch(a.builderId) && (a.status === 'provisional' || a.status === 'confirmed')
  )
  const assignedJob         = activeAssignment ? store.jobs.find(j => j.id === activeAssignment.jobId) : null
  const inProgressProject   = projects.find(p => p.status === 'in_progress')

  const trackerInspectorName    = activeAssignment?.inspectorName    ?? 'Inspector'
  const trackerInspectorLicense = activeAssignment?.inspectorLicense ?? ''
  const trackerProjectName      = assignedJob?.projectName ?? inProgressProject?.name    ?? 'Active Project'
  const trackerProjectAddress   = assignedJob?.address     ?? inProgressProject?.address ?? ''
  const trackerStageName        = assignedJob
    ? `Stage ${assignedJob.stage} · ${assignedJob.stageName}`
    : inProgressProject ? `Stage ${inProgressProject.currentStage}` : ''
  const trackerAvatar = activeAssignment
    ? activeAssignment.inspectorName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'IN'

  const activeCount    = projects.filter(p => p.status !== 'pass' && p.status !== 'completed').length
  const passedThisWeek = projects.filter(p => p.status === 'pass').length
  const activeStages   = projects
    .filter(p => p.status !== 'pass' && p.status !== 'completed')
    .reduce((sum, project) => {
      const openStages = project.stages.filter(stage => stage.status !== 'pass').length
      return sum + Math.max(openStages, 1)
    }, 0)

  // FIX #4: show spinner while either projects OR jobs are loading
  const isLoading = isLoadingProjects || isLoadingJobs

  return (
    <div className="app-theme-scope min-h-screen bg-surface">
      <Navbar role="builder" dark />

      {/* ── Hero dispatch bar ── */}
      <div className="bg-dot bg-dot-sm border-b border-rim px-4 sm:px-6 pt-8 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="label-mono mb-2 font-bold">{user?.company ?? MOCK_BUILDER.companyName}</div>
          <h1 className="mb-5 text-2xl font-extrabold text-ink">
            {user ? `${user.firstName}'s Command Center` : 'Project Command Center'}
          </h1>

          <button
            onClick={handleNewRequest}
            className="group flex w-full items-center gap-4 rounded-2xl border border-rim bg-panel p-5 shadow-card transition-all hover:border-flame/40 hover:glow-flame-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-flame flex items-center justify-center shrink-0 shadow-[0_12px_24px_rgba(245,124,0,0.22)]">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-extrabold text-ink">Post an Inspection Request</div>
              <div className="mt-1 text-xs font-medium text-muted">Start a new request with site details, inspection stage, discipline, and builder availability. Dispatch speed is selected inside the request flow.</div>
            </div>
            <div className="w-9 h-9 bg-flame/10 border border-flame/20 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-flame group-hover:border-flame transition-all">
              <ChevronRight className="w-4 h-4 text-flame group-hover:text-white transition-colors" />
            </div>
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Provisional Assignments ── */}
        {store.assignments
          .filter(a => isMatch(a.builderId) && (a.status === 'provisional' || a.status === 'confirmed' || a.objectionState === 'pending_review'))
          .map(assignment => {
            const job = store.jobs.find(j => j.id === assignment.jobId)
            return (
              <ProvisionalAssignmentPanel
                key={assignment.id}
                assignment={assignment}
                jobName={job?.projectName ?? assignment.jobId}
                onObject={(reason, note) => store.objectAssignment(assignment.id, reason, note)}
              />
            )
          })
        }

        {/* ── Active Hold Notifications ── */}
        {activeHolds.map(hold => {
          const holdJob    = (dbJobs ?? []).find(j => j.id === hold.jobId)
          const holdBaseRate = hold.premiumRateAmount || resolveHoldBaseRate({
            pricingMode: holdJob?.pricingMode,
            specialistRole: holdJob?.specialistRole,
            discipline: holdJob?.requiredDiscipline,
            credentialClass: holdJob?.credentialClass,
            inspectionType: holdJob?.inspectionType,
          }).baseRate
          const holdHours = Math.max(0, hold.estimatedCorrectionMinutes / 60)
          const estimatedHoldCost = calculateHoldCost(holdBaseRate, holdHours)
          const isResponding = holdResponding === hold.id
          const requestingReview = holdReviewRequesting === hold.id
          // FIX #7: each hold gets its own decline note
          const thisDeclineNote = declineNotes[hold.id] ?? ''

          return (
            <div key={hold.id} className="mb-5 rounded-2xl border border-red-500/25 bg-red-500/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-red-500/15">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-red-500/15 border border-red-500/25 rounded-xl flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <div className="font-bold text-ink text-sm mb-0.5">Hold Point Raised</div>
                      <div className="text-xs text-muted">{holdJob?.projectName ?? 'Project'} · Stage {holdJob?.stage ?? ''}</div>
                    </div>
                  </div>
                  <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-2 py-1">
                    <div className="text-[10px] text-red-400 font-bold">Action Required</div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 border-b border-red-500/10">
                <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Inspector&apos;s Hold Reason</div>
                <div className="text-sm text-ink">{hold.reason}</div>
                <div className="mt-2 text-xs text-muted">
                  {hold.affectedItemSummaries.length > 0
                    ? `Affected items: ${hold.affectedItemSummaries.join(' · ')}`
                    : `Affected checklist items: ${hold.checklistItemIds.join(', ')}`}
                </div>
              </div>

              <div className="px-5 py-3 border-b border-red-500/10 flex items-center gap-3">
                <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="text-xs text-muted">
                  Approving this hold authorizes a <span className="text-amber-400 font-bold">${holdBaseRate.toFixed(2)}/hr base rate</span> billed at 1.5× while the inspector remains on site.
                </div>
              </div>

              <div className="px-5 py-3 border-b border-red-500/10 grid gap-2 sm:grid-cols-4">
                <div>
                  <div className="text-[10px] font-bold text-muted uppercase tracking-widest">Estimated Retained Time</div>
                  <div className="text-xs font-semibold text-ink">{hold.estimatedCorrectionMinutes} minutes</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-muted uppercase tracking-widest">Maximum Exposure</div>
                  <div className="text-xs font-semibold text-ink">${hold.holdCapAmount.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-muted uppercase tracking-widest">Estimated Hold Cost</div>
                  <div className="text-xs font-semibold text-ink">${Math.min(hold.holdCapAmount, estimatedHoldCost).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-muted uppercase tracking-widest">Expiry</div>
                  <div className="text-xs font-mono font-bold text-red-400">
                    {new Date(hold.expiresAt).toLocaleTimeString('en-CA', { timeZone: 'America/Vancouver', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveHold(hold)}
                    disabled={isResponding}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 rounded-xl text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isResponding
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <CheckCircle2 className="w-4 h-4" />}
                    Accept Hold & Retain Inspector
                  </button>
                </div>

                <button
                  onClick={() => handleRequestReview(hold)}
                  disabled={requestingReview}
                  className="w-full rounded-xl border border-blue-500/25 bg-blue-500/10 py-2.5 text-xs font-bold text-blue-300 transition-all hover:bg-blue-500/20 disabled:opacity-40"
                >
                  {requestingReview ? 'Sending Request...' : 'Request On-Site Correction Review'}
                </button>

                <div className="flex gap-2">
                  <input
                    value={thisDeclineNote}
                    onChange={e => setDeclineNotes(prev => ({ ...prev, [hold.id]: e.target.value }))}
                    placeholder="Reason for declining (required)..."
                    className="flex-1 bg-surface border border-white/10 rounded-xl px-3 py-2.5 text-xs text-ink placeholder-subtle focus:outline-none focus:border-red-400"
                  />
                  <button
                    onClick={() => handleDeclineHold(hold)}
                    disabled={!thisDeclineNote.trim() || isResponding}
                    className="px-4 bg-red-500/10 border border-red-500/30 text-red-400 font-bold rounded-xl text-xs hover:bg-red-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Decline and Rebook
                  </button>
                </div>
                <p className="text-[10px] text-subtle">Declining stops the inspection. A new booking will be required.</p>
              </div>
            </div>
          )
        })}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: Building2,  label: 'Active Sites',  value: activeCount,    color: 'text-ink' },
            { icon: TrendingUp, label: 'Passed / Week', value: passedThisWeek, color: 'text-success-green' },
            { icon: Clock,      label: 'Active Stages', value: activeStages,   color: 'text-ink' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="card-dark inset-top rounded-2xl border border-rim p-4">
              <div className="flex items-center gap-1.5 label-mono mb-2">
                <Icon className="w-3.5 h-3.5" />{label}
              </div>
              <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* En route — live tracker card */}
        {projects.some(p => p.status === 'in_progress') && (
          <button
            onClick={() => setIsTrackerOpen(true)}
            className="w-full bg-electric/5 border border-electric/25 hover:border-electric/50 hover:bg-electric/8 rounded-2xl p-4 mb-5 flex items-center gap-4 transition-all group text-left"
          >
            <div className="relative w-11 h-11 shrink-0">
              <div className="absolute inset-0 bg-electric/20 rounded-full animate-ping" style={{ animationDuration: '1.8s' }} />
              <div className="relative w-11 h-11 bg-electric/15 border border-electric/30 rounded-full flex items-center justify-center">
                <Navigation className="w-5 h-5 text-electric" style={{ transform: 'rotate(45deg)' }} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-ink text-sm">Inspector En Route</span>
                <div className="flex items-center gap-1 bg-electric/10 border border-electric/20 rounded-md px-1.5 py-0.5">
                  <div className="w-1.5 h-1.5 bg-electric rounded-full animate-pulse" />
                  <span className="text-[9px] font-bold text-electric uppercase tracking-wide">Live</span>
                </div>
              </div>
              <div className="text-xs text-muted">
                {trackerInspectorName}{trackerInspectorLicense ? ` · ${trackerInspectorLicense}` : ''} · {trackerProjectName}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <div className="text-xs text-muted">ETA</div>
                <div className="text-lg font-black text-electric font-mono">8 min</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted group-hover:text-electric transition-colors" />
            </div>
          </button>
        )}

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-extrabold text-ink">Active Projects</span>
          <span className="label-mono">{(dbJobs ?? projects).length} posted</span>
        </div>

        {/* Job status list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-flame/30 border-t-flame rounded-full animate-spin" />
            <span className="ml-3 text-sm font-medium text-muted">Loading projects…</span>
          </div>
        ) : (dbJobs ?? []).length === 0 && projects.length === 0 ? (
          <div className="text-center py-16 card-dark rounded-2xl mb-6">
            <Building2 className="w-10 h-10 text-subtle mx-auto mb-3" />
            <div className="text-sm font-bold text-ink">No projects yet</div>
            <div className="mt-1 text-xs font-medium text-muted">Post your first inspection request to get started</div>
          </div>
        ) : dbJobs !== null ? (
          <div className="space-y-5 mb-6">
            {dbJobs.map(job => {
              const rec = completedRecords[job.id]
              const postedDate = job.requestedAt
                ? new Date(job.requestedAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
                : '—'
              return (
                <div key={job.id} className="card-dark rounded-2xl border border-rim p-4 transition-all hover:border-flame/20">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 truncate text-sm font-extrabold text-ink">{job.projectName}</div>
                      <div className="flex items-center gap-1 text-xs font-medium text-muted">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{job.address}{job.city ? `, ${job.city}` : ''}</span>
                      </div>
                    </div>
                    <StatusBadge job={job} />
                  </div>

                  <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-medium text-muted">
                    <span>Stage {job.stage} · {job.stageName}</span>
                    {job.requiredDiscipline && <span className="capitalize">{job.requiredDiscipline}</span>}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Posted {postedDate}</span>
                  </div>

                  {job.status === 'completed' && (
                    <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-3 py-2.5">
                      <div>
                        <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-0.5">Certificate Reference</div>
                        <div className="font-mono font-black text-emerald-400 text-sm">
                          {rec?.certRef ?? 'Report filed'}
                        </div>
                      </div>
                      <button
                        onClick={() => router.push('/vault')}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        View Report <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-5 mb-6">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} onRequestInspection={handleRequestInspection} onDelete={handleDeleteProject} />
            ))}
          </div>
        )}

        <DailyFlash projects={dailyFlashProjects} dataMode={dailyFlashMode} />
      </main>

      <DispatchModal
        project={dispatchProject}
        isOpen={isDispatchOpen}
        onClose={() => setIsDispatchOpen(false)}
        onDispatch={handleDispatch}
      />

      <EnRouteTracker
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        inspector={{
          name:        trackerInspectorName,
          designation: activeAssignment?.inspectorDisciplines?.[0] ?? '',
          license:     trackerInspectorLicense,
          rating:      4.9,
          completions: 0,
          avatar:      trackerAvatar,
        }}
        project={{
          name:    trackerProjectName,
          address: trackerProjectAddress,
          stage:   trackerStageName,
        }}
        initialEtaMinutes={8}
      />
    </div>
  )
}
