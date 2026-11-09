import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminLikeRole, resolveUserRoleFromMetadata } from '@/lib/adminAccess'
import {
  BUILDER_TRIAGE_COPY,
  INSPECTOR_TRIAGE_COPY,
  deriveDepartureTicketState,
  deriveRiskLevel,
  isActiveDepartureAssignmentStatus,
  isTerminalDepartureJobStatus,
  labelDepartureReason,
  sortDepartureInterventionTickets,
  validateDepartureResolution,
  type DepartureInterventionAction,
  type DepartureInterventionResolutionInput,
  type DepartureInterventionTicket,
  type DepartureTriageStandbyCandidate,
  type DepartureTriageTimelineItem,
} from '@/lib/adminDepartureTriage'

interface MonitoringStateRow {
  id: string
  job_id: string
  assignment_id: string
  inspector_id: string
  builder_id: string | null
  status: string
  confidence_status: string | null
  confidence_score: number | null
  scheduled_start_at: string
  required_departure_at: string | null
  estimated_travel_seconds: number | null
  hard_ping_sent_at: string | null
  hard_ping_response_due_at: string | null
  hard_ping_responded_at: string | null
  hard_ping_response: string | null
  protected_issue_submitted: boolean | null
  protected_issue_reason: string | null
  audit_trail: unknown
  metadata: Record<string, unknown> | null
  updated_at: string
}

interface JobRow {
  id: string
  project_name?: string | null
  address?: string | null
  city?: string | null
  inspection_type?: string | null
  project_type?: string | null
  escrow_status?: string | null
  status?: string | null
}

interface AssignmentRow {
  id: string
  job_id: string
  status: string | null
}

interface StandbyInviteRow {
  id: string
  job_id: string
  original_assignment_id: string | null
  inspector_id: string
  status: DepartureTriageStandbyCandidate['status']
  candidate_rank?: number | null
  priority_rank?: number | null
  expires_at?: string | null
  offered_at?: string | null
  accepted_at?: string | null
  rush_multiplier_offered?: number | null
  metadata?: Record<string, unknown> | null
}

interface ProfileRow {
  id: string
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  firm_name?: string | null
  email?: string | null
  phone?: string | null
}

interface NotificationRow {
  event_key: string
  recipient_role?: string | null
  status?: string | null
  payload?: Record<string, unknown> | null
  created_at?: string | null
}

interface ResolutionBody extends DepartureInterventionResolutionInput {
  ticketId?: string
  assignmentId?: string
}

function profileName(profile: ProfileRow | undefined, fallback: string) {
  if (!profile) return fallback
  if (profile.full_name?.trim()) return profile.full_name
  const joined = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()
  if (joined) return joined
  if (profile.firm_name?.trim()) return profile.firm_name
  return fallback
}

function metadataValue(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = metadata?.[key]
  return typeof value === 'string' ? value : null
}

function auditTimelineFromState(row: MonitoringStateRow): DepartureTriageTimelineItem[] {
  const items: DepartureTriageTimelineItem[] = []
  if (row.hard_ping_sent_at) items.push({ at: row.hard_ping_sent_at, label: 'Hard ping sent', actor: 'system' })
  if (row.hard_ping_responded_at) items.push({ at: row.hard_ping_responded_at, label: `Inspector responded: ${row.hard_ping_response ?? 'response recorded'}`, actor: 'inspector' })

  if (Array.isArray(row.audit_trail)) {
    for (const entry of row.audit_trail.slice(-6)) {
      if (entry && typeof entry === 'object') {
        const event = entry as Record<string, unknown>
        const at = typeof event.at === 'string' ? event.at : null
        const label = typeof event.event === 'string'
          ? event.event
          : typeof event.action === 'string'
            ? event.action
            : null
        if (at && label) items.push({ at, label, actor: typeof event.actorRole === 'string' ? event.actorRole : undefined })
      }
    }
  }

  return items.sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime())
}

function builderNotificationStatus(notifications: NotificationRow[], jobId: string): DepartureInterventionTicket['builderNotificationStatus'] {
  const builderNotifications = notifications.filter(notification => {
    const payloadJobId = notification.payload?.jobId
    return notification.recipient_role === 'builder' && payloadJobId === jobId
  })
  if (builderNotifications.length === 0) return 'not_sent'
  if (builderNotifications.some(notification => notification.status === 'failed')) return 'failed'
  if (builderNotifications.some(notification => notification.status === 'sent')) return 'sent'
  if (builderNotifications.some(notification => notification.status === 'queued')) return 'queued'
  return 'unknown'
}

function etaGapMinutes(row: MonitoringStateRow) {
  if (!row.estimated_travel_seconds || !row.scheduled_start_at) return null
  const etaArrival = Date.now() + row.estimated_travel_seconds * 1000
  const scheduled = new Date(row.scheduled_start_at).getTime()
  return Math.round((etaArrival - scheduled) / 60_000)
}

function buildTicket(params: {
  row: MonitoringStateRow
  job?: JobRow
  inspector?: ProfileRow
  builder?: ProfileRow
  standbyCandidates: DepartureTriageStandbyCandidate[]
  notifications: NotificationRow[]
  now: Date
}): DepartureInterventionTicket {
  const state = deriveDepartureTicketState({
    status: params.row.status,
    hardPingResponse: params.row.hard_ping_response,
    hardPingResponseDueAt: params.row.hard_ping_response_due_at,
    protectedIssueSubmitted: params.row.protected_issue_submitted,
    triageState: metadataValue(params.row.metadata, 'triageState'),
  }, params.now)
  const reasonCategory = params.row.protected_issue_reason
    ?? metadataValue(params.row.metadata, 'reasonCategory')
    ?? (state === 'no_response' ? 'unreachable' : state === 'hard_ping_required' ? 'pending' : null)
  const draft = {
    state,
    scheduledStartAt: params.row.scheduled_start_at,
    standbyCandidates: params.standbyCandidates,
  }

  return {
    id: params.row.id,
    jobId: params.row.job_id,
    assignmentId: params.row.assignment_id,
    inspectorId: params.row.inspector_id,
    builderId: params.row.builder_id,
    state,
    riskLevel: deriveRiskLevel(draft, params.now),
    scheduledStartAt: params.row.scheduled_start_at,
    requiredDepartureAt: params.row.required_departure_at,
    responseTimestamp: params.row.hard_ping_responded_at,
    currentEtaSeconds: params.row.estimated_travel_seconds,
    etaGapMinutes: etaGapMinutes(params.row),
    projectName: params.job?.project_name ?? 'Assigned inspection',
    inspectionType: params.job?.inspection_type ?? params.job?.project_type ?? null,
    siteAddress: [params.job?.address, params.job?.city].filter(Boolean).join(', ') || null,
    inspectorName: profileName(params.inspector, 'Assigned inspector'),
    inspectorEmail: params.inspector?.email ?? null,
    inspectorPhone: params.inspector?.phone ?? null,
    builderName: profileName(params.builder, 'Builder'),
    builderEmail: params.builder?.email ?? null,
    builderPhone: params.builder?.phone ?? null,
    reasonCategory: reasonCategory as DepartureInterventionTicket['reasonCategory'],
    reasonLabel: labelDepartureReason(reasonCategory as DepartureInterventionTicket['reasonCategory']),
    inspectorDetails: metadataValue(params.row.metadata, 'details'),
    standbyStatus: params.standbyCandidates.length === 0
      ? 'No standby identified'
      : params.standbyCandidates.some(candidate => candidate.status === 'accepted')
        ? 'Standby accepted'
        : params.standbyCandidates.some(candidate => candidate.status === 'offered')
          ? 'Offers sent'
          : 'Standby identified',
    standbyCandidates: params.standbyCandidates,
    builderNotificationStatus: builderNotificationStatus(params.notifications, params.row.job_id),
    escrowProtected: params.job?.escrow_status !== 'released',
    lastMonitoringStatus: params.row.confidence_status ?? params.row.status,
    auditTimeline: auditTimelineFromState(params.row),
  }
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const role = resolveUserRoleFromMetadata(authData.user)
  if (!authData.user || !isAdminLikeRole(role)) {
    return { supabase, userId: null, authorized: false }
  }
  return { supabase, userId: authData.user.id, authorized: true }
}

export async function GET() {
  const { supabase, authorized } = await requireAdmin()
  if (!authorized) return NextResponse.json({ ok: false, error: 'Admin role required.' }, { status: 403 })

  const now = new Date()
  const { data: stateData, error: stateError } = await supabase
    .from('job_departure_monitoring_states')
    .select('id, job_id, assignment_id, inspector_id, builder_id, status, confidence_status, confidence_score, scheduled_start_at, required_departure_at, estimated_travel_seconds, hard_ping_sent_at, hard_ping_response_due_at, hard_ping_responded_at, hard_ping_response, protected_issue_submitted, protected_issue_reason, audit_trail, metadata, updated_at')
    .in('status', ['hard_ping_required', 'reassignment_pending', 'en_route_confirmed'])
    .order('scheduled_start_at', { ascending: true })

  if (stateError) {
    console.error('[admin/departure-interventions] state fetch failed', stateError.message)
    return NextResponse.json({ ok: false, error: stateError.message }, { status: 500 })
  }

  const rows = ((stateData ?? []) as unknown as MonitoringStateRow[])
    .filter(row => {
      const triageState = metadataValue(row.metadata, 'triageState')
      const triageResolvedAt = metadataValue(row.metadata, 'triageResolvedAt')
      if (triageResolvedAt && triageState !== 'manual_recovery_required') return false
      return row.status === 'hard_ping_required'
        || row.status === 'reassignment_pending'
        || triageState === 'manual_recovery_required'
    })

  if (rows.length === 0) return NextResponse.json({ ok: true, tickets: [] })

  const jobIds = [...new Set(rows.map(row => row.job_id))]
  const assignmentIds = [...new Set(rows.map(row => row.assignment_id))]
  const profileIds = [...new Set(rows.flatMap(row => [row.inspector_id, row.builder_id]).filter((id): id is string => Boolean(id)))]

  const [{ data: jobs }, { data: standby }, { data: profiles }, { data: notifications }] = await Promise.all([
    supabase.from('job_opportunities').select('id, project_name, address, city, inspection_type, project_type, escrow_status, status').in('id', jobIds),
    supabase.from('standby_inspector_invites').select('id, job_id, original_assignment_id, inspector_id, status, candidate_rank, priority_rank, expires_at, offered_at, accepted_at, rush_multiplier_offered, metadata').in('original_assignment_id', assignmentIds),
    supabase.from('profiles').select('id, full_name, first_name, last_name, firm_name, email, phone').in('id', profileIds),
    supabase.from('notification_events').select('event_key, recipient_role, status, payload, created_at').in('payload->>jobId', jobIds),
  ])

  const profilesById = new Map(((profiles ?? []) as unknown as ProfileRow[]).map(profile => [profile.id, profile]))
  const jobsById = new Map(((jobs ?? []) as unknown as JobRow[]).map(job => [job.id, job]))
  const notificationsRows = (notifications ?? []) as unknown as NotificationRow[]
  const standbyRows = (standby ?? []) as unknown as StandbyInviteRow[]

  const standbyByAssignment = new Map<string, DepartureTriageStandbyCandidate[]>()
  for (const invite of standbyRows) {
    if (!invite.original_assignment_id) continue
    const candidateProfile = profilesById.get(invite.inspector_id)
    const candidate: DepartureTriageStandbyCandidate = {
      id: invite.id,
      inspectorId: invite.inspector_id,
      inspectorName: profileName(candidateProfile, 'Standby inspector'),
      rank: invite.candidate_rank ?? invite.priority_rank ?? 100,
      status: invite.status,
      expiresAt: invite.expires_at,
      offeredAt: invite.offered_at,
      acceptedAt: invite.accepted_at,
      rushMultiplierOffered: invite.rush_multiplier_offered,
      credentialMatch: invite.metadata?.credentialMatch === true || invite.metadata?.credential_match === true,
      regionMatch: invite.metadata?.regionMatch === true || invite.metadata?.region_match === true,
      estimatedArrivalAt: metadataValue(invite.metadata, 'estimatedArrivalAt'),
    }
    standbyByAssignment.set(invite.original_assignment_id, [
      ...(standbyByAssignment.get(invite.original_assignment_id) ?? []),
      candidate,
    ].sort((left, right) => left.rank - right.rank))
  }

  const tickets = rows.map(row => buildTicket({
    row,
    job: jobsById.get(row.job_id),
    inspector: profilesById.get(row.inspector_id),
    builder: row.builder_id ? profilesById.get(row.builder_id) : undefined,
    standbyCandidates: standbyByAssignment.get(row.assignment_id) ?? [],
    notifications: notificationsRows,
    now,
  }))

  return NextResponse.json({ ok: true, tickets: sortDepartureInterventionTickets(tickets, now) })
}

function notificationRowsForResolution(params: {
  action: DepartureInterventionAction
  ticket: MonitoringStateRow
  now: string
  builderCopy: string
  inspectorCopy: string
}) {
  return [
    {
      event_key: `builder.departure_triage.${params.action}`,
      dedupe_key: `builder-departure-triage-${params.action}:${params.ticket.assignment_id}`,
      recipient_user_id: params.ticket.builder_id,
      recipient_role: 'builder',
      channel: 'in_app',
      payload: {
        jobId: params.ticket.job_id,
        assignmentId: params.ticket.assignment_id,
        copy: params.builderCopy,
      },
      scheduled_for: params.now,
    },
    {
      event_key: `inspector.departure_triage.${params.action}`,
      dedupe_key: `inspector-departure-triage-${params.action}:${params.ticket.assignment_id}`,
      recipient_user_id: params.ticket.inspector_id,
      recipient_role: 'inspector',
      channel: 'in_app',
      payload: {
        jobId: params.ticket.job_id,
        assignmentId: params.ticket.assignment_id,
        copy: params.inspectorCopy,
      },
      scheduled_for: params.now,
    },
  ]
}

export async function POST(req: NextRequest) {
  const { supabase, userId, authorized } = await requireAdmin()
  if (!authorized || !userId) return NextResponse.json({ ok: false, error: 'Admin role required.' }, { status: 403 })

  let body: ResolutionBody
  try {
    body = await req.json() as ResolutionBody
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.ticketId || !body.assignmentId || !body.action) {
    return NextResponse.json({ ok: false, error: 'ticketId, assignmentId, and action are required.' }, { status: 400 })
  }

  const validationError = validateDepartureResolution(body)
  if (validationError) return NextResponse.json({ ok: false, error: validationError }, { status: 422 })

  const { data: stateData, error: stateError } = await supabase
    .from('job_departure_monitoring_states')
    .select('id, job_id, assignment_id, inspector_id, builder_id, status, confidence_status, confidence_score, scheduled_start_at, required_departure_at, estimated_travel_seconds, hard_ping_sent_at, hard_ping_response_due_at, hard_ping_responded_at, hard_ping_response, protected_issue_submitted, protected_issue_reason, audit_trail, metadata, updated_at')
    .eq('id', body.ticketId)
    .eq('assignment_id', body.assignmentId)
    .maybeSingle()

  if (stateError) return NextResponse.json({ ok: false, error: stateError.message }, { status: 500 })
  const state = stateData as unknown as MonitoringStateRow | null
  if (!state) return NextResponse.json({ ok: false, stale: true, error: 'Ticket no longer exists.' }, { status: 409 })
  if (metadataValue(state.metadata, 'triageResolvedAt')) {
    return NextResponse.json({ ok: false, stale: true, error: 'Ticket has already been resolved.' }, { status: 409 })
  }

  const [{ data: assignmentData, error: assignmentError }, { data: jobData, error: jobError }] = await Promise.all([
    supabase.from('job_assignments').select('id, job_id, status').eq('id', state.assignment_id).maybeSingle(),
    supabase.from('job_opportunities').select('id, status').eq('id', state.job_id).maybeSingle(),
  ])

  if (assignmentError) return NextResponse.json({ ok: false, error: assignmentError.message }, { status: 500 })
  if (jobError) return NextResponse.json({ ok: false, error: jobError.message }, { status: 500 })

  const assignment = assignmentData as unknown as AssignmentRow | null
  const job = jobData as unknown as Pick<JobRow, 'id' | 'status'> | null
  if (!assignment || assignment.job_id !== state.job_id || !isActiveDepartureAssignmentStatus(assignment.status)) {
    return NextResponse.json({ ok: false, stale: true, error: 'Assignment is no longer active for departure triage.' }, { status: 409 })
  }
  if (isTerminalDepartureJobStatus(job?.status)) {
    return NextResponse.json({ ok: false, stale: true, error: 'Job is no longer active for departure triage.' }, { status: 409 })
  }

  const now = new Date().toISOString()
  const nextMetadata = {
    ...(state.metadata ?? {}),
    triageAction: body.action,
    triageResolvedAt: body.action === 'manual_recovery' ? null : now,
    triageState: body.action === 'manual_recovery'
      ? 'manual_recovery_required'
      : body.action === 'keep_assigned_delay'
        ? 'delay_approved_keep_assigned'
        : 'reassignment_requested',
    revisedEta: body.revisedEta ?? null,
    builderContactMethod: body.builderContactMethod ?? null,
    escalationReason: body.escalationReason ?? null,
    adminNote: body.adminNote ?? null,
  }
  const nextAuditTrail = [
    ...(Array.isArray(state.audit_trail) ? state.audit_trail : []),
    {
      event: `departure_triage.${body.action}`,
      at: now,
      actorId: userId,
      actorRole: 'admin',
      note: body.adminNote ?? null,
    },
  ]
  const nextStatus = body.action === 'keep_assigned_delay'
    ? 'en_route_confirmed'
    : body.action === 'manual_recovery'
      ? state.status
      : 'reassignment_pending'

  const { data: updatedRows, error: updateError } = await supabase
    .from('job_departure_monitoring_states')
    .update({
      status: nextStatus,
      metadata: nextMetadata,
      audit_trail: nextAuditTrail,
      tracking_active: body.action === 'keep_assigned_delay',
      updated_at: now,
    })
    .eq('id', state.id)
    .eq('updated_at', state.updated_at)
    .select('id')

  if (updateError) return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 })
  if (!updatedRows || updatedRows.length === 0) {
    return NextResponse.json({ ok: false, stale: true, error: 'Ticket changed while you were reviewing it.' }, { status: 409 })
  }

  let reassignmentResult: Record<string, unknown> | null = null
  if (body.action === 'protected_reassign' || body.action === 'impact_reassign') {
    const { data: acceptedInvite } = await supabase
      .from('standby_inspector_invites')
      .select('id')
      .eq('original_assignment_id', state.assignment_id)
      .eq('status', 'accepted')
      .order('candidate_rank', { ascending: true })
      .limit(1)
      .maybeSingle()

    if ((acceptedInvite as { id?: string } | null)?.id) {
      const { data, error } = await supabase.rpc('atomic_departure_reassign_to_standby', {
        p_assignment_id: state.assignment_id,
        p_standby_invite_id: (acceptedInvite as { id: string }).id,
        p_reason: body.action === 'protected_reassign' ? 'admin_protected_departure_issue' : 'admin_reliability_impact_departure_issue',
      })
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      reassignmentResult = data as Record<string, unknown>
    } else {
      const { data, error } = await supabase.rpc('admin_activate_standby_candidates', {
        p_assignment_id: state.assignment_id,
        p_reason: body.action === 'protected_reassign' ? 'admin_requested' : 'critical_confirmation_miss',
      })
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      reassignmentResult = data as Record<string, unknown>
    }
  }

  const builderCopy = body.action === 'keep_assigned_delay'
    ? BUILDER_TRIAGE_COPY.delayAccepted
    : body.action === 'manual_recovery'
      ? BUILDER_TRIAGE_COPY.atRisk
      : BUILDER_TRIAGE_COPY.reassignment
  const inspectorCopy = body.action === 'protected_reassign'
    ? INSPECTOR_TRIAGE_COPY.protectedEvent
    : body.action === 'impact_reassign'
      ? INSPECTOR_TRIAGE_COPY.reliabilityImpact
      : body.action === 'keep_assigned_delay'
        ? INSPECTOR_TRIAGE_COPY.delayAccepted
        : 'Vero Admin is reviewing this departure intervention and will provide next steps.'

  const { error: notificationError } = await supabase.from('notification_events').insert(notificationRowsForResolution({
    action: body.action,
    ticket: state,
    now,
    builderCopy,
    inspectorCopy,
  }))

  if (notificationError && notificationError.code !== '23505') {
    console.error('[admin/departure-interventions] notification insert failed', {
      assignmentId: state.assignment_id,
      action: body.action,
      error: notificationError.message,
    })
  }

  const { error: auditError } = await supabase.from('governance_audit_events').insert({
    entity_type: 'departure_intervention',
    entity_id: state.id,
    action: `departure_triage.${body.action}`,
    actor_id: userId,
    actor_role: 'admin',
    rule_ids: ['R-DEPARTURE-TRIAGE-001'],
    blocker_type: body.action === 'impact_reassign' ? 'reliability' : 'operations',
    reason: body.adminNote ?? body.escalationReason ?? body.action,
    before_state: state,
    after_state: nextMetadata,
    metadata: {
      jobId: state.job_id,
      assignmentId: state.assignment_id,
      reassignmentResult,
      builderCopy,
    },
  })

  if (auditError) {
    console.error('[admin/departure-interventions] audit insert failed', {
      assignmentId: state.assignment_id,
      action: body.action,
      error: auditError.message,
    })
    return NextResponse.json({
      ok: false,
      partial: true,
      error: 'Resolution was recorded, but audit logging failed. Admin review required.',
    }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    action: body.action,
    stale: false,
    reassignmentResult,
  })
}
