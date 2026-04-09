'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { HardHat, Menu, X, Bell, ChevronDown, LogOut, User } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

interface NavbarProps {
  dark?: boolean
  role?: 'builder' | 'inspector' | 'auditor' | 'landing'
}

const NAV_LINKS = {
  builder:  [
    { href: '/builder',          label: 'Dashboard' },
    { href: '/builder/dispatch', label: 'New Request' },
    { href: '/vault',            label: 'Vault' },
  ],
  inspector: [
    { href: '/inspector',         label: 'Live Board' },
    { href: '/vault',             label: 'Vault' },
    { href: '/inspector/profile', label: 'Profile' },
  ],
  auditor: [
    { href: '/auditor',          label: 'Inspection Vault' },
    { href: '/vault',            label: 'Vault' },
  ],
  landing: [],
}

export function Navbar({ role = 'landing' }: NavbarProps) {
  const [open, setOpen]   = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const pathname          = usePathname()
  const router            = useRouter()
  const { user, logout }  = useAuth()
  const links             = NAV_LINKS[role]

  const handleLogout = () => {
    logout()
    setUserOpen(false)
    router.push('/')
  }

  const displayName = user?.name ?? (
    role === 'builder'   ? 'Wyatt Davis' :
    role === 'inspector' ? 'Dr. Sarah Chen' : 'City Auditor'
  )
  const displayAvatar = user?.avatar ?? (
    role === 'builder'   ? 'WD' :
    role === 'inspector' ? 'SC' : 'CA'
  )
  const displayLogoUrl = role === 'builder' || role === 'inspector' ? user?.logoUrl : undefined
  const profileHref = role === 'builder' ? '/builder/profile' :
                      role === 'inspector' ? '/inspector/profile' : '/auditor'

  return (
    <nav className="sticky top-0 z-40 border-b border-white/5 bg-surface/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-flame flex items-center justify-center">
              <HardHat className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-black text-ink tracking-tight">
              Site<span className="text-flame">Line</span>
            </span>
          </Link>

          {/* Desktop nav */}
          {links.length > 0 && (
            <div className="hidden md:flex items-center gap-1">
              {links.map(l => (
                <Link key={l.href + l.label} href={l.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    pathname === l.href
                      ? 'bg-flame/10 text-flame'
                      : 'text-muted hover:text-ink hover:bg-raised'
                  }`}>
                  {l.label}
                </Link>
              ))}
            </div>
          )}

          {/* Right */}
          <div className="flex items-center gap-2">
            <ThemeToggle compact className="px-2.5 py-2" />

            {role !== 'landing' && (
              <button className="p-2 rounded-lg text-muted hover:text-ink hover:bg-raised transition-all">
                <Bell className="w-4 h-4" />
              </button>
            )}

            {role === 'landing' ? (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/sign-in"
                  className="text-xs font-semibold text-muted hover:text-ink px-3 py-2 rounded-lg hover:bg-raised transition-all">
                  Sign In
                </Link>
                <Link href="/inspector/signup"
                  className="text-xs font-semibold text-muted hover:text-ink px-3 py-2 rounded-lg border border-white/8 hover:border-white/15 transition-all">
                  Join as Inspector
                </Link>
                <Link href="/get-started"
                  className="text-xs font-bold bg-flame text-white px-4 py-2 rounded-xl hover:bg-flame-light transition-all">
                  Get Started
                </Link>
              </div>
            ) : (
              <div className="hidden md:block relative">
                <button
                  onClick={() => setUserOpen(o => !o)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl text-xs font-semibold text-muted hover:text-ink hover:bg-raised transition-all"
                >
                  <div className="w-6 h-6 rounded-full bg-flame flex items-center justify-center text-white text-[10px] font-black overflow-hidden">
                    {displayLogoUrl ? (
                      <Image src={displayLogoUrl} alt={`${displayName} logo`} width={24} height={24} className="h-full w-full object-cover" unoptimized />
                    ) : (
                      displayAvatar
                    )}
                  </div>
                  <span className="max-w-[120px] truncate">{displayName}</span>
                  <ChevronDown className={`w-3 h-3 opacity-40 transition-transform ${userOpen ? 'rotate-180' : ''}`} />
                </button>
                {userOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-panel border border-white/10 rounded-xl shadow-card-lg overflow-hidden z-50">
                    <Link href={profileHref} onClick={() => setUserOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-xs font-semibold text-muted hover:text-ink hover:bg-raised transition-all">
                      <User className="w-3.5 h-3.5" /> View Profile
                    </Link>
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-semibold text-fail-red hover:bg-fail-red/10 transition-all">
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}

            <button onClick={() => setOpen(!open)}
              className="md:hidden p-2 rounded-lg text-muted hover:text-ink hover:bg-raised transition-all">
              {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/5 bg-panel">
          <div className="px-4 py-3 space-y-1">
            <div className="pb-2">
              <ThemeToggle className="w-full justify-center" />
            </div>
            {links.map(l => (
              <Link key={l.href + l.label} href={l.href} onClick={() => setOpen(false)}
                className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  pathname === l.href ? 'bg-flame/10 text-flame' : 'text-muted hover:text-ink hover:bg-raised'
                }`}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
