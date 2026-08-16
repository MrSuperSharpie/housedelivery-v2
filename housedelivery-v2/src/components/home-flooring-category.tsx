import { ArrowDown, Check, Pencil } from "lucide-react";
import Image from "next/image";

import { HomeInclusionOptionCard } from "@/components/home-inclusion-option-card";
import {
  getHomeInclusionLevelLabel,
  type HomeFlooringCategory as HomeFlooringCategoryData,
  type HomeInclusionOption,
} from "@/data/home-configurator";

type HomeFlooringCategoryProps = {
  houseName: string;
  disclaimer: string;
  category: HomeFlooringCategoryData;
  selectedOptions: Readonly<Record<string, HomeInclusionOption | undefined>>;
  isActive: boolean;
  isComplete: boolean;
  onSelectOption: (zoneId: string, optionId: string) => void;
  onConfirm: () => void;
  onEdit: () => void;
};

export function HomeFlooringCategory({
  houseName,
  disclaimer,
  category,
  selectedOptions,
  isActive,
  isComplete,
  onSelectOption,
  onConfirm,
  onEdit,
}: HomeFlooringCategoryProps) {
  const headingId = `home-${category.id}-heading`;
  const hasEveryZone = category.zones.every(
    (zone) => selectedOptions[zone.id] !== undefined,
  );

  if (isComplete && !isActive) {
    return (
      <article
        id={`home-category-${category.id}`}
        data-home-category={category.id}
        data-category-kind="flooring"
        data-category-state="complete"
        className="scroll-mt-28 border border-white/18 bg-white/[0.02] p-5 sm:p-6"
      >
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/55">
              <Check aria-hidden="true" className="size-3" strokeWidth={2} />
              {category.number} / Complete
            </p>
            <h3 className="mt-3 text-2xl font-medium tracking-[-0.04em] text-white/88 sm:text-3xl">
              {category.title}
            </h3>
          </div>

          <ul className="grid min-w-0 flex-[2] gap-3 sm:grid-cols-3">
            {category.zones.map((zone) => {
              const option = selectedOptions[zone.id];
              if (!option) return null;

              return (
                <li
                  key={zone.id}
                  className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3 border border-white/10 p-2"
                >
                  <div className="relative aspect-square overflow-hidden bg-[#15171b]">
                    <Image
                      src={option.image.src}
                      alt=""
                      fill
                      quality={90}
                      sizes="72px"
                      className={
                        option.image.fit === "contain"
                          ? "object-contain"
                          : "object-cover"
                      }
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-white/55">
                      {zone.shortTitle}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-white/66">
                      {option.name}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            data-edit-category={category.id}
            onClick={onEdit}
            className="inline-flex min-h-11 items-center justify-center gap-3 border border-white/24 px-5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/70 transition-colors hover:border-white hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <Pencil aria-hidden="true" className="size-3" strokeWidth={1.5} />
            Edit
          </button>
        </div>
      </article>
    );
  }

  if (!isActive) {
    return (
      <article
        id={`home-category-${category.id}`}
        data-home-category={category.id}
        data-category-kind="flooring"
        data-category-state="upcoming"
        className="scroll-mt-28 border border-white/8 px-6 py-7 text-white/55 sm:px-8"
      >
        <div className="flex items-center gap-6">
          <span className="font-mono text-[10px] tracking-[0.18em]">
            {category.number}
          </span>
          <h3 className="text-xl font-medium tracking-[-0.03em] sm:text-2xl">
            {category.title}
          </h3>
          <span className="ml-auto text-[8px] font-semibold uppercase tracking-[0.17em]">
            Three zones
          </span>
        </div>
      </article>
    );
  }

  return (
    <section
      id={`home-category-${category.id}`}
      tabIndex={-1}
      aria-labelledby={headingId}
      data-home-category={category.id}
      data-category-kind="flooring"
      data-category-state="active"
      className="scroll-mt-28 border border-white/22 bg-[#0b0c10] p-5 outline-none sm:p-8 lg:p-10"
    >
      <div className="grid gap-10 border-t border-white/15 pt-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
        <div>
          <p className="eyebrow">
            My {houseName} / {category.number} {category.title}
          </p>
          <h2
            id={headingId}
            className="mt-6 text-[clamp(3.25rem,6vw,6.5rem)] font-medium leading-[0.86] tracking-[-0.07em]"
          >
            Choose
            <br />
            <span className="text-white/55">by zone.</span>
          </h2>
        </div>
        <div className="max-w-2xl lg:justify-self-end lg:self-end">
          <p className="text-base leading-8 text-white/56">
            {category.description}
          </p>
          <p className="mt-5 text-xs leading-6 text-white/55">
            {category.technicalNote}
          </p>
        </div>
      </div>

      <div className="mt-12 grid gap-12 lg:mt-16 lg:gap-16">
        {category.zones.map((zone) => (
          <section
            key={zone.id}
            aria-labelledby={`home-${zone.id}-heading`}
            data-flooring-zone={zone.id}
            className="border-t border-white/14 pt-6"
          >
            <div className="grid gap-5 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-10">
              <div>
                <p className="font-mono text-[9px] tracking-[0.16em] text-white/55">
                  Zone {zone.number} / 03
                </p>
                <h3
                  id={`home-${zone.id}-heading`}
                  className="mt-4 text-2xl font-medium tracking-[-0.045em] text-white/88"
                >
                  {zone.title}
                </h3>
                <p className="mt-3 text-xs leading-6 text-white/55">
                  {zone.description}
                </p>
              </div>
              <div
                role="group"
                aria-label={`${zone.title} flooring choices`}
                className="grid gap-4 sm:grid-cols-2"
              >
                {zone.options.map((option) => (
                  <HomeInclusionOptionCard
                    key={option.id}
                    option={option}
                    isSelected={option.id === selectedOptions[zone.id]?.id}
                    onSelect={() => onSelectOption(zone.id, option.id)}
                    sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) 50vw, 28vw"
                  />
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-start justify-between gap-5 border-t border-white/14 pt-7 sm:flex-row sm:items-center">
        <div className="max-w-xl">
          <p className="text-xs leading-6 text-white/55">
            {category.zones.map((zone) => {
              const option = selectedOptions[zone.id];
              return option
                ? `${zone.shortTitle}: ${option.name} (${getHomeInclusionLevelLabel(option.level)})`
                : `${zone.shortTitle}: choose a direction`;
            }).join(" · ")}
          </p>
          <p className="mt-3 text-[10px] leading-5 text-white/55">
            {disclaimer}
          </p>
        </div>
        <button
          type="button"
          data-confirm-category={category.id}
          disabled={!hasEveryZone}
          onClick={onConfirm}
          className="group inline-flex min-h-12 w-full items-center justify-between gap-8 border border-white bg-white px-5 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#0b0c10] transition-colors hover:bg-transparent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-transparent disabled:text-white/30 sm:w-auto"
        >
          <span>{isComplete ? "Save flooring" : `Complete My ${houseName}`}</span>
          <ArrowDown
            aria-hidden="true"
            className="size-4 shrink-0 transition-transform group-hover:translate-y-1"
            strokeWidth={1.5}
          />
        </button>
      </div>
    </section>
  );
}
