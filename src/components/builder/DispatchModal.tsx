'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Zap, Clock, AlertTriangle, CheckCircle2, Lock,
  MapPin, ChevronRight, ChevronLeft, ChevronDown,
  HardHat, Layers, Hammer, Droplets, Home,
  Radio, Shield, FileText,
  Eye, Archive, CreditCard
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SchedulingPicker, isSlotValidForTier, type TimeSlot } from '@/components/builder/SchedulingPicker'
import { ReliabilityGuarantee } from '@/components/builder/ReliabilityGuarantee'
import { INSPECTION_STAGES } from '@/lib/mockData'
import { CATALOGUE_MODEL_OPTIONS } from '@/lib/catalogue'
import {
  INSPECTION_INTENT_OPTIONS,
  NOT_SURE_DISAMBIGUATION,
  resolveIntentToStageDiscipline,
  getInspectionIntentOption,
  getNotSureBucketOption,
} from '@/lib/inspections/inspectionIntent'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useStore } from '@/lib/store'
import { validateSiteAddressFormat } from '@/lib/siteAddressValidation'
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

type Step = 'address' | 'schedule' | 'intent' | 'stage' | 'discipline' | 'safety' | 'tier' | 'vault' | 'confirm' | 'broadcasting' | 'live'

const DISCIPLINES = [
  { id: 'structural',       label: 'Structural',        icon: HardHat,  description: 'Load paths, framing, foundations' },
  { id: 'geotech',          label: 'Geotechnical',      icon: Layers,   description: 'Soil, excavation, ground conditions' },
  { id: 'mechanical',       label: 'Mechanical',        icon: Hammer,   description: 'HVAC, ventilation, HRV/ERV' },
  { id: 'electrical',       label: 'Electrical',        icon: Zap,      description: 'Electrical rough-in & grounding' },
  { id: 'plumbing',         label: 'Plumbing',          icon: Droplets, description: 'Drainage, supply, fixtures' },
  { id: 'architectural',    label: 'Architectural',     icon: Home,     description: 'Building envelope & code compliance' },
  { id: 'fire_protection',  label: 'Fire Protection',   icon: Shield,   description: 'Fire suppression, alarms & life safety' },
]

// Default discipline for each inspection stage.
// Builders can override, but this pre-fills the most common selection.
const STAGE_TO_DISCIPLINE: Record<number, string> = {
  1: 'geotech',        // Site Survey & Excavation
  2: 'structural',     // Foundation Pour
  3: 'structural',     // Framing & Lock-up
  4: 'architectural',  // Insulation & Energy Compliance
  5: 'architectural',  // Interior Completion
  6: 'geotech',         // Exterior Works and Site Finalization
  7: 'architectural',  // Final Approval and Occupancy
}

const STEP_NUM: Record<Step, number> = {
  // 'intent' is the plain-language default for step 3; 'stage'/'discipline' are
  // the advanced "Change inspection details" path and share the same counter.
  address: 1, schedule: 2, intent: 3, stage: 3, discipline: 4, safety: 5, tier: 6, vault: 7, confirm: 8, broadcasting: 8, live: 8,
}

const STAGE_WORKFLOW_DESCRIPTIONS: Record<number, string> = {
  1: 'Initial site-stage inspection to verify site conditions, layout, and excavation readiness.',
  2: 'Pre-pour inspection to verify formwork, reinforcement, and required conditions before concrete placement.',
  3: 'Structural stage inspection to verify framing, envelope readiness, and pre-closure conditions.',
  4: 'Envelope inspection to verify thermal, moisture, and pre-drywall compliance requirements.',
  5: 'Interior completion inspection to verify finishing, fixtures, and pre-exterior readiness.',
  6: 'Exterior and site inspection to verify cladding, grading, drainage, and site works completion.',
  7: 'Final life safety and occupancy inspection to verify all systems, deficiencies, and permit conditions.',
}

const STAGE_PERMIT_REQUIRED_MESSAGE = 'Permit number is required for Stage 2 and later inspections.'
const PERMIT_REFERENCE_MATCHES_PROJECT_MESSAGE =
  'Permit reference cannot match the project name. Enter the issued permit number or municipal file reference.'

function formatProjectAddress(project: Project | null | undefined) {
  if (!project) return ''
  return [project.address, project.city].filter(Boolean).join(', ')
}

function getPostingIdentity(address: string, project: Project | null | undefined) {
  const trimmedAddress = address.trim()
  const addressParts = trimmedAddress.split(',').map(part => part.trim()).filter(Boolean)
  return {
    siteAddress: addressParts[0] ?? trimmedAddress,
    city: addressParts.length > 1
      ? addressParts.slice(1).join(', ')
      : project?.city?.trim() ?? '',
  }
}

export function DispatchModal({ project, isOpen, onClose, onDispatch }: DispatchModalProps) {
  const { user }    = useAuth()
  const { addJob }  = useStore()
  const [step, setStep]                     = useState<Step>('address')
  // Phase A: builder picks how they will pay. Interac is active; card is a
  // visible-but-pending placeholder (no Stripe call, no Checkout, no charge).
  const [paymentMethod, setPaymentMethod]   = useState<'interac' | 'card'>('interac')
  // Best-effort status of the Interac payment-instruction email. This is purely
  // informational UI state — it never affects payment release, escrow_authorized,
  // or whether the job goes live.
  const [interacEmailStatus, setInteracEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [copiedField, setCopiedField] = useState<'email' | 'ref' | null>(null)
  const [address, setAddress]               = useState(formatProjectAddress(project))
  const [permitNumber, setPermitNumber]     = useState(project?.permitNumber ?? '')
  const [projectName, setProjectName]       = useState(project?.name ?? '')
  const [selectedModelCode, setSelectedModelCode] = useState<string | null>(null)
  const [selectedStage, setSelectedStage]   = useState<number | null>(project?.currentStage ?? null)
  const [selectedDisc, setSelectedDisc]     = useState<string | null>(null)
  // Plain-language inspection need. Pre-fills selectedStage/selectedDisc; the
  // builder never has to understand stage numbers or templates.
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null)
  // When the builder picks "Not Sure", show a plain-language follow-up card
  // instead of the technical stage/discipline flow.
  const [notSureMode, setNotSureMode] = useState(false)
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
  const [vaultTier, setVaultTier]           = useState<VaultRetentionTier>('standard')
  const [postError, setPostError]           = useState<string | null>(null)
  const [permitError, setPermitError]       = useState<string | null>(null)
  const [txnId] = useState(() => `TXN-${Date.now()}`)
  // Persisted job-based reference. Null until the request is saved; then set to
  // the real job id so the on-screen reference and the payment email match what
  // admin can look up. (Pre-submit the listing header shows "Draft".)
  const [jobRef, setJobRef] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [locationHint, setLocationHint] = useState<string | null>(null)
  const addressInputRef = useRef<HTMLInputElement | null>(null)
  const manuallyEditedRef = useRef({
    address: false,
    permitNumber: false,
    projectName: false,
    selectedStage: false,
  })

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

  useEffect(() => {
    if (!isOpen || !project) return

    const nextAddress = formatProjectAddress(project)
    if (!manuallyEditedRef.current.address) setAddress(nextAddress)
    if (!manuallyEditedRef.current.projectName) setProjectName(project.name ?? '')
    if (!manuallyEditedRef.current.permitNumber) setPermitNumber(project.permitNumber ?? '')
    if (!manuallyEditedRef.current.selectedStage) {
      setSelectedStage(project.currentStage ?? null)
      setSelectedDisc(STAGE_TO_DISCIPLINE[project.currentStage ?? 0] ?? null)
    }
    if (project.permitNumber?.trim()) setPermitError(null)
  }, [isOpen, project])

  const reset = () => {
    setStep('address')
    manuallyEditedRef.current = {
      address: false,
      permitNumber: false,
      projectName: false,
      selectedStage: false,
    }
    setAddress(formatProjectAddress(project))
    setPermitNumber(project?.permitNumber ?? '')
    setProjectName(project?.name ?? '')
    setSelectedStage(project?.currentStage ?? null)
    setSelectedDisc(null)
    setSelectedIntent(null)
    setNotSureMode(false)
    setSelectedTier('priority')
    setSelectedSpecialistRole(null)
    setBillableHours(1.5)
    setSlots([])
    setPpeRequired([])
    setHazardFlags([])

    setSafetyNotes('')
    setSiteAgreed(false)
    setSiteAgreementExpanded(false)
    setPostError(null)
    setPermitError(null)
    setIsLocating(false)
    setLocationError(null)
    setLocationHint(null)
  }

  const handleClose = () => { reset(); onClose() }

  const handleTierSelection = (tier: DispatchTier) => {
    setSelectedTier(tier)
    setSlots(currentSlots => currentSlots.filter(slot => isSlotValidForTier(slot, tier)))
  }

  const requiresPermitNumber = (stage: number | null | undefined) => (stage ?? 1) >= 2
  const permitNumberIsMissing = requiresPermitNumber(selectedStage) && !permitNumber.trim()
  const permitReferenceMatchesProjectName =
    Boolean(permitNumber.trim() && projectName.trim() && permitNumber.trim() === projectName.trim())
  const validateProjectIdentityBeforeContinuing = () => {
    setPostError(null)
    const identity = getPostingIdentity(address, project)
    if (!projectName.trim()) {
      setPostError('Project name is required.')
      setStep('address')
      return true
    }
    if (!identity.siteAddress.trim()) {
      setPostError('Site address is required.')
      setStep('address')
      return true
    }
    if (!identity.city.trim()) {
      setPostError('City or municipality is required.')
      setStep('address')
      return true
    }
    // Defensive only: intent selection normally pre-fills both. If either is
    // missing, return the builder to the readiness step rather than exposing the
    // technical stage/discipline screens.
    if (!selectedStage) {
      setPostError('Please tell us what is ready to be inspected.')
      setStep('intent')
      return true
    }
    if (!selectedDisc) {
      setPostError('Please tell us what is ready to be inspected.')
      setStep('intent')
      return true
    }
    return false
  }
  const validatePermitReferenceBeforeContinuing = () => {
    setPostError(null)
    if (permitNumberIsMissing) {
      setPermitError(STAGE_PERMIT_REQUIRED_MESSAGE)
      setStep('address')
      return true
    }
    if (requiresPermitNumber(selectedStage) && permitReferenceMatchesProjectName) {
      setPermitError(PERMIT_REFERENCE_MATCHES_PROJECT_MESSAGE)
      setStep('address')
      return true
    }
    return false
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
        manuallyEditedRef.current.address = true
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

    if (validateProjectIdentityBeforeContinuing()) return

    if (!hasValidSchedulingWindow) {
      setPostError('Add at least one valid availability window for the selected dispatch speed before posting.')
      setStep('schedule')
      return
    }

    if (validatePermitReferenceBeforeContinuing()) return

    const stageInfo = INSPECTION_STAGES.find(s => s.id === (selectedStage ?? 1))
    const identity = getPostingIdentity(address, project)

    const approvalStatus = await getBuilderOnboardingStatusAsync(user?.id, user?.supabaseId)

    const result = await addJob({
      projectId:             project?.id,
      projectName:          projectName.trim(),
      address:              identity.siteAddress,
      city:                 identity.city,
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
      catalogueModelCode:   selectedModelCode ?? undefined,
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

    // The request is saved. Adopt the persisted job id as the canonical
    // reference shown on screen and used in the payment email.
    const newJobId = result.value
    setJobRef(newJobId)

    // Card path: the job is created as pending_validation (payment not yet
    // authorized). Hand off to Stripe Checkout — the job is released only by the
    // verified Stripe webhook, never by the browser returning from Stripe.
    if (paymentMethod === 'card') {
      try {
        const res = await fetch('/api/builder/payments/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: result.value }),
        })
        const data = await res.json().catch(() => null)
        if (res.ok && data?.ok && typeof data.url === 'string') {
          window.location.href = data.url
          return
        }
        setPostError(
          (data?.error as string | undefined) ??
            'Could not start card checkout. You can retry or pay by Interac e-Transfer.',
        )
      } catch {
        setPostError('Could not start card checkout. You can retry or pay by Interac e-Transfer.')
      }
      return
    }

    // Interac path: email the builder the payment instructions (best-effort).
    // A failure here must never block the submitted flow — the job already
    // exists and the on-screen instructions still show the same details. The
    // result only drives an informational message; it cannot release the job.
    setInteracEmailStatus('sending')
    void (async () => {
      try {
        const res = await fetch('/api/builder/payments/interac-instructions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId: newJobId }),
        })
        const data = await res.json().catch(() => null)
        setInteracEmailStatus(res.ok && data?.ok && data?.emailed === true ? 'sent' : 'failed')
      } catch {
        setInteracEmailStatus('failed')
      }
    })()

    setBroadcastCount(0)
    setBroadcastDone(false)
    setStep('broadcasting')
    onDispatch(selectedTier)
  }

  // Client-only clipboard helper for the Interac details (no backend involved).
  const handleCopy = async (field: 'email' | 'ref', value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      setTimeout(() => setCopiedField(curr => (curr === field ? null : curr)), 1800)
    } catch {
      // Clipboard may be unavailable (permissions/insecure context); silently
      // ignore — the value is already visible on screen.
    }
  }

  const stageData = selectedStage ? INSPECTION_STAGES[selectedStage - 1] : null
  const discData = DISCIPLINES.find(d => d.id === selectedDisc)
  const credentialClass =
    selectedDisc === 'architectural'
      ? 'AIBC'
      : undefined
  // Stage 7 (Final Approval and Occupancy) always requires specialist sign-off,
  // even when no discipline has been selected yet. Flag it so the cards and
  // total display the specialist-hourly rate the builder will actually be charged.
  const isFinalOccupancyStage = selectedStage === 7
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
              className="h-full bg-[#C6A15B] rounded-full transition-all duration-500"
              style={{ width: `${(STEP_NUM[step] / 8) * 100}%` }}
            />
          </div>
        </div>
      )}

      {postError && step !== 'confirm' && (
        <div className="mb-4 rounded-xl border border-gray-200 border-l-2 border-l-red-500 bg-gray-50 p-3 text-xs font-semibold text-gray-700">
          {postError}
        </div>
      )}

      {/* ─── STEP 1: ADDRESS ─────────────────────── */}
      {step === 'address' && (
        <div>
          <h2 className="text-xl font-black text-gray-900 mb-1">Where&apos;s the site?</h2>
          <p className="text-sm text-gray-500 mb-5">Enter the full project site address, including city and province.</p>

          <div className="relative z-10 mb-3">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-[#C6A15B] transition-all hover:border-gray-300 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:cursor-wait disabled:opacity-60"
              aria-label="Use current location"
              title="Use current location"
            >
              <MapPin className="h-4 w-4" />
            </button>
            <input
              ref={addressInputRef}
              type="text"
              value={address}
              onChange={e => {
                manuallyEditedRef.current.address = true
                setAddress(e.target.value)
              }}
              placeholder="123 Main St, Vancouver, BC"
              className="w-full rounded-xl border-2 border-gray-200 bg-white py-3.5 pl-13 pr-4 text-sm font-medium text-gray-900 caret-gray-900 transition-colors placeholder:text-gray-400 focus:border-[#C6A15B] focus:ring-1 focus:ring-[#C6A15B]/30 focus:outline-none"
            />
          </div>
          {(isLocating || locationError || locationHint) && (
            <p className={`mb-3 px-1 text-xs font-medium ${locationError ? 'text-red-600' : isLocating ? 'text-[#C6A15B]' : 'text-gray-500'}`}>
              {locationError ?? (isLocating ? 'Capturing your current location…' : locationHint)}
            </p>
          )}

          {!project && address.length === 0 && (
            <div className="relative z-10 mb-4 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
              <div className="px-3 py-2 text-xs text-gray-400 font-semibold tracking-wide uppercase border-b border-gray-100">Recent Sites</div>
              {['2847 Cornwall Ave, Vancouver, BC', '155 E 10th Ave, Vancouver, BC', '4521 Kingsway, Burnaby, BC'].map(a => (
                <button key={a} onClick={() => {
                  manuallyEditedRef.current.address = true
                  setAddress(a)
                }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 transition-colors text-left">
                  <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700">{a}</span>
                </button>
              ))}
            </div>
          )}

          <input type="text" value={projectName} onChange={e => {
            manuallyEditedRef.current.projectName = true
            setProjectName(e.target.value)
            if (permitNumber.trim() !== e.target.value.trim()) setPermitError(null)
          }}
            placeholder="Project name (e.g. Kitsilano Infill Duplex)"
            className="relative z-10 mb-3 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-sm font-medium text-gray-900 caret-gray-900 transition-colors placeholder:text-gray-400 focus:border-[#C6A15B] focus:ring-1 focus:ring-[#C6A15B]/30 focus:outline-none" />

          <label htmlFor="housing-model" className="mb-1 block px-1 text-xs font-black uppercase tracking-wide text-gray-600">
            Housing model <span className="font-semibold normal-case text-gray-400">(optional)</span>
          </label>
          <div className="relative z-10 mb-1">
            <select id="housing-model" value={selectedModelCode ?? ''} onChange={e => setSelectedModelCode(e.target.value || null)}
              className="w-full appearance-none rounded-xl border-2 border-gray-200 bg-white px-4 py-3.5 text-sm font-medium text-gray-900 transition-colors focus:border-[#C6A15B] focus:ring-1 focus:ring-[#C6A15B]/30 focus:outline-none">
              <option value="">Not from catalogue / not specified</option>
              {CATALOGUE_MODEL_OPTIONS.map(model => (
                <option key={model.code} value={model.code}>{model.housingModel}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-400 mb-5 px-1">
            Optional. Tags this request with a Build Canada Homes / small-housing catalogue model. Recorded for tracking only — it does not change the inspection stages or checklist.
          </p>

          <label htmlFor="permit-reference" className="mb-1 block px-1 text-xs font-black uppercase tracking-wide text-gray-600">
            Permit number or municipal file reference
          </label>
          <div className="relative z-10 mb-1">
            <input id="permit-reference" type="text" value={permitNumber} onChange={e => {
              manuallyEditedRef.current.permitNumber = true
              setPermitNumber(e.target.value)
              if (e.target.value.trim()) setPermitError(null)
            }}
              placeholder={requiresPermitNumber(selectedStage) ? 'Permit number or municipal file reference' : 'Permit number or municipal file reference'}
              aria-invalid={permitError || permitNumberIsMissing || permitReferenceMatchesProjectName ? 'true' : 'false'}
              className={`w-full rounded-xl border-2 bg-white px-4 py-3.5 text-sm font-medium font-mono text-gray-900 caret-gray-900 transition-colors placeholder:text-gray-400 focus:ring-1 focus:outline-none ${
                permitError || permitNumberIsMissing || permitReferenceMatchesProjectName
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-gray-200 focus:border-[#C6A15B] focus:ring-[#C6A15B]/30'
              }`} />
          </div>
          {permitError || permitNumberIsMissing || (requiresPermitNumber(selectedStage) && permitReferenceMatchesProjectName) ? (
            <p className="text-xs text-red-600 font-semibold mb-5 px-1">
              {permitError ?? (permitReferenceMatchesProjectName ? PERMIT_REFERENCE_MATCHES_PROJECT_MESSAGE : STAGE_PERMIT_REQUIRED_MESSAGE)}
            </p>
          ) : (
            <p className="text-xs text-gray-400 mb-5 px-1">
              {requiresPermitNumber(selectedStage)
                ? 'Required for Stage 2 and later. Enter the issued building permit number or formal municipal permit file reference. Vero records this reference but does not independently verify it with the municipality.'
                : 'Stage 1 may be posted before the permit is issued. Add a permit number if available — later stages will require a permit number or municipal file reference.'}
            </p>
          )}

          <Button variant="primary" size="lg" fullWidth className="bg-[#C6A15B] text-[#1B1508] hover:bg-[#D8B871] focus:ring-[#C6A15B] shadow-sm shadow-gray-900/10 disabled:opacity-100 disabled:bg-gray-100 disabled:text-gray-400" disabled={!address.trim() || permitNumberIsMissing} onClick={() => {
            setPostError(null)
            const addrErr = validateSiteAddressFormat(address)
            if (addrErr) { setPostError(addrErr); return }
            if (validatePermitReferenceBeforeContinuing()) return
            setStep('schedule')
          }}>
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
          <Button variant="primary" size="lg" fullWidth className="bg-[#C6A15B] text-[#1B1508] hover:bg-[#D8B871] focus:ring-[#C6A15B] shadow-sm shadow-gray-900/10 disabled:opacity-100 disabled:bg-gray-100 disabled:text-gray-400"
            disabled={!hasValidSchedulingWindow}
            onClick={() => setStep('intent')}>
            Continue <ChevronRight className="w-4 h-4" />
          </Button>
          {!hasValidSchedulingWindow && (
            <p className="mt-3 text-center text-xs text-gray-400">
              Add at least one valid availability window inside the selected dispatch range to continue.
            </p>
          )}
        </div>
      )}

      {/* ─── STEP 3: INSPECTION NEED (plain language) ─────────────────────── */}
      {step === 'intent' && (
        <div>
          <button
            onClick={() => (notSureMode ? setNotSureMode(false) : setStep('schedule'))}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>

          {!notSureMode ? (
            <>
              <h2 className="text-xl font-black text-gray-900 mb-1">What is ready to be inspected?</h2>
              <p className="text-sm text-gray-500 mb-4">
                Tell us what&apos;s ready on site. Vero handles the rest — matching the right inspector and checklist behind the scenes, with no stage numbers or codes needed.
              </p>

              <div className="space-y-2 mb-5">
                {INSPECTION_INTENT_OPTIONS.map(option => {
                  const isSelected = selectedIntent === option.id
                  return (
                    <button key={option.id} onClick={() => {
                      // "Not Sure" opens a plain-language follow-up instead of
                      // sending the builder into stage/discipline.
                      if (option.id === 'not_sure') {
                        setSelectedIntent(null)
                        setSelectedStage(null)
                        setSelectedDisc(null)
                        setNotSureMode(true)
                        return
                      }
                      const resolved = resolveIntentToStageDiscipline(option.id)
                      manuallyEditedRef.current.selectedStage = true
                      setSelectedIntent(option.id)
                      setSelectedStage(resolved.builderStage)
                      setSelectedDisc(resolved.discipline)
                      if (resolved.builderStage < 2 || permitNumber.trim()) setPermitError(null)
                    }}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                        isSelected ? 'border-gray-900 bg-white' : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 text-sm">{option.label}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{option.helperText}</div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-[#C6A15B] shrink-0" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-black text-gray-900 mb-1">No problem. What is this closest to?</h2>
              <p className="text-sm text-gray-500 mb-4">
                Pick the closest match. Your inspector will confirm the exact inspection before any work begins — you don&apos;t need to get this exactly right.
              </p>

              <div className="space-y-2 mb-5">
                {NOT_SURE_DISAMBIGUATION.map(bucket => {
                  const isSelected = selectedIntent === bucket.id
                  return (
                    <button key={bucket.id} onClick={() => {
                      const resolved = resolveIntentToStageDiscipline(bucket.id)
                      manuallyEditedRef.current.selectedStage = true
                      setSelectedIntent(bucket.id)
                      setSelectedStage(resolved.builderStage)
                      setSelectedDisc(resolved.discipline)
                      if (resolved.builderStage < 2 || permitNumber.trim()) setPermitError(null)
                    }}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                        isSelected ? 'border-gray-900 bg-white' : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 text-sm">{bucket.label}</div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-[#C6A15B] shrink-0" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Recommendation summary — plain language, no codes. Low-confidence
              (Not Sure) picks stay deliberately generic and never name a stage
              or discipline the builder didn't choose. */}
          {selectedIntent && (() => {
            const activeOpt = getInspectionIntentOption(selectedIntent) ?? getNotSureBucketOption(selectedIntent)
            if (!activeOpt) return null
            const isLow = activeOpt.confidence === 'low'
            return (
              <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-xs font-black uppercase tracking-widest text-[#C6A15B] mb-1">
                  {isLow ? "We'll get you started" : 'This looks like'}
                </div>
                <div className="text-sm font-bold text-gray-900">
                  {isLow
                    ? 'Vero will match you with the right inspector'
                    : `${activeOpt.label} inspection`}
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-snug">
                  {activeOpt.confidence === 'high' &&
                    'Vero will arrange a qualified inspector and prepare the appropriate checklist for them to use on your inspection.'}
                  {activeOpt.confidence === 'medium' &&
                    'Vero will arrange a qualified inspector. Your inspector will confirm the exact scope before work begins.'}
                  {activeOpt.confidence === 'low' &&
                    "We'll line up a qualified inspector and confirm the exact inspection scope with you before any work begins."}
                </p>
              </div>
            )
          })()}

          {/* Primary action: the plain-language path always moves straight to
              Safety. The technical stage / discipline screens are NOT in this
              flow — they are reachable only via the clearly-secondary "Change
              inspection details" link below. */}
          <Button variant="primary" size="lg" fullWidth className="bg-[#C6A15B] text-[#1B1508] hover:bg-[#D8B871] focus:ring-[#C6A15B] shadow-sm shadow-gray-900/10 disabled:opacity-100 disabled:bg-gray-100 disabled:text-gray-400" disabled={!selectedStage || !selectedDisc} onClick={() => {
            setPostError(null)
            if (validatePermitReferenceBeforeContinuing()) return
            setStep('safety')
          }}>
            Continue <ChevronRight className="w-4 h-4" />
          </Button>

          {/* The technical stage / discipline screens are intentionally NOT
              reachable from the normal builder flow. Builders report readiness;
              Vero resolves stage + discipline behind the scenes. The 'stage' and
              'discipline' steps below are retained dormant for future
              admin/internal use only. */}
        </div>
      )}

      {/* ─── STEP 3 (advanced): STAGE ────────────── */}
      {step === 'stage' && (
        <div>
          <button onClick={() => setStep('intent')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4">
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
                <button key={stage.id} onClick={() => {
                  manuallyEditedRef.current.selectedStage = true
                  setSelectedStage(stage.id)
                  setSelectedDisc(STAGE_TO_DISCIPLINE[stage.id] ?? null)
                  if (stage.id < 2 || permitNumber.trim()) setPermitError(null)
                }}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                    isSelected ? 'border-gray-900 bg-white' : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      isSelected ? 'bg-[#C6A15B] text-[#1B1508]' : 'bg-gray-100 text-gray-600'
                    }`}>{stage.id}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-sm">{stage.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{workflowDescription}</div>
                      <div className="text-xs text-gray-300 mt-0.5">{stage.items.length} required inspection items</div>
                      {stage.id === 3 && (
                        <div className="text-xs text-gray-400 mt-1 leading-snug">
                          Covers pre-closure inspections. Choose the required discipline on the next step: Structural, Building Envelope, Fire Protection, or Plumbing.
                        </div>
                      )}
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-[#C6A15B] shrink-0" />}
                  </div>
                </button>
              )
            })}
          </div>

          <p className="mb-4 text-xs text-gray-400">
            Selecting a stage loads the detailed inspection requirements for that phase.
          </p>

          <Button variant="primary" size="lg" fullWidth className="bg-[#C6A15B] text-[#1B1508] hover:bg-[#D8B871] focus:ring-[#C6A15B] shadow-sm shadow-gray-900/10 disabled:opacity-100 disabled:bg-gray-100 disabled:text-gray-400" disabled={!selectedStage} onClick={() => {
            setPostError(null)
            if (validatePermitReferenceBeforeContinuing()) return
            setStep('discipline')
          }}>
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
            <p className="mb-4 text-xs text-[#C6A15B] font-semibold">Auto-selected based on inspection stage — override if needed.</p>
          )}

          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {DISCIPLINES.map(disc => {
              const Icon = disc.icon
              const isSelected = selectedDisc === disc.id
              return (
                <button key={disc.id} onClick={() => setSelectedDisc(disc.id)}
                  className={`text-left rounded-xl border-2 p-3.5 transition-all ${
                    isSelected ? 'border-gray-900 bg-white' : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${isSelected ? 'bg-[#C6A15B]' : 'bg-gray-100'}`}>
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-[#1B1508]' : 'text-gray-600'}`} />
                  </div>
                  <div className="font-bold text-gray-900 text-sm">{disc.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5 leading-tight">{disc.description}</div>
                </button>
              )
            })}
          </div>

          <Button variant="primary" size="lg" fullWidth className="bg-[#C6A15B] text-[#1B1508] hover:bg-[#D8B871] focus:ring-[#C6A15B] shadow-sm shadow-gray-900/10 disabled:opacity-100 disabled:bg-gray-100 disabled:text-gray-400" disabled={!selectedDisc} onClick={() => setStep('safety')}>
            Continue <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ─── STEP 5: SAFETY REQUIREMENTS ─────────── */}
      {step === 'safety' && (
        <div>
          {/* Back returns to the readiness step. The technical stage/discipline
              screens are not part of the normal builder flow. */}
          <button onClick={() => setStep('intent')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4">
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center">
              <Shield className="w-4 h-4 text-gray-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900">Safety Requirements</h2>
          </div>
          <p className="text-sm text-gray-500 mb-1">Set PPE minimums and site conditions for this job. Inspectors see these before claiming. <span className="font-semibold text-gray-700">WorkSafe BC compliant.</span></p>
          <p className="text-xs text-gray-400 mb-5">All fields optional — skip if no special requirements apply.</p>

          {/* PPE Minimums */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-1 h-4 bg-gray-300 rounded-full" />
              <span className="text-xs font-black text-gray-700 uppercase tracking-widest">PPE Minimums</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PPE_OPTIONS.map(opt => {
                const sel = ppeRequired.includes(opt.id)
                return (
                  <button key={opt.id} onClick={() => toggleItem(ppeRequired, setPpeRequired, opt.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                      sel ? 'border-gray-900 bg-white' : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}>
                    <span className="text-base leading-none">{opt.emoji}</span>
                    <span className={`text-xs font-bold ${sel ? 'text-gray-900' : 'text-gray-700'}`}>{opt.label}</span>
                    {sel && <CheckCircle2 className="w-3.5 h-3.5 text-[#C6A15B] ml-auto shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Hazard Flags */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-1 h-4 bg-gray-300 rounded-full" />
              <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Site Hazards</span>
            </div>
            <div className="space-y-1.5">
              {HAZARD_FLAGS.map(flag => {
                const sel = hazardFlags.includes(flag.id)
                return (
                  <button key={flag.id} onClick={() => toggleItem(hazardFlags, setHazardFlags, flag.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 text-left transition-all ${
                      sel ? 'border-gray-900 bg-white' : 'border-gray-200 hover:border-gray-300 bg-white'
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
              className="w-full resize-none rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 caret-gray-900 transition-colors placeholder:text-gray-400 focus:border-[#C6A15B] focus:ring-1 focus:ring-[#C6A15B]/30 focus:outline-none"
            />
          </div>

          <Button variant="primary" size="lg" fullWidth className="bg-[#C6A15B] text-[#1B1508] hover:bg-[#D8B871] focus:ring-[#C6A15B] shadow-sm shadow-gray-900/10 disabled:opacity-100 disabled:bg-gray-100 disabled:text-gray-400" onClick={() => setStep('tier')}>
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
                    isSelected ? 'border-gray-900 bg-white' : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-[#C6A15B]' : 'bg-gray-100'}`}>
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-[#1B1508]' : 'text-gray-500'}`} />
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

          <div className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs font-black uppercase tracking-widest text-gray-500">Estimated Total</div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <div className="text-sm text-gray-500">Total escrow required</div>
                <div className="text-2xl font-black text-gray-900">{formatCurrency(pricing.builderEscrowTotal)}</div>
              </div>
              <div className="text-right text-xs text-gray-500">
                {pricingMode === 'specialist_hourly' ? 'Specialist pricing applied automatically when required' : 'Fixed dispatch pricing'}
              </div>
            </div>
            <div className="mt-4 border-t border-gray-200 pt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Pricing mode</span>
                <span className="font-bold text-gray-900">{pricingMode === 'specialist_hourly' ? 'Specialist hourly' : 'Fixed dispatch'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Dispatch speed</span>
                <span className="font-bold text-gray-900">{tierMeta[selectedTier].label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Base booking</span>
                <span className="font-bold text-gray-900">{formatCurrency(pricing.baseFee)}</span>
              </div>
              {pricing.multiplier > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Urgency multiplier</span>
                  <span className="font-bold text-gray-900">×{pricing.multiplier.toFixed(1)}</span>
                </div>
              )}
              {pricing.urgencyAdjustment > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Urgency adjustment</span>
                  <span className="font-bold text-gray-900">{formatCurrency(pricing.urgencyAdjustment)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Platform fee</span>
                <span className="font-bold text-gray-900">{formatCurrency(pricing.platformCommission)}</span>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 -mx-5 -mb-5 px-5 pt-3 pb-5 bg-white/95 backdrop-blur border-t border-gray-100 z-10">
            <Button variant="primary" size="lg" fullWidth className="bg-[#C6A15B] text-[#1B1508] hover:bg-[#D8B871] focus:ring-[#C6A15B] shadow-sm shadow-gray-900/10 disabled:opacity-100 disabled:bg-gray-100 disabled:text-gray-400" disabled={!hasValidSchedulingWindow} onClick={() => {
              if (validateProjectIdentityBeforeContinuing()) return
              if (validatePermitReferenceBeforeContinuing()) return
              setStep('vault')
            }}>
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
                    ? 'border-gray-900 bg-white'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      vaultTier === option.tier ? 'border-[#C6A15B] bg-[#C6A15B]' : 'border-gray-300'
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
                  <span className="ml-6 mt-1.5 inline-block text-[10px] font-bold text-[#C6A15B] bg-[#C6A15B]/10 px-2 py-0.5 rounded-full">{option.badge}</span>
                )}
              </button>
            ))}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-5 flex items-start gap-2">
            <Archive className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-600 leading-relaxed">
              Your sealed inspection record, evidence, and submission package will be retained in the Vero Vault for the selected period. Upgrade at any time from the Vault dashboard.
            </p>
          </div>

          <button
            onClick={() => setStep('confirm')}
            className="w-full py-3.5 bg-[#C6A15B] text-[#1B1508] font-black text-sm rounded-2xl hover:bg-[#D8B871] transition-all flex items-center justify-center gap-2"
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
                <div className="w-2 h-2 bg-[#C6A15B] rounded-full animate-pulse" />
                <span className="text-xs font-bold text-gray-300 tracking-widest uppercase">Draft Listing</span>
              </div>
              <span className="text-xs font-mono text-gray-400">{jobRef ?? 'Draft'}</span>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Site Address</div>
                <div className="font-bold text-gray-900 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#C6A15B] shrink-0" />
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
                  <div className="font-black text-[#C6A15B] text-lg">{pricingMode === 'specialist_hourly' ? 'Specialist hourly' : formatCurrency(pricing.inspectorPayout)}</div>
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
                    <Shield className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs font-black text-gray-700 uppercase tracking-wide">Safety Requirements</span>
                    <span className="ml-auto text-[10px] bg-gray-100 text-gray-600 font-bold px-1.5 py-0.5 rounded border border-gray-200">WorkSafe BC</span>
                  </div>

                  {ppeRequired.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">PPE Required</div>
                      <div className="flex flex-wrap gap-1">
                        {ppeRequired.map(id => {
                          const opt = PPE_OPTIONS.find(p => p.id === id)
                          return opt ? (
                            <span key={id} className="inline-flex items-center gap-1 text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200 rounded-md px-1.5 py-0.5">
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

          {/* Payment breakdown */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Payment Breakdown</div>
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
                <span className="text-sm font-bold text-gray-900">Total Payment Required</span>
                <span className="text-lg font-black text-slate-900">{formatCurrency(totalEscrow)}</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
              Vero confirms payment before inspectors can claim this request. Inspector payout is released after completion and review.
            </p>
          </div>

          {/* Payment method — Interac active; card via Stripe Checkout */}
          <div className="mb-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Payment Method</div>

            {/* Interac e-Transfer — active */}
            <button
              type="button"
              onClick={() => setPaymentMethod('interac')}
              aria-pressed={paymentMethod === 'interac'}
              className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                paymentMethod === 'interac'
                  ? 'border-gray-900 bg-white'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  paymentMethod === 'interac' ? 'border-[#C6A15B]' : 'border-gray-300'
                }`}>
                  {paymentMethod === 'interac' && <div className="w-2 h-2 rounded-full bg-[#C6A15B]" />}
                </div>
                <span className="font-bold text-sm text-gray-900">Interac e-Transfer</span>
                <span className="ml-auto text-[10px] font-bold text-gray-600 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">
                  No Vero processing fee
                </span>
              </div>
              {paymentMethod === 'interac' && (
                <div className="mt-3 pl-6 space-y-2">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Manual bank transfer. We will email you the payment details, including the amount and request reference. Your request is saved but not live for inspector claim until Vero confirms payment.
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Send payment to <span className="font-bold text-gray-900">payments@veropermit.com</span> using your request reference in the message field.
                  </p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Your bank may apply its own transfer limits or fees.
                  </p>
                </div>
              )}
            </button>

            {/* Credit card via Stripe Checkout — active */}
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              aria-pressed={paymentMethod === 'card'}
              className={`w-full text-left rounded-xl border-2 p-4 mt-3 transition-all ${
                paymentMethod === 'card'
                  ? 'border-gray-900 bg-white'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  paymentMethod === 'card' ? 'border-[#C6A15B]' : 'border-gray-300'
                }`}>
                  {paymentMethod === 'card' && <div className="w-2 h-2 rounded-full bg-[#C6A15B]" />}
                </div>
                <CreditCard className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="font-bold text-sm text-gray-900">Credit card</span>
                <span className="ml-auto text-[10px] font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                  Processed securely by Stripe
                </span>
              </div>
              {paymentMethod === 'card' && (
                <div className="mt-3 pl-6 space-y-2">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Fastest payment option. Card processing costs are charged by Stripe and shown before payment. Vero does not add a separate processing fee to card payments. Your request is released for payment-verified dispatch once Stripe confirms payment.
                  </p>
                </div>
              )}
            </button>
          </div>

          {/* Vault retention tier */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="w-3.5 h-3.5 text-gray-500" />
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
            <button onClick={() => setStep('vault')} className="text-[10px] text-gray-500 hover:text-gray-700 mt-1 hover:underline">Change retention tier</button>
          </div>

          {/* What happens next */}
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 mb-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">What happens next</div>
            <div className="space-y-2">
              {[
                { icon: Radio,       text: 'Listing broadcast to all qualified local CPs via app + email' },
                { icon: Eye,         text: 'First eligible inspector to claim the slot is automatically assigned — no manual selection' },
                { icon: Shield,      text: 'Vero Reliability Guarantee starts backup dispatch and admin review if a confirmed inspector cannot attend' },
                { icon: Lock,        text: `Payment confirmation required — Vero verifies payment before this request goes live for inspector claim` },
                { icon: FileText,    text: 'Inspector auto-generates a signed Schedule C-B on completion' },
              ].map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Icon className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <span className="text-xs text-gray-600">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {selectedStage === 1 && !permitNumber.trim() && (
            <div className="mb-4 rounded-xl border border-gray-200 border-l-2 border-l-amber-500 bg-gray-50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-gray-700">
                  <span className="font-bold">Pre-permit review.</span>{' '}
                  This Stage 1 request can proceed without a permit number. Later inspection stages will require a permit number or municipal file reference.
                </p>
              </div>
            </div>
          )}

          <div className="mb-4">
            <ReliabilityGuarantee compact />
          </div>

          {/* ── Site Readiness Agreement (collapsible) ── */}
          <div className={`rounded-2xl border-2 overflow-hidden transition-all ${
            siteAgreed ? 'border-gray-200 border-l-[3px] border-l-success-green bg-gray-50' : 'border-gray-200 border-l-[3px] border-l-amber-500 bg-gray-50'
          }`}>
            {/* Agreement header — click to expand/collapse terms */}
            <button
              type="button"
              onClick={() => setSiteAgreementExpanded(v => !v)}
              aria-expanded={siteAgreementExpanded}
              className={`w-full px-4 py-3 border-b flex items-center gap-2 transition-colors ${
                siteAgreed
                  ? 'border-gray-200 bg-gray-100 hover:bg-gray-200'
                  : 'border-gray-200 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Shield className={`w-4 h-4 shrink-0 ${siteAgreed ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span className={`text-xs font-black uppercase tracking-wide ${siteAgreed ? 'text-emerald-700' : 'text-amber-700'}`}>
                Site Readiness Agreement
              </span>
              <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded border bg-gray-100 border-gray-200 ${
                siteAgreed ? 'text-emerald-600' : 'text-amber-600'
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
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5 bg-gray-200 text-gray-700">{bullet}</div>
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
              className={`w-full flex items-center gap-3 px-4 py-3 border-t border-gray-200 transition-all ${
                siteAgreed
                  ? 'bg-gray-100/60 hover:bg-gray-100'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                siteAgreed
                  ? 'bg-success-green border-success-green'
                  : 'bg-white border-gray-300 hover:border-gray-400'
              }`}>
                {siteAgreed && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className={`text-xs font-semibold ${siteAgreed ? 'text-gray-900' : 'text-gray-700'}`}>
                I confirm the site will be ready and I understand Vero Permit will record readiness and late-change events for governed review
              </span>
            </button>
          </div>

          {/* Sticky footer */}
          <div className="sticky bottom-0 -mx-5 -mb-5 px-5 pt-3 pb-5 bg-white/95 backdrop-blur border-t border-gray-100 z-10">
            {postError && (
              <div className="bg-gray-50 border border-gray-200 border-l-2 border-l-red-500 rounded-xl p-3 mb-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-gray-700 font-medium">{postError}</p>
              </div>
            )}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="bg-[#C6A15B] text-[#1B1508] hover:bg-[#D8B871] focus:ring-[#C6A15B] shadow-sm shadow-gray-900/10 disabled:opacity-100 disabled:bg-gray-100 disabled:text-gray-400"
              disabled={!siteAgreed}
              onClick={handlePost}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              {paymentMethod === 'card' ? 'Continue to Secure Card Payment' : 'Submit Request for Payment Verification'}
            </Button>
          </div>
        </div>
      )}

      {/* ─── BROADCASTING ANIMATION ──────────────── */}
      {step === 'broadcasting' && (
        <div className="text-center py-8">
          <div className="relative mx-auto w-24 h-24 mb-6">
            {/* Ripple rings */}
            <div className="absolute inset-0 rounded-full border-2 border-[#C6A15B] opacity-20 animate-ping" style={{ animationDuration: '1s' }} />
            <div className="absolute inset-2 rounded-full border-2 border-[#C6A15B] opacity-30 animate-ping" style={{ animationDuration: '1.3s' }} />
            <div className="absolute inset-4 rounded-full border-2 border-[#C6A15B] opacity-50 animate-ping" style={{ animationDuration: '1.6s' }} />
            <div className="relative w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center">
              <Radio className="w-9 h-9 text-[#C6A15B]" />
            </div>
          </div>

          <h3 className="text-xl font-black text-gray-900 mb-1">Broadcasting…</h3>
          <p className="text-sm text-gray-500 mb-6">Notifying qualified professionals in your area</p>

          <div className="bg-slate-900 rounded-2xl p-4 text-left">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-blue-400 font-mono uppercase tracking-widest">CPs Notified</span>
              {broadcastDone && <span className="text-xs text-success-green font-bold">✓ Complete</span>}
            </div>
            <div className="text-5xl font-black text-[#C6A15B] font-mono tabular-nums">{broadcastCount}</div>
            <div className="text-xs text-blue-500 mt-1 font-mono">{address}</div>
          </div>
        </div>
      )}

      {/* ─── SUBMITTED STATE ──────────────────────────── */}
      {step === 'live' && (
        <div className="text-center py-6">
          <div className="relative mx-auto w-20 h-20 mb-5">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-40" />
            <div className="relative w-20 h-20 bg-success-green rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
          </div>

          <h3 className="text-2xl font-black text-gray-900 mb-1">Request Saved — Payment Pending</h3>
          <p className="text-sm text-gray-500 mb-5">Your request is saved but not live for inspector claim yet. Send your Interac e-Transfer and Vero will release the request once payment is confirmed.</p>

          <div className="bg-slate-900 rounded-2xl p-4 text-left mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-[#C6A15B] rounded-full animate-pulse" />
              <span className="text-xs font-bold text-gray-300 tracking-widest uppercase">Payment Pending</span>
              <span className="ml-auto text-xs font-mono text-gray-400">{jobRef}</span>
            </div>
            <div className="text-sm font-bold text-white mb-1">{address}</div>
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-700">
              <div>
                <div className="text-xs text-gray-400">Stage</div>
                <div className="text-sm font-bold text-white">{stageData?.shortName}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Est. Payment</div>
                <div className="text-sm font-black text-[#C6A15B]">{formatCurrency(totalEscrow)}</div>
              </div>
            </div>
          </div>

          {/* Interac instructions — the live step is reached via the Interac
              path (card redirects to Stripe before this screen). The payment
              details stay visible regardless of the email outcome. */}
          {paymentMethod === 'interac' && (
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 text-left mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-black text-gray-900 uppercase tracking-wide">Send your Interac e-Transfer</span>
                <span className="ml-auto text-[10px] font-bold text-gray-600 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">
                  No Vero processing fee
                </span>
              </div>

              {/* Email-attempt status — informational only; never affects release. */}
              {interacEmailStatus === 'sending' && (
                <div className="flex items-start gap-2 mb-2 rounded-lg bg-gray-50 border border-gray-200 px-2.5 py-2">
                  <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-gray-500 leading-relaxed">Emailing your payment instructions…</p>
                </div>
              )}
              {interacEmailStatus === 'sent' && (
                <div className="flex items-start gap-2 mb-2 rounded-lg border border-gray-200 border-l-2 border-l-success-green bg-gray-50 px-2.5 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success-green mt-0.5 shrink-0" />
                  <p className="text-[11px] text-gray-700 leading-relaxed">
                    {user?.email
                      ? `A copy of these payment instructions has been emailed to ${user.email}.`
                      : 'A copy of these payment instructions has been emailed to your builder account email.'}
                  </p>
                </div>
              )}
              {interacEmailStatus === 'failed' && (
                <div className="flex items-start gap-2 mb-2 rounded-lg border border-gray-200 border-l-2 border-l-amber-500 bg-gray-50 px-2.5 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-gray-700 leading-relaxed">
                    We could not confirm the email was sent. The payment details are shown below so you can complete the e-Transfer manually.
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-600 leading-relaxed">
                Send payment to <span className="font-bold text-gray-900">payments@veropermit.com</span>. Use your project, permit, or job reference <span className="font-mono font-bold text-gray-900">{jobRef}</span> in the message field. Your request will be released to inspectors once payment is confirmed by Vero.
              </p>
              <p className="text-[11px] text-gray-400 leading-relaxed mt-2">
                Your bank may apply its own transfer limits or fees.
              </p>

              {/* Client-only copy helpers. */}
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => handleCopy('email', 'payments@veropermit.com')}
                  className="text-[11px] font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-100 transition-colors"
                >
                  {copiedField === 'email' ? 'Copied ✓' : 'Copy payment email'}
                </button>
                {jobRef && (
                  <button
                    type="button"
                    onClick={() => handleCopy('ref', jobRef)}
                    className="text-[11px] font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-100 transition-colors"
                  >
                    {copiedField === 'ref' ? 'Copied ✓' : 'Copy request reference'}
                  </button>
                )}
              </div>
            </div>
          )}

          <Button variant="secondary" size="md" fullWidth className="mt-4" onClick={handleClose}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  )
}
