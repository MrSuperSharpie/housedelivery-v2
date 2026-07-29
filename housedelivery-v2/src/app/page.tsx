import {
  BadgeCheck,
  CircleDollarSign,
  FileStack,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";

import { CmhcFeature } from "@/components/cmhc-feature";
import { DeliveryTimeline } from "@/components/delivery-timeline";
import { FinancialCorridors } from "@/components/financial-corridors";
import { HeadlineReveal } from "@/components/headline-reveal";
import { InclusionGrid } from "@/components/inclusion-grid";
import { LuxuryHero } from "@/components/luxury-hero";
import { ModelShowcase } from "@/components/model-showcase";
import { PortfolioCategoryNav } from "@/components/portfolio-category-nav";
import { PreApprovedShowcase } from "@/components/pre-approved-showcase";
import { ProjectUnderstandingSection } from "@/components/project-understanding-section";
import { ReservationForm } from "@/components/reservation-form";
import { SiteHeader } from "@/components/site-header";
import { SteelFrameAdvantage } from "@/components/steel-frame-advantage";
import { TrustBanner } from "@/components/trust-banner";
import { ValuePositioningSection } from "@/components/value-positioning-section";
import { models } from "@/data/models";

const certaintyPoints = [
  {
    number: "01",
    title: "Cost clarity",
    description:
      "A defined component package and a more coordinated procurement path give owners a clearer view of where the project budget is going.",
    icon: CircleDollarSign,
  },
  {
    number: "02",
    title: "Permit coordination",
    description:
      "Design, engineering, documentation, and site-specific submissions are organized as one connected process.",
    icon: FileStack,
  },
  {
    number: "03",
    title: "Financing pathways",
    description:
      "A clearer scope, documented component package, and defined project pathway can support more productive conversations with lenders, funders, and partners.",
    icon: BadgeCheck,
  },
  {
    number: "04",
    title: "Documented quality",
    description:
      "Numbered components, coordinated specifications, technical documentation, and traceable selections create quality that can be reviewed, understood, and maintained.",
    icon: ShieldCheck,
  },
] as const;

const steelAdvantageCopy = {
  "01":
    "Precision-formed, numbered components are prepared for coordinated assembly, helping shorten exposed on-site schedules and reduce avoidable waiting.",
  "02":
    "Controlled specifications and precise material use are designed to reduce waste, fragmented purchasing, and site-driven cost uncertainty.",
  "03":
    "Galvanized light-steel framing is engineered for project-specific snow, wind, and seismic loads—and designed for durable dimensional stability.",
  "04":
    "Recyclable steel and precise material planning can support a quieter site and a lighter construction footprint.",
  "05":
    "Longer structural spans support open rooms and flexible planning, helping every square foot work harder.",
} as const;

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <LuxuryHero
          image={models[0].heroImage}
          productStatement="Pre-approved and custom homes, delivered as coordinated building systems for communities, developers, and families."
          supportingCopy="Exceptional design. A smarter path to ownership. A coordinated home system built to reduce delay, waste, and uncertainty—so more of your investment can remain in the home itself."
        />
        <section
          aria-label="Housing categories"
          className="bg-[#0B0C10] px-5 sm:px-8 lg:px-12"
        >
          <div className="mx-auto max-w-[1504px]">
            <PortfolioCategoryNav />
          </div>
        </section>
        <ModelShowcase
          models={models}
          introCopy="Each residence begins as a coordinated architectural system and is adapted to your land, local requirements, climate, priorities, and chosen level of finish."
          valueCopy="Begin with a proven design. Shape it around the life, land, and budget it needs to serve."
        />
        <PreApprovedShowcase
          catalogueFollowOn={
            <div className="grid grid-cols-12 gap-y-8 lg:gap-x-8">
              <p className="eyebrow col-span-12 lg:col-span-3">
                More ways to begin
              </p>
              <div className="col-span-12 lg:col-span-9 lg:col-start-4">
                <h3 className="max-w-5xl text-[clamp(3rem,5.7vw,6.4rem)] font-medium leading-[0.88] tracking-[-0.065em] text-white/92">
                  Not seeing your home?
                </h3>
                <div className="mt-8 grid gap-6 border-t border-white/10 pt-7 md:grid-cols-2 md:gap-10">
                  <p className="max-w-xl text-base leading-7 text-white/66">
                    This collection is only the beginning. We have hundreds of
                    additional designs available—and your own plans are
                    welcome.
                  </p>
                  <p className="max-w-xl text-sm leading-7 text-white/46">
                    Already have architectural drawings? Share them with us.
                    We’ll assess how your design can be translated into the
                    House Delivery kit-of-parts system and prepare a
                    project-specific budget range and indicative delivery
                    timeline.
                  </p>
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href="#reserve"
                    className="inline-flex min-h-11 items-center border border-white bg-white px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-black transition-colors hover:bg-transparent hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    Explore more designs
                  </a>
                  <a
                    href="#reserve"
                    className="inline-flex min-h-11 items-center border border-white/28 px-5 py-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/76 transition-colors hover:border-white hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    Show us your plans
                  </a>
                </div>
              </div>
            </div>
          }
        />
        <TrustBanner />
        <ValuePositioningSection />
        <CmhcFeature
          headlinePrimary="A proven starting point."
          headlineSecondary="A clearer route forward."
          supportingCopy="Canada’s Housing Design Catalogue can reduce early-stage repetition and give project teams a stronger starting point. House Delivery then coordinates the site-specific work—land, zoning, utilities, foundations, engineering, permits, and local construction requirements."
        />
        <FinancialCorridors />
        <InclusionGrid
          eyebrow="The coordinated kit of parts"
          finishesVariant="compact"
          introCopy="House Delivery organizes the structure, building components, interior elements, documentation, and delivery pathway as one connected system. Fewer disconnected decisions on site. Greater clarity before construction begins."
          headlinePrimary="One coordinated home."
          headlineSecondary="Thousands of decisions already resolved."
          scopeNote="Local foundations, engineering, permitting, installation, weatherproofing, site supervision, and qualified local construction remain essential to the completed home."
        />
        <SteelFrameAdvantage
          supportingCopy="Precision reduces waste. Coordination protects value. Quality is the part you keep."
          advantageCopy={steelAdvantageCopy}
        />
        <DeliveryTimeline
          eyebrow="Coordination before construction"
          headlinePrimary="Resolve more before"
          headlineSecondary="the site is waiting."
          introCopy="House Delivery moves design, procurement, factory production, site preparation, logistics, and local crew coordination upstream, with several workstreams advancing at the same time. Factory production and site preparation happen at the same time—not one after the other."
        />

        <section
          id="certainty"
          className="scroll-mt-20 bg-[#0b0c10] px-5 py-32 sm:px-8 lg:px-12 lg:py-44"
        >
          <div className="mx-auto max-w-[1504px]">
            <div className="grid grid-cols-12 gap-y-12 border-t border-white/10 pt-7 lg:gap-x-8">
              <p className="eyebrow col-span-12 lg:col-span-3">
                Why House Delivery Inc.
              </p>
              <HeadlineReveal
                variant="sweep"
                trigger="mount"
                className="col-span-12 lg:col-span-9 lg:col-start-4"
              >
                <h2 className="max-w-[1250px] text-[clamp(3.5rem,8vw,8.8rem)] font-medium leading-[0.82] tracking-[-0.075em] text-white/90">
                  A remarkable home.
                  <br />
                  <span className="text-white/38">
                    A more reachable price.
                  </span>
                </h2>
              </HeadlineReveal>
              <p className="col-span-10 col-start-3 max-w-xl border-l border-white/10 pl-6 text-lg leading-8 text-white/70 sm:col-span-7 sm:col-start-6 lg:col-span-4 lg:col-start-9">
                Less waste. Less delay. Fewer disconnected decisions. More of
                the project investment directed toward the home itself.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-12 gap-y-16 lg:mt-24 lg:gap-x-8">
              <div className="relative col-span-12 min-h-[560px] overflow-hidden bg-[#13151a] lg:col-span-7 lg:min-h-[820px]">
                <Image
                  src={models[1].images[2]}
                  alt="Refined interior of a House Delivery Inc. residence"
                  fill
                  quality={100}
                  unoptimized={true}
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  className="object-cover render-crisp"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
                  <p className="max-w-lg text-2xl font-medium leading-tight tracking-[-0.035em] sm:text-4xl">
                    Built with precision.
                    <br />
                    Priced with purpose.
                  </p>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-4 lg:col-start-9 lg:self-end lg:pb-4">
                <div>
                  {certaintyPoints.map((point) => {
                    const Icon = point.icon;
                    return (
                      <article
                        key={point.number}
                        className="grid grid-cols-[48px_1fr] gap-4 border-t border-white/10 py-8 sm:grid-cols-[60px_1fr_auto] sm:items-start sm:gap-6"
                      >
                        <span className="pt-1 text-[9px] tracking-[0.2em] text-white/30">
                          {point.number}
                        </span>
                        <div>
                          <h3 className="text-xl font-medium tracking-[-0.035em]">
                            {point.title}
                          </h3>
                          <p className="mt-3 max-w-lg text-sm leading-6 text-white/55">
                            {point.description}
                          </p>
                        </div>
                        <Icon
                          size={20}
                          strokeWidth={1.4}
                          className="hidden text-white/35 sm:block"
                        />
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <ProjectUnderstandingSection />
        <ReservationForm models={models} />
      </main>
    </>
  );
}
