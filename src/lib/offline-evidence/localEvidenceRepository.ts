import type {
  LocalEvidenceRepository,
  OfflineEvidenceRecord,
  OfflineEvidenceStatus,
} from './types'

const DB_NAME = 'vero-offline-evidence'
const DB_VERSION = 1
const RECORD_STORE = 'records'
const BLOB_STORE = 'blobs'

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined'
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'))
  })
}

function openDatabase(): Promise<IDBDatabase> {
  if (!hasIndexedDb()) {
    return Promise.reject(new Error('IndexedDB is not available in this browser.'))
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(RECORD_STORE)) {
        const store = db.createObjectStore(RECORD_STORE, { keyPath: 'localEvidenceId' })
        store.createIndex('assignmentId', 'assignmentId', { unique: false })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('idempotencyKey', 'idempotencyKey', { unique: true })
      }
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE, { keyPath: 'localEvidenceId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed.'))
  })
}

function transactionComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted.'))
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed.'))
  })
}

export class IndexedDbLocalEvidenceRepository implements LocalEvidenceRepository {
  async save(record: OfflineEvidenceRecord, file: File): Promise<OfflineEvidenceRecord> {
    const db = await openDatabase()
    try {
      const tx = db.transaction([RECORD_STORE, BLOB_STORE], 'readwrite')
      tx.objectStore(RECORD_STORE).put(record)
      tx.objectStore(BLOB_STORE).put({
        localEvidenceId: record.localEvidenceId,
        originalFile: file,
        uploadFile: file,
      })
      await transactionComplete(tx)
      return record
    } finally {
      db.close()
    }
  }

  async get(localEvidenceId: string): Promise<OfflineEvidenceRecord | null> {
    const db = await openDatabase()
    try {
      const tx = db.transaction(RECORD_STORE, 'readonly')
      const record = await requestToPromise<OfflineEvidenceRecord | undefined>(
        tx.objectStore(RECORD_STORE).get(localEvidenceId),
      )
      return record ?? null
    } finally {
      db.close()
    }
  }

  async getFile(localEvidenceId: string): Promise<File | null> {
    const db = await openDatabase()
    try {
      const tx = db.transaction(BLOB_STORE, 'readonly')
      const entry = await requestToPromise<{ localEvidenceId: string; file?: File; originalFile?: File; uploadFile?: File } | undefined>(
        tx.objectStore(BLOB_STORE).get(localEvidenceId),
      )
      return entry?.uploadFile ?? entry?.file ?? entry?.originalFile ?? null
    } finally {
      db.close()
    }
  }

  async getOriginalFile(localEvidenceId: string): Promise<File | null> {
    const db = await openDatabase()
    try {
      const tx = db.transaction(BLOB_STORE, 'readonly')
      const entry = await requestToPromise<{ localEvidenceId: string; file?: File; originalFile?: File; uploadFile?: File } | undefined>(
        tx.objectStore(BLOB_STORE).get(localEvidenceId),
      )
      return entry?.originalFile ?? entry?.file ?? entry?.uploadFile ?? null
    } finally {
      db.close()
    }
  }

  async saveUploadFile(
    localEvidenceId: string,
    file: File,
    patch?: Partial<OfflineEvidenceRecord>,
  ): Promise<OfflineEvidenceRecord | null> {
    const db = await openDatabase()
    try {
      const currentRecord = await this.get(localEvidenceId)
      if (!currentRecord) return null
      const currentOriginal = await this.getOriginalFile(localEvidenceId)
      if (!currentOriginal) return null
      const nextRecord: OfflineEvidenceRecord = {
        ...currentRecord,
        ...patch,
        localEvidenceId: currentRecord.localEvidenceId,
        idempotencyKey: currentRecord.idempotencyKey,
        updatedAt: new Date().toISOString(),
      }
      const tx = db.transaction([RECORD_STORE, BLOB_STORE], 'readwrite')
      tx.objectStore(RECORD_STORE).put(nextRecord)
      tx.objectStore(BLOB_STORE).put({
        localEvidenceId,
        originalFile: currentOriginal,
        uploadFile: file,
      })
      await transactionComplete(tx)
      return nextRecord
    } finally {
      db.close()
    }
  }

  async list(filter?: { assignmentId?: string; statuses?: OfflineEvidenceStatus[] }): Promise<OfflineEvidenceRecord[]> {
    const db = await openDatabase()
    try {
      const tx = db.transaction(RECORD_STORE, 'readonly')
      const records = await requestToPromise<OfflineEvidenceRecord[]>(
        tx.objectStore(RECORD_STORE).getAll(),
      )
      return records.filter(record => {
        if (filter?.assignmentId && record.assignmentId !== filter.assignmentId) return false
        if (filter?.statuses && !filter.statuses.includes(record.status)) return false
        return true
      })
    } finally {
      db.close()
    }
  }

  async update(localEvidenceId: string, patch: Partial<OfflineEvidenceRecord>): Promise<OfflineEvidenceRecord | null> {
    const current = await this.get(localEvidenceId)
    if (!current) return null
    const next: OfflineEvidenceRecord = {
      ...current,
      ...patch,
      localEvidenceId: current.localEvidenceId,
      idempotencyKey: current.idempotencyKey,
      updatedAt: new Date().toISOString(),
    }
    const db = await openDatabase()
    try {
      const tx = db.transaction(RECORD_STORE, 'readwrite')
      tx.objectStore(RECORD_STORE).put(next)
      await transactionComplete(tx)
      return next
    } finally {
      db.close()
    }
  }

  async delete(localEvidenceId: string): Promise<void> {
    const db = await openDatabase()
    try {
      const tx = db.transaction([RECORD_STORE, BLOB_STORE], 'readwrite')
      tx.objectStore(RECORD_STORE).delete(localEvidenceId)
      tx.objectStore(BLOB_STORE).delete(localEvidenceId)
      await transactionComplete(tx)
    } finally {
      db.close()
    }
  }
}

export class MemoryLocalEvidenceRepository implements LocalEvidenceRepository {
  private records = new Map<string, OfflineEvidenceRecord>()
  private originalFiles = new Map<string, File>()
  private uploadFiles = new Map<string, File>()

  async save(record: OfflineEvidenceRecord, file: File): Promise<OfflineEvidenceRecord> {
    const existingDuplicate = [...this.records.values()].find(
      current => current.idempotencyKey === record.idempotencyKey
        && current.localEvidenceId !== record.localEvidenceId,
    )
    if (existingDuplicate) {
      return existingDuplicate
    }

    this.records.set(record.localEvidenceId, record)
    this.originalFiles.set(record.localEvidenceId, file)
    this.uploadFiles.set(record.localEvidenceId, file)
    return record
  }

  async get(localEvidenceId: string): Promise<OfflineEvidenceRecord | null> {
    return this.records.get(localEvidenceId) ?? null
  }

  async getFile(localEvidenceId: string): Promise<File | null> {
    return this.uploadFiles.get(localEvidenceId) ?? this.originalFiles.get(localEvidenceId) ?? null
  }

  async getOriginalFile(localEvidenceId: string): Promise<File | null> {
    return this.originalFiles.get(localEvidenceId) ?? this.uploadFiles.get(localEvidenceId) ?? null
  }

  async saveUploadFile(
    localEvidenceId: string,
    file: File,
    patch?: Partial<OfflineEvidenceRecord>,
  ): Promise<OfflineEvidenceRecord | null> {
    const current = this.records.get(localEvidenceId)
    if (!current) return null
    const next: OfflineEvidenceRecord = {
      ...current,
      ...patch,
      localEvidenceId: current.localEvidenceId,
      idempotencyKey: current.idempotencyKey,
      updatedAt: new Date().toISOString(),
    }
    this.records.set(localEvidenceId, next)
    this.uploadFiles.set(localEvidenceId, file)
    return next
  }

  async list(filter?: { assignmentId?: string; statuses?: OfflineEvidenceStatus[] }): Promise<OfflineEvidenceRecord[]> {
    return [...this.records.values()].filter(record => {
      if (filter?.assignmentId && record.assignmentId !== filter.assignmentId) return false
      if (filter?.statuses && !filter.statuses.includes(record.status)) return false
      return true
    })
  }

  async update(localEvidenceId: string, patch: Partial<OfflineEvidenceRecord>): Promise<OfflineEvidenceRecord | null> {
    const current = this.records.get(localEvidenceId)
    if (!current) return null
    const next: OfflineEvidenceRecord = {
      ...current,
      ...patch,
      localEvidenceId: current.localEvidenceId,
      idempotencyKey: current.idempotencyKey,
      updatedAt: new Date().toISOString(),
    }
    this.records.set(localEvidenceId, next)
    return next
  }

  async delete(localEvidenceId: string): Promise<void> {
    this.records.delete(localEvidenceId)
    this.originalFiles.delete(localEvidenceId)
    this.uploadFiles.delete(localEvidenceId)
  }
}

let sharedRepository: LocalEvidenceRepository | null = null

export function getLocalEvidenceRepository(): LocalEvidenceRepository {
  if (sharedRepository) return sharedRepository
  sharedRepository = hasIndexedDb()
    ? new IndexedDbLocalEvidenceRepository()
    : new MemoryLocalEvidenceRepository()
  return sharedRepository
}

export function setLocalEvidenceRepositoryForTests(repository: LocalEvidenceRepository | null) {
  sharedRepository = repository
}
