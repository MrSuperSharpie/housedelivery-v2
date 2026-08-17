"use client";

import { ArrowRight, BookOpen, Check, Pencil, Printer } from "lucide-react";
import Image from "next/image";
import { useState, type FormEvent } from "react";

import { HomeConfiguratorJourney } from "@/components/home-configurator-journey";
import {
  formatLookBookPreparedDate,
  getLookBookCustomerName,
  type LookBookCustomer,
  type LookBookSelectionReference,
  type LookBookSection,
} from "@/data/home-look-book";
import {
  getHomeInclusionLevelLabel,
  getRequiredCategories,
  getSelectedFlooringOption,
  getSelectedInclusionOption,
  isCategoryComplete,
  type HomeConfiguration,
  type HomeConfiguratorDefinition,
} from "@/data/home-configurator";

type HomeLookBookProps = {
  definition: HomeConfiguratorDefinition;
  configuration: HomeConfiguration;
  onCreateLookBook: (customer: LookBookCustomer) => void;
  onEditCategory: (categoryId: string, zoneId?: string) => void;
  onPreviewOption: (
    categoryId: string,
    optionId: string,
    zoneId?: string,
  ) => void;
  onSubmit: () => void;
};

type LookBookEntryProps = Pick<
  HomeLookBookProps,
  "definition" | "configuration" | "onEditCategory" | "onPreviewOption"
> & {
  item: LookBookSelectionReference;
};

function PersonalizationForm({
  homeName,
  onCreateLookBook,
}: Pick<HomeLookBookProps, "onCreateLookBook"> & { homeName: string }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedFirstName = firstName.trim();
    if (!normalizedFirstName) return;

    onCreateLookBook({
      firstName: normalizedFirstName,
      lastName: lastName.trim() || undefined,
    });
  }

  return (
    <section
      id="home-look-book"
      tabIndex={-1}
      aria-labelledby="home-look-book-heading"
      data-look-book-ready="true"
      data-look-book-personalized="false"
      className="scroll-mt-20 bg-[#e7e3d8] px-5 py-24 text-[#111216] outline-none sm:px-8 lg:px-12 lg:py-36"
    >
      <div className="mx-auto max-w-[1504px]">
        <HomeConfiguratorJourney
          currentStage="look-book"
          theme="light"
          ariaLabel="Create personalized Look Book"
          homeName={homeName}
        />

        <div className="mt-16 grid gap-14 border-t border-black/18 pt-7 lg:mt-24 lg:grid-cols-[1.05fr_0.75fr] lg:items-end lg:gap-28">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/58">
              Configuration complete / Personalize your folio
            </p>
            <h2
              id="home-look-book-heading"
              className="mt-7 max-w-5xl text-[clamp(4rem,9vw,9rem)] font-medium leading-[0.82] tracking-[-0.075em] text-black/88"
            >
              Create My
              <br />
              <span className="text-black/52">{homeName} Look Book.</span>
            </h2>
            <p className="mt-9 max-w-2xl text-base leading-8 text-black/60">
              Add your name to create a personalized record of the room and
              finish directions you selected. No contact details are required.
            </p>
          </div>

          <form
            data-look-book-personalization-form
            onSubmit={handleSubmit}
            className="border border-black/16 bg-[#ded9cd] p-6 sm:p-9"
          >
            <div className="grid gap-7">
              <label className="form-field">
                <span>First name / Required</span>
                <input
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="First name"
                />
              </label>
              <label className="form-field">
                <span>Last name / Optional</span>
                <input
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Last name"
                />
              </label>
            </div>
            <button
              type="submit"
              className="group mt-9 flex min-h-14 w-full items-center justify-between gap-7 bg-[#111216] px-6 text-left text-[10px] font-semibold uppercase tracking-[0.17em] text-white transition-colors hover:bg-black/76 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
            >
              <span>Create My Look Book</span>
              <ArrowRight
                aria-hidden="true"
                className="size-4 shrink-0 transition-transform group-hover:translate-x-1"
                strokeWidth={1.5}
              />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function FlooringPaletteEntry({
  definition,
  configuration,
  item,
  onEditCategory,
  onPreviewOption,
}: LookBookEntryProps) {
  const category = definition.categories.find(
    (candidate) => candidate.id === item.categoryId,
  );
  if (!category || category.kind !== "flooring") return null;

  const selections = category.zones.flatMap((zone) => {
    const option = getSelectedFlooringOption(zone, configuration);
    return option ? [{ zone, option }] : [];
  });

  return (
    <article
      data-look-book-category={category.id}
      data-look-book-state="complete"
      className="look-book-selection look-book-flooring-palette overflow-hidden border border-black/14 bg-[#e7e3d8] md:col-span-2 xl:col-span-3"
    >
      <div className="grid sm:grid-cols-3">
        {selections.map(({ zone, option }) => (
          <div
            key={zone.id}
            data-look-book-zone={zone.id}
            data-look-book-option={option.id}
            className="border-b border-black/12 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
          >
            <button
              type="button"
              id={`home-look-book-preview-trigger-${option.id}-${zone.id}`}
              aria-label={`View larger image for ${zone.title}: ${option.name}`}
              onClick={() => onPreviewOption(category.id, option.id, zone.id)}
              className="look-book-image-button group relative block aspect-[4/3] w-full overflow-hidden bg-[#d6d1c5] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-black"
            >
              <Image
                src={option.image.src}
                alt={option.image.alt}
                fill
                loading="eager"
                quality={90}
                sizes="(max-width: 639px) 100vw, 33vw"
                className={
                  option.image.fit === "contain"
                    ? "object-contain"
                    : "object-cover"
                }
              />
            </button>
            <div className="p-5 sm:p-6">
              <p className="text-[8px] font-semibold uppercase tracking-[0.17em] text-black/58">
                {zone.title}
              </p>
              <p className="mt-3 text-xl font-medium tracking-[-0.04em] text-black/82">
                {option.name}
              </p>
              <p className="mt-3 text-[8px] font-semibold uppercase tracking-[0.16em] text-black/60">
                {getHomeInclusionLevelLabel(option.level)}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="look-book-screen-control flex justify-end border-t border-black/12 px-5 py-3">
        <button
          type="button"
          onClick={() => onEditCategory(category.id, category.zones[0]?.id)}
          className="inline-flex min-h-10 items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.17em] text-black/58 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
        >
          <Pencil aria-hidden="true" className="size-3" strokeWidth={1.5} />
          Edit flooring
        </button>
      </div>
    </article>
  );
}

function LookBookEntry(props: LookBookEntryProps) {
  const {
    definition,
    configuration,
    item,
    onEditCategory,
    onPreviewOption,
  } = props;
  const category = definition.categories.find(
    (candidate) => candidate.id === item.categoryId,
  );
  if (!category) return null;

  if (category.kind === "flooring" && !item.zoneId) {
    return <FlooringPaletteEntry {...props} />;
  }

  if (category.kind === "coordinated") {
    return (
      <article
        data-look-book-category={category.id}
        data-look-book-state="coordinated"
        className="look-book-selection flex min-h-64 flex-col justify-between border border-black/18 bg-[#dcd6c8] p-6 sm:p-8"
      >
        <div className="flex items-center justify-between gap-5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/58">
            {item.label ?? category.title}
          </p>
          <BookOpen
            aria-hidden="true"
            className="size-4 text-black/58"
            strokeWidth={1.5}
          />
        </div>
        <div>
          <p className="text-3xl font-medium tracking-[-0.05em] text-black/82">
            {category.coordinatedMessage}
          </p>
          <p className="mt-4 max-w-lg text-xs leading-6 text-black/60">
            {category.description}
          </p>
        </div>
      </article>
    );
  }

  const flooringZone =
    category.kind === "flooring"
      ? category.zones.find((candidate) => candidate.id === item.zoneId)
      : undefined;
  const option =
    category.kind === "standard" || category.kind === "room-look"
      ? getSelectedInclusionOption(category, configuration)
      : flooringZone
        ? getSelectedFlooringOption(flooringZone, configuration)
        : undefined;
  if (!option) return null;

  const label = item.label ?? category.title;
  const isFeature = item.presentation === "feature";

  return (
    <article
      data-look-book-category={category.id}
      data-look-book-option={option.id}
      data-look-book-level={option.level}
      data-look-book-presentation={item.presentation ?? "supporting"}
      data-look-book-state="complete"
      className={`look-book-selection flex min-w-0 flex-col overflow-hidden border border-black/14 bg-[#e7e3d8] ${
        isFeature ? "md:col-span-2 xl:col-span-2" : ""
      }`}
    >
      <button
        type="button"
        id={`home-look-book-preview-trigger-${option.id}-${item.zoneId ?? category.id}`}
        aria-label={`View larger image for ${option.name}`}
        onClick={() => onPreviewOption(category.id, option.id, item.zoneId)}
        className={`look-book-image-button group relative overflow-hidden border-b border-black/12 bg-[#d6d1c5] text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-black ${
          isFeature ? "aspect-[16/10] sm:aspect-[16/9]" : "aspect-[4/3]"
        }`}
      >
        <Image
          src={option.image.src}
          alt={option.image.alt}
          fill
          loading="eager"
          quality={90}
          sizes={
            isFeature
              ? "(max-width: 767px) 100vw, 66vw"
              : "(max-width: 767px) 100vw, 33vw"
          }
          className={
            option.image.fit === "contain"
              ? "object-contain"
              : "object-cover transition-transform duration-700 group-hover:scale-[1.012] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          }
        />
        <span className="look-book-screen-control absolute bottom-4 right-4 bg-black px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.16em] text-white">
          View larger
        </span>
      </button>
      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <div className="flex items-center justify-between gap-5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/58">
            {label}
          </p>
          <Check
            aria-label="Complete"
            className="look-book-screen-control size-3.5 text-black/58"
            strokeWidth={2}
          />
        </div>
        <h4 className="mt-7 text-[clamp(1.9rem,3vw,3rem)] font-medium leading-[0.94] tracking-[-0.055em] text-black/84">
          {option.name}
        </h4>
        <p className="mt-5 text-sm leading-7 text-black/60">
          {option.description ?? flooringZone?.description ?? category.description}
        </p>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-5 border-t border-black/12 pt-6">
          <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/58">
            {getHomeInclusionLevelLabel(option.level)}
          </p>
          <button
            type="button"
            onClick={() => onEditCategory(category.id, item.zoneId)}
            className="look-book-screen-control inline-flex min-h-10 items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.17em] text-black/58 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
          >
            <Pencil aria-hidden="true" className="size-3" strokeWidth={1.5} />
            Edit selection
          </button>
        </div>
      </div>
    </article>
  );
}

function LookBookSectionView({
  section,
  ...entryProps
}: Omit<LookBookEntryProps, "item"> & { section: LookBookSection }) {
  if (section.kind === "editorial") {
    return (
      <section
        aria-labelledby={`look-book-${section.id}-heading`}
        data-look-book-section={section.id}
        data-look-book-print-page
        className="look-book-section"
      >
        <div className="look-book-page-inner flex min-h-[34rem] flex-col justify-between bg-[#dcd6c8]">
          <div className="grid gap-7 border-t border-black/18 pt-6 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
            <div>
              <p className="font-mono text-[9px] tracking-[0.16em] text-black/58">
                Section {section.number}
              </p>
              <h3
                id={`look-book-${section.id}-heading`}
                className="mt-5 text-[clamp(3.25rem,7vw,7.5rem)] font-medium uppercase leading-[0.86] tracking-[-0.075em] text-black/88"
              >
                {section.title}
              </h3>
            </div>
            <p className="max-w-xl text-base leading-8 text-black/60 lg:justify-self-end lg:self-end">
              {section.introduction}
            </p>
          </div>
          <article className="mt-16 grid gap-10 border border-black/14 bg-[#e7e3d8] p-7 sm:p-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20 lg:p-14">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/58">
                {section.eyebrow}
              </p>
              <p className="mt-6 text-[clamp(2.5rem,5vw,5rem)] font-medium leading-[0.9] tracking-[-0.065em] text-black/82">
                {section.statement}
              </p>
            </div>
            <p className="max-w-2xl text-base leading-8 text-black/60 lg:self-end">
              {section.body}
            </p>
          </article>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={`look-book-${section.id}-heading`}
      data-look-book-section={section.id}
      data-look-book-print-page
      className="look-book-section"
    >
      <div className="look-book-page-inner">
        <div className="grid gap-7 border-t border-black/18 pt-6 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
          <div>
            <p className="font-mono text-[9px] tracking-[0.16em] text-black/58">
              Section {section.number}
            </p>
            <h3
              id={`look-book-${section.id}-heading`}
              className="mt-5 text-[clamp(3.25rem,7vw,7.5rem)] font-medium uppercase leading-[0.86] tracking-[-0.075em] text-black/88"
            >
              {section.title}
            </h3>
          </div>
          <p className="max-w-xl text-base leading-8 text-black/60 lg:justify-self-end lg:self-end">
            {section.introduction}
          </p>
        </div>

        <div className="mt-12 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
          {section.items.map((item, index) => (
            <LookBookEntry
              key={`${item.categoryId}-${item.zoneId ?? index}`}
              {...entryProps}
              item={item}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function IncompleteLookBook({
  definition,
  configuration,
  onEditCategory,
}: Pick<
  HomeLookBookProps,
  "definition" | "configuration" | "onEditCategory"
>) {
  const requiredCategories = getRequiredCategories(definition);
  const completeCount = requiredCategories.filter((category) =>
    isCategoryComplete(category, configuration),
  ).length;
  const firstIncompleteCategory = requiredCategories.find(
    (category) => !isCategoryComplete(category, configuration),
  );

  return (
    <section
      id="home-look-book"
      tabIndex={-1}
      aria-labelledby="home-look-book-heading"
      data-look-book-ready="false"
      className="scroll-mt-20 bg-[#e7e3d8] px-5 py-24 text-[#111216] outline-none sm:px-8 lg:px-12 lg:py-36"
    >
      <div className="mx-auto max-w-[1504px]">
        <HomeConfiguratorJourney
          currentStage="configure"
          theme="light"
          ariaLabel="Look Book journey preview"
          homeName={definition.homeName}
        />
        <div className="mt-16 grid gap-12 border-t border-black/18 pt-7 lg:mt-24 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-20">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/58">
              My {definition.homeName} / Look Book preview
            </p>
            <h2
              id="home-look-book-heading"
              className="mt-7 text-[clamp(4rem,9vw,9rem)] font-medium leading-[0.82] tracking-[-0.075em] text-black/88"
            >
              Your story
              <br />
              <span className="text-black/52">takes shape here.</span>
            </h2>
          </div>
          <div className="max-w-xl lg:justify-self-end">
            <p className="text-base leading-8 text-black/60">
              Your major room and finish selections will open into an editorial
              Look Book once every controlled chapter is confirmed.
            </p>
            <p className="mt-7 font-mono text-[9px] tracking-[0.14em] text-black/58">
              {completeCount} / {requiredCategories.length} complete
            </p>
            {firstIncompleteCategory ? (
              <button
                type="button"
                onClick={() => onEditCategory(firstIncompleteCategory.id)}
                className="group mt-8 flex min-h-14 w-full items-center justify-between gap-7 bg-[#111216] px-6 text-left text-[10px] font-semibold uppercase tracking-[0.17em] text-white hover:bg-black/76 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
              >
                <span>Continue with {firstIncompleteCategory.shortTitle}</span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={1.5}
                />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeLookBook({
  definition,
  configuration,
  onCreateLookBook,
  onEditCategory,
  onPreviewOption,
  onSubmit,
}: HomeLookBookProps) {
  const requiredCategories = getRequiredCategories(definition);
  const isReady = requiredCategories.every((category) =>
    isCategoryComplete(category, configuration),
  );

  if (!isReady) {
    return (
      <IncompleteLookBook
        definition={definition}
        configuration={configuration}
        onEditCategory={onEditCategory}
      />
    );
  }

  const personalization = configuration.lookBookPersonalization;
  if (!personalization) {
    return (
      <PersonalizationForm
        homeName={definition.homeName}
        onCreateLookBook={onCreateLookBook}
      />
    );
  }

  const { lookBook } = definition;
  const customerName = getLookBookCustomerName(personalization.customer);
  const preparedDate = formatLookBookPreparedDate(personalization.preparedAt);
  const isSubmitted = configuration.reviewStatus === "ready-for-review";

  return (
    <section
      id="home-look-book"
      tabIndex={-1}
      aria-labelledby="home-look-book-heading"
      data-look-book-ready="true"
      data-look-book-personalized="true"
      data-review-status={configuration.reviewStatus}
      className="scroll-mt-20 bg-[#e7e3d8] text-[#111216] outline-none"
    >
      <div className="look-book-screen-control border-b border-black/14 px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1504px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/58">
              Personalized visual brief / {personalization.reference}
            </p>
            <p className="mt-2 text-sm text-black/62">
              Prepared for {customerName}
            </p>
          </div>
          <button
            type="button"
            data-save-look-book
            onClick={() => window.print()}
            className="inline-flex min-h-12 items-center justify-center gap-3 border border-black bg-black px-6 text-[9px] font-semibold uppercase tracking-[0.17em] text-white hover:bg-black/78 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
          >
            <Printer aria-hidden="true" className="size-4" strokeWidth={1.5} />
            Save My Look Book
          </button>
        </div>
      </div>

      <article
        data-look-book-cover
        data-look-book-print-page
        className="look-book-cover relative min-h-[min(920px,100svh)] overflow-hidden bg-[#111216] text-white"
      >
        <Image
          src={lookBook.home.heroImage.src}
          alt={lookBook.home.heroImage.alt}
          fill
          loading="eager"
          quality={100}
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/28 to-black/24" />
        <div className="look-book-page-inner relative z-10 flex min-h-[min(920px,100svh)] flex-col justify-between px-5 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
          <div className="flex items-center justify-between gap-8 border-t border-white/45 pt-5">
            <Image
              src="/House Delivery Blk.png"
              alt="House Delivery Inc."
              width={675}
              height={313}
              loading="eager"
              unoptimized
              className="h-12 w-auto brightness-0 invert"
            />
            <p className="text-right font-mono text-[8px] uppercase tracking-[0.16em] text-white/72">
              Look Book Reference
              <br />
              {personalization.reference}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/72">
              {lookBook.home.residenceLabel}
            </p>
            <h2
              id="home-look-book-heading"
              className="mt-6 text-[clamp(4.5rem,13vw,13rem)] font-medium uppercase leading-[0.74] tracking-[-0.085em]"
            >
              My
              <br />
              {lookBook.home.name}
            </h2>
            <div className="mt-10 flex flex-col gap-3 border-t border-white/45 pt-5 text-[9px] uppercase tracking-[0.17em] text-white/78 sm:flex-row sm:items-center sm:justify-between">
              <p>Prepared for {customerName}</p>
              <p>Prepared {preparedDate}</p>
            </div>
          </div>
        </div>
      </article>

      <article
        data-look-book-home-introduction
        data-look-book-print-page
        className="look-book-home-introduction"
      >
        <div className="look-book-page-inner px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
          <div className="mx-auto max-w-[1504px]">
            <div className="grid gap-12 border-t border-black/18 pt-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-24">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/58">
                  Home introduction
                </p>
                <h3 className="mt-6 text-[clamp(4rem,9vw,9rem)] font-medium uppercase leading-[0.82] tracking-[-0.075em] text-black/88">
                  {lookBook.home.residenceLabel}
                </h3>
              </div>
              <p className="max-w-2xl text-base leading-8 text-black/62 lg:justify-self-end">
                {lookBook.home.description}
              </p>
            </div>
            {lookBook.home.introductionImage ? (
              <div className="relative mt-14 aspect-[16/8] overflow-hidden bg-[#d6d1c5] lg:mt-20">
                <Image
                  src={lookBook.home.introductionImage.src}
                  alt={lookBook.home.introductionImage.alt}
                  fill
                  loading="eager"
                  quality={90}
                  sizes="100vw"
                  className="object-cover"
                />
              </div>
            ) : null}
            {lookBook.home.metadata?.length ? (
              <dl className="mt-5 grid border-l border-t border-black/14 sm:grid-cols-2 lg:grid-cols-4">
                {lookBook.home.metadata.map((item) => (
                  <div
                    key={item.label}
                    className="border-b border-r border-black/14 p-5"
                  >
                    <dt className="text-[8px] font-semibold uppercase tracking-[0.17em] text-black/60">
                      {item.label}
                    </dt>
                    <dd className="mt-5 text-xl font-medium tracking-[-0.04em] text-black/82">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>
      </article>

      <div className="look-book-sections mx-auto grid max-w-[1600px] gap-28 px-5 py-24 sm:px-8 lg:gap-40 lg:px-12 lg:py-36">
        {lookBook.sections.map((section) => (
          <LookBookSectionView
            key={section.id}
            section={section}
            definition={definition}
            configuration={configuration}
            onEditCategory={onEditCategory}
            onPreviewOption={onPreviewOption}
          />
        ))}
      </div>

      {lookBook.projectCoordinatedItems?.length ? (
        <section
          data-look-book-project-coordinated
          data-look-book-print-page
          className="bg-[#dcd6c8]"
        >
          <div className="look-book-page-inner px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
            <div className="mx-auto max-w-[1504px]">
              <div className="grid gap-8 border-t border-black/18 pt-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/58">
                    Developed with House Delivery
                  </p>
                  <h3 className="mt-6 text-[clamp(3.5rem,7vw,7.5rem)] font-medium uppercase leading-[0.84] tracking-[-0.075em] text-black/88">
                    Project
                    <br />
                    Coordinated
                  </h3>
                </div>
                <p className="max-w-xl text-base leading-8 text-black/60 lg:justify-self-end lg:self-end">
                  Your visual brief establishes the direction. These details are
                  carried forward and confirmed during the project-specific stage.
                </p>
              </div>
              <div className="mt-16 grid border-l border-t border-black/14 sm:grid-cols-2">
                {lookBook.projectCoordinatedItems.map((item, index) => (
                  <article
                    key={item.id}
                    className="min-h-44 border-b border-r border-black/14 p-6 sm:p-8"
                  >
                    <p className="font-mono text-[8px] tracking-[0.16em] text-black/60">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h4 className="mt-8 text-2xl font-medium tracking-[-0.045em] text-black/82">
                      {item.title}
                    </h4>
                    <p className="mt-4 max-w-md text-xs leading-6 text-black/58">
                      {item.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section
        data-look-book-next-stage
        data-look-book-print-page
        className="bg-[#111216] text-white"
      >
        <div className="look-book-page-inner px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
          <div className="mx-auto max-w-[1504px]">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/58">
              Next stage / House Delivery review
            </p>
            <h3 className="mt-7 max-w-6xl text-[clamp(3.8rem,8vw,8.5rem)] font-medium uppercase leading-[0.84] tracking-[-0.075em]">
              Your {definition.homeName}
              <br />
              <span className="text-white/58">is taking shape.</span>
            </h3>
            <p className="mt-10 max-w-3xl text-base leading-8 text-white/62">
              Your Look Book captures the major visual choices that define your {" "}
              {definition.homeName}. House Delivery will review the configuration,
              confirm project-specific products and requirements, and coordinate
              the next design stage.
            </p>

            <div className="mt-16 grid border-l border-t border-white/18 lg:grid-cols-3">
              {lookBook.nextStageSteps.map((step, index) => (
                <article
                  key={step.title}
                  className="min-h-60 border-b border-r border-white/18 p-6 sm:p-8"
                >
                  <p className="font-mono text-[8px] tracking-[0.16em] text-white/48">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h4 className="mt-10 text-xl font-medium uppercase tracking-[-0.035em] text-white/88">
                    {step.title}
                  </h4>
                  <p className="mt-5 text-xs leading-6 text-white/56">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>

            <div className="look-book-screen-control mt-14 grid gap-5 lg:grid-cols-[1fr_0.68fr] lg:items-end lg:gap-20">
              <div>
                {isSubmitted ? (
                  <div role="status" className="border border-white/22 p-6">
                    <p className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-white/82">
                      <Check
                        aria-hidden="true"
                        className="size-4"
                        strokeWidth={2}
                      />
                      My {definition.homeName} is ready for review
                    </p>
                    <p className="mt-4 text-xs leading-6 text-white/56">
                      This configuration is represented in the application as a
                      review-ready design brief. Project-system integrations remain
                      separate.
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    data-submit-home-review={definition.homeId}
                    onClick={onSubmit}
                    className="group flex min-h-14 w-full items-center justify-between gap-7 bg-white px-6 text-left text-[10px] font-semibold uppercase tracking-[0.17em] text-black hover:bg-white/82 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    <span>Submit My {definition.homeName} for Review</span>
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4"
                      strokeWidth={1.5}
                    />
                  </button>
                )}
              </div>
              <div>
                <button
                  type="button"
                  data-save-look-book
                  onClick={() => window.print()}
                  className="inline-flex min-h-14 w-full items-center justify-center gap-3 border border-white/44 px-6 text-[9px] font-semibold uppercase tracking-[0.17em] text-white hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  <Printer
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={1.5}
                  />
                  Save My Look Book
                </button>
                <p className="mt-3 text-center text-[10px] leading-5 text-white/48">
                  Choose “Save as PDF” from your browser print window.
                </p>
              </div>
            </div>

            <div className="mt-16 border-t border-white/18 pt-6 text-[9px] leading-5 text-white/50">
              <p>{definition.disclaimer}</p>
              <p className="mt-3">{lookBook.preliminaryNotice}</p>
              <p className="mt-5 font-mono uppercase tracking-[0.14em]">
                Prepared for {customerName} / {personalization.reference} / {preparedDate}
              </p>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
