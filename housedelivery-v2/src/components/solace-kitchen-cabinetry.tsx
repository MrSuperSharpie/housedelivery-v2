import { Check } from "lucide-react";
import Image from "next/image";

import type {
  SolaceKitchenCabinetryId,
  SolaceKitchenCabinetryOption,
} from "@/data/solace-configuration";
import { cn } from "@/lib/cn";

type SolaceKitchenCabinetryProps = {
  options: readonly SolaceKitchenCabinetryOption[];
  selectedOptionId: SolaceKitchenCabinetryId;
  onSelectOption: (optionId: SolaceKitchenCabinetryId) => void;
};

function getLevelLabel(option: SolaceKitchenCabinetryOption) {
  return option.level === "premium"
    ? "Premium — Included"
    : "Signature — Upgrade";
}

export function SolaceKitchenCabinetry({
  options,
  selectedOptionId,
  onSelectOption,
}: SolaceKitchenCabinetryProps) {
  return (
    <section
      id="solace-kitchen-cabinetry"
      aria-labelledby="solace-kitchen-cabinetry-heading"
      className="scroll-mt-20 border-b border-white/10 bg-[#0b0c10] px-5 py-28 sm:px-8 lg:px-12 lg:py-40"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="grid gap-12 border-t border-white/15 pt-7 lg:grid-cols-[0.78fr_1.22fr] lg:items-end lg:gap-20">
          <div>
            <p className="eyebrow">My Solace / 01 Kitchen Cabinetry</p>
            <h2
              id="solace-kitchen-cabinetry-heading"
              className="mt-7 max-w-4xl text-[clamp(3.5rem,7.4vw,8rem)] font-medium leading-[0.84] tracking-[-0.074em]"
            >
              Choose the
              <br />
              <span className="text-white/40">kitchen character.</span>
            </h2>
          </div>
          <div className="max-w-2xl lg:justify-self-end">
            <p className="text-base leading-8 text-white/56 lg:text-lg">
              Solace begins with Premium cabinetry included. Choose a
              controlled Premium expression, or select a Signature upgrade for
              this category without changing the level of the rest of the
              home.
            </p>
            <p className="mt-5 text-xs leading-6 text-white/38">
              Representative preliminary choices shown. Final cabinetry,
              finishes, dimensions and technical suitability are confirmed for
              the project.
            </p>
          </div>
        </div>

        <div
          role="group"
          aria-label="Kitchen cabinetry choices"
          className="mt-16 grid gap-5 md:grid-cols-2 lg:mt-24"
        >
          {options.map((option) => {
            const isSelected = option.id === selectedOptionId;

            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isSelected}
                data-solace-cabinetry-option={option.id}
                data-selected={isSelected ? "true" : "false"}
                onClick={() => onSelectOption(option.id)}
                className={cn(
                  "group flex min-w-0 flex-col overflow-hidden border bg-[#0e1014] text-left transition-[border-color,background-color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white",
                  isSelected
                    ? "border-white/78 bg-white/[0.03]"
                    : "border-white/12 hover:border-white/34 hover:bg-white/[0.015]",
                )}
              >
                <span className="relative block aspect-[4/3] overflow-hidden border-b border-white/12 bg-[#121419]">
                  <Image
                    src={option.image.src}
                    alt={option.image.alt}
                    fill
                    quality={90}
                    sizes="(max-width: 767px) calc(100vw - 40px), 50vw"
                    className={cn(
                      option.image.fit === "contain"
                        ? "object-contain"
                        : "object-cover",
                      "transition-transform duration-700 ease-out group-hover:scale-[1.015] motion-reduce:transition-none motion-reduce:group-hover:scale-100",
                    )}
                  />
                  {isSelected ? (
                    <span className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white text-[#0b0c10] shadow-lg">
                      <Check
                        aria-hidden="true"
                        className="size-4"
                        strokeWidth={2}
                      />
                    </span>
                  ) : null}
                </span>

                <span className="flex flex-1 flex-col p-6 sm:p-8">
                  <span
                    className={cn(
                      "text-[9px] font-semibold uppercase tracking-[0.19em]",
                      option.level === "premium"
                        ? "text-white/62"
                        : "text-[#d8c4a5]",
                    )}
                  >
                    {getLevelLabel(option)}
                  </span>
                  <span className="mt-7 text-[clamp(2.15rem,4vw,4.5rem)] font-medium leading-[0.92] tracking-[-0.06em] text-white/92">
                    {option.name}
                  </span>
                  <span className="mt-6 max-w-xl text-sm leading-7 text-white/52">
                    {option.customerDescription}
                  </span>
                  <span
                    className={cn(
                      "mt-auto flex items-center gap-3 border-t border-white/10 pt-6 text-[9px] font-semibold uppercase tracking-[0.18em]",
                      isSelected ? "text-white" : "text-white/42",
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
                    {isSelected ? "Selected for My Solace" : "Select cabinetry"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
