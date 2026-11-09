'use client'

import { CheckCircle2, ExternalLink } from 'lucide-react'

export interface RecordItem {
  key: string
  projectName: string
  address?: string
  certRef?: string
  reportId?: string
}

interface RecordsReadyPanelProps {
  records: RecordItem[]
  onOpenVault: () => void
}

// Compact right-rail panel listing filed records ready for download. Mirrors the
// existing Schedule C-B download path (/api/schedule-cb?reportId=...) — no logic
// change, presentation only.
export function RecordsReadyPanel({ records, onOpenVault }: RecordsReadyPanelProps) {
  if (records.length === 0) return null

  return (
    <section id="records-ready" className="rounded-2xl border border-emerald-600/25 bg-panel p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Records Ready
        </div>
        <span className="rounded-full border border-emerald-600/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-400">
          {records.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {records.map(record => (
          <div
            key={record.key}
            className="flex items-center justify-between gap-3 rounded-xl border border-rim bg-surface px-3 py-2"
          >
            <div className="min-w-0">
              <div className="truncate text-xs font-bold text-ink">{record.projectName}</div>
              {record.certRef && (
                <div className="truncate font-mono text-[11px] font-bold text-muted">{record.certRef}</div>
              )}
            </div>
            {record.reportId ? (
              <a
                href={`/api/schedule-cb?reportId=${encodeURIComponent(record.reportId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-flame hover:underline"
              >
                Download <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <button
                type="button"
                onClick={onOpenVault}
                className="shrink-0 rounded-lg border border-rim bg-panel px-2.5 py-1 text-[11px] font-bold text-muted transition-colors hover:bg-raised"
              >
                Open Vault
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
