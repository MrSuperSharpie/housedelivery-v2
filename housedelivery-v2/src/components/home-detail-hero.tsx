"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowDown, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import {
  getHomeExteriorPresentationFromExpression,
  getIndigenousInspiredExteriorImage,
  resolveHomeExteriorPresentation,
  type HomeExteriorPresentation,
} from "@/data/first-nations-cultural-design";
import { cn } from "@/lib/cn";

type HomeDetailHeroProps = {
  model: {
    slug: string;
    name: string;
    heroImage: string;
    summary: string;
    locationLabel: string;
    squareFeet?: number;
  };
  modelNumber: number;
  modelCount: number;
  collectionHref?: string;
  collectionLabel?: string;
  modelLabel?: string;
  secondaryBadge?: string;
  titleSuffix?: string | null;
  imageAlt?: string;
  imageQuality?: number;
  unoptimized?: boolean;
  imagePresentation?: "full-bleed" | "contained";
  initialExteriorPresentation?: HomeExteriorPresentation;
};

export function HomeDetailHeroFromQuery(
  props: Omit<HomeDetailHeroProps, "initialExteriorPresentation">,
) {
  const searchParams = useSearchParams();

  return (
    <HomeDetailHero
      {...props}
      initialExteriorPresentation={
        getHomeExteriorPresentationFromExpression(
          searchParams.get("expression") ?? undefined,
        )
      }
    />
  );
}

export function HomeDetailHero({
  model,
  modelNumber,
  modelCount,
  collectionHref = "/#models",
  collectionLabel = "Collection",
  modelLabel = "Model",
  secondaryBadge = "Pre-engineered residence",
  titleSuffix = "House",
  imageAlt = `${model.name} House exterior`,
  imageQuality = 100,
  unoptimized = true,
  imagePresentation = "full-bleed",
  initialExteriorPresentation = "contemporary",
}: HomeDetailHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const supportsIndigenousInspired = Boolean(
    getIndigenousInspiredExteriorImage(model.slug),
  );
  const [exteriorPresentation, setExteriorPresentation] =
    useState<HomeExteriorPresentation>(
      supportsIndigenousInspired
        ? initialExteriorPresentation
        : "contemporary",
    );
  const exterior = resolveHomeExteriorPresentation(
    model.slug,
    model.name,
    model.heroImage,
    exteriorPresentation,
  );
  const activeImageAlt =
    exteriorPresentation === "contemporary" ? imageAlt : exterior.image.alt;
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "13%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  function changeExteriorPresentation(
    presentation: HomeExteriorPresentation,
  ) {
    setExteriorPresentation(presentation);

    const nextUrl = new URL(window.location.href);

    if (presentation === "indigenous-inspired") {
      nextUrl.searchParams.set("expression", "indigenous");
    } else {
      nextUrl.searchParams.delete("expression");
    }

    window.history.replaceState(
      window.history.state,
      "",
      `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
    );
  }

  return (
    <section
      ref={sectionRef}
      id="top"
      data-home-exterior-presentation={exteriorPresentation}
      className="relative h-[100svh] min-h-[760px] overflow-hidden border-b border-white/10 sm:min-h-[860px]"
    >
      {imagePresentation === "contained" ? (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-[#0b0c10]"
          style={{ y: imageY }}
        >
          <div
            data-hero-image-frame="contained"
            data-home-exterior-image={exterior.image.src}
            className="relative h-[70svh] max-h-[700px] w-[calc(100%-1rem)] max-w-[980px] sm:w-[88vw] lg:h-[70vh] lg:w-[70vw]"
          >
            <Image
              src={exterior.image.src}
              alt={activeImageAlt}
              fill
              quality={imageQuality}
              unoptimized={unoptimized}
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 639px) calc(100vw - 16px), (max-width: 1023px) 88vw, (max-width: 1400px) 70vw, 980px"
              className="object-contain"
            />
          </div>
        </motion.div>
      ) : (
        <motion.div
          data-home-exterior-image={exterior.image.src}
          className="absolute inset-x-0 -top-[10%] -bottom-[10%] bg-[#0b0c10]"
          style={{ y: imageY }}
        >
          <Image
            src={exterior.image.src}
            alt={activeImageAlt}
            fill
            quality={imageQuality}
            unoptimized={unoptimized}
            loading="eager"
            fetchPriority="high"
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,12,16,.52)_0%,rgba(11,12,16,.08)_40%,rgba(11,12,16,.92)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,12,16,.46)_0%,transparent_65%)]" />
      <div className="noise absolute inset-0 opacity-[0.075]" />

      <motion.div
        style={{ opacity: contentOpacity }}
        className="relative z-10 mx-auto flex h-full min-h-[760px] max-w-[1600px] flex-col justify-between px-5 pb-8 pt-28 sm:min-h-[860px] sm:px-8 lg:px-12 lg:pb-10"
      >
        <div className="flex items-center justify-between">
          <Link
            href={collectionHref}
            className="inline-flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65 transition-colors hover:text-white"
          >
            <ArrowLeft size={14} />
            {collectionLabel}
          </Link>
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/55">
            {modelLabel} {String(modelNumber).padStart(2, "0")} /{" "}
            {String(modelCount).padStart(2, "0")}
          </p>
        </div>

        <div>
          {supportsIndigenousInspired ? (
            <fieldset
              className="mb-7 min-w-0"
              data-home-exterior-presentation-toggle
            >
              <legend className="mb-2 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/55">
                Exterior expression
              </legend>
              <div className="inline-flex max-w-full border border-white/25 bg-black/15 p-1 backdrop-blur-md">
                {([
                  ["contemporary", "Contemporary"],
                  ["indigenous-inspired", "Indigenous Inspired"],
                ] as const).map(([presentation, label]) => (
                  <button
                    key={presentation}
                    type="button"
                    onClick={() => changeExteriorPresentation(presentation)}
                    className={cn(
                      "min-h-11 px-4 py-2.5 text-[9px] font-semibold uppercase leading-4 tracking-[0.14em] transition-colors sm:px-5",
                      exteriorPresentation === presentation
                        ? "bg-white text-black"
                        : "text-white/60 hover:text-white",
                    )}
                    aria-pressed={exteriorPresentation === presentation}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          <div className="mb-8 flex flex-wrap items-center gap-3">
            <span className="border border-white/30 bg-black/15 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md">
              {model.locationLabel}
            </span>
            <span className="border border-white/30 bg-black/15 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md">
              {secondaryBadge}
            </span>
          </div>

          <motion.h1
            initial={
              shouldReduceMotion ? false : { opacity: 0, y: 40 }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 1,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="max-w-[1300px] text-[clamp(4rem,10vw,10rem)] font-medium leading-[0.82] tracking-[-0.078em]"
          >
            {model.name}
            {titleSuffix ? (
              <>
                <br />
                <span className="text-white/58">{titleSuffix}</span>
              </>
            ) : null}
          </motion.h1>

          <div
            className={`mt-10 grid items-end gap-8 border-t border-white/30 pt-6 ${
              model.squareFeet === undefined ? "" : "sm:grid-cols-[1fr_auto]"
            }`}
          >
            <p className="max-w-xl text-sm leading-6 text-white/66 sm:text-base sm:leading-7">
              {model.summary}
            </p>
            {model.squareFeet === undefined ? null : (
              <div className="flex items-end gap-3 sm:text-right">
                <span className="text-5xl font-light tracking-[-0.07em] sm:text-7xl">
                  {model.squareFeet.toLocaleString()}
                </span>
                <span className="pb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50">
                  Sq. ft.
                  <br />
                  total area
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <a
        href="#overview"
        aria-label="Read the project overview"
        className="absolute bottom-10 right-6 z-20 hidden size-14 place-items-center rounded-full border border-white/35 transition-colors hover:bg-white hover:text-black md:grid lg:right-12"
      >
        <ArrowDown size={16} />
      </a>
    </section>
  );
}
