import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { HeadlineReveal } from "@/components/headline-reveal";
import { ScrollReveal } from "@/components/scroll-reveal";

type JourneyStep = {
  number: string;
  title: string;
  lead: string;
  description: string;
  note?: string;
  visual: {
    src: string;
    alt: string;
    caption: string;
    fit?: "cover" | "contain";
  };
};

const steps: readonly JourneyStep[] = [
  {
    number: "01",
    title: "Site",
    lead: "Start with what you know.",
    description:
      "Share the property, community site or development parcel and any plans, surveys or project information already available.",
    note: "You do not need new technical studies just to begin.",
    visual: {
      src: "/images/journey/01-your-land.png",
      alt: "Residential property shown in its neighbourhood context",
      caption: "Property / Site information",
    },
  },
  {
    number: "02",
    title: "Choose Homes",
    lead: "Build the housing mix.",
    description:
      "Choose one home or combine multiple House Delivery models, quantities and phases into a project plan.",
    visual: {
      src: "/images/journey/02-choose-your-home.jpg",
      alt: "Contemporary House Delivery home",
      caption: "Home models / Quantities / Phasing",
    },
  },
  {
    number: "03",
    title: "Design Homes",
    lead: "Set the design direction.",
    description:
      "Create the Look Book for each home type, selecting the key kitchens, bathrooms, flooring, wardrobes, doors and finishes that define the project.",
    visual: {
      src: "/images/journey/03-make-it-yours.png",
      alt: "House Delivery home design selections",
      caption: "Look Books / Coordinated selections",
      fit: "contain",
    },
  },
  {
    number: "04",
    title: "Review + Commit",
    lead: "Turn the plan into a real project.",
    description:
      "House Delivery reviews the site, housing mix, readiness and delivery approach. When the project is ready to proceed, commercial commitment and the next-stage authorization are completed.",
    note:
      "Funding, financing or deposit requirements are confirmed before project-specific technical work is released.",
    visual: {
      src: "/images/how-it-works/house-delivery-process.png",
      alt: "House Delivery project planning and coordination process",
      caption: "Project review / Commercial commitment",
    },
  },
  {
    number: "05",
    title: "Permits + Engineering",
    lead: "Adapt the home to the actual site.",
    description:
      "Qualified Canadian professionals complete the site-specific architecture, engineering and other work required by the project and jurisdiction.",
    note: "House Delivery home designs are not automatically permit-ready.",
    visual: {
      src: "/images/journey/06-permits-engineering-lgsf.jpg",
      alt: "Light-gauge steel residential structural framing",
      caption: "Site-specific design / Local approvals",
    },
  },
  {
    number: "06",
    title: "Site + Manufacturing",
    lead: "Two workstreams move together.",
    description:
      "Foundations, servicing and local site work can progress while the light-gauge steel structure and coordinated building package are prepared for the project.",
    note: "The exact sequence depends on approvals, site readiness and procurement requirements.",
    visual: {
      src: "/images/journey/07-site-manufacturing.png",
      alt: "Site preparation and manufacturing moving forward in parallel",
      caption: "Parallel site work / Manufacturing",
    },
  },
  {
    number: "07",
    title: "Delivery + Assembly",
    lead: "Deliver the system. Assemble locally.",
    description:
      "House Delivery coordinates production, logistics and the agreed supply package. Local construction teams assemble the homes on the prepared site.",
    note:
      "The general contractor remains responsible for local site execution, trades and construction management.",
    visual: {
      src: "/images/journey/09-home-takes-shape.png",
      alt: "House Delivery home taking shape during local assembly",
      caption: "Coordinated delivery / Local assembly",
    },
  },
  {
    number: "08",
    title: "Finish + Handover",
    lead: "Complete the home.",
    description:
      "Approved inclusions are installed, final inspections and commissioning are completed, and the project moves through handover to occupancy.",
    visual: {
      src: "/images/journey/11-welcome-home.jpeg",
      alt: "Completed contemporary home ready for occupancy",
      caption: "Finishing / Handover / Occupancy",
    },
  },
] as const;

function JourneyVisual({ step }: { step: JourneyStep }) {
  const contain = step.visual.fit === "contain";

  return (
    <figure>
      <div
        className={`relative aspect-[4/3] overflow-hidden border border-white/10 ${contain ? "bg-[#e7e3d8]" : "bg-[#121419]"}`}
      >
        <Image
          src={step.visual.src}
          alt={step.visual.alt}
          fill
          quality={95}
          sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) calc(100vw - 64px), (max-width: 1599px) 58vw, 880px"
          className={contain ? "object-contain p-3 sm:p-5" : "object-cover brightness-[0.92]"}
        />
        {!contain ? (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-black/5" />
        ) : null}
      </div>
      <figcaption className="mt-3 border-t border-white/10 pt-3 text-[9px] uppercase tracking-[0.18em] text-white/34">
        {step.visual.caption}
      </figcaption>
    </figure>
  );
}

export function HomeownerJourney() {
  return (
    <main data-homeowner-journey className="overflow-hidden bg-[#0b0c10] text-white">
      <section className="px-5 pb-20 pt-32 sm:px-8 sm:pt-36 lg:px-12 lg:pb-28 lg:pt-44">
        <div className="mx-auto max-w-[1504px]">
          <div className="grid gap-10 border-t border-white/15 pt-7 lg:grid-cols-12 lg:gap-x-8">
            <div className="lg:col-span-3">
              <p className="eyebrow">How House Delivery Works</p>
            </div>
            <div className="lg:col-span-9 lg:col-start-4">
              <HeadlineReveal trigger="mount">
                <h1 className="max-w-[1200px] text-[clamp(3.6rem,8vw,8.8rem)] font-medium uppercase leading-[0.82] tracking-[-0.075em] text-white/92">
                  From site to
                  <br />
                  <span className="text-white/38">finished home.</span>
                </h1>
              </HeadlineReveal>
              <div className="mt-12 grid gap-8 border-t border-white/10 pt-7 sm:grid-cols-[1fr_auto] sm:items-end lg:mt-16">
                <p className="max-w-2xl text-lg leading-8 text-white/68">
                  A coordinated path for one home or a multi-home project — from choosing the homes through design, approvals, manufacturing, assembly and occupancy.
                </p>
                <Link
                  href="/plan-a-housing-project"
                  className="group inline-flex min-h-14 items-center justify-between gap-8 bg-white px-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0b0c10]"
                >
                  Plan a Housing Project
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-1"
                    strokeWidth={1.5}
                  />
                </Link>
              </div>
            </div>
          </div>

          <figure className="mt-16 lg:mt-24">
            <div className="overflow-x-auto overscroll-x-contain bg-black [scrollbar-color:rgba(255,255,255,0.24)_transparent] [scrollbar-width:thin]">
              <div className="relative h-[320px] w-[960px] lg:h-auto lg:w-full lg:aspect-[3/1]">
                <Image
                  src="/images/how-it-works/house-delivery-process.png"
                  alt="House Delivery sequence from design and site preparation through manufacturing, assembly and a completed home"
                  fill
                  priority
                  quality={95}
                  sizes="(max-width: 1023px) 960px, (max-width: 1599px) calc(100vw - 96px), 1504px"
                  className="object-cover"
                />
              </div>
            </div>
            <figcaption className="mt-4 border-t border-white/10 pt-4 text-right text-[9px] uppercase tracking-[0.18em] text-white/30">
              Illustrative sequence / Project requirements vary
            </figcaption>
          </figure>

          <div className="mt-16 grid border-l border-t border-white/10 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
            {steps.map((step) => (
              <a
                key={step.number}
                href={`#step-${step.number}`}
                className="group flex min-h-24 flex-col justify-between border-b border-r border-white/10 p-5 transition-colors hover:bg-white/[0.035]"
              >
                <span className="font-mono text-[9px] tracking-[0.18em] text-white/28">
                  {step.number}
                </span>
                <span className="mt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/62 transition-colors group-hover:text-white">
                  {step.title}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <ol className="px-5 sm:px-8 lg:px-12">
        {steps.map((step, index) => (
          <li
            key={step.number}
            id={`step-${step.number}`}
            className="mx-auto max-w-[1504px] scroll-mt-24 border-t border-white/12 py-20 lg:py-28"
          >
            <ScrollReveal variant={index % 2 === 0 ? "slide" : "fade"}>
              <article className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-x-8">
                <div
                  className={
                    index % 2 === 0
                      ? "lg:col-span-4"
                      : "lg:col-span-4 lg:col-start-9"
                  }
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <p className="eyebrow">{step.title}</p>
                    <span className="font-mono text-[10px] tracking-[0.18em] text-white/28">
                      {step.number} / 08
                    </span>
                  </div>
                  <h2 className="mt-8 text-[clamp(2.7rem,5vw,5.2rem)] font-medium leading-[0.9] tracking-[-0.06em] text-white/90">
                    {step.lead}
                  </h2>
                  <p className="mt-7 text-base leading-8 text-white/52">
                    {step.description}
                  </p>
                  {step.number === "02" ? (
                    <Link
                      href="/#models"
                      className="group mt-8 inline-flex min-h-11 items-center gap-4 border-b border-white/30 pb-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-white/72 transition-colors hover:border-white hover:text-white"
                    >
                      Explore Homes
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 transition-transform group-hover:translate-x-1"
                        strokeWidth={1.5}
                      />
                    </Link>
                  ) : null}
                  {step.note ? (
                    <p className="mt-8 border-l border-white/18 pl-5 text-xs leading-6 text-white/38">
                      {step.note}
                    </p>
                  ) : null}
                </div>
                <div
                  className={
                    index % 2 === 0
                      ? "lg:col-span-7 lg:col-start-6"
                      : "lg:col-span-7 lg:col-start-1 lg:row-start-1"
                  }
                >
                  <JourneyVisual step={step} />
                </div>
              </article>
            </ScrollReveal>
          </li>
        ))}
      </ol>

      <section className="border-t border-white/12 bg-[#e7e3d8] px-5 py-24 text-[#0b0c10] sm:px-8 lg:px-12 lg:py-32">
        <div className="mx-auto max-w-[1504px]">
          <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/45">
                Ready to begin?
              </p>
              <h2 className="mt-7 max-w-5xl text-[clamp(3.4rem,7vw,7.8rem)] font-medium uppercase leading-[0.84] tracking-[-0.07em]">
                Plan your
                <br />
                <span className="text-black/36">housing project.</span>
              </h2>
            </div>
            <div className="flex min-w-72 flex-col gap-3">
              <Link
                href="/plan-a-housing-project"
                className="group flex min-h-14 items-center justify-between gap-10 bg-[#0b0c10] px-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-white"
              >
                Plan a Housing Project
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-1"
                  strokeWidth={1.5}
                />
              </Link>
              <Link
                href="/#models"
                className="group flex min-h-14 items-center justify-between gap-10 border border-black/28 px-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-black transition-colors hover:border-black"
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
        </div>
      </section>
    </main>
  );
}
