import type { Metadata } from "next";

import { ProjectPlanningRouter } from "@/components/project-planning-router";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Plan a Housing Project",
  description:
    "Choose the House Delivery pathway for an individual home or a multi-home housing project.",
};

export default function PlanAHousingProjectPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#0b0c10] px-5 pb-24 pt-36 text-white sm:px-8 sm:pt-44 lg:px-12 lg:pb-36 lg:pt-52">
        <ProjectPlanningRouter />
      </main>
    </>
  );
}
