import type { OfflineEvidenceCaptureGeo } from './types'

type EvidenceGpsNoticeTone = 'pending' | 'success' | 'warning'

export interface EvidenceGpsNotice {
  message: string
  tone: EvidenceGpsNoticeTone
  className: string
}

export const EVIDENCE_GPS_NOTICE_STYLES: Record<EvidenceGpsNoticeTone, string> = {
  pending: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-300/30 dark:bg-sky-950 dark:text-sky-100',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-300/30 dark:bg-emerald-950 dark:text-emerald-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-300/30 dark:bg-amber-950 dark:text-amber-100',
}

export function getEvidenceGpsNotice(captureGeo?: Partial<OfflineEvidenceCaptureGeo> | null): EvidenceGpsNotice | null {
  const gpsStatus = captureGeo?.gpsStatus
  if (!gpsStatus) return null

  if (gpsStatus === 'not_requested' || gpsStatus === 'started') {
    return {
      message: 'Saved on this device. Checking GPS in the background.',
      tone: 'pending',
      className: EVIDENCE_GPS_NOTICE_STYLES.pending,
    }
  }

  if (
    gpsStatus === 'success'
    && typeof captureGeo?.latitude === 'number'
    && typeof captureGeo?.longitude === 'number'
  ) {
    return {
      message: 'Saved on this device with GPS coordinates.',
      tone: 'success',
      className: EVIDENCE_GPS_NOTICE_STYLES.success,
    }
  }

  const message =
    gpsStatus === 'permission_denied'
      ? 'Location permission was denied. Evidence saved without GPS coordinates.'
      : gpsStatus === 'timeout'
        ? 'Location lookup timed out. Evidence saved without GPS coordinates.'
        : gpsStatus === 'unsupported'
          ? 'Location is unavailable in this browser. Evidence saved without GPS coordinates.'
          : 'Location could not be determined. Evidence saved without GPS coordinates.'

  return {
    message,
    tone: 'warning',
    className: EVIDENCE_GPS_NOTICE_STYLES.warning,
  }
}
