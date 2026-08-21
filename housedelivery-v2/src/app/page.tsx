import { CarriageHomeShowcase } from "@/components/carriage-home-showcase";
import { DeliveryTimeline } from "@/components/delivery-timeline";
import { FinancialCorridors } from "@/components/financial-corridors";
import { LangleyWalkthroughFeature } from "@/components/homepage-video-experiences";
import {
  FinishesSection,
  ModernMethodsSection,
} from "@/components/inclusion-grid";
import { LuxuryHero } from "@/components/luxury-hero";
import { ModelShowcase } from "@/components/model-showcase";
import { PortfolioCategoryNav } from "@/components/portfolio-category-nav";
import { PreApprovedShowcase } from "@/components/pre-approved-showcase";
import { ReservationForm } from "@/components/reservation-form";
import { SiteHeader } from "@/components/site-header";
import { FundingValueSection } from "@/components/why-house-delivery-section";
import { models } from "@/data/models";

export default function Home() {
  const langley = models.find((model) => model.slug === "langley");

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
        <PreApprovedShowcase />
        {langley?.video ? (
          <LangleyWalkthroughFeature
            embedUrl={langley.video.embedUrl}
            posterSrc={langley.heroImage}
          />
        ) : null}
        <FundingValueSection />
        <ModernMethodsSection />
        <FinishesSection />
        <DeliveryTimeline
          eyebrow="Coordination before construction"
          headlinePrimary="Resolve more before"
          headlineSecondary="the site is waiting."
          introCopy="House Delivery coordinates design, procurement, factory production, site preparation, logistics and local assembly so key workstreams can move in parallel—not one after another."
        />
        <FinancialCorridors />
        <ReservationForm models={models} />
      </main>
    </>
  );
}
