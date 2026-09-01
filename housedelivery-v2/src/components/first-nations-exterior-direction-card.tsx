"use client";

import { Check } from "lucide-react";
import Image from "next/image";

import type { CulturalDesignImage } from "@/data/first-nations-cultural-design";
import { cn } from "@/lib/cn";

type FirstNationsExteriorDirectionCardProps = {
  homeName: string;
  standardImage: string;
  coastalImage?: CulturalDesignImage;
  culturalExteriorInterest: boolean;
  onChange: (culturalExteriorInterest: boolean) => void;
};

export function FirstNationsExteriorDirectionCard({
  homeName,
  standardImage,
  coastalImage,
  culturalExteriorInterest,
  onChange,
}: FirstNationsExteriorDirectionCardProps) {
  const indigenousInspirationAvailable = Boolean(coastalImage);
  const culturalExteriorSelected =
    indigenousInspirationAvailable && culturalExteriorInterest;
  const image = culturalExteriorSelected && coastalImage
    ? coastalImage
    : { src: standardImage, alt: `${homeName} exterior` };

  return (
    <div
      data-cultural-exterior-interest={culturalExteriorSelected}
      data-indigenous-inspiration-available={indigenousInspirationAvailable}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-black/5">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          unoptimized
          sizes="(min-width: 1280px) 31vw, (min-width: 768px) 48vw, 100vw"
          className="object-cover"
        />
      </div>

      <fieldset className="mt-4 border-y border-black/14 py-4">
        <legend className="text-[9px] font-semibold uppercase tracking-[0.17em] text-black/46">
          Exterior direction
        </legend>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {([
            [false, "Contemporary"],
            [true, "Indigenous Inspiration"],
          ] as const).map(([value, label]) => {
            const selected = culturalExteriorSelected === value;
            const unavailable = value && !indigenousInspirationAvailable;
            return (
              <button
                key={label}
                type="button"
                aria-disabled={unavailable || undefined}
                aria-pressed={unavailable ? false : selected}
                disabled={unavailable}
                onClick={unavailable ? undefined : () => onChange(value)}
                className={cn(
                  "flex h-14 items-center justify-between gap-2 border px-3 text-left text-[9px] font-semibold uppercase leading-4 tracking-[0.13em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
                  unavailable
                    ? "cursor-not-allowed border-black/16 bg-black/[0.03] text-black/32"
                    : selected
                    ? "border-black bg-black text-white"
                    : "border-black/30 bg-white/35 text-black/68 hover:border-black hover:bg-white/80 hover:text-black",
                )}
              >
                <span className="flex min-w-0 flex-col items-start">
                  <span>{label}</span>
                  {unavailable ? (
                    <span className="text-[7px] leading-3 tracking-[0.16em]">
                      Coming Soon
                    </span>
                  ) : null}
                </span>
                {selected && !unavailable ? (
                  <Check aria-hidden="true" className="size-3.5 shrink-0" />
                ) : null}
              </button>
            );
          })}
        </div>
        {culturalExteriorSelected ? (
          <div className="mt-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/58">
              Illustrative Exterior Inspiration
            </p>
            <p className="mt-2 text-[10px] leading-5 text-black/44">
              An early visual direction only—not a fixed product, approved
              design or supplier package. The underlying home model remains {homeName}.
            </p>
          </div>
        ) : null}
      </fieldset>
    </div>
  );
}
