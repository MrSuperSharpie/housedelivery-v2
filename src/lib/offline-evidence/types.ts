import type {
  InspectorCompletionDocumentMediaType,
  InspectorCompletionDocumentRow,
} from '@/lib/supabase/inspectorCompletion'

export type OfflineEvidenceStatus =
  | 'optimizing'
  | 'saved_local'
  | 'waiting_for_connection'
  | 'uploading'
  | 'uploaded'
  | 'retry_scheduled'
  | 'needs_attention'

export interface OfflineEvidenceCaptureGeo {
  latitude: number | null
  longitude: number | null
}

export interface OfflineEvidenceUploadOptions {
  jobId?: string
  capturedAt?: string
  captureLatitude?: number | null
  captureLongitude?: number | null
  projectLatitude?: number | null
  projectLongitude?: number | null
  anomalyExplanation?: string
  source?: InspectorCompletionDocumentMediaType
}

export interface OfflineEvidenceRecord {
  localEvidenceId: string
  idempotencyKey: string
  reportId: string
  assignmentId: string
  projectId?: string
  stageId?: string
  checklistItemId: string
  inspectorUserId?: string
  uploadedBy?: string
  originalFilename: string
  storedLocalFilename: string
  mimeType: string
  mediaType: InspectorCompletionDocumentMediaType
  source: InspectorCompletionDocumentMediaType
  capturedAt: string
  originalByteSize: number
  optimizedByteSize: number
  checksum?: string
  captureGeo: OfflineEvidenceCaptureGeo
  transcript?: string
  status: OfflineEvidenceStatus
  uploadProgress: number
  retryCount: number
  nextRetryAt?: string
  lastError?: string
  createdAt: string
  updatedAt: string
  confirmedServerDocumentId?: string
  confirmedServerStoragePath?: string
  uploadOptions: OfflineEvidenceUploadOptions
}

export interface OptimizedEvidenceFile {
  file: File
  originalByteSize: number
  optimizedByteSize: number
  checksum?: string
  didOptimize: boolean
  note: string
}

export interface EvidenceUploadAck {
  serverDocumentId: string
  serverStoragePath: string
  serverDocument?: InspectorCompletionDocumentRow
}

export interface EvidenceUploadTransport {
  upload: (record: OfflineEvidenceRecord, file: File) => Promise<EvidenceUploadAck>
}

export interface LocalEvidenceRepository {
  save(record: OfflineEvidenceRecord, file: File): Promise<OfflineEvidenceRecord>
  get(localEvidenceId: string): Promise<OfflineEvidenceRecord | null>
  getFile(localEvidenceId: string): Promise<File | null>
  list(filter?: { assignmentId?: string; statuses?: OfflineEvidenceStatus[] }): Promise<OfflineEvidenceRecord[]>
  update(localEvidenceId: string, patch: Partial<OfflineEvidenceRecord>): Promise<OfflineEvidenceRecord | null>
  delete(localEvidenceId: string): Promise<void>
}

export interface EvidenceQueueFlushResult {
  localEvidenceId: string
  status: OfflineEvidenceStatus
  serverDocument?: InspectorCompletionDocumentRow
  error?: string
}
