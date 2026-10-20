"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";

import { ContextualInclusionsLink } from "@/components/inclusions-journey-links";
import type { CarriageHome } from "@/data/carriage-homes";

type CarriageEditorialGalleryProps = {
  model: CarriageHome;
  floorPlanImage: string;
};

const luxuryEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function CarriageEditorialGallery({
  model,
  floorPlanImage,
}: CarriageEditorialGalleryProps) {
  const shouldReduceMotion = useReducedMotion();
  const galleryImages = model.images.filter(
    (image) => image.src !== floorPlanImage,
  );

  return (
    <section
      aria-labelledby="carriage-gallery-heading"
      className="px-5 py-24 sm:px-8 sm:py-28 lg:px-12 lg:py-36"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="grid gap-8 border-t border-white/14 pt-7 md:grid-cols-2 md:items-end">
          <div>
            <p className="eyebrow">Image study / {model.name}</p>
            <h2
              id="carriage-gallery-heading"
              className="mt-6 max-w-2xl text-[clamp(2.7rem,5vw,5.5rem)] font-medium leading-[0.9] tracking-[-0.06em]"
            >
              A closer study
              <br />
              <span className="text-white/38">of daily space.</span>
            </h2>
          </div>
          <p className="max-w-lg text-sm leading-7 text-white/44 md:justify-self-end">
            Exterior, interior, and assembly views are presented at their useful
            scale, with room for the architecture to be read clearly.
          </p>
        </div>

        <div className="mt-20 space-y-24 sm:space-y-28 lg:mt-28 lg:space-y-36">
          {galleryImages.map((image, index) => {
            const isReversed = index % 2 === 1;
            const theme = model.themes[index % model.themes.length];

            return (
              <article
                key={image.src}
                className={`flex flex-col gap-8 lg:items-end lg:gap-14 ${
                  isReversed
                    ? "lg:flex-row-reverse lg:justify-start"
                    : "lg:flex-row lg:justify-start"
                }`}
              >
                <motion.figure
                  initial={
                    shouldReduceMotion
                      ? false
                      : {
                          clipPath: "inset(0 0 12% 0)",
                          opacity: 0,
                          y: 32,
                        }
                  }
                  whileInView={{
                    clipPath: "inset(0 0 0% 0)",
                    opacity: 1,
                    y: 0,
                  }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{
                    duration: shouldReduceMotion ? 0 : 1,
                    ease: luxuryEase,
                  }}
                  className="w-full max-w-[820px]"
                >
                  <div className="relative aspect-[25/14] overflow-hidden bg-[#101217]">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      quality={95}
                      sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 895px) calc(100vw - 64px), 820px"
                      className="object-contain"
                    />
                  </div>
                  <figcaption className="mt-4 flex items-center justify-between gap-6 border-t border-white/12 pt-3 text-[8px] uppercase tracking-[0.18em] text-white/34 sm:text-[9px]">
                    <span>{image.label}</span>
                    <span>
                      {String(index + 1).padStart(2, "0")} /{" "}
                      {String(galleryImages.length).padStart(2, "0")}
                    </span>
                  </figcaption>
                </motion.figure>

                <motion.div
                  initial={
                    shouldReduceMotion ? false : { opacity: 0, y: 24 }
                  }
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{
                    duration: shouldReduceMotion ? 0 : 1,
                    delay: shouldReduceMotion ? 0 : 0.1,
                    ease: luxuryEase,
                  }}
                  className="max-w-xs border-t border-white/12 pt-5 lg:mb-10 lg:w-[240px]"
                >
                  <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/28 sm:text-[9px]">
                    Daily living / {String(index + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-5 text-xl font-medium leading-snug tracking-[-0.035em] text-white/72 sm:text-2xl">
                    {theme}
                  </p>
                  <ContextualInclusionsLink sourceLabel={image.label} />
                </motion.div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
