"use client";

import { ArrowRight, BookOpen, Check, Pencil, Printer } from "lucide-react";
import Image from "next/image";
import { Fragment, useState, type FormEvent, type ReactNode } from "react";

import { HomeConfiguratorJourney } from "@/components/home-configurator-journey";
import { LookBookCompletionActions } from "@/components/lookbook-completion-actions";
import {
  coastalDesignDirectionLabel,
  coastalInfluenceNotice,
  getCulturalDesignImage,
  type CulturalDesignImage,
} from "@/data/first-nations-cultural-design";
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
  plannerContext?: {
    designLabel: string;
    assignedQuantity: number;
    projectName: string;
    deliveryGroup: string;
    onSaveAndReturn: (projectDesignName?: string) => void;
  };
  directSourceImages?: boolean;
  readOnly?: boolean;
  savedConfigurationId?: string;
  savedHasContact?: boolean;
  savedView?: boolean;
};

type ResolvedSelection = LookBookSelection & {
  categoryId: string;
  zoneId?: string;
  categoryDescription: string;
  representedItems?: readonly string[];
};

type EditorialContext = Pick<
  HomeLookBookProps,
  | "definition"
  | "configuration"
  | "onEditCategory"
  | "onPreviewOption"
  | "directSourceImages"
> & { readOnly?: boolean };

function CoastalLookBookSummary({
  homeName,
  image,
}: {
  homeName: string;
  image: CulturalDesignImage;
}) {
  return (
    <section
      data-look-book-cultural-summary
      data-look-book-design-direction="contemporary-coastal"
      data-look-book-print-page
      className="bg-[#e7e3d8] text-[#111216]"
    >
      <div className="look-book-page-inner">
        <header className="border-t border-black/18 pt-5">
          <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-black/52">
            Project Look Book / Exterior direction
          </p>
          <div className="mt-5 grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-16">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.19em] text-black/52">
                Design Direction
              </p>
              <h3 className="mt-4 max-w-3xl text-[clamp(2.8rem,5.5vw,5.8rem)] font-medium uppercase leading-[0.86] tracking-[-0.065em] text-black/88">
                {coastalDesignDirectionLabel}
              </h3>
            </div>
            <p className="max-w-xl text-sm leading-7 text-black/56 lg:justify-self-end">
              A project-level exterior and cultural direction for {homeName}.
              The Premium and Signature design selections remain as shown in
              the following pages.
            </p>
          </div>
        </header>

        <figure className="mt-9">
          <div
            data-look-book-cultural-summary-image
            className="relative aspect-video overflow-hidden bg-[#d3cec1]"
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              loading="eager"
              unoptimized
              sizes="100vw"
              className="object-contain"
            />
          </div>
          <figcaption className="mt-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-black/52">
            Illustrative Exterior Inspiration
          </figcaption>
        </figure>

        <aside
          data-look-book-coastal-influence-notice
          className="mt-8 border-y border-black/18 py-5"
        >
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/58">
            Indigenous Influence Notice
          </p>
          <p className="mt-3 max-w-5xl text-sm leading-7 text-black/58">
            {coastalInfluenceNotice}
          </p>
        </aside>
      </div>
    </section>
  );
}

const houseDeliveryPrinciples = [
  {
    label: "Precision",
    description:
      "Factory-controlled production, coordinated components and repeatable assembly bring discipline to how the home comes together.",
  },
  {
    label: "Quality",
    description:
      "Premium materials, carefully coordinated components, documented specifications and quality-controlled production protect the intended result.",
  },
  {
    label: "Speed",
    description:
      "Factory production and site preparation can progress in parallel, reducing the inefficiencies of conventional sequential construction.",
  },
  {
    label: "Value",
    description:
      "A more efficient manufacturing, sourcing and delivery system is designed to achieve premium results with better overall value.",
  },
] as const;

function HouseDeliveryOpeningStatement({ homeName }: { homeName: string }) {
  return (
    <section
      data-look-book-value-story="precision-quality"
      data-look-book-print-page
      className="bg-[#e7e3d8] text-[#111216]"
    >
      <div className="look-book-page-inner flex flex-col justify-between">
        <header className="border-t border-black/18 pt-5">
          <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-black/52">
            House Delivery / Designed to be delivered differently
          </p>
          <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-24">
            <h3 className="look-book-print-headline max-w-5xl text-[clamp(3.4rem,7.5vw,8rem)] font-medium uppercase leading-[0.82] tracking-[-0.075em] text-black/88">
              <span className="block">Factory precision.</span>{" "}
              <span className="block text-black/48">Premium design.</span>
            </h3>
            <p className="max-w-xl text-sm leading-7 text-black/58 lg:justify-self-end">
              Your {homeName} brings design intent and delivery discipline
              together. Coordinated specifications and controlled production
              help preserve the quality you selected from concept through
              assembly.
            </p>
          </div>
        </header>

        <div className="mt-16 grid gap-8 border-t border-black/18 pt-7 sm:grid-cols-2 lg:gap-16">
          {houseDeliveryPrinciples.slice(0, 2).map((principle, index) => (
            <article key={principle.label} className="grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-7">
              <p className="font-mono text-[8px] tracking-[0.16em] text-black/42">
                {String(index + 1).padStart(2, "0")}
              </p>
              <div>
                <h4 className="text-xl font-medium uppercase tracking-[-0.03em] text-black/82">
                  {principle.label}
                </h4>
                <p className="mt-4 max-w-xl text-xs leading-6 text-black/56">
                  {principle.description}
                </p>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-16 border-t border-black/18 pt-6 text-[clamp(1.55rem,3vw,3rem)] font-medium leading-tight tracking-[-0.04em] text-black/78">
          Less waiting. Better value.
        </p>
      </div>
    </section>
  );
}

function WhyHouseDeliverySection() {
  return (
    <section
      data-look-book-value-story="why-house-delivery"
      data-look-book-print-page
      className="bg-[#d7d1c4] text-[#111216]"
    >
      <div className="look-book-page-inner flex flex-col justify-between">
        <header className="border-t border-black/18 pt-5">
          <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-black/52">
            The House Delivery difference
          </p>
          <div className="mt-7 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-20">
            <h3 className="look-book-print-headline max-w-4xl text-[clamp(3.6rem,8vw,8.5rem)] font-medium uppercase leading-[0.8] tracking-[-0.078em] text-black/88">
              <span className="block">Why House</span>{" "}
              <span className="block">Delivery.</span>
            </h3>
            <div className="max-w-2xl lg:justify-self-end">
              <p className="text-base leading-8 text-black/62">
                House Delivery combines factory precision, coordinated sourcing
                and high-quality components and materials to reduce the
                inefficiencies of conventional custom construction.
              </p>
              <p className="mt-5 text-sm leading-7 text-black/54">
                The objective is not to build a cheaper house. It is to build a
                better-value house.
              </p>
            </div>
          </div>
        </header>

        <div className="mt-14 grid border-t border-black/18 sm:grid-cols-2 lg:grid-cols-4">
          {houseDeliveryPrinciples.map((principle, index) => (
            <article
              key={principle.label}
              className="border-b border-black/16 py-6 sm:odd:pr-6 sm:even:border-l sm:even:pl-6 lg:border-l lg:pr-6 lg:pl-6 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0"
            >
              <p className="font-mono text-[8px] tracking-[0.16em] text-black/38">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h4 className="mt-5 text-lg font-medium uppercase tracking-[-0.03em] text-black/82">
                {principle.label}
              </h4>
              <p className="mt-4 text-[11px] leading-6 text-black/54">
                {principle.description}
              </p>
            </article>
          ))}
        </div>

        <aside className="mt-10 border-y border-black/18 py-5">
          <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-black/52">
            Comparison basis
          </p>
          <p className="mt-3 max-w-5xl text-xs leading-6 text-black/56">
            Value and delivery comparisons should be made against a
            conventionally built custom home of comparable size, materials,
            specification and finish quality.
          </p>
        </aside>
      </div>
    </section>
  );
}

function HouseDeliveryValueSection({
  homeName,
  validatedSavingsLabel,
}: {
  homeName: string;
  validatedSavingsLabel?: string;
}) {
  return (
    <section
      data-look-book-value-story="delivery-value"
      data-look-book-print-page
      className="bg-[#e7e3d8] text-[#111216]"
    >
      <div className="look-book-page-inner flex flex-col justify-between">
        <header className="border-t border-black/18 pt-5">
          <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-black/52">
            Delivery value / Project comparison
          </p>
          <h3 className="look-book-print-headline mt-7 max-w-6xl text-[clamp(3.2rem,7vw,7.5rem)] font-medium uppercase leading-[0.82] tracking-[-0.075em] text-black/88">
            Could this home cost materially less to deliver?
          </h3>
          <p className="mt-8 max-w-3xl text-lg leading-8 tracking-[-0.02em] text-black/64">
            A better home should not require a bigger premium.
          </p>
        </header>

        {validatedSavingsLabel ? (
          <aside
            data-look-book-validated-savings
            className="mt-10 border-y border-black/20 py-7"
          >
            <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-black/52">
              Validated project comparison
            </p>
            <p className="mt-4 text-[clamp(2.5rem,5vw,5rem)] font-medium leading-none tracking-[-0.06em] text-black/86">
              {validatedSavingsLabel}
            </p>
          </aside>
        ) : null}

        <div className="mt-12 grid gap-10 border-t border-black/18 pt-7 lg:grid-cols-2 lg:gap-20">
          <article>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/54">
              Time
            </p>
            <p className="mt-4 max-w-xl text-sm leading-7 text-black/58">
              Production for your {homeName} and preparation of its site can
              progress in parallel, reducing the delays built into conventional
              sequential construction.
            </p>
          </article>
          <article>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/54">
              Value
            </p>
            <p className="mt-4 max-w-xl text-sm leading-7 text-black/58">
              Coordinated manufacturing, sourcing and delivery are intended to
              protect premium design and material quality while removing avoidable
              process inefficiency.
            </p>
          </article>
        </div>

        <aside className="mt-12 border border-black/18 p-6 sm:p-8">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/58">
            Project-specific review
          </p>
          <p className="mt-4 max-w-5xl text-sm leading-7 text-black/62">
            Final savings depend on site conditions, specification and local
            construction costs. House Delivery can prepare a project-specific
            comparison against conventional local construction.
          </p>
        </aside>
      </div>
    </section>
  );
}

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
  plannerMode,
}: Pick<HomeLookBookProps, "onCreateLookBook"> & { homeName: string; plannerMode?: boolean }) {
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
          plannerMode={plannerMode}
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

function ProjectLookBookForm({
  homeName,
  designLabel,
  assignedQuantity,
  projectName,
  deliveryGroup,
  onSaveAndReturn,
}: {
  homeName: string;
  designLabel: string;
  assignedQuantity: number;
  projectName: string;
  deliveryGroup: string;
  onSaveAndReturn: (projectDesignName: string) => void;
}) {
  const [projectDesignName, setProjectDesignName] = useState(designLabel);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = projectDesignName.trim();
    if (!normalizedName) return;
    onSaveAndReturn(normalizedName);
  }

  return (
    <section
      id="home-look-book"
      tabIndex={-1}
      aria-labelledby="home-look-book-heading"
      data-look-book-ready="true"
      data-look-book-personalized="false"
      data-planner-look-book="true"
      className="scroll-mt-20 bg-[#e7e3d8] px-5 py-24 text-[#111216] outline-none sm:px-8 lg:px-12 lg:py-36"
    >
      <div className="mx-auto max-w-[1504px]">
        <HomeConfiguratorJourney
          currentStage="look-book"
          theme="light"
          ariaLabel="Save project Look Book"
          homeName={homeName}
          plannerMode
        />
        <div className="mt-16 grid gap-14 border-t border-black/18 pt-7 lg:mt-24 lg:grid-cols-[1.05fr_0.75fr] lg:items-end lg:gap-28">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/58">
              Configuration complete / Project design
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
              Save this design as one project Look Book. It will remain assigned
              to the full home quantity unless you explicitly create another
              design variation in the Planner.
            </p>
          </div>
          <form
            data-project-look-book-form
            onSubmit={handleSubmit}
            className="border border-black/16 bg-[#ded9cd] p-6 sm:p-9"
          >
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/46">
              Project: {projectName}
            </p>
            <label className="form-field mt-5">
              <span>Project design name / Required</span>
              <input
                required
                value={projectDesignName}
                onChange={(event) => setProjectDesignName(event.target.value)}
                placeholder={`${homeName} — Design A`}
              />
            </label>
            <p className="mt-6 text-sm text-black/60">
              Assigned to: {assignedQuantity}{" "}
              {assignedQuantity === 1 ? "home" : "homes"}
            </p>
            <p className="mt-2 text-xs text-black/48">
              Delivery group: {deliveryGroup}
            </p>
            <button
              type="submit"
              className="group mt-9 flex min-h-14 w-full items-center justify-between gap-7 bg-[#111216] px-6 text-left text-[10px] font-semibold uppercase tracking-[0.17em] text-white hover:bg-black/76 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
            >
              <span>Save My Look Book &amp; Return to Project</span>
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
    ...(category.kind === "room-look"
      ? { representedItems: category.represents }
      : {}),
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

function lowerInitial(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function getSelectionConfirmation(selection: ResolvedSelection) {
  if (!selection.representedItems?.length) {
    return selection.description ?? selection.categoryDescription;
  }

  const direction = selection.label
    .replace(/\s+look\s*&\s*feel$/i, "")
    .toLowerCase();
  const scope = new Intl.ListFormat("en", {
    style: "long",
    type: "conjunction",
  }).format(selection.representedItems.map(lowerInitial));

  return `Your selected ${direction} direction carries ${selection.optionName} throughout ${scope}.`;
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
      onClick={() => {
        if (!context.readOnly) {
          context.onPreviewOption(
            selection.categoryId,
            selection.id,
            selection.zoneId,
          );
        }
      }}
      disabled={context.readOnly}
      className={`look-book-image-button group relative block w-full overflow-hidden bg-[#d3cec1] text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-black ${className}`}
    >
      <Image
        src={selection.image.src}
        alt={selection.image.alt}
        fill
        loading={context.directSourceImages ? "lazy" : "eager"}
        quality={
          selection.image.quality ??
          (selection.image.role === "design-board" ? 100 : 95)
        }
        unoptimized={
          context.directSourceImages || selection.image.role === "design-board"
        }
        sizes={sizes}
        className={
          selection.image.fit === "contain"
            ? "object-contain"
            : "object-cover transition-transform duration-700 group-hover:scale-[1.012] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        }
      />
      {!context.readOnly ? (
        <span className="look-book-screen-control absolute bottom-3 right-3 bg-black/78 px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.16em] text-white">
          View image
        </span>
      ) : null}
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
        {!context.readOnly ? (
          <button
            type="button"
            onClick={() =>
              context.onEditCategory(selection.categoryId, selection.zoneId)
            }
            className="look-book-screen-control inline-flex min-h-8 shrink-0 items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.16em] text-black/52 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
          >
            <Pencil aria-hidden="true" className="size-3" strokeWidth={1.5} />
            Edit
          </button>
        ) : null}
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
              className="look-book-print-headline max-w-5xl text-[clamp(3.2rem,7vw,7.2rem)] font-medium uppercase leading-[0.82] tracking-[-0.075em] text-black/88"
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
            <p
              data-look-book-selection-confirmation
              className="mt-5 max-w-2xl text-sm leading-7 text-black/56"
            >
              {getSelectionConfirmation(hero)}
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
  plannerMode,
}: Pick<HomeLookBookProps, "definition" | "configuration" | "onEditCategory"> & { plannerMode?: boolean }) {
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
          plannerMode={plannerMode}
        />
        <div className="mt-16 grid gap-12 border-t border-black/18 pt-7 lg:mt-24 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-20">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/58">
              My {definition.residenceLabel} / My Look Book preview
            </p>
            <h2 id="home-look-book-heading" className="mt-7 text-[clamp(4rem,9vw,9rem)] font-medium leading-[0.82] tracking-[-0.075em] text-black/88">
              Your story<br /><span className="text-black/52">takes shape here.</span>
            </h2>
          </div>
          <div className="max-w-xl lg:justify-self-end">
            <p className="text-base leading-8 text-black/60">
              Once every controlled chapter is confirmed, your major room and
              finish selections will be presented in My Look Book.
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
  plannerContext,
  directSourceImages = false,
  readOnly = false,
  savedConfigurationId,
  savedHasContact = false,
  savedView = false,
}: HomeLookBookProps) {
  const requiredCategories = getHomeConfiguratorJourneyCategories(definition);
  const isReady = requiredCategories.every((category) =>
    isCategoryComplete(category, configuration),
  );
  if (!isReady) {
    return <IncompleteLookBook definition={definition} configuration={configuration} onEditCategory={onEditCategory} plannerMode={Boolean(plannerContext)} />;
  }

  const personalization = configuration.lookBookPersonalization;
  if (!personalization) {
    return plannerContext ? (
      <ProjectLookBookForm
        homeName={definition.residenceLabel}
        designLabel={plannerContext.designLabel}
        assignedQuantity={plannerContext.assignedQuantity}
        projectName={plannerContext.projectName}
        deliveryGroup={plannerContext.deliveryGroup}
        onSaveAndReturn={plannerContext.onSaveAndReturn}
      />
    ) : (
      <PersonalizationForm
        homeName={definition.residenceLabel}
        onCreateLookBook={onCreateLookBook}
      />
    );
  }

  const { lookBook } = definition;
  const projectDesignName =
    personalization.projectDesignName ?? plannerContext?.designLabel;
  const customerName = personalization.customer
    ? getLookBookCustomerName(personalization.customer)
    : "";
  const personalTitle = projectDesignName ??
    (personalization.customer
      ? getLookBookPersonalTitle(
          personalization.customer,
          lookBook.home.residenceLabel,
        )
      : lookBook.home.residenceLabel);
  const preparedForLabel = customerName
    ? `Prepared for ${customerName}`
    : "Personalized configuration";
  const preparedDate = formatLookBookPreparedDate(personalization.preparedAt);
  const isSubmitted = configuration.reviewStatus === "ready-for-review";
  const selectionSections = getLookBookSelectionSections(lookBook.sections);
  const coastalImage =
    plannerContext && configuration.culturalExteriorInterest
      ? getCulturalDesignImage(definition.homeId)
      : undefined;
  const context: EditorialContext = {
    definition,
    configuration,
    onEditCategory,
    onPreviewOption,
    directSourceImages,
    readOnly,
  };
  const saveLookBook = () => {
    window.print();
  };

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
      <LookBookCompletionActions
        definition={definition}
        configuration={configuration}
        initialConfigurationId={savedConfigurationId}
        initialHasContact={savedHasContact}
        savedView={savedView}
        enabled={!plannerContext}
      >
        {plannerContext ? (
          <div className="look-book-screen-control border-b border-black/14 px-5 py-8 sm:px-8 lg:px-12">
            <div className="mx-auto flex max-w-[1504px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/58">
                  Project design Look Book / {personalization.reference}
                </p>
                <p className="mt-2 text-sm text-black/62">
                  {projectDesignName} · Assigned to: {plannerContext.assignedQuantity} {plannerContext.assignedQuantity === 1 ? "home" : "homes"}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                <SaveLookBookButton placement="top" onSave={saveLookBook} />
              <button
                type="button"
                onClick={() => plannerContext.onSaveAndReturn()}
                className="inline-flex min-h-12 items-center justify-center gap-3 border border-black px-6 text-[9px] font-semibold uppercase tracking-[0.17em] text-black hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
              >
                Save My Look Book &amp; Return to Project <ArrowRight aria-hidden="true" className="size-4" />
              </button>
              </div>
            </div>
            <p className="mx-auto mt-5 max-w-[1504px] text-xs leading-5 text-black/52">
              Project: {plannerContext.projectName} · Project design group: {plannerContext.designLabel} · Assigned to {plannerContext.assignedQuantity} {plannerContext.assignedQuantity === 1 ? "home" : "homes"} · Delivery group: {plannerContext.deliveryGroup}. Save My Look Book &amp; Return to Project records this design group and brings the next home design into view.
            </p>
          </div>
        ) : null}

      <article id="home-look-book-content" data-look-book-cover data-look-book-layout="cover" data-look-book-print-page className="look-book-cover scroll-mt-20 relative min-h-[min(920px,100svh)] overflow-hidden bg-[#111216] text-white">
        <Image
          src={lookBook.home.heroImage.src}
          alt={lookBook.home.heroImage.alt}
          fill
          loading={directSourceImages ? "lazy" : "eager"}
          quality={100}
          unoptimized={directSourceImages}
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/24 to-black/18" />
        <div className="look-book-page-inner relative z-10 flex min-h-[min(920px,100svh)] flex-col justify-between">
          <div className="flex items-start justify-between gap-8 border-t border-white/50 pt-5">
            <Image src="/images/brand/house-delivery-logo-tan.png" alt="House Delivery Inc." width={1370} height={537} loading="eager" unoptimized className="h-11 w-auto object-contain" />
            <p className="text-right font-mono text-[8px] uppercase tracking-[0.16em] text-white/70">
              {projectDesignName ? "Project Look Book" : "Personalized Look Book"}<br />{personalization.reference}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.23em] text-white/68">{lookBook.home.residenceLabel}</p>
            <h2 id="home-look-book-heading" className="mt-6 max-w-6xl text-[clamp(4.2rem,11.5vw,11.5rem)] font-medium uppercase leading-[0.78] tracking-[-0.082em]">
              {personalTitle}
            </h2>
            <div className="mt-9 flex flex-col gap-3 border-t border-white/48 pt-5 text-[8px] uppercase tracking-[0.17em] text-white/76 sm:flex-row sm:items-center sm:justify-between">
              <p>{projectDesignName ? `Project design / ${projectDesignName}` : preparedForLabel}</p><p>{preparedDate} / {lookBook.home.areaLabel}</p>
            </div>
          </div>
        </div>
      </article>

      {coastalImage ? (
        <CoastalLookBookSummary
          homeName={definition.residenceLabel}
          image={coastalImage}
        />
      ) : null}

      <HouseDeliveryOpeningStatement homeName={definition.residenceLabel} />

      <div className="look-book-sections">
        {selectionSections.map((section, index) => (
          <Fragment key={section.id}>
            {index === 3 ? <WhyHouseDeliverySection /> : null}
            <LookBookSectionView section={section} context={context} />
          </Fragment>
        ))}
      </div>

      <HouseDeliveryValueSection homeName={definition.residenceLabel} />

      <section data-look-book-next-stage data-look-book-layout="dark-finale" data-look-book-print-page className="bg-[#111216] text-white">
        <div className="look-book-page-inner flex flex-col justify-between">
          <div>
            <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/52">A home shaped around you / Next stage</p>
            <h3 className="look-book-print-headline mt-7 max-w-6xl text-[clamp(4rem,8.5vw,9rem)] font-medium uppercase leading-[0.82] tracking-[-0.075em]">
              <span className="block">Your {definition.residenceLabel}.</span>{" "}<span className="block text-white/48">Ready to become real.</span>
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
            {plannerContext ? (
              <div className="look-book-screen-control mt-10 grid gap-5 lg:grid-cols-[1fr_0.7fr] lg:items-end lg:gap-16">
                {isSubmitted ? (
                  <div role="status" className="border border-white/22 p-5">
                    <p className="flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.17em] text-white/82"><Check aria-hidden="true" className="size-4" />My {definition.residenceLabel} is ready for review</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    data-submit-home-review={definition.homeId}
                    onClick={onSubmit}
                    className="group flex min-h-14 w-full items-center justify-between gap-7 bg-white px-6 text-left text-[10px] font-semibold uppercase tracking-[0.17em] text-black hover:bg-white/82 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    <span>Submit My {definition.residenceLabel} for Review</span><ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.5} />
                  </button>
                )}
                <div className="grid gap-3">
                  <SaveLookBookButton placement="completion" onSave={saveLookBook} />
                  <button
                    type="button"
                    onClick={() => plannerContext.onSaveAndReturn()}
                    className="inline-flex min-h-14 items-center justify-between gap-7 border border-white/44 px-6 text-[9px] font-semibold uppercase tracking-[0.17em] text-white hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    Save My Look Book &amp; Return to Project <ArrowRight aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </div>
            ) : null}
            <div className="mt-10 border-t border-white/18 pt-5 text-[8px] leading-4 text-white/42">
              <p>{definition.disclaimer}</p><p className="mt-2">{lookBook.preliminaryNotice}</p>
              <p className="mt-4 font-mono uppercase tracking-[0.13em]">{projectDesignName ? `Project design / ${projectDesignName}` : preparedForLabel} / {personalization.reference} / {preparedDate}</p>
            </div>
          </div>
        </div>
      </section>
      </LookBookCompletionActions>
    </section>
  );
}
