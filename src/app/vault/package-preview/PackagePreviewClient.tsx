'use client'

import React, { useMemo, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Printer, FileText, AlertCircle, Send, CheckCircle2, Plus } from 'lucide-react'
import { Navbar } from '@/components/shared/Navbar'
import { useAuth } from '@/lib/auth'
import { getCompletedInspectionByIdAsync } from '@/lib/persistence/completedInspections'
import { generateAuthorityPackageFromCompletedRecord } from '@/lib/packages/authority-package'
import { getPackageSeal, recordPackageExport } from '@/lib/supabase/governance'
import {
  getDeficienciesByRecordIdAsync,
  addDeficiency,
  updateDeficiency,
  getVersionsByRecordIdAsync,
  addResubmissionVersion,
} from '@/lib/persistence'
import type { RecordDeficiency } from '@/lib/persistence/deficiencies'
import type { PackageVersionRecord } from '@/lib/persistence/packageVersions'

export default function PackagePreviewClient() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const recordId = searchParams.get('id') ?? ''
  const [record, setRecord] = useState<Awaited<ReturnType<typeof getCompletedInspectionByIdAsync>> | null | undefined>(undefined)
  const [deficiencies, setDeficiencies] = useState<RecordDeficiency[]>([])
  const [versions, setVersions] = useState<PackageVersionRecord[]>([])
  const [addComment, setAddComment] = useState('')
  const [addChecklistRef, setAddChecklistRef] = useState('')
  const [addEvidenceRef, setAddEvidenceRef] = useState('')
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [responseText, setResponseText] = useState('')
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolvedVersion, setResolvedVersion] = useState<number | undefined>(undefined)

  const pkg = useMemo(
    () => (record && record.evidenceItems?.length ? generateAuthorityPackageFromCompletedRecord(record) : null),
    [record]
  )

  useEffect(() => {
    if (!recordId) return
    getCompletedInspectionByIdAsync(recordId).then(r => {
      setRecord(r ?? null)
    })
  }, [recordId])

  useEffect(() => {
    if (!recordId || !user) return
    let cancelled = false
    void getPackageSeal(recordId).then(seal => {
      if (cancelled || !seal) return
      void recordPackageExport({
        recordId,
        packageSealId: seal.id,
        exportedById: user.supabaseId ?? user.id,
        exportScope: 'package_preview',
        recipientType: user.role,
        recipientIdentity: user.supabaseId ?? user.id,
        exportMethod: 'package_preview_view',
        destination: undefined,
        exportHash: undefined,
        exportedAt: new Date().toISOString(),
        metadata: {
          method: 'package_preview_view',
        },
      })
    })
    return () => {
      cancelled = true
    }
  }, [recordId, user])

  const refreshDeficienciesAndVersions = useCallback(() => {
    if (!recordId) return
    getDeficienciesByRecordIdAsync(recordId).then(setDeficiencies)
    getVersionsByRecordIdAsync(recordId).then(setVersions)
  }, [recordId])

  useEffect(() => {
    refreshDeficienciesAndVersions()
  }, [refreshDeficienciesAndVersions])

  const handlePrint = async () => {
    if (recordId && user) {
      const seal = await getPackageSeal(recordId)
      if (seal) {
        await recordPackageExport({
          recordId,
          packageSealId: seal.id,
          exportedById: user.supabaseId ?? user.id,
          exportScope: 'package_export',
          recipientType: user.role,
          recipientIdentity: user.supabaseId ?? user.id,
          exportMethod: 'pdf_print',
          destination: undefined,
          exportHash: undefined,
          exportedAt: new Date().toISOString(),
          metadata: {
            method: 'pdf_print',
          },
        })
      }
    }
    window.print()
  }

  const navbarRole = user?.role === 'builder' || user?.role === 'inspector' || user?.role === 'auditor'
    ? user.role
    : 'landing'

  if (!recordId) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar role={navbarRole} dark />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <p className="text-muted">No record specified. Open a package from the vault.</p>
          <Link href="/vault" className="text-flame font-semibold mt-2 inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Vault
          </Link>
        </div>
      </div>
    )
  }

  if (record === undefined) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-flame/30 border-t-flame rounded-full animate-spin" />
      </div>
    )
  }
  if (!record) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar role={navbarRole} dark />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <p className="text-muted">Record not found. It may be from another device or an older vault snapshot.</p>
          <Link href="/vault" className="text-flame font-semibold mt-2 inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Vault
          </Link>
        </div>
      </div>
    )
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-surface">
        <Navbar role={navbarRole} dark />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <p className="text-muted">
            No authority package available for this record. Package generation requires structured evidence (saved when the inspection was sealed).
          </p>
          <Link href="/vault" className="text-flame font-semibold mt-2 inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Vault
          </Link>
        </div>
      </div>
    )
  }

  const { cover, complianceSummary, evidenceIndex, inspectorDeclaration } = pkg
  const dateFormatted = new Date(cover.submissionDate).toLocaleString('en-CA', {
    timeZone: 'America/Vancouver',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const evidencePhotos  = record.evidenceItems.filter(e => e.kind === 'photo').length
  const evidenceVideos  = record.evidenceItems.filter(e => e.kind === 'video').length
  const evidenceNotes   = record.evidenceItems.filter(e => e.kind === 'voice_note').length
  const evidenceHasGeo  = record.evidenceItems.some(e => e.geo != null)
  const captureTimes    = record.evidenceItems.map(e => e.captureTimestamp).filter(Boolean).sort()
  const firstCapture    = captureTimes[0]
  const lastCapture     = captureTimes[captureTimes.length - 1]
  const overallResult   = record.result === 'pass' ? 'PASS' : record.result === 'fail' ? 'FAIL' : 'STOPPED'

  return (
    <div className="min-h-screen bg-surface">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 2cm;
          }

          /* ── Hide all screen chrome ── */
          nav,
          .print\\:hidden,
          button,
          a[href] {
            display: none !important;
          }

          /* ── White page, black text ── */
          html, body {
            background: white !important;
            color: black !important;
            font-size: 11pt;
            font-family: -apple-system, Arial, Helvetica, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* ── Strip dark backgrounds from all elements ── */
          * {
            background: transparent !important;
            color: black !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }

          /* ── Re-apply light borders ── */
          .card-dark,
          section {
            border: 1px solid #cccccc !important;
            border-radius: 6pt !important;
            margin-bottom: 12pt !important;
            padding: 14pt !important;
          }

          /* ── Show print-only elements (override Tailwind hidden) ── */
          .siteline-print-header {
            display: flex !important;
            align-items: flex-start;
            justify-content: space-between;
            border-bottom: 2pt solid black;
            padding-bottom: 10pt;
            margin-bottom: 14pt;
          }

          .siteline-print-footer {
            display: block !important;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            font-size: 7.5pt;
            color: #555555 !important;
            border-top: 0.5pt solid #999999;
            padding-top: 5pt;
            text-align: center;
            background: white !important;
          }

          .siteline-print-cover {
            display: flex !important;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 240mm;
            text-align: center;
            page-break-after: always;
            break-after: page;
            border: none !important;
            padding: 0 !important;
          }

          /* ── Page breaks ── */
          .siteline-section-break {
            page-break-before: always;
            break-before: page;
          }

          .siteline-appendix-break {
            page-break-before: always;
            break-before: page;
          }

          /* ── Avoid breaks inside rows and items ── */
          tr, li {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* ── Typography ── */
          h2 {
            font-size: 10pt;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #555555 !important;
            margin-bottom: 8pt;
          }

          /* ── Table ── */
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
          }

          th {
            font-weight: 700;
            border-bottom: 1pt solid #999999;
            padding: 5pt 6pt;
            text-align: left;
            color: #444444 !important;
          }

          td {
            padding: 5pt 6pt;
            border-bottom: 0.5pt solid #e5e5e5;
            vertical-align: top;
          }

          /* ── Muted text colour ── */
          .text-muted, .text-subtle {
            color: #666666 !important;
          }

          /* ── Links ── */
          a {
            color: black !important;
            text-decoration: none;
          }

          /* ── Cert ref badge on cover ── */
          .sl-cert-badge {
            display: inline-block;
            border: 1.5pt solid black;
            border-radius: 4pt;
            padding: 4pt 10pt;
            font-family: monospace;
            font-weight: 900;
            font-size: 14pt;
            letter-spacing: 0.05em;
            margin: 12pt 0;
          }

          .sl-sealed-badge {
            display: inline-block;
            border: 2pt solid black;
            border-radius: 3pt;
            padding: 3pt 10pt;
            font-size: 9pt;
            font-weight: 900;
            letter-spacing: 0.2em;
            text-transform: uppercase;
          }

          /* ── Result colours (override * rule) ── */
          .sl-pass { color: #16a34a !important; font-weight: 700; }
          .sl-fail { color: #dc2626 !important; font-weight: 700; }
          .sl-na   { color: #9ca3af !important; }

          /* ── Result badge on cover ── */
          .sl-result-badge {
            display: inline-block;
            border: 2pt solid currentColor;
            border-radius: 3pt;
            padding: 3pt 10pt;
            font-size: 12pt;
            font-weight: 900;
            letter-spacing: 0.15em;
            margin-top: 10pt;
          }
        }
      `}</style>
      <Navbar role={navbarRole} dark />

      {/* Screen-only: back + print */}
      <div className="print:hidden max-w-4xl mx-auto px-4 py-4 flex items-center justify-between border-b border-white/8">
        <Link href="/vault" className="text-muted hover:text-ink inline-flex items-center gap-1 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Vault
        </Link>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-flame text-white font-bold py-2.5 px-4 rounded-xl text-sm hover:opacity-90"
        >
          <Printer className="w-4 h-4" /> Export as PDF
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 print:py-2">

        {/* Print letterhead — hidden on screen, shown at top of first printed page */}
        <div className="siteline-print-header hidden">
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontWeight: 900, fontSize: '14pt', letterSpacing: '0.02em' }}>Vero</div>
              <div style={{ fontSize: '8pt', color: '#555555', marginTop: '2pt' }}>
                Inspection Compliance Platform · getvero.ca
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '8pt', color: '#555555' }}>
              <div style={{ fontWeight: 700, color: '#111111' }}>Inspection Submission Package</div>
              {cover.permitNumber && (
                <div>Permit No. <strong>{cover.permitNumber}</strong></div>
              )}
              <div>{cover.projectAddress}</div>
              <div>Generated {new Date(pkg.generatedAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
        </div>

        {/* Print footer — fixed at bottom of every page */}
        <div className="siteline-print-footer hidden">
          Vero Field Inspection Report
          {inspectorDeclaration?.certRef ? ` · Ref: ${inspectorDeclaration.certRef}` : ''}
          {cover.permitNumber ? ` · Permit ${cover.permitNumber}` : ''}
          {' · '}Generated {new Date(pkg.generatedAt).toLocaleDateString('en-CA')}
          {' · '}Not an official submission until received by the authority
        </div>

        {/* Print-only cover page — full page, breaks before data sections */}
        <div className="siteline-print-cover hidden">
          {/* Branding */}
          <div style={{ marginBottom: '32pt' }}>
            <div style={{ fontWeight: 900, fontSize: '22pt', letterSpacing: '0.03em' }}>Vero</div>
            <div style={{ fontSize: '9pt', color: '#555555', marginTop: '3pt' }}>
              Inspection Compliance Platform · getvero.ca
            </div>
          </div>

          {/* Title */}
          <div style={{ fontSize: '18pt', fontWeight: 900, marginBottom: '6pt' }}>
            Vero Stage Inspection Record
          </div>
          <div style={{ fontSize: '10pt', color: '#555555', marginBottom: '24pt' }}>
            Certified Field Review Report
          </div>

          {/* Sealed badge */}
          <div className="sl-sealed-badge" style={{ marginBottom: '10pt' }}>Sealed</div>

          {/* Cert ref */}
          {inspectorDeclaration?.certRef && (
            <div className="sl-cert-badge">{inspectorDeclaration.certRef}</div>
          )}

          {/* Result */}
          <div className={`sl-result-badge ${record.result === 'pass' ? 'sl-pass' : record.result === 'fail' ? 'sl-fail' : ''}`}>
            {record.result === 'pass' ? 'PASS' : record.result === 'fail' ? 'FAIL' : 'STOPPED'}
          </div>

          {/* Project details */}
          <div style={{ marginTop: '32pt', width: '100%', maxWidth: '340pt', textAlign: 'left', borderTop: '1pt solid #cccccc', paddingTop: '16pt' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
              <tbody>
                <tr>
                  <td style={{ color: '#666666', paddingBottom: '7pt', width: '120pt', verticalAlign: 'top' }}>Project</td>
                  <td style={{ fontWeight: 700, paddingBottom: '7pt' }}>{cover.projectName}</td>
                </tr>
                <tr>
                  <td style={{ color: '#666666', paddingBottom: '7pt', verticalAlign: 'top' }}>Address</td>
                  <td style={{ paddingBottom: '7pt' }}>{cover.projectAddress}</td>
                </tr>
                {cover.permitNumber && (
                  <tr>
                    <td style={{ color: '#666666', paddingBottom: '7pt', verticalAlign: 'top' }}>Permit No.</td>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', paddingBottom: '7pt' }}>{cover.permitNumber}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ color: '#666666', paddingBottom: '7pt', verticalAlign: 'top' }}>Jurisdiction</td>
                  <td style={{ paddingBottom: '7pt' }}>British Columbia</td>
                </tr>
                <tr>
                  <td style={{ color: '#666666', paddingBottom: '7pt', verticalAlign: 'top' }}>Stage</td>
                  <td style={{ paddingBottom: '7pt' }}>{cover.stageName}</td>
                </tr>
                {record.discipline && (
                  <tr>
                    <td style={{ color: '#666666', paddingBottom: '7pt', verticalAlign: 'top' }}>Discipline</td>
                    <td style={{ paddingBottom: '7pt', textTransform: 'capitalize' }}>{record.discipline}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ color: '#666666', paddingBottom: '7pt', verticalAlign: 'top' }}>Inspector</td>
                  <td style={{ fontWeight: 700, paddingBottom: '7pt' }}>
                    {inspectorDeclaration?.inspectorName ?? cover.preparedBy}
                    {inspectorDeclaration?.licenseNumber && (
                      <span style={{ fontWeight: 400, color: '#555555', marginLeft: '6pt', fontFamily: 'monospace' }}>
                        {inspectorDeclaration.licenseNumber}
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ color: '#666666', verticalAlign: 'top' }}>Submitted</td>
                  <td>{new Date(cover.submissionDate).toLocaleString('en-CA', {
                    timeZone: 'America/Vancouver',
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Authority notice */}
          <div style={{ marginTop: '32pt', fontSize: '8pt', color: '#888888', maxWidth: '320pt', lineHeight: '1.5' }}>
            This package was generated by Vero and sealed by the inspector of record. It is not an official submission until received and accepted by the relevant authority having jurisdiction.
          </div>
        </div>

        {/* Screen title — hidden in print */}
        <div className="mb-6 print:hidden">
          <h1 className="font-black text-ink text-xl flex items-center gap-2">
            <FileText className="w-5 h-5 text-flame" />
            Stage Inspection Record
          </h1>
          <p className="text-xs text-subtle mt-1">
            Certified field review report · {record.certRef}
          </p>
        </div>

        {/* S1 — Inspection Summary */}
        <section className="siteline-section-break card-dark rounded-2xl p-5 mb-4 print:border print:rounded-lg">
          <h2 className="label-mono mb-4">Section 1 — Inspection Summary</h2>
          <div className="grid gap-3 text-sm">
            {cover.permitNumber && (
              <div className="flex gap-3 pb-3 mb-1 border-b border-white/10">
                <span className="text-muted w-40 shrink-0 font-semibold">Permit No.</span>
                <span className="font-mono font-bold text-ink tracking-wide">{cover.permitNumber}</span>
              </div>
            )}
            <div className="flex gap-3">
              <span className="text-muted w-40 shrink-0">Project</span>
              <span className="text-ink font-semibold">{cover.projectName}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted w-40 shrink-0">Site Address</span>
              <span className="text-ink">{cover.projectAddress}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted w-40 shrink-0">Jurisdiction</span>
              <span className="text-ink">British Columbia</span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted w-40 shrink-0">Stage</span>
              <span className="text-ink">{cover.stageName}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted w-40 shrink-0">Scope</span>
              <span className="text-ink">{cover.stageName} field review — standard trade inspection</span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted w-40 shrink-0">Inspection Date</span>
              <span className="text-ink">{dateFormatted}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted w-40 shrink-0">Inspection Type</span>
              <span className="text-ink">Initial Inspection</span>
            </div>
            <div className="flex gap-3 items-center">
              <span className="text-muted w-40 shrink-0">Final Outcome</span>
              <span className={`font-black text-base tracking-wide ${
                record.result === 'pass' ? 'text-success-green sl-pass' :
                record.result === 'fail' ? 'text-fail-red sl-fail' : 'text-muted'
              }`}>{overallResult}</span>
            </div>
          </div>
        </section>

        {/* S2 — Parties and Roles */}
        <section className="card-dark rounded-2xl p-5 mb-4 print:border print:rounded-lg">
          <h2 className="label-mono mb-4">Section 2 — Parties and Roles</h2>
          <div className="grid gap-3 text-sm">
            <div className="flex gap-3">
              <span className="text-muted w-40 shrink-0">Inspector</span>
              <span className="text-ink font-semibold">{inspectorDeclaration?.inspectorName ?? record.inspectorName}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted w-40 shrink-0">Licence No.</span>
              <span className="font-mono text-ink">{inspectorDeclaration?.licenseNumber ?? record.inspectorLicense}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted w-40 shrink-0">Registration Body</span>
              <span className="text-ink">Vero Verified</span>
            </div>
            {(record.discipline || inspectorDeclaration?.discipline) && (
              <div className="flex gap-3">
                <span className="text-muted w-40 shrink-0">Discipline</span>
                <span className="text-ink capitalize">{record.discipline ?? inspectorDeclaration?.discipline}</span>
              </div>
            )}
            <div className="flex gap-3">
              <span className="text-muted w-40 shrink-0">Certificate Ref</span>
              <span className="font-mono text-ink font-bold">{record.certRef}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted w-40 shrink-0">Job Reference</span>
              <span className="font-mono text-muted text-xs">{record.jobRef ?? '—'}</span>
            </div>
          </div>
        </section>

        {/* S3 — Checklist Results */}
        <section className="siteline-section-break card-dark rounded-2xl p-5 mb-4 print:border print:rounded-lg">
          <h2 className="label-mono mb-4">
            Section 3 — Checklist Results
            <span className="ml-2 text-xs font-normal normal-case tracking-normal text-muted">
              {complianceSummary.passed} pass · {complianceSummary.failed} fail · {complianceSummary.totalItems - complianceSummary.passed - complianceSummary.failed} N/A
            </span>
          </h2>
          {!record.checklistResults?.length ? (
            <p className="text-xs text-subtle">No checklist results recorded for this inspection.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="py-2 pr-2 text-muted font-semibold w-8">#</th>
                    <th className="py-2 pr-4 text-muted font-semibold">Item</th>
                    <th className="py-2 pr-4 text-muted font-semibold w-16">Result</th>
                    <th className="py-2 text-muted font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {record.checklistResults.map((item, i) => (
                    <tr key={item.itemId} className="border-b border-white/5">
                      <td className="py-2 pr-2 text-muted font-mono text-xs">{String(i + 1).padStart(2, '0')}</td>
                      <td className="py-2 pr-4 text-ink">{item.label}</td>
                      <td className={`py-2 pr-4 font-black text-xs uppercase tracking-wide ${
                        item.result === 'pass' ? 'text-success-green sl-pass' :
                        item.result === 'fail' ? 'text-fail-red sl-fail' :
                        item.result === 'na'   ? 'text-muted sl-na' : 'text-subtle'
                      }`}>
                        {item.result === 'pass' ? 'PASS' :
                         item.result === 'fail' ? 'FAIL' :
                         item.result === 'na'   ? 'N/A'  : item.result.toUpperCase()}
                      </td>
                      <td className="py-2 text-muted text-xs">{item.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* S4 — Evidence Summary */}
        <section className="card-dark rounded-2xl p-5 mb-4 print:border print:rounded-lg">
          <h2 className="label-mono mb-4">Section 4 — Evidence Summary</h2>
          <div className="grid grid-cols-3 gap-4 text-sm mb-4">
            <div>
              <div className="text-muted text-xs mb-0.5">Photos</div>
              <div className="font-black text-ink text-2xl">{evidencePhotos}</div>
            </div>
            <div>
              <div className="text-muted text-xs mb-0.5">Videos</div>
              <div className="font-black text-ink text-2xl">{evidenceVideos}</div>
            </div>
            <div>
              <div className="text-muted text-xs mb-0.5">Notes</div>
              <div className="font-black text-ink text-2xl">{evidenceNotes}</div>
            </div>
          </div>
          <div className="grid gap-3 text-sm border-t border-white/10 pt-3">
            <div className="flex gap-3">
              <span className="text-muted w-40 shrink-0">Geolocation Captured</span>
              <span className={evidenceHasGeo ? 'text-success-green sl-pass font-semibold' : 'text-muted'}>
                {evidenceHasGeo ? 'Yes' : 'No'}
              </span>
            </div>
            {firstCapture && (
              <div className="flex gap-3">
                <span className="text-muted w-40 shrink-0">First Upload</span>
                <span className="text-ink">{new Date(firstCapture).toLocaleString('en-CA', {
                  timeZone: 'America/Vancouver', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}</span>
              </div>
            )}
            {lastCapture && lastCapture !== firstCapture && (
              <div className="flex gap-3">
                <span className="text-muted w-40 shrink-0">Last Upload</span>
                <span className="text-ink">{new Date(lastCapture).toLocaleString('en-CA', {
                  timeZone: 'America/Vancouver', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}</span>
              </div>
            )}
          </div>
        </section>

        {/* S5 — Evidence Index */}
        <section className="siteline-appendix-break card-dark rounded-2xl p-5 mb-4 print:border print:rounded-lg">
          <h2 className="label-mono mb-3">Section 5 — Evidence Index</h2>
          <p className="text-xs text-subtle mb-4">
            Geo-located, time-stamped evidence collected during field review. {evidenceIndex.length} item(s).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="py-2 pr-3 text-muted font-semibold">Ref</th>
                  <th className="py-2 pr-3 text-muted font-semibold">Type</th>
                  <th className="py-2 pr-3 text-muted font-semibold">Checklist Item</th>
                  <th className="py-2 pr-3 text-muted font-semibold">Timestamp</th>
                  <th className="py-2 pr-3 text-muted font-semibold">GPS</th>
                  <th className="py-2 text-muted font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {evidenceIndex.map((entry) => (
                  <tr key={entry.evidenceItemId} className="border-b border-white/5">
                    <td className="py-2 pr-3 font-mono text-ink text-xs">{entry.shortRef}</td>
                    <td className="py-2 pr-3 text-ink capitalize">{entry.kind}</td>
                    <td className="py-2 pr-3 text-muted text-xs">
                      {entry.checklistItemRef ?? '—'}{entry.stageRef != null ? ` · Stage ${entry.stageRef}` : ''}
                    </td>
                    <td className="py-2 pr-3 text-muted text-xs whitespace-nowrap">
                      {entry.captureTimestamp
                        ? new Date(entry.captureTimestamp).toLocaleString('en-CA', {
                            timeZone: 'America/Vancouver',
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="py-2 pr-3 font-mono text-muted text-xs whitespace-nowrap">
                      {entry.lat != null && entry.lng != null
                        ? `${entry.lat.toFixed(5)}° N, ${entry.lng.toFixed(5)}° W`
                        : <span className="text-subtle italic">Not captured</span>}
                    </td>
                    <td className="py-2 text-muted text-xs max-w-[200px]">
                      {entry.notes ?? entry.caption ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* S6 — Inspector Declaration */}
        {inspectorDeclaration && (
          <section className="siteline-section-break card-dark rounded-2xl p-5 mb-4 print:border print:rounded-lg">
            <h2 className="label-mono mb-4">Section 6 — Inspector Declaration</h2>
            <p className="text-sm text-ink leading-relaxed mb-5 italic">
              &ldquo;{inspectorDeclaration.statement}&rdquo;
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div className="flex gap-3">
                <span className="text-muted w-36 shrink-0">Inspector</span>
                <span className="font-semibold text-ink">{inspectorDeclaration.inspectorName}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-muted w-36 shrink-0">Licence No.</span>
                <span className="font-mono text-ink">{inspectorDeclaration.licenseNumber}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-muted w-36 shrink-0">Discipline</span>
                <span className="text-ink">{inspectorDeclaration.discipline || '—'}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-muted w-36 shrink-0">Sealed</span>
                <span className="text-ink">
                  {new Date(inspectorDeclaration.inspectionDate).toLocaleString('en-CA', {
                    timeZone: 'America/Vancouver',
                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex gap-3">
                <span className="text-muted w-36 shrink-0">Digital Seal Ref</span>
                <span className="font-mono text-ink font-bold">{inspectorDeclaration.certRef}</span>
              </div>
            </div>
            {/* Signature line — print only */}
            <div className="print:block hidden mt-8 pt-5 border-t border-black/10">
              <div className="flex items-end gap-16">
                <div>
                  <div className="w-56 border-b border-black mb-1 h-10" />
                  <p style={{ fontSize: '8pt', color: '#666666' }}>Inspector Signature</p>
                </div>
                <div>
                  <div className="w-36 border-b border-black mb-1 h-10" />
                  <p style={{ fontSize: '8pt', color: '#666666' }}>Date</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* S7 — Archive Metadata */}
        <section className="card-dark rounded-2xl p-5 mb-5 print:border print:rounded-lg">
          <h2 className="label-mono mb-4">Section 7 — Archive Metadata</h2>
          <div className="grid gap-3 text-sm">
            <div className="flex gap-3">
              <span className="text-muted w-40 shrink-0">Record ID</span>
              <span className="font-mono text-muted text-xs">{record.id}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted w-40 shrink-0">Certificate Reference</span>
              <span className="font-mono text-ink font-bold">{record.certRef}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted w-40 shrink-0">Sealed At</span>
              <span className="text-ink">{new Date(record.completedAt).toLocaleString('en-CA', {
                timeZone: 'America/Vancouver',
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted w-40 shrink-0">Version</span>
              <span className="text-ink">1</span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted w-40 shrink-0">Retention Period</span>
              <span className="text-ink">3 years from seal date</span>
            </div>
          </div>
        </section>

        {/* Deficiencies & resubmission — runtime workflow; not printed */}
        <section className="print:hidden card-dark rounded-2xl p-5 mb-5">
          <h2 className="label-mono mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-flame" />
            Deficiencies & resubmission
          </h2>
          <p className="text-xs text-subtle mb-4">
            Record reviewer comments and responses. Create resubmission versions when corrections are submitted. Stored locally; ready for authority workflow when configured.
          </p>

          {/* Version history */}
          <div className="mb-5">
            <div className="text-xs font-semibold text-muted mb-2">Version history</div>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-sm text-ink">
                <span className="font-mono bg-raised px-2 py-0.5 rounded">v1</span>
                Original
              </li>
              {versions.map((v) => (
                <li key={v.id} className="flex items-center gap-2 text-sm text-muted">
                  <span className="font-mono bg-raised px-2 py-0.5 rounded">v{v.version}</span>
                  {v.note ?? 'Resubmission'} · {new Date(v.createdAt).toLocaleDateString('en-CA')}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                addResubmissionVersion(recordId, 'Resubmission after deficiencies')
                refreshDeficienciesAndVersions()
              }}
              className="mt-2 text-sm font-semibold text-flame hover:underline"
            >
              + Create resubmission version
            </button>
          </div>

          {/* Add deficiency */}
          <div className="mb-5">
            <div className="text-xs font-semibold text-muted mb-2">Add deficiency</div>
            <div className="space-y-2">
              <textarea
                value={addComment}
                onChange={(e) => setAddComment(e.target.value)}
                placeholder="Reviewer comment (e.g. Missing pressure test evidence, Photo unclear at rough-in)"
                className="w-full bg-panel border border-white/10 rounded-xl px-3 py-2 text-sm text-ink placeholder-subtle focus:outline-none focus:border-flame resize-y min-h-[80px]"
                rows={3}
              />
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={addChecklistRef}
                  onChange={(e) => setAddChecklistRef(e.target.value)}
                  placeholder="Checklist item ref (e.g. s2-1)"
                  className="flex-1 min-w-[120px] bg-panel border border-white/10 rounded-xl px-3 py-2 text-sm text-ink placeholder-subtle focus:outline-none focus:border-flame"
                />
                <select
                  value={addEvidenceRef}
                  onChange={(e) => setAddEvidenceRef(e.target.value)}
                  className="bg-panel border border-white/10 rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-flame"
                >
                  <option value="">Evidence ref (optional)</option>
                  {pkg?.evidenceIndex.map((e) => (
                    <option key={e.evidenceItemId} value={e.shortRef}>
                      {e.shortRef} — {e.kind}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={!addComment.trim()}
                onClick={() => {
                  addDeficiency({
                    recordId,
                    reviewerComment: addComment.trim(),
                    checklistItemRef: addChecklistRef.trim() || undefined,
                    evidenceItemRef: addEvidenceRef || undefined,
                    status: 'open',
                  })
                  setAddComment('')
                  setAddChecklistRef('')
                  setAddEvidenceRef('')
                  refreshDeficienciesAndVersions()
                }}
                className="flex items-center gap-1.5 bg-flame text-white font-bold py-2 px-4 rounded-xl text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" /> Add deficiency
              </button>
            </div>
          </div>

          {/* Deficiencies list */}
          <div>
            <div className="text-xs font-semibold text-muted mb-2">Deficiencies ({deficiencies.length})</div>
            {deficiencies.length === 0 ? (
              <p className="text-sm text-subtle">No deficiencies recorded for this package.</p>
            ) : (
              <ul className="space-y-4">
                {deficiencies.map((d) => (
                  <li key={d.id} className="border border-white/10 rounded-xl p-4 bg-panel">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">Reviewer comment</p>
                        <p className="text-sm text-muted mt-0.5">{d.reviewerComment}</p>
                        {(d.checklistItemRef || d.evidenceItemRef) && (
                          <p className="text-[10px] text-subtle mt-1">
                            Ref: {[d.checklistItemRef, d.evidenceItemRef].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded ${
                          d.status === 'resolved'
                            ? 'bg-success-green/20 text-success-green'
                            : d.status === 'responded'
                              ? 'bg-electric/20 text-electric'
                              : 'bg-fail-red/20 text-fail-red'
                        }`}
                      >
                        {d.status}
                      </span>
                    </div>
                    {d.response && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-[10px] font-semibold text-muted">Response</p>
                        <p className="text-sm text-ink">{d.response}</p>
                        {d.resolvedInVersion != null && (
                          <p className="text-[10px] text-subtle mt-1">Resolved in version {d.resolvedInVersion}</p>
                        )}
                      </div>
                    )}
                    {d.status === 'open' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <input
                          type="text"
                          value={respondingId === d.id ? responseText : ''}
                          onChange={(e) => setResponseText(e.target.value)}
                          onFocus={() => { setRespondingId(d.id); setResponseText(d.response ?? '') }}
                          placeholder="Enter response"
                          className="flex-1 min-w-[160px] bg-raised border border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-flame"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (respondingId === d.id && responseText.trim()) {
                              updateDeficiency(d.id, { response: responseText.trim(), status: 'responded' })
                              setRespondingId(null)
                              setResponseText('')
                              refreshDeficienciesAndVersions()
                            }
                          }}
                          className="flex items-center gap-1 text-xs font-bold text-electric hover:underline"
                        >
                          <Send className="w-3 h-3" /> Mark responded
                        </button>
                      </div>
                    )}
                    {d.status === 'responded' && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted">Resolved in version:</span>
                        <select
                          value={resolvingId === d.id ? (resolvedVersion ?? '') : ''}
                          onChange={(e) => {
                            setResolvingId(d.id)
                            setResolvedVersion(e.target.value ? Number(e.target.value) : undefined)
                          }}
                          className="bg-raised border border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-flame"
                        >
                          <option value="">—</option>
                          {[1, ...versions.map((v) => v.version)].map((v) => (
                            <option key={v} value={v}>
                              v{v}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            if (resolvingId === d.id && resolvedVersion != null) {
                              updateDeficiency(d.id, { status: 'resolved', resolvedInVersion: resolvedVersion })
                              setResolvingId(null)
                              setResolvedVersion(undefined)
                              refreshDeficienciesAndVersions()
                            }
                          }}
                          className="flex items-center gap-1 text-xs font-bold text-success-green hover:underline"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Mark resolved
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <p className="text-[10px] text-subtle print:mt-4">
          Authority Package Preview — generated from persisted inspection evidence. Not an official submission until submitted through the authority&apos;s process.
        </p>
      </div>
    </div>
  )
}
