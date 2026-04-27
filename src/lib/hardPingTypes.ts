export type HardPingResponseType = 'en_route' | 'needs_help' | 'cannot_attend'

export type HardPingBackendAction = 'yes_en_route' | 'need_help' | 'cannot_attend'

export type HardPingIssueReason =
  | 'vehicle_issue'
  | 'weather_road_closure'
  | 'safety_concern'
  | 'builder_access_issue'
  | 'emergency'
  | 'app_gps_issue'
  | 'other'

export type HardPingStatus = 'hard_ping_required'

export interface ActiveHardPing {
  id: string
  jobId: string
  assignmentId: string
  inspectorId: string
  status: HardPingStatus
  projectName?: string
  siteAddress?: string
  scheduledStartAt?: string
  currentEtaSeconds?: number | null
  hardPingSentAt?: string | null
  hardPingResponseDueAt?: string | null
  confidenceStatus?: string | null
  confidenceScore?: number | null
}

export interface HardPingResponseRequest {
  assignmentId: string
  jobId?: string
  responseType: HardPingResponseType
  reasonCategory?: HardPingIssueReason
  details?: string
  clientTimestamp: string
}

export interface HardPingResponseResult {
  ok: boolean
  stale?: boolean
  hardPingActive?: boolean
  beginReassignment?: boolean
  updatedEtaSeconds?: number | null
  message?: string
  error?: string
}

export interface HardPingJobContextRow {
  id: string
  project_name?: string | null
  projectName?: string | null
  address?: string | null
  city?: string | null
}

