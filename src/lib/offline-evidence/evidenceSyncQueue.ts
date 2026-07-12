import type {
  EvidenceQueueFlushResult,
  EvidenceUploadTransport,
  LocalEvidenceRepository,
  OfflineEvidenceRecord,
  OfflineEvidenceStatus,
} from './types'

const BASE_RETRY_DELAY_MS = 5_000
const MAX_RETRY_DELAY_MS = 5 * 60_000

export function isBrowserOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}

export function calculateRetryDelayMs(retryCount: number, jitter = 0.2): number {
  const exponent = Math.max(0, retryCount)
  const base = Math.min(MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS * 2 ** exponent)
  const jitterAmount = base * jitter
  return Math.round(base + Math.random() * jitterAmount)
}

export function isRetryableUploadError(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message ?? error ?? '').toLowerCase()
  if (!message) return true
  return message.includes('network')
    || message.includes('offline')
    || message.includes('timeout')
    || message.includes('failed to fetch')
    || message.includes('rate limit')
    || message.includes('temporarily')
    || message.includes('storage')
}

export function shouldAttemptUpload(record: OfflineEvidenceRecord, now = new Date()): boolean {
  if (record.status === 'uploaded' || record.status === 'needs_attention') return false
  if (record.status !== 'retry_scheduled') return true
  if (!record.nextRetryAt) return true
  return new Date(record.nextRetryAt).getTime() <= now.getTime()
}

function nextRecordPatch(status: OfflineEvidenceStatus, patch?: Partial<OfflineEvidenceRecord>): Partial<OfflineEvidenceRecord> {
  return {
    status,
    updatedAt: new Date().toISOString(),
    ...patch,
  }
}

export class EvidenceSyncQueue {
  private flushing = false

  constructor(
    private readonly repository: LocalEvidenceRepository,
    private readonly transport: EvidenceUploadTransport,
    private readonly connectivity: () => boolean = isBrowserOnline,
  ) {}

  async enqueue(record: OfflineEvidenceRecord, file: File): Promise<OfflineEvidenceRecord> {
    const status: OfflineEvidenceStatus = this.connectivity() ? 'saved_local' : 'waiting_for_connection'
    return this.repository.save({
      ...record,
      status,
      uploadProgress: 0,
      updatedAt: new Date().toISOString(),
    }, file)
  }

  async flush(filter?: { assignmentId?: string; localEvidenceId?: string }): Promise<EvidenceQueueFlushResult[]> {
    if (this.flushing) return []
    this.flushing = true
    try {
      const records = filter?.localEvidenceId
        ? (await this.repository.get(filter.localEvidenceId) ? [await this.repository.get(filter.localEvidenceId)] : [])
        : await this.repository.list({
            assignmentId: filter?.assignmentId,
            statuses: ['saved_local', 'waiting_for_connection', 'retry_scheduled', 'uploading'],
          })
      const compactRecords = records.filter((record): record is OfflineEvidenceRecord => !!record)
      const results: EvidenceQueueFlushResult[] = []

      for (const record of compactRecords) {
        if (!shouldAttemptUpload(record)) continue
        if (!record.uploadedBy) {
          await this.repository.update(record.localEvidenceId, nextRecordPatch('needs_attention', {
            lastError: 'Sign in is required before this evidence can sync.',
          }))
          results.push({
            localEvidenceId: record.localEvidenceId,
            status: 'needs_attention',
            error: 'Sign in is required before this evidence can sync.',
          })
          continue
        }

        if (!this.connectivity()) {
          await this.repository.update(record.localEvidenceId, nextRecordPatch('waiting_for_connection', {
            lastError: 'Waiting for connection.',
          }))
          results.push({
            localEvidenceId: record.localEvidenceId,
            status: 'waiting_for_connection',
            error: 'Waiting for connection.',
          })
          continue
        }

        const file = await this.repository.getFile(record.localEvidenceId)
        if (!file) {
          await this.repository.update(record.localEvidenceId, nextRecordPatch('needs_attention', {
            lastError: 'Local evidence file is no longer available on this device.',
          }))
          results.push({
            localEvidenceId: record.localEvidenceId,
            status: 'needs_attention',
            error: 'Local evidence file is no longer available on this device.',
          })
          continue
        }

        await this.repository.update(record.localEvidenceId, nextRecordPatch('uploading', {
          uploadProgress: 1,
          lastError: undefined,
        }))

        try {
          const ack = await this.transport.upload(record, file)
          await this.repository.update(record.localEvidenceId, nextRecordPatch('uploaded', {
            uploadProgress: 100,
            confirmedServerDocumentId: ack.serverDocumentId,
            confirmedServerStoragePath: ack.serverStoragePath,
            lastError: undefined,
          }))
          await this.repository.delete(record.localEvidenceId)
          results.push({
            localEvidenceId: record.localEvidenceId,
            status: 'uploaded',
            serverDocument: ack.serverDocument,
          })
        } catch (error) {
          if (!this.connectivity() || isRetryableUploadError(error)) {
            const retryCount = record.retryCount + 1
            const nextRetryAt = new Date(Date.now() + calculateRetryDelayMs(retryCount)).toISOString()
            const message = String((error as { message?: unknown })?.message ?? 'Upload paused — will retry.')
            await this.repository.update(record.localEvidenceId, nextRecordPatch(
              this.connectivity() ? 'retry_scheduled' : 'waiting_for_connection',
              {
                retryCount,
                nextRetryAt,
                uploadProgress: 0,
                lastError: message,
              },
            ))
            results.push({
              localEvidenceId: record.localEvidenceId,
              status: this.connectivity() ? 'retry_scheduled' : 'waiting_for_connection',
              error: message,
            })
          } else {
            const message = String((error as { message?: unknown })?.message ?? 'Upload needs attention.')
            await this.repository.update(record.localEvidenceId, nextRecordPatch('needs_attention', {
              uploadProgress: 0,
              lastError: message,
            }))
            results.push({
              localEvidenceId: record.localEvidenceId,
              status: 'needs_attention',
              error: message,
            })
          }
        }
      }

      return results
    } finally {
      this.flushing = false
    }
  }

  async retryNow(localEvidenceId: string): Promise<EvidenceQueueFlushResult[]> {
    await this.repository.update(localEvidenceId, nextRecordPatch('saved_local', {
      nextRetryAt: undefined,
      lastError: undefined,
    }))
    return this.flush({ localEvidenceId })
  }
}
