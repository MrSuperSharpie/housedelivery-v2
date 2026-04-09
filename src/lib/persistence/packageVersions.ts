/**
 * Persist resubmission version history for completed inspection/package records.
 * Server-backed (Supabase) when available; local (localStorage) fallback.
 */

import { insertPackageVersion, selectVersionsByRecordId as selectVersionsByRecordIdServer } from '@/lib/supabase/compliance'

const STORAGE_KEY = 'siteline_package_versions'

export interface PackageVersionRecord {
  id: string
  recordId: string
  version: number
  createdAt: string
  note?: string
}

function readLocal(): PackageVersionRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PackageVersionRecord[]) : []
  } catch {
    return []
  }
}

function writeLocal(list: PackageVersionRecord[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

const id = () => `ver-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
const now = () => new Date().toISOString()

/** Get version history from local only (sync). */
export function getVersionsByRecordId(recordId: string): PackageVersionRecord[] {
  return readLocal()
    .filter(v => v.recordId === recordId)
    .sort((a, b) => a.version - b.version)
}

/** Get version history: server first, then local fallback. */
export async function getVersionsByRecordIdAsync(recordId: string): Promise<PackageVersionRecord[]> {
  try {
    const list = await selectVersionsByRecordIdServer(recordId)
    if (list.length > 0) return list
  } catch {
    // fallback
  }
  return getVersionsByRecordId(recordId)
}

/** Current version number (local). Version 1 = original; 2+ = resubmissions. */
export function getCurrentVersion(recordId: string): number {
  const versions = getVersionsByRecordId(recordId)
  if (versions.length === 0) return 1
  return Math.max(...versions.map(v => v.version))
}

/** Add a resubmission version: server first, then local. */
export function addResubmissionVersion(recordId: string, note?: string): PackageVersionRecord {
  const nextVersion = getCurrentVersion(recordId) + 1
  const toInsert: PackageVersionRecord = {
    id: id(),
    recordId,
    version: nextVersion,
    createdAt: now(),
    note: note ?? `Resubmission v${nextVersion}`,
  }
  insertPackageVersion(toInsert).catch(() => { /* fallback */ })
  const list = readLocal()
  list.push(toInsert)
  writeLocal(list)
  return toInsert
}
