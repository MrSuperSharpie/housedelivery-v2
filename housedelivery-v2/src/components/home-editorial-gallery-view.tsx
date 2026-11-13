"use client";

import { ArrowLeft, ArrowRight, Maximize2, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { Fragment, useEffect, useRef, useState } from "react";

import type { GalleryImage, GalleryRow } from "@/components/home-editorial-gallery";
import { HomeCinematicStory } from "@/components/home-cinematic-story";
import { HomeCinematicHeadline } from "@/components/home-cinematic-headline";
import type { HomeModel } from "@/data/models";
import { cn } from "@/lib/cn";
import type { ResolvedHomeStory } from "@/lib/custom-home-presentation";

type Props = {
  modelName: string;
  rows: readonly GalleryRow[];
  images: readonly GalleryImage[];
  narrative: HomeModel["narrative"];
  imageQuality: number;
  unoptimized: boolean;
  story?: ResolvedHomeStory;
  modelSlug?: string;
  fullGalleryId?: string;
  imageSizes: { full: string; pair: string };
  imageLoading?: "eager" | "lazy";
};

export function HomeEditorialGalleryView({ modelName, rows, images, narrative = [], imageQuality, unoptimized, story, modelSlug = "custom-home", fullGalleryId = `${modelSlug}-full-gallery`, imageSizes, imageLoading }: Props) {
  const reducedMotion = useReducedMotion();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isOpen = selectedIndex !== null;
  const selectedImage = selectedIndex === null ? undefined : images[selectedIndex];

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (dialog && !dialog.open) dialog.showModal();
    closeRef.current?.focus();
    return () => {
      if (dialog?.open) dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function openImage(index: number, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setSelectedIndex(index);
  }
  function closeImage() {
    setSelectedIndex(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }
  function moveImage(direction: number) {
    setSelectedIndex((current) => ((current ?? 0) + direction + images.length) % images.length);
  }

  return (
    <section id="gallery" data-home-editorial-gallery className="home-pilot-gallery px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-[1504px]">
        <div className="mb-12 grid gap-8 border-t border-white/20 pt-7 lg:mb-16 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#c9b48f]">Gallery / {modelName}</p>
            <h2 className="mt-7 text-[clamp(3.4rem,7.2vw,7.5rem)] font-medium leading-[0.9] tracking-[-0.065em]"><HomeCinematicHeadline text="Architecture," /><br /><span className="text-[#c9b48f]"><HomeCinematicHeadline text="up close." /></span></h2>
          </div>
          <p className="max-w-sm text-sm leading-7 text-white/65">Explore the residence through {images.length} architectural views. Select an image to see the full composition.</p>
        </div>
        {story ? <HomeCinematicStory modelName={modelName} modelSlug={modelSlug} story={story} fullGalleryId={fullGalleryId} onOpenImage={openImage} imageQuality={imageQuality} unoptimized={unoptimized} imageSizes={imageSizes} imageLoading={imageLoading} /> : null}
        <div id={fullGalleryId} data-home-full-gallery className="space-y-16 lg:space-y-24">
          {rows.map((row, rowIndex) => (
            <Fragment key={row.images[0].src}>
              <div className={row.kind === "full" ? "grid" : "grid gap-8 md:grid-cols-[1.15fr_0.85fr] md:items-start lg:gap-12"}>
                {row.images.map((image, imageIndex) => (
                  <figure key={image.src} className={row.kind === "pair" && imageIndex === 1 ? "md:mt-20" : undefined}>
                    <motion.button
                      tabIndex={0}
                      type="button"
                      aria-haspopup="dialog"
                      aria-label={"Enlarge architectural image " + image.number + " for " + modelName}
                      data-home-gallery-image={image.number}
                      onClick={(event) => openImage(image.number - 1, event.currentTarget)}
                      whileHover={reducedMotion ? undefined : { y: -3 }}
                      whileTap={reducedMotion ? undefined : { scale: 0.995 }}
                      transition={{ type: "spring", stiffness: 280, damping: 28 }}
                      className={cn("group relative block w-full cursor-zoom-in overflow-hidden bg-[#17191e] text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d5c29f]", row.kind === "full" ? "aspect-[4/3] sm:aspect-[1.9/1]" : "aspect-[4/3]")}
                    >
                      <Image src={image.src} alt={image.alt} fill quality={imageQuality} unoptimized={unoptimized} loading={imageLoading ?? "lazy"} sizes={row.kind === "full" ? imageSizes.full : imageSizes.pair} style={image.objectPosition ? { objectPosition: image.objectPosition } : undefined} className={cn("transition-transform duration-700 ease-out group-hover:scale-[1.02] motion-reduce:transform-none", image.fit === "contain" ? "bg-[#e7e3d8] object-contain p-4" : "object-cover")} />
                      <span className="absolute bottom-5 right-5 inline-flex min-h-11 items-center gap-4 border border-white/40 bg-[#0b0c10]/75 px-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm"><Maximize2 size={14} aria-hidden="true" /> View larger</span>
                    </motion.button>
                    <figcaption className="mt-4 flex items-baseline justify-between gap-5 border-b border-white/20 pb-4">
                      <span className="text-[10px] uppercase tracking-[0.15em] text-white/65">{image.label}</span>
                      <span className="font-mono text-sm tracking-[-0.04em] text-[#c9b48f]">{String(image.number).padStart(2, "0")} <span className="text-white/35">/ {String(images.length).padStart(2, "0")}</span></span>
                    </figcaption>
                  </figure>
                ))}
              </div>
              {narrative[rowIndex] ? (
                <div className="grid gap-6 border-l border-[#b9a17a]/45 pl-6 md:ml-auto md:max-w-5xl md:grid-cols-[0.75fr_1.25fr] md:gap-14 lg:pl-9">
                  <h3 className="max-w-sm text-[clamp(1.7rem,2.7vw,2.8rem)] font-medium leading-tight tracking-[-0.045em] text-white/90">{narrative[rowIndex].title}</h3>
                  <p className="max-w-2xl text-base leading-8 text-white/65">{narrative[rowIndex].body}</p>
                </div>
              ) : null}
            </Fragment>
          ))}
          {narrative.slice(rows.length).map(item => <div key={item.title} className="grid gap-6 border-l border-[#b9a17a]/45 pl-6 md:ml-auto md:max-w-5xl md:grid-cols-[0.75fr_1.25fr] md:gap-14"><h3 className="text-3xl font-medium tracking-[-0.045em]">{item.title}</h3><p className="text-base leading-8 text-white/65">{item.body}</p></div>)}
        </div>
      </div>
      {selectedImage && selectedIndex !== null ? (
        <dialog
          ref={dialogRef}
          data-home-gallery-viewer
          aria-label={modelName + " architectural gallery"}
          onCancel={(event) => { event.preventDefault(); closeImage(); }}
          onClick={(event) => { if (event.target === event.currentTarget) closeImage(); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); moveImage(event.key === "ArrowRight" ? 1 : -1); }
            if (event.key === "Home" || event.key === "End") { event.preventDefault(); setSelectedIndex(event.key === "Home" ? 0 : images.length - 1); }
          }}
          className="m-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[1600px] overflow-y-auto border border-white/20 bg-[#0b0c10] p-0 text-white backdrop:bg-black/90 backdrop:backdrop-blur-sm sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)]"
        >
          <div className="flex items-center justify-between gap-5 border-b border-white/15 px-4 py-3 sm:px-7">
            <div><p className="text-[9px] uppercase tracking-[0.17em] text-[#c9b48f]">{modelName} / Gallery</p><p className="mt-1 text-xs text-white/65" aria-live="polite">Image {selectedIndex + 1} of {images.length} · {selectedImage.label}</p></div>
            <button ref={closeRef} type="button" aria-label="Close architectural gallery" onClick={closeImage} className="grid size-11 shrink-0 place-items-center border border-white/30 focus-visible:outline-2 focus-visible:outline-white"><X size={18} aria-hidden="true" /></button>
          </div>
          <div className="relative h-[58dvh] min-h-56 sm:h-[68dvh]">
            <Image key={selectedImage.src} src={selectedImage.src} alt={selectedImage.alt} fill quality={imageQuality} unoptimized={unoptimized} sizes="95vw" className="home-pilot-photo-enter object-contain" />
            <button type="button" aria-label="Previous architectural image" onClick={() => moveImage(-1)} className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center border border-white/40 bg-black/65 focus-visible:outline-2 focus-visible:outline-white"><ArrowLeft size={18} aria-hidden="true" /></button>
            <button type="button" aria-label="Next architectural image" onClick={() => moveImage(1)} className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center border border-white/40 bg-black/65 focus-visible:outline-2 focus-visible:outline-white"><ArrowRight size={18} aria-hidden="true" /></button>
          </div>
          <div className="flex gap-3 overflow-x-auto border-t border-white/15 p-4 sm:px-7" aria-label="Choose an architectural image">
            {images.map((image, index) => (
              <button key={image.src} type="button" onClick={() => setSelectedIndex(index)} aria-label={"View gallery image " + image.number} aria-pressed={selectedIndex === index} className={cn("relative h-14 w-20 shrink-0 border-2 focus-visible:outline-2 focus-visible:outline-white", selectedIndex === index ? "border-[#d5c29f]" : "border-transparent")}>
                <Image src={image.src} alt="" fill quality={imageQuality} unoptimized={unoptimized} loading="lazy" sizes="80px" className="object-cover" style={image.objectPosition ? { objectPosition: image.objectPosition } : undefined} />
              </button>
            ))}
          </div>
        </dialog>
      ) : null}
    </section>
  );
}
