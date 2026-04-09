'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Mail, Phone, MapPin, BadgeCheck,
  Star, Shield, Clock, DollarSign, CheckCircle2,
  Edit3, Save, X, Award, UploadCloud, AlertCircle, Layers
} from 'lucide-react'
import { Navbar } from '@/components/shared/Navbar'
import { useAuth } from '@/lib/auth'
import { getInspectorOnboardingStatusAsync } from '@/lib/persistence/inspectorOnboarding'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
import { listInspectorCredentials, insertInspectorCredential, selectInspectorEligibility, upsertInspectorEligibility, type InspectorCredentialRow } from '@/lib/supabase/compliance'
import type { InspectorCredentialType, InspectorEligibilityProfile, InspectorRoleLane } from '@/lib/types'
import { getInspectorRoleLaneLabel, INSPECTOR_ROLE_LANES, INSPECTOR_ROLE_LANE_CONFIG } from '@/lib/inspectorRoleLanes'
import { LANE_REQUIREMENTS, checkPackageReadiness, NON_SIGNING_LANES } from '@/lib/inspectorCredentialRequirements'

const INSPECTOR_ASSETS_BUCKET = 'builder-assets'
const INSPECTOR_AVATAR_PREFIX = 'inspector-avatars'
const INSPECTOR_AVATAR_POLICY = "(storage.foldername(name))[1] = 'inspector-avatars' AND (storage.foldername(name))[2] = auth.uid()::text"
const INSPECTOR_CREDENTIAL_BUCKET = 'inspection-evidence'
const INSPECTOR_CREDENTIAL_PREFIX = 'inspector_documents'
const INSPECTOR_STORAGE_POLICY = "(storage.foldername(name))[1] = 'inspector_documents' AND (storage.foldername(name))[2] = auth.uid()::text"

// Baseline required documents — apply to every applicant regardless of role lane.
// Lane-specific requirements (primary_license, good_standing_proof, etc.) are in
// the optional section below; admin checks per-lane completeness separately.
const REQUIRED_CREDENTIALS: Array<{
  type: InspectorCredentialType
  label: string
  hint: string
}> = [
  { type: 'government_id',                  label: 'Government-issued photo ID',                     hint: 'Passport, driver\'s licence, or BC Services Card.' },
  { type: 'insurance',                       label: 'Certificate of insurance',                        hint: 'Current certificate — minimum $2M E&O / general liability.' },
  { type: 'resume',                          label: 'Resume or experience summary',                    hint: 'Professional background relevant to your selected role lane(s).' },
  { type: 'conflict_of_interest_declaration', label: 'Signed conflict-of-interest declaration',        hint: 'Confirms no material conflicts with any builder or project on the platform.' },
  { type: 'data_handling_acknowledgement',   label: 'Signed evidence / data-handling acknowledgement', hint: 'Confirms understanding of SiteLine evidence immutability and chain-of-custody rules.' },
]

// Lane-specific and supplementary documents — required for specific role lanes
// or useful for expanded eligibility. Upload after signup once role lanes are confirmed.
const OPTIONAL_CREDENTIALS: Array<{
  type: InspectorCredentialType
  label: string
  hint: string
}> = [
  { type: 'primary_license',         label: 'Primary licence / registration',                      hint: 'Required for Architect, Engineer, CP, and FSR lanes (AIBC, EGBC, TSBC registration).' },
  { type: 'good_standing_proof',     label: 'Proof of good standing / active registry status',     hint: 'Required for Architect, Engineer, FSR, and Official Authority lanes.' },
  { type: 'firm_practice_cert',      label: 'Certificate / Permit to Practice (firm)',             hint: 'Required for Architect (AIBC Certificate of Practice) and Engineer (EGBC Permit to Practice) lanes.' },
  { type: 'cp_qualification',        label: 'CP qualification / CP program status',                hint: 'Required for Certified Professional lane — layered on top of Architect or Engineer.' },
  { type: 'non_signing_declaration', label: 'Signed non-signing declaration',                      hint: 'Required for Permit Coordinator (Non-Signing) lane.' },
  { type: 'tsbc_or_fsr',            label: 'TSBC / FSR certificate (with FSR class)',             hint: 'Required for Electrical FSR lane.' },
  { type: 'employer_evidence',       label: 'Employer / contractor relationship evidence',         hint: 'Required for Electrical FSR lane — contractor licence where applicable.' },
  { type: 'ahj_authorization',       label: 'AHJ employment or appointment letter',                hint: 'Required for Building / Plumbing Official lane — confirms AHJ appointment.' },
  { type: 'boabc_qualification',     label: 'BOABC class / qualification details',                 hint: 'Required for Building / Plumbing Official lane.' },
  { type: 'professional_designation', label: 'Discipline declaration (Engineer)',                  hint: 'Required for Engineer lane — confirms discipline: Structural, Geotechnical, Mechanical, or Electrical.' },
  { type: 'worksafe',               label: 'WorkSafe BC clearance',                               hint: 'Required for applicable field roles.' },
  { type: 'gas_ticket',             label: 'Gas ticket',                                           hint: 'Upload if you want gas-related scopes considered.' },
  { type: 'other',                  label: 'Other',                                                hint: 'Additional certifications or tickets that may support future eligibility.' },
]

const CREDENTIAL_LABELS: Record<InspectorCredentialType, string> = {
  primary_license:                     'Primary licence / registration',
  government_id:                       'Government-issued photo ID',
  insurance:                           'Certificate of insurance',
  worksafe:                            'WorkSafe BC clearance',
  tsbc_or_fsr:                         'TSBC / FSR certificate',
  gas_ticket:                          'Gas ticket',
  professional_designation:            'Discipline declaration',
  other:                               'Other',
  resume:                              'Resume or experience summary',
  good_standing_proof:                 'Proof of good standing / active status',
  firm_practice_cert:                  'Certificate / Permit to Practice (firm)',
  cp_qualification:                    'CP qualification / CP program status',
  non_signing_declaration:             'Signed non-signing declaration',
  employer_evidence:                   'Employer / contractor relationship evidence',
  ahj_authorization:                   'AHJ employment or appointment letter',
  boabc_qualification:                 'BOABC class / qualification details',
  conflict_of_interest_declaration:    'Signed conflict-of-interest declaration',
  data_handling_acknowledgement:       'Signed evidence / data-handling acknowledgement',
}

const COMPLETED_JOBS = [
  { project: 'Kitsilano Infill Duplex', stage: 'Stage 3 — Framing', date: 'Feb 22, 2026', result: 'pass' as const, payout: 443, builder: 'Wyatt Davis' },
  { project: 'Marine Drive Condo Tower', stage: 'Stage 2 — Foundation', date: 'Jan 15, 2026', result: 'pass' as const, payout: 443, builder: 'Nick Kristof' },
  { project: 'Commercial Block', stage: 'Stage 1 — Site Survey', date: 'Jan 8, 2026', result: 'pass' as const, payout: 295, builder: 'Wyatt Davis' },
  { project: 'North Van Townhomes', stage: 'Stage 4 — Mechanical', date: 'Dec 12, 2025', result: 'pass' as const, payout: 443, builder: 'Coastal Dev.' },
]

export default function InspectorProfilePage() {
  const router = useRouter()
  const { user, login } = useAuth()
  const [onboardingStatus, setOnboardingStatus] = useState<string | null>(null)
  const [credentialOwnerId, setCredentialOwnerId] = useState<string | null>(null)
  const [eligibilityProfile, setEligibilityProfile] = useState<InspectorEligibilityProfile | null>(null)
  const [editing, setEditing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null)
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<InspectorCredentialRow[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<InspectorCredentialType>('primary_license')
  // Lane-specific upload state — used by the Manage Role Lanes section
  const laneUploadRef = useRef<HTMLInputElement>(null)
  const [pendingLaneType, setPendingLaneType] = useState<InspectorCredentialType | null>(null)
  const [requestingLane, setRequestingLane] = useState<InspectorRoleLane | null>(null)
  // Must be declared before any conditional return to satisfy Rules of Hooks
  const [form, setForm] = useState({
    name:        user?.name          ?? '',
    license:     user?.licenseNumber ?? '',
    designation: user?.designation   ?? '',
    email:       user?.email         ?? '',
    phone:       user?.phone         ?? '',
    location:    'Vancouver, BC',
  })

  useEffect(() => {
    if (!user) return
    setForm(current => ({
      ...current,
      name: user.name ?? '',
      license: user.licenseNumber ?? '',
      designation: user.designation ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
    }))
  }, [user?.id, user?.name, user?.licenseNumber, user?.designation, user?.email, user?.phone])

  useEffect(() => {
    if (!user) {
      router.replace('/sign-in?role=inspector')
      return
    }
    if (user.role !== 'inspector') {
      router.replace('/')
      return
    }
    getInspectorOnboardingStatusAsync(user.id, user.supabaseId).then(s => setOnboardingStatus(s))
  }, [user?.id, user?.supabaseId])
  useEffect(() => {
    if (!user || user.role !== 'inspector' || onboardingStatus === null) return
    if (onboardingStatus !== 'approved') router.replace('/inspector/onboarding-status')
  }, [user, onboardingStatus, router])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    supabase.auth.getUser().then(({ data, error }) => {
      if (cancelled) return
      const ownerId = data.user?.id ?? null
      setCredentialOwnerId(ownerId)
      if (error || !ownerId) return
      Promise.all([
        listInspectorCredentials(ownerId),
        selectInspectorEligibility(ownerId),
      ]).then(([rows, eligibility]) => {
        if (cancelled) return
        setCredentials(rows)
        setEligibilityProfile(eligibility)
      })
    })

    return () => {
      cancelled = true
    }
  }, [user?.id, user?.supabaseId])

  if (!user || user.role !== 'inspector' || onboardingStatus !== 'approved' || onboardingStatus === null) {
    return (
      <div className="app-theme-scope min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-flame/30 border-t-flame rounded-full animate-spin" />
      </div>
    )
  }

  // Real Supabase accounts start with no history — mock data is demo-only
  const completedJobs = user?.supabaseId ? [] : COMPLETED_JOBS
  const totalEarnings = completedJobs.reduce((s, j) => s + j.payout, 0)
  const uploadedCredentialTypes = new Set(credentials.map(c => c.credentialType))
  const missingRequired = REQUIRED_CREDENTIALS.filter(doc => !uploadedCredentialTypes.has(doc.type))
  const requiredCredentials = credentials.filter(c => REQUIRED_CREDENTIALS.some(doc => doc.type === c.credentialType))
  const optionalCredentials = credentials.filter(c => OPTIONAL_CREDENTIALS.some(doc => doc.type === c.credentialType))

  const handleAvatarUpload = async (files: FileList | null) => {
    if (!user || !files || files.length === 0) return

    const file = files[0]
    const validTypes = ['image/png', 'image/jpeg']
    if (!validTypes.includes(file.type)) {
      setAvatarError('Please upload a PNG or JPG profile image.')
      return
    }

    const { data: authData, error: authError } = await supabase.auth.getUser()
    const authUid = authData.user?.id ?? null

    if (authError || !authData.user || !authUid) {
      setAvatarError('Upload failed: we could not confirm your authenticated inspector session. Please sign in again and retry.')
      return
    }

    const extension = file.type === 'image/png' ? 'png' : 'jpg'
    const path = `${INSPECTOR_AVATAR_PREFIX}/${authUid}/avatar.${extension}`

    setUploadingAvatar(true)
    setAvatarError(null)

    console.info('[InspectorAvatarUpload]', {
      bucket: INSPECTOR_ASSETS_BUCKET,
      path,
      authUid,
      policy: INSPECTOR_AVATAR_POLICY,
    })

    try {
      const { error: uploadError } = await supabase.storage
        .from(INSPECTOR_ASSETS_BUCKET)
        .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type })

      if (uploadError) {
        const message = uploadError.message.toLowerCase()
        if (message.includes('bucket')) {
          setAvatarError(`Upload failed: storage bucket "${INSPECTOR_ASSETS_BUCKET}" does not exist in the active Supabase environment yet.`)
        } else {
          setAvatarError(`Upload failed: ${uploadError.message}`)
        }
        return
      }

      const { data: publicData } = supabase.storage.from(INSPECTOR_ASSETS_BUCKET).getPublicUrl(path)
      const logoUrl = publicData.publicUrl

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: authUid, logo_url: logoUrl }, { onConflict: 'id' })

      if (profileError) {
        setAvatarError(`Could not save profile image URL: ${profileError.message}`)
        return
      }

      const metadata = (authData.user.user_metadata ?? {}) as Record<string, unknown>
      await supabase.auth.updateUser({
        data: {
          ...metadata,
          logo_url: logoUrl,
        },
      })

      login({
        ...user,
        logoUrl,
      })
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Could not upload profile image.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleCredentialUpload = async (files: FileList | null, credTypeOverride?: InspectorCredentialType) => {
    if (!user || !files || files.length === 0) return
    setUploadError(null)
    const typeToUse = credTypeOverride ?? selectedType
    const file = files[0]
    const { data: authData, error: authError } = await supabase.auth.getUser()
    const authUid = authData.user?.id ?? credentialOwnerId ?? null

    if (authError || !authData.user || !authUid) {
      setUploadError('Upload failed: we could not confirm your authenticated storage identity. Please sign in again and retry.')
      return
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${INSPECTOR_CREDENTIAL_PREFIX}/${authUid}/${typeToUse}/${Date.now()}-${safeName}`

    console.info('[InspectorCredentialUpload]', {
      bucket: INSPECTOR_CREDENTIAL_BUCKET,
      path,
      authUid,
      policy: INSPECTOR_STORAGE_POLICY,
    })

    try {
      setUploading(true)
      const { error: uploadErrorRes } = await supabase.storage.from(INSPECTOR_CREDENTIAL_BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      })
      if (uploadErrorRes) {
        console.error('[InspectorCredentialUpload] storage upload failed', {
          bucket: INSPECTOR_CREDENTIAL_BUCKET,
          path,
          authUid,
          message: uploadErrorRes.message,
          name: uploadErrorRes.name,
        })
        const message = uploadErrorRes.message.toLowerCase()
        if (message.includes('bucket')) {
          setUploadError(`Upload failed: storage bucket "${INSPECTOR_CREDENTIAL_BUCKET}" is missing or misconfigured.`)
        } else if (message.includes('row-level security') || message.includes('policy') || message.includes('permission')) {
          setUploadError(`Upload failed: your account is signed in, but storage permissions are blocking this upload. (${uploadErrorRes.message})`)
        } else {
          setUploadError(`Upload failed: ${uploadErrorRes.message}`)
        }
        setUploading(false)
        return
      }
      const ok = await insertInspectorCredential({
        id: `cred-${authUid}-${typeToUse}-${Date.now()}`,
        userId: authUid,
        credentialType: typeToUse,
        fileName: file.name,
        storagePath: path,
        reviewerNote: undefined,
        isRequired: REQUIRED_CREDENTIALS.some(doc => doc.type === typeToUse),
        expiresAt: undefined,
      })
      if (!ok) {
        setUploadError('Could not save credential metadata. Check the inspector_credentials table.')
      } else {
        const next = await listInspectorCredentials(authUid)
        setCredentials(next)
      }
    } finally {
      setUploading(false)
    }
  }

  // ── Lane-specific document upload (Manage Role Lanes section) ────────────────

  const handleLaneDocUploadClick = (credType: InspectorCredentialType) => {
    setPendingLaneType(credType)
    laneUploadRef.current?.click()
  }

  const handleLaneFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!pendingLaneType) return
    await handleCredentialUpload(e.target.files, pendingLaneType)
    setPendingLaneType(null)
    e.target.value = ''
  }

  const handleRequestLane = async (lane: InspectorRoleLane) => {
    if (!credentialOwnerId || !eligibilityProfile) return
    setRequestingLane(lane)
    try {
      const updatedLanes = [...eligibilityProfile.requestedRoleLanes, lane]
      const ok = await upsertInspectorEligibility({
        ...eligibilityProfile,
        requestedRoleLanes: updatedLanes,
      })
      if (ok) {
        setEligibilityProfile(prev => prev ? { ...prev, requestedRoleLanes: updatedLanes } : prev)
      }
    } finally {
      setRequestingLane(null)
    }
  }

  const handleProfileSave = async () => {
    if (!user?.supabaseId) {
      setProfileSaveError('Profile saving is only available for signed-in Supabase inspector accounts.')
      return
    }

    setProfileSaveError(null)
    setProfileSaveSuccess(null)
    setSavingProfile(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) {
        setProfileSaveError('Could not verify your account session. Please sign in again and retry.')
        return
      }

      const existingMetadata = (authData.user.user_metadata ?? {}) as Record<string, unknown>
      const nextPhone = form.phone.trim()

      const { data: updatedData, error: updateError } = await supabase.auth.updateUser({
        data: {
          ...existingMetadata,
          phone: nextPhone,
          name: form.name.trim(),
          designation: form.designation.trim(),
          license_number: form.license.trim(),
          licenseNumber: form.license.trim(),
        },
      })

      if (updateError || !updatedData.user) {
        setProfileSaveError(updateError?.message ?? 'Could not save your profile changes.')
        return
      }

      const updatedMetadata = (updatedData.user.user_metadata ?? {}) as Record<string, unknown>
      const nextUser = {
        ...user,
        name: typeof updatedMetadata.name === 'string' ? updatedMetadata.name : form.name.trim(),
        designation: typeof updatedMetadata.designation === 'string' ? updatedMetadata.designation : form.designation.trim(),
        licenseNumber:
          (typeof updatedMetadata.license_number === 'string' ? updatedMetadata.license_number : undefined)
          ?? (typeof updatedMetadata.licenseNumber === 'string' ? updatedMetadata.licenseNumber : undefined)
          ?? form.license.trim(),
        phone: typeof updatedMetadata.phone === 'string' ? updatedMetadata.phone : nextPhone,
      }

      login(nextUser)
      setForm(current => ({
        ...current,
        name: nextUser.name,
        designation: nextUser.designation ?? '',
        license: nextUser.licenseNumber ?? '',
        phone: nextUser.phone,
      }))
      setProfileSaveSuccess('Profile saved.')
      setEditing(false)
      router.refresh()
    } catch (error) {
      setProfileSaveError(error instanceof Error ? error.message : 'Could not save your profile changes.')
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className="app-theme-scope min-h-screen bg-surface">
      <Navbar role="inspector" dark />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <Link href="/inspector" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink mb-5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Live Board
        </Link>

        {/* Profile header */}
        <div className="card-dark rounded-2xl p-6 mb-5 inset-top">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-flame/15 border-2 border-flame/30 rounded-2xl flex items-center justify-center font-black text-flame text-xl shrink-0 overflow-hidden">
              {user?.logoUrl ? (
                <Image src={user.logoUrl} alt={`${form.name} profile image`} width={64} height={64} className="h-full w-full object-cover" unoptimized />
              ) : (
                user?.avatar ?? 'SC'
              )}
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-2">
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-surface border border-white/10 focus:border-flame text-ink font-bold text-base rounded-xl px-3 py-2 focus:outline-none" />
                  <input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                    className="w-full bg-surface border border-white/10 focus:border-flame text-muted text-sm rounded-xl px-3 py-2 focus:outline-none" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h1 className="font-black text-ink text-xl">{form.name}</h1>
                    <BadgeCheck className="w-5 h-5 text-electric" />
                  </div>
                  <div className="text-sm font-semibold text-muted mt-0.5">{form.designation}</div>
                  <div className="text-xs font-mono text-subtle mt-0.5">{form.license}</div>
                </>
              )}
            </div>
            {editing ? (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleProfileSave}
                  disabled={savingProfile}
                  className="flex items-center gap-1.5 bg-success-green text-white text-xs font-bold px-3 py-2 rounded-xl hover:opacity-90 transition-all disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" /> {savingProfile ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setProfileSaveError(null)
                    setProfileSaveSuccess(null)
                    setEditing(false)
                  }}
                  className="w-8 h-8 bg-raised border border-white/10 rounded-xl flex items-center justify-center text-muted">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 bg-raised border border-white/10 hover:border-white/20 text-muted hover:text-ink text-xs font-semibold px-3 py-2 rounded-xl transition-all shrink-0">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <label className="inline-flex items-center gap-2 bg-raised border border-white/10 hover:border-white/20 text-muted hover:text-ink text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer">
              <UploadCloud className="w-3.5 h-3.5" />
              {uploadingAvatar ? 'Uploading…' : 'Upload Profile Image'}
              <input
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                className="hidden"
                onChange={e => void handleAvatarUpload(e.target.files)}
                disabled={uploadingAvatar}
              />
            </label>
            {avatarError && <span className="text-xs text-fail-red">{avatarError}</span>}
          </div>

          {(profileSaveError || profileSaveSuccess) && (
            <div className={`mt-4 rounded-xl border px-3 py-2 text-xs ${
              profileSaveError
                ? 'border-fail-red/20 bg-fail-red/10 text-fail-red'
                : 'border-success-green/20 bg-success-green/10 text-success-green'
            }`}>
              {profileSaveError ?? profileSaveSuccess}
            </div>
          )}

          {/* Contact */}
          <div className="grid sm:grid-cols-2 gap-3 mt-5 pt-5 border-t border-white/5">
            {[
              { icon: Mail,   key: 'email',   label: 'Email' },
              { icon: Phone,  key: 'phone',   label: 'Mobile' },
              { icon: MapPin, key: 'location',label: 'Location' },
            ].map(({ icon: Icon, key, label }) => (
              <div key={key} className="flex items-center gap-3 bg-surface border border-white/5 rounded-xl px-3 py-2.5">
                <Icon className="w-4 h-4 text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-subtle uppercase tracking-wide">{label}</div>
                  {editing ? (
                    <input value={form[key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full bg-transparent text-xs font-semibold text-ink focus:outline-none border-b border-white/10 focus:border-flame" />
                  ) : (
                    <div className="text-xs font-semibold text-ink truncate">{form[key as keyof typeof form]}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="card-dark rounded-2xl p-5 mb-5 inset-top">
          <div className="label-mono mb-3">Approved role lanes</div>
          <div className="flex flex-wrap gap-2">
            {(eligibilityProfile?.approvedRoleLanes ?? []).length > 0 ? (
              eligibilityProfile?.approvedRoleLanes.map(lane => (
                <span key={lane} className="rounded-full border border-electric/20 bg-electric/10 px-3 py-1 text-xs font-semibold text-electric">
                  {getInspectorRoleLaneLabel(lane)}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted">No approved role lanes on file yet.</span>
            )}
          </div>
          {(eligibilityProfile?.requestedRoleLanes ?? []).length > 0 && (
            <div className="mt-3 text-xs text-subtle">
              Requested: {eligibilityProfile?.requestedRoleLanes.map(getInspectorRoleLaneLabel).join(', ')}
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { icon: CheckCircle2, label: 'Completed',    value: completedJobs.length, color: 'text-success-green' },
            { icon: Star,         label: 'Rating',       value: user?.rating != null ? `${user.rating.toFixed(1)} ★` : '—', color: 'text-warning-amber' },
            { icon: DollarSign,   label: 'This Month',   value: user?.earningsMonth != null ? `$${user.earningsMonth.toLocaleString()}` : `$${totalEarnings.toLocaleString()}`, color: 'text-ink' },
            { icon: Award,        label: 'Disputes',     value: '0',                   color: 'text-success-green' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="card-dark rounded-2xl p-4 inset-top text-center">
              <Icon className="w-4 h-4 text-muted mx-auto mb-1.5" />
              <div className={`text-lg font-black ${color}`}>{value}</div>
              <div className="text-[10px] text-subtle mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Job history */}
        <div className="card-dark rounded-2xl overflow-hidden inset-top">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="label-mono">Inspection History</div>
            <Link href="/vault" className="text-xs text-flame hover:underline font-semibold">Open Vault</Link>
          </div>
          <div className="divide-y divide-white/5">
            {completedJobs.length === 0 && (
              <div className="px-5 py-8 text-center text-xs text-muted">No completed inspections yet.</div>
            )}
            {completedJobs.map((j, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                <div className="w-7 h-7 bg-success-green/15 border border-success-green/25 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-sm">{j.project}</div>
                  <div className="text-xs text-muted mt-0.5">{j.stage}</div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-subtle">
                    <Clock className="w-3 h-3" /> {j.date}
                    <span>·</span>
                    <Shield className="w-3 h-3" /> {j.builder}
                  </div>
                </div>
                <div className="text-xs font-black text-success-green shrink-0">${j.payout}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Credentials */}
        <div className="card-dark rounded-2xl p-6 mt-5 inset-top">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="label-mono mb-1">Credential package for SiteLine review</div>
              <p className="text-xs text-muted">
                Baseline approval documents unlock SiteLine review. Additional qualifications can be uploaded anytime to
                support expanded eligibility later.
              </p>
            </div>
          </div>

          <div className="mb-5 rounded-xl border border-white/5 bg-surface/60 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-ink">Required approval documents</div>
                <div className="mt-1 text-[11px] text-muted">
                  {missingRequired.length === 0
                    ? 'All required approval documents are on file.'
                    : `${missingRequired.length} required document${missingRequired.length === 1 ? '' : 's'} still missing.`}
                </div>
              </div>
              <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                missingRequired.length === 0
                  ? 'bg-success-green/15 text-success-green'
                  : 'bg-warning-amber/15 text-warning-amber'
              }`}>
                {missingRequired.length === 0 ? 'Approval package complete' : 'Approval package incomplete'}
              </div>
            </div>
          </div>

          <div className={`mb-4 rounded-xl border px-4 py-3 text-xs ${
            missingRequired.length === 0
              ? 'border-electric/20 bg-electric/10 text-electric'
              : 'border-warning-amber/20 bg-warning-amber/10 text-warning-amber'
          }`}>
            <div className="font-bold">
              {missingRequired.length === 0
                ? 'Ready for SiteLine review'
                : 'More documents required before review'}
            </div>
            <div className="mt-1 text-[11px] leading-relaxed">
              {missingRequired.length === 0
                ? 'No separate submit button is required. Once the required documents are uploaded, your approval package is on file for SiteLine admin review. Admin will move your status to under review, needs info, or approved.'
                : 'Upload the remaining required approval documents above. Once all required items are on file, the package is ready for SiteLine admin review.'}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as InspectorCredentialType)}
              className="bg-surface border border-white/10 rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-flame"
            >
              <optgroup label="Baseline — required for all applicants">
                <option value="government_id">Government-issued photo ID</option>
                <option value="insurance">Certificate of insurance</option>
                <option value="resume">Resume or experience summary</option>
                <option value="conflict_of_interest_declaration">Signed conflict-of-interest declaration</option>
                <option value="data_handling_acknowledgement">Signed evidence / data-handling acknowledgement</option>
              </optgroup>
              <optgroup label="Lane-specific documents">
                <option value="primary_license">Primary licence / registration (Architect, Engineer, CP, FSR)</option>
                <option value="good_standing_proof">Proof of good standing / active status</option>
                <option value="firm_practice_cert">Certificate / Permit to Practice (firm)</option>
                <option value="cp_qualification">CP qualification / CP program status</option>
                <option value="non_signing_declaration">Signed non-signing declaration</option>
                <option value="tsbc_or_fsr">TSBC / FSR certificate</option>
                <option value="employer_evidence">Employer / contractor relationship evidence</option>
                <option value="ahj_authorization">AHJ employment or appointment letter</option>
                <option value="boabc_qualification">BOABC class / qualification details</option>
                <option value="professional_designation">Discipline declaration (Engineer)</option>
                <option value="worksafe">WorkSafe BC clearance</option>
                <option value="gas_ticket">Gas ticket</option>
                <option value="other">Other</option>
              </optgroup>
            </select>
            <label className="inline-flex items-center gap-2 bg-flame text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer hover:opacity-90">
              <UploadCloud className="w-4 h-4" />
              {uploading ? 'Uploading…' : 'Upload document'}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={e => handleCredentialUpload(e.target.files)}
                disabled={uploading}
              />
            </label>
          </div>
          {uploadError && <p className="text-xs text-fail-red mb-2">{uploadError}</p>}

          <div className="mb-4 rounded-xl border border-white/5 overflow-hidden">
            <div className="px-3 py-2 bg-raised text-[11px] text-subtle">
              Required documents for SiteLine approval
            </div>
            <div className="divide-y divide-white/5">
              {REQUIRED_CREDENTIALS.map(doc => {
                const uploaded = requiredCredentials.find(c => c.credentialType === doc.type)
                return (
                  <div key={doc.type} className="flex items-start justify-between gap-3 px-3 py-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-ink">{doc.label}</div>
                      <div className="mt-0.5 text-[11px] text-subtle">{doc.hint}</div>
                      {uploaded && (
                        <div className="mt-1 text-[11px] text-muted">
                          Uploaded {new Date(uploaded.uploadedAt).toLocaleDateString('en-CA')} · status {uploaded.status}
                        </div>
                      )}
                    </div>
                    <div className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      uploaded ? 'bg-success-green/15 text-success-green' : 'bg-warning-amber/15 text-warning-amber'
                    }`}>
                      {uploaded ? 'Uploaded' : 'Missing'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-white/5 overflow-hidden">
            <div className="px-3 py-2 bg-raised text-[11px] text-subtle">
              Additional qualifications and tickets
            </div>
            {optionalCredentials.length === 0 ? (
              <div className="px-3 py-3 text-xs text-muted">
                No optional qualifications uploaded yet. These can be added later to support expanded eligibility.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {optionalCredentials.map(c => (
                  <div key={c.id} className="px-3 py-2 text-xs flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink truncate">{c.fileName}</div>
                      <div className="text-[11px] text-subtle">
                        {CREDENTIAL_LABELS[c.credentialType]} · uploaded {new Date(c.uploadedAt).toLocaleDateString('en-CA')}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-muted">
                      <div>
                        Status:{' '}
                        <span className="font-semibold text-ink">{c.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/5 overflow-hidden">
            <div className="px-3 py-2 bg-raised text-[11px] text-subtle">
              All uploaded documents
            </div>
            {credentials.length === 0 ? (
              <div className="px-3 py-3 text-xs text-muted">
                No credentials uploaded yet. Start with the required approval documents above.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {credentials.map(c => (
                  <div key={c.id} className="px-3 py-2 text-xs flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink truncate">{c.fileName}</div>
                      <div className="text-[11px] text-subtle">
                        {CREDENTIAL_LABELS[c.credentialType]} · uploaded {new Date(c.uploadedAt).toLocaleDateString('en-CA')}
                        {c.isRequired && ' · required'}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-muted">
                      <div>
                        Status:{' '}
                        <span className="font-semibold text-ink">{c.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Manage Role Lanes ─────────────────────────────────────────────── */}
        <div className="card-dark rounded-2xl p-6 mt-5 inset-top">
          {/* Hidden file input shared across all lane-doc upload buttons */}
          <input
            ref={laneUploadRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className="hidden"
            onChange={handleLaneFileChange}
            disabled={uploading}
          />

          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-flame" />
            <div className="label-mono">Manage Role Lanes</div>
          </div>
          <p className="text-xs text-muted mb-4">
            Upload the required documents for each role lane. Once all lane documents are on file, request admin review to unlock that lane.
          </p>

          <div className="space-y-2">
            {INSPECTOR_ROLE_LANES.map(lane => {
              const laneReqs = LANE_REQUIREMENTS[lane] ?? []
              const isLaneApproved  = eligibilityProfile?.approvedRoleLanes.includes(lane)  ?? false
              const isLaneRequested = eligibilityProfile?.requestedRoleLanes.includes(lane) ?? false
              const presentCount    = laneReqs.filter(r => uploadedCredentialTypes.has(r.type)).length
              const missingCount    = laneReqs.length - presentCount
              const laneDocReady    = laneReqs.length > 0 && missingCount === 0
              const readiness       = checkPackageReadiness([lane], uploadedCredentialTypes)

              return (
                <div key={lane} className="rounded-xl border border-white/8 bg-surface/50 overflow-hidden">

                  {/* Lane header */}
                  <div className="px-3 py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs font-semibold text-ink truncate">
                        {getInspectorRoleLaneLabel(lane)}
                      </span>
                      {NON_SIGNING_LANES.has(lane) && (
                        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-warning-amber/30 text-warning-amber">
                          Non-signing
                        </span>
                      )}
                      {isLaneApproved && (
                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-success-green/15 text-success-green">
                          Approved
                        </span>
                      )}
                      {!isLaneApproved && isLaneRequested && (
                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-warning-amber/15 text-warning-amber">
                          Pending review
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        readiness.ready
                          ? 'bg-success-green/15 text-success-green'
                          : laneDocReady
                            ? 'bg-electric/15 text-electric'
                            : 'bg-warning-amber/15 text-warning-amber'
                      }`}>
                        {readiness.ready
                          ? 'Ready for approval'
                          : laneDocReady
                            ? 'Lane docs ready'
                            : missingCount > 0
                              ? `${missingCount} missing`
                              : 'No docs required'
                        }
                      </span>

                      {!isLaneRequested && !isLaneApproved && credentialOwnerId && (
                        <button
                          type="button"
                          onClick={() => handleRequestLane(lane)}
                          disabled={requestingLane === lane || uploading}
                          className="text-[10px] font-bold text-flame hover:underline disabled:opacity-50 whitespace-nowrap"
                        >
                          {requestingLane === lane ? 'Requesting…' : '+ Request lane'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lane description */}
                  <div className="px-3 pb-1 text-[10px] text-subtle">
                    {INSPECTOR_ROLE_LANE_CONFIG[lane].description}
                  </div>

                  {/* Lane-specific required documents */}
                  {laneReqs.length > 0 ? (
                    <div className="border-t border-white/5 divide-y divide-white/5">
                      {laneReqs.map(req => {
                        const doc = credentials.find(c => c.credentialType === req.type)
                        const isUploadingThis = uploading && pendingLaneType === req.type
                        return (
                          <div key={req.type} className="px-3 py-2 flex items-start justify-between gap-2 text-[11px]">
                            <div className="flex items-start gap-1.5 flex-1 min-w-0">
                              {doc
                                ? <CheckCircle2 className="w-3 h-3 text-success-green shrink-0 mt-0.5" />
                                : <AlertCircle  className="w-3 h-3 text-warning-amber shrink-0 mt-0.5" />
                              }
                              <div className="min-w-0">
                                <div className={doc ? 'text-muted' : 'text-warning-amber'}>
                                  {req.label}
                                </div>
                                <div className="text-[10px] text-subtle mt-0.5">{req.note}</div>
                                {doc && (
                                  <div className="text-[10px] text-subtle mt-0.5">
                                    {doc.fileName} · {new Date(doc.uploadedAt).toLocaleDateString('en-CA')}
                                  </div>
                                )}
                              </div>
                            </div>
                            {!doc ? (
                              <button
                                type="button"
                                onClick={() => handleLaneDocUploadClick(req.type)}
                                disabled={uploading}
                                className="text-[10px] font-bold text-flame hover:underline shrink-0 disabled:opacity-50 mt-0.5"
                              >
                                {isUploadingThis ? 'Uploading…' : 'Upload'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleLaneDocUploadClick(req.type)}
                                disabled={uploading}
                                className="text-[10px] text-subtle hover:text-flame hover:underline shrink-0 disabled:opacity-50 mt-0.5"
                              >
                                Replace
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="border-t border-white/5 px-3 py-2 text-[11px] text-subtle">
                      No additional documents beyond the baseline required for this lane.
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {uploadError && (
            <p className="text-xs text-fail-red mt-3">{uploadError}</p>
          )}
        </div>

      </div>
    </div>
  )
}
