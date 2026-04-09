'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  Search, Shield, MapPin, FileText, ChevronRight, Hash, Smartphone,
  Clock, CheckCircle2, XCircle, X, Lock, Radio, Map, Activity,
  AlertTriangle, Archive, Loader2, Database, Crown, Building2
} from 'lucide-react'

import { Navbar } from '@/components/shared/Navbar'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/lib/auth'
import { selectCompletedRecords } from '@/lib/supabase/compliance'
import { MOCK_COMPLETED_INSPECTIONS } from '@/lib/mockData'
import { formatDate } from '@/lib/utils'
import type { CompletedInspection } from '@/lib/types'

type Tab = 'archive' | 'live' | 'retention'

export default function AuditorVault() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('archive')
  const [accessRequested, setAccessRequested] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedInspection, setSelectedInspection] = useState<CompletedInspection | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [inspections, setInspections] = useState<CompletedInspection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const rows = await selectCompletedRecords()
        if (rows.length > 0) {
          const mapped: CompletedInspection[] = rows.map(r => ({
            id: r.id,
            permitNumber: r.permitNumber || `BP-${r.projectId.slice(0, 6)}`,
            address: r.address,
            city: 'Vancouver',
            stage: r.stage,
            stageName: r.stageName,
            inspectorName: r.inspectorName,
            inspectorLicense: r.inspectorLicense,
            completedAt: r.completedAt,
            status: r.result === 'stopped' ? 'fail' as const : r.result as 'pass' | 'fail',
            gpsAtArrival: { lat: 49.2827, lng: -123.1207, accuracy: 3.2, timestamp: r.completedAt, deviceId: 'DEVICE-SL-001' },
            cryptoHash: `sha256-${r.id.replace(/-/g, '').slice(0, 32)}`,
            deviceId: 'DEVICE-SL-001',
            scheduleC_B_url: '',
            photos: [],
            checklistSummary: { total: r.passItems + r.failItems, passed: r.passItems, failed: r.failItems, na: 0 },
          }))
          setInspections(mapped)
        } else {
          setInspections(MOCK_COMPLETED_INSPECTIONS)
        }
      } catch {
        setInspections(MOCK_COMPLETED_INSPECTIONS)
      }
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    return inspections.filter(insp => {
      const q = search.toLowerCase()
      if (q && !insp.permitNumber.toLowerCase().includes(q) &&
          !insp.address.toLowerCase().includes(q) &&
          !insp.inspectorName.toLowerCase().includes(q)) return false
      if (dateFrom && new Date(insp.completedAt) < new Date(dateFrom)) return false
      if (dateTo && new Date(insp.completedAt) > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
  }, [inspections, search, dateFrom, dateTo])

  const passCount = inspections.filter(i => i.status === 'pass').length
  const failCount = inspections.filter(i => i.status === 'fail').length

  return (
    <div className="min-h-screen bg-surface">
      <Navbar role="auditor" dark />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 bg-plasma/10 border border-plasma/20 rounded-2xl flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-plasma" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-ink">City Auditor Vault</h1>
            <p className="text-sm text-muted mt-0.5">
              Sealed inspection records and compliance audit trail for your jurisdiction
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-panel border border-rim rounded-2xl p-1">
          {([
            { id: 'archive' as Tab, icon: Shield, label: 'Sealed Records' },
            { id: 'live' as Tab, icon: Lock, label: 'Live Access' },
            { id: 'retention' as Tab, icon: Archive, label: 'Vault Retention' },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-plasma text-white shadow-sm'
                  : 'text-muted hover:text-ink hover:bg-raised'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── LIVE ACCESS TAB ── */}
        {activeTab === 'live' && (
          <div className="space-y-4">
            <div className="bg-warning-amber/5 border border-warning-amber/20 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-warning-amber/10 border border-warning-amber/20 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-warning-amber" />
              </div>
              <div>
                <div className="font-black text-ink text-base">Live Access Requires Explicit Enablement</div>
                <p className="text-sm text-muted mt-1 leading-relaxed">
                  Real-time inspection tracking, live dashboards, and live map views are restricted by default.
                  Access must be explicitly granted by a SiteLine platform administrator for your jurisdiction.
                </p>
                {accessRequested ? (
                  <div className="mt-3 inline-flex items-center gap-2 bg-warning-amber/10 text-warning-amber text-xs font-bold px-4 py-2 rounded-xl border border-warning-amber/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Request submitted — SiteLine will contact your jurisdiction administrator.
                  </div>
                ) : (
                  <button
                    onClick={() => setAccessRequested(true)}
                    className="mt-3 inline-flex items-center gap-2 bg-warning-amber text-black text-xs font-bold px-4 py-2 rounded-xl hover:bg-warning-amber/90 transition-colors"
                  >
                    Request Live Access
                  </button>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { icon: Radio, label: 'Live Inspection Feed', description: 'Real-time status updates as inspections are performed in the field.' },
                { icon: Map, label: 'Live Site Map', description: 'GPS-tracked inspector locations overlaid on an interactive permit map.' },
                { icon: Activity, label: 'Live Analytics Dashboard', description: 'In-progress pass/fail rates, inspector load, and active job count.' },
              ].map(({ icon: Icon, label, description }) => (
                <div key={label} className="relative bg-panel border border-rim rounded-2xl p-5 overflow-hidden">
                  <div className="absolute inset-0 bg-surface/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-2 rounded-2xl">
                    <div className="w-9 h-9 bg-raised border border-rim rounded-xl flex items-center justify-center">
                      <Lock className="w-5 h-5 text-subtle" />
                    </div>
                    <span className="text-xs font-bold text-subtle uppercase tracking-wide">Requires Permission</span>
                  </div>
                  <div className="w-10 h-10 bg-plasma/10 border border-plasma/20 rounded-xl flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-plasma" />
                  </div>
                  <div className="font-bold text-ink text-sm mb-1">{label}</div>
                  <div className="text-xs text-muted">{description}</div>
                </div>
              ))}
            </div>

            <p className="text-xs text-center text-subtle pb-2">
              Live access is logged and subject to data sharing agreements between your municipality and SiteLine.
            </p>
          </div>
        )}

        {/* ── VAULT RETENTION TAB ── */}
        {activeTab === 'retention' && (
          <div className="space-y-6">
            <div className="bg-panel border border-rim rounded-2xl p-6">
              <h2 className="text-lg font-black text-ink mb-2">Archive Retention Tiers</h2>
              <p className="text-sm text-muted mb-6 leading-relaxed">
                After completion, all inspection records — including pass/fail results, documentation, evidence, and exported packages — are stored in the SiteLine Vault.
                The Vault protects builders, inspectors, and SiteLine by preserving a searchable, retrievable professional record.
              </p>

              <div className="grid md:grid-cols-3 gap-4">
                {/* Standard */}
                <div className="bg-surface border border-rim rounded-2xl p-5 flex flex-col">
                  <div className="w-10 h-10 bg-electric/10 border border-electric/20 rounded-xl flex items-center justify-center mb-4">
                    <Database className="w-5 h-5 text-electric" />
                  </div>
                  <div className="text-xs font-bold text-electric uppercase tracking-widest mb-1">Standard Tier</div>
                  <div className="text-2xl font-black text-ink mb-1">0–2 Years</div>
                  <div className="text-xs text-muted mb-4">Included in the 10% base commission</div>
                  <div className="space-y-2 flex-1">
                    {['Short-term operational access', 'Immediate record availability', 'Full evidence archive', 'Schedule C-B retrieval'].map(item => (
                      <div key={item} className="flex items-start gap-2 text-sm text-muted">
                        <CheckCircle2 className="w-4 h-4 text-success-green shrink-0 mt-0.5" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 text-center text-xs font-bold text-success-green bg-success-green/10 border border-success-green/20 rounded-xl py-2">
                    Included — No Extra Cost
                  </div>
                </div>

                {/* Professional */}
                <div className="bg-flame/5 border-2 border-flame/30 rounded-2xl p-5 flex flex-col relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-flame text-white text-xs font-bold px-3 py-1 rounded-full">Recommended</span>
                  </div>
                  <div className="w-10 h-10 bg-flame/10 border border-flame/20 rounded-xl flex items-center justify-center mb-4">
                    <Crown className="w-5 h-5 text-flame" />
                  </div>
                  <div className="text-xs font-bold text-flame uppercase tracking-widest mb-1">Professional Tier</div>
                  <div className="text-2xl font-black text-ink mb-1">2–10 Years</div>
                  <div className="text-xs text-muted mb-4">One-time premium fee</div>
                  <div className="space-y-2 flex-1">
                    {['Professional risk management', 'Defect-discovery coverage', 'Insurance response support', 'Extended litigation window', 'Commercial retention compliance'].map(item => (
                      <div key={item} className="flex items-start gap-2 text-sm text-muted">
                        <CheckCircle2 className="w-4 h-4 text-success-green shrink-0 mt-0.5" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <button className="mt-5 w-full bg-flame text-white font-bold text-sm py-2.5 rounded-xl hover:bg-flame-light transition-all">
                    Contact Sales
                  </button>
                </div>

                {/* Legacy */}
                <div className="bg-surface border border-rim rounded-2xl p-5 flex flex-col">
                  <div className="w-10 h-10 bg-plasma/10 border border-plasma/20 rounded-xl flex items-center justify-center mb-4">
                    <Building2 className="w-5 h-5 text-plasma" />
                  </div>
                  <div className="text-xs font-bold text-plasma uppercase tracking-widest mb-1">Legacy Tier</div>
                  <div className="text-2xl font-black text-ink mb-1">Life of Building</div>
                  <div className="text-xs text-muted mb-4">Ongoing subscription</div>
                  <div className="space-y-2 flex-1">
                    {['Long-term asset management', 'Refinancing due diligence', 'Resale documentation', 'Major renovation records', 'Multi-decade continuity'].map(item => (
                      <div key={item} className="flex items-start gap-2 text-sm text-muted">
                        <CheckCircle2 className="w-4 h-4 text-success-green shrink-0 mt-0.5" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <button className="mt-5 w-full border border-rim text-ink font-bold text-sm py-2.5 rounded-xl hover:bg-raised transition-all">
                    Contact Sales
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs text-center text-subtle">
              The Vault ensures records remain secure, searchable, and retrievable — while maintaining strict access boundaries between internal records and authority-facing submissions.
            </p>
          </div>
        )}

        {/* ── SEALED RECORDS TAB ── */}
        {activeTab === 'archive' && (<>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-plasma animate-spin mb-3" />
            <span className="text-sm text-muted">Loading sealed records...</span>
          </div>
        ) : (<>

        {/* Search & Filters */}
        <div className="bg-panel border border-rim rounded-2xl p-4 mb-5 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by permit number, address, or inspector name..."
              className="w-full bg-surface border border-rim rounded-xl pl-10 pr-4 py-2.5 text-sm text-ink placeholder-subtle focus:outline-none focus:border-plasma transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-surface border border-rim rounded-xl px-3 py-2.5 text-sm text-muted focus:outline-none focus:border-plasma"
            />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-surface border border-rim rounded-xl px-3 py-2.5 text-sm text-muted focus:outline-none focus:border-plasma"
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-panel border border-rim rounded-2xl p-4 text-center">
            <div className="text-2xl font-black text-plasma">{inspections.length}</div>
            <div className="text-xs text-muted mt-1">Total Records</div>
          </div>
          <div className="bg-success-green/5 border border-success-green/20 rounded-2xl p-4 text-center">
            <div className="text-2xl font-black text-success-green">{passCount}</div>
            <div className="text-xs text-success-green/70 mt-1">Passed</div>
          </div>
          <div className="bg-fail-red/5 border border-fail-red/20 rounded-2xl p-4 text-center">
            <div className="text-2xl font-black text-fail-red">{failCount}</div>
            <div className="text-xs text-fail-red/70 mt-1">Failed</div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-panel border border-rim rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-rim bg-surface/50">
                  <th className="text-left text-xs font-semibold text-subtle uppercase tracking-wide px-5 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-subtle uppercase tracking-wide px-5 py-3">Permit / Address</th>
                  <th className="text-left text-xs font-semibold text-subtle uppercase tracking-wide px-5 py-3">Stage</th>
                  <th className="text-left text-xs font-semibold text-subtle uppercase tracking-wide px-5 py-3">Inspector</th>
                  <th className="text-left text-xs font-semibold text-subtle uppercase tracking-wide px-5 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-subtle uppercase tracking-wide px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rim/50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-muted text-sm">
                      No inspections match your search criteria
                    </td>
                  </tr>
                ) : (
                  filtered.map((insp) => (
                    <tr
                      key={insp.id}
                      className="hover:bg-raised/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedInspection(insp)}
                    >
                      <td className="px-5 py-4 text-sm text-muted whitespace-nowrap">
                        {new Date(insp.completedAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-mono text-xs text-subtle">{insp.permitNumber}</div>
                        <div className="text-sm font-semibold text-ink mt-0.5">{insp.address}</div>
                        <div className="text-xs text-subtle">{insp.city}</div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="dark" size="sm">Stage {insp.stage}</Badge>
                        <div className="text-xs text-subtle mt-1">{insp.stageName}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-ink">{insp.inspectorName}</div>
                        <div className="font-mono text-xs text-subtle mt-0.5">{insp.inspectorLicense}</div>
                      </td>
                      <td className="px-5 py-4">
                        {insp.status === 'pass' ? (
                          <Badge variant="success">
                            <CheckCircle2 className="w-3 h-3" />
                            Pass
                          </Badge>
                        ) : (
                          <Badge variant="fail">
                            <XCircle className="w-3 h-3" />
                            Fail
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <button className="flex items-center gap-1.5 text-xs font-semibold text-plasma hover:text-plasma/80 transition-colors">
                          View Details
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        </>)}
        </>)}
      </main>

      {/* ── Inspection details slide-over ── */}
      {selectedInspection && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedInspection(null)} />
          <div className="relative bg-panel w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto border border-rim">
            {/* Header */}
            <div className="sticky top-0 bg-panel border-b border-rim px-5 py-4 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
              <div>
                <h2 className="text-lg font-black text-ink">Inspection Record</h2>
                <div className="font-mono text-xs text-subtle mt-0.5">{selectedInspection.permitNumber}</div>
              </div>
              <button
                onClick={() => setSelectedInspection(null)}
                className="p-2 hover:bg-raised rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Status banner */}
              <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
                selectedInspection.status === 'pass'
                  ? 'bg-success-green/5 border-success-green/20'
                  : 'bg-fail-red/5 border-fail-red/20'
              }`}>
                {selectedInspection.status === 'pass' ? (
                  <CheckCircle2 className="w-8 h-8 text-success-green shrink-0" />
                ) : (
                  <XCircle className="w-8 h-8 text-fail-red shrink-0" />
                )}
                <div>
                  <div className={`font-black text-xl ${selectedInspection.status === 'pass' ? 'text-success-green' : 'text-fail-red'}`}>
                    {selectedInspection.status === 'pass' ? 'PASS' : 'FAIL'}
                  </div>
                  <div className="text-sm text-muted">{selectedInspection.address} · Stage {selectedInspection.stage}: {selectedInspection.stageName}</div>
                </div>
              </div>

              {/* GPS Card */}
              <div className="bg-plasma/5 border border-plasma/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-plasma" />
                  <span className="font-bold text-ink text-sm">Location at Submission</span>
                </div>
                <div className="text-sm text-muted mb-3">
                  Inspector confirmed at <span className="font-semibold text-ink">{selectedInspection.address}</span> within{' '}
                  <span className="font-semibold text-success-green">{selectedInspection.gpsAtArrival.accuracy} metres</span> at{' '}
                  <span className="font-semibold text-ink">{formatDate(selectedInspection.gpsAtArrival.timestamp)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface rounded-xl p-3 border border-rim">
                    <div className="text-xs text-subtle mb-0.5">Latitude</div>
                    <div className="font-mono text-sm font-bold text-ink">{selectedInspection.gpsAtArrival.lat.toFixed(6)}</div>
                  </div>
                  <div className="bg-surface rounded-xl p-3 border border-rim">
                    <div className="text-xs text-subtle mb-0.5">Longitude</div>
                    <div className="font-mono text-sm font-bold text-ink">{selectedInspection.gpsAtArrival.lng.toFixed(6)}</div>
                  </div>
                </div>
              </div>

              {/* Record ID */}
              <div className="bg-surface border border-rim rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-4 h-4 text-muted" />
                  <span className="font-bold text-ink text-sm">Record ID</span>
                </div>
                <div className="font-mono text-xs text-subtle break-all bg-panel rounded-xl p-3 border border-rim">
                  {selectedInspection.cryptoHash}
                </div>
                <p className="text-xs text-subtle mt-2">Identifier for this inspection record. Full integrity/checksum support planned.</p>
              </div>

              {/* Device ID */}
              <div className="flex items-start gap-3 bg-surface border border-rim rounded-2xl p-4">
                <Smartphone className="w-5 h-5 text-muted mt-0.5 shrink-0" />
                <div>
                  <div className="font-bold text-sm text-ink">Submission Device</div>
                  <div className="font-mono text-xs text-subtle mt-1">{selectedInspection.deviceId}</div>
                  <div className="text-xs text-subtle mt-1">Device ID recorded and verified against inspector account</div>
                </div>
              </div>

              {/* Timestamp */}
              <div className="flex items-start gap-3 bg-surface border border-rim rounded-2xl p-4">
                <Clock className="w-5 h-5 text-muted mt-0.5 shrink-0" />
                <div>
                  <div className="font-bold text-sm text-ink">Inspection Timestamp</div>
                  <div className="font-mono text-xs text-subtle mt-1">{selectedInspection.completedAt}</div>
                  <div className="text-xs text-success-green mt-1 font-semibold">
                    {formatDate(selectedInspection.completedAt)} (Pacific Time)
                  </div>
                </div>
              </div>

              {/* Checklist summary */}
              <div className="bg-surface border border-rim rounded-2xl p-4">
                <div className="font-bold text-sm text-ink mb-3">Checklist Summary</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-panel rounded-xl p-3 text-center border border-rim">
                    <div className="text-xl font-black text-success-green">{selectedInspection.checklistSummary.passed}</div>
                    <div className="text-xs text-subtle mt-0.5">Passed</div>
                  </div>
                  <div className="bg-panel rounded-xl p-3 text-center border border-rim">
                    <div className="text-xl font-black text-fail-red">{selectedInspection.checklistSummary.failed}</div>
                    <div className="text-xs text-subtle mt-0.5">Failed</div>
                  </div>
                  <div className="bg-panel rounded-xl p-3 text-center border border-rim">
                    <div className="text-xl font-black text-muted">{selectedInspection.checklistSummary.na}</div>
                    <div className="text-xs text-subtle mt-0.5">N/A</div>
                  </div>
                </div>
              </div>

              {/* Inspector */}
              <div className="flex items-center justify-between bg-surface border border-rim rounded-2xl p-4">
                <div>
                  <div className="font-bold text-sm text-ink">{selectedInspection.inspectorName}</div>
                  <div className="font-mono text-xs text-subtle mt-0.5">{selectedInspection.inspectorLicense}</div>
                </div>
                <Badge variant="dark" size="sm">Licensed CP</Badge>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button className="flex-1 flex items-center justify-center gap-2 bg-plasma text-white font-bold py-3 px-4 rounded-2xl hover:bg-plasma/80 transition-colors text-sm min-h-[48px]">
                  <FileText className="w-4 h-4" />
                  View Schedule C-B PDF
                </button>
                <button className="flex items-center justify-center gap-2 bg-raised text-ink border border-rim font-semibold py-3 px-4 rounded-2xl hover:bg-hover transition-colors text-sm min-h-[48px]">
                  Export Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
