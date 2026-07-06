'use client'

import React, { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Clock,
  File,
  FileCheck2,
  FileText,
  FileUp,
  Loader2,
  Lock,
  MapPin,
  PauseCircle,
  Play,
  ShieldCheck,
  Stamp,
  Trash2,
  Upload,
  Video,
  XCircle,
} from 'lucide-react'
import {
  FieldMediaUploader,
  type FieldMediaCapturePayload,
} from '@/components/inspector/FieldMediaUploader'
import { StageCodeReferences } from '@/components/inspector/StageCodeReferences'
import { Navbar } from '@/components/shared/Navbar'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth'
import { useStore } from '@/lib/store'
import {
  createInspectorDevPreviewDocument,
  createInspectorDevPreviewReport,
  DEV_PREVIEW_ASSIGNMENT,
  DEV_PREVIEW_JOB,
  isInspectorDevPreviewAssignment,
} from '@/lib/inspectorDevPreview'
import { insertCompletedRecordStrict } from '@/lib/supabase/compliance'
import { completeJobAssignment, updateAssignmentEscrowStatus, updateJobStatus } from '@/lib/supabase/jobs'
import { addHoldEvidence, getLatestOpenHoldForJob, listHoldDetailsForJob } from '@/lib/supabase/holds'
import {
  buildCompletionChecklist,
  COMPLETION_STAGE_PHASES,
  type AhjOverlayContext,
  type CompletionChecklistItemDefinition,
  type CompletionChecklistStageDefinition,
  type CompletionInspectionStatus,
} from '@/lib/inspectorCompletion'
import {
  deleteInspectorCompletionDocument,
  getInspectorCompletionBundle,
  getInspectorCompletionDocumentSignedUrl,
  createFieldGeoAnomaly,
  type InspectorCompletionDocumentRow,
  type InspectorCompletionReportRow,
  uploadInspectorCompletionDocument,
  updateInspectorCompletionDocumentManualLocationNote,
  upsertInspectorCompletionItems,
  upsertInspectorCompletionReport,
} from '@/lib/supabase/inspectorCompletion'
import type { EvidenceItem, EvidenceKind, EvidenceValidationState, GeoCoord } from '@/lib/domain/types'
import { evaluateGeofence } from '@/lib/geofence'
import { isHoldOpenStatus } from '@/lib/holds/workflow'
import { buildHoldEvidenceItems, buildHoldHistorySummary } from '@/lib/holds/reporting'
import {
  resolveHoldBaseRate,
} from '@/lib/pricing/config'
import type { HoldCategory, HoldEvidenceType, HoldRecord } from '@/lib/types'
import { calculateBaseHoldServiceFee } from '@/utils/pricing'

const supabase = createClient()

interface AssignmentContext {
  id: string
  jobId: string
  inspectorId: string
  status?: string
}

interface JobContext {
  id: string
  projectId: string
  projectName: string
  address: string
  city: string
  region?: string
  projectType?: string
  notes?: string
  permitNumber?: string
  stage?: number
  stageName: string
  builderId?: string
  builderName?: string
  status?: string
  discipline?: string
}

interface WorkspaceItem extends CompletionChecklistItemDefinition {
  id: string
  response_note: string
  documents: InspectorCompletionDocumentRow[]
  metadata: Record<string, unknown>
}

interface PendingHoldEvidenceItem {
  id: string
  evidenceType: Extract<HoldEvidenceType, 'photo' | 'video' | 'attachment'>
  file: File
  fileName: string
  fileSize: number
  mimeType: string
  capturedAt: string
  lat?: number
  lng?: number
  offlineCapture: boolean
}

interface PreSealEvidenceLocationIssue {
  itemCode: string
  itemLabel: string
  doc: InspectorCompletionDocumentRow
  reason: string
}

function createRuntimeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function createSealRef(): string {
  const stamp = new Date().getFullYear()
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
  return `VERO-IC-${stamp}-${suffix}`
}

function isStageItemResolved(item: WorkspaceItem): boolean {
  return item.inspection_status !== 'Pending'
}

function needsDocument(item: WorkspaceItem): boolean {
  return item.evidence_mode === 'required_upload'
    && item.document_upload_required
    && item.inspection_status !== 'Pending'
    && item.inspection_status !== 'N/A'
}

function itemHasRequiredDocument(item: WorkspaceItem): boolean {
  return !needsDocument(item) || item.documents.length > 0
}

function documentHasGpsCoordinates(doc: InspectorCompletionDocumentRow): boolean {
  return typeof doc.captureGeo?.latitude === 'number' && typeof doc.captureGeo?.longitude === 'number'
}

function documentHasManualLocationNote(doc: InspectorCompletionDocumentRow): boolean {
  return typeof doc.manualLocationNote === 'string' && doc.manualLocationNote.trim().length > 0
}

function getPreSealEvidenceLocationIssues(items: WorkspaceItem[]): PreSealEvidenceLocationIssue[] {
  return items.flatMap(item =>
    item.documents
      .filter(doc => !documentHasGpsCoordinates(doc) && !documentHasManualLocationNote(doc))
      .map(doc => ({
        itemCode: item.item_code,
        itemLabel: item.item_label,
        doc,
        reason: 'Missing GPS coordinates and no manual location note recorded.',
      }))
  )
}

function summarizePurpose(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const match = trimmed.match(/^[^.?!]+[.?!]?/)
  return match?.[0] ?? trimmed
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DocRow({
  doc,
  onClick,
  onDelete,
}: {
  doc: InspectorCompletionDocumentRow
  onClick: () => void
  onDelete: () => void
}) {
  const isPdf = doc.mimeType === 'application/pdf' || doc.fileName.toLowerCase().endsWith('.pdf')
  const isVideo = doc.mediaType === 'video' || doc.mimeType?.startsWith('video/') === true

  return (
    <div className="group flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm transition-all hover:border-zinc-300">
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-3 text-left hover:opacity-80 transition-opacity"
      >
        {doc.previewUrl ? (
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
            {isVideo ? (
              <video
                src={doc.previewUrl}
                className="h-10 w-10 object-cover"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={doc.previewUrl}
                alt={doc.fileName}
                className="h-10 w-10 object-cover bg-zinc-100"
              />
            )}
            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-sm">
                  <Play className="ml-0.5 h-3 w-3 fill-current" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
            isPdf ? 'border-red-100 bg-red-50' :
            isVideo ? 'border-sky-100 bg-sky-50' :
            'border-zinc-100 bg-zinc-50'
          }`}>
            {isPdf
              ? <FileText className="h-4 w-4 text-red-500" />
              : isVideo
                ? <Video className="h-4 w-4 text-sky-600" />
              : <File className="h-4 w-4 text-zinc-400" />}
            {isVideo && (
              <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-slate-900 text-white shadow-sm">
                <Play className="ml-0.5 h-2.5 w-2.5 fill-current" />
              </div>
            )}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-zinc-900">{doc.fileName}</div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500 font-medium">
            {isVideo && <span className="text-sky-700">Video</span>}
            {isVideo && <span className="opacity-50">•</span>}
            {doc.fileSize != null && <span>{formatBytes(doc.fileSize)}</span>}
            {doc.fileSize != null && <span className="opacity-50">•</span>}
            <span>
              {new Date(doc.createdAt).toLocaleString('en-CA', {
                hour: '2-digit',
                minute: '2-digit',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </button>
      
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label={`Remove ${doc.fileName}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-90"
        title="Delete file"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function GuidanceList({
  items,
  bulletClassName,
  textClassName = 'text-sm text-zinc-300',
}: {
  items: string[]
  bulletClassName: string
  textClassName?: string
}) {
  return (
    <ul className={`space-y-2 ${textClassName}`}>
      {items.map(detail => (
        <li key={detail} className="flex gap-2">
          <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${bulletClassName}`} />
          <span>{detail}</span>
        </li>
      ))}
    </ul>
  )
}

function VeroSealIcon({
  certified = false,
  className = '',
}: {
  certified?: boolean
  className?: string
}) {
  const shellClass = certified
    ? 'border-emerald-300/50 text-white overflow-hidden'
    : 'border-slate-600/60 bg-slate-800/40 text-slate-300'
  const ringClass = certified ? 'border-white/20' : 'border-slate-500/20'
  const badgeClass = certified
    ? 'border-emerald-300/60 bg-emerald-900/80 text-white'
    : 'border-slate-500/30 bg-slate-900/70 text-slate-300'

  return (
  <img
    src="/vero-seal-v2.png"
    alt="Vero Permit Certification Seal"
    className={`h-16 w-16 rounded-full object-cover ${className}`}
  />
  )
}

interface ChecklistEntryState {
  checked?: boolean
  note?: string
  captures?: ChecklistCaptureRecord[]
}

interface ChecklistCaptureRecord {
  source: FieldMediaCapturePayload['source']
  capturedAt: string
  latitude: number | null
  longitude: number | null
  fileName: string
  mimeType: string
  fileSize: number
  documentId?: string
  storagePath?: string
}

type FieldEvidenceAction = 'camera' | 'video' | 'audio' | 'text'

interface StageSignOffRecord {
  stageNumber: number
  signedAt: string
  latitude: number | null
  longitude: number | null
  signedBy: string
  signedById: string
  itemCodes: string[]
  unlockedStages: number[]
}

interface LocationSnapshot {
  latitude: number | null
  longitude: number | null
  error?: string
}

interface ProjectReferencePoint {
  latitude: number | null
  longitude: number | null
}

interface StageTransitionHandshake {
  completedStageNumber: number
  completedStageName: string
  nextStageNumber: number
  nextStageName: string
  targetItemCode: string | null
}

const STAGE_SIGN_OFF_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
}

function checklistEntryKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function parseFieldEvidenceActions(label: string): FieldEvidenceAction[] | null {
  const match = label.match(/\(([^)]+)\)\s*$/i)
  if (!match) return null

  const normalizedInstruction = match[1]
    .replace(/^evidence:\s*/i, '')
    .replace(/\s+evidence required$/i, '')

  const actions = normalizedInstruction
    .split(/\/|,|\bor\b|\band\b/gi)
    .map(value => value.trim().toLowerCase())
    .flatMap<FieldEvidenceAction>(value => {
      if (value === 'camera' || value === 'photo') return ['camera']
      if (value === 'video') return ['video']
      if (value === 'text' || value === 'note') return ['text']
      if (value === 'audio' || value === 'voice' || value === 'mic') return ['audio']
      return []
    })

  return actions.length > 0 ? actions : null
}

function getChecklistStateMap(item: WorkspaceItem): Record<string, ChecklistEntryState> {
  const candidate = item.metadata?.fieldChecklistState
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return {}
  return candidate as Record<string, ChecklistEntryState>
}

function getChecklistEntryState(item: WorkspaceItem, checklistLabel: string): ChecklistEntryState {
  const stateMap = getChecklistStateMap(item)
  return stateMap[checklistEntryKey(checklistLabel)] ?? {}
}

function getRuntimeChecklistItems(item: WorkspaceItem): string[] {
  return item.field_checklist.length > 0 ? item.field_checklist : item.what_to_check
}

function isRequiredStageItem(item: WorkspaceItem): boolean {
  return item.is_required !== false
}

function dependencyStatusSatisfiesGate(item: WorkspaceItem | undefined): boolean {
  return item?.inspection_status === 'Passed' || item?.inspection_status === 'N/A'
}

function getUnresolvedDependencyCodes(item: WorkspaceItem, items: WorkspaceItem[], scopedToStageNumber?: number): string[] {
  if (item.inspection_status === 'N/A') return []

  return item.dependencies.filter(dep => {
    const dependency = items.find(candidate => candidate.item_code === dep)
    if (!dependency) return false
    // In a scoped assignment, dependencies from earlier stages are treated as already satisfied.
    // The builder's request implicitly asserts prior stages are complete.
    if (scopedToStageNumber !== undefined && dependency.stage_number < scopedToStageNumber) return false
    return !dependencyStatusSatisfiesGate(dependency)
  })
}

function checklistEntryNeedsEvidence(checklistLabel: string): boolean {
  const evidenceActions = parseFieldEvidenceActions(checklistLabel)
  return evidenceActions !== null && evidenceActions.length > 0
}

function isChecklistEntryComplete(item: WorkspaceItem, checklistLabel: string): boolean {
  const entryState = getChecklistEntryState(item, checklistLabel)
  const hasRequiredEvidence = !checklistEntryNeedsEvidence(checklistLabel)
    || (entryState.captures?.length ?? 0) > 0

  return entryState.checked === true && hasRequiredEvidence
}

function isStageItemReadyForSignOff(item: WorkspaceItem, items: WorkspaceItem[], scopedToStageNumber?: number): boolean {
  if (item.inspection_status === 'Failed') return false
  if (item.inspection_status === 'N/A') return true
  if (item.inspection_status !== 'Passed') return false
  if (getUnresolvedDependencyCodes(item, items, scopedToStageNumber).length > 0) return false

  const checklistItems = getRuntimeChecklistItems(item)
  const checklistReady = checklistItems.length === 0
    ? isStageItemResolved(item)
    : checklistItems.every(detail => isChecklistEntryComplete(item, detail))

  return checklistReady && itemHasRequiredDocument(item)
}

/**
 * A Failed container counts as "documented" — and therefore submittable on the
 * scoped path — only when it carries a deficiency note AND at least one attached
 * evidence item. An undocumented Fail must keep blocking sign-off. ("Evidence
 * unavailable" is intentionally not supported yet; it remains a later controlled
 * feature with a structured reason and QA/audit handling.)
 */
function isDocumentedFail(item: WorkspaceItem): boolean {
  return item.inspection_status === 'Failed'
    && item.response_note.trim().length > 0
    && item.documents.length > 0
}

function getFirstIncompleteStageItem(items: WorkspaceItem[], stageNumber: number, scopedToStageNumber?: number): WorkspaceItem | null {
  const stageRows = items.filter(item => item.stage_number === stageNumber)
  const firstDependencyBlocker = stageRows.find(item =>
    isRequiredStageItem(item) && getUnresolvedDependencyCodes(item, items, scopedToStageNumber).length > 0
  )
  if (firstDependencyBlocker) return firstDependencyBlocker

  const firstEvidenceGap = stageRows.find(item =>
    item.evidence_mode === 'required_upload'
    && item.document_upload_required
    && item.documents.length === 0
  )
  if (firstEvidenceGap) return firstEvidenceGap

  const firstRequiredIncomplete = stageRows.find(item => isRequiredStageItem(item) && !isStageItemReadyForSignOff(item, items, scopedToStageNumber))
  if (firstRequiredIncomplete) return firstRequiredIncomplete

  const firstIncomplete = stageRows.find(item => !isStageItemResolved(item))
  return firstIncomplete ?? stageRows[0] ?? null
}

function getStageDefinitionByNumber(
  stages: CompletionChecklistStageDefinition[],
  stageNumber: number,
): CompletionChecklistStageDefinition | null {
  return stages.find(stage => stage.stage_number === stageNumber) ?? null
}

const BUILDER_STAGE_TO_COMPLETION_STAGE: Record<number, number> = {
  1: 1,
  2: 5,
  3: 6,
  4: 12,
  5: 13,
  6: 14,
  7: 15,
}

const DISCIPLINE_STAGE_OVERRIDE: Partial<Record<string, Partial<Record<number, number>>>> = {
  architectural:    { 3: 7 },
  fire_protection:  { 3: 8 },
  plumbing:         { 3: 9 },
  electrical:       { 3: 10 },
  mechanical:       { 3: 11 },
}

const BUILDER_STAGE_LABELS: Record<number, string> = {
  1: 'Stage 1 — Site Survey & Excavation',
  2: 'Stage 2 — Foundation Pour',
  3: 'Stage 3 — Framing & Lock-up',
  4: 'Stage 4 — Insulation & Energy Compliance',
  5: 'Stage 5 — Interior Completion',
  6: 'Stage 6 — Exterior Works and Site Finalization',
  7: 'Stage 7 — Final Approval and Occupancy',
}

function resolveRequestedChecklistStage(
  stages: CompletionChecklistStageDefinition[],
  requestedBuilderStage?: number,
  discipline?: string,
): number {
  if (typeof requestedBuilderStage !== 'number' || !Number.isFinite(requestedBuilderStage)) return 1
  const builderStageNumber = Math.trunc(requestedBuilderStage)
  const override = discipline ? DISCIPLINE_STAGE_OVERRIDE[discipline]?.[builderStageNumber] : undefined
  const completionStageNumber = override ?? BUILDER_STAGE_TO_COMPLETION_STAGE[builderStageNumber]
  if (!completionStageNumber) return 1
  return getStageDefinitionByNumber(stages, completionStageNumber)?.stage_number ?? 1
}

function resolveBuilderStageNumber(requestedBuilderStage?: number): number {
  if (typeof requestedBuilderStage !== 'number' || !Number.isFinite(requestedBuilderStage)) return 1
  const builderStageNumber = Math.trunc(requestedBuilderStage)
  return BUILDER_STAGE_TO_COMPLETION_STAGE[builderStageNumber] ? builderStageNumber : 1
}

function getBuilderStageLabel(builderStageNumber: number): string {
  return BUILDER_STAGE_LABELS[builderStageNumber] ?? `Stage ${builderStageNumber}`
}

function getBuilderStageForCompletionStage(completionStageNumber: number): number | null {
  const entry = Object.entries(BUILDER_STAGE_TO_COMPLETION_STAGE)
    .find(([, stageNumber]) => stageNumber === completionStageNumber)
  return entry ? Number(entry[0]) : null
}

function getBuilderRequestMessageForCompletionStage(completionStageNumber: number): string {
  const builderStageNumber = getBuilderStageForCompletionStage(completionStageNumber)
  return builderStageNumber
    ? `Requires a new builder request for ${getBuilderStageLabel(builderStageNumber)}`
    : 'Requires a separate builder request before this stage can be inspected.'
}

function reportHasMeaningfulProgress(
  report: InspectorCompletionReportRow,
  persistedItems: NonNullable<Awaited<ReturnType<typeof getInspectorCompletionBundle>>>['items'],
  persistedDocuments: InspectorCompletionDocumentRow[],
): boolean {
  return report.status !== 'draft'
    || report.sealApplied
    || persistedItems.length > 0
    || persistedDocuments.length > 0
}

function getNextSequentialStage(
  stages: CompletionChecklistStageDefinition[],
  currentStage: number,
): CompletionChecklistStageDefinition | null {
  return [...stages]
    .sort((a, b) => a.stage_number - b.stage_number)
    .find(stage => stage.stage_number > currentStage) ?? null
}

function isStageSignOffRecord(value: unknown): value is StageSignOffRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false

  const candidate = value as Partial<StageSignOffRecord>

  return typeof candidate.stageNumber === 'number'
    && typeof candidate.signedAt === 'string'
    && typeof candidate.signedBy === 'string'
    && typeof candidate.signedById === 'string'
    && Array.isArray(candidate.itemCodes)
    && Array.isArray(candidate.unlockedStages)
}

function getStageSignOffs(payload: Record<string, unknown> | null | undefined): Record<string, StageSignOffRecord> {
  const candidate = payload?.stageSignOffs
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return {}

  const records: Record<string, StageSignOffRecord> = {}

  for (const [stageKey, value] of Object.entries(candidate)) {
    if (isStageSignOffRecord(value)) {
      records[stageKey] = value
    }
  }

  return records
}

async function captureStageLocation(): Promise<LocationSnapshot> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return {
      latitude: null,
      longitude: null,
      error: 'Location is unavailable on this device. The stage sign-off was saved without GPS coordinates.',
    }
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        STAGE_SIGN_OFF_GEOLOCATION_OPTIONS
      )
    })

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    }
  } catch {
    return {
      latitude: null,
      longitude: null,
      error: 'Location permission was unavailable. The stage sign-off was saved without GPS coordinates.',
    }
  }
}

async function captureHoldEvidenceLocation(): Promise<{ lat?: number; lng?: number; offlineCapture: boolean }> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return { offlineCapture: true }
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        STAGE_SIGN_OFF_GEOLOCATION_OPTIONS
      )
    })

    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      offlineCapture: false,
    }
  } catch {
    return { offlineCapture: true }
  }
}

async function collectStageLocationExplanation(input: {
  location: LocationSnapshot
  projectReferencePoint: ProjectReferencePoint | null
}): Promise<{
  explanation?: string
  geofenceState: ReturnType<typeof evaluateGeofence>
  blocked: boolean
}> {
  const geofenceState = evaluateGeofence({
    projectPoint: input.projectReferencePoint?.latitude != null && input.projectReferencePoint?.longitude != null
      ? {
          latitude: input.projectReferencePoint.latitude,
          longitude: input.projectReferencePoint.longitude,
        }
      : null,
    capturePoint: input.location.latitude != null && input.location.longitude != null
      ? {
          latitude: input.location.latitude,
          longitude: input.location.longitude,
        }
      : null,
    thresholdMeters: 250,
  })

  if (geofenceState.state !== 'anomalous') {
    return { geofenceState, blocked: false }
  }

  const explanation = window.prompt(
    'You appear to be outside the expected project geofence. Add a short explanation to continue and flag this for admin review.',
    '',
  )?.trim()

  if (!explanation) {
    return {
      geofenceState,
      blocked: true,
    }
  }

  return {
    explanation,
    geofenceState,
    blocked: false,
  }
}

function getUnlockedFutureStages(
  nextItems: WorkspaceItem[],
  stages: CompletionChecklistStageDefinition[],
  currentStage: number
): number[] {
  const itemMap = new Map(nextItems.map(item => [item.item_code, item]))

  return stages
    .filter(stage => stage.stage_number > currentStage)
    .filter(stage =>
      stage.items.some(stageItem => {
        const runtimeItem = itemMap.get(stageItem.item_code)
        if (!runtimeItem) return false

        return runtimeItem.dependencies.every(dep => {
          const dependency = itemMap.get(dep)
          return dependency ? dependencyStatusSatisfiesGate(dependency) : true
        })
      })
    )
    .map(stage => stage.stage_number)
}

function flattenDefinitions(stages: CompletionChecklistStageDefinition[]): Record<string, unknown>[] {
  return stages.flatMap(stage => stage.items.map(item => ({
    ...item,
    stage_summary: stage.summary,
  })))
}

// FIX: replaced the invalid `ReturnType<...> extends Promise<infer T> ? T['items'] : never`
// pattern with `NonNullable<Awaited<ReturnType<...>>>['items']` which correctly unwraps
// the Promise, strips null/undefined, and then safely indexes into 'items'.
function mergeItems(
  stages: CompletionChecklistStageDefinition[],
  reportId: string,
  assignmentId: string,
  persisted: NonNullable<Awaited<ReturnType<typeof getInspectorCompletionBundle>>>['items'],
  documents: InspectorCompletionDocumentRow[]
): WorkspaceItem[] {
  const persistedMap = new Map(persisted.map(item => [item.itemCode, item]))
  const docsByItem = new Map<string, InspectorCompletionDocumentRow[]>()

  for (const doc of documents) {
    const list = docsByItem.get(doc.itemCode) ?? []
    list.push(doc)
    docsByItem.set(doc.itemCode, list)
  }

  return stages.flatMap(stage =>
    stage.items.map((item, index) => {
      const existing = persistedMap.get(item.item_code)
      return {
        ...item,
        id: existing?.id ?? createRuntimeId(`${reportId}-${item.item_code}`),
        response_note: existing?.responseNote ?? '',
        inspection_status: existing?.inspectionStatus ?? item.inspection_status,
        ahj_notes: existing?.ahjNotes ?? item.ahj_notes,
        document_upload_required: existing?.documentUploadRequired ?? item.document_upload_required,
        dependencies: existing?.dependencies ?? item.dependencies,
        metadata: {
          sortOrder: existing?.sortOrder ?? index,
          ...(existing?.metadata ?? {}),
        },
        documents: docsByItem.get(item.item_code) ?? [],
        stage_number: item.stage_number,
      }
    })
  )
}

function StatusPill({
  label,
  sublabel,
  value,
  active,
  disabled,
  onClick,
  onDisabledClick,
}: {
  label: string
  sublabel?: string
  value: CompletionInspectionStatus
  active: boolean
  disabled?: boolean
  onClick: (value: CompletionInspectionStatus) => void
  onDisabledClick?: () => void
}) {
  const icon = active
    ? value === 'Passed'
      ? <CheckCircle2 className="h-4 w-4" />
      : value === 'Failed'
        ? <XCircle className="h-4 w-4" />
        : value === 'Pending'
          ? <Clock className="h-4 w-4" />
          : null
    : null

  const activeClass =
    value === 'Passed' ? 'border-success-green bg-success-green text-white shadow-sm ring-1 ring-inset ring-white/10' :
    value === 'Failed' ? 'border-fail-red bg-fail-red text-white shadow-sm ring-1 ring-inset ring-white/10' :
    value === 'Pending' ? 'border-rim bg-white/10 text-[color:var(--color-ink)]' :
    'border-rim bg-white/10 text-[color:var(--color-ink)]'

  const idleClass = 'border-rim/60 bg-transparent text-[color:var(--color-subtle)] hover:bg-white/10 hover:text-[color:var(--color-ink)]'
  const disabledClass = 'cursor-not-allowed opacity-40'

  return (
    <button
      type="button"
      disabled={disabled && !onDisabledClick}
      aria-disabled={disabled === true}
      onClick={() => {
        if (disabled) {
          onDisabledClick?.()
          return
        }
        onClick(value)
      }}
      className={`min-h-12 rounded-2xl border px-4 py-3 text-sm font-black transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${disabled ? disabledClass : ''} ${active ? activeClass : idleClass}`}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {icon ? <span>{icon}</span> : null}
        <span className="flex flex-col items-center leading-tight">
          <span>{label}</span>
          {sublabel ? <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] opacity-75">{sublabel}</span> : null}
        </span>
      </span>
    </button>
  )
}

/**
 * Visual emphasis for a section the inspector has marked Failed. Wording/clarity
 * only — it does not change submission, payment, or stage-advancement logic.
 * `documented` reflects isDocumentedFail (deficiency note + evidence present).
 */
function FailedSectionPanel({ documented }: { documented: boolean }) {
  return (
    <div className="mt-3 rounded-2xl border border-rim/70 border-l-2 border-l-fail-red bg-white/5 px-4 py-3 text-sm text-ink">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-fail-red" />
        <span className="rounded-full border border-rim/70 bg-white/5 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-[0.14em] text-fail-red">
          Corrections Required
        </span>
      </div>
      <p className="mt-2 leading-relaxed text-muted">{FAIL_SECTION_PANEL_MESSAGE}</p>
      <div className={`mt-2 flex items-center gap-2 font-semibold ${documented ? 'text-success-green' : 'text-warning-amber'}`}>
        {documented
          ? <CheckCircle2 className="h-4 w-4 shrink-0" />
          : <AlertCircle className="h-4 w-4 shrink-0" />}
        <span>{documented ? FAIL_SECTION_READY_MESSAGE : FAIL_SECTION_DOC_REQUIRED_MESSAGE}</span>
      </div>
    </div>
  )
}

const FLOATING_PANEL_CLASS = 'shadow-[0_18px_34px_rgba(15,23,42,0.18)]'
const TACTILE_MEDIA_BUTTON_CLASS = 'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/8 px-0 text-[color:var(--color-muted)] transition-colors hover:bg-white/15 hover:text-[color:var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50'
const EMPHASIZED_BODY_TEXT_CLASS = 'text-[17px] leading-7 text-zinc-300'
const HOLD_ACTION_BUTTON_CLASS = 'min-h-12 rounded-2xl border border-warning-amber/30 bg-warning-amber/10 px-4 py-3 text-sm font-black text-warning-amber transition-colors hover:bg-warning-amber/15 disabled:cursor-not-allowed disabled:opacity-50'
const REQUIRED_EVIDENCE_LOCK_MESSAGE = 'Evidence required before Pass. Attach at least one item-bound evidence record in the Attached Evidence section below. A regular note/comment does not satisfy this requirement unless it is captured as evidence.'
const REQUIRED_EVIDENCE_NOTICE_CLASS = 'rounded-2xl border border-rim/70 border-l-2 border-l-warning-amber bg-white/5 px-4 py-3 text-sm font-semibold leading-6 text-ink shadow-sm'
const DEPENDENCY_BLOCKER_NOTICE_CLASS = 'rounded-2xl border border-rim/70 border-l-2 border-l-warning-amber bg-white/5 px-4 py-3 text-sm font-semibold leading-6 text-ink shadow-sm'

// Shown when a Failed required item is not yet documented enough to submit on the scoped path.
const FAIL_DOCUMENTATION_REQUIRED_MESSAGE = 'Add a deficiency note and evidence before submitting a failed item.'

// ── Section Outcome clarity copy (inspector field UI) ──────────────────────
const SECTION_OUTCOME_HEADING = 'Section Outcome'
const SECTION_OUTCOME_HELPER = 'These actions apply to this full inspection section. Use Corrections Required when you observed a deficiency. Use Hold only for a same-day correction while you are still on site. Use N/A only when the item is outside project scope or not required by the permit path. Pending is the default draft state until you select an outcome.'
// Failed-section panel copy.
const FAIL_SECTION_PANEL_MESSAGE = 'Use Corrections Required when the section cannot be cleared because the inspector observed a deficiency. Document the issue, attach evidence, and continue inspecting safe and accessible items.'
const FAIL_SECTION_DOC_REQUIRED_MESSAGE = 'Add a deficiency note and evidence before submitting this failed section.'
const FAIL_SECTION_READY_MESSAGE = 'Ready to submit as Corrections Required.'
// Hold clarity copy. Hold is a minor same-day correction opportunity, not an
// unable-to-verify condition. Wording only — no timers or workflow changes.
const HOLD_SAME_DAY_HELPER = 'Use Hold when a minor correction can likely be completed while you are still on site. Add what needs to be corrected. If it is not corrected before you leave the site, mark Corrections Required.'
const NA_SCOPE_HELPER = 'Use N/A only when the condition is genuinely outside scope or not triggered for this job, such as no fire suppression scope, no gas appliances, no deep foundations, site services outside scope, phased occupancy not requested, occupancy permit not required for the job type, or Vancouver-only requirements on a BCBC project.'
// Clearance-notes panel (formerly "Critical Stop" / "Stage Blocker"). The Stage
// Blocker workflow is not built yet, so this is presented as calm reference notes
// — not a major active outcome. Wording/visual only — no logic or automation.
const STAGE_BLOCKER_CONDITIONS_HEADING = 'Important Clearance Notes'
const STAGE_BLOCKER_HELPER = 'Review these conditions before marking this section Passed. If any condition affects clearance, document the issue and select Corrections Required, or Hold if it can be corrected while you are still on site. Use report notes only for context, not to bypass the section outcome.'

function RequiredEvidenceActionPanel({
  item,
  blocked,
  onAttachRequiredEvidence,
}: {
  item: WorkspaceItem
  blocked: boolean
  onAttachRequiredEvidence: () => void
}) {
  const guidanceItems = item.required_evidence.length > 0
    ? item.required_evidence
    : [
      'Photo or short video showing the inspected condition.',
      'Permit proof, inspection card or status, manufacturer document, field note, test result, deficiency photo, or correction evidence tied to this item.',
    ]
  const capturedCount = item.documents.length

  if (!blocked) {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-rim/70 border-l-2 border-l-success-green bg-white/5">
        <div className="flex items-start gap-3 px-4 py-3.5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rim/60 bg-raised text-success-green">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-black text-[color:var(--color-ink)]">Evidence captured</div>
            <div className="mt-0.5 text-sm leading-6 text-[color:var(--color-muted)]">
              Supporting field evidence is attached. This section can be passed once all checklist items are complete.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-rim/70 border-l-2 border-l-warning-amber bg-white/5">
      <div className="flex items-center gap-2 bg-white/5 px-4 py-2.5">
        <Camera className="h-4 w-4 shrink-0 text-warning-amber" />
        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--color-ink)]">Evidence required before Pass</span>
      </div>
      <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-base font-black text-[color:var(--color-ink)]">Evidence needed to support this inspection decision</div>
          <div className="mt-1 text-sm leading-6 text-[color:var(--color-muted)]">
            Attach supporting field evidence to enable Pass. Required evidence must support the inspection decision — not just satisfy a file check.
          </div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-rim/70 bg-white/5 px-3 py-1 text-[11px] font-bold text-[color:var(--color-muted)]">
            <CircleDashed className="h-3.5 w-3.5 shrink-0 text-warning-amber" />
            {capturedCount} of 1 required evidence items captured
          </div>
          <div className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-[color:var(--color-subtle)]">Acceptable evidence</div>
          <ul className="mt-2 space-y-1.5 text-sm leading-5 text-[color:var(--color-muted)]">
            {guidanceItems.map(guidance => (
              <li key={guidance} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-flame" />
                <span>{guidance}</span>
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={onAttachRequiredEvidence}
          className="inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-flame px-5 py-3 text-sm font-black text-white shadow-sm ring-1 ring-inset ring-white/10 transition-colors hover:bg-flame-light lg:w-auto"
        >
          <Upload className="h-4 w-4" />
          Attach evidence
        </button>
      </div>
    </div>
  )
}

interface ContainerRequirement {
  label: string
  done: boolean
}

/**
 * Read-only "Requirements to complete" summary rendered near the top of each
 * checklist container. Display only: every value is computed by the caller from
 * existing state and helpers (isStageItemReadyForSignOff, isChecklistEntryComplete,
 * the per-container passBlockedForEvidence flag, and unresolved dependency codes).
 * It introduces no new gating logic and does not affect Pass / Sign-Off behaviour.
 */
function ContainerRequirementsSummary({
  requirements,
  ready,
}: {
  requirements: ContainerRequirement[]
  ready: boolean
}) {
  if (requirements.length === 0) return null
  return (
    <div className={`mt-3 rounded-2xl border border-rim/70 border-l-2 px-4 py-3 bg-white/5 ${ready ? 'border-l-success-green' : 'border-l-warning-amber'}`}>
      <div className="flex items-center gap-2">
        {ready
          ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success-green" />
          : <AlertCircle className="h-4 w-4 shrink-0 text-warning-amber" />}
        <span className={`text-[11px] font-black uppercase tracking-[0.16em] ${ready ? 'text-success-green' : 'text-warning-amber'}`}>
          {ready ? 'Requirements complete' : 'Requirements to complete'}
        </span>
      </div>
      <ul className="mt-2.5 space-y-1.5">
        {requirements.map(requirement => (
          <li key={requirement.label} className="flex items-start gap-2 text-sm leading-5">
            {requirement.done
              ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              : <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />}
            <span className={requirement.done ? 'text-zinc-400' : 'font-semibold text-zinc-100'}>
              {requirement.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

type ActiveJobHoldSummary = Pick<HoldRecord, 'id' | 'status' | 'reason'> & Partial<Pick<
  HoldRecord,
  | 'deficiencyReason'
  | 'holdCapAmount'
  | 'holdEligibleForOnSiteCorrection'
  | 'builderAcceptedAt'
  | 'builderDeclinedAt'
  | 'builderSelectedCorrectionMinutes'
>>

function getWorkspaceHoldResponseLabel(hold: ActiveJobHoldSummary): string {
  if (hold.builderAcceptedAt || hold.status === 'hold_active') return 'Builder accepted correction window'
  if (hold.builderDeclinedAt || hold.status === 'hold_declined') return 'Builder declined — rebook required'
  if (hold.status === 'hold_pending_builder_ack' || hold.status === 'hold_offered') return 'Builder action pending'
  return hold.status.split('_').filter(Boolean).map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ')
}

function getDependencyBlockerMessage(itemCode: string, blockedBy: string[]): string {
  if (blockedBy.length === 1) {
    const dependencyCode = blockedBy[0]
    return `${itemCode} is locked because ${dependencyCode} must be passed first. Complete ${dependencyCode}, attach required evidence, and mark ${dependencyCode} Passed before returning here.`
  }

  return `${itemCode} is locked because ${blockedBy.join(', ')} must be passed first. Complete those prerequisite containers, attach required evidence where needed, and mark them Passed before returning here.`
}

async function closeScopedAssignmentOnServer(input: {
  assignmentId: string
  jobId: string
  reportId?: string
  stageNumber?: number
}): Promise<{ ok: true } | { ok: false; error: string; phase?: string }> {
  try {
    const response = await fetch('/api/inspections/complete-scoped-assignment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })
    const payload = await response.json().catch(() => null) as {
      ok?: boolean
      error?: string
      phase?: string
    } | null

    if (!response.ok || payload?.ok !== true) {
      return {
        ok: false,
        error: payload?.error ?? 'Scoped assignment close failed.',
        phase: payload?.phase,
      }
    }

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Scoped assignment close failed.',
      phase: 'request_failed',
    }
  }
}

async function finalizeScopedFinalOccupancyOnServer(input: {
  assignmentId: string
  jobId: string
  reportId: string
  stageNumber: number
  sealedAt: string
  sealReference: string
  sealPayload: Record<string, unknown>
  completedRecord: Record<string, unknown>
  items: WorkspaceItem[]
}): Promise<{ ok: true } | { ok: false; error: string; phase?: string }> {
  try {
    const response = await fetch('/api/inspections/final-occupancy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })
    const payload = await response.json().catch(() => null) as {
      ok?: boolean
      error?: string
      phase?: string
    } | null

    if (!response.ok || payload?.ok !== true) {
      return {
        ok: false,
        error: payload?.error ?? 'Final occupancy could not be issued.',
        phase: payload?.phase,
      }
    }

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Final occupancy could not be issued.',
      phase: 'request_failed',
    }
  }
}

export function InspectorCompletionWorkspace() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const store = useStore()
  const assignmentId = params.assignmentId as string

  const PILOT_S9_CODE_REFS = true

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sealing, setSealing] = useState(false)
  const [sealed, setSealed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assignment, setAssignment] = useState<AssignmentContext | null>(null)
  const [job, setJob] = useState<JobContext | null>(null)
  const [report, setReport] = useState<InspectorCompletionReportRow | null>(null)
  const [assignmentScope, setAssignmentScope] = useState<{
    builderStageNumber: number
    internalStageNumber: number
    builderStageLabel: string
  } | null>(null)
  const [assignmentScopeComplete, setAssignmentScopeComplete] = useState(false)
  const [siblingBuilderStagesCompleted, setSiblingBuilderStagesCompleted] = useState<Set<number>>(new Set())
  const [overlay, setOverlay] = useState<AhjOverlayContext | null>(null)
  const [stages, setStages] = useState<CompletionChecklistStageDefinition[]>([])
  const [items, setItems] = useState<WorkspaceItem[]>([])
  const [projectReferencePoint, setProjectReferencePoint] = useState<ProjectReferencePoint | null>(null)
  const [activeJobHold, setActiveJobHold] = useState<ActiveJobHoldSummary | null>(null)
  const [holdMode, setHoldMode] = useState(false)
  const [holdTargetItemCode, setHoldTargetItemCode] = useState<string | null>(null)
  const [holdTargetItemLabel, setHoldTargetItemLabel] = useState<string | null>(null)
  const [holdReason, setHoldReason] = useState('')
  const [holdDeficiencyReason, setHoldDeficiencyReason] = useState('')
  const [holdCategory, setHoldCategory] = useState<HoldCategory>('minor_deficiency')
  const [holdSameDayEligible, setHoldSameDayEligible] = useState(true)
  const [holdNotes, setHoldNotes] = useState('')
  const [holdEvidenceItems, setHoldEvidenceItems] = useState<PendingHoldEvidenceItem[]>([])
  const [holdEvidenceWarning, setHoldEvidenceWarning] = useState<string | null>(null)
  const [isPlacingHold, setIsPlacingHold] = useState(false)
  const [currentStage, setCurrentStage] = useState(1)
  const [lastSavedLabel, setLastSavedLabel] = useState('Not saved yet')
  const [expandedChecklistNotes, setExpandedChecklistNotes] = useState<Record<string, boolean>>({})
  const [expandedGuidancePanels, setExpandedGuidancePanels] = useState<Record<string, boolean>>({})
  const [expandedStopConditions, setExpandedStopConditions] = useState<Record<string, boolean>>({})
  const [expandedFailConditions, setExpandedFailConditions] = useState<Record<string, boolean>>({})
  const [expandedContainerNotes, setExpandedContainerNotes] = useState<Record<string, boolean>>({})
  const [expandedJurisdictionNotes, setExpandedJurisdictionNotes] = useState<Record<string, boolean>>({})
  const [stageSigning, setStageSigning] = useState(false)
  const [assignmentCloseRetrying, setAssignmentCloseRetrying] = useState(false)
  const [stageSignOffError, setStageSignOffError] = useState<string | null>(null)
  const [projectOverviewOpen, setProjectOverviewOpen] = useState(true)
  const [stageTransitionHandshake, setStageTransitionHandshake] = useState<StageTransitionHandshake | null>(null)
  const [pendingStageTransitionHandshake, setPendingStageTransitionHandshake] = useState<StageTransitionHandshake | null>(null)
  const [showStageSuccessBanner, setShowStageSuccessBanner] = useState(false)
  const [sealSuccessMessage, setSealSuccessMessage] = useState<string | null>(null)
  const [highlightedEvidenceItemCode, setHighlightedEvidenceItemCode] = useState<string | null>(null)
  const [manualLocationDrafts, setManualLocationDrafts] = useState<Record<string, string>>({})
  const [manualLocationSavingDocId, setManualLocationSavingDocId] = useState<string | null>(null)

  const hydratedRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stageTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stageTransitionStartRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sealSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sealRedirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const evidenceHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stageItemRefs = useRef<Record<string, HTMLElement | null>>({})
  const evidenceUploadRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const holdPhotoInputRef = useRef<HTMLInputElement>(null)
  const holdVideoInputRef = useRef<HTMLInputElement>(null)
  const holdAttachmentInputRef = useRef<HTMLInputElement>(null)
  const scopedCompletionPanelRef = useRef<HTMLDivElement | null>(null)
  const previewMode = isInspectorDevPreviewAssignment(assignmentId)
  const activeUser = user

  function reportPersistenceFailure(message: string, details?: unknown, options?: { alert?: boolean }) {
    console.error(message, details)
    if (options?.alert && typeof window !== 'undefined') {
      window.alert(message)
    }
  }

  async function getAuthenticatedInspectorIdentity(options?: { alertOnFailure?: boolean }) {
    const {
      data: { user: sessionUser },
      error: sessionError,
    } = await supabase.auth.getUser()

    if (sessionError || !sessionUser) {
      const message = 'Your session has expired. Please sign in again before saving or certifying this project.'
      reportPersistenceFailure(message, sessionError, { alert: options?.alertOnFailure })
      return null
    }

    const metadata = (sessionUser.user_metadata ?? {}) as Record<string, unknown>
    const derivedName = activeUser?.name
      ?? (typeof metadata.name === 'string' && metadata.name.trim()
        ? metadata.name
        : sessionUser.email?.split('@')[0] ?? 'Inspector')
    const derivedLicense = activeUser?.licenseNumber
      ?? (typeof metadata.licenseNumber === 'string' ? metadata.licenseNumber : undefined)
      ?? (typeof metadata.license_number === 'string' ? metadata.license_number : undefined)
      ?? ''

    return {
      id: sessionUser.id,
      name: derivedName,
      licenseNumber: derivedLicense,
    }
  }

  function toggleExpandedRecord(
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    key: string
  ) {
    setter(current => ({
      ...current,
      [key]: !(current[key] ?? false),
    }))
  }

  const stageItems = useMemo(
    () => items.filter(item => item.stage_number === currentStage),
    [items, currentStage]
  )

  const stageProgress = useMemo(() => {
    return stages.map(stage => {
      const stageRows = items.filter(item => item.stage_number === stage.stage_number)
      const resolved = stageRows.filter(isStageItemResolved).length
      return {
        stage,
        total: stageRows.length,
        resolved,
        complete: stageRows.length > 0 && resolved === stageRows.length,
      }
    })
  }, [items, stages])

  const unresolvedRequired = useMemo(() => {
    return items.filter(item => item.inspection_status === 'Pending')
  }, [items])

  const missingDocuments = useMemo(() => {
    return items.filter(item => !itemHasRequiredDocument(item))
  }, [items])

  // Mirrors handleStageSignOff's isScopedAssignmentCompletion: a single-stage
  // scoped assignment that is not the final-occupancy gate (stage 15). Only on
  // this path may a *documented* Fail be submitted without blocking sign-off.
  const isScopedStageCompletion = Boolean(
    assignmentScope
    && currentStage === assignmentScope.internalStageNumber
    && assignmentScope.internalStageNumber !== 15
  )

  const stageRequiredItems = useMemo(
    () => stageItems.filter(isRequiredStageItem),
    [stageItems]
  )

  const requiredStageItemsComplete = useMemo(
    () => stageRequiredItems.filter(item =>
      isStageItemReadyForSignOff(item, items, assignmentScope?.internalStageNumber)
      || (isScopedStageCompletion && isDocumentedFail(item))
    ).length,
    [assignmentScope, isScopedStageCompletion, items, stageRequiredItems]
  )

  const incompleteStageItems = useMemo(
    () => stageRequiredItems.filter(item =>
      !isStageItemReadyForSignOff(item, items, assignmentScope?.internalStageNumber)
      && !(isScopedStageCompletion && isDocumentedFail(item))
    ),
    [assignmentScope, isScopedStageCompletion, items, stageRequiredItems]
  )

  const failedStageItems = useMemo(
    () => stageRequiredItems.filter(item => item.inspection_status === 'Failed'),
    [stageRequiredItems]
  )

  // The gate-blocking subset of failed items. On the scoped path a documented
  // Fail (note + evidence) is allowed through; an undocumented Fail still blocks.
  // On every other path, any failed required item blocks (unchanged behaviour).
  const blockingFailedStageItems = useMemo(
    () => isScopedStageCompletion
      ? stageRequiredItems.filter(item => item.inspection_status === 'Failed' && !isDocumentedFail(item))
      : failedStageItems,
    [failedStageItems, isScopedStageCompletion, stageRequiredItems]
  )

  const blockedStageItems = useMemo(
    () => stageRequiredItems
      .map(item => ({
        item,
        blockedBy: getUnresolvedDependencyCodes(item, items, assignmentScope?.internalStageNumber),
      }))
      .filter(entry => entry.blockedBy.length > 0),
    [assignmentScope, items, stageRequiredItems]
  )

  const stageSignOffs = useMemo(
    () => getStageSignOffs(report?.sealPayload),
    [report]
  )

  const currentStageSignOff = useMemo(
    () => stageSignOffs[String(currentStage)] ?? null,
    [currentStage, stageSignOffs]
  )

  const assignmentScopeStageSignOff = useMemo(
    () => assignmentScope ? stageSignOffs[String(assignmentScope.internalStageNumber)] ?? null : null,
    [assignmentScope, stageSignOffs]
  )

  const currentStageInAssignmentScope = !assignmentScope || currentStage === assignmentScope.internalStageNumber
  const assignmentScopeIsComplete = assignmentScopeComplete || Boolean(assignmentScopeStageSignOff)

  const isFinalOccupancyStage = useMemo(
    () => stageItems.some(item => item.item_code === 'S15-02'),
    [stageItems]
  )

  const isScopedFinalOccupancy = Boolean(assignmentScope && isFinalOccupancyStage)

  const projectOverviewStages = useMemo(() => {
    const itemMap = new Map(items.map(item => [item.item_code, item]))

    return stages.map(stage => {
      const stageRows = items.filter(item => item.stage_number === stage.stage_number)
      const resolved = stageRows.filter(isStageItemResolved).length
      const signOff = stageSignOffs[String(stage.stage_number)] ?? null
      const unlocked = !signOff && stage.items.some(stageItem => {
        const runtimeItem = itemMap.get(stageItem.item_code)
        if (!runtimeItem) return false

        return runtimeItem.dependencies.every(dep => {
          const dependency = itemMap.get(dep)
          return dependency ? dependencyStatusSatisfiesGate(dependency) : true
        })
      })

      return {
        stage,
        total: stageRows.length,
        resolved,
        signOff,
        unlocked,
        status: signOff ? 'passed' : unlocked ? 'active' : 'pending',
      }
    })
  }, [items, stageSignOffs, stages])

  const phasedProjectOverview = useMemo(() => {
    return COMPLETION_STAGE_PHASES.map(phase => ({
      ...phase,
      stages: projectOverviewStages.filter(stage => phase.stageNumbers.includes(stage.stage.stage_number)),
    })).filter(phase => phase.stages.length > 0)
  }, [projectOverviewStages])

  const passedStageCount = useMemo(
    () => projectOverviewStages.filter(stage => stage.status === 'passed').length,
    [projectOverviewStages]
  )

  const stageReadyForSignOff = useMemo(() => {
    if (!currentStageInAssignmentScope) return false
    if (stageRequiredItems.length === 0) {
      return stageItems.length > 0 && stageItems.every(item => isStageItemReadyForSignOff(item, items, assignmentScope?.internalStageNumber))
    }

    return blockingFailedStageItems.length === 0
      && blockedStageItems.length === 0
      && requiredStageItemsComplete === stageRequiredItems.length
  }, [assignmentScope, blockedStageItems.length, blockingFailedStageItems.length, currentStageInAssignmentScope, items, requiredStageItemsComplete, stageItems, stageRequiredItems.length])

  const scopedBuilderStagePassedCount = useMemo(() => {
    if (!isScopedFinalOccupancy) return 0
    const priorPassed = [1, 2, 3, 4].filter(n => siblingBuilderStagesCompleted.has(n)).length
    const currentReady = (stageReadyForSignOff || Boolean(currentStageSignOff)) ? 1 : 0
    return priorPassed + currentReady
  }, [isScopedFinalOccupancy, siblingBuilderStagesCompleted, stageReadyForSignOff, currentStageSignOff])

  const currentStageAlreadySignedOrSubmitted = Boolean(currentStageSignOff)
    || report?.status === 'submitted'
    || Boolean(report?.submittedAt)
  const assignmentCloseRetryAvailable = Boolean(
    assignmentScope
      && !isFinalOccupancyStage
      && currentStageInAssignmentScope
      && currentStageAlreadySignedOrSubmitted
      && stageReadyForSignOff
      && assignment?.status !== 'completed'
      && job?.status !== 'completed'
  )

  const stageCompletionPercent = (() => {
    const total = stageRequiredItems.length || stageItems.length
    const complete = stageRequiredItems.length > 0
      ? requiredStageItemsComplete
      : stageItems.filter(item => isStageItemReadyForSignOff(item, items, assignmentScope?.internalStageNumber)).length

    return total > 0 ? Math.round((complete / total) * 100) : 0
  })()

  const footerIssueCount = failedStageItems.length

  const finalOccupancyReady = useMemo(() => {
    if (!isFinalOccupancyStage) return false
    if (!currentStageInAssignmentScope) return false
    const depScopeStage = isScopedFinalOccupancy ? assignmentScope?.internalStageNumber : undefined
    if (items.some(item => isRequiredStageItem(item) && getUnresolvedDependencyCodes(item, items, depScopeStage).length > 0)) {
      return false
    }

    if (isScopedFinalOccupancy) {
      const priorStagesAllPassed = [1, 2, 3, 4].every(n => siblingBuilderStagesCompleted.has(n))
      return priorStagesAllPassed && stageReadyForSignOff
    }

    return projectOverviewStages.every(({ stage, status }) => {
      if (stage.stage_number === currentStage) {
        return status === 'passed' || stageReadyForSignOff
      }

      return status === 'passed'
    })
  }, [assignmentScope, currentStage, currentStageInAssignmentScope, isFinalOccupancyStage, isScopedFinalOccupancy, items, projectOverviewStages, siblingBuilderStagesCompleted, stageReadyForSignOff])

  const sealPendingCount = isScopedFinalOccupancy
    ? stageItems.filter(item => item.inspection_status === 'Pending').length
    : unresolvedRequired.length
  const sealDocumentGapCount = isScopedFinalOccupancy
    ? stageItems.filter(item => !itemHasRequiredDocument(item)).length
    : missingDocuments.length
  const sealDepScopeStage = isScopedFinalOccupancy ? assignmentScope?.internalStageNumber : undefined
  const sealDependencyBlockerCount = items.filter(item =>
    isRequiredStageItem(item) && getUnresolvedDependencyCodes(item, items, sealDepScopeStage).length > 0
  ).length
  const hasOpenHold = activeJobHold !== null && isHoldOpenStatus(activeJobHold.status)
  const sealReady = (!assignmentScope || isFinalOccupancyStage)
    && items.length > 0
    && sealPendingCount === 0
    && sealDocumentGapCount === 0
    && sealDependencyBlockerCount === 0
    && !hasOpenHold
  const preSealEvidenceLocationIssues = useMemo(
    () => getPreSealEvidenceLocationIssues(items),
    [items]
  )
  const finalSealLocationIntegrityReady = preSealEvidenceLocationIssues.length === 0
  const finalOccupancyActionReady = finalOccupancyReady && finalSealLocationIntegrityReady
  const workspaceJob = useMemo(
    () => (job ? store.jobs.find(candidate => candidate.id === job.id) : undefined),
    [job, store.jobs]
  )
  const holdPricingDetails = resolveHoldBaseRate({
    pricingMode: workspaceJob?.pricingMode,
    specialistRole: workspaceJob?.specialistRole,
    discipline: workspaceJob?.requiredDiscipline,
    credentialClass: workspaceJob?.credentialClass,
    inspectionType: workspaceJob?.inspectionType,
    requiresProfessionalSeal: workspaceJob?.requiresProfessionalSeal,
    requiresCP: workspaceJob?.requiresCP,
  })
  const holdBaseRate = holdPricingDetails.baseRate
  const holdPricingLabel = holdPricingDetails.label
  const baseHoldServiceFee = calculateBaseHoldServiceFee(holdBaseRate)
  const holdMissingFields = [
    !holdReason.trim() ? 'deficiency summary' : null,
    !holdDeficiencyReason.trim() ? 'required correction' : null,
  ].filter(Boolean) as string[]
  const holdButtonDisabled = hasOpenHold || holdMode || sealed || report?.sealApplied === true

  function resetHoldForm() {
    setHoldMode(false)
    setHoldTargetItemCode(null)
    setHoldTargetItemLabel(null)
    setHoldReason('')
    setHoldDeficiencyReason('')
    setHoldCategory('minor_deficiency')
    setHoldSameDayEligible(true)
    setHoldNotes('')
    setHoldEvidenceItems([])
    setHoldEvidenceWarning(null)
    setIsPlacingHold(false)
  }

  const openHoldForm = (item: WorkspaceItem) => {
    setHoldTargetItemCode(item.item_code)
    setHoldTargetItemLabel(item.item_label)
    setHoldReason('')
    setHoldDeficiencyReason('')
    setHoldCategory('minor_deficiency')
    setHoldSameDayEligible(true)
    setHoldNotes('')
    setHoldEvidenceItems([])
    setHoldEvidenceWarning(null)
    setHoldMode(true)
  }

  const queueHoldEvidence = async (
    file: File,
    evidenceType: Extract<HoldEvidenceType, 'photo' | 'video' | 'attachment'>,
  ) => {
    const { lat, lng, offlineCapture } = await captureHoldEvidenceLocation()
    setHoldEvidenceItems(current => [
      ...current,
      {
        id: createRuntimeId('hold-evidence-draft'),
        evidenceType,
        file,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        capturedAt: new Date().toISOString(),
        lat,
        lng,
        offlineCapture,
      },
    ])
  }

  const handleHoldPhotoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    await queueHoldEvidence(file, 'photo')
    event.target.value = ''
  }

  const handleHoldVideoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      setHoldEvidenceWarning('Video uploads must be under 50MB. Keep videos under 30 seconds for field review.')
      event.target.value = ''
      return
    }
    await queueHoldEvidence(file, 'video')
    event.target.value = ''
  }

  const handleHoldAttachmentSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    await queueHoldEvidence(file, 'attachment')
    event.target.value = ''
  }

  const removePendingHoldEvidence = (evidenceId: string) => {
    setHoldEvidenceItems(current => current.filter(item => item.id !== evidenceId))
  }

  const handlePlaceHold = async () => {
    if (
      !job
      || !holdTargetItemCode
      || !holdReason.trim()
      || !holdDeficiencyReason.trim()
      || holdBaseRate <= 0
    ) return

    const inspectorId = activeUser?.supabaseId ?? activeUser?.id
    const tier = workspaceJob?.dispatchTier ?? 'standard'
    if (!inspectorId) return

    setIsPlacingHold(true)
    setHoldEvidenceWarning(null)

    const result = await store.placeHoldPoint({
      jobId: job.id,
      inspectorId,
      builderId: job.builderId ?? '',
      tier,
      reason: holdReason.trim(),
      deficiencyReason: holdDeficiencyReason.trim(),
      checklistItemIds: [holdTargetItemCode],
      affectedItemSummaries: holdTargetItemLabel ? [holdTargetItemLabel] : undefined,
      holdCategory,
      holdEligibleForOnSiteCorrection: holdSameDayEligible,
      premiumRateAmount: holdBaseRate,
      notes: holdNotes.trim() || undefined,
      relatedInspectionId: assignment?.id ?? job.id,
    })

    if (result.ok) {
      let failedEvidenceCount = 0

      for (const evidence of holdEvidenceItems) {
        const attached = await addHoldEvidence({
          holdId: result.value.id,
          jobId: job.id,
          createdByUserId: inspectorId,
          evidenceRole: 'deficiency',
          evidenceType: evidence.evidenceType,
          file: evidence.file,
          capturedAt: evidence.capturedAt,
          captureGeo: {
            latitude: evidence.lat ?? null,
            longitude: evidence.lng ?? null,
            offlineCapture: evidence.offlineCapture,
          },
        })

        if (!attached) failedEvidenceCount += 1
      }

      if (failedEvidenceCount > 0) {
        setHoldEvidenceWarning(
          `${failedEvidenceCount} hold evidence item${failedEvidenceCount === 1 ? '' : 's'} could not be attached. You can still continue, but add any missing support after the hold is created.`
        )
      }

      setActiveJobHold({
        id: result.value.id,
        status: 'hold_pending_builder_ack',
        reason: result.value.reason,
        deficiencyReason: holdDeficiencyReason.trim(),
        holdCapAmount: baseHoldServiceFee,
        holdEligibleForOnSiteCorrection: holdSameDayEligible,
      })
      window.alert('Hold Request Sent: The builder has been notified of the same-day correction request.')
      resetHoldForm()
      return
    }

    // Fail-safe: show "On Hold" status immediately even if the DB write failed,
    // so the inspector isn't blocked. Log the error silently.
    console.error('placeHold failed — showing hold status optimistically', result.error, { assignmentId, jobId: job.id })
    setActiveJobHold({
      id: crypto.randomUUID(),
      status: 'hold_pending_builder_ack',
      reason: holdReason.trim(),
      deficiencyReason: holdDeficiencyReason.trim(),
      holdCapAmount: baseHoldServiceFee,
      holdEligibleForOnSiteCorrection: holdSameDayEligible,
    })
    window.alert("Hold request submitted. The builder has been notified and will review the item and confirm the correction window.")
    resetHoldForm()
  }

  useEffect(() => {
    return () => {
      if (stageTransitionStartRef.current) clearTimeout(stageTransitionStartRef.current)
      if (sealSuccessTimerRef.current) clearTimeout(sealSuccessTimerRef.current)
      if (sealRedirectTimerRef.current) clearTimeout(sealRedirectTimerRef.current)
      if (evidenceHighlightTimerRef.current) clearTimeout(evidenceHighlightTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!assignmentScopeComplete || isFinalOccupancyStage) return

    const panel = scopedCompletionPanelRef.current
    if (!panel) return

    panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
    panel.focus({ preventScroll: true })
  }, [assignmentScopeComplete, isFinalOccupancyStage])

  useEffect(() => {
    async function loadWorkspace() {
      if (!assignmentId || !activeUser) return
      setLoading(true)
      setError(null)

      if (previewMode) {
        const assignmentRow: AssignmentContext = {
          id: DEV_PREVIEW_ASSIGNMENT.id,
          jobId: DEV_PREVIEW_ASSIGNMENT.jobId,
          inspectorId: activeUser.supabaseId ?? activeUser.id,
          status: DEV_PREVIEW_ASSIGNMENT.status,
        }
        setAssignment(assignmentRow)

        const jobRow: JobContext = {
          id: DEV_PREVIEW_JOB.id,
          projectId: DEV_PREVIEW_JOB.projectId,
          projectName: DEV_PREVIEW_JOB.projectName,
          address: DEV_PREVIEW_JOB.address,
          city: DEV_PREVIEW_JOB.city,
          region: DEV_PREVIEW_JOB.region,
          projectType: DEV_PREVIEW_JOB.projectType,
          notes: DEV_PREVIEW_JOB.notes,
          permitNumber: DEV_PREVIEW_JOB.permitNumber,
          stage: 1,
          stageName: DEV_PREVIEW_JOB.stageName,
          builderId: DEV_PREVIEW_JOB.builderId,
          builderName: DEV_PREVIEW_JOB.builderName,
          status: DEV_PREVIEW_JOB.status,
        }
        setJob(jobRow)

        const definitionSet = buildCompletionChecklist({
          city: jobRow.city,
          address: jobRow.address,
          projectType: jobRow.projectType,
          notes: jobRow.notes,
          region: jobRow.region,
        })
        setOverlay(definitionSet.overlay)
        setStages(definitionSet.stages)

        const previewReport = createInspectorDevPreviewReport({
          assignmentId,
          inspectorId: activeUser.supabaseId ?? activeUser.id,
          stages: definitionSet.stages,
          overlay: definitionSet.overlay,
        })

        setReport(previewReport)
        setCurrentStage(previewReport.currentStage)
        setItems(mergeItems(definitionSet.stages, previewReport.id, assignmentId, [], []))
        setLastSavedLabel('Preview draft ready')
        hydratedRef.current = true
        setLoading(false)
        return
      }

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('job_assignments')
        .select('id, job_id, inspector_id, status')
        .eq('id', assignmentId)
        .maybeSingle()

      if (assignmentError || !assignmentData) {
        setError('Assignment not found.')
        setLoading(false)
        return
      }

      const assignmentRow: AssignmentContext = {
        id: assignmentData.id as string,
        jobId: assignmentData.job_id as string,
        inspectorId: assignmentData.inspector_id as string,
        status: (assignmentData.status as string) ?? undefined,
      }
      setAssignment(assignmentRow)

      const { data: jobData, error: jobError } = await supabase
        .from('job_opportunities')
        .select('*')
        .eq('id', assignmentRow.jobId)
        .maybeSingle()

      if (jobError || !jobData) {
        setError('Job not found for this assignment.')
        setLoading(false)
        return
      }

      const jobRow: JobContext = {
        id: jobData.id as string,
        projectId: (jobData.project_id as string) ?? undefined,
        projectName: jobData.project_name as string,
        address: jobData.address as string,
        city: (jobData.city as string) ?? 'Vancouver',
        region: (jobData.region as string) ?? undefined,
        projectType: (jobData.project_type as string) ?? undefined,
        notes: (jobData.notes as string) ?? undefined,
        permitNumber: (jobData.permit_number as string) ?? undefined,
        stage: typeof jobData.stage === 'number' ? jobData.stage : undefined,
        stageName: (jobData.stage_name as string) ?? 'Inspector Completion',
        builderId: (jobData.builder_id as string) ?? undefined,
        builderName: (jobData.builder_name as string) ?? undefined,
        status: (jobData.status as string) ?? undefined,
        discipline: (jobData.required_discipline as string) ?? undefined,
      }
      setJob(jobRow)
      try {
        const holdDetails = await listHoldDetailsForJob(jobRow.id)
        const latestOpenHold = holdDetails.find(detail => isHoldOpenStatus(detail.hold.status))?.hold ?? null
        setActiveJobHold(latestOpenHold ? {
          id: latestOpenHold.id,
          status: latestOpenHold.status,
          reason: latestOpenHold.reason,
          deficiencyReason: latestOpenHold.deficiencyReason,
          holdCapAmount: latestOpenHold.holdCapAmount,
          holdEligibleForOnSiteCorrection: latestOpenHold.holdEligibleForOnSiteCorrection,
          builderAcceptedAt: latestOpenHold.builderAcceptedAt,
          builderDeclinedAt: latestOpenHold.builderDeclinedAt,
          builderSelectedCorrectionMinutes: latestOpenHold.builderSelectedCorrectionMinutes,
        } : null)
      } catch (holdLookupError) {
        console.warn('InspectorCompletionWorkspace: hold lookup failed', holdLookupError)
        const latestOpenHold = await getLatestOpenHoldForJob(jobRow.id)
        setActiveJobHold(latestOpenHold ? {
          id: latestOpenHold.id,
          status: latestOpenHold.status,
          reason: latestOpenHold.reason,
          deficiencyReason: latestOpenHold.deficiencyReason,
          holdCapAmount: latestOpenHold.holdCapAmount,
          holdEligibleForOnSiteCorrection: latestOpenHold.holdEligibleForOnSiteCorrection,
          builderAcceptedAt: latestOpenHold.builderAcceptedAt,
          builderDeclinedAt: latestOpenHold.builderDeclinedAt,
          builderSelectedCorrectionMinutes: latestOpenHold.builderSelectedCorrectionMinutes,
        } : null)
      }

      if (jobRow.projectId) {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', jobRow.projectId)
          .maybeSingle()

        if (projectError) {
          console.warn('InspectorCompletionWorkspace: project reference lookup failed', projectError)
        }

        const gpsCoord = (projectData?.gps_coord as { lat?: number; lng?: number } | undefined) ?? undefined
        setProjectReferencePoint({
          latitude: gpsCoord?.lat ?? null,
          longitude: gpsCoord?.lng ?? null,
        })
      }

      const definitionSet = buildCompletionChecklist({
        city: jobRow.city,
        address: jobRow.address,
        projectType: jobRow.projectType,
        notes: jobRow.notes,
        region: jobRow.region,
      })
      const builderStageNumber = resolveBuilderStageNumber(jobRow.stage)
      const requestedChecklistStage = resolveRequestedChecklistStage(definitionSet.stages, jobRow.stage, jobRow.discipline)
      setAssignmentScope({
        builderStageNumber,
        internalStageNumber: requestedChecklistStage,
        builderStageLabel: getBuilderStageLabel(builderStageNumber),
      })

      if (builderStageNumber === 7 && jobRow.projectId) {
        const { data: siblingJobRows } = await supabase
          .from('job_opportunities')
          .select('id, stage, status, project_id')
          .or(`project_id.eq.${jobRow.projectId},id.eq.${jobRow.projectId}`)
          .neq('id', jobRow.id)
        const completedStages = new Set<number>()
        for (const sib of (siblingJobRows ?? [])) {
          const sibStage = typeof sib.stage === 'number' ? sib.stage : null
          if (sibStage && sibStage >= 1 && sibStage <= 6 && sib.status === 'completed') {
            completedStages.add(sibStage)
          }
        }
        setSiblingBuilderStagesCompleted(completedStages)
      }

      setOverlay(definitionSet.overlay)
      setStages(definitionSet.stages)

      const bundle = await getInspectorCompletionBundle(assignmentId)

      const sessionInspector = await getAuthenticatedInspectorIdentity()
      if (!sessionInspector) {
        setError('Session expired. Please sign in again before opening this report.')
        setLoading(false)
        return
      }

      let ensuredReport = bundle.report ?? await upsertInspectorCompletionReport({
        id: createRuntimeId(`completion-${assignmentId}`),
        assignmentId,
        jobId: jobRow.id,
        inspectorId: sessionInspector.id,
        projectId: jobRow.projectId,
        projectName: jobRow.projectName,
        address: jobRow.address,
        city: jobRow.city,
        region: jobRow.region,
        projectType: jobRow.projectType,
        currentStage: requestedChecklistStage,
        stageCount: definitionSet.stages.length,
        jurisdictionName: definitionSet.overlay.jurisdictionName,
        ahjOverlayType: definitionSet.overlay.type,
        ahjOverlayLabel: definitionSet.overlay.label,
        overlaySnapshot: definitionSet.overlay,
        checklistSnapshot: flattenDefinitions(definitionSet.stages),
        status: 'draft',
        sealApplied: false,
        sealReference: undefined,
        sealPayload: {},
        sealedAt: undefined,
        submittedAt: undefined,
      })

      if (
        bundle.report
        && bundle.report.currentStage !== requestedChecklistStage
        && !reportHasMeaningfulProgress(bundle.report, bundle.items, bundle.documents)
      ) {
        ensuredReport = await upsertInspectorCompletionReport({
          id: bundle.report.id,
          assignmentId: bundle.report.assignmentId,
          jobId: bundle.report.jobId,
          inspectorId: sessionInspector.id,
          projectId: bundle.report.projectId,
          projectName: bundle.report.projectName,
          address: bundle.report.address,
          city: bundle.report.city,
          region: bundle.report.region,
          projectType: bundle.report.projectType,
          currentStage: requestedChecklistStage,
          stageCount: bundle.report.stageCount,
          jurisdictionName: bundle.report.jurisdictionName,
          ahjOverlayType: bundle.report.ahjOverlayType,
          ahjOverlayLabel: bundle.report.ahjOverlayLabel,
          overlaySnapshot: bundle.report.overlaySnapshot,
          checklistSnapshot: bundle.report.checklistSnapshot,
          status: bundle.report.status,
          sealApplied: bundle.report.sealApplied,
          sealReference: bundle.report.sealReference,
          sealPayload: bundle.report.sealPayload,
          sealedAt: bundle.report.sealedAt,
          submittedAt: bundle.report.submittedAt,
        })
      }

      if (!ensuredReport) {
        setError('Could not initialize the completion report.')
        setLoading(false)
        return
      }

      setReport(ensuredReport)
      const ensuredStageSignOffs = getStageSignOffs(ensuredReport.sealPayload)
      setAssignmentScopeComplete(
        Boolean(ensuredStageSignOffs[String(requestedChecklistStage)]) && assignmentRow.status === 'completed'
      )
      setCurrentStage(requestedChecklistStage)
      setItems(mergeItems(definitionSet.stages, ensuredReport.id, assignmentId, bundle.items, bundle.documents))
      if (ensuredReport.sealApplied) setSealed(true)
      setLastSavedLabel(
        ensuredReport.lastSavedAt
          ? `Saved ${new Date(ensuredReport.lastSavedAt).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}`
          : 'Draft ready'
      )
      hydratedRef.current = true
      setLoading(false)
    }

    void loadWorkspace()
  }, [activeUser, assignmentId, previewMode])

  async function persistDraft(
    nextItems = items,
    nextStage = currentStage,
    nextSeal?: Partial<InspectorCompletionReportRow>
  ) {
    if (!report || !overlay || !job || !assignment) return false
    if (previewMode) {
      const nextReport: InspectorCompletionReportRow = {
        ...report,
        currentStage: nextStage,
        stageCount: report.stageCount,
        jurisdictionName: overlay.jurisdictionName,
        ahjOverlayType: overlay.type,
        ahjOverlayLabel: overlay.label,
        overlaySnapshot: overlay,
        checklistSnapshot: flattenDefinitions(stages),
        status: nextSeal?.status ?? report.status,
        sealApplied: nextSeal?.sealApplied ?? report.sealApplied,
        sealReference: nextSeal?.sealReference ?? report.sealReference,
        sealPayload: nextSeal?.sealPayload ?? report.sealPayload,
        sealedAt: nextSeal?.sealedAt ?? report.sealedAt,
        submittedAt: nextSeal?.submittedAt ?? report.submittedAt,
        lastSavedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setReport(nextReport)
      setLastSavedLabel(`Preview saved ${new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}`)
      return true
    }
    setSaving(true)
    try {
      const sessionInspector = await getAuthenticatedInspectorIdentity()

      if (!sessionInspector) {
        return false
      }

      const nextReport = await upsertInspectorCompletionReport({
        id: report.id,
        assignmentId: report.assignmentId,
        jobId: report.jobId,
        inspectorId: sessionInspector.id,
        projectId: report.projectId,
        projectName: report.projectName,
        address: report.address,
        city: report.city,
        region: report.region,
        projectType: report.projectType,
        currentStage: nextStage,
        stageCount: report.stageCount,
        jurisdictionName: overlay.jurisdictionName,
        ahjOverlayType: overlay.type,
        ahjOverlayLabel: overlay.label,
        overlaySnapshot: overlay,
        checklistSnapshot: flattenDefinitions(stages),
        status: nextSeal?.status ?? report.status,
        sealApplied: nextSeal?.sealApplied ?? report.sealApplied,
        sealReference: nextSeal?.sealReference ?? report.sealReference,
        sealPayload: nextSeal?.sealPayload ?? report.sealPayload,
        sealedAt: nextSeal?.sealedAt ?? report.sealedAt,
        submittedAt: nextSeal?.submittedAt ?? report.submittedAt,
      })

      if (!nextReport) {
        setLastSavedLabel('Save failed')
        return false
      }

      const ok = await upsertInspectorCompletionItems(
        nextItems.map((item, index) => ({
          id: item.id,
          reportId: nextReport.id,
          assignmentId,
          stageNumber: item.stage_number,
          stageName: item.stage_name,
          itemCode: item.item_code,
          itemLabel: item.item_label,
          sortOrder: index,
          isRequired: item.is_required,
          permitType: item.permit_type,
          responsibleParty: item.responsible_party,
          documentUploadRequired: item.document_upload_required,
          inspectionStatus: item.inspection_status,
          ahjNotes: item.ahj_notes,
          dependencies: item.dependencies,
          responseNote: item.response_note,
          metadata: item.metadata,
        }))
      )

      if (ok) {
        setReport(nextReport)
        setLastSavedLabel(`Saved ${new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}`)
      } else {
        setLastSavedLabel('Save failed')
      }

      return ok
    } catch (error) {
      console.error('persistDraft:', error)
      setLastSavedLabel('Save failed')
      return false
    } finally {
      setSaving(false)
    }
  }

  const triggerAutosave = useEffectEvent(() => {
    void persistDraft()
  })

  useEffect(() => {
    if (!hydratedRef.current || !report) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(() => {
      triggerAutosave()
    }, 3000)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [currentStage, items])

  useEffect(() => {
    if (!showStageSuccessBanner || !stageTransitionHandshake) return

    if (stageTransitionTimerRef.current) clearTimeout(stageTransitionTimerRef.current)
    stageTransitionTimerRef.current = setTimeout(() => {
      setShowStageSuccessBanner(false)
      setStageTransitionHandshake(null)
    }, 6000)

    const focusTimer = setTimeout(() => {
      const targetNode = stageTransitionHandshake.targetItemCode
        ? stageItemRefs.current[stageTransitionHandshake.targetItemCode]
        : null

      targetNode?.focus({ preventScroll: true })
    }, 450)

    return () => {
      clearTimeout(focusTimer)
      if (stageTransitionTimerRef.current) clearTimeout(stageTransitionTimerRef.current)
    }
  }, [showStageSuccessBanner, stageTransitionHandshake])

  useEffect(() => {
    if (!pendingStageTransitionHandshake) return
    if (currentStage !== pendingStageTransitionHandshake.nextStageNumber) return

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      console.log('Transition Handshake Fired')
    }

    if (stageTransitionStartRef.current) clearTimeout(stageTransitionStartRef.current)
    setShowStageSuccessBanner(false)
    setStageTransitionHandshake(pendingStageTransitionHandshake)
    setPendingStageTransitionHandshake(null)

    stageTransitionStartRef.current = setTimeout(() => {
      setShowStageSuccessBanner(true)
    }, 100)
  }, [currentStage, pendingStageTransitionHandshake])

  function updateItem(itemCode: string, updater: (item: WorkspaceItem) => WorkspaceItem) {
    setItems(current =>
      current.map(item => (item.item_code === itemCode ? updater(item) : item))
    )
  }

  /** Remove a document and any checklist capture references that point at it. */
  function removeDocumentReferences(itemCode: string, docId: string, storagePath?: string) {
    updateItem(itemCode, item => ({
      ...item,
      documents: item.documents.filter(d => d.id !== docId),
      metadata: {
        ...item.metadata,
        fieldChecklistState: Object.fromEntries(
          Object.entries(getChecklistStateMap(item)).map(([entryKey, entryState]) => [
            entryKey,
            {
              ...entryState,
              captures: (entryState.captures ?? []).filter(capture =>
                capture.documentId !== docId && capture.storagePath !== storagePath
              ),
            },
          ])
        ),
      },
    }))
  }

  async function handleManualLocationNoteSave(
    itemCode: string,
    doc: InspectorCompletionDocumentRow,
    note: string,
  ) {
    const trimmedNote = note.trim()
    if (!trimmedNote) {
      setStageSignOffError('Add a manual location note before saving the evidence integrity resolution.')
      return
    }

    setManualLocationSavingDocId(doc.id)
    setStageSignOffError(null)

    const applyUpdatedDocument = (updatedDoc: InspectorCompletionDocumentRow) => {
      updateItem(itemCode, item => ({
        ...item,
        documents: item.documents.map(currentDoc =>
          currentDoc.id === updatedDoc.id ? updatedDoc : currentDoc
        ),
      }))
      setManualLocationDrafts(current => ({
        ...current,
        [updatedDoc.id]: updatedDoc.manualLocationNote ?? trimmedNote,
      }))
    }

    try {
      if (previewMode || doc.storagePath.startsWith('local://') || doc.storagePath.startsWith('preview://')) {
        applyUpdatedDocument({
          ...doc,
          manualLocationNote: trimmedNote,
        })
        setLastSavedLabel('Manual location note added')
        return
      }

      const updatedDoc = await updateInspectorCompletionDocumentManualLocationNote(doc.id, trimmedNote)
      if (!updatedDoc) {
        setStageSignOffError('Manual location note could not be saved. Try again before issuing final occupancy.')
        setLastSavedLabel('Save failed')
        return
      }

      applyUpdatedDocument(updatedDoc)
      setLastSavedLabel('Manual location note saved')
    } catch (error) {
      console.error('handleManualLocationNoteSave:', error)
      setStageSignOffError('Manual location note could not be saved. Try again before issuing final occupancy.')
      setLastSavedLabel('Save failed')
    } finally {
      setManualLocationSavingDocId(null)
    }
  }

  async function handleDeleteDocument(itemCode: string, doc: InspectorCompletionDocumentRow) {
    if (previewMode || doc.storagePath.startsWith('local://') || doc.storagePath.startsWith('preview://')) {
      removeDocumentReferences(itemCode, doc.id, doc.storagePath)
      if (doc.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(doc.previewUrl)
      }
      setLastSavedLabel('Document removed')
      return
    }

    const ok = await deleteInspectorCompletionDocument(doc.id, doc.storagePath)
    if (!ok) {
      setStageSignOffError(`Could not delete ${doc.fileName}. Please try again.`)
      return
    }

    removeDocumentReferences(itemCode, doc.id, doc.storagePath)
    if (doc.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(doc.previewUrl)
    }
    setLastSavedLabel('Document deleted')
  }

  function navigateToStage(stageNumber: number) {
    setStageSignOffError(null)
    if (assignmentScope && stageNumber !== assignmentScope.internalStageNumber) {
      setStageSignOffError(getBuilderRequestMessageForCompletionStage(stageNumber))
      return
    }
    setCurrentStage(stageNumber)
  }

  function queueStageSuccessHandshake(handshake: StageTransitionHandshake) {
    setPendingStageTransitionHandshake(handshake)
  }

  function focusRequiredEvidenceUpload(itemCode: string) {
    const target = evidenceUploadRefs.current[itemCode]
    if (!target) return

    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target.focus({ preventScroll: true })
    setHighlightedEvidenceItemCode(itemCode)

    if (evidenceHighlightTimerRef.current) clearTimeout(evidenceHighlightTimerRef.current)
    evidenceHighlightTimerRef.current = setTimeout(() => {
      setHighlightedEvidenceItemCode(current => current === itemCode ? null : current)
    }, 4500)
  }

  function handleStatusSelection(itemCode: string, value: CompletionInspectionStatus) {
    if (value === 'Passed') {
      const item = items.find(candidate => candidate.item_code === itemCode)
      const blockedBy = item ? getUnresolvedDependencyCodes(item, items, assignmentScope?.internalStageNumber) : []
      if (blockedBy.length > 0) {
        setStageSignOffError(`Resolve ${blockedBy.join(', ')} before this item can be passed.`)
        return
      }
    }

    updateItem(itemCode, current => ({ ...current, inspection_status: value }))

    if (value === 'Failed' || value === 'Pending') {
      setExpandedStopConditions(current => ({
        ...current,
        [itemCode]: true,
      }))
      return
    }

    if (value === 'Passed') {
      setExpandedStopConditions(current => ({
        ...current,
        [itemCode]: false,
      }))
    }
  }

  function toggleChecklistItem(itemCode: string, checklistLabel: string) {
    updateItem(itemCode, current => {
      const entryKey = checklistEntryKey(checklistLabel)
      const stateMap = getChecklistStateMap(current)
      const currentEntry = stateMap[entryKey] ?? {}
      return {
        ...current,
        metadata: {
          ...current.metadata,
          fieldChecklistState: {
            ...stateMap,
            [entryKey]: {
              ...currentEntry,
              checked: !currentEntry.checked,
            },
          },
        },
      }
    })
  }

  function updateChecklistNote(itemCode: string, checklistLabel: string, note: string) {
    updateItem(itemCode, current => {
      const entryKey = checklistEntryKey(checklistLabel)
      const stateMap = getChecklistStateMap(current)
      const currentEntry = stateMap[entryKey] ?? {}
      return {
        ...current,
        metadata: {
          ...current.metadata,
          fieldChecklistState: {
            ...stateMap,
            [entryKey]: {
              ...currentEntry,
              note,
            },
          },
        },
      }
    })
  }

  async function handleDocumentUpload(
    itemCode: string,
    file: File,
    capture?: FieldMediaCapturePayload,
    anomalyExplanation?: string,
  ): Promise<InspectorCompletionDocumentRow | null> {
    if (!report || !assignment || !activeUser) {
      console.warn('[Vero] handleDocumentUpload — missing report/assignment/activeUser, aborting', { report: !!report, assignment: !!assignment, activeUser: !!activeUser })
      return null
    }

    // Prefer blob URL from capture payload; fall back to creating one from the file when it's
    // previewable media. This covers both FieldMediaUploader captures (payload.previewUrl set) and the
    // raw <input type="file"> buttons that call handleDocumentUpload without a capture payload.
    const effectivePreviewUrl: string | undefined = capture?.previewUrl
      ?? (file.type.startsWith('image/') || file.type.startsWith('video/') ? URL.createObjectURL(file) : undefined)

    if (previewMode) {
      const doc = createInspectorDevPreviewDocument({
        reportId: report.id,
        assignmentId: assignment.id,
        itemCode,
        fileName: file.name,
        mimeType: file.type,
        mediaType: capture?.source ?? (file.type.startsWith('video/') ? 'video' : undefined),
        fileSize: file.size,
        uploadedBy: activeUser.supabaseId ?? activeUser.id,
      })
      const docWithPreview: InspectorCompletionDocumentRow = effectivePreviewUrl
        ? { ...doc, previewUrl: effectivePreviewUrl }
        : doc
      updateItem(itemCode, item => ({ ...item, documents: [...item.documents, docWithPreview] }))
      setLastSavedLabel('Preview document attached')
      return docWithPreview
    }

    const sessionInspector = await getAuthenticatedInspectorIdentity({ alertOnFailure: false })

    if (!sessionInspector) {
      // No valid Supabase session (demo account or expired token). Rather than silently failing
      // and leaving the document list empty, create a local-only doc so the UI still reflects
      // what the inspector attached. The storagePath prefix local:// distinguishes these from
      // server-persisted docs. They are session-only and will be lost on page reload.
      console.warn('[Vero] handleDocumentUpload — no session, creating local-only doc for UI')
      const localDoc = createInspectorDevPreviewDocument({
        reportId: report.id,
        assignmentId: assignment.id,
        itemCode,
        fileName: file.name,
        mimeType: file.type,
        mediaType: capture?.source ?? (file.type.startsWith('video/') ? 'video' : undefined),
        fileSize: file.size,
        uploadedBy: activeUser.supabaseId ?? activeUser.id,
      })
      const localDocWithPreview: InspectorCompletionDocumentRow = {
        ...localDoc,
        storagePath: `local://${file.name}`,
        ...(effectivePreviewUrl ? { previewUrl: effectivePreviewUrl } : {}),
      }
      updateItem(itemCode, item => ({ ...item, documents: [...item.documents, localDocWithPreview] }))
      setLastSavedLabel('Saved locally — sign in to sync')
      return localDocWithPreview
    }

    const doc = await uploadInspectorCompletionDocument(
      report.id,
      assignment.id,
      itemCode,
      sessionInspector.id,
      file,
      {
        jobId: job?.id,
        capturedAt: capture?.capturedAt,
        captureLatitude: capture?.latitude ?? null,
        captureLongitude: capture?.longitude ?? null,
        projectLatitude: projectReferencePoint?.latitude ?? null,
        projectLongitude: projectReferencePoint?.longitude ?? null,
        anomalyExplanation,
        source: capture?.source,
      },
    )

    if (!doc) {
      console.warn('[Vero] handleDocumentUpload — uploadInspectorCompletionDocument returned null (check Supabase storage logs)')
      return null
    }

    const docWithPreview: InspectorCompletionDocumentRow = effectivePreviewUrl
      ? { ...doc, previewUrl: effectivePreviewUrl }
      : doc
    updateItem(itemCode, item => ({ ...item, documents: [...item.documents, docWithPreview] }))
    return docWithPreview
  }

  async function handleFieldEvidenceCapture(
    itemCode: string,
    payload: FieldMediaCapturePayload,
  ): Promise<InspectorCompletionDocumentRow | null> {
    const geofence = evaluateGeofence({
      projectPoint: projectReferencePoint?.latitude != null && projectReferencePoint?.longitude != null
        ? {
            latitude: projectReferencePoint.latitude,
            longitude: projectReferencePoint.longitude,
          }
        : null,
      capturePoint: payload.latitude != null && payload.longitude != null
        ? {
            latitude: payload.latitude,
            longitude: payload.longitude,
          }
        : null,
      thresholdMeters: 250,
    })

    let anomalyExplanation: string | undefined
    if (geofence.state === 'anomalous') {
      const response = window.prompt(
        'This capture is outside the expected site geofence. Add a short explanation so Vero can flag it for review.',
        '',
      )
      if (!response?.trim()) {
        setStageSignOffError('A short explanation is required for out-of-range captures.')
        return null
      }
      anomalyExplanation = response.trim()
    }

    return handleDocumentUpload(itemCode, payload.file, payload, anomalyExplanation)
  }

  async function handleChecklistCapture(
    itemCode: string,
    checklistLabel: string,
    payload: FieldMediaCapturePayload
  ) {
    const document = await handleFieldEvidenceCapture(itemCode, payload)
    const entryKey = checklistEntryKey(checklistLabel)
    const noteKey = `${itemCode}:${entryKey}`
    const textNote = payload.source === 'text'
      ? await payload.file.text()
      : payload.source === 'audio' && payload.transcript
        ? payload.transcript
        : null

    updateItem(itemCode, current => {
      const stateMap = getChecklistStateMap(current)
      const currentEntry = stateMap[entryKey] ?? {}
      const nextCapture: ChecklistCaptureRecord = {
        source: payload.source,
        capturedAt: payload.capturedAt,
        latitude: payload.latitude,
        longitude: payload.longitude,
        fileName: payload.file.name,
        mimeType: payload.file.type,
        fileSize: payload.file.size,
        documentId: document?.id,
        storagePath: document?.storagePath,
      }

      return {
        ...current,
        metadata: {
          ...current.metadata,
          fieldChecklistState: {
            ...stateMap,
            [entryKey]: {
              ...currentEntry,
              note: textNote ?? currentEntry.note,
              captures: [...(currentEntry.captures ?? []), nextCapture],
            },
          },
        },
      }
    })

    if (textNote) {
      setExpandedChecklistNotes(current => ({
        ...current,
        [noteKey]: true,
      }))
    }

    setLastSavedLabel(
      payload.source === 'text' ? 'Field note captured' :
      payload.source === 'audio' && payload.transcript ? 'Voice memo transcribed' :
      'Field evidence captured'
    )
  }

  async function openDocument(doc: InspectorCompletionDocumentRow) {
    if (doc.storagePath.startsWith('local://')) {
      window.alert(`${doc.fileName} was saved locally.\nSign in to your account to sync evidence to the server.`)
      return
    }
    if (previewMode || doc.storagePath.startsWith('preview://')) {
      window.alert(`Preview document: ${doc.fileName}\nStored locally for UI review only.`)
      return
    }
    const url = await getInspectorCompletionDocumentSignedUrl(doc.storagePath)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function finalizeProjectCompletion({
    nextItems,
    nextStageSignOffs,
    sealedAt,
    certificationType,
    projectState,
    auditNote,
    location,
    successBehavior = 'stay',
  }: {
    nextItems: WorkspaceItem[]
    nextStageSignOffs: Record<string, StageSignOffRecord>
    sealedAt: string
    certificationType: 'standard' | 'final_occupancy'
    projectState: 'SEALED' | 'COMPLETED'
    auditNote: string
    location?: LocationSnapshot
    successBehavior?: 'stay' | 'return_to_dashboard'
  }) {
    if (!report || !job || !assignment || !activeUser || !overlay) return false
    if (previewMode) {
      reportPersistenceFailure(
        'Dev preview certification is disabled. Sign in and open a real assignment to certify a project.',
        { assignmentId },
        { alert: true }
      )
      return false
    }

    setSealing(true)

    const latestOpenHold = await getLatestOpenHoldForJob(job.id)
    if (latestOpenHold) {
      setActiveJobHold({
        id: latestOpenHold.id,
        status: latestOpenHold.status,
        reason: latestOpenHold.reason,
      })
      reportPersistenceFailure(
        'A Hold / Site Retainer is still open on this inspection. Resolve the hold before sealing or issuing final occupancy.',
        { jobId: job.id, holdId: latestOpenHold.id },
        { alert: true }
      )
      setSealing(false)
      return false
    }

    const sessionInspector = await getAuthenticatedInspectorIdentity({ alertOnFailure: true })

    if (!sessionInspector) {
      setSealing(false)
      return false
    }

    const sealReference = createSealRef()
    const failedCount = nextItems.filter(item => item.inspection_status === 'Failed').length
    const passedCount = nextItems.filter(item => item.inspection_status === 'Passed').length
const overallResult = (failedCount > 0 ? 'fail' : 'pass') as 'pass' | 'fail' | 'stopped'
    const holdDetails = await listHoldDetailsForJob(job.id)
    const holdHistory = buildHoldHistorySummary(holdDetails)
    const sealPayload = {
      sealedAt,
      sealedBy: sessionInspector.name,
      sealedById: sessionInspector.id,
      inspectorLicense: sessionInspector.licenseNumber,
      overallResult,
      passedCount,
      failedCount,
      overlay,
      stageSignOffs: nextStageSignOffs,
      certificationType,
      projectState,
      certifiedAt: certificationType === 'final_occupancy' ? sealedAt : undefined,
      certifiedBy: certificationType === 'final_occupancy' ? sessionInspector.name : undefined,
      certifiedLocation: certificationType === 'final_occupancy'
        ? {
            latitude: location?.latitude ?? null,
            longitude: location?.longitude ?? null,
          }
        : undefined,
      holdHistory,
    }

    const evidenceItems: EvidenceItem[] = nextItems.flatMap(item =>
      item.documents.map(doc => {
        const kind: EvidenceKind = (() => {
          switch (doc.mediaType) {
            case 'camera': return 'photo'
            case 'video': return 'video'
            case 'audio': return 'voice_note'
            case 'text': return 'document'
            case 'document': return 'document'
            default: return 'document'
          }
        })()

        const validationState: EvidenceValidationState = (() => {
          switch (doc.integrityStatus) {
            case 'verified': return 'validated'
            case 'disputed': return 'invalid'
            case 'quarantined': return 'quarantined'
            case 'recorded':
            default: return 'pending'
          }
        })()

        const geo: GeoCoord | undefined = (() => {
          const lat = doc.captureGeo?.latitude
          const lng = doc.captureGeo?.longitude
          if (typeof lat !== 'number' || typeof lng !== 'number') return undefined
          const accuracy = doc.captureGeo?.accuracy
          return {
            lat,
            lng,
            ...(typeof accuracy === 'number' ? { accuracy } : {}),
            timestamp: doc.originalCapturedAt ?? doc.createdAt,
          }
        })()

        const notes = [item.response_note, item.ahj_notes]
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
          .join(' — ') || undefined

        return {
          id: doc.id,
          projectId: job.projectId,
          kind,
          fileType: doc.mimeType,
          originalFilename: doc.fileName,
          storagePath: doc.storagePath,
          captureTimestamp: doc.originalCapturedAt ?? doc.createdAt,
          uploadedBy: doc.uploadedBy,
          capturedBy: doc.uploadedBy,
          notes,
          geo,
          manualLocationNote: doc.manualLocationNote,
          validationState,
          checksum: doc.evidenceChecksum,
          createdAt: doc.createdAt,
          updatedAt: doc.createdAt,
          metadata: {
            itemCode: item.item_code,
            itemLabel: item.item_label,
            stageNumber: item.stage_number,
            integrityStatus: doc.integrityStatus,
            anomalyFlags: doc.anomalyFlags ?? [],
            mediaType: doc.mediaType,
          },
        }
      })
    )
    const holdEvidenceItems = buildHoldEvidenceItems(holdDetails, job.projectId)

    // ─── Fail-Closed pre-seal integrity gates ─────────────────────────────────
    // Every evidence item entering the sealed package must:
    //   (1) resolve to a persisted storage path (no local:// or placeholder:// refs)
    //   (2) carry a SHA-256 checksum for tamper-evidence
    //   (3) declare a location — either GPS coordinates or a manual location note
    // Violating any gate aborts the seal and surfaces the offending items.
    const combinedEvidence: EvidenceItem[] = [...evidenceItems, ...holdEvidenceItems]
    const gateViolations: Array<{ id: string; ref: string; reason: string }> = []
    for (const ev of combinedEvidence) {
      const ref = ev.originalFilename ?? ev.id
      const storagePath = ev.storagePath ?? ''
      if (storagePath.startsWith('local://') || storagePath.startsWith('placeholder://')) {
        gateViolations.push({
          id: ev.id,
          ref,
          reason: `unsynced storage path (${storagePath}) — upload must complete before sealing`,
        })
      }
      if (typeof ev.checksum !== 'string' || ev.checksum.trim().length === 0) {
        gateViolations.push({
          id: ev.id,
          ref,
          reason: 'missing evidence checksum — cannot seal without tamper-evidence digest',
        })
      }
      const hasGeo = !!ev.geo && typeof ev.geo.lat === 'number' && typeof ev.geo.lng === 'number'
      const hasManualLocationNote =
        typeof ev.manualLocationNote === 'string' && ev.manualLocationNote.trim().length > 0
      if (!hasGeo && !hasManualLocationNote) {
        gateViolations.push({
          id: ev.id,
          ref,
          reason: 'missing GPS coordinates and no manual location note recorded',
        })
      }
    }

    if (gateViolations.length > 0) {
      const preview = gateViolations.slice(0, 10)
        .map(v => `• ${v.ref}: ${v.reason}`)
        .join('\n')
      const overflow = gateViolations.length > 10
        ? `\n\n…and ${gateViolations.length - 10} more`
        : ''
      reportPersistenceFailure(
        `Cannot seal — ${gateViolations.length} evidence item(s) failed pre-seal integrity gates.\n\n${preview}${overflow}`,
        {
          assignmentId,
          reportId: report.id,
          inspectorId: sessionInspector.id,
          violations: gateViolations,
        },
        { alert: true }
      )
      setSealing(false)
      return false
    }

    const completedRecord = {
      id: createRuntimeId(`completion-record-${assignment.id}`),
      projectId: job.projectId,
      projectName: job.projectName,
      address: job.address,
      city: job.city,
      stage: 15,
      stageName: 'Inspector Completion',
      result: overallResult,
      evidenceItems: [...evidenceItems, ...holdEvidenceItems],
      completedAt: sealedAt,
      builderId: job.builderId,
      builderName: job.builderName,
      inspectorId: sessionInspector.id,
      inspectorName: sessionInspector.name,
      inspectorLicense: sessionInspector.licenseNumber,
      passItems: passedCount,
      failItems: failedCount,
      certRef: sealReference,
      jobRef: job.id,
      permitNumber: job.permitNumber,
      discipline: activeUser.designation ?? activeUser.disciplines?.[0] ?? undefined,
      region: job.region,
      jurisdictionId: overlay.jurisdictionName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      jurisdictionName: overlay.jurisdictionName,
      authorityName: overlay.label,
      sealed: true,
      holdId: holdDetails[0]?.hold.id,
      holdHistory,
      checklistResults: nextItems.map(item => ({
        itemId: item.item_code,
        label: item.item_label,
        result:
          item.inspection_status === 'Passed' ? 'pass' :
          item.inspection_status === 'Failed' ? 'fail' :
          item.inspection_status === 'N/A' ? 'na' :
          'pending',
        note: item.response_note || undefined,
      })),
    }

    if (certificationType === 'final_occupancy' && isScopedFinalOccupancy) {
      const scopedFinalResult = await finalizeScopedFinalOccupancyOnServer({
        assignmentId: assignment.id,
        jobId: job.id,
        reportId: report.id,
        stageNumber: currentStage,
        sealedAt,
        sealReference,
        sealPayload,
        completedRecord,
        items: nextItems,
      })

      if (!scopedFinalResult.ok) {
        const detail = [scopedFinalResult.phase, scopedFinalResult.error].filter(Boolean).join(': ')
        const message = detail
          ? `Final Vero record could not be written to Supabase. ${detail}`
          : 'Final Vero record could not be written to Supabase. Please try again.'
        reportPersistenceFailure(
          message,
          {
            assignmentId,
            reportId: report.id,
            inspectorId: sessionInspector.id,
            phase: scopedFinalResult.phase,
            error: scopedFinalResult.error,
          },
          { alert: true },
        )
        setStageSignOffError(message)
        setSealing(false)
        return false
      }

      setReport(current => current ? {
        ...current,
        inspectorId: sessionInspector.id,
        status: 'sealed',
        sealApplied: true,
        sealReference,
        sealPayload,
        sealedAt,
        submittedAt: sealedAt,
      } : current)
      setItems(nextItems)
      setJob(current => current ? { ...current, status: 'completed' } : current)
      setAssignment(current => current ? { ...current, status: 'completed' } : current)
      setAssignmentScopeComplete(true)
      setSealing(false)

      if (successBehavior === 'return_to_dashboard') {
        setSealSuccessMessage('Final Vero Record Issued Successfully!')
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
        if (sealSuccessTimerRef.current) clearTimeout(sealSuccessTimerRef.current)
        if (sealRedirectTimerRef.current) clearTimeout(sealRedirectTimerRef.current)
        sealSuccessTimerRef.current = setTimeout(() => {
          setSealSuccessMessage(null)
        }, 6000)
        sealRedirectTimerRef.current = setTimeout(() => {
          router.push('/inspector')
        }, 1400)
      } else {
        setSealed(true)
      }

      return true
    }

    const recordInsert = await insertCompletedRecordStrict(completedRecord as Parameters<typeof insertCompletedRecordStrict>[0])

    if (!recordInsert.ok) {
      const message = recordInsert.error
        ? `Final Vero record could not be written to Supabase. ${recordInsert.error}`
        : 'Final Vero record could not be written to Supabase. Please try again.'
      reportPersistenceFailure(
        message,
        {
          assignmentId,
          reportId: report.id,
          inspectorId: sessionInspector.id,
          error: recordInsert.error,
        },
        { alert: true }
      )
      setStageSignOffError(message)
      setSealing(false)
      return false
    }

    const saved = await persistDraft(nextItems, currentStage, {
      status: 'sealed',
      sealApplied: true,
      sealReference,
      sealPayload,
      sealedAt,
      submittedAt: sealedAt,
    })

    if (!saved) {
      reportPersistenceFailure(
        'Vero could not save the final completion record to Supabase. Please try again.',
        { assignmentId, reportId: report.id },
        { alert: true }
      )
      setSealing(false)
      return false
    }

    if (job.status !== 'completed') {
      const jobUpdated = await updateJobStatus(
        job.id,
        'completed',
        sessionInspector.id,
        'inspector',
        auditNote,
        job.status as Parameters<typeof updateJobStatus>[5]
      )

      if (!jobUpdated) {
        reportPersistenceFailure(
          'The certification was saved to Supabase, but Vero could not update the project status. Please refresh and verify the job state.',
          { jobId: job.id, inspectorId: sessionInspector.id },
          { alert: true }
        )
      }
    }

    await completeJobAssignment(assignment.id, sessionInspector.id)

    // Move escrow to earned_pending_review regardless of pass/fail. A validly
    // completed governed inspection earns the base fee; the construction result
    // does not gate inspector payment eligibility. Scope to the specific
    // completed assignment so a stale/cancelled assignment for the same job is
    // never flipped to payment-eligible.
    const escrowOk = await updateAssignmentEscrowStatus(assignment.id, 'earned_pending_review')
    if (!escrowOk) {
      console.warn('[inspector/workspace] escrow status update failed after seal', { jobId: job.id, assignmentId: assignment.id })
    }

    setReport(current => current ? {
      ...current,
      inspectorId: sessionInspector.id,
      status: 'sealed',
      sealApplied: true,
      sealReference,
      sealPayload,
      sealedAt,
      submittedAt: sealedAt,
    } : current)
    setItems(nextItems)
    setSealing(false)
    if (successBehavior === 'return_to_dashboard') {
      setSealSuccessMessage('Digital Seal Applied Successfully!')
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      if (sealSuccessTimerRef.current) clearTimeout(sealSuccessTimerRef.current)
      if (sealRedirectTimerRef.current) clearTimeout(sealRedirectTimerRef.current)
      sealSuccessTimerRef.current = setTimeout(() => {
        setSealSuccessMessage(null)
      }, 6000)
      sealRedirectTimerRef.current = setTimeout(() => {
        router.push('/inspector')
      }, 1400)
      return true
    }
    setSealed(true)
    return true
  }

  async function handleScopedAssignmentCloseRetry() {
    if (!report || !job || !assignment || !assignmentScope) return
    if (!assignmentCloseRetryAvailable) return

    const closeFailureMessage = 'Inspection saved, but the assignment could not be closed. Please try again or contact support.'
    setAssignmentCloseRetrying(true)
    setStageSignOffError(null)

    const closeResult = await closeScopedAssignmentOnServer({
      assignmentId: assignment.id,
      jobId: job.id,
      reportId: report.id,
      stageNumber: currentStage,
    })

    if (!closeResult.ok) {
      reportPersistenceFailure(
        closeFailureMessage,
        {
          assignmentId: assignment.id,
          jobId: job.id,
          reportId: report.id,
          stageNumber: currentStage,
          phase: closeResult.phase,
          error: closeResult.error,
        },
      )
      const serverDetail = [closeResult.phase, closeResult.error].filter(Boolean).join(': ')
      setStageSignOffError(serverDetail ? `${closeFailureMessage} ${serverDetail}` : closeFailureMessage)
      setAssignmentCloseRetrying(false)
      return
    }

    setJob(current => current ? { ...current, status: 'completed' } : current)
    setAssignment(current => current ? { ...current, status: 'completed' } : current)
    setAssignmentScopeComplete(true)
    setLastSavedLabel(`${assignmentScope.builderStageLabel} complete`)
    setAssignmentCloseRetrying(false)
    router.push('/inspector')
  }

  async function handleStageSignOff() {
    if (!report || !job || !assignment || !activeUser || !overlay) return
    if (!stageReadyForSignOff || currentStageSignOff) return

    setStageSigning(true)
    setStageSignOffError(null)

    const location = await captureStageLocation()
    const anomalyReview = await collectStageLocationExplanation({
      location,
      projectReferencePoint,
    })
    if (anomalyReview.blocked) {
      setStageSigning(false)
      setStageSignOffError('A short explanation is required for out-of-range check-ins.')
      return
    }
    const signedAt = new Date().toISOString()
    const signedBy = activeUser.name ?? 'Inspector'
    const signedById = activeUser.supabaseId ?? activeUser.id

    const nextItems = items.map(item => (
      item.stage_number === currentStage
        ? {
            ...item,
            // Preserve final outcomes: a documented Fail (and N/A) must survive
            // sign-off. Only non-final statuses (Pending) collapse to Passed.
            inspection_status: (item.inspection_status === 'N/A' || item.inspection_status === 'Failed')
              ? item.inspection_status
              : 'Passed' as const,
            metadata: {
              ...item.metadata,
              stageSignOff: {
                stageNumber: currentStage,
                signedAt,
                latitude: location.latitude,
                longitude: location.longitude,
                signedBy,
                signedById,
              },
            },
          }
        : item
    ))

    const isScopedAssignmentCompletion = Boolean(
      assignmentScope
      && currentStage === assignmentScope.internalStageNumber
      && assignmentScope.internalStageNumber !== 15
    )
    const unlockedStages = isScopedAssignmentCompletion ? [] : getUnlockedFutureStages(nextItems, stages, currentStage)
    const sequentialNextStage = getNextSequentialStage(stages, currentStage)
    const nextStage = isScopedAssignmentCompletion
      ? currentStage
      : unlockedStages[0] ?? sequentialNextStage?.stage_number ?? currentStage
    const nextStageSignOffs = {
      ...stageSignOffs,
      [String(currentStage)]: {
        stageNumber: currentStage,
        signedAt,
        latitude: location.latitude,
        longitude: location.longitude,
        signedBy,
        signedById,
        itemCodes: stageItems.map(item => item.item_code),
        unlockedStages,
      },
    }

    // On scoped completion, stamp the construction outcome into the seal payload
    // so the scoped close route can route the correct builder notice and the
    // Vault record reflects Fail / Corrections Required. A preserved Failed item
    // in the scoped stage makes the report outcome 'fail'.
    const scopedStageHasFailure = nextItems.some(item =>
      item.stage_number === currentStage && item.inspection_status === 'Failed'
    )

    const saved = await persistDraft(nextItems, nextStage, {
      status: isScopedAssignmentCompletion ? 'submitted' : report.status,
      submittedAt: isScopedAssignmentCompletion ? signedAt : report.submittedAt,
      sealPayload: {
        ...report.sealPayload,
        stageSignOffs: nextStageSignOffs,
        ...(isScopedAssignmentCompletion
          ? { overallResult: scopedStageHasFailure ? 'fail' : 'pass' }
          : {}),
      },
    })

    if (!saved) {
      setStageSigning(false)
      setStageSignOffError('The stage sign-off could not be saved. Please try again.')
      return
    }

    if (isScopedAssignmentCompletion && assignmentScope) {
      setItems(nextItems)
      setCurrentStage(currentStage)

      const closeFailureMessage = 'Inspection saved, but the assignment could not be closed. Please try again or contact support.'

      if (!previewMode) {
        const closeResult = await closeScopedAssignmentOnServer({
          assignmentId: assignment.id,
          jobId: job.id,
          reportId: report.id,
          stageNumber: currentStage,
        })
        if (!closeResult.ok) {
          reportPersistenceFailure(
            closeFailureMessage,
            {
              assignmentId: assignment.id,
              jobId: job.id,
              reportId: report.id,
              stageNumber: currentStage,
              inspectorId: signedById,
              phase: closeResult.phase,
              error: closeResult.error,
            },
            { alert: true },
          )
          setStageSignOffError(closeFailureMessage)
          setStageSigning(false)
          return
        }

        setJob(current => current ? { ...current, status: 'completed' } : current)
        setAssignment(current => current ? { ...current, status: 'completed' } : current)
      }

      if (anomalyReview.geofenceState.state === 'anomalous' && report && assignment && job) {
        await createFieldGeoAnomaly({
          assignmentId: assignment.id,
          jobId: job.id,
          reportId: report.id,
          anomalyType: 'stage_check_in_out_of_range',
          distanceMeters: anomalyReview.geofenceState.distanceMeters,
          thresholdMeters: anomalyReview.geofenceState.thresholdMeters,
          explanation: anomalyReview.explanation,
          inspectorId: activeUser?.supabaseId ?? activeUser?.id,
          metadata: {
            stageNumber: currentStage,
          },
        })
      }

      setAssignmentScopeComplete(true)
      setLastSavedLabel(`${assignmentScope.builderStageLabel} complete`)
      if (location.error) {
        setStageSignOffError(location.error)
      }
      setStageSigning(false)
      return
    }

    const nextStageTarget = nextStage !== currentStage
      ? getFirstIncompleteStageItem(nextItems, nextStage)
      : null
    const completedStageDefinition = getStageDefinitionByNumber(stages, currentStage)
    const nextStageDefinition = getStageDefinitionByNumber(stages, nextStage) ?? sequentialNextStage

    setItems(nextItems)
    navigateToStage(nextStage)
    if (nextStage !== currentStage) {
      queueStageSuccessHandshake({
        completedStageNumber: currentStage,
        completedStageName: completedStageDefinition?.stage_name ?? `Stage ${currentStage}`,
        nextStageNumber: nextStageDefinition?.stage_number ?? nextStage,
        nextStageName: nextStageDefinition?.stage_name ?? `Stage ${nextStage}`,
        targetItemCode: nextStageTarget?.item_code ?? null,
      })
    }
    setLastSavedLabel(
      unlockedStages.length > 0
        ? `Stage ${currentStage} signed off. Stage ${nextStage} is live.`
        : `Stage ${currentStage} signed off.`
    )

    if (anomalyReview.geofenceState.state === 'anomalous' && report && assignment && job) {
      await createFieldGeoAnomaly({
        assignmentId: assignment.id,
        jobId: job.id,
        reportId: report.id,
        anomalyType: 'stage_check_in_out_of_range',
        distanceMeters: anomalyReview.geofenceState.distanceMeters,
        thresholdMeters: anomalyReview.geofenceState.thresholdMeters,
        explanation: anomalyReview.explanation,
        inspectorId: activeUser?.supabaseId ?? activeUser?.id,
        metadata: {
          stageNumber: currentStage,
        },
      })
      setLastSavedLabel(`Stage ${currentStage} signed off with an anomaly note for admin review.`)
    }

    if (location.error && nextStage === currentStage) {
      setStageSignOffError(location.error)
    }

    setStageSigning(false)
  }

  async function applySeal() {
    if (!report || !job || !assignment || !activeUser || !overlay) return
    if (!sealReady || !finalSealLocationIntegrityReady) return
    const sealedAt = new Date().toISOString()
    const existingStageSignOffs = getStageSignOffs(report.sealPayload)
    await finalizeProjectCompletion({
      nextItems: items,
      nextStageSignOffs: existingStageSignOffs,
      sealedAt,
      certificationType: 'standard',
      projectState: 'SEALED',
      auditNote: 'Inspector completion checklist sealed',
      successBehavior: 'return_to_dashboard',
    })
  }

  async function handleFinalOccupancyIssue() {
    if (!report || !job || !assignment || !activeUser || !overlay) return
    if (!isFinalOccupancyStage || !finalOccupancyActionReady) return

    setStageSignOffError(null)

    const location = await captureStageLocation()
    const anomalyReview = await collectStageLocationExplanation({
      location,
      projectReferencePoint,
    })
    if (anomalyReview.blocked) {
      setStageSignOffError('A short explanation is required for out-of-range check-ins.')
      return
    }
    const sealedAt = new Date().toISOString()
    const signedBy = activeUser.name ?? 'Inspector'
    const signedById = activeUser.supabaseId ?? activeUser.id

    const nextItems = items.map(item => (
      item.stage_number === currentStage
        ? {
            ...item,
            inspection_status: item.inspection_status === 'N/A' ? 'N/A' as const : 'Passed' as const,
            metadata: {
              ...item.metadata,
              stageSignOff: {
                stageNumber: currentStage,
                signedAt: sealedAt,
                latitude: location.latitude,
                longitude: location.longitude,
                signedBy,
                signedById,
              },
            },
          }
        : item
    ))

    const nextStageSignOffs = {
      ...stageSignOffs,
      [String(currentStage)]: {
        stageNumber: currentStage,
        signedAt: sealedAt,
        latitude: location.latitude,
        longitude: location.longitude,
        signedBy,
        signedById,
        itemCodes: stageItems.map(item => item.item_code),
        unlockedStages: [],
      },
    }

    const completed = await finalizeProjectCompletion({
      nextItems,
      nextStageSignOffs,
      sealedAt,
      certificationType: 'final_occupancy',
      projectState: 'COMPLETED',
      auditNote: 'Final Vero inspection record issued and project file completed',
      location,
      successBehavior: 'stay',
    })

    if (!completed) {
      setStageSignOffError('Final occupancy could not be issued. Please try again.')
      return
    }

    if (anomalyReview.geofenceState.state === 'anomalous' && report && assignment && job) {
      await createFieldGeoAnomaly({
        assignmentId: assignment.id,
        jobId: job.id,
        reportId: report.id,
        anomalyType: 'final_check_in_out_of_range',
        distanceMeters: anomalyReview.geofenceState.distanceMeters,
        thresholdMeters: anomalyReview.geofenceState.thresholdMeters,
        explanation: anomalyReview.explanation,
        inspectorId: activeUser?.supabaseId ?? activeUser?.id,
        metadata: {
          stageNumber: currentStage,
        },
      })
    }

    if (location.error) {
      setStageSignOffError(location.error)
    }
  }

  if (loading) {
    return (
      <div className="completion-workspace min-h-screen bg-[var(--color-surface)] text-[color:var(--color-ink)]">
        <Navbar role="inspector" dark />
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#C6A15B]" />
        </div>
      </div>
    )
  }

  if (error || !job || !overlay || !report) {
    return (
      <div className="completion-workspace min-h-screen bg-[var(--color-surface)] text-[color:var(--color-ink)]">
        <Navbar role="inspector" dark />
        <div className="mx-auto max-w-3xl px-4 py-16">
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6">
            <div className="mb-2 text-lg font-black">Inspector Completion unavailable</div>
            <div className="text-sm text-red-200">{error ?? 'The completion workspace could not be loaded.'}</div>
          </div>
        </div>
      </div>
    )
  }

  if (sealed) {
    const result = (report.sealPayload.overallResult as string | undefined) ?? 'pass'
    const isProjectCertified = report.sealPayload.certificationType === 'final_occupancy'
      || report.sealPayload.projectState === 'COMPLETED'

    return (
      <div className="completion-workspace min-h-screen bg-[var(--color-surface)] text-[color:var(--color-ink)]">
        <Navbar role="inspector" dark />
        <main className="mx-auto max-w-3xl px-4 py-12">
          <div className={`rounded-[2rem] p-8 text-center ${
            isProjectCertified
              ? 'border border-rim/70 border-l-2 border-l-warning-amber bg-panel'
              : 'border border-rim/70 border-l-2 border-l-success-green bg-panel'
          }`}>
            <div className="mx-auto mb-5 flex items-center justify-center">
              <VeroSealIcon certified={isProjectCertified} className="h-20 w-20" />
            </div>
            <h1 className="text-3xl font-black text-white">{isProjectCertified ? 'Project Record Complete' : 'Digital Seal Applied'}</h1>
            <p className={`mx-auto mt-3 max-w-xl text-sm ${
              isProjectCertified ? 'text-slate-300' : 'text-emerald-100/80'
            }`}>
              {isProjectCertified
                ? 'The final Vero inspection record has been issued. The project file is complete and sealed with its full 15-stage platform record.'
                : 'The 15-stage inspector completion package is sealed and stored with its AHJ overlay snapshot.'}
            </p>

            <div className="mt-8 grid gap-4 rounded-3xl border border-white/10 bg-[#0b1226] p-5 text-left md:grid-cols-2">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Seal Reference</div>
                <div className="mt-1 font-mono text-lg text-slate-900">{report.sealReference}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">{isProjectCertified ? 'Record Status' : 'Outcome'}</div>
                <div className={`mt-1 inline-flex rounded-full border border-rim/70 bg-white/5 px-3 py-1 text-sm font-black ${
                  isProjectCertified
                    ? 'text-warning-amber'
                    : result === 'fail'
                      ? 'text-fail-red'
                      : 'text-success-green'
                }`}>
                  {isProjectCertified
                    ? 'Final Vero Record Issued'
                    : result === 'fail'
                      ? 'Sealed with Failures'
                      : 'Sealed Pass'}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Project</div>
                <div className="mt-1 text-sm font-semibold text-zinc-100">{job.projectName}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">{isProjectCertified ? 'Project State' : 'AHJ Overlay'}</div>
                <div className="mt-1 text-sm font-semibold text-zinc-100">
                  {isProjectCertified ? 'Completed' : overlay.label}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {overlay.type === 'vancouver' && (
                <a
                  href={`/api/schedule-cb?reportId=${report.id}`}
                  download="Schedule_C-B.pdf"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-500/20 transition-all"
                >
                  <FileUp className="h-4 w-4" />
                  Download Schedule C-B
                </a>
              )}
              <button
                type="button"
                onClick={() => router.push('/vault')}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black hover:bg-white/10"
              >
                View in Vault
              </button>
              <button
                type="button"
                onClick={() => router.push('/inspector')}
                className="rounded-2xl bg-[#C6A15B] px-5 py-3 text-sm font-black text-[#1B1508] hover:bg-[#D8B871]"
              >
                Back to Inspector Board
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const currentProgress = stageProgress.find(stage => stage.stage.stage_number === currentStage)

  return (
    <div className="completion-workspace min-h-screen bg-[var(--color-surface)] text-[color:var(--color-ink)] pb-40 [&_.text-zinc-100]:text-[color:var(--color-ink)] [&_.text-zinc-200]:text-[color:var(--color-ink)] [&_.text-zinc-300]:text-[color:var(--color-muted)] [&_.text-zinc-400]:text-[color:var(--color-subtle)] [&_.text-zinc-500]:text-[color:var(--color-subtle)]">
      <Navbar role="inspector" dark />
      <main className="mx-auto max-w-7xl px-4 py-6">
        {sealSuccessMessage && (
          <div className={`mb-6 rounded-[1.75rem] border border-rim/70 border-l-2 border-l-success-green bg-white/5 px-5 py-4 text-ink ${FLOATING_PANEL_CLASS}`}>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-green" />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-success-green">Seal Applied</div>
                <div className="mt-1 text-base font-medium text-ink">
                  {sealSuccessMessage}
                </div>
              </div>
            </div>
          </div>
        )}
        {showStageSuccessBanner && stageTransitionHandshake && (
          <div className={`mb-6 rounded-[1.75rem] border border-rim/70 border-l-2 border-l-success-green bg-white/5 px-5 py-4 text-ink ${FLOATING_PANEL_CLASS}`}>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-green" />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-success-green">Stage Transition</div>
                <div className="mt-1 text-base font-medium text-ink">
                  Stage {stageTransitionHandshake.completedStageNumber} Complete! You are now working on Stage {stageTransitionHandshake.nextStageNumber}.
                </div>
              </div>
            </div>
          </div>
        )}
        {activeJobHold && isHoldOpenStatus(activeJobHold.status) && (
          <div id="hold" className={`mb-6 rounded-[1.75rem] border border-rim/70 border-l-2 border-l-warning-amber bg-white/5 px-5 py-4 text-ink ${FLOATING_PANEL_CLASS}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-amber" />
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-warning-amber">Hold Active</div>
                  <div className="mt-1 text-lg font-black text-ink">{getWorkspaceHoldResponseLabel(activeJobHold)}</div>
                  <div className="mt-2 text-sm font-semibold text-ink">
                    {activeJobHold.deficiencyReason || activeJobHold.reason}
                  </div>
                  {activeJobHold.deficiencyReason && (
                    <div className="mt-1 text-sm text-muted">Required correction: {activeJobHold.reason}</div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {typeof activeJobHold.holdCapAmount === 'number' && (
                  <div className="rounded-xl border border-rim/70 bg-white/5 px-3 py-2 text-xs font-black text-ink">
                    Fee terms: ${activeJobHold.holdCapAmount.toFixed(2)}
                  </div>
                )}
                {typeof activeJobHold.holdEligibleForOnSiteCorrection === 'boolean' && (
                  <div className="rounded-xl border border-rim/70 bg-white/5 px-3 py-2 text-xs font-black text-ink">
                    {activeJobHold.holdEligibleForOnSiteCorrection ? 'Same-day correction eligible' : 'Rebook required'}
                  </div>
                )}
                {activeJobHold.builderSelectedCorrectionMinutes && (
                  <div className="rounded-xl border border-rim/70 bg-white/5 px-3 py-2 text-xs font-black text-ink">
                    Builder window: {activeJobHold.builderSelectedCorrectionMinutes} min
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {assignmentScope && assignmentScopeComplete && !isFinalOccupancyStage && (
          <div
            ref={scopedCompletionPanelRef}
            tabIndex={-1}
            className={`mb-6 rounded-[2rem] border border-rim/70 border-l-2 border-l-success-green bg-white/5 px-5 py-5 text-ink outline-none ring-0 ${FLOATING_PANEL_CLASS}`}
          >
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-success-green/30 bg-success-green/10 text-success-green">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-success-green">Stage Complete</div>
                  <h2 className="mt-1 text-2xl font-black text-ink">Stage complete</h2>
                  <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-muted">
                    Thank you. The inspection has been submitted successfully. The builder has been notified, and the official field record is now available.
                  </p>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-rim/70 bg-white/5 px-4 py-3">
                      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-subtle">Outcome</div>
                      <div className="mt-1 text-sm font-black text-ink">
                        {((report?.sealPayload?.overallResult as string | undefined) ?? 'pass') === 'fail'
                          ? 'Corrections required — reinspection needed'
                          : 'Inspection passed'}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-rim/70 bg-white/5 px-4 py-3">
                      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-subtle">Builder notification</div>
                      <div className="mt-1 text-sm font-black text-ink">Sent</div>
                    </div>
                    <div className="rounded-2xl border border-rim/70 bg-white/5 px-4 py-3">
                      <div className="text-[11px] font-black uppercase tracking-[0.16em] text-subtle">Payment status</div>
                      <div className="mt-1 text-sm font-black text-ink">Pending processing</div>
                    </div>
                  </div>

                  <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                    Payment release is pending processing and will be processed according to the project terms.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-3 sm:flex-row xl:flex-col">
                <button
                  type="button"
                  onClick={() => router.push('/inspector')}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-[#C6A15B] px-4 py-2.5 text-xs font-semibold text-[#1B1508] shadow-sm ring-1 ring-inset ring-white/10 transition-colors hover:bg-[#D8B871]"
                >
                  Return to Job Board <ChevronRight className="h-4 w-4" />
                </button>
                {!previewMode && report.id ? (
                  <a
                    href={`/api/schedule-cb?reportId=${report.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-rim/70 bg-white/5 px-4 py-2.5 text-xs font-semibold text-ink transition-colors hover:bg-white/5"
                  >
                    View Completed Record <FileCheck2 className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <aside className={`completion-sidebar rounded-[2rem] border border-white/10 bg-[var(--color-panel)] p-4 lg:w-[300px] lg:flex-none lg:h-auto lg:min-h-full lg:sticky lg:top-4 lg:self-start lg:max-h-none lg:overflow-visible ${FLOATING_PANEL_CLASS}`}>
            {previewMode && (
              <div className="mb-4 rounded-2xl border border-slate-500/40 bg-[repeating-linear-gradient(135deg,rgba(51,65,85,0.9)_0,rgba(51,65,85,0.9)_12px,rgba(71,85,105,0.88)_12px,rgba(71,85,105,0.88)_24px)] px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-100 shadow-[0_10px_20px_rgba(15,23,42,0.2)]">
                Dev Preview Only
              </div>
            )}
            <button
              type="button"
              onClick={() => router.push('/inspector')}
              className="mb-4 inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Inspector Board
            </button>

            <div className={`rounded-3xl border border-rim/70 bg-panel p-4 ${FLOATING_PANEL_CLASS}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-electric">Inspector Completion</div>
                  <h1 className="mt-2 text-xl font-black">{job.projectName}</h1>
                </div>
                <div className="rounded-full border border-rim/70 bg-white/5 px-3 py-1 text-[11px] font-black text-[#C6A15B]">
                  {assignmentScope ? `Stage ${assignmentScope.builderStageNumber} of 5` : '15 Stages'}
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-zinc-300">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-electric" />
                  <span>{job.address}, {job.city}</span>
                </div>
                {job.stage && (
                  <div className="flex items-start gap-2">
                    <FileCheck2 className="mt-0.5 h-4 w-4 text-cyan-300" />
                    <span>Builder request: {job.stageName}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-4 w-4 text-cyan-300" />
                  <span>{overlay.jurisdictionName}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Stamp className="mt-0.5 h-4 w-4 text-cyan-300" />
                  <span>{overlay.label}</span>
                </div>
              </div>
            </div>

            <div className={`mt-4 rounded-3xl border border-rim/70 border-l-2 border-l-warning-amber bg-white/5 p-4 ${FLOATING_PANEL_CLASS}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-warning-amber" />
                <div>
                  <div className="text-sm font-black text-warning-amber">AHJ Overlay Active</div>
                  <div className="mt-1 text-xs leading-relaxed text-muted">{overlay.summary}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
              <span>{lastSavedLabel}</span>
              {saving && <Loader2 className="h-4 w-4 animate-spin text-[#C6A15B]" />}
            </div>

            <div className={`mt-4 rounded-[1.75rem] border border-white/10 bg-[var(--color-panel)] p-4 ${FLOATING_PANEL_CLASS}`}>
              <button
                type="button"
                onClick={() => setProjectOverviewOpen(open => !open)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Project Overview</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full border border-rim/70 bg-white/5 px-3 py-1 text-[11px] font-black text-electric">
                    {assignmentScope
                      ? `${projectOverviewStages.filter(s => s.stage.stage_number === assignmentScope.internalStageNumber && s.status === 'passed').length}/1 passed — ${assignmentScope.builderStageLabel}`
                      : `${projectOverviewStages.filter(stage => stage.status === 'passed').length}/${projectOverviewStages.length} passed`
                    }
                  </div>
                  <ChevronRight className={`h-5 w-5 text-zinc-400 transition-transform ${projectOverviewOpen ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {projectOverviewOpen && (
                <div className="mt-4 space-y-4">
                  {phasedProjectOverview.map(phase => (
                    <div key={phase.id}>
                      <div className="mb-2 flex items-center gap-3">
                        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">{phase.label}</div>
                        <div className="h-px flex-1 bg-white/10" />
                      </div>

                      <div className="space-y-2">
                        {phase.stages.map(({ stage, status, unlocked, signOff }) => {
                          const stageCode = `S${String(stage.stage_number).padStart(2, '0')}`
                          const isCurrent = currentStage === stage.stage_number
                          const isInAssignmentScope = !assignmentScope || stage.stage_number === assignmentScope.internalStageNumber
                          const isClickable = isInAssignmentScope && status !== 'pending'
                          const scopeLockMessage = isInAssignmentScope
                            ? null
                            : stage.stage_number > (assignmentScope?.internalStageNumber ?? 0)
                              ? getBuilderRequestMessageForCompletionStage(stage.stage_number)
                              : 'Not active in this inspection request.'
                          const containerClass =
                            !isInAssignmentScope
                              ? 'border-rim/60 bg-white/5'
                              : status === 'passed'
                              ? 'border-rim/70 border-l-2 border-l-success-green bg-white/5'
                              : status === 'active'
                                ? 'border-rim/70 border-l-2 border-l-electric bg-white/5'
                                : 'border-rim/60 bg-white/5'
                          const badgeClass =
                            !isInAssignmentScope
                              ? 'border-rim/60 bg-white/5 text-subtle'
                              : status === 'passed'
                              ? 'border-rim/70 bg-white/5 text-success-green'
                              : status === 'active'
                                ? 'border-rim/70 bg-white/5 text-electric'
                                : 'border-rim/60 bg-white/5 text-subtle'

                          return (
                            <button
                              key={stage.stage_number}
                              type="button"
                              disabled={!isClickable}
                              onClick={() => {
                                if (isClickable) navigateToStage(stage.stage_number)
                              }}
                              className={`w-full rounded-2xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${containerClass} ${isCurrent ? 'ring-1 ring-[#C6A15B]/60' : ''}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${badgeClass}`}>
                                      {stageCode}
                                    </span>
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${badgeClass}`}>
                                      {!isInAssignmentScope ? 'Locked' : status === 'passed' ? 'Passed' : status === 'active' ? 'Active' : 'Locked'}
                                    </span>
                                    {isCurrent && (
                                      <span className="rounded-full border border-rim/70 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#C6A15B]">
                                        In View
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-2 text-sm font-bold text-zinc-100">{stage.stage_name}</div>
                                  <div className="mt-1 text-[11px] text-zinc-400">
                                    {scopeLockMessage
                                      ? scopeLockMessage
                                      : status === 'passed'
                                      ? `Signed ${signOff ? new Date(signOff.signedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : ''}`.trim()
                                      : unlocked
                                        ? 'Unlocked and ready for field work.'
                                        : 'Waiting on upstream dependencies.'}
                                  </div>
                                </div>
                                {status === 'passed' ? (
                                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success-green" />
                                ) : status === 'active' ? (
                                  <CircleDashed className="h-5 w-5 shrink-0 text-electric" />
                                ) : (
                                  <Lock className="h-5 w-5 shrink-0 text-zinc-500" />
                                )}
                              </div>

                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <section className="space-y-5 lg:min-w-0 lg:flex-1">
            <div className={`rounded-[2rem] border border-white/10 bg-[var(--color-panel)] p-5 ${FLOATING_PANEL_CLASS}`}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Current Checklist</div>
                  <h2 className="mt-2 text-3xl font-black">S{String(currentStage).padStart(2, '0')} — {currentProgress?.stage.stage_name}</h2>
                  {job.stage && (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-electric">
                      Builder request: {job.stageName}
                    </p>
                  )}
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">{currentProgress?.stage.summary}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 shrink-0 overflow-hidden">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Resolved</div>
                    <div className="mt-2 text-2xl font-black">{currentProgress?.resolved ?? 0}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Pending</div>
                    <div className="mt-2 text-2xl font-black">{(currentProgress?.total ?? 0) - (currentProgress?.resolved ?? 0)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Seal Gate</div>
                    <div className={`mt-2 text-sm font-black ${sealReady ? 'text-success-green' : 'text-warning-amber'}`}>
                      {sealReady ? 'Ready' : 'Locked'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {holdMode && !hasOpenHold && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#020617]/80 px-4 py-6 backdrop-blur-sm">
                  <div className="w-full max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-5 text-slate-900 shadow-[0_30px_80px_rgba(2,6,23,0.55)]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                          <PauseCircle className="h-5 w-5 text-amber-700" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">Offer On-Site Hold</div>
                          <div className="mt-1 text-xs text-slate-600">
                            Use this when the issue can reasonably be corrected during the current visit, allowing the inspector to remain on site and re-review without rebooking.
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={resetHoldForm}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        aria-label="Close hold form"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-800">Hold · Same-Day Correction</div>
                      <p className="mt-1 text-xs leading-relaxed text-amber-900/90">{HOLD_SAME_DAY_HELPER}</p>
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Affected Container</div>
                      <div className="mt-2 text-sm font-semibold text-slate-900">
                        {holdTargetItemCode ?? 'Current container'}
                        {holdTargetItemLabel ? ` · ${holdTargetItemLabel}` : ''}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4">
                      <div>
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Deficiency Summary</div>
                        <input
                          value={holdReason}
                          onChange={event => setHoldReason(event.target.value)}
                          placeholder="Handrail not installed on north stairwell"
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Required Correction</div>
                        <textarea
                          value={holdDeficiencyReason}
                          onChange={event => setHoldDeficiencyReason(event.target.value)}
                          placeholder="Install code-compliant handrail on both sides"
                          rows={3}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none resize-none"
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Hold Category</div>
                          <select
                            value={holdCategory}
                            onChange={event => setHoldCategory(event.target.value as HoldCategory)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none"
                          >
                            <option value="minor_deficiency">Minor Deficiency</option>
                            <option value="coordination">Coordination</option>
                            <option value="access">Access</option>
                            <option value="safety">Safety</option>
                            <option value="documentation">Documentation</option>
                            <option value="other">Other</option>
                          </select>
                        </label>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Base Hold Review Fee</div>
                          <div className="text-lg font-black text-slate-900">${baseHoldServiceFee.toFixed(2)}</div>
                          <div className="mt-1 text-[11px] text-slate-600">
                            Flat fee — charged once the builder accepts. Covers documentation, deficiency notes, evidence upload, and reservation of same-day re-verification rights.
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Same-Day Correction Eligible</div>
                        <div className="mb-2 text-[11px] text-slate-600">
                          Mark as eligible if the deficiency can reasonably be corrected and re-verified before you leave site. The builder will select their correction window at acceptance.
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setHoldSameDayEligible(true)}
                            className={`rounded-xl border px-4 py-3 text-left transition-all ${
                              holdSameDayEligible
                                ? 'border-amber-500 bg-amber-50'
                                : 'border-slate-300 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="font-bold text-sm text-slate-900">Yes — Same-Day Eligible</div>
                            <div className="mt-1 text-xs text-slate-600">Builder may reserve a correction window and receive same-day re-verification.</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setHoldSameDayEligible(false)}
                            className={`rounded-xl border px-4 py-3 text-left transition-all ${
                              !holdSameDayEligible
                                ? 'border-amber-500 bg-amber-50'
                                : 'border-slate-300 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="font-bold text-sm text-slate-900">No — Rebook Required</div>
                            <div className="mt-1 text-xs text-slate-600">Correction cannot be completed during this visit. A new inspection booking will be required.</div>
                          </button>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Applicable Base Rate</div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-600">{holdPricingLabel}</span>
                          <span className="text-sm font-black text-slate-900">${holdBaseRate.toFixed(2)}/hr</span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          Set by the inspection role and pricing basis. Not adjusted during the hold workflow.
                        </div>
                      </div>

                      <div>
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Inspector Notes</div>
                        <textarea
                          value={holdNotes}
                          onChange={event => setHoldNotes(event.target.value)}
                          placeholder="Optional coordination notes for the builder regarding access, sequencing, or expected readiness for re-review."
                          rows={2}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none resize-none"
                        />
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Supporting Evidence</div>
                            <div className="mt-1 text-xs text-slate-600">
                              Attach photos, video, or supporting documents to record the hold condition and required correction.
                            </div>
                          </div>
                          <div className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-900">
                            Optional
                          </div>
                        </div>

                        <input
                          ref={holdPhotoInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={event => void handleHoldPhotoSelected(event)}
                        />
                        <input
                          ref={holdVideoInputRef}
                          type="file"
                          accept="video/mp4,video/x-m4v,video/*"
                          capture="environment"
                          className="hidden"
                          onChange={event => void handleHoldVideoSelected(event)}
                        />
                        <input
                          ref={holdAttachmentInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.txt,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                          className="hidden"
                          onChange={event => void handleHoldAttachmentSelected(event)}
                        />

                        <div className="grid gap-2 sm:grid-cols-3">
                          <button
                            type="button"
                            onClick={() => holdPhotoInputRef.current?.click()}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-900 transition-all hover:bg-amber-50"
                          >
                            <span className="inline-flex items-center gap-2">
                              <Camera className="h-4 w-4" />
                              <span>Photo</span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => holdVideoInputRef.current?.click()}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-900 transition-all hover:bg-amber-50"
                          >
                            <span className="inline-flex items-center gap-2">
                              <Video className="h-4 w-4" />
                              <span>Video</span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => holdAttachmentInputRef.current?.click()}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-900 transition-all hover:bg-amber-50"
                          >
                            <span className="inline-flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span>Upload Attachment</span>
                            </span>
                          </button>
                        </div>

                        {holdEvidenceWarning && (
                          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-100 px-3 py-3 text-xs font-medium text-amber-900">
                            {holdEvidenceWarning}
                          </div>
                        )}

                        {holdEvidenceItems.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {holdEvidenceItems.map(evidence => (
                              <div key={evidence.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] uppercase tracking-widest text-amber-900">
                                      {evidence.evidenceType}
                                    </span>
                                    <span className="truncate">{evidence.fileName}</span>
                                  </div>
                                  <div className="mt-1 text-[11px] text-slate-600">
                                    {formatBytes(evidence.fileSize)}
                                    {' · '}
                                    {new Date(evidence.capturedAt).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                                    {evidence.lat != null && evidence.lng != null ? ` · ${evidence.lat.toFixed(5)}, ${evidence.lng.toFixed(5)}` : ''}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removePendingHoldEvidence(evidence.id)}
                                  className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-bold text-slate-700 transition-all hover:bg-slate-100"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
                        Base Hold Review Fee of <span className="font-bold">${baseHoldServiceFee.toFixed(2)}</span> is charged once the builder accepts.
                        The builder will select their correction window — additional window and overrun fees apply based on their selection.
                      </div>

                      {holdMissingFields.length > 0 && (
                        <div className="rounded-xl border border-amber-300 bg-amber-100 px-3 py-3 text-xs font-medium text-amber-900">
                          Complete the deficiency summary and required correction before issuing hold terms.
                        </div>
                      )}

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => void handlePlaceHold()}
                          disabled={
                            !holdTargetItemCode
                            || !holdReason.trim()
                            || !holdDeficiencyReason.trim()
                            || holdBaseRate <= 0
                            || isPlacingHold
                          }
                          className="flex-1 rounded-xl bg-amber-400 py-3 text-sm font-black text-slate-900 transition-all hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isPlacingHold ? 'Sending Hold Terms...' : 'Send Hold Terms'}
                        </button>
                        <button
                          type="button"
                          onClick={resetHoldForm}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/10"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {stageItems.map(item => {
                const requiredLabel = typeof item.is_required === 'string' ? item.is_required : item.is_required ? 'Required' : 'Optional'
                const blockedBy = getUnresolvedDependencyCodes(item, items, assignmentScope?.internalStageNumber)
                const passRequiresEvidence = item.evidence_mode === 'required_upload' && item.document_upload_required
                const passBlockedForEvidence = passRequiresEvidence && item.documents.length === 0
                const passBlockedForDependency = blockedBy.length > 0
                const passBlocked = passBlockedForEvidence || passBlockedForDependency
                const passBlockedMessage = passBlockedForDependency
                  ? getDependencyBlockerMessage(item.item_code, blockedBy)
                  : REQUIRED_EVIDENCE_LOCK_MESSAGE
                const showRequirementIndicator = passRequiresEvidence
                const evidenceSummary = item.evidence_mode === 'verify_existing'
                  ? 'Verify project documents already on file. Upload remains optional unless you need to document a discrepancy.'
                  : 'At least one captured evidence item is required before this container can be passed.'
                const shortPurpose = summarizePurpose(item.item_purpose)
                const usesFieldView = item.ui_schema === 'field_view'
                const fieldViewDetails = item.view_details?.trim() || item.field_view_details?.trim() || item.item_purpose
                const stopItems = item.stop_if && item.stop_if.length > 0 ? item.stop_if : item.fail_when

                const checklistItems = item.field_checklist.length > 0 ? item.field_checklist : item.what_to_check
                const guidancePanelOpen = expandedGuidancePanels[item.item_code] ?? false
                const stopConditionsOpen = expandedStopConditions[item.item_code] ?? false
                const failConditionsOpen = expandedFailConditions[item.item_code] ?? false
                const containerNotesOpen = expandedContainerNotes[item.item_code] ?? Boolean(item.response_note.trim())
                const jurisdictionNotesOpen = expandedJurisdictionNotes[item.item_code] ?? false

                // "Requirements to complete" summary inputs — reuse existing helpers /
                // computed flags only (no new completion logic). Shared by both render
                // branches so field_view and standard stay in lockstep.
                const runtimeChecklistEntries = getRuntimeChecklistItems(item)
                const runtimeChecklistDone = runtimeChecklistEntries.filter(detail => isChecklistEntryComplete(item, detail)).length
                const containerReady = isStageItemReadyForSignOff(item, items, assignmentScope?.internalStageNumber)
                const containerRequirements: ContainerRequirement[] = item.inspection_status === 'N/A'
                  ? [{ label: 'Marked Not Applicable', done: true }]
                  : [
                      ...(runtimeChecklistEntries.length > 0
                        ? [{ label: `Complete checklist items (${runtimeChecklistDone}/${runtimeChecklistEntries.length})`, done: runtimeChecklistDone === runtimeChecklistEntries.length }]
                        : []),
                      ...(passRequiresEvidence
                        ? [{ label: 'Capture required evidence', done: !passBlockedForEvidence }]
                        : []),
                      ...(blockedBy.length > 0
                        ? [{ label: `Clear prerequisites: ${blockedBy.join(', ')}`, done: false }]
                        : []),
                      { label: 'Select a section outcome', done: item.inspection_status !== 'Pending' },
                    ]

                if (usesFieldView) {
                  return (
                    <article
                      key={item.item_code}
                      ref={node => {
                        stageItemRefs.current[item.item_code] = node
                      }}
                      tabIndex={-1}
                      className={`relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[var(--color-panel)] p-4 sm:p-5 outline-none ${FLOATING_PANEL_CLASS} ${
                        stageTransitionHandshake?.targetItemCode === item.item_code ? 'ring-2 ring-emerald-400/45 ring-offset-2 ring-offset-[#050816]' : ''
                      }`}
                    >
                      {showRequirementIndicator && (
                        <div
                          aria-hidden="true"
                          className={`absolute inset-y-0 left-0 w-0.5 ${passBlockedForEvidence ? 'bg-warning-amber/50' : 'bg-success-green/50'}`}
                        />
                      )}
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                            {item.item_code}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                            Field View
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                            {item.documents.length} file{item.documents.length === 1 ? '' : 's'}
                          </span>
                          {usesFieldView && item.responsible_party && (
                            <span className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300">
                              {item.responsible_party}
                            </span>
                          )}
                          {usesFieldView && item.permit_type && (
                            <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300">
                              {item.permit_type}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-black leading-tight sm:text-xl">{item.item_label}</h3>
                              {showRequirementIndicator && (
                                passBlockedForEvidence ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rim/70 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-warning-amber">
                                    <span className="h-1.5 w-1.5 rounded-full bg-warning-amber" />
                                    Evidence required
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-rim/60 bg-raised text-success-green"
                                    aria-label="Required evidence uploaded"
                                    title="Required evidence uploaded"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </span>
                                )
                              )}
                            </div>
                            <p className="mt-2 text-[17px] leading-7 text-zinc-300">{usesFieldView ? fieldViewDetails : shortPurpose}</p>
                          </div>
                        </div>
                      </div>

                      <ContainerRequirementsSummary requirements={containerRequirements} ready={containerReady} />

                      {blockedBy.length > 0 && (
                        <div className={`mt-3 ${DEPENDENCY_BLOCKER_NOTICE_CLASS}`}>
                          {getDependencyBlockerMessage(item.item_code, blockedBy)}
                        </div>
                      )}

                      <div className="mt-5 rounded-2xl bg-white/5 p-4 sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Field Checklist</div>
                            <div className="mt-1 text-xs text-zinc-400">Tap each item as you verify it. Capture evidence inline as you go.</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black text-[color:var(--color-muted)]">
                              {checklistItems.filter(detail => getChecklistEntryState(item, detail).checked).length}/{checklistItems.length}
                            </div>
                          </div>
                        </div>

                        {passRequiresEvidence && (
                          <RequiredEvidenceActionPanel
                            item={item}
                            blocked={passBlockedForEvidence}
                            onAttachRequiredEvidence={() => focusRequiredEvidenceUpload(item.item_code)}
                          />
                        )}

                        <div className="mt-4">
                          {checklistItems.map((detail, index) => {
                            const entryState = getChecklistEntryState(item, detail)
                            const noteKey = `${item.item_code}:${checklistEntryKey(detail)}`
                            const noteOpen = expandedChecklistNotes[noteKey] === true || Boolean(entryState.note)
                            const evidenceActions = parseFieldEvidenceActions(detail)
                            const showCamera = evidenceActions === null || evidenceActions.includes('camera')
                            const showVideo = evidenceActions === null || evidenceActions.includes('video')
                            const showAudio = evidenceActions === null || evidenceActions.includes('audio')
                            const showText = evidenceActions === null || evidenceActions.includes('text') || Boolean(entryState.note)

                            return (
                              <div key={detail} className="border-t border-white/8 py-4 first:border-t-0 first:pt-0">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                  <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={entryState.checked === true}
                                    onClick={() => toggleChecklistItem(item.item_code, detail)}
                                    className={`flex min-h-[52px] w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors lg:flex-1 ${
                                      entryState.checked
                                        ? 'bg-white/[0.03] text-[color:var(--color-ink)]'
                                        : 'text-[color:var(--color-ink)] hover:bg-white/5'
                                    }`}
                                  >
                                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                                      entryState.checked
                                        ? 'border-success-green/40 bg-success-green/10 text-success-green'
                                        : 'border-zinc-600 bg-transparent text-zinc-500'
                                    }`}>
                                      <CheckCircle2 className="h-4 w-4" />
                                    </span>
                                    <span className="pt-0.5 text-sm font-semibold leading-relaxed">{detail}</span>
                                  </button>

                                  <div className="flex flex-wrap items-center gap-1.5 self-start rounded-xl bg-white/5 p-1">
                                    {showCamera && (
                                      <FieldMediaUploader
                                        expectedType="camera"
                                        variant="icon"
                                        label="Capture photo"
                                        buttonClassName={TACTILE_MEDIA_BUTTON_CLASS}
                                        onCapture={payload => handleChecklistCapture(item.item_code, detail, payload)}
                                      />
                                    )}
                                    {showVideo && (
                                      <FieldMediaUploader
                                        expectedType="video"
                                        variant="icon"
                                        label="Capture video"
                                        buttonClassName={TACTILE_MEDIA_BUTTON_CLASS}
                                        onCapture={payload => handleChecklistCapture(item.item_code, detail, payload)}
                                      />
                                    )}
                                    {showAudio && (
                                      <FieldMediaUploader
                                        expectedType="audio"
                                        variant="icon"
                                        label="Capture voice memo"
                                        buttonClassName={TACTILE_MEDIA_BUTTON_CLASS}
                                        onCapture={payload => handleChecklistCapture(item.item_code, detail, payload)}
                                      />
                                    )}
                                    {showText && (
                                      <FieldMediaUploader
                                        expectedType="text"
                                        variant="icon"
                                        label="Add text note"
                                        buttonClassName={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border px-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                          noteOpen
                                            ? 'border-[#C6A15B]/40 bg-[#C6A15B]/15 text-[#C6A15B]'
                                            : 'border-white/10 bg-white/8 text-[color:var(--color-muted)] hover:bg-white/15 hover:text-[color:var(--color-ink)]'
                                        }`}
                                        onCapture={payload => handleChecklistCapture(item.item_code, detail, payload)}
                                      />
                                    )}
                                  </div>
                                </div>

                                {noteOpen && (
                                  <textarea
                                    value={entryState.note ?? ''}
                                    onChange={event => updateChecklistNote(item.item_code, detail, event.target.value)}
                                    rows={3}
                                    placeholder={`Note for item ${index + 1}`}
                                    className="mt-3 w-full rounded-2xl border border-white/10 bg-[var(--color-raised)] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#C6A15B] focus:outline-none"
                                  />
                                )}

                                {/* Inline capture list — shows every file attached to this
                                    specific checklist entry, directly below its note field. */}
                                {(entryState.captures?.length ?? 0) > 0 && (
                                  <div className="mt-3 space-y-2">
                                    {entryState.captures!.map((cap, capIdx) => {
                                      // Prefer the full doc from state (has previewUrl, fileSize)
                                      const doc = cap.documentId
                                        ? item.documents.find(d => d.id === cap.documentId)
                                        : undefined
                                      if (doc) {
                                        return (
                                          <DocRow
                                            key={doc.id}
                                            doc={doc}
                                            onClick={() => void openDocument(doc)}
                                            onDelete={() => void handleDeleteDocument(item.item_code, doc)}
                                          />
                                        )
                                      }
                                      // Fallback: capture was recorded but doc is not (yet) in
                                      // state — render from the capture's own metadata instead.
                                      return (
                                        <div
                                          key={capIdx}
                                          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[var(--color-raised)] px-3 py-3"
                                        >
                                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                                            <File className="h-4 w-4 text-zinc-400" />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-semibold text-zinc-100">{cap.fileName}</div>
                                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500">
                                              {cap.fileSize != null && <span>{formatBytes(cap.fileSize)}</span>}
                                              <span>
                                                {new Date(cap.capturedAt).toLocaleString('en-CA', {
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                                  month: 'short',
                                                  day: 'numeric',
                                                })}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {(item.stop_if ?? []).length > 0 && (
                        <div className="mt-4 rounded-2xl bg-white/5 p-5 text-zinc-300">
                          <button
                            type="button"
                            onClick={() => toggleExpandedRecord(setExpandedStopConditions, item.item_code)}
                            className="flex w-full items-center justify-between gap-3 text-left"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 shrink-0 text-zinc-400" />
                              <div className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-400">{STAGE_BLOCKER_CONDITIONS_HEADING}</div>
                            </div>
                            <ChevronRight className={`h-5 w-5 text-zinc-400 transition-transform ${stopConditionsOpen ? 'rotate-90' : ''}`} />
                          </button>
                          <p className="mt-2 text-xs leading-relaxed text-zinc-400">{STAGE_BLOCKER_HELPER}</p>

                          {stopConditionsOpen && (
                            <div className="mt-3">
                              <GuidanceList
                                items={item.stop_if ?? []}
                                bulletClassName="bg-zinc-500"
                                textClassName="text-sm text-zinc-300"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {item.fail_when.length > 0 && (
                        <div className="mt-3 rounded-[1.5rem] border border-rim/70 border-l-4 border-l-warning-amber bg-white/5 p-4">
                          <button
                            type="button"
                            onClick={() => toggleExpandedRecord(setExpandedFailConditions, item.item_code)}
                            className="flex w-full items-center justify-between gap-3 text-left"
                          >
                            <div className="flex items-center gap-3">
                              <AlertTriangle className="h-5 w-5 shrink-0 text-warning-amber" />
                              <div className="text-sm font-black uppercase tracking-[0.14em] text-warning-amber">Correction Triggers</div>
                            </div>
                            <ChevronRight className={`h-5 w-5 text-warning-amber transition-transform ${failConditionsOpen ? 'rotate-90' : ''}`} />
                          </button>

                          {failConditionsOpen && (
                            <div className="mt-3">
                              <GuidanceList
                                items={item.fail_when}
                                bulletClassName="bg-warning-amber"
                                textClassName="text-sm text-warning-amber"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-4">
                        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">{SECTION_OUTCOME_HEADING}</div>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-400">{SECTION_OUTCOME_HELPER}</p>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 sm:grid-cols-4">
                        <StatusPill
                          label="Passed"
                          sublabel={passBlocked ? (passBlockedForEvidence ? 'Needs required evidence' : 'Blocked by prerequisite') : 'Verified Clear'}
                          value="Passed"
                          active={item.inspection_status === 'Passed'}
                          disabled={passBlocked}
                          onDisabledClick={() => setStageSignOffError(passBlockedMessage)}
                          onClick={value => handleStatusSelection(item.item_code, value)}
                        />
                        <StatusPill
                          label="Corrections Required"
                          sublabel="Deficiency Observed"
                          value="Failed"
                          active={item.inspection_status === 'Failed'}
                          onClick={value => handleStatusSelection(item.item_code, value)}
                        />
                        <button
                          type="button"
                          disabled={holdButtonDisabled}
                          title={hasOpenHold ? 'An open Hold already exists for this job. Resolve it before placing a new one.' : undefined}
                          onClick={() => openHoldForm(item)}
                          className={HOLD_ACTION_BUTTON_CLASS}
                        >
                          <span className="inline-flex items-center justify-center gap-2">
                            <PauseCircle className="h-4 w-4" />
                            <span className="flex flex-col items-center leading-tight">
                              <span>Hold</span>
                              <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] opacity-75">Same-Day Correction</span>
                            </span>
                          </span>
                        </button>
                        <StatusPill
                          label="N/A"
                          sublabel="Not Applicable"
                          value="N/A"
                          active={item.inspection_status === 'N/A'}
                          onClick={value => handleStatusSelection(item.item_code, value)}
                        />
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 sm:max-w-md">
                        <StatusPill
                          label="Reset to Pending"
                          value="Pending"
                          active={item.inspection_status === 'Pending'}
                          onClick={value => handleStatusSelection(item.item_code, value)}
                        />
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void persistDraft()}
                          className="min-h-12 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-[color:var(--color-ink)] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {saving ? 'Saving…' : 'Save Draft'}
                        </button>
                      </div>

                      <div className="mt-3 rounded-2xl border border-rim/70 border-l-2 border-l-warning-amber bg-white/5 px-4 py-3 text-xs leading-relaxed text-zinc-300">
                        {NA_SCOPE_HELPER}
                      </div>

                      {passBlocked && !passBlockedForEvidence && (
                        <div className="mt-3 rounded-2xl border border-rim/70 border-l-2 border-l-warning-amber bg-white/5 px-4 py-3 text-sm text-ink">
                          {passBlockedMessage}
                        </div>
                      )}

                      {item.inspection_status === 'Failed' && (
                        <FailedSectionPanel documented={isDocumentedFail(item)} />
                      )}

                      <div className="mt-4 space-y-4">
                        <div className="rounded-2xl bg-white/5 p-4">
                          <button
                            type="button"
                            onClick={() => toggleExpandedRecord(setExpandedGuidancePanels, item.item_code)}
                            className="flex w-full items-center justify-between gap-3 text-left"
                          >
                            <div>
                              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">View Guidance &amp; Code Reference</div>
                              <div className="mt-1 text-xs text-zinc-400">Purpose, checks, pass conditions, and evidence guidance.</div>
                            </div>
                            <ChevronRight className={`h-5 w-5 text-zinc-400 transition-transform ${guidancePanelOpen ? 'rotate-90' : ''}`} />
                          </button>

                          {guidancePanelOpen && (
                            <div className="mt-4 grid gap-3 xl:grid-cols-4">
                              <div className={`rounded-3xl border border-cyan-400/15 bg-cyan-400/5 p-4 ${FLOATING_PANEL_CLASS}`}>
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200/80">
                                  {item.view_details || item.field_view_details ? 'Details' : 'Purpose'}
                                </div>
                                <div className="mt-3">
                                  <GuidanceList
                                    items={[fieldViewDetails]}
                                    bulletClassName="bg-cyan-300"
                                    textClassName={EMPHASIZED_BODY_TEXT_CLASS}
                                  />
                                </div>
                              </div>

                              <div className={`rounded-3xl border border-white/10 bg-white/5 p-4 ${FLOATING_PANEL_CLASS}`}>
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">What to Check</div>
                                <div className="mt-3">
                                  <GuidanceList
                                    items={item.what_to_check}
                                    bulletClassName="bg-cyan-300"
                                    textClassName={EMPHASIZED_BODY_TEXT_CLASS}
                                  />
                                </div>
                              </div>

                              <div className={`rounded-3xl border border-rim/70 bg-white/5 p-4 ${FLOATING_PANEL_CLASS}`}>
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-subtle">Pass / Corrections / Pending</div>
                                <div className="mt-3">
                                  <div className="text-xs font-black uppercase tracking-[0.14em] text-success-green">Pass When</div>
                                  <div className="mt-2">
                                    <GuidanceList
                                      items={item.pass_when}
                                      bulletClassName="bg-emerald-300"
                                      textClassName={EMPHASIZED_BODY_TEXT_CLASS}
                                    />
                                  </div>
                                </div>
                                {item.fail_when.length > 0 && (
                                  <div className="mt-4">
                                    <div className="text-xs font-black uppercase tracking-[0.14em] text-fail-red">Corrections Required When</div>
                                    <div className="mt-2">
                                      <GuidanceList
                                        items={item.fail_when}
                                        bulletClassName="bg-rose-300"
                                        textClassName={EMPHASIZED_BODY_TEXT_CLASS}
                                      />
                                    </div>
                                  </div>
                                )}
                                <div className="mt-4">
                                  <div className="text-xs font-black uppercase tracking-[0.14em] text-warning-amber">Pending When</div>
                                  <div className="mt-2">
                                    <GuidanceList
                                      items={item.pending_when}
                                      bulletClassName="bg-warning-amber"
                                      textClassName={EMPHASIZED_BODY_TEXT_CLASS}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className={`rounded-3xl border border-white/10 bg-white/5 p-4 ${FLOATING_PANEL_CLASS}`}>
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Evidence Guidance</div>
                                <div className="mt-3 text-[17px] leading-7 text-zinc-300">{evidenceSummary}</div>
                                <div className="mt-4 rounded-2xl border border-white/10 bg-[var(--color-raised)] p-3">
                                  {item.required_evidence.length > 0 && (
                                    <>
                                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Required Evidence</div>
                                      <div className="mt-2">
                                        <GuidanceList
                                          items={item.required_evidence}
                                          bulletClassName="bg-warning-amber"
                                          textClassName="text-sm text-zinc-300"
                                        />
                                      </div>
                                    </>
                                  )}
                                  {item.optional_evidence.length > 0 && (
                                    <>
                                      <div className={`${item.required_evidence.length > 0 ? 'mt-4 ' : ''}text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500`}>Supporting Evidence</div>
                                      <div className="mt-2">
                                        <GuidanceList
                                          items={item.optional_evidence}
                                          bulletClassName="bg-zinc-500"
                                          textClassName="text-sm text-zinc-400"
                                        />
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                          <div>
                            <div className="space-y-3">
                              <div className="rounded-2xl bg-white/5 p-4">
                                <button
                                  type="button"
                                  onClick={() => toggleExpandedRecord(setExpandedContainerNotes, item.item_code)}
                                  className="flex w-full items-center justify-between gap-3 text-left"
                                >
                                  <div>
                                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Inspection Notes / Deficiencies</div>
                                    <div className="mt-1 text-xs text-zinc-400">{item.response_note.trim() ? 'Saved note present.' : 'Collapsed until notes are needed.'}</div>
                                  </div>
                                  <ChevronRight className={`h-5 w-5 text-zinc-400 transition-transform ${containerNotesOpen ? 'rotate-90' : ''}`} />
                                </button>

                                {containerNotesOpen && (
                                  <>
                                    <div className="mt-3 rounded-xl bg-white/8 p-3">
                                      <GuidanceList
                                        items={[item.inspector_notes_guidance]}
                                        bulletClassName="bg-zinc-400"
                                      />
                                    </div>
                                    <textarea
                                      value={item.response_note}
                                      onChange={event => updateItem(item.item_code, current => ({ ...current, response_note: event.target.value }))}
                                      rows={4}
                                      placeholder={item.inspector_notes_guidance}
                                      className="mt-3 w-full rounded-2xl border border-white/10 bg-[var(--color-raised)] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#C6A15B] focus:outline-none"
                                    />
                                  </>
                                )}
                              </div>

                              {PILOT_S9_CODE_REFS && (
                                <StageCodeReferences refs={item.code_references} />
                              )}

                              <div className="rounded-2xl bg-white/5 p-4">
                                <button
                                  type="button"
                                  onClick={() => toggleExpandedRecord(setExpandedJurisdictionNotes, item.item_code)}
                                  className="flex w-full items-center justify-between gap-3 text-left"
                                >
                                  <div>
                                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Jurisdiction Notes</div>
                                    <div className="mt-1 text-xs text-zinc-400">Municipal overlay commentary and local AHJ notes.</div>
                                  </div>
                                  <ChevronRight className={`h-5 w-5 text-zinc-400 transition-transform ${jurisdictionNotesOpen ? 'rotate-90' : ''}`} />
                                </button>

                                {jurisdictionNotesOpen && (
                                  <div className="mt-3">
                                    <GuidanceList
                                      items={[item.ahj_notes]}
                                      bulletClassName="bg-cyan-300"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div
                            ref={node => {
                              evidenceUploadRefs.current[item.item_code] = node
                            }}
                            tabIndex={-1}
                            className={`rounded-2xl bg-white/5 p-4 outline-none transition-shadow ${
                              highlightedEvidenceItemCode === item.item_code
                                ? 'ring-2 ring-warning-amber ring-offset-2 ring-offset-[#050816]'
                                : ''
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Attached Evidence</div>
                                <div className="mt-1 text-xs text-zinc-400">Container-level uploads remain available when you need broader context.</div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <FieldMediaUploader
                                  expectedType="camera"
                                  variant="icon"
                                  label="Capture photo"
                                  buttonClassName={TACTILE_MEDIA_BUTTON_CLASS}
                                  onCapture={async payload => { await handleFieldEvidenceCapture(item.item_code, payload) }}
                                />
                                <FieldMediaUploader
                                  expectedType="video"
                                  variant="icon"
                                  label="Capture video"
                                  buttonClassName={TACTILE_MEDIA_BUTTON_CLASS}
                                  onCapture={async payload => { await handleFieldEvidenceCapture(item.item_code, payload) }}
                                />
                                <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-2xl bg-flame px-4 py-3 text-xs font-black text-white hover:bg-flame-light">
                                  <Upload className="h-4 w-4" />
                                  Upload
                                  <input
                                    type="file"
                                    className="sr-only"
                                    onChange={event => {
                                      const file = event.target.files?.[0]
                                      event.target.value = ''
                                      if (file) void handleDocumentUpload(item.item_code, file)
                                    }}
                                  />
                                </label>
                              </div>
                            </div>

                            <div className="mt-4 space-y-2">
                              {item.documents.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-center text-xs text-zinc-500">
                                  No evidence captured for this container yet.
                                </div>
                              ) : (
                                item.documents.map(doc => (
                                  <DocRow
                                    key={doc.id}
                                    doc={doc}
                                    onClick={() => void openDocument(doc)}
                                    onDelete={() => void handleDeleteDocument(item.item_code, doc)}
                                  />
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                }

                return (
                  <article
                    key={item.item_code}
                    ref={node => {
                      stageItemRefs.current[item.item_code] = node
                    }}
                    tabIndex={-1}
                    className={`relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[var(--color-panel)] p-4 sm:p-5 outline-none ${FLOATING_PANEL_CLASS} ${
                      stageTransitionHandshake?.targetItemCode === item.item_code ? 'ring-2 ring-emerald-400/45 ring-offset-2 ring-offset-[#050816]' : ''
                    }`}
                  >
                    {showRequirementIndicator && (
                      <div
                        aria-hidden="true"
                        className={`absolute inset-y-0 left-0 w-1 ${passBlockedForEvidence ? 'bg-warning-amber' : 'bg-success-green'}`}
                      />
                    )}
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                          {item.item_code}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                          {item.permit_type.replace(/_/g, ' ')}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                          {item.responsible_party}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black leading-tight sm:text-xl">{item.item_label}</h3>
                            {showRequirementIndicator && (
                              passBlockedForEvidence ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rim/70 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-warning-amber">
                                    <span className="h-1.5 w-1.5 rounded-full bg-warning-amber" />
                                    Evidence required
                                  </span>
                              ) : (
                                <span
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-rim/60 bg-raised text-success-green"
                                  aria-label="Required evidence uploaded"
                                  title="Required evidence uploaded"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </span>
                              )
                            )}
                          </div>
                          <p className="mt-2 text-[17px] leading-7 text-zinc-300">{shortPurpose}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-2xl bg-white/5 px-3 py-2.5">
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Requirement</div>
                          <div className="mt-1 text-xs font-semibold text-zinc-200">{requiredLabel}</div>
                        </div>
                        <div className="rounded-2xl bg-white/5 px-3 py-2.5">
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Evidence</div>
                          <div className="mt-1 text-xs font-semibold text-zinc-200">
                            {item.evidence_mode === 'verify_existing'
                              ? 'Verify existing'
                              : passBlockedForEvidence
                                ? 'Upload to pass'
                                : `${item.documents.length} uploaded`}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white/5 px-3 py-2.5">
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Status</div>
                          <div className="mt-1 text-xs font-semibold text-zinc-200">{item.inspection_status}</div>
                        </div>
                        <div className="rounded-2xl bg-white/5 px-3 py-2.5">
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Docs</div>
                          <div className="mt-1 text-xs font-semibold text-zinc-200">{item.documents.length}</div>
                        </div>
                      </div>
                    </div>

                    <ContainerRequirementsSummary requirements={containerRequirements} ready={containerReady} />

                    {blockedBy.length > 0 && (
                      <div className={`mt-3 ${DEPENDENCY_BLOCKER_NOTICE_CLASS}`}>
                        {getDependencyBlockerMessage(item.item_code, blockedBy)}
                      </div>
                    )}

                    <div className="mt-4">
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">{SECTION_OUTCOME_HEADING}</div>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-400">{SECTION_OUTCOME_HELPER}</p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 sm:grid-cols-4">
                      <StatusPill
                        label="Passed"
                        sublabel={passBlocked ? (passBlockedForEvidence ? 'Needs required evidence' : 'Blocked by prerequisite') : 'Verified Clear'}
                        value="Passed"
                        active={item.inspection_status === 'Passed'}
                        disabled={passBlocked}
                        onDisabledClick={() => setStageSignOffError(passBlockedMessage)}
                        onClick={value => handleStatusSelection(item.item_code, value)}
                      />
                      <StatusPill
                        label="Corrections Required"
                        sublabel="Deficiency Observed"
                        value="Failed"
                        active={item.inspection_status === 'Failed'}
                        onClick={value => handleStatusSelection(item.item_code, value)}
                      />
                      <button
                        type="button"
                        disabled={holdButtonDisabled}
                        title={hasOpenHold ? 'An open Hold already exists for this job. Resolve it before placing a new one.' : undefined}
                        onClick={() => openHoldForm(item)}
                        className={HOLD_ACTION_BUTTON_CLASS}
                      >
                        <span className="inline-flex items-center justify-center gap-2">
                          <PauseCircle className="h-4 w-4" />
                          <span className="flex flex-col items-center leading-tight">
                            <span>Hold</span>
                            <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] opacity-75">Same-Day Correction</span>
                          </span>
                        </span>
                      </button>
                      <StatusPill
                        label="N/A"
                        sublabel="Not Applicable"
                        value="N/A"
                        active={item.inspection_status === 'N/A'}
                        onClick={value => handleStatusSelection(item.item_code, value)}
                      />
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 sm:max-w-md">
                      <StatusPill
                        label="Reset to Pending"
                        value="Pending"
                        active={item.inspection_status === 'Pending'}
                        onClick={value => handleStatusSelection(item.item_code, value)}
                      />
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void persistDraft()}
                        className="min-h-12 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-[color:var(--color-ink)] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {saving ? 'Saving…' : 'Save Draft'}
                      </button>
                    </div>

                    <div className="mt-3 rounded-2xl border border-rim/70 border-l-2 border-l-warning-amber bg-white/5 px-4 py-3 text-xs leading-relaxed text-zinc-300">
                      {NA_SCOPE_HELPER}
                    </div>

                    {passRequiresEvidence && (
                      <RequiredEvidenceActionPanel
                        item={item}
                        blocked={passBlockedForEvidence}
                        onAttachRequiredEvidence={() => focusRequiredEvidenceUpload(item.item_code)}
                      />
                    )}

                    {passBlocked && !passBlockedForEvidence && (
                      <div className={`mt-3 ${passBlockedForDependency ? DEPENDENCY_BLOCKER_NOTICE_CLASS : REQUIRED_EVIDENCE_NOTICE_CLASS}`}>
                        {passBlockedMessage}
                      </div>
                    )}

                    {item.inspection_status === 'Failed' && (
                      <FailedSectionPanel documented={isDocumentedFail(item)} />
                    )}

                    <div className="mt-4 space-y-4">
                      {stopItems.length > 0 && (
                        <div className="rounded-2xl bg-white/5 p-5 text-zinc-300">
                          <button
                            type="button"
                            onClick={() => toggleExpandedRecord(setExpandedStopConditions, item.item_code)}
                            className="flex w-full items-center justify-between gap-3 text-left"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 shrink-0 text-zinc-400" />
                              <div className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-400">{STAGE_BLOCKER_CONDITIONS_HEADING}</div>
                            </div>
                            <ChevronRight className={`h-5 w-5 text-zinc-400 transition-transform ${stopConditionsOpen ? 'rotate-90' : ''}`} />
                          </button>
                          <p className="mt-2 text-xs leading-relaxed text-zinc-400">{STAGE_BLOCKER_HELPER}</p>

                          {stopConditionsOpen && (
                            <div className="mt-3">
                              <GuidanceList
                                items={stopItems}
                                bulletClassName="bg-zinc-500"
                                textClassName="text-sm text-zinc-300"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div className="rounded-2xl bg-white/5 p-4">
                        <button
                          type="button"
                          onClick={() => toggleExpandedRecord(setExpandedGuidancePanels, item.item_code)}
                          className="flex w-full items-center justify-between gap-3 text-left"
                        >
                          <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">View Guidance &amp; Code Reference</div>
                            <div className="mt-1 text-xs text-zinc-400">Purpose, checks, pass conditions, and evidence guidance.</div>
                          </div>
                          <ChevronRight className={`h-5 w-5 text-zinc-400 transition-transform ${guidancePanelOpen ? 'rotate-90' : ''}`} />
                        </button>

                        {guidancePanelOpen && (
                          <div className="mt-4 grid gap-3 xl:grid-cols-4">
                            <div className={`rounded-3xl border border-cyan-400/15 bg-cyan-400/5 p-4 ${FLOATING_PANEL_CLASS}`}>
                              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200/80">Purpose</div>
                              <GuidanceList
                                items={[item.item_purpose]}
                                bulletClassName="bg-cyan-300"
                                textClassName={EMPHASIZED_BODY_TEXT_CLASS}
                              />
                            </div>

                            <div className={`rounded-3xl border border-white/10 bg-white/5 p-4 ${FLOATING_PANEL_CLASS}`}>
                              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">What to Check</div>
                              <div className="mt-3">
                                <GuidanceList
                                  items={item.what_to_check}
                                  bulletClassName="bg-cyan-300"
                                  textClassName={EMPHASIZED_BODY_TEXT_CLASS}
                                />
                              </div>
                            </div>

                            <div className={`rounded-3xl border border-rim/70 bg-white/5 p-4 ${FLOATING_PANEL_CLASS}`}>
                              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200/80">Pass / Pending</div>
                              <div className="mt-3">
                                <div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-300">Pass When</div>
                                <div className="mt-2">
                                  <GuidanceList
                                    items={item.pass_when}
                                    bulletClassName="bg-emerald-300"
                                    textClassName={EMPHASIZED_BODY_TEXT_CLASS}
                                  />
                                </div>
                              </div>
                              <div className="mt-4">
                                <div className="text-xs font-black uppercase tracking-[0.14em] text-warning-amber">Pending When</div>
                                <div className="mt-2">
                                  <GuidanceList
                                    items={item.pending_when}
                                    bulletClassName="bg-warning-amber"
                                    textClassName={EMPHASIZED_BODY_TEXT_CLASS}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className={`rounded-3xl border border-white/10 bg-white/5 p-4 ${FLOATING_PANEL_CLASS}`}>
                              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Evidence Guidance</div>
                              <div className="mt-3 text-[17px] leading-7 text-zinc-300">{evidenceSummary}</div>
                              <div className="mt-4 rounded-2xl border border-white/10 bg-[var(--color-raised)] p-3">
                                {item.required_evidence.length > 0 && (
                                  <>
                                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Required Evidence</div>
                                    <div className="mt-2">
                                      <GuidanceList
                                        items={item.required_evidence}
                                        bulletClassName="bg-warning-amber"
                                        textClassName="text-sm text-zinc-300"
                                      />
                                    </div>
                                  </>
                                )}
                                {item.optional_evidence.length > 0 && (
                                  <>
                                    <div className={`${item.required_evidence.length > 0 ? 'mt-4 ' : ''}text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500`}>Supporting Evidence</div>
                                    <div className="mt-2">
                                      <GuidanceList
                                        items={item.optional_evidence}
                                        bulletClassName="bg-zinc-500"
                                        textClassName="text-sm text-zinc-400"
                                      />
                                    </div>
                                  </>
                                )}
                                {item.required_evidence.length === 0 && item.optional_evidence.length === 0 && (
                                  <div className="text-sm text-zinc-500">No container-specific evidence guidance provided.</div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                        <div>
                          <div className="space-y-3">
                            <div className="rounded-2xl bg-white/5 p-4">
                              <button
                                type="button"
                                onClick={() => toggleExpandedRecord(setExpandedContainerNotes, item.item_code)}
                                className="flex w-full items-center justify-between gap-3 text-left"
                              >
                                <div>
                                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Container Notes</div>
                                  <div className="mt-1 text-xs text-zinc-400">{item.response_note.trim() ? 'Saved note present.' : 'Collapsed until notes are needed.'}</div>
                                </div>
                                <ChevronRight className={`h-5 w-5 text-zinc-400 transition-transform ${containerNotesOpen ? 'rotate-90' : ''}`} />
                              </button>

                              {containerNotesOpen && (
                                <>
                                  <div className="mt-3 rounded-xl bg-white/8 p-3">
                                    <GuidanceList
                                      items={[item.inspector_notes_guidance]}
                                      bulletClassName="bg-zinc-400"
                                    />
                                  </div>
                                  <textarea
                                    value={item.response_note}
                                    onChange={event => updateItem(item.item_code, current => ({ ...current, response_note: event.target.value }))}
                                    rows={4}
                                    placeholder={item.inspector_notes_guidance}
                                    className="mt-3 w-full rounded-2xl border border-white/10 bg-[var(--color-raised)] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#C6A15B] focus:outline-none"
                                  />
                                </>
                              )}
                            </div>

                            <div className="rounded-2xl bg-white/5 p-4">
                              <button
                                type="button"
                                onClick={() => toggleExpandedRecord(setExpandedJurisdictionNotes, item.item_code)}
                                className="flex w-full items-center justify-between gap-3 text-left"
                              >
                                <div>
                                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Jurisdiction Notes</div>
                                  <div className="mt-1 text-xs text-zinc-400">Municipal overlay commentary and local AHJ notes.</div>
                                </div>
                                <ChevronRight className={`h-5 w-5 text-zinc-400 transition-transform ${jurisdictionNotesOpen ? 'rotate-90' : ''}`} />
                              </button>

                              {jurisdictionNotesOpen && (
                                <div className="mt-3">
                                  <GuidanceList
                                    items={[item.ahj_notes]}
                                    bulletClassName="bg-cyan-300"
                                  />
                                </div>
                              )}
                            </div>
                            {PILOT_S9_CODE_REFS && (
                              <StageCodeReferences refs={item.code_references} />
                            )}
                          </div>
                        </div>

                        <div
                          ref={node => {
                            evidenceUploadRefs.current[item.item_code] = node
                          }}
                          tabIndex={-1}
                          className={`rounded-2xl bg-white/5 p-4 outline-none transition-shadow ${
                            highlightedEvidenceItemCode === item.item_code
                              ? 'ring-2 ring-warning-amber ring-offset-2 ring-offset-[#050816]'
                              : ''
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Attached Evidence</div>
                              <div className="mt-1 text-xs text-zinc-400">
                                {evidenceSummary}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <FieldMediaUploader
                                expectedType="camera"
                                variant="icon"
                                label="Capture photo"
                                buttonClassName={TACTILE_MEDIA_BUTTON_CLASS}
                                onCapture={async payload => { await handleFieldEvidenceCapture(item.item_code, payload) }}
                              />
                              <FieldMediaUploader
                                expectedType="video"
                                variant="icon"
                                label="Capture video"
                                buttonClassName={TACTILE_MEDIA_BUTTON_CLASS}
                                onCapture={async payload => { await handleFieldEvidenceCapture(item.item_code, payload) }}
                              />
                              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-flame px-4 py-3 text-xs font-black text-white hover:bg-flame-light">
                                <Upload className="h-4 w-4" />
                                Upload
                                <input
                                  type="file"
                                  className="sr-only"
                                  onChange={event => {
                                    const file = event.target.files?.[0]
                                    event.target.value = ''
                                    if (file) void handleDocumentUpload(item.item_code, file)
                                  }}
                                />
                              </label>
                            </div>
                          </div>

                          <div className="mt-4 space-y-2">
                            {item.documents.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-center text-xs text-zinc-500">
                                {item.evidence_mode === 'verify_existing'
                                  ? 'No project documents are attached to this container yet. Upload is optional unless you need to document a discrepancy.'
                                  : item.document_upload_required
                                    ? 'No documents uploaded yet.'
                                    : 'No supporting documents attached.'}
                              </div>
                            ) : (
                              item.documents.map(doc => (
                                <DocRow
                                  key={doc.id}
                                  doc={doc}
                                  onClick={() => void openDocument(doc)}
                                  onDelete={() => void handleDeleteDocument(item.item_code, doc)}
                                />
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            {isFinalOccupancyStage ? (
              <div className="rounded-[2rem] border border-white/10 bg-[var(--color-panel)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-2xl">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200/90">Final AHJ Evidence Record</div>
                    <div className="mt-3 flex items-center gap-4">
                      <VeroSealIcon />
                      <div>
                        <h3 className="text-2xl font-black text-[color:var(--color-ink)]">Record AHJ Occupancy Evidence</h3>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                          This records the Vero Permit closeout package and AHJ occupancy evidence. Vero does not issue occupancy, grant final approval, or replace the authority having jurisdiction.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-3xl border px-4 py-3 ${
                    finalOccupancyReady
                      ? 'border-rim/70 border-l-2 border-l-success-green bg-white/5'
                      : 'border-rim/60 bg-white/5'
                  }`}>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Authority Evidence Gate</div>
                    <div className={`mt-2 text-lg font-black ${finalOccupancyReady ? 'text-success-green' : 'text-zinc-200'}`}>
                      {isScopedFinalOccupancy
                        ? `${scopedBuilderStagePassedCount} / 5`
                        : `${passedStageCount + (stageReadyForSignOff && !currentStageSignOff ? 1 : 0)} / ${stages.length}`
                      } stages ready
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {finalOccupancyReady ? 'All prerequisite record gates are satisfied.' : 'Resolve prerequisite stage and item gates before recording AHJ occupancy evidence.'}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                    <span>Closeout Record Progress</span>
                    <span>
                      {isScopedFinalOccupancy
                        ? `${scopedBuilderStagePassedCount} / 5`
                        : `${passedStageCount + (stageReadyForSignOff && !currentStageSignOff ? 1 : 0)} / ${stages.length}`
                      } stages passed
                    </span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-success-green transition-all"
                      style={{ width: `${Math.min(100, Math.round(((isScopedFinalOccupancy ? scopedBuilderStagePassedCount : passedStageCount + (stageReadyForSignOff && !currentStageSignOff ? 1 : 0)) / Math.max(isScopedFinalOccupancy ? 5 : stages.length, 1)) * 100))}%` }}
                    />
                  </div>
                </div>

                {!finalOccupancyReady && (
                  <div className="mt-5 rounded-2xl border border-rim/70 border-l-2 border-l-warning-amber bg-white/5 px-4 py-3 text-sm text-ink">
                    Required prerequisite stages and items must be passed or marked N/A before Vero can record AHJ occupancy evidence.
                  </div>
                )}

                {finalOccupancyReady && !finalSealLocationIntegrityReady && (
                  <div className="mt-5 rounded-2xl border border-rim/70 border-l-2 border-l-warning-amber bg-white/5 px-4 py-4 text-sm text-ink shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2 font-black text-ink">
                          <AlertTriangle className="h-5 w-5 text-warning-amber" />
                          Pre-seal evidence location review required
                        </div>
                        <p className="mt-2 max-w-3xl leading-relaxed text-muted">
                          AHJ occupancy evidence recording is blocked until each evidence item has GPS coordinates or a manual location note.
                          This supports the Vero platform record only and does not represent AHJ approval.
                        </p>
                      </div>
                      <div className="rounded-xl border border-rim/70 bg-white/5 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-warning-amber">
                        {preSealEvidenceLocationIssues.length} item{preSealEvidenceLocationIssues.length === 1 ? '' : 's'} to resolve
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {preSealEvidenceLocationIssues.map(({ itemCode, itemLabel, doc, reason }) => {
                        const draft = manualLocationDrafts[doc.id] ?? doc.manualLocationNote ?? ''
                        const saving = manualLocationSavingDocId === doc.id
                        return (
                          <div key={doc.id} className="rounded-2xl border border-amber-300 bg-white p-4 text-amber-950 shadow-sm">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0">
                                <div className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Evidence item</div>
                                <div className="mt-1 truncate text-base font-black text-zinc-950">{doc.fileName}</div>
                                <div className="mt-1 text-sm text-zinc-700">
                                  Related checklist item: <span className="font-bold">{itemCode}</span> — {itemLabel}
                                </div>
                                <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900">
                                  {reason}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => void openDocument(doc)}
                                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-bold text-zinc-800 transition-colors hover:bg-zinc-100"
                              >
                                <File className="h-4 w-4" />
                                View Evidence
                              </button>
                            </div>

                            <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-zinc-700" htmlFor={`manual-location-${doc.id}`}>
                              Add Manual Location Note
                            </label>
                            <textarea
                              id={`manual-location-${doc.id}`}
                              value={draft}
                              onChange={(event) => {
                                const value = event.target.value
                                setManualLocationDrafts(current => ({
                                  ...current,
                                  [doc.id]: value,
                                }))
                              }}
                              placeholder="Evidence reviewed/captured at 4521 Kingsway, Burnaby, BC. GPS metadata unavailable; location manually confirmed by inspector during the final inspection."
                              className="mt-2 min-h-[94px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
                            />
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-xs leading-relaxed text-zinc-600">
                                Save a specific field location note for this evidence item. A regular checklist comment does not satisfy the final seal location integrity gate.
                              </p>
                              <button
                                type="button"
                                disabled={saving || draft.trim().length === 0}
                                onClick={() => void handleManualLocationNoteSave(itemCode, doc, draft)}
                                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-[#C6A15B] px-4 py-2 text-sm font-semibold text-[#1B1508] shadow-sm ring-1 ring-inset ring-white/10 transition-colors hover:bg-[#D8B871] disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
                              >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                                {saving ? 'Saving...' : 'Save Manual Location Note'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {stageSignOffError && (
                  <div className="mt-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100/90">
                    {stageSignOffError}
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2 text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-cyan-300" />
                      AHJ occupancy evidence records the current geolocation and ISO timestamp in the Vero Permit record.
                    </div>
                    <div className="flex items-center gap-2">
                      <Stamp className="h-4 w-4 text-warning-amber" />
                      Project state will transition to Completed and display as Project Record Complete.
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!finalOccupancyActionReady || sealing}
                    onClick={() => void handleFinalOccupancyIssue()}
                    className={`inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black uppercase tracking-[0.12em] transition-colors ${
                      finalOccupancyActionReady
                        ? 'bg-[#C6A15B] text-[#1B1508] shadow-sm ring-1 ring-inset ring-white/10 hover:bg-[#D8B871]'
                        : 'cursor-not-allowed bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {sealing ? <Loader2 className="h-4 w-4 animate-spin" /> : <VeroSealIcon className="h-10 w-10" />}
                    {sealing ? 'Recording AHJ Evidence...' : 'RECORD AHJ EVIDENCE'}
                  </button>
                </div>
              </div>
            ) : (
              <div className={`rounded-[2rem] border border-[#C6A15B]/20 bg-[var(--color-panel)] p-5 shadow-[0_0_0_1px_rgba(198,161,91,0.08)] ${FLOATING_PANEL_CLASS}`}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-2xl">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#C6A15B]">Stage Summary</div>
                    <h3 className="mt-2 text-2xl font-black">Sign Off S{String(currentStage).padStart(2, '0')}</h3>
                    <p className="mt-2 text-sm text-zinc-300">
                      Required containers must be fully checked, evidence-backed, and clear of open Corrections Required outcomes before this stage can be signed and pushed forward.
                    </p>
                  </div>

                  <div className={`rounded-3xl border px-4 py-3 ${
                    stageReadyForSignOff
                      ? 'border-rim/70 border-l-2 border-l-success-green bg-white/5'
                      : 'border-rim/70 border-l-2 border-l-warning-amber bg-white/5'
                  }`}>
                    <div className="flex items-start gap-3">
                      {currentStageSignOff ? (
                        <ShieldCheck className="mt-0.5 h-5 w-5 text-success-green" />
                      ) : stageReadyForSignOff ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-success-green" />
                      ) : (
                        <Lock className="mt-0.5 h-5 w-5 text-warning-amber" />
                      )}
                      <div className="text-sm">
                        <div className={`font-black ${
                          currentStageSignOff || stageReadyForSignOff ? 'text-success-green' : 'text-warning-amber'
                        }`}>
                          {currentStageSignOff ? 'Stage Passed' : stageReadyForSignOff ? 'Ready for Sign-Off' : 'Requirements Incomplete'}
                        </div>
                        <div className="mt-1 text-xs text-zinc-300">
                          {currentStageSignOff
                            ? `Signed ${new Date(currentStageSignOff.signedAt).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                            : `${requiredStageItemsComplete}/${stageRequiredItems.length || stageItems.length} required items complete`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                    <span>Requirements Check</span>
                    <span>{requiredStageItemsComplete}/{stageRequiredItems.length || stageItems.length} Required Items Complete</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/8">
                    <div
                      className={`h-full rounded-full transition-all ${
                        currentStageSignOff || stageReadyForSignOff ? 'bg-success-green' : 'bg-flame'
                      }`}
                      style={{ width: `${currentStageSignOff ? 100 : stageCompletionPercent}%` }}
                    />
                  </div>
                </div>

                {(blockingFailedStageItems.length > 0
                  || (!currentStageSignOff && failedStageItems.length > 0)
                  || (!currentStageSignOff && blockedStageItems.length > 0)
                  || (!currentStageSignOff && incompleteStageItems.length > 0)) && (
                  <div className="mt-4 rounded-2xl border border-rim/70 border-l-2 border-l-warning-amber bg-white/5 px-4 py-3">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-warning-amber">Remaining before sign-off</div>
                    <div className="mt-3 space-y-2 text-sm">
                      {blockingFailedStageItems.length > 0 && (
                        <div className="flex items-start gap-2 text-muted">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-fail-red" />
                          <span>{FAIL_DOCUMENTATION_REQUIRED_MESSAGE} {blockingFailedStageItems.map(item => item.item_code).join(', ')}.</span>
                        </div>
                      )}

                      {!currentStageSignOff && blockingFailedStageItems.length === 0 && failedStageItems.length > 0 && (
                        <div className="flex items-start gap-2 text-muted">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning-amber" />
                          <span>Documented deficiencies will be filed: {failedStageItems.map(item => item.item_code).join(', ')}. This stage will not advance and the builder will receive a Corrections Required notice.</span>
                        </div>
                      )}

                      {!currentStageSignOff && blockingFailedStageItems.length === 0 && blockedStageItems.length > 0 && (
                        <div className="flex items-start gap-2 text-muted">
                          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-warning-amber" />
                          <span>Resolve dependency blockers before signing off: {blockedStageItems.map(({ item, blockedBy }) => `${item.item_code} needs ${blockedBy.join(', ')}`).join('; ')}.</span>
                        </div>
                      )}

                      {!currentStageSignOff && blockingFailedStageItems.length === 0 && blockedStageItems.length === 0 && incompleteStageItems.length > 0 && (
                        <div className="flex items-start gap-2 text-muted">
                          <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-warning-amber" />
                          <span>Finish these containers first: {incompleteStageItems.map(item => item.item_code).join(', ')}.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {stageSignOffError && (
                  <div className="mt-4 rounded-2xl border border-rim/70 border-l-2 border-l-electric bg-white/5 px-4 py-3 text-sm text-ink">
                    {stageSignOffError}
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2 text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-electric" />
                      Sign-off stamps the current geolocation and ISO timestamp into the stage record.
                    </div>
                    {currentStageSignOff && (
                      <div className="flex items-center gap-2">
                        <Stamp className="h-4 w-4 text-[#C6A15B]" />
                        {currentStageSignOff.unlockedStages.length > 0
                          ? `Unlocked stages: ${currentStageSignOff.unlockedStages.map(stage => `Stage ${stage}`).join(', ')}`
                          : 'No downstream stage was unlocked by this sign-off yet.'}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 sm:items-end">
                    {assignmentCloseRetryAvailable && (
                      <div className="rounded-2xl border border-rim/70 border-l-2 border-l-warning-amber bg-white/5 px-4 py-3 text-sm text-ink sm:max-w-sm">
                        <div className="font-black text-ink">Stage is signed. Finish closing the assignment record.</div>
                        <button
                          type="button"
                          disabled={assignmentCloseRetrying}
                          onClick={() => void handleScopedAssignmentCloseRetry()}
                          className="mt-3 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#C6A15B] px-4 py-2.5 text-xs font-semibold text-[#1B1508] shadow-sm ring-1 ring-inset ring-white/10 transition-colors hover:bg-[#D8B871] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                        >
                          {assignmentCloseRetrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                          {assignmentCloseRetrying ? 'Closing Assignment...' : 'Complete Assignment Close'}
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      disabled={!stageReadyForSignOff || stageSigning || Boolean(currentStageSignOff)}
                      onClick={() => void handleStageSignOff()}
                      className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition-colors ${
                        !stageReadyForSignOff || currentStageSignOff
                          ? 'cursor-not-allowed bg-zinc-800 text-zinc-500'
                          : 'bg-[#C6A15B] text-[#1B1508] shadow-sm ring-1 ring-inset ring-white/10 hover:bg-[#D8B871]'
                      }`}
                    >
                      {stageSigning ? <Loader2 className="h-4 w-4 animate-spin" /> : currentStageSignOff ? <ShieldCheck className="h-4 w-4" /> : stageReadyForSignOff ? <Stamp className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      {stageSigning ? 'Signing Stage...' : currentStageSignOff ? 'Stage Signed' : stageReadyForSignOff ? 'Sign & Submit' : 'Sign-Off Locked'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!isFinalOccupancyStage && !assignmentScope && (
              <div className={`rounded-[2rem] border border-white/10 bg-[var(--color-panel)] p-5 ${FLOATING_PANEL_CLASS}`}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Completion Gate</div>
                    <h3 className="mt-2 text-2xl font-black">Digital Seal</h3>
                    <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                      The seal unlocks only after every checklist item has been resolved, all document-required items have at least one uploaded file, and no Hold / Site Retainer remains open.
                    </p>
                  </div>

                  <div className={`rounded-3xl border px-4 py-3 ${sealReady && finalSealLocationIntegrityReady ? 'border-rim/70 border-l-2 border-l-success-green bg-white/5' : 'border-rim/70 border-l-2 border-l-warning-amber bg-white/5'}`}>
                    <div className="flex items-start gap-3">
                      {sealReady && finalSealLocationIntegrityReady ? (
                        <ShieldCheck className="mt-0.5 h-5 w-5 text-success-green" />
                      ) : (
                        <Lock className="mt-0.5 h-5 w-5 text-warning-amber" />
                      )}
                      <div className="text-sm">
                        <div className={`font-black ${sealReady && finalSealLocationIntegrityReady ? 'text-success-green' : 'text-warning-amber'}`}>
                          {sealReady && finalSealLocationIntegrityReady ? 'Seal Ready' : 'Seal Locked'}
                        </div>
                        <div className="mt-1 text-xs text-zinc-300">
                          {sealReady && finalSealLocationIntegrityReady
                            ? 'All checklist items are resolved and evidence requirements are satisfied.'
                            : hasOpenHold
                              ? `Seal blocked by an open Hold / Site Retainer: ${activeJobHold?.reason ?? 'Resolve the hold before finalizing.'}`
                              : !finalSealLocationIntegrityReady
                                ? `${preSealEvidenceLocationIssues.length} evidence item(s) need GPS coordinates or a manual location note before sealing.`
                              : sealDependencyBlockerCount > 0
                                ? `${sealDependencyBlockerCount} dependency blocker(s) remain.`
                                : `${sealPendingCount} pending item(s) and ${sealDocumentGapCount} document gap(s) remain.`}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <FileCheck2 className="h-4 w-4 text-cyan-300" />
                    Overlay snapshot: {overlay.label}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {overlay.type === 'vancouver' && (
                      <a
                        href={`/api/schedule-cb?reportId=${report.id}`}
                        download="Schedule_C-B.pdf"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-zinc-200 hover:bg-white/10 transition-all"
                      >
                        <FileUp className="h-4 w-4 text-zinc-400" />
                        Download Schedule C-B
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={!sealReady || !finalSealLocationIntegrityReady || sealing}
                      onClick={() => void applySeal()}
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black ${
                        sealReady && finalSealLocationIntegrityReady
                          ? 'bg-[#C6A15B] text-[#1B1508] hover:bg-[#D8B871]'
                          : 'cursor-not-allowed bg-zinc-800 text-zinc-100'
                      }`}
                    >
                      {sealing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stamp className="h-4 w-4" />}
                      {sealing ? 'Applying Seal...' : 'Apply Digital Seal'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-[var(--color-surface)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <button
            type="button"
            disabled={currentStage === 1 || Boolean(assignmentScope)}
            onClick={() => navigateToStage(Math.max(1, currentStage - 1))}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Stage
          </button>

          <div className="text-center text-xs text-zinc-400">
            Stage {currentStage} of {stages.length}
            <div className="mt-1 text-sm font-bold text-[color:var(--color-ink)]">{currentProgress?.resolved ?? 0} / {currentProgress?.total ?? 0} resolved</div>
          </div>

          <div className="flex items-center gap-3">
            {footerIssueCount > 0 && (
              <div className="inline-flex min-h-[44px] items-center rounded-full border border-red-500 bg-red-600 px-4 py-2 text-sm font-black text-white shadow-[0_10px_20px_rgba(220,38,38,0.28)]">
                {footerIssueCount} Issue{footerIssueCount === 1 ? '' : 's'}
              </div>
            )}
            <button
              type="button"
              disabled={currentStage === stages.length || footerIssueCount > 0 || Boolean(assignmentScope)}
              onClick={() => navigateToStage(Math.min(stages.length, currentStage + 1))}
              className={`inline-flex min-h-[48px] items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold ${
                footerIssueCount > 0
                  ? 'cursor-not-allowed bg-zinc-700 text-zinc-300'
                  : 'bg-[#C6A15B] text-[#1B1508] disabled:cursor-not-allowed disabled:opacity-40'
              }`}
            >
              Next Stage
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
