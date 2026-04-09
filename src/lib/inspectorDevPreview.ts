'use client'

import type { JobTimeSlot } from '@/lib/types'
import type {
  AhjOverlayContext,
  CompletionChecklistStageDefinition,
} from '@/lib/inspectorCompletion'
import type { InspectorCompletionDocumentRow, InspectorCompletionReportRow } from '@/lib/supabase/inspectorCompletion'

export const DEV_PREVIEW_ASSIGNMENT_ID = 'dev-preview'

export function isInspectorDevPreviewEnabled(): boolean {
  return process.env.NODE_ENV !== 'production'
}

export function isInspectorDevPreviewAssignment(assignmentId: string): boolean {
  return isInspectorDevPreviewEnabled() && assignmentId === DEV_PREVIEW_ASSIGNMENT_ID
}

export const DEV_PREVIEW_CLAIMED_SLOT: JobTimeSlot = {
  date: '2026-04-02',
  startTime: '09:00',
  endTime: '11:00',
}

export const DEV_PREVIEW_ASSIGNMENT = {
  id: DEV_PREVIEW_ASSIGNMENT_ID,
  jobId: 'dev-preview-job',
  inspectorId: 'dev-preview-inspector',
  status: 'provisional',
  assignedAt: '2026-03-31T16:15:00.000Z',
  objectionWindowClosesAt: '2026-04-01T16:15:00.000Z',
  claimedSlot: DEV_PREVIEW_CLAIMED_SLOT,
} as const

export const DEV_PREVIEW_JOB = {
  id: 'dev-preview-job',
  projectId: 'dev-preview-project',
  projectName: 'West 8th Mixed-Use Podium',
  address: '1288 W 8th Ave',
  city: 'Vancouver',
  region: 'vancouver',
  projectType: 'Mixed Use Podium',
  notes: 'Preview-only seeded inspection package for local UI review. No live dispatch state is changed.',
  permitNumber: 'BP-DEV-48219',
  stageName: 'Framing and Structural Review',
  builderId: 'dev-preview-builder',
  builderName: 'North Shore Build Co.',
  dispatchTier: 'priority',
  status: 'provisionally_assigned',
} as const

export function createInspectorDevPreviewReport(input: {
  assignmentId: string
  inspectorId: string
  stages: CompletionChecklistStageDefinition[]
  overlay: AhjOverlayContext
}): InspectorCompletionReportRow {
  const timestamp = '2026-03-31T18:00:00.000Z'
  return {
    id: 'completion-dev-preview-report',
    assignmentId: input.assignmentId,
    jobId: DEV_PREVIEW_JOB.id,
    inspectorId: input.inspectorId,
    projectId: DEV_PREVIEW_JOB.projectId,
    projectName: DEV_PREVIEW_JOB.projectName,
    address: DEV_PREVIEW_JOB.address,
    city: DEV_PREVIEW_JOB.city,
    region: DEV_PREVIEW_JOB.region,
    projectType: DEV_PREVIEW_JOB.projectType,
    currentStage: 1,
    stageCount: input.stages.length,
    jurisdictionName: input.overlay.jurisdictionName,
    ahjOverlayType: input.overlay.type,
    ahjOverlayLabel: input.overlay.label,
    overlaySnapshot: input.overlay,
    checklistSnapshot: input.stages.flatMap(stage => stage.items.map(item => ({ ...item }))),
    status: 'draft',
    sealApplied: false,
    sealPayload: {},
    lastSavedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function createInspectorDevPreviewDocument(input: {
  reportId: string
  assignmentId: string
  itemCode: string
  fileName: string
  mimeType?: string
  fileSize?: number
  uploadedBy?: string
}): InspectorCompletionDocumentRow {
  return {
    id: `preview-doc-${crypto.randomUUID()}`,
    reportId: input.reportId,
    assignmentId: input.assignmentId,
    itemCode: input.itemCode,
    fileName: input.fileName,
    storagePath: `preview://${input.fileName}`,
    mimeType: input.mimeType,
    fileSize: input.fileSize,
    uploadedBy: input.uploadedBy,
    createdAt: new Date().toISOString(),
  }
}
