'use client'

import { useState } from 'react'
import { ChevronRight, ExternalLink } from 'lucide-react'
import { StageAdvisoryNote } from '@/components/inspector/StageAdvisoryNote'
import type { CompletionChecklistItemDefinition } from '@/lib/inspectorCompletion'

interface Props {
  refs: CompletionChecklistItemDefinition['code_references']
}

export function StageCodeReferences({ refs }: Props) {
  const [open, setOpen] = useState(false)

  if (!refs || refs.length === 0) return null

  const standardRefs = refs.filter(r => !r.isVbblOnly)
  const advisoryRefs = refs.filter(r => r.isVbblOnly)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Code References</div>
          <div className="mt-1 text-xs text-zinc-400">BC Building Code and jurisdiction-specific citations for this inspection item.</div>
        </div>
        <ChevronRight className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {standardRefs.map(ref => (
            <div key={ref.legalReference} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
              <div className="text-[11px] font-semibold text-zinc-300">{ref.label}</div>
              <div className="mt-0.5 text-[11px] leading-5 text-zinc-500">{ref.legalReference}</div>
              {ref.sourceUrl ? (
                <a
                  href={ref.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300"
                >
                  {ref.sourceTitle ?? 'View source'}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : ref.sourceTitle ? (
                <div className="mt-0.5 text-[10px] text-zinc-600">{ref.sourceTitle}</div>
              ) : null}
            </div>
          ))}
          {advisoryRefs.map(ref => (
            <StageAdvisoryNote
              key={ref.legalReference}
              label={ref.label}
              legalReference={ref.legalReference}
              sourceTitle={ref.sourceTitle ?? null}
              sourceUrl={ref.sourceUrl ?? null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
