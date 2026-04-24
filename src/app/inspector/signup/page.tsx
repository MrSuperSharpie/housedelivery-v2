'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BrandWordmark } from '@/components/shared/Navbar'
import {
  ChevronRight, ChevronLeft, CheckCircle2, Upload,
  HardHat, User, MapPin, FileText, Shield, BadgeCheck,
  Layers, Hammer, Home, Zap, Droplets, AlertCircle, Flame, Stamp
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { insertInspectorCredential, upsertInspectorEligibility } from '@/lib/supabase/compliance'
import { setInspectorOnboardingStatus } from '@/lib/persistence/inspectorOnboarding'
import type { InspectorCredentialType, InspectorDiscipline, InspectorRoleLane, Region } from '@/lib/types'

const supabase = createClient()

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'personal' | 'credentials' | 'coverage' | 'documents' | 'review' | 'submitted'

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: 'personal',    label: 'Personal',    icon: User },
  { id: 'credentials', label: 'Credentials', icon: BadgeCheck },
  { id: 'coverage',    label: 'Coverage',    icon: MapPin },
  { id: 'documents',   label: 'Documents',   icon: FileText },
  { id: 'review',      label: 'Review',      icon: Shield },
]

const STEP_IDX: Record<Step, number> = {
  personal: 0, credentials: 1, coverage: 2, documents: 3, review: 4, submitted: 4,
}

const DISCIPLINES = [
  { id: 'structural',      label: 'Structural',      icon: HardHat },
  { id: 'geotech',         label: 'Geotechnical',    icon: Layers },
  { id: 'mechanical',      label: 'Mechanical',      icon: Hammer },
  { id: 'electrical',      label: 'Electrical',      icon: Zap },
  { id: 'plumbing',        label: 'Plumbing',        icon: Droplets },
  { id: 'architectural',   label: 'Architectural',   icon: Home },
  { id: 'fire_protection', label: 'Fire Protection', icon: Flame },
]

const REGIONS = ['vancouver', 'burnaby', 'surrey', 'richmond', 'coquitlam']

// ─── Canonical BC credential types (mirrors credential_types seed data) ──────

interface CredentialTypeOption {
  id: string
  name: string
  body: string          // governing body abbreviation
  disciplines: string[] // empty = generalist; inspector must declare discipline_scope
}

const CREDENTIAL_TYPE_GROUPS: { label: string; desc: string; items: CredentialTypeOption[] }[] = [
  {
    label: 'Primary Professionals',
    desc: 'Licensed engineers, architects, and certified professionals',
    items: [
      { id: 'peng_structural',         name: 'P.Eng Structural',                body: 'EGBC',              disciplines: ['structural'] },
      { id: 'peng_mechanical',          name: 'P.Eng Mechanical',                body: 'EGBC',              disciplines: ['mechanical'] },
      { id: 'peng_electrical',          name: 'P.Eng Electrical',                body: 'EGBC',              disciplines: ['electrical'] },
      { id: 'architect_aibc',           name: 'Architect (AIBC)',                body: 'AIBC',              disciplines: ['architectural'] },
      { id: 'civil_engineer',           name: 'Civil Engineer',                  body: 'EGBC',              disciplines: ['structural', 'geotech'] },
      { id: 'geotech_engineer',         name: 'Geotechnical Engineer',           body: 'EGBC',              disciplines: ['geotech'] },
      { id: 'fire_protection_engineer', name: 'Fire Protection Engineer',        body: 'EGBC',              disciplines: ['fire_protection'] },
      { id: 'building_envelope',        name: 'Building Envelope Professional',  body: 'HPO',               disciplines: ['architectural'] },
    ],
  },
  {
    label: 'Licensed Trades',
    desc: 'Field safety representatives, trade certificate holders, and energy advisors',
    items: [
      { id: 'fsr_class_a',       name: 'FSR Class A',                         body: 'Technical Safety BC', disciplines: ['electrical'] },
      { id: 'fsr_class_b',       name: 'FSR Class B',                         body: 'Technical Safety BC', disciplines: ['electrical'] },
      { id: 'gas_fitter_class_a', name: 'Gas Fitter Class A',                 body: 'Technical Safety BC', disciplines: ['mechanical'] },
      { id: 'gas_fitter_class_b', name: 'Gas Fitter Class B',                 body: 'Technical Safety BC', disciplines: ['mechanical'] },
      { id: 'red_seal_plumber',   name: 'Red Seal Plumber',                   body: 'ITA BC',              disciplines: ['plumbing'] },
      { id: 'hvac_refrigeration', name: 'HVAC / Refrigeration Mechanic',      body: 'Technical Safety BC', disciplines: ['mechanical'] },
      { id: 'energy_advisor',     name: 'Energy Advisor',                      body: 'NRCan',              disciplines: ['mechanical'] },
    ],
  },
  {
    label: 'Technologists & Specialists',
    desc: 'Applied science technologists, field verifiers, and municipal officials',
    items: [
      { id: 'asct',               name: 'Applied Science Technologist (AScT)', body: 'ASTTBC',       disciplines: [] },
      { id: 'ctech',              name: 'Certified Technician (CTech)',        body: 'ASTTBC',       disciplines: [] },
      { id: 'qa_field_verifier',  name: 'QA / Field Verifier',                body: 'Employer',     disciplines: [] },
      { id: 'municipal_inspector', name: 'Municipal Inspector / Reviewer',     body: 'Municipality', disciplines: ['structural', 'architectural', 'mechanical', 'electrical', 'plumbing', 'fire_protection', 'geotech'] },
    ],
  },
]

const ALL_CREDENTIAL_TYPES = CREDENTIAL_TYPE_GROUPS.flatMap(g => g.items)

const PROFESSIONAL_TYPES = new Set([
  'peng_structural', 'peng_mechanical', 'peng_electrical',
  'architect_aibc', 'civil_engineer', 'geotech_engineer',
  'fire_protection_engineer', 'building_envelope',
])

const GENERALIST_TYPES = new Set(['asct', 'ctech', 'qa_field_verifier'])

function getCredentialDisplayName(typeId: string): string {
  return ALL_CREDENTIAL_TYPES.find(t => t.id === typeId)?.name ?? typeId
}

function deriveDisciplines(credentialTypes: string[], disciplineScope: string[]): string[] {
  const all = new Set<string>()
  for (const typeId of credentialTypes) {
    const ct = ALL_CREDENTIAL_TYPES.find(t => t.id === typeId)
    if (ct) ct.disciplines.forEach(d => all.add(d))
  }
  disciplineScope.forEach(d => all.add(d))
  return Array.from(all)
}

const CREDENTIAL_TO_ROLE_LANE: Record<string, InspectorRoleLane> = {
  peng_structural: 'engineer', peng_mechanical: 'engineer', peng_electrical: 'engineer',
  civil_engineer: 'engineer', geotech_engineer: 'engineer', fire_protection_engineer: 'engineer',
  architect_aibc: 'architect',
  building_envelope: 'certified_professional', energy_advisor: 'certified_professional',
  fsr_class_a: 'electrical_fsr', fsr_class_b: 'electrical_fsr',
  municipal_inspector: 'official_authority',
}

function deriveRoleLanes(credentialTypes: string[]): InspectorRoleLane[] {
  const lanes = new Set<InspectorRoleLane>()
  for (const typeId of credentialTypes) {
    const lane = CREDENTIAL_TO_ROLE_LANE[typeId]
    if (lane) lanes.add(lane)
  }
  return Array.from(lanes)
}

// ─── Baseline documents — required of every applicant ─────────────────────────

const BASELINE_DOC_DEFS: {
  key:            string
  label:          string
  credentialType: InspectorCredentialType
  isRequired:     boolean
  hint:           string
}[] = [
  {
    key:            'id',
    label:          'Government-Issued Photo ID',
    credentialType: 'government_id',
    isRequired:     true,
    hint:           'Passport, driver\'s licence, or BC Services Card',
  },
  {
    key:            'insurance',
    label:          'Certificate of Insurance',
    credentialType: 'insurance',
    isRequired:     true,
    hint:           'Current certificate — minimum $2M E&O / general liability',
  },
  {
    key:            'resume',
    label:          'Resume or Experience Summary',
    credentialType: 'resume',
    isRequired:     true,
    hint:           'Professional background relevant to your selected role lane(s)',
  },
  {
    key:            'conflict_declaration',
    label:          'Conflict-of-Interest Declaration',
    credentialType: 'conflict_of_interest_declaration',
    isRequired:     true,
    hint:           'Signed declaration confirming no material conflicts with builders or projects',
  },
  {
    key:            'data_acknowledgement',
    label:          'Evidence / Data-Handling Acknowledgement',
    credentialType: 'data_handling_acknowledgement',
    isRequired:     true,
    hint:           'Signed acknowledgement of evidence retention and chain-of-custody rules',
  },
]

// Credential-type → extra required documents map.
// Only the primary license doc that is uniquely identifiable at signup time.
// Detailed lane-specific docs are collected post-signup on the profile page.
const CREDENTIAL_EXTRA_DOCS: Record<string, { key: string; label: string; credentialType: InspectorCredentialType; hint: string }[]> = {
  peng_structural:         [{ key: 'peng_certificate',  label: 'P.Eng Certificate (EGBC)',      credentialType: 'professional_designation', hint: 'EGBC registration letter or certificate of standing' }],
  peng_mechanical:         [{ key: 'peng_certificate',  label: 'P.Eng Certificate (EGBC)',      credentialType: 'professional_designation', hint: 'EGBC registration letter or certificate of standing' }],
  peng_electrical:         [{ key: 'peng_certificate',  label: 'P.Eng Certificate (EGBC)',      credentialType: 'professional_designation', hint: 'EGBC registration letter or certificate of standing' }],
  civil_engineer:          [{ key: 'peng_certificate',  label: 'P.Eng Certificate (EGBC)',      credentialType: 'professional_designation', hint: 'EGBC registration letter or certificate of standing' }],
  geotech_engineer:        [{ key: 'peng_certificate',  label: 'P.Eng Certificate (EGBC)',      credentialType: 'professional_designation', hint: 'EGBC registration letter or certificate of standing' }],
  fire_protection_engineer:[{ key: 'peng_certificate',  label: 'P.Eng Certificate (EGBC)',      credentialType: 'professional_designation', hint: 'EGBC registration letter or certificate of standing' }],
  architect_aibc:          [{ key: 'aibc_certificate',  label: 'AIBC Certificate of Practice',  credentialType: 'professional_designation', hint: 'AIBC certificate or current membership card' }],
  building_envelope:       [{ key: 'bep_certificate',   label: 'Building Envelope Pro Certificate', credentialType: 'professional_designation', hint: 'HPO-issued BEP certificate' }],
  fsr_class_a:             [{ key: 'fsr_certificate',   label: 'FSR Class A Certificate',       credentialType: 'primary_license',         hint: 'Technical Safety BC FSR licence' }],
  fsr_class_b:             [{ key: 'fsr_certificate',   label: 'FSR Class B Certificate',       credentialType: 'primary_license',         hint: 'Technical Safety BC FSR licence' }],
  gas_fitter_class_a:      [{ key: 'gas_certificate',   label: 'Gas Fitter Certificate',        credentialType: 'primary_license',         hint: 'Technical Safety BC gas fitter licence' }],
  gas_fitter_class_b:      [{ key: 'gas_certificate',   label: 'Gas Fitter Certificate',        credentialType: 'primary_license',         hint: 'Technical Safety BC gas fitter licence' }],
  red_seal_plumber:        [{ key: 'red_seal_certificate', label: 'Red Seal Certificate',       credentialType: 'primary_license',         hint: 'ITA BC Red Seal endorsement' }],
  asct:                    [{ key: 'asttbc_certificate', label: 'ASTTBC Certificate',            credentialType: 'professional_designation', hint: 'ASTTBC membership certificate' }],
  ctech:                   [{ key: 'asttbc_certificate', label: 'ASTTBC Certificate',            credentialType: 'professional_designation', hint: 'ASTTBC membership certificate' }],
  municipal_inspector:     [{ key: 'municipal_appointment', label: 'Municipal Appointment Letter', credentialType: 'ahj_authorization',       hint: 'Letter from municipality confirming inspector role' }],
}

// Derive the deduplicated list of extra docs based on selected credential types.
// Multiple credentials that need the same doc key (e.g. two P.Eng types) are merged.
function deriveExtraDocs(credentialTypes: string[]) {
  const seen = new Set<string>()
  const result: { key: string; label: string; credentialType: InspectorCredentialType; hint: string; isRequired: boolean }[] = []
  for (const typeId of credentialTypes) {
    for (const doc of (CREDENTIAL_EXTRA_DOCS[typeId] ?? [])) {
      if (!seen.has(doc.key)) {
        seen.add(doc.key)
        result.push({ ...doc, isRequired: true })
      }
    }
  }
  return result
}

// Keep DOC_DEFS as an alias so the existing handleSubmit references still compile.
const DOC_DEFS = BASELINE_DOC_DEFS

let credentialIdCounter = 0

function createCredentialId(userId: string, credentialType: InspectorCredentialType) {
  credentialIdCounter += 1
  const suffix = globalThis.crypto?.randomUUID?.() ?? `local-${credentialIdCounter}`
  return `cred-${userId}-${credentialType}-${suffix}`
}

function normalizePhoneForProfile(value: string) {
  return value.replace(/\D/g, '')
}

async function checkRegistrationAvailability(input: { email: string; phone?: string }) {
  const response = await fetch('/api/auth/check-registration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (response.ok) return null

  const data = await response.json().catch(() => null) as { message?: string; error?: string } | null
  return data?.message ?? data?.error ?? 'Could not verify whether this account already exists. Please try again.'
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({ label, children, required }: {
  label: string; children: React.ReactNode; required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">
        {label}{required && <span className="text-[#FF5F15] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#FF5F15] focus:outline-none text-sm font-medium text-gray-900 transition-colors"
    />
  )
}

// ─── DocUpload ────────────────────────────────────────────────────────────────
// Wired to Supabase Storage and insertInspectorCredential.
//
// Upload flow:
//   1. User selects a file
//   2. File is uploaded to the inspector_documents/{userId}/{credentialType}/{filename} path
//      in the inspection-evidence bucket
//   3. insertInspectorCredential writes the metadata row to inspector_credentials
//   4. onUpload() is called to update parent state (flips the uploaded boolean)
//
// If userId is not yet known (user not signed up yet), the upload is deferred
// and the file is held in memory until handleSubmit creates the auth user,
// at which point the deferred uploads are processed.

interface DocUploadProps {
  label:          string
  hint:           string
  required?:      boolean
  uploaded:       boolean
  uploading:      boolean
  uploadError:    string | null
  onFileSelected: (file: File) => void
  accept?:        string
}

function DocUpload({
  label, hint, required, uploaded, uploading, uploadError, onFileSelected,
  accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx'
}: DocUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = React.useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    onFileSelected(file)
    e.target.value = ''
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`w-full border-2 border-dashed rounded-xl p-4 text-left transition-all ${
          uploaded
            ? 'border-[#10B981] bg-green-50'
            : uploadError
              ? 'border-red-300 bg-red-50'
              : 'border-gray-200 hover:border-[#FF5F15] hover:bg-orange-50'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            uploaded ? 'bg-[#10B981]' : uploadError ? 'bg-red-100' : 'bg-gray-100'
          }`}>
            {uploading
              ? <div className="w-5 h-5 border-2 border-gray-300 border-t-[#FF5F15] rounded-full animate-spin" />
              : uploaded
                ? <CheckCircle2 className="w-5 h-5 text-white" />
                : uploadError
                  ? <AlertCircle className="w-5 h-5 text-red-400" />
                  : <Upload className="w-5 h-5 text-gray-500" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-gray-900">{label}</span>
              {required && !uploaded && (
                <span className="text-[9px] font-black uppercase tracking-widest bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full leading-none">
                  Required
                </span>
              )}
            </div>
            {uploaded && fileName
              ? <div className="text-xs text-[#10B981] mt-0.5 truncate font-medium">{fileName}</div>
              : uploadError
                ? <div className="text-xs text-red-500 mt-0.5">{uploadError}</div>
                : <div className="text-xs text-gray-400 mt-0.5">{hint}</div>
            }
          </div>
          {uploaded && <span className="text-xs font-bold text-[#10B981] shrink-0">Uploaded ✓</span>}
          {uploading && <span className="text-xs font-bold text-gray-400 shrink-0">Uploading…</span>}
        </div>
      </button>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InspectorSignup() {
  const router = useRouter()
  const [step, setStep]               = useState<Step>('personal')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError]  = useState<string | null>(null)

  const [form, setForm] = useState({
    firstName:       '',
    lastName:        '',
    email:           '',
    phone:           '',
    password:        '',
    licenseNumber:   '',
    firmName:        '',
    businessAddress: '',
    credentialTypes:  [] as string[],
    disciplineScope:  [] as string[],
    regions:         [] as string[],
    agreeTerms:      false,
  })

  // Pending files — held in memory until auth user is created in handleSubmit
  // Key is the doc key ('license' | 'insurance' | 'id')
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({})

  // Upload state per doc key (includes 'seal' for digital seal upload)
  const [uploadStates, setUploadStates] = useState<Record<string, {
    uploaded:    boolean
    uploading:   boolean
    uploadError: string | null
  }>>({
    id:        { uploaded: false, uploading: false, uploadError: null },
    insurance: { uploaded: false, uploading: false, uploadError: null },
    resume:    { uploaded: false, uploading: false, uploadError: null },
    conflict_declaration: { uploaded: false, uploading: false, uploadError: null },
    data_acknowledgement: { uploaded: false, uploading: false, uploadError: null },
    seal:      { uploaded: false, uploading: false, uploadError: null },
  })

  // If a valid Supabase session already exists when the page loads, check the
  // inspector's onboarding status before deciding what to show:
  //   - approved         → redirect to inspector dashboard (they don't need signup)
  //   - submitted / under_review → redirect to onboarding status page (they wait)
  //   - needs_info / draft       → resume credential step (they need to continue)
  const [existingUserId, setExistingUserId] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return
      const u = session.user

      // Use profiles.onboarding_status as the single source of truth.
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('onboarding_status, verified')
        .eq('id', u.id)
        .maybeSingle()
      const onboardingStatus = typeof profileRow?.onboarding_status === 'string'
        ? profileRow.onboarding_status
        : 'draft'

      if (onboardingStatus === 'approved' || profileRow?.verified === true) {
        router.replace('/inspector')
        return
      }
      if (onboardingStatus === 'submitted' || onboardingStatus === 'under_review') {
        router.replace('/inspector/onboarding')
        return
      }

      // needs_info or draft — let them continue through signup
      const metadata = (u.user_metadata ?? {}) as Record<string, unknown>
      const firstName = typeof metadata.first_name === 'string' ? metadata.first_name
        : (typeof metadata.name === 'string' ? metadata.name.split(' ')[0] : '')
      const lastName = typeof metadata.last_name === 'string' ? metadata.last_name
        : (typeof metadata.name === 'string' ? metadata.name.split(' ').slice(1).join(' ') : '')
      setExistingUserId(u.id)
      setForm(prev => ({
        ...prev,
        firstName,
        lastName,
        email: u.email ?? '',
        phone: typeof metadata.phone === 'string' ? metadata.phone : '',
      }))
      setStep('credentials')
    })
  }, [router])

  const set = (field: keyof typeof form, value: string | boolean | string[]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const toggleArr = (field: 'regions', val: string) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(val)
        ? prev[field].filter(v => v !== val)
        : [...prev[field], val],
    }))
  }

  const toggleCredentialType = (typeId: string) => {
    setForm(prev => ({
      ...prev,
      credentialTypes: prev.credentialTypes.includes(typeId)
        ? prev.credentialTypes.filter(id => id !== typeId)
        : [...prev.credentialTypes, typeId],
    }))
  }

  const toggleDisciplineScope = (discipline: string) => {
    setForm(prev => ({
      ...prev,
      disciplineScope: prev.disciplineScope.includes(discipline)
        ? prev.disciplineScope.filter(d => d !== discipline)
        : [...prev.disciplineScope, discipline],
    }))
  }

  // When a file is selected, store it in pendingFiles.
  // The actual upload happens after signUp() so we have a userId.
  const handleFileSelected = (docKey: string, file: File) => {
    setPendingFiles(prev => ({ ...prev, [docKey]: file }))
    setUploadStates(prev => ({
      ...prev,
      [docKey]: { uploaded: false, uploading: false, uploadError: null },
    }))
  }

  const extraDocs = deriveExtraDocs(form.credentialTypes)
  const allDocDefs = [...DOC_DEFS, ...extraDocs]
  const allDocsSelected = allDocDefs.every(d => pendingFiles[d.key] || uploadStates[d.key]?.uploaded)
  const stepIdx = STEP_IDX[step]

  const hasProfessionalCredential = form.credentialTypes.some(id => PROFESSIONAL_TYPES.has(id))
  const hasGeneralistCredential = form.credentialTypes.some(id => GENERALIST_TYPES.has(id))
  const showFirmFields = hasProfessionalCredential
  const showSealUpload = hasProfessionalCredential

  // ── handleSubmit ──────────────────────────────────────────────────────────
  // 1. Create auth user via supabase.auth.signUp()
  // 2. Upload each pending credential file to Supabase Storage
  // 3. Write inspector_credentials row for each uploaded file
  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    // Derive disciplines and role lanes from credential selections (needed in both paths)
    const derivedDisciplines = deriveDisciplines(form.credentialTypes, form.disciplineScope)
    const derivedRoleLanes = deriveRoleLanes(form.credentialTypes)

    let userId: string
    let hasActiveSession = false

    if (existingUserId) {
      // Already authenticated — skip account creation, reuse existing session
      userId = existingUserId
      const { data: { session } } = await supabase.auth.getSession()
      hasActiveSession = Boolean(session)
    } else {
      if (form.password.length < 8) {
        setSubmitError('Password must be at least 8 characters')
        setIsSubmitting(false)
        return
      }

      const duplicateError = await checkRegistrationAvailability({
        email: form.email,
        phone: form.phone,
      })
      if (duplicateError) {
        setSubmitError(duplicateError)
        setIsSubmitting(false)
        return
      }

      // Step 1: create the auth.users record
      const { data, error } = await supabase.auth.signUp({
        email:    form.email,
        password: form.password,
        options: {
          data: {
            role:             'inspector',
            first_name:       form.firstName,
            last_name:        form.lastName,
            name:             `${form.firstName} ${form.lastName}`.trim(),
            phone:            form.phone,
            requested_role_lanes: derivedRoleLanes,
            disciplines:      derivedDisciplines,
            credential_types: form.credentialTypes,
            regions:          form.regions,
            license_number:   form.licenseNumber,
            firm_name:        form.firmName || null,
            business_address: form.businessAddress || null,
          },
        },
      })

      if (error || !data.user) {
        setSubmitError(error?.message ?? 'Signup failed. Please try again.')
        setIsSubmitting(false)
        return
      }

      // If no session was returned (email confirmation enabled on the project),
      // attempt an immediate sign-in so the session cookie is set before we
      // navigate to /inspector/onboarding.
      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email:    form.email,
          password: form.password,
        })
        if (signInError) {
          console.warn('Session not established after signup:', signInError.message)
        }
      }

      // Verify whether a session is active. If email confirmation is required and
      // the user hasn't confirmed yet, session will be null — the onboarding page
      // handles this gracefully (read-only mode with a confirmation prompt).
      const { data: { session: activeSession } } = await supabase.auth.getSession()
      hasActiveSession = Boolean(activeSession)
      if (!hasActiveSession) {
        console.info('Navigating to onboarding without an active session — email confirmation pending.')
      }

      userId = data.user.id
    }

    // Persist identity data directly to the profiles row (supplements auth trigger)
    await supabase
      .from('profiles')
      .update({
        full_name: `${form.firstName} ${form.lastName}`.trim() || null,
        email: form.email.trim().toLowerCase() || null,
        phone: normalizePhoneForProfile(form.phone) || null,
        firm_name: form.firmName || null,
        business_address: form.businessAddress || null,
        onboarding_status: 'submitted',
        verified: false,
      })
      .eq('id', userId)

    await upsertInspectorEligibility({
      userId,
      status: 'submitted',
      disciplines: derivedDisciplines as InspectorDiscipline[],
      regions: form.regions as Region[],
      requestedRoleLanes: derivedRoleLanes,
      approvedRoleLanes: [],
      licenseNumber: form.licenseNumber,
    })

    // Insert credential claims into inspector_held_credentials (requires active session for RLS)
    if (hasActiveSession) {
      for (const typeId of form.credentialTypes) {
        const isGeneralist = GENERALIST_TYPES.has(typeId)
        const { error: credError } = await supabase.from('inspector_held_credentials').insert({
          inspector_id: userId,
          credential_type_id: typeId,
          license_number: form.licenseNumber || null,
          discipline_scope: isGeneralist ? form.disciplineScope : [],
          verification_status: 'unverified',
        })
        if (credError) console.warn(`credential claim ${typeId}:`, credError.message)
      }
    }

    // Step 2 & 3: upload each pending file and write the credential row
    for (const docDef of allDocDefs) {
      const file = pendingFiles[docDef.key]
      if (!file) continue

      setUploadStates(prev => ({
        ...prev,
        [docDef.key]: { uploaded: false, uploading: true, uploadError: null },
      }))

      // Storage path: inspector_documents/{userId}/{credentialType}/{filename}
      // This path structure maps directly to the per-user storage policy.
      const storagePath = `inspector_documents/${userId}/${docDef.credentialType}/${file.name}`

      const { error: storageError } = await supabase.storage
        .from('inspection-evidence')
        .upload(storagePath, file, { upsert: true })

      if (storageError) {
        setUploadStates(prev => ({
          ...prev,
          [docDef.key]: {
            uploaded:    false,
            uploading:   false,
            uploadError: `Upload failed: ${storageError.message}`,
          },
        }))
        // Continue uploading other docs — don't block on a single failure
        continue
      }

      // Write the inspector_credentials metadata row
      const credentialId = createCredentialId(userId, docDef.credentialType)
      await insertInspectorCredential({
        id:             credentialId,
        userId,
        credentialType: docDef.credentialType,
        fileName:       file.name,
        storagePath,
        isRequired:     docDef.isRequired,
      })

      setUploadStates(prev => ({
        ...prev,
        [docDef.key]: { uploaded: true, uploading: false, uploadError: null },
      }))
    }

    // Upload professional digital seal (optional — signing lanes only)
    const sealFile = pendingFiles['seal']
    if (sealFile) {
      setUploadStates(prev => ({
        ...prev,
        seal: { uploaded: false, uploading: true, uploadError: null },
      }))

      const sealPath = `credentials/${userId}/digital_seal/${sealFile.name}`
      const { error: sealError } = await supabase.storage
        .from('inspection-evidence')
        .upload(sealPath, sealFile, { upsert: true })

      if (sealError) {
        setUploadStates(prev => ({
          ...prev,
          seal: { uploaded: false, uploading: false, uploadError: `Upload failed: ${sealError.message}` },
        }))
      } else {
        await insertInspectorCredential({
          id:             createCredentialId(userId, 'digital_seal'),
          userId,
          credentialType: 'digital_seal',
          fileName:       sealFile.name,
          storagePath:    sealPath,
          isRequired:     false,
        })
        // Link seal path to profile for PDF injection
        await supabase
          .from('profiles')
          .update({ digital_seal_url: sealPath })
          .eq('id', userId)
        setUploadStates(prev => ({
          ...prev,
          seal: { uploaded: true, uploading: false, uploadError: null },
        }))
      }
    }

    setIsSubmitting(false)
    await setInspectorOnboardingStatus('submitted', userId, userId)

    // Confirmation email — fire-and-forget, never blocks navigation
    void fetch('/api/mail/application-received', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: form.email,
        inspectorName: `${form.firstName} ${form.lastName}`.trim(),
      }),
    })

    try { sessionStorage.setItem('vero_just_submitted', '1') } catch {}
    router.replace('/inspector/onboarding?submitted=1')
  }

  // ── Submitted screen ──────────────────────────────────────────────────────

  if (step === 'submitted') {
    return (
      <div className="min-h-screen bg-[#0A192F] flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle2 className="w-16 h-16 text-[#10B981] mb-4" />
        <h1 className="text-3xl font-black text-white mb-2">Application Submitted</h1>
        <p className="text-blue-400 mb-2">
          Welcome, <span className="text-white font-bold">{form.firstName}</span>.
        </p>
        <p className="text-blue-500 text-sm">
          Check your email to confirm your account. Vero will review your credentials within 1–2 business days.
        </p>
      </div>
    )
  }

  // ── Form shell ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile-only top bar */}
      <div className="lg:hidden bg-[#0A192F] border-b border-blue-900/60 px-4 sm:px-6 py-4 flex items-center">
        <BrandWordmark height={32} priority theme="dark" />
      </div>

      <div className="flex flex-1">
        {/* ── Left marketing panel — hidden on mobile ── */}
        <aside className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-[#0A192F] text-white px-10 py-12 sticky top-0 h-screen overflow-y-auto">
          <div>
            <BrandWordmark height={36} priority theme="dark" />
            <div className="mt-12">
              <h2 className="text-3xl font-black leading-tight">
                BC&apos;s professional inspection network
              </h2>
              <p className="mt-4 text-blue-300 text-sm leading-relaxed">
                Vero connects licensed engineers, architects, and certified professionals with builders across Metro Vancouver. Earn on your schedule, on your terms.
              </p>
            </div>

            <div className="mt-10 space-y-5">
              {[
                { icon: '🏗', title: 'Stage-gated work', body: 'Jobs are released per-stage so you always know exactly what to inspect.' },
                { icon: '💰', title: 'Transparent pricing', body: 'Fixed escrow upfront. No chasing invoices — funds release automatically on seal.' },
                { icon: '🔒', title: 'Credential-matched', body: 'Only jobs that match your verified credentials appear on your Live Board.' },
                { icon: '📋', title: 'Auto-generated reports', body: 'Schedule C-B packets are built from your inspection notes — no extra paperwork.' },
              ].map(item => (
                <div key={item.title} className="flex gap-3">
                  <span className="text-xl shrink-0 mt-0.5">{item.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-white">{item.title}</div>
                    <div className="text-xs text-blue-400 mt-0.5 leading-relaxed">{item.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-blue-700 mt-10">
            Vero Permit Inc. · BC only · All credentials verified against EGBC, AIBC &amp; Technical Safety BC
          </div>
        </aside>

        {/* ── Right form panel ── */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-10">
          <div className="max-w-xl mx-auto">
        {/* Step progress */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`h-1.5 flex-1 rounded-full ${i <= stepIdx ? 'bg-[#FF5F15]' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">

          {/* ── STEP 1: PERSONAL ── */}
          {step === 'personal' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-[#0A192F]">Join the Network</h2>
                <p className="mt-2 text-sm font-semibold text-gray-700">
                  Already have an account?{' '}
                  <Link href="/sign-in?role=inspector" className="text-[#0A192F] underline decoration-[#FF5F15] decoration-2 underline-offset-4 hover:text-[#FF5F15]">
                    Sign in to continue
                  </Link>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" required>
                  <Input value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Sarah" />
                </Field>
                <Field label="Last Name" required>
                  <Input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Chen" />
                </Field>
              </div>
              <Field label="Email" required>
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="sarah@example.com" />
              </Field>
              <Field label="Phone">
                <Input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="604-555-0100" />
              </Field>
              <Field label="Password" required>
                <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Minimum 8 characters" />
                {form.password.length > 0 && form.password.length < 8 && (
                  <p className="text-xs text-red-500 font-medium mt-1">Password must be at least 8 characters</p>
                )}
              </Field>
            </div>
          )}

          {/* ── STEP 2: CREDENTIALS ── */}
          {step === 'credentials' && (
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Step 2 of 4</p>
                <h2 className="text-2xl font-black text-[#0A192F]">
                  {form.firstName ? `Welcome, ${form.firstName}! Let's get you verified.` : 'Your Credentials'}
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Select every credential you hold. These selections are matched against EGBC, AIBC, and Technical Safety BC registries to ensure you meet BC&apos;s regulatory requirements for each inspection type.
                </p>
              </div>
              <Field label="Regulator / licence / authority reference">
                <Input value={form.licenseNumber} onChange={e => set('licenseNumber', e.target.value)} placeholder="AIBC, EGBC, FSR, BOABC, or AHJ reference if applicable" />
              </Field>
              {showFirmFields && (
                <>
                  <Field label="Firm Name">
                    <Input value={form.firmName} onChange={e => set('firmName', e.target.value)} placeholder="Chen Structural Consulting Ltd." />
                  </Field>
                  <Field label="Business Address">
                    <Input value={form.businessAddress} onChange={e => set('businessAddress', e.target.value)} placeholder="123 Main St, Vancouver, BC V5K 0A1" />
                  </Field>
                </>
              )}
              <Field label="Select your BC credentials" required>
                <div className="space-y-5">
                  {CREDENTIAL_TYPE_GROUPS.map(group => (
                    <div key={group.label}>
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{group.label}</div>
                      <div className="text-[11px] text-gray-400 mb-2">{group.desc}</div>
                      <div className="space-y-1.5">
                        {group.items.map(ct => (
                          <button
                            key={ct.id}
                            type="button"
                            onClick={() => toggleCredentialType(ct.id)}
                            className={`w-full rounded-xl border-2 px-4 py-3 text-left transition-all ${
                              form.credentialTypes.includes(ct.id)
                                ? 'border-[#FF5F15] bg-orange-50'
                                : 'border-gray-100 text-gray-700'
                            }`}
                          >
                            <div className="text-sm font-bold text-[#0A192F]">{ct.name}</div>
                            <div className="text-[11px] text-gray-400">{ct.body}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Field>
              {hasGeneralistCredential && (
                <Field label="Discipline specialization" required>
                  <p className="text-xs text-gray-400 mb-2">
                    Select the disciplines you are qualified to work in under your technologist or field verifier credential.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {DISCIPLINES.map(d => (
                      <button key={d.id} type="button" onClick={() => toggleDisciplineScope(d.id)}
                        className={`p-4 rounded-xl border-2 text-sm font-bold transition-all ${
                          form.disciplineScope.includes(d.id)
                            ? 'border-[#FF5F15] bg-orange-50 text-[#FF5F15]'
                            : 'border-gray-100 text-gray-600'
                        }`}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </Field>
              )}
            </div>
          )}

          {/* ── STEP 3: COVERAGE ── */}
          {step === 'coverage' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-[#0A192F]">Service Area</h2>
              <div className="grid grid-cols-2 gap-2">
                {REGIONS.map(r => (
                  <button key={r} type="button" onClick={() => toggleArr('regions', r)}
                    className={`p-4 rounded-xl border-2 text-sm font-bold capitalize transition-all ${
                      form.regions.includes(r)
                        ? 'border-[#FF5F15] bg-orange-50 text-[#FF5F15]'
                        : 'border-gray-100 text-gray-600'
                    }`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 4: DOCUMENTS ── */}
          {/* Files are selected here but uploaded in handleSubmit after signUp() */}
          {/* so we have a real userId for the storage path and credential row.   */}
          {step === 'documents' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-black text-[#0A192F]">Upload Proof</h2>
              <p className="text-sm text-gray-500">
                Files are uploaded securely when you submit. All documents are reviewed only by the Vero verification team.
              </p>
              {DOC_DEFS.map(docDef => (
                <DocUpload
                  key={docDef.key}
                  label={docDef.label}
                  hint={docDef.hint}
                  required={docDef.isRequired}
                  uploaded={(uploadStates[docDef.key]?.uploaded ?? false) || !!pendingFiles[docDef.key]}
                  uploading={uploadStates[docDef.key]?.uploading ?? false}
                  uploadError={uploadStates[docDef.key]?.uploadError ?? null}
                  onFileSelected={(file) => handleFileSelected(docDef.key, file)}
                />
              ))}
              {extraDocs.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 pt-2 border-t border-gray-100">
                    Credential-specific documents
                  </div>
                  {extraDocs.map(docDef => (
                    <DocUpload
                      key={docDef.key}
                      label={docDef.label}
                      hint={docDef.hint}
                      required
                      uploaded={(uploadStates[docDef.key]?.uploaded ?? false) || !!pendingFiles[docDef.key]}
                      uploading={uploadStates[docDef.key]?.uploading ?? false}
                      uploadError={uploadStates[docDef.key]?.uploadError ?? null}
                      onFileSelected={(file) => handleFileSelected(docDef.key, file)}
                    />
                  ))}
                </div>
              )}
              {showSealUpload && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Stamp className="w-4 h-4 text-[#0A192F]" />
                    <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Professional Digital Seal</span>
                    <span className="ml-auto text-[10px] text-gray-400 font-medium">Optional · for Schedule C-B</span>
                  </div>
                  <DocUpload
                    label="Professional Digital Seal"
                    hint="High-res PNG (transparent background preferred), JPG, or PDF"
                    uploaded={!!(uploadStates['seal'].uploaded || pendingFiles['seal'])}
                    uploading={uploadStates['seal'].uploading}
                    uploadError={uploadStates['seal'].uploadError}
                    onFileSelected={(file) => handleFileSelected('seal', file)}
                    accept=".png,.jpg,.jpeg,.pdf"
                  />
                </div>
              )}
              {!allDocsSelected && (
                <p className="text-xs text-red-500 font-medium pt-1">
                  All required documents must be selected before you can continue.
                </p>
              )}
            </div>
          )}

          {/* ── STEP 5: REVIEW ── */}
          {step === 'review' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-[#0A192F]">Ready to Go?</h2>

              {/* Summary */}
              <div className="p-4 bg-gray-50 rounded-2xl space-y-2 text-sm">
                  {[
                    { label: 'Name',             val: `${form.firstName} ${form.lastName}` },
                    { label: 'Email',            val: form.email },
                    { label: 'License',          val: form.licenseNumber || '—' },
                    ...(showFirmFields ? [
                      { label: 'Firm',           val: form.firmName || '—' },
                      { label: 'Business Addr.', val: form.businessAddress || '—' },
                    ] : []),
                    { label: 'Credentials',      val: form.credentialTypes.map(getCredentialDisplayName).join(', ') || '—' },
                    { label: 'Regions',          val: form.regions.join(', ') || '—' },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-gray-500 shrink-0">{label}</span>
                    <span className="font-semibold text-gray-800 text-right">{val}</span>
                  </div>
                ))}
              </div>

              {/* Documents summary */}
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Documents</div>
                <div className="space-y-1.5">
                  {allDocDefs.map(d => (
                    <div key={d.key} className={`flex items-center gap-2 text-xs font-semibold p-2 rounded-lg ${
                      pendingFiles[d.key]
                        ? 'bg-green-50 text-[#10B981]'
                        : 'bg-red-50 text-red-400'
                    }`}>
                      {pendingFiles[d.key]
                        ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        : <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      }
                      {d.label}
                      {pendingFiles[d.key] && (
                        <span className="text-green-600 ml-auto font-normal truncate max-w-[120px]">
                          {pendingFiles[d.key].name}
                        </span>
                      )}
                    </div>
                  ))}
                  {showSealUpload && (
                    <div className={`flex items-center gap-2 text-xs font-semibold p-2 rounded-lg ${
                      pendingFiles['seal']
                        ? 'bg-green-50 text-[#10B981]'
                        : 'bg-gray-50 text-gray-400'
                    }`}>
                      {pendingFiles['seal']
                        ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        : <Stamp className="w-3.5 h-3.5 shrink-0" />
                      }
                      Professional Digital Seal
                      {pendingFiles['seal']
                        ? (
                          <span className="text-green-600 ml-auto font-normal truncate max-w-[120px]">
                            {pendingFiles['seal'].name}
                          </span>
                        )
                        : <span className="ml-auto font-normal text-gray-400">Optional</span>
                      }
                    </div>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-[#FF5F15]"
                  checked={form.agreeTerms}
                  onChange={() => set('agreeTerms', !form.agreeTerms)}
                />
                <span className="text-sm font-bold text-gray-700">
                  I agree to the Vero Terms of Service and consent to a background check
                </span>
              </label>

              {submitError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-600 font-medium">{submitError}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="flex gap-4 mt-10">
            {stepIdx > 0 && !(existingUserId && step === 'credentials') && (
              <Button variant="secondary" onClick={() => setStep(STEPS[stepIdx - 1].id)}>
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
            )}
            {step !== 'review' ? (
              <Button
                variant="primary"
                fullWidth
                disabled={
                  (step === 'personal' && form.password.length < 8)
                  || (step === 'credentials' && (form.credentialTypes.length === 0 || (hasGeneralistCredential && form.disciplineScope.length === 0)))
                  || (step === 'documents' && !allDocsSelected)
                }
                onClick={() => setStep(STEPS[stepIdx + 1].id)}
              >
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="primary"
                fullWidth
                loading={isSubmitting}
                disabled={!form.agreeTerms || !allDocsSelected}
                onClick={handleSubmit}
              >
                <Shield className="w-4 h-4" />
                Submit Application
              </Button>
            )}
          </div>
        </div>
          </div>{/* max-w-xl */}
        </main>
      </div>
    </div>
  )
}
