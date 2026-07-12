import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateImageResizeDimensions,
  chooseImageOptimizationPlan,
} from './offline-evidence/mediaOptimizationService'
import {
  EvidenceSyncQueue,
  shouldAttemptUpload,
  isRetryableUploadError,
} from './offline-evidence/evidenceSyncQueue'
import { MemoryLocalEvidenceRepository } from './offline-evidence/localEvidenceRepository'
import type { EvidenceUploadTransport, OfflineEvidenceRecord } from './offline-evidence/types'

function makeFile(name = 'evidence.jpg', size = 1024, type = 'image/jpeg'): File {
  return new File([new Uint8Array(size)], name, { type })
}

function makeRecord(overrides: Partial<OfflineEvidenceRecord> = {}): OfflineEvidenceRecord {
  const now = new Date('2026-07-12T12:00:00.000Z').toISOString()
  return {
    localEvidenceId: overrides.localEvidenceId ?? 'local-1',
    idempotencyKey: overrides.idempotencyKey ?? 'assignment:item:checksum',
    reportId: 'report-1',
    assignmentId: 'assignment-1',
    projectId: 'project-1',
    stageId: '5',
    checklistItemId: 'S05-01',
    inspectorUserId: 'inspector-1',
    uploadedBy: 'inspector-1',
    originalFilename: 'evidence.jpg',
    storedLocalFilename: 'evidence.jpg',
    mimeType: 'image/jpeg',
    mediaType: 'camera',
    source: 'camera',
    capturedAt: now,
    originalByteSize: 4_000_000,
    optimizedByteSize: 1_800_000,
    checksum: 'abc123',
    captureGeo: { latitude: 49.2827, longitude: -123.1207 },
    status: 'saved_local',
    uploadProgress: 0,
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
    uploadOptions: {
      capturedAt: now,
      source: 'camera',
      captureLatitude: 49.2827,
      captureLongitude: -123.1207,
    },
    ...overrides,
  }
}

test('offline evidence dimensions downscale only oversized photos', () => {
  assert.deepEqual(
    calculateImageResizeDimensions({ width: 6000, height: 4000, maxLongestEdge: 3000 }),
    { width: 3000, height: 2000, scale: 0.5 },
  )
  assert.deepEqual(
    calculateImageResizeDimensions({ width: 1200, height: 900, maxLongestEdge: 3000 }),
    { width: 1200, height: 900, scale: 1 },
  )
})

test('offline evidence image optimization plan compresses large or oversized images', () => {
  const large = chooseImageOptimizationPlan({ fileSize: 7_000_000, width: 4000, height: 3000 })
  assert.equal(large.shouldResize, true)
  assert.equal(large.shouldCompress, true)
  assert.equal(large.targetBytes, 2 * 1024 * 1024)

  const small = chooseImageOptimizationPlan({ fileSize: 900_000, width: 1000, height: 750 })
  assert.equal(small.shouldResize, false)
  assert.equal(small.shouldCompress, false)
})

test('offline evidence queue persists saved_local status when offline', async () => {
  const repository = new MemoryLocalEvidenceRepository()
  const queue = new EvidenceSyncQueue(repository, {
    upload: async () => {
      throw new Error('should not upload while offline')
    },
  }, () => false)
  await queue.enqueue(makeRecord(), makeFile())
  const [record] = await repository.list()
  assert.equal(record.status, 'waiting_for_connection')

  const results = await queue.flush()
  assert.equal(results[0].status, 'waiting_for_connection')
  const after = await repository.get('local-1')
  assert.equal(after?.status, 'waiting_for_connection')
})

test('offline evidence queue uploads once and cleans local copy after acknowledgement', async () => {
  const repository = new MemoryLocalEvidenceRepository()
  let calls = 0
  const transport: EvidenceUploadTransport = {
    upload: async record => {
      calls += 1
      return {
        serverDocumentId: 'server-doc-1',
        serverStoragePath: `inspector_documents/${record.assignmentId}/server-doc-1.jpg`,
        serverDocument: {
          id: 'server-doc-1',
          reportId: record.reportId,
          assignmentId: record.assignmentId,
          itemCode: record.checklistItemId,
          fileName: record.storedLocalFilename,
          storagePath: `inspector_documents/${record.assignmentId}/server-doc-1.jpg`,
          mimeType: record.mimeType,
          mediaType: record.mediaType,
          fileSize: record.optimizedByteSize,
          evidenceChecksum: record.checksum,
          createdAt: record.createdAt,
        },
      }
    },
  }
  const queue = new EvidenceSyncQueue(repository, transport, () => true)
  await queue.enqueue(makeRecord(), makeFile())
  const results = await queue.flush()
  assert.equal(calls, 1)
  assert.equal(results[0].status, 'uploaded')
  assert.equal(results[0].serverDocument?.id, 'server-doc-1')
  assert.equal(await repository.get('local-1'), null)
  assert.equal(await repository.getFile('local-1'), null)
})

test('offline evidence queue avoids duplicate idempotency entries in the repository', async () => {
  const repository = new MemoryLocalEvidenceRepository()
  const file = makeFile()
  const first = await repository.save(makeRecord({ localEvidenceId: 'local-1' }), file)
  const second = await repository.save(makeRecord({ localEvidenceId: 'local-2' }), file)
  const records = await repository.list()
  assert.equal(first.localEvidenceId, 'local-1')
  assert.equal(second.localEvidenceId, 'local-1')
  assert.equal(records.length, 1)
})

test('offline evidence queue schedules retry for network interruption and preserves local file', async () => {
  const repository = new MemoryLocalEvidenceRepository()
  const queue = new EvidenceSyncQueue(repository, {
    upload: async () => {
      throw new Error('network timeout')
    },
  }, () => true)
  await queue.enqueue(makeRecord(), makeFile())
  const results = await queue.flush()
  assert.equal(results[0].status, 'retry_scheduled')
  const record = await repository.get('local-1')
  assert.equal(record?.status, 'retry_scheduled')
  assert.equal(record?.retryCount, 1)
  assert.ok(record?.nextRetryAt)
  assert.ok(await repository.getFile('local-1'))
})

test('offline evidence queue blocks future attempts until retry time arrives', () => {
  const future = new Date('2026-07-12T12:10:00.000Z').toISOString()
  const record = makeRecord({ status: 'retry_scheduled', nextRetryAt: future })
  assert.equal(shouldAttemptUpload(record, new Date('2026-07-12T12:00:00.000Z')), false)
  assert.equal(shouldAttemptUpload(record, new Date('2026-07-12T12:11:00.000Z')), true)
})

test('offline evidence queue marks permanent validation failures as needs_attention', async () => {
  const repository = new MemoryLocalEvidenceRepository()
  const queue = new EvidenceSyncQueue(repository, {
    upload: async () => {
      throw new Error('validation failed: unsupported media type')
    },
  }, () => true)
  await queue.enqueue(makeRecord(), makeFile())
  const results = await queue.flush()
  assert.equal(results[0].status, 'needs_attention')
  const record = await repository.get('local-1')
  assert.equal(record?.status, 'needs_attention')
  assert.equal(isRetryableUploadError(new Error('validation failed: unsupported media type')), false)
})

test('offline evidence queue restores persisted records across queue instances', async () => {
  const repository = new MemoryLocalEvidenceRepository()
  const firstQueue = new EvidenceSyncQueue(repository, {
    upload: async () => {
      throw new Error('network timeout')
    },
  }, () => true)
  await firstQueue.enqueue(makeRecord(), makeFile())
  await firstQueue.flush()

  const secondQueue = new EvidenceSyncQueue(repository, {
    upload: async record => ({
      serverDocumentId: 'server-after-reload',
      serverStoragePath: 'inspector_documents/server-after-reload.jpg',
      serverDocument: {
        id: 'server-after-reload',
        reportId: record.reportId,
        assignmentId: record.assignmentId,
        itemCode: record.checklistItemId,
        fileName: record.storedLocalFilename,
        storagePath: 'inspector_documents/server-after-reload.jpg',
        createdAt: record.createdAt,
      },
    }),
  }, () => true)
  const pending = await repository.get('local-1')
  await repository.update('local-1', { status: 'saved_local', nextRetryAt: undefined })
  assert.equal(pending?.retryCount, 1)
  const results = await secondQueue.flush()
  assert.equal(results[0].status, 'uploaded')
  assert.equal(await repository.get('local-1'), null)
})
