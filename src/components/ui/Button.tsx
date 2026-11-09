import React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none disabled:active:scale-100'

  const variants = {
    primary: 'bg-safety-orange text-white hover:bg-orange-600 focus:ring-safety-orange shadow-lg shadow-orange-500/25',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    success: 'bg-success-green text-white hover:bg-emerald-600 focus:ring-success-green shadow-lg shadow-emerald-500/25',
    danger: 'bg-fail-red text-white hover:bg-red-600 focus:ring-fail-red shadow-lg shadow-red-500/25',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-300 dark:text-slate-200 dark:hover:bg-slate-800',
    outline: 'border-2 border-safety-orange text-safety-orange bg-transparent hover:bg-safety-orange hover:text-white focus:ring-safety-orange dark:hover:bg-safety-orange dark:hover:text-white',
  }

  const sizes = {
    sm: 'text-sm px-3 py-2 min-h-[36px] gap-1.5',
    md: 'text-sm px-4 py-2.5 min-h-[44px] gap-2',
    lg: 'text-base px-6 py-3 min-h-[52px] gap-2',
    xl: 'text-lg px-8 py-4 min-h-[60px] gap-3',
  }

  return (
    <button
      className={cn(
        base,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
