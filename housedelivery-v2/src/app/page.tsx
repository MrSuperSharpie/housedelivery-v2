import { CarriageHomeShowcase } from "@/components/carriage-home-showcase";
import { DeliveryTimeline } from "@/components/delivery-timeline";
import { FinancialCorridors } from "@/components/financial-corridors";
import { InclusionGrid } from "@/components/inclusion-grid";
import { LuxuryHero } from "@/components/luxury-hero";
import { ModelShowcase } from "@/components/model-showcase";
import { PortfolioCategoryNav } from "@/components/portfolio-category-nav";
import { PreApprovedShowcase } from "@/components/pre-approved-showcase";
import { ProjectUnderstandingSection } from "@/components/project-understanding-section";
import { ReservationForm } from "@/components/reservation-form";
import { SiteHeader } from "@/components/site-header";
import { WhyHouseDeliverySection } from "@/components/why-house-delivery-section";
import { models } from "@/data/models";

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
        <CarriageHomeShowcase />
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
        <InclusionGrid
          eyebrow="The coordinated kit of parts"
          finishesVariant="compact"
          introCopy="House Delivery organizes the structure, building components, interior elements, documentation, and delivery pathway as one connected system. Fewer disconnected decisions on site. Greater clarity before construction begins."
          headlinePrimary="One coordinated home."
          headlineSecondary="Thousands of decisions already resolved."
          scopeNote="Local foundations, engineering, permitting, installation, weatherproofing, site supervision, and qualified local construction remain essential to the completed home."
        />
        <WhyHouseDeliverySection image={models[1].images[2]} />
        <FinancialCorridors />
        <DeliveryTimeline
          eyebrow="Coordination before construction"
          headlinePrimary="Resolve more before"
          headlineSecondary="the site is waiting."
          introCopy="House Delivery moves design, procurement, factory production, site preparation, logistics, and local crew coordination upstream, with several workstreams advancing at the same time. Factory production and site preparation happen at the same time—not one after the other."
        />

        <ProjectUnderstandingSection />
        <ReservationForm models={models} />
      </main>
    </>
  );
}
