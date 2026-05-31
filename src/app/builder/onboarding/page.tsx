'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Building2, ChevronRight, ChevronLeft, CheckCircle2, Upload,
  Clock, AlertCircle, FileText, Shield, Briefcase, Home, Store,
  LayoutGrid,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import {
  getBuilderOnboardingStatus,
  getBuilderOnboardingStatusAsync,
  setBuilderOnboardingStatus,
  submitBuilderOnboarding,
  uploadBuilderDocuments,
} from '@/lib/persistence/builderOnboarding'
import type { BuilderDocumentUploadInput, BuilderOnboardingStatus } from '@/lib/persistence/builderOnboarding'

// ─── Steps ────────────────────────────────────────────────────────────────────

type Step = 'business' | 'registration' | 'documents' | 'review'

const STEPS: { id: Step; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'business',     label: 'Business',    icon: Building2 },
  { id: 'registration', label: 'Company',     icon: Briefcase },
  { id: 'documents',    label: 'Documents',   icon: FileText },
  { id: 'review',       label: 'Review',      icon: Shield },
]

const STEP_IDX: Record<Step, number> = {
  business: 0, registration: 1, documents: 2, review: 3,
}

const STEP_ORDER: Step[] = ['business', 'registration', 'documents', 'review']

// ─── Builder type ─────────────────────────────────────────────────────────────

type BuilderType = 'residential' | 'commercial' | 'both' | ''

const BUILDER_TYPES: { id: BuilderType; label: string; sub: string; icon: React.ElementType }[] = [
  { id: 'residential', label: 'Residential',       sub: 'New homes, renovations, and residential construction',   icon: Home },
  { id: 'commercial',  label: 'Commercial',         sub: 'Commercial, industrial, and institutional projects',     icon: Store },
  { id: 'both',        label: 'Residential & Commercial', sub: 'Both residential and commercial project types', icon: LayoutGrid },
]

// ─── WorkSafe mode ────────────────────────────────────────────────────────────

type WorksafeMode = 'clearance' | 'exemption' | ''

// ─── Options ──────────────────────────────────────────────────────────────────

const REGIONS = [
  'Vancouver', 'Surrey', 'Burnaby', 'Richmond', 'Coquitlam',
  'Delta', 'Langley City', 'Langley Township', 'Maple Ridge', 'New Westminster',
  'North Vancouver City', 'North Vancouver District', 'West Vancouver',
  'Port Coquitlam', 'Port Moody', 'White Rock',
]

const PERMIT_FAMILY_LABELS: Record<string, string> = {
  building:   'Building Permit',
  electrical: 'Electrical Permit',
  plumbing:   'Plumbing Permit',
  mechanical: 'Mechanical Permit',
  occupancy:  'Final / Occupancy',
}

const DEFAULT_BUILDER_PERMIT_FAMILIES = ['building', 'electrical', 'plumbing', 'mechanical', 'occupancy']

const ENTITY_TYPES = [
  'Corporation (Ltd. / Inc.)',
  'Sole Proprietorship',
  'General Partnership',
  'Limited Partnership (LP)',
  'Joint Venture',
  'Non-Profit / Society',
  'Other',
]

const BC_HOUSING_LICENCE_TYPES = [
  'Owner Builder Authorization',
  'Residential Builder — General',
  'Residential Builder — Restricted',
  'Developer',
  'Other / Not yet determined',
]

function notifyAccountLifecycleEmail(eventKey: string) {
  void fetch('/api/mail/account-lifecycle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventKey }),
  }).then(response => {
    if (!response.ok) console.warn('[BuilderOnboarding] lifecycle email request failed:', response.status)
  }).catch(error => {
    console.warn('[BuilderOnboarding] lifecycle email request failed:', error)
  })
}

// ─── Field components ─────────────────────────────────────────────────────────

function Field({ label, children, hint, required, conditional }: {
  label: string; children: React.ReactNode; hint?: string; required?: boolean; conditional?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
        {label}
        {required && <span className="text-flame ml-0.5">*</span>}
        {conditional && <span className="text-gray-400 ml-1.5 font-normal normal-case tracking-normal text-[10px]">if applicable</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-flame focus:outline-none text-sm font-medium text-gray-900 transition-colors ${props.className ?? ''}`}
    />
  )
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-flame focus:outline-none text-sm font-medium text-gray-900 transition-colors bg-white"
    />
  )
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      {...props}
      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-flame focus:outline-none text-sm font-medium text-gray-900 transition-colors resize-none"
    />
  )
}

function DocUpload({ label, required, conditional, hint, uploaded, onUpload }: {
  label: string; required?: boolean; conditional?: boolean; hint?: string; uploaded: boolean; onUpload: (file: File) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = React.useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    onUpload(file)
    // Reset value so picking the same file again still fires onChange
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
        className={`w-full border-2 border-dashed rounded-xl p-4 text-left transition-all ${
          uploaded ? 'border-success-green bg-green-50' : 'border-gray-200 hover:border-flame hover:bg-orange-50'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            uploaded ? 'bg-success-green' : 'bg-gray-100'
          }`}>
            {uploaded
              ? <CheckCircle2 className="w-5 h-5 text-white" />
              : <Upload className="w-5 h-5 text-gray-500" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-gray-900 flex items-center gap-2 flex-wrap">
              {label}
              {required && <span className="text-flame">*</span>}
              {conditional && !required && (
                <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">if applicable</span>
              )}
            </div>
            {uploaded && fileName
              ? <div className="text-xs text-success-green mt-0.5 truncate font-medium">{fileName}</div>
              : hint && <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{hint}</div>
            }
          </div>
          {uploaded
            ? <span className="text-xs font-bold text-success-green shrink-0">Uploaded ✓</span>
            : <span className="text-xs text-gray-400 shrink-0">Click to upload</span>
          }
        </div>
      </button>
    </>
  )
}

// ─── Conditional banner ───────────────────────────────────────────────────────

function ConditionalBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
      <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
      <div className="text-xs text-blue-700">{children}</div>
    </div>
  )
}

// ─── Status display (post-submission) ─────────────────────────────────────────

const STATUS_CONFIG: Partial<Record<BuilderOnboardingStatus, {
  label: string; desc: string; icon: React.ElementType; iconBg: string; iconColor: string
}>> = {
  submitted: {
    label: 'Verification submitted',
    desc: 'Your builder verification is under Vero review. You\'ll be notified by email once a decision is made.',
    icon: Clock,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-500',
  },
  under_review: {
    label: 'Under review',
    desc: 'Vero is verifying your business documents and registration details. Live project posting is locked until approval.',
    icon: Clock,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-500',
  },
  needs_info: {
    label: 'Additional information required',
    desc: 'Vero has requested more information. Please check your email and re-upload any requested documents.',
    icon: AlertCircle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-500',
  },
  rejected: {
    label: 'Verification not approved',
    desc: 'Your builder verification was not approved. Contact admin@veropermit.com for details.',
    icon: AlertCircle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
  },
  suspended: {
    label: 'Account suspended',
    desc: 'Your builder account has been temporarily suspended. New live postings are blocked. Contact admin@veropermit.com.',
    icon: AlertCircle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-500',
  },
}

function StatusPage({ status, userEmail }: { status: BuilderOnboardingStatus; userEmail?: string }) {
  const cfg = STATUS_CONFIG[status]
  if (!cfg) return null
  const Icon = cfg.icon
  const isPending = status === 'submitted' || status === 'under_review' || status === 'needs_info'

  return (
    <div className="w-full max-w-md mx-auto text-center">
      <div className={`w-16 h-16 ${cfg.iconBg} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
        <Icon className={`w-8 h-8 ${cfg.iconColor}`} />
      </div>
      <h2 className="text-xl font-black text-gray-900 mb-2">{cfg.label}</h2>
      <p className="text-sm text-gray-500 mb-8">{cfg.desc}</p>

      {/* Locked state callout */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left flex items-start gap-3">
        <Shield className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-bold text-amber-800">Verification required before posting live projects</div>
          <div className="text-xs text-amber-700 mt-1">
            You can complete your profile and explore the dashboard, but live inspection requests are locked until your builder verification is approved.
          </div>
        </div>
      </div>

      {isPending && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 text-left mb-6">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">What happens next</div>
          {[
            { n: '01', title: 'Document verification', desc: 'We verify your business registration and insurance documents.', eta: '1–2 business days' },
            { n: '02', title: 'Signatory identity check', desc: 'We confirm the authorized signatory has legal signing authority.', eta: '1–2 business days' },
            { n: '03', title: 'Approval & live posting access', desc: 'Once approved, you\'ll receive an email and can post live inspection requests.', eta: 'Day 3–5' },
          ].map(item => (
            <div key={item.n} className="flex gap-3 mb-4 last:mb-0">
              <div className="w-8 h-8 bg-flame rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0 mt-0.5">
                {item.n}
              </div>
              <div>
                <div className="font-bold text-gray-900 text-sm">{item.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                <div className="text-xs text-gray-400 mt-1 font-mono">{item.eta}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {userEmail && isPending && (
        <p className="text-xs text-gray-400 mb-6">
          Confirmation sent to <span className="font-semibold text-gray-600">{userEmail}</span>
        </p>
      )}

      <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
        ← Back to home
      </Link>
    </div>
  )
}

// ─── Form state type ──────────────────────────────────────────────────────────

type BuilderDocumentKey =
  | 'businessRegistration'
  | 'signingAuthority'
  | 'insurance'
  | 'bcHousingLicence'
  | 'homeWarranty'
  | 'govId'

type WorksafeDocumentKey = 'clearanceLetter' | 'exemptionDeclaration'

interface FormState {
  // Step 1 — Business
  legalBusinessName: string
  builderType: BuilderType
  primaryContactName: string
  signatoryTitle: string
  businessEmail: string
  businessPhone: string
  businessAddress: string
  regions: string[]

  // Step 2 — Registration
  entityType: string
  companyNumber: string         // optional: "if incorporated"
  provinceOfIncorporation: string
  yearsOperating: string
  website: string
  // BC Housing (residential/both only)
  bcHousingLicenceNumber: string
  bcHousingLicenceType: string
  newResidentialConstruction: boolean  // triggers home warranty requirement

  // Step 3 — Documents
  docs: Record<BuilderDocumentKey, boolean>
  docFiles: Partial<Record<BuilderDocumentKey, File>>
  worksafeMode: WorksafeMode
  worksafeDocs: Record<WorksafeDocumentKey, boolean>
  worksafeDocFiles: Partial<Record<WorksafeDocumentKey, File>>
  // Compliance disclosure
  complianceHasIssues: boolean | null
  complianceExplanation: string
  complianceUpload: boolean
  complianceUploadFile: File | null

  // Step 4 — Declarations
  agreeTerms: boolean
  agreeAccuracy: boolean
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function BuilderOnboardingPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [status, setStatus]     = useState<BuilderOnboardingStatus | null>(() => getBuilderOnboardingStatus())
  const [step, setStep]         = useState<Step>('business')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({
    legalBusinessName: '',
    builderType: '',
    primaryContactName: '',
    signatoryTitle: '',
    businessEmail: '',
    businessPhone: '',
    businessAddress: '',
    regions: [],

    entityType: '',
    companyNumber: '',
    provinceOfIncorporation: '',
    yearsOperating: '',
    website: '',
    bcHousingLicenceNumber: '',
    bcHousingLicenceType: '',
    newResidentialConstruction: false,

    docs: {
      businessRegistration: false,
      signingAuthority: false,
      insurance: false,
      bcHousingLicence: false,
      homeWarranty: false,
      govId: false,
    },
    docFiles: {},
    worksafeMode: '',
    worksafeDocs: {
      clearanceLetter: false,
      exemptionDeclaration: false,
    },
    worksafeDocFiles: {},
    complianceHasIssues: null,
    complianceExplanation: '',
    complianceUpload: false,
    complianceUploadFile: null,

    agreeTerms: false,
    agreeAccuracy: false,
  })

  const set = (field: keyof FormState, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const toggleArr = (field: 'regions', val: string) =>
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(val)
        ? prev[field].filter(x => x !== val)
        : [...prev[field], val],
    }))

  const setDocUploaded = (doc: BuilderDocumentKey, file: File) =>
    setForm(prev => ({
      ...prev,
      docs: { ...prev.docs, [doc]: true },
      docFiles: { ...prev.docFiles, [doc]: file },
    }))

  const setWorksafeDocUploaded = (doc: WorksafeDocumentKey, file: File) =>
    setForm(prev => ({
      ...prev,
      worksafeDocs: { ...prev.worksafeDocs, [doc]: true },
      worksafeDocFiles: { ...prev.worksafeDocFiles, [doc]: file },
    }))

  // Derived: auto-assign permit families based on builder type
  const autoPermitFamilies: string[] =
    form.builderType ? DEFAULT_BUILDER_PERMIT_FAMILIES : []

  // Derived: does this builder need BC Housing docs?
  const needsBcHousing = form.builderType === 'residential' || form.builderType === 'both'
  const needsHomeWarranty = needsBcHousing && form.newResidentialConstruction

  // WorkSafe is "complete" if the chosen mode has an upload
  const worksafeComplete = (
    (form.worksafeMode === 'clearance' && form.worksafeDocs.clearanceLetter) ||
    (form.worksafeMode === 'exemption' && form.worksafeDocs.exemptionDeclaration)
  )

  // Compliance is "complete" if answered, and if yes, explanation provided
  const complianceComplete = (
    form.complianceHasIssues === false ||
    (form.complianceHasIssues === true && form.complianceExplanation.trim().length > 0)
  )

  // Core required docs for all builders
  const coreDocsComplete =
    form.docs.businessRegistration &&
    form.docs.signingAuthority &&
    form.docs.insurance &&
    worksafeComplete &&
    complianceComplete

  // Conditional docs
  const bcHousingComplete = !needsBcHousing || form.docs.bcHousingLicence
  const homeWarrantyComplete = !needsHomeWarranty || form.docs.homeWarranty

  const allDocsComplete = coreDocsComplete && bcHousingComplete && homeWarrantyComplete

  // Load onboarding status
  useEffect(() => {
    if (!user?.id) return

    let cancelled = false
    getBuilderOnboardingStatusAsync(user.id, user.supabaseId).then(nextStatus => {
      if (!cancelled) setStatus(nextStatus)
    })

    return () => {
      cancelled = true
    }
  }, [user?.id, user?.supabaseId])

  // Pre-fill email only from auth context (name/company must be entered fresh)
  useEffect(() => {
    if (!user?.supabaseId || !user.email) return

    queueMicrotask(() => {
      setForm(prev => prev.businessEmail ? prev : { ...prev, businessEmail: user.email ?? '' })
    })
  }, [user?.supabaseId, user?.email])

  // Approved users go straight to dashboard
  useEffect(() => {
    if (status === 'approved' && user?.role === 'builder') router.replace('/builder')
  }, [status, user?.role, router])

  const buildBuilderDocumentUploads = (): BuilderDocumentUploadInput[] => {
    const uploads: BuilderDocumentUploadInput[] = []

    const addRequired = (documentType: string, file: File | undefined, label: string) => {
      if (!file) throw new Error(`Please re-upload ${label} before submitting.`)
      uploads.push({ documentType, file, isRequired: true })
    }

    const addOptional = (documentType: string, uploaded: boolean, file: File | null | undefined, label: string) => {
      if (!uploaded) return
      if (!file) throw new Error(`Please re-upload ${label} before submitting.`)
      uploads.push({ documentType, file, isRequired: false })
    }

    addRequired('business_registration', form.docFiles.businessRegistration, 'Business Registration / Incorporation Documents')
    addRequired('signing_authority', form.docFiles.signingAuthority, 'Proof of Signing Authority')
    addRequired('insurance', form.docFiles.insurance, 'Certificate of Insurance')

    if (form.worksafeMode === 'clearance') {
      addRequired('worksafe_clearance_letter', form.worksafeDocFiles.clearanceLetter, 'WorkSafeBC Clearance Letter')
    } else if (form.worksafeMode === 'exemption') {
      addRequired('worksafe_exemption_declaration', form.worksafeDocFiles.exemptionDeclaration, 'WorkSafeBC Exemption / Non-Registration Declaration')
    } else {
      throw new Error('Please select and upload a WorkSafeBC document before submitting.')
    }

    if (needsBcHousing) {
      addRequired('bc_housing_licence', form.docFiles.bcHousingLicence, 'BC Housing Residential Builder Licence')
    }

    if (needsHomeWarranty) {
      addRequired('home_warranty', form.docFiles.homeWarranty, 'Home Warranty Acceptance / Registration Evidence')
    }

    addOptional('compliance_supporting_document', form.complianceUpload, form.complianceUploadFile, 'Supporting Documentation')
    addOptional('government_id', form.docs.govId, form.docFiles.govId, 'Government-Issued Photo ID')

    return uploads
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    console.log('[BuilderOnboarding] submit started', { userId: user?.id, supabaseId: user?.supabaseId })

    if (!user?.supabaseId) {
      console.error('[BuilderOnboarding] missing supabaseId — blocking submission')
      setSubmitError('We could not verify your account session. Please sign in again before submitting builder verification.')
      setIsSubmitting(false)
      return
    }

    let documentUploads: BuilderDocumentUploadInput[]
    try {
      documentUploads = buildBuilderDocumentUploads()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Please re-upload your verification documents before submitting.')
      setIsSubmitting(false)
      return
    }

    const uploadsOk = await uploadBuilderDocuments(user.supabaseId, documentUploads)
    console.log('[BuilderOnboarding] uploadBuilderDocuments result:', uploadsOk)

    if (!uploadsOk) {
      setSubmitError('We could not upload your verification documents. Please try again.')
      setIsSubmitting(false)
      return
    }

    const ok = await submitBuilderOnboarding(user.supabaseId, {
      legalBusinessName:        form.legalBusinessName,
      builderType:              form.builderType,
      primaryContactName:       form.primaryContactName,
      signatoryTitle:           form.signatoryTitle,
      businessEmail:            form.businessEmail,
      businessPhone:            form.businessPhone,
      businessAddress:          form.businessAddress,
      regions:                  form.regions,
      entityType:               form.entityType,
      companyNumber:            form.companyNumber,
      provinceOfIncorporation:  form.provinceOfIncorporation,
      yearsOperating:           form.yearsOperating,
      website:                  form.website,
      bcHousingLicenceNumber:   form.bcHousingLicenceNumber,
      bcHousingLicenceType:     form.bcHousingLicenceType,
      newResidentialConstruction: form.newResidentialConstruction,
      complianceHasIssues:      form.complianceHasIssues,
      complianceExplanation:    form.complianceExplanation,
      autoPermitFamilies,
    })
    console.log('[BuilderOnboarding] submitBuilderOnboarding result:', ok)

    if (!ok) {
      setSubmitError('We could not save your builder verification. Please try again.')
      setIsSubmitting(false)
      return
    }

    // Update status in profiles table and localStorage
    await setBuilderOnboardingStatus('submitted', user.id, user.supabaseId)
    console.log('[BuilderOnboarding] setBuilderOnboardingStatus done')
    notifyAccountLifecycleEmail('admin.builder_profile_submitted')

    await new Promise(r => setTimeout(r, 800))
    setIsSubmitting(false)
    setStatus('submitted')
  }

  const stepIdx = STEP_IDX[step]

  // ── Loading ──────────────────────────────────────────────────────────────
  if (status === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-flame border-t-transparent animate-spin" />
      </div>
    )
  }

  // ── Post-submission status display ───────────────────────────────────────
  if (status !== 'draft') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <nav className="bg-white border-b border-gray-100 px-4 py-4">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-flame flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-black text-gray-900 tracking-tight">
                Vero<span className="text-flame"> Permit</span>
              </span>
            </Link>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <StatusPage status={status} userEmail={user?.email ?? form.businessEmail} />
        </div>
      </div>
    )
  }

  // ── Multi-step verification form ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-flame flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-black text-gray-900 tracking-tight">
              Vero<span className="text-flame"> Permit</span>
            </span>
          </Link>
          <span className="text-xs text-gray-400">Builder verification</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-flame/10 border border-flame/20 rounded-full px-4 py-1.5 mb-4">
            <Building2 className="w-4 h-4 text-flame" />
            <span className="text-sm font-bold text-flame">Builder verification</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Complete your builder verification</h1>
          <p className="mb-3 text-sm font-semibold text-gray-700">
            Already have an account?{' '}
            <Link href="/sign-in?role=builder" className="text-gray-950 underline decoration-flame decoration-2 underline-offset-4 hover:text-flame">
              Sign in to continue
            </Link>
          </p>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Vero verifies builders before allowing live project posting. Provide your company details and required documents for review.
          </p>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = i === stepIdx
            const isDone   = i < stepIdx
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isDone   ? 'bg-success-green' :
                    isActive ? 'bg-flame' : 'bg-gray-200'
                  }`}>
                    {isDone
                      ? <CheckCircle2 className="w-4 h-4 text-white" />
                      : <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    }
                  </div>
                  <span className={`text-[10px] font-semibold ${
                    isActive ? 'text-flame' : isDone ? 'text-success-green' : 'text-gray-400'
                  }`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mb-4 transition-all ${i < stepIdx ? 'bg-success-green' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

          {/* ══ STEP 1: BUSINESS ══════════════════════════════════ */}
          {step === 'business' && (
            <div className="space-y-5">
              <h2 className="text-lg font-black text-gray-900">Business information</h2>

              <Field label="Legal Business Name" required hint="Exactly as it appears on your incorporation or registration documents">
                <Input
                  value={form.legalBusinessName}
                  onChange={e => set('legalBusinessName', e.target.value)}
                  placeholder="Legal business name"
                />
              </Field>

              <Field label="Builder Type" required hint="Determines which verification documents and BC licensing requirements apply">
                <div className="space-y-2">
                  {BUILDER_TYPES.map(bt => {
                    const Icon = bt.icon
                    const active = form.builderType === bt.id
                    return (
                      <button key={bt.id} type="button" onClick={() => set('builderType', bt.id)}
                        className={`w-full text-left flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                          active ? 'border-flame bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          active ? 'bg-flame' : 'bg-gray-100'
                        }`}>
                          <Icon className={`w-4.5 h-4.5 ${active ? 'text-white' : 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-sm text-gray-900">{bt.label}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{bt.sub}</div>
                        </div>
                        {active && <CheckCircle2 className="w-5 h-5 text-flame shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Primary Contact Name" required hint="Person managing this account">
                  <Input
                    value={form.primaryContactName}
                    onChange={e => set('primaryContactName', e.target.value)}
                    placeholder="Full name"
                  />
                </Field>
                <Field label="Title / Position" required>
                  <Select value={form.signatoryTitle} onChange={e => set('signatoryTitle', e.target.value)}>
                    <option value="">Select…</option>
                    <option>Owner / Developer</option>
                    <option>President / CEO</option>
                    <option>Project Manager</option>
                    <option>General Contractor</option>
                    <option>Director</option>
                    <option>Authorized Signing Officer</option>
                    <option>Other</option>
                  </Select>
                </Field>
              </div>

              <Field label="Business Address" required hint="Primary place of business in BC">
                <Input
                  value={form.businessAddress}
                  onChange={e => set('businessAddress', e.target.value)}
                  placeholder="Street address, City, BC, Postal code"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Business Email" required>
                  <Input
                    type="email"
                    value={form.businessEmail}
                    onChange={e => set('businessEmail', e.target.value)}
                    placeholder="contact@yourbusiness.ca"
                  />
                </Field>
                <Field label="Mobile Phone" required>
                  <Input
                    type="tel"
                    value={form.businessPhone}
                    onChange={e => set('businessPhone', e.target.value)}
                    placeholder="604-555-0142"
                  />
                </Field>
              </div>

              <Field label="Primary Operating Regions" required hint="Jurisdictions where you will post inspection jobs">
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {REGIONS.map(r => {
                    const active = form.regions.includes(r)
                    return (
                      <button key={r} type="button" onClick={() => toggleArr('regions', r)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all text-sm ${
                          active ? 'border-flame bg-orange-50 font-bold text-gray-900' : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}>
                        <span>{r}</span>
                        {active && <CheckCircle2 className="w-4 h-4 text-flame shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </Field>

              {form.builderType && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <div className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">Default Permit Coverage</div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {autoPermitFamilies.map(f => (
                      <span key={f} className="inline-flex items-center gap-1.5 bg-white border border-blue-200 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                        {PERMIT_FAMILY_LABELS[f]}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-blue-600">
                    Based on your builder type, your projects will default to Building, Electrical, Plumbing, Mechanical, and Final / Occupancy permit coverage. Admin review can adjust this set if needed.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ══ STEP 2: COMPANY REGISTRATION ══════════════════════ */}
          {step === 'registration' && (
            <div className="space-y-5">
              <h2 className="text-lg font-black text-gray-900">Company registration</h2>

              <Field label="Business Entity Type" required>
                <Select value={form.entityType} onChange={e => set('entityType', e.target.value)}>
                  <option value="">Select entity type…</option>
                  {ENTITY_TYPES.map(t => <option key={t}>{t}</option>)}
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="BC Corp / Registration Number" hint="If incorporated — as listed with BC Registries">
                  <Input
                    value={form.companyNumber}
                    onChange={e => set('companyNumber', e.target.value)}
                    placeholder="BC1234567"
                    className="font-mono"
                  />
                </Field>
                <Field label="Province of Incorporation">
                  <Select value={form.provinceOfIncorporation} onChange={e => set('provinceOfIncorporation', e.target.value)}>
                    <option value="">Select…</option>
                    <option>British Columbia</option>
                    <option>Alberta</option>
                    <option>Ontario</option>
                    <option>Quebec</option>
                    <option>Federal (Canada)</option>
                    <option>Other</option>
                  </Select>
                </Field>
              </div>

              <Field label="Years in Operation" required>
                <Select value={form.yearsOperating} onChange={e => set('yearsOperating', e.target.value)}>
                  <option value="">Select…</option>
                  <option>Less than 1 year</option>
                  <option>1–3 years</option>
                  <option>3–5 years</option>
                  <option>5–10 years</option>
                  <option>10–20 years</option>
                  <option>20+ years</option>
                </Select>
              </Field>

              <Field label="Website" hint="Optional — helps verify your business presence">
                <Input
                  type="url"
                  value={form.website}
                  onChange={e => set('website', e.target.value)}
                  placeholder="https://coastaldevelopments.ca"
                />
              </Field>

              {/* BC Housing — residential builders only */}
              {needsBcHousing && (
                <div className="pt-2 border-t border-gray-100 space-y-4">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-flame" />
                    <span className="text-sm font-bold text-gray-900">BC Housing — Residential Builder Licensing</span>
                  </div>

                  <Field label="BC Housing Residential Builder Licence Number" required={needsBcHousing} hint="As registered with BC Housing Licensing & Consumer Services">
                    <Input
                      value={form.bcHousingLicenceNumber}
                      onChange={e => set('bcHousingLicenceNumber', e.target.value)}
                      placeholder="LIC-XXXXXXXX"
                      className="font-mono"
                    />
                  </Field>

                  <Field label="Licence Type / Validation State" required={needsBcHousing}>
                    <Select value={form.bcHousingLicenceType} onChange={e => set('bcHousingLicenceType', e.target.value)}>
                      <option value="">Select licence type…</option>
                      {BC_HOUSING_LICENCE_TYPES.map(t => <option key={t}>{t}</option>)}
                    </Select>
                  </Field>

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <div
                        onClick={() => set('newResidentialConstruction', !form.newResidentialConstruction)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 shrink-0 transition-all ${
                          form.newResidentialConstruction ? 'bg-flame border-flame' : 'border-gray-300 bg-white'
                        }`}
                      >
                        {form.newResidentialConstruction && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-900">My projects include new residential construction</span>
                        <p className="text-xs text-gray-400 mt-0.5">This triggers the Home Warranty Acceptance / Registration Evidence requirement where applicable under BC law.</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <ConditionalBanner>
                <span className="font-bold">Why we ask:</span> Vero verifies every builder against BC Registries and confirms that residential builders hold the required BC Housing licence before they can post live inspection requests.
              </ConditionalBanner>
            </div>
          )}

          {/* ══ STEP 3: DOCUMENTS ════════════════════════════════ */}
          {step === 'documents' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-black text-gray-900">Verification documents</h2>
                <p className="text-sm text-gray-500 mt-1">All documents are encrypted and reviewed only by our verification team. Live project posting is locked until verification is approved.</p>
              </div>

              {/* Core required docs */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Required for all builders</div>
                <DocUpload
                  label="Business Registration / Incorporation Documents"
                  required
                  hint="Certificate of Incorporation, BC Registries notice, or equivalent."
                  uploaded={form.docs.businessRegistration}
                  onUpload={file => setDocUploaded('businessRegistration', file)}
                />
                <DocUpload
                  label="Proof of Signing Authority"
                  required
                  hint="Articles of incorporation, corporate resolution, or power of attorney showing signing authority."
                  uploaded={form.docs.signingAuthority}
                  onUpload={file => setDocUploaded('signingAuthority', file)}
                />
                <DocUpload
                  label="Certificate of Insurance"
                  required
                  hint="Current commercial general liability or builder's risk certificate meeting Vero participation requirements."
                  uploaded={form.docs.insurance}
                  onUpload={file => setDocUploaded('insurance', file)}
                />
              </div>

              {/* WorkSafe — clearance OR exemption */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">WorkSafeBC</div>

                <div className="space-y-2">
                  {[
                    { id: 'clearance' as WorksafeMode, label: 'I have a current WorkSafeBC clearance letter', sub: 'Upload your current clearance letter from WorkSafeBC' },
                    { id: 'exemption' as WorksafeMode, label: 'I am exempt / non-registered', sub: 'I will provide a signed declaration of exemption or non-registration where applicable' },
                  ].map(opt => (
                    <button key={opt.id} type="button" onClick={() => set('worksafeMode', opt.id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        form.worksafeMode === opt.id ? 'border-flame bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                          form.worksafeMode === opt.id ? 'border-flame' : 'border-gray-300'
                        }`}>
                          {form.worksafeMode === opt.id && <div className="w-2.5 h-2.5 bg-flame rounded-full" />}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-gray-900">{opt.label}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{opt.sub}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {form.worksafeMode === 'clearance' && (
                  <DocUpload
                    label="WorkSafeBC Clearance Letter"
                    required
                    hint="Current clearance letter from WorkSafeBC confirming good standing."
                    uploaded={form.worksafeDocs.clearanceLetter}
                    onUpload={file => setWorksafeDocUploaded('clearanceLetter', file)}
                  />
                )}
                {form.worksafeMode === 'exemption' && (
                  <DocUpload
                    label="WorkSafeBC Exemption / Non-Registration Declaration"
                    required
                    hint="Signed declaration of exemption or non-registration, where applicable."
                    uploaded={form.worksafeDocs.exemptionDeclaration}
                    onUpload={file => setWorksafeDocUploaded('exemptionDeclaration', file)}
                  />
                )}
              </div>

              {/* BC Housing Licence — residential/both only */}
              {needsBcHousing && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-flame" /> BC Housing — Required for residential builders
                  </div>
                  <DocUpload
                    label="BC Housing Residential Builder Licence"
                    required
                    hint="Required for residential builders where applicable. Upload your current BC Housing licence certificate."
                    uploaded={form.docs.bcHousingLicence}
                    onUpload={file => setDocUploaded('bcHousingLicence', file)}
                  />

                  {needsHomeWarranty && (
                    <DocUpload
                      label="Home Warranty Acceptance / Registration Evidence"
                      required
                      hint="Required for applicable new residential construction. Evidence of home warranty acceptance or registration as required under BC law."
                      uploaded={form.docs.homeWarranty}
                      onUpload={file => setDocUploaded('homeWarranty', file)}
                    />
                  )}
                </div>
              )}

              {/* Compliance disclosure */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Compliance disclosure</div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm text-gray-700 font-medium leading-relaxed">
                    To the best of your knowledge, have the builder or any persons in control of the business been subject to any material enforcement actions, judgments, penalties, licence revocations, fraud findings, or similar compliance history relevant to construction or contracting?
                  </p>
                  <div className="flex gap-2">
                    {[
                      { val: false, label: 'No' },
                      { val: true,  label: 'Yes — provide details below' },
                    ].map(opt => (
                      <button key={String(opt.val)} type="button"
                        onClick={() => set('complianceHasIssues', opt.val)}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                          form.complianceHasIssues === opt.val
                            ? opt.val ? 'border-red-400 bg-red-50 text-red-700' : 'border-success-green bg-green-50 text-success-green'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {form.complianceHasIssues === true && (
                    <div className="space-y-3 pt-1">
                      <Field label="Explanation" required hint="Briefly describe the nature, date, and outcome of each relevant matter">
                        <Textarea
                          value={form.complianceExplanation}
                          onChange={e => set('complianceExplanation', e.target.value)}
                          placeholder="Describe the enforcement action, judgment, or compliance matter…"
                        />
                      </Field>
                      <DocUpload
                        label="Supporting Documentation"
                        conditional
                        hint="Upload any relevant court orders, regulatory decisions, or supporting documentation."
                        uploaded={form.complianceUpload}
                        onUpload={file => setForm(prev => ({ ...prev, complianceUpload: true, complianceUploadFile: file }))}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Government ID — conditional, not universally required */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Identity verification (conditional)</div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-500 mb-2">
                  Government-issued photo ID is not required at this stage for all applicants. Vero may request it during manual review if the authorized signatory&apos;s identity cannot be confirmed from the documents above.
                </div>
                <DocUpload
                  label="Government-Issued Photo ID"
                  conditional
                  hint="Passport, driver's licence, or BC Services Card for the authorized signatory — only if requested."
                  uploaded={form.docs.govId}
                  onUpload={file => setDocUploaded('govId', file)}
                />
              </div>

              {/* Encryption notice */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-2">
                <Shield className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div className="text-xs text-gray-500">
                  Your documents are encrypted with AES-256 at rest and in transit. They are never shared with inspectors and are retained only for the duration required by law.
                </div>
              </div>
            </div>
          )}

          {/* ══ STEP 4: REVIEW & SUBMIT ═══════════════════════════ */}
          {step === 'review' && (
            <div className="space-y-5">
              <h2 className="text-lg font-black text-gray-900">Review & submit</h2>

              {/* Summary */}
              <div className="bg-gray-900 rounded-xl p-4 space-y-2.5">
                {[
                  { label: 'Legal Name',    val: form.legalBusinessName || '—' },
                  { label: 'Builder Type',  val: BUILDER_TYPES.find(b => b.id === form.builderType)?.label || '—' },
                  { label: 'Contact',       val: form.primaryContactName || '—' },
                  { label: 'Title',         val: form.signatoryTitle || '—' },
                  { label: 'Address',       val: form.businessAddress || '—' },
                  { label: 'Entity',        val: form.entityType || '—' },
                  { label: 'Corp. Number',  val: form.companyNumber || 'N/A' },
                  { label: 'Regions',       val: form.regions.length > 0 ? form.regions.slice(0, 3).join(', ') + (form.regions.length > 3 ? ` +${form.regions.length - 3}` : '') : '—' },
                  { label: 'Permits',       val: autoPermitFamilies.map(f => PERMIT_FAMILY_LABELS[f]).join(', ') || '—' },
                  ...(needsBcHousing ? [
                    { label: 'BC Housing #', val: form.bcHousingLicenceNumber || '—' },
                    { label: 'Licence Type', val: form.bcHousingLicenceType || '—' },
                  ] : []),
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-start justify-between gap-4">
                    <span className="text-xs text-gray-400 shrink-0 w-28">{label}</span>
                    <span className="text-xs font-semibold text-white text-right">{val}</span>
                  </div>
                ))}
              </div>

              {/* Document checklist */}
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Document checklist</div>
                <div className="space-y-1.5">
                  {[
                    { key: 'businessRegistration', label: 'Business Registration / Incorporation Docs', required: true },
                    { key: 'signingAuthority',     label: 'Proof of Signing Authority',                required: true },
                    { key: 'insurance',            label: 'Certificate of Insurance',                  required: true },
                    { key: '_worksafe',            label: `WorkSafeBC — ${form.worksafeMode === 'exemption' ? 'Exemption Declaration' : 'Clearance Letter'}`, required: true },
                    ...(needsBcHousing ? [{ key: 'bcHousingLicence', label: 'BC Housing Residential Builder Licence', required: true }] : []),
                    ...(needsHomeWarranty ? [{ key: 'homeWarranty', label: 'Home Warranty Acceptance / Registration Evidence', required: true }] : []),
                    { key: '_compliance', label: `Compliance Disclosure — ${form.complianceHasIssues === null ? 'Not answered' : form.complianceHasIssues ? 'Yes (issues disclosed)' : 'No issues'}`, required: true },
                    { key: 'govId', label: 'Government-Issued Photo ID', required: false },
                  ].map(({ key, label, required }) => {
                    let uploaded = false
                    if (key === '_worksafe')     uploaded = worksafeComplete
                    else if (key === '_compliance') uploaded = complianceComplete
                    else if (key in form.docs)  uploaded = form.docs[key as keyof typeof form.docs]
                    else                        uploaded = false

                    const isMissing = required && !uploaded
                    return (
                      <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                        uploaded     ? 'bg-green-50 text-success-green' :
                        isMissing    ? 'bg-red-50 text-red-400' :
                                       'bg-gray-50 text-gray-400'
                      }`}>
                        {uploaded
                          ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          : isMissing
                            ? <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            : <FileText className="w-3.5 h-3.5 shrink-0" />
                        }
                        <span className="flex-1">{label}</span>
                        {!required && <span className="text-gray-400 font-normal">optional</span>}
                        {isMissing && <span className="text-red-400">Missing</span>}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Locked state reminder */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-700">
                  <span className="font-bold">Live posting locked until approved.</span> After submitting, Vero will review your documents within 3–5 business days and notify you by email.
                </div>
              </div>

              {/* Declarations */}
              <div className="space-y-3 pt-1">
                {[
                  {
                    key: 'agreeAccuracy' as const,
                    label: 'I confirm that all information and documents provided are accurate and complete, and I am authorized to act on behalf of the business named above.',
                  },
                  {
                    key: 'agreeTerms' as const,
                    label: 'I agree to the Vero Terms of Service, Privacy Policy, and Builder Code of Conduct.',
                  },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-start gap-3 cursor-pointer">
                    <div
                      onClick={() => set(key, !form[key])}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 shrink-0 transition-all ${
                        form[key] ? 'bg-flame border-flame' : 'border-gray-300'
                      }`}
                    >
                      {form[key] && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm text-gray-600 leading-relaxed">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── Navigation ── */}
          {submitError && (
            <div className="mt-6 bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div className="text-xs font-semibold text-red-700">{submitError}</div>
            </div>
          )}

          <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
            {stepIdx > 0 && (
              <button
                type="button"
                onClick={() => setStep(STEP_ORDER[stepIdx - 1])}
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-700 hover:border-gray-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}

            {step !== 'review' ? (
              <button
                type="button"
                onClick={() => setStep(STEP_ORDER[stepIdx + 1])}
                className="flex-1 flex items-center justify-center gap-1.5 bg-flame hover:opacity-90 text-white font-bold py-3 rounded-xl text-sm transition-opacity"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!form.agreeTerms || !form.agreeAccuracy || !allDocsComplete || isSubmitting}
                onClick={handleSubmit}
                className="flex-1 flex items-center justify-center gap-2 bg-flame hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition-opacity"
              >
                {isSubmitting
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting…</>
                  : <><Shield className="w-4 h-4" /> Submit for verification</>
                }
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Need help?{' '}
          <a href="mailto:admin@veropermit.com" className="text-flame font-semibold hover:underline">
            Contact admin@veropermit.com
          </a>
        </p>
      </div>
    </div>
  )
}
