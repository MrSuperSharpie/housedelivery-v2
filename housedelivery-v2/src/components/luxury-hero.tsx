"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ArrowUpRight, Pause, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

type LuxuryHeroProps = {
  image: string;
  customHomeCount: number;
  productStatement?: string;
  supportingCopy?: string;
};

export function LuxuryHero({
  image,
  customHomeCount,
  productStatement,
  supportingCopy = "Exceptional design. Remarkable value. A faster way into a place that is proudly yours.",
}: LuxuryHeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLParagraphElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "8%"]);

  useLayoutEffect(() => {
    const content = contentRef.current;
    const product = productRef.current;
    if (!content || !product) return;
    let active = true;
    // Preserve the approved headline anchor as the supporting copy grows.
    // This hidden, temporary measurement never replaces the visible message.
    function measureCopyGrowth() {
      if (!active || !content || !product) return;
      const reference = product.cloneNode(false) as HTMLParagraphElement;
      reference.textContent = "Pre-reviewed and custom homes, delivered as coordinated building systems for communities, developers, and families.";
      reference.setAttribute("aria-hidden", "true");
      reference.inert = true;
      Object.assign(reference.style, { position: "absolute", visibility: "hidden", width: `${product.getBoundingClientRect().width}px`, pointerEvents: "none" });
      product.parentElement?.append(reference);
      const growth = Math.max(0, product.getBoundingClientRect().height - reference.getBoundingClientRect().height);
      reference.remove();
      content.style.setProperty("--hero-copy-growth", `${growth}px`);
    }
    measureCopyGrowth();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measureCopyGrowth);
    observer?.observe(product);
    void document.fonts.ready.then(measureCopyGrowth);
    return () => { active = false; observer?.disconnect(); };
  }, [productStatement]);

  useEffect(() => {
    const preference = window.matchMedia(
      "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
    );
    let active = true;
    function syncVideoEligibility() {
      if (!active) return;
      const connection = (navigator as Navigator & {
        connection?: { saveData?: boolean };
      }).connection;
      setVideoEnabled(preference.matches && !connection?.saveData);
    }
    queueMicrotask(syncVideoEligibility);
    preference.addEventListener("change", syncVideoEligibility);
    return () => {
      active = false;
      preference.removeEventListener("change", syncVideoEligibility);
    };
  }, []);

  function toggleVideo() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => setVideoFailed(true));
    } else {
      video.pause();
    }
  }

  return (
    <section id="top" ref={heroRef} className="visual-hero relative overflow-hidden bg-[#0b0c10]">
      <div className="visual-hero-frame">
        <motion.div className="absolute -inset-y-[5%] inset-x-0" style={{ y: imageY }}>
          <Image
            src={image}
            alt=""
            fill
            quality={90}
            loading="eager"
            fetchPriority="high"
            sizes="(min-width: 1024px) max(calc(73vw - 28px), calc(max(640px, 100vh - 132px) * 1.96)), max(100vw, calc(max(660px, 100vh - 76px) * 1.96))"
            className="object-cover object-[58%_center] lg:object-center"
          />
          {videoEnabled ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              tabIndex={-1}
              aria-hidden="true"
              onPlaying={() => { setHasPlayed(true); setIsPaused(false); }}
              onPause={() => setIsPaused(true)}
              onEmptied={() => setHasPlayed(false)}
              onError={(event) => { if (event.target === event.currentTarget) setVideoFailed(true); }}
              className={cn(
                "pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
                hasPlayed && !videoFailed ? "opacity-100" : "opacity-0",
              )}
            >
              <source src="/videos/house-delivery-hero.av1.mp4" type={'video/mp4; codecs="av01.0.08M.08"'} />
              <source src="/videos/house-delivery-hero.mp4" type="video/mp4" onError={() => setVideoFailed(true)} />
            </video>
          ) : null}
        </motion.div>
        <div className="visual-hero-shade absolute inset-0" />
        {videoEnabled && !videoFailed && hasPlayed ? (
          <button
            type="button"
            onClick={toggleVideo}
            aria-label={isPaused ? "Play architectural film" : "Pause architectural film"}
            className="absolute right-6 top-6 z-20 grid size-11 place-items-center rounded-full border border-white/45 bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-white lg:right-8 lg:top-8"
          >
            {isPaused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
          </button>
        ) : null}
      </div>

      <div ref={contentRef} className={cn("visual-hero-content relative z-10 mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12", productStatement && "visual-hero-expanded-copy")}>
        <div className="visual-hero-eyebrow flex items-center justify-between gap-6">
          <p className="flex w-fit items-center gap-3 bg-[#0b0c10]/70 px-3 py-2 text-[9px] font-medium uppercase tracking-[0.2em] text-[#e7e3d8] backdrop-blur-sm sm:text-[10px] lg:bg-transparent lg:px-0 lg:py-0 lg:text-[#c9b48f] lg:backdrop-blur-none">
            <span className="h-px w-7 shrink-0 bg-[#b9a17a]" />
            Architectural homes · Made attainable
          </p>
          <p className="sr-only">49.2827° N / 123.1207° W</p>
        </div>

        <div className="visual-hero-heading">
          <p className="mb-5 text-[10px] uppercase tracking-[0.22em] text-white/75 sm:mb-7">More home. Less waiting.</p>
          <h1 className="visual-hero-title font-medium">
            Architecture.
            <br />
            <span className="text-[#d5c29f]">Delivered.</span>
          </h1>
        </div>

        <div className="visual-hero-lower grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-12">
          <div className="max-w-[540px]">
            <p className="mb-3 text-[10px] font-medium uppercase leading-5 tracking-[0.16em] text-[#d5c29f] sm:text-[11px]">
              Exceptional architecture. Intelligent delivery. Lasting value.
            </p>
            {productStatement ? <p ref={productRef} className="max-w-lg text-sm leading-6 text-white/80 sm:text-base sm:leading-7">{productStatement}</p> : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:pb-1">
            <a href="#models" className="group inline-flex min-h-14 items-center justify-between gap-8 bg-[#e7e3d8] px-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0b0c10] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              Explore the Homes
              <ArrowDown size={15} aria-hidden="true" className="transition-transform group-hover:translate-y-1 motion-reduce:transform-none" />
            </a>
            <Link href="/plan-a-housing-project" className="group inline-flex min-h-14 items-center justify-between gap-8 border border-white/45 bg-[#0b0c10]/25 px-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
              Plan a Housing Project
              <ArrowUpRight size={15} aria-hidden="true" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" />
            </Link>
          </div>
        </div>
      </div>

      <div className="relative mx-auto grid max-w-[1600px] gap-8 px-5 pb-10 pt-8 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:gap-20 lg:px-12 lg:pb-12 lg:pt-9">
        <p className="max-w-xl text-sm leading-7 text-white/60">{supportingCopy}</p>
        <div className="grid grid-cols-3 border-t border-white/20 pt-5 lg:border-t-0 lg:pt-0">
          {[["Integrated", "Design to construction"], [String(customHomeCount), "Custom home designs"], ["Built", "For belonging"]].map(([value,label], index) => (
            <div key={label} className="border-r border-white/15 px-4 first:pl-0 last:border-r-0 sm:px-7">
              <p className={cn("font-light tracking-[-0.06em]", index === 0 ? "flex min-h-9 items-end text-base sm:min-h-10 sm:text-2xl lg:text-base xl:text-xl 2xl:text-2xl" : "text-3xl sm:text-4xl")}>{value}</p>
              <p className="mt-2 text-[8px] uppercase leading-4 tracking-[0.15em] text-white/50 sm:text-[9px]">{label}</p>
            </div>
          ))}
        </div>
        <p className="sr-only">Factory precision / A faster path home</p>
      </div>
    </section>
  );
}
