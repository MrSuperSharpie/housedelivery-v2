'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Building2, Mail, Phone, MapPin,
  Star, Shield, Clock, DollarSign, CheckCircle2,
  Edit3, Save, X, BadgeCheck, UploadCloud
} from 'lucide-react'
import { Navbar } from '@/components/shared/Navbar'
import { MOCK_PROJECTS } from '@/lib/mockData'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const BUILDER_ASSETS_BUCKET = 'builder-assets'
const BUILDER_LOGO_PREFIX = 'builder-logos'
const BUILDER_LOGO_POLICY = "(storage.foldername(name))[1] = 'builder-logos' AND (storage.foldername(name))[2] = auth.uid()::text"

const COMPLETED_STAGES = [
  { project: 'Marine Drive Condo Tower', stage: 'Stage 2 — Foundation', date: 'Jan 15, 2026', inspector: 'Dr. Sarah Chen', result: 'pass' as const, payout: 443 },
  { project: 'Commercial Mixed-Use Block', stage: 'Stage 1 — Site Survey', date: 'Jan 8, 2026', inspector: 'James Liu, P.Eng', result: 'pass' as const, payout: 295 },
  { project: 'Kits Infill Duplex', stage: 'Stage 3 — Framing', date: 'Dec 28, 2025', inspector: 'Priya Sharma, P.Eng', result: 'fail' as const, payout: 443 },
  { project: 'Kits Infill Duplex', stage: 'Stage 3 — Framing (Re-inspect)', date: 'Jan 3, 2026', inspector: 'Priya Sharma, P.Eng', result: 'pass' as const, payout: 295 },
  { project: 'North Van Townhomes', stage: 'Stage 4 — Mechanical', date: 'Dec 12, 2025', inspector: 'Dr. Sarah Chen', result: 'pass' as const, payout: 443 },
]

export default function BuilderProfilePage() {
  const router = useRouter()
  const { user, login } = useAuth()
  const [editing, setEditing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null)
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name:     user?.name     ?? 'Wyatt Davis',
    company:  user?.company  ?? 'Coastal Developments Inc.',
    position: user?.position ?? 'Owner / Project Manager',
    email:    user?.email    ?? 'wyatt@coastaldevelopments.ca',
    phone:    user?.phone    ?? '604-555-0142',
    location: 'Vancouver, BC',
  })

  useEffect(() => {
    if (!user) return
    setForm(current => ({
      ...current,
      name: user.name ?? current.name,
      company: user.company ?? current.company,
      position: user.position ?? current.position,
      email: user.email ?? current.email,
      phone: user.phone ?? current.phone,
    }))
  }, [user])

  useEffect(() => {
    if (!user?.supabaseId) return
    let cancelled = false

    supabase
      .from('builder_onboarding_status')
      .select('company_name, contact_phone')
      .eq('user_id', user.supabaseId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return
        setForm(current => ({
          ...current,
          company: typeof data.company_name === 'string' && data.company_name.trim() ? data.company_name : current.company,
          phone: typeof data.contact_phone === 'string' && data.contact_phone.trim() ? data.contact_phone : current.phone,
        }))
      })

    return () => {
      cancelled = true
    }
  }, [user?.supabaseId])

  // Real Supabase accounts start with no history — mock data is demo-only
  const completedStages = user?.supabaseId ? [] : COMPLETED_STAGES
  const activeProjects  = user?.supabaseId ? [] : MOCK_PROJECTS

  const totalSpend = completedStages.reduce((s, r) => s + r.payout, 0)
  const passRate = completedStages.length > 0
    ? Math.round((completedStages.filter(r => r.result === 'pass').length / completedStages.length) * 100)
    : 0

  const handleLogoUpload = async (files: FileList | null) => {
    if (!user || !files || files.length === 0) return

    const file = files[0]
    const validTypes = ['image/png', 'image/jpeg']
    if (!validTypes.includes(file.type)) {
      setLogoError('Please upload a PNG or JPG logo.')
      return
    }

    const { data: authData, error: authError } = await supabase.auth.getUser()
    const authUid = authData.user?.id ?? null

    if (authError || !authData.user || !authUid) {
      setLogoError('Upload failed: we could not confirm your authenticated builder session. Please sign in again and retry.')
      return
    }

    const extension = file.type === 'image/png' ? 'png' : 'jpg'
    const path = `${BUILDER_LOGO_PREFIX}/${authUid}/logo.${extension}`

    setUploadingLogo(true)
    setLogoError(null)

    console.info('[BuilderLogoUpload]', {
      bucket: BUILDER_ASSETS_BUCKET,
      path,
      authUid,
      policy: BUILDER_LOGO_POLICY,
    })

    try {
      const { error: uploadError } = await supabase.storage
        .from(BUILDER_ASSETS_BUCKET)
        .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type })

      if (uploadError) {
        const message = uploadError.message.toLowerCase()
        if (message.includes('bucket')) {
          setLogoError(`Upload failed: storage bucket "${BUILDER_ASSETS_BUCKET}" does not exist in the active Supabase environment yet.`)
        } else {
          setLogoError(`Upload failed: ${uploadError.message}`)
        }
        return
      }

      const { data: publicData } = supabase.storage.from(BUILDER_ASSETS_BUCKET).getPublicUrl(path)
      const logoUrl = publicData.publicUrl

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: authUid, logo_url: logoUrl }, { onConflict: 'id' })

      if (profileError) {
        setLogoError(`Could not save logo URL: ${profileError.message}`)
        return
      }

      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (!authError && authData.user) {
        const metadata = (authData.user.user_metadata ?? {}) as Record<string, unknown>
        await supabase.auth.updateUser({
          data: {
            ...metadata,
            logo_url: logoUrl,
          },
        })
      }

      login({
        ...user,
        logoUrl,
      })
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : 'Could not upload company logo.')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleProfileSave = async () => {
    if (!user) return

    setProfileSaveError(null)
    setProfileSaveSuccess(null)
    setSavingProfile(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      const authUid = authData.user?.id ?? null

      if (authError || !authData.user || !authUid) {
        setProfileSaveError('Could not verify your authenticated builder session. Please sign in again and retry.')
        return
      }

      const nextName = form.name.trim()
      const nextCompany = form.company.trim()
      const nextPosition = form.position.trim()
      const nextPhone = form.phone.trim()

      const metadata = (authData.user.user_metadata ?? {}) as Record<string, unknown>
      const { data: updatedAuth, error: updateError } = await supabase.auth.updateUser({
        data: {
          ...metadata,
          name: nextName,
          company: nextCompany,
          position: nextPosition,
          phone: nextPhone,
        },
      })

      if (updateError || !updatedAuth.user) {
        setProfileSaveError(updateError?.message ?? 'Could not save your profile changes.')
        return
      }

      const now = new Date().toISOString()
      const { error: builderProfileError } = await supabase
        .from('builder_onboarding_status')
        .upsert({
          user_id: authUid,
          company_name: nextCompany || null,
          contact_phone: nextPhone || null,
          contact_email: form.email.trim() || null,
          contact_name: nextName || null,
          updated_at: now,
        }, { onConflict: 'user_id' })

      if (builderProfileError) {
        setProfileSaveError(builderProfileError.message)
        return
      }

      const updatedMetadata = (updatedAuth.user.user_metadata ?? {}) as Record<string, unknown>
      login({
        ...user,
        name: typeof updatedMetadata.name === 'string' ? updatedMetadata.name : nextName,
        company: typeof updatedMetadata.company === 'string' ? updatedMetadata.company : nextCompany,
        position: typeof updatedMetadata.position === 'string' ? updatedMetadata.position : nextPosition,
        phone: typeof updatedMetadata.phone === 'string' ? updatedMetadata.phone : nextPhone,
      })

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
      <Navbar role="builder" dark />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <Link href="/builder" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink mb-5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>

        {/* ── Profile header card ── */}
        <div className="card-dark rounded-2xl p-6 mb-5 inset-top">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 bg-flame/15 border-2 border-flame/30 rounded-2xl flex items-center justify-center font-black text-flame text-xl shrink-0 overflow-hidden">
              {user?.logoUrl ? (
                <Image src={user.logoUrl} alt={`${form.company} logo`} width={64} height={64} className="h-full w-full object-cover" unoptimized />
              ) : (
                user?.avatar ?? 'WD'
              )}
            </div>

            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-2">
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-surface border border-white/10 focus:border-flame text-ink font-bold text-base rounded-xl px-3 py-2 focus:outline-none" />
                  <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    className="w-full bg-surface border border-white/10 focus:border-flame text-muted text-sm rounded-xl px-3 py-2 focus:outline-none" />
                  <input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                    className="w-full bg-surface border border-white/10 focus:border-flame text-muted text-sm rounded-xl px-3 py-2 focus:outline-none" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h1 className="font-black text-ink text-xl">{form.name}</h1>
                    <BadgeCheck className="w-5 h-5 text-electric" />
                  </div>
                  <div className="text-sm font-semibold text-muted mt-0.5">{form.company}</div>
                  <div className="text-xs text-subtle mt-0.5">{form.position}</div>
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
                  className="w-8 h-8 bg-raised border border-white/10 rounded-xl flex items-center justify-center text-muted hover:text-ink transition-all">
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

          {(profileSaveError || profileSaveSuccess) && (
            <div className={`mt-4 rounded-xl border px-3 py-2 text-xs ${
              profileSaveError
                ? 'border-fail-red/20 bg-fail-red/10 text-fail-red'
                : 'border-success-green/20 bg-success-green/10 text-success-green'
            }`}>
              {profileSaveError ?? profileSaveSuccess}
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <label className="inline-flex items-center gap-2 bg-raised border border-white/10 hover:border-white/20 text-muted hover:text-ink text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer">
              <UploadCloud className="w-3.5 h-3.5" />
              {uploadingLogo ? 'Uploading…' : 'Upload Company Logo'}
              <input
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                className="hidden"
                onChange={e => void handleLogoUpload(e.target.files)}
                disabled={uploadingLogo}
              />
            </label>
            {logoError && <span className="text-xs text-fail-red">{logoError}</span>}
          </div>

          {/* Contact details */}
          <div className="grid sm:grid-cols-2 gap-3 mt-5 pt-5 border-t border-white/5">
            {[
              { icon: Mail,    key: 'email',    label: 'Email',    type: 'email' },
              { icon: Phone,   key: 'phone',    label: 'Mobile',   type: 'tel' },
              { icon: MapPin,  key: 'location', label: 'Location', type: 'text' },
            ].map(({ icon: Icon, key, label, type }) => (
              <div key={key} className="flex items-center gap-3 bg-surface border border-white/5 rounded-xl px-3 py-2.5">
                <Icon className="w-4 h-4 text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-subtle uppercase tracking-wide">{label}</div>
                  {editing ? (
                    <input
                      type={type}
                      value={form[key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full bg-transparent text-xs font-semibold text-ink focus:outline-none border-b border-white/10 focus:border-flame"
                    />
                  ) : (
                    <div className="text-xs font-semibold text-ink truncate">{form[key as keyof typeof form]}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { icon: Building2,  label: 'Active Projects', value: activeProjects.length,  color: 'text-ink' },
            { icon: CheckCircle2, label: 'Pass Rate',     value: `${passRate}%`,         color: 'text-success-green' },
            { icon: DollarSign, label: 'Total Spent',     value: `$${totalSpend.toLocaleString()}`, color: 'text-ink' },
            { icon: Star,       label: 'Avg Inspector',   value: '4.8 ★',               color: 'text-warning-amber' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="card-dark rounded-2xl p-4 inset-top text-center">
              <Icon className="w-4 h-4 text-muted mx-auto mb-1.5" />
              <div className={`text-lg font-black ${color}`}>{value}</div>
              <div className="text-[10px] text-subtle mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Active projects ── */}
        <div className="card-dark rounded-2xl overflow-hidden mb-5 inset-top">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="label-mono">Active Projects</div>
            <Link href="/builder" className="text-xs text-flame hover:underline font-semibold">View All</Link>
          </div>
          <div className="divide-y divide-white/5">
            {activeProjects.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-muted">
                No active projects yet. <Link href="/builder" className="text-flame hover:underline">Go to dashboard to post your first inspection →</Link>
              </div>
            ) : activeProjects.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-8 h-8 bg-flame/10 border border-flame/20 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-flame" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-sm truncate">{p.name}</div>
                  <div className="text-xs text-muted truncate">{p.address} · Stage {p.currentStage}/5</div>
                </div>
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  p.status === 'in_progress' ? 'bg-electric/15 text-electric' :
                  p.status === 'pass'     ? 'bg-success-green/15 text-success-green' :
                  'bg-white/5 text-muted'
                }`}>{p.status.replace('_', ' ')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Inspection history ── */}
        <div className="card-dark rounded-2xl overflow-hidden inset-top">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="label-mono">Inspection History</div>
            <Link href="/vault" className="text-xs text-flame hover:underline font-semibold">Open Vault</Link>
          </div>
          <div className="divide-y divide-white/5">
            {completedStages.length === 0 && (
              <div className="px-5 py-8 text-center text-xs text-muted">No completed inspections yet.</div>
            )}
            {completedStages.map((r, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  r.result === 'pass' ? 'bg-success-green/15 border border-success-green/25' : 'bg-fail-red/15 border border-fail-red/25'
                }`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${r.result === 'pass' ? 'text-success-green' : 'text-fail-red'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-sm">{r.project}</div>
                  <div className="text-xs text-muted mt-0.5">{r.stage}</div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-subtle">
                    <Clock className="w-3 h-3" /> {r.date}
                    <span>·</span>
                    <Shield className="w-3 h-3" /> {r.inspector}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-[10px] font-bold px-2 py-0.5 rounded-md mb-1 ${
                    r.result === 'pass' ? 'bg-success-green/15 text-success-green' : 'bg-fail-red/15 text-fail-red'
                  }`}>{r.result.toUpperCase()}</div>
                  <div className="text-xs font-mono text-muted">${r.payout}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
