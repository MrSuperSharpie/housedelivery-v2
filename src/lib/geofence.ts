export interface GeoPoint {
  latitude: number
  longitude: number
}

export interface GeofenceEvaluationInput {
  projectPoint?: GeoPoint | null
  capturePoint?: GeoPoint | null
  thresholdMeters?: number
}

export interface GeofenceEvaluationResult {
  state: 'in_range' | 'anomalous' | 'no_reference' | 'no_capture'
  distanceMeters: number | null
  thresholdMeters: number
  explanationRequired: boolean
}

const EARTH_RADIUS_METERS = 6371000

export function haversineDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const toRadians = (value: number) => (value * Math.PI) / 180
  const latDelta = toRadians(b.latitude - a.latitude)
  const lonDelta = toRadians(b.longitude - a.longitude)
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)

  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lonDelta / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine))
}

export function evaluateGeofence(input: GeofenceEvaluationInput): GeofenceEvaluationResult {
  const thresholdMeters = input.thresholdMeters ?? 250

  if (!input.projectPoint) {
    return {
      state: 'no_reference',
      distanceMeters: null,
      thresholdMeters,
      explanationRequired: false,
    }
  }

  if (!input.capturePoint) {
    return {
      state: 'no_capture',
      distanceMeters: null,
      thresholdMeters,
      explanationRequired: false,
    }
  }

  const distanceMeters = Math.round(haversineDistanceMeters(input.projectPoint, input.capturePoint))

  if (distanceMeters <= thresholdMeters) {
    return {
      state: 'in_range',
      distanceMeters,
      thresholdMeters,
      explanationRequired: false,
    }
  }

  return {
    state: 'anomalous',
    distanceMeters,
    thresholdMeters,
    explanationRequired: true,
  }
}
