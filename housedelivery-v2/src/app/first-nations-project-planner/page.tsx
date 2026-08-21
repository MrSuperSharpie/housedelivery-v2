import type { Metadata } from "next";
import Image from "next/image";

import { FirstNationsProjectPlanner } from "@/components/first-nations-project-planner";
import { SiteHeader } from "@/components/site-header";
import {
  firstNationsFundingCorridors,
  firstNationsPlannerCatalog,
} from "@/data/first-nations-planner";

export const metadata: Metadata = {
  title: "First Nations Project & Portfolio Planner",
  description:
    "Build a preliminary community housing portfolio, explore planning readiness and prepare for a House Delivery project review.",
};

export default function FirstNationsProjectPlannerPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-[#0b0c10] text-white">
        <section className="px-5 pb-20 pt-36 sm:px-8 sm:pb-24 sm:pt-44 lg:px-12 lg:pb-32 lg:pt-52">
          <div className="mx-auto max-w-[1504px]">
            <div className="grid gap-y-12 border-t border-white/12 pt-7 lg:grid-cols-12 lg:gap-x-8">
              <p className="eyebrow lg:col-span-3">First Nations / Project & Portfolio Planner V1</p>
              <div className="lg:col-span-9">
                <h1 className="max-w-6xl text-[clamp(3.7rem,8.5vw,9rem)] font-medium leading-[0.8] tracking-[-0.078em] text-white/92">
                  Community need.
                  <br />
                  <span className="text-white/38">A clearer housing path.</span>
                </h1>
                <p className="mt-9 max-w-2xl text-lg leading-8 text-white/62">
                  Shape an early housing portfolio, identify what is known, explore contextual funding corridors and prepare a structured opportunity for House Delivery review.
                </p>
              </div>
            </div>
            <div className="relative mt-16 h-[25rem] overflow-hidden border border-white/10 sm:mt-20 sm:h-auto sm:aspect-[16/8.5] lg:aspect-[2.3/1]">
              <Image
                src="/First Nations 1.webp"
                alt="Timber gathering space overlooking a forested coastline"
                fill
                priority
                quality={100}
                unoptimized
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/10" />
              <div className="absolute inset-x-5 bottom-5 grid gap-5 border-t border-white/22 pt-4 text-[9px] uppercase tracking-[0.17em] text-white/66 sm:inset-x-8 sm:bottom-8 sm:grid-cols-3">
                <p>Portfolio planning</p><p>Preliminary feasibility</p><p>Community-led review</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 text-xs leading-5 text-white/42 sm:grid-cols-3">
              <p>Saved locally on this device as you work.</p>
              <p>Preliminary planning only—not a quotation.</p>
              <p>No funding approval or eligibility is implied.</p>
            </div>
          </div>
        </section>
        <FirstNationsProjectPlanner
          catalog={firstNationsPlannerCatalog}
          fundingCorridors={firstNationsFundingCorridors}
        />
      </main>
    </>
  );
}
