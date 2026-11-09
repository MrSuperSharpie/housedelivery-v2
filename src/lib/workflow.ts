import type { GovernanceValidationStatus } from '@/lib/governance'
import type { InspectionJob } from '@/lib/types'
import type { JobOpportunityRow, JobStatus } from '@/lib/supabase/jobs'

/**
 * Canonical app-level workflow meanings.
 *
 * This helper intentionally keeps `job.stage` separate:
 * - `stage` = inspection / construction phase number
 * - workflow state = lifecycle derived from job status + validation status
 *
 * Intended mapping:
 * - draft: not meaningfully submitted into governed flow yet
 * - submitted: submitted but not yet reviewed to a blocking outcome
 * - under_review: explicitly blocked or sent back for review
 * - live: operationally active / dispatchable / currently in-flight
 * - closed: completed or otherwise terminal without archival/cancellation
 * - archived: cancelled / archived terminal state
 */

export type JobWorkflowState =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'live'
  | 'closed'
  | 'archived'

type JobWorkflowInput = Pick<InspectionJob, 'status'> &
  Partial<Pick<JobOpportunityRow, 'validationStatus'>> & {
    validation_status?: GovernanceValidationStatus | string | null
    status?: InspectionJob['status'] | JobStatus | string | null
  }

const ACTIVE_JOB_STATUSES = new Set([
  'live',
  'provisionally_assigned',
  'confirmed',
  'in_progress',
  'on_hold',
])

const CLOSED_JOB_STATUSES = new Set([
  'completed',
  'stopped',
  'disputed',
  'closed',
])

const ARCHIVED_JOB_STATUSES = new Set([
  'cancelled',
  'archived',
])

const SUBMITTED_JOB_STATUSES = new Set([
  'pending_validation',
  'submitted',
])

const REVIEW_JOB_STATUSES = new Set([
  'under_review',
  'needs_info',
  'blocked',
])

export const JOB_WORKFLOW_LABELS: Record<JobWorkflowState, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  live: 'Live',
  closed: 'Closed',
  archived: 'Archived',
}

function normalizeToken(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_')
  return normalized || undefined
}

function getNormalizedValidationStatus(
  job: Partial<JobWorkflowInput>,
): GovernanceValidationStatus | 'blocked' | undefined {
  const normalized = normalizeToken(
    typeof job.validationStatus === 'string'
      ? job.validationStatus
      : typeof job.validation_status === 'string'
        ? job.validation_status
        : undefined,
  )

  if (normalized === 'validated') return 'validated'
  if (normalized === 'blocked') return 'blocked'
  return undefined
}

export function getJobWorkflowState(job: Partial<JobWorkflowInput>): JobWorkflowState {
  const status = normalizeToken(job.status)
  const validationStatus = getNormalizedValidationStatus(job)

  if (!status) {
    if (validationStatus === 'blocked') return 'under_review'
    return 'draft'
  }

  if (ARCHIVED_JOB_STATUSES.has(status)) return 'archived'
  if (CLOSED_JOB_STATUSES.has(status)) return 'closed'
  if (ACTIVE_JOB_STATUSES.has(status)) return 'live'
  if (REVIEW_JOB_STATUSES.has(status)) return 'under_review'

  if (SUBMITTED_JOB_STATUSES.has(status)) {
    return validationStatus === 'blocked' ? 'under_review' : 'submitted'
  }

  if (validationStatus === 'blocked') return 'under_review'

  return 'draft'
}

export function getJobWorkflowLabel(job: Partial<JobWorkflowInput>): string {
  return JOB_WORKFLOW_LABELS[getJobWorkflowState(job)]
}

export function isJobLive(job: Partial<JobWorkflowInput>): boolean {
  return getJobWorkflowState(job) === 'live'
}

export function isJobPendingReview(job: Partial<JobWorkflowInput>): boolean {
  const state = getJobWorkflowState(job)
  return state === 'submitted' || state === 'under_review'
}

export function isJobClosed(job: Partial<JobWorkflowInput>): boolean {
  const state = getJobWorkflowState(job)
  return state === 'closed' || state === 'archived'
}
