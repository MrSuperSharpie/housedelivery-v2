'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileCheck } from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'
import { createClient } from '@/lib/supabase/client'
import { listFieldGeoAnomalies } from '@/lib/supabase/inspectorCompletion'

const supabase = createClient()

interface SubmissionRow {
  id: string
  jobRef: string | null
  permitNumber: string | null
  projectName: string
  address: string
  stage: number
  stageName: string
  discipline: string | null
  result: string
  sealed: boolean
  completedAt: string
  anomalyCount: number
  anomalyState: string
}

function rowToSubmission(row: Record<string, unknown>): SubmissionRow {
  return {
    id: row.id as string,
    jobRef: typeof row.job_ref === 'string' ? row.job_ref : null,
    permitNumber: typeof row.permit_number === 'string' ? row.permit_number : null,
    projectName: typeof row.project_name === 'string' ? row.project_name : 'Untitled project',
    address: typeof row.address === 'string' ? row.address : '—',
    stage: typeof row.stage === 'number' ? row.stage : 0,
    stageName: typeof row.stage_name === 'string' ? row.stage_name : '—',
    discipline: typeof row.discipline === 'string' ? row.discipline : null,
    result: typeof row.result === 'string' ? row.result : 'unknown',
    sealed: row.sealed === true,
    completedAt: typeof row.completed_at === 'string' ? row.completed_at : '',
    anomalyCount: 0,
    anomalyState: 'clear',
  }
}

function formatCompletedAt(value: string) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function resultClasses(result: string) {
  if (result === 'pass') return 'bg-success-green/15 text-success-green'
  if (result === 'fail') return 'bg-fail-red/15 text-fail-red'
  return 'bg-white/8 text-muted'
}

export default function AdminSubmissionsPage() {
  const [rows, setRows] = useState<SubmissionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchRows() {
      setLoading(true)

      const { data, error } = await supabase
        .from('compliance_completed_records')
        .select('*')
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (error) {
        console.error('[AdminSubmissionsPage] Failed to fetch submissions', error)
        setRows([])
        setLoading(false)
        return
      }

      const mapped = ((data ?? []) as Record<string, unknown>[]).map(rowToSubmission)
      const anomalies = await listFieldGeoAnomalies()
      const countsByJob = new Map<string, number>()
      for (const anomaly of anomalies) {
        countsByJob.set(anomaly.jobId, (countsByJob.get(anomaly.jobId) ?? 0) + 1)
      }

      setRows(mapped.map(row => ({
        ...row,
        anomalyCount: row.jobRef ? (countsByJob.get(row.jobRef) ?? 0) : 0,
        anomalyState: row.jobRef && (countsByJob.get(row.jobRef) ?? 0) > 0 ? 'review' : 'clear',
      })))
      setLoading(false)
    }

    void fetchRows()

    return () => {
      cancelled = true
    }
  }, [])

  const createGoldenRecord = async () => {
    alert('Disabled for security — will be moved to server-side')
  }

  return (
    <AdminShell
      title="Submission Review"
      subtitle="Seal verification, deficiency check, and admin approval"
    >
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={createGoldenRecord}
          className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 transition-colors hover:bg-amber-500/20"
        >
          <span aria-hidden="true">⚙</span>
          DEBUG: Create Golden PDF Record
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-flame/30 border-t-flame" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-24">
          <FileCheck className="h-8 w-8 text-muted opacity-30" />
          <p className="text-sm text-muted">No submissions found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="whitespace-nowrap py-2 pr-4 font-semibold text-muted">Permit No.</th>
                <th className="py-2 pr-4 font-semibold text-muted">Project</th>
                <th className="py-2 pr-4 font-semibold text-muted">Address</th>
                <th className="py-2 pr-4 font-semibold text-muted">Stage</th>
                <th className="py-2 pr-4 font-semibold text-muted">Discipline</th>
                <th className="py-2 pr-4 font-semibold text-muted">Result</th>
                <th className="py-2 pr-4 font-semibold text-muted">Sealed</th>
                <th className="py-2 pr-4 font-semibold text-muted">Anomalies</th>
                <th className="whitespace-nowrap py-2 pr-4 font-semibold text-muted">Completed At</th>
                <th className="py-2 font-semibold text-muted" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/5 transition-colors hover:bg-white/2"
                >
                  <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-ink">
                    {row.permitNumber ?? '—'}
                  </td>
                  <td className="max-w-[180px] truncate py-2.5 pr-4 text-ink">
                    {row.projectName}
                  </td>
                  <td className="max-w-[180px] truncate py-2.5 pr-4 text-muted">
                    {row.address}
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-4 text-muted">
                    {row.stage} · {row.stageName}
                  </td>
                  <td className="py-2.5 pr-4 text-muted">{row.discipline ?? '—'}</td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${resultClasses(row.result)}`}
                    >
                      {row.result.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        row.sealed ? 'bg-electric/15 text-electric' : 'bg-white/8 text-muted'
                      }`}
                    >
                      {row.sealed ? 'SEALED' : 'OPEN'}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      row.anomalyCount > 0 ? 'bg-warning-amber/15 text-warning-amber' : 'bg-success-green/15 text-success-green'
                    }`}>
                      {row.anomalyCount > 0 ? `${row.anomalyCount} REVIEW` : 'CLEAR'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-4 text-xs text-muted">
                    {formatCompletedAt(row.completedAt)}
                  </td>
                  <td className="py-2.5">
                    <Link
                      href={`/vault/package-preview?id=${row.id}`}
                      className="whitespace-nowrap text-xs font-bold text-flame hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  )
}
