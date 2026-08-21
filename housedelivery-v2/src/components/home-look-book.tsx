"use client";

import { ArrowRight, BookOpen, Check, Pencil, Printer } from "lucide-react";
import Image from "next/image";
import { useState, type FormEvent, type ReactNode } from "react";

import { HomeConfiguratorJourney } from "@/components/home-configurator-journey";
import {
  formatLookBookPreparedDate,
  getLookBookCustomerName,
  getLookBookPersonalTitle,
  getLookBookSelectionSections,
  type LookBookCustomer,
  type LookBookSection,
  type LookBookSelection,
  type LookBookSelectionReference,
} from "@/data/home-look-book";
import {
  getHomeConfiguratorJourneyCategories,
  getHomeInclusionLevelLabel,
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

type ResolvedSelection = LookBookSelection & {
  categoryId: string;
  zoneId?: string;
  categoryDescription: string;
};

type EditorialContext = Pick<
  HomeLookBookProps,
  "definition" | "configuration" | "onEditCategory" | "onPreviewOption"
>;

function SaveLookBookButton({
  placement,
  onSave,
}: {
  placement: "top" | "completion";
  onSave: () => void;
}) {
  const isCompletionControl = placement === "completion";

  return (
    <button
      type="button"
      data-save-look-book={placement}
      onClick={onSave}
      className={
        isCompletionControl
          ? "inline-flex min-h-14 items-center justify-center gap-3 border border-white/44 px-6 text-[9px] font-semibold uppercase tracking-[0.17em] text-white hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          : "inline-flex min-h-12 items-center justify-center gap-3 border border-black bg-black px-6 text-[9px] font-semibold uppercase tracking-[0.17em] text-white hover:bg-black/78 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
      }
    >
      <Printer aria-hidden="true" className="size-4" strokeWidth={1.5} />
      Save / Print PDF
    </button>
  );
}

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
              Configuration complete / Final review
            </p>
            <h2
              id="home-look-book-heading"
              className="mt-7 max-w-5xl text-[clamp(4rem,9vw,9rem)] font-medium leading-[0.82] tracking-[-0.075em] text-black/88"
            >
              Your {homeName}.
              <br />
              <span className="text-black/52">Ready to become real.</span>
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
              className="group mt-9 flex min-h-14 w-full items-center justify-between gap-7 bg-[#111216] px-6 text-left text-[10px] font-semibold uppercase tracking-[0.17em] text-white hover:bg-black/76 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
            >
              <span>Create My Look Book</span>
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.5} />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function resolveSelection(
  definition: HomeConfiguratorDefinition,
  configuration: HomeConfiguration,
  item: LookBookSelectionReference,
): ResolvedSelection | undefined {
  const category = definition.categories.find(
    (candidate) => candidate.id === item.categoryId,
  );
  if (!category || category.kind === "coordinated") return undefined;

  if (category.kind === "flooring") {
    const zone = category.zones.find((candidate) => candidate.id === item.zoneId);
    const option = zone ? getSelectedFlooringOption(zone, configuration) : undefined;
    if (!zone || !option) return undefined;
    return {
      categoryId: category.id,
      zoneId: zone.id,
      label: item.label ?? zone.title,
      id: option.id,
      optionName: option.name,
      level: option.level,
      description: option.description,
      image: option.image,
      editorial: option.editorial,
      categoryDescription: zone.description,
    };
  }

  const option = getSelectedInclusionOption(category, configuration);
  if (!option) return undefined;
  return {
    categoryId: category.id,
    label: item.label ?? category.title,
    id: option.id,
    optionName: option.name,
    level: option.level,
    description: option.description,
    image: option.image,
    editorial: option.editorial,
    categoryDescription: category.description,
  };
}

function resolveSection(
  section: LookBookSection,
  context: EditorialContext,
) {
  return section.items.flatMap((item) => {
    const selection = resolveSelection(
      context.definition,
      context.configuration,
      item,
    );
    return selection ? [selection] : [];
  });
}

function levelLabel(selection: LookBookSelection) {
  return getHomeInclusionLevelLabel(selection.level).replace(" — ", " · ");
}

function EditorialImage({
  selection,
  context,
  className = "aspect-[4/3]",
  sizes = "(max-width: 767px) 100vw, 60vw",
}: {
  selection: ResolvedSelection;
  context: EditorialContext;
  className?: string;
  sizes?: string;
}) {
  return (
    <button
      type="button"
      id={`home-look-book-preview-trigger-${selection.id}-${selection.zoneId ?? selection.categoryId}`}
      aria-label={`View larger image for ${selection.optionName}`}
      onClick={() =>
        context.onPreviewOption(
          selection.categoryId,
          selection.id,
          selection.zoneId,
        )
      }
      className={`look-book-image-button group relative block w-full overflow-hidden bg-[#d3cec1] text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-black ${className}`}
    >
      <Image
        src={selection.image.src}
        alt={selection.image.alt}
        fill
        loading="eager"
        quality={
          selection.image.quality ??
          (selection.image.role === "design-board" ? 100 : 95)
        }
        unoptimized={selection.image.role === "design-board"}
        sizes={sizes}
        className={
          selection.image.fit === "contain"
            ? "object-contain"
            : "object-cover transition-transform duration-700 group-hover:scale-[1.012] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        }
      />
      <span className="look-book-screen-control absolute bottom-3 right-3 bg-black/78 px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.16em] text-white">
        View image
      </span>
    </button>
  );
}

function SelectionCaption({
  selection,
  context,
  compact = false,
}: {
  selection: ResolvedSelection;
  context: EditorialContext;
  compact?: boolean;
}) {
  return (
    <div
      data-look-book-category={selection.categoryId}
      data-look-book-zone={selection.zoneId}
      data-look-book-option={selection.id}
      data-look-book-level={selection.level}
      data-look-book-state="complete"
      className={compact ? "pt-3" : "pt-5"}
    >
      <p className="text-[8px] font-semibold uppercase tracking-[0.17em] text-black/52">
        {selection.label} / {levelLabel(selection)}
      </p>
      <div className="mt-2 flex items-start justify-between gap-5">
        <p
          className={
            compact
              ? "text-base font-medium leading-tight tracking-[-0.035em] text-black/82"
              : "text-2xl font-medium leading-tight tracking-[-0.045em] text-black/84"
          }
        >
          {selection.optionName}
        </p>
        <button
          type="button"
          onClick={() => context.onEditCategory(selection.categoryId, selection.zoneId)}
          className="look-book-screen-control inline-flex min-h-8 shrink-0 items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.16em] text-black/52 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
        >
          <Pencil aria-hidden="true" className="size-3" strokeWidth={1.5} />
          Edit
        </button>
      </div>
    </div>
  );
}

function PageShell({
  section,
  children,
}: {
  section: LookBookSection;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`look-book-${section.id}-heading`}
      data-look-book-section={section.id}
      data-look-book-layout={section.layout}
      data-look-book-print-page
      className="look-book-section"
    >
      <div className="look-book-page-inner">
        <header className="look-book-editorial-header">
          <p className="font-mono text-[8px] tracking-[0.16em] text-black/52">
            {section.number} / {String(section.title).toUpperCase()}
          </p>
          <div className="mt-4 grid gap-4 border-t border-black/18 pt-4 lg:grid-cols-[1fr_0.7fr] lg:items-end lg:gap-20">
            <h3
              id={`look-book-${section.id}-heading`}
              className="max-w-5xl text-[clamp(3.2rem,7vw,7.2rem)] font-medium uppercase leading-[0.82] tracking-[-0.075em] text-black/88"
            >
              {section.title}
            </h3>
            <p className="max-w-xl text-sm leading-7 text-black/58 lg:justify-self-end">
              {section.introduction}
            </p>
          </div>
        </header>
        {children}
      </div>
    </section>
  );
}

function MaterialPalettePage({
  section,
  context,
}: {
  section: LookBookSection;
  context: EditorialContext;
}) {
  const selections = resolveSection(section, context);
  return (
    <PageShell section={section}>
      <div className="look-book-material-palette mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {selections.map((selection, index) => (
          <article key={`${selection.categoryId}-${selection.zoneId ?? index}`}>
            <EditorialImage
              selection={selection}
              context={context}
              className={index % 3 === 1 ? "aspect-[5/4]" : "aspect-[4/3]"}
              sizes="(max-width: 639px) 100vw, 33vw"
            />
            <SelectionCaption selection={selection} context={context} compact />
            <p className="mt-1 text-[8px] uppercase tracking-[0.15em] text-black/42">
              {selection.editorial?.materialRole}
            </p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}

function CinematicSelectionPage({
  section,
  context,
}: {
  section: LookBookSection;
  context: EditorialContext;
}) {
  const [hero] = resolveSection(section, context);
  const coordinated = section.items
    .map((item) =>
      context.definition.categories.find((category) => category.id === item.categoryId),
    )
    .find((category) => category?.kind === "coordinated");
  if (!hero) return null;
  const isDesignBoard =
    hero.image.fit === "contain" &&
    (hero.image.role === "design-board" ||
      context.definition.homeId === "saturna");
  return (
    <PageShell section={section}>
      <div
        data-look-book-design-board={
          isDesignBoard ? "true" : undefined
        }
        className="look-book-cinematic mt-10"
      >
        <div
          data-look-book-selected-board={
            isDesignBoard ? "true" : undefined
          }
          className={isDesignBoard ? "mx-auto w-full lg:w-[90%]" : undefined}
        >
          <EditorialImage
            selection={hero}
            context={context}
            className={
              isDesignBoard
                ? "aspect-[4/3]"
                : "aspect-[16/9] lg:aspect-[16/8]"
            }
            sizes={
              isDesignBoard
                ? "(max-width: 1023px) 100vw, 90vw"
                : "100vw"
            }
          />
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:gap-20">
          <div>
            <SelectionCaption selection={hero} context={context} />
            <p className="mt-5 max-w-2xl text-sm leading-7 text-black/56">
              {hero.description ?? hero.categoryDescription}
            </p>
          </div>
          {coordinated?.kind === "coordinated" ? (
            <div
              data-look-book-category={coordinated.id}
              data-look-book-state="coordinated"
              className="mt-5 border-t border-black/16 pt-5 lg:self-start"
            >
              <div className="flex items-center gap-3">
                <BookOpen aria-hidden="true" className="size-4 text-black/48" strokeWidth={1.5} />
                <p className="text-[8px] font-semibold uppercase tracking-[0.17em] text-black/52">
                  {coordinated.title} / {coordinated.coordinatedMessage}
                </p>
              </div>
              <p className="mt-4 text-xs leading-6 text-black/52">
                {coordinated.description}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}

function TwoSelectionPage({
  section,
  context,
}: {
  section: LookBookSection;
  context: EditorialContext;
}) {
  const [hero, detail] = resolveSection(section, context);
  if (!hero || !detail) return null;
  const isSplit = section.layout === "editorial-split";
  return (
    <PageShell section={section}>
      <div
        className={`mt-10 grid gap-7 ${
          isSplit
            ? "lg:grid-cols-[1.25fr_0.75fr] lg:items-end"
            : "lg:grid-cols-[1.4fr_0.6fr] lg:items-start"
        }`}
      >
        <article>
          <EditorialImage
            selection={hero}
            context={context}
            className={isSplit ? "aspect-[5/4]" : "aspect-[16/11]"}
          />
          <SelectionCaption selection={hero} context={context} />
          <p className="mt-4 max-w-xl text-xs leading-6 text-black/54">
            {hero.description ?? hero.categoryDescription}
          </p>
        </article>
        <article className={isSplit ? "lg:pb-10" : "lg:pt-24"}>
          <EditorialImage
            selection={detail}
            context={context}
            className={isSplit ? "aspect-[4/5]" : "aspect-[3/4]"}
            sizes="(max-width: 1023px) 100vw, 35vw"
          />
          <SelectionCaption selection={detail} context={context} compact />
        </article>
      </div>
    </PageShell>
  );
}

function DetailStoryPage({
  section,
  context,
}: {
  section: LookBookSection;
  context: EditorialContext;
}) {
  const [hero, ...details] = resolveSection(section, context);
  if (!hero) return null;
  return (
    <PageShell section={section}>
      <div className="look-book-detail-story mt-10 grid gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
        <article>
          <EditorialImage
            selection={hero}
            context={context}
            className="aspect-[4/3] lg:aspect-[5/4]"
          />
          <SelectionCaption selection={hero} context={context} />
        </article>
        <div className="grid grid-cols-2 gap-x-4 gap-y-7">
          {details.map((selection) => (
            <article key={`${selection.categoryId}-${selection.zoneId ?? "all"}`}>
              <EditorialImage
                selection={selection}
                context={context}
                className="aspect-[4/3]"
                sizes="(max-width: 1023px) 50vw, 22vw"
              />
              <SelectionCaption selection={selection} context={context} compact />
            </article>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

function ArrivalPage({
  section,
  context,
}: {
  section: LookBookSection;
  context: EditorialContext;
}) {
  const selections = resolveSection(section, context);
  const { lookBook } = context.definition;
  return (
    <PageShell section={section}>
      <div className="look-book-arrival mt-10">
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {selections.map((selection) => (
            <article
              key={selection.categoryId}
              className="content-start"
            >
              <EditorialImage
                selection={selection}
                context={context}
                className="aspect-[4/3]"
                sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
              />
              <SelectionCaption selection={selection} context={context} compact />
            </article>
          ))}
        </div>
      </div>
      {section.includeProjectCoordination && lookBook.projectCoordinatedItems?.length ? (
        <div data-look-book-project-coordinated className="look-book-carried-forward mt-10 border-t border-black/18 pt-5">
          <div className="grid gap-5 lg:grid-cols-[0.45fr_1.55fr] lg:gap-12">
            <div>
              <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-black/52">
                Carried forward
              </p>
              <p className="mt-3 text-xl font-medium tracking-[-0.04em] text-black/80">
                Project coordinated.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
              {lookBook.projectCoordinatedItems.map((item) => (
                <div key={item.id}>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/62">
                    {item.title}
                  </p>
                  <p className="mt-2 text-[10px] leading-5 text-black/48">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

function LookBookSectionView({
  section,
  context,
}: {
  section: LookBookSection;
  context: EditorialContext;
}) {
  if (section.kind === "design-story") {
    return null;
  }
  if (section.layout === "material-palette") {
    return <MaterialPalettePage section={section} context={context} />;
  }
  if (section.layout === "cinematic-hero") {
    return <CinematicSelectionPage section={section} context={context} />;
  }
  if (section.layout === "asymmetric" || section.layout === "editorial-split") {
    return <TwoSelectionPage section={section} context={context} />;
  }
  if (section.layout === "detail-story") {
    return <DetailStoryPage section={section} context={context} />;
  }
  return <ArrivalPage section={section} context={context} />;
}

function IncompleteLookBook({
  definition,
  configuration,
  onEditCategory,
}: Pick<HomeLookBookProps, "definition" | "configuration" | "onEditCategory">) {
  const requiredCategories = getHomeConfiguratorJourneyCategories(definition);
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
            <h2 id="home-look-book-heading" className="mt-7 text-[clamp(4rem,9vw,9rem)] font-medium leading-[0.82] tracking-[-0.075em] text-black/88">
              Your story<br /><span className="text-black/52">takes shape here.</span>
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
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.5} />
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
  const requiredCategories = getHomeConfiguratorJourneyCategories(definition);
  const isReady = requiredCategories.every((category) =>
    isCategoryComplete(category, configuration),
  );
  if (!isReady) {
    return <IncompleteLookBook definition={definition} configuration={configuration} onEditCategory={onEditCategory} />;
  }

  const personalization = configuration.lookBookPersonalization;
  if (!personalization) {
    return <PersonalizationForm homeName={definition.homeName} onCreateLookBook={onCreateLookBook} />;
  }

  const { lookBook } = definition;
  const customerName = getLookBookCustomerName(personalization.customer);
  const personalTitle = getLookBookPersonalTitle(
    personalization.customer,
    lookBook.home.name,
  );
  const preparedDate = formatLookBookPreparedDate(personalization.preparedAt);
  const isSubmitted = configuration.reviewStatus === "ready-for-review";
  const selectionSections = getLookBookSelectionSections(lookBook.sections);
  const context: EditorialContext = {
    definition,
    configuration,
    onEditCategory,
    onPreviewOption,
  };
  const saveLookBook = () => window.print();

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
            <p className="mt-2 text-sm text-black/62">Prepared for {customerName}</p>
          </div>
          <SaveLookBookButton placement="top" onSave={saveLookBook} />
        </div>
      </div>

      <article data-look-book-cover data-look-book-layout="cover" data-look-book-print-page className="look-book-cover relative min-h-[min(920px,100svh)] overflow-hidden bg-[#111216] text-white">
        <Image src={lookBook.home.heroImage.src} alt={lookBook.home.heroImage.alt} fill loading="eager" quality={100} sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/24 to-black/18" />
        <div className="look-book-page-inner relative z-10 flex min-h-[min(920px,100svh)] flex-col justify-between">
          <div className="flex items-start justify-between gap-8 border-t border-white/50 pt-5">
            <Image src="/House Delivery Blk.png" alt="House Delivery Inc." width={675} height={313} loading="eager" unoptimized className="h-11 w-auto brightness-0 invert" />
            <p className="text-right font-mono text-[8px] uppercase tracking-[0.16em] text-white/70">
              Personalized Look Book<br />{personalization.reference}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.23em] text-white/68">{lookBook.home.residenceLabel}</p>
            <h2 id="home-look-book-heading" className="mt-6 max-w-6xl text-[clamp(4.2rem,11.5vw,11.5rem)] font-medium uppercase leading-[0.78] tracking-[-0.082em]">
              {personalTitle}
            </h2>
            <div className="mt-9 flex flex-col gap-3 border-t border-white/48 pt-5 text-[8px] uppercase tracking-[0.17em] text-white/76 sm:flex-row sm:items-center sm:justify-between">
              <p>Prepared for {customerName}</p><p>{preparedDate} / {lookBook.home.areaLabel}</p>
            </div>
          </div>
        </div>
      </article>

      <div className="look-book-sections">
        {selectionSections.map((section) => (
          <LookBookSectionView key={section.id} section={section} context={context} />
        ))}
      </div>

      <section data-look-book-next-stage data-look-book-layout="dark-finale" data-look-book-print-page className="bg-[#111216] text-white">
        <div className="look-book-page-inner flex flex-col justify-between">
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/52">A home shaped around you / Next stage</p>
            <h3 className="mt-7 max-w-6xl text-[clamp(4rem,8.5vw,9rem)] font-medium uppercase leading-[0.82] tracking-[-0.075em]">
              Your {definition.homeName}.<br /><span className="text-white/48">Ready to become real.</span>
            </h3>
            <p className="mt-9 max-w-2xl text-sm leading-7 text-white/58">
              This personal Look Book carries your selected design language into
              House Delivery review, product confirmation and the project-specific
              visualization stage.
            </p>
            <div className="mt-14 grid border-t border-white/20 lg:grid-cols-3">
              {lookBook.nextStageSteps.map((step, index) => (
                <article key={step.title} className="border-b border-white/16 py-6 lg:border-r lg:px-7 lg:first:pl-0 lg:last:border-r-0">
                  <p className="font-mono text-[8px] tracking-[0.16em] text-white/38">{String(index + 1).padStart(2, "0")}</p>
                  <h4 className="mt-6 text-lg font-medium uppercase tracking-[-0.03em] text-white/84">{step.title}</h4>
                  <p className="mt-4 text-[11px] leading-6 text-white/48">{step.description}</p>
                </article>
              ))}
            </div>
          </div>

          <div>
            <div className="look-book-screen-control mt-10 grid gap-5 lg:grid-cols-[1fr_0.7fr] lg:items-end lg:gap-16">
              {isSubmitted ? (
                <div role="status" className="border border-white/22 p-5">
                  <p className="flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.17em] text-white/82"><Check aria-hidden="true" className="size-4" />My {definition.homeName} is ready for review</p>
                </div>
              ) : (
                <button type="button" data-submit-home-review={definition.homeId} onClick={onSubmit} className="group flex min-h-14 w-full items-center justify-between gap-7 bg-white px-6 text-left text-[10px] font-semibold uppercase tracking-[0.17em] text-black hover:bg-white/82 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                  <span>Submit My {definition.homeName} for Review</span><ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.5} />
                </button>
              )}
              <SaveLookBookButton
                placement="completion"
                onSave={saveLookBook}
              />
            </div>
            <div className="mt-10 border-t border-white/18 pt-5 text-[8px] leading-4 text-white/42">
              <p>{definition.disclaimer}</p><p className="mt-2">{lookBook.preliminaryNotice}</p>
              <p className="mt-4 font-mono uppercase tracking-[0.13em]">Prepared for {customerName} / {personalization.reference} / {preparedDate}</p>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
