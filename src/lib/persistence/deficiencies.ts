/**
 * Persist deficiencies against completed inspection/package records.
 * Server-backed (Supabase) when available; local (localStorage) fallback.
 */

import {
  insertDeficiency as insertDeficiencyServer,
  updateDeficiencyRow,
  selectDeficienciesByRecordId as selectDeficienciesByRecordIdServer,
} from '@/lib/supabase/compliance'

const STORAGE_KEY = 'vero_deficiencies'

export type RecordDeficiencyStatus = 'open' | 'responded' | 'resolved'

/** Runtime deficiency tied to a completed record/package (not full submission). */
export interface RecordDeficiency {
  id: string
  recordId: string
  checklistItemRef?: string
  evidenceItemRef?: string
  reviewerComment: string
  response?: string
  status: RecordDeficiencyStatus
  resolvedInVersion?: number
  createdAt: string
  updatedAt: string
}

function readLocal(): RecordDeficiency[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as RecordDeficiency[]) : []
  } catch {
    return []
  }
}

function writeLocal(list: RecordDeficiency[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

const id = () => `def-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
const now = () => new Date().toISOString()

/** Get deficiencies by record id from local only (sync). */
export function getDeficienciesByRecordId(recordId: string): RecordDeficiency[] {
  return readLocal().filter(d => d.recordId === recordId)
}

/** Get deficiencies by record id: server first, then local fallback. */
export async function getDeficienciesByRecordIdAsync(recordId: string): Promise<RecordDeficiency[]> {
  try {
    const list = await selectDeficienciesByRecordIdServer(recordId)
    if (list.length > 0) return list
  } catch {
    // fallback
  }
  return getDeficienciesByRecordId(recordId)
}

export function getDeficiencyCountByRecordId(recordId: string): number {
  return readLocal().filter(d => d.recordId === recordId).length
}

/** Add deficiency: server first, then local. */
export function addDeficiency(
  input: Omit<RecordDeficiency, 'id' | 'createdAt' | 'updatedAt'>
): RecordDeficiency {
  const ts = now()
  const def: RecordDeficiency = {
    ...input,
    id: id(),
    createdAt: ts,
    updatedAt: ts,
  }
  insertDeficiencyServer(def).catch(() => { /* fallback: write local only */ })
  const list = readLocal()
  list.push(def)
  writeLocal(list)
  return def
}

/** Update deficiency: server first, then local. */
export function updateDeficiency(
  defId: string,
  updates: Partial<Pick<RecordDeficiency, 'response' | 'status' | 'resolvedInVersion'>>
): RecordDeficiency | null {
  updateDeficiencyRow(defId, updates).catch(() => { /* fallback */ })
  const list = readLocal()
  const idx = list.findIndex(d => d.id === defId)
  if (idx === -1) return null
  const updated = { ...list[idx], ...updates, updatedAt: now() }
  list[idx] = updated
  writeLocal(list)
  return updated
}
