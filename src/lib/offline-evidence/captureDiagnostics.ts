export type OfflineEvidenceDiagnosticEvent =
  | 'file_input_change_received'
  | 'file_blob_normalized'
  | 'indexeddb_open_started'
  | 'indexeddb_open_completed'
  | 'indexeddb_transaction_started'
  | 'indexeddb_transaction_committed'
  | 'react_evidence_row_inserted'
  | 'capture_callback_resolved'
  | 'busy_state_cleared'
  | 'optimization_started'
  | 'upload_started'
  | 'upload_completed'
  | 'upload_failed'

export interface OfflineEvidenceDiagnosticDetails {
  localEvidenceId?: string
  mediaType?: string
  source?: string
  byteSize?: number
  status?: string
  elapsedMs?: number
  reason?: string
}

function diagnosticsEnabled(): boolean {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') return true
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem('vero:offline-evidence-debug') === '1'
  } catch {
    return false
  }
}

export function recordOfflineEvidenceDiagnostic(
  event: OfflineEvidenceDiagnosticEvent,
  details: OfflineEvidenceDiagnosticDetails = {},
) {
  if (!diagnosticsEnabled()) return
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    ...details,
  }
  console.debug('[Vero offline evidence]', payload)
}
