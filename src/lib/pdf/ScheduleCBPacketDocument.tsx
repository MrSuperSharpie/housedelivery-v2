/* eslint-disable @next/next/no-head-element, @next/next/no-img-element */
import React from 'react'
import { chunkAppendixEntries } from './scheduleCBPacketHelpers'
import type { ScheduleCBPacketData } from './scheduleCBPacketTypes'

const PRINT_CSS = `
  @page {
    size: Letter;
    margin: 0.56in;
  }

  :root {
    --ink: #161616;
    --muted-ink: #505050;
    --line: #bdb7ab;
    --line-strong: #7d776d;
    --paper: #ffffff;
    --paper-alt: #f7f5f1;
    --paper-soft: #fbfaf8;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    background: var(--paper);
    color: #111827;
    font-family: "Times New Roman", Georgia, serif;
    font-size: 11.5px;
    line-height: 1.42;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  body {
    padding: 0;
  }

  p,
  li {
    orphans: 3;
    widows: 3;
  }

  .packet-page {
    min-height: calc(11in - 1.12in);
    display: flex;
    flex-direction: column;
    background: var(--paper);
  }

  .page-break {
    break-before: page;
    page-break-before: always;
  }

  .packet-shell {
    min-height: calc(11in - 1.12in);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--line-strong);
  }

  .brand-stack {
    min-width: 0;
    flex: 1 1 auto;
  }

  .brand-mark {
    display: block;
    width: 124px;
    height: auto;
    margin-bottom: 8px;
  }

  .eyebrow {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--muted-ink);
  }

  .document-title {
    margin: 6px 0 0;
    font-size: 24px;
    line-height: 1.1;
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  .document-subtitle {
    margin-top: 8px;
    max-width: 38rem;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    line-height: 1.5;
    font-weight: 500;
    color: var(--muted-ink);
  }

  .scope-block {
    width: 210px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    background: var(--paper-soft);
  }

  .scope-label {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--muted-ink);
  }

  .scope-value {
    margin-top: 7px;
  }

  .cover-grid,
  .trail-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.26fr) minmax(250px, 0.74fr);
    gap: 14px;
    align-items: start;
  }

  .summary-card,
  .audit-card,
  .appendix-card,
  .formal-panel {
    border: 1px solid var(--line);
    background: var(--paper);
  }

  .summary-card {
    padding: 18px 20px 16px;
  }

  .summary-intro {
    margin: 0 0 16px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    line-height: 1.55;
    font-weight: 500;
    color: var(--muted-ink);
  }

  .project-title {
    margin: 0;
    font-size: 28px;
    line-height: 1.08;
    overflow-wrap: anywhere;
  }

  .summary-band {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin-top: 16px;
  }

  .summary-band-cell {
    padding: 10px 12px;
    border: 1px solid var(--line);
    background: var(--paper-soft);
  }

  .summary-band-label {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--muted-ink);
  }

  .summary-band-value {
    margin-top: 6px;
    font-size: 14px;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .summary-table,
  .ledger-table,
  .appendix-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .summary-table {
    margin-top: 14px;
  }

  .summary-table td,
  .ledger-table td,
  .appendix-table td {
    border-top: 1px solid #ddd8ce;
    padding: 8px 0;
    vertical-align: top;
  }

  .summary-table td:first-child,
  .ledger-table td:first-child,
  .appendix-table td:first-child {
    width: 34%;
    padding-right: 12px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--muted-ink);
  }

  .summary-table td:last-child,
  .ledger-table td:last-child,
  .appendix-table td:last-child {
    font-size: 12px;
    color: var(--ink);
    overflow-wrap: anywhere;
  }

  .formal-panel {
    padding: 12px;
    background: var(--paper-soft);
  }

  .formal-panel-inner {
    border: 3px double var(--line-strong);
    padding: 18px 16px;
    background: var(--paper);
    text-align: center;
  }

  .formal-panel-label {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9px;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--muted-ink);
  }

  .formal-panel-status {
    margin-top: 14px;
    font-size: 23px;
    line-height: 1.18;
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .formal-panel-rule {
    width: 48px;
    height: 1px;
    margin: 14px auto 0;
    background: var(--line-strong);
  }

  .formal-panel-meta {
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid var(--line);
    display: grid;
    gap: 10px;
    text-align: left;
  }

  .formal-panel-meta-row {
    display: grid;
    gap: 4px;
  }

  .formal-panel-meta-row-label {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--muted-ink);
  }

  .formal-panel-meta-row-value {
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .status-badge {
    margin-top: 14px;
    padding: 12px 10px;
    border: 2px solid #166534;
    background: #f0fdf4;
    font-family: Arial, Helvetica, sans-serif;
    text-align: center;
  }

  .status-badge.review-required {
    border-color: #991b1b;
    background: #fef2f2;
  }

  .status-badge.incomplete {
    border-color: #854d0e;
    background: #fffbeb;
  }

  .status-badge.neutral {
    border-color: #6b7280;
    background: #f9fafb;
  }

  .status-badge-kicker {
    font-size: 9px;
    line-height: 1.2;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    font-weight: 700;
    color: #14532d;
  }

  .status-badge.review-required .status-badge-kicker {
    color: #7f1d1d;
  }

  .status-badge.incomplete .status-badge-kicker {
    color: #713f12;
  }

  .status-badge.neutral .status-badge-kicker {
    color: #374151;
  }

  .status-badge-outcome {
    margin-top: 5px;
    font-size: 17px;
    line-height: 1.12;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 800;
    color: #14532d;
  }

  .status-badge-result-label {
    margin-top: 8px;
    font-size: 9px;
    line-height: 1.2;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-weight: 700;
    color: #14532d;
  }

  .status-badge-result-label + .status-badge-outcome {
    margin-top: 3px;
    font-size: 20px;
  }

  .status-badge.review-required .status-badge-outcome {
    color: #7f1d1d;
  }

  .status-badge.incomplete .status-badge-outcome {
    color: #713f12;
  }

  .status-badge.neutral .status-badge-outcome {
    color: #374151;
  }

  .status-badge-detail {
    margin-top: 7px;
    font-size: 10px;
    line-height: 1.35;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 700;
    color: #1f2937;
  }

  .official-note {
    margin-top: 14px;
    padding: 12px 14px;
    border-left: 3px solid var(--line-strong);
    background: var(--paper);
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5px;
    line-height: 1.55;
    font-weight: 500;
    color: var(--muted-ink);
  }

  .section-title {
    margin: 0;
    font-size: 22px;
    line-height: 1.12;
  }

  .section-kicker {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--muted-ink);
    margin-bottom: 7px;
  }

  .audit-card {
    padding: 14px 16px;
    background: var(--paper);
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .audit-card-title {
    margin: 0 0 10px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--muted-ink);
  }

  .audit-note {
    margin-top: 12px;
    padding: 12px 14px;
    border: 1px solid var(--line);
    background: var(--paper-alt);
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5px;
    line-height: 1.55;
    font-weight: 500;
    color: #3f3a32;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .signal-list {
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
  }

  .signal-list li {
    padding: 7px 0 0 16px;
    position: relative;
    border-top: 1px solid #e3dfd6;
  }

  .signal-list li::before {
    content: "";
    position: absolute;
    left: 0;
    top: 14px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #6a655d;
  }

  .appendix-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 18px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--line-strong);
  }

  .appendix-subtitle {
    margin-top: 8px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5px;
    font-weight: 500;
    color: var(--muted-ink);
  }

  .appendix-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    align-content: start;
  }

  .appendix-card {
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--paper);
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .appendix-image-frame {
    width: 100%;
    height: 168px;
    max-height: 168px;
    border: 1px solid var(--line);
    background: #f2f0eb;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .appendix-image {
    display: block;
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    object-position: center;
  }

  .appendix-placeholder {
    padding: 16px;
    text-align: center;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10px;
    color: var(--muted-ink);
  }

  .appendix-topline {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  .appendix-kicker {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--muted-ink);
  }

  .appendix-id {
    font-size: 10px;
  }

  .appendix-link {
    color: #FF5C00;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .appendix-image-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    overflow: hidden;
  }

  .appendix-caption {
    font-size: 13px;
    line-height: 1.35;
    min-height: 34px;
    overflow-wrap: anywhere;
  }

  .value-stack {
    display: grid;
    gap: 3px;
  }

  .secondary {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10px;
    font-weight: 500;
    color: var(--muted-ink);
  }

  .mono {
    font-family: "SFMono-Regular", "Cascadia Code", "Menlo", monospace;
    font-size: 10.5px;
    letter-spacing: 0.01em;
  }

  .page-footer {
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid var(--line);
    display: flex;
    justify-content: space-between;
    gap: 18px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9px;
    line-height: 1.45;
    color: var(--muted-ink);
  }

  .page-footer > div {
    min-width: 0;
    overflow-wrap: anywhere;
  }
`

function PageFooter({ data, label }: { data: ScheduleCBPacketData; label: string }) {
  return (
    <footer className="page-footer">
      <div>
        {label} · Verification ID <span className="mono">{data.summary.verificationId ?? 'Not assigned'}</span>
      </div>
      <div>
        Packet generated <span className="mono">{data.auditTrail.generatedAtIso}</span>
      </div>
    </footer>
  )
}

function formatItemCountLabel(count: number): string {
  return `${count} item${count === 1 ? '' : 's'}`
}

function buildCoverStatusBadge(data: ScheduleCBPacketData): {
  tone: 'passed' | 'review-required' | 'incomplete' | 'neutral'
  kicker: string
  resultLabel?: string
  outcome: string
  detail: string
} {
  const summary = data.checklistSummary

  if (!summary.hasData || summary.totalCount === 0) {
    return {
      tone: 'neutral',
      kicker: 'RECORD STATUS',
      outcome: 'CHECKLIST DATA NOT RECORDED',
      detail: 'NO CHECKLIST ITEMS RECORDED',
    }
  }

  if (
    data.summary.overallResult === 'pass' &&
    summary.passCount === summary.totalCount &&
    summary.failCount === 0 &&
    summary.pendingCount === 0 &&
    summary.naCount === 0
  ) {
    if (data.usesNamedInspectorPassWording) {
      return {
        tone: 'passed',
        kicker: '',
        resultLabel: 'NAMED INSPECTOR RESULT',
        outcome: 'PASS',
        detail: `${summary.passCount} OF ${summary.totalCount} VERO CHECKLIST ITEMS MARKED PASS`,
      }
    }

    return {
      tone: 'passed',
      kicker: 'STAGE COMPLETE',
      outcome: 'INSPECTION PASSED',
      detail: `${summary.passCount} OF ${summary.totalCount} ITEMS PASSED`,
    }
  }

  if (summary.failCount > 0 || data.summary.overallResult === 'fail') {
    return {
      tone: 'review-required',
      kicker: 'STAGE COMPLETE',
      outcome: 'INSPECTION REVIEW REQUIRED',
      detail: `${summary.passCount} PASSED · ${summary.failCount} FAILED (${formatItemCountLabel(summary.totalCount).toUpperCase()})`,
    }
  }

  if (summary.pendingCount > 0) {
    return {
      tone: 'incomplete',
      kicker: 'RECORD INCOMPLETE',
      outcome: 'ITEMS PENDING',
      detail: `${summary.pendingCount} PENDING (${formatItemCountLabel(summary.totalCount).toUpperCase()})`,
    }
  }

  return {
    tone: 'neutral',
    kicker: 'STAGE COMPLETE',
    outcome: 'INSPECTION RECORDED',
    detail: `${summary.passCount} PASSED · ${summary.naCount} N/A (${formatItemCountLabel(summary.totalCount).toUpperCase()})`,
  }
}

function CoverPage({ data }: { data: ScheduleCBPacketData }) {
  const statusBadge = buildCoverStatusBadge(data)
  const statusBadgeClassName = statusBadge.tone === 'passed'
    ? 'status-badge'
    : `status-badge ${statusBadge.tone}`

  return (
    <section className="packet-page">
      <div className="packet-shell">
        <header className="page-header">
          <div className="brand-stack">
            <img className="brand-mark" src={data.brandLogoSrc} alt="Vero Permit" />
            <div className="eyebrow">{data.coverEyebrow}</div>
            <h1 className="document-title">{data.documentTitle}</h1>
            <div className="document-subtitle">{data.coverSubtitle}</div>
          </div>

          <div className="scope-block">
            <div className="scope-label">Packet Template</div>
            <div className="scope-value mono">{data.templateVersion}</div>
          </div>
        </header>

        <div className="cover-grid">
          <article className="summary-card">
            <div className="section-kicker">Project Record</div>
            <h2 className="project-title">{data.project.name}</h2>
            <p className="summary-intro">
              {data.exportMode === 'authority_facing'
                ? 'This packet binds the statutory Schedule C-B form to its supporting audit trail and evidence appendix without altering the official legal template.'
                : 'Field inspection record and supporting evidence generated by the Vero platform from the inspector\'s field inputs.'}
            </p>

            <div className="summary-band">
              <div className="summary-band-cell">
                <div className="summary-band-label">Permit</div>
                <div className="summary-band-value">
                  {data.project.permitNumber
                    ? data.project.permitNumber
                    : data.exportMode === 'authority_facing' ? 'Pending confirmation' : '—'}
                </div>
              </div>
              <div className="summary-band-cell">
                <div className="summary-band-label">Stage Status</div>
                <div className="summary-band-value">{data.summary.stageStatusLabel}</div>
                <div className="secondary" style={{ marginTop: '3px', fontSize: '11px', fontWeight: 700 }}>
                  {data.summary.checklistScopeLabel}
                </div>
              </div>
              <div className="summary-band-cell">
                <div className="summary-band-label">Jurisdiction</div>
                <div className="summary-band-value">{data.project.jurisdictionName}</div>
              </div>
            </div>

            <table className="summary-table" aria-label="Cover summary metadata">
              <tbody>
                <tr>
                  <td>Project Address</td>
                  <td>
                    <div>{data.project.addressLine1}</div>
                    <div>{data.project.addressLine2}</div>
                  </td>
                </tr>
                <tr>
                  <td>Overlay Applied</td>
                  <td>{data.project.overlayLabel}</td>
                </tr>
                <tr>
                  <td>{data.exportMode === 'authority_facing' ? 'Inspector of Record' : 'Named Inspector'}</td>
                  <td>
                    <div>{data.inspector.name}</div>
                    {data.inspector.license ? <div>{data.inspector.license}</div> : null}
                    {data.inspector.discipline ? <div>{data.inspector.discipline}</div> : null}
                    {data.inspector.firmName ? <div>{data.inspector.firmName}</div> : null}
                  </td>
                </tr>
                <tr>
                  <td>Issued Timestamp</td>
                  <td>
                    <div>{data.auditTrail.exactTimestampDisplay}</div>
                    <div className="secondary mono">{data.auditTrail.exactTimestampIso}</div>
                  </td>
                </tr>
                <tr>
                  <td>Checklist Results</td>
                  <td>
                    {data.checklistSummary.hasData
                      ? `${data.checklistSummary.passCount} passed · ${data.checklistSummary.failCount} failed${data.checklistSummary.naCount > 0 ? ` · ${data.checklistSummary.naCount} N/A` : ''} (${data.checklistSummary.totalCount} items)`
                      : 'No checklist data recorded'}
                  </td>
                </tr>
                {data.documentCount > 0 ? (
                  <tr>
                    <td>Evidence Documents</td>
                    <td>{data.documentCount} document{data.documentCount !== 1 ? 's' : ''} attached</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </article>

          <aside>
            <div className="formal-panel">
              <div className="formal-panel-inner">
                <div className="formal-panel-label">{data.certificationStatusLabel}</div>
                <div className="formal-panel-status">{data.complianceBlockLabel}</div>
                <div className="formal-panel-rule" />
                <div className="formal-panel-meta">
                  {data.sealOutcomeLabel !== null ? (
                    <div className="formal-panel-meta-row">
                      <div className="formal-panel-meta-row-label">{data.sealOutcomeLabel}</div>
                      <div className="formal-panel-meta-row-value">{data.summary.overallResult}</div>
                    </div>
                  ) : null}
                  {data.exportMode === 'authority_facing' && data.summary.sealReference ? (
                    <div className="formal-panel-meta-row">
                      <div className="formal-panel-meta-row-label">Seal Reference</div>
                      <div className="formal-panel-meta-row-value mono">{data.summary.sealReference}</div>
                    </div>
                  ) : null}
                  {data.summary.verificationId ? (
                    <div className="formal-panel-meta-row">
                      <div className="formal-panel-meta-row-label">
                        {data.exportMode === 'authority_facing' ? 'Verification ID' : 'Platform Record ID'}
                      </div>
                      <div className="formal-panel-meta-row-value mono">{data.summary.verificationId}</div>
                    </div>
                  ) : null}
                </div>
                <div className={statusBadgeClassName} aria-label="Platform inspection outcome">
                  {statusBadge.kicker ? (
                    <div className="status-badge-kicker">{statusBadge.kicker}</div>
                  ) : null}
                  {statusBadge.resultLabel ? (
                    <div className="status-badge-result-label">{statusBadge.resultLabel}</div>
                  ) : null}
                  <div className="status-badge-outcome">{statusBadge.outcome}</div>
                  <div className="status-badge-detail">{statusBadge.detail}</div>
                </div>
              </div>
            </div>

            <div className="official-note">
              {data.disclaimerText}
            </div>
            {data.exportMode === 'platform_preview' ? (
              <div className="official-note" style={{ marginTop: '10px', borderLeft: '3px solid #b45309' }}>
                This is a platform-generated record, not a professionally sealed document. The named inspector submitted field inputs through the Vero platform; the platform has not independently verified the inspector&apos;s professional credentials or licence status.
              </div>
            ) : null}
          </aside>
        </div>

        <PageFooter data={data} label={
          data.exportMode === 'authority_facing'
            ? `Statutory template ${data.legal.statutoryTemplateVersion}`
            : `Platform record ${data.templateVersion}`
        } />
      </div>
    </section>
  )
}

function itemStatusColor(status?: string): string {
  if (status === 'Passed') return '#166534'
  if (status === 'Failed') return '#991b1b'
  if (status === 'N/A') return '#6b7280'
  return '#374151'
}

function AuditTrailPage({ data }: { data: ScheduleCBPacketData }) {
  return (
    <section className="packet-page">
      <div className="packet-shell">
        <header className="page-header">
          <div className="brand-stack">
            <div className="eyebrow">{data.trailEyebrow}</div>
            <h2 className="document-title">{data.trailTitle}</h2>
            <div className="document-subtitle">
              All timestamps are recorded in UTC. Coordinates are shown in decimal degrees with six-decimal precision.
            </div>
          </div>

          <div className="scope-block">
            <div className="scope-label">Overlay Applied</div>
            <div className="scope-value">{data.project.overlayLabel}</div>
          </div>
        </header>

        <div className="trail-grid">
          <article className="audit-card">
            <h3 className="audit-card-title">Inspector and Event Record</h3>
            <table className="ledger-table" aria-label="Inspector and event record">
              <tbody>
                <tr>
                  <td>Inspector</td>
                  <td>{data.auditTrail.inspectorName}</td>
                </tr>
                <tr>
                  <td>License</td>
                  <td>{data.auditTrail.inspectorLicense ?? 'Not provided'}</td>
                </tr>
                <tr>
                  <td>Discipline</td>
                  <td>{data.auditTrail.discipline ?? 'Not provided'}</td>
                </tr>
                <tr>
                  <td>Firm</td>
                  <td>{data.auditTrail.firmName ?? 'Not provided'}</td>
                </tr>
                <tr>
                  <td>{data.certifiedAtLabel}</td>
                  <td>
                    <div>{data.auditTrail.exactTimestampDisplay}</div>
                    <div className="secondary mono">{data.auditTrail.exactTimestampIso}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </article>

          <article className="audit-card">
            <h3 className="audit-card-title">Verification Chain</h3>
            <table className="ledger-table" aria-label="Verification chain">
              <tbody>
                <tr>
                  <td>Verification ID</td>
                  <td className="mono">{data.auditTrail.verificationId ?? 'Not assigned'}</td>
                </tr>
                <tr>
                  <td>Source Report ID</td>
                  <td className="mono">{data.auditTrail.sourceReportId}</td>
                </tr>
                <tr>
                  <td>Assignment ID</td>
                  <td className="mono">{data.auditTrail.assignmentId}</td>
                </tr>
                <tr>
                  <td>Job ID</td>
                  <td className="mono">{data.auditTrail.jobId}</td>
                </tr>
                <tr>
                  <td>Packet Generated</td>
                  <td>
                    <div>{data.auditTrail.generatedAtDisplay}</div>
                    <div className="secondary mono">{data.auditTrail.generatedAtIso}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </article>
        </div>

        <div className="trail-grid">
          <article className="audit-card">
            <h3 className="audit-card-title">Location Evidence</h3>
            <table className="ledger-table" aria-label="Location evidence">
              <tbody>
                <tr>
                  <td>Coordinates</td>
                  <td className="mono">{data.auditTrail.coordinatesText}</td>
                </tr>
                <tr>
                  <td>Coordinate Source</td>
                  <td>{data.auditTrail.coordinatesSource}</td>
                </tr>
                <tr>
                  <td>Permit Reference</td>
                  <td>{data.project.permitNumber ?? 'Not provided'}</td>
                </tr>
                {data.sealOutcomeLabel !== null ? (
                  <tr>
                    <td>{data.sealOutcomeLabel}</td>
                    <td>{data.summary.overallResult}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </article>

          <article className="audit-card">
            <h3 className="audit-card-title">Jurisdiction Overlay Record</h3>
            <table className="ledger-table" aria-label="Jurisdiction overlay record">
              <tbody>
                <tr>
                  <td>Overlay Label</td>
                  <td>{data.auditTrail.overlayUsed.label}</td>
                </tr>
                <tr>
                  <td>Jurisdiction</td>
                  <td>{data.auditTrail.overlayUsed.jurisdictionName}</td>
                </tr>
                <tr>
                  <td>Overlay Type</td>
                  <td>{data.auditTrail.overlayUsed.type}</td>
                </tr>
              </tbody>
            </table>
            <div className="audit-note">
              {data.auditTrail.overlayUsed.summary || 'Overlay summary not captured.'}
              {data.auditTrail.overlayUsed.signals.length > 0 ? (
                <ul className="signal-list">
                  {data.auditTrail.overlayUsed.signals.map(signal => (
                    <li key={signal}>{signal}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </article>
        </div>

        {data.items.length > 0 ? (
          <article className="audit-card" style={{ marginTop: '0' }}>
            <h3 className="audit-card-title">Checklist Results</h3>
            <table className="ledger-table" aria-label="Per-item checklist inspection results">
              <thead>
                <tr>
                  <td style={{ fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>Stage · Code</td>
                  <td style={{ fontWeight: 700, color: '#111827' }}>Item</td>
                  <td style={{ fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>Status</td>
                  <td style={{ fontWeight: 700, color: '#111827' }}>Inspector Note / AHJ Note</td>
                </tr>
              </thead>
              <tbody>
                {data.items.map(item => (
                  <tr key={item.itemCode}>
                    <td className="mono" style={{ fontSize: '11px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                      {item.stageNumber} · {item.itemCode}
                    </td>
                    <td style={{ verticalAlign: 'top' }}>{item.itemLabel}</td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 600, color: itemStatusColor(item.inspectionStatus), verticalAlign: 'top' }}>
                      {item.inspectionStatus ?? '—'}
                    </td>
                    <td style={{ fontSize: '12px', verticalAlign: 'top' }}>
                      {item.responseNote ? <div>{item.responseNote}</div> : null}
                      {item.ahjNotes ? (
                        <div style={{ color: '#6b7280', fontStyle: 'italic', marginTop: item.responseNote ? '3px' : '0' }}>
                          AHJ: {item.ahjNotes}
                        </div>
                      ) : null}
                      {!item.responseNote && !item.ahjNotes ? <span style={{ color: '#9ca3af' }}>—</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ) : null}

        <PageFooter data={data} label={data.trailEyebrow} />
      </div>
    </section>
  )
}

function formatHoldRate(rateType?: string, rateAmount?: number): string {
  if (rateAmount === undefined) return 'Not specified'
  const formatted = `$${rateAmount.toFixed(2)}`
  return rateType === 'flat' ? `${formatted} base` : `${formatted}/hr base`
}

function formatHoldDecision(decision: string, acceptedAt?: string): string {
  if (decision === 'accepted') {
    return acceptedAt ? `Accepted — ${new Date(acceptedAt).toUTCString().replace(':00 GMT', ' UTC')}` : 'Accepted'
  }
  if (decision === 'declined') return 'Declined'
  if (decision === 'expired') return 'Expired (no builder response)'
  return 'Pending (hold open at time of sealing)'
}

function HoldHistoryPage({ data }: { data: ScheduleCBPacketData }) {
  if (data.holdHistory.length === 0) return null

  return (
    <>
      {data.holdHistory.map((hold, index) => (
        <section key={hold.holdId} className="packet-page page-break">
          <div className="packet-shell">
            <header className="page-header">
              <div className="brand-stack">
                <div className="eyebrow">Hold / Site Retainer Record</div>
                <h2 className="document-title">
                  {data.holdHistory.length > 1 ? `Hold ${index + 1} of ${data.holdHistory.length} — ` : ''}
                  Site Retainer History
                </h2>
                <div className="document-subtitle">
                  On-site correction hold placed during field review. Commercial terms, builder response, retained time, and final resolution are recorded below.
                </div>
              </div>
              <div className="scope-block">
                <div className="scope-label">Hold Resolution</div>
                <div className="scope-value" style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '0.04em' }}>
                  {hold.resolution
                    ? hold.resolution.toUpperCase()
                    : hold.status.replace(/_/g, ' ').toUpperCase()}
                </div>
              </div>
            </header>

            <div className="trail-grid">
              <article className="audit-card">
                <h3 className="audit-card-title">Deficiency Record</h3>
                <table className="ledger-table" aria-label="Deficiency details">
                  <tbody>
                    <tr>
                      <td>Placed At</td>
                      <td>
                        <div>{new Date(hold.placedAt).toUTCString().replace(':00 GMT', ' UTC')}</div>
                        <div className="secondary mono">{hold.placedAt}</div>
                      </td>
                    </tr>
                    <tr>
                      <td>Initiated By</td>
                      <td style={{ textTransform: 'capitalize' }}>{hold.initiatedByRole}</td>
                    </tr>
                    <tr>
                      <td>Issue Summary</td>
                      <td>{hold.reason}</td>
                    </tr>
                    {hold.deficiencyReason ? (
                      <tr>
                        <td>Deficiency Detail</td>
                        <td>{hold.deficiencyReason}</td>
                      </tr>
                    ) : null}
                    {hold.category ? (
                      <tr>
                        <td>Hold Category</td>
                        <td style={{ textTransform: 'capitalize' }}>{hold.category.replace(/_/g, ' ')}</td>
                      </tr>
                    ) : null}
                    {hold.affectedItemSummaries.length > 0 ? (
                      <tr>
                        <td>Affected Items</td>
                        <td>{hold.affectedItemSummaries.join('; ')}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </article>

              <article className="audit-card">
                <h3 className="audit-card-title">Builder Response &amp; Terms</h3>
                <table className="ledger-table" aria-label="Builder response and commercial terms">
                  <tbody>
                    <tr>
                      <td>Builder Decision</td>
                      <td style={{ fontWeight: 600 }}>{formatHoldDecision(hold.builderDecision, hold.builderAcceptedAt)}</td>
                    </tr>
                    <tr>
                      <td>Base Rate</td>
                      <td>{formatHoldRate(hold.premiumRateType, hold.premiumRateAmount)}</td>
                    </tr>
                    <tr>
                      <td>Hold Cap</td>
                      <td>{hold.holdCapAmount !== undefined ? `$${hold.holdCapAmount.toFixed(2)}` : 'Not specified'}</td>
                    </tr>
                    <tr>
                      <td>Actual Retained Time (minutes)</td>
                      <td>{hold.actualRetainedMinutes !== undefined ? `${hold.actualRetainedMinutes} min` : 'Not recorded'}</td>
                    </tr>
                    <tr>
                      <td>Premium Charge</td>
                      <td>{hold.premiumChargeAmount !== undefined ? `$${hold.premiumChargeAmount.toFixed(2)}` : 'Not recorded'}</td>
                    </tr>
                  </tbody>
                </table>
              </article>
            </div>

            <article className="audit-card" style={{ marginTop: '0' }}>
              <h3 className="audit-card-title">Correction &amp; Resolution</h3>
              <table className="ledger-table" aria-label="Correction evidence and resolution">
                <tbody>
                  <tr>
                    <td>Correction Evidence</td>
                    <td>
                      {hold.correctionEvidenceCount === 0
                        ? 'None recorded'
                        : `${hold.correctionEvidenceCount} item${hold.correctionEvidenceCount !== 1 ? 's' : ''}`}
                    </td>
                  </tr>
                  {hold.correctionEvidenceRefs.length > 0 ? (
                    <tr>
                      <td>Evidence Notes</td>
                      <td>
                        {hold.correctionEvidenceRefs.map((ref, i) => (
                          <div key={i} style={{ marginBottom: i < hold.correctionEvidenceRefs.length - 1 ? '6px' : '0' }}>
                            {ref}
                          </div>
                        ))}
                      </td>
                    </tr>
                  ) : null}
                  <tr>
                    <td>Hold Ended At</td>
                    <td>
                      {hold.holdEndedAt
                        ? <><div>{new Date(hold.holdEndedAt).toUTCString().replace(':00 GMT', ' UTC')}</div><div className="secondary mono">{hold.holdEndedAt}</div></>
                        : 'Not recorded'}
                    </td>
                  </tr>
                  <tr>
                    <td>Final Resolution</td>
                    <td>
                      <span style={{
                        fontWeight: 800,
                        fontSize: '13px',
                        letterSpacing: '0.06em',
                        color: hold.resolution === 'pass' ? '#166534' : hold.resolution === 'fail' ? '#991b1b' : '#374151',
                      }}>
                        {hold.resolution ? `${hold.resolution.toUpperCase()} AFTER HOLD` : hold.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                  {hold.resolutionNotes ? (
                    <tr>
                      <td>Resolution Notes</td>
                      <td>{hold.resolutionNotes}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </article>

            <PageFooter data={data} label="Hold / Site Retainer record" />
          </div>
        </section>
      ))}
    </>
  )
}

function AppendixPages({ data }: { data: ScheduleCBPacketData }) {
  const pages = chunkAppendixEntries(data.appendixEntries)

  if (pages.length === 0) {
    return (
      <section className="packet-page page-break">
        <div className="packet-shell">
          <header className="appendix-header">
            <div>
              <div className="section-kicker">Appendix Photo Log</div>
              <h2 className="section-title">Evidence Appendix</h2>
              <div className="appendix-subtitle">No image evidence was available at packet generation time.</div>
            </div>
            <div className="scope-block">
              <div className="scope-label">Appendix Status</div>
              <div className="scope-value">No appendix entries captured</div>
            </div>
          </header>

          <div className="audit-note">
            Supporting attachments may still exist in the underlying record even when no photo appendix entries are present in this packet.
          </div>

          <PageFooter data={data} label="Evidence appendix" />
        </div>
      </section>
    )
  }

  return (
    <>
      {pages.map((pageEntries, pageIndex) => (
        <section key={`appendix-${pageIndex}`} className="packet-page page-break">
          <div className="packet-shell">
            <header className="appendix-header">
              <div>
                <div className="section-kicker">Appendix Photo Log</div>
                <h2 className="section-title">Evidence Appendix</h2>
                <div className="appendix-subtitle">
                  Requirement references, timestamps, and coordinates are preserved for municipal review.
                </div>
              </div>
              <div className="scope-block">
                <div className="scope-label">Appendix Page</div>
                <div className="scope-value">Page {pageIndex + 1} of {pages.length}</div>
              </div>
            </header>

            <div className="appendix-grid">
              {pageEntries.map(entry => {
                // Field notes link to the formal in-app Field Note Record;
                // all other evidence links to its raw signed file.
                const entryLinkHref = entry.recordUrl ?? entry.signedUrl
                return (
                <article key={entry.id} className="appendix-card">
                  <div className="appendix-image-frame">
                    {entry.imageUrl ? (
                      entryLinkHref ? (
                        <a
                          className="appendix-image-link"
                          href={entryLinkHref}
                          aria-label={`Open source file for ${entry.fileName}`}
                        >
                          <img className="appendix-image" src={entry.imageUrl} alt={entry.caption} />
                        </a>
                      ) : (
                        <img className="appendix-image" src={entry.imageUrl} alt={entry.caption} />
                      )
                    ) : (
                      <div className="appendix-placeholder">{entry.fileKindLabel}</div>
                    )}
                  </div>

                  <div className="appendix-topline">
                    <div className="appendix-kicker">{entry.fileKindLabel}</div>
                    <div className="appendix-id mono">
                      {entryLinkHref ? (
                        <a
                          className="appendix-link"
                          href={entryLinkHref}
                          aria-label={
                            entry.recordUrl
                              ? `Open Field Note Record for evidence ${entry.id}`
                              : `Open source file for evidence ${entry.id}`
                          }
                        >
                          {entry.id}
                        </a>
                      ) : (
                        entry.id
                      )}
                    </div>
                  </div>

                  <div className="appendix-caption">{entry.caption}</div>

                  <table className="appendix-table" aria-label={`Evidence metadata for ${entry.fileName}`}>
                    <tbody>
                      <tr>
                        <td>Requirement</td>
                        <td>
                          {entryLinkHref ? (
                            <a
                              className="appendix-link"
                              href={entryLinkHref}
                              aria-label={`Open record for requirement ${entry.requirementReference}`}
                            >
                              {entry.requirementReference}
                            </a>
                          ) : (
                            entry.requirementReference
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td>Captured</td>
                        <td>
                          <div className="value-stack">
                            <div>{entry.capturedAtDisplay}</div>
                            <div className="secondary mono">{entry.capturedAtIso}</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td>Coordinates</td>
                        <td className="mono">{entry.coordinatesText}</td>
                      </tr>
                      <tr>
                        <td>File</td>
                        <td>{entry.fileName}</td>
                      </tr>
                    </tbody>
                  </table>
                </article>
                )
              })}
            </div>

            <PageFooter data={data} label="Evidence appendix" />
          </div>
        </section>
      ))}
    </>
  )
}

export function ScheduleCBPacketDocument({
  data,
  section,
}: {
  data: ScheduleCBPacketData
  section: 'cover' | 'trail'
}) {
  const title = section === 'cover'
    ? `Schedule C-B Packet Cover — ${data.project.name}`
    : `Schedule C-B Packet Audit Trail — ${data.project.name}`

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>{title}</title>
        <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      </head>
      <body>
        {section === 'cover' ? (
          <CoverPage data={data} />
        ) : (
          <>
            <AuditTrailPage data={data} />
            <HoldHistoryPage data={data} />
            <AppendixPages data={data} />
          </>
        )}
      </body>
    </html>
  )
}
