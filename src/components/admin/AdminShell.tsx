'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, HardHat, Briefcase, FileCheck,
  PauseCircle, Package, DollarSign, ShieldAlert, ScrollText,
  Settings, Menu, X, ChevronRight, Shield,
} from 'lucide-react'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

export const ADMIN_NAV = [
  { href: '/admin',             label: 'Control Plane',  icon: LayoutDashboard, badge: null },
  { href: '/admin/builders',    label: 'Builders',       icon: Building2,       badge: 3 },
  { href: '/admin/inspectors',  label: 'Inspectors',     icon: HardHat,         badge: 2 },
  { href: '/admin/jobs',        label: 'Jobs',           icon: Briefcase,       badge: null },
  { href: '/admin/submissions', label: 'Submissions',    icon: FileCheck,       badge: 4 },
  { href: '/admin/holds',       label: 'Holds',          icon: PauseCircle,     badge: 1 },
  { href: '/admin/packages',    label: 'Packages',       icon: Package,         badge: 2 },
  { href: '/admin/payments',    label: 'Payments',       icon: DollarSign,      badge: null },
  { href: '/admin/disputes',    label: 'Disputes',       icon: ShieldAlert,     badge: 1 },
  { href: '/admin/audit',       label: 'Audit Log',      icon: ScrollText,      badge: null },
  { href: '/admin/settings',    label: 'Settings',       icon: Settings,        badge: null },
]

export function AdminShell({ children, title, subtitle }: {
  children: React.ReactNode
  title: string
  subtitle?: string
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!mobileOpen) return

    const originalOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileOpen])

  const sidebarContent = (
    <nav className="flex h-full flex-col">
      <div className="border-b border-white/8 px-5 pb-4 pt-5">
        <Link href="/admin" className="admin-shell-brand-card group block rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,95,21,0.14),rgba(56,189,248,0.08))] p-4 transition-all hover:border-flame/30 hover:bg-[linear-gradient(145deg,rgba(255,95,21,0.18),rgba(56,189,248,0.12))]">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-flame/30 bg-flame/15 text-flame shadow-[0_0_28px_rgba(255,95,21,0.14)]">
              <Shield className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-flame/90">
                Internal workspace
              </div>
              <div className="mt-1 text-base font-black tracking-[-0.04em] text-ink">
                Vero Admin
              </div>
              <p className="mt-1 text-xs leading-5 text-muted">
                Review queues, approvals, and operational health from one control surface.
              </p>
            </div>
          </div>
        </Link>
      </div>

      <div className="px-4 pt-4">
        <div className="px-3 text-[10px] font-bold uppercase tracking-[0.28em] text-subtle">
          Operations
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6 pt-3">
        {ADMIN_NAV.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`))

          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`admin-shell-nav-item group relative mb-1.5 flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-all duration-200 ${
                active
                  ? 'admin-shell-nav-item-active border-flame/35 bg-[linear-gradient(135deg,rgba(255,95,21,0.18),rgba(56,189,248,0.10))] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_32px_rgba(0,0,0,0.2)]'
                  : 'border-transparent text-muted hover:border-white/10 hover:bg-white/5 hover:text-ink'
              }`}
            >
              <span className={`absolute left-1.5 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full transition-all ${
                active ? 'bg-flame shadow-[0_0_14px_rgba(255,95,21,0.65)]' : 'bg-transparent'
              }`} />

              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all ${
                active
                  ? 'border-flame/35 bg-flame/20 text-flame shadow-[0_10px_22px_rgba(255,95,21,0.16)]'
                  : 'border-white/8 bg-white/5 text-subtle group-hover:border-white/15 group-hover:text-ink'
              }`}>
                <Icon className={`${active ? 'h-[1.05rem] w-[1.05rem]' : 'h-4 w-4'}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className={`truncate text-sm font-semibold tracking-[-0.02em] ${
                  active ? 'font-bold text-ink' : 'text-muted group-hover:text-ink'
                }`}>
                  {label}
                </div>
                <div className={`mt-0.5 text-[11px] ${
                  active ? 'font-semibold text-flame/95' : 'text-subtle'
                }`}>
                  {active ? 'Current workspace' : 'Open section'}
                </div>
              </div>

              {badge !== null && (
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide transition-all ${
                  active
                    ? 'border border-flame/25 bg-flame/15 text-flame'
                    : 'border border-white/10 bg-white/5 text-muted group-hover:text-ink'
                }`}>
                  {badge}
                </span>
              )}

              <ChevronRight className={`h-4 w-4 shrink-0 transition-all ${
                active ? 'translate-x-0 text-flame opacity-90' : 'text-subtle opacity-0 group-hover:translate-x-0.5 group-hover:opacity-60'
              }`} />
            </Link>
          )
        })}
      </div>

      <div className="border-t border-white/8 px-4 py-4">
        <div className="admin-shell-meta-card rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-subtle">
            <span className="h-2 w-2 rounded-full bg-success-green shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
            Admin surface
          </div>
          <div className="mt-1 text-xs leading-5 text-muted">
            Internal operations only. Review carefully before approving changes.
          </div>
        </div>
      </div>
    </nav>
  )

  return (
    <div className="admin-page-backdrop relative min-h-screen overflow-x-hidden bg-surface text-ink">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute left-[-12rem] top-[-10rem] h-[28rem] w-[28rem] rounded-full bg-flame/10 blur-3xl" />
        <div className="absolute right-[-10rem] top-20 h-[24rem] w-[24rem] rounded-full bg-electric/8 blur-3xl" />
      </div>

      <header className="admin-shell-header sticky top-0 z-40 border-b border-white/8 bg-surface/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-[1680px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open admin navigation"
            aria-expanded={mobileOpen}
            aria-controls="admin-navigation-drawer"
            className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted transition-all hover:border-white/15 hover:bg-white/8 hover:text-ink"
          >
            <Menu className="h-4 w-4" />
          </button>

          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-flame/30 bg-flame/15 text-flame shadow-[0_0_24px_rgba(255,95,21,0.14)]">
              <Shield className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-black tracking-[-0.04em] text-ink">
                Site<span className="text-flame">Line</span> Admin
              </div>
              <div className="truncate text-[10px] font-bold uppercase tracking-[0.24em] text-subtle">
                Internal control plane
              </div>
            </div>
          </Link>

          <div className="admin-shell-pill hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-flame shadow-[0_0_10px_rgba(255,95,21,0.8)]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-subtle">
              Internal only
            </span>
          </div>

          <div className="flex-1" />

          <Link
            href="/"
            className="admin-shell-pill hidden items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-muted transition-all hover:border-white/15 hover:bg-white/8 hover:text-ink sm:inline-flex"
          >
            Exit admin
          </Link>

          <ThemeToggle compact className="admin-shell-pill border border-white/10 bg-white/5 px-2.5 py-2 hover:bg-white/8" />
        </div>
      </header>

      <div className="relative z-10 mx-auto flex max-w-[1680px] lg:px-4">
        <aside className="hidden lg:block lg:w-[18rem] lg:shrink-0 lg:px-4 lg:py-4" aria-label="Admin navigation">
          <div className="admin-shell-sidebar sticky top-20 h-[calc(100vh-6rem)] overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,23,39,0.92),rgba(7,16,28,0.94))] shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            {sidebarContent}
          </div>
        </aside>

        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />

            <aside
              id="admin-navigation-drawer"
              className="admin-shell-sidebar relative flex h-full w-[min(86vw,22rem)] max-w-full flex-col border-r border-white/10 bg-[linear-gradient(180deg,rgba(14,23,39,0.98),rgba(7,16,28,0.98))] shadow-[0_30px_80px_rgba(0,0,0,0.48)]"
            >
              <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close admin navigation"
                className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted transition-all hover:border-white/15 hover:bg-white/8 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
              {sidebarContent}
            </aside>
          </div>
        )}

        <main className="relative z-10 flex-1 min-w-0 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto max-w-[1320px]">
            <div className="admin-shell-hero relative z-10 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(22,33,51,0.7),rgba(14,23,39,0.92))] px-5 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)] sm:px-6 sm:py-6 lg:px-7 lg:py-7">
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="pointer-events-none absolute -right-10 top-0 h-28 w-28 rounded-full bg-flame/12 blur-3xl" />
              <div className="admin-section-label text-[10px] font-bold uppercase tracking-[0.32em] text-subtle">
                Admin workspace
              </div>
              <h1 className="mt-2 max-w-4xl text-[1.9rem] font-black tracking-[-0.05em] text-ink sm:text-[2.25rem]">
                {title}
              </h1>
              {subtitle && (
                <p className="admin-body-strong mt-3 max-w-3xl text-sm leading-6 text-muted sm:text-[15px]">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="admin-shell-main-panel relative z-10 mt-5 overflow-visible rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(14,23,39,0.78),rgba(14,23,39,0.6))] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)] sm:p-5 lg:p-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export function StatCard({ label, value, sub, color = 'text-ink' }: {
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className="admin-stat-card relative overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(22,33,51,0.68),rgba(14,23,39,0.94))] p-4 shadow-[0_16px_36px_rgba(0,0,0,0.2)] sm:p-5">
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-subtle">
        {label}
      </div>
      <div className={`mt-3 text-[1.9rem] font-black tracking-[-0.05em] ${color}`}>
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-xs leading-5 text-muted">
          {sub}
        </div>
      )}
    </div>
  )
}

export function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    approved:     'bg-success-green/15 text-success-green border-success-green/25',
    active:       'bg-success-green/15 text-success-green border-success-green/25',
    open:         'bg-success-green/15 text-success-green border-success-green/25',
    submitted:    'bg-electric/15 text-electric border-electric/25',
    under_review: 'bg-warning-amber/15 text-warning-amber border-warning-amber/25',
    pending:      'bg-warning-amber/15 text-warning-amber border-warning-amber/25',
    needs_info:   'bg-warning-amber/15 text-warning-amber border-warning-amber/25',
    escrowed:     'bg-electric/15 text-electric border-electric/25',
    sealed:       'bg-electric/15 text-electric border-electric/25',
    rejected:     'bg-fail-red/15 text-fail-red border-fail-red/25',
    suspended:    'bg-fail-red/15 text-fail-red border-fail-red/25',
    closed:       'bg-white/5 text-muted border-white/10',
    resolved:     'bg-white/5 text-muted border-white/10',
    draft:        'bg-white/5 text-subtle border-white/8',
    cancelled:    'bg-white/5 text-muted border-white/10',
    paid_out:               'bg-success-green/15 text-success-green border-success-green/25',
    refunded:               'bg-warning-amber/15 text-warning-amber border-warning-amber/25',
    provisionally_assigned: 'bg-electric/15 text-electric border-electric/25',
    confirmed:              'bg-success-green/15 text-success-green border-success-green/25',
    assigned:               'bg-electric/15 text-electric border-electric/25',
    in_progress:            'bg-flame/15 text-flame border-flame/25',
    disputed:               'bg-fail-red/15 text-fail-red border-fail-red/25',
    completed:              'bg-success-green/15 text-success-green border-success-green/25',
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${cfg[status] ?? 'bg-white/5 text-muted border-white/8'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export function ActionButton({ onClick, variant = 'default', children, disabled }: {
  onClick?: () => void
  variant?: 'approve' | 'reject' | 'warn' | 'default' | 'ghost'
  children: React.ReactNode
  disabled?: boolean
}) {
  const cls = {
    approve: 'bg-success-green/15 border-success-green/30 text-success-green hover:bg-success-green/25',
    reject:  'bg-fail-red/15 border-fail-red/30 text-fail-red hover:bg-fail-red/25',
    warn:    'bg-warning-amber/15 border-warning-amber/30 text-warning-amber hover:bg-warning-amber/25',
    default: 'bg-flame/15 border-flame/30 text-flame hover:bg-flame/25',
    ghost:   'bg-white/5 border-white/10 text-muted hover:bg-white/10 hover:text-ink',
  }[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[11px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  )
}
