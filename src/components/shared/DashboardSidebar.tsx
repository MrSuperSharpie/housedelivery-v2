'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

// A dashboard sidebar item is either a real route link or an in-page section
// anchor that smooth-scrolls. Section items get scroll-spy active state; route
// items light up on pathname match. This keeps navigation honest — every item
// points at a real destination, never a fake page.
export type DashboardNavItem = {
  id: string
  label: string
  icon?: LucideIcon
  badge?: number | string | null
  available?: boolean
} & (
  | { kind: 'route'; href: string; targetId?: never }
  | { kind: 'section'; targetId: string; href?: never }
)

export interface DashboardNavGroup {
  label: string
  items: DashboardNavItem[]
}

interface DashboardSidebarProps {
  brandEyebrow: string
  brandTitle: string
  groups: DashboardNavGroup[]
  /** Called after any navigation — used to close the mobile drawer. */
  onNavigate?: () => void
}

export function DashboardSidebar({ brandEyebrow, brandTitle, groups, onNavigate }: DashboardSidebarProps) {
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState<string | null>(null)

  // Scroll-spy over the section anchors that actually exist on the page.
  const sectionIds = groups
    .flatMap(group => group.items)
    .filter((item): item is Extract<DashboardNavItem, { kind: 'section' }> =>
      item.kind === 'section' && item.available !== false)
    .map(item => item.targetId)
  const sectionKey = sectionIds.join('|')

  useEffect(() => {
    const ids = sectionKey ? sectionKey.split('|') : []
    if (ids.length === 0) return
    const elements = ids
      .map(id => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    if (elements.length === 0) return

    const ratios = new Map<string, number>()
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
        }
        const current = ids.find(id => (ratios.get(id) ?? 0) > 0)
        if (current) setActiveSection(current)
      },
      { rootMargin: '-96px 0px -55% 0px', threshold: [0, 0.25, 0.6, 1] },
    )
    elements.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [sectionKey])

  const handleSection = (targetId: string) => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(targetId)
    onNavigate?.()
  }

  const itemClass = (active: boolean) =>
    `group relative flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-flame/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
      active
        ? 'border-flame/30 bg-flame/10 text-flame'
        : 'border-transparent text-muted hover:bg-raised hover:text-ink'
    }`

  const renderInner = (item: DashboardNavItem, active: boolean) => {
    const Icon = item.icon
    const showBadge = item.badge != null && item.badge !== 0
    return (
      <>
        <span
          aria-hidden
          className={`absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full transition-colors ${
            active ? 'bg-flame' : 'bg-transparent'
          }`}
        />
        {Icon && <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-flame' : 'text-subtle group-hover:text-ink'}`} />}
        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        {showBadge && (
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums ${
              active ? 'bg-flame/15 text-flame' : 'bg-raised text-subtle'
            }`}
          >
            {item.badge}
          </span>
        )}
      </>
    )
  }

  return (
    <nav className="flex h-full flex-col" aria-label={`${brandEyebrow} navigation`}>
      <div className="border-b border-rim/60 px-4 pb-4 pt-5">
        <div className="rounded-2xl border border-rim/70 bg-raised px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-flame">{brandEyebrow}</div>
          <div className="mt-1 truncate text-sm font-black tracking-tight text-ink">{brandTitle}</div>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {groups.map(group => {
          const items = group.items.filter(item => item.available !== false)
          if (items.length === 0) return null
          return (
            <div key={group.label}>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-subtle">
                {group.label}
              </div>
              <div className="space-y-1">
                {items.map(item => {
                  if (item.kind === 'route') {
                    const active = pathname === item.href
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? 'page' : undefined}
                        className={itemClass(active)}
                      >
                        {renderInner(item, active)}
                      </Link>
                    )
                  }
                  const active = activeSection === item.targetId
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSection(item.targetId)}
                      aria-current={active ? 'true' : undefined}
                      className={itemClass(active)}
                    >
                      {renderInner(item, active)}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </nav>
  )
}
