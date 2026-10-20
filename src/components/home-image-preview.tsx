"use client";

import { Check, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";

import {
  getHomeInclusionLevelLabel,
  type HomeInclusionOption,
} from "@/data/home-configurator";

type HomeImagePreviewProps = {
  option: HomeInclusionOption;
  homeName: string;
  isSelected: boolean;
  canShowPrevious: boolean;
  canShowNext: boolean;
  returnFocusId: string;
  onSelect: () => void;
  onShowPrevious: () => void;
  onShowNext: () => void;
  onClose: () => void;
};

export function HomeImagePreview({
  option,
  homeName,
  isSelected,
  canShowPrevious,
  canShowNext,
  returnFocusId,
  onSelect,
  onShowPrevious,
  onShowNext,
  onClose,
}: HomeImagePreviewProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusIdRef = useRef(returnFocusId);
  const headingId = `home-image-preview-${option.id}-heading`;

  useEffect(() => {
    returnFocusIdRef.current = returnFocusId;
  }, [returnFocusId]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (!firstElement || !lastElement) return;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      document
        .getElementById(returnFocusIdRef.current)
        ?.focus({ preventScroll: true });
    };
  }, [onClose]);

  useEffect(() => {
    function handleArrowKey(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      if (event.key === "ArrowLeft" && canShowPrevious) {
        event.preventDefault();
        onShowPrevious();
      } else if (event.key === "ArrowRight" && canShowNext) {
        event.preventDefault();
        onShowNext();
      }
    }

    document.addEventListener("keydown", handleArrowKey);
    return () => document.removeEventListener("keydown", handleArrowKey);
  }, [canShowNext, canShowPrevious, onShowNext, onShowPrevious]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/88 p-0 backdrop-blur-sm lg:p-8"
      data-home-image-preview={option.id}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="mx-auto grid h-full w-full max-w-[1600px] overflow-y-auto bg-[#0b0c10] text-white shadow-2xl lg:h-[calc(100vh-4rem)] lg:grid-cols-[minmax(0,1fr)_22rem] lg:overflow-hidden lg:border lg:border-white/18"
      >
        <div className="relative min-h-[48vh] overflow-hidden bg-black lg:min-h-0">
          <Image
            src={option.image.src}
            alt={option.image.alt}
            fill
            quality={100}
            unoptimized={option.image.role === "design-board"}
            sizes="(max-width: 1023px) 100vw, calc(100vw - 22rem)"
            className="object-contain"
          />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/8" />
        </div>

        <div className="flex min-h-0 flex-col border-t border-white/12 bg-[#111216] p-6 sm:p-8 lg:border-l lg:border-t-0">
          <div className="flex items-start justify-between gap-6">
            <p className="text-[9px] font-semibold uppercase tracking-[0.19em] text-white/58">
              Image preview
            </p>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Close image preview"
              data-close-image-preview
              onClick={onClose}
              className="grid size-11 shrink-0 place-items-center rounded-full border border-white/24 text-white/76 transition-colors hover:border-white hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <X aria-hidden="true" className="size-4" strokeWidth={1.5} />
            </button>
          </div>

          <div className="mt-auto pt-8 lg:mt-16">
            <p
              className={
                option.level === "premium"
                  ? "text-[9px] font-semibold uppercase tracking-[0.18em] text-white/62"
                  : "text-[9px] font-semibold uppercase tracking-[0.18em] text-[#d8c4a5]"
              }
            >
              {getHomeInclusionLevelLabel(option.level)}
            </p>
            <h2
              id={headingId}
              aria-live="polite"
              className="mt-5 text-[clamp(2.5rem,5vw,4.5rem)] font-medium leading-[0.9] tracking-[-0.06em] lg:text-5xl"
            >
              {option.name}
            </h2>

            {option.description ? (
              <div className="mt-7 border-t border-white/14 pt-5">
                <p className="text-sm leading-6 text-white/58">
                  {option.description}
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-8 border-t border-white/14 pt-6">
            <div className="mb-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                data-show-previous-preview-option
                disabled={!canShowPrevious}
                onClick={onShowPrevious}
                className="min-h-12 border border-white/24 px-4 text-left text-[9px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:border-white hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/28 disabled:hover:bg-transparent"
              >
                <span aria-hidden="true">←</span> Previous
              </button>
              <button
                type="button"
                data-show-next-preview-option
                disabled={!canShowNext}
                onClick={onShowNext}
                className="min-h-12 border border-white/24 px-4 text-right text-[9px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:border-white hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/28 disabled:hover:bg-transparent"
              >
                Next option <span aria-hidden="true">→</span>
              </button>
            </div>

            <button
              type="button"
              data-select-preview-option={option.id}
              aria-label={`Select ${option.name} for My ${homeName} and continue`}
              onClick={onSelect}
              className="flex min-h-14 w-full items-center justify-between gap-6 bg-white px-5 text-left text-[10px] font-semibold uppercase tracking-[0.17em] text-black transition-colors hover:bg-[#ded9cd] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <span className="flex items-center gap-3">
                {isSelected ? (
                  <Check aria-hidden="true" className="size-4" strokeWidth={2} />
                ) : null}
                Select this option
              </span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
