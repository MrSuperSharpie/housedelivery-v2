"use client";

import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import Image from "next/image";
import {
  type MouseEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type GalleryModel = {
  number: string;
  name: string;
  src: string;
  alt: string;
  placement: string;
};

type FirstNationsModelGalleryProps = {
  models: readonly GalleryModel[];
};

const revealViewport = { once: true, margin: "-100px" } as const;
const luxuryEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function FirstNationsModelGallery({
  models,
}: FirstNationsModelGalleryProps) {
  const [selectedModel, setSelectedModel] = useState<GalleryModel | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const activeTriggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!selectedModel) {
      return;
    }

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
  }, [selectedModel]);

  function openLightbox(
    model: GalleryModel,
    trigger: HTMLButtonElement,
  ) {
    activeTriggerRef.current = trigger;
    setSelectedModel(model);
  }

  function closeLightbox() {
    setSelectedModel(null);
    window.requestAnimationFrame(() => activeTriggerRef.current?.focus());
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      closeLightbox();
    }
  }

  return (
    <>
      <div className="mt-14 grid grid-cols-2 gap-x-3 gap-y-10 sm:mt-16 sm:gap-x-5 sm:gap-y-14 lg:grid-cols-6 xl:grid-cols-12">
        {models.map((model, index) => (
          <motion.article
            key={model.name}
            initial={
              shouldReduceMotion ? false : { opacity: 0, y: 32, scale: 0.985 }
            }
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={revealViewport}
            transition={{
              duration: shouldReduceMotion ? 0 : 1,
              delay: shouldReduceMotion ? 0 : Math.min(index * 0.08, 0.48),
              ease: luxuryEase,
            }}
            className={`${model.placement} transform-gpu`}
          >
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`View ${model.name} in full color`}
              onClick={(event) => openLightbox(model, event.currentTarget)}
              className="group block w-full cursor-zoom-in text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <span className="relative block aspect-[16/10] overflow-hidden border border-white/10 bg-white/[0.035]">
                <Image
                  src={model.src}
                  alt={model.alt}
                  fill
                  quality={100}
                  unoptimized={true}
                  sizes="(min-width: 1280px) 33vw, (min-width: 1024px) 50vw, 100vw"
                  className="object-cover grayscale transition-all duration-500 group-hover:scale-[1.02] group-hover:grayscale-0 group-focus-visible:grayscale-0"
                />
              </span>
              <span className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3 text-[8px] uppercase tracking-[0.18em] text-white/35 sm:text-[9px]">
                <span>{model.number} / 13</span>
                <span className="text-right text-white/55">{model.name}</span>
              </span>
            </button>
          </motion.article>
        ))}
      </div>

      {selectedModel ? (
        <dialog
          ref={dialogRef}
          aria-labelledby={titleId}
          onCancel={(event) => {
            event.preventDefault();
            closeLightbox();
          }}
          onClick={handleBackdropClick}
          className="m-auto w-[calc(100%-2rem)] max-w-4xl overflow-visible border-0 bg-transparent p-0 text-white backdrop:bg-black/80 backdrop:backdrop-blur-md"
        >
          <div className="relative border border-white/15 bg-[#0B0C10] shadow-2xl">
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeLightbox}
              aria-label="Close image viewer"
              className="absolute top-3 right-3 z-10 grid size-11 place-items-center border border-white/25 bg-black/65 text-white transition-colors hover:border-white/60 hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X aria-hidden="true" size={18} />
            </button>

            <div className="relative aspect-video w-full overflow-hidden bg-[#101217]">
              <Image
                src={selectedModel.src}
                alt={selectedModel.alt}
                fill
                quality={100}
                unoptimized={true}
                sizes="(max-width: 896px) calc(100vw - 2rem), 896px"
                className="object-cover"
              />
            </div>

            <div className="border-t border-white/15 px-5 py-4 sm:px-7 sm:py-5">
              <p
                id={titleId}
                className="text-sm font-medium uppercase tracking-[0.18em] text-white/80"
              >
                {selectedModel.name}
              </p>
            </div>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
