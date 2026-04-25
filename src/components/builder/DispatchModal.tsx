'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Zap, Clock, AlertTriangle, CheckCircle2, Lock,
  MapPin, ChevronRight, ChevronLeft, ChevronDown,
  HardHat, Layers, Hammer, Droplets, Home,
  Radio, Shield, FileText,
  Eye, Archive
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SchedulingPicker, isSlotValidForTier, type TimeSlot } from '@/components/builder/SchedulingPicker'
import { INSPECTION_STAGES } from '@/lib/mockData'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useStore } from '@/lib/store'
import type {
  Project,
  DispatchTier,
  InspectorDiscipline,
  PricingMode,
  SpecialistRoleId,
} from '@/lib/types'
import { calculatePricingBreakdown } from '@/utils/pricing'
import { VAULT_RETENTION_OPTIONS, type VaultRetentionTier } from '@/utils/pricing'
import { getBuilderOnboardingStatusAsync } from '@/lib/persistence/builderOnboarding'
import {
  DISPATCH_PRICING,
  getDefaultSpecialistRole,
  resolvePricingMode,
} from '@/lib/pricing/config'

// ─── WorkSafe BC Safety Options ──────────────────────────────────────────────

const PPE_OPTIONS = [
  { id: 'hard-hat',        label: 'Hard Hat',            emoji: '🪖' },
  { id: 'hi-vis',          label: 'Hi-Vis Vest',         emoji: '🦺' },
  { id: 'steel-toe',       label: 'Steel-Toe Boots',     emoji: '👷' },
  { id: 'safety-glasses',  label: 'Safety Glasses',      emoji: '🥽' },
  { id: 'gloves',          label: 'Gloves',              emoji: '🧤' },
  { id: 'hearing',         label: 'Hearing Protection',  emoji: '🎧' },
  { id: 'fall-arrest',     label: 'Fall Arrest / Harness', emoji: '⛓️' },
  { id: 'respirator',      label: 'Respirator (N95+)',   emoji: '😷' },
]

const HAZARD_FLAGS = [
  { id: 'heights',    label: 'Working at Heights (>3 m)' },
  { id: 'confined',   label: 'Confined Space Entry' },
  { id: 'energized',  label: 'Energized Equipment Present' },
  { id: 'excavation', label: 'Excavation / Trenching' },
  { id: 'hazmat',     label: 'Hazardous Materials / Asbestos Area' },
  { id: 'crane',      label: 'Active Crane / Heavy Equipment' },
]


interface DispatchModalProps {
  project?: Project | null
  isOpen: boolean
  onClose: () => void
  onDispatch: (tier: DispatchTier) => void
}

type Step = 'address' | 'schedule' | 'stage' | 'discipline' | 'safety' | 'tier' | 'vault' | 'confirm' | 'broadcasting' | 'live'

const DISCIPLINES = [
  { id: 'structural',    label: 'Structural',     icon: HardHat,  description: 'Load paths, framing, foundations' },
  { id: 'geotech',      label: 'Geotechnical',   icon: Layers,   description: 'Soil, excavation, ground conditions' },
  { id: 'mechanical',   label: 'Mechanical',     icon: Hammer,   description: 'HVAC, ventilation, HRV/ERV' },
  { id: 'electrical',   label: 'Electrical',     icon: Zap,      description: 'Electrical rough-in & grounding' },
  { id: 'plumbing',     label: 'Plumbing',       icon: Droplets, description: 'Drainage, supply, fixtures' },
  { id: 'architectural',label: 'Architectural',  icon: Home,     description: 'Code compliance & life safety' },
]

// Default discipline for each inspection stage.
// Builders can override, but this pre-fills the most common selection.
const STAGE_TO_DISCIPLINE: Record<number, string> = {
  1: 'geotech',        // Site Survey & Excavation
  2: 'structural',     // Foundation Pour
  3: 'structural',     // Framing & Lock-up
  4: 'architectural',  // Insulation & Vapor Barrier
  5: 'architectural',  // Final Occupancy Permit
}

const STEP_NUM: Record<Step, number> = {
  address: 1, schedule: 2, stage: 3, discipline: 4, safety: 5, tier: 6, vault: 7, confirm: 8, broadcasting: 8, live: 8,
}

const STAGE_WORKFLOW_DESCRIPTIONS: Record<number, string> = {
  1: 'Initial site-stage inspection to verify site conditions, layout, and excavation readiness.',
  2: 'Pre-pour inspection to verify formwork, reinforcement, and required conditions before concrete placement.',
  3: 'Structural stage inspection to verify framing, envelope readiness, and pre-closure conditions.',
  4: 'Envelope inspection to verify thermal, moisture, and pre-drywall compliance requirements.',
  5: 'Final-stage inspection to verify completion, outstanding deficiencies, and occupancy readiness.',
}

export function DispatchModal({ project, isOpen, onClose, onDispatch }: DispatchModalProps) {
  const { user }    = useAuth()
  const { addJob }  = useStore()
  const [step, setStep]                     = useState<Step>('address')
  const [address, setAddress]               = useState(project ? `${project.address}, ${project.city}` : '')
  const [permitNumber, setPermitNumber]     = useState(project?.permitNumber ?? '')
  const [projectName, setProjectName]       = useState(project?.name ?? '')
  const [selectedStage, setSelectedStage]   = useState<number | null>(project?.currentStage ?? null)
  const [selectedDisc, setSelectedDisc]     = useState<string | null>(null)
  const [selectedTier, setSelectedTier]     = useState<DispatchTier>('priority')
  const [selectedSpecialistRole, setSelectedSpecialistRole] = useState<SpecialistRoleId | null>(null)
  const [billableHours, setBillableHours]   = useState(1.5)
  const holdHours = 0
  const [slots, setSlots]                   = useState<TimeSlot[]>([])
  const [ppeRequired, setPpeRequired]       = useState<string[]>([])
  const [hazardFlags, setHazardFlags]       = useState<string[]>([])
  const [safetyNotes, setSafetyNotes]       = useState('')
  const [siteAgreed, setSiteAgreed]         = useState(false)
  const [siteAgreementExpanded, setSiteAgreementExpanded] = useState(false)
  const [broadcastCount, setBroadcastCount] = useState(0)
  const [broadcastDone, setBroadcastDone]   = useState(false)
  const [paymentStatus, setPaymentStatus]   = useState<'idle' | 'processing' | 'escrowed'>('idle')
  const [vaultTier, setVaultTier]           = useState<VaultRetentionTier>('standard')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [postError, setPostError]           = useState<string | null>(null)
  const [txnId] = useState(() => `TXN-${Date.now()}`)
  const [jobRef] = useState(() => `VERO-${Date.now().toString(36).toUpperCase().slice(-6)}`)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [locationHint, setLocationHint] = useState<string | null>(null)
  const addressInputRef = useRef<HTMLInputElement | null>(null)

  const toggleItem = (arr: string[], setArr: (a: string[]) => void, id: string) =>
    setArr(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id])

  // Broadcast animation counter
  useEffect(() => {
    if (step !== 'broadcasting') return
    const target = Math.floor(Math.random() * 20) + 38 // 38–57 CPs
    let count = 0
    const interval = setInterval(() => {
      count += Math.floor(Math.random() * 4) + 1
      if (count >= target) {
        count = target
        clearInterval(interval)
        setTimeout(() => {
          setBroadcastDone(true)
          setTimeout(() => setStep('live'), 800)
        }, 600)
      }
      setBroadcastCount(count)
    }, 60)
    return () => clearInterval(interval)
  }, [step])

  const reset = () => {
    setStep('address')
    setAddress(project ? `${project.address}, ${project.city}` : '')
    setPermitNumber(project?.permitNumber ?? '')
    setProjectName(project?.name ?? '')
    setSelectedStage(project?.currentStage ?? null)
    setSelectedDisc(null)
    setSelectedTier('priority')
    setSelectedSpecialistRole(null)
    setBillableHours(1.5)
    setSlots([])
    setPpeRequired([])
    setHazardFlags([])

    setSafetyNotes('')
    setSiteAgreed(false)
    setSiteAgreementExpanded(false)
    setPaymentStatus('idle')
    setPostError(null)
    setIsLocating(false)
    setLocationError(null)
    setLocationHint(null)
  }

  const handleClose = () => { reset(); onClose() }

  const handleTierSelection = (tier: DispatchTier) => {
    setSelectedTier(tier)
    setSlots(currentSlots => currentSlots.filter(slot => isSlotValidForTier(slot, tier)))
  }

  const handleUseCurrentLocation = () => {
    setLocationError(null)
    setLocationHint(null)

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError('Geolocation is not available on this device.')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const lat = coords.latitude.toFixed(6)
        const lng = coords.longitude.toFixed(6)
        setAddress(`Current location (${lat}, ${lng})`)
        setLocationHint('GPS coordinates inserted. You can refine the civic address if needed.')
        setIsLocating(false)
        window.requestAnimationFrame(() => addressInputRef.current?.focus())
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location access was denied. Please enable location permissions and try again.'
            : error.code === error.TIMEOUT
              ? 'Location request timed out. Please try again.'
              : 'Unable to retrieve your current location.'
        setLocationError(message)
        setIsLocating(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  const handlePost = async () => {
    setPostError(null)

    if (!hasValidSchedulingWindow) {
      setPostError('Add at least one valid availability window for the selected dispatch speed before posting.')
      setStep('schedule')
      return
    }

    const stageInfo = INSPECTION_STAGES.find(s => s.id === (selectedStage ?? 1))
    const cityPart  = address.includes(',')
      ? address.split(',').slice(1).join(',').trim()
      : 'Vancouver, BC'

    const approvalStatus = await getBuilderOnboardingStatusAsync(user?.id, user?.supabaseId)

    const result = await addJob({
      projectId:             project?.id,
      projectName:          projectName || address.split(',')[0].trim() || 'New Project',
      address:              address.split(',')[0].trim() || address,
      city:                 cityPart,
      permitNumber:         permitNumber,
      stage:                selectedStage ?? 1,
      stageName:            stageInfo?.name ?? 'Site Survey',
      discipline:           (selectedDisc as InspectorDiscipline) ?? 'structural',
      tier:                 selectedTier,
      offeredRate:          pricing.inspectorPayout,
      pricingMode,
      specialistRole:       resolvedSpecialistRole,
      hourlyRate:           pricingMode === 'specialist_hourly' ? pricing.hourlyRate : undefined,
      billableHours:        pricingMode === 'specialist_hourly' ? pricing.billableHours : undefined,
      holdHours:            pricing.holdHours,
      inspectionType:       'dispatch',
      credentialClass,
      slots,
      builderName:          user?.name    ?? 'Builder',
      builderId:            user?.supabaseId ?? user?.id ?? 'demo-builder',
      builderAvatar:        user?.avatar  ?? 'BD',
      builderRating:        4.8,
      builderJobs:          5,
      ppeRequired,
      hazardFlags,
      siteReqs: [],
      safetyNotes,
      builderApprovalStatus: approvalStatus,
    })

    if (!result.ok) {
      setPostError(result.error)
      return
    }

    setBroadcastCount(0)
    setBroadcastDone(false)
    setStep('broadcasting')
    onDispatch(selectedTier)
  }

  const stageData = selectedStage ? INSPECTION_STAGES[selectedStage - 1] : null
  const discData = DISCIPLINES.find(d => d.id === selectedDisc)
  const credentialClass =
    selectedDisc === 'architectural'
      ? 'AIBC'
      : undefined
  // Stage 5 (Final Occupancy Permit) always requires specialist sign-off, even
  // when no discipline has been selected yet. Flag it so the cards and total
  // display the specialist-hourly rate the builder will actually be charged.
  const isFinalOccupancyStage = selectedStage === 5
  const specialistModeForced = isFinalOccupancyStage || resolvePricingMode({
    discipline: selectedDisc ?? undefined,
    credentialClass,
    inspectionType: 'dispatch',
    requiresProfessionalSeal: isFinalOccupancyStage,
  }) === 'specialist_hourly'
  const resolvedSpecialistRole = specialistModeForced
    ? (selectedSpecialistRole ?? getDefaultSpecialistRole({
        discipline: selectedDisc ?? undefined,
        credentialClass,
        inspectionType: 'dispatch',
        requiresProfessionalSeal: isFinalOccupancyStage,
      }))
    : selectedSpecialistRole
  const pricingMode: PricingMode = specialistModeForced || resolvedSpecialistRole
    ? 'specialist_hourly'
    : 'dispatch_fixed'
  const basePricingInput = {
    pricingMode,
    specialistRole: resolvedSpecialistRole,
    billableHours,
    holdHours,
    credentialClass,
    discipline: selectedDisc ?? undefined,
    inspectionType: 'dispatch',
    requiresProfessionalSeal: isFinalOccupancyStage,
  } as const
  const pricing = calculatePricingBreakdown({
    ...basePricingInput,
    dispatchTier: selectedTier,
  })
  // Pre-compute all-in (Base + Urgency + Fee) totals for every tier card so
  // the price stamped on each card matches what the Estimated Total would
  // become if that tier were selected. Prevents sticker shock on review.
  const perTierPricing: Record<DispatchTier, ReturnType<typeof calculatePricingBreakdown>> = {
    standard:  calculatePricingBreakdown({ ...basePricingInput, dispatchTier: 'standard' }),
    priority:  calculatePricingBreakdown({ ...basePricingInput, dispatchTier: 'priority' }),
    emergency: calculatePricingBreakdown({ ...basePricingInput, dispatchTier: 'emergency' }),
  }
  const totalEscrow = pricing.builderEscrowTotal
  const hasValidSchedulingWindow = slots.length > 0 && slots.every(slot => isSlotValidForTier(slot, selectedTier))

  const tierMeta = {
    standard:  { color: 'text-muted',          bg: 'bg-surface',           label: 'Standard',   time: '5+ business days' },
    priority:  { color: 'text-warning-amber',  bg: 'bg-warning-amber/10',  label: 'Priority',   time: '2–3 business days' },
    emergency: { color: 'text-[#D97706]',      bg: 'bg-[#D97706]/10',      label: 'Emergency',  time: 'Within 24 hrs / next day' },
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      size="md"
      closeOnBackdrop={false}
      closeOnEscape={false}
    >

      {/* Progress bar — hide during broadcast/live */}
      {!['broadcasting', 'live'].includes(step) && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Post Inspection Request</span>
            <span className="text-xs text-gray-400">Step {STEP_NUM[step]} of 8</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-flame rounded-full transition-all duration-500"
              style={{ width: `${(STEP_NUM[step] / 8) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ─── STEP 1: ADDRESS ─────────────────────── */}
      {step === 'address' && (
        <div>
          <h2 className="text-xl font-black text-gray-900 mb-1">Where&apos;s the site?</h2>
          <p className="text-sm text-gray-500 mb-5">Enter the property address and permit number.</p>

          <div className="relative z-10 mb-3">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-flame transition-all hover:border-flame/40 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-flame/30 disabled:cursor-wait disabled:opacity-60"
              aria-label="Use current location"
              title="Use current location"
            >
              <MapPin className="h-4 w-4" />
            </button>
            <input
              ref={addressInputRef}
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="123 Main St, Vancouver, BC"
              className="w-full rounded-xl border-2 border-gray-200 bg-white py-3.5 pl-13 pr-4 text-sm font-medium text-gray-900 caret-gray-900 transition-colors placeholder:text-gray-400 focus:border-flame focus:ring-1 focus:ring-flame/30 focus:outline-none"
            />
          </div>
          {(isLocating || locationError || locationHint) && (
            <p className={`mb-3 px-1 text-xs font-medium ${locationError ? 'text-red-600' : isLocating ? 'text-flame' : 'text-gray-500'}`}>
              {locationError ?? (isLocating ? 'Capturing your current location…' : locationHint)}
            </p>
          )}

          {!project && address.length === 0 && (
            <div className="relative z-10 mb-4 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
              <div className="px-3 py-2 text-xs text-gray-400 font-semibold tracking-wide uppercase border-b border-gray-100">Recent Sites</div>
              {['2847 Cornwall Ave, Vancouver, BC', '155 E 10th Ave, Vancouver, BC', '4521 Kingsway, Burnaby, BC'].map(a => (
                <button key={a} onClick={() => setAddress(a)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 transition-colors text-left">
                  <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700">{a}</span>
                </button>
              ))}
            </div>
          )}

          <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)}
            placeholder="Project name (e.g. Kitsilano Infill Duplex)"
            className="relative z-10 mb-3 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-sm font-medium text-gray-900 caret-gray-900 transition-colors placeholder:text-gray-400 focus:border-flame focus:ring-1 focus:ring-flame/30 focus:outline-none" />

          <div className="relative z-10 mb-1">
            <input type="text" value={permitNumber} onChange={e => setPermitNumber(e.target.value)}
              placeholder="Building permit # (optional)"
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-sm font-medium font-mono text-gray-900 caret-gray-900 transition-colors placeholder:text-gray-400 focus:border-flame focus:ring-1 focus:ring-flame/30 focus:outline-none" />
          </div>
          <p className="text-xs text-gray-400 mb-5 px-1">
            Your permit number is issued by the municipality when plans are approved — add it if you have it, or leave blank and add later.
          </p>

          <Button variant="primary" size="lg" fullWidth disabled={!address.trim()} onClick={() => setStep('schedule')}>
            Continue <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ─── STEP 2: SCHEDULE ────────────────────── */}
      {step === 'schedule' && (
        <div>
          <button onClick={() => setStep('address')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 mb-4">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          <h2 className="text-xl font-black text-gray-900 mb-1">When are you available?</h2>
          <p className="text-sm text-gray-500 mb-4">
            Add up to 3 availability windows. Only dates within the selected dispatch speed are available for booking.
          </p>
          <div className="mb-4">
            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Urgency</div>
            <div className="flex gap-2">
              {(['standard', 'priority', 'emergency'] as const).map(t => (
                <button key={t} type="button" onClick={() => handleTierSelection(t)}
                  className={`flex-1 text-center rounded-xl border-2 py-2.5 px-2 text-xs font-bold transition-all ${
                    selectedTier === t ? tierMeta[t].bg + ' ' + tierMeta[t].color + ' border-current' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                  }`}>
                  {tierMeta[t].label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
            {selectedTier === 'standard' && 'Standard dispatch windows open 5 business days out.'}
            {selectedTier === 'priority' && 'Priority dispatch windows open 2-3 business days out.'}
            {selectedTier === 'emergency' && 'Emergency dispatch windows are limited to today and tomorrow.'}
          </div>
          <SchedulingPicker slots={slots} onChange={setSlots} max={3} tier={selectedTier} />
          <Button variant="primary" size="lg" fullWidth
            disabled={!hasValidSchedulingWindow}
            onClick={() => setStep('stage')}>
            Continue <ChevronRight className="w-4 h-4" />
          </Button>
          {!hasValidSchedulingWindow && (
            <p className="mt-3 text-center text-xs text-gray-400">
              Add at least one valid availability window inside the selected dispatch range to continue.
            </p>
          )}
        </div>
      )}

      {/* ─── STEP 3: STAGE ───────────────────────── */}
      {step === 'stage' && (
        <div>
          <button onClick={() => setStep('schedule')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          <h2 className="text-xl font-black text-gray-900 mb-1">Select inspection stage</h2>
          <p className="text-sm text-gray-500">
            Choose the project stage to load the required inspection checklist, evidence requirements, and sign-off workflow.
          </p>
          <p className="mt-2 mb-4 text-xs text-gray-400">
            Each stage opens the governed inspection steps for that part of the permit process.
          </p>

          <div className="space-y-2 mb-5">
            {INSPECTION_STAGES.map(stage => {
              const isSelected = selectedStage === stage.id
              const workflowDescription = STAGE_WORKFLOW_DESCRIPTIONS[stage.id] ?? stage.description
              return (
                <button key={stage.id} onClick={() => { setSelectedStage(stage.id); setSelectedDisc(STAGE_TO_DISCIPLINE[stage.id] ?? null) }}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                    isSelected ? 'border-flame bg-orange-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      isSelected ? 'bg-flame text-white' : 'bg-gray-100 text-gray-600'
                    }`}>{stage.id}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-sm">{stage.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{workflowDescription}</div>
                      <div className="text-xs text-gray-300 mt-0.5">{stage.items.length} required inspection items</div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-flame shrink-0" />}
                  </div>
                </button>
              )
            })}
          </div>

          <p className="mb-4 text-xs text-gray-400">
            Selecting a stage loads the detailed inspection requirements for that phase.
          </p>

          <Button variant="primary" size="lg" fullWidth disabled={!selectedStage} onClick={() => setStep('discipline')}>
            Continue <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ─── STEP 3: DISCIPLINE ──────────────────── */}
      {step === 'discipline' && (
        <div>
          <button onClick={() => setStep('stage')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          <h2 className="text-xl font-black text-gray-900 mb-1">Required discipline</h2>
          <p className="text-sm text-gray-500 mb-2">Your listing will only be sent to credentialed professionals in this field.</p>
          {selectedDisc && STAGE_TO_DISCIPLINE[selectedStage ?? 0] === selectedDisc && (
            <p className="mb-4 text-xs text-flame font-semibold">Auto-selected based on inspection stage — override if needed.</p>
          )}

          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {DISCIPLINES.map(disc => {
              const Icon = disc.icon
              const isSelected = selectedDisc === disc.id
              return (
                <button key={disc.id} onClick={() => setSelectedDisc(disc.id)}
                  className={`text-left rounded-xl border-2 p-3.5 transition-all ${
                    isSelected ? 'border-flame bg-orange-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${isSelected ? 'bg-flame' : 'bg-gray-100'}`}>
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div className="font-bold text-gray-900 text-sm">{disc.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5 leading-tight">{disc.description}</div>
                </button>
              )
            })}
          </div>

          <Button variant="primary" size="lg" fullWidth disabled={!selectedDisc} onClick={() => setStep('safety')}>
            Continue <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ─── STEP 5: SAFETY REQUIREMENTS ─────────── */}
      {step === 'safety' && (
        <div>
          <button onClick={() => setStep('discipline')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900">Safety Requirements</h2>
          </div>
          <p className="text-sm text-gray-500 mb-1">Set PPE minimums and site conditions for this job. Inspectors see these before claiming. <span className="font-semibold text-gray-700">WorkSafe BC compliant.</span></p>
          <p className="text-xs text-gray-400 mb-5">All fields optional — skip if no special requirements apply.</p>

          {/* PPE Minimums */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-1 h-4 bg-flame rounded-full" />
              <span className="text-xs font-black text-gray-700 uppercase tracking-widest">PPE Minimums</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PPE_OPTIONS.map(opt => {
                const sel = ppeRequired.includes(opt.id)
                return (
                  <button key={opt.id} onClick={() => toggleItem(ppeRequired, setPpeRequired, opt.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                      sel ? 'border-flame bg-orange-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}>
                    <span className="text-base leading-none">{opt.emoji}</span>
                    <span className={`text-xs font-bold ${sel ? 'text-flame' : 'text-gray-700'}`}>{opt.label}</span>
                    {sel && <CheckCircle2 className="w-3.5 h-3.5 text-flame ml-auto shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Hazard Flags */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-1 h-4 bg-amber-500 rounded-full" />
              <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Site Hazards</span>
            </div>
            <div className="space-y-1.5">
              {HAZARD_FLAGS.map(flag => {
                const sel = hazardFlags.includes(flag.id)
                return (
                  <button key={flag.id} onClick={() => toggleItem(hazardFlags, setHazardFlags, flag.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 text-left transition-all ${
                      sel ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}>
                    <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${sel ? 'text-amber-500' : 'text-gray-300'}`} />
                    <span className={`text-xs font-semibold flex-1 ${sel ? 'text-amber-700' : 'text-gray-600'}`}>{flag.label}</span>
                    {sel && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Additional notes */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 bg-gray-300 rounded-full" />
              <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Additional Notes</span>
            </div>
            <textarea
              value={safetyNotes}
              onChange={e => setSafetyNotes(e.target.value)}
              placeholder="Any other site-specific safety requirements, WorkSafe BC special conditions, or inspector instructions…"
              rows={3}
              className="w-full resize-none rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 caret-gray-900 transition-colors placeholder:text-gray-400 focus:border-flame focus:ring-1 focus:ring-flame/30 focus:outline-none"
            />
          </div>

          <Button variant="primary" size="lg" fullWidth onClick={() => setStep('tier')}>
            Continue <ChevronRight className="w-4 h-4" />
          </Button>
          <button onClick={() => setStep('tier')}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-3 transition-colors">
            Skip — no special safety requirements
          </button>
        </div>
      )}

      {/* ─── STEP 6: TIER ────────────────────────── */}
      {step === 'tier' && (
        <div>
          <button onClick={() => setStep('safety')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          <h2 className="text-xl font-black text-gray-900 mb-1">Choose your dispatch speed. Vero handles the pricing model.</h2>
          <p className="text-sm text-gray-500 mb-4">Standard, Priority, and Emergency control how quickly an inspector is dispatched. For routine inspections, pricing is fixed-fee. If the permit stage, inspection type, or credential requirement calls for a registered professional, Vero switches to hourly specialist pricing automatically.</p>

          <div className="space-y-3 mb-5">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">STEP 1 — SELECT DISPATCH SPEED</div>
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <div className="text-sm font-bold text-gray-900">
                {pricingMode === 'specialist_hourly'
                  ? 'Specialist-hourly dispatch for professional sign-off'
                  : 'Fixed-fee dispatch for routine inspection bookings'}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {pricingMode === 'specialist_hourly'
                  ? 'This file requires a registered professional. Cards show the all-in escrow at specialist rates.'
                  : 'Use these options when the inspection does not require a specialist or professional sign-off.'}
              </div>
            </div>
            {DISPATCH_PRICING.map(pricingCard => {
              const icons = { standard: Clock, priority: Zap, emergency: AlertTriangle }
              const Icon = icons[pricingCard.tier]
              const isSelected = selectedTier === pricingCard.tier
              const tierBreakdown = perTierPricing[pricingCard.tier]
              const cardTotal = tierBreakdown.builderEscrowTotal
              const cardSubtext = pricingMode === 'specialist_hourly'
                ? 'Specialist pricing applied'
                : 'Includes platform fee'
              return (
                <button key={pricingCard.tier} onClick={() => handleTierSelection(pricingCard.tier)}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                    isSelected ? 'border-flame bg-orange-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-flame' : 'bg-gray-100'}`}>
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-900">{pricingCard.label} Dispatch</span>
                          {pricingCard.tier === 'priority' && <Badge variant="warning" size="sm">Most Claimed</Badge>}
                          {pricingCard.tier === 'emergency' && <Badge variant="fail" size="sm">Highest Priority</Badge>}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {pricingCard.timeframe}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-gray-900">{formatCurrency(cardTotal)} total</div>
                      <div className="text-xs text-gray-400">{cardSubtext}</div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                    <div>{pricingCard.tier === 'standard' ? 'Next available CP' : pricingCard.tier === 'priority' ? 'Preferred dispatch routing' : 'Highest urgency routing'}</div>
                    <div>{pricingCard.tier === 'standard' ? 'Standard scheduling' : pricingCard.tier === 'priority' ? 'Faster scheduling window' : 'Dedicated dispatch handling'}</div>
                    <div>{pricingCard.tier === 'standard' ? 'Routine dispatch lane' : pricingCard.tier === 'priority' ? 'Live ETA tracking' : 'Direct coordination access'}</div>
                  </div>
                </button>
              )
            })}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
              {pricingMode === 'specialist_hourly'
                ? 'Specialist pricing is active for this file. Each card above shows the all-in escrow — Base + Urgency + Platform Fee — for that dispatch speed.'
                : 'These fixed-fee cards apply to routine dispatch only. If the file requires a registered professional, Vero automatically applies specialist pricing.'}
            </div>
          </div>

          <div className="mb-5 rounded-2xl border-2 border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-600">
              If your inspection requires a registered professional, Vero automatically assigns the appropriate specialist and applies the correct pricing.
            </p>
          </div>

          <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="text-xs font-black uppercase tracking-widest text-blue-700">Estimated Total</div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <div className="text-sm text-blue-700/80">Total escrow required</div>
                <div className="text-2xl font-black text-slate-900">{formatCurrency(pricing.builderEscrowTotal)}</div>
              </div>
              <div className="text-right text-xs text-blue-700/80">
                {pricingMode === 'specialist_hourly' ? 'Specialist pricing applied automatically when required' : 'Fixed dispatch pricing'}
              </div>
            </div>
            <div className="mt-4 border-t border-blue-100 pt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-blue-700/80">Pricing mode</span>
                <span className="font-bold text-gray-900">{pricingMode === 'specialist_hourly' ? 'Specialist hourly' : 'Fixed dispatch'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-700/80">Dispatch speed</span>
                <span className="font-bold text-gray-900">{tierMeta[selectedTier].label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-700/80">Base booking</span>
                <span className="font-bold text-gray-900">{formatCurrency(pricing.baseFee)}</span>
              </div>
              {pricing.multiplier > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-blue-700/80">Urgency multiplier</span>
                  <span className="font-bold text-gray-900">×{pricing.multiplier.toFixed(1)}</span>
                </div>
              )}
              {pricing.urgencyAdjustment > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-blue-700/80">Urgency adjustment</span>
                  <span className="font-bold text-gray-900">{formatCurrency(pricing.urgencyAdjustment)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-blue-700/80">Platform fee</span>
                <span className="font-bold text-gray-900">{formatCurrency(pricing.platformCommission)}</span>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 -mx-5 -mb-5 px-5 pt-3 pb-5 bg-white/95 backdrop-blur border-t border-gray-100 z-10">
            <Button variant="primary" size="lg" fullWidth disabled={!hasValidSchedulingWindow} onClick={() => setStep('vault')}>
              Review Listing <ChevronRight className="w-4 h-4" />
            </Button>
            {!hasValidSchedulingWindow && (
              <p className="mt-3 text-center text-xs text-gray-400">
                Update your scheduling step so the selected dispatch speed still has a valid availability window.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── STEP 7: VAULT RETENTION ─────────────── */}
      {step === 'vault' && (
        <div className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <button onClick={() => setStep('tier')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-electric/10 border border-electric/20 flex items-center justify-center shrink-0">
              <Archive className="w-5 h-5 text-electric" />
            </div>
            <div>
              <h2 className="font-black text-gray-900 text-base">Vault Retention</h2>
              <p className="text-xs text-gray-500 mt-0.5">Select how long your inspection record is retained in the Vero Vault</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {VAULT_RETENTION_OPTIONS.map(option => (
              <button
                key={option.tier}
                type="button"
                onClick={() => setVaultTier(option.tier)}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                  vaultTier === option.tier
                    ? 'border-flame bg-flame/5'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      vaultTier === option.tier ? 'border-flame bg-flame' : 'border-gray-300'
                    }`}>
                      {vaultTier === option.tier && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="font-black text-sm text-gray-900">{option.label}</span>
                    <span className="text-xs text-gray-500">{option.duration}</span>
                  </div>
                  <div className="text-right shrink-0">
                    {option.price === 0 && !option.monthlyPrice ? (
                      <span className="text-xs font-bold text-success-green bg-success-green/10 px-2 py-0.5 rounded-full">Included</span>
                    ) : option.monthlyPrice ? (
                      <span className="text-sm font-black text-gray-900">${option.monthlyPrice}<span className="text-xs font-normal text-gray-500">/mo</span></span>
                    ) : (
                      <span className="text-sm font-black text-gray-900">${option.price} <span className="text-xs font-normal text-gray-500">one-time</span></span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed ml-6">{option.description}</p>
                {option.badge && vaultTier !== option.tier && option.tier === 'professional' && (
                  <span className="ml-6 mt-1.5 inline-block text-[10px] font-bold text-flame bg-flame/10 px-2 py-0.5 rounded-full">{option.badge}</span>
                )}
              </button>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5 flex items-start gap-2">
            <Archive className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-600 leading-relaxed">
              Your sealed inspection record, evidence, and submission package will be retained in the Vero Vault for the selected period. Upgrade at any time from the Vault dashboard.
            </p>
          </div>

          <button
            onClick={() => setStep('confirm')}
            className="w-full py-3.5 bg-flame text-white font-black text-sm rounded-2xl hover:bg-flame-light transition-all flex items-center justify-center gap-2"
          >
            Continue to Review <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── STEP 8: CONFIRM / POST ──────────────── */}
      {step === 'confirm' && (
        <div className="pb-32">
          <button onClick={() => setStep('vault')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          <h2 className="text-xl font-black text-gray-900 mb-1">Review your listing</h2>
          <p className="text-sm text-gray-500 mb-4">
            Once posted, this request goes live on the <span className="font-semibold text-gray-900">Vero Live Board</span> and is blasted to all qualified professionals in your area.
          </p>

          {/* Listing card — styled like a real job posting */}
          <div className="border-2 border-slate-800 rounded-2xl overflow-hidden mb-4">
            {/* Header bar */}
            <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-flame rounded-full animate-pulse" />
                <span className="text-xs font-bold text-blue-300 tracking-widest uppercase">Draft Listing</span>
              </div>
              <span className="text-xs font-mono text-blue-500">{jobRef}</span>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Site Address</div>
                <div className="font-bold text-gray-900 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-flame shrink-0" />
                  {address}
                </div>
                {permitNumber && <div className="text-xs font-mono text-gray-400 mt-0.5 ml-5">{permitNumber}</div>}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Stage</div>
                  <div className="font-bold text-sm text-gray-900">Stage {selectedStage} — {stageData?.shortName}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Discipline</div>
                  <div className="font-bold text-sm text-gray-900">{discData?.label}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Urgency</div>
                  <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md ${tierMeta[selectedTier].bg} ${tierMeta[selectedTier].color}`}>
                    {tierMeta[selectedTier].label} · {tierMeta[selectedTier].time}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{pricingMode === 'specialist_hourly' ? 'Pricing Mode' : 'Inspector Payout'}</div>
                  <div className="font-black text-flame text-lg">{pricingMode === 'specialist_hourly' ? 'Specialist hourly' : formatCurrency(pricing.inspectorPayout)}</div>
                </div>
                {pricingMode === 'specialist_hourly' && (
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Selected Role</div>
                    <div className="font-bold text-sm text-gray-900">{pricing.specialistRoleLabel}</div>
                  </div>
                )}
                {pricingMode === 'specialist_hourly' && (
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Billable Hours</div>
                    <div className="font-bold text-sm text-gray-900">{pricing.billableHours.toFixed(1)}h</div>
                  </div>
                )}
                {slots.length > 0 && (
                  <div className="col-span-2">
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Your Availability</div>
                    <div className="space-y-1">
                      {slots.map((s, i) => (
                        <div key={i} className="text-xs font-mono text-gray-700">
                          {new Date(s.date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })}
                          {' '}{s.startTime} – {s.endTime}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Safety Requirements summary */}
              {(ppeRequired.length > 0 || hazardFlags.length > 0 || safetyNotes) && (
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Shield className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs font-black text-gray-700 uppercase tracking-wide">Safety Requirements</span>
                    <span className="ml-auto text-[10px] bg-red-50 text-red-500 font-bold px-1.5 py-0.5 rounded border border-red-100">WorkSafe BC</span>
                  </div>

                  {ppeRequired.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">PPE Required</div>
                      <div className="flex flex-wrap gap-1">
                        {ppeRequired.map(id => {
                          const opt = PPE_OPTIONS.find(p => p.id === id)
                          return opt ? (
                            <span key={id} className="inline-flex items-center gap-1 text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100 rounded-md px-1.5 py-0.5">
                              {opt.emoji} {opt.label}
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}

                  {hazardFlags.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Site Hazards</div>
                      <div className="space-y-0.5">
                        {hazardFlags.map(id => {
                          const flag = HAZARD_FLAGS.find(f => f.id === id)
                          return flag ? (
                            <div key={id} className="flex items-center gap-1.5 text-[10px] text-amber-700">
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                              {flag.label}
                            </div>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}

                  {safetyNotes && (
                    <div className="bg-gray-50 rounded-lg px-2.5 py-2 text-xs text-gray-600 mt-1">
                      <span className="font-bold text-gray-500">Note: </span>{safetyNotes}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Escrow cost breakdown */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Escrow Breakdown</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Base booking</span>
                <span className="font-bold text-gray-900">{formatCurrency(pricing.baseFee)}</span>
              </div>
              {pricing.priorityAdjustment > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Urgency multiplier ({pricing.multiplier}x)</span>
                  <span className="font-bold text-gray-900">{formatCurrency(pricing.priorityAdjustment)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Vero Platform Commission (10%)</span>
                <span className="font-bold text-gray-900">{formatCurrency(pricing.platformCommission)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">Total Pre-Funded to Escrow</span>
                <span className="text-lg font-black text-slate-900">{formatCurrency(totalEscrow)}</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
              Funds held securely via Stripe. Vero releases payment only after the inspection workflow is completed and approved.
            </p>
          </div>

          {/* Vault retention tier */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="w-3.5 h-3.5 text-electric" />
                <span className="text-xs font-bold text-gray-700">Vault Retention</span>
                <span className="text-xs text-gray-500">
                  {VAULT_RETENTION_OPTIONS.find(o => o.tier === vaultTier)?.label} · {VAULT_RETENTION_OPTIONS.find(o => o.tier === vaultTier)?.duration}
                </span>
              </div>
              {vaultTier === 'legacy' ? (
                <span className="text-xs font-bold text-gray-700">${VAULT_RETENTION_OPTIONS.find(o => o.tier === 'legacy')?.monthlyPrice}/mo</span>
              ) : vaultTier === 'professional' ? (
                <span className="text-xs font-bold text-gray-700">+${VAULT_RETENTION_OPTIONS.find(o => o.tier === 'professional')?.price}</span>
              ) : (
                <span className="text-xs font-bold text-success-green">Included</span>
              )}
            </div>
            <button onClick={() => setStep('vault')} className="text-[10px] text-blue-500 hover:text-blue-700 mt-1 hover:underline">Change retention tier</button>
          </div>

          {/* What happens next */}
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 mb-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">What happens next</div>
            <div className="space-y-2">
              {[
                { icon: Radio,       text: 'Listing broadcast to all qualified local CPs via app + email' },
                { icon: Eye,         text: 'First eligible inspector to claim the slot is automatically assigned — no manual selection' },
                { icon: Shield,      text: 'Vero Reliability Guarantee starts backup dispatch and admin review if a confirmed inspector cannot attend' },
                { icon: Lock,        text: `${formatCurrency(totalEscrow)} held in secure escrow until you approve the inspection results` },
                { icon: FileText,    text: 'Inspector auto-generates a signed Schedule C-B on completion' },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Icon className="w-3.5 h-3.5 text-flame mt-0.5 shrink-0" />
                  <span className="text-xs text-gray-600">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Site Readiness Agreement (collapsible) ── */}
          <div className={`rounded-2xl border-2 overflow-hidden transition-all ${
            siteAgreed ? 'border-emerald-200 bg-emerald-50' : 'border-amber-100 bg-amber-50'
          }`}>
            {/* Agreement header — click to expand/collapse terms */}
            <button
              type="button"
              onClick={() => setSiteAgreementExpanded(v => !v)}
              aria-expanded={siteAgreementExpanded}
              className={`w-full px-4 py-3 border-b flex items-center gap-2 transition-colors ${
                siteAgreed
                  ? 'border-emerald-200 bg-emerald-100/60 hover:bg-emerald-100/80'
                  : 'border-amber-100 bg-amber-100/60 hover:bg-amber-100/80'
              }`}
            >
              <Shield className={`w-4 h-4 shrink-0 ${siteAgreed ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span className={`text-xs font-black uppercase tracking-wide ${siteAgreed ? 'text-emerald-700' : 'text-amber-700'}`}>
                Site Readiness Agreement
              </span>
              <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                siteAgreed
                  ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                  : 'text-amber-600 bg-amber-50 border-amber-200'
              }`}>Required</span>
              <ChevronDown
                className={`w-3.5 h-3.5 ml-1 shrink-0 transition-transform ${
                  siteAgreementExpanded ? 'rotate-180' : ''
                } ${siteAgreed ? 'text-emerald-600' : 'text-amber-600'}`}
              />
            </button>

            {/* Terms (collapsed by default to clear the fold) */}
            {siteAgreementExpanded && (
            <div className="px-4 py-3 space-y-2.5">
              {[
                {
                  bullet: '1',
                  text: `The site will be fully accessible, safe, and compliant with the BC Building Code and applicable WorkSafe BC regulations at the scheduled inspection time. All work must be at the stage stated in this request.`,
                },
                {
                  bullet: '2',
                  text: 'If the inspection cannot proceed due to site not being ready — including restricted access, unsafe conditions, or work not at the declared stage — Vero Permit records a site-readiness incident for admin review and inspector protection.',
                },
                {
                  bullet: '3',
                  text: 'Late cancellation, reserve, payout, or fee consequences are governed only by the active reliability policy. The default mode is observe-only until legal review approves enforcement.',
                },
                {
                  bullet: '4',
                  text: `The assigned inspector reserves the right to terminate the visit and issue a formal non-compliance notice if site conditions present an unreasonable risk under WorkSafe BC Occupational Health &amp; Safety Regulation.`,
                },
              ].map(({ bullet, text }) => (
                <div key={bullet} className="flex items-start gap-2.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5 ${
                    siteAgreed ? 'bg-emerald-200 text-emerald-700' : 'bg-amber-200 text-amber-700'
                  }`}>{bullet}</div>
                  <p
                    className="text-xs text-gray-600 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: text }}
                  />
                </div>
              ))}
            </div>
            )}

            {/* Checkbox */}
            <button
              onClick={() => setSiteAgreed(a => !a)}
              className={`w-full flex items-center gap-3 px-4 py-3 border-t transition-all ${
                siteAgreed
                  ? 'border-emerald-200 bg-emerald-100/40 hover:bg-emerald-100/60'
                  : 'border-amber-100 bg-white hover:bg-amber-50'
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                siteAgreed
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'bg-white border-amber-300 hover:border-amber-400'
              }`}>
                {siteAgreed && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className={`text-xs font-semibold ${siteAgreed ? 'text-emerald-700' : 'text-gray-700'}`}>
                I confirm the site will be ready and I understand Vero Permit will record readiness and late-change events for governed review
              </span>
            </button>
          </div>

          {/* Sticky footer: primary CTA stays visible on every device while the review content scrolls */}
          <div className="sticky bottom-0 -mx-5 -mb-5 px-5 pt-3 pb-5 bg-white/95 backdrop-blur border-t border-gray-100 z-10">
            {paymentStatus === 'idle' && (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={paymentLoading}
                disabled={!siteAgreed}
                onClick={async () => {
                  setPaymentLoading(true)
                  await new Promise(r => setTimeout(r, 1400))
                  setPaymentLoading(false)
                  setPaymentStatus('escrowed')
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Hold {formatCurrency(totalEscrow)} in Escrow
              </Button>
            )}

            {paymentStatus === 'escrowed' && (
              <div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center mb-3">
                  <div className="text-3xl mb-2">🔒</div>
                  <h3 className="text-base font-bold text-green-800">Provisional Hold</h3>
                  <p className="text-green-600 mt-1 text-xs">This is a 30-minute provisional hold to secure the inspector&apos;s arrival; funds are released only upon successful completion.</p>
                  <p className="font-mono text-xs text-gray-500 mt-2">{txnId}</p>
                </div>
                {postError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-600 font-medium">{postError}</p>
                  </div>
                )}
                <Button variant="primary" size="lg" fullWidth onClick={handlePost}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
                  Post to Live Job Board
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── BROADCASTING ANIMATION ──────────────── */}
      {step === 'broadcasting' && (
        <div className="text-center py-8">
          <div className="relative mx-auto w-24 h-24 mb-6">
            {/* Ripple rings */}
            <div className="absolute inset-0 rounded-full border-2 border-flame opacity-20 animate-ping" style={{ animationDuration: '1s' }} />
            <div className="absolute inset-2 rounded-full border-2 border-flame opacity-30 animate-ping" style={{ animationDuration: '1.3s' }} />
            <div className="absolute inset-4 rounded-full border-2 border-flame opacity-50 animate-ping" style={{ animationDuration: '1.6s' }} />
            <div className="relative w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center">
              <Radio className="w-9 h-9 text-flame" />
            </div>
          </div>

          <h3 className="text-xl font-black text-gray-900 mb-1">Broadcasting…</h3>
          <p className="text-sm text-gray-500 mb-6">Notifying qualified professionals in your area</p>

          <div className="bg-slate-900 rounded-2xl p-4 text-left">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-blue-400 font-mono uppercase tracking-widest">CPs Notified</span>
              {broadcastDone && <span className="text-xs text-success-green font-bold">✓ Complete</span>}
            </div>
            <div className="text-5xl font-black text-flame font-mono tabular-nums">{broadcastCount}</div>
            <div className="text-xs text-blue-500 mt-1 font-mono">{address}</div>
          </div>
        </div>
      )}

      {/* ─── LIVE STATE ──────────────────────────── */}
      {step === 'live' && (
        <div className="text-center py-6">
          <div className="relative mx-auto w-20 h-20 mb-5">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-40" />
            <div className="relative w-20 h-20 bg-success-green rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
          </div>

          <h3 className="text-2xl font-black text-gray-900 mb-1">Listing is Live</h3>
          <p className="text-sm text-gray-500 mb-5">Your request is on the Vero Live Board. The first eligible inspector to claim the slot is automatically assigned — you&apos;ll be notified when confirmed.</p>

          <div className="bg-slate-900 rounded-2xl p-4 text-left mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-flame rounded-full animate-pulse" />
              <span className="text-xs font-bold text-blue-300 tracking-widest uppercase">Live on Board</span>
              <span className="ml-auto text-xs font-mono text-blue-500">{jobRef}</span>
            </div>
            <div className="text-sm font-bold text-white mb-1">{address}</div>
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-blue-900">
              <div>
                <div className="text-xs text-blue-500">Stage</div>
                <div className="text-sm font-bold text-white">{stageData?.shortName}</div>
              </div>
              <div>
                <div className="text-xs text-blue-500">Escrow</div>
                <div className="text-sm font-black text-flame">{formatCurrency(totalEscrow)}</div>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-400">
            {broadcastCount} professionals notified · First claim typically arrives in <span className="font-semibold text-gray-600">under 5 min</span>
          </div>

          <Button variant="secondary" size="md" fullWidth className="mt-4" onClick={handleClose}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  )
}
