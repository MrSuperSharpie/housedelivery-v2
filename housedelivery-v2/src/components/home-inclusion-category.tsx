import { Check, Pencil } from "lucide-react";
import Image from "next/image";

import { HomeInclusionOptionCard } from "@/components/home-inclusion-option-card";
import {
  getHomeInclusionLevelLabel,
  type HomeInclusionOption,
  type HomeSelectableInclusionCategory,
} from "@/data/home-configurator";

type HomeInclusionCategoryProps = {
  houseName: string;
  category: HomeSelectableInclusionCategory;
  categoryCount: number;
  selectedOption: HomeInclusionOption | undefined;
  showInteractionGuidance: boolean;
  isActive: boolean;
  isComplete: boolean;
  nextCategoryTitle: string | undefined;
  onSelectOption: (optionId: string) => void;
  onPreviewOption: (optionId: string) => void;
  onConfirm: () => void;
  onEdit: () => void;
};

export function HomeInclusionCategory({
  houseName,
  category,
  categoryCount,
  selectedOption,
  showInteractionGuidance,
  isActive,
  isComplete,
  nextCategoryTitle,
  onSelectOption,
  onPreviewOption,
  onConfirm,
  onEdit,
}: HomeInclusionCategoryProps) {
  const headingId = `home-${category.id}-heading`;

  if (isComplete && !isActive && selectedOption) {
    return (
      <article
        id={`home-category-${category.id}`}
        data-home-category={category.id}
        data-category-kind={category.kind}
        data-category-state="complete"
        className="scroll-mt-28 border border-white/18 bg-white/[0.018] p-4 sm:p-5"
      >
        <div className="grid min-w-0 items-center gap-5 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:gap-7">
          <div className="relative aspect-[4/3] overflow-hidden border border-white/10 bg-[#15171b]">
            <Image
              src={selectedOption.image.src}
              alt=""
              fill
              quality={90}
              sizes="88px"
              className={
                selectedOption.image.fit === "contain"
                  ? "object-contain"
                  : "object-cover"
              }
            />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/58">
              <Check aria-hidden="true" className="size-3" strokeWidth={2} />
              {category.number} / {String(categoryCount).padStart(2, "0")} · {category.title}
            </p>
            <h3 className="mt-3 text-2xl font-medium tracking-[-0.045em] text-white/90 sm:text-[2rem]">
              {selectedOption.name}
            </h3>
            <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/55">
              {getHomeInclusionLevelLabel(selectedOption.level)}
            </p>
          </div>
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
        data-category-kind={category.kind}
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
            Ahead
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
      data-category-kind={category.kind}
      data-category-state="active"
      className="scroll-mt-28 border border-white/22 bg-[#0b0c10] p-5 outline-none sm:p-8 lg:p-10"
    >
      <div className="grid gap-10 border-t border-white/15 pt-6 2xl:grid-cols-[0.72fr_1.28fr] 2xl:gap-16">
        <div>
          <p
            className="eyebrow"
            style={{ color: "rgb(255 255 255 / 0.7)" }}
          >
            {category.number} / {String(categoryCount).padStart(2, "0")} —{" "}
            {category.title}
          </p>
          <h2
            id={headingId}
            className="mt-6 text-[clamp(3.25rem,6vw,6.5rem)] font-medium leading-[0.86] tracking-[-0.07em]"
          >
            Choose
            <br />
            <span className="text-white/55">{category.shortTitle}.</span>
          </h2>
        </div>
        <div className="max-w-2xl 2xl:justify-self-end 2xl:self-end">
          <p className="text-base leading-8 text-white/56">
            {category.description}
          </p>
          {category.technicalNote ? (
            <p className="mt-5 text-xs leading-6 text-white/55">
              {category.technicalNote}
            </p>
          ) : null}
          {category.kind === "room-look" ? (
            <ul className="mt-6 flex flex-wrap gap-2" aria-label={`${category.title} coordinates`}>
              {category.represents.map((item) => (
                <li
                  key={item}
                  className="border border-white/14 px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.14em] text-white/52"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div
        role="group"
        aria-label={`${category.title} choices`}
        className="mt-12 grid gap-5 md:grid-cols-2 lg:mt-16"
      >
        {category.options.map((option) => (
          <HomeInclusionOptionCard
            key={option.id}
            option={option}
            homeName={houseName}
            isSelected={option.id === selectedOption?.id}
            onSelect={() => onSelectOption(option.id)}
            onPreview={() => onPreviewOption(option.id)}
            onConfirm={onConfirm}
            confirmLabel={
              nextCategoryTitle
                ? isComplete
                  ? "Save & Continue"
                  : "Confirm & Continue"
                : isComplete
                  ? "Save & Return to Look Book"
                  : `Complete My ${houseName}`
            }
            nextLabel={nextCategoryTitle}
            confirmCategoryId={category.id}
          />
        ))}
      </div>

      {showInteractionGuidance ? (
        <p className="mt-8 max-w-2xl border-t border-white/14 pt-6 text-xs leading-6 text-white/55">
          {selectedOption
            ? `${selectedOption.name} is selected. Confirm from the card to continue.`
            : "Choose one controlled option to continue."}
        </p>
      ) : null}
    </section>
  );
}
