"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from "lucide-react";
import Image from "next/image";
import {
  type MouseEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import {
  carriageHomes,
  type CarriageHome,
} from "@/data/carriage-homes";
import { cn } from "@/lib/cn";

const revealViewport = { once: true, margin: "-100px" } as const;
const luxuryEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function CarriageHomeShowcase() {
  const [selectedModel, setSelectedModel] = useState<CarriageHome | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const activeTriggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const shouldReduceMotion = useReducedMotion();
  const activeImage = selectedModel?.images[activeImageIndex];

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

  function openGallery(model: CarriageHome, trigger: HTMLButtonElement) {
    activeTriggerRef.current = trigger;
    setActiveImageIndex(0);
    setSelectedModel(model);
  }

  function closeGallery() {
    setSelectedModel(null);
    window.requestAnimationFrame(() => activeTriggerRef.current?.focus());
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      closeGallery();
    }
  }

  function showPreviousImage() {
    if (!selectedModel) {
      return;
    }

    setActiveImageIndex(
      (current) =>
        (current - 1 + selectedModel.images.length) %
        selectedModel.images.length,
    );
  }

  function showNextImage() {
    if (!selectedModel) {
      return;
    }

    setActiveImageIndex(
      (current) => (current + 1) % selectedModel.images.length,
    );
  }

  return (
    <>
      <section
        id="carriage-homes"
        aria-labelledby="carriage-homes-heading"
        className="scroll-mt-20 bg-[#0B0C10] px-5 py-28 sm:px-8 lg:px-12 lg:py-40"
      >
        <div className="mx-auto max-w-[1504px]">
          <div className="grid gap-12 border-t border-white/10 pt-7 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-20">
            <div>
              <p className="eyebrow">
                Laneway &amp; Carriage Homes / 06 residences
              </p>
              <p className="mt-8 max-w-md text-sm leading-7 text-white/46">
                Compact, self-contained homes designed for laneways, backyards,
                garden settings, and carriage-house locations.
              </p>
            </div>
            <div>
              <div className="mb-[clamp(-1.25rem,-1vw,-0.4rem)] overflow-hidden pb-[clamp(0.4rem,1vw,1.25rem)]">
                <motion.div
                  initial={
                    shouldReduceMotion ? false : { opacity: 0, y: 40 }
                  }
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={revealViewport}
                  transition={{
                    duration: shouldReduceMotion ? 0 : 1,
                    ease: luxuryEase,
                  }}
                  className="mb-[clamp(-1.25rem,-1vw,-0.4rem)] transform-gpu pb-[clamp(0.4rem,1vw,1.25rem)] will-change-[transform,opacity]"
                >
                  <h2
                    id="carriage-homes-heading"
                    className="max-w-5xl text-[clamp(3rem,6vw,6.8rem)] font-medium leading-[0.9] tracking-[-0.065em]"
                  >
                    More home from
                    <br />
                    <span className="text-white/38">
                      the land you already have.
                    </span>
                  </h2>
                </motion.div>
              </div>
              <p className="mt-8 max-w-3xl text-base leading-7 text-white/58 lg:text-lg lg:leading-8">
                These flexible homes can support multigenerational living,
                aging parents, adult children, long-term rental housing, guest
                accommodation, or independent family living.
              </p>
            </div>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 md:gap-12 lg:mt-24">
            {carriageHomes.map((model, index) => {
              const mainImage = model.images[0];

              return (
                <motion.article
                  key={model.slug}
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, y: 28, scale: 0.99 }
                  }
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={revealViewport}
                  transition={{
                    duration: shouldReduceMotion ? 0 : 1,
                    delay: shouldReduceMotion ? 0 : index * 0.08,
                    ease: luxuryEase,
                  }}
                  className="group flex min-h-[620px] flex-col overflow-hidden border border-white/10 bg-[#0B0C10] p-7 transition-colors duration-500 hover:border-white/25 sm:p-8"
                >
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-label={`View image study for ${model.name}`}
                    onClick={(event) =>
                      openGallery(model, event.currentTarget)
                    }
                    className="group/image relative -mx-7 -mt-7 block aspect-[16/10] cursor-zoom-in overflow-hidden border-b border-white/10 bg-[#13151a] text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:-mx-8 sm:-mt-8"
                  >
                    <Image
                      src={mainImage.src}
                      alt={mainImage.alt}
                      fill
                      quality={90}
                      sizes="(max-width: 767px) 100vw, (max-width: 1535px) 50vw, 728px"
                      style={{ imageRendering: "auto" }}
                      className="object-cover brightness-90 transition-all duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover/image:scale-[1.04] group-hover/image:brightness-100 group-focus-visible/image:scale-[1.04] group-focus-visible/image:brightness-100"
                    />
                    <span className="absolute right-5 top-5 grid size-11 place-items-center rounded-full border border-white/35 bg-black/25 text-white backdrop-blur-md transition-colors group-hover/image:bg-white group-hover/image:text-black">
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </span>
                  </button>

                  <div className="mt-7 flex items-start justify-between gap-8">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/34">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <span className="text-right text-[9px] font-semibold uppercase tracking-[0.2em] text-white/28">
                      Laneway / Carriage
                    </span>
                  </div>

                  <div className="mt-auto pt-20">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                      Compact living
                    </p>
                    <h3 className="mt-5 max-w-lg text-[clamp(2.3rem,4vw,4.25rem)] font-medium leading-[0.92] tracking-[-0.06em] text-white/90">
                      {model.name}
                    </h3>
                    <p className="mt-6 max-w-xl text-sm leading-7 text-white/48">
                      {model.description}
                    </p>

                    <button
                      type="button"
                      aria-haspopup="dialog"
                      onClick={(event) =>
                        openGallery(model, event.currentTarget)
                      }
                      className="mt-10 inline-flex items-center gap-5 border-b border-white/28 pb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/62 transition-colors hover:border-white hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                    >
                      View image study
                      <ArrowUpRight size={13} aria-hidden="true" />
                    </button>
                  </div>
                </motion.article>
              );
            })}
          </div>

          <div className="mt-12 grid gap-6 border-t border-white/10 pt-7 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <p className="eyebrow">Planning note</p>
            <p className="max-w-3xl text-sm leading-7 text-white/42">
              Each home must be adapted to the property, local zoning,
              setbacks, servicing, access, climate conditions, and applicable
              building-code requirements.
            </p>
          </div>
        </div>
      </section>

      {selectedModel && activeImage ? (
        <dialog
          ref={dialogRef}
          aria-labelledby={titleId}
          onCancel={(event) => {
            event.preventDefault();
            closeGallery();
          }}
          onClick={handleBackdropClick}
          className="m-auto w-[calc(100%-2rem)] max-w-5xl overflow-visible border-0 bg-transparent p-0 text-white backdrop:bg-black/80 backdrop:backdrop-blur-md"
        >
          <div className="relative max-h-[90vh] overflow-y-auto border border-white/15 bg-[#0B0C10] shadow-2xl">
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeGallery}
              aria-label="Close image viewer"
              className="absolute right-3 top-3 z-20 grid size-11 place-items-center border border-white/25 bg-black/70 text-white transition-colors hover:border-white/60 hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X aria-hidden="true" size={18} />
            </button>

            <div className="relative aspect-video w-full overflow-hidden bg-[#101217]">
              <Image
                src={activeImage.src}
                alt={activeImage.alt}
                fill
                quality={90}
                sizes="(max-width: 1024px) calc(100vw - 2rem), 1024px"
                style={{ imageRendering: "auto" }}
                className={cn(
                  activeImage.fit === "contain"
                    ? "bg-[#e7e5df] object-contain p-4 sm:p-8"
                    : "object-cover",
                )}
              />
            </div>

            <div className="grid gap-5 border-t border-white/15 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-7">
              <div>
                <p
                  id={titleId}
                  className="text-sm font-medium uppercase tracking-[0.18em] text-white/82"
                >
                  {selectedModel.name}
                </p>
                <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-white/38">
                  {activeImage.label} /{" "}
                  {String(activeImageIndex + 1).padStart(2, "0")} of{" "}
                  {String(selectedModel.images.length).padStart(2, "0")}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={showPreviousImage}
                  aria-label={`Show previous ${selectedModel.name} image`}
                  className="grid size-11 place-items-center border border-white/20 text-white/68 transition-colors hover:border-white/60 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={showNextImage}
                  aria-label={`Show next ${selectedModel.name} image`}
                  className="grid size-11 place-items-center border border-white/20 text-white/68 transition-colors hover:border-white/60 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-white/10 p-3 sm:grid-cols-5 sm:p-4">
              {selectedModel.images.map((image, index) => (
                <button
                  key={image.src}
                  type="button"
                  onClick={() => setActiveImageIndex(index)}
                  aria-label={`Show ${image.label.toLowerCase()} for ${selectedModel.name}`}
                  aria-pressed={index === activeImageIndex}
                  className={cn(
                    "relative aspect-[16/10] overflow-hidden border bg-[#13151a] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                    index === activeImageIndex
                      ? "border-white/75"
                      : "border-white/10 hover:border-white/40",
                  )}
                >
                  <Image
                    src={image.src}
                    alt=""
                    fill
                    quality={90}
                    sizes="(max-width: 639px) 30vw, 180px"
                    style={{ imageRendering: "auto" }}
                    className={cn(
                      image.fit === "contain"
                        ? "bg-[#e7e5df] object-contain p-1"
                        : "object-cover",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
