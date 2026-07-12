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
import {
  fileToStoredBlob,
  MemoryLocalEvidenceRepository,
  storedBlobToFile,
  withLocalEvidenceTimeout,
} from './offline-evidence/localEvidenceRepository'
import {
  optimizeAndSyncInspectorEvidence,
  stageInspectorEvidenceForUpload,
} from './offline-evidence/inspectorEvidenceSync'
import type { EvidenceUploadTransport, OfflineEvidenceRecord } from './offline-evidence/types'
import {
  fieldMediaInputOptionsForExpectedType,
  requestFieldMediaGpsResult,
  withCaptureCallbackTimeout,
  withGeolocationWatchdog,
} from '@/components/inspector/FieldMediaUploader'

const originalNavigator = globalThis.navigator

function mockNavigator(value: Partial<Navigator>) {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value,
  })
}

function restoreNavigator() {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: originalNavigator,
  })
}

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
    originalLastModified: 123,
    storedLocalFilename: 'evidence.jpg',
    uploadFilename: 'evidence.jpg',
    uploadLastModified: 123,
    mimeType: 'image/jpeg',
    uploadMimeType: 'image/jpeg',
    mediaType: 'camera',
    source: 'camera',
    capturedAt: now,
    originalByteSize: 4_000_000,
    optimizedByteSize: 1_800_000,
    optimizationStatus: 'not_required',
    optimizationNote: 'Test fixture.',
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

test('direct camera File is staged locally before any upload is attempted', async () => {
  const repository = new MemoryLocalEvidenceRepository()
  const file = makeFile('iphone-camera.jpg', 4096, 'image/jpeg')
  const staged = await stageInspectorEvidenceForUpload({
    reportId: 'report-1',
    assignmentId: 'assignment-1',
    checklistItemId: 'S05-01',
    uploadedBy: 'inspector-1',
    file,
    capture: {
      file,
      capturedAt: '2026-07-12T12:00:00.000Z',
      latitude: 49.2827,
      longitude: -123.1207,
      source: 'camera',
    },
  }, repository)

  assert.equal(staged.record.status, 'saved_local')
  assert.equal((await repository.list()).length, 1)
  assert.equal(await repository.getOriginalFile(staged.record.localEvidenceId), file)
  assert.equal(await repository.getFile(staged.record.localEvidenceId), file)
})

test('Camera Roll File uses the same local-first staging coordinator', async () => {
  const repository = new MemoryLocalEvidenceRepository()
  const file = makeFile('camera-roll.jpg', 2048, 'image/jpeg')
  const staged = await stageInspectorEvidenceForUpload({
    reportId: 'report-1',
    assignmentId: 'assignment-1',
    checklistItemId: 'S05-01',
    uploadedBy: 'inspector-1',
    file,
  }, repository)

  assert.equal(staged.record.status, 'saved_local')
  assert.equal(staged.record.mediaType, 'camera')
  assert.equal(await repository.getOriginalFile(staged.record.localEvidenceId), file)
})

test('photo capture and Photo Library inputs use the same staging coordinator source', async () => {
  const options = fieldMediaInputOptionsForExpectedType('camera')
  assert.deepEqual(options.map(option => option.id), ['take_photo', 'choose_photo_library'])
  assert.equal(options[0].accept, 'image/*')
  assert.equal(options[0].capture, 'environment')
  assert.equal(options[0].source, 'camera')
  assert.equal(options[1].accept, 'image/*')
  assert.equal(options[1].capture, undefined)
  assert.equal(options[1].source, 'camera')

  for (const option of options) {
    const repository = new MemoryLocalEvidenceRepository()
    const file = makeFile(`${option.id}.jpg`, 2048, 'image/jpeg')
    const staged = await stageInspectorEvidenceForUpload({
      reportId: 'report-1',
      assignmentId: 'assignment-1',
      checklistItemId: 'S05-01',
      uploadedBy: 'inspector-1',
      file,
      capture: {
        file,
        capturedAt: '2026-07-12T12:00:00.000Z',
        latitude: null,
        longitude: null,
        source: option.source,
      },
    }, repository)
    assert.equal(staged.record.status, 'saved_local')
    assert.equal(staged.record.mediaType, 'camera')
  }
})

test('live photo local save completes before any GPS result is required', async () => {
  const repository = new MemoryLocalEvidenceRepository()
  const file = makeFile('live-photo-before-gps.jpg', 2048, 'image/jpeg')
  const staged = await stageInspectorEvidenceForUpload({
    reportId: 'report-1',
    assignmentId: 'assignment-1',
    checklistItemId: 'S05-01',
    uploadedBy: 'inspector-1',
    file,
    capture: {
      file,
      capturedAt: '2026-07-12T12:00:00.000Z',
      latitude: null,
      longitude: null,
      source: 'camera',
      inputAction: 'take_photo',
    },
  }, repository)

  assert.equal(staged.record.status, 'saved_local')
  assert.equal(staged.record.captureGeo.gpsStatus, 'not_requested')
  assert.equal(staged.record.captureGeo.latitude, null)
  assert.equal(staged.record.captureGeo.longitude, null)
  assert.equal((await repository.list()).length, 1)
})

test('video capture and existing-video inputs use the same staging coordinator source', async () => {
  const options = fieldMediaInputOptionsForExpectedType('video')
  assert.deepEqual(options.map(option => option.id), ['record_video', 'choose_existing_video'])
  assert.equal(options[0].capture, 'environment')
  assert.equal(options[0].source, 'video')
  assert.equal(options[1].capture, undefined)
  assert.equal(options[1].source, 'video')

  for (const option of options) {
    const repository = new MemoryLocalEvidenceRepository()
    const file = makeFile(`${option.id}.mp4`, 4096, 'video/mp4')
    const staged = await stageInspectorEvidenceForUpload({
      reportId: 'report-1',
      assignmentId: 'assignment-1',
      checklistItemId: 'S05-01',
      uploadedBy: 'inspector-1',
      file,
      capture: {
        file,
        capturedAt: '2026-07-12T12:00:00.000Z',
        latitude: null,
        longitude: null,
        source: option.source,
      },
    }, repository)
    assert.equal(staged.record.status, 'saved_local')
    assert.equal(staged.record.mediaType, 'video')
  }
})

test('general Attach Evidence remains a non-capture input path', () => {
  const [option] = fieldMediaInputOptionsForExpectedType('document')
  assert.equal(option.id, 'attach_document')
  assert.equal(option.capture, undefined)
  assert.equal(option.source, 'document')
})

test('captured File is normalized to Blob plus metadata for IndexedDB storage', async () => {
  const file = new File([new Uint8Array([1, 2, 3])], 'iphone-capture.jpg', {
    type: 'image/jpeg',
    lastModified: 12345,
  })
  const stored = fileToStoredBlob(file)
  assert.equal(stored.blob instanceof Blob, true)
  assert.equal(stored.blob instanceof File, false)
  assert.equal(stored.name, 'iphone-capture.jpg')
  assert.equal(stored.type, 'image/jpeg')
  assert.equal(stored.lastModified, 12345)

  const reconstructed = storedBlobToFile(stored)
  assert.equal(reconstructed?.name, 'iphone-capture.jpg')
  assert.equal(reconstructed?.type, 'image/jpeg')
  assert.equal(reconstructed?.lastModified, 12345)
  assert.deepEqual(new Uint8Array(await reconstructed!.arrayBuffer()), new Uint8Array([1, 2, 3]))
})

test('FieldMediaUploader busy watchdog resolves after local save while optimization remains pending', async () => {
  let optimizationStillPending = true
  const localSave = Promise.resolve('saved').then(result => {
    void new Promise(() => {
      optimizationStillPending = true
    })
    return result
  })
  const result = await withCaptureCallbackTimeout(localSave, 25)
  assert.equal(result, 'saved')
  assert.equal(optimizationStillPending, true)
})

test('FieldMediaUploader busy watchdog clears when local save rejects', async () => {
  await assert.rejects(
    withCaptureCallbackTimeout(Promise.reject(new Error('Could not save this evidence on this device. Try again.')), 25),
    /Could not save this evidence/,
  )
})

test('FieldMediaUploader busy watchdog clears when IndexedDB open stalls', async () => {
  await assert.rejects(
    withCaptureCallbackTimeout(new Promise(() => {
      // Simulates a stalled local staging callback.
    }), 5),
    /Could not save this evidence/,
  )
})

test('FieldMediaUploader geolocation watchdog cannot block local camera staging indefinitely', async () => {
  const location = await withGeolocationWatchdog(new Promise(() => {
    // Simulates iOS Chrome geolocation never resolving after camera capture.
  }), 5)
  assert.deepEqual(location, {
    latitude: null,
    longitude: null,
    error: 'Location lookup timed out. Evidence was captured without GPS coordinates.',
  })
})

test('post-save GPS success records coordinates accuracy timestamp and permission state', async () => {
  mockNavigator({
    permissions: {
      query: async () => ({ state: 'granted' }) as PermissionStatus,
    } as Permissions,
    geolocation: {
      getCurrentPosition: success => {
        success({
          coords: {
            latitude: 49.2827,
            longitude: -123.1207,
            accuracy: 8,
          },
          timestamp: Date.parse('2026-07-12T12:00:05.000Z'),
        } as GeolocationPosition)
      },
    } as Geolocation,
  })

  try {
    const result = await requestFieldMediaGpsResult(25)
    assert.equal(result.status, 'success')
    assert.equal(result.latitude, 49.2827)
    assert.equal(result.longitude, -123.1207)
    assert.equal(result.accuracy, 8)
    assert.equal(result.timestamp, '2026-07-12T12:00:05.000Z')
    assert.equal(result.permissionState, 'granted')
  } finally {
    restoreNavigator()
  }
})

test('post-save GPS timeout returns a structured result and does not block evidence', async () => {
  mockNavigator({
    permissions: {
      query: async () => ({ state: 'prompt' }) as PermissionStatus,
    } as Permissions,
    geolocation: {
      getCurrentPosition: () => {
        // Simulates iOS Chrome never resolving the geolocation callback.
      },
    } as unknown as Geolocation,
  })

  try {
    const result = await requestFieldMediaGpsResult(5)
    assert.equal(result.status, 'timeout')
    assert.equal(result.latitude, null)
    assert.equal(result.longitude, null)
    assert.equal(result.errorCode, 3)
    assert.equal(result.permissionState, 'prompt')
  } finally {
    restoreNavigator()
  }
})

test('post-save GPS permission denial returns a structured result without warning-banner state', async () => {
  mockNavigator({
    permissions: {
      query: async () => ({ state: 'denied' }) as PermissionStatus,
    } as Permissions,
    geolocation: {
      getCurrentPosition: (_success, error) => {
        error?.({
          code: 1,
          message: 'User denied Geolocation',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError)
      },
    } as Geolocation,
  })

  try {
    const result = await requestFieldMediaGpsResult(25)
    assert.equal(result.status, 'permission_denied')
    assert.equal(result.latitude, null)
    assert.equal(result.longitude, null)
    assert.equal(result.errorCode, 1)
    assert.equal(result.permissionState, 'denied')
  } finally {
    restoreNavigator()
  }
})

test('local evidence timeout rejects stalled IndexedDB open or transaction work', async () => {
  await assert.rejects(
    withLocalEvidenceTimeout(new Promise(() => {
      // Simulates stalled IndexedDB open/transaction completion.
    }), 'Could not save this evidence on this device. Try again.', 5),
    /Could not save this evidence/,
  )
})

test('local staging coordinator does not await optimization checksum upload or queue flush', async () => {
  const repository = new MemoryLocalEvidenceRepository()
  const file = makeFile('local-first.jpg', 1024, 'image/jpeg')
  const staged = await stageInspectorEvidenceForUpload({
    reportId: 'report-1',
    assignmentId: 'assignment-1',
    checklistItemId: 'S05-01',
    uploadedBy: 'inspector-1',
    file,
  }, repository)
  assert.equal(staged.record.status, 'saved_local')
  assert.equal(staged.record.optimizationStatus, 'not_started')
  assert.equal(staged.record.checksum, undefined)
  assert.equal(await repository.getOriginalFile(staged.record.localEvidenceId), file)
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

test('offline evidence queue exits uploading state after mobile upload timeout', async () => {
  const repository = new MemoryLocalEvidenceRepository()
  const queue = new EvidenceSyncQueue(repository, {
    upload: async () => new Promise(() => {
      // Simulates a mobile browser/network request that never resolves.
    }),
  }, () => true, 5)
  await queue.enqueue(makeRecord(), makeFile())
  const results = await queue.flush()
  assert.equal(results[0].status, 'retry_scheduled')
  const record = await repository.get('local-1')
  assert.equal(record?.status, 'retry_scheduled')
  assert.match(record?.lastError ?? '', /timed out/i)
})

test('offline event/connectivity loss changes queued upload to waiting_for_connection', async () => {
  const repository = new MemoryLocalEvidenceRepository()
  let online = true
  const queue = new EvidenceSyncQueue(repository, {
    upload: async () => {
      online = false
      throw new Error('offline')
    },
  }, () => online)
  await queue.enqueue(makeRecord(), makeFile())
  const results = await queue.flush()
  assert.equal(results[0].status, 'waiting_for_connection')
  const record = await repository.get('local-1')
  assert.equal(record?.status, 'waiting_for_connection')
})

test('connectivity restoration retries waiting evidence', async () => {
  const repository = new MemoryLocalEvidenceRepository()
  await repository.save(makeRecord({ status: 'waiting_for_connection' }), makeFile())
  const queue = new EvidenceSyncQueue(repository, {
    upload: async record => ({
      serverDocumentId: 'server-restored',
      serverStoragePath: 'inspector_documents/server-restored.jpg',
      serverDocument: {
        id: 'server-restored',
        reportId: record.reportId,
        assignmentId: record.assignmentId,
        itemCode: record.checklistItemId,
        fileName: record.storedLocalFilename,
        storagePath: 'inspector_documents/server-restored.jpg',
        createdAt: record.createdAt,
      },
    }),
  }, () => true)
  const results = await queue.flush()
  assert.equal(results[0].status, 'uploaded')
  assert.equal(await repository.get('local-1'), null)
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

test('stale uploading state is recovered after reload', async () => {
  const repository = new MemoryLocalEvidenceRepository()
  await repository.save(makeRecord({ status: 'uploading', uploadProgress: 42 }), makeFile())
  const queue = new EvidenceSyncQueue(repository, {
    upload: async record => ({
      serverDocumentId: 'server-stale-uploading',
      serverStoragePath: 'inspector_documents/server-stale-uploading.jpg',
      serverDocument: {
        id: 'server-stale-uploading',
        reportId: record.reportId,
        assignmentId: record.assignmentId,
        itemCode: record.checklistItemId,
        fileName: record.storedLocalFilename,
        storagePath: 'inspector_documents/server-stale-uploading.jpg',
        createdAt: record.createdAt,
      },
    }),
  }, () => true)
  const results = await queue.flush()
  assert.equal(results[0].status, 'uploaded')
  assert.equal(await repository.get('local-1'), null)
})

test('optimization failure preserves original File and uploads it', async () => {
  const repository = new MemoryLocalEvidenceRepository()
  const original = makeFile('iphone-original.jpg', 2048, 'image/jpeg')
  const staged = await stageInspectorEvidenceForUpload({
    reportId: 'report-1',
    assignmentId: 'assignment-1',
    checklistItemId: 'S05-01',
    uploadedBy: 'inspector-1',
    file: original,
  }, repository)
  const results = await optimizeAndSyncInspectorEvidence({
    assignmentId: 'assignment-1',
    localEvidenceId: staged.record.localEvidenceId,
    repository,
    transport: {
      upload: async () => {
        throw new Error('network timeout')
      },
    },
  })
  assert.equal(results[0].status, 'retry_scheduled')
  const preservedOriginal = await repository.getOriginalFile(staged.record.localEvidenceId)
  const uploadCandidate = await repository.getFile(staged.record.localEvidenceId)
  const record = await repository.get(staged.record.localEvidenceId)
  assert.equal(preservedOriginal, original)
  assert.equal(uploadCandidate, original)
  assert.equal(record?.optimizationStatus, 'failed')
  assert.equal(record?.optimizedByteSize, original.size)
})
