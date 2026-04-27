'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { HardPingIntervention } from '@/components/inspector/HardPingIntervention'
import { useAuth } from '@/lib/auth'
import {
  getActiveHardPingForInspector,
  respondToHardPing,
  subscribeToHardPingState,
} from '@/lib/hardPingClient'
import type { ActiveHardPing, HardPingResponseRequest, HardPingResponseResult } from '@/lib/hardPingTypes'

export function HardPingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [activeHardPing, setActiveHardPing] = useState<ActiveHardPing | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const inspectorId = user?.role === 'inspector' ? (user.supabaseId ?? user.id) : null

  useEffect(() => {
    if (!inspectorId) {
      queueMicrotask(() => setActiveHardPing(null))
      return
    }

    return subscribeToHardPingState(inspectorId, setActiveHardPing, () => {
      setActiveHardPing(current => current)
    })
  }, [inspectorId, refreshKey])

  const handleResolved = useCallback(() => {
    setActiveHardPing(null)
    setRefreshKey(value => value + 1)
  }, [])

  const handleRespond = useCallback(async (input: HardPingResponseRequest): Promise<HardPingResponseResult> => {
    const result = await respondToHardPing(input)
    if (result.ok || result.stale || result.hardPingActive === false) {
      window.setTimeout(() => {
        void (async () => {
          if (!inspectorId) return
          const refreshed = await getActiveHardPingForInspector(inspectorId)
          setActiveHardPing(refreshed)
        })()
      }, 700)
    }
    return result
  }, [inspectorId])

  return (
    <>
      {children}
      <HardPingIntervention
        hardPing={activeHardPing}
        userRole={user?.role}
        onRespond={handleRespond}
        onResolved={handleResolved}
      />
    </>
  )
}
