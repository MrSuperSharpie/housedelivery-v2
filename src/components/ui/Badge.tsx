import React from 'react'
import { cn } from '@/lib/utils'
import type { InspectionStatus, DispatchTier, EscrowStatus } from '@/lib/types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'fail' | 'warning' | 'info' | 'orange' | 'dark' | 'statusSuccess' | 'statusFail' | 'statusPending'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  const variants = {
    default: 'border border-slate-300 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/8 dark:text-muted',
    success: 'bg-success-green/10 text-success-green border border-success-green/20',
    fail: 'bg-fail-red/10 text-fail-red border border-fail-red/20',
    warning: 'bg-warning-amber/10 text-warning-amber border border-warning-amber/20',
    info: 'bg-electric/10 text-electric border border-electric/20',
    orange: 'bg-flame/10 text-flame border border-flame/20',
    dark: 'border border-rim bg-surface text-ink',
    statusSuccess: 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
    statusFail: 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30',
    statusPending: 'bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600',
  }

  const sizes = {
    sm: 'text-xs px-2 py-0.5 rounded-md font-medium',
    md: 'text-sm px-2.5 py-1 rounded-lg font-semibold',
  }

  return (
    <span className={cn('inline-flex items-center gap-1', variants[variant], sizes[size], className)}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: InspectionStatus }) {
  const config: Record<InspectionStatus, { label: string; variant: BadgeProps['variant']; dot: string }> = {
    // ── Job-lifecycle states ──────────────────────────────────────────────────
    pending_validation:     { label: 'Pending Validation',    variant: 'statusPending', dot: 'bg-slate-500 dark:bg-slate-300 animate-pulse' },
    live:                   { label: 'Live — Claimable',       variant: 'info',    dot: 'bg-electric' },
    provisionally_assigned: { label: 'Provisional Assignment', variant: 'info',    dot: 'bg-electric animate-pulse' },
    confirmed:              { label: 'Confirmed',              variant: 'statusSuccess', dot: 'bg-emerald-600 dark:bg-emerald-300' },
    in_progress:            { label: 'In Progress',            variant: 'info',    dot: 'bg-blue-400 animate-pulse' },
    on_hold:                { label: 'On Hold',                variant: 'statusPending', dot: 'bg-slate-500 dark:bg-slate-300' },
    completed:              { label: 'Completed',              variant: 'statusSuccess', dot: 'bg-emerald-600 dark:bg-emerald-300' },
    cancelled:              { label: 'Cancelled',              variant: 'dark',    dot: 'bg-white/30' },
    disputed:               { label: 'Disputed',               variant: 'statusFail',    dot: 'bg-rose-600 dark:bg-rose-300 animate-pulse' },
    stopped:                { label: 'Stopped',                variant: 'statusFail',    dot: 'bg-rose-600 dark:bg-rose-300' },
    // ── Stage-level states ────────────────────────────────────────────────────
    pending:                { label: 'Pending',                variant: 'statusPending', dot: 'bg-slate-500 dark:bg-slate-300' },
    pass:                   { label: 'Pass',                   variant: 'statusSuccess', dot: 'bg-emerald-600 dark:bg-emerald-300' },
    fail:                   { label: 'Fail',                   variant: 'statusFail',    dot: 'bg-rose-600 dark:bg-rose-300' },
    awaiting_reinspection:  { label: 'Awaiting Re-inspection', variant: 'statusPending', dot: 'bg-slate-500 dark:bg-slate-300 animate-pulse' },
  }

  const { label, variant, dot } = config[status]

  return (
    <Badge variant={variant} size="sm">
      <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
      {label}
    </Badge>
  )
}

export function PaymentStatusBadge({ status }: { status: EscrowStatus }) {
  const config: Record<EscrowStatus, { label: string; variant: BadgeProps['variant']; dot: string }> = {
    authorized:            { label: 'Authorized',            variant: 'info',    dot: 'bg-electric' },
    held:                  { label: 'Held in Escrow',        variant: 'statusPending', dot: 'bg-slate-500 dark:bg-slate-300' },
    reserved:              { label: 'Reserved',              variant: 'info',    dot: 'bg-blue-400' },
    earned_pending_review: { label: 'Earned — Pending Review', variant: 'statusPending', dot: 'bg-slate-500 dark:bg-slate-300 animate-pulse' },
    payout_ready:          { label: 'Payout Ready',          variant: 'statusSuccess', dot: 'bg-emerald-600 dark:bg-emerald-300 animate-pulse' },
    released:              { label: 'Released',              variant: 'statusSuccess', dot: 'bg-emerald-600 dark:bg-emerald-300' },
    refunded:              { label: 'Refunded',              variant: 'default', dot: 'bg-white/40' },
    disputed:              { label: 'Disputed',              variant: 'statusFail',    dot: 'bg-rose-600 dark:bg-rose-300 animate-pulse' },
    blocked:               { label: 'Blocked',               variant: 'statusFail',    dot: 'bg-rose-600 dark:bg-rose-300' },
  }
  const { label, variant, dot } = config[status]
  return (
    <Badge variant={variant} size="sm">
      <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
      {label}
    </Badge>
  )
}

export function TierBadge({ tier }: { tier: DispatchTier }) {
  const config: Record<DispatchTier, { label: string; variant: BadgeProps['variant'] }> = {
    standard: { label: 'Standard', variant: 'default' },
    priority: { label: 'Priority', variant: 'warning' },
    emergency: { label: 'Emergency', variant: 'fail' },
  }

  const { label, variant } = config[tier]
  return <Badge variant={variant} size="sm">{label}</Badge>
}
