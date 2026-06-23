'use client'

import { MapPin, ArrowRight, FolderLock } from 'lucide-react'

interface CommandHeaderProps {
  company: string
  onPostRequest: () => void
  onOpenVault: () => void
}

// Premium dark command band for the Builder Command Center. Pure presentational —
// all actions are delegated to the page via props. Uses existing design tokens.
export function CommandHeader({ company, onPostRequest, onOpenVault }: CommandHeaderProps) {
  return (
    <div className="relative overflow-hidden border-b border-rim/70 bg-gradient-to-b from-panel to-surface bg-dot bg-dot-sm">
      {/* Depth: soft flame glow top-right + top hairline, echoing the homepage hero */}
      <div className="pointer-events-none absolute -top-28 right-[-8rem] h-80 w-80 rounded-full bg-flame/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-flame/[0.06] via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-flame/40 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-7 pb-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-flame/25 bg-flame/[0.08] px-3 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flame/70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-flame" />
              </span>
              <span className="label-mono font-bold !text-flame">
                Builder Operations{company ? ` · ${company}` : ''}
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-ink sm:text-4xl">
              Builder Command Center
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
              Track live inspections, unblock stalled sites, and download filed records from one
              place.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <button
              onClick={onPostRequest}
              className="group inline-flex items-center gap-2.5 rounded-2xl bg-flame px-5 py-3.5 text-sm font-bold text-white shadow-flame transition-all hover:bg-flame-light glow-flame-sm"
            >
              <MapPin className="h-4 w-4" />
              Post Inspection Request
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={onOpenVault}
              className="inline-flex items-center gap-2 rounded-2xl border border-rim bg-panel/80 px-5 py-3.5 text-sm font-bold text-ink backdrop-blur transition-colors hover:border-rim hover:bg-raised"
            >
              <FolderLock className="h-4 w-4 text-muted" />
              Open Vault
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
