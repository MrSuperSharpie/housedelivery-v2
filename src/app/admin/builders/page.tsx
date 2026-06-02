'use client'
export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import {
  Building2, CheckCircle2, AlertCircle, FileText, ChevronDown,
  ChevronUp, Search, Mail, Phone, MapPin, Calendar,
  Home, Store, LayoutGrid, Shield, Clock,
} from 'lucide-react'
import { AdminShell, StatusPill, ActionButton } from '@/components/admin/AdminShell'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth'

const supabase = createClient()
const BUILDER_DOCUMENT_BUCKET = 'inspection-evidence'

function notifyAccountLifecycleEmail(input: {
  eventKey: 'builder.approved' | 'builder.needs_info'
  userId: string
  reviewerNote?: string
}) {
  void fetch('/api/mail/account-lifecycle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }).then(response => {
    if (!response.ok) console.warn('[admin/builders] lifecycle email request failed:', response.status)
  }).catch(error => {
    console.warn('[admin/builders] lifecycle email request failed:', error)
  })
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type BuilderStatus = 'submitted' | 'under_review' | 'needs_info' | 'approved' | 'rejected' | 'suspended'

interface BuilderDoc {
  id: string
  documentType: string
  fileName: string
  storagePath: string
  status: string
  uploaded: boolean
  required: boolean
}

interface BuilderRecord {
  id: string
  supabaseId?: string          // profiles.id — used to persist status changes
  legalName: string
  contact: string
  email: string
  phone: string
  address: string
  builderType: 'residential' | 'commercial' | 'both'
  entityType: string
  regions: string[]
  submittedAt: string
  status: BuilderStatus
  reviewerNote: string
  docs: BuilderDoc[]
  bcHousingLicence?: string
  yearsOperating: string
}

// ─── Map a builder_onboarding_status row to a BuilderRecord ──────────────────
// Columns confirmed from schema introspection:
// user_id, status, company_name, business_number, contact_name, contact_email,
// contact_phone, address, city, province, postal_code, website,
// requested_families, permitted_families, jurisdictions,
// reviewer_note, reviewed_by, reviewed_at, submitted_at, updated_at, created_at

function builderRowToRecord(row: Record<string, unknown>): BuilderRecord {
  const userId = row.user_id as string
  const status = (row.status as BuilderStatus) ?? 'submitted'

  const rawDate = (row.submitted_at ?? row.updated_at ?? row.created_at) as string | null
  const submittedAt = rawDate
    ? new Date(rawDate).toLocaleString('en-CA', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—'

  const addressParts = [
    row.address as string | null,
    row.city as string | null,
    row.province as string | null,
    row.postal_code as string | null,
  ].filter(Boolean)

  const jurisdictions = (row.jurisdictions as string[] | null) ?? []

  return {
    id: userId,
    supabaseId: userId,
    legalName: (row.company_name as string) ?? 'Builder Account',
    contact: (row.contact_name as string) ?? '—',
    email: (row.contact_email as string) ?? '—',
    phone: (row.contact_phone as string) ?? '—',
    address: addressParts.length > 0 ? addressParts.join(', ') : '—',
    builderType: 'residential',   // not stored in this table; default
    entityType: '—',              // not stored in this table
    regions: jurisdictions,
    submittedAt,
    status,
    reviewerNote: (row.reviewer_note as string) ?? '',
    docs: [],
    bcHousingLicence: undefined,
    yearsOperating: '—',
  }
}

function formatDocumentType(type: string) {
  return type
    .split('_')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const BUILDER_TYPE_ICON = {
  residential: Home,
  commercial: Store,
  both: LayoutGrid,
}

// ─── Row component ─────────────────────────────────────────────────────────────

function BuilderRow({ record: initial, isLive }: { record: BuilderRecord; isLive: boolean }) {
  const [record, setRecord] = useState(initial)
  const [expanded, setExpanded] = useState(record.status === 'under_review' || record.status === 'submitted')
  const [note, setNote] = useState(record.reviewerNote)
  const [saving, setSaving] = useState(false)
  const [openingDocId, setOpeningDocId] = useState<string | null>(null)

  const allDocsUploaded = record.docs.length === 0
    ? true   // no doc records yet — don't block for live accounts
    : record.docs.filter(d => d.required).every(d => d.uploaded)
  const missingDocs = record.docs.filter(d => d.required && !d.uploaded)

  const applyStatus = async (status: BuilderStatus) => {
    setSaving(true)
    if (isLive && record.supabaseId) {
      const response = await fetch('/api/admin/builders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: record.supabaseId, status, reviewerNote: note || undefined }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null
        console.error('[admin/builders] status update failed:', response.status, data?.error)
        alert('Failed to update status: ' + (data?.error ?? String(response.status)))
        setSaving(false)
        return
      }
      if (status === 'approved' || status === 'needs_info') {
        notifyAccountLifecycleEmail({
          eventKey: status === 'approved' ? 'builder.approved' : 'builder.needs_info',
          userId: record.supabaseId,
          reviewerNote: note || undefined,
        })
      }
    } else {
      await new Promise(r => setTimeout(r, 600))
    }
    setRecord(prev => ({ ...prev, status, reviewerNote: note }))
    setSaving(false)
  }

  const handleViewDocument = async (doc: BuilderDoc) => {
    setOpeningDocId(doc.id)
    try {
      const { data, error } = await supabase.storage
        .from(BUILDER_DOCUMENT_BUCKET)
        .createSignedUrl(doc.storagePath, 60)

      if (error || !data?.signedUrl) {
        console.error('Builder document view failed:', error)
        return
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setOpeningDocId(null)
    }
  }

  const Icon = BUILDER_TYPE_ICON[record.builderType]

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      record.status === 'approved'   ? 'border-success-green/20' :
      record.status === 'rejected'   ? 'border-fail-red/20' :
      record.status === 'suspended'  ? 'border-fail-red/20' :
      record.status === 'needs_info' ? 'border-warning-amber/20' :
      'border-white/8'
    }`}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-4 bg-panel hover:bg-raised text-left transition-colors"
      >
        <div className="w-9 h-9 bg-flame/15 border border-flame/25 rounded-xl flex items-center justify-center font-black text-flame text-sm shrink-0">
          {record.legalName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-ink text-sm">{record.legalName}</span>
            <StatusPill status={record.status} />
            {isLive && (
              <span className="text-[9px] font-bold bg-electric/15 text-electric border border-electric/25 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                Live
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted mt-0.5 flex-wrap">
            {record.email !== '—' && <span className="flex items-center gap-1"><Mail className="w-2.5 h-2.5" />{record.email}</span>}
            <span className="flex items-center gap-1"><Icon className="w-2.5 h-2.5" />{record.builderType}</span>
            <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{record.submittedAt}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!allDocsUploaded && <AlertCircle className="w-4 h-4 text-warning-amber" aria-label="Missing required documents" />}
          {allDocsUploaded && record.status !== 'approved' && <CheckCircle2 className="w-4 h-4 text-success-green" aria-label="All documents uploaded" />}
          {expanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-white/5 bg-surface/60 px-4 py-4 space-y-4">
          {/* Business info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
            {[
              { label: 'Contact',          val: record.contact },
              { label: 'Phone',            val: record.phone },
              { label: 'Address',          val: record.address },
              { label: 'Entity',           val: record.entityType },
              { label: 'Years operating',  val: record.yearsOperating },
              ...(record.regions.length > 0
                ? [{ label: 'Regions', val: record.regions.slice(0, 3).join(', ') + (record.regions.length > 3 ? ` +${record.regions.length - 3}` : '') }]
                : []),
              ...(record.bcHousingLicence ? [{ label: 'BC Housing Licence', val: record.bcHousingLicence }] : []),
            ].map(({ label, val }) => (
              <div key={label}>
                <div className="text-subtle mb-0.5 uppercase tracking-wide text-[10px]">{label}</div>
                <div className="text-ink font-semibold">{val}</div>
              </div>
            ))}
          </div>

          {/* Document checklist */}
          {record.docs.length > 0 ? (
            <div>
              <div className="label-mono mb-2">Document checklist</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {record.docs.map(doc => (
                  <div key={doc.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] ${
                    doc.uploaded ? 'bg-success-green/8 border border-success-green/15' :
                    doc.required ? 'bg-fail-red/8 border border-fail-red/15' :
                    'bg-white/3 border border-white/5'
                  }`}>
                    {doc.uploaded
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-success-green shrink-0" />
                      : <AlertCircle className={`w-3.5 h-3.5 shrink-0 ${doc.required ? 'text-fail-red' : 'text-subtle'}`} />
                    }
                    <span className={`flex-1 min-w-0 ${doc.uploaded ? 'text-success-green' : doc.required ? 'text-fail-red' : 'text-muted'}`}>
                      <span className="block font-semibold">{formatDocumentType(doc.documentType)}</span>
                      <span className="block truncate text-[10px] text-muted">{doc.fileName} · {doc.status}</span>
                    </span>
                    {doc.uploaded && (
                      <button
                        type="button"
                        onClick={() => handleViewDocument(doc)}
                        disabled={openingDocId === doc.id}
                        className="text-[10px] text-flame font-semibold hover:underline shrink-0"
                      >
                        {openingDocId === doc.id ? '…' : 'View'}
                      </button>
                    )}
                    {!doc.required && <span className="text-[9px] text-subtle">optional</span>}
                  </div>
                ))}
              </div>
              {missingDocs.length > 0 && (
                <div className="mt-2 text-[11px] text-warning-amber flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {missingDocs.length} required document{missingDocs.length !== 1 ? 's' : ''} missing — cannot approve until uploaded
                </div>
              )}
            </div>
          ) : isLive ? (
            <div className="text-[11px] text-muted bg-white/3 border border-white/8 rounded-xl px-3 py-2">
              No builder verification documents are available for this submission.
            </div>
          ) : null}

          {/* Reviewer note */}
          <div>
            <div className="label-mono mb-2">Reviewer note (visible in audit log; not shown to builder)</div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Add internal review notes…"
              className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-xs text-ink placeholder-subtle focus:outline-none focus:border-flame resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="approve" onClick={() => applyStatus('approved')} disabled={saving}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
            </ActionButton>
            <ActionButton variant="warn" onClick={() => applyStatus('needs_info')} disabled={saving}>
              <FileText className="w-3.5 h-3.5" /> Needs info
            </ActionButton>
            <ActionButton variant="reject" onClick={() => applyStatus('rejected')} disabled={saving}>
              Reject
            </ActionButton>
            <ActionButton variant="reject" onClick={() => applyStatus('suspended')} disabled={saving}>
              <Shield className="w-3.5 h-3.5" /> Suspend
            </ActionButton>
            {record.status !== 'under_review' && (
              <ActionButton variant="ghost" onClick={() => applyStatus('under_review')} disabled={saving}>
                <Clock className="w-3.5 h-3.5" /> Set under review
              </ActionButton>
            )}
            {saving && <span className="text-[11px] text-muted self-center">Saving…</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminBuildersPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [builders, setBuilders] = useState<BuilderRecord[]>([])
  const [isLive, setIsLive] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Wait for auth context to hydrate before deciding real vs demo
    if (authLoading) return

    async function load() {
      setLoading(true)
      console.log('[Admin] user role:', user?.role, 'supabaseId:', user?.supabaseId)

      if (user?.role === 'admin') {
        try {
          const { data, error } = await supabase
            .from('builder_onboarding_status')
            .select('*')
            .order('submitted_at', { ascending: false })

          console.log('[AdminBuilders] query:', { rowCount: data?.length ?? 0, error })

          if (error || !data) {
            setBuilders([])
          } else {
            const records = (data as Record<string, unknown>[]).map(builderRowToRecord)
            const builderIds = records.map(record => record.supabaseId ?? record.id).filter(Boolean)
            const docsByBuilder: Record<string, BuilderDoc[]> = {}

            if (builderIds.length > 0) {
              const { data: docData, error: docError } = await supabase
                .from('builder_documents')
                .select('id, user_id, document_type, file_name, storage_path, status, is_required')
                .in('user_id', builderIds)
                .order('uploaded_at', { ascending: false })

              if (docError) {
                console.error('[AdminBuilders] builder document query failed:', docError)
              }

              for (const doc of (docData ?? []) as Record<string, unknown>[]) {
                const userId = doc.user_id as string | undefined
                if (!userId) continue
                docsByBuilder[userId] ??= []
                docsByBuilder[userId].push({
                  id:           doc.id as string,
                  documentType: (doc.document_type as string) ?? 'document',
                  fileName:     (doc.file_name as string) ?? 'Document',
                  storagePath:  (doc.storage_path as string) ?? '',
                  status:       (doc.status as string) ?? 'uploaded',
                  uploaded:     Boolean(doc.storage_path),
                  required:     Boolean(doc.is_required),
                })
              }
            }

            setBuilders(records.map(record => ({
              ...record,
              docs: docsByBuilder[record.supabaseId ?? record.id] ?? [],
            })))
          }
          setIsLive(true)
          setLoading(false)
          return
        } catch (e) {
          console.error('[AdminBuilders] fetch error:', e)
          setBuilders([])
          setIsLive(true)
          setLoading(false)
          return
        }
      }

      setLoading(false)
    }
    load()
  }, [authLoading, user?.role])

  const pending = builders.filter(b =>
    b.status === 'submitted' || b.status === 'under_review' || b.status === 'needs_info'
  ).length

  if (loading) {
    return (
      <AdminShell title="Builder Approvals" subtitle="Loading…">
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-flame/30 border-t-flame rounded-full animate-spin" />
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell
      title="Builder Approvals"
      subtitle={`${pending} pending review · ${builders.length} total${isLive ? ' · live data' : ' · demo data'}`}
    >
      {builders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-2">
          <Building2 className="w-8 h-8 text-muted opacity-30" />
          <p className="text-sm text-muted">No builders found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {builders.map(b => (
            <BuilderRow key={b.id} record={b} isLive={isLive} />
          ))}
        </div>
      )}
    </AdminShell>
  )
}
