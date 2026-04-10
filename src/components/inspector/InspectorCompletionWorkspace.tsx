'use client'

import React, { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
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
  ShieldCheck,
  Stamp,
  Upload,
  XCircle,
} from 'lucide-react'
import {
  FieldMediaUploader,
  type FieldMediaCapturePayload,
} from '@/components/inspector/FieldMediaUploader'
import { Navbar } from '@/components/shared/Navbar'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth'
import {
  createInspectorDevPreviewDocument,
  createInspectorDevPreviewReport,
  DEV_PREVIEW_ASSIGNMENT,
  DEV_PREVIEW_JOB,
  isInspectorDevPreviewAssignment,
} from '@/lib/inspectorDevPreview'
import { insertCompletedRecordStrict } from '@/lib/supabase/compliance'
import { completeJobAssignment, updateJobStatus } from '@/lib/supabase/jobs'
import {
  buildCompletionChecklist,
  COMPLETION_STAGE_PHASES,
  type AhjOverlayContext,
  type CompletionChecklistItemDefinition,
  type CompletionChecklistStageDefinition,
  type CompletionInspectionStatus,
} from '@/lib/inspectorCompletion'
import {
  getInspectorCompletionBundle,
  getInspectorCompletionDocumentSignedUrl,
  createFieldGeoAnomaly,
  type InspectorCompletionDocumentRow,
  type InspectorCompletionReportRow,
  uploadInspectorCompletionDocument,
  upsertInspectorCompletionItems,
  upsertInspectorCompletionReport,
} from '@/lib/supabase/inspectorCompletion'
import type { EvidenceItem } from '@/lib/domain/types'
import { evaluateGeofence } from '@/lib/geofence'

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
  stageName: string
  builderId?: string
  builderName?: string
  status?: string
}

interface WorkspaceItem extends CompletionChecklistItemDefinition {
  id: string
  response_note: string
  documents: InspectorCompletionDocumentRow[]
  metadata: Record<string, unknown>
}

function createRuntimeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function createSealRef(): string {
  const stamp = new Date().getFullYear()
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
  return `SL-IC-${stamp}-${suffix}`
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
}: {
  doc: InspectorCompletionDocumentRow
  onClick: () => void
}) {
  const isImage = doc.mimeType?.startsWith('image/') ?? false
  const isPdf = doc.mimeType === 'application/pdf' || doc.fileName.toLowerCase().endsWith('.pdf')

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#060b18] px-3 py-3 text-left hover:bg-[#091022]"
    >
      {/* Leading: thumbnail for images, coloured icon box for everything else */}
      {isImage && doc.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={doc.previewUrl}
          alt={doc.fileName}
          className="h-10 w-10 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
          isPdf
            ? 'border-red-500/20 bg-red-500/10'
            : 'border-white/10 bg-white/5'
        }`}>
          {isPdf
            ? <FileText className="h-4 w-4 text-red-400" />
            : <File className="h-4 w-4 text-zinc-400" />}
        </div>
      )}

      {/* File name + metadata */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-zinc-100">{doc.fileName}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500">
          {doc.fileSize != null && <span>{formatBytes(doc.fileSize)}</span>}
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

      <FileUp className="h-4 w-4 shrink-0 text-zinc-500" />
    </button>
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

function SiteLineSealIcon({
  certified = false,
  className = '',
}: {
  certified?: boolean
  className?: string
}) {
  const shellClass = certified
    ? 'border-amber-300/40 bg-amber-300/10 text-amber-200'
    : 'border-red-900/60 bg-[#991b1b]/20 text-red-200'
  const ringClass = certified ? 'border-amber-200/40' : 'border-red-200/20'
  const badgeClass = certified
    ? 'border-amber-200/50 bg-amber-200/15 text-amber-100'
    : 'border-red-200/30 bg-red-950/70 text-red-100'

  return (
    <div className={`relative flex h-16 w-16 items-center justify-center rounded-full border shadow-[0_0_0_1px_rgba(255,255,255,0.04)] ${shellClass} ${className}`}>
      <div className={`absolute inset-2 rounded-full border ${ringClass}`} />
      <ShieldCheck className="h-7 w-7" />
      <div className={`absolute -bottom-2 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.24em] ${badgeClass}`}>
        SL
      </div>
    </div>
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
  const match = label.match(/\(Evidence:\s*([^)]+)\)\s*$/i)
  if (!match) return null

  const actions = match[1]
    .split('/')
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

function isStageItemReadyForSignOff(item: WorkspaceItem): boolean {
  if (item.inspection_status === 'Failed') return false

  const checklistItems = getRuntimeChecklistItems(item)
  const checklistReady = checklistItems.length === 0
    ? isStageItemResolved(item)
    : checklistItems.every(detail => isChecklistEntryComplete(item, detail))

  return checklistReady && itemHasRequiredDocument(item)
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
          return dependency ? dependency.inspection_status !== 'Pending' : true
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
  value,
  active,
  disabled,
  onClick,
}: {
  label: string
  value: CompletionInspectionStatus
  active: boolean
  disabled?: boolean
  onClick: (value: CompletionInspectionStatus) => void
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
    value === 'Passed' ? 'border-emerald-500 bg-emerald-200 text-emerald-900 font-bold shadow-inner' :
    value === 'Failed' ? 'border-rose-500 bg-rose-200 text-rose-900 font-bold shadow-inner' :
    value === 'Pending' ? 'border-slate-600 bg-slate-300 text-slate-900 font-bold shadow-inner' :
    'border-slate-400 bg-transparent text-slate-100 shadow-sm'

  const idleClass =
    value === 'Passed' ? 'border-slate-300 bg-white text-slate-500 hover:bg-emerald-50' :
    value === 'Failed' ? 'border-slate-300 bg-white text-slate-500 hover:bg-rose-50' :
    value === 'Pending' ? 'border-slate-300 bg-white text-slate-500 hover:bg-slate-100' :
    'border-slate-300 bg-transparent text-slate-200 hover:bg-white/10'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(value)}
      className={`min-h-12 rounded-2xl border px-4 py-3 text-sm font-black transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${active ? activeClass : idleClass}`}
    >
      <span className="inline-flex items-center justify-center">
        {icon ? <span className="mr-2">{icon}</span> : null}
        <span>{label}</span>
      </span>
    </button>
  )
}

const FLOATING_PANEL_CLASS = 'shadow-[0_18px_34px_rgba(15,23,42,0.18)]'
const TACTILE_MEDIA_BUTTON_CLASS = 'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-slate-300/80 bg-[#e5e7eb] px-0 text-slate-700 shadow-[0_6px_14px_rgba(15,23,42,0.18)] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-50'
const EMPHASIZED_BODY_TEXT_CLASS = 'text-[17px] leading-7 text-zinc-300'

export function InspectorCompletionWorkspace() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const assignmentId = params.assignmentId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sealing, setSealing] = useState(false)
  const [sealed, setSealed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assignment, setAssignment] = useState<AssignmentContext | null>(null)
  const [job, setJob] = useState<JobContext | null>(null)
  const [report, setReport] = useState<InspectorCompletionReportRow | null>(null)
  const [overlay, setOverlay] = useState<AhjOverlayContext | null>(null)
  const [stages, setStages] = useState<CompletionChecklistStageDefinition[]>([])
  const [items, setItems] = useState<WorkspaceItem[]>([])
  const [projectReferencePoint, setProjectReferencePoint] = useState<ProjectReferencePoint | null>(null)
  const [currentStage, setCurrentStage] = useState(1)
  const [lastSavedLabel, setLastSavedLabel] = useState('Not saved yet')
  const [expandedChecklistNotes, setExpandedChecklistNotes] = useState<Record<string, boolean>>({})
  const [expandedGuidancePanels, setExpandedGuidancePanels] = useState<Record<string, boolean>>({})
  const [expandedStopConditions, setExpandedStopConditions] = useState<Record<string, boolean>>({})
  const [expandedContainerNotes, setExpandedContainerNotes] = useState<Record<string, boolean>>({})
  const [expandedJurisdictionNotes, setExpandedJurisdictionNotes] = useState<Record<string, boolean>>({})
  const [stageSigning, setStageSigning] = useState(false)
  const [stageSignOffError, setStageSignOffError] = useState<string | null>(null)
  const [projectOverviewOpen, setProjectOverviewOpen] = useState(true)

  const hydratedRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  const stageRequiredItems = useMemo(
    () => stageItems.filter(isRequiredStageItem),
    [stageItems]
  )

  const requiredStageItemsComplete = useMemo(
    () => stageRequiredItems.filter(item => isStageItemReadyForSignOff(item)).length,
    [stageRequiredItems]
  )

  const incompleteStageItems = useMemo(
    () => stageRequiredItems.filter(item => !isStageItemReadyForSignOff(item)),
    [stageRequiredItems]
  )

  const failedStageItems = useMemo(
    () => stageRequiredItems.filter(item => item.inspection_status === 'Failed'),
    [stageRequiredItems]
  )

  const stageSignOffs = useMemo(
    () => getStageSignOffs(report?.sealPayload),
    [report]
  )

  const currentStageSignOff = useMemo(
    () => stageSignOffs[String(currentStage)] ?? null,
    [currentStage, stageSignOffs]
  )

  const isFinalOccupancyStage = useMemo(
    () => stageItems.some(item => item.item_code === 'S15-02'),
    [stageItems]
  )

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
          return dependency ? dependency.inspection_status !== 'Pending' : true
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

  const projectCompletionPercent = useMemo(() => {
    const completedStages = projectOverviewStages.filter(stage => stage.status === 'passed').length
    return projectOverviewStages.length > 0
      ? Math.round((completedStages / projectOverviewStages.length) * 100)
      : 0
  }, [projectOverviewStages])

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
    if (stageRequiredItems.length === 0) {
      return stageItems.length > 0 && stageItems.every(item => isStageItemReadyForSignOff(item))
    }

    return failedStageItems.length === 0
      && requiredStageItemsComplete === stageRequiredItems.length
  }, [failedStageItems.length, requiredStageItemsComplete, stageItems, stageRequiredItems.length])

  const stageCompletionPercent = (() => {
    const total = stageRequiredItems.length || stageItems.length
    const complete = stageRequiredItems.length > 0
      ? requiredStageItemsComplete
      : stageItems.filter(item => isStageItemReadyForSignOff(item)).length

    return total > 0 ? Math.round((complete / total) * 100) : 0
  })()

  const footerIssueCount = failedStageItems.length

  const finalOccupancyReady = useMemo(() => {
    if (!isFinalOccupancyStage) return false

    return projectOverviewStages.every(({ stage, status }) => {
      if (stage.stage_number === currentStage) {
        return status === 'passed' || stageReadyForSignOff
      }

      return status === 'passed'
    })
  }, [currentStage, isFinalOccupancyStage, projectOverviewStages, stageReadyForSignOff])

  const sealReady = items.length > 0 && unresolvedRequired.length === 0 && missingDocuments.length === 0

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
        projectId: (jobData.project_id as string) ?? (jobData.id as string),
        projectName: jobData.project_name as string,
        address: jobData.address as string,
        city: (jobData.city as string) ?? 'Vancouver',
        region: (jobData.region as string) ?? undefined,
        projectType: (jobData.project_type as string) ?? undefined,
        notes: (jobData.notes as string) ?? undefined,
        permitNumber: (jobData.permit_number as string) ?? undefined,
        stageName: (jobData.stage_name as string) ?? 'Inspector Completion',
        builderId: (jobData.builder_id as string) ?? undefined,
        builderName: (jobData.builder_name as string) ?? undefined,
        status: (jobData.status as string) ?? undefined,
      }
      setJob(jobRow)

      if (jobRow.projectId) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('gps_coord')
          .eq('id', jobRow.projectId)
          .maybeSingle()

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
      setOverlay(definitionSet.overlay)
      setStages(definitionSet.stages)

      const bundle = await getInspectorCompletionBundle(assignmentId)

      const ensuredReport = bundle.report ?? await upsertInspectorCompletionReport({
        id: createRuntimeId(`completion-${assignmentId}`),
        assignmentId,
        jobId: jobRow.id,
        inspectorId: activeUser.supabaseId ?? activeUser.id,
        projectId: jobRow.projectId,
        projectName: jobRow.projectName,
        address: jobRow.address,
        city: jobRow.city,
        region: jobRow.region,
        projectType: jobRow.projectType,
        currentStage: 1,
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
        submittedAt: undefined,
      })

      if (!ensuredReport) {
        setError('Could not initialize the completion report.')
        setLoading(false)
        return
      }

      setReport(ensuredReport)
      setCurrentStage(ensuredReport.currentStage)
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
        submittedAt: nextSeal?.submittedAt ?? report.submittedAt,
        lastSavedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setReport(nextReport)
      setLastSavedLabel(`Preview saved ${new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}`)
      return true
    }
    setSaving(true)

    const sessionInspector = await getAuthenticatedInspectorIdentity()

    if (!sessionInspector) {
      setSaving(false)
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
      submittedAt: nextSeal?.submittedAt ?? report.submittedAt,
    })

    if (!nextReport) {
      setSaving(false)
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
    }
    setSaving(false)
    return ok
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

  function updateItem(itemCode: string, updater: (item: WorkspaceItem) => WorkspaceItem) {
    setItems(current =>
      current.map(item => (item.item_code === itemCode ? updater(item) : item))
    )
  }

  function navigateToStage(stageNumber: number) {
    setStageSignOffError(null)
    setCurrentStage(stageNumber)
  }

  function handleStatusSelection(itemCode: string, value: CompletionInspectionStatus) {
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
      console.warn('[SiteLine] handleDocumentUpload — missing report/assignment/activeUser, aborting', { report: !!report, assignment: !!assignment, activeUser: !!activeUser })
      return null
    }

    // Prefer blob URL from capture payload; fall back to creating one from the file when it's
    // an image. This covers both FieldMediaUploader captures (payload.previewUrl set) and the
    // raw <input type="file"> buttons that call handleDocumentUpload without a capture payload.
    const effectivePreviewUrl: string | undefined = capture?.previewUrl
      ?? (file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined)

    console.log('[SiteLine] handleDocumentUpload —', itemCode, '— previewMode:', previewMode, '— file:', file.name, '— previewUrl:', effectivePreviewUrl ?? '(none)')

    if (previewMode) {
      const doc = createInspectorDevPreviewDocument({
        reportId: report.id,
        assignmentId: assignment.id,
        itemCode,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        uploadedBy: activeUser.supabaseId ?? activeUser.id,
      })
      const docWithPreview: InspectorCompletionDocumentRow = effectivePreviewUrl
        ? { ...doc, previewUrl: effectivePreviewUrl }
        : doc
      updateItem(itemCode, item => ({ ...item, documents: [...item.documents, docWithPreview] }))
      console.log('[SiteLine] handleDocumentUpload — preview doc added to state, documents now:', 1, '(+1)')
      setLastSavedLabel('Preview document attached')
      return docWithPreview
    }

    const sessionInspector = await getAuthenticatedInspectorIdentity({ alertOnFailure: false })

    if (!sessionInspector) {
      // No valid Supabase session (demo account or expired token). Rather than silently failing
      // and leaving the document list empty, create a local-only doc so the UI still reflects
      // what the inspector attached. The storagePath prefix local:// distinguishes these from
      // server-persisted docs. They are session-only and will be lost on page reload.
      console.warn('[SiteLine] handleDocumentUpload — no session, creating local-only doc for UI')
      const localDoc = createInspectorDevPreviewDocument({
        reportId: report.id,
        assignmentId: assignment.id,
        itemCode,
        fileName: file.name,
        mimeType: file.type,
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
      console.warn('[SiteLine] handleDocumentUpload — uploadInspectorCompletionDocument returned null (check Supabase storage logs)')
      return null
    }

    const docWithPreview: InspectorCompletionDocumentRow = effectivePreviewUrl
      ? { ...doc, previewUrl: effectivePreviewUrl }
      : doc
    updateItem(itemCode, item => ({ ...item, documents: [...item.documents, docWithPreview] }))
    console.log('[SiteLine] handleDocumentUpload — doc saved to Supabase and added to state, previewUrl:', docWithPreview.previewUrl ?? '(none)')
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
        'This capture is outside the expected site geofence. Add a short explanation so SiteLine can flag it for review.',
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
    console.log('[SiteLine] handleChecklistCapture —', itemCode, '— source:', payload.source, '— transcript:', payload.transcript ?? '(none)')

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
  }: {
    nextItems: WorkspaceItem[]
    nextStageSignOffs: Record<string, StageSignOffRecord>
    sealedAt: string
    certificationType: 'standard' | 'final_occupancy'
    projectState: 'SEALED' | 'COMPLETED'
    auditNote: string
    location?: LocationSnapshot
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

    const sessionInspector = await getAuthenticatedInspectorIdentity({ alertOnFailure: true })

    if (!sessionInspector) {
      setSealing(false)
      return false
    }

    const sealReference = createSealRef()
    const failedCount = nextItems.filter(item => item.inspection_status === 'Failed').length
    const passedCount = nextItems.filter(item => item.inspection_status === 'Passed').length
const overallResult = (failedCount > 0 ? 'fail' : 'pass') as 'pass' | 'fail' | 'stopped'
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
    }

    const saved = await persistDraft(nextItems, currentStage, {
      status: 'sealed',
      sealApplied: true,
      sealReference,
      sealPayload,
      submittedAt: sealedAt,
    })

    if (!saved) {
      reportPersistenceFailure(
        'SiteLine could not save the certified completion report to Supabase. Please try again.',
        { assignmentId, reportId: report.id },
        { alert: true }
      )
      setSealing(false)
      return false
    }

    const evidenceItems: EvidenceItem[] = nextItems.flatMap(item =>
      item.documents.map(doc => ({
        id: doc.id,
        projectId: job.projectId,
        kind: 'document',
        originalFilename: doc.fileName,
        storagePath: doc.storagePath,
        captureTimestamp: doc.createdAt,
        uploadedBy: doc.uploadedBy,
        notes: item.response_note || item.ahj_notes,
        validationState: 'pending',
        createdAt: doc.createdAt,
        updatedAt: doc.createdAt,
        metadata: {
          itemCode: item.item_code,
          itemLabel: item.item_label,
          stageNumber: item.stage_number,
        },
      }))
    )

    const completedRecord = {
      id: createRuntimeId(`completion-record-${assignment.id}`),
      projectId: job.projectId,
      projectName: job.projectName,
      address: job.address,
      city: job.city,
      stage: 15,
      stageName: 'Inspector Completion',
      result: overallResult,
      evidenceItems,
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
      discipline: undefined,
      region: job.region,
      jurisdictionId: overlay.jurisdictionName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      jurisdictionName: overlay.jurisdictionName,
      authorityName: overlay.label,
      sealed: true,
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

    const recordInsert = await insertCompletedRecordStrict(completedRecord as Parameters<typeof insertCompletedRecordStrict>[0])

    if (!recordInsert.ok) {
      reportPersistenceFailure(
        'Final certification could not be written to Supabase. Please try again.',
        {
          assignmentId,
          reportId: report.id,
          inspectorId: sessionInspector.id,
          error: recordInsert.error,
        },
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
          'The certification was saved to Supabase, but SiteLine could not update the project status. Please refresh and verify the job state.',
          { jobId: job.id, inspectorId: sessionInspector.id },
          { alert: true }
        )
      }
    }

    await completeJobAssignment(assignment.id, sessionInspector.id)

    setReport(current => current ? {
      ...current,
      inspectorId: sessionInspector.id,
      status: 'sealed',
      sealApplied: true,
      sealReference,
      sealPayload,
      submittedAt: sealedAt,
    } : current)
    setItems(nextItems)
    setSealed(true)
    setSealing(false)
    return true
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
            inspection_status: 'Passed' as const,
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

    const unlockedStages = getUnlockedFutureStages(nextItems, stages, currentStage)
    const nextStage = unlockedStages[0] ?? currentStage
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

    const saved = await persistDraft(nextItems, nextStage, {
      sealPayload: {
        ...report.sealPayload,
        stageSignOffs: nextStageSignOffs,
      },
    })

    if (!saved) {
      setStageSigning(false)
      setStageSignOffError('The stage sign-off could not be saved. Please try again.')
      return
    }

    setItems(nextItems)
    navigateToStage(nextStage)
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
    if (!sealReady) return
    const sealedAt = new Date().toISOString()
    const existingStageSignOffs = getStageSignOffs(report.sealPayload)
    await finalizeProjectCompletion({
      nextItems: items,
      nextStageSignOffs: existingStageSignOffs,
      sealedAt,
      certificationType: 'standard',
      projectState: 'SEALED',
      auditNote: 'Inspector completion checklist sealed',
    })
  }

  async function handleFinalOccupancyIssue() {
    if (!report || !job || !assignment || !activeUser || !overlay) return
    if (!isFinalOccupancyStage || !finalOccupancyReady) return

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
            inspection_status: 'Passed' as const,
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
      auditNote: 'Final occupancy issued and project certified',
      location,
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
      <div className="completion-workspace min-h-screen bg-[#050816] bg-[#0f172a] text-white">
        <Navbar role="inspector" dark />
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#FF5F15]" />
        </div>
      </div>
    )
  }

  if (error || !job || !overlay || !report) {
    return (
      <div className="completion-workspace min-h-screen bg-[#050816] bg-[#0f172a] text-white">
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
      <div className="completion-workspace min-h-screen bg-[#050816] bg-[#0f172a] text-white">
        <Navbar role="inspector" dark />
        <main className="mx-auto max-w-3xl px-4 py-12">
          <div className={`rounded-[2rem] p-8 text-center ${
            isProjectCertified
              ? 'border border-amber-300/30 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),rgba(5,8,22,0.94)_58%)]'
              : 'border border-emerald-500/25 bg-emerald-500/10'
          }`}>
            <div className="mx-auto mb-5 flex items-center justify-center">
              <SiteLineSealIcon certified={isProjectCertified} className="h-20 w-20" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">{isProjectCertified ? 'Project Certified' : 'Digital Seal Applied'}</h1>
            <p className={`mx-auto mt-3 max-w-xl text-sm ${
              isProjectCertified ? 'text-amber-100/80' : 'text-emerald-100/80'
            }`}>
              {isProjectCertified
                ? 'Final occupancy has been issued. The project is certified, completed, and sealed with its full 15-stage compliance record.'
                : 'The 15-stage inspector completion package is sealed and stored with its AHJ overlay snapshot.'}
            </p>

            <div className="mt-8 grid gap-4 rounded-3xl border border-white/10 bg-[#0b1226] p-5 text-left md:grid-cols-2">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Seal Reference</div>
                <div className="mt-1 font-mono text-lg text-[#FFB089]">{report.sealReference}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">{isProjectCertified ? 'Certification' : 'Outcome'}</div>
                <div className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-black ${
                  isProjectCertified
                    ? 'bg-amber-300/15 text-amber-200'
                    : result === 'fail'
                      ? 'bg-red-500/15 text-red-300'
                      : 'bg-emerald-500/15 text-emerald-300'
                }`}>
                  {isProjectCertified
                    ? 'Final Occupancy Issued'
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
                  {isProjectCertified ? 'COMPLETED' : overlay.label}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
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
                className="rounded-2xl bg-[#FF5F15] px-5 py-3 text-sm font-black text-white hover:bg-[#e25412]"
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
    <div className="completion-workspace min-h-screen bg-[#050816] bg-[#0f172a] text-white pb-40">
      <Navbar role="inspector" dark />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className={`completion-sidebar rounded-[2rem] border border-white/10 bg-[#0a1020] p-4 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:overflow-y-auto ${FLOATING_PANEL_CLASS}`}>
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

            <div className={`rounded-3xl border border-[#24406e] bg-[#0d1730] p-4 ${FLOATING_PANEL_CLASS}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300/70">Inspector Completion</div>
                  <h1 className="mt-2 text-xl font-black">{job.projectName}</h1>
                </div>
                <div className="rounded-full bg-[#FF5F15]/15 px-3 py-1 text-[11px] font-black text-[#FFB089]">
                  15 Stages
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-zinc-300">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-cyan-300" />
                  <span>{job.address}, {job.city}</span>
                </div>
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

            <div className={`mt-4 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4 ${FLOATING_PANEL_CLASS}`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
                <div>
                  <div className="text-sm font-black text-amber-200">AHJ Overlay Active</div>
                  <div className="mt-1 text-xs leading-relaxed text-amber-100/80">{overlay.summary}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
              <span>{lastSavedLabel}</span>
              {saving && <Loader2 className="h-4 w-4 animate-spin text-[#FF5F15]" />}
            </div>

            <div className={`mt-4 rounded-[1.75rem] border border-white/10 bg-[#0a1020] p-4 ${FLOATING_PANEL_CLASS}`}>
              <button
                type="button"
                onClick={() => setProjectOverviewOpen(open => !open)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Project Overview</div>
                  <div className="mt-1 text-lg font-black text-white">Project {projectCompletionPercent}% Complete</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-black text-cyan-200">
                    {projectOverviewStages.filter(stage => stage.status === 'passed').length}/{projectOverviewStages.length} passed
                  </div>
                  <ChevronRight className={`h-5 w-5 text-zinc-400 transition-transform ${projectOverviewOpen ? 'rotate-90' : ''}`} />
                </div>
              </button>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                  style={{ width: `${projectCompletionPercent}%` }}
                />
              </div>

              {projectOverviewOpen && (
                <div className="mt-4 space-y-4">
                  {phasedProjectOverview.map(phase => (
                    <div key={phase.id}>
                      <div className="mb-2 flex items-center gap-3">
                        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">{phase.label}</div>
                        <div className="h-px flex-1 bg-white/10" />
                      </div>

                      <div className="space-y-2">
                        {phase.stages.map(({ stage, total, resolved, status, unlocked, signOff }) => {
                          const stageCode = `S${String(stage.stage_number).padStart(2, '0')}`
                          const isCurrent = currentStage === stage.stage_number
                          const isClickable = status !== 'pending'
                          const containerClass =
                            status === 'passed'
                              ? 'border-emerald-500/30 bg-emerald-500/10'
                              : status === 'active'
                                ? 'border-cyan-500/30 bg-cyan-500/10'
                                : 'border-white/8 bg-white/[0.03]'
                          const badgeClass =
                            status === 'passed'
                              ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-200'
                              : status === 'active'
                                ? 'border-cyan-400/30 bg-cyan-400/15 text-cyan-200'
                                : 'border-white/10 bg-white/5 text-zinc-400'
                          const progressClass =
                            status === 'passed'
                              ? 'bg-emerald-400'
                              : status === 'active'
                                ? 'bg-cyan-400'
                                : 'bg-zinc-700'

                          return (
                            <button
                              key={stage.stage_number}
                              type="button"
                              disabled={!isClickable}
                              onClick={() => {
                                if (isClickable) navigateToStage(stage.stage_number)
                              }}
                              className={`w-full rounded-2xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${containerClass} ${isCurrent ? 'ring-1 ring-[#FF5F15]/60' : ''}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${badgeClass}`}>
                                      {stageCode}
                                    </span>
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${badgeClass}`}>
                                      {status === 'passed' ? 'Passed' : status === 'active' ? 'Active' : 'Locked'}
                                    </span>
                                    {isCurrent && (
                                      <span className="rounded-full border border-[#FF5F15]/40 bg-[#FF5F15]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#FFB089]">
                                        In View
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-2 text-sm font-bold text-zinc-100">{stage.stage_name}</div>
                                  <div className="mt-1 text-[11px] text-zinc-400">
                                    {status === 'passed'
                                      ? `Signed ${signOff ? new Date(signOff.signedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : ''}`.trim()
                                      : unlocked
                                        ? 'Unlocked and ready for field work.'
                                        : 'Waiting on upstream dependencies.'}
                                  </div>
                                </div>
                                {status === 'passed' ? (
                                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
                                ) : status === 'active' ? (
                                  <CircleDashed className="h-5 w-5 shrink-0 text-cyan-300" />
                                ) : (
                                  <Lock className="h-5 w-5 shrink-0 text-zinc-500" />
                                )}
                              </div>

                              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                                <div
                                  className={`h-full rounded-full ${progressClass}`}
                                  style={{ width: `${total > 0 ? (resolved / total) * 100 : 0}%` }}
                                />
                              </div>
                              <div className="mt-2 text-[11px] text-zinc-400">{resolved} of {total} containers resolved</div>
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

          <section className="space-y-5">
            <div className={`rounded-[2rem] border border-white/10 bg-[#0a1020] p-5 ${FLOATING_PANEL_CLASS}`}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Current Stage</div>
                  <h2 className="mt-2 text-3xl font-black">Stage {currentStage}: {currentProgress?.stage.stage_name}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">{currentProgress?.stage.summary}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Resolved</div>
                    <div className="mt-2 text-2xl font-black">{currentProgress?.resolved ?? 0}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Pending</div>
                    <div className="mt-2 text-2xl font-black">{(currentProgress?.total ?? 0) - (currentProgress?.resolved ?? 0)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Seal Gate</div>
                    <div className={`mt-2 text-sm font-black ${sealReady ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {sealReady ? 'Ready' : 'Locked'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {stageItems.map(item => {
                const requiredLabel = typeof item.is_required === 'string' ? item.is_required : item.is_required ? 'Required' : 'Optional'
                const blockedBy = item.dependencies.filter(dep => {
                  const dependency = items.find(candidate => candidate.item_code === dep)
                  return dependency?.inspection_status === 'Pending'
                })
                const passRequiresEvidence = item.evidence_mode === 'required_upload' && item.document_upload_required
                const passBlockedForEvidence = passRequiresEvidence && item.documents.length === 0
                const evidenceSummary = item.evidence_mode === 'verify_existing'
                  ? 'Verify project documents already on file. Upload remains optional unless you need to document a discrepancy.'
                  : 'At least one evidence file is required before this container can be passed.'
                const shortPurpose = summarizePurpose(item.item_purpose)
                const usesFieldView = item.ui_schema === 'field_view'
                const stopItems = item.stop_if && item.stop_if.length > 0 ? item.stop_if : item.fail_when
                const fieldViewDetails = item.view_details?.trim() || item.field_view_details?.trim() || item.item_purpose

                const checklistItems = item.field_checklist.length > 0 ? item.field_checklist : item.what_to_check
                const guidancePanelOpen = expandedGuidancePanels[item.item_code] ?? false
                const stopConditionsOpen = expandedStopConditions[item.item_code] ?? false
                const containerNotesOpen = expandedContainerNotes[item.item_code] ?? Boolean(item.response_note.trim())
                const jurisdictionNotesOpen = expandedJurisdictionNotes[item.item_code] ?? false

                if (usesFieldView) {
                  console.log('[SiteLine] Rendering Checklist Item:', item.item_code, '— documents:', item.documents.length, item.documents)
                  return (
                    <article key={item.item_code} className={`rounded-[1.75rem] border border-white/10 bg-[#0a1020] p-4 sm:p-5 ${FLOATING_PANEL_CLASS}`}>
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
                        </div>

                        <div className="min-w-0">
                          <div className="min-w-0">
                            <h3 className="text-lg font-black leading-tight sm:text-xl">{item.item_label}</h3>
                            <p className="mt-2 text-[17px] leading-7 text-zinc-300">{shortPurpose}</p>
                          </div>
                        </div>
                      </div>

                      {blockedBy.length > 0 && (
                        <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
                          Resolve {blockedBy.join(' first, ')} first.
                        </div>
                      )}

                      <div className={`mt-4 rounded-[1.5rem] border border-white/10 bg-[#060b18] p-3 sm:p-4 ${FLOATING_PANEL_CLASS}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Field Checklist</div>
                            <div className="mt-1 text-xs text-zinc-400">Tap each item as you verify it. Capture evidence inline as you go.</div>
                          </div>
                          <div className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-black text-zinc-300">
                            {checklistItems.filter(detail => getChecklistEntryState(item, detail).checked).length}/{checklistItems.length}
                          </div>
                        </div>

                        <div className="mt-3 space-y-3">
                          {checklistItems.map((detail, index) => {
                            const entryState = getChecklistEntryState(item, detail)
                            const noteKey = `${item.item_code}:${checklistEntryKey(detail)}`
                            const noteOpen = expandedChecklistNotes[noteKey] === true || Boolean(entryState.note)
                            const evidenceActions = parseFieldEvidenceActions(detail)
                            const showCamera = evidenceActions === null || evidenceActions.includes('camera')
                            const showVideo = evidenceActions?.includes('video') ?? false
                            const showAudio = evidenceActions === null || evidenceActions.includes('audio')
                            const showText = evidenceActions === null || evidenceActions.includes('text') || Boolean(entryState.note)

                            return (
                              <div key={detail} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                  <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={entryState.checked === true}
                                    onClick={() => toggleChecklistItem(item.item_code, detail)}
                                    className={`flex min-h-[52px] w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors lg:flex-1 ${
                                      entryState.checked
                                        ? 'bg-emerald-500/10 text-white'
                                        : 'bg-[#060b18] text-zinc-100 hover:bg-[#091022]'
                                    }`}
                                  >
                                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                                      entryState.checked
                                        ? 'border-emerald-300 bg-emerald-400/20 text-emerald-200'
                                        : 'border-zinc-600 bg-transparent text-zinc-500'
                                    }`}>
                                      <CheckCircle2 className="h-4 w-4" />
                                    </span>
                                    <span className="pt-0.5 text-sm font-semibold leading-relaxed">{detail}</span>
                                  </button>

                                  <div className="flex flex-wrap gap-2 lg:justify-end">
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
                                        buttonClassName={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border px-0 transition-colors shadow-[0_6px_14px_rgba(15,23,42,0.18)] disabled:cursor-not-allowed disabled:opacity-50 ${
                                          noteOpen
                                            ? 'border-[#FF5F15]/50 bg-[#FFEDD5] text-[#C2410C]'
                                            : 'border-slate-300/80 bg-[#e5e7eb] text-slate-700 hover:bg-[#f3f4f6]'
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
                                    className="mt-3 w-full rounded-2xl border border-white/10 bg-[#060b18] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#FF5F15] focus:outline-none"
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
                                          />
                                        )
                                      }
                                      // Fallback: capture was recorded but doc is not (yet) in
                                      // state — render from the capture's own metadata instead.
                                      return (
                                        <div
                                          key={capIdx}
                                          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#060b18] px-3 py-3"
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

                      {stopItems.length > 0 && (
                        <div className="mt-4 rounded-[1.5rem] border border-red-200 border-l-4 border-l-red-300 bg-red-50 p-4 text-red-700">
                          <button
                            type="button"
                            onClick={() => toggleExpandedRecord(setExpandedStopConditions, item.item_code)}
                            className="flex w-full items-center justify-between gap-3 text-left"
                          >
                            <div className="flex items-center gap-3">
                              <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                              <div className="text-sm font-black uppercase tracking-[0.14em] text-red-700">Critical Stop Conditions</div>
                            </div>
                            <ChevronRight className={`h-5 w-5 text-red-500 transition-transform ${stopConditionsOpen ? 'rotate-90' : ''}`} />
                          </button>

                          {stopConditionsOpen && (
                            <div className="mt-3">
                              <GuidanceList
                                items={stopItems}
                                bulletClassName="bg-red-300"
                                textClassName="text-sm text-red-950"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                        <StatusPill
                          label="Pending"
                          value="Pending"
                          active={item.inspection_status === 'Pending'}
                          onClick={value => handleStatusSelection(item.item_code, value)}
                        />
                        <StatusPill
                          label="Passed"
                          value="Passed"
                          active={item.inspection_status === 'Passed'}
                          disabled={passBlockedForEvidence}
                          onClick={value => handleStatusSelection(item.item_code, value)}
                        />
                        <StatusPill
                          label="Failed"
                          value="Failed"
                          active={item.inspection_status === 'Failed'}
                          onClick={value => handleStatusSelection(item.item_code, value)}
                        />
                        <StatusPill
                          label="N/A"
                          value="N/A"
                          active={item.inspection_status === 'N/A'}
                          onClick={value => handleStatusSelection(item.item_code, value)}
                        />
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void persistDraft()}
                          className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {saving ? 'Saving…' : 'Save Draft'}
                        </button>
                      </div>

                      {passBlockedForEvidence && (
                        <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
                          Upload at least one evidence file before marking this container as Passed.
                        </div>
                      )}

                      <div className="mt-4 space-y-4">
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
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

                              <div className={`rounded-3xl border border-emerald-500/15 bg-emerald-500/5 p-4 ${FLOATING_PANEL_CLASS}`}>
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
                                  <div className="text-xs font-black uppercase tracking-[0.14em] text-amber-300">Pending When</div>
                                  <div className="mt-2">
                                    <GuidanceList
                                      items={item.pending_when}
                                      bulletClassName="bg-amber-300"
                                      textClassName={EMPHASIZED_BODY_TEXT_CLASS}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className={`rounded-3xl border border-white/10 bg-white/5 p-4 ${FLOATING_PANEL_CLASS}`}>
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Evidence Guidance</div>
                                <div className="mt-3 text-[17px] leading-7 text-zinc-300">{evidenceSummary}</div>
                                <div className="mt-4 rounded-2xl border border-white/10 bg-[#060b18] p-3">
                                  {item.required_evidence.length > 0 && (
                                    <>
                                      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Required Evidence</div>
                                      <div className="mt-2">
                                        <GuidanceList
                                          items={item.required_evidence}
                                          bulletClassName="bg-[#FFB089]"
                                          textClassName="text-sm text-zinc-300"
                                        />
                                      </div>
                                    </>
                                  )}
                                  {item.optional_evidence.length > 0 && (
                                    <>
                                      <div className={`${item.required_evidence.length > 0 ? 'mt-4 ' : ''}text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500`}>Optional Evidence</div>
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
                              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
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
                                    <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
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
                                      className="mt-3 w-full rounded-2xl border border-white/10 bg-[#060b18] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#FF5F15] focus:outline-none"
                                    />
                                  </>
                                )}
                              </div>

                              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
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

                          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Attached Evidence</div>
                                <div className="mt-1 text-xs text-zinc-400">Container-level uploads remain available when you need broader context.</div>
                              </div>
                              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-2xl bg-[#FF5F15] px-4 py-3 text-xs font-black text-white hover:bg-[#e25412]">
                                <Upload className="h-4 w-4" />
                                Upload
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={event => {
                                    const file = event.target.files?.[0]
                                    event.target.value = ''
                                    if (file) void handleDocumentUpload(item.item_code, file)
                                  }}
                                />
                              </label>
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
                  <article key={item.item_code} className={`rounded-[1.75rem] border border-white/10 bg-[#0a1020] p-4 sm:p-5 ${FLOATING_PANEL_CLASS}`}>
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
                          <h3 className="text-lg font-black leading-tight sm:text-xl">{item.item_label}</h3>
                          <p className="mt-2 text-[17px] leading-7 text-zinc-300">{shortPurpose}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Requirement</div>
                          <div className="mt-1 text-xs font-semibold text-zinc-200">{requiredLabel}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Evidence</div>
                          <div className="mt-1 text-xs font-semibold text-zinc-200">
                            {item.evidence_mode === 'verify_existing'
                              ? 'Verify existing'
                              : passBlockedForEvidence
                                ? 'Upload to pass'
                                : `${item.documents.length} uploaded`}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Status</div>
                          <div className="mt-1 text-xs font-semibold text-zinc-200">{item.inspection_status}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Docs</div>
                          <div className="mt-1 text-xs font-semibold text-zinc-200">{item.documents.length}</div>
                        </div>
                      </div>
                    </div>

                    {blockedBy.length > 0 && (
                      <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs text-amber-100/90">
                        Resolve {blockedBy.join(' first, ')} first.
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                      <StatusPill
                        label="Pending"
                        value="Pending"
                        active={item.inspection_status === 'Pending'}
                        onClick={value => handleStatusSelection(item.item_code, value)}
                      />
                      <StatusPill
                        label="Passed"
                        value="Passed"
                        active={item.inspection_status === 'Passed'}
                        disabled={passBlockedForEvidence}
                        onClick={value => handleStatusSelection(item.item_code, value)}
                      />
                      <StatusPill
                        label="Failed"
                        value="Failed"
                        active={item.inspection_status === 'Failed'}
                        onClick={value => handleStatusSelection(item.item_code, value)}
                      />
                      <StatusPill
                        label="N/A"
                        value="N/A"
                        active={item.inspection_status === 'N/A'}
                        onClick={value => handleStatusSelection(item.item_code, value)}
                      />
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void persistDraft()}
                        className="min-h-12 rounded-2xl border border-slate-600 bg-slate-900 px-4 py-3 text-sm font-black text-slate-100 shadow-[0_10px_20px_rgba(15,23,42,0.24)] transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {saving ? 'Saving…' : 'Save Draft'}
                      </button>
                    </div>

                    {passBlockedForEvidence && (
                      <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs text-amber-100/90">
                        Upload at least one evidence file before marking this container as Passed.
                      </div>
                    )}

                    <div className="mt-4 space-y-4">
                      {stopItems.length > 0 && (
                        <div className="rounded-[1.5rem] border border-red-200 border-l-4 border-l-red-300 bg-red-50 p-4 text-red-700">
                          <button
                            type="button"
                            onClick={() => toggleExpandedRecord(setExpandedStopConditions, item.item_code)}
                            className="flex w-full items-center justify-between gap-3 text-left"
                          >
                            <div className="flex items-center gap-3">
                              <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                              <div className="text-sm font-black uppercase tracking-[0.14em] text-red-700">Critical Stop Conditions</div>
                            </div>
                            <ChevronRight className={`h-5 w-5 text-red-500 transition-transform ${stopConditionsOpen ? 'rotate-90' : ''}`} />
                          </button>

                          {stopConditionsOpen && (
                            <div className="mt-3">
                              <GuidanceList
                                items={stopItems}
                                bulletClassName="bg-red-300"
                                textClassName="text-sm text-red-950"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
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

                            <div className={`rounded-3xl border border-emerald-500/15 bg-emerald-500/5 p-4 ${FLOATING_PANEL_CLASS}`}>
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
                                <div className="text-xs font-black uppercase tracking-[0.14em] text-amber-300">Pending When</div>
                                <div className="mt-2">
                                  <GuidanceList
                                    items={item.pending_when}
                                    bulletClassName="bg-amber-300"
                                    textClassName={EMPHASIZED_BODY_TEXT_CLASS}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className={`rounded-3xl border border-white/10 bg-white/5 p-4 ${FLOATING_PANEL_CLASS}`}>
                              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Evidence Guidance</div>
                              <div className="mt-3 text-[17px] leading-7 text-zinc-300">{evidenceSummary}</div>
                              <div className="mt-4 rounded-2xl border border-white/10 bg-[#060b18] p-3">
                                {item.required_evidence.length > 0 && (
                                  <>
                                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Required Evidence</div>
                                    <div className="mt-2">
                                      <GuidanceList
                                        items={item.required_evidence}
                                        bulletClassName="bg-[#FFB089]"
                                        textClassName="text-sm text-zinc-300"
                                      />
                                    </div>
                                  </>
                                )}
                                {item.optional_evidence.length > 0 && (
                                  <>
                                    <div className={`${item.required_evidence.length > 0 ? 'mt-4 ' : ''}text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500`}>Optional Evidence</div>
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
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
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
                                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
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
                                    className="mt-3 w-full rounded-2xl border border-white/10 bg-[#060b18] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#FF5F15] focus:outline-none"
                                  />
                                </>
                              )}
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
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

                        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Evidence</div>
                              <div className="mt-1 text-xs text-zinc-400">
                                {evidenceSummary}
                              </div>
                            </div>
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#FF5F15] px-4 py-3 text-xs font-black text-white hover:bg-[#e25412]">
                              <Upload className="h-4 w-4" />
                              Upload
                              <input
                                type="file"
                                className="hidden"
                                onChange={event => {
                                  const file = event.target.files?.[0]
                                  event.target.value = ''
                                  if (file) void handleDocumentUpload(item.item_code, file)
                                }}
                              />
                            </label>
                          </div>

                          {passBlockedForEvidence && (
                            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs text-amber-100/90">
                              Upload at least one evidence file before marking this container as Passed.
                            </div>
                          )}

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
              <div className="rounded-[2rem] border border-white/10 bg-[#050816] bg-[#0f172a] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-2xl">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-200/80">Final Occupancy Seal</div>
                    <div className="mt-3 flex items-center gap-4">
                      <SiteLineSealIcon />
                      <div>
                        <h3 className="text-2xl font-black text-white">Issue Final Occupancy</h3>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                          This is the final SiteLine certification gate. All 15 stages must be passed before the project can be flipped to COMPLETED.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-3xl border px-4 py-3 ${
                    finalOccupancyReady
                      ? 'border-amber-300/30 bg-amber-300/10'
                      : 'border-zinc-700 bg-white/5'
                  }`}>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Certification Gate</div>
                    <div className={`mt-2 text-lg font-black ${finalOccupancyReady ? 'text-amber-200' : 'text-zinc-200'}`}>
                      {passedStageCount + (stageReadyForSignOff && !currentStageSignOff ? 1 : 0)} / {stages.length} stages ready
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {finalOccupancyReady ? 'All stage gates are satisfied.' : 'Finish every stage sign-off before issuing occupancy.'}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                    <span>Global Certification Progress</span>
                    <span>{passedStageCount + (stageReadyForSignOff && !currentStageSignOff ? 1 : 0)} / {stages.length} stages passed</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-900 via-red-700 to-amber-400 transition-all"
                      style={{ width: `${Math.min(100, Math.round(((passedStageCount + (stageReadyForSignOff && !currentStageSignOff ? 1 : 0)) / Math.max(stages.length, 1)) * 100))}%` }}
                    />
                  </div>
                </div>

                {!finalOccupancyReady && (
                  <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
                    Remaining requirement: every stage from S01 through S15 must be passed before final occupancy can be issued.
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
                      Final occupancy stamps the current geolocation and ISO timestamp into the certification record.
                    </div>
                    <div className="flex items-center gap-2">
                      <Stamp className="h-4 w-4 text-amber-300" />
                      Project state will transition to COMPLETED and display as Project Certified.
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!finalOccupancyReady || sealing}
                    onClick={() => void handleFinalOccupancyIssue()}
                    className={`inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-black uppercase tracking-[0.12em] transition-colors ${
                      finalOccupancyReady
                        ? 'bg-[#991b1b] text-white shadow-[0_18px_34px_rgba(153,27,27,0.38)] hover:bg-[#7f1717]'
                        : 'cursor-not-allowed bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {sealing ? <Loader2 className="h-4 w-4 animate-spin" /> : <SiteLineSealIcon className="h-10 w-10" />}
                    {sealing ? 'Issuing Final Occupancy...' : 'ISSUE FINAL OCCUPANCY'}
                  </button>
                </div>
              </div>
            ) : (
              <div className={`rounded-[2rem] border border-[#FF5F15]/20 bg-[#0d1324] p-5 shadow-[0_0_0_1px_rgba(255,95,21,0.08)] ${FLOATING_PANEL_CLASS}`}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-2xl">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#FFB089]">Stage Summary Footer</div>
                    <h3 className="mt-2 text-2xl font-black">Sign Off Stage {currentStage}</h3>
                    <p className="mt-2 text-sm text-zinc-300">
                      Required containers must be fully checked, evidence-backed, and clear of failures before this stage can be signed and pushed forward.
                    </p>
                  </div>

                  <div className={`rounded-3xl border px-4 py-3 ${
                    stageReadyForSignOff
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-amber-500/20 bg-amber-500/10'
                  }`}>
                    <div className="flex items-start gap-3">
                      {currentStageSignOff ? (
                        <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-300" />
                      ) : stageReadyForSignOff ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
                      ) : (
                        <Lock className="mt-0.5 h-5 w-5 text-amber-300" />
                      )}
                      <div className="text-sm">
                        <div className={`font-black ${
                          currentStageSignOff || stageReadyForSignOff ? 'text-emerald-200' : 'text-amber-200'
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
                        currentStageSignOff || stageReadyForSignOff ? 'bg-emerald-400' : 'bg-[#FF5F15]'
                      }`}
                      style={{ width: `${currentStageSignOff ? 100 : stageCompletionPercent}%` }}
                    />
                  </div>
                </div>

                {failedStageItems.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100/90">
                    Resolve failed containers before signing off: {failedStageItems.map(item => item.item_code).join(', ')}.
                  </div>
                )}

                {!currentStageSignOff && failedStageItems.length === 0 && incompleteStageItems.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
                    Finish these containers first: {incompleteStageItems.map(item => item.item_code).join(', ')}.
                  </div>
                )}

                {stageSignOffError && (
                  <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100/90">
                    {stageSignOffError}
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2 text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-cyan-300" />
                      Sign-off stamps the current geolocation and ISO timestamp into the stage record.
                    </div>
                    {currentStageSignOff && (
                      <div className="flex items-center gap-2">
                        <Stamp className="h-4 w-4 text-[#FFB089]" />
                        {currentStageSignOff.unlockedStages.length > 0
                          ? `Unlocked stages: ${currentStageSignOff.unlockedStages.map(stage => `Stage ${stage}`).join(', ')}`
                          : 'No downstream stage was unlocked by this sign-off yet.'}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!stageReadyForSignOff || stageSigning || Boolean(currentStageSignOff)}
                    onClick={() => void handleStageSignOff()}
                    className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition-colors ${
                      !stageReadyForSignOff || currentStageSignOff
                        ? 'cursor-not-allowed bg-zinc-800 text-zinc-500'
                        : 'bg-[#FF5F15] text-white shadow-[0_14px_30px_rgba(255,95,21,0.28)] hover:bg-[#e25412]'
                    }`}
                  >
                    {stageSigning ? <Loader2 className="h-4 w-4 animate-spin" /> : currentStageSignOff ? <ShieldCheck className="h-4 w-4" /> : <Stamp className="h-4 w-4" />}
                    {stageSigning ? 'Signing Stage...' : currentStageSignOff ? 'Stage Signed' : 'Sign & Submit'}
                  </button>
                </div>
              </div>
            )}

            {!isFinalOccupancyStage && (
              <div className={`rounded-[2rem] border border-white/10 bg-[#0a1020] p-5 ${FLOATING_PANEL_CLASS}`}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Completion Gate</div>
                    <h3 className="mt-2 text-2xl font-black">Digital Seal</h3>
                    <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                      The seal unlocks only after every checklist item has been resolved and all document-required items have at least one uploaded file.
                    </p>
                  </div>

                  <div className={`rounded-3xl border px-4 py-3 ${sealReady ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/20 bg-amber-500/10'}`}>
                    <div className="flex items-start gap-3">
                      {sealReady ? (
                        <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-300" />
                      ) : (
                        <Lock className="mt-0.5 h-5 w-5 text-amber-300" />
                      )}
                      <div className="text-sm">
                        <div className={`font-black ${sealReady ? 'text-emerald-200' : 'text-amber-200'}`}>
                          {sealReady ? 'Seal Ready' : 'Seal Locked'}
                        </div>
                        <div className="mt-1 text-xs text-zinc-300">
                          {sealReady
                            ? 'All checklist items are resolved and evidence requirements are satisfied.'
                            : `${unresolvedRequired.length} pending item(s) and ${missingDocuments.length} document gap(s) remain.`}
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
                  <button
                    type="button"
                    disabled={!sealReady || sealing}
                    onClick={() => void applySeal()}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black ${
                      sealReady
                        ? 'bg-[#FF5F15] text-white hover:bg-[#e25412]'
                        : 'cursor-not-allowed bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {sealing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stamp className="h-4 w-4" />}
                    {sealing ? 'Applying Seal...' : 'Apply Digital Seal'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-[#050816]/95 bg-[#0f172a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <button
            type="button"
            disabled={currentStage === 1}
            onClick={() => navigateToStage(Math.max(1, currentStage - 1))}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous Stage
          </button>

          <div className="text-center text-xs text-zinc-400">
            Stage {currentStage} of {stages.length}
            <div className="mt-1 text-sm font-bold text-white">{currentProgress?.resolved ?? 0} / {currentProgress?.total ?? 0} resolved</div>
          </div>

          <div className="flex items-center gap-3">
            {footerIssueCount > 0 && (
              <div className="inline-flex min-h-[44px] items-center rounded-full border border-red-500 bg-red-600 px-4 py-2 text-sm font-black text-white shadow-[0_10px_20px_rgba(220,38,38,0.28)]">
                {footerIssueCount} Issue{footerIssueCount === 1 ? '' : 's'}
              </div>
            )}
            <button
              type="button"
              disabled={currentStage === stages.length || footerIssueCount > 0}
              onClick={() => navigateToStage(Math.min(stages.length, currentStage + 1))}
              className={`inline-flex min-h-[48px] items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white ${
                footerIssueCount > 0
                  ? 'cursor-not-allowed bg-zinc-700 text-zinc-300'
                  : 'bg-[#FF5F15] disabled:cursor-not-allowed disabled:opacity-40'
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
