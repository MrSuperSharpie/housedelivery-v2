'use client'

import React from 'react'
import {
  X, CheckCircle2, Clock, BadgeCheck, MapPin,
  CalendarClock, FileText, ShieldCheck, ArrowRight,
  KeyRound, HardHat, ClipboardCheck, MessageSquare,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type AppointmentSlot = {
  date?: string
  startTime?: string
  endTime?: string
  flexible?: boolean
}

interface AppointmentInfo {
  status?: string          // assignment status, e.g. 'provisional' | 'confirmed'
  objectionState?: string  // 'none' | 'pending_review' | 'sustained' | 'overruled'
  discipline?: string      // required discipline / inspection type
  dispatchTier?: string    // 'standard' | 'priority' | 'emergency'
  requestedAt?: string
  permitNumber?: string
  notes?: string
  availableSlots?: AppointmentSlot[]
  claimedSlot?: AppointmentSlot
  claimedAt?: string
  confirmedAt?: string
}

interface EnRouteTrackerProps {
  isOpen: boolean
  onClose: () => void
  inspector: {
    name: string
    designation: string
    license: string
    avatar: string
    disciplines?: string[]
    regions?: string[]
    /** Real verification flag only — omit unless backed by a real field. */
    verified?: boolean
  }
  project: {
    name: string
    address: string
    stage: string
  }
  appointment?: AppointmentInfo
}

// ─── Site readiness checklist ────────────────────────────────────────────────
//
// Professional, generally-applicable coordination reminders. No location, no
// GPS, no movement — these help the builder prepare for the scheduled visit.
// They are reminders, not confirmations that the builder has completed them.

const READINESS_ITEMS: { label: string; sub: string; icon: React.ElementType }[] = [
  {
    label: 'Site access available',
    sub:   'Confirm gates, lockboxes, or escorts are arranged for the scheduled visit',
    icon:  KeyRound,
  },
  {
    label: 'PPE on site',
    sub:   'Required personal protective equipment is available on arrival',
    icon:  HardHat,
  },
  {
    label: 'Work ready for review',
    sub:   'The stage scope is complete and accessible for inspection',
    icon:  ClipboardCheck,
  },
  {
    label: 'Contact available',
    sub:   'A site contact is reachable during the appointment window',
    icon:  CheckCircle2,
  },
]

// ─── Formatters ───────────────────────────────────────────────────────────────

function titleCase(value?: string): string {
  if (!value) return ''
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function fmtDate(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Converts a "HH:MM" string to "1:00 PM". Returns null for empty/placeholder
 *  values; passes through anything already in a non-HH:MM display form. */
function to12h(value?: string): string | null {
  if (!value || value === 'TBD') return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return value
  let h = Number(m[1])
  const minutes = m[2]
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${minutes} ${ampm}`
}

function fmtSlot(slot?: AppointmentSlot): string | null {
  if (!slot) return null
  if (slot.flexible) return 'Flexible timing'
  const start = to12h(slot.startTime)
  if (!slot.date || !start) return null
  const d = new Date(`${slot.date}T12:00:00`)
  if (Number.isNaN(d.getTime())) return null
  const day = d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
  const end = to12h(slot.endTime)
  return end ? `${day} · ${start}–${end}` : `${day} · ${start}`
}

// `hasSchedule` = a real appointment exists (assignment and/or a selected or
// requested window). It keeps the badge and the next-step message consistent so
// we never show "Scheduled" alongside "Awaiting inspector scheduling".
function appointmentStatusLabel(a?: AppointmentInfo, hasSchedule = false): string {
  if (a?.objectionState === 'pending_review') return 'Awaiting review'
  if (a?.status === 'confirmed') return 'Confirmed'
  if (a?.status === 'provisional') return 'Provisional'
  if (hasSchedule || a) return 'Scheduled'
  return 'Pending'
}

function nextStepMessage(a?: AppointmentInfo, hasSchedule = false): string {
  if (a?.objectionState === 'pending_review') return 'Builder review / objection window in progress.'
  if (a?.status === 'confirmed') return 'Appointment confirmed — awaiting inspection.'
  if (a?.status === 'provisional') return 'Inspector selected this appointment — confirmation window in progress.'
  if (hasSchedule || a) return 'Inspection appointment is scheduled.'
  return 'Awaiting inspector scheduling.'
}

// ─── Small presentational helpers ────────────────────────────────────────────

/** Renders a label/value row, or nothing when the value is missing. */
function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-[11px] font-bold uppercase tracking-wide text-subtle shrink-0">{label}</span>
      <span className="text-xs font-semibold text-ink text-right leading-snug">{value}</span>
    </div>
  )
}

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-flame" />
      <div className="label-mono">{label}</div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EnRouteTracker({
  isOpen,
  onClose,
  inspector,
  project,
  appointment,
}: EnRouteTrackerProps) {
  if (!isOpen) return null

  const confirmedWindow = fmtSlot(appointment?.claimedSlot)
  const requestedWindows = (appointment?.availableSlots ?? [])
    .map(fmtSlot)
    .filter((s): s is string => Boolean(s))

  // A schedule exists when there's a selected slot, requested windows, or any
  // active assignment — used to keep status / window / next-step consistent.
  const hasSchedule = Boolean(confirmedWindow) || requestedWindows.length > 0 || Boolean(appointment)
  // Appointment Summary window: selected slot → requested windows → none.
  const windowValue = confirmedWindow
    ?? (requestedWindows.length > 0 ? 'Requested windows available' : 'Scheduled window not available')

  const statusLabel = appointmentStatusLabel(appointment, hasSchedule)
  const StatusIcon  = statusLabel === 'Confirmed' ? CheckCircle2 : Clock
  const statusTone =
    statusLabel === 'Confirmed'      ? 'border-success-green/30 bg-success-green/10 text-success-green' :
    statusLabel === 'Awaiting review' ? 'border-electric/30 bg-electric/10 text-electric' :
    statusLabel === 'Provisional'    ? 'border-warning-amber/30 bg-warning-amber/10 text-warning-amber' :
    statusLabel === 'Scheduled'      ? 'border-electric/25 bg-electric/8 text-electric' :
                                       'border-white/10 bg-white/5 text-muted'
  const inspectorWhen = appointment?.confirmedAt
    ? `Confirmed · ${fmtDate(appointment.confirmedAt)}`
    : appointment?.claimedAt
      ? `Claimed · ${fmtDate(appointment.claimedAt)}`
      : null

  // A meaningful name is anything other than empty or the generic placeholder.
  const hasRealName = Boolean(inspector.name) && inspector.name.trim() !== '' && inspector.name.trim() !== 'Inspector'
  const inspectorDisplayName = hasRealName ? inspector.name : 'Inspector assigned — professional summary not displayed in this view yet'
  const disciplineText = (inspector.disciplines ?? []).filter(Boolean).map(titleCase).join(' · ')
    || (inspector.designation ? titleCase(inspector.designation) : '')
  const regionText = (inspector.regions ?? []).filter(Boolean).map(titleCase).join(' · ')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-md bg-surface border border-white/8 rounded-t-3xl sm:rounded-2xl shadow-card-lg overflow-hidden max-h-[95vh] flex flex-col">

        {/* Handle */}
        <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mt-3 mb-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5 shrink-0">
          <div>
            <div className="font-black text-ink text-base">Inspection Appointment Status</div>
            <div className="text-xs text-muted mt-0.5 truncate max-w-[240px]">{project.name} · {project.stage}</div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 bg-raised rounded-xl flex items-center justify-center text-muted hover:text-ink transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* ── 1. Appointment Summary ── */}
          <div className="card-dark rounded-2xl p-4 inset-top">
            <div className="flex items-center justify-between mb-3">
              <SectionHeader icon={CalendarClock} label="Appointment Summary" />
              <div className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 ${statusTone}`}>
                <StatusIcon className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-wide">{statusLabel}</span>
              </div>
            </div>
            <Field label="Project" value={project.name} />
            <Field label="Stage" value={project.stage} />
            <Field label="Discipline" value={titleCase(appointment?.discipline)} />
            <Field label="Window" value={windowValue} />
          </div>

          {/* ── 2. Inspector Assigned ── */}
          <div className="card-dark rounded-2xl p-4 inset-top">
            <SectionHeader icon={BadgeCheck} label="Inspector Assigned" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-flame/15 border border-flame/25 rounded-2xl flex items-center justify-center font-black text-flame text-base shrink-0">
                {inspector.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`font-bold text-sm ${hasRealName ? 'text-ink truncate' : 'text-muted leading-snug'}`}>
                    {inspectorDisplayName}
                  </span>
                  {/* Verified badge only when a real verification flag is passed. */}
                  {inspector.verified && <BadgeCheck className="w-3.5 h-3.5 text-electric shrink-0" />}
                </div>
                {inspector.license && (
                  <div className="text-xs font-mono text-muted mt-0.5 truncate">{inspector.license}</div>
                )}
                {inspectorWhen && (
                  <div className="text-[11px] font-semibold text-muted mt-1">{inspectorWhen}</div>
                )}
              </div>
            </div>

            {/* Professional details — render only what is real */}
            {(disciplineText || regionText) && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <Field label="Discipline" value={disciplineText} />
                <Field label="Service region" value={regionText} />
              </div>
            )}

            {/* Contact boundary — no off-platform contact wired yet */}
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-subtle shrink-0" />
              <span className="text-[11px] font-semibold text-subtle">Contact through Vero: Coming soon</span>
            </div>
          </div>

          {/* ── 3. Builder Request Details ── */}
          <div className="card-dark rounded-2xl p-4 inset-top">
            <SectionHeader icon={FileText} label="Builder Request Details" />
            <Field label="Requested type" value={titleCase(appointment?.discipline)} />
            <Field label="Requested" value={fmtDate(appointment?.requestedAt)} />
            {requestedWindows.length > 0 && (
              <div className="flex items-start justify-between gap-3 py-1.5 border-b border-white/5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-subtle shrink-0">Requested windows</span>
                <div className="text-xs font-semibold text-ink text-right leading-snug space-y-0.5">
                  {requestedWindows.map((w, i) => <div key={i}>{w}</div>)}
                </div>
              </div>
            )}
            <Field label="Urgency" value={titleCase(appointment?.dispatchTier)} />
            <Field label="Permit" value={appointment?.permitNumber} />
            <div className="flex items-start justify-between gap-3 py-1.5 border-b border-white/5 last:border-0">
              <span className="text-[11px] font-bold uppercase tracking-wide text-subtle shrink-0">Site</span>
              <span className="inline-flex items-start gap-1 text-xs font-semibold text-ink text-right leading-snug">
                <MapPin className="w-3 h-3 text-flame mt-0.5 shrink-0" />{project.address}
              </span>
            </div>
            {appointment?.notes && (
              <div className="mt-2 rounded-xl border border-white/6 bg-panel/60 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-subtle mb-1">Notes</div>
                <div className="text-xs text-ink leading-relaxed whitespace-pre-wrap">{appointment.notes}</div>
              </div>
            )}
          </div>

          {/* ── 4. Site Readiness ── */}
          <div className="card-dark rounded-2xl p-4 inset-top">
            <SectionHeader icon={ShieldCheck} label="Site Readiness" />
            <div className="space-y-2.5">
              {READINESS_ITEMS.map(item => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg border border-white/8 bg-surface flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-muted" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-ink">{item.label}</div>
                      <div className="text-[11px] text-muted leading-relaxed">{item.sub}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-muted leading-relaxed">
              These are general preparation reminders. This panel reflects assignment updates, not live location tracking.
            </div>
          </div>

          {/* ── 5. Next Step ── */}
          <div className="card-dark rounded-2xl p-4 inset-top">
            <SectionHeader icon={ArrowRight} label="Next Step" />
            <div className="text-sm font-bold text-ink leading-snug">{nextStepMessage(appointment, hasSchedule)}</div>
            <div className="mt-2 space-y-1 text-[11px] text-muted leading-relaxed">
              <div>Inspection result will appear after the inspector submits the report.</div>
              <div>Final records become available once generated.</div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-white/5 px-5 py-4 bg-surface/95 backdrop-blur-sm shrink-0">
          <button onClick={onClose}
            className="w-full border border-white/10 bg-panel hover:bg-raised text-ink font-bold py-3 rounded-2xl text-sm transition-all">
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
