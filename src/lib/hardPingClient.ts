import { createClient } from '@/lib/supabase/client'
import type {
  ActiveHardPing,
  HardPingBackendAction,
  HardPingJobContextRow,
  HardPingResponseRequest,
  HardPingResponseResult,
  HardPingResponseType,
} from '@/lib/hardPingTypes'

const POLL_INTERVAL_MS = 15_000

interface DepartureMonitoringRow {
  id: string
  job_id: string
  assignment_id: string
  inspector_id: string
  status: string
  scheduled_start_at: string | null
  estimated_travel_seconds: number | null
  hard_ping_sent_at: string | null
  hard_ping_response_due_at: string | null
  confidence_status: string | null
  confidence_score: number | null
}

export function normalizeHardPingResponseType(responseType: HardPingResponseType): HardPingBackendAction {
  if (responseType === 'en_route') return 'yes_en_route'
  if (responseType === 'needs_help') return 'need_help'
  return 'cannot_attend'
}

export function buildHardPingResponsePayload(input: HardPingResponseRequest) {
  return {
    assignmentId: input.assignmentId,
    jobId: input.jobId,
    responseType: input.responseType,
    backendAction: normalizeHardPingResponseType(input.responseType),
    reasonCategory: input.reasonCategory,
    details: input.details?.trim() || undefined,
    clientTimestamp: input.clientTimestamp,
  }
}

export function shouldCloseHardPingOverlay(result: HardPingResponseResult): boolean {
  return result.ok === true || result.stale === true || result.hardPingActive === false
}

export function createSingleFlightSubmitter<TInput, TResult>(
  submit: (input: TInput) => Promise<TResult>,
): (input: TInput) => Promise<TResult | null> {
  let pending = false
  return async (input: TInput) => {
    if (pending) return null
    pending = true
    try {
      return await submit(input)
    } finally {
      pending = false
    }
  }
}

function buildSiteAddress(job: HardPingJobContextRow | undefined): string | undefined {
  if (!job) return undefined
  return [job.address, job.city].filter(Boolean).join(', ') || undefined
}

function mapHardPingRow(row: DepartureMonitoringRow, job?: HardPingJobContextRow): ActiveHardPing {
  return {
    id: row.id,
    jobId: row.job_id,
    assignmentId: row.assignment_id,
    inspectorId: row.inspector_id,
    status: 'hard_ping_required',
    projectName: job?.project_name ?? job?.projectName ?? undefined,
    siteAddress: buildSiteAddress(job),
    scheduledStartAt: row.scheduled_start_at ?? undefined,
    currentEtaSeconds: row.estimated_travel_seconds,
    hardPingSentAt: row.hard_ping_sent_at,
    hardPingResponseDueAt: row.hard_ping_response_due_at,
    confidenceStatus: row.confidence_status,
    confidenceScore: row.confidence_score,
  }
}

export async function getActiveHardPingsForInspector(inspectorId: string): Promise<ActiveHardPing[]> {
  if (!inspectorId) return []

  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_departure_monitoring_states')
    .select(
      'id, job_id, assignment_id, inspector_id, status, scheduled_start_at, estimated_travel_seconds, hard_ping_sent_at, hard_ping_response_due_at, confidence_status, confidence_score',
    )
    .eq('inspector_id', inspectorId)
    .eq('status', 'hard_ping_required')
    .order('scheduled_start_at', { ascending: true })

  if (error || !data) return []

  const rows = data as DepartureMonitoringRow[]
  const jobIds = [...new Set(rows.map(row => row.job_id))]
  let jobsById = new Map<string, HardPingJobContextRow>()

  if (jobIds.length > 0) {
    const { data: jobs } = await supabase
      .from('job_opportunities')
      .select('id, project_name, address, city')
      .in('id', jobIds)

    jobsById = new Map(
      ((jobs ?? []) as HardPingJobContextRow[]).map(job => [job.id, job]),
    )
  }

  return rows.map(row => mapHardPingRow(row, jobsById.get(row.job_id)))
}

export async function getActiveHardPingForInspector(inspectorId: string): Promise<ActiveHardPing | null> {
  const hardPings = await getActiveHardPingsForInspector(inspectorId)
  return hardPings[0] ?? null
}

export async function respondToHardPing(input: HardPingResponseRequest): Promise<HardPingResponseResult> {
  const response = await fetch('/api/jobs/departure-hard-ping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildHardPingResponsePayload(input)),
  })

  const payload = await response.json().catch(() => ({})) as HardPingResponseResult
  if (!response.ok) {
    return {
      ok: false,
      stale: payload.stale,
      hardPingActive: payload.hardPingActive,
      error: payload.error ?? 'Unable to submit hard ping response.',
    }
  }

  return payload
}

export function subscribeToHardPingState(
  inspectorId: string,
  onChange: (hardPing: ActiveHardPing | null) => void,
  onError?: (error: Error) => void,
): () => void {
  if (typeof window === 'undefined' || !inspectorId) return () => {}

  let active = true
  let timer: number | null = null

  const poll = async () => {
    try {
      const hardPing = await getActiveHardPingForInspector(inspectorId)
      if (active) onChange(hardPing)
    } catch (error) {
      if (active) onError?.(error instanceof Error ? error : new Error('Could not refresh hard ping state.'))
    }
  }

  void poll()
  timer = window.setInterval(poll, POLL_INTERVAL_MS)

  return () => {
    active = false
    if (timer) window.clearInterval(timer)
  }
}
