'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  HardHat, ArrowRight, ChevronLeft, Eye, EyeOff,
  Building2, CheckCircle2, Zap, Shield,
} from 'lucide-react'
import { BrandWordmark } from '@/components/shared/Navbar'
import { useAuth, DEMO_USERS, type UserRole, type AuthUser } from '@/lib/auth'
import { signInWithSupabase } from '@/lib/auth'
import { setInspectorOnboardingStatus } from '@/lib/persistence/inspectorOnboarding'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

function getInspectorDestination(options: {
  onboardingStatus?: AuthUser['onboardingStatus']
  hasEligibilityProfile: boolean
  fallback: string
  verified?: boolean
  testOverride?: boolean
}) {
  if (options.onboardingStatus === 'approved' || options.verified) return options.fallback
  // Inspectors who have submitted but aren't yet approved should see the
  // waiting/status screen, not the signup form again.
  if (
    options.onboardingStatus === 'submitted' ||
    options.onboardingStatus === 'under_review' ||
    options.onboardingStatus === 'needs_info' ||
    options.onboardingStatus === 'rejected' ||
    options.onboardingStatus === 'suspended'
  ) return '/inspector/onboarding'
  // draft / undefined — still needs to complete onboarding
  return '/inspector/signup'
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'builder' || value === 'inspector' || value === 'auditor' || value === 'admin'
}

function getRoleSafeNextPath(role: UserRole, path: string | null): string | null {
  if (!path) return null

  if (role === 'inspector') {
    if (path.startsWith('/inspector/completion/')) return null
    return path
  }

  if (role === 'builder' && (path.startsWith('/inspector') || path.startsWith('/live-board'))) {
    return null
  }

  return path
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

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  builder: {
    label:   'Builder / Developer',
    icon:    Building2,
    color:   'text-flame',
    ring:    'focus:border-flame',
    btn:     'bg-flame hover:bg-flame-light text-white',
    dashHref: '/builder',
    fields:  ['name', 'company', 'position', 'email', 'phone', 'password'] as const,
  },
  inspector: {
    label:   'Certified Professional',
    icon:    HardHat,
    color:   'text-electric',
    ring:    'focus:border-electric',
    btn:     'bg-electric hover:opacity-90 text-surface',
    dashHref: '/inspector',
    fields:  ['name', 'license', 'designation', 'email', 'phone', 'password'] as const,
  },
  auditor: {
    label:   'City Auditor',
    icon:    Eye,
    color:   'text-muted',
    ring:    'focus:border-white/30',
    btn:     'bg-white/10 hover:bg-white/15 border border-white/15 text-ink',
    dashHref: '/auditor',
    fields:  ['name', 'title', 'jurisdiction', 'email', 'phone', 'password'] as const,
  },
  admin: {
    label:   'Vero Admin',
    icon:    Shield,
    color:   'text-flame',
    ring:    'focus:border-flame',
    btn:     'bg-flame hover:bg-flame-light text-white',
    dashHref: '/admin',
    fields:  ['name', 'email', 'password'] as const,
  },
}

const DESIGNATIONS = [
  'P.Eng — Structural', 'P.Eng — Geotechnical', 'P.Eng — Mechanical',
  'P.Eng — Electrical', 'Architect — AIBC', 'P.Geo — Geoscience',
]
const JURISDICTIONS = [
  'City of Vancouver', 'City of Burnaby', 'City of Surrey',
  'City of Richmond', 'District of North Vancouver', 'City of Coquitlam',
]
const POSITIONS = [
  'Owner / Developer', 'Project Manager', 'Site Superintendent',
  'General Contractor', 'Construction Manager', 'Owner\'s Representative',
]

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function SignInInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { login }    = useAuth()

  const roleParam = (searchParams.get('role') as UserRole) ?? 'builder'
  const nextParam = searchParams.get('next')
  const initialRole: UserRole = (['builder','inspector','auditor','admin'] as UserRole[]).includes(roleParam) ? roleParam : 'builder'
  const [role, setRole] = useState<UserRole>(initialRole)
  // Admin accounts are never self-created — default to sign-in mode for admin.
  // Inspector accounts are created through /inspector/signup, not this form.
  const [isNew, setIsNew]   = useState(initialRole !== 'admin' && initialRole !== 'inspector')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const [form, setForm] = useState({
    name:        '',
    email:       '',
    phone:       '',
    password:    '',
    company:     '',
    position:    '',
    license:     '',
    designation: '',
    title:       '',
    jurisdiction:'',
  })

  const cfg = ROLE_CONFIG[role]
  const RoleIcon = cfg.icon
  const safeNextPath = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
    ? nextParam
    : null

  const fill = (u: AuthUser) => {
    setForm({
      name:         u.name,
      email:        u.email,
      phone:        u.phone,
      password:     'demo1234',
      company:      u.company      ?? '',
      position:     u.position     ?? '',
      license:      u.licenseNumber?? '',
      designation:  u.designation  ?? '',
      title:        u.title        ?? '',
      jurisdiction: u.jurisdiction ?? '',
    })
    setRole(u.role)
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email) { setError('Email is required.'); return }
    if (role === 'admin' && isNew) {
      setError('Admin accounts cannot be created publicly. Please sign in with an existing admin account.')
      return
    }
    setLoading(true)
    setError('')

    // Try Supabase auth first (sign-in mode)
    if (!isNew) {
      if (!form.password) { setError('Password is required.'); setLoading(false); return }

      const { user: sbUser, error: sbError } = await signInWithSupabase(form.email, form.password)
      if (sbUser && !sbError) {
        // Build AuthUser from Supabase session and set in context
        const metadata = (sbUser.user_metadata ?? {}) as Record<string, unknown>
        const name = (typeof metadata.name === 'string' && metadata.name) ? metadata.name : (sbUser.email?.split('@')[0] ?? 'User')
        let logoUrl: string | undefined
        let onboardingStatus: string | undefined
        let verified = false
        let profileName: string | undefined
        let profileFirm: string | undefined
        let profileRole: UserRole | undefined
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('logo_url, onboarding_status, verified, full_name, first_name, last_name, firm_name, role')
            .eq('id', sbUser.id)
            .maybeSingle()
          if (isUserRole(profileData?.role)) {
            profileRole = profileData.role
          }
          if (typeof profileData?.logo_url === 'string' && profileData.logo_url.trim()) {
            logoUrl = profileData.logo_url
          }
          if (typeof profileData?.onboarding_status === 'string' && profileData.onboarding_status.trim()) {
            onboardingStatus = profileData.onboarding_status
          }
          verified = profileData?.verified === true
          if (typeof profileData?.full_name === 'string' && profileData.full_name.trim()) {
            profileName = profileData.full_name
          } else {
            const first = typeof profileData?.first_name === 'string' ? profileData.first_name : ''
            const last = typeof profileData?.last_name === 'string' ? profileData.last_name : ''
            const joined = `${first} ${last}`.trim()
            if (joined) profileName = joined
          }
          if (typeof profileData?.firm_name === 'string' && profileData.firm_name.trim()) {
            profileFirm = profileData.firm_name
          }
        } catch { /* ignore */ }
        const metadataRole = isUserRole(metadata.role) ? metadata.role : undefined
        const resolvedRole: UserRole = profileRole ?? metadataRole ?? role
        const resolvedName = profileName ?? name
        const authUser: AuthUser = {
          id:           sbUser.id,
          supabaseId:   sbUser.id,
          name:         resolvedName,
          firstName:    resolvedName.split(' ')[0],
          role:         resolvedRole,
          email:        sbUser.email ?? form.email,
          phone:        (typeof metadata.phone === 'string' ? metadata.phone : undefined) ?? form.phone ?? '',
          avatar:       resolvedName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
          logoUrl:      logoUrl ?? (typeof metadata.logo_url === 'string' ? metadata.logo_url : undefined),
          company:      profileFirm ?? (typeof metadata.company === 'string' ? metadata.company : undefined),
          position:     typeof metadata.position === 'string' ? metadata.position : undefined,
          licenseNumber:(typeof metadata.licenseNumber === 'string' ? metadata.licenseNumber : undefined)
            ?? (typeof metadata.license_number === 'string' ? metadata.license_number : undefined),
          designation:  typeof metadata.designation === 'string' ? metadata.designation : undefined,
          disciplines:  Array.isArray(metadata.disciplines) ? metadata.disciplines.filter((entry): entry is string => typeof entry === 'string') as AuthUser['disciplines'] : [],
          regions:      Array.isArray(metadata.regions) ? metadata.regions.filter((entry): entry is string => typeof entry === 'string') as AuthUser['regions'] : [],
          credentialExpiryDate:
            (typeof metadata.credentialExpiryDate === 'string' ? metadata.credentialExpiryDate : undefined)
            ?? (typeof metadata.credential_expiry_date === 'string' ? metadata.credential_expiry_date : undefined)
            ?? (typeof metadata.credential_expires_at === 'string' ? metadata.credential_expires_at : undefined),
          onboardingStatus: onboardingStatus as AuthUser['onboardingStatus'],
        }
        login(authUser)
        const roleSafeNextPath = getRoleSafeNextPath(resolvedRole, safeNextPath)
        const destination = resolvedRole === 'inspector'
          ? getInspectorDestination({
              onboardingStatus: onboardingStatus as AuthUser['onboardingStatus'],
              hasEligibilityProfile: true,
              fallback: roleSafeNextPath ?? cfg.dashHref,
              verified,
            })
          : roleSafeNextPath ?? ROLE_CONFIG[resolvedRole].dashHref
        router.push(destination)
        router.refresh()
        setLoading(false)
        return
      }
      // Supabase is configured but credentials failed — surface the real error
      const errorMessage = sbError instanceof Error
        ? sbError.message
        : (sbError as { message?: string } | null)?.message
      setError(errorMessage ?? 'Sign in failed. Please check your email and password.')
      setLoading(false)
      return
    }

    // Demo / local login fallback (sign-up flow only)
    if (!form.name) { setError('Name and email are required.'); setLoading(false); return }
    if (isNew) {
      const duplicateError = await checkRegistrationAvailability({
        email: form.email,
        phone: form.phone,
      })
      if (duplicateError) {
        setError(duplicateError)
        setLoading(false)
        return
      }
    }

    if (role === 'builder' && isNew) {
      if (!form.password) { setError('Password is required.'); setLoading(false); return }

      const builderName = form.name.trim()
      const builderEmail = form.email.trim().toLowerCase()
      const builderCompany = form.company.trim()
      const { data, error } = await supabase.auth.signUp({
        email:    builderEmail,
        password: form.password,
        options: {
          data: {
            role:       'builder',
            name:       builderName || null,
            phone:      form.phone || null,
            company:    builderCompany || null,
            position:   form.position || null,
          },
        },
      })

      if (error || !data.user) {
        setError(error?.message ?? 'Signup failed. Please try again.')
        setLoading(false)
        return
      }

      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email:    builderEmail,
          password: form.password,
        })
        if (signInError) {
          setError(signInError.message)
          setLoading(false)
          return
        }
      }

      const resolvedName = builderName || data.user.email?.split('@')[0] || 'Builder'
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id:                data.user.id,
          email:             builderEmail,
          phone:             form.phone || null,
          role:              'builder',
          full_name:         resolvedName,
          firm_name:         builderCompany || null,
          onboarding_status: 'draft',
          verified:          false,
        })

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }

      const user: AuthUser = {
        id:               data.user.id,
        supabaseId:       data.user.id,
        name:             resolvedName,
        firstName:        resolvedName.split(' ')[0],
        role:             'builder',
        email:            data.user.email ?? builderEmail,
        phone:            form.phone,
        avatar:           resolvedName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
        company:          builderCompany || undefined,
        position:         form.position || undefined,
        onboardingStatus: 'draft',
      }
      login(user)
      router.push(getRoleSafeNextPath(user.role, safeNextPath) ?? ROLE_CONFIG.builder.dashHref)
      setLoading(false)
      return
    }

    await new Promise(r => setTimeout(r, 600))

    const demoUser = DEMO_USERS.find(d => d.email === form.email && d.role === role)
    const user: AuthUser = {
      id:           form.email.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name:         form.name,
      firstName:    form.name.split(' ')[0],
      role,
      email:        form.email,
      phone:        form.phone,
      avatar:       form.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      company:      form.company      || undefined,
      position:     form.position     || undefined,
      licenseNumber:form.license      || undefined,
      designation:  form.designation  || undefined,
      title:        form.title        || undefined,
      jurisdiction: form.jurisdiction || undefined,
      onboardingStatus: demoUser?.onboardingStatus,
    }
    login(user)
    if (user.role === 'inspector' && user.onboardingStatus === 'approved') {
      void setInspectorOnboardingStatus('approved', user.id, user.supabaseId)
    }
    const destination = user.role === 'inspector'
      ? getInspectorDestination({
          onboardingStatus: user.onboardingStatus,
          hasEligibilityProfile: true,
          fallback: getRoleSafeNextPath(user.role, safeNextPath) ?? cfg.dashHref,
        })
      : getRoleSafeNextPath(user.role, safeNextPath) ?? cfg.dashHref
    router.push(destination)
    setLoading(false)
  }

  const inputCls = `w-full bg-panel border border-white/10 ${cfg.ring} text-ink text-sm rounded-xl px-4 py-3 placeholder-subtle focus:outline-none transition-colors`
  const selectCls = `w-full bg-panel border border-white/10 ${cfg.ring} text-ink text-sm rounded-xl px-4 py-3 focus:outline-none transition-colors`

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Nav */}
      <div className="border-b border-white/5 px-4 sm:px-6 py-4 flex items-center gap-4 shrink-0">
        <BrandWordmark className="max-w-[130px]" height={32} priority theme="dark" />
        <Link href="/get-started" className="ml-auto flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </Link>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-md">

          {/* Role selector tabs */}
          <div className="flex bg-panel border border-white/8 rounded-xl p-1 mb-6">
            {(['builder', 'inspector', 'auditor', 'admin'] as UserRole[]).map(r => (
              <button key={r} onClick={() => { setRole(r); if (r === 'admin' || r === 'inspector') setIsNew(false) }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize ${
                  role === r ? 'bg-flame text-white' : 'text-muted hover:text-ink'
                }`}>{r === 'admin' ? '⚙ Admin' : r}</button>
            ))}
          </div>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                role === 'builder'  ? 'bg-flame/15 border-flame/25' :
                role === 'inspector'? 'bg-electric/15 border-electric/25' :
                'bg-white/10 border-white/15'
              }`}>
                <RoleIcon className={`w-4.5 h-4.5 ${cfg.color}`} />
              </div>
              <div>
                <div className="font-black text-ink text-lg leading-tight">
                  {isNew ? 'Create account' : 'Sign in'}
                </div>
                <div className="text-xs text-muted">{cfg.label}</div>
                {role !== 'admin' && (
                  <button
                    type="button"
                    onClick={() => role === 'inspector' ? router.push('/inspector/signup') : setIsNew(n => !n)}
                    className="mt-2 text-left text-sm font-semibold text-ink underline decoration-flame decoration-2 underline-offset-4 hover:text-flame transition-colors"
                  >
                    {role === 'inspector' ? 'New inspector? Apply to join' : isNew ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Demo quick-fills */}
          {role !== 'admin' && (
            <div className="mb-5">
              <div className="label-mono mb-2">Demo accounts</div>
              <div className="flex gap-2 flex-wrap">
                {DEMO_USERS.filter(u => u.role === role).map(u => (
                  <button key={u.id} onClick={() => fill(u)}
                    className="flex items-center gap-2 bg-panel border border-white/10 hover:border-flame/30 rounded-xl px-3 py-2 text-left transition-all group">
                    <div className="w-7 h-7 bg-flame/15 rounded-lg flex items-center justify-center text-xs font-black text-flame">
                      {u.avatar}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink group-hover:text-flame transition-colors">{u.name}</div>
                      <div className="text-[10px] text-muted">{u.company ?? u.designation ?? u.jurisdiction}</div>
                    </div>
                    <Zap className="w-3 h-3 text-warning-amber ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-subtle mt-1.5">Click a demo account to pre-fill the form</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Identity fields — only shown when creating a new account */}
            {isNew && (
              <>
                <div>
                  <label className="label-mono mb-1.5 block">Full Name</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)}
                    placeholder="e.g. Wyatt Davis" required className={inputCls} />
                </div>

                {role === 'builder' && (
                  <>
                    <div>
                      <label className="label-mono mb-1.5 block">Company Name</label>
                      <input value={form.company} onChange={e => set('company', e.target.value)}
                        placeholder="e.g. Coastal Developments Inc." className={inputCls} />
                    </div>
                    <div>
                      <label className="label-mono mb-1.5 block">Your Role</label>
                      <select value={form.position} onChange={e => set('position', e.target.value)} className={selectCls}>
                        <option value="">Select position…</option>
                        {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {role === 'inspector' && (
                  <>
                    <div>
                      <label className="label-mono mb-1.5 block">EGBC / AIBC License #</label>
                      <input value={form.license} onChange={e => set('license', e.target.value)}
                        placeholder="e.g. BC-ENG-29847" className={inputCls} />
                    </div>
                    <div>
                      <label className="label-mono mb-1.5 block">Designation</label>
                      <select value={form.designation} onChange={e => set('designation', e.target.value)} className={selectCls}>
                        <option value="">Select designation…</option>
                        {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {role === 'auditor' && (
                  <>
                    <div>
                      <label className="label-mono mb-1.5 block">Job Title</label>
                      <input value={form.title} onChange={e => set('title', e.target.value)}
                        placeholder="e.g. Senior Building Inspector" className={inputCls} />
                    </div>
                    <div>
                      <label className="label-mono mb-1.5 block">Jurisdiction</label>
                      <select value={form.jurisdiction} onChange={e => set('jurisdiction', e.target.value)} className={selectCls}>
                        <option value="">Select jurisdiction…</option>
                        {JURISDICTIONS.map(j => <option key={j} value={j}>{j}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Email + Phone */}
            <div>
              <label className="label-mono mb-1.5 block">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="you@example.com" required className={inputCls} />
            </div>
            {isNew && (
              <div>
                <label className="label-mono mb-1.5 block">Mobile Number</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="604-555-0000" className={inputCls} />
              </div>
            )}

            {/* Password */}
            <div>
              <label className="label-mono mb-1.5 block">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'}
                  value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="Create a password" required className={`${inputCls} pr-10`} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-fail-red/10 border border-fail-red/20 text-fail-red text-xs rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all mt-2 ${cfg.btn} disabled:opacity-50`}>
              {loading ? (
                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {isNew ? 'Create Account & Enter' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          <p className="text-center text-[10px] text-subtle mt-6 leading-relaxed">
            By creating an account you agree to Vero&apos;s Terms of Service and Privacy Policy.
            Inspector accounts are verified against EGBC / AIBC registries before activation.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface flex items-center justify-center"><div className="w-8 h-8 border-2 border-flame/30 border-t-flame rounded-full animate-spin" /></div>}>
      <SignInInner />
    </Suspense>
  )
}
