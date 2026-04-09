'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GPSCoord } from '@/lib/types'

interface GeolocationState {
  location: GPSCoord | null
  error: string | null
  loading: boolean
  supported: boolean
}

export function useGeolocation(watchPosition = false) {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    loading: false,
    supported: false,
  })

  const deviceId =
    typeof window !== 'undefined'
      ? (localStorage.getItem('siteline_device_id') ??
        (() => {
          const id = `device-${Math.random().toString(36).slice(2, 10)}`
          localStorage.setItem('siteline_device_id', id)
          return id
        })())
      : 'unknown'

  const handleSuccess = useCallback(
    (position: GeolocationPosition) => {
      const coord: GPSCoord = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(position.timestamp).toISOString(),
        deviceId,
      }
      setState({ location: coord, error: null, loading: false, supported: true })
    },
    [deviceId]
  )

  const handleError = useCallback((err: GeolocationPositionError) => {
    setState((prev) => ({
      ...prev,
      error: err.message,
      loading: false,
    }))
  }, [])

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        supported: false,
        error: 'Geolocation not supported on this device',
      }))
      return
    }
    setState((prev) => ({ ...prev, loading: true, supported: true }))
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    })
  }, [handleSuccess, handleError])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const supported = 'geolocation' in navigator
    setState((prev) => ({ ...prev, supported }))

    if (!supported) return

    if (watchPosition) {
      setState((prev) => ({ ...prev, loading: true }))
      const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      })
      return () => navigator.geolocation.clearWatch(watchId)
    }
  }, [watchPosition, handleSuccess, handleError])

  return { ...state, requestLocation }
}
