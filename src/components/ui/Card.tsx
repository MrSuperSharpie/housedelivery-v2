import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
  dark?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ children, className, onClick, hoverable = false, dark = false, padding = 'md' }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-6 sm:p-8',
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl transition-all duration-200',
        dark
          ? 'bg-slate-900 border border-slate-700 text-white'
          : 'bg-white border border-gray-100 shadow-sm',
        hoverable && (dark
          ? 'cursor-pointer hover:border-slate-500 hover:shadow-lg hover:shadow-slate-900/50'
          : 'cursor-pointer hover:shadow-md hover:border-gray-200'),
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex items-start justify-between gap-4 mb-4', className)}>{children}</div>
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('font-bold text-lg leading-tight', className)}>{children}</h3>
}
