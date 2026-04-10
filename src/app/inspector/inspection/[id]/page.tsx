'use client'

import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Timer, CheckCircle2, XCircle, Minus, Camera,
  Shield, PauseCircle, Lock, ChevronDown, ChevronUp,
  Video, FileText, AlertTriangle, ImagePlus,
  ArrowLeft, ExternalLink, Clock, User, MapPin, Tag, DollarSign
} from 'lucide-react'
import { Navbar } from '@/components/shared/Navbar'
import { useStore } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { INSPECTION_STAGES } from '@/lib/mockData'
import { createClient } from '@/lib/supabase/client'
import { saveCompletedInspection } from '@/lib/persistence/completedInspections'
import { updateJobStatus } from '@/lib/supabase/jobs'
import type { ChecklistResult } from '@/lib/types'
import { RetentionTimer } from '@/components/inspector/RetentionTimer'
import type { HoldRecord, DispatchTier } from '@/lib/types'
import { RETENTION_RATES } from '@/lib/types'
import type { EvidenceItem as DomainEvidenceItem } from '@/lib/domain/types'

const supabase = createClient()

// ─── Local evidence item (page-level; mapped to domain type at seal) ──────────

interface LocalEvidenceItem {
  id: string
  checklistItemId: string
  kind: 'photo' | 'video' | 'note'
  capturedAt: string
  lat?: number
  lng?: number
  offlineCapture: boolean
  notes?: string
  fileName?: string
  fileSize?: number
  uploaderId: string
}

// ─── GPS helper ───────────────────────────────────────────────────────────────

async function captureGPS(): Promise<{ lat?: number; lng?: number; offlineCapture: boolean }> {
  return new Promise(resolve => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ offlineCapture: true })
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        offlineCapture: false,
      }),
      () => resolve({ offlineCapture: true }),
      { timeout: 5000, maximumAge: 30000 }
    )
  })
}

// ─── Pre-safety gate ──────────────────────────────────────────────────────────

const PRE_SAFETY_ITEMS = [
  { id: 'pse-01', label: 'Hard hat worn and serviceable' },
  { id: 'pse-02', label: 'Hi-vis safety vest worn' },
  { id: 'pse-03', label: 'Steel-toe footwear (CSA Grade 1)' },
  { id: 'pse-04', label: 'Safety glasses in place' },
  { id: 'pse-06', label: 'Fire extinguisher present/accessible' },
]

function PreSafetyGate({
  projectName,
  stageName,
  onComplete,
}: {
  projectName: string
  stageName: string
  onComplete: () => void
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const toggle = (id: string) => {
    const next = new Set(checked)
    if (next.has(id)) next.delete(id); else next.add(id)
    setChecked(next)
  }
  const done = checked.size === PRE_SAFETY_ITEMS.length

  return (
    <div className="min-h-screen bg-[#060B15] pb-36 text-white">
      <Navbar role="inspector" dark />
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <Shield className="w-10 h-10 text-amber-400" />
            <div>
              <h1 className="text-xl font-black">WorkSafe BC Pre-Safety Gate</h1>
              <p className="text-xs text-blue-400 mt-1">{projectName} · {stageName}</p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {PRE_SAFETY_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-4 ${
                checked.has(item.id)
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-blue-900/5 border-blue-800/30'
              }`}
            >
              <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 ${
                checked.has(item.id) ? 'bg-emerald-500 border-emerald-500' : 'border-blue-700'
              }`}>
                {checked.has(item.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
              <span className="text-sm font-bold">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="fixed bottom-0 inset-x-0 bg-[#060B15]/95 p-6 border-t border-blue-900/50">
        <button
          onClick={onComplete}
          disabled={!done}
          className={`w-full py-4 rounded-2xl font-black text-lg transition-all ${
            done ? 'bg-[#FF5F15] text-white' : 'bg-blue-900/20 text-blue-800 cursor-not-allowed'
          }`}
        >
          {done ? `Begin ${stageName}` : 'Confirm All Safety Items'}
        </button>
      </div>
    </div>
  )
}

// ─── Evidence panel ───────────────────────────────────────────────────────────

function EvidencePanel({
  evidence,
  note,
  onNoteChange,
  onAddPhoto,
  onAddVideo,
  isFail,
  failNeedsEvidence,
}: {
  evidence: LocalEvidenceItem[]
  note: string
  onNoteChange: (note: string) => void
  onAddPhoto: (file: File) => void
  onAddVideo: (file: File) => void
  isFail: boolean
  failNeedsEvidence: boolean
}) {
  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const photos = evidence.filter(e => e.kind === 'photo')
  const video  = evidence.find(e => e.kind === 'video')

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onAddPhoto(file)
    e.target.value = ''
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onAddVideo(file)
    e.target.value = ''
  }

  return (
    <div className="mt-4 pt-4 border-t border-white/8 space-y-4">

      {/* Fail gate warning */}
      {isFail && failNeedsEvidence && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <span className="text-xs text-red-400 font-semibold">Fail requires at least one photo or note.</span>
        </div>
      )}

      {/* Photos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">
            Photos {photos.length > 0 && `(${photos.length}/4)`}
          </span>
          {photos.length < 4 && (
            <button
              onClick={() => photoInputRef.current?.click()}
              className="flex items-center gap-1 text-[11px] font-bold text-[#FF5F15] hover:opacity-80 transition-opacity"
            >
              <ImagePlus className="w-3.5 h-3.5" /> Add Photo
            </button>
          )}
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoChange}
        />
        {photos.length === 0 ? (
          <button
            onClick={() => photoInputRef.current?.click()}
            className="w-full h-16 border border-dashed border-blue-800/40 rounded-xl flex items-center justify-center gap-2 text-blue-600 bg-blue-900/5 hover:bg-blue-900/10 transition-all"
          >
            <Camera className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Capture Photo</span>
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {photos.map(ev => (
              <div
                key={ev.id}
                className="aspect-square rounded-lg bg-blue-900/20 border border-blue-800/30 flex flex-col items-center justify-center p-1 overflow-hidden"
              >
                <Camera className="w-4 h-4 text-blue-500 mb-1" />
                <span className="text-[9px] text-blue-500 text-center truncate w-full text-center leading-tight">
                  {ev.fileName ?? 'photo'}
                </span>
                {ev.offlineCapture && (
                  <span className="text-[8px] text-amber-400 mt-0.5">No GPS</span>
                )}
              </div>
            ))}
            {photos.length < 4 && (
              <button
                onClick={() => photoInputRef.current?.click()}
                className="aspect-square rounded-lg border border-dashed border-blue-800/40 flex items-center justify-center text-blue-700 hover:text-blue-500 hover:border-blue-600 transition-all"
              >
                <ImagePlus className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Video */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Video</span>
          {!video && (
            <button
              onClick={() => videoInputRef.current?.click()}
              className="flex items-center gap-1 text-[11px] font-bold text-[#FF5F15] hover:opacity-80 transition-opacity"
            >
              <Video className="w-3.5 h-3.5" /> Add Video
            </button>
          )}
        </div>
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          className="hidden"
          onChange={handleVideoChange}
        />
        {video ? (
          <div className="flex items-center gap-3 bg-blue-900/20 border border-blue-800/30 rounded-xl px-3 py-2.5">
            <Video className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white truncate">{video.fileName ?? 'video'}</div>
              <div className="text-[10px] text-blue-500">
                {video.fileSize ? `${(video.fileSize / 1024 / 1024).toFixed(1)} MB` : ''}
                {video.offlineCapture ? ' · No GPS' : ''}
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => videoInputRef.current?.click()}
            className="w-full h-12 border border-dashed border-blue-800/40 rounded-xl flex items-center justify-center gap-2 text-blue-600 bg-blue-900/5 hover:bg-blue-900/10 transition-all"
          >
            <Video className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Record Video</span>
          </button>
        )}
      </div>

      {/* Notes */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <FileText className="w-3 h-3 text-blue-400" />
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">
            Notes {isFail && !note.trim() && photos.length === 0 && !video ? '(required)' : ''}
          </span>
        </div>
        <textarea
          value={note}
          onChange={e => onNoteChange(e.target.value)}
          placeholder="Field notes — observations, measurements, deficiency description…"
          rows={3}
          className="w-full bg-blue-950/40 border border-blue-800/40 rounded-xl px-3 py-2.5 text-xs text-white placeholder-blue-800 focus:outline-none focus:border-[#FF5F15] resize-none transition-all"
        />
      </div>
    </div>
  )
}

// ─── Checklist item row ───────────────────────────────────────────────────────

function ChecklistItemRow({
  label,
  description,
  result,
  onSetResult,
  evidence,
  note,
  onNoteChange,
  onAddPhoto,
  onAddVideo,
  isExpanded,
  onToggleExpand,
  failNeedsEvidence,
}: {
  label: string
  description?: string
  result: ChecklistResult
  onSetResult: (r: ChecklistResult) => void
  evidence: LocalEvidenceItem[]
  note: string
  onNoteChange: (note: string) => void
  onAddPhoto: (file: File) => void
  onAddVideo: (file: File) => void
  isExpanded: boolean
  onToggleExpand: () => void
  failNeedsEvidence: boolean
}) {
  const isFail = result === 'fail'
  const evidenceCount = evidence.length + (note.trim() ? 1 : 0)

  return (
    <div className={`rounded-xl border transition-all ${
      result === 'pass' ? 'bg-emerald-500/10 border-emerald-500/30' :
      isFail && failNeedsEvidence ? 'bg-red-500/10 border-red-500/40' :
      isFail ? 'bg-red-500/10 border-red-500/20' :
      result === 'na'   ? 'bg-blue-900/20 border-blue-700/30' :
                          'bg-blue-900/5 border-blue-800/30'
    }`}>
      {/* Item header — click to expand */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">{label}</div>
            {description && !isExpanded && (
              <div className="text-xs text-blue-400 mt-0.5 line-clamp-1">{description}</div>
            )}
            {description && isExpanded && (
              <div className="text-xs text-blue-400 mt-0.5 leading-relaxed">{description}</div>
            )}
          </div>
          <button
            onClick={onToggleExpand}
            className="shrink-0 w-7 h-7 rounded-lg bg-blue-900/30 flex items-center justify-center text-blue-500 hover:text-blue-300 hover:bg-blue-900/50 transition-all"
          >
            {isExpanded
              ? <ChevronUp className="w-3.5 h-3.5" />
              : <ChevronDown className="w-3.5 h-3.5" />
            }
          </button>
        </div>

        {/* Evidence count badge */}
        {evidenceCount > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Camera className="w-3 h-3 text-blue-500" />
            <span className="text-[10px] text-blue-500">{evidenceCount} evidence item{evidenceCount !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Pass / Fail / N/A */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onSetResult(result === 'pass' ? 'pending' : 'pass')}
            className={`flex-1 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              result === 'pass'
                ? 'bg-emerald-500 text-white'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Pass
          </button>
          <button
            onClick={() => onSetResult(result === 'fail' ? 'pending' : 'fail')}
            className={`flex-1 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              isFail
                ? 'bg-red-500 text-white'
                : 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" /> Fail
          </button>
          <button
            onClick={() => onSetResult(result === 'na' ? 'pending' : 'na')}
            className={`flex-1 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              result === 'na'
                ? 'bg-blue-500 text-white'
                : 'bg-blue-900/30 border border-blue-800/30 text-blue-400 hover:bg-blue-900/50'
            }`}
          >
            <Minus className="w-3.5 h-3.5" /> N/A
          </button>
        </div>
      </div>

      {/* Evidence panel — visible when expanded */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <EvidencePanel
            evidence={evidence}
            note={note}
            onNoteChange={onNoteChange}
            onAddPhoto={onAddPhoto}
            onAddVideo={onAddVideo}
            isFail={isFail}
            failNeedsEvidence={failNeedsEvidence}
          />
        </div>
      )}
    </div>
  )
}

// ─── Job meta ─────────────────────────────────────────────────────────────────

interface JobMeta {
  projectId: string
  projectName: string
  address: string
  city: string
  permitNumber?: string
  discipline?: string
  region?: string
  builderId?: string
  builderName?: string
  stage: number
  stageName: string
}

function createRuntimeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

function createCertRef() {
  const year = new Date().getFullYear()
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 4).toUpperCase()
  return `SL-C-${year}-${suffix}`
}

// ─── Active inspection ────────────────────────────────────────────────────────

export default function ActiveInspectionPage() {
  const params   = useParams()
  const router   = useRouter()
  const jobId    = params.id as string
  const store    = useStore()
  const { user } = useAuth()
  const storeJob = useMemo(() => store.jobs.find(j => j.id === jobId), [jobId, store.jobs])

  const [preSafetyDone, setPreSafetyDone] = useState(false)
  const [remoteJob, setRemoteJob]         = useState<JobMeta | null | undefined>(undefined)
  const [checklistState, setChecklistState] = useState<Record<string, ChecklistResult>>({})
  const [evidenceItems, setEvidenceItems]   = useState<LocalEvidenceItem[]>([])
  const [itemNotes, setItemNotes]           = useState<Record<string, string>>({})
  const [expandedItems, setExpandedItems]   = useState<Set<string>>(new Set())
  const [isSealing, setIsSealing]           = useState(false)
  const [sealApplied, setSealApplied]       = useState(false)
  const [certRef, setCertRef]               = useState('')
  const [sealedAt, setSealedAt]             = useState('')
  const [sealResult, setSealResult]         = useState<'pass' | 'fail'>('pass')

  // ── Hold workflow state ──
  const [holdMode, setHoldMode]               = useState(false)
  const [holdReason, setHoldReason]           = useState('')
  const [holdChecklistItems, setHoldChecklistItems] = useState<string[]>([])
  const [isPlacingHold, setIsPlacingHold]     = useState(false)
  const [activeHold, setActiveHold]           = useState<HoldRecord | null>(null)
  const [holdApproved, setHoldApproved]       = useState(false)
  const [retentionActive, setRetentionActive] = useState(false)

  // Load real job data — store first, then Supabase fallback
  useEffect(() => {
    if (storeJob) return

    supabase
      .from('job_opportunities')
      .select('project_id, project_name, address, city, permit_number, required_discipline, region, builder_id, builder_name, stage, stage_name')
      .eq('id', jobId)
      .single()
      .then(({ data }) => {
        if (data) {
          const row = data as Record<string, unknown>
          setRemoteJob({
            projectId:   (row.project_id as string) ?? jobId,
            projectName: row.project_name as string,
            address:     row.address as string,
            city:        (row.city as string) ?? 'Vancouver',
            permitNumber: (row.permit_number as string) ?? undefined,
            discipline:   (row.required_discipline as string) ?? undefined,
            region:       (row.region as string) ?? undefined,
            builderId:    (row.builder_id as string) ?? undefined,
            builderName:  (row.builder_name as string) ?? undefined,
            stage:       row.stage as number,
            stageName:   row.stage_name as string,
          })
        } else {
          setRemoteJob(null)
        }
      })
  }, [jobId, storeJob])

  const job = storeJob
    ? {
        projectId:   storeJob.projectId,
        projectName: storeJob.projectName,
        address:     storeJob.address,
        city:        storeJob.city,
        permitNumber: storeJob.permitNumber,
        discipline:   storeJob.requiredDiscipline,
        region:       storeJob.region,
        builderId:    storeJob.builderId,
        builderName:  storeJob.builderName,
        stage:       storeJob.stage,
        stageName:   storeJob.stageName,
      }
    : remoteJob ?? null
  const loading = !storeJob && remoteJob === undefined

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060B15] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF5F15]/30 border-t-[#FF5F15] rounded-full animate-spin" />
      </div>
    )
  }

  const projectName = job?.projectName ?? 'Inspection'
  const projectId   = job?.projectId   ?? jobId
  const city        = job?.city        ?? 'Vancouver'
  const address     = job?.address     ?? ''
  const permitNumber = job?.permitNumber
  const discipline   = job?.discipline
  const region       = job?.region
  const builderId    = job?.builderId
  const builderName  = job?.builderName
  const stage       = job?.stage       ?? 1
  const stageName   = job?.stageName   ?? 'Stage 1'

  if (!preSafetyDone) {
    return (
      <PreSafetyGate
        projectName={projectName}
        stageName={stageName}
        onComplete={() => setPreSafetyDone(true)}
      />
    )
  }

  const stageData = INSPECTION_STAGES.find(s => s.id === stage)
  const items     = stageData?.items ?? []

  const setResult = (itemId: string, result: ChecklistResult) => {
    setChecklistState(prev => ({ ...prev, [itemId]: result }))
  }

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId)
      return next
    })
  }

  const handleAddPhoto = async (checklistItemId: string, file: File) => {
    const { lat, lng, offlineCapture } = await captureGPS()
    const ev: LocalEvidenceItem = {
      id:              createRuntimeId('ev'),
      checklistItemId,
      kind:            'photo',
      capturedAt:      new Date().toISOString(),
      lat,
      lng,
      offlineCapture,
      fileName:        file.name,
      fileSize:        file.size,
      uploaderId:      user?.supabaseId ?? user?.id ?? 'unknown',
    }
    setEvidenceItems(prev => [...prev, ev])
  }

  const handleAddVideo = async (checklistItemId: string, file: File) => {
    const { lat, lng, offlineCapture } = await captureGPS()
    const ev: LocalEvidenceItem = {
      id:              createRuntimeId('ev'),
      checklistItemId,
      kind:            'video',
      capturedAt:      new Date().toISOString(),
      lat,
      lng,
      offlineCapture,
      fileName:        file.name,
      fileSize:        file.size,
      uploaderId:      user?.supabaseId ?? user?.id ?? 'unknown',
    }
    setEvidenceItems(prev => [...prev, ev])
  }

  // ── Hold placement ──
  const failedItemIds = items
    .filter(item => checklistState[item.id] === 'fail')
    .map(item => item.id)

  const handlePlaceHold = async () => {
    if (!holdReason.trim()) return
    setIsPlacingHold(true)

    const storeJob = store.jobs.find(j => j.id === jobId)
    const tier: DispatchTier = storeJob?.dispatchTier ?? 'standard'
    const inspectorId = user?.supabaseId ?? user?.id ?? 'unknown'
    const builderId = storeJob?.builderId ?? ''

    const result = await store.placeHoldPoint(
      jobId, inspectorId, builderId, tier,
      holdReason, holdChecklistItems.length > 0 ? holdChecklistItems : failedItemIds,
    )

    if (result.ok) {
      setActiveHold(result.value)
      setHoldMode(false)
    }
    setIsPlacingHold(false)
  }

  const handleRetentionComplete = () => {
    setRetentionActive(false)
    setHoldApproved(false)
    setActiveHold(null)
    // Reset all fail items to pending so inspector can re-inspect
    const failIds = items.filter(item => checklistState[item.id] === 'fail').map(item => item.id)
    setChecklistState(prev => {
      const next = { ...prev }
      failIds.forEach(id => { next[id] = 'pending' })
      return next
    })
  }

  // Determine which fail items have no evidence
  const failItemsMissingEvidence = items.filter(item => {
    if (checklistState[item.id] !== 'fail') return false
    const hasMedia = evidenceItems.some(e => e.checklistItemId === item.id)
    const hasNote  = (itemNotes[item.id] ?? '').trim().length > 0
    return !hasMedia && !hasNote
  })

  const reviewed = items.filter(item => {
    const r = checklistState[item.id]
    return r !== undefined && r !== 'pending'
  }).length
  const hasOpenHold = activeHold !== null && activeHold.status === 'open'
  const allDone = items.length > 0
    && items.every(item => {
        const r = checklistState[item.id]
        return r !== undefined && r !== 'pending'
      })
    && failItemsMissingEvidence.length === 0
    && !hasOpenHold
  const hasFails = items.some(item => checklistState[item.id] === 'fail')
  console.log('SEAL DEBUG allDone:', allDone, '| reviewed:', reviewed, '/ items:', items.length, '| failsMissingEvidence:', failItemsMissingEvidence.length)

  const handleSeal = async () => {
    console.log('HANDLE SEAL CALLED')
    setIsSealing(true)

    const passItems  = items.filter(item => checklistState[item.id] === 'pass').length
    const failItems  = items.filter(item => checklistState[item.id] === 'fail').length
    const result     = failItems > 0 ? 'fail' : 'pass'
    const completedAt = new Date().toISOString()
    const certRef    = createCertRef()
    const inspectorName = user?.name ?? 'Inspector'
    const inspectorId   = user?.supabaseId ?? user?.id ?? 'unknown'
    const normalizedCity = city.split(',')[0]?.trim() ?? city
    const jurisdictionName = normalizedCity ? `City of ${normalizedCity}` : undefined
    const jurisdictionId = normalizedCity ? normalizedCity.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined

    // Build note evidence items from itemNotes
    const noteEvidenceItems: LocalEvidenceItem[] = Object.entries(itemNotes)
      .filter(([, text]) => text.trim().length > 0)
      .map(([checklistItemId, text]) => ({
        id:              createRuntimeId(`ev-note-${checklistItemId}`),
        checklistItemId,
        kind:            'note' as const,
        capturedAt:      completedAt,
        offlineCapture:  false,
        notes:           text.trim(),
        uploaderId:      inspectorId,
      }))

    const allEvidence = [...evidenceItems, ...noteEvidenceItems]

    // Map to domain EvidenceItem for the completed record
    const domainEvidence: DomainEvidenceItem[] = allEvidence.map(e => ({
      id:               e.id,
      projectId,
      kind:             e.kind === 'note' ? 'voice_note' : e.kind,
      captureTimestamp: e.capturedAt,
      uploadedBy:       e.uploaderId,
      notes:            e.notes,
      originalFilename: e.fileName,
      geo:              e.lat !== undefined ? { lat: e.lat, lng: e.lng! } : undefined,
      validationState:  'pending' as const,
      createdAt:        e.capturedAt,
      updatedAt:        e.capturedAt,
      metadata: {
        checklistItemId: e.checklistItemId,
        offlineCapture:  e.offlineCapture,
        fileSize:        e.fileSize,
      },
    }))

    const record = {
      id:             createRuntimeId(`${jobId}-seal`),
      projectId,
      projectName,
      address,
      city,
      stage,
      stageName,
      result:         result as 'pass' | 'fail',
      evidenceItems:  domainEvidence,
      completedAt,
      builderId,
      builderName,
      inspectorId,
      inspectorName,
      inspectorLicense: user?.licenseNumber ?? '',
      passItems,
      failItems,
      certRef,
      jobRef:  jobId,
      permitNumber,
      discipline,
      region,
      jurisdictionId,
      jurisdictionName,
      authorityName: jurisdictionName,
      sealed:  true,
      checklistResults: items.map(item => ({
        itemId:  item.id,
        label:   item.label,
        result:  checklistState[item.id] ?? 'pending',
        note:    evidenceItems.find(e => e.checklistItemId === item.id && e.kind === 'note')?.notes ?? undefined,
      })),
    }

    await saveCompletedInspection(record)

    await updateJobStatus(
      jobId,
      'completed',
      inspectorId,
      'inspector',
      'Inspector sealed report',
      'in_progress'
    )

    setCertRef(certRef)
    setSealedAt(completedAt)
    setSealResult(result)
    setSealApplied(true)
    setIsSealing(false)
  }

  // ── Completion screen ────────────────────────────────────────────────────────
  if (sealApplied) {
    const formattedDate = sealedAt
      ? new Date(sealedAt).toLocaleString('en-CA', {
          timeZone: 'America/Vancouver',
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : '—'

    return (
      <div className="min-h-screen bg-[#060B15] text-white">
        <Navbar role="inspector" dark />
        <div className="max-w-2xl mx-auto px-4 py-12">

          {/* Big checkmark + title */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-5">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-black mb-2">Inspection Complete</h1>
            <p className="text-sm text-blue-400 max-w-sm leading-relaxed">
              Your sealed report has been submitted to Vero for Admin review.
            </p>
          </div>

          {/* Report summary card */}
          <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-5 mb-5">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-4">Report Summary</div>

            {/* Cert ref — prominent */}
            <div className="flex items-center justify-between bg-blue-950/60 border border-blue-800/50 rounded-xl px-4 py-3 mb-4">
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Certificate Reference</div>
              <div className="font-mono font-black text-[#FF5F15] text-sm">{certRef}</div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Tag className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Project</div>
                  <div className="text-sm font-bold">{projectName}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Address</div>
                  <div className="text-sm">{address}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Stage</div>
                  <div className="text-sm">{stageName}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Result</div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black ${
                    sealResult === 'pass'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/15 text-red-400 border border-red-500/30'
                  }`}>
                    {sealResult === 'pass' ? 'Pass' : 'Fail'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Completed At</div>
                  <div className="text-sm">{formattedDate}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Inspector</div>
                  <div className="text-sm">{user?.name ?? 'Inspector'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* What happens next */}
          <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-5 mb-8">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-4">What Happens Next</div>
            <div className="space-y-3">
              {[
                'Admin reviews the sealed package — typically within 1 business day',
                'Once approved, the authority-ready PDF is released to the city auditor',
                'Escrow funds will be released to your account upon admin approval',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#FF5F15]/15 border border-[#FF5F15]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-black text-[#FF5F15]">{i + 1}</span>
                  </div>
                  <p className="text-sm text-blue-300 leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/vault')}
              className="w-full py-4 bg-blue-900/20 border border-blue-700/40 rounded-2xl text-white font-black flex items-center justify-center gap-2 hover:bg-blue-900/30 transition-all"
            >
              <ExternalLink className="w-4 h-4" /> View in Vault
            </button>
            <button
              onClick={() => router.push('/inspector')}
              className="w-full py-4 bg-[#FF5F15] rounded-2xl text-white font-black flex items-center justify-center gap-2 hover:bg-[#e55513] transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Live Board
            </button>
          </div>

        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#060B15] text-white pb-40">
      <Navbar role="inspector" dark />
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-5 mb-6 flex justify-between items-start gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-black truncate">{projectName}</h1>
            <p className="text-sm text-blue-400 mt-0.5">
              {address}{address && city ? ', ' : ''}{city} · Stage {stage}: {stageName}
            </p>
          </div>
          <div className="bg-blue-950 border border-blue-800 rounded-xl px-3 py-2 flex items-center gap-2 shrink-0">
            <Timer className="w-4 h-4 text-[#FF5F15]" />
            <span className="font-mono font-black text-sm">In Progress</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex justify-between text-xs text-blue-500 mb-1.5">
            <span>{reviewed} / {items.length} items reviewed</span>
            {hasFails && failItemsMissingEvidence.length > 0 && (
              <span className="text-red-400">{failItemsMissingEvidence.length} fail item{failItemsMissingEvidence.length !== 1 ? 's' : ''} need evidence</span>
            )}
          </div>
          <div className="h-1.5 bg-blue-900/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#FF5F15] rounded-full transition-all"
              style={{ width: `${items.length > 0 ? (reviewed / items.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* ── Active Hold Banner ── */}
        {activeHold && !holdApproved && !retentionActive && (
          <div className="mb-5 bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                <PauseCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="font-bold text-red-300 text-sm">Hold Point Active</div>
                <div className="text-xs text-red-400/70">Awaiting builder response — correction or decline</div>
              </div>
            </div>
            <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-3 mb-3">
              <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Reason</div>
              <div className="text-sm text-red-200">{activeHold.reason}</div>
            </div>
            <div className="text-xs text-red-400/60">
              Hold placed {new Date(activeHold.placedAt).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Vancouver' })} · Expires {new Date(activeHold.expiresAt).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Vancouver' })}
            </div>
            {/* Demo: simulate builder approval for dev flow */}
            <button
              onClick={() => setHoldApproved(true)}
              className="mt-3 w-full py-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-bold hover:bg-amber-500/25 transition-all"
            >
              Simulate Builder Approval (Dev)
            </button>
          </div>
        )}

        {/* ── Retention Timer (shows after builder approves hold) ── */}
        {holdApproved && !retentionActive && (
          <div className="mb-5">
            <RetentionTimer
              hourlyRate={RETENTION_RATES[store.jobs.find(j => j.id === jobId)?.dispatchTier ?? 'standard']}
              onComplete={() => handleRetentionComplete()}
              onCancel={() => { setHoldApproved(false); setActiveHold(null) }}
            />
          </div>
        )}

        {/* ── Hold Placement Form ── */}
        {holdMode && !activeHold && (
          <div className="mb-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <PauseCircle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="font-bold text-amber-300 text-sm">Place Hold Point</div>
                <div className="text-xs text-amber-500">Pause inspection — notify builder for on-site correction</div>
              </div>
            </div>

            {/* Failed items selection */}
            {failedItemIds.length > 0 && (
              <div className="mb-4">
                <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Failed Checklist Items</div>
                <div className="space-y-1.5">
                  {items.filter(item => checklistState[item.id] === 'fail').map(item => (
                    <label key={item.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10 transition-all">
                      <input
                        type="checkbox"
                        checked={holdChecklistItems.includes(item.id)}
                        onChange={e => {
                          if (e.target.checked) setHoldChecklistItems(prev => [...prev, item.id])
                          else setHoldChecklistItems(prev => prev.filter(id => id !== item.id))
                        }}
                        className="accent-amber-500 shrink-0"
                      />
                      <span className="text-xs text-amber-200">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Hold reason */}
            <div className="mb-4">
              <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1.5">Hold Reason</div>
              <textarea
                value={holdReason}
                onChange={e => setHoldReason(e.target.value)}
                placeholder="Describe the issue requiring correction..."
                rows={3}
                className="w-full bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2.5 text-xs text-amber-100 placeholder-amber-600 focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>

            {/* Premium rate notice */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-center gap-3">
              <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-xs text-amber-300">
                If approved, builder will be charged <span className="font-bold">${RETENTION_RATES[store.jobs.find(j => j.id === jobId)?.dispatchTier ?? 'standard']}/hr</span> premium retention rate via escrow.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePlaceHold}
                disabled={!holdReason.trim() || isPlacingHold}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 rounded-xl text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPlacingHold ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Placing Hold...</>
                ) : (
                  <><PauseCircle className="w-4 h-4" /> Place Hold Point</>
                )}
              </button>
              <button
                onClick={() => { setHoldMode(false); setHoldReason(''); setHoldChecklistItems([]) }}
                className="px-4 bg-white/5 border border-white/10 text-muted text-xs font-semibold rounded-xl hover:bg-white/8 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Checklist */}
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 text-blue-600 text-sm">
              No checklist items found for Stage {stage}
            </div>
          ) : (
            items.map(item => (
              <ChecklistItemRow
                key={item.id}
                label={item.label}
                description={item.description}
                result={checklistState[item.id] ?? 'pending'}
                onSetResult={r => setResult(item.id, r)}
                evidence={evidenceItems.filter(e => e.checklistItemId === item.id)}
                note={itemNotes[item.id] ?? ''}
                onNoteChange={text => setItemNotes(prev => ({ ...prev, [item.id]: text }))}
                onAddPhoto={file => handleAddPhoto(item.id, file)}
                onAddVideo={file => handleAddVideo(item.id, file)}
                isExpanded={expandedItems.has(item.id)}
                onToggleExpand={() => toggleExpand(item.id)}
                failNeedsEvidence={failItemsMissingEvidence.some(fi => fi.id === item.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 inset-x-0 bg-[#060B15]/95 p-5 border-t border-blue-900/50 flex gap-3">
        <button
          onClick={() => setHoldMode(true)}
          disabled={holdMode || !!activeHold}
          className={`flex-1 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
            activeHold
              ? 'bg-red-500/20 border border-red-500/40 text-red-400 cursor-not-allowed'
              : 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/15'
          }`}
        >
          <PauseCircle className="w-4 h-4" /> {activeHold ? 'Hold Active' : 'Raise Hold Point'}
        </button>
        <button
          disabled={!allDone || isSealing || sealApplied}
          onClick={() => {
            console.log('SEAL CLICKED allDone:', allDone)
            handleSeal()
          }}
          className={`flex-1 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
            sealApplied
              ? 'bg-emerald-500 text-white'
              : allDone && !isSealing
                ? 'bg-[#FF5F15] text-white hover:bg-[#e55513]'
                : 'bg-blue-900/20 border border-blue-800/30 text-blue-800 cursor-not-allowed'
          }`}
        >
          {sealApplied ? (
            <>
              <CheckCircle2 className="w-4 h-4" /> Report Sealed
            </>
          ) : isSealing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sealing…
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              {allDone
                ? 'Seal & Submit'
                : failItemsMissingEvidence.length > 0
                  ? `${failItemsMissingEvidence.length} fail item${failItemsMissingEvidence.length !== 1 ? 's' : ''} need evidence`
                  : `${items.length - reviewed} item${items.length - reviewed !== 1 ? 's' : ''} remaining`
              }
            </>
          )}
        </button>
      </div>
    </div>
  )
}
