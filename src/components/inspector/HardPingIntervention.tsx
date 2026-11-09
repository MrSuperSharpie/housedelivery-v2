'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, HelpCircle, Loader2, MapPin, ShieldCheck, XCircle } from 'lucide-react'
import { HARD_PING_COPY, HARD_PING_REASON_OPTIONS } from '@/lib/hardPingCopy'
import type {
  ActiveHardPing,
  HardPingIssueReason,
  HardPingResponseRequest,
  HardPingResponseResult,
  HardPingResponseType,
} from '@/lib/hardPingTypes'

export type HardPingStep = 'main' | 'help' | 'cannot_attend' | 'success'

interface HardPingInterventionProps {
  hardPing: ActiveHardPing | null
  userRole?: string
  onRespond: (input: HardPingResponseRequest) => Promise<HardPingResponseResult>
  onResolved?: () => void
  initialStep?: HardPingStep
}

function formatDateTime(value?: string) {
  if (!value) return 'Scheduled time pending'
  try {
    return new Intl.DateTimeFormat('en-CA', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function formatEta(seconds?: number | null) {
  if (!seconds || seconds <= 0) return null
  const minutes = Math.max(1, Math.round(seconds / 60))
  return `${minutes} min ETA`
}

function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

export function HardPingIntervention({
  hardPing,
  userRole,
  onRespond,
  onResolved,
  initialStep = 'main',
}: HardPingInterventionProps) {
  const [step, setStep] = useState<HardPingStep>(initialStep)
  const [selectedReason, setSelectedReason] = useState<HardPingIssueReason>('vehicle_issue')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const submittingRef = useRef(false)
  const active = userRole === 'inspector' && hardPing?.status === 'hard_ping_required'
  const eta = formatEta(hardPing?.currentEtaSeconds)

  useEffect(() => {
    if (!active) return
    setStep(initialStep)
    setStatusMessage('')
    setErrorMessage('')
    setSuccessMessage('')
    const frame = window.requestAnimationFrame(() => headingRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [active, hardPing?.id, initialStep])

  useEffect(() => {
    if (!active) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusable.length === 0) return

      const firstFocusable = focusable[0]
      const lastFocusable = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault()
        lastFocusable.focus()
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault()
        firstFocusable.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [active])

  const jobContext = useMemo(() => {
    if (!hardPing) return []
    return [
      { label: 'Project', value: hardPing.projectName ?? 'Assigned inspection' },
      { label: 'Site', value: hardPing.siteAddress ?? 'Site details available in assignment' },
      { label: 'Scheduled', value: formatDateTime(hardPing.scheduledStartAt) },
      ...(eta ? [{ label: 'Current ETA', value: eta }] : []),
    ]
  }, [eta, hardPing])

  if (!active || !hardPing) return null

  const submitResponse = async (responseType: HardPingResponseType, reasonCategory?: HardPingIssueReason) => {
    if (submittingRef.current) return
    setErrorMessage('')
    setStatusMessage('')

    if (!isOnline()) {
      setStatusMessage(HARD_PING_COPY.offline)
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    try {
      const result = await onRespond({
        assignmentId: hardPing.assignmentId,
        jobId: hardPing.jobId,
        responseType,
        reasonCategory,
        details: responseType === 'needs_help' ? details : undefined,
        clientTimestamp: new Date().toISOString(),
      })

      if (result.stale || result.hardPingActive === false) {
        if (!result.ok && result.stale) {
          setStatusMessage(HARD_PING_COPY.stale)
          window.setTimeout(() => onResolved?.(), 900)
          return
        }
      }

      if (!result.ok) {
        setErrorMessage(result.error ?? HARD_PING_COPY.genericError)
        return
      }

      const message = responseType === 'en_route'
        ? HARD_PING_COPY.enRouteSuccess
        : responseType === 'needs_help'
          ? HARD_PING_COPY.helpSuccess
          : HARD_PING_COPY.cannotAttendSuccess

      setSuccessMessage(result.updatedEtaSeconds
        ? `${message} Updated ETA: ${formatEta(result.updatedEtaSeconds)}.`
        : message)
      setStep('success')
    } catch {
      setErrorMessage(HARD_PING_COPY.genericError)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex min-h-dvh items-stretch justify-center bg-slate-950 text-white"
      role="presentation"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="hard-ping-title"
        aria-describedby="hard-ping-description"
        className="flex w-full max-w-2xl flex-col overflow-y-auto px-5 py-6 sm:px-8"
      >
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-300 text-slate-950">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-100">Departure Assurance</p>
            <p className="text-sm text-amber-50">Active response required</p>
          </div>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl">
          <h1
            id="hard-ping-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-black leading-tight outline-none sm:text-3xl"
          >
            {step === 'help'
              ? HARD_PING_COPY.helpQuestion
              : step === 'cannot_attend'
                ? HARD_PING_COPY.cannotAttendTitle
                : HARD_PING_COPY.title}
          </h1>
          <p id="hard-ping-description" className="mt-3 text-base leading-7 text-slate-200">
            {step === 'cannot_attend' ? HARD_PING_COPY.cannotAttendBody : HARD_PING_COPY.support}
          </p>

          <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            {jobContext.map(item => (
              <div key={item.label} className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</div>
                  <div className="text-sm font-semibold text-slate-100">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-5 flex-1">
          {step === 'main' && (
            <div className="grid gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => submitResponse('en_route')}
                className="flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-400 px-5 py-4 text-base font-black text-emerald-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
                Yes, I am en route
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setStep('help')}
                className="flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl border border-sky-300/40 bg-sky-300/10 px-5 py-4 text-base font-black text-sky-50 transition hover:bg-sky-300/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <HelpCircle className="h-5 w-5" aria-hidden="true" />
                I need help / report issue
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setStep('cannot_attend')}
                className="flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl border border-rose-300/40 bg-rose-300/10 px-5 py-4 text-base font-black text-rose-50 transition hover:bg-rose-300/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <XCircle className="h-5 w-5" aria-hidden="true" />
                I cannot attend
              </button>
            </div>
          )}

          {step === 'help' && (
            <div className="grid gap-4">
              <fieldset className="grid gap-2">
                <legend className="sr-only">Reason for delayed departure</legend>
                {HARD_PING_REASON_OPTIONS.map(reason => (
                  <label
                    key={reason.value}
                    className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-bold text-slate-100"
                  >
                    <input
                      type="radio"
                      name="hard-ping-reason"
                      value={reason.value}
                      checked={selectedReason === reason.value}
                      onChange={() => setSelectedReason(reason.value)}
                      className="h-5 w-5 accent-sky-300"
                    />
                    {reason.label}
                  </label>
                ))}
              </fieldset>
              <label className="grid gap-2 text-sm font-bold text-slate-100">
                {HARD_PING_COPY.helpDetailsLabel}
                <textarea
                  value={details}
                  onChange={event => setDetails(event.target.value)}
                  rows={4}
                  className="min-h-28 rounded-2xl border border-white/15 bg-slate-900 px-4 py-3 text-base text-white outline-none transition focus:border-sky-300"
                  placeholder="Optional context, such as traffic, site access, or app/GPS issue details."
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setStep('main')}
                  className="min-h-14 rounded-2xl border border-white/15 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10 disabled:opacity-70"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => submitResponse('needs_help', selectedReason)}
                  className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-sky-300 px-5 py-3 text-sm font-black text-sky-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Send report
                </button>
              </div>
            </div>
          )}

          {step === 'cannot_attend' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setStep('main')}
                className="min-h-16 rounded-2xl border border-white/15 px-5 py-4 text-base font-black text-white transition hover:bg-white/10 disabled:opacity-70"
              >
                Go back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => submitResponse('cannot_attend')}
                className="flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-rose-300 px-5 py-4 text-base font-black text-rose-950 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
                Confirm I cannot attend
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="rounded-3xl border border-emerald-300/30 bg-emerald-300/10 p-5">
              <div className="flex gap-3">
                <ShieldCheck className="h-6 w-6 shrink-0 text-emerald-200" aria-hidden="true" />
                <p className="text-base font-semibold leading-7 text-emerald-50">{successMessage}</p>
              </div>
              <button
                type="button"
                onClick={onResolved}
                className="mt-5 min-h-14 w-full rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-emerald-200"
              >
                Return to assignment
              </button>
            </div>
          )}
        </div>

        <div aria-live="polite" className="mt-5 min-h-12">
          {submitting && (
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-slate-100">
              <Clock className="h-4 w-4 animate-pulse text-amber-200" aria-hidden="true" />
              Sending your response to Vero…
            </div>
          )}
          {statusMessage && (
            <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50">
              {statusMessage}
            </div>
          )}
          {errorMessage && (
            <div role="alert" className="rounded-2xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-50">
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

