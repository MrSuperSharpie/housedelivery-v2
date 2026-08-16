"use client";

import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";

import { HomeConfiguratorJourney } from "@/components/home-configurator-journey";
import { HeadlineReveal } from "@/components/headline-reveal";
import type {
  HomeDesignDirectionId,
  HomeDesignDirectionsExperience,
} from "@/data/home-design-collections";
import { cn } from "@/lib/cn";

type HomeDesignCollectionsProps = {
  experience: HomeDesignDirectionsExperience;
  selectedDirectionId: HomeDesignDirectionId;
  onSelectDirection: (directionId: HomeDesignDirectionId) => void;
};

export function HomeDesignCollections({
  experience,
  selectedDirectionId,
  onSelectDirection,
}: HomeDesignCollectionsProps) {
  const selectedDirection = experience.directions.find(
    (direction) => direction.id === selectedDirectionId,
  );

  if (!selectedDirection) {
    throw new Error(
      `Unknown ${experience.homeName} design direction: ${selectedDirectionId}`,
    );
  }

  return (
    <section
      id="design-collections"
      aria-labelledby="design-directions-heading"
      className="scroll-mt-20 border-y border-white/10 bg-[#0e1014] px-5 py-28 sm:px-8 lg:px-12 lg:py-40"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="mb-20 lg:mb-28">
          <HomeConfiguratorJourney
            currentStage="direction"
            ariaLabel="Design Direction journey"
            homeName={experience.homeName}
          />
        </div>

        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-20">
          <div>
            <p
              className="eyebrow"
              style={{ color: "rgb(255 255 255 / 0.6)" }}
            >
              {experience.homeName} / Design Directions
            </p>
            <HeadlineReveal variant="sweep" className="mt-7">
              <h2
                id="design-directions-heading"
                className="max-w-5xl text-[clamp(3.8rem,8.2vw,9rem)] font-medium leading-[0.84] tracking-[-0.075em]"
              >
                Set the visual
                <br />
                <span className="text-white/55">direction.</span>
              </h2>
            </HeadlineReveal>
          </div>
          <p className="max-w-2xl text-base leading-8 text-white/54 lg:justify-self-end lg:text-lg">
            {experience.introduction}
          </p>
        </div>

        <div
          role="group"
          aria-label={`${experience.homeName} design directions`}
          className="mt-20 grid gap-5 md:grid-cols-2 xl:mt-28 xl:grid-cols-3"
        >
          {experience.directions.map((direction) => {
            const isSelected = selectedDirectionId === direction.id;

            return (
              <article
                key={direction.id}
                data-selected={isSelected ? "true" : "false"}
                className={cn(
                  "flex h-full min-w-0 flex-col overflow-hidden border bg-[#0b0c10] transition-[border-color,background-color,opacity] duration-300",
                  isSelected
                    ? "border-white bg-white/[0.035] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]"
                    : "border-white/12 hover:border-white/34 hover:bg-white/[0.015]",
                )}
              >
                <button
                  type="button"
                  aria-pressed={isSelected}
                  aria-controls="selected-design-direction"
                  data-design-direction={direction.id}
                  onClick={() => onSelectDirection(direction.id)}
                  className="group flex flex-1 flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white"
                >
                  <span className="relative block aspect-[4/3] overflow-hidden border-b border-white/12 bg-[#121419]">
                    <Image
                      src={direction.image.src}
                      alt={direction.image.alt}
                      fill
                      quality={90}
                      sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1279px) 50vw, 33vw"
                      className="object-cover transition-[transform,filter] duration-700 ease-out group-hover:scale-[1.015] group-hover:brightness-[1.035] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                    {isSelected ? (
                      <span className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white text-[#0b0c10] shadow-lg">
                        <Check aria-hidden="true" className="size-4" strokeWidth={2} />
                      </span>
                    ) : null}
                  </span>

                  <span className="flex flex-1 flex-col px-6 pb-7 pt-6 sm:px-7 sm:pb-8 sm:pt-7">
                    <span className="flex items-center justify-between gap-5 text-[9px] font-semibold uppercase tracking-[0.19em] text-white/55">
                      <span>
                        {isSelected
                          ? `Your ${experience.homeName} direction`
                          : "Design direction"}
                      </span>
                      <span className="font-mono font-normal text-white/55">
                        {direction.number} /{" "}
                        {String(experience.directions.length).padStart(2, "0")}
                      </span>
                    </span>

                    <span className="mt-8 block text-[clamp(2rem,3vw,3rem)] font-medium leading-[0.94] tracking-[-0.055em] text-white/92">
                      {direction.name}
                    </span>
                    <span className="mt-5 block text-sm leading-7 text-white/52">
                      {direction.description}
                    </span>

                    <span
                      className={cn(
                        "mt-auto flex items-center gap-3 pt-8 text-[9px] font-semibold uppercase tracking-[0.18em] transition-colors",
                        isSelected
                          ? "text-white"
                          : "text-white/55 group-hover:text-white/72",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-2 rounded-full border",
                          isSelected
                            ? "border-white bg-white"
                            : "border-white/45 bg-transparent",
                        )}
                      />
                      {isSelected ? "Selected" : "Select direction"}
                    </span>
                  </span>
                </button>

                {isSelected ? (
                  <a
                    href="#home-inclusions"
                    data-continue-design-direction={direction.id}
                    className="group flex min-h-14 items-center justify-between gap-5 border-t border-white bg-white px-6 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#0b0c10] transition-colors hover:bg-[#ded9cd] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white"
                  >
                    <span>Build My {experience.homeName}</span>
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 shrink-0 transition-transform group-hover:translate-x-1"
                      strokeWidth={1.5}
                    />
                  </a>
                ) : null}
              </article>
            );
          })}
        </div>

        <div
          id="selected-design-direction"
          aria-live="polite"
          className="mt-8 border-t border-white/20 bg-white/[0.018] px-6 py-10 sm:px-9 sm:py-12 lg:px-12 lg:py-14"
        >
          <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
            <div>
              <p className="flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/72">
                <Check aria-hidden="true" className="size-3" strokeWidth={2} />
                Your {experience.homeName} direction / Selected
              </p>
              <h3 className="mt-6 text-[clamp(2.5rem,5vw,5.5rem)] font-medium leading-[0.92] tracking-[-0.065em] text-white/92">
                {selectedDirection.name}
              </h3>
              <p className="mt-7 max-w-xl text-base leading-8 text-white/54">
                {selectedDirection.description}
              </p>
            </div>

            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/55">
                Principal material cues
              </p>
              <ul className="mt-5 grid gap-x-8 sm:grid-cols-2">
                {selectedDirection.designCues.map((cue) => (
                  <li
                    key={cue}
                    className="border-t border-white/10 py-3 text-xs leading-5 text-white/58"
                  >
                    {cue}
                  </li>
                ))}
              </ul>
              <p className="mt-8 max-w-2xl border-t border-white/14 pt-6 text-sm leading-7 text-white/56">
                This direction guides visual coordination. {experience.homeName}
                {" "}still begins from a Premium inclusion baseline, with
                controlled Signature upgrades selected independently by
                category.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-28 max-w-5xl border-t border-white/12 pt-6 text-xs leading-6 text-white/55 lg:mt-40">
          Illustrative design visualizations. Design Directions establish a
          coordinated visual language; final products, finishes, availability
          and technical suitability are confirmed separately during project
          review.
        </p>
      </div>
    </section>
  );
}
