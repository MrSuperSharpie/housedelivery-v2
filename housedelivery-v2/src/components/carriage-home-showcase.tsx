"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { carriageHomes } from "@/data/carriage-homes";

const revealViewport = { once: true, margin: "-100px" } as const;
const luxuryEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

type CarriageHomeShowcaseProps = {
  featuredCount?: number;
};

export function CarriageHomeShowcase({
  featuredCount,
}: CarriageHomeShowcaseProps) {
  const shouldReduceMotion = useReducedMotion();
  const [showCompleteCollection, setShowCompleteCollection] = useState(false);
  const visibleHomes =
    featuredCount && !showCompleteCollection
      ? carriageHomes.slice(0, featuredCount)
      : carriageHomes;
  const canExpandCollection =
    !showCompleteCollection &&
    featuredCount !== undefined &&
    carriageHomes.length > featuredCount;

  return (
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

          <div
            id="carriage-homes-grid"
            className="mt-16 grid gap-8 md:grid-cols-2 md:gap-12 lg:mt-24"
          >
            {visibleHomes.map((model, index) => {
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
                  className="group relative flex min-h-[620px] flex-col overflow-hidden border border-white/10 bg-[#0B0C10] p-7 transition-colors duration-500 hover:border-white/25 focus-within:border-white/25 sm:p-8"
                >
                  <Link
                    href={`/homes/laneway-carriage/${model.slug}`}
                    aria-label={`View details for ${model.name}`}
                    className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white"
                  >
                    <span className="sr-only">View {model.name} details</span>
                  </Link>

                  <div className="relative -mx-7 -mt-7 aspect-[16/10] overflow-hidden border-b border-white/10 bg-[#13151a] sm:-mx-8 sm:-mt-8">
                    <Image
                      src={mainImage.src}
                      alt={mainImage.alt}
                      fill
                      quality={90}
                      sizes="(max-width: 767px) 100vw, (max-width: 1535px) 50vw, 728px"
                      style={{ imageRendering: "auto" }}
                      className="object-cover brightness-90 transition-all duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.04] group-hover:brightness-100 group-focus-within:scale-[1.04] group-focus-within:brightness-100"
                    />
                    <span className="absolute right-5 top-5 grid size-11 place-items-center rounded-full border border-white/35 bg-black/25 text-white backdrop-blur-md transition-colors group-hover:bg-white group-hover:text-black group-focus-within:bg-white group-focus-within:text-black">
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </span>
                  </div>

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

                    <span
                      className="mt-10 inline-flex items-center gap-5 border-b border-white/28 pb-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/62 transition-colors hover:border-white hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                    >
                      View residence
                      <ArrowUpRight size={13} aria-hidden="true" />
                    </span>
                  </div>
                </motion.article>
              );
            })}
          </div>

          {canExpandCollection ? (
            <div className="mt-12 border-t border-white/10 pt-7">
              <button
                type="button"
                aria-expanded="false"
                aria-controls="carriage-homes-grid"
                onClick={() => setShowCompleteCollection(true)}
                className="inline-flex min-h-11 items-center border-b border-white/28 py-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/62 transition-colors hover:border-white hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                View complete laneway and carriage collection
              </button>
            </div>
          ) : null}

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
  );
}
