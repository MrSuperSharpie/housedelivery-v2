'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, CheckCircle2, ChevronRight, Clock, FileCheck2, Loader2, MapPin, ShieldCheck } from 'lucide-react'
import { Navbar } from '@/components/shared/Navbar'
import { useAuth } from '@/lib/auth'
import { DEV_PREVIEW_ASSIGNMENT, DEV_PREVIEW_JOB, isInspectorDevPreviewAssignment } from '@/lib/inspectorDevPreview'
import { createClient } from '@/lib/supabase/client'
import type { JobTimeSlot } from '@/lib/types'

const supabase = createClient()

interface AssignmentDetail {
  id: string
  jobId: string
  status: string
  assignedAt: string
  objectionWindowClosesAt?: string
  claimedSlot?: JobTimeSlot
}

interface JobDetail {
  id: string
  projectName: string
  address: string
  city: string
  stageName: string
  dispatchTier: string
  builderName?: string
}

function parseClaimedSlot(value: unknown): JobTimeSlot | undefined {
  if (!value || typeof value !== 'object') return undefined
  const slot = value as Record<string, unknown>

  if (slot.flexible === true) {
    return { date: '', startTime: '', endTime: '', flexible: true }
  }

  if (typeof slot.date !== 'string' || typeof slot.startTime !== 'string' || typeof slot.endTime !== 'string') {
    return undefined
  }

  return {
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    flexible: slot.flexible === true,
  }
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-CA', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return `${hours % 12 || 12}:${minutes.toString().padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`
}

function formatClaimedSlot(slot?: JobTimeSlot): { title: string; detail: string } {
  if (!slot || slot.flexible) {
    return {
      title: 'Flexible timing',
      detail: 'Builder left timing open, so you claimed the job without a fixed slot.',
    }
  }

  return {
    title: formatDate(slot.date),
    detail: `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`,
  }
}

function objectionWindowLabel(tier?: string): string {
  if (tier === 'emergency') return '30-minute objection window'
  if (tier === 'priority') return '1-hour objection window'
  return '24-hour objection window'
}

export default function InspectorAssignmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const assignmentId = params.assignmentId as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null)
  const [job, setJob] = useState<JobDetail | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const previewMode = isInspectorDevPreviewAssignment(assignmentId)

  useEffect(() => {
    if (!user) {
      router.replace('/sign-in?role=inspector')
      return
    }
    if (user.role !== 'inspector') {
      router.replace('/')
      return
    }
  }, [router, user])

  useEffect(() => {
    if (!assignmentId || !user) return

    async function loadAssignment() {
      setLoading(true)
      setError(null)

      if (previewMode) {
        setAssignment({
          id: DEV_PREVIEW_ASSIGNMENT.id,
          jobId: DEV_PREVIEW_ASSIGNMENT.jobId,
          status: DEV_PREVIEW_ASSIGNMENT.status,
          assignedAt: DEV_PREVIEW_ASSIGNMENT.assignedAt,
          objectionWindowClosesAt: DEV_PREVIEW_ASSIGNMENT.objectionWindowClosesAt,
          claimedSlot: DEV_PREVIEW_ASSIGNMENT.claimedSlot,
        })
        setJob({
          id: DEV_PREVIEW_JOB.id,
          projectName: DEV_PREVIEW_JOB.projectName,
          address: DEV_PREVIEW_JOB.address,
          city: DEV_PREVIEW_JOB.city,
          stageName: DEV_PREVIEW_JOB.stageName,
          dispatchTier: DEV_PREVIEW_JOB.dispatchTier,
          builderName: DEV_PREVIEW_JOB.builderName,
        })
        setLoading(false)
        return
      }

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('job_assignments')
        .select('id, job_id, status, assigned_at, objection_window_closes_at, claimed_slot')
        .eq('id', assignmentId)
        .maybeSingle()

      if (assignmentError || !assignmentData) {
        setError('Assignment not found.')
        setLoading(false)
        return
      }

      const assignmentRow: AssignmentDetail = {
        id: assignmentData.id as string,
        jobId: assignmentData.job_id as string,
        status: (assignmentData.status as string) ?? 'provisional',
        assignedAt: (assignmentData.assigned_at as string) ?? new Date().toISOString(),
        objectionWindowClosesAt: (assignmentData.objection_window_closes_at as string) ?? undefined,
        claimedSlot: parseClaimedSlot(assignmentData.claimed_slot),
      }
      setAssignment(assignmentRow)

      const { data: jobData, error: jobError } = await supabase
        .from('job_opportunities')
        .select('id, project_name, address, city, stage_name, dispatch_tier, builder_name')
        .eq('id', assignmentRow.jobId)
        .maybeSingle()

      if (jobError || !jobData) {
        setError('Assigned job not found.')
        setLoading(false)
        return
      }

      setJob({
        id: jobData.id as string,
        projectName: jobData.project_name as string,
        address: jobData.address as string,
        city: (jobData.city as string) ?? 'Vancouver',
        stageName: (jobData.stage_name as string) ?? 'Inspection',
        dispatchTier: (jobData.dispatch_tier as string) ?? 'standard',
        builderName: (jobData.builder_name as string) ?? undefined,
      })

      setLoading(false)
    }

    void loadAssignment()
  }, [assignmentId, previewMode, user])

  useEffect(() => {
    if (!assignment?.objectionWindowClosesAt) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [assignment?.objectionWindowClosesAt])

  const countdown = assignment?.objectionWindowClosesAt
    ? (() => {
        const remainingMs = Math.max(0, new Date(assignment.objectionWindowClosesAt).getTime() - now)
        const hours = Math.floor(remainingMs / 3600000)
        const minutes = Math.floor((remainingMs % 3600000) / 60000)
        const seconds = Math.floor((remainingMs % 60000) / 1000)
        return { remainingMs, hours, minutes, seconds }
      })()
    : null

  if (loading) {
    return (
      <div className="app-theme-scope min-h-screen bg-surface">
        <Navbar role="inspector" dark />
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-flame" />
        </div>
      </div>
    )
  }

  if (error || !assignment || !job) {
    return (
      <div className="app-theme-scope min-h-screen bg-surface">
        <Navbar role="inspector" dark />
        <main className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-100">
            <div className="text-lg font-black">Assignment unavailable</div>
            <p className="mt-2 text-sm text-red-100/80">{error ?? 'The provisional assignment could not be loaded.'}</p>
            <Link href="/inspector" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to Live Board
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const slotSummary = formatClaimedSlot(assignment.claimedSlot)
  const provisional = assignment.status === 'provisional'

  return (
    <div className="app-theme-scope min-h-screen bg-surface">
      <Navbar role="inspector" dark />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/inspector" className="mb-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-subtle hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          Back to Live Board
        </Link>

        <div className="rounded-[28px] border border-electric/20 bg-panel p-6 shadow-card">
          {previewMode && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-200">
              Dev Preview Only
            </div>
          )}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-electric">
                <ShieldCheck className="h-3.5 w-3.5" />
                {provisional ? 'Provisional Assignment' : 'Assignment Ready'}
              </div>
              <h1 className="text-2xl font-black text-ink">{job.projectName}</h1>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{job.address}, {job.city}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted">
                <FileCheck2 className="h-4 w-4 shrink-0" />
                <span>{job.stageName}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-surface px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-subtle">Builder Objection Window</div>
              <div className="mt-1 text-base font-black text-ink">{objectionWindowLabel(job.dispatchTier)}</div>
              <div className="mt-1 text-xs text-muted">
                {countdown
                  ? countdown.remainingMs > 0
                    ? `${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s remaining`
                    : 'Window closed'
                  : 'Countdown unavailable'}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-surface p-4">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-subtle">
                <Calendar className="h-3.5 w-3.5" />
                Claimed Timing
              </div>
              <div className="text-lg font-black text-ink">{slotSummary.title}</div>
              <div className="mt-1 text-sm text-muted">{slotSummary.detail}</div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-surface p-4">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-subtle">
                <Clock className="h-3.5 w-3.5" />
                Assignment Status
              </div>
              <div className="text-lg font-black text-ink">{provisional ? 'Provisional' : assignment.status}</div>
              <div className="mt-1 text-sm text-muted">
                {provisional
                  ? `${job.builderName ?? 'The builder'} can only raise a governed objection during this window.`
                  : 'This assignment has moved past the provisional claim step.'}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/8 bg-surface p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-subtle">Next Action</div>
            <div className="mt-2 text-sm text-muted">
              Review the assignment details now. When you are ready to work the job, move into the completion workspace from here instead of being dropped into it automatically.
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/inspector/completion/${assignment.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-flame px-5 py-3 text-sm font-black text-white transition-all hover:bg-flame-light"
              >
                Open Completion Workspace
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                href="/inspector"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-surface px-5 py-3 text-sm font-bold text-ink transition-all hover:bg-raised"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span>
              You have successfully claimed this inspection, but the assignment is currently provisional. To ensure fair dispatch, builders cannot hand-pick inspectors, but they do have a brief window to submit a formal objection before your assignment is finalized.
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
