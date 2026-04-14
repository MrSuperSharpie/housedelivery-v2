'use client'

import React, { useMemo, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import type { DispatchTier } from '@/lib/types'

export interface TimeSlot {
  date: string   // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string   // HH:MM
}

interface SchedulingPickerProps {
  slots: TimeSlot[]
  onChange: (slots: TimeSlot[]) => void
  max?: number
  tier?: DispatchTier
}

const TIMES = [
  '07:00','07:30','08:00','08:30','09:00','09:30',
  '10:00','10:30','11:00','11:30','12:00','12:30',
  '13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30',
]

function toLocalISODate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfLocalDay(date = new Date()) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addCalendarDays(base: Date, days: number) {
  const next = new Date(base)
  next.setDate(next.getDate() + days)
  return next
}

function isBusinessDay(date: Date) {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

function addBusinessDays(base: Date, businessDays: number) {
  let cursor = startOfLocalDay(base)
  let added = 0
  while (added < businessDays) {
    cursor = addCalendarDays(cursor, 1)
    if (isBusinessDay(cursor)) added += 1
  }
  return cursor
}

function ceilToNextHalfHour(date = new Date()) {
  const next = new Date(date)
  next.setSeconds(0, 0)
  const minutes = next.getMinutes()
  const remainder = minutes % 30
  if (remainder !== 0) {
    next.setMinutes(minutes + (30 - remainder))
  }
  return `${`${next.getHours()}`.padStart(2, '0')}:${`${next.getMinutes()}`.padStart(2, '0')}`
}

function buildVisibleDates(baseDate = new Date(), days = 14) {
  const start = startOfLocalDay(baseDate)
  return Array.from({ length: days }, (_, index) => toLocalISODate(addCalendarDays(start, index)))
}

function parseISODate(iso: string) {
  return startOfLocalDay(new Date(`${iso}T12:00:00`))
}

const STANDARD_MIN_LEAD_BUSINESS_DAYS = 5
const STANDARD_BOOKING_HORIZON_DAYS = 90
const STANDARD_VISIBLE_DATE_COUNT = 14

function getSchedulingWindowForTier(tier: DispatchTier, baseDate = new Date()) {
  if (tier === 'emergency') {
    const today = startOfLocalDay(baseDate)
    return {
      earliest: today,
      latest: addCalendarDays(today, 1),
    }
  }

  return tier === 'priority'
    ? {
        earliest: addBusinessDays(baseDate, 2),
        latest: addBusinessDays(baseDate, 3),
      }
    : {
        earliest: addBusinessDays(baseDate, STANDARD_MIN_LEAD_BUSINESS_DAYS),
        latest: addCalendarDays(startOfLocalDay(baseDate), STANDARD_BOOKING_HORIZON_DAYS),
      }
}

function buildVisibleDatesForTier(tier: DispatchTier, baseDate = new Date()) {
  if (tier === 'standard') {
    return buildVisibleDates(baseDate, STANDARD_BOOKING_HORIZON_DAYS + 1)
  }

  const { earliest, latest } = getSchedulingWindowForTier(tier, baseDate)
  const earliestOffset = Math.max(
    0,
    Math.round((startOfLocalDay(earliest).getTime() - startOfLocalDay(baseDate).getTime()) / 86_400_000) - 2
  )
  const latestOffset = Math.round((startOfLocalDay(latest).getTime() - startOfLocalDay(baseDate).getTime()) / 86_400_000) + 2
  const totalDays = Math.max(earliestOffset, latestOffset) - earliestOffset + 1
  const anchor = addCalendarDays(startOfLocalDay(baseDate), earliestOffset)
  return buildVisibleDates(anchor, totalDays)
}

export function isDateValidForTier(dateISO: string, tier: DispatchTier, baseDate = new Date()) {
  const candidate = parseISODate(dateISO)
  const { earliest, latest } = getSchedulingWindowForTier(tier, baseDate)
  if (candidate < earliest || candidate > latest) return false
  return tier === 'emergency' ? true : isBusinessDay(candidate)
}

export function getValidSchedulingDatesForTier(tier: DispatchTier, baseDate = new Date()) {
  return buildVisibleDatesForTier(tier, baseDate).filter(dateISO => isDateValidForTier(dateISO, tier, baseDate))
}

export function isSlotValidForTier(slot: TimeSlot, tier: DispatchTier, baseDate = new Date()) {
  if (!slot.date || !slot.startTime || !slot.endTime) return false
  if (slot.endTime <= slot.startTime) return false

  if (!isDateValidForTier(slot.date, tier, baseDate)) return false

  const todayISO = toLocalISODate(startOfLocalDay(baseDate))
  if (slot.date !== todayISO) return true

  return slot.startTime >= ceilToNextHalfHour(baseDate)
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'short', month: 'short', day: 'numeric'
  })
}

function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2,'0')} ${ampm}`
}

export function SchedulingPicker({ slots, onChange, max = 3, tier }: SchedulingPickerProps) {
  const resolvedTier: DispatchTier = tier ?? 'priority'
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Partial<TimeSlot>>({})
  const [dateWindowStart, setDateWindowStart] = useState(0)
  const baseDate = useMemo(() => new Date(), [])
  const visibleDates = useMemo(() => buildVisibleDatesForTier(resolvedTier, baseDate), [baseDate, resolvedTier])
  const firstValidDate = useMemo(
    () => visibleDates.find(dateISO => isDateValidForTier(dateISO, resolvedTier, baseDate)) ?? '',
    [baseDate, resolvedTier, visibleDates]
  )
  const firstValidDateIndex = useMemo(
    () => visibleDates.findIndex(dateISO => dateISO === firstValidDate),
    [firstValidDate, visibleDates]
  )
  const clampedWindowStart = useMemo(
    () => Math.min(Math.max(0, dateWindowStart), Math.max(0, visibleDates.length - STANDARD_VISIBLE_DATE_COUNT)),
    [dateWindowStart, visibleDates.length]
  )
  const displayedDates = useMemo(
    () =>
      resolvedTier === 'standard'
        ? visibleDates.slice(clampedWindowStart, clampedWindowStart + STANDARD_VISIBLE_DATE_COUNT)
        : visibleDates,
    [clampedWindowStart, resolvedTier, visibleDates]
  )
  const todayISO = useMemo(() => toLocalISODate(startOfLocalDay(baseDate)), [baseDate])
  const minimumStartTime = useMemo(() => ceilToNextHalfHour(baseDate), [baseDate])
  const selectedDate = draft.date && isDateValidForTier(draft.date, resolvedTier, baseDate) ? draft.date : firstValidDate
  const selectedStartTime =
    draft.startTime && (!selectedDate || selectedDate !== todayISO || draft.startTime >= minimumStartTime)
      ? draft.startTime
      : ''
  const selectedEndTime =
    draft.endTime && selectedStartTime && draft.endTime > selectedStartTime
      ? draft.endTime
      : ''
  const availableStartTimes = useMemo(
    () => TIMES.filter(time => (selectedDate === todayISO ? time >= minimumStartTime : true)),
    [minimumStartTime, selectedDate, todayISO]
  )
  const availableEndTimes = useMemo(
    () => TIMES.filter(time => (!selectedStartTime || time > selectedStartTime) && (selectedDate === todayISO ? time >= minimumStartTime : true)),
    [minimumStartTime, selectedDate, selectedStartTime, todayISO]
  )

  const addSlot = () => {
    if (!selectedDate || !selectedStartTime || !selectedEndTime) return
    const nextSlot = {
      date: selectedDate,
      startTime: selectedStartTime,
      endTime: selectedEndTime,
    }
    if (!isSlotValidForTier(nextSlot, resolvedTier)) return
    onChange([...slots, nextSlot])
    setDraft({})
    setAdding(false)
  }

  const removeSlot = (i: number) => onChange(slots.filter((_, idx) => idx !== i))
  const startAdding = () => {
    const suggestedStart = firstValidDateIndex >= 0 ? Math.max(0, firstValidDateIndex - 2) : 0
    setDateWindowStart(suggestedStart)
    setDraft(current => ({
      date: current.date && isDateValidForTier(current.date, resolvedTier, baseDate) ? current.date : firstValidDate,
      startTime: undefined,
      endTime: undefined,
    }))
    setAdding(true)
  }

  return (
    <div>
      {/* Existing slots */}
      <div className="space-y-2 mb-3">
        {slots.map((slot, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
              isSlotValidForTier(slot, resolvedTier)
                ? 'border border-gray-200 bg-white'
                : 'border border-gray-200 bg-gray-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-flame shrink-0" />
            <div className="flex-1 text-sm">
              <span className="font-bold text-gray-900">{fmtDate(slot.date)}</span>
              <span className="ml-2 text-gray-500">{fmtTime(slot.startTime)} – {fmtTime(slot.endTime)}</span>
              {!isSlotValidForTier(slot, resolvedTier) && (
                <div className="mt-1 text-[11px] font-semibold text-gray-500">Outside the selected urgency window</div>
              )}
            </div>
            <button onClick={() => removeSlot(i)} className="text-gray-400 transition-colors hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Add slot */}
      {adding ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs text-gray-600">
            {resolvedTier === 'standard' && 'Standard dispatch: select a window 5 business days or more out.'}
            {resolvedTier === 'priority' && 'Priority dispatch: select a window 2-3 business days out.'}
            {resolvedTier === 'emergency' && 'Emergency dispatch: only today and tomorrow are available for scheduling.'}
          </div>
          {/* Date */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="label-mono">Date</div>
              {resolvedTier === 'standard' && visibleDates.length > STANDARD_VISIBLE_DATE_COUNT && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDateWindowStart(current => Math.max(0, current - 7))}
                    disabled={clampedWindowStart === 0}
                    className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Show earlier Standard dates"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateWindowStart(current => Math.min(Math.max(0, visibleDates.length - STANDARD_VISIBLE_DATE_COUNT), current + 7))}
                    disabled={clampedWindowStart >= Math.max(0, visibleDates.length - STANDARD_VISIBLE_DATE_COUNT)}
                    className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Show later Standard dates"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {displayedDates.map(d => {
                const isValidDate = isDateValidForTier(d, resolvedTier, baseDate)
                return (
                <button key={d} type="button" disabled={!isValidDate} onClick={() => setDraft(p => ({ ...p, date: d, startTime: undefined, endTime: undefined }))}
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-flame/30 ${
                    selectedDate === d
                      ? 'bg-flame text-white'
                      : isValidDate
                        ? 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
                        : 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-300'
                  }`}>
                  <div>{new Date(d + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short' })}</div>
                  <div className="font-mono">{new Date(d + 'T12:00:00').getDate()}</div>
                </button>
              )})}
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label-mono mb-2">From</div>
              <select value={selectedStartTime} onChange={e => setDraft(p => ({ ...p, startTime: e.target.value, endTime: undefined }))}
                disabled={!selectedDate}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400">
                <option value="">Select…</option>
                {availableStartTimes.map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
              </select>
            </div>
            <div>
              <div className="label-mono mb-2">To</div>
              <select value={selectedEndTime} onChange={e => setDraft(p => ({ ...p, endTime: e.target.value }))}
                disabled={!selectedDate || !selectedStartTime}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400">
                <option value="">Select…</option>
                {availableEndTimes.map(t => (
                  <option key={t} value={t}>{fmtTime(t)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setDraft({}) }}
              className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-flame/20">
              Cancel
            </button>
            <button onClick={addSlot} disabled={!selectedDate || !selectedStartTime || !selectedEndTime}
              className="flex-1 rounded-xl bg-flame py-2.5 text-sm font-bold text-white transition-all hover:bg-flame-light focus:outline-none focus:ring-2 focus:ring-flame/30 disabled:cursor-not-allowed disabled:bg-orange-200 disabled:text-white/80">
              Add Window
            </button>
          </div>
        </div>
      ) : slots.length < max ? (
        <button onClick={startAdding}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white py-3 text-sm text-gray-600 transition-all hover:border-flame/40 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-flame/20">
          <Plus className="w-4 h-4" />
          Add availability window {slots.length > 0 ? `(${slots.length}/${max})` : ''}
        </button>
      ) : (
        <div className="py-2 text-center text-xs text-gray-400">Maximum {max} windows added</div>
      )}
    </div>
  )
}
