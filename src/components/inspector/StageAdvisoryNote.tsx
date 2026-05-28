import { ExternalLink } from 'lucide-react'

interface Props {
  label: string
  legalReference: string
  sourceTitle: string | null
  sourceUrl: string | null
}

export function StageAdvisoryNote({ label, legalReference, sourceTitle, sourceUrl }: Props) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-400">
          VBBL 2025
        </span>
        <span className="rounded-md border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-amber-500/70">
          Advisory — not a hold point
        </span>
      </div>
      <div className="mt-1.5 text-[11px] font-semibold text-zinc-300">{label}</div>
      <div className="mt-0.5 text-[11px] leading-5 text-zinc-500">{legalReference}</div>
      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300"
        >
          {sourceTitle ?? 'View guidance'}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : sourceTitle ? (
        <div className="mt-0.5 text-[10px] text-zinc-600">{sourceTitle}</div>
      ) : null}
    </div>
  )
}
