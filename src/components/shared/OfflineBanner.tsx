'use client'

import React from 'react'
import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OfflineBannerProps {
  isOnline: boolean
  pendingCount: number
  isSyncing: boolean
  onSync?: () => void
}

export function OfflineBanner({ isOnline, pendingCount, isSyncing, onSync }: OfflineBannerProps) {
  if (isOnline && pendingCount === 0) return null

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-safety-orange text-white px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span className="text-sm font-bold">OFFLINE MODE</span>
          {pendingCount > 0 && (
            <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">
              {pendingCount} action{pendingCount !== 1 ? 's' : ''} queued for sync
            </span>
          )}
        </div>
        <span className="text-xs opacity-75">Will sync on reconnect</span>
      </div>
    )
  }

  // Online but still syncing
  if (pendingCount > 0) {
    return (
      <div className={cn(
        'fixed top-0 left-0 right-0 z-50 px-4 py-2.5 flex items-center justify-between',
        isSyncing ? 'bg-blueprint-blue text-white' : 'bg-success-green text-white'
      )}>
        <div className="flex items-center gap-2">
          {isSyncing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          <span className="text-sm font-bold">
            {isSyncing ? `Syncing ${pendingCount} actions…` : `${pendingCount} actions ready to sync`}
          </span>
        </div>
        {!isSyncing && onSync && (
          <button
            onClick={onSync}
            className="text-xs bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1 font-semibold transition-colors"
          >
            Sync Now
          </button>
        )}
      </div>
    )
  }

  return null
}
