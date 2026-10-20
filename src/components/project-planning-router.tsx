"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type OrganizationType =
  | "first-nation"
  | "developer"
  | "general-contractor"
  | "municipality";

const organizationOptions: readonly {
  id: OrganizationType;
  label: string;
}[] = [
  { id: "first-nation", label: "First Nation / Indigenous Community" },
  { id: "developer", label: "Developer / Landowner" },
  { id: "general-contractor", label: "General Contractor" },
  { id: "municipality", label: "Municipality / Non-Profit" },
];

export function ProjectPlanningRouter() {
  const [organization, setOrganization] = useState<OrganizationType>();

  function chooseOrganization(value: OrganizationType) {
    setOrganization(value);
  }

  function resetChoice() {
    setOrganization(undefined);
  }

  const multipleHomesHref =
    organization === "first-nation"
      ? "/first-nations-project-planner"
      : organization
        ? `/project-portfolio-planner?audience=${organization === "municipality" ? "municipality-non-profit" : organization}`
        : "/plan-a-housing-project";

  return (
    <div className="mx-auto max-w-[1504px]">
      <div className="grid grid-cols-12 gap-y-12 border-t border-white/12 pt-7 lg:gap-x-8">
        <p className="eyebrow col-span-12 lg:col-span-3">Plan a Housing Project</p>
        <div className="col-span-12 lg:col-span-8 lg:col-start-4">
          <h1 className="max-w-5xl text-[clamp(3.6rem,8vw,8.5rem)] font-medium leading-[0.82] tracking-[-0.075em] text-white/92">
            Who are you
            <br />
            <span className="text-white/38">planning for?</span>
          </h1>
        </div>
      </div>

      <div className="mt-16 border-y border-white/12 py-8 sm:py-10 lg:mt-24">
        {!organization ? (
          <div data-project-planning-audience className="grid gap-3 md:grid-cols-2">
            {organizationOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => chooseOrganization(option.id)}
                className="group inline-flex min-h-16 items-center justify-between gap-6 border border-white/18 px-5 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72 transition-colors hover:border-white/60 hover:bg-white hover:text-[#0b0c10] sm:px-6"
              >
                {option.label}
                <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
              </button>
            ))}
            <Link
              href="/#models"
              className="group inline-flex min-h-16 items-center justify-between gap-6 border border-white/18 px-5 text-left text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72 transition-colors hover:border-white/60 hover:bg-white hover:text-[#0b0c10] sm:px-6 md:col-span-2"
            >
              Individual Homeowner
              <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
          </div>
        ) : (
          <div data-project-planning-size>
            <button
              type="button"
              onClick={resetChoice}
              className="inline-flex min-h-11 items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/44 transition-colors hover:text-white"
            >
              <ArrowLeft aria-hidden="true" className="size-4" /> Change selection
            </button>
            <p className="mt-8 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/38">
              {organizationOptions.find((option) => option.id === organization)?.label}
            </p>
            <h2 className="mt-5 text-[clamp(2.6rem,5vw,5.5rem)] font-medium leading-[0.88] tracking-[-0.065em] text-white/90">
              How many homes are you planning?
            </h2>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              <Link
                href="/#models"
                className="inline-flex min-h-16 items-center justify-between gap-6 border border-white/22 px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/78 transition-colors hover:border-white hover:bg-white hover:text-[#0b0c10] sm:px-6"
              >
                One Home <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                href={multipleHomesHref}
                className="inline-flex min-h-16 items-center justify-between gap-6 bg-white px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0b0c10] transition-colors hover:bg-white/82 sm:px-6"
              >
                Multiple Homes <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
