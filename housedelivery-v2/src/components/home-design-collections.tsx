"use client";

import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { HeadlineReveal } from "@/components/headline-reveal";
import type {
  HomeDesignCollection,
  HomeDesignCollectionsExperience,
} from "@/data/home-design-collections";
import { cn } from "@/lib/cn";

type HomeDesignCollectionsProps = {
  experience: HomeDesignCollectionsExperience;
};

const fallbackSurfaces = [
  {
    base: "bg-[#d7d2c7]",
    plane: "bg-[#f0ede6]",
    material: "bg-[#b9b0a1]",
    accent: "bg-[#2a2b2c]",
  },
  {
    base: "bg-[#c8bba7]",
    plane: "bg-[#e8e0d4]",
    material: "bg-[#9c856d]",
    accent: "bg-[#443c36]",
  },
  {
    base: "bg-[#77736d]",
    plane: "bg-[#d9d4cb]",
    material: "bg-[#a69a89]",
    accent: "bg-[#242629]",
  },
  {
    base: "bg-[#d4cbbc]",
    plane: "bg-[#eee8dc]",
    material: "bg-[#b4a68f]",
    accent: "bg-[#6e5d4d]",
  },
  {
    base: "bg-[#796556]",
    plane: "bg-[#c4b5a3]",
    material: "bg-[#a28d77]",
    accent: "bg-[#3f332c]",
  },
  {
    base: "bg-[#cfc9be]",
    plane: "bg-[#e9e5dc]",
    material: "bg-[#afa99e]",
    accent: "bg-[#777269]",
  },
] as const;

function CollectionVisual({
  collection,
  visualIndex,
}: {
  collection: HomeDesignCollection;
  visualIndex: number;
}) {
  if (collection.image) {
    return (
      <span className="relative block aspect-[4/3] overflow-hidden border-b border-white/12 bg-[#121419]">
        <Image
          src={collection.image.src}
          alt={collection.image.alt}
          fill
          quality={90}
          sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1279px) 50vw, 33vw"
          className="object-cover"
        />
      </span>
    );
  }

  const surfaces = fallbackSurfaces[visualIndex % fallbackSurfaces.length];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative block aspect-[4/3] overflow-hidden border-b border-white/12",
        surfaces.base,
      )}
    >
      <span className="absolute inset-x-[8%] bottom-0 top-[15%] grid grid-cols-[1.35fr_0.65fr] gap-[3%]">
        <span className={surfaces.plane} />
        <span className="grid grid-rows-[1.25fr_0.75fr] gap-[5%]">
          <span className={surfaces.material} />
          <span className={surfaces.accent} />
        </span>
      </span>
      <span className="absolute inset-x-[8%] top-[7%] flex items-center justify-between text-[8px] font-semibold uppercase tracking-[0.2em] text-black/48">
        <span>Material direction</span>
        <span>{collection.number}</span>
      </span>
      <span className="noise absolute inset-0 opacity-[0.08]" />
    </span>
  );
}

export function HomeDesignCollections({
  experience,
}: HomeDesignCollectionsProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);

  return (
    <section
      id="design-collections"
      aria-labelledby="design-collections-heading"
      className="scroll-mt-20 border-y border-white/10 bg-[#0e1014] px-5 py-28 sm:px-8 lg:px-12 lg:py-40"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-20">
          <div>
            <p className="eyebrow">
              {experience.homeName} / Design Collections
            </p>
            <HeadlineReveal variant="sweep" className="mt-7">
              <h2
                id="design-collections-heading"
                className="max-w-5xl text-[clamp(3.8rem,8.2vw,9rem)] font-medium leading-[0.84] tracking-[-0.075em]"
              >
                Make {experience.homeName}
                <br />
                <span className="text-white/40">Yours.</span>
              </h2>
            </HeadlineReveal>
          </div>
          <p className="max-w-2xl text-base leading-8 text-white/54 lg:justify-self-end lg:text-lg">
            {experience.introduction}
          </p>
        </div>

        <div className="mt-24 space-y-28 sm:mt-32 sm:space-y-36 lg:mt-40 lg:space-y-48">
          {experience.tiers.map((tier, tierIndex) => {
            const selectedCollection = tier.collections.find(
              (collection) => collection.id === selectedCollectionId,
            );
            const detailId = `design-collection-detail-${tier.id}`;

            return (
              <section
                key={tier.id}
                aria-labelledby={`design-tier-${tier.id}`}
              >
                <div className="grid gap-8 border-t border-white/15 pt-7 lg:grid-cols-[0.65fr_1.35fr] lg:gap-20">
                  <div className="flex items-start justify-between gap-8 lg:block">
                    <span className="font-mono text-[9px] tracking-[0.2em] text-white/30">
                      {tier.number} / {String(experience.tiers.length).padStart(2, "0")}
                    </span>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/42 lg:mt-5">
                      Whole-home finish level
                    </p>
                  </div>
                  <div>
                    <h3
                      id={`design-tier-${tier.id}`}
                      className="text-[clamp(3rem,6vw,6.8rem)] font-medium leading-none tracking-[-0.07em] text-white/92"
                    >
                      {tier.name}
                    </h3>
                    <p className="mt-7 max-w-2xl text-base leading-7 text-white/52 sm:text-lg sm:leading-8">
                      {tier.description}
                    </p>
                  </div>
                </div>

                <div
                  role="group"
                  aria-label={`${tier.name} design collections`}
                  className="mt-14 grid gap-5 md:grid-cols-2 xl:mt-20 xl:grid-cols-3"
                >
                  {tier.collections.map((collection, collectionIndex) => {
                    const isSelected =
                      selectedCollectionId === collection.id;
                    const visualIndex = tierIndex * 3 + collectionIndex;

                    return (
                      <button
                        key={collection.id}
                        type="button"
                        aria-pressed={isSelected}
                        aria-controls={isSelected ? detailId : undefined}
                        data-design-collection={collection.id}
                        data-design-tier={tier.id}
                        data-selected={isSelected ? "true" : "false"}
                        onClick={() => setSelectedCollectionId(collection.id)}
                        className={cn(
                          "group flex h-full min-w-0 flex-col border bg-[#0b0c10] text-left transition-[border-color,background-color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white",
                          isSelected
                            ? "border-white/75 bg-white/[0.025]"
                            : "border-white/12 hover:border-white/32 hover:bg-white/[0.015]",
                        )}
                      >
                        <CollectionVisual
                          collection={collection}
                          visualIndex={visualIndex}
                        />

                        <span className="flex flex-1 flex-col p-6 sm:p-7">
                          <span className="flex items-start justify-between gap-5">
                            <span className="text-[9px] font-semibold uppercase tracking-[0.19em] text-white/48">
                              {tier.name} / {collection.number}
                            </span>
                            <span
                              className={cn(
                                "grid size-6 shrink-0 place-items-center border transition-colors",
                                isSelected
                                  ? "border-white bg-white text-[#0b0c10]"
                                  : "border-white/18 text-transparent",
                              )}
                              aria-hidden="true"
                            >
                              <Check className="size-3" strokeWidth={1.7} />
                            </span>
                          </span>

                          <span className="mt-10 block text-[clamp(2rem,3.2vw,3.35rem)] font-medium leading-[0.94] tracking-[-0.055em] text-white/92">
                            {collection.name}
                          </span>
                          <span className="mt-5 block text-sm leading-7 text-white/52">
                            {collection.description}
                          </span>

                          <span className="mt-8 grid border-l border-t border-white/10">
                            {collection.designCues.slice(0, 3).map((cue) => (
                              <span
                                key={cue}
                                className="border-b border-r border-white/10 px-3 py-3 text-[9px] uppercase leading-4 tracking-[0.14em] text-white/42"
                              >
                                {cue}
                              </span>
                            ))}
                          </span>

                          <span
                            className={cn(
                              "mt-auto flex items-center justify-between gap-4 border-t border-white/10 pt-6 text-[9px] font-semibold uppercase tracking-[0.18em] transition-colors",
                              isSelected
                                ? "text-white"
                                : "text-white/45 group-hover:text-white/72",
                            )}
                          >
                            {isSelected ? "Selected" : "Select direction"}
                            <ArrowRight
                              className="size-3.5 transition-transform group-hover:translate-x-1"
                              strokeWidth={1.5}
                            />
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedCollection ? (
                  <div
                    id={detailId}
                    role="status"
                    aria-live="polite"
                    className="mt-8 border border-white/18 bg-[#0b0c10] p-6 sm:p-9 lg:p-12"
                  >
                    <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/42">
                          Selected direction / {tier.name}
                        </p>
                        <h4 className="mt-6 text-[clamp(2.5rem,5vw,5.5rem)] font-medium leading-[0.92] tracking-[-0.065em] text-white/92">
                          {selectedCollection.name}
                        </h4>
                        <p className="mt-7 max-w-xl text-base leading-8 text-white/54">
                          {selectedCollection.description}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/42">
                          Principal material cues
                        </p>
                        <ul className="mt-5 grid border-l border-t border-white/10 sm:grid-cols-2">
                          {selectedCollection.designCues.map((cue) => (
                            <li
                              key={cue}
                              className="border-b border-r border-white/10 px-4 py-4 text-xs leading-5 text-white/58"
                            >
                              {cue}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-8 flex items-center justify-between gap-5 border-t border-white/14 pt-6 text-[10px] font-semibold uppercase leading-5 tracking-[0.16em] text-white/72">
                          <span>
                            Explore the coordinated inclusions for this design
                            direction.
                          </span>
                          <ArrowRight
                            aria-hidden="true"
                            className="size-4 shrink-0"
                            strokeWidth={1.5}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>

        <p className="mt-28 max-w-5xl border-t border-white/12 pt-6 text-xs leading-6 text-white/42 lg:mt-40">
          Illustrative design directions. Final products, finishes,
          availability, pricing and technical suitability are confirmed during
          project review and are subject to project-specific requirements.
        </p>
      </div>
    </section>
  );
}
