import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";

import {
  getHomeInclusionLevelLabel,
  type HomeInclusionOption,
} from "@/data/home-configurator";
import { cn } from "@/lib/cn";

type HomeInclusionOptionCardProps = {
  option: HomeInclusionOption;
  homeName?: string;
  isSelected: boolean;
  onSelect: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  nextLabel?: string;
  confirmCategoryId?: string;
  confirmZoneId?: string;
  sizes?: string;
};

export function HomeInclusionOptionCard({
  option,
  homeName = "Home",
  isSelected,
  onSelect,
  onConfirm,
  confirmLabel = "Confirm & Continue",
  nextLabel,
  confirmCategoryId,
  confirmZoneId,
  sizes = "(max-width: 1023px) calc(100vw - 40px), 34vw",
}: HomeInclusionOptionCardProps) {
  return (
    <article
      data-selected={isSelected ? "true" : "false"}
      className={cn(
        "flex min-w-0 flex-col overflow-hidden border bg-[#0e1014] transition-[border-color,background-color,opacity] duration-300",
        isSelected
          ? "border-white bg-white/[0.04] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.24)]"
          : "border-white/12 hover:border-white/34 hover:bg-white/[0.015]",
      )}
    >
      <button
        type="button"
        aria-pressed={isSelected}
        data-home-option={option.id}
        data-option-level={option.level}
        onClick={onSelect}
        className="group flex flex-1 flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white"
      >
        <span className="relative block aspect-[4/3] overflow-hidden border-b border-white/12 bg-[#121419]">
          <Image
            src={option.image.src}
            alt={option.image.alt}
            fill
            quality={90}
            sizes={sizes}
            className={cn(
              option.image.fit === "contain"
                ? "object-contain"
                : "object-cover",
              "transition-transform duration-700 ease-out group-hover:scale-[1.012] motion-reduce:transition-none motion-reduce:group-hover:scale-100",
            )}
          />
          {isSelected ? (
            <span className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white text-[#0b0c10] shadow-lg">
              <Check aria-hidden="true" className="size-4" strokeWidth={2} />
            </span>
          ) : null}
        </span>

        <span className="flex flex-1 flex-col p-5 sm:p-7">
          <span
            className={cn(
              "text-[9px] font-semibold uppercase tracking-[0.18em]",
              option.level === "premium" ? "text-white/58" : "text-[#d8c4a5]",
            )}
          >
            {getHomeInclusionLevelLabel(option.level)} · {option.optionNumber}
          </span>
          <span className="mt-6 text-[clamp(1.8rem,3vw,3.25rem)] font-medium leading-[0.94] tracking-[-0.055em] text-white/92">
            {option.name}
          </span>
          {option.description ? (
            <span className="mt-5 text-sm leading-7 text-white/50">
              {option.description}
            </span>
          ) : null}
          <span
            className={cn(
              "mt-auto flex items-center gap-3 border-t border-white/10 pt-6 text-[9px] font-semibold uppercase tracking-[0.17em]",
              isSelected ? "text-white" : "text-white/55",
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
            {isSelected
              ? `Selected for My ${homeName}`
              : "Select this option"}
          </span>
        </span>
      </button>

      {isSelected && onConfirm ? (
        <button
          type="button"
          data-confirm-category={confirmCategoryId}
          data-confirm-flooring-zone={confirmZoneId}
          onClick={onConfirm}
          className="group flex min-h-16 w-full items-center justify-between gap-6 border-t border-white bg-white px-5 text-left text-[#0b0c10] transition-colors hover:bg-[#ded9cd] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white sm:px-7"
        >
          <span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.17em]">
              {confirmLabel}
            </span>
            {nextLabel ? (
              <span className="mt-1 block text-[9px] leading-4 text-black/58">
                Next: {nextLabel}
              </span>
            ) : null}
          </span>
          <ArrowRight
            aria-hidden="true"
            className="size-4 shrink-0 transition-transform group-hover:translate-x-1"
            strokeWidth={1.5}
          />
        </button>
      ) : null}
    </article>
  );
}
