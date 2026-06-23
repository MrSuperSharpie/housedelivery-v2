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
    <div className="relative overflow-hidden border-b border-rim bg-dot bg-dot-sm">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-flame/[0.04] to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="label-mono mb-3 font-bold">
              Builder Operations{company ? ` · ${company}` : ''}
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-ink">
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
              className="inline-flex items-center gap-2 rounded-2xl border border-rim bg-panel px-5 py-3.5 text-sm font-bold text-ink transition-colors hover:bg-raised"
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
