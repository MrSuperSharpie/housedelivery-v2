'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle2,
  LifeBuoy,
  Loader2,
  Phone,
  RefreshCcw,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { ActionButton, StatusPill } from '@/components/admin/AdminShell'
import {
  deriveDepartureActionCue,
  deriveDepartureResolutionCue,
  formatStartDelta,
  hasPrivatePenaltyLeak,
  resolutionStatusForAction,
  sortDepartureInterventionTickets,
  validateDepartureResolution,
  type DepartureInterventionAction,
  type DepartureInterventionResolutionInput,
  type DepartureInterventionTicket,
  type DepartureResolutionStatus,
  type DepartureTriageStandbyCandidate,
} from '@/lib/adminDepartureTriage'

interface DepartureInterventionsClientProps {
  initialTickets?: DepartureInterventionTicket[]
}

interface ApiResponse {
  ok?: boolean
  tickets?: DepartureInterventionTicket[]
  stale?: boolean
  error?: string
}

type TicketOutcomes = Record<string, DepartureResolutionStatus>

const actionLabels: Record<DepartureInterventionAction, string> = {
  protected_reassign: 'Reassign — Protected Event',
  impact_reassign: 'Reassign — Reliability Impact',
  keep_assigned_delay: 'Keep Assigned — Builder Accepted Delay',
  manual_recovery: 'Escalate / Manual Recovery',
}

const riskStyles: Record<DepartureInterventionTicket['riskLevel'], string> = {
  Critical: 'border-fail-red/30 bg-fail-red/12 text-fail-red',
  'At Risk': 'border-warning-amber/30 bg-warning-amber/12 text-warning-amber',
  Monitoring: 'border-electric/30 bg-electric/12 text-electric',
  'Manual Recovery': 'border-white/15 bg-white/8 text-ink',
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value))
}

function etaGapLabel(gap?: number | null) {
  if (gap == null) return 'ETA gap unavailable'
  if (gap <= 0) return `${Math.abs(gap)} min buffer`
  return `${gap} min late risk`
}

function shortContact(name: string, phone?: string | null) {
  return phone ? `${name} · ${phone}` : name
}

function standbySummary(candidates: DepartureTriageStandbyCandidate[]) {
  if (candidates.length === 0) return 'No standby available'
  const accepted = candidates.find(candidate => candidate.status === 'accepted')
  if (accepted) return `${accepted.inspectorName ?? 'Standby'} accepted`
  const offered = candidates.filter(candidate => candidate.status === 'offered').length
  if (offered > 0) return `${offered} offer${offered === 1 ? '' : 's'} active`
  return `${candidates.length} candidate${candidates.length === 1 ? '' : 's'} identified`
}

function resolutionSuccessMessage(action: DepartureInterventionAction) {
  if (action === 'manual_recovery') return 'Manual recovery status recorded. This ticket remains visible for follow-up.'
  if (action === 'keep_assigned_delay') return 'Delay accepted and ETA update recorded.'
  return 'Reassignment action recorded. Vero is updating recovery state.'
}

function TicketRiskBadge({ riskLevel }: { riskLevel: DepartureInterventionTicket['riskLevel'] }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${riskStyles[riskLevel]}`}>
      {riskLevel}
    </span>
  )
}

function ActionCuePill({ ticket }: { ticket: DepartureInterventionTicket }) {
  const cue = deriveDepartureActionCue(ticket)
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${riskStyles[cue.tone]}`}>
      {cue.label}
    </span>
  )
}

function ResolutionStatusPill({ status }: { status: DepartureResolutionStatus }) {
  const cue = deriveDepartureResolutionCue(status)
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${riskStyles[cue.tone]}`}>
      {cue.label}
    </span>
  )
}

function QueueRow({ ticket, selected, resolutionStatus, onSelect }: {
  ticket: DepartureInterventionTicket
  selected: boolean
  resolutionStatus?: DepartureResolutionStatus
  onSelect: () => void
}) {
  const disabled = Boolean(resolutionStatus && resolutionStatus !== 'manual_recovery')

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`w-full rounded-3xl border p-4 text-left transition ${
        selected
          ? 'border-flame/40 bg-flame/10 shadow-[0_18px_38px_rgba(255,95,21,0.10)]'
          : disabled
            ? 'border-white/10 bg-white/[0.03] opacity-75'
            : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TicketRiskBadge riskLevel={ticket.riskLevel} />
            {resolutionStatus ? <ResolutionStatusPill status={resolutionStatus} /> : null}
            <ActionCuePill ticket={ticket} />
            <StatusPill status={ticket.state} />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle">{formatStartDelta(ticket)}</span>
          </div>
          <h3 className="mt-3 truncate text-base font-black text-ink">{ticket.projectName}</h3>
          <div className="mt-1 text-xs text-muted">
            Job <span className="font-mono text-ink">{ticket.jobId.slice(0, 8)}</span>
            {ticket.inspectionType ? ` · ${ticket.inspectionType}` : ''}
          </div>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-sm font-black text-ink">{formatDateTime(ticket.scheduledStartAt)}</div>
          <div className={`mt-1 text-xs font-bold ${ticket.etaGapMinutes && ticket.etaGapMinutes > 0 ? 'text-warning-amber' : 'text-muted'}`}>
            {etaGapLabel(ticket.etaGapMinutes)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-subtle">Inspector</div>
          <div className="truncate font-semibold text-ink">{shortContact(ticket.inspectorName, ticket.inspectorPhone)}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-subtle">Builder</div>
          <div className="truncate font-semibold text-ink">{shortContact(ticket.builderName, ticket.builderPhone)}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-subtle">Reason</div>
          <div className="font-black text-ink">{ticket.reasonLabel}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-subtle">Standby</div>
          <div className="font-semibold text-ink">{standbySummary(ticket.standbyCandidates)}</div>
        </div>
      </div>
    </button>
  )
}

function DetailLine({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-subtle">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{value || 'Not available'}</div>
    </div>
  )
}

function StandbyList({ candidates }: { candidates: DepartureTriageStandbyCandidate[] }) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-2xl border border-warning-amber/25 bg-warning-amber/10 p-4 text-sm font-semibold text-warning-amber">
        No standby inspector is currently available. Use Manual Recovery or activate standby support.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {candidates.map(candidate => (
        <div key={candidate.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="font-bold text-ink">{candidate.inspectorName ?? 'Standby inspector'}</div>
            <StatusPill status={candidate.status} />
          </div>
          <div className="mt-2 grid gap-2 text-xs text-muted sm:grid-cols-3">
            <span>Rank {candidate.rank}</span>
            <span>{candidate.credentialMatch === false ? 'Credential needs review' : 'Credential match'}</span>
            <span>{candidate.regionMatch === false ? 'Region needs review' : 'Region match'}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ResolutionPanel({
  ticket,
  pendingAction,
  resolutionStatus,
  onResolve,
}: {
  ticket: DepartureInterventionTicket
  pendingAction?: DepartureInterventionAction | null
  resolutionStatus?: DepartureResolutionStatus
  onResolve: (input: DepartureInterventionResolutionInput) => void
}) {
  const [selectedAction, setSelectedAction] = useState<DepartureInterventionAction>('protected_reassign')
  const [adminNote, setAdminNote] = useState('')
  const [confirmationAccepted, setConfirmationAccepted] = useState(false)
  const [revisedEta, setRevisedEta] = useState('')
  const [builderContactMethod, setBuilderContactMethod] = useState<DepartureInterventionResolutionInput['builderContactMethod'] | ''>('')
  const [escalationReason, setEscalationReason] = useState('')
  const validationError = validateDepartureResolution({
    action: selectedAction,
    adminNote,
    confirmationAccepted,
    revisedEta,
    builderContactMethod: builderContactMethod || undefined,
    escalationReason,
  })
  const resolving = Boolean(pendingAction)
  const resolved = Boolean(resolutionStatus && resolutionStatus !== 'resolving')

  useEffect(() => {
    queueMicrotask(() => {
      setAdminNote('')
      setConfirmationAccepted(false)
      setRevisedEta('')
      setBuilderContactMethod('')
      setEscalationReason('')
    })
  }, [ticket.id, selectedAction])

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-sm font-black text-ink">Resolution actions</div>
      <p className="mt-1 text-xs leading-5 text-muted">
        Choose the narrowest durable action. Reliability impact requires confirmation and an Admin note.
      </p>

      {resolved && resolutionStatus && (
        <div className="mt-4 rounded-2xl border border-success-green/25 bg-success-green/10 px-3 py-3 text-sm font-semibold text-success-green">
          {deriveDepartureResolutionCue(resolutionStatus).label} recorded. Further actions are disabled for this ticket.
        </div>
      )}

      <div className="mt-4 grid gap-2">
        {(Object.keys(actionLabels) as DepartureInterventionAction[]).map(action => (
          <button
            key={action}
            type="button"
            disabled={resolving || resolved}
            onClick={() => setSelectedAction(action)}
            className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${
              selectedAction === action
                ? 'border-flame/40 bg-flame/12 text-ink'
                : 'border-white/10 bg-white/[0.03] text-muted hover:text-ink'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              {pendingAction === action && <Loader2 className="h-4 w-4 animate-spin" />}
              {actionLabels[action]}
            </span>
          </button>
        ))}
      </div>

      {!resolved && (
      <div className="mt-4 grid gap-3">
        {selectedAction === 'impact_reassign' && (
          <label className="flex items-start gap-3 rounded-2xl border border-warning-amber/25 bg-warning-amber/10 p-3 text-sm text-ink">
            <input
              type="checkbox"
              disabled={resolving}
              checked={confirmationAccepted}
              onChange={event => setConfirmationAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 accent-warning-amber"
            />
            <span>I confirm this should be reviewed as a Reliability Impact event.</span>
          </label>
        )}

        {selectedAction === 'keep_assigned_delay' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.16em] text-subtle">
              Revised ETA
              <input
                type="datetime-local"
                disabled={resolving}
                value={revisedEta}
                onChange={event => setRevisedEta(event.target.value)}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm normal-case tracking-normal text-ink outline-none focus:border-flame/40"
              />
            </label>
            <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.16em] text-subtle">
              Builder contact method
              <select
                disabled={resolving}
                value={builderContactMethod}
                onChange={event => setBuilderContactMethod(event.target.value as typeof builderContactMethod)}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm normal-case tracking-normal text-ink outline-none focus:border-flame/40"
              >
                <option value="">Select method</option>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="in_app">In-app</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
        )}

        {selectedAction === 'manual_recovery' && (
          <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.16em] text-subtle">
            Escalation reason
            <input
              disabled={resolving}
              value={escalationReason}
              onChange={event => setEscalationReason(event.target.value)}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm normal-case tracking-normal text-ink outline-none focus:border-flame/40"
              placeholder="No standby available, facts unclear, builder phone call needed…"
            />
          </label>
        )}

        {(selectedAction !== 'protected_reassign' || adminNote) && (
          <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.16em] text-subtle">
            Admin note
            <textarea
              disabled={resolving}
              value={adminNote}
              onChange={event => setAdminNote(event.target.value)}
              rows={3}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm normal-case tracking-normal text-ink outline-none focus:border-flame/40"
              placeholder="Document who was contacted, facts reviewed, and rationale."
            />
          </label>
        )}

        {selectedAction === 'protected_reassign' && !adminNote && (
          <button
            type="button"
            disabled={resolving}
            onClick={() => setAdminNote('Protected departure issue reviewed by Admin. Reassignment requested to protect builder schedule.')}
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-left text-xs font-semibold text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add standard protected-event audit note
          </button>
        )}

        {validationError && <div className="text-xs font-semibold text-warning-amber">{validationError}</div>}

        <ActionButton
          variant={selectedAction === 'impact_reassign' ? 'warn' : selectedAction === 'manual_recovery' ? 'ghost' : 'default'}
          disabled={resolving || Boolean(validationError)}
          onClick={() => onResolve({
            action: selectedAction,
            adminNote,
            confirmationAccepted,
            revisedEta,
            builderContactMethod: builderContactMethod || undefined,
            escalationReason,
          })}
        >
          {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {resolving ? 'Submitting action' : actionLabels[selectedAction]}
        </ActionButton>
      </div>
      )}
    </div>
  )
}

function TicketPanel({ ticket, pendingAction, resolutionStatus, onResolve }: {
  ticket: DepartureInterventionTicket
  pendingAction?: DepartureInterventionAction | null
  resolutionStatus?: DepartureResolutionStatus
  onResolve: (input: DepartureInterventionResolutionInput) => void
}) {
  const renderedText = JSON.stringify(ticket)
  const privacyLeak = hasPrivatePenaltyLeak(renderedText)

  return (
    <aside className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(22,33,51,0.72),rgba(14,23,39,0.94))] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.20)] lg:sticky lg:top-24">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-subtle">Selected ticket</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black text-ink">{ticket.projectName}</h2>
            {resolutionStatus ? <ResolutionStatusPill status={resolutionStatus} /> : null}
            <ActionCuePill ticket={ticket} />
          </div>
          <p className="mt-1 text-sm text-muted">{ticket.siteAddress ?? 'Site address unavailable'}</p>
        </div>
        <TicketRiskBadge riskLevel={ticket.riskLevel} />
      </div>

      {privacyLeak && (
        <div className="mt-4 rounded-2xl border border-fail-red/30 bg-fail-red/10 p-3 text-xs font-bold text-fail-red">
          Privacy guard detected restricted wording in this ticket payload.
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <DetailLine label="Reason category" value={<span className="font-black">{ticket.reasonLabel}</span>} />
        <DetailLine label="Response timestamp" value={ticket.responseTimestamp ? formatDateTime(ticket.responseTimestamp) : 'No response recorded'} />
        <DetailLine label="Scheduled start" value={formatDateTime(ticket.scheduledStartAt)} />
        <DetailLine label="ETA gap" value={etaGapLabel(ticket.etaGapMinutes)} />
        <DetailLine label="Escrow status" value={ticket.escrowProtected ? 'Escrow protected' : 'Review escrow state'} />
        <DetailLine label="Builder notification" value={ticket.builderNotificationStatus.replace(/_/g, ' ')} />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-subtle">Inspector details</div>
        <p className="mt-2 text-sm leading-6 text-ink">{ticket.inspectorDetails || 'No typed details provided.'}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <DetailLine label="Builder contact" value={<span className="inline-flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {ticket.builderName}{ticket.builderPhone ? ` · ${ticket.builderPhone}` : ''}</span>} />
        <DetailLine label="Inspector contact" value={<span className="inline-flex items-center gap-2"><UserRound className="h-3.5 w-3.5" /> {ticket.inspectorName}{ticket.inspectorPhone ? ` · ${ticket.inspectorPhone}` : ''}</span>} />
      </div>

      <div className="mt-5">
        <div className="mb-2 text-sm font-black text-ink">Standby availability</div>
        <StandbyList candidates={ticket.standbyCandidates} />
      </div>

      <div className="mt-5">
        <div className="mb-2 text-sm font-black text-ink">Audit timeline</div>
        <div className="space-y-2">
          {ticket.auditTimeline.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-muted">No timeline entries yet.</div>
          ) : ticket.auditTimeline.map((item, index) => (
            <div key={`${item.at}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="text-xs font-bold text-ink">{item.label.replace(/_/g, ' ')}</div>
              <div className="mt-1 text-[11px] text-muted">{formatDateTime(item.at)}{item.actor ? ` · ${item.actor}` : ''}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <ResolutionPanel ticket={ticket} pendingAction={pendingAction} resolutionStatus={resolutionStatus} onResolve={onResolve} />
      </div>
    </aside>
  )
}

export function DepartureTriageView({
  tickets,
  loading,
  error,
  successMessage,
  selectedTicketId,
  pendingAction,
  ticketOutcomes = {},
  onSelectTicket,
  onRefresh,
  onResolveTicket,
}: {
  tickets: DepartureInterventionTicket[]
  loading: boolean
  error?: string | null
  successMessage?: string | null
  selectedTicketId?: string | null
  pendingAction?: { ticketId: string; action: DepartureInterventionAction } | null
  ticketOutcomes?: TicketOutcomes
  onSelectTicket: (ticketId: string) => void
  onRefresh: () => void
  onResolveTicket: (ticket: DepartureInterventionTicket, input: DepartureInterventionResolutionInput) => void
}) {
  const sortedTickets = useMemo(() => sortDepartureInterventionTickets(tickets), [tickets])
  const selectedTicket = sortedTickets.find(ticket => ticket.id === selectedTicketId) ?? sortedTickets[0] ?? null
  const statusForTicket = (ticketId: string) => pendingAction?.ticketId === ticketId ? 'resolving' : ticketOutcomes[ticketId]
  const selectedResolutionStatus = selectedTicket ? statusForTicket(selectedTicket.id) : undefined
  const selectedPendingAction = selectedTicket && pendingAction?.ticketId === selectedTicket.id ? pendingAction.action : null

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-electric/20 bg-electric/10 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-electric/25 bg-electric/15 text-electric">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-black text-ink">Active Departure Triage</div>
              <p className="mt-1 text-sm leading-6 text-muted">
                Focused queue for hard pings, protected issues, reassignment readiness, and builder schedule protection.
              </p>
            </div>
          </div>
          <button type="button" onClick={onRefresh} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold text-ink hover:bg-white/10">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-2xl border border-fail-red/25 bg-fail-red/10 p-4 text-sm font-semibold text-fail-red">{error}</div>}
      {successMessage && <div role="status" className="rounded-2xl border border-success-green/25 bg-success-green/10 p-4 text-sm font-semibold text-success-green">{successMessage}</div>}

      {loading ? (
        <div className="flex items-center justify-center rounded-3xl border border-white/10 bg-white/[0.04] py-20">
          <Loader2 className="h-7 w-7 animate-spin text-flame" />
        </div>
      ) : sortedTickets.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-success-green" />
          <h2 className="mt-4 text-lg font-black text-ink">No active departure interventions</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">Hard ping, no-response, and manual recovery tickets will appear here when Admin triage is required.</p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(28rem,0.78fr)]">
          <section className="space-y-3" aria-label="Active departure intervention queue">
            {sortedTickets.map(ticket => {
              const resolutionStatus = statusForTicket(ticket.id)
              return (
                <QueueRow
                  key={ticket.id}
                  ticket={ticket}
                  selected={selectedTicket?.id === ticket.id}
                  resolutionStatus={resolutionStatus}
                  onSelect={() => {
                    if (resolutionStatus && resolutionStatus !== 'manual_recovery') return
                    onSelectTicket(ticket.id)
                  }}
                />
              )
            })}
          </section>

          {selectedTicket && (
            <TicketPanel
              ticket={selectedTicket}
              pendingAction={selectedPendingAction}
              resolutionStatus={selectedResolutionStatus}
              onResolve={input => onResolveTicket(selectedTicket, input)}
            />
          )}
        </div>
      )}
    </div>
  )
}

export function DepartureInterventionsClient({ initialTickets = [] }: DepartureInterventionsClientProps) {
  const [tickets, setTickets] = useState<DepartureInterventionTicket[]>(initialTickets)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialTickets[0]?.id ?? null)
  const [loading, setLoading] = useState(initialTickets.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<{ ticketId: string; action: DepartureInterventionAction } | null>(null)
  const [ticketOutcomes, setTicketOutcomes] = useState<TicketOutcomes>({})
  const actionInFlightRef = useRef(false)

  const refresh = async () => {
    setError(null)
    setLoading(true)
    try {
      const response = await fetch('/api/admin/departure-interventions', { cache: 'no-store' })
      const payload = await response.json() as ApiResponse
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? 'Could not load active departure interventions.')
        return
      }
      const nextTickets = payload.tickets ?? []
      setTickets(nextTickets)
      setSelectedTicketId(current => current && nextTickets.some(ticket => ticket.id === current) ? current : nextTickets[0]?.id ?? null)
      setTicketOutcomes(current => {
        const visibleTicketIds = new Set(nextTickets.map(ticket => ticket.id))
        return Object.fromEntries(Object.entries(current).filter(([ticketId]) => visibleTicketIds.has(ticketId)))
      })
    } catch {
      setError('Network error while loading departure interventions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialTickets.length === 0) void refresh()
  }, [initialTickets.length])

  const resolveTicket = async (ticket: DepartureInterventionTicket, input: DepartureInterventionResolutionInput) => {
    if (actionInFlightRef.current || ticketOutcomes[ticket.id]) return
    actionInFlightRef.current = true
    setError(null)
    setSuccessMessage(null)
    setPendingAction({ ticketId: ticket.id, action: input.action })
    setTicketOutcomes(current => ({ ...current, [ticket.id]: 'resolving' }))
    try {
      const response = await fetch('/api/admin/departure-interventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id, assignmentId: ticket.assignmentId, ...input }),
      })
      const payload = await response.json() as ApiResponse
      if (!response.ok || !payload.ok) {
        setTicketOutcomes(current => {
          const next = { ...current }
          delete next[ticket.id]
          return next
        })
        setError(payload.stale ? 'This ticket changed while you were reviewing it. Refreshing queue.' : payload.error ?? 'Could not resolve ticket.')
        await refresh()
        return
      }
      setTicketOutcomes(current => ({ ...current, [ticket.id]: resolutionStatusForAction(input.action) }))
      setSuccessMessage(resolutionSuccessMessage(input.action))
      await refresh()
    } catch {
      setTicketOutcomes(current => {
        const next = { ...current }
        delete next[ticket.id]
        return next
      })
      setError('Network error while resolving this intervention.')
    } finally {
      actionInFlightRef.current = false
      setPendingAction(null)
    }
  }

  return (
    <DepartureTriageView
      tickets={tickets}
      loading={loading}
      error={error}
      successMessage={successMessage}
      selectedTicketId={selectedTicketId}
      pendingAction={pendingAction}
      ticketOutcomes={ticketOutcomes}
      onSelectTicket={setSelectedTicketId}
      onRefresh={refresh}
      onResolveTicket={resolveTicket}
    />
  )
}
