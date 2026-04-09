'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock, Zap, AlertTriangle, CheckCircle2, Lock, MapPin, FolderOpen } from 'lucide-react'
import { Navbar } from '@/components/shared/Navbar'
import { Button } from '@/components/ui/Button'
import { DISPATCH_PRICING } from '@/lib/mockData'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
import { getBuilderOnboardingStatusAsync } from '@/lib/persistence/builderOnboarding'
import type { BuilderOnboardingStatus } from '@/lib/persistence/builderOnboarding'
import type { Project, DispatchTier } from '@/lib/types'
import { calculatePricingBreakdown } from '@/utils/pricing'

type PaymentStatus = 'idle' | 'processing' | 'escrowed'

// ─── Row → Project mapper (mirrors builder/page.tsx) ─────────────────────────

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    builderId: (row.builder_id ?? row.user_id) as string,
    name: (row.name ?? 'Unnamed Project') as string,
    address: (row.address ?? '') as string,
    city: (row.city ?? '') as string,
    permitNumber: (row.permit_number ?? '') as string,
    currentStage: (row.current_stage ?? 1) as number,
    status: (row.status ?? 'pending') as Project['status'],
    stages: (row.stages as Project['stages']) ?? [],
    photos: (row.photos as Project['photos']) ?? [],
    gpsCoord: (row.gps_coord as Project['gpsCoord']) ?? { lat: 0, lng: 0, accuracy: 0, timestamp: '', deviceId: '' },
    createdAt: (row.created_at ?? '') as string,
    updatedAt: (row.updated_at ?? '') as string,
    checklistUnlockedAt: (row.checklist_unlocked_at as string | undefined) ?? undefined,
    dispatchTier: (row.dispatch_tier as Project['dispatchTier']) ?? undefined,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DispatchPage() {
  const router = useRouter()
  const { user } = useAuth()
  const store = useStore()

  // ── Approval gate ──────────────────────────────────────────────────────────
  const [onboardingStatus, setOnboardingStatus] = useState<BuilderOnboardingStatus | null>(null)
  useEffect(() => {
    if (!user) { router.replace('/sign-in?role=builder'); return }
    if (user.role !== 'builder') { router.replace('/'); return }
    getBuilderOnboardingStatusAsync(user.id, user.supabaseId).then(setOnboardingStatus)
  }, [user?.id, user?.supabaseId])
  useEffect(() => {
    if (!user || user.role !== 'builder' || onboardingStatus === null) return
    if (onboardingStatus !== 'approved') router.replace('/builder/onboarding')
  }, [user, onboardingStatus, router])

  // ── Real project data ──────────────────────────────────────────────────────
  const [supabaseProjects, setSupabaseProjects] = useState<Project[] | null>(null)
  const [projectsLoading, setProjectsLoading] = useState(false)

  useEffect(() => {
    if (!user?.supabaseId) return
    setProjectsLoading(true)
    supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.supabaseId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        setProjectsLoading(false)
        if (!error && data) setSupabaseProjects(data.map(r => rowToProject(r as Record<string, unknown>)))
      })
  }, [user?.supabaseId])

  // Supabase-first; fall back to store for localStorage-based sessions
  const builderId = user?.id ?? ''
  const storeProjects = store.projects.filter(p => p.builderId === builderId)
  const projects: Project[] = supabaseProjects ?? storeProjects

  // ── Dispatch form state ────────────────────────────────────────────────────
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedTier, setSelectedTier] = useState<DispatchTier>('priority')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dispatched, setDispatched] = useState(false)
  const [txnId] = useState(() => `TXN-${Date.now()}`)

  // Auto-select first project once list loads
  useEffect(() => {
    if (selectedProjectId === null && projects.length > 0) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  const selectedProject = projects.find(p => p.id === selectedProjectId) ?? null
  const pricing = DISPATCH_PRICING.find(p => p.tier === selectedTier)!
  const pricingBreakdown = calculatePricingBreakdown({ dispatchTier: selectedTier })
  const tierIcons = { standard: Clock, priority: Zap, emergency: AlertTriangle }

  const handleHoldInEscrow = async () => {
    setPaymentLoading(true)
    await new Promise(r => setTimeout(r, 1500))
    setPaymentLoading(false)
    setPaymentStatus('escrowed')
  }

  const handleDispatch = async () => {
    if (paymentStatus !== 'escrowed' || !selectedProject) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 2000))
    setLoading(false)
    setDispatched(true)
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (projectsLoading || onboardingStatus === null) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar role="builder" />
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 rounded-full border-2 border-safety-orange border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  // ── Empty state — no projects ──────────────────────────────────────────────
  if (!projectsLoading && projects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar role="builder" />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <FolderOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">No projects yet</h2>
          <p className="text-sm text-gray-500 mb-6">
            You need to create a project before you can request an inspection.
          </p>
          <Link href="/builder">
            <Button variant="primary" size="lg">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (dispatched && selectedProject) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar role="builder" />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-11 h-11 text-success-green" />
          </div>
          <h1 className="text-3xl font-black text-blueprint-blue mb-3">Inspection Dispatched!</h1>
          <p className="text-gray-500 mb-2">We&apos;re matching you with a qualified inspector near your site.</p>
          <p className="text-sm text-gray-400 mb-8">
            {pricing.tier === 'emergency' ? 'Expect confirmation within 15 minutes.' :
             pricing.tier === 'priority'  ? 'You\'ll receive confirmation within 30 minutes.' :
                                            'You\'ll receive confirmation within 24 hours.'}
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 text-left mb-6">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Booking Summary</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Project</span>
                <span className="font-semibold text-gray-900">{selectedProject.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Stage</span>
                <span className="font-semibold text-gray-900">Stage {selectedProject.currentStage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tier</span>
                <span className="font-semibold text-gray-900">{pricing.label}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                <span className="text-gray-500">Held in escrow</span>
                <span className="font-bold text-blueprint-blue">{formatCurrency(pricingBreakdown.builderEscrowTotal)}</span>
              </div>
            </div>
          </div>
          <Link href="/builder">
            <Button variant="primary" size="lg" fullWidth>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="builder" />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link href="/builder" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <h1 className="text-2xl font-black text-blueprint-blue mb-1">Request Inspection</h1>
        <p className="text-gray-500 text-sm mb-6">Choose your project and dispatch tier</p>

        {/* Project selector */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <div className="text-sm font-semibold text-gray-700 mb-3">Select Project</div>
          <div className="space-y-2">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${
                  selectedProjectId === p.id
                    ? 'border-safety-orange bg-orange-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                  selectedProjectId === p.id ? 'border-safety-orange' : 'border-gray-300'
                }`}>
                  {selectedProjectId === p.id && <div className="w-2.5 h-2.5 bg-safety-orange rounded-full" />}
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-900">{p.name}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {p.address}{p.city ? `, ${p.city}` : ''} · Stage {p.currentStage}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tier selection */}
        <div className="space-y-3 mb-5">
          {DISPATCH_PRICING.map((p) => {
            const Icon = tierIcons[p.tier]
            const isSelected = selectedTier === p.tier
            return (
              <button
                key={p.tier}
                onClick={() => setSelectedTier(p.tier)}
                className={`w-full text-left rounded-2xl border-2 p-5 transition-all ${
                  isSelected ? 'border-safety-orange bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-safety-orange text-white' : 'bg-gray-100 text-gray-600'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{p.label}</div>
                      <div className="text-sm text-gray-500 mt-0.5">{p.description}</div>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                        <Clock className="w-3 h-3" />
                        {p.timeframe}
                      </div>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-blueprint-blue">{formatCurrency(p.price)}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Escrow step */}
        {paymentStatus === 'idle' && (
          <div className="mb-5">
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-4 flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-700">
                <span className="font-bold">Secure Escrow Protection:</span> Your {formatCurrency(pricingBreakdown.builderEscrowTotal)} covers the full transaction volume plus SiteLine&apos;s 10% commission.
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Base inspection fee</span>
                <span className="font-semibold text-gray-900">{formatCurrency(pricingBreakdown.baseFee)}</span>
              </div>
              {pricingBreakdown.priorityAdjustment > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{pricing.label} multiplier ({pricingBreakdown.multiplier}x)</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(pricingBreakdown.priorityAdjustment)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Inspector payout</span>
                <span className="font-semibold text-gray-900">{formatCurrency(pricingBreakdown.inspectorPayout)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">SiteLine commission (10%)</span>
                <span className="font-semibold text-gray-900">{formatCurrency(pricingBreakdown.platformCommission)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2">
                <span className="font-bold text-gray-900">Total pre-funded to escrow</span>
                <span className="font-black text-blueprint-blue">{formatCurrency(pricingBreakdown.builderEscrowTotal)}</span>
              </div>
            </div>
            <Button
              variant="primary"
              size="xl"
              fullWidth
              loading={paymentLoading}
              disabled={!selectedProject}
              onClick={handleHoldInEscrow}
            >
              Hold {formatCurrency(pricingBreakdown.builderEscrowTotal)} in Escrow
            </Button>
          </div>
        )}

        {paymentStatus === 'escrowed' && (
          <div className="mb-5">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center mb-4">
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="text-xl font-bold text-green-800">Payment Held in Escrow</h3>
              <p className="text-green-600 mt-2 text-sm">Your payment is securely held and will be released after the inspection is completed and admin-reviewed.</p>
              <p className="font-mono text-sm text-gray-500 mt-3">{txnId}</p>
            </div>
            <Button
              variant="primary"
              size="xl"
              fullWidth
              loading={loading}
              onClick={handleDispatch}
            >
              Dispatch Inspector
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
