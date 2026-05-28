'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, ExternalLink, Filter, GitCompare, ShieldAlert } from 'lucide-react'
import { StatCard } from '@/components/admin/AdminShell'
import type {
  ChecklistMappingAudit,
  MappingAuditDomain,
  MappingJurisdictionSlug,
  MappingRecommendation,
  MappingRiskLevel,
  MatchConfidence,
} from '@/lib/checklistMappingAudit'

type RiskFilter = 'all' | MappingRiskLevel
type PilotFilter = 'all' | 'pilot'

const RISK_LABEL: Record<MappingRiskLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  do_not_touch: 'Do Not Touch',
}

const RECOMMENDATION_LABEL: Record<MappingRecommendation, string> = {
  keep_ts_only: 'Keep TS Only',
  enrich_ts_from_db_metadata: 'Enrich Later',
  feature_flag_pilot_candidate: 'Pilot Candidate',
  defer: 'Defer',
}

const CONFIDENCE_LABEL: Record<MatchConfidence, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'None',
}

function badgeClass(kind: 'matched' | 'ts' | 'db' | 'vbbl' | 'pilot' | 'danger' | 'neutral') {
  const classes = {
    matched: 'border-success-green/25 bg-success-green/10 text-success-green',
    ts: 'border-electric/25 bg-electric/10 text-electric',
    db: 'border-flame/25 bg-flame/10 text-flame',
    vbbl: 'border-warning-amber/25 bg-warning-amber/10 text-warning-amber',
    pilot: 'border-success-green/25 bg-success-green/10 text-success-green',
    danger: 'border-fail-red/25 bg-fail-red/10 text-fail-red',
    neutral: 'border-white/10 bg-white/5 text-muted',
  }
  return `inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${classes[kind]}`
}

function riskBadgeClass(risk: MappingRiskLevel) {
  if (risk === 'do_not_touch') return badgeClass('danger')
  if (risk === 'high') return 'inline-flex items-center rounded-full border border-warning-amber/25 bg-warning-amber/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-warning-amber'
  if (risk === 'medium') return 'inline-flex items-center rounded-full border border-electric/25 bg-electric/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-electric'
  return badgeClass('matched')
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-subtle">
        {label}
      </span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition-colors focus:border-flame/40 focus-visible:ring-1 focus-visible:ring-flame/40"
      >
        {children}
      </select>
    </label>
  )
}

function EmptyNotice({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/5 px-3 py-3 text-xs text-muted">
      {text}
    </div>
  )
}

function ItemList({
  title,
  badge,
  items,
}: {
  title: string
  badge: React.ReactNode
  items: Array<{ id: string; label: string; detail?: string }>
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/8 bg-surface/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-subtle">{title}</h3>
        {badge}
      </div>
      {items.length === 0 ? (
        <EmptyNotice text="No items in this group." />
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
              <div className="text-xs font-bold leading-5 text-ink">{item.label}</div>
              {item.detail && (
                <div className="mt-1 text-[11px] leading-5 text-muted">{item.detail}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LegalReferenceList({ domain }: { domain: MappingAuditDomain }) {
  if (domain.dbLegalReferences.length === 0) {
    return <EmptyNotice text="No DB legal/code references were available for this mapped domain." />
  }

  return (
    <div className="space-y-2">
      {domain.dbLegalReferences.slice(0, 8).map(ref => (
        <div key={`${domain.id}-${ref.label}-${ref.legalReference}`} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
          <div className="text-xs font-bold text-ink">{ref.label}</div>
          <div className="mt-1 text-[11px] leading-5 text-muted">{ref.legalReference}</div>
          {ref.sourceUrl ? (
            <a
              href={ref.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-flame underline decoration-flame/30 underline-offset-2"
            >
              {ref.sourceTitle ?? 'Source'} <ExternalLink className="h-3 w-3" />
            </a>
          ) : ref.sourceTitle ? (
            <div className="mt-1 text-[11px] text-subtle">{ref.sourceTitle}</div>
          ) : null}
        </div>
      ))}
      {domain.dbLegalReferences.length > 8 && (
        <div className="text-[11px] font-semibold text-muted">
          +{domain.dbLegalReferences.length - 8} more references in this domain.
        </div>
      )}
    </div>
  )
}

function DomainPanel({ domain, jurisdiction }: { domain: MappingAuditDomain; jurisdiction: MappingJurisdictionSlug }) {
  const isPilot = domain.recommendation === 'feature_flag_pilot_candidate'
  const isDanger = domain.riskLevel === 'do_not_touch'
  const stageNumberMismatch = domain.dbStageNumbers.some(number => number !== domain.tsStageNumber)
    || domain.dbStageNumbers.length !== 1

  return (
    <section className="rounded-2xl border border-white/8 bg-white/5 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2">
            <span className={badgeClass('neutral')}>Domain</span>
            <span className={riskBadgeClass(domain.riskLevel)}>{RISK_LABEL[domain.riskLevel]}</span>
            {isPilot && <span className={badgeClass('pilot')}>Pilot Candidate</span>}
            {isDanger && <span className={badgeClass('danger')}>Do Not Touch</span>}
            {stageNumberMismatch && <span className={badgeClass('vbbl')}>Stage Number Mismatch</span>}
          </div>
          <h2 className="text-lg font-black tracking-[-0.03em] text-ink">{domain.semanticDomain}</h2>
          <div className="mt-3 grid gap-3 text-xs md:grid-cols-2">
            <div className="rounded-xl border border-white/8 bg-surface/50 px-3 py-3">
              <div className="text-[10px] font-black uppercase tracking-wide text-subtle">TypeScript Production Stage</div>
              <div className="mt-1 font-bold text-ink">S{String(domain.tsStageNumber).padStart(2, '0')} · {domain.tsStageTitle}</div>
            </div>
            <div className="rounded-xl border border-white/8 bg-surface/50 px-3 py-3">
              <div className="text-[10px] font-black uppercase tracking-wide text-subtle">DB Template Stage</div>
              <div className="mt-1 font-bold text-ink">
                {domain.dbStageNumbers.length > 0
                  ? domain.dbStageNumbers.map((number, index) => `S${String(number).padStart(2, '0')} · ${domain.dbStageTitles[index]}`).join(' / ')
                  : 'No mapped DB stage'}
              </div>
            </div>
          </div>
          {domain.notes.length > 0 && (
            <div className="mt-3 space-y-1">
              {domain.notes.map(note => (
                <div key={note} className="text-xs leading-5 text-muted">{note}</div>
              ))}
            </div>
          )}
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 text-center sm:grid-cols-4 lg:w-[28rem]">
          <div className="rounded-xl border border-white/8 bg-surface/60 px-3 py-3">
            <div className="text-[10px] font-black uppercase tracking-wide text-subtle">Match</div>
            <div className="mt-1 text-sm font-black text-ink">{CONFIDENCE_LABEL[domain.confidence]}</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-surface/60 px-3 py-3">
            <div className="text-[10px] font-black uppercase tracking-wide text-subtle">Matched</div>
            <div className="mt-1 text-sm font-black text-success-green">{domain.matches.length}</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-surface/60 px-3 py-3">
            <div className="text-[10px] font-black uppercase tracking-wide text-subtle">TS Only</div>
            <div className="mt-1 text-sm font-black text-electric">{domain.tsOnlyItems.length}</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-surface/60 px-3 py-3">
            <div className="text-[10px] font-black uppercase tracking-wide text-subtle">DB Only</div>
            <div className="mt-1 text-sm font-black text-flame">{domain.dbOnlyItems.length}</div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <ItemList
          title="Likely Matched Items"
          badge={<span className={badgeClass('matched')}>Matched</span>}
          items={domain.matches.map(match => ({
            id: `${match.tsItem.code}-${match.dbItem.id}`,
            label: `${match.tsItem.code}: ${match.tsItem.label}`,
            detail: `DB: ${match.dbItem.label} · ${CONFIDENCE_LABEL[match.confidence]} confidence`,
          }))}
        />
        <ItemList
          title="TypeScript-Only Runtime Items"
          badge={<span className={badgeClass('ts')}>TS Only</span>}
          items={domain.tsOnlyItems.map(item => ({
            id: item.code,
            label: `${item.code}: ${item.label}`,
            detail: `${item.responsibleParty} · ${item.evidenceMode} · ${item.documentUploadRequired ? 'document upload required' : 'verify existing record'}`,
          }))}
        />
        <ItemList
          title="DB-Only Template Items"
          badge={<span className={badgeClass('db')}>DB Only</span>}
          items={domain.dbOnlyItems.map(item => ({
            id: item.id,
            label: item.label,
            detail: item.legalReference ?? item.requirementText,
          }))}
        />
        <ItemList
          title="VBBL-Only Items"
          badge={<span className={badgeClass('vbbl')}>VBBL Only</span>}
          items={(jurisdiction === 'vbbl_2025' ? domain.vbblOnlyItems : []).map(item => ({
            id: item.id,
            label: item.label,
            detail: item.legalReference ?? item.requirementText,
          }))}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.65fr)]">
        <div className="rounded-2xl border border-white/8 bg-surface/50 p-4">
          <h3 className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-subtle">Legal / Code References Available From DB</h3>
          <LegalReferenceList domain={domain} />
        </div>
        <div className="rounded-2xl border border-white/8 bg-surface/50 p-4">
          <h3 className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-subtle">Runtime Fields Present In TypeScript</h3>
          <div className="space-y-2 text-xs leading-5 text-muted">
            <div><span className="font-bold text-ink">Evidence:</span> {domain.tsItems.filter(item => item.requiredEvidence.length > 0).length} items define required evidence.</div>
            <div><span className="font-bold text-ink">Party logic:</span> {Array.from(new Set(domain.tsItems.map(item => item.responsibleParty))).join(', ') || 'None'}</div>
            <div><span className="font-bold text-ink">Status logic:</span> Pending, Passed, Failed, N/A.</div>
            <div><span className="font-bold text-ink">Recommendation:</span> {RECOMMENDATION_LABEL[domain.recommendation]}.</div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function ChecklistMappingAuditClient({ audit }: { audit: ChecklistMappingAudit }) {
  const [jurisdiction, setJurisdiction] = useState<MappingJurisdictionSlug>('vbbl_2025')
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all')
  const [pilotFilter, setPilotFilter] = useState<PilotFilter>('all')
  const [domainFilter, setDomainFilter] = useState('all')

  const allDomains = audit.domainsByJurisdiction[jurisdiction] ?? []
  const filteredDomains = useMemo(() => {
    return allDomains.filter(domain => {
      if (riskFilter !== 'all' && domain.riskLevel !== riskFilter) return false
      if (pilotFilter === 'pilot' && domain.recommendation !== 'feature_flag_pilot_candidate') return false
      if (domainFilter !== 'all' && domain.id !== domainFilter) return false
      return true
    })
  }, [allDomains, domainFilter, pilotFilter, riskFilter])

  const jurisdictionOptions = audit.jurisdictions.length > 0 ? audit.jurisdictions : [
    { slug: 'bcbc_2024' as const, label: 'BCBC 2024' },
    { slug: 'vbbl_2025' as const, label: 'VBBL 2025' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/checklists"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-muted transition-colors hover:bg-white/10 hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Checklist Templates
        </Link>
        <div className="inline-flex items-center gap-2 rounded-xl border border-success-green/20 bg-success-green/10 px-3 py-2 text-xs font-bold text-success-green">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Read-only diagnostic
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <StatCard label="TS Stages" value={audit.summary.totalTsStages} sub="Production checklist" />
        <StatCard label="DB Stages" value={audit.summary.totalDbStages} sub="Template engine" />
        <StatCard label="High Matches" value={audit.summary.highConfidenceMatches} sub="Semantic domains" color="text-success-green" />
        <StatCard label="DB Only" value={audit.summary.dbOnlyItems} sub="BCBC baseline" color="text-flame" />
        <StatCard label="TS Only" value={audit.summary.tsOnlyItems} sub="Runtime gates" color="text-electric" />
        <StatCard label="VBBL Only" value={audit.summary.vbblOnlyItems} sub="Vancouver additions" color="text-warning-amber" />
        <StatCard label="High Risk" value={audit.summary.highRiskMismatches} sub="Mismatch domains" color="text-fail-red" />
        <StatCard label="Pilots" value={audit.summary.pilotCandidates} sub="Candidates" color="text-success-green" />
      </div>

      <section className="rounded-2xl border border-white/8 bg-white/5 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-flame" />
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-ink">Filters</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Select label="Jurisdiction" value={jurisdiction} onChange={value => setJurisdiction(value as MappingJurisdictionSlug)}>
            {jurisdictionOptions.map(option => (
              <option key={option.slug} value={option.slug}>{option.label}</option>
            ))}
          </Select>
          <Select label="Risk Level" value={riskFilter} onChange={value => setRiskFilter(value as RiskFilter)}>
            <option value="all">All risk levels</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="do_not_touch">Do Not Touch</option>
          </Select>
          <Select label="Pilot Candidate" value={pilotFilter} onChange={value => setPilotFilter(value as PilotFilter)}>
            <option value="all">All domains</option>
            <option value="pilot">Pilot candidates only</option>
          </Select>
          <Select label="Stage / Domain" value={domainFilter} onChange={setDomainFilter}>
            <option value="all">All domains</option>
            {allDomains.map(domain => (
              <option key={domain.id} value={domain.id}>S{String(domain.tsStageNumber).padStart(2, '0')} · {domain.semanticDomain}</option>
            ))}
          </Select>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.48fr)]">
        <div className="rounded-2xl border border-white/8 bg-white/5 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-electric" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-ink">Known Findings</h2>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {audit.knownFindings.map(finding => (
              <div key={finding} className="rounded-xl border border-white/8 bg-surface/50 px-3 py-2.5 text-xs leading-5 text-muted">
                {finding}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-success-green/15 bg-success-green/5 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-success-green" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-ink">Read-Only Guardrails</h2>
          </div>
          <div className="space-y-2">
            {audit.readOnlyAssurance.map(text => (
              <div key={text} className="rounded-xl border border-success-green/15 bg-success-green/5 px-3 py-2.5 text-xs leading-5 text-muted">
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="space-y-4">
        {filteredDomains.length === 0 ? (
          <EmptyNotice text="No domains match the current filters." />
        ) : (
          filteredDomains.map(domain => (
            <DomainPanel key={`${jurisdiction}-${domain.id}`} domain={domain} jurisdiction={jurisdiction} />
          ))
        )}
      </div>
    </div>
  )
}
