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
import { FounderMission } from "@/components/founder-mission";
import { InclusionGrid } from "@/components/inclusion-grid";
import { LuxuryHero } from "@/components/luxury-hero";
import { ModelShowcase } from "@/components/model-showcase";
import { ReservationForm } from "@/components/reservation-form";
import { SiteHeader } from "@/components/site-header";
import { SteelFrameAdvantage } from "@/components/steel-frame-advantage";
import { TrustBanner } from "@/components/trust-banner";
import { WhyUs } from "@/components/why-us";
import { models } from "@/data/models";

const certaintyPoints = [
  {
    number: "01",
    title: "Cost clarity",
    description:
      "A defined component package. Fewer variables. A price you can plan a life around.",
    icon: CircleDollarSign,
  },
  {
    number: "02",
    title: "Permit coordination",
    description:
      "Engineering, documentation, and submissions—moving as one.",
    icon: FileStack,
  },
  {
    number: "03",
    title: "Financing pathways",
    description:
      "A clearer project record for clearer conversations with lenders.",
    icon: BadgeCheck,
  },
  {
    number: "04",
    title: "Documented quality",
    description:
      "Numbered parts. Certified drawings. Quality you can see—and keep.",
    icon: ShieldCheck,
  },
] as const;

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <LuxuryHero image={models[0].heroImage} />
        <TrustBanner />
        <ModelShowcase models={models} />
        <CmhcFeature />
        <WhyUs />
        <InclusionGrid />
        <SteelFrameAdvantage />
        <DeliveryTimeline />
        <FinancialCorridors />

        <section
          id="certainty"
          className="scroll-mt-20 bg-[#0b0c10] px-5 py-32 sm:px-8 lg:px-12 lg:py-44"
        >
          <div className="mx-auto max-w-[1504px]">
            <div className="grid grid-cols-12 gap-y-12 border-t border-white/10 pt-7 lg:gap-x-8">
              <p className="eyebrow col-span-12 lg:col-span-3">
                Why House Delivery Inc.
              </p>
              <h2 className="col-span-12 max-w-[1250px] text-[clamp(3.5rem,8vw,8.8rem)] font-medium leading-[0.82] tracking-[-0.075em] text-white/90 lg:col-span-9 lg:col-start-4">
                A remarkable home.
                <br />
                <span className="text-white/38">
                  A more reachable price.
                </span>
              </h2>
              <p className="col-span-10 col-start-3 max-w-xl border-l border-white/10 pl-6 text-lg leading-8 text-white/70 sm:col-span-7 sm:col-start-6 lg:col-span-4 lg:col-start-9">
                Less waste. Less delay. Less construction markup between you
                and ownership.
              </p>
            </div>

            <div className="mt-28 grid grid-cols-12 gap-y-16 lg:mt-40 lg:gap-x-8">
              <div className="relative col-span-12 min-h-[560px] overflow-hidden bg-[#13151a] lg:col-span-7 lg:min-h-[820px]">
                <Image
                  src={models[1].images[2]}
                  alt="Refined interior of a House Delivery Inc. residence"
                  fill
                  quality={100}
                  unoptimized={true}
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  className="object-cover"
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

        <FounderMission />
        <ReservationForm models={models} />
      </main>
    </>
  );
}
