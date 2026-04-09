'use client'

import React from 'react'
import { Moon, SunMedium } from 'lucide-react'
import { useTheme } from '@/lib/theme'

interface ThemeToggleProps {
  compact?: boolean
  className?: string
}

export function ThemeToggle({ compact = false, className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      className={`inline-flex items-center gap-2 rounded-xl border border-white/10 bg-panel px-3 py-2 text-xs font-semibold text-muted transition-all hover:border-white/15 hover:bg-raised hover:text-ink ${className}`}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-flame/15 text-flame">
        {isLight ? <Moon className="h-3.5 w-3.5" /> : <SunMedium className="h-3.5 w-3.5" />}
      </span>
      {!compact && <span>{isLight ? 'Dark Mode' : 'Light Mode'}</span>}
    </button>
  )
}
