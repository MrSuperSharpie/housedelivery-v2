'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle, Clock, DollarSign, FileText, MapPin, ChevronDown, ChevronUp, Shield, Building2, Scale, ListChecks } from 'lucide-react'
import { Navbar } from '@/components/shared/Navbar'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { WaitTimer } from '@/components/builder/WaitTimer'
import { TrackingMap } from '@/components/builder/TrackingMap'
import { INSPECTION_STAGES, MOCK_INSPECTOR } from '@/lib/mockData'
import { DISPATCH_PRICING } from '@/lib/pricing/config'
import { formatCurrency, formatDate, isChecklistUnlocked } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { getBuilderProjectView } from '@/lib/adapters/projectAdapter'
import type { InspectionStatus } from '@/lib/types'

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const storeProjects = useStore().projects
  const storeJobs = useStore().jobs
  const project = storeProjects.find(p => p.id === params.id)
  const [paymentReleased, setPaymentReleased] = useState(false)
  const [activePhoto, setActivePhoto] = useState<string | null>(null)
  const safeProject = useMemo(() => (
    project ?? {
      id: 'loading',
      builderId: '',
      name: 'Loading project',
      address: '',
      city: '',
      permitNumber: '',
      currentStage: 1,
      stages: [],
      status: 'pending' as const,
      photos: [],
      gpsCoord: { lat: 0, lng: 0, accuracy: 0, timestamp: '', deviceId: '' },
      createdAt: '',
      updatedAt: '',
    }
  ), [project])
  const view = useMemo(() => getBuilderProjectView(safeProject), [safeProject])
  const relevantJob = useMemo(() => {
    return [...storeJobs]
      .filter(job => job.projectId === safeProject.id)
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())[0]
  }, [safeProject.id, storeJobs])
  const fallbackDispatchPrice = useMemo(() => {
    const tier = safeProject.dispatchTier ?? 'standard'
    return DISPATCH_PRICING.find(pricing => pricing.tier === tier)?.price ?? DISPATCH_PRICING[0].price
  }, [safeProject.dispatchTier])
  const escrowDisplayAmount = relevantJob?.escrowAmount ?? fallbackDispatchPrice
  const [expandedStage, setExpandedStage] = useState<number | null>(safeProject.currentStage)
  const waitTimerStartedAt = project?.updatedAt || project?.createdAt || '2026-01-01T00:00:00.000Z'

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar role="builder" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <Link href="/builder" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
            Project details are loading or this project is not available in your scoped database view.
          </div>
        </div>
      </div>
    )
  }

  const stageStatusIcon = (status: InspectionStatus) => {
    if (status === 'pass') return <CheckCircle2 className="w-5 h-5 text-success-green" />
    if (status === 'fail') return <XCircle className="w-5 h-5 text-fail-red" />
    if (status === 'in_progress') return <div className="w-5 h-5 rounded-full bg-blue-400 animate-pulse" />
    return <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role="builder" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Back */}
        <Link href="/builder" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-blueprint-blue">{project.name}</h1>
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
              <MapPin className="w-4 h-4" />
              {view.propertySite.address}, {view.propertySite.city}, {view.propertySite.province}
            </div>
          </div>
          <StatusBadge status={project.status} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">
            {/* ── Compliance & permit context (domain + rules) ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blueprint-blue" />
                Compliance & permit context
              </h2>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Jurisdiction</div>
                  <div className="text-sm font-medium text-gray-900">{view.jurisdiction.name}</div>
                  {view.jurisdiction.region && <div className="text-xs text-gray-500">{view.jurisdiction.region}</div>}
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Code source</div>
                  <div className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-gray-500" />
                    {view.codeSource === 'VBBL' ? 'Vancouver Building Bylaw' : view.codeSource === 'BCBC' ? 'BC Building Code' : 'BCBC / VBBL'}
                  </div>
                </div>
              </div>
              {view.triggers.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Triggers</div>
                  <div className="flex flex-wrap gap-1.5">
                    {view.triggers.map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-100">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Permits & requirements</div>
                <ul className="space-y-1.5">
                  {view.permits.map((p, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{p.label}</span>
                      <span className="flex items-center gap-2">
                        {p.permitNumber && <span className="font-mono text-xs text-gray-600">{p.permitNumber}</span>}
                        {p.source === 'suggested' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Suggested</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── Inspection stage progress (field verification) ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-gray-500" />
                Inspection stage progress
              </h2>
              {project.checklistUnlockedAt != null && (
                <div className="flex items-center gap-2 mb-4 py-2 px-3 rounded-xl bg-gray-50 border border-gray-100">
                  <Shield className="w-4 h-4 text-blueprint-blue shrink-0" />
                  <span className="text-sm text-gray-700">
                    Stage checklist for city staff: {isChecklistUnlocked(project.checklistUnlockedAt)
                      ? <span className="font-semibold text-success-green">Available now</span>
                      : <span>Available {formatDate(project.checklistUnlockedAt)}</span>}
                    {project.dispatchTier === 'emergency' && (
                      <span className="ml-1 text-xs text-red-600 font-medium">(Emergency — no delay)</span>
                    )}
                  </span>
                </div>
              )}

              {/* Horizontal stepper on desktop, vertical on mobile */}
              <div className="hidden sm:flex items-center mb-6">
                {project.stages.map((stage, i) => (
                  <React.Fragment key={i}>
                    <div className="flex flex-col items-center text-center" style={{ flex: 1 }}>
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 text-sm font-bold transition-all ${
                        stage.status === 'pass' ? 'border-success-green bg-success-green text-white' :
                        stage.status === 'fail' ? 'border-fail-red bg-fail-red text-white' :
                        stage.status === 'in_progress' ? 'border-blue-400 bg-blue-400 text-white' :
                        i + 1 === project.currentStage ? 'border-warning-amber bg-warning-amber/10 text-warning-amber' :
                        'border-gray-200 bg-white text-gray-400'
                      }`}>
                        {stage.status === 'pass' ? <CheckCircle2 className="w-4 h-4" /> :
                         stage.status === 'fail' ? <XCircle className="w-4 h-4" /> :
                         (i + 1)}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1.5 max-w-[70px] leading-tight">
                        {stage.stageName.split(' ')[0]}
                      </div>
                    </div>
                    {i < project.stages.length - 1 && (
                      <div className={`h-0.5 flex-1 -mx-1 ${
                        stage.status === 'pass' ? 'bg-success-green' : 'bg-gray-100'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Stage list */}
              <div className="space-y-2">
                {project.stages.map((stage, i) => {
                  const stageDetails = INSPECTION_STAGES[i]
                  const isExpanded = expandedStage === i + 1
                  const isCurrent = i + 1 === project.currentStage

                  return (
                    <div key={i} className={`rounded-xl border transition-all ${
                      isCurrent ? 'border-warning-amber/50 bg-amber-50/50' :
                      stage.status === 'pass' ? 'border-emerald-100 bg-emerald-50/30' :
                      stage.status === 'fail' ? 'border-red-100 bg-red-50/30' :
                      'border-gray-100'
                    }`}>
                      <button
                        onClick={() => setExpandedStage(isExpanded ? null : i + 1)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left"
                      >
                        {stageStatusIcon(stage.status)}
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-gray-900">{stage.stageName}</div>
                          {stage.completedAt && (
                            <div className="text-xs text-gray-400 mt-0.5">{formatDate(stage.completedAt)}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {stage.scheduleC_B && (
                            <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded-lg">
                              <FileText className="w-3 h-3" />
                              C-B
                            </button>
                          )}
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </button>

                      {/* Expanded: checklist items */}
                      {isExpanded && stageDetails && (
                        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                          <div className="text-xs text-gray-500 mb-3">{stageDetails.description}</div>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {stageDetails.items.map((item, j) => (
                              <div key={j} className="flex items-center gap-2 text-xs">
                                {stage.status === 'pass' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-success-green shrink-0" />
                                ) : stage.status === 'fail' && j < 2 ? (
                                  <XCircle className="w-3.5 h-3.5 text-fail-red shrink-0" />
                                ) : (
                                  <div className="w-3.5 h-3.5 rounded-full border border-gray-200 shrink-0" />
                                )}
                                <span className={stage.status === 'fail' && j < 2 ? 'text-fail-red font-medium' : 'text-gray-600'}>
                                  {item.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Photo Gallery ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-4">Inspection Photos & Pin-Drop Deficiencies</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {project.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative rounded-xl overflow-hidden cursor-pointer group"
                    style={{ paddingBottom: '66%' }}
                    onClick={() => setActivePhoto(activePhoto === photo.id ? null : photo.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.thumbnailUrl}
                      alt="Inspection"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    {photo.pins.length > 0 && (
                      <div className="absolute top-2 right-2 bg-fail-red text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        {photo.pins.length}
                      </div>
                    )}
                    {activePhoto === photo.id && photo.pins.length > 0 && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-2">
                        {photo.pins.map((pin, i) => (
                          <div key={pin.id} className="text-white text-[10px] text-center mb-1">
                            <span className="bg-fail-red rounded-full px-1.5 py-0.5 mr-1">{i + 1}</span>
                            {pin.note.substring(0, 40)}…
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Inspector tracking */}
            {project.status === 'in_progress' && (
              <>
                <TrackingMap
                  inspectorName={MOCK_INSPECTOR.name}
                  etaMinutes={8}
                  projectAddress={project.address}
                  isOnSite={false}
                />
                <WaitTimer
                  startedAt={waitTimerStartedAt}
                  inspectorName={MOCK_INSPECTOR.name}
                />
              </>
            )}

            {/* Payment Escrow */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-4">Payment Escrow</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <DollarSign className="w-4 h-4" />
                    Funds Held
                  </div>
                  <span className="font-bold text-blueprint-blue">{formatCurrency(escrowDisplayAmount)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className="text-sm font-semibold text-warning-amber">Held in Escrow</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Clock className="w-3.5 h-3.5" />
                    Payout in 24hrs
                  </div>
                  <span className="text-xs text-gray-400">to inspector</span>
                </div>
              </div>
              {paymentReleased ? (
                <div className="mt-4 flex items-center justify-center gap-2 py-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5 text-success-green" />
                  <span className="text-sm font-bold text-success-green">Payment Released</span>
                </div>
              ) : (
                <Button
                  variant="success"
                  size="md"
                  fullWidth
                  className="mt-4"
                  onClick={() => setPaymentReleased(true)}
                  disabled={project.status !== 'pass' && project.status !== 'fail'}
                >
                  Release Payment
                </Button>
              )}
            </div>

            {/* Project info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-3">Project Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Permits</span>
                  <span className="font-semibold text-gray-700">{view.permits.length} (see Compliance above)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">GPS</span>
                  <span className="font-mono text-gray-700 text-xs">
                    {project.gpsCoord.lat.toFixed(4)}, {project.gpsCoord.lng.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Stage</span>
                  <span className="font-semibold text-gray-700">Stage {project.currentStage} / 5</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
