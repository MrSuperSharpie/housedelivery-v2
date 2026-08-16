"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { Fragment } from "react";

import { HeadlineReveal } from "@/components/headline-reveal";
import { HomeDesignToolCallout } from "@/components/home-design-tool-callout";
import {
  ContextualInclusionsLink,
  type ContextualInclusionDestination,
} from "@/components/inclusions-journey-links";
import type { HomeModel } from "@/data/models";

type GallerySource =
  | string
  | {
      src: string;
      alt: string;
      label: string;
      fit?: "cover" | "contain";
    };

type GalleryImage = {
  src: string;
  alt: string;
  label: string;
  number: number;
  fit: "cover" | "contain";
};

type GalleryRow =
  | { kind: "full"; images: [GalleryImage] }
  | { kind: "pair"; images: [GalleryImage] | [GalleryImage, GalleryImage] };

type HomeEditorialGalleryProps = {
  modelName: string;
  images: readonly GallerySource[];
  floorPlanImage: string;
  narrative?: HomeModel["narrative"];
  imageQuality?: number;
  unoptimized?: boolean;
  contextualInclusionsDestination?: ContextualInclusionDestination;
  designToolDiscovery?: {
    homeName: string;
    href: string;
  };
};

// Floor plan / footprint assets must never appear in the lifestyle gallery —
// object-cover crops them into unreadable fragments. They live only in the
// dedicated interactive floor plan section.
const FLOOR_PLAN_PATTERNS = [
  "floorplan",
  "floor-plan",
  "floor_plan",
  "plan",
  "footprint",
] as const;

function isFloorPlanImage(src: string, floorPlanImage: string): boolean {
  if (src === floorPlanImage) {
    return true;
  }
  const haystack = decodeURIComponent(src).toLowerCase();
  return FLOOR_PLAN_PATTERNS.some((pattern) => haystack.includes(pattern));
}

const galleryLabels = [
  "Material and atmosphere",
  "Living volume",
  "Kitchen and dining",
  "Private retreat",
  "Bath and finish study",
  "Exterior rhythm",
  "Interior perspective",
] as const;

function getImageSrc(image: GallerySource): string {
  return typeof image === "string" ? image : image.src;
}

function buildGalleryRows(
  images: readonly GallerySource[],
  modelName: string,
): GalleryRow[] {
  const items = images.map((image, index) => {
    const fallbackLabel = galleryLabels[index % galleryLabels.length];

    return {
      src: getImageSrc(image),
      alt:
        typeof image === "string"
          ? `${modelName} — ${fallbackLabel}`
          : image.alt,
      label: typeof image === "string" ? fallbackLabel : image.label,
      number: index + 1,
      fit:
        typeof image === "string"
          ? ("cover" as const)
          : (image.fit ?? "cover"),
    };
  });
  const rows: GalleryRow[] = [];
  let cursor = 0;
  let isFullWidth = true;

  while (cursor < items.length) {
    if (isFullWidth) {
      rows.push({ kind: "full", images: [items[cursor]] });
      cursor += 1;
    } else {
      const pair = items.slice(cursor, cursor + 2);
      rows.push({
        kind: "pair",
        images:
          pair.length === 2
            ? [pair[0], pair[1]]
            : [pair[0]],
      });
      cursor += pair.length;
    }
    isFullWidth = !isFullWidth;
  }

  return rows;
}

export function HomeEditorialGallery({
  modelName,
  images,
  floorPlanImage,
  narrative = [],
  imageQuality = 100,
  unoptimized = true,
  contextualInclusionsDestination,
  designToolDiscovery,
}: HomeEditorialGalleryProps) {
  const shouldReduceMotion = useReducedMotion();
  const lifestyleImages = images.filter(
    (image) => !isFloorPlanImage(getImageSrc(image), floorPlanImage),
  );
  const rows = buildGalleryRows(lifestyleImages, modelName);

  return (
    <section className="px-5 py-28 sm:px-8 lg:px-12 lg:py-40">
      <div className="mx-auto max-w-[1504px]">
        <div className="mb-20 grid gap-8 border-t border-white/15 pt-7 md:grid-cols-2">
          <p className="eyebrow">A study in space / {modelName}</p>
          <p className="max-w-lg text-base leading-7 text-white/48 md:justify-self-end">
            Architecture is experienced in sequence: arrival, gathering,
            retreat, and the changing quality of light across the day.
          </p>
        </div>

        <div className="space-y-20 sm:space-y-28 lg:space-y-40">
          {rows.map((row, rowIndex) => {
            const narrativeSection = narrative[rowIndex];

            return (
              <Fragment key={`${row.kind}-${row.images[0].src}`}>
                <article className="space-y-12 sm:space-y-16">
                  <div
                    className={
                      row.kind === "full"
                        ? "grid grid-cols-1"
                        : "grid gap-5 md:grid-cols-2 md:items-start"
                    }
                  >
                    {row.images.map((image, imageIndex) => (
                      <figure
                        key={image.src}
                        className={
                          row.kind === "pair" && imageIndex === 1
                            ? "md:mt-28"
                            : undefined
                        }
                      >
                        <div
                          className={
                            row.kind === "full"
                              ? "relative aspect-[1.2/1] overflow-hidden bg-[#121419] sm:aspect-[1.72/1]"
                              : "relative aspect-[1.05/1] overflow-hidden bg-[#121419] md:aspect-[0.88/1]"
                          }
                        >
                          <motion.div
                            className="relative size-full overflow-hidden"
                            initial={
                              shouldReduceMotion ? false : { opacity: 0, y: 40 }
                            }
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{
                              duration: shouldReduceMotion ? 0 : 1,
                              ease: [0.16, 1, 0.3, 1],
                              delay: shouldReduceMotion ? 0 : imageIndex * 0.08,
                            }}
                          >
                            <Image
                              src={image.src}
                              alt={image.alt}
                              fill
                              quality={imageQuality}
                              unoptimized={unoptimized}
                              sizes={
                                row.kind === "full"
                                  ? "(min-width: 768px) 95vw, 100vw"
                                  : "(min-width: 768px) 48vw, 100vw"
                              }
                              className={
                                image.fit === "contain"
                                  ? "bg-[#e7e5df] object-contain p-4 sm:p-8"
                                  : "object-cover brightness-90 transition-all duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)] hover:scale-[1.04] hover:brightness-100"
                              }
                            />
                          </motion.div>
                        </div>
                        <figcaption className="mt-4 border-t border-white/12 pt-3">
                          <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.18em] text-white/36">
                            <span>{image.label}</span>
                            <span>
                              {String(image.number).padStart(2, "0")} /{" "}
                              {String(lifestyleImages.length).padStart(2, "0")}
                            </span>
                          </div>
                          {designToolDiscovery ? null : (
                            <ContextualInclusionsLink
                              sourceLabel={image.label}
                              destinationOverride={contextualInclusionsDestination}
                            />
                          )}
                        </figcaption>
                      </figure>
                    ))}
                    {row.kind === "pair" && row.images.length === 1 ? (
                      <div
                        className="hidden min-h-80 border-l border-white/10 md:block"
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>

                  {narrativeSection ? (
                    <div
                      className={`grid max-w-5xl gap-7 border-t border-white/12 pt-7 md:grid-cols-[0.68fr_1.32fr] md:gap-14 ${
                        rowIndex % 2 === 0 ? "mr-auto" : "ml-auto"
                      }`}
                    >
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/28">
                          Narrative / {String(rowIndex + 1).padStart(2, "0")}
                        </p>
                        <HeadlineReveal
                          variant={rowIndex % 3 === 2 ? "sweep" : "clip"}
                          className="mt-5"
                        >
                          <h3 className="max-w-sm text-2xl font-medium leading-tight tracking-[-0.045em] text-white/82 sm:text-3xl">
                            {narrativeSection.title}
                          </h3>
                        </HeadlineReveal>
                      </div>
                      <p className="max-w-2xl text-lg leading-relaxed text-neutral-400">
                        {narrativeSection.body}
                      </p>
                    </div>
                  ) : null}
                </article>
                {designToolDiscovery && rowIndex === 1 ? (
                  <HomeDesignToolCallout
                    homeName={designToolDiscovery.homeName}
                    href={designToolDiscovery.href}
                    variant="quiet"
                  />
                ) : null}
              </Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
