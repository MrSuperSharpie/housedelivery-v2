'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, Bell, ChevronDown, LogOut, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { BrandWordmark } from '@/components/shared/Navbar'

export interface DashboardTopbarAction {
  label: string
  onClick?: () => void
  href?: string
  icon?: LucideIcon
}

export interface DashboardTopbarProps {
  role: 'builder' | 'inspector'
  primaryAction?: DashboardTopbarAction
  secondaryAction?: DashboardTopbarAction
}

interface DashboardTopbarInternalProps extends DashboardTopbarProps {
  onOpenNav: () => void
}

function ActionButton({ action, variant }: { action: DashboardTopbarAction; variant: 'primary' | 'secondary' }) {
  const Icon = action.icon
  const cls =
    variant === 'primary'
      ? 'bg-flame text-white hover:bg-flame-light'
      : 'border border-rim bg-panel text-ink hover:border-rim hover:bg-raised'
  const content = (
    <>
      {Icon && <Icon className="h-4 w-4" />}
      <span className="hidden sm:inline">{action.label}</span>
    </>
  )
  const shared = `inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-flame/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${cls}`
  if (action.href) {
    return (
      <Link href={action.href} className={shared} aria-label={action.label}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" onClick={action.onClick} className={shared} aria-label={action.label}>
      {content}
    </button>
  )
}

export function DashboardTopbar({ role, primaryAction, secondaryAction, onOpenNav }: DashboardTopbarInternalProps) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [userOpen, setUserOpen] = useState(false)

  const displayName = user?.name ?? (role === 'builder' ? 'Wyatt Davis' : 'Dr. Sarah Chen')
  const displayAvatar = user?.avatar ?? (role === 'builder' ? 'WD' : 'SC')
  const displayLogoUrl = user?.logoUrl
  const profileHref = role === 'builder' ? '/builder/profile' : '/inspector/profile'

  const handleLogout = () => {
    logout()
    setUserOpen(false)
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-rim/70 bg-surface/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1680px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rim/70 bg-panel text-muted transition-colors hover:bg-raised hover:text-ink lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <BrandWordmark href={role === 'builder' ? '/builder' : '/inspector'} height={30} priority />

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          {secondaryAction && <ActionButton action={secondaryAction} variant="secondary" />}
          {primaryAction && <ActionButton action={primaryAction} variant="primary" />}

          <ThemeToggle compact className="px-2.5 py-2" />

          <button
            type="button"
            aria-label="Notifications"
            className="rounded-lg p-2 text-muted transition-colors hover:bg-raised hover:text-ink"
          >
            <Bell className="h-4 w-4" />
          </button>

          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setUserOpen(open => !open)}
              aria-haspopup="menu"
              aria-expanded={userOpen}
              className="flex items-center gap-2 rounded-xl py-1.5 pl-2 pr-3 text-xs font-semibold text-muted transition-colors hover:bg-raised hover:text-ink"
            >
              <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-flame text-[10px] font-black text-white">
                {displayLogoUrl ? (
                  <Image src={displayLogoUrl} alt={`${displayName} logo`} width={24} height={24} className="h-full w-full object-cover" unoptimized />
                ) : (
                  displayAvatar
                )}
              </span>
              <span className="max-w-[120px] truncate">{displayName}</span>
              <ChevronDown className={`h-3 w-3 opacity-40 transition-transform ${userOpen ? 'rotate-180' : ''}`} />
            </button>
            {userOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-rim/70 bg-panel shadow-card-lg" role="menu">
                <Link
                  href={profileHref}
                  onClick={() => setUserOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-xs font-semibold text-muted transition-colors hover:bg-raised hover:text-ink"
                  role="menuitem"
                >
                  <User className="h-3.5 w-3.5" /> View Profile
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-xs font-semibold text-fail-red transition-colors hover:bg-fail-red/10"
                  role="menuitem"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
