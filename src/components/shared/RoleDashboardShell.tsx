'use client'

import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { DashboardSidebar, type DashboardNavGroup } from '@/components/shared/DashboardSidebar'
import { DashboardTopbar, type DashboardTopbarProps } from '@/components/shared/DashboardTopbar'

interface RoleDashboardShellProps {
  /** Small uppercase label above the sidebar/company name, e.g. "Builder Operations". */
  brandEyebrow: string
  /** Primary title in the sidebar header — typically the company / inspector name. */
  brandTitle: string
  navGroups: DashboardNavGroup[]
  topbar: DashboardTopbarProps
  children: React.ReactNode
}

/**
 * Role operations-console shell: a persistent left sidebar on desktop, a sticky
 * top operational bar, and a content region. On smaller screens the sidebar
 * collapses into an accessible drawer (overlay + Escape + body scroll lock),
 * mirroring the Admin Control Plane shell but built on the theme-aware Vero
 * tokens so it respects the light/dark toggle the builder and inspector use.
 */
export function RoleDashboardShell({ brandEyebrow, brandTitle, navGroups, topbar, children }: RoleDashboardShellProps) {
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

  return (
    <div className="app-theme-scope min-h-screen bg-surface text-ink">
      <DashboardTopbar {...topbar} onOpenNav={() => setMobileOpen(true)} />

      <div className="mx-auto flex w-full max-w-[1680px] lg:px-4">
        {/* Persistent desktop sidebar */}
        <aside className="hidden lg:block lg:w-[17rem] lg:shrink-0 lg:px-4 lg:py-5" aria-label={`${brandEyebrow} navigation`}>
          <div className="sticky top-[5rem] h-[calc(100vh-6rem)] overflow-hidden rounded-3xl border border-rim/70 bg-panel shadow-sm">
            <DashboardSidebar brandEyebrow={brandEyebrow} brandTitle={brandTitle} groups={navGroups} />
          </div>
        </aside>

        {/* Mobile / tablet drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <aside
              className="relative flex h-full w-[min(86vw,20rem)] max-w-full flex-col border-r border-rim/70 bg-panel shadow-card-lg"
              aria-label={`${brandEyebrow} navigation`}
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-rim/70 bg-raised text-muted transition-colors hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
              <DashboardSidebar
                brandEyebrow={brandEyebrow}
                brandTitle={brandTitle}
                groups={navGroups}
                onNavigate={() => setMobileOpen(false)}
              />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
