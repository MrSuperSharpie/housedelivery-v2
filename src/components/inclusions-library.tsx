import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { HeadlineReveal } from "@/components/headline-reveal";
import { InclusionsFilmFeature } from "@/components/homepage-video-experiences";
import {
  inclusionCategories,
  type InclusionCategory,
} from "@/data/inclusions";

const personalizationSteps = [
  {
    number: "01",
    title: "Choose a home",
    description: "The architecture sets the design directions available to you.",
  },
  {
    number: "02",
    title: "Design the key spaces",
    description: "Compare curated options for the rooms, finishes and details that shape the home.",
  },
  {
    number: "03",
    title: "Create your Look Book",
    description: "Your selections are saved together as one clear design direction for the project.",
  },
] as const;

const homeCollections = [
  {
    number: "01",
    name: "Custom Homes",
    levels: ["Premium", "Signature"],
    image: {
      src: "/images/inclusions/wardrobes/hero.webp",
      alt: "Dark tailored wardrobe with integrated lighting and coordinated storage.",
    },
  },
  {
    number: "02",
    name: "Laneway / Carriage + Pre-Approved Homes",
    levels: ["Essential", "Premium"],
    image: {
      src: "/images/inclusions/bathroom-systems/hero.webp",
      alt: "Calm primary bathroom with a freestanding tub and coordinated vanities.",
    },
  },
] as const;

type VisualStory = {
  number: string;
  title: string;
  categoryLine: string;
  imageCategoryId: InclusionCategory["id"];
  anchors: readonly string[];
  span: "wide" | "narrow" | "full";
};

const visualStories: readonly VisualStory[] = [
  {
    number: "01",
    title: "Flooring, surfaces + tile",
    categoryLine: "Material foundation",
    imageCategoryId: "flooring",
    anchors: ["flooring", "countertops", "tile-surfaces"],
    span: "wide",
  },
  {
    number: "02",
    title: "Kitchen cabinetry + appliances",
    categoryLine: "Kitchen",
    imageCategoryId: "kitchen-cabinetry",
    anchors: ["kitchen-cabinetry", "appliances"],
    span: "narrow",
  },
  {
    number: "03",
    title: "Wardrobes + storage",
    categoryLine: "Storage",
    imageCategoryId: "wardrobes",
    anchors: ["wardrobes"],
    span: "narrow",
  },
  {
    number: "04",
    title: "Interior doors + details",
    categoryLine: "Interior architecture",
    imageCategoryId: "interior-doors",
    anchors: ["interior-doors", "wall-panels"],
    span: "wide",
  },
  {
    number: "05",
    title: "Windows, doors + openings",
    categoryLine: "Arrival + daylight",
    imageCategoryId: "windows-patio-doors",
    anchors: [
      "exterior-doors",
      "windows-patio-doors",
      "garage-doors-operators",
    ],
    span: "wide",
  },
  {
    number: "06",
    title: "Bathrooms + fixtures",
    categoryLine: "Bathrooms",
    imageCategoryId: "kitchen-bath-fixtures",
    anchors: [
      "kitchen-bath-fixtures",
      "bathroom-systems",
      "plumbing-fixtures",
      "bathroom-vanities",
    ],
    span: "narrow",
  },
  {
    number: "07",
    title: "Lighting + window coverings",
    categoryLine: "Atmosphere + control",
    imageCategoryId: "lighting",
    anchors: ["lighting", "window-coverings"],
    span: "full",
  },
];

function getCategory(categoryId: InclusionCategory["id"]) {
  const category = inclusionCategories.find(
    (candidate) => candidate.id === categoryId,
  );

  if (!category) {
    throw new Error(`Unknown inclusion category: ${categoryId}`);
  }

  return category;
}

function VisualStoryCard({ story }: { story: VisualStory }) {
  const category = getCategory(story.imageCategoryId);
  const heroImage = category.heroImage;
  const spanClass =
    story.span === "full"
      ? "lg:col-span-12"
      : story.span === "wide"
        ? "lg:col-span-7"
        : "lg:col-span-5";

  return (
    <article className={`relative scroll-mt-24 ${spanClass}`}>
      {story.anchors.map((anchor) => (
        <span
          key={anchor}
          id={anchor}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 scroll-mt-24"
        />
      ))}

      <figure>
        <div
          className={`group relative overflow-hidden bg-[#121419] ${
            story.span === "full"
              ? "aspect-[4/3] sm:aspect-[16/9] lg:aspect-[2.3/1]"
              : "aspect-[4/3] sm:aspect-[3/2]"
          }`}
        >
          {heroImage ? (
            <Image
              src={heroImage.src}
              alt={heroImage.alt}
              fill
              quality={95}
              sizes={
                story.span === "full"
                  ? "(max-width: 1599px) calc(100vw - 6rem), 1504px"
                  : "(max-width: 1023px) calc(100vw - 2.5rem), 58vw"
              }
              className="object-cover brightness-90 transition-all duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.025] group-hover:brightness-100"
            />
          ) : null}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/68 via-black/5 to-black/[0.04]"
          />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 lg:p-8">
            <div className="flex items-end justify-between gap-8 border-t border-white/25 pt-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/58">
                  {story.categoryLine}
                </p>
                <h3 className="mt-2 text-xl font-medium tracking-[-0.035em] text-white/92 sm:text-2xl">
                  {story.title}
                </h3>
              </div>
              <span className="font-mono text-[9px] tracking-[0.18em] text-white/48">
                {story.number} / 07
              </span>
            </div>
          </div>
        </div>
      </figure>
    </article>
  );
}

export function InclusionsLibrary() {
  return (
    <main
      data-inclusions-library
      className="overflow-hidden bg-[#0b0c10] text-white"
    >
      <section className="border-b border-white/10 px-5 pb-20 pt-36 sm:px-8 sm:pb-24 sm:pt-44 lg:px-12 lg:pb-32 lg:pt-52">
        <div className="mx-auto max-w-[1504px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
            Finishes + Inclusions
          </p>
          <HeadlineReveal trigger="mount" className="mt-8">
            <h1 className="max-w-[1400px] text-[clamp(3.7rem,10vw,10rem)] font-medium leading-[0.82] tracking-[-0.078em]">
              One home.
              <br />
              <span className="text-white/38">One coordinated design.</span>
            </h1>
          </HeadlineReveal>

          <div className="mt-14 grid gap-8 border-t border-white/16 pt-7 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/52">
              Curated, not pieced together
            </p>
            <p className="max-w-3xl text-xl leading-8 tracking-[-0.025em] text-white/72 sm:text-2xl sm:leading-9">
              Kitchens, bathrooms, flooring, wardrobes, doors, openings and
              other visible selections are coordinated around the architecture
              of each home.
            </p>
          </div>

          <figure className="mt-14 sm:mt-20 lg:mt-24">
            <div className="relative aspect-[4/3] overflow-hidden bg-[#121419] sm:aspect-[3/2] lg:aspect-[2.05/1]">
              <Image
                src="/images/inclusions/coordinated-architectural-system.png"
                alt="Warm coordinated living interior with integrated wood detailing, stone surfaces and lighting."
                fill
                quality={100}
                loading="eager"
                fetchPriority="high"
                sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) calc(100vw - 64px), (max-width: 1599px) calc(100vw - 96px), 1504px"
                className="object-cover object-center"
              />
            </div>
          </figure>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
        <div className="mx-auto max-w-[1504px]">
          <InclusionsFilmFeature prominent />
        </div>
      </section>

      <section
        aria-labelledby="personalization-heading"
        className="border-y border-white/10 bg-[#0d0f13] px-5 py-24 sm:px-8 lg:px-12 lg:py-36"
      >
        <div className="mx-auto max-w-[1504px]">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-20">
            <div>
              <p className="eyebrow">Design My Home</p>
              <h2
                id="personalization-heading"
                className="mt-7 max-w-4xl text-[clamp(3rem,6.5vw,7rem)] font-medium leading-[0.88] tracking-[-0.068em]"
              >
                Choose. Compare.
                <br />
                <span className="text-white/38">Save your Look Book.</span>
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-white/54 lg:justify-self-end">
              Each home offers curated design directions for its key spaces and
              finishes. Your selections become one project Look Book.
            </p>
          </div>

          <div className="mt-16 grid gap-10 lg:mt-24 lg:grid-cols-12 lg:gap-8">
            <figure className="lg:col-span-7">
              <div className="relative aspect-[16/9] overflow-hidden bg-[#e8e6df]">
                <Image
                  src="/images/homes/maplewood/visual-guide/Maplewood_01_Kitchen_Premium-1_Coastal-Light-Oak.png"
                  alt="Maplewood Premium kitchen Visual Guide board showing a coordinated light oak design direction."
                  fill
                  quality={100}
                  unoptimized
                  sizes="(max-width: 1023px) calc(100vw - 2.5rem), 58vw"
                  className="object-contain"
                />
              </div>
              <figcaption className="mt-4 border-t border-white/10 pt-3 text-[9px] uppercase tracking-[0.18em] text-white/32">
                Representative Look Book / Maplewood
              </figcaption>
            </figure>

            <ol className="lg:col-span-5 lg:col-start-8">
              {personalizationSteps.map((step) => (
                <li
                  key={step.number}
                  className="grid grid-cols-[2.5rem_1fr] gap-5 border-t border-white/12 py-7 first:pt-0 lg:py-9"
                >
                  <span className="pt-1 font-mono text-[9px] tracking-[0.18em] text-white/28">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-xl font-medium tracking-[-0.035em] text-white/82">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-white/44">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="package-structure-heading"
        className="px-5 py-24 sm:px-8 lg:px-12 lg:py-36"
      >
        <div className="mx-auto max-w-[1504px]">
          <div className="grid gap-10 border-t border-white/12 pt-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-20">
            <p className="eyebrow">Package levels</p>
            <div>
              <h2
                id="package-structure-heading"
                className="max-w-5xl text-[clamp(3rem,6.3vw,6.8rem)] font-medium leading-[0.88] tracking-[-0.068em]"
              >
                Clear choices.
                <br />
                <span className="text-white/38">Matched to the home.</span>
              </h2>
              <p className="mt-8 max-w-2xl text-base leading-8 text-white/50">
                Package levels vary by home family so the design choices remain
                clear and appropriate to the project.
              </p>
            </div>
          </div>

          <div className="mt-16 grid border-l border-t border-white/12 lg:mt-24 lg:grid-cols-2">
            {homeCollections.map((collection) => (
              <article
                key={collection.name}
                className="flex flex-col border-b border-r border-white/12 p-6 sm:p-8 lg:p-10"
              >
                <div className="flex items-start justify-between gap-8">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/38">
                    {collection.name}
                  </p>
                  <span className="font-mono text-[9px] tracking-[0.18em] text-white/24">
                    {collection.number}
                  </span>
                </div>

                <div className="relative mt-8 aspect-[16/9] overflow-hidden bg-[#121419]">
                  <Image
                    src={collection.image.src}
                    alt={collection.image.alt}
                    fill
                    quality={95}
                    sizes="(max-width: 1023px) calc(100vw - 2.5rem), 50vw"
                    className="object-cover"
                  />
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  {collection.levels.map((level) => (
                    <span
                      key={level}
                      className="border border-white/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72"
                    >
                      {level}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="coordination-heading"
        className="border-t border-white/10 bg-[#0d0f13] px-5 py-24 sm:px-8 lg:px-12 lg:py-36"
      >
        <div className="mx-auto max-w-[1504px]">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-20">
            <p className="eyebrow">What can be coordinated</p>
            <div>
              <h2
                id="coordination-heading"
                className="max-w-4xl text-[clamp(3rem,6.5vw,7rem)] font-medium leading-[0.88] tracking-[-0.068em]"
              >
                The visible parts
                <br />
                <span className="text-white/38">of the home.</span>
              </h2>
              <p className="mt-8 max-w-2xl text-base leading-8 text-white/50">
                Final products and specifications are confirmed for the
                selected home and project.
              </p>
            </div>
          </div>

          <div className="mt-16 grid gap-x-8 gap-y-10 lg:mt-24 lg:grid-cols-12 lg:gap-y-14">
            {visualStories.map((story) => (
              <VisualStoryCard key={story.number} story={story} />
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="choose-home-heading"
        className="border-t border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-36"
      >
        <div className="mx-auto max-w-[1504px]">
          <div className="grid gap-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-24">
            <div>
              <p className="eyebrow">Start with the home</p>
              <h2
                id="choose-home-heading"
                className="mt-7 max-w-5xl text-[clamp(3.4rem,7vw,7.5rem)] font-medium leading-[0.86] tracking-[-0.072em]"
              >
                Choose a home.
                <br />
                <span className="text-white/38">Then design it.</span>
              </h2>
            </div>
            <div className="border-l border-white/15 pl-6 sm:pl-8">
              <p className="text-base leading-8 text-white/54">
                Open a home to see its available Design My Home experience and
                create your Look Book.
              </p>
              <Link
                href="/#models"
                className="group mt-8 inline-flex min-h-12 items-center gap-8 border border-white bg-white px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0b0c10] transition-colors hover:bg-transparent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Explore Homes
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-1"
                  strokeWidth={1.5}
                />
              </Link>
            </div>
          </div>

          <p className="mt-20 max-w-5xl border-t border-white/12 pt-6 text-xs leading-6 text-white/38 lg:mt-28">
            Images and design directions are illustrative. Final products,
            finishes, availability, pricing and technical suitability are
            confirmed during project review and remain subject to the selected
            home and project-specific requirements.
          </p>
        </div>
      </section>
    </main>
  );
}
