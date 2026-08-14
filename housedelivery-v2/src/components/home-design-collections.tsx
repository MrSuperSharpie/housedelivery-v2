"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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

function CollectionVisual({
  collection,
}: {
  collection: HomeDesignCollection;
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
          className="object-cover transition-[transform,filter] duration-700 ease-out group-hover:scale-[1.015] group-hover:brightness-[1.035] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="block aspect-[4/3] border-b border-white/12 bg-[#121419]"
    />
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
          {experience.tiers.map((tier) => {
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
                  {tier.collections.map((collection) => {
                    const isSelected =
                      selectedCollectionId === collection.id;

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
                          "group flex h-full min-w-0 flex-col overflow-hidden border bg-[#0b0c10] text-left transition-[border-color,background-color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white",
                          isSelected
                            ? "border-white/75 bg-white/[0.025]"
                            : "border-white/12 hover:border-white/32 hover:bg-white/[0.015]",
                        )}
                      >
                        <CollectionVisual collection={collection} />

                        <span className="flex flex-1 flex-col px-6 pb-7 pt-6 sm:px-7 sm:pb-8 sm:pt-7">
                          <span className="text-[9px] font-semibold uppercase tracking-[0.19em] text-white/48">
                            {tier.name} / {collection.number}
                          </span>

                          <span className="mt-8 block text-[clamp(2rem,3vw,3rem)] font-medium leading-[0.94] tracking-[-0.055em] text-white/92">
                            {collection.name}
                          </span>
                          <span className="mt-5 block text-sm leading-7 text-white/52">
                            {collection.description}
                          </span>

                          <span
                            className={cn(
                              "mt-auto flex items-center gap-3 pt-8 text-[9px] font-semibold uppercase tracking-[0.18em] transition-colors",
                              isSelected
                                ? "text-white"
                                : "text-white/45 group-hover:text-white/72",
                            )}
                          >
                            {isSelected ? "Direction selected" : "View direction"}
                            <ArrowRight
                              className="size-3.5 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
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
                    aria-live="polite"
                    className="mt-8 border-t border-white/20 bg-white/[0.018] px-6 py-10 sm:px-9 sm:py-12 lg:px-12 lg:py-14"
                  >
                    <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
                      <div>
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/42">
                          {tier.name} / Selected design direction
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
                        <ul className="mt-5 grid gap-x-8 sm:grid-cols-2">
                          {selectedCollection.designCues.map((cue) => (
                            <li
                              key={cue}
                              className="border-t border-white/10 py-3 text-xs leading-5 text-white/58"
                            >
                              {cue}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-8 max-w-2xl border-t border-white/14 pt-6 text-sm leading-7 text-white/56">
                          Your selected design direction coordinates the wider
                          Solace interior, including cabinetry, flooring,
                          stone, bathrooms, fixtures, doors and other
                          inclusions.
                        </p>
                        <Link
                          href={
                            selectedCollection.id === "premium-coastal-light"
                              ? "/homes/solace/design-collections/coastal-light"
                              : "/#reserve"
                          }
                          className="group mt-6 flex items-center justify-between gap-5 border-t border-white/14 pt-6 text-[10px] font-semibold uppercase leading-5 tracking-[0.16em] text-white/72 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                        >
                          <span>
                            {selectedCollection.id === "premium-coastal-light"
                              ? "Explore Coastal Light"
                              : `Begin a ${selectedCollection.name} project review`}
                          </span>
                          <ArrowRight
                            aria-hidden="true"
                            className="size-4 shrink-0 transition-transform group-hover:translate-x-1"
                            strokeWidth={1.5}
                          />
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>

        <p className="mt-28 max-w-5xl border-t border-white/12 pt-6 text-xs leading-6 text-white/42 lg:mt-40">
          Illustrative design visualizations. Final products, finishes,
          availability, pricing and technical suitability are confirmed during
          project review and are subject to project-specific requirements.
        </p>
      </div>
    </section>
  );
}
