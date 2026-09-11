"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ProductImageGallery } from "@/components/product-image-gallery";
import type { BudgetPlannerHome } from "@/data/budget-planner-catalog";

export function BudgetHomeGallery({ home }: { home: BudgetPlannerHome }) {
  const [expanded, setExpanded] = useState(false);
  const [index, setIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const activeImage = home.images[index] ?? home.images[0];

  useEffect(() => {
    if (!expanded) return;
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      trigger?.focus({ preventScroll: true });
    };
  }, [expanded]);

  function navigate(direction: number) {
    setIndex((current) => (current + direction + home.images.length) % home.images.length);
  }

  return (
    <div className="mt-6 max-w-2xl">
      <ProductImageGallery images={[home.images[0]]} productName={home.name} productSku={`budget-${home.id}`} />
      <button ref={triggerRef} type="button" aria-haspopup="dialog" onClick={() => setExpanded(true)} className="min-h-12 text-left text-sm underline underline-offset-4">
        Expand {home.name} gallery ({home.images.length})
      </button>
      {expanded ? (
        <dialog ref={dialogRef} aria-labelledby={titleId}
          onCancel={(event) => { event.preventDefault(); setExpanded(false); }}
          onClick={(event) => { if (event.target === event.currentTarget) setExpanded(false); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault(); navigate(event.key === "ArrowLeft" ? -1 : 1);
            }
          }}
          className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto border border-white/20 bg-[#0b0c10] p-4 text-white backdrop:bg-black/85 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 id={titleId} className="text-xl font-medium">{home.name} gallery</h3>
            <button type="button" onClick={() => setExpanded(false)} className="min-h-11 px-3 text-sm underline">Close gallery</button>
          </div>
          <ProductImageGallery images={[{ ...activeImage, fit: "contain" }]} productName={home.name} productSku={`expanded-${home.id}`} />
          <div className="mt-4 flex items-center justify-between gap-3">
            <button type="button" disabled={home.images.length < 2} onClick={() => navigate(-1)} className="min-h-11 border border-white/25 px-4 text-sm disabled:opacity-40">Previous image</button>
            <p aria-live="polite" className="text-sm">{index + 1} / {home.images.length}</p>
            <button type="button" disabled={home.images.length < 2} onClick={() => navigate(1)} className="min-h-11 border border-white/25 px-4 text-sm disabled:opacity-40">Next image</button>
          </div>
          <p className="mt-4 text-xs leading-6 text-white/65">Cultural artwork, carvings and custom features shown are optional and quoted separately. Images do not define package inclusions.</p>
        </dialog>
      ) : null}
    </div>
  );
}
