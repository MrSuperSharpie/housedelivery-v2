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
    title: "Begin with the architecture",
    description:
      "The home establishes the plan, proportions, openings and character that every visible selection needs to support.",
  },
  {
    number: "02",
    title: "Choose a curated direction",
    description:
      "Selections are organized into coordinated design directions rather than an unlimited menu of disconnected products.",
  },
  {
    number: "03",
    title: "Build your personal Look Book",
    description:
      "Inside Build My Home / Visual Guide, the available directions are explored room by room and assembled into one personal record.",
  },
] as const;

const homeCollections = [
  {
    number: "01",
    name: "Custom Homes",
    description:
      "Elevated, whole-home design directions developed around the architecture and scale of each Custom Home.",
    levels: ["Premium", "Signature"],
    image: {
      src: "/images/inclusions/wardrobes/hero.webp",
      alt: "Dark, tailored wardrobe with integrated lighting and coordinated storage.",
    },
  },
  {
    number: "02",
    name: "Laneway / Carriage + Pre-Approved Homes",
    description:
      "Clear, durable selection pathways designed to support compact homes, repeatability and efficient project coordination.",
    levels: ["Essential", "Premium"],
    image: {
      src: "/images/inclusions/bathroom-systems/hero.webp",
      alt: "Calm primary bathroom with a freestanding tub, coordinated vanities and full-height glazing.",
    },
  },
] as const;

const coordinationBenefits = [
  "Stronger design consistency",
  "Fewer disconnected purchases",
  "Coordinated specifications",
  "Repeatable procurement",
  "Clearer replacement planning",
] as const;

type VisualStory = {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  categoryLine: string;
  imageCategoryId: InclusionCategory["id"];
  anchors: readonly string[];
  span: "wide" | "narrow" | "full";
};

const visualStories: readonly VisualStory[] = [
  {
    number: "01",
    eyebrow: "Material foundation",
    title: "One material language, carried through the home.",
    description:
      "Flooring, countertops and tile surfaces are considered together so transitions feel deliberate and the interior reads as one whole.",
    categoryLine: "Flooring / Countertops / Tile + surfaces",
    imageCategoryId: "flooring",
    anchors: ["flooring", "countertops", "tile-surfaces"],
    span: "wide",
  },
  {
    number: "02",
    eyebrow: "The working heart",
    title: "A kitchen resolved as a complete system.",
    description:
      "Cabinetry, work surfaces and appliances are coordinated around the architecture, storage plan and service requirements.",
    categoryLine: "Kitchen cabinetry / Countertops / Appliances",
    imageCategoryId: "kitchen-cabinetry",
    anchors: ["kitchen-cabinetry", "appliances"],
    span: "narrow",
  },
  {
    number: "03",
    eyebrow: "Integrated storage",
    title: "Wardrobes that belong to the rooms around them.",
    description:
      "Storage planning, finishes and internal organization follow the same calm material direction as the wider interior.",
    categoryLine: "Wardrobes / Interior storage",
    imageCategoryId: "wardrobes",
    anchors: ["wardrobes"],
    span: "narrow",
  },
  {
    number: "04",
    eyebrow: "Interior architecture",
    title: "Details that give the home its rhythm.",
    description:
      "Interior doors, hardware and selected architectural wall details reinforce the character of the home from room to room.",
    categoryLine: "Interior doors / Architectural details / Wall panels",
    imageCategoryId: "interior-doors",
    anchors: ["interior-doors", "wall-panels"],
    span: "wide",
  },
  {
    number: "05",
    eyebrow: "Arrival + daylight",
    title: "Exterior openings, read as part of the architecture.",
    description:
      "Entry doors, windows, patio doors and related visible openings are coordinated with the arrival sequence and indoor-outdoor experience.",
    categoryLine: "Entry doors / Windows / Patio doors / Exterior openings",
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
    eyebrow: "Complete bathrooms",
    title: "Fixtures, vanities and surfaces designed to work together.",
    description:
      "Bathroom systems are assembled as coordinated environments, balancing daily function with a consistent whole-home finish direction.",
    categoryLine: "Bathroom systems / Fixtures / Vanities / Surfaces",
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
    eyebrow: "Atmosphere + control",
    title: "The finishing touches that shape how a room feels.",
    description:
      "Lighting and window coverings support the architecture with coordinated illumination, privacy and daylight control.",
    categoryLine: "Lighting / Window coverings",
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
              quality={90}
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
            className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/5 to-black/[0.06]"
          />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 lg:p-8">
            <div className="flex items-end justify-between gap-8 border-t border-white/25 pt-4">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/72">
                {story.eyebrow}
              </p>
              <span className="font-mono text-[9px] tracking-[0.18em] text-white/48">
                {story.number} / 07
              </span>
            </div>
          </div>
        </div>
        <figcaption className="grid gap-5 border-b border-white/10 py-7 sm:grid-cols-[1.1fr_0.9fr] sm:gap-8 sm:py-8">
          <div>
            <p className="text-[9px] font-semibold uppercase leading-5 tracking-[0.18em] text-white/36">
              {story.categoryLine}
            </p>
            <h3 className="mt-4 max-w-2xl text-[clamp(2rem,3.3vw,3.6rem)] font-medium leading-[0.94] tracking-[-0.055em] text-white/88">
              {story.title}
            </h3>
          </div>
          <p className="max-w-xl text-sm leading-7 text-white/48 sm:self-end sm:justify-self-end">
            {story.description}
          </p>
        </figcaption>
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
            House Delivery / Finishes + inclusions
          </p>
          <HeadlineReveal trigger="mount" className="mt-8">
            <h1 className="max-w-[1400px] text-[clamp(3.7rem,10vw,10rem)] font-medium leading-[0.82] tracking-[-0.078em]">
              The final layer,
              <br />
              <span className="text-white/38">made personal.</span>
            </h1>
          </HeadlineReveal>

          <div className="mt-14 grid gap-8 border-t border-white/16 pt-7 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/52">
              Coordinated architecture / Considered interiors
            </p>
            <div className="max-w-3xl">
              <p className="text-xl leading-8 tracking-[-0.025em] text-white/76 sm:text-2xl sm:leading-9">
                A House Delivery home arrives as a coordinated architectural
                system. Its visible finishes and inclusions allow that home to
                feel personal, composed and considered.
              </p>
              <p className="mt-5 text-sm leading-7 text-white/50 sm:text-base sm:leading-8">
                Flooring, cabinetry, windows, doors, bathrooms, lighting,
                window coverings and appliances are brought together through
                controlled package directions—not left as disconnected
                purchasing decisions.
              </p>
            </div>
          </div>

          <figure className="mt-14 sm:mt-20 lg:mt-24">
            <div className="relative aspect-[4/3] overflow-hidden bg-[#121419] sm:aspect-[3/2] lg:aspect-[2.05/1]">
              <Image
                src="/images/inclusions/coordinated-architectural-system.png"
                alt="Warm, coordinated living interior with integrated wood detailing, stone surfaces, lighting and exterior openings."
                fill
                quality={100}
                loading="eager"
                fetchPriority="high"
                sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) calc(100vw - 64px), (max-width: 1599px) calc(100vw - 96px), 1504px"
                className="object-cover object-center"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/[0.05]"
              />
            </div>
            <figcaption className="mt-4 max-w-2xl border-l border-white/20 pl-4 text-xs leading-5 text-white/44">
              The visible parts of the home are coordinated as one design
              direction, from the largest surfaces to the smallest details.
            </figcaption>
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
              <p className="eyebrow">How personalization works</p>
              <h2
                id="personalization-heading"
                className="mt-7 max-w-4xl text-[clamp(3rem,6.5vw,7rem)] font-medium leading-[0.88] tracking-[-0.068em]"
              >
                Curated direction.
                <br />
                <span className="text-white/38">A personal result.</span>
              </h2>
            </div>
            <div className="max-w-2xl lg:justify-self-end">
              <p className="text-lg leading-8 text-white/66">
                Personalization does not mean unlimited bespoke customization.
                It means choosing from considered design directions developed
                to work with the architecture of each home.
              </p>
              <p className="mt-5 text-sm leading-7 text-white/44">
                The individual home experience is where those choices are
                explored through Build My Home / Visual Guide and assembled
                into a personalized Look Book.
              </p>
            </div>
          </div>

          <div className="mt-16 grid gap-10 lg:mt-24 lg:grid-cols-12 lg:gap-8">
            <figure className="lg:col-span-7">
              <div className="relative aspect-[16/9] overflow-hidden bg-[#e8e6df]">
                <Image
                  src="/images/homes/maplewood/visual-guide/Maplewood_01_Kitchen_Premium-1_Coastal-Light-Oak.png"
                  alt="Maplewood Premium kitchen Visual Guide board showing a coordinated light oak design direction."
                  fill
                  quality={100}
                  sizes="(max-width: 1023px) calc(100vw - 2.5rem), 58vw"
                  className="object-contain"
                />
              </div>
              <figcaption className="mt-4 border-t border-white/10 pt-3 text-[9px] uppercase tracking-[0.18em] text-white/32">
                Representative Visual Guide / Maplewood
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
            <p className="eyebrow">Package structure</p>
            <div>
              <h2
                id="package-structure-heading"
                className="max-w-5xl text-[clamp(3rem,6.3vw,6.8rem)] font-medium leading-[0.88] tracking-[-0.068em]"
              >
                The right level
                <br />
                <span className="text-white/38">for the home.</span>
              </h2>
              <p className="mt-8 max-w-2xl text-base leading-8 text-white/50">
                Package levels follow the type of home so the available
                choices remain commercially clear and appropriate to the
                architecture.
              </p>
            </div>
          </div>

          <div className="mt-16 grid border-l border-t border-white/12 lg:mt-24 lg:grid-cols-2">
            {homeCollections.map((collection) => (
              <article
                key={collection.name}
                className="flex min-h-[34rem] flex-col border-b border-r border-white/12 p-6 sm:p-8 lg:min-h-[40rem] lg:p-10"
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
                    quality={90}
                    sizes="(max-width: 1023px) calc(100vw - 2.5rem), 50vw"
                    className="object-cover"
                  />
                </div>

                <div className="mt-auto pt-12">
                  <div className="flex flex-wrap gap-3">
                    {collection.levels.map((level) => (
                      <span
                        key={level}
                        className="border border-white/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72"
                      >
                        {level}
                      </span>
                    ))}
                  </div>
                  <p className="mt-6 max-w-xl border-t border-white/10 pt-5 text-sm leading-7 text-white/46">
                    {collection.description}
                  </p>
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
            <div>
              <p className="eyebrow">What House Delivery coordinates</p>
              <h2
                id="coordination-heading"
                className="mt-7 max-w-4xl text-[clamp(3rem,6.5vw,7rem)] font-medium leading-[0.88] tracking-[-0.068em]"
              >
                More than a shell.
                <br />
                <span className="text-white/38">A complete design system.</span>
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-white/52 lg:justify-self-end">
              House Delivery coordinates the major visible elements of the
              home as connected specifications. The result is a home that
              feels intentionally designed rather than pieced together.
            </p>
          </div>

          <ul className="mt-14 grid border-l border-t border-white/12 sm:grid-cols-2 lg:mt-20 lg:grid-cols-5">
            {coordinationBenefits.map((benefit, index) => (
              <li
                key={benefit}
                className="flex min-h-28 flex-col justify-between border-b border-r border-white/12 p-5"
              >
                <span className="font-mono text-[9px] tracking-[0.18em] text-white/22">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="mt-8 max-w-[12rem] text-sm leading-6 text-white/62">
                  {benefit}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-16 grid gap-x-8 gap-y-20 lg:mt-24 lg:grid-cols-12 lg:gap-y-28">
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
              <p className="eyebrow">Your design journey starts here</p>
              <h2
                id="choose-home-heading"
                className="mt-7 max-w-5xl text-[clamp(3.4rem,7vw,7.5rem)] font-medium leading-[0.86] tracking-[-0.072em]"
              >
                Choose the home.
                <br />
                <span className="text-white/38">Then make it yours.</span>
              </h2>
            </div>
            <div className="border-l border-white/15 pl-6 sm:pl-8">
              <p className="text-base leading-8 text-white/54">
                Your home determines the curated design directions and
                inclusion choices available to you.
              </p>
              <Link
                href="/#models"
                className="group mt-8 inline-flex min-h-12 items-center gap-8 border border-white bg-white px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0b0c10] transition-colors hover:bg-transparent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Choose your home
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
