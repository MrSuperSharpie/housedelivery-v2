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
import { insertCompletedRecordStrict } from '@/lib/supabase/compliance'
import { updateJobStatus } from '@/lib/supabase/jobs'
import type {
  ChecklistResult,
  HoldCategory,
  HoldEvidenceType,
  HoldResolution,
} from '@/lib/types'
import { RetentionTimer } from '@/components/inspector/RetentionTimer'
import type { HoldRecord, DispatchTier } from '@/lib/types'
import type { EvidenceItem as DomainEvidenceItem } from '@/lib/domain/types'
import {
  addHoldEvidence,
  getLatestOpenHoldForJob,
  listHoldDetailsForJob,
  resolveHold,
} from '@/lib/supabase/holds'
import { isHoldOpenStatus } from '@/lib/holds/workflow'
import { buildHoldEvidenceItems, buildHoldHistorySummary } from '@/lib/holds/reporting'
import {
  resolveHoldBaseRate,
  BASE_HOLD_SERVICE_FEE_MULTIPLIER,
} from '@/lib/pricing/config'
import { calculateBaseHoldServiceFee } from '@/utils/pricing'

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
  onHold,
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
  onHold?: () => void
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

        {/* Pass / Fail / N/A / Hold */}
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
          <button
            onClick={onHold}
            disabled={!onHold}
            className={`flex-1 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              onHold
                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                : 'bg-amber-900/10 border border-amber-900/20 text-amber-700 cursor-not-allowed'
            }`}
          >
            <PauseCircle className="w-3.5 h-3.5" /> Hold
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
  return `VERO-IC-${year}-${suffix}`
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
  const [holdDeficiencyReason, setHoldDeficiencyReason] = useState('')
  const [holdCategory, setHoldCategory]       = useState<HoldCategory>('minor_deficiency')
  const [holdSameDayEligible, setHoldSameDayEligible] = useState(true)
  const [holdNotes, setHoldNotes]             = useState('')
  const [holdChecklistItems, setHoldChecklistItems] = useState<string[]>([])
  const [holdEvidenceItems, setHoldEvidenceItems] = useState<PendingHoldEvidenceItem[]>([])
  const [holdEvidenceWarning, setHoldEvidenceWarning] = useState<string | null>(null)
  const [isPlacingHold, setIsPlacingHold]     = useState(false)
  const [activeHold, setActiveHold]           = useState<HoldRecord | null>(null)
  const [holdResolutionNotes, setHoldResolutionNotes] = useState('')
  const [correctionNote, setCorrectionNote]   = useState('')
  const [savingCorrectionNote, setSavingCorrectionNote] = useState(false)
  const [resolvingHold, setResolvingHold]     = useState<HoldResolution | null>(null)
  const [holdElapsedSeconds, setHoldElapsedSeconds] = useState(0)
  const holdPhotoInputRef = useRef<HTMLInputElement>(null)
  const holdVideoInputRef = useRef<HTMLInputElement>(null)
  const holdAttachmentInputRef = useRef<HTMLInputElement>(null)

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
  const holdPricingDetails = resolveHoldBaseRate({
    pricingMode: storeJob?.pricingMode,
    specialistRole: storeJob?.specialistRole,
    discipline: storeJob?.requiredDiscipline ?? job?.discipline,
    credentialClass: storeJob?.credentialClass,
    inspectionType: storeJob?.inspectionType,
    requiresProfessionalSeal: storeJob?.requiresProfessionalSeal,
    requiresCP: storeJob?.requiresCP,
  })
  const holdBaseRate = holdPricingDetails.baseRate
  const holdPricingLabel = holdPricingDetails.label
  const hasOpenHold = activeHold !== null && isHoldOpenStatus(activeHold.status)
  const baseHoldServiceFee = calculateBaseHoldServiceFee(holdBaseRate)
  const holdMissingFields = [
    !holdReason.trim() ? 'deficiency summary' : null,
    !holdDeficiencyReason.trim() ? 'required correction' : null,
  ].filter(Boolean) as string[]
  const openHoldForm = () => {
    setHoldMode(true)
    setHoldSameDayEligible(true)
  }

  useEffect(() => {
    let cancelled = false

    async function loadActiveHold() {
      const openHold = await getLatestOpenHoldForJob(jobId)
      if (!cancelled && openHold) {
        setActiveHold(openHold)
      }
    }

    void loadActiveHold()

    return () => {
      cancelled = true
    }
  }, [jobId])

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
    if (
      !holdReason.trim()
      || !holdDeficiencyReason.trim()
      || holdChecklistItems.length === 0
      || holdBaseRate <= 0
    ) return

    setIsPlacingHold(true)
    setHoldEvidenceWarning(null)

    const storeJob = store.jobs.find(j => j.id === jobId)
    const tier: DispatchTier = storeJob?.dispatchTier ?? 'standard'
    const inspectorId = user?.supabaseId ?? user?.id ?? 'unknown'
    const builderId = storeJob?.builderId ?? ''

    const result = await store.placeHoldPoint({
      jobId,
      inspectorId,
      builderId,
      tier,
      reason: holdReason,
      deficiencyReason: holdDeficiencyReason,
      checklistItemIds: holdChecklistItems.length > 0 ? holdChecklistItems : failedItemIds,
      affectedItemSummaries: items
        .filter(item => (holdChecklistItems.length > 0 ? holdChecklistItems : failedItemIds).includes(item.id))
        .map(item => item.label),
      holdCategory,
      holdEligibleForOnSiteCorrection: holdSameDayEligible,
      premiumRateAmount: holdBaseRate,
      notes: holdNotes,
      relatedInspectionId: jobId,
    })

    if (result.ok) {
      const actorId = user?.supabaseId ?? user?.id ?? ''
      let failedEvidenceCount = 0

      if (actorId && holdEvidenceItems.length > 0) {
        for (const evidence of holdEvidenceItems) {
          const attached = await addHoldEvidence({
            holdId: result.value.id,
            jobId,
            createdByUserId: actorId,
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
      }

      if (failedEvidenceCount > 0) {
        setHoldEvidenceWarning(
          `${failedEvidenceCount} hold evidence item${failedEvidenceCount === 1 ? '' : 's'} could not be attached. You can still continue, but add any missing support after the hold is created.`
        )
      }

      setActiveHold(result.value)
      setHoldMode(false)
      setHoldReason('')
      setHoldDeficiencyReason('')
      setHoldChecklistItems([])
      setHoldNotes('')
      setHoldSameDayEligible(true)
      setHoldEvidenceItems([])
    }
    setIsPlacingHold(false)
  }

  const queueHoldEvidence = async (
    file: File,
    evidenceType: Extract<HoldEvidenceType, 'photo' | 'video' | 'attachment'>,
  ) => {
    const { lat, lng, offlineCapture } = await captureGPS()
    setHoldEvidenceItems(prev => [
      ...prev,
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
    setHoldEvidenceItems(prev => prev.filter(item => item.id !== evidenceId))
  }

  const handleRetentionComplete = () => {
    const failIds = items.filter(item => checklistState[item.id] === 'fail').map(item => item.id)
    setChecklistState(prev => {
      const next = { ...prev }
      failIds.forEach(id => { next[id] = 'pending' })
      return next
    })
  }

  const handleAddCorrectionNote = async () => {
    if (!activeHold || !correctionNote.trim()) return
    const actorId = user?.supabaseId ?? user?.id ?? ''
    if (!actorId) return

    setSavingCorrectionNote(true)
    await addHoldEvidence({
      holdId: activeHold.id,
      jobId: activeHold.jobId,
      createdByUserId: actorId,
      evidenceRole: 'correction',
      evidenceType: 'note',
      noteText: correctionNote.trim(),
      capturedAt: new Date().toISOString(),
    })
    setCorrectionNote('')
    setSavingCorrectionNote(false)
  }

  const handleResolveHold = async (resolution: HoldResolution) => {
    if (!activeHold || !holdResolutionNotes.trim()) return

    const actorId = user?.supabaseId ?? user?.id ?? ''
    if (!actorId) return

    setResolvingHold(resolution)
    const resolved = await resolveHold({
      holdId: activeHold.id,
      actorId,
      actorRole: 'inspector',
      resolution,
      technicalResolved: true,
      resolutionNotes: holdResolutionNotes.trim(),
      elapsedSeconds: holdElapsedSeconds,
    })

    if (resolved) {
      setActiveHold(resolved)
      if (resolution === 'pass') {
        handleRetentionComplete()
      }
    }
    setResolvingHold(null)
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
    const latestOpenHold = await getLatestOpenHoldForJob(jobId)
    if (latestOpenHold) {
      setActiveHold(latestOpenHold)
      return
    }
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
    const holdDetails = await listHoldDetailsForJob(jobId)
    const holdHistory = buildHoldHistorySummary(holdDetails)
    const holdEvidenceItems = buildHoldEvidenceItems(holdDetails, projectId)
    const combinedEvidence = [...domainEvidence, ...holdEvidenceItems]

    const record = {
      id:             createRuntimeId(`${jobId}-seal`),
      projectId,
      projectName,
      address,
      city,
      stage,
      stageName,
      result:         result as 'pass' | 'fail',
      evidenceItems:  combinedEvidence,
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
      holdId: activeHold?.id,
      holdHistory,
      checklistResults: items.map(item => ({
        itemId:  item.id,
        label:   item.label,
        result:  checklistState[item.id] ?? 'pending',
        note:    evidenceItems.find(e => e.checklistItemId === item.id && e.kind === 'note')?.notes ?? undefined,
      })),
    }

    const insertResult = await insertCompletedRecordStrict(record)
    if (!insertResult.ok) {
      console.error('handleSeal insertCompletedRecordStrict:', insertResult.error)
      if (typeof window !== 'undefined' && insertResult.error) {
        window.alert(insertResult.error)
      }
      setIsSealing(false)
      return
    }

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
        {activeHold && isHoldOpenStatus(activeHold.status) && (
          <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <PauseCircle className="w-5 h-5 text-amber-300" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-bold text-amber-200 text-sm">Hold / Site Retainer</div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                    activeHold.status === 'hold_active'
                      ? 'bg-amber-500/30 text-amber-200'
                      : 'bg-amber-900/50 text-amber-400'
                  }`}>
                    {activeHold.status === 'hold_active' ? 'Active — Builder Accepted' : 'Awaiting Builder Response'}
                  </span>
                </div>
                <div className="text-xs text-amber-100/80 mt-1">
                  {activeHold.status === 'hold_active'
                    ? 'Builder accepted the terms. Capture correction evidence, re-review the work, then resolve the hold explicitly.'
                    : 'Waiting for builder acceptance. The inspection cannot be sealed or finalized while this hold remains open.'}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <div className="text-[10px] font-bold text-amber-300 uppercase tracking-widest mb-1">Deficiency Summary</div>
                <div className="text-sm text-amber-50">{activeHold.reason}</div>
                {activeHold.deficiencyReason && activeHold.deficiencyReason !== activeHold.reason && (
                  <>
                    <div className="mt-3 text-[10px] font-bold text-amber-300 uppercase tracking-widest mb-1">Required Correction</div>
                    <div className="text-sm text-amber-50">{activeHold.deficiencyReason}</div>
                  </>
                )}
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <div className="text-[10px] font-bold text-amber-300 uppercase tracking-widest mb-2">Commercial Terms</div>
                <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                  <span className="text-amber-300/80">Base rate</span>
                  <span className="text-amber-50 font-semibold">
                    ${activeHold.premiumRateAmount.toFixed(2)}/hr
                  </span>
                  <span className="text-amber-300/80">Hold multiplier</span>
                  <span className="text-amber-50 font-semibold">{BASE_HOLD_SERVICE_FEE_MULTIPLIER.toFixed(1)}×</span>
                  <span className="text-amber-300/80">Hold cap</span>
                  <span className="text-amber-50 font-semibold">${activeHold.holdCapAmount.toFixed(2)}</span>
                  <span className="text-amber-300/80">Estimate</span>
                  <span className="text-amber-50">{activeHold.estimatedCorrectionMinutes} min</span>
                  <span className="text-amber-300/80">Expires</span>
                  <span className="text-amber-50">{new Date(activeHold.expiresAt).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Vancouver' })}</span>
                </div>
              </div>
            </div>

            {activeHold.status === 'hold_active' && (
              <>
                <div className="mb-4">
                  <RetentionTimer
                    hourlyRate={activeHold.premiumRateAmount}
                    onElapsedChange={setHoldElapsedSeconds}
                    onComplete={() => handleRetentionComplete()}
                    onCancel={() => undefined}
                  />
                </div>

                <div className="bg-blue-950/20 border border-blue-800/30 rounded-xl p-3 mb-3">
                  <div className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-1">Correction Evidence Note</div>
                  <textarea
                    value={correctionNote}
                    onChange={e => setCorrectionNote(e.target.value)}
                    placeholder="Describe the correction completed on site. This is stored as hold-specific correction evidence."
                    rows={3}
                    className="w-full bg-blue-950/40 border border-blue-800/40 rounded-xl px-3 py-2.5 text-xs text-white placeholder-blue-800 focus:outline-none focus:border-[#FF5F15] resize-none transition-all"
                  />
                  <button
                    onClick={() => void handleAddCorrectionNote()}
                    disabled={!correctionNote.trim() || savingCorrectionNote}
                    className="mt-3 w-full rounded-xl bg-blue-500/20 border border-blue-400/30 py-2.5 text-xs font-bold text-blue-100 transition-all hover:bg-blue-500/30 disabled:opacity-40"
                  >
                    {savingCorrectionNote ? 'Saving Correction Evidence...' : 'Save Correction Evidence Note'}
                  </button>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest mb-1">Resolve Hold</div>
                  <textarea
                    value={holdResolutionNotes}
                    onChange={e => setHoldResolutionNotes(e.target.value)}
                    placeholder="Document what was corrected, what was re-reviewed, and the final technical outcome."
                    rows={3}
                    className="w-full bg-[#06131f] border border-emerald-500/20 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-emerald-200/30 focus:outline-none focus:border-emerald-400 resize-none"
                  />
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <button
                      onClick={() => void handleResolveHold('pass')}
                      disabled={!holdResolutionNotes.trim() || resolvingHold !== null}
                      className="rounded-xl bg-emerald-500 py-3 text-sm font-black text-white transition-all hover:bg-emerald-400 disabled:opacity-40"
                    >
                      {resolvingHold === 'pass' ? 'Resolving Pass...' : 'Resolve Hold to Pass'}
                    </button>
                    <button
                      onClick={() => void handleResolveHold('fail')}
                      disabled={!holdResolutionNotes.trim() || resolvingHold !== null}
                      className="rounded-xl border border-red-400/40 bg-red-500/15 py-3 text-sm font-black text-red-100 transition-all hover:bg-red-500/25 disabled:opacity-40"
                    >
                      {resolvingHold === 'fail' ? 'Resolving Fail...' : 'Resolve Hold to Fail'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Resolved Hold Summary ── */}
        {activeHold && !isHoldOpenStatus(activeHold.status) && (
          <div className="mb-5 rounded-2xl border border-zinc-700/50 bg-zinc-900/60 p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                activeHold.holdResolution === 'pass' ? 'bg-emerald-500/20' : 'bg-red-500/20'
              }`}>
                <PauseCircle className={`w-5 h-5 ${
                  activeHold.holdResolution === 'pass' ? 'text-emerald-400' : 'text-red-400'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-bold text-zinc-200 text-sm">Hold / Site Retainer</div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-widest ${
                    activeHold.holdResolution === 'pass'
                      ? 'bg-emerald-500/25 text-emerald-300'
                      : activeHold.holdResolution === 'fail'
                        ? 'bg-red-500/25 text-red-300'
                        : 'bg-zinc-700/60 text-zinc-400'
                  }`}>
                    {activeHold.holdResolution === 'pass'
                      ? 'PASS after hold'
                      : activeHold.holdResolution === 'fail'
                        ? 'FAIL after hold'
                        : activeHold.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 mt-1">Hold closed. Resolution recorded below.</div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 mb-3">
              <div className="bg-zinc-800/60 border border-zinc-700/40 rounded-xl p-3">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Deficiency Summary</div>
                <div className="text-sm text-zinc-200">{activeHold.reason}</div>
                {activeHold.deficiencyReason && activeHold.deficiencyReason !== activeHold.reason && (
                  <>
                    <div className="mt-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Required Correction</div>
                    <div className="text-sm text-zinc-200">{activeHold.deficiencyReason}</div>
                  </>
                )}
              </div>
              <div className="bg-zinc-800/60 border border-zinc-700/40 rounded-xl p-3">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Commercial Summary</div>
                <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                  <span className="text-zinc-500">Base rate</span>
                  <span className="text-zinc-200">${activeHold.premiumRateAmount.toFixed(2)}/hr</span>
                  <span className="text-zinc-500">Hold multiplier</span>
                  <span className="text-zinc-200">{BASE_HOLD_SERVICE_FEE_MULTIPLIER.toFixed(1)}×</span>
                  <span className="text-zinc-500">Hold cap</span>
                  <span className="text-zinc-200">${activeHold.holdCapAmount.toFixed(2)}</span>
                  {activeHold.actualRetainedMinutes != null && (
                    <>
                      <span className="text-zinc-500">Actual retained time</span>
                      <span className="text-zinc-200 font-semibold">{activeHold.actualRetainedMinutes} min</span>
                    </>
                  )}
                  {activeHold.premiumChargeAmount != null && (
                    <>
                      <span className="text-zinc-500">Premium charge</span>
                      <span className="text-zinc-200 font-semibold">${activeHold.premiumChargeAmount.toFixed(2)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {activeHold.holdResolutionNotes && (
              <div className="bg-zinc-800/60 border border-zinc-700/40 rounded-xl p-3">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Resolution Notes</div>
                <div className="text-sm text-zinc-200">{activeHold.holdResolutionNotes}</div>
              </div>
            )}
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
                <div className="font-bold text-amber-300 text-sm">Offer On-Site Hold</div>
                <div className="text-xs text-amber-500">Use this when the issue can reasonably be corrected during the current visit, allowing the inspector to remain on site and re-review without rebooking.</div>
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

            <div className="mb-4">
              <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1.5">Deficiency Summary</div>
              <input
                value={holdReason}
                onChange={e => setHoldReason(e.target.value)}
                placeholder="Handrail not installed on north stairwell"
                className="w-full bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2.5 text-sm text-amber-100 placeholder-amber-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="mb-4">
              <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1.5">Required Correction</div>
              <textarea
                value={holdDeficiencyReason}
                onChange={e => setHoldDeficiencyReason(e.target.value)}
                placeholder="Install code-compliant handrail on both sides"
                rows={3}
                className="w-full bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2.5 text-xs text-amber-100 placeholder-amber-600 focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <label className="block">
                <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1.5">Hold Category</div>
                <select
                  value={holdCategory}
                  onChange={e => setHoldCategory(e.target.value as HoldCategory)}
                  className="w-full bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2.5 text-xs text-amber-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="minor_deficiency">Minor Deficiency</option>
                  <option value="coordination">Coordination</option>
                  <option value="access">Access</option>
                  <option value="safety">Safety</option>
                  <option value="documentation">Documentation</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-3">
                <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1.5">Base Hold Review Fee</div>
                <div className="text-lg font-black text-amber-100">${baseHoldServiceFee.toFixed(2)}</div>
                <div className="mt-1 text-[11px] text-amber-200/80">
                  Flat fee — charged once the builder accepts. Builder selects their correction window at acceptance.
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Same-Day Correction Eligible</div>
              <div className="mb-2 text-[11px] text-amber-200/80">
                Mark as eligible if the deficiency can reasonably be corrected and re-verified before you leave site. The builder will select their correction window at acceptance.
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHoldSameDayEligible(true)}
                  className={`rounded-xl border px-4 py-3 text-left transition-all ${
                    holdSameDayEligible
                      ? 'border-amber-500 bg-amber-500/20'
                      : 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10'
                  }`}
                >
                  <div className="font-bold text-sm text-amber-100">Yes — Same-Day Eligible</div>
                  <div className="mt-1 text-xs text-amber-200/70">Builder may reserve a correction window and receive same-day re-verification.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setHoldSameDayEligible(false)}
                  className={`rounded-xl border px-4 py-3 text-left transition-all ${
                    !holdSameDayEligible
                      ? 'border-amber-500 bg-amber-500/20'
                      : 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10'
                  }`}
                >
                  <div className="font-bold text-sm text-amber-100">No — Rebook Required</div>
                  <div className="mt-1 text-xs text-amber-200/70">Correction cannot be completed during this visit. A new inspection booking will be required.</div>
                </button>
              </div>
            </div>

            {/* Applicable base rate */}
            <div className="mb-4">
              <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1.5">Applicable Base Rate</div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                <div className="text-xs font-semibold text-amber-100">{holdPricingLabel}</div>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-amber-200/80">Set by inspection role and pricing basis</span>
                  <span className="text-xs font-black text-amber-100">${holdBaseRate.toFixed(2)}/hr</span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1.5">Inspector Notes</div>
              <textarea
                value={holdNotes}
                onChange={e => setHoldNotes(e.target.value)}
                placeholder="Optional coordination notes for the builder regarding access, sequencing, or expected readiness for re-review."
                rows={2}
                className="w-full bg-amber-500/5 border border-amber-500/20 rounded-xl px-3 py-2.5 text-xs text-amber-100 placeholder-amber-600 focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>

            <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Supporting Evidence</div>
                  <div className="mt-1 text-xs text-amber-200/80">Attach photos, video, or supporting documents to record the hold condition and required correction.</div>
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
                  className="rounded-xl border border-amber-500/25 bg-amber-100/10 px-3 py-3 text-sm font-bold text-amber-100 transition-all hover:bg-amber-100/15"
                >
                  <span className="inline-flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    <span>Photo</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => holdVideoInputRef.current?.click()}
                  className="rounded-xl border border-amber-500/25 bg-amber-100/10 px-3 py-3 text-sm font-bold text-amber-100 transition-all hover:bg-amber-100/15"
                >
                  <span className="inline-flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    <span>Video</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => holdAttachmentInputRef.current?.click()}
                  className="rounded-xl border border-amber-500/25 bg-amber-100/10 px-3 py-3 text-sm font-bold text-amber-100 transition-all hover:bg-amber-100/15"
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
                    <div key={evidence.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-[#120d08]/40 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-100">
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] uppercase tracking-widest text-amber-900">
                            {evidence.evidenceType}
                          </span>
                          <span className="truncate">{evidence.fileName}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-amber-200/70">
                          {(evidence.fileSize / (1024 * 1024)).toFixed(evidence.fileSize >= 1024 * 1024 ? 1 : 2)} MB
                          {' · '}
                          {new Date(evidence.capturedAt).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })}
                          {evidence.lat != null && evidence.lng != null ? ` · ${evidence.lat.toFixed(5)}, ${evidence.lng.toFixed(5)}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePendingHoldEvidence(evidence.id)}
                        className="rounded-lg border border-amber-500/25 px-2 py-1 text-[11px] font-bold text-amber-200 transition-all hover:bg-amber-500/10"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 text-xs text-amber-200">
              Base Hold Review Fee of <span className="font-bold">${baseHoldServiceFee.toFixed(2)}</span> is charged once the builder accepts.
              The builder will select their correction window — additional window and overrun fees apply based on their selection.
            </div>

            {holdMissingFields.length > 0 && (
              <div className="mb-4 rounded-xl border border-amber-300 bg-amber-100 px-3 py-3 text-xs font-medium text-amber-900">
                Complete the deficiency summary and required correction before issuing hold terms.
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handlePlaceHold}
                disabled={
                  !holdReason.trim()
                  || !holdDeficiencyReason.trim()
                  || holdChecklistItems.length === 0
                  || holdBaseRate <= 0
                  || isPlacingHold
                }
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 rounded-xl text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPlacingHold ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending Hold Terms...</>
                ) : (
                  <><PauseCircle className="w-4 h-4" /> Send Hold Terms</>
                )}
              </button>
              <button
                onClick={() => {
                  setHoldMode(false)
                  setHoldReason('')
                  setHoldDeficiencyReason('')
                  setHoldChecklistItems([])
                  setHoldNotes('')
                  setHoldSameDayEligible(true)
                  setHoldEvidenceItems([])
                  setHoldEvidenceWarning(null)
                }}
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
                onHold={hasOpenHold || holdMode || sealApplied ? undefined : openHoldForm}
              />
            ))
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 inset-x-0 bg-[#060B15]/95 p-5 border-t border-blue-900/50 flex gap-3">
        <button
          onClick={openHoldForm}
          disabled={holdMode || (activeHold !== null && isHoldOpenStatus(activeHold.status))}
          className={`flex-1 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
            activeHold && isHoldOpenStatus(activeHold.status)
              ? 'bg-red-500/20 border border-red-500/40 text-red-400 cursor-not-allowed'
              : 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/15'
          }`}
        >
          <PauseCircle className="w-4 h-4" /> {activeHold && isHoldOpenStatus(activeHold.status) ? 'Hold Active' : 'Hold / Site Retainer'}
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
