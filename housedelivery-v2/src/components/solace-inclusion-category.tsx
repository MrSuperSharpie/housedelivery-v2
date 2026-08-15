import { ArrowDown, Check, Pencil } from "lucide-react";
import Image from "next/image";

import type {
  SolaceInclusionCategory as SolaceInclusionCategoryData,
  SolaceInclusionOption,
  SolaceInclusionOptionId,
} from "@/data/solace-configuration";
import { cn } from "@/lib/cn";

type SolaceInclusionCategoryProps = {
  category: SolaceInclusionCategoryData;
  selectedOption: SolaceInclusionOption | undefined;
  isActive: boolean;
  isComplete: boolean;
  nextCategoryTitle: string | undefined;
  onSelectOption: (optionId: SolaceInclusionOptionId) => void;
  onConfirm: () => void;
  onEdit: () => void;
};

function getLevelLabel(option: SolaceInclusionOption) {
  return option.level === "premium"
    ? "Premium — Included"
    : "Signature — Upgrade";
}

function SolaceOptionCard({
  option,
  isSelected,
  onSelect,
}: {
  option: SolaceInclusionOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      data-solace-option={option.id}
      data-selected={isSelected ? "true" : "false"}
      onClick={onSelect}
      className={cn(
        "group flex min-w-0 flex-col overflow-hidden border bg-[#0e1014] text-left transition-[border-color,background-color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white",
        isSelected
          ? "border-white/78 bg-white/[0.03]"
          : "border-white/12 hover:border-white/34 hover:bg-white/[0.015]",
      )}
    >
      <span className="relative block aspect-[4/3] overflow-hidden border-b border-white/12 bg-[#121419]">
        <Image
          src={option.primaryImage.src}
          alt={option.primaryImage.alt}
          fill
          quality={90}
          sizes="(max-width: 1023px) calc(100vw - 40px), 34vw"
          className={cn(
            option.primaryImage.fit === "contain"
              ? "object-contain"
              : "object-cover",
            "transition-transform duration-700 ease-out group-hover:scale-[1.015] motion-reduce:transition-none motion-reduce:group-hover:scale-100",
          )}
        />
        {isSelected ? (
          <span className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white text-[#0b0c10] shadow-lg">
            <Check aria-hidden="true" className="size-4" strokeWidth={2} />
          </span>
        ) : null}
      </span>

      {isSelected && option.galleryImages?.length ? (
        <span className="grid grid-cols-2 gap-px border-b border-white/12 bg-white/10">
          {option.galleryImages.slice(0, 2).map((image) => (
            <span
              key={image.src}
              className="relative block aspect-[3/2] overflow-hidden bg-[#121419]"
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                quality={90}
                sizes="(max-width: 1023px) 50vw, 17vw"
                className={image.fit === "contain" ? "object-contain" : "object-cover"}
              />
            </span>
          ))}
        </span>
      ) : null}

      <span className="flex flex-1 flex-col p-6 sm:p-8">
        <span
          className={cn(
            "text-[9px] font-semibold uppercase tracking-[0.19em]",
            option.level === "premium" ? "text-white/62" : "text-[#d8c4a5]",
          )}
        >
          {getLevelLabel(option)}
        </span>
        <span className="mt-7 text-[clamp(2rem,3.7vw,4rem)] font-medium leading-[0.92] tracking-[-0.06em] text-white/92">
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
          {isSelected ? "Selected for My Solace" : "Select this direction"}
        </span>
      </span>
    </button>
  );
}

export function SolaceInclusionCategory({
  category,
  selectedOption,
  isActive,
  isComplete,
  nextCategoryTitle,
  onSelectOption,
  onConfirm,
  onEdit,
}: SolaceInclusionCategoryProps) {
  const headingId = `solace-${category.id}-heading`;

  if (category.status === "coordinated-later") {
    return (
      <article
        id={`solace-category-${category.id}`}
        data-solace-category={category.id}
        data-category-state="coordinated-later"
        className="scroll-mt-28 border border-white/10 bg-white/[0.012] p-6 sm:p-8"
      >
        <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:gap-8">
          <span className="font-mono text-[10px] tracking-[0.18em] text-white/30">
            {category.number}
          </span>
          <div className="max-w-2xl">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/38">
              Coordinated with the project
            </p>
            <h3 className="mt-4 text-3xl font-medium tracking-[-0.045em] text-white/72 sm:text-4xl">
              {category.title}
            </h3>
            <p className="mt-4 text-sm leading-7 text-white/45">
              {category.description} {category.coordinatedLaterMessage}
            </p>
          </div>
        </div>
      </article>
    );
  }

  if (isComplete && !isActive && selectedOption) {
    return (
      <article
        id={`solace-category-${category.id}`}
        data-solace-category={category.id}
        data-category-state="complete"
        className="scroll-mt-28 border border-white/18 bg-white/[0.02] p-5 sm:p-6"
      >
        <div className="grid items-center gap-5 sm:grid-cols-[5.5rem_1fr_auto] sm:gap-7">
          <div className="relative aspect-[4/3] overflow-hidden bg-[#15171b]">
            <Image
              src={selectedOption.primaryImage.src}
              alt=""
              fill
              quality={90}
              sizes="88px"
              className={
                selectedOption.primaryImage.fit === "contain"
                  ? "object-contain"
                  : "object-cover"
              }
            />
          </div>
          <div>
            <p className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/48">
              <Check aria-hidden="true" className="size-3" strokeWidth={2} />
              {category.number} / Complete
            </p>
            <h3 className="mt-3 text-2xl font-medium tracking-[-0.04em] text-white/88 sm:text-3xl">
              {category.title}
            </h3>
            <p className="mt-2 text-sm text-white/50">
              {selectedOption.name} · {getLevelLabel(selectedOption)}
            </p>
          </div>
          <button
            type="button"
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
        id={`solace-category-${category.id}`}
        data-solace-category={category.id}
        data-category-state="upcoming"
        className="scroll-mt-28 border border-white/8 px-6 py-7 text-white/36 sm:px-8"
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
      id={`solace-category-${category.id}`}
      tabIndex={-1}
      aria-labelledby={headingId}
      data-solace-category={category.id}
      data-category-state="active"
      className="scroll-mt-28 border border-white/22 bg-[#0b0c10] p-5 outline-none sm:p-8 lg:p-10"
    >
      <div className="grid gap-10 border-t border-white/15 pt-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
        <div>
          <p className="eyebrow">
            My Solace / {category.number} {category.title}
          </p>
          <h2
            id={headingId}
            className="mt-6 text-[clamp(3.25rem,6vw,6.5rem)] font-medium leading-[0.86] tracking-[-0.07em]"
          >
            Choose the
            <br />
            <span className="text-white/40">{category.shortTitle.toLowerCase()}.</span>
          </h2>
        </div>
        <div className="max-w-2xl lg:justify-self-end lg:self-end">
          <p className="text-base leading-8 text-white/56">
            {category.description}
          </p>
          <p className="mt-5 text-xs leading-6 text-white/38">
            Representative selection. Final product, finish and availability
            confirmed during project review.
          </p>
        </div>
      </div>

      <div
        role="group"
        aria-label={`${category.title} choices`}
        className="mt-12 grid gap-5 lg:mt-16 lg:grid-cols-2"
      >
        {category.options.map((option) => (
          <SolaceOptionCard
            key={option.id}
            option={option}
            isSelected={option.id === selectedOption?.id}
            onSelect={() => onSelectOption(option.id)}
          />
        ))}
      </div>

      <div className="mt-8 flex flex-col items-start justify-between gap-5 border-t border-white/14 pt-7 sm:flex-row sm:items-center">
        <p className="max-w-xl text-xs leading-6 text-white/42">
          {selectedOption
            ? isComplete
              ? `${selectedOption.name} is now reflected in My Solace.`
              : `${selectedOption.name} will be added to My Solace when you continue.`
            : "Choose one controlled direction to continue."}
        </p>
        <button
          type="button"
          disabled={!selectedOption}
          onClick={onConfirm}
          className="group inline-flex min-h-12 w-full items-center justify-between gap-8 border border-white bg-white px-5 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#0b0c10] transition-colors hover:bg-transparent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-not-allowed disabled:border-white/20 disabled:bg-transparent disabled:text-white/30 sm:w-auto"
        >
          <span>
            {nextCategoryTitle
              ? `${isComplete ? "Save and continue" : "Continue"} to ${nextCategoryTitle}`
              : "Complete My Solace choices"}
          </span>
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
