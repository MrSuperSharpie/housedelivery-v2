'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronRight, PlayCircle, Clock, Activity, Filter, Briefcase } from 'lucide-react'
import { Navbar } from '@/components/shared/Navbar'
import { JobCard } from '@/components/inspector/JobCard'
import { checkInspectorEligibility } from '@/lib/eligibility'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useStore } from '@/lib/store'
import { getInspectorOnboardingStatusAsync } from '@/lib/persistence/inspectorOnboarding'
import { selectInspectorEligibility } from '@/lib/supabase/compliance'
import { useTheme } from '@/lib/theme'
import { isInspectorTestModeEnabled } from '@/lib/inspectorTestMode'
import type { ClaimCommitment, JobTimeSlot, Region, InspectorDiscipline, InspectorEligibilityProfile, HoldRecord } from '@/lib/types'
import { listHoldsForJob } from '@/lib/supabase/holds'

const REGIONS: { value: Region | 'all'; label: string }[] = [
  { value: 'all',       label: 'All Regions' },
  { value: 'vancouver', label: 'Vancouver' },
  { value: 'burnaby',   label: 'Burnaby' },
  { value: 'surrey',    label: 'Surrey' },
  { value: 'coquitlam', label: 'Coquitlam' },
  { value: 'richmond',  label: 'Richmond' },
]

const DISCS: { value: InspectorDiscipline | 'all'; label: string }[] = [
  { value: 'all',           label: 'All Disciplines' },
  { value: 'structural',    label: 'Structural' },
  { value: 'geotech',       label: 'Geotech' },
  { value: 'mechanical',    label: 'Mechanical' },
  { value: 'electrical',    label: 'Electrical' },
  { value: 'plumbing',      label: 'Plumbing' },
  { value: 'architectural', label: 'Architectural' },
]

export default function InspectorDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const store = useStore()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const inspectorTestOverride = isInspectorTestModeEnabled(user)

  const [region, setRegion]         = useState<Region | 'all'>('all')
  const [discipline, setDiscipline] = useState<InspectorDiscipline | 'all'>('all')
  const [boardView, setBoardView] = useState<'all' | 'eligible'>('all')
  const [search, setSearch]         = useState('')
  const [onboardingStatus, setOnboardingStatus] = useState<string | null>(null)
  const [eligibilityProfile, setEligibilityProfile] = useState<InspectorEligibilityProfile | null>(null)
  const [eligibilityLoaded, setEligibilityLoaded] = useState(false)
  const [acceptedHoldsForInspector, setAcceptedHoldsForInspector] = useState<HoldRecord[]>([])

  useEffect(() => {
    if (!user) { router.replace('/sign-in?role=inspector'); return }
    if (user.role !== 'inspector') { router.replace('/'); return }
    let active = true
    getInspectorOnboardingStatusAsync(user.id, user.supabaseId).then(status => {
      if (active) setOnboardingStatus(status)
    })

    if (user.supabaseId) {
      selectInspectorEligibility(user.supabaseId)
        .then(profile => {
          if (!active) return
          setEligibilityProfile(profile)
          setEligibilityLoaded(true)
        })
        .catch(() => {
          if (!active) return
          setEligibilityProfile(null)
          setEligibilityLoaded(true)
        })
    } else {
      queueMicrotask(() => {
        if (!active) return
        setEligibilityLoaded(true)
      })
    }

    return () => {
      active = false
    }
  }, [user, router])

  const myAssignments = store.assignments.filter(a =>
    a.inspectorId === user?.id || a.inspectorId === user?.supabaseId
  )

  // Poll for holds that builders have accepted — these need a re-verification action.
  useEffect(() => {
    const jobIds = store.assignments
      .filter(a => a.inspectorId === user?.id || a.inspectorId === user?.supabaseId)
      .map(a => a.jobId)
    if (jobIds.length === 0) {
      queueMicrotask(() => setAcceptedHoldsForInspector([]))
      return
    }
    let active = true
    Promise.all(jobIds.map(id => listHoldsForJob(id)))
      .then(results => {
        if (!active) return
        setAcceptedHoldsForInspector(results.flat().filter(h => h.status === 'hold_active'))
      })
      .catch(() => {})
    return () => { active = false }
  }, [store.assignments, user?.id, user?.supabaseId])

  const openJobs = store.getOpenJobs()

  const filteredJobs = useMemo(() => {
    return openJobs.filter(job => {
      const matchesRegion = region === 'all' || job.region === region
      const matchesDisc   = discipline === 'all' || job.requiredDiscipline === discipline
      const matchesSearch = !search ||
        job.projectName.toLowerCase().includes(search.toLowerCase()) ||
        job.address.toLowerCase().includes(search.toLowerCase())

      const isAlreadyClaimedByMe = myAssignments.some(a => a.jobId === job.id)
      return matchesRegion && matchesDisc && matchesSearch && !isAlreadyClaimedByMe
    })
  }, [openJobs, region, discipline, search, myAssignments])

  const inspectorEligibility = useMemo(() => {
    if (user?.supabaseId) {
      const result = {
        status: eligibilityProfile?.status ?? onboardingStatus,
        disciplines: eligibilityProfile?.disciplines ?? [],
        regions: eligibilityProfile?.regions ?? [],
        credentialExpiryDate: eligibilityProfile?.credentialExpiresAt,
      }
      console.log('[LiveBoard] SUPABASE branch — user.supabaseId:', user.supabaseId)
      console.log('[LiveBoard] eligibilityProfile raw:', JSON.stringify(eligibilityProfile))
      console.log('[LiveBoard] resolved disciplines:', JSON.stringify(result.disciplines))
      console.log('[LiveBoard] resolved regions:', JSON.stringify(result.regions))
      console.log('[LiveBoard] resolved status:', result.status)
      return result
    }

    const result = {
      status: user?.onboardingStatus ?? onboardingStatus,
      disciplines: user?.disciplines ?? [],
      regions: user?.regions ?? [],
      credentialExpiryDate: user?.credentialExpiryDate,
    }
    console.log('[LiveBoard] DEMO branch — no supabaseId')
    console.log('[LiveBoard] user.disciplines:', JSON.stringify(result.disciplines))
    console.log('[LiveBoard] user.regions:', JSON.stringify(result.regions))
    console.log('[LiveBoard] resolved status:', result.status)
    return result
  }, [eligibilityProfile, onboardingStatus, user])

  const classifiedJobs = useMemo(() => {
    if (inspectorTestOverride) {
      return filteredJobs.map(job => ({
        job,
        eligibility: {
          eligible: true,
          reasons: [],
        },
        primaryReason: null,
      }))
    }

    return filteredJobs.map(job => {
      if (job.projectName?.includes('TEST AAA') || job.requiredDiscipline === 'mechanical') {
        console.log('[LiveBoard] checkInspectorEligibility input for job:', job.projectName)
        console.log('  requiredDiscipline:', job.requiredDiscipline)
        console.log('  jobRegion:', job.region)
        console.log('  inspectorDisciplines:', JSON.stringify(inspectorEligibility.disciplines))
        console.log('  inspectorRegions:', JSON.stringify(inspectorEligibility.regions))
        console.log('  status:', inspectorEligibility.status)
      }
      const eligibility = checkInspectorEligibility(
        job.requiredDiscipline,
        job.region,
        inspectorEligibility.disciplines,
        inspectorEligibility.regions,
        inspectorEligibility.credentialExpiryDate,
        inspectorEligibility.status as InspectorEligibilityProfile['status'] | null,
      )
      if (job.projectName?.includes('TEST AAA') || job.requiredDiscipline === 'mechanical') {
        console.log('  eligibility result:', JSON.stringify(eligibility))
      }

      return {
        job,
        eligibility,
        primaryReason: eligibility.reasons[0] ?? null,
      }
    })
  }, [filteredJobs, inspectorEligibility, inspectorTestOverride])

  const eligibleJobs = classifiedJobs.filter(entry => entry.eligibility.eligible)
  const ineligibleJobs = classifiedJobs.filter(entry => !entry.eligibility.eligible)
  const showOnboardingBanner = !inspectorTestOverride && inspectorEligibility.status !== 'approved'

  const handleClaim = async (
    jobId: string,
    slot: JobTimeSlot = { date: '', startTime: '', endTime: '', flexible: true },
    claimCommitment?: ClaimCommitment,
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!user) return { ok: false, error: 'Inspector is not signed in.' }
    const claimInput = {
      jobId,
      builderId: '',
      inspectorId: user.supabaseId ?? user.id,
      inspectorName: user.name,
      inspectorLicense: user.licenseNumber || '',
      inspectorDisciplines: user.disciplines ?? [],
      inspectorRegions: user.regions ?? [],
      claimedSlot: slot,
      claimCommitment,
      credentialExpiryDate: user.credentialExpiryDate,
    }
    const timeoutId = window.setTimeout(() => {
      console.log('CLAIM TIMEOUT')
    }, 5000)
    const result = await store.claimJob(claimInput)
    window.clearTimeout(timeoutId)

    if (result.ok) {
      console.log('ROUTING to assignment page', result.value.id)
      router.push(`/inspector/assignment/${result.value.id}`)
    }

    return result.ok ? { ok: true } : { ok: false, error: result.error }
  }

  if (!user || onboardingStatus === null || !eligibilityLoaded) return null

  return (
    <div className={`app-theme-scope min-h-screen ${isDark ? 'bg-[#0f172a]' : 'bg-slate-50'}`}>
      <Navbar role="inspector" dark />
      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Builder-Accepted Hold Notifications ── */}
        {acceptedHoldsForInspector.map(hold => (
          <div
            key={hold.id}
            className={`mb-5 rounded-2xl border overflow-hidden ${
              isDark
                ? 'border-amber-500/30 bg-amber-500/10'
                : 'border-amber-400/40 bg-amber-50'
            }`}
          >
            <div className="px-5 py-4 flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-ink text-sm mb-0.5">Builder Accepted Hold Terms</div>
                <div className="text-xs text-muted">
                  Site is ready for re-verification. Return to site and resolve the hold.
                </div>
                <div className="mt-2 text-[11px] text-muted">
                  Fee reserved: <span className="font-bold text-amber-400">${hold.holdCapAmount.toFixed(2)}</span>
                  {hold.builderAcceptedAt && (
                    <>{' · '}Accepted {new Date(hold.builderAcceptedAt).toLocaleTimeString('en-CA', { timeZone: 'America/Vancouver', hour: '2-digit', minute: '2-digit' })}</>
                  )}
                </div>
              </div>
              <div className={`rounded-lg px-2 py-1 shrink-0 ${isDark ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-amber-100 border border-amber-300'}`}>
                <div className="text-[10px] text-amber-500 font-bold">Re-verify Now</div>
              </div>
            </div>
          </div>
        ))}

        {/* Active Worklist */}
        {myAssignments.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <PlayCircle className="w-4 h-4 text-flame" />
              <h2 className="text-xs font-bold text-electric tracking-widest uppercase">Your Active Worklist</h2>
            </div>
            <div className="space-y-3">
              {myAssignments.map(assignment => {
                const job = store.jobs.find(j => j.id === assignment.jobId)
                return (
                  <div
                    key={assignment.id}
                    className={`flex items-center gap-4 rounded-2xl border p-4 shadow-sm transition-all hover:border-electric/30 ${
                      isDark
                        ? 'border-slate-700 bg-slate-800 hover:bg-slate-800/90'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-12 h-12 bg-flame rounded-xl flex items-center justify-center shrink-0">
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-ink text-base truncate">{assignment.projectName || job?.projectName || 'Assigned Project'}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                          isDark
                            ? 'border-slate-600 bg-slate-700/50 text-slate-300'
                            : 'border-slate-300 bg-slate-200 text-slate-700'
                        }`}>
                          {assignment.status}
                        </span>
                      </div>
                      <div className="text-xs text-muted truncate">{job?.address || 'Vancouver, BC'}</div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1 text-[10px] text-subtle">
                          <Clock className="w-3 h-3" /> {assignment.claimedSlot?.flexible ? 'Flexible timing' : assignment.claimedSlot?.date || 'Upcoming'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/inspector/assignment/${assignment.id}`)}
                      className="bg-flame text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-flame-light transition-all shrink-0 glow-flame-sm"
                    >
                      Open Assignment <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {showOnboardingBanner && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-100 p-4 text-amber-900">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-black">Waiting for Vero approval</div>
                <p className="mt-1 text-xs">
                  {inspectorEligibility.status !== 'approved'
                    ? 'Your application is under review. The Live Board and uploads stay locked until your profile is approved.'
                    : 'Your account is approved, but your approved role lanes do not include marketplace claim authority yet.'}
                </p>
              </div>
              <button
                onClick={() => router.push('/inspector/onboarding')}
                className="shrink-0 rounded-xl bg-amber-900 px-4 py-2.5 text-xs font-black text-white hover:opacity-90"
              >
                View Approval Status
              </button>
            </div>
          </div>
        )}

        {/* Dev-only fast-track: seed a sealed report + open the PDF. Hidden in
            production builds via NEXT_PUBLIC_ build-time swap. */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
            <span className="font-bold uppercase tracking-widest">Dev</span>
            <span className="flex-1">Skip the 15-stage flow — seed a sealed report and open the PDF.</span>
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch('/api/dev/seed-certified-project', { method: 'POST' })
                  const json = await res.json()
                  if (!res.ok) {
                    console.error('[dev-fast-track] seed failed:', json)
                    alert(`Seed failed: ${json.error ?? res.status}${json.detail ? `\n${json.detail}` : ''}`)
                    return
                  }
                  window.open(json.pdfUrl, '_blank', 'noopener,noreferrer')
                } catch (err) {
                  console.error('[dev-fast-track] network error:', err)
                  alert('Seed failed: network error')
                }
              }}
              className="rounded-xl bg-flame px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white hover:bg-flame-light"
            >
              Dev: Generate Test Certificate
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-ink">Open Requests</h1>
            <p className="text-sm text-muted mt-1">
              {eligibleJobs.length} eligible of {classifiedJobs.length} live requests matching your filters
            </p>
          </div>
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm ${
            isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
          }`}>
            <div className="text-right">
              <div className="text-[10px] font-bold text-subtle uppercase tracking-widest">Available Earnings</div>
              <div className={`text-xl font-black ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>{formatCurrency(1329)}</div>
            </div>
          </div>
        </div>

        <div className={`mb-6 rounded-2xl border p-4 shadow-sm ${
          isDark ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50'
        }`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className={`text-[10px] font-black uppercase tracking-widest ${
                isDark ? 'text-emerald-300' : 'text-emerald-800'
              }`}>
                Vero Permit Reliability
              </div>
              <h2 className="mt-1 text-base font-black text-ink">Earn more opportunity through dependable attendance.</h2>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-muted">
                Confirm before site, show up inside the committed window, and document completed professional work. Pass, Fail, and Hold outcomes are treated equally when the inspection is properly performed.
              </p>
            </div>
            <div className={`grid min-w-[16rem] grid-cols-3 gap-2 rounded-xl border p-2 ${
              isDark ? 'border-emerald-500/20 bg-slate-900/40' : 'border-emerald-200 bg-white/70'
            }`}>
              {[
                { label: 'Access', value: 'Priority' },
                { label: 'Payout', value: 'Faster' },
                { label: 'Reserve', value: 'Lower' },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-subtle">{item.label}</div>
                  <div className={`text-xs font-black ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={`mb-6 rounded-2xl border p-4 shadow-sm ${
          isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
        }`}>
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
            <input
              type="text"
              placeholder="Search by project name or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full rounded-xl border py-3 pl-11 pr-4 text-sm text-ink placeholder-subtle transition-all focus:border-flame focus:outline-none ${
                isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'
              }`}
            />
          </div>

          {/* Region pills */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-3 h-3 text-subtle" />
              <span className="text-[10px] font-bold text-subtle uppercase tracking-widest">Region</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map(r => (
                <button key={r.value} onClick={() => setRegion(r.value as Region | 'all')}
                  className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    region === r.value
                      ? 'bg-flame text-white'
                      : isDark
                        ? 'border border-slate-600 bg-slate-900 text-muted hover:bg-slate-800 hover:text-ink'
                        : 'border border-slate-300 bg-white text-muted hover:bg-slate-100 hover:text-ink'
                  }`}>{r.label}</button>
              ))}
            </div>
          </div>

          {/* Discipline pills */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-3 h-3 text-subtle" />
              <span className="text-[10px] font-bold text-subtle uppercase tracking-widest">Discipline</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DISCS.map(d => (
                <button key={d.value} onClick={() => setDiscipline(d.value as InspectorDiscipline | 'all')}
                  className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    discipline === d.value
                      ? 'bg-electric text-white'
                      : isDark
                        ? 'border border-slate-600 bg-slate-900 text-muted hover:bg-slate-800 hover:text-ink'
                        : 'border border-slate-300 bg-white text-muted hover:bg-slate-100 hover:text-ink'
                  }`}>{d.label}</button>
              ))}
            </div>
          </div>

          <div className={`mt-4 border-t pt-4 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-3 h-3 text-subtle" />
              <span className="text-[10px] font-bold text-subtle uppercase tracking-widest">Board View</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all' as const, label: 'All Live Jobs' },
                { value: 'eligible' as const, label: 'Eligible Only' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setBoardView(option.value)}
                  className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    boardView === option.value
                      ? (isDark ? 'bg-slate-200 text-slate-900' : 'bg-slate-700 text-white')
                      : isDark
                        ? 'border border-slate-600 bg-slate-900 text-muted hover:bg-slate-800 hover:text-ink'
                        : 'border border-slate-300 bg-white text-muted hover:bg-slate-100 hover:text-ink'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Job list */}
        <div className="space-y-3">
          {classifiedJobs.length === 0 ? (
            <div className={`rounded-2xl border py-16 text-center shadow-sm ${
              isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
            }`}>
              <Search className="w-10 h-10 text-subtle mx-auto mb-3" />
              <div className="font-semibold text-muted">No open requests match your filters</div>
              <div className="text-xs text-subtle mt-1">Try adjusting your region or discipline filters</div>
            </div>
          ) : (
            <>
              {eligibleJobs.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className={`text-xs font-bold tracking-widest uppercase ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>Eligible for You</h2>
                    <span className="text-[10px] font-bold text-subtle uppercase tracking-wider">{eligibleJobs.length} jobs</span>
                  </div>
                  {eligibleJobs.map(({ job, eligibility }) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      eligibility={eligibility}
                      onClaim={(jobId, slot, _suggestedSlot, claimCommitment) => handleClaim(jobId, slot, claimCommitment)}
                    />
                  ))}
                </section>
              )}

              {boardView === 'all' && ineligibleJobs.length > 0 && (
                <section className="space-y-3 pt-4">
                  <div className="flex items-center justify-between">
                    <h2 className={`text-xs font-bold tracking-widest uppercase ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Other Live Projects</h2>
                    <span className="text-[10px] font-bold text-subtle uppercase tracking-wider">{ineligibleJobs.length} locked</span>
                  </div>
                  {ineligibleJobs.map(({ job, eligibility, primaryReason }) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      eligibility={eligibility}
                      primaryEligibilityReason={primaryReason ?? undefined}
                      onClaim={(jobId, slot, _suggestedSlot, claimCommitment) => handleClaim(jobId, slot, claimCommitment)}
                    />
                  ))}
                </section>
              )}

              {boardView === 'eligible' && eligibleJobs.length === 0 && (
                <div className={`rounded-2xl border py-16 text-center shadow-sm ${
                  isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
                }`}>
                  <Briefcase className="w-10 h-10 text-subtle mx-auto mb-3" />
                  <div className="font-semibold text-muted">No eligible jobs match your filters</div>
                  <div className="text-xs text-subtle mt-1">Switch to All Live Jobs to view the wider marketplace</div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
