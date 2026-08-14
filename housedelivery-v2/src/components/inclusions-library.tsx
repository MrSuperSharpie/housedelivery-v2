import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { HeadlineReveal } from "@/components/headline-reveal";
import {
  inclusionCategories,
  type InclusionCategory,
} from "@/data/inclusions";

const homeCollections = [
  {
    number: "01",
    name: "Custom Homes",
    levels: "Premium · Signature",
    description:
      "More design freedom, elevated materials and coordinated whole-home design directions.",
  },
  {
    number: "02",
    name: "Laneway & Carriage Homes",
    levels: "Essential · Premium",
    description:
      "Controlled selections designed around efficient, highly coordinated compact homes.",
  },
  {
    number: "03",
    name: "Pre-Approved Homes",
    levels: "Essential · Premium",
    description:
      "A streamlined selection structure designed to support repeatability, clarity and project efficiency.",
  },
] as const;

const overviewDescriptions: Record<InclusionCategory["id"], string> = {
  flooring:
    "Flooring systems coordinated for durability, continuity, comfort and a cohesive whole-home material direction.",
  "kitchen-cabinetry":
    "Cabinetry, finishes, storage and hardware coordinated around the kitchen layout and the wider interior palette.",
  wardrobes:
    "Wardrobe systems coordinated around practical storage planning, room layouts and a consistent interior finish language.",
  "interior-doors":
    "Interior doors, finishes and hardware coordinated with the flooring, cabinetry and architectural character of the home.",
  "exterior-doors":
    "Entry doors and associated finishes coordinated with the home’s architecture, arrival sequence and project requirements.",
  "windows-patio-doors":
    "Windows and patio doors coordinated around the architecture, daylight, indoor-outdoor connection and project-specific performance needs.",
  "kitchen-bath-fixtures":
    "Sinks, faucets and related kitchen and bathroom fixtures coordinated with the selected home, surfaces and cabinetry.",
  "bathroom-vanities":
    "Vanities, storage, finishes and fixtures coordinated around bathroom layouts and the home’s overall material direction.",
  "tile-surfaces":
    "Tile and applied surfaces coordinated across wet areas, feature zones and durable transitions throughout the home.",
  countertops:
    "Countertop materials and profiles coordinated across kitchen, vanity and other work-surface applications.",
  "wall-panels":
    "Interior wall panels coordinated for selected feature areas as part of the home’s broader material palette.",
  lighting:
    "Lighting coordinated to support everyday use, architectural emphasis and a consistent atmosphere throughout the home.",
  appliances:
    "Appliances coordinated with cabinetry, kitchen planning, service requirements and the selected home design.",
  "window-coverings":
    "Window coverings coordinated for privacy, daylight control and alignment with the interior finish direction.",
  "garage-doors-operators":
    "Garage doors and operators coordinated with the home exterior, access needs and project-specific technical requirements.",
};

function BrowseInclusions() {
  return (
    <section
      aria-labelledby="browse-inclusions-heading"
      className="border-t border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-32"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-20">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
              Coordinated scope
            </p>
            <h2
              id="browse-inclusions-heading"
              className="mt-7 max-w-3xl text-[clamp(3.25rem,7vw,7.5rem)] font-medium leading-[0.86] tracking-[-0.07em]"
            >
              What we
              <br />
              <span className="text-white/38">coordinate.</span>
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-white/52 lg:justify-self-end lg:text-lg lg:leading-8">
            Explore the products, finishes and systems that House Delivery can
            bring together as one complete home. Final selections are shaped by
            the home collection and the needs of each project.
          </p>
        </div>

        <nav aria-label="Browse inclusion categories" className="mt-14 lg:mt-20">
          <ol className="grid border-l border-t border-white/12 sm:grid-cols-2 lg:grid-cols-3">
            {inclusionCategories.map((category) => (
              <li key={category.id}>
                <a
                  href={`#${category.id}`}
                  className="group flex min-h-24 items-center justify-between gap-6 border-b border-r border-white/12 px-5 py-5 transition-colors hover:bg-white/[0.035] focus-visible:bg-white/[0.035] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white sm:min-h-28 sm:px-6"
                >
                  <span className="text-sm font-medium tracking-[-0.02em] text-white/76 transition-colors group-hover:text-white group-focus-visible:text-white">
                    {category.shortName}
                  </span>
                  <span
                    aria-hidden="true"
                    className="font-mono text-[9px] tracking-[0.18em] text-white/32"
                  >
                    {category.number}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </section>
  );
}

function CategoryImage({ category }: { category: InclusionCategory }) {
  return (
    <div className="relative aspect-[4/3] size-full overflow-hidden bg-[#121419] sm:aspect-[3/2] lg:aspect-auto lg:min-h-[34rem]">
      {category.heroImage ? (
        <Image
          src={category.heroImage.src}
          alt={category.heroImage.alt}
          fill
          quality={90}
          sizes="(max-width: 1023px) 100vw, 58vw"
          className="object-cover"
        />
      ) : (
        <div className="flex size-full items-end p-6 sm:p-8 lg:p-10">
          <p className="text-lg font-medium tracking-[-0.025em] text-white/55">
            Category imagery in development
          </p>
        </div>
      )}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"
      />
    </div>
  );
}

function CategorySection({
  category,
  index,
}: {
  category: InclusionCategory;
  index: number;
}) {
  const headingId = `inclusion-${category.id}-heading`;
  const imageFirst = index % 2 === 0;

  return (
    <section
      id={category.id}
      aria-labelledby={headingId}
      className={`relative scroll-mt-24 border-t border-white/10 px-5 py-16 sm:px-8 sm:py-24 lg:px-12 lg:py-32 ${
        imageFirst ? "bg-[#0b0c10]" : "bg-[#0d0f13]"
      }`}
    >
      {category.legacyIds?.map((legacyId) => (
        <span
          key={legacyId}
          id={legacyId}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 scroll-mt-24"
        />
      ))}
      <span
        id={`inclusion-${category.id}`}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 scroll-mt-24"
      />

      <div className="mx-auto max-w-[1504px]">
        <article className="grid overflow-hidden border border-white/12 lg:grid-cols-12">
          <div
            className={`border-b border-white/12 lg:col-span-7 lg:border-b-0 ${
              imageFirst ? "lg:border-r" : "lg:order-2 lg:border-l"
            }`}
          >
            <CategoryImage category={category} />
          </div>

          <div className="flex min-h-80 flex-col p-6 sm:min-h-96 sm:p-9 lg:col-span-5 lg:min-h-[34rem] lg:p-10 xl:p-12">
            <div className="flex items-start justify-between gap-6">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/60">
                {category.eyebrow}
              </p>
              <span
                aria-hidden="true"
                className="font-mono text-[9px] tracking-[0.18em] text-white/30"
              >
                {category.number} / {String(inclusionCategories.length).padStart(2, "0")}
              </span>
            </div>

            <div className="mt-auto pt-16 sm:pt-20">
              <h2
                id={headingId}
                className="max-w-3xl text-[clamp(2.75rem,5.5vw,5.8rem)] font-medium leading-[0.88] tracking-[-0.065em] text-white/92"
              >
                {category.name}
              </h2>
              <p className="mt-7 max-w-xl text-base leading-7 text-white/56 lg:text-lg lg:leading-8">
                {overviewDescriptions[category.id]}
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export function InclusionsLibrary() {
  return (
    <main
      data-inclusions-library
      className="overflow-hidden bg-[#0b0c10] text-white"
    >
      <section className="border-b border-white/10 px-5 pb-16 pt-36 sm:px-8 sm:pb-20 sm:pt-44 lg:px-12 lg:pb-24 lg:pt-52">
        <div className="mx-auto max-w-[1504px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
            House Delivery Kit of Parts
          </p>
          <HeadlineReveal trigger="mount" className="mt-8">
            <h1 className="max-w-[1400px] text-[clamp(3.25rem,11vw,11rem)] font-medium leading-[0.8] tracking-[-0.078em]">
              Inclusions
              <br />
              <span className="text-white/38">Overview</span>
            </h1>
          </HeadlineReveal>

          <div className="mt-16 grid gap-8 border-t border-white/16 pt-7 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
              Complete-home coordination / 15 categories
            </p>
            <div className="max-w-3xl">
              <p className="text-xl leading-8 tracking-[-0.025em] text-white/76 sm:text-2xl sm:leading-9">
                Products, finishes and systems, brought together around the
                home you choose.
              </p>
              <p className="mt-5 text-sm leading-7 text-white/54 sm:text-base sm:leading-8">
                House Delivery coordinates the many material and product
                decisions that turn a building system into a complete home.
                This overview shows the breadth of that work; detailed
                selections are developed within the experience for each home.
              </p>
            </div>
          </div>

          <figure className="mt-14 sm:mt-20 lg:mt-24">
            <div className="relative aspect-[4/3] overflow-hidden border border-white/12 bg-[#121419] sm:aspect-[3/2] lg:aspect-[16/9]">
              <Image
                src="/images/inclusions/inclusions-hero.webp"
                alt="Contemporary living room with dark built-in cabinetry, central black-and-white artwork and curved neutral seating."
                fill
                quality={90}
                loading="eager"
                sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) calc(100vw - 64px), (max-width: 1599px) calc(100vw - 96px), 1504px"
                className="object-cover object-center"
              />
            </div>
            <figcaption className="mt-4 max-w-2xl border-l border-white/20 pl-4 text-xs leading-5 text-white/48">
              A coordinated interior direction brings the individual parts of
              a home together as one considered whole.
            </figcaption>
          </figure>
        </div>
      </section>

      <section
        aria-labelledby="home-collections-heading"
        className="px-5 py-24 sm:px-8 lg:px-12 lg:py-36"
      >
        <div className="mx-auto max-w-[1504px]">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-20">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
                Design collections
              </p>
              <h2
                id="home-collections-heading"
                className="mt-7 max-w-4xl text-[clamp(3rem,6.5vw,7rem)] font-medium leading-[0.88] tracking-[-0.068em]"
              >
                Selections shaped
                <br />
                <span className="text-white/38">to the home you choose.</span>
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-7 text-white/52 lg:justify-self-end lg:text-lg lg:leading-8">
              House Delivery coordinates the products and finishes that turn a
              building system into a complete home. Design levels vary by home
              collection so choices remain clear, coordinated and appropriate
              to the home.
            </p>
          </div>

          <div className="mt-16 grid border-l border-t border-white/12 lg:mt-24 lg:grid-cols-3">
            {homeCollections.map((collection) => (
              <article
                key={collection.name}
                className="flex min-h-72 flex-col border-b border-r border-white/12 p-6 sm:min-h-80 sm:p-8 lg:min-h-[25rem]"
              >
                <span className="font-mono text-[10px] tracking-[0.18em] text-white/30">
                  {collection.number}
                </span>
                <div className="mt-auto pt-14">
                  <h3 className="max-w-sm text-[clamp(2.2rem,3.4vw,3.8rem)] font-medium leading-[0.94] tracking-[-0.055em] text-white/92">
                    {collection.name}
                  </h3>
                  <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/68">
                    {collection.levels}
                  </p>
                  <p className="mt-5 max-w-sm border-t border-white/10 pt-5 text-sm leading-7 text-white/50">
                    {collection.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <BrowseInclusions />

      {inclusionCategories.map((category, index) => (
        <CategorySection key={category.id} category={category} index={index} />
      ))}

      <section
        aria-labelledby="start-with-home-heading"
        className="border-t border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-36"
      >
        <div className="mx-auto max-w-[1504px]">
          <div className="grid gap-14 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:gap-24">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
                From architecture to interior
              </p>
              <h2
                id="start-with-home-heading"
                className="mt-7 max-w-5xl text-[clamp(3rem,6.5vw,7rem)] font-medium leading-[0.88] tracking-[-0.068em]"
              >
                Start with the home.
                <br />
                <span className="text-white/38">Then shape the details.</span>
              </h2>
            </div>
            <div className="border-l border-white/15 pl-6 sm:pl-8">
              <p className="text-sm leading-7 text-white/52">
                Your home establishes the architecture. Its design collection
                then brings the flooring, cabinetry, surfaces, bathrooms,
                doors and other inclusions together as one coordinated
                interior.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/#models"
                  className="group inline-flex min-h-11 items-center gap-5 border border-white bg-white px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#0b0c10] transition-colors hover:bg-transparent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  Explore the Homes
                  <ArrowRight
                    aria-hidden="true"
                    className="size-3.5 transition-transform group-hover:translate-x-1"
                    strokeWidth={1.5}
                  />
                </Link>
                <Link
                  href="/#reserve"
                  className="inline-flex min-h-11 items-center border border-white/28 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-white/76 transition-colors hover:border-white hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  Begin Project Review
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-20 max-w-5xl border-t border-white/12 pt-6 text-xs leading-6 text-white/42 lg:mt-28">
            Images and selections are illustrative. Final products, finishes,
            availability, pricing and technical suitability are confirmed
            during project review and are subject to project-specific
            requirements.
          </p>
        </div>
      </section>
    </main>
  );
}
