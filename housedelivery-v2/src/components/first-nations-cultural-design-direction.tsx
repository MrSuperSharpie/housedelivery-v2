"use client";

import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";

import {
  culturalDesignAreas,
  type CulturalDesignAreaId,
  type CulturalDesignDirection,
} from "@/data/first-nations-cultural-design";
import { cn } from "@/lib/cn";

type FirstNationsCulturalDesignDirectionProps = {
  homeName: string;
  image?: { src: string; alt: string };
  direction?: CulturalDesignDirection;
  onChoose: (choice: CulturalDesignDirection["choice"]) => void;
  onToggleArea: (areaId: CulturalDesignAreaId) => void;
  onContinue: () => void;
};

export function FirstNationsCulturalDesignDirection({
  homeName,
  image,
  direction,
  onChoose,
  onToggleArea,
  onContinue,
}: FirstNationsCulturalDesignDirectionProps) {
  const isExploring = direction?.choice === "explore";

  return (
    <section
      id="cultural-place-based-design"
      data-cultural-design-direction={direction?.choice ?? "unanswered"}
      className="mt-16 scroll-mt-28 border-y border-white/16 py-8 sm:py-10 lg:mt-24 lg:py-14"
    >
      <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/46">
            Optional / First Nations project pathway
          </p>
          <h3 className="mt-5 max-w-xl text-[clamp(2.3rem,4.7vw,5rem)] font-medium uppercase leading-[0.9] tracking-[-0.06em] text-white/92">
            Would you like to explore a Cultural &amp; Place-Based Design
            direction for this home?
          </h3>
          <p className="mt-6 max-w-lg text-sm leading-7 text-white/52">
            This records an early Nation-led design intent for project review.
            It does not create a fixed product, supplier package, technical
            approval or change to the selected Premium / Signature structure.
          </p>
        </div>

        <div>
          <div
            role="group"
            aria-label="Cultural and place-based design direction"
            className="grid gap-3 sm:grid-cols-2"
          >
            <button
              type="button"
              aria-pressed={isExploring}
              onClick={() => onChoose("explore")}
              className={cn(
                "flex min-h-16 items-center justify-between gap-6 border px-5 text-left text-[9px] font-semibold uppercase leading-5 tracking-[0.15em] transition-colors",
                isExploring
                  ? "border-white bg-white text-[#111216]"
                  : "border-white/20 text-white/66 hover:border-white/55 hover:text-white",
              )}
            >
              Yes — Explore Cultural &amp; Place-Based Design
              {isExploring ? <Check aria-hidden="true" className="size-4 shrink-0" /> : null}
            </button>
            <button
              type="button"
              aria-pressed={direction?.choice === "contemporary"}
              onClick={() => onChoose("contemporary")}
              className={cn(
                "flex min-h-16 items-center justify-between gap-6 border px-5 text-left text-[9px] font-semibold uppercase leading-5 tracking-[0.15em] transition-colors",
                direction?.choice === "contemporary"
                  ? "border-white bg-white text-[#111216]"
                  : "border-white/20 text-white/66 hover:border-white/55 hover:text-white",
              )}
            >
              No — Continue with Contemporary Design
              {direction?.choice === "contemporary" ? <Check aria-hidden="true" className="size-4 shrink-0" /> : null}
            </button>
          </div>

          {isExploring ? (
            <div className="mt-8">
              {image ? (
                <figure>
                  <div className="relative aspect-video overflow-hidden bg-white/[0.035]">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 58vw, 100vw"
                      className="object-contain"
                    />
                  </div>
                  <figcaption className="mt-4 text-[9px] font-semibold uppercase tracking-[0.19em] text-white/58">
                    Illustrative Design Inspiration
                  </figcaption>
                  <p className="mt-2 text-xs leading-5 text-white/42">
                    A visual prompt for Nation-led discussion about {homeName};
                    not a fixed design, approved product or supplier package.
                  </p>
                </figure>
              ) : (
                <div className="border border-white/16 p-5 text-sm leading-6 text-white/48">
                  No matching illustrative image is currently available for this
                  home. No substitute has been used; the design intent can still
                  be carried into project review.
                </div>
              )}

              <fieldset className="mt-9 border-t border-white/16 pt-6">
                <legend className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/52">
                  Areas to explore / Select all that apply
                </legend>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {culturalDesignAreas.map((area) => {
                    const checked = direction.areas.includes(area.id);
                    return (
                      <label
                        key={area.id}
                        className={cn(
                          "flex min-h-14 cursor-pointer items-center gap-3 border px-4 text-sm transition-colors",
                          checked
                            ? "border-white bg-white text-[#111216]"
                            : "border-white/16 text-white/60 hover:border-white/45 hover:text-white",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggleArea(area.id)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={cn(
                            "grid size-5 shrink-0 place-items-center border",
                            checked ? "border-black" : "border-white/28",
                          )}
                        >
                          {checked ? <Check className="size-3" /> : null}
                        </span>
                        {area.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <button
                type="button"
                onClick={onContinue}
                className="mt-8 inline-flex min-h-12 w-full items-center justify-between gap-7 bg-white px-5 text-left text-[9px] font-semibold uppercase tracking-[0.16em] text-[#111216] transition-colors hover:bg-white/82 sm:w-auto sm:min-w-80"
              >
                Continue to Design Center
                <ArrowRight aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
