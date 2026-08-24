"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Bath, BedDouble, Car, Layers3 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { RevealText } from "@/components/reveal-text";
import type { HomeModel } from "@/data/models";
import { cn } from "@/lib/cn";

type ModelShowcaseProps = {
  models: readonly HomeModel[];
  introCopy?: string;
  valueCopy?: string;
};

const filters = [
  { label: "All homes", test: () => true },
  { label: "Under 3,000", test: (squareFeet: number) => squareFeet < 3000 },
  {
    label: "3,000–4,000",
    test: (squareFeet: number) => squareFeet >= 3000 && squareFeet < 4000,
  },
  { label: "4,000+", test: (squareFeet: number) => squareFeet >= 4000 },
] as const;

type ViewMode = "exterior" | "plan";

export function ModelShowcase({
  models,
  introCopy = "Every model begins as a pre-engineered component system and is adapted to your land, local code, climate loads, and chosen level of finish.",
  valueCopy,
}: ModelShowcaseProps) {
  const [activeFilter, setActiveFilter] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("exterior");
  const filteredModels = models.filter((model) =>
    filters[activeFilter].test(model.squareFeet),
  );

  return (
    <section
      id="models"
      className="scroll-mt-20 bg-[#0B0C10] px-5 pb-24 pt-28 sm:px-8 lg:px-12 lg:pb-32 lg:pt-40"
    >
      <span id="homes" className="block scroll-mt-20" aria-hidden="true" />
      <div className="mx-auto max-w-[1504px]">
        <div className="grid gap-12 border-b border-white/10 pb-12 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div>
            <p className="eyebrow">
              Featured custom homes / {models.length} residences
            </p>
            <h2 className="mt-6 max-w-3xl text-[clamp(3rem,6.2vw,6.8rem)] font-medium leading-[0.92] tracking-[-0.065em]">
              <RevealText text="Find your" />
              <br />
              <span className="text-white/42">
                <RevealText text="starting point." delay={0.12} />
              </span>
            </h2>
          </div>
          <p className="max-w-xl justify-self-end text-base leading-7 text-white/55 lg:text-lg lg:leading-8">
            {introCopy}
            {valueCopy ? (
              <span className="mt-4 block text-sm leading-6 text-white/38 lg:text-base lg:leading-7">
                {valueCopy}
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-col gap-8 py-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-x-7 gap-y-3" aria-label="Filter models">
            {filters.map((filter, index) => (
              <button
                key={filter.label}
                type="button"
                onClick={() => setActiveFilter(index)}
                className={cn(
                  "border-b py-2 text-xs transition-colors",
                  activeFilter === index
                    ? "border-white text-white"
                    : "border-transparent text-white/42 hover:text-white/75",
                )}
                aria-pressed={activeFilter === index}
              >
                {filter.label} sq. ft.
              </button>
            ))}
          </div>

          <div className="inline-flex w-fit border border-white/15 p-1" aria-label="Image view">
            {(["exterior", "plan"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
                  viewMode === mode
                    ? "bg-white text-black"
                    : "text-white/45 hover:text-white",
                )}
                aria-pressed={viewMode === mode}
              >
                {mode === "exterior" ? "Residence" : "Floor plan"}
              </button>
            ))}
          </div>
        </div>

        <motion.div
          id="custom-homes-grid"
          layout
          className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {filteredModels.map((model, index) => (
              <motion.article
                layout
                key={model.slug}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.45, delay: Math.min(index * 0.035, 0.2) }}
                className="group flex min-h-[620px] flex-col overflow-hidden border border-white/10 bg-[#0B0C10] p-7 transition-colors duration-500 hover:border-white/25 sm:p-8"
              >
                <Link
                  href={`/homes/${model.slug}`}
                  aria-label={`Explore ${model.name}`}
                  className="relative -mx-7 -mt-7 block aspect-[16/10] overflow-hidden border-b border-white/10 bg-[#13151a] sm:-mx-8 sm:-mt-8"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${model.slug}-${viewMode}`}
                      initial={{ opacity: 0, scale: 1.015 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      className="absolute inset-0"
                    >
                      <Image
                        src={
                          viewMode === "exterior"
                            ? model.images[0]
                            : model.floorPlanImage
                        }
                        alt={
                          viewMode === "exterior"
                            ? `${model.name} exterior`
                            : `${model.name} floor plan reference`
                        }
                        fill
                        quality={95}
                        sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, (max-width: 1599px) 33vw, 488px"
                        style={{ imageRendering: "auto" }}
                        className={cn(
                          "brightness-90 transition-all duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)] hover:scale-[1.04] hover:brightness-100 group-hover:scale-[1.04] group-hover:brightness-100 group-hover:scale-105 transition-transform duration-700 ease-in-out",
                          viewMode === "exterior"
                            ? "object-cover object-center"
                            : "bg-[#e9e7e1] object-contain p-4 sm:p-8",
                        )}
                      />
                    </motion.div>
                  </AnimatePresence>
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent" />
                  <span className="absolute left-5 top-5 border border-white/30 bg-black/25 px-3 py-2 text-[9px] uppercase tracking-[0.18em] backdrop-blur-md">
                    {model.locationLabel}
                  </span>
                  <span
                    className="absolute right-5 top-5 grid size-11 place-items-center rounded-full border border-white/35 bg-black/20 text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black"
                  >
                    <ArrowUpRight size={16} />
                  </span>
                </Link>

                <div className="grid gap-6 pb-8 pt-7 xl:grid-cols-[1fr_auto] xl:items-start">
                  <div>
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="text-[clamp(2rem,3vw,3.25rem)] font-medium leading-[0.94] tracking-[-0.055em] text-white/90">
                        <Link
                          href={`/homes/${model.slug}`}
                          className="transition-colors hover:text-white/65"
                        >
                          {model.name}
                        </Link>
                      </h3>
                      <p className="text-xl font-light tracking-[-0.04em] text-white/65 xl:hidden">
                        {model.squareFeet.toLocaleString()}{" "}
                        <span className="text-[10px] uppercase tracking-[0.14em]">
                          sq. ft.
                        </span>
                      </p>
                    </div>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/46">
                      {model.summary}
                    </p>
                  </div>

                  <div className="hidden text-right xl:block">
                    <p className="text-3xl font-light tracking-[-0.055em]">
                      {model.squareFeet.toLocaleString()}
                    </p>
                    <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-white/40">
                      Square feet
                    </p>
                  </div>
                </div>

                <dl className="mt-auto grid grid-cols-2 gap-y-3 border-t border-white/10 pt-5 text-[10px] uppercase tracking-[0.13em] text-white/44 sm:flex sm:flex-wrap sm:gap-7">
                  <div className="flex items-center gap-2">
                    <BedDouble size={14} />
                    <dt className="sr-only">Bedrooms</dt>
                    <dd>{model.bedrooms} beds</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bath size={14} />
                    <dt className="sr-only">Bathrooms</dt>
                    <dd>
                      {model.bathrooms === null
                        ? "Baths on request"
                        : `${model.bathrooms} baths`}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers3 size={14} />
                    <dt className="sr-only">Storeys</dt>
                    <dd>{model.storeys} storeys</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <Car size={14} />
                    <dt className="sr-only">Garage spaces</dt>
                    <dd>
                      {model.garageLabel ??
                        (model.garageSpaces === null
                          ? "Garage varies"
                          : model.garageSpaces === 0
                            ? "No garage"
                            : `${model.garageSpaces}-car`)}
                    </dd>
                  </div>
                </dl>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>

      </div>
    </section>
  );
}
