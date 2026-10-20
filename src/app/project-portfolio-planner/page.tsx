import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProjectPortfolioPlanner } from "@/components/first-nations-project-planner";
import { SiteHeader } from "@/components/site-header";
import {
  firstNationsFundingCorridors,
  firstNationsPlannerCatalog,
} from "@/data/first-nations-planner";
import {
  isPlannerAudience,
  plannerAudienceLabels,
  type PlannerAudience,
} from "@/lib/project-planner";

export const metadata: Metadata = {
  title: "Project & Portfolio Planner",
  description:
    "Shape a multi-home portfolio, design direction and structured opportunity for House Delivery review.",
};

const audienceCopy: Record<
  Exclude<PlannerAudience, "first-nations">,
  { eyebrow: string; title: string; accent: string; intro: string }
> = {
  developer: {
    eyebrow: "Developer / Landowner / Project & Portfolio Planner",
    title: "Give the opportunity shape.",
    accent: "Plan the portfolio clearly.",
    intro:
      "Bring the site, housing approach, phasing, home mix and design direction into one early working project.",
  },
  "general-contractor": {
    eyebrow: "General Contractor / Project & Portfolio Planner",
    title: "Coordinate the programme early.",
    accent: "Carry delivery context forward.",
    intro:
      "Bring procurement, site readiness, logistics, trade responsibilities and repeatable home designs into one project record.",
  },
  "municipality-non-profit": {
    eyebrow: "Municipality / Non-Profit / Project & Portfolio Planner",
    title: "Start with the housing need.",
    accent: "Build a clearer delivery path.",
    intro:
      "Shape the need, site, affordability approach, portfolio, design direction and readiness for a structured review.",
  },
};

export default async function ProjectPortfolioPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string | string[] }>;
}) {
  const params = await searchParams;
  const audienceValue = Array.isArray(params.audience)
    ? params.audience[0]
    : params.audience;

  if (!isPlannerAudience(audienceValue)) {
    redirect("/plan-a-housing-project");
  }
  if (audienceValue === "first-nations") {
    redirect("/first-nations-project-planner");
  }

  const copy = audienceCopy[audienceValue];

  return (
    <>
      <SiteHeader showProjectReviewAction={false} />
      <main className="bg-[#0b0c10] text-white">
        <section className="px-5 pb-20 pt-36 sm:px-8 sm:pb-24 sm:pt-44 lg:px-12 lg:pb-32 lg:pt-52">
          <div className="mx-auto max-w-[1504px]">
            <div className="grid gap-y-12 border-t border-white/12 pt-7 lg:grid-cols-12 lg:gap-x-8">
              <p className="eyebrow lg:col-span-3">{copy.eyebrow}</p>
              <div className="lg:col-span-9">
                <h1 className="max-w-6xl text-[clamp(3.7rem,8.5vw,9rem)] font-medium leading-[0.8] tracking-[-0.078em] text-white/92">
                  {copy.title}
                  <br />
                  <span className="text-white/38">{copy.accent}</span>
                </h1>
                <p className="mt-9 max-w-2xl text-lg leading-8 text-white/62">
                  {copy.intro}
                </p>
              </div>
            </div>
            <div className="mt-16 grid gap-6 border-y border-white/12 py-7 text-[9px] font-semibold uppercase tracking-[0.17em] text-white/52 sm:grid-cols-3 sm:py-9">
              <p>{plannerAudienceLabels[audienceValue]}</p>
              <p>Shared home and design system</p>
              <p>Non-binding early project review</p>
            </div>
            <div className="mt-6 grid gap-4 text-xs leading-5 text-white/42 sm:grid-cols-3">
              <p>Saved locally on this device as you work.</p>
              <p>Preliminary planning only—not a quotation.</p>
              <p>No funding, financing or approval is implied.</p>
            </div>
          </div>
        </section>
        <ProjectPortfolioPlanner
          key={audienceValue}
          initialAudience={audienceValue}
          catalog={firstNationsPlannerCatalog}
          fundingCorridors={firstNationsFundingCorridors}
        />
      </main>
    </>
  );
}
