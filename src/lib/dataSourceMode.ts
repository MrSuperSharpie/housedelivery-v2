'use client'

export type ReportDataMode = 'mock' | 'live'

type RequestedMode = ReportDataMode | 'auto'

function normalizeRequestedMode(value: string | undefined): RequestedMode {
  if (value === 'mock' || value === 'live') return value
  return 'auto'
}

export function resolveReportDataMode(hasLiveSession: boolean): ReportDataMode {
  const requestedMode = normalizeRequestedMode(process.env.NEXT_PUBLIC_VERO_DATA_MODE)
  if (requestedMode === 'mock' || requestedMode === 'live') return requestedMode
  return hasLiveSession ? 'live' : 'mock'
}
