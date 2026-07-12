import type { FieldMediaCapturePayload } from '@/components/inspector/FieldMediaUploader'
import {
  type InspectorCompletionDocumentMediaType,
  type InspectorCompletionDocumentRow,
  uploadInspectorCompletionDocument,
} from '@/lib/supabase/inspectorCompletion'
import { EvidenceSyncQueue } from './evidenceSyncQueue'
import { getLocalEvidenceRepository } from './localEvidenceRepository'
import { optimizeEvidenceFile } from './mediaOptimizationService'
import type {
  EvidenceQueueFlushResult,
  EvidenceUploadTransport,
  LocalEvidenceRepository,
  OfflineEvidenceRecord,
  OfflineEvidenceStatus,
} from './types'

const LOCAL_PATH_PREFIX = 'local://offline-evidence/'

function safeRandomId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function inferMediaType(file: File, source?: InspectorCompletionDocumentMediaType): InspectorCompletionDocumentMediaType {
  if (source) return source
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type.startsWith('text/')) return 'text'
  if (file.type.startsWith('image/')) return 'camera'
  return 'document'
}

export function localEvidenceStoragePath(localEvidenceId: string): string {
  return `${LOCAL_PATH_PREFIX}${localEvidenceId}`
}

export function isOfflineEvidenceStoragePath(storagePath: string): boolean {
  return storagePath.startsWith(LOCAL_PATH_PREFIX)
}

export function localEvidenceIdFromStoragePath(storagePath: string): string | null {
  return isOfflineEvidenceStoragePath(storagePath)
    ? storagePath.slice(LOCAL_PATH_PREFIX.length)
    : null
}

export function offlineEvidenceStatusLabel(status?: OfflineEvidenceStatus): string {
  switch (status) {
    case 'optimizing':
      return 'Optimizing evidence...'
    case 'saved_local':
      return 'Saved on this device'
    case 'waiting_for_connection':
      return 'Waiting for connection'
    case 'uploading':
      return 'Uploading'
    case 'uploaded':
      return 'Uploaded'
    case 'retry_scheduled':
      return 'Upload paused — will retry'
    case 'needs_attention':
      return 'Upload needs attention'
    default:
      return 'Saved on this device'
  }
}

export function createLocalDocumentFromEvidence(
  record: OfflineEvidenceRecord,
  previewUrl?: string,
): InspectorCompletionDocumentRow {
  return {
    id: record.localEvidenceId,
    reportId: record.reportId,
    assignmentId: record.assignmentId,
    itemCode: record.checklistItemId,
    fileName: record.storedLocalFilename,
    storagePath: localEvidenceStoragePath(record.localEvidenceId),
    mimeType: record.mimeType,
    mediaType: record.mediaType,
    fileSize: record.optimizedByteSize,
    uploadedBy: record.uploadedBy ?? record.inspectorUserId,
    evidenceChecksum: record.checksum,
    originalCapturedAt: record.capturedAt,
    captureGeo: record.captureGeo,
    integrityStatus: 'recorded',
    createdAt: record.createdAt,
    previewUrl,
    offlineSyncStatus: record.status,
    offlineSyncMessage: offlineEvidenceStatusLabel(record.status),
  }
}

export function createInspectorEvidenceUploadTransport(): EvidenceUploadTransport {
  return {
    async upload(record, file) {
      if (!record.uploadedBy) {
        throw new Error('Sign in is required before evidence can sync.')
      }
      const doc = await uploadInspectorCompletionDocument(
        record.reportId,
        record.assignmentId,
        record.checklistItemId,
        record.uploadedBy,
        file,
        record.uploadOptions,
      )
      if (!doc) {
        throw new Error('Evidence upload did not return a persisted server document.')
      }
      return {
        serverDocumentId: doc.id,
        serverStoragePath: doc.storagePath,
        serverDocument: doc,
      }
    },
  }
}

export interface StageInspectorEvidenceInput {
  reportId: string
  assignmentId: string
  projectId?: string
  stageId?: string
  checklistItemId: string
  inspectorUserId?: string
  uploadedBy?: string
  file: File
  capture?: FieldMediaCapturePayload
  jobId?: string
  projectLatitude?: number | null
  projectLongitude?: number | null
  anomalyExplanation?: string
}

export async function stageInspectorEvidenceForUpload(
  input: StageInspectorEvidenceInput,
  repository: LocalEvidenceRepository = getLocalEvidenceRepository(),
): Promise<{ record: OfflineEvidenceRecord; file: File }> {
  const optimized = await optimizeEvidenceFile(input.file)
  const now = new Date().toISOString()
  const mediaType = inferMediaType(optimized.file, input.capture?.source)
  const localEvidenceId = safeRandomId()
  const idempotencyKey = [
    input.assignmentId,
    input.checklistItemId,
    input.capture?.capturedAt ?? now,
    optimized.checksum ?? optimized.file.name,
    optimized.optimizedByteSize,
  ].join(':')

  const record: OfflineEvidenceRecord = {
    localEvidenceId,
    idempotencyKey,
    reportId: input.reportId,
    assignmentId: input.assignmentId,
    projectId: input.projectId,
    stageId: input.stageId,
    checklistItemId: input.checklistItemId,
    inspectorUserId: input.inspectorUserId,
    uploadedBy: input.uploadedBy,
    originalFilename: input.file.name,
    storedLocalFilename: optimized.file.name,
    mimeType: optimized.file.type || input.file.type || 'application/octet-stream',
    mediaType,
    source: mediaType,
    capturedAt: input.capture?.capturedAt ?? now,
    originalByteSize: optimized.originalByteSize,
    optimizedByteSize: optimized.optimizedByteSize,
    checksum: optimized.checksum,
    captureGeo: {
      latitude: input.capture?.latitude ?? null,
      longitude: input.capture?.longitude ?? null,
    },
    transcript: input.capture?.transcript,
    status: input.uploadedBy ? 'saved_local' : 'needs_attention',
    uploadProgress: 0,
    retryCount: 0,
    lastError: input.uploadedBy ? undefined : 'Sign in is required before this evidence can sync.',
    createdAt: now,
    updatedAt: now,
    uploadOptions: {
      jobId: input.jobId,
      capturedAt: input.capture?.capturedAt,
      captureLatitude: input.capture?.latitude ?? null,
      captureLongitude: input.capture?.longitude ?? null,
      projectLatitude: input.projectLatitude ?? null,
      projectLongitude: input.projectLongitude ?? null,
      anomalyExplanation: input.anomalyExplanation,
      source: mediaType,
    },
  }

  await repository.save(record, optimized.file)
  return { record, file: optimized.file }
}

export async function syncInspectorEvidenceQueue(options?: {
  assignmentId?: string
  localEvidenceId?: string
  repository?: LocalEvidenceRepository
}): Promise<EvidenceQueueFlushResult[]> {
  const repository = options?.repository ?? getLocalEvidenceRepository()
  const queue = new EvidenceSyncQueue(repository, createInspectorEvidenceUploadTransport())
  return queue.flush({
    assignmentId: options?.assignmentId,
    localEvidenceId: options?.localEvidenceId,
  })
}

export async function listPendingInspectorEvidenceDocuments(
  assignmentId: string,
  repository: LocalEvidenceRepository = getLocalEvidenceRepository(),
): Promise<InspectorCompletionDocumentRow[]> {
  const records = await repository.list({
    assignmentId,
    statuses: ['saved_local', 'waiting_for_connection', 'uploading', 'retry_scheduled', 'needs_attention'],
  })
  return records.map(record => createLocalDocumentFromEvidence(record))
}

export async function deleteLocalInspectorEvidence(localEvidenceId: string) {
  await getLocalEvidenceRepository().delete(localEvidenceId)
}

export function registerInspectorEvidenceResumeHandlers(onSynced?: (results: EvidenceQueueFlushResult[]) => void) {
  if (typeof window === 'undefined') return () => {}

  let running = false
  const flush = () => {
    if (running) return
    running = true
    void syncInspectorEvidenceQueue()
      .then(results => {
        if (results.length > 0) onSynced?.(results)
      })
      .finally(() => {
        running = false
      })
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') flush()
  }
  window.addEventListener('online', flush)
  window.addEventListener('focus', flush)
  document.addEventListener('visibilitychange', onVisibility)
  flush()

  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.ready
      .then(registration => {
        const syncRegistration = registration as ServiceWorkerRegistration & {
          sync?: { register: (tag: string) => Promise<void> }
        }
        return syncRegistration.sync?.register('vero-offline-evidence-sync')
      })
      .catch(() => {
        // Background Sync is best-effort only; foreground resume handlers remain active.
      })
  }

  return () => {
    window.removeEventListener('online', flush)
    window.removeEventListener('focus', flush)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
