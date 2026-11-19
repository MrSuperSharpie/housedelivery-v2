"use client";

import { ArrowUpRight, X } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";

import type { HomeInclusionLevel } from "@/data/home-configurator";
import { cn } from "@/lib/cn";
import { plannerInclusionTierLabels } from "@/lib/planner-design-session";
import type { PlannerTierComparison as TierComparison } from "@/lib/project-planner";

const tiers = ["premium", "signature"] as const;
const tierNames = { premium: "Premium", signature: "Signature" } as const;

export function PlannerTierComparison({
  homeName,
  comparison,
  selectedTier,
}: {
  homeName: string;
  comparison: TierComparison;
  selectedTier?: HomeInclusionLevel;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [previewTier, setPreviewTier] = useState<HomeInclusionLevel>();

  function openPreview(tier: HomeInclusionLevel, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setPreviewTier(tier);
    dialogRef.current?.showModal();
    closeRef.current?.focus({ preventScroll: true });
  }

  return (
    <div data-planner-tier-comparison>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/60">
        Compare tiers · {comparison.chapter}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {tiers.map((tier) => {
          const representative = comparison.boards[tier][0];
          return (
            <div
              key={tier}
              className={cn(
                "grid min-w-0 grid-cols-[minmax(4.5rem,32%)_minmax(0,1fr)] overflow-hidden border bg-white/50 sm:grid-cols-1 sm:grid-rows-[auto_1fr]",
                selectedTier === tier ? "border-[#8b7155]" : "border-black/15",
              )}
            >
              <div className="relative min-h-20 bg-[#e7e1d6] sm:aspect-[16/10]">
                <Image
                  src={representative.image.src}
                  alt={representative.image.alt}
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>
              <div className="flex min-w-0 flex-col justify-between px-3 pt-3 sm:px-4 sm:pt-4">
                <p className="text-xs font-medium leading-5 text-black/82">
                  {plannerInclusionTierLabels[tier]}
                </p>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={`View All Four Finishes for ${tierNames[tier]}`}
                  onClick={(event) => openPreview(tier, event.currentTarget)}
                  className="inline-flex min-h-11 w-fit items-center gap-2 text-left text-[10px] font-semibold tracking-wide text-black/72 underline decoration-black/35 underline-offset-4 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                >
                  View All Four Finishes <ArrowUpRight aria-hidden="true" className="size-3 shrink-0" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => {
          setPreviewTier(undefined);
          triggerRef.current?.focus({ preventScroll: true });
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-5xl overscroll-contain border border-white/20 bg-[#111216] p-0 text-white shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm"
      >
        <div className="sticky top-0 z-10 border-b border-white/16 bg-[#111216] px-4 pb-4 pt-5 sm:px-7 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d8c4a5]">
                {comparison.chapter}
              </p>
              <h2 id={titleId} className="mt-1 text-2xl font-medium tracking-tight sm:text-3xl">{homeName} finish comparison</h2>
            </div>
            <button
              ref={closeRef}
              type="button"
              aria-label="Close finish comparison"
              onClick={() => dialogRef.current?.close()}
              className="grid size-11 shrink-0 place-items-center border border-white/24 text-white/80 hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          <div role="group" aria-label="Tier to preview" className="mt-4 inline-flex border border-white/25">
            {tiers.map((tier) => (
              <button
                key={tier}
                type="button"
                aria-pressed={previewTier === tier}
                onClick={() => {
                  setPreviewTier(tier);
                  dialogRef.current?.scrollTo({ top: 0 });
                }}
                className="min-h-11 px-4 text-xs font-semibold text-white/70 hover:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#d8c4a5] aria-pressed:bg-[#e7e1d6] aria-pressed:text-black"
              >
                {tierNames[tier]}
              </button>
            ))}
          </div>
        </div>
        {previewTier ? (
          <div key={previewTier} className="grid gap-4 px-4 py-5 sm:grid-cols-2 sm:px-7 sm:py-7">
            {comparison.boards[previewTier].map((board) => (
              <figure key={board.image.src} className="border border-white/15 bg-black/30">
                <div className="relative aspect-[16/10]">
                  <Image src={board.image.src} alt={board.image.alt} fill unoptimized className="object-contain" />
                </div>
                <figcaption className="border-t border-white/15 px-3 py-2.5 text-xs leading-5 text-white/80">
                  {board.name}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
