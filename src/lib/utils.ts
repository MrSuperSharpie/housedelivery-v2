import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { DispatchTier } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Vancouver',
  }).format(new Date(iso))
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Conditional calendar / checklist unlock (Emergency bypass) ─────────────

/** Add N business days to a date (no weekend advance). */
function addBusinessDays(date: Date, days: number): Date {
  const d = new Date(date)
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) added += 1
  }
  return d
}

/**
 * When the stage checklist is unlocked for city staff.
 * Emergency: immediately (same as requestedAt). Priority: +2 business days. Standard: +5 business days.
 */
export function getChecklistUnlockedAt(tier: DispatchTier, requestedAt: string): string {
  const requested = new Date(requestedAt)
  if (tier === 'emergency') return requested.toISOString()
  if (tier === 'priority') return addBusinessDays(requested, 2).toISOString()
  return addBusinessDays(requested, 5).toISOString()
}

/** True if the checklist is already unlocked for city staff (unlock time is in the past or now). */
export function isChecklistUnlocked(unlockedAt: string | undefined): boolean {
  if (!unlockedAt) return false
  return new Date(unlockedAt).getTime() <= Date.now()
}
