"use client";

import { ArrowUpRight, Play, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type MouseEvent, useEffect, useId, useRef, useState } from "react";

type VideoLightboxProps = {
  accessibleLabel: string;
  embedUrl: string;
  posterAlt: string;
  posterSrc: string;
  triggerLabel: string;
  sizes: string;
  posterAspectClassName?: string;
};

function withPlaybackParameters(embedUrl: string) {
  const url = new URL(embedUrl);

  url.searchParams.set("autoplay", "1");
  url.searchParams.set("mute", "1");
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("rel", "0");
  url.searchParams.set("modestbranding", "1");

  return url.toString();
}

function VideoLightbox({
  accessibleLabel,
  embedUrl,
  posterAlt,
  posterSrc,
  triggerLabel,
  sizes,
  posterAspectClassName = "aspect-video",
}: VideoLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (isOpen && dialog && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    }

    return () => {
      if (dialog?.open) {
        dialog.close();
      }
    };
  }, [isOpen]);

  function closeLightbox() {
    if (dialogRef.current?.open) {
      dialogRef.current.close();
    }
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      closeLightbox();
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-label={accessibleLabel}
        onClick={() => setIsOpen(true)}
        className={`group relative block w-full overflow-hidden border border-white/12 bg-[#111318] text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${posterAspectClassName}`}
      >
        <Image
          src={posterSrc}
          alt={posterAlt}
          fill
          quality={90}
          sizes={sizes}
          className="object-cover brightness-[0.72] transition-[transform,filter] duration-700 ease-out motion-reduce:transition-none group-hover:scale-[1.015] group-hover:brightness-[0.82] group-focus-visible:scale-[1.015] group-focus-visible:brightness-[0.82]"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-black/18"
        />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-16 place-items-center rounded-full border border-white/55 bg-black/30 text-white backdrop-blur-sm transition-colors duration-300 group-hover:border-white group-hover:bg-white group-hover:text-black group-focus-visible:border-white group-focus-visible:bg-white group-focus-visible:text-black sm:size-20">
            <Play className="ml-1 size-5 sm:size-6" fill="currentColor" />
          </span>
        </span>
        <span className="absolute inset-x-5 bottom-5 flex items-center justify-between gap-5 sm:inset-x-7 sm:bottom-7">
          <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white sm:text-[10px]">
            {triggerLabel}
          </span>
          <span className="hidden text-[9px] uppercase tracking-[0.18em] text-white/55 sm:block">
            Sound available
          </span>
        </span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault();
          closeLightbox();
        }}
        onClick={handleBackdropClick}
        className="m-auto max-h-none max-w-none overflow-visible border-0 bg-transparent p-0 text-white backdrop:bg-black/90 backdrop:backdrop-blur-md"
      >
        <h2 id={titleId} className="sr-only">
          {accessibleLabel}
        </h2>
        <div className="relative w-[min(94vw,calc(86dvh*16/9),1600px)]">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeLightbox}
            aria-label="Close video"
            className="absolute -top-12 right-0 z-10 grid size-11 place-items-center border border-white/30 bg-black/70 text-white transition-colors hover:border-white hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <X aria-hidden="true" size={19} strokeWidth={1.5} />
          </button>

          <div className="aspect-video w-full overflow-hidden bg-black">
            {isOpen ? (
              <iframe
                src={withPlaybackParameters(embedUrl)}
                title={accessibleLabel}
                className="size-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : null}
          </div>
        </div>
      </dialog>
    </>
  );
}

type LangleyWalkthroughFeatureProps = {
  embedUrl: string;
  posterSrc: string;
};

export function LangleyWalkthroughFeature({
  embedUrl,
  posterSrc,
}: LangleyWalkthroughFeatureProps) {
  return (
    <section
      aria-labelledby="langley-walkthrough-heading"
      className="bg-[#0B0C10] px-5 sm:px-8 lg:px-12"
    >
      <div className="mx-auto max-w-[1504px] border-t border-white/10 pt-8 lg:pt-10">
        <div className="grid gap-7 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-20">
          <p className="eyebrow">Step inside</p>
          <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr] md:items-end md:gap-10">
            <h2
              id="langley-walkthrough-heading"
              className="text-[clamp(2.8rem,5.5vw,6rem)] font-medium leading-[0.9] tracking-[-0.065em] text-white/92"
            >
              Experience The Langley.
            </h2>
            <p className="max-w-lg text-sm leading-7 text-white/50 md:justify-self-end">
              Move through the scale, light, finishes and living spaces of one
              of House Delivery’s architectural home designs.
            </p>
          </div>
        </div>

        <div className="mt-10 lg:mt-14">
          <VideoLightbox
            accessibleLabel="Watch The Langley walkthrough"
            embedUrl={embedUrl}
            posterAlt="The Langley architectural residence surrounded by landscaped grounds"
            posterSrc={posterSrc}
            triggerLabel="Watch the walkthrough"
            sizes="(max-width: 1599px) calc(100vw - 6rem), 1504px"
            posterAspectClassName="aspect-video lg:aspect-[2/1]"
          />
        </div>
      </div>
    </section>
  );
}

export function InclusionsFilmFeature() {
  return (
    <div className="mt-10 grid gap-8 border-t border-white/10 pt-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-10">
      <div>
        <p className="eyebrow">The details that make it home</p>
        <h4 className="mt-5 max-w-xl text-[clamp(2.2rem,3.8vw,4.25rem)] font-medium leading-[0.92] tracking-[-0.055em] text-white/90">
          See the inclusions come to life.
        </h4>
        <p className="mt-6 max-w-xl text-sm leading-7 text-white/50">
          Explore the cabinetry, surfaces, flooring, fixtures and interior
          details that come together through the House Delivery inclusions
          system.
        </p>
        <Link
          href="/inclusions"
          className="group mt-7 inline-flex min-h-11 items-center gap-4 border border-white bg-white px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-black transition-colors duration-500 hover:bg-transparent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          Explore the Inclusions Library
          <ArrowUpRight
            aria-hidden="true"
            className="size-3.5 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            strokeWidth={1.5}
          />
        </Link>
      </div>

      <VideoLightbox
        accessibleLabel="Watch the House Delivery Inclusions film"
        embedUrl="https://www.youtube-nocookie.com/embed/G2ti9kw-A3A"
        posterAlt="Contemporary living room with integrated dark cabinetry and layered interior finishes"
        posterSrc="/images/inclusions/inclusions-hero.webp"
        triggerLabel="Watch the Inclusions film"
        sizes="(max-width: 1023px) calc(100vw - 2.5rem), (max-width: 1599px) 55vw, 856px"
      />
    </div>
  );
}
