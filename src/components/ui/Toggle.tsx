'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  sublabel?: string
  disabled?: boolean
  color?: 'orange' | 'green'
  dark?: boolean
}

export function Toggle({ checked, onChange, label, sublabel, disabled, color = 'orange', dark }: ToggleProps) {
  const trackOn = color === 'orange' ? 'bg-safety-orange' : 'bg-success-green'

  return (
    <label className={cn('flex items-center gap-3 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
      <div className="flex-1">
        {label && (
          <div className={cn('text-sm font-semibold', dark ? 'text-white' : 'text-gray-900')}>{label}</div>
        )}
        {sublabel && (
          <div className={cn('text-xs mt-0.5', dark ? 'text-slate-400' : 'text-gray-500')}>{sublabel}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
          checked ? trackOn : (dark ? 'bg-slate-600' : 'bg-gray-200'),
          color === 'orange' ? 'focus:ring-safety-orange' : 'focus:ring-success-green',
          dark && 'focus:ring-offset-slate-900'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 mt-1',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </label>
  )
}
