/**
 * Persist completed inspection records with structured evidence.
 * Server-backed (Supabase) when available; local (localStorage) fallback.
 */

import type { EvidenceItem } from '@/lib/domain/types'
import { insertCompletedRecord, selectCompletedRecords, selectCompletedRecordById } from '@/lib/supabase/compliance'

const STORAGE_KEY = 'vero_completed_inspections'

/** Persisted record when an inspection is sealed. Manifest-ready (EvidenceItem[] as-is). */
export interface CompletedInspectionRecord {
  id: string
  projectId: string
  projectName: string
  address: string
  city?: string
  stage: number
  stageName: string
  /** 'stopped' is added for inspections terminated by a builder-declined hold. */
  result: 'pass' | 'fail' | 'stopped'
  /** Structured evidence; compatible with EvidenceManifest.items and authority package index. */
  evidenceItems: EvidenceItem[]
  completedAt: string
  builderId?: string
  builderName?: string
  inspectorId?: string
  inspectorName: string
  inspectorLicense: string
  passItems: number
  failItems: number
  certRef: string
  jobRef?: string
  permitNumber?: string
  discipline?: string
  region?: string
  jurisdictionId?: string
  jurisdictionName?: string
  authorityName?: string
  sealed: boolean
  /** Present when result === 'stopped'. References the hold that caused termination. */
  holdId?: string
  /** Resolved hold / site retainer history captured at finalization time. */
  holdHistory?: Record<string, unknown>[]
  /** Per-item checklist results saved at seal time for PDF rendering. */
  checklistResults?: {
    itemId:  string
    label:   string
    result:  'pass' | 'fail' | 'na' | 'pending'
    note?:   string
  }[]
}

function readLocal(): CompletedInspectionRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CompletedInspectionRecord[]) : []
  } catch {
    return []
  }
}

function writeLocal(records: CompletedInspectionRecord[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // ignore
  }
}

/** Persist a completed inspection: server first, then local fallback. */
export async function saveCompletedInspection(record: CompletedInspectionRecord): Promise<void> {
  try {
    const ok = await insertCompletedRecord(record)
    if (!ok) throw new Error('insert failed')
  } catch (error) {
    console.error('saveCompletedInspection fallback:', error)
    // fallback to local
  }
  const list = readLocal()
  if (!list.some(r => r.id === record.id)) {
    list.unshift(record)
    writeLocal(list)
  }
}

/** Load all from local storage (sync). Use loadCompletedInspectionsFromServer() for server-backed list. */
export function loadCompletedInspections(): CompletedInspectionRecord[] {
  return readLocal()
}

/** Load all completed records from server. Returns [] on error or missing table. */
export async function loadCompletedInspectionsFromServer(): Promise<CompletedInspectionRecord[]> {
  try {
    return await selectCompletedRecords()
  } catch {
    return []
  }
}

/** Get one record by id from local only (sync). */
export function getCompletedInspectionById(id: string): CompletedInspectionRecord | undefined {
  return readLocal().find(r => r.id === id)
}

/** Get one record by id: server first, then local fallback. */
export async function getCompletedInspectionByIdAsync(id: string): Promise<CompletedInspectionRecord | undefined> {
  try {
    const row = await selectCompletedRecordById(id)
    if (row) return row
  } catch {
    // fallback
  }
  return getCompletedInspectionById(id)
}
