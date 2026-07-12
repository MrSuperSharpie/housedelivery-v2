import type { FieldMediaCapturePayload } from '@/components/inspector/FieldMediaUploader'
import {
  type InspectorCompletionDocumentMediaType,
  type InspectorCompletionDocumentRow,
} from '@/lib/supabase/inspectorCompletion'
import { EvidenceSyncQueue } from './evidenceSyncQueue'
import { getLocalEvidenceRepository } from './localEvidenceRepository'
import {
  calculateSha256Hex,
  optimizeEvidenceFileSequentially,
} from './mediaOptimizationService'
import type {
  EvidenceQueueFlushResult,
  EvidenceUploadTransport,
  LocalEvidenceRepository,
  OfflineEvidenceRecord,
  OfflineEvidenceStatus,
} from './types'
import { recordOfflineEvidenceDiagnostic } from './captureDiagnostics'

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
    case 'saving_local':
      return 'Saving evidence on this device...'
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
    mimeType: record.uploadMimeType || record.mimeType,
    mediaType: record.mediaType,
    fileSize: record.optimizedByteSize || record.originalByteSize,
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
    async upload(record, file, options) {
      if (!record.uploadedBy) {
        throw new Error('Sign in is required before evidence can sync.')
      }
      if (options?.signal?.aborted) {
        throw new Error('Upload paused before network transfer.')
      }
      const { uploadInspectorCompletionDocument } = await import('@/lib/supabase/inspectorCompletion')
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
  const now = new Date().toISOString()
  const mediaType = inferMediaType(input.file, input.capture?.source)
  const localEvidenceId = safeRandomId()
  const idempotencyKey = [
    input.assignmentId,
    input.checklistItemId,
    input.capture?.capturedAt ?? now,
    input.file.name,
    input.file.size,
    input.file.lastModified,
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
    storedLocalFilename: input.file.name,
    uploadFilename: input.file.name,
    mimeType: input.file.type || 'application/octet-stream',
    uploadMimeType: input.file.type || 'application/octet-stream',
    mediaType,
    source: mediaType,
    capturedAt: input.capture?.capturedAt ?? now,
    originalByteSize: input.file.size,
    optimizedByteSize: input.file.size,
    optimizationStatus: 'not_started',
    optimizationNote: 'Original evidence saved before optimization.',
    captureGeo: {
      latitude: input.capture?.latitude ?? null,
      longitude: input.capture?.longitude ?? null,
    },
    transcript: input.capture?.transcript,
    status: 'saved_local',
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

  const savedRecord = await repository.save(record, input.file)
  return { record: savedRecord, file: input.file }
}

export async function optimizeAndSyncInspectorEvidence(options: {
  localEvidenceId: string
  assignmentId?: string
  repository?: LocalEvidenceRepository
  transport?: EvidenceUploadTransport
}): Promise<EvidenceQueueFlushResult[]> {
  const repository = options.repository ?? getLocalEvidenceRepository()
  const record = await repository.get(options.localEvidenceId)
  if (!record) return []

  await repository.update(record.localEvidenceId, {
    status: 'optimizing',
    optimizationNote: 'Optimizing evidence after local save.',
  })
  recordOfflineEvidenceDiagnostic('optimization_started', {
    localEvidenceId: record.localEvidenceId,
    mediaType: record.mediaType,
    source: record.source,
    byteSize: record.originalByteSize,
  })

  const originalFile = await repository.getOriginalFile(record.localEvidenceId)
  if (!originalFile) {
    await repository.update(record.localEvidenceId, {
      status: 'needs_attention',
      lastError: 'Original local evidence file is no longer available on this device.',
    })
    return [{
      localEvidenceId: record.localEvidenceId,
      status: 'needs_attention',
      error: 'Original local evidence file is no longer available on this device.',
    }]
  }

  try {
    const optimized = await optimizeEvidenceFileSequentially(originalFile)
    await repository.saveUploadFile(record.localEvidenceId, optimized.file, {
      status: 'saved_local',
      storedLocalFilename: optimized.file.name,
      uploadFilename: optimized.file.name,
      mimeType: optimized.file.type || record.mimeType,
      uploadMimeType: optimized.file.type || record.uploadMimeType,
      optimizedByteSize: optimized.optimizedByteSize,
      checksum: optimized.checksum,
      optimizationStatus: optimized.didOptimize ? 'completed' : 'not_required',
      optimizationNote: optimized.note,
      lastError: undefined,
    })
  } catch (error) {
    await repository.saveUploadFile(record.localEvidenceId, originalFile, {
      status: 'saved_local',
      uploadFilename: originalFile.name,
      uploadMimeType: originalFile.type || record.mimeType,
      optimizedByteSize: originalFile.size,
      checksum: await calculateSha256Hex(originalFile),
      optimizationStatus: String((error as { message?: unknown })?.message ?? '').includes('timed out')
        ? 'timed_out'
        : 'failed',
      optimizationNote: error instanceof Error
        ? error.message
        : 'Image optimization failed; original evidence preserved.',
      lastError: 'Optimization skipped; original evidence preserved for upload.',
    })
  }

  return syncInspectorEvidenceQueue({
    assignmentId: options.assignmentId,
    localEvidenceId: options.localEvidenceId,
    repository,
    transport: options.transport,
  })
}

export async function syncInspectorEvidenceQueue(options?: {
  assignmentId?: string
  localEvidenceId?: string
  repository?: LocalEvidenceRepository
  transport?: EvidenceUploadTransport
}): Promise<EvidenceQueueFlushResult[]> {
  const repository = options?.repository ?? getLocalEvidenceRepository()
  const queue = new EvidenceSyncQueue(repository, options?.transport ?? createInspectorEvidenceUploadTransport())
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
    statuses: ['saving_local', 'optimizing', 'saved_local', 'waiting_for_connection', 'uploading', 'retry_scheduled', 'needs_attention'],
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
