'use client'

import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  dark?: boolean
  themed?: boolean
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  dark = false,
  themed = false,
  closeOnBackdrop = true,
  closeOnEscape = true,
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [closeOnEscape, onClose])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-0 bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      {/* Panel */}
      <div
        className={cn(
          'relative z-10 w-full animate-slide-up rounded-t-3xl sm:rounded-2xl shadow-2xl pointer-events-auto',
          sizes[size],
          themed
            ? 'border border-rim bg-panel text-ink shadow-card'
            : dark
            ? 'bg-slate-900 text-white border border-slate-700'
            : 'border border-slate-200 bg-white text-slate-950 shadow-[0_24px_60px_rgba(15,23,42,0.16)]'
        )}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className={cn('w-10 h-1 rounded-full', themed ? 'bg-rim' : dark ? 'bg-slate-600' : 'bg-gray-200')} />
        </div>
        {/* Header */}
        {title && (
          <div className={cn('flex items-center justify-between px-5 py-4 border-b', themed ? 'border-rim/70' : dark ? 'border-slate-700' : 'border-gray-100')}>
            <h2 className="text-lg font-bold">{title}</h2>
            <button
              onClick={onClose}
              className={cn(
                'p-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-flame/30',
                themed ? 'text-muted hover:bg-raised hover:text-ink' : dark ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            className={cn(
              'absolute top-4 right-4 z-10 rounded-xl p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-flame/30',
              themed ? 'text-muted hover:bg-raised hover:text-ink' : dark ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {/* Body */}
        <div className="overflow-y-auto max-h-[80vh] p-5">
          {children}
        </div>
      </div>
    </div>
  )
}
