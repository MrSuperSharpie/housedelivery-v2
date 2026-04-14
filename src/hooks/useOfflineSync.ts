'use client'

import { useState, useEffect, useCallback } from 'react'
import type { OfflineAction } from '@/lib/types'

const OFFLINE_QUEUE_KEY = 'vero_offline_queue'

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true)
  const [queue, setQueue] = useState<OfflineAction[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)

  // Load queue from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY)
    if (stored) {
      try {
        setQueue(JSON.parse(stored))
      } catch {
        localStorage.removeItem(OFFLINE_QUEUE_KEY)
      }
    }
    setIsOnline(navigator.onLine)
  }, [])

  // Listen for online/offline events
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setIsOnline(true)
      syncQueue()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue])

  const persistQueue = useCallback((actions: OfflineAction[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(actions))
    }
  }, [])

  const addToQueue = useCallback(
    (type: OfflineAction['type'], payload: Record<string, unknown>) => {
      const action: OfflineAction = {
        id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        payload,
        timestamp: new Date().toISOString(),
        synced: false,
      }
      const newQueue = [...queue, action]
      setQueue(newQueue)
      persistQueue(newQueue)
      return action.id
    },
    [queue, persistQueue]
  )

  const syncQueue = useCallback(async () => {
    const unsynced = queue.filter((a) => !a.synced)
    if (unsynced.length === 0) return

    setIsSyncing(true)
    try {
      // In production: POST each action to /api/sync or Supabase
      // For now, simulate a 1-second sync delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const synced = queue.map((a) => ({ ...a, synced: true }))
      setQueue(synced)
      persistQueue(synced)
      setLastSyncedAt(new Date().toISOString())

      // Clear fully synced queue after 5s
      setTimeout(() => {
        setQueue([])
        persistQueue([])
      }, 5000)
    } catch (err) {
      console.error('Sync failed:', err)
    } finally {
      setIsSyncing(false)
    }
  }, [queue, persistQueue])

  const clearQueue = useCallback(() => {
    setQueue([])
    persistQueue([])
  }, [persistQueue])

  const pendingCount = queue.filter((a) => !a.synced).length

  return {
    isOnline,
    queue,
    pendingCount,
    isSyncing,
    lastSyncedAt,
    addToQueue,
    syncQueue,
    clearQueue,
  }
}
