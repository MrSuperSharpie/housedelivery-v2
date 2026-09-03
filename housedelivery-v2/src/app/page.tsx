import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { CarriageHomeShowcase } from "@/components/carriage-home-showcase";
import { FinancialCorridors } from "@/components/financial-corridors";
import { LangleyWalkthroughFeature } from "@/components/homepage-video-experiences";
import { ModernMethodsSection } from "@/components/inclusion-grid";
import { LuxuryHero } from "@/components/luxury-hero";
import { ModelShowcase } from "@/components/model-showcase";
import { PortfolioCategoryNav } from "@/components/portfolio-category-nav";
import { PreApprovedShowcase } from "@/components/pre-approved-showcase";
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
          productStatement="Architectural homes delivered as coordinated building systems."
          supportingCopy="Choose a proven home, shape the design, and move through one coordinated path from engineering and manufacturing to local assembly."
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
          introCopy="Start with a proven architectural home, then adapt it to your land, local requirements and design direction."
          valueCopy="Choose the home first. Then design the details around the project."
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
        <FinancialCorridors />

        <section className="bg-[#e8e6df] px-5 py-24 text-[#0b0c10] sm:px-8 lg:px-12 lg:py-32">
          <div className="mx-auto grid max-w-[1504px] gap-10 border-t border-black/15 pt-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-24">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/48">
                Start your project
              </p>
              <h2 className="mt-7 max-w-5xl text-[clamp(3.2rem,6.5vw,7rem)] font-medium leading-[0.84] tracking-[-0.072em]">
                Bring us the housing need.
                <br />
                <span className="text-black/38">We&apos;ll build the path.</span>
              </h2>
            </div>

            <div className="border-l border-black/15 pl-6 sm:pl-8">
              <p className="max-w-xl text-base leading-8 text-black/58">
                Tell us who you are planning for, how many homes you need, and
                what you know about the site today. The Project Planner will
                organize the next steps from there.
              </p>
              <Link
                href="/plan-a-housing-project"
                className="group mt-8 inline-flex min-h-12 items-center gap-8 bg-[#0b0c10] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#20232a]"
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
        </section>
      </main>
    </>
  );
}
