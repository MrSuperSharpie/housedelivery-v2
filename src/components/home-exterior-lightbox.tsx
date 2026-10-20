"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type MouseEvent, useEffect, useId, useRef } from "react";

import {
  getHomeDetailHref,
  type HomeExteriorPresentation,
  type ResolvedHomeExteriorPresentation,
} from "@/data/first-nations-cultural-design";
import type { HomeModel } from "@/data/models";
import { cn } from "@/lib/cn";

type HomeExteriorLightboxProps = {
  model: HomeModel;
  presentation: HomeExteriorPresentation;
  exterior: ResolvedHomeExteriorPresentation;
  onPresentationChange: (presentation: HomeExteriorPresentation) => void;
  onClose: () => void;
};

const presentations = [
  ["contemporary", "Contemporary"],
  ["indigenous-inspired", "Indigenous Inspired"],
] as const;

export function HomeExteriorLightbox({
  model,
  presentation,
  exterior,
  onPresentationChange,
  onClose,
}: HomeExteriorLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    }

    return () => {
      if (dialog?.open) {
        dialog.close();
      }
    };
  }, []);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-home-exterior-lightbox={model.slug}
      data-lightbox-exterior-presentation={presentation}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={handleBackdropClick}
      className="m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[1500px] overflow-y-auto border-0 bg-transparent p-0 text-white backdrop:bg-black/85 backdrop:backdrop-blur-md sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)]"
    >
      <div className="relative grid min-h-0 border border-white/15 bg-[#0B0C10] shadow-2xl lg:grid-cols-[minmax(0,1fr)_19rem]">
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close exterior viewer"
          data-close-home-exterior-lightbox
          className="absolute right-3 top-3 z-30 grid size-11 place-items-center border border-white/25 bg-black/70 text-white backdrop-blur-md transition-colors hover:border-white/60 hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:right-5 lg:top-5"
        >
          <X aria-hidden="true" size={18} />
        </button>

        <div className="relative h-[52dvh] min-h-80 overflow-hidden bg-[#101217] sm:h-[64dvh] lg:h-[min(82dvh,900px)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${model.slug}-${presentation}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              data-home-exterior-lightbox-image={exterior.image.src}
              className="absolute inset-0"
            >
              <Image
                src={exterior.image.src}
                alt={exterior.image.alt}
                fill
                unoptimized
                sizes="(max-width: 1023px) calc(100vw - 1rem), min(calc(100vw - 21rem), 1180px)"
                className="object-contain"
              />
            </motion.div>
          </AnimatePresence>

          {exterior.indigenousInspiredComingSoon ? (
            <div
              data-lightbox-indigenous-coming-soon
              className="pointer-events-none absolute bottom-4 left-4 border border-white/30 bg-[#0B0C10]/85 px-4 py-3 text-[9px] font-semibold uppercase leading-5 tracking-[0.18em] text-white/88 backdrop-blur-md sm:bottom-6 sm:left-6"
            >
              <span className="block">Indigenous Inspired</span>
              <span className="block text-white/50">Coming Soon</span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col border-t border-white/15 p-5 sm:p-7 lg:border-l lg:border-t-0 lg:p-8">
          <div className="pr-14 lg:pr-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/38">
              Exterior study
            </p>
            <h2
              id={titleId}
              className="mt-3 text-[clamp(2rem,4vw,3.4rem)] font-medium leading-[0.94] tracking-[-0.055em] text-white/92"
            >
              {model.name}
            </h2>
            <p id={descriptionId} className="sr-only">
              Compare the Contemporary and Indigenous Inspired exterior
              expressions for {model.name}.
            </p>
          </div>

          <fieldset
            className="mt-7 min-w-0 lg:mt-auto"
            data-lightbox-exterior-toggle
          >
            <legend className="mb-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/38">
              Exterior expression
            </legend>
            <div className="grid grid-cols-2 border border-white/15 p-1">
              {presentations.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onPresentationChange(value)}
                  aria-pressed={presentation === value}
                  className={cn(
                    "min-h-12 px-3 py-2.5 text-[8px] font-semibold uppercase leading-4 tracking-[0.12em] transition-colors",
                    presentation === value
                      ? "bg-white text-black"
                      : "text-white/48 hover:text-white",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <Link
            href={getHomeDetailHref(model.slug, presentation)}
            className="mt-5 inline-flex min-h-12 items-center justify-between border border-white/20 px-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/80 transition-colors hover:border-white hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            View home
            <ArrowUpRight aria-hidden="true" size={15} />
          </Link>
        </div>
      </div>
    </dialog>
  );
}
