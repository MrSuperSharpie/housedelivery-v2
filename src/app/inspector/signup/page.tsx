'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronRight, ChevronLeft, CheckCircle2, Upload,
  HardHat, User, MapPin, FileText, Shield, BadgeCheck,
  Layers, Hammer, Home, Zap, Droplets, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { insertInspectorCredential, upsertInspectorEligibility } from '@/lib/supabase/compliance'
import { setInspectorOnboardingStatus } from '@/lib/persistence/inspectorOnboarding'
import type { InspectorCredentialType, InspectorDiscipline, InspectorRoleLane, Region } from '@/lib/types'
import { INSPECTOR_ROLE_LANES, INSPECTOR_ROLE_LANE_CONFIG, getInspectorRoleLaneLabel } from '@/lib/inspectorRoleLanes'

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
  { id: 'structural',    label: 'Structural',    icon: HardHat },
  { id: 'geotech',       label: 'Geotechnical',  icon: Layers },
  { id: 'mechanical',    label: 'Mechanical',     icon: Hammer },
  { id: 'electrical',    label: 'Electrical',     icon: Zap },
  { id: 'plumbing',      label: 'Plumbing',       icon: Droplets },
  { id: 'architectural', label: 'Architectural',  icon: Home },
]

const REGIONS = ['vancouver', 'burnaby', 'surrey', 'richmond', 'coquitlam']

// Document definitions — credentialType maps to inspector_credentials.credential_type
// isRequired maps to inspector_credentials.is_required
//
// Signup collects baseline docs only (applicable to every role lane).
// Lane-specific documents (e.g. primary_license for Architect / Engineer,
// good_standing_proof, FSR certificate, etc.) are uploaded post-signup via
// the inspector profile page, where per-lane requirements are shown.
const DOC_DEFS: {
  key:            'id' | 'insurance' | 'resume'
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
]

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
      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#FF5F15] focus:outline-none text-sm font-medium transition-colors"
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
}

function DocUpload({
  label, hint, required, uploaded, uploading, uploadError, onFileSelected
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
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
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
            <div className="font-semibold text-sm text-gray-900">
              {label}{required && <span className="text-[#FF5F15] ml-0.5">*</span>}
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
    firstName:    '',
    lastName:     '',
    email:        '',
    phone:        '',
    password:     '',
    licenseNumber: '',
    roleLanes:    [] as InspectorRoleLane[],
    disciplines:  [] as string[],
    regions:      [] as string[],
    agreeTerms:   false,
  })

  // Pending files — held in memory until auth user is created in handleSubmit
  // Key is the doc key ('license' | 'insurance' | 'id')
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({})

  // Upload state per doc key
  const [uploadStates, setUploadStates] = useState<Record<string, {
    uploaded:    boolean
    uploading:   boolean
    uploadError: string | null
  }>>({
    id:        { uploaded: false, uploading: false, uploadError: null },
    insurance: { uploaded: false, uploading: false, uploadError: null },
    resume:    { uploaded: false, uploading: false, uploadError: null },
  })

  const set = (field: keyof typeof form, value: string | boolean | string[]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const toggleArr = (field: 'disciplines' | 'regions', val: string) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(val)
        ? prev[field].filter(v => v !== val)
        : [...prev[field], val],
    }))
  }

  const toggleRoleLane = (lane: InspectorRoleLane) => {
    setForm(prev => ({
      ...prev,
      roleLanes: prev.roleLanes.includes(lane)
        ? prev.roleLanes.filter(existing => existing !== lane)
        : [...prev.roleLanes, lane],
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

  const allDocsSelected = DOC_DEFS.every(d => pendingFiles[d.key] || uploadStates[d.key].uploaded)
  const stepIdx = STEP_IDX[step]

  // ── handleSubmit ──────────────────────────────────────────────────────────
  // 1. Create auth user via supabase.auth.signUp()
  // 2. Upload each pending credential file to Supabase Storage
  // 3. Write inspector_credentials row for each uploaded file
  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    // Step 1: create the auth.users record
    const { data, error } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options: {
        data: {
          role:           'inspector',
          first_name:     form.firstName,
          last_name:      form.lastName,
          name:           `${form.firstName} ${form.lastName}`.trim(),
          phone:          form.phone,
          requested_role_lanes: form.roleLanes,
          disciplines:    form.disciplines,
          regions:        form.regions,
          license_number: form.licenseNumber,
        },
      },
    })

    if (error || !data.user) {
      setSubmitError(error?.message ?? 'Signup failed. Please try again.')
      setIsSubmitting(false)
      return
    }

    const userId = data.user.id

    await upsertInspectorEligibility({
      userId,
      status: 'submitted',
      disciplines: form.disciplines as InspectorDiscipline[],
      regions: form.regions as Region[],
      requestedRoleLanes: form.roleLanes,
      approvedRoleLanes: [],
      licenseNumber: form.licenseNumber,
    })

    // Step 2 & 3: upload each pending file and write the credential row
    for (const docDef of DOC_DEFS) {
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
      const credentialId = `cred-${userId}-${docDef.credentialType}-${Date.now()}`
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

    setIsSubmitting(false)
    await setInspectorOnboardingStatus('submitted', userId, userId)
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
          Check your email to confirm your account. SiteLine will review your credentials within 1–2 business days.
        </p>
      </div>
    )
  }

  // ── Form shell ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-[#0A192F] py-6 text-center text-white font-black text-xl border-b border-blue-900">
        Site<span className="text-[#FF5F15]">Line</span> Pro
      </div>

      <div className="max-w-xl mx-auto w-full px-4 py-12 flex-1">
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
              <h2 className="text-2xl font-black text-[#0A192F]">Join the Network</h2>
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
              </Field>
            </div>
          )}

          {/* ── STEP 2: CREDENTIALS ── */}
          {step === 'credentials' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-[#0A192F]">Your Credentials</h2>
              <Field label="Regulator / licence / authority reference">
                <Input value={form.licenseNumber} onChange={e => set('licenseNumber', e.target.value)} placeholder="AIBC, EGBC, FSR, BOABC, or AHJ reference if applicable" />
              </Field>
              <Field label="Role lanes" required>
                <div className="space-y-2">
                  {INSPECTOR_ROLE_LANES.map(lane => (
                    <button
                      key={lane}
                      type="button"
                      onClick={() => toggleRoleLane(lane)}
                      className={`w-full rounded-xl border-2 px-4 py-3 text-left transition-all ${
                        form.roleLanes.includes(lane)
                          ? 'border-[#FF5F15] bg-orange-50'
                          : 'border-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="text-sm font-bold text-[#0A192F]">{getInspectorRoleLaneLabel(lane)}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {INSPECTOR_ROLE_LANE_CONFIG[lane].description}
                      </div>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Disciplines" required>
                <div className="grid grid-cols-2 gap-2">
                  {DISCIPLINES.map(d => (
                    <button key={d.id} type="button" onClick={() => toggleArr('disciplines', d.id)}
                      className={`p-4 rounded-xl border-2 text-sm font-bold transition-all ${
                        form.disciplines.includes(d.id)
                          ? 'border-[#FF5F15] bg-orange-50 text-[#FF5F15]'
                          : 'border-gray-100 text-gray-600'
                      }`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </Field>
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
                Files are uploaded securely when you submit. All documents are reviewed only by the SiteLine verification team.
              </p>
              {DOC_DEFS.map(docDef => (
                <DocUpload
                  key={docDef.key}
                  label={docDef.label}
                  hint={docDef.hint}
                  required={docDef.isRequired}
                  uploaded={uploadStates[docDef.key].uploaded || !!pendingFiles[docDef.key]}
                  uploading={uploadStates[docDef.key].uploading}
                  uploadError={uploadStates[docDef.key].uploadError}
                  onFileSelected={(file) => handleFileSelected(docDef.key, file)}
                />
              ))}
            </div>
          )}

          {/* ── STEP 5: REVIEW ── */}
          {step === 'review' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-[#0A192F]">Ready to Go?</h2>

              {/* Summary */}
              <div className="p-4 bg-gray-50 rounded-2xl space-y-2 text-sm">
                  {[
                    { label: 'Name',        val: `${form.firstName} ${form.lastName}` },
                    { label: 'Email',       val: form.email },
                    { label: 'License',     val: form.licenseNumber || '—' },
                    { label: 'Role lanes',  val: form.roleLanes.map(getInspectorRoleLaneLabel).join(', ') || '—' },
                    { label: 'Disciplines', val: form.disciplines.join(', ') || '—' },
                    { label: 'Regions',     val: form.regions.join(', ') || '—' },
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
                  {DOC_DEFS.map(d => (
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
                  I agree to the SiteLine Terms of Service and consent to a background check
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
            {stepIdx > 0 && (
              <Button variant="secondary" onClick={() => setStep(STEPS[stepIdx - 1].id)}>
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
            )}
            {step !== 'review' ? (
              <Button
                variant="primary"
                fullWidth
                disabled={
                  (step === 'credentials' && form.roleLanes.length === 0)
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
      </div>
    </div>
  )
}
