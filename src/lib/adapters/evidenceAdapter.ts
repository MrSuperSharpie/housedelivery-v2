/**
 * Inspection evidence adapter: create domain EvidenceItem from inspection actions,
 * and derive legacy ItemEvidence view for UI. Keeps inspection output manifest-ready.
 */

import type { EvidenceItem, EvidenceKind } from '@/lib/domain/types'

/** Legacy view per checklist item (photos count, video flag, note). Derived from evidenceItems. */
export interface ItemEvidenceView {
  photos: number
  video: boolean
  note: string
}

export interface CreateInspectionEvidenceParams {
  projectId: string
  /** Stage number (1–5). Stored in metadata; stageId on EvidenceItem left for future. */
  stage: number
  /** Checklist item id this evidence belongs to. */
  checklistItemId: string
  kind: EvidenceKind
  capturedBy?: string
  notes?: string
  caption?: string
  /** When permit id is not available, use a ref for traceability (e.g. 'building'). */
  permitIdRef?: string
}

const id = () => `ev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
const now = () => new Date().toISOString()

/**
 * Create a structured EvidenceItem for the inspection flow.
 * Uses placeholder storage when real upload is not implemented.
 */
export function createInspectionEvidenceItem(params: CreateInspectionEvidenceParams): EvidenceItem {
  const { projectId, stage, checklistItemId, kind, capturedBy, notes, caption, permitIdRef } = params
  const ts = now()
  return {
    id: id(),
    projectId,
    permitId: undefined,
    stageId: undefined,
    holdPointId: undefined,
    kind,
    fileType: kind === 'photo' ? 'image/jpeg' : kind === 'video' ? 'video/mp4' : undefined,
    originalFilename: undefined,
    storagePath: `placeholder://inspection/${id()}`,
    storageKey: undefined,
    captureTimestamp: ts,
    uploadedBy: capturedBy,
    capturedBy,
    notes,
    caption,
    geo: undefined,
    validationState: 'pending',
    checksum: undefined,
    hashPlaceholder: undefined,
    metadata: {
      checklistItemId,
      stageNumber: stage,
      ...(permitIdRef && { permitIdRef }),
    },
    createdAt: ts,
    updatedAt: ts,
  }
}

/**
 * Derive legacy ItemEvidence view from evidenceItems for UI (ChecklistRow, Evidence tab, Archive).
 */
export function evidenceItemsToLegacyView(
  evidenceItems: EvidenceItem[],
  itemIds: string[]
): Record<string, ItemEvidenceView> {
  const view: Record<string, ItemEvidenceView> = {}
  itemIds.forEach((itemId) => {
    const forItem = evidenceItems.filter(
      (e) => (e.metadata?.checklistItemId as string) === itemId
    )
    const photos = forItem.filter((e) => e.kind === 'photo').length
    const video = forItem.some((e) => e.kind === 'video')
    const noteItem = forItem.find((e) => e.kind === 'other' || e.kind === 'voice_note')
    view[itemId] = {
      photos,
      video,
      note: noteItem?.notes ?? noteItem?.caption ?? '',
    }
  })
  return view
}

/**
 * Build manifest-ready evidence list from inspection evidenceItems.
 * Compatible with EvidenceManifest.items and future authority package evidence index.
 */
export function buildManifestFromInspectionEvidence(
  evidenceItems: EvidenceItem[],
  _projectId: string
): EvidenceItem[] {
  return [...evidenceItems]
}
