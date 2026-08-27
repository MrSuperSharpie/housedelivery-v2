import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { HeadlineReveal } from "@/components/headline-reveal";
import { JourneyAudienceSelector } from "@/components/journey-audience-selector";
import { JourneyStageNavigator } from "@/components/journey-stage-navigator";
import { ScrollReveal } from "@/components/scroll-reveal";
import { getHomeConfiguratorRegistrationsByFamily } from "@/data/home-configurators";

type JourneyVisual = {
  src: string;
  alt: string;
  caption: string;
  fit?: "cover" | "contain";
  position?: string;
};

type JourneyStage = {
  number: string;
  id: string;
  title: string;
  lead: string;
  description: string;
  note?: string;
  bullets?: readonly string[];
  bulletsLabel?: string;
  visual: JourneyVisual;
};

const stages: readonly JourneyStage[] = [
  {
    number: "01",
    id: "your-land",
    title: "Your Site",
    lead: "Start with the site.",
    description:
      "Begin with one residential property, a development parcel or a larger community site. Share the address, available plans, surveys, site information or development objectives you already have.",
    note:
      "You do not need to commission new technical work simply to begin the conversation.",
    visual: {
      src: "/images/journey/01-your-land.png",
      alt: "Vancouver residential property highlighted within its neighbourhood context",
      caption: "Property first / Technical work later",
    },
  },
  {
    number: "02",
    id: "your-home",
    title: "Housing Plan",
    lead: "Choose the homes and housing mix.",
    description:
      "Select one House Delivery home or begin assembling a broader housing programme using multiple models, unit types and project phases.",
    note:
      "Building at scale? House Delivery can coordinate multiple home types within one controlled project programme.",
    visual: {
      src: "/images/journey/02-choose-your-home.jpg",
      alt: "Contemporary House Delivery home",
      caption: "Architecture / Scale / Layout",
    },
  },
  {
    number: "03",
    id: "your-design",
    title: "Design + Inclusions",
    lead: "Create a coordinated design direction.",
    description:
      "Select kitchens, bathrooms, flooring, wardrobes, doors, windows and other approved inclusions. For larger projects, controlled design packages can be repeated across multiple homes while still allowing appropriate variation.",
    visual: {
      src: "/images/journey/03-make-it-yours.png",
      alt: "House Delivery Solace primary ensuite design selection",
      caption: "Visual Guide / Coordinated selections",
      fit: "contain",
    },
  },
  {
    number: "04",
    id: "site-feasibility",
    title: "Project Feasibility",
    lead: "Can this housing plan work on this site?",
    description:
      "House Delivery completes an early project review considering the available site information, intended housing mix and obvious development constraints.",
    bulletsLabel: "Review may consider:",
    bullets: [
      "Preliminary site fit",
      "Zoning and density",
      "Setbacks",
      "Access",
      "Servicing",
      "Parking",
      "Phasing",
      "Obvious site constraints",
    ],
    note:
      "This is an early feasibility review, not a permit approval or professional site-specific design.",
    visual: {
      src: "/images/journey/04-site-feasibility.jpg",
      alt: "House floor plan used for preliminary site feasibility review",
      caption: "Model fit / Early review only",
      fit: "contain",
    },
  },
  {
    number: "05",
    id: "project-commitment",
    title: "Project Commitment",
    lead: "Move from opportunity to real project.",
    description:
      "Once the opportunity appears credible and the parties want to proceed, the project moves into formal commercial commitment.",
    note:
      "Project-specific technical work begins only when the opportunity has sufficient commitment, funding, financing or deposit to justify it.",
    visual: {
      src: "/images/how-it-works/house-delivery-process.png",
      alt: "Homeowners reviewing a coordinated House Delivery home design",
      caption: "Qualified opportunity / Commercial commitment",
      position: "8% center",
    },
  },
  {
    number: "06",
    id: "permits-engineering",
    title: "Permits + Engineering",
    lead: "Design for the actual site.",
    description:
      "Qualified Canadian professionals adapt the selected housing plan to the specific property, jurisdiction and project conditions.",
    bulletsLabel: "Work may include, where required:",
    bullets: [
      "Survey",
      "Architecture",
      "Structural engineering",
      "Mechanical and electrical",
      "Civil",
      "Geotechnical",
      "Energy modelling",
      "Other jurisdiction-specific professional work",
    ],
    note:
      "Existing House Delivery designs are not automatically permit-ready.",
    visual: {
      src: "/images/journey/06-permits-engineering-lgsf.jpg",
      alt: "Light-gauge steel residential structural framing",
      caption: "Project-specific adaptation / Local requirements",
    },
  },
  {
    number: "08",
    id: "delivery",
    title: "Coordinated Delivery",
    lead: "Everything arrives as a coordinated project package.",
    description:
      "House Delivery coordinates supplier production, consolidation, logistics, Canadian receiving and project sequencing around the requirements of the project.",
    bullets: [
      "Supplier production",
      "Consolidation and shipping",
      "Import logistics",
      "Canadian receiving",
      "Project sequencing",
    ],
    note:
      "For larger projects, delivery can be organized around phases rather than treating the entire development as a single event.",
    visual: {
      src: "/images/journey/08-coordinated-project-package.webp",
      alt: "Engineered House Delivery structural components prepared as a coordinated project package",
      caption: "Project logistics / Coordinated sequence",
    },
  },
  {
    number: "09",
    id: "assembly",
    title: "Assembly",
    lead: "The homes take shape.",
    description:
      "Local construction teams assemble the light-gauge steel structural system and coordinated components on the prepared site.",
    note:
      "General contractors retain control of local site execution, trades and construction management while House Delivery coordinates the agreed supply package.",
    visual: {
      src: "/images/journey/09-home-takes-shape.png",
      alt: "House Delivery home taking shape during assembly",
      caption: "Light-gauge steel / Local assembly",
    },
  },
  {
    number: "10",
    id: "finishing",
    title: "Finishing + Installation",
    lead: "The design becomes real.",
    description:
      "Approved cabinetry, bathrooms, flooring, doors, wardrobes, fixtures and other coordinated inclusions are installed and integrated into the homes.",
    bullets: [
      "Cabinetry and wardrobes",
      "Bathrooms and fixtures",
      "Flooring and doors",
      "Finishes and approved inclusions",
    ],
    note:
      "For multi-home projects, controlled inclusion packages support repeatability while allowing approved project-specific variation.",
    visual: {
      src: "/images/inclusions/coordinated-architectural-system.png",
      alt: "Completed contemporary interior with coordinated cabinetry, surfaces, lighting and finishes",
      caption: "Selected inclusions / Finished home",
    },
  },
  {
    number: "11",
    id: "occupancy",
    title: "Handover + Occupancy",
    lead: "From completed home to completed community.",
    description:
      "Required inspections, commissioning, deficiency correction, documentation and jurisdictional approvals lead to occupancy and project handover.",
    note:
      "For larger developments, this process can occur progressively as phases or groups of homes are completed.",
    visual: {
      src: "/images/journey/11-welcome-home.jpeg",
      alt: "Completed contemporary home ready for occupancy",
      caption: "Handover / After-sales pathway",
    },
  },
] as const;

const commercialPath = [
  "Commercial readiness",
  "Qualified opportunity",
  "Project commitment",
  "Funding / financing / deposit",
  "Project-specific technical work",
  "Final quotation",
  "Procurement + delivery",
] as const;

const sitePreparation = [
  "Excavation",
  "Foundations",
  "Servicing",
  "Drainage",
  "Utilities",
  "Local site works",
] as const;

const manufacturing = [
  "Light-gauge steel structural components",
  "Windows and doors",
  "Cabinetry",
  "Wardrobes",
  "Bathroom systems",
  "Flooring",
  "Selected inclusions",
  "Coordinated packaging and quality control",
] as const;

function SupportingList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-7 grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex gap-3 text-xs leading-5 text-white/48"
        >
          <span
            aria-hidden="true"
            className="mt-2.5 h-px w-3 shrink-0 bg-white/28"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function StageVisual({ visual }: { visual: JourneyVisual }) {
  const contain = visual.fit === "contain";

  return (
    <figure>
      <div
        className={`relative aspect-[4/3] overflow-hidden border border-white/10 ${contain ? "bg-[#e7e3d8]" : "bg-[#121419]"}`}
      >
        <Image
          src={visual.src}
          alt={visual.alt}
          fill
          quality={95}
          sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) calc(100vw - 64px), (max-width: 1599px) 58vw, 880px"
          className={
            contain
              ? "object-contain p-3 sm:p-5"
              : "object-cover brightness-[0.92]"
          }
          style={visual.position ? { objectPosition: visual.position } : undefined}
        />
        {!contain ? (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-black/5" />
        ) : null}
      </div>
      <figcaption className="mt-3 flex items-center justify-between gap-5 border-t border-white/10 pt-3 text-[9px] uppercase tracking-[0.18em] text-white/34">
        <span>{visual.caption}</span>
        <span aria-hidden="true">House Delivery</span>
      </figcaption>
    </figure>
  );
}

export function HomeownerJourney() {
  const designReadyHomes = getHomeConfiguratorRegistrationsByFamily(
    "custom-home",
  ).filter(
    (registration) =>
      registration.migrationStatus === "canonical" && registration.definition,
  );

  return (
    <main
      data-homeowner-journey
      className="overflow-hidden bg-[#0b0c10] text-white"
    >
      <section className="px-5 pb-20 pt-32 sm:px-8 sm:pt-36 lg:px-12 lg:pb-28 lg:pt-44">
        <div className="mx-auto max-w-[1504px]">
          <div className="grid gap-10 border-t border-white/15 pt-7 lg:grid-cols-12 lg:gap-x-8">
            <div className="lg:col-span-3">
              <p className="eyebrow">How House Delivery Works</p>
            </div>
            <div className="lg:col-span-9 lg:col-start-4">
              <HeadlineReveal trigger="mount">
                <h1 className="max-w-[1200px] text-[clamp(3.6rem,8vw,8.8rem)] font-medium uppercase leading-[0.82] tracking-[-0.075em] text-white/92">
                  One delivery system.
                  <br />
                  <span className="text-white/38">
                    From one home to an entire community.
                  </span>
                </h1>
              </HeadlineReveal>
              <div className="mt-12 grid gap-8 border-t border-white/10 pt-7 sm:grid-cols-2 lg:mt-16">
                <p className="max-w-lg text-lg leading-8 text-white/68">
                  House Delivery coordinates the path from site and housing
                  plan through design, procurement, delivery, assembly and
                  occupancy.
                </p>
                <p className="max-w-lg text-sm leading-7 text-white/42 sm:justify-self-end">
                  Built for First Nations, housing organizations, developers,
                  general contractors and individual landowners.
                </p>
              </div>
            </div>
          </div>

          <JourneyAudienceSelector />

          <figure className="mt-16 lg:mt-24">
            <div className="overflow-x-auto overscroll-x-contain bg-black [scrollbar-color:rgba(255,255,255,0.24)_transparent] [scrollbar-width:thin]">
              <div className="relative h-[320px] w-[960px] lg:h-auto lg:w-full lg:aspect-[3/1]">
                <Image
                  src="/images/how-it-works/house-delivery-process.png"
                  alt="House Delivery sequence from home design and site preparation through manufacturing, light-gauge steel assembly and a completed home"
                  fill
                  priority
                  quality={95}
                  sizes="(max-width: 1023px) 960px, (max-width: 1599px) calc(100vw - 96px), 1504px"
                  className="object-cover"
                />
              </div>
            </div>
            <figcaption className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 text-[9px] uppercase tracking-[0.18em] text-white/30 sm:flex-row sm:items-center sm:justify-between">
              <span className="lg:hidden">Swipe to explore the sequence</span>
              <span className="sm:ml-auto">
                Illustrative sequence / Project requirements vary
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      <JourneyStageNavigator />

      <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-36">
        <div className="mx-auto max-w-[1504px]">
          <div className="grid gap-8 border-t border-white/12 pt-7 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
            <p className="eyebrow">How a viable opportunity advances</p>
            <ol className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
              {commercialPath.map((step, index) => (
                <li
                  key={step}
                  className="flex min-h-24 gap-4 border-b border-white/10 py-5 pr-5"
                >
                  <span className="font-mono text-[9px] text-white/24">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xs uppercase leading-5 tracking-[0.12em] text-white/48">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <ol className="px-5 sm:px-8 lg:px-12">
        {stages.slice(0, 6).map((stage, index) => (
          <li
            key={stage.number}
            id={stage.id}
            className="mx-auto max-w-[1504px] scroll-mt-24 border-t border-white/12 py-20 lg:py-32"
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
                    <p className="eyebrow">{stage.title}</p>
                    <span className="font-mono text-[10px] tracking-[0.18em] text-white/28">
                      {stage.number} / 11
                    </span>
                  </div>
                  <h2 className="mt-8 text-[clamp(2.7rem,5vw,5.4rem)] font-medium leading-[0.9] tracking-[-0.06em] text-white/90">
                    {stage.lead}
                  </h2>
                  <p className="mt-7 text-base leading-8 text-white/52">
                    {stage.description}
                  </p>
                  {stage.bulletsLabel ? (
                    <p className="mt-7 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/34">
                      {stage.bulletsLabel}
                    </p>
                  ) : null}
                  {stage.bullets ? (
                    <SupportingList items={stage.bullets} />
                  ) : null}
                  {stage.number === "02" ? (
                    <Link
                      href="/#models"
                      className="group mt-8 inline-flex min-h-11 items-center gap-4 border-b border-white/30 pb-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-white/72 transition-colors hover:border-white hover:text-white"
                    >
                      Explore our homes
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 transition-transform group-hover:translate-x-1"
                        strokeWidth={1.5}
                      />
                    </Link>
                  ) : null}
                  {stage.number === "03" ? (
                    <div className="mt-8 border-t border-white/10 pt-5">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/32">
                        Open an active Design Center
                      </p>
                      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                        {designReadyHomes.map((home) => (
                          <Link
                            key={home.homeId}
                            href={`${home.route}#home-inclusions`}
                            className="border-b border-white/20 pb-1 text-[10px] uppercase tracking-[0.14em] text-white/58 transition-colors hover:border-white hover:text-white"
                          >
                            {home.homeName}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {stage.note ? (
                    <p className="mt-8 border-l border-white/18 pl-5 text-xs leading-6 text-white/38">
                      {stage.note}
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
                  <StageVisual visual={stage.visual} />
                </div>
              </article>
            </ScrollReveal>
          </li>
        ))}

        <li
          id="site-manufacturing"
          className="mx-auto max-w-[1504px] scroll-mt-24 border-t border-white/12 py-20 lg:py-32"
        >
          <ScrollReveal variant="scale">
            <article>
              <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-8">
                <div className="lg:col-span-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <p className="eyebrow">Site + Manufacturing</p>
                    <span className="font-mono text-[10px] tracking-[0.18em] text-white/28">
                      07 / 11
                    </span>
                  </div>
                  <h2 className="mt-8 text-[clamp(3rem,6vw,6.4rem)] font-medium leading-[0.88] tracking-[-0.065em] text-white/90">
                    Two workstreams move forward together.
                  </h2>
                </div>
                <div className="max-w-xl lg:col-span-5 lg:col-start-8 lg:self-end">
                  <p className="text-base leading-8 text-white/52">
                    While site work progresses locally, the coordinated House
                    Delivery package can be prepared in parallel.
                  </p>
                  <p className="mt-5 text-xs leading-6 text-white/34">
                    The actual sequence is established after site, approval and
                    procurement requirements are understood.
                  </p>
                </div>
              </div>

              <div className="mt-14 grid gap-5 md:grid-cols-2 lg:mt-20">
                <figure>
                  <div className="relative aspect-[4/3] overflow-hidden border border-white/10 bg-[#121419]">
                    <Image
                      src="/images/journey/07-site-preparation.png"
                      alt="Residential site preparation with foundation work in a Canadian neighbourhood"
                      fill
                      quality={95}
                      sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1599px) 50vw, 742px"
                      className="object-cover brightness-[0.92]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/5 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/48">
                        Local workstream
                      </p>
                      <h3 className="mt-3 text-3xl font-medium tracking-[-0.05em]">
                        Site preparation
                      </h3>
                    </div>
                  </div>
                  <SupportingList items={sitePreparation} />
                </figure>
                <figure>
                  <div className="relative aspect-[4/3] overflow-hidden border border-white/10 bg-[#121419]">
                    <Image
                      src="/images/homepage/capabilities/manufacturing-refined.jpg"
                      alt="Computer-controlled equipment coordinating components in a manufacturing facility"
                      fill
                      quality={95}
                      sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1599px) 50vw, 742px"
                      className="object-cover brightness-[0.88]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/5 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/48">
                        Coordinated workstream
                      </p>
                      <h3 className="mt-3 text-3xl font-medium tracking-[-0.05em]">
                        Manufacturing
                      </h3>
                    </div>
                  </div>
                  <SupportingList items={manufacturing} />
                </figure>
              </div>
            </article>
          </ScrollReveal>
        </li>

        {stages.slice(6).map((stage, index) => (
          <li
            key={stage.number}
            id={stage.id}
            className="mx-auto max-w-[1504px] scroll-mt-24 border-t border-white/12 py-20 lg:py-32"
          >
            <ScrollReveal variant={index % 2 === 0 ? "fade" : "slide"}>
              <article className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-x-8">
                <div
                  className={
                    index % 2 === 0
                      ? "lg:col-span-4 lg:col-start-9"
                      : "lg:col-span-4"
                  }
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <p className="eyebrow">{stage.title}</p>
                    <span className="font-mono text-[10px] tracking-[0.18em] text-white/28">
                      {stage.number} / 11
                    </span>
                  </div>
                  <h2 className="mt-8 text-[clamp(2.7rem,5vw,5.4rem)] font-medium leading-[0.9] tracking-[-0.06em] text-white/90">
                    {stage.lead}
                  </h2>
                  <p className="mt-7 text-base leading-8 text-white/52">
                    {stage.description}
                  </p>
                  {stage.bullets ? <SupportingList items={stage.bullets} /> : null}
                  {stage.note ? (
                    <p className="mt-8 border-l border-white/18 pl-5 text-xs leading-6 text-white/38">
                      {stage.note}
                    </p>
                  ) : null}
                </div>
                <div
                  className={
                    index % 2 === 0
                      ? "lg:col-span-7 lg:col-start-1 lg:row-start-1"
                      : "lg:col-span-7 lg:col-start-6"
                  }
                >
                  <StageVisual visual={stage.visual} />
                </div>
              </article>
            </ScrollReveal>
          </li>
        ))}
      </ol>

      <section className="border-t border-white/12 bg-[#e7e3d8] px-5 py-24 text-[#0b0c10] sm:px-8 lg:px-12 lg:py-36">
        <div className="mx-auto max-w-[1504px]">
          <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2 className="max-w-5xl text-[clamp(3.4rem,7vw,7.8rem)] font-medium uppercase leading-[0.84] tracking-[-0.07em]">
                What are you
                <br />
                <span className="text-black/36">planning?</span>
              </h2>
            </div>
            <div className="flex min-w-72 flex-col gap-3">
              <Link
                href="/plan-a-housing-project"
                className="group flex min-h-14 items-center justify-between gap-10 bg-[#0b0c10] px-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-white"
              >
                Plan a housing project
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
                Explore our homes
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-1"
                  strokeWidth={1.5}
                />
              </Link>
            </div>
          </div>
          <div className="mt-12 grid border-t border-black/14 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "First Nations + Housing",
                href: "/first-nations-project-planner",
              },
              {
                label: "Developers",
                href: "/project-portfolio-planner?audience=developer",
              },
              {
                label: "General Contractors",
                href: "/project-portfolio-planner?audience=general-contractor",
              },
              { label: "Individual Homeowners", href: "/#models" },
            ].map((pathway) => (
              <Link
                key={pathway.label}
                href={pathway.href}
                className="group flex min-h-14 items-center justify-between gap-5 border-b border-black/14 py-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-black/48 transition-colors hover:text-black sm:px-5 sm:first:pl-0 lg:border-r lg:last:border-r-0"
              >
                {pathway.label}
                <ArrowRight
                  aria-hidden="true"
                  className="size-3.5 shrink-0 transition-transform group-hover:translate-x-1"
                  strokeWidth={1.5}
                />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
