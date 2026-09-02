"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/cn";
import {
  addPlannerHomeViewContextToProject,
  buildPlannerDesignHref,
} from "@/lib/planner-design-session";
import { usePlannerHomeViewContext } from "@/lib/use-planner-home-view-context";

type HomeDesignToolCalloutProps = {
  homeName: string;
  href?: string;
  variant: "primary" | "quiet";
  availability?: "available" | "coming-soon" | "preview-only";
};

export function HomeDesignToolCallout({
  homeName,
  href,
  variant,
  availability = "available",
}: HomeDesignToolCalloutProps) {
  const isPrimary = variant === "primary";
  const isPreviewOnly = availability === "preview-only";
  const isComingSoon = availability === "coming-soon";
  const headingId = `home-design-tool-${variant}-heading`;
  const plannerHomeContext = usePlannerHomeViewContext();
  const [plannerActionError, setPlannerActionError] = useState("");
  const activePlannerContext =
    plannerHomeContext?.homeName === homeName ? plannerHomeContext : undefined;

  function addHomeToProject() {
    if (!activePlannerContext || isPreviewOnly) return;
    const session = addPlannerHomeViewContextToProject(activePlannerContext);
    if (!session) {
      setPlannerActionError(
        "We couldn’t update this local project. Return to My Project and try again.",
      );
      return;
    }

    if (isComingSoon || !href) {
      window.location.assign(activePlannerContext.returnHref);
      return;
    }

    window.location.assign(
      buildPlannerDesignHref(`${window.location.pathname}${href}`, session),
    );
  }

  return (
    <aside
      aria-labelledby={headingId}
      data-home-design-discovery={variant}
      data-home-design-availability={availability}
      className={cn(
        "border-t border-white/15 pt-7",
        isPrimary
          ? "mt-24 grid gap-12 lg:mt-32 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:gap-24"
          : "grid max-w-5xl gap-8 md:grid-cols-[0.72fr_1.28fr] md:gap-14",
      )}
    >
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/55">
          {isPreviewOnly
            ? "Preview Model"
            : isComingSoon
            ? "Design Lookbook"
            : isPrimary
              ? "Interactive design experience"
              : "Continue the story"}
        </p>
        <h3
          id={headingId}
          className={cn(
            "mt-6 font-medium uppercase leading-[0.88] tracking-[-0.065em] text-white/88",
            isPrimary
              ? "max-w-3xl text-[clamp(3.5rem,7vw,7.5rem)]"
              : "max-w-xl text-[clamp(2.4rem,4.5vw,4.5rem)]",
          )}
        >
          {isPreviewOnly ? (
            <>
              Preview
              <br />
              <span className="text-white/45">model.</span>
            </>
          ) : isComingSoon ? (
            <>
              Coming
              <br />
              <span className="text-white/45">Soon.</span>
            </>
          ) : isPrimary ? (
            <>
              Make {homeName}
              <br />
              <span className="text-white/45">yours.</span>
            </>
          ) : (
            <>
              Like what you see?
              <br />
              <span className="text-white/45">Make it yours.</span>
            </>
          )}
        </h3>
      </div>

      <div className={cn("max-w-2xl", isPrimary && "lg:justify-self-end")}>
        {isPreviewOnly ? (
          <>
            <p
              className={cn(
                "text-white/52",
                isPrimary
                  ? "text-base leading-8 lg:text-lg"
                  : "text-sm leading-7 sm:text-base",
              )}
            >
              Available to explore. Project selection, Design My Home and Look Book
              configuration are coming soon.
            </p>
            {activePlannerContext ? (
              <Link
                href={activePlannerContext.returnHref}
                className="group mt-7 inline-flex min-h-12 items-center gap-3 border-b border-white/28 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72 transition-[border-color,color] hover:border-white hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Return to My Project
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-1"
                  strokeWidth={1.5}
                />
              </Link>
            ) : null}
          </>
        ) : isComingSoon ? (
          <>
            <div
              className={cn(
                "space-y-4 text-white/52",
                isPrimary
                  ? "text-base leading-8 lg:text-lg"
                  : "text-sm leading-7 sm:text-base",
              )}
            >
              <p>
                We’re currently preparing the curated interior and exterior
                design collections for this home.
              </p>
              <p>
                Explore the home today, and check back soon to create your
                personalized lookbook.
              </p>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-4">
              {activePlannerContext && !activePlannerContext.designSession ? (
                <button
                  type="button"
                  onClick={addHomeToProject}
                  className="inline-flex min-h-12 items-center border border-white/32 px-5 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-white/78"
                >
                  Add {homeName} to My Project
                </button>
              ) : (
                <span
                  aria-disabled="true"
                  data-lookbook-coming-soon-cta
                  className="inline-flex min-h-12 items-center border border-white/16 px-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38"
                >
                  Design Lookbook Coming Soon
                </span>
              )}
              <Link
                href="/#reserve"
                className="group inline-flex min-h-12 items-center gap-3 border-b border-white/28 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72 transition-[border-color,color] hover:border-white hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                Contact House Delivery
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-1"
                  strokeWidth={1.5}
                />
              </Link>
            </div>
          </>
        ) : (
          <>
            <p
              className={cn(
                "text-white/52",
                isPrimary
                  ? "text-base leading-8 lg:text-lg"
                  : "text-sm leading-7 sm:text-base",
              )}
            >
              {isPrimary
                ? `Choose the key kitchen, bathroom, wardrobe, flooring and finish directions that define your home. Create a personalized ${homeName} Look Book before moving into project-specific design.`
                : `${homeName} includes an interactive design experience where you can shape the key spaces and finishes of your home.`}
            </p>
            {activePlannerContext && !activePlannerContext.designSession ? (
              <button
                type="button"
                onClick={addHomeToProject}
                className={cn(
                  "group mt-7 inline-flex min-h-12 items-center justify-between gap-10 border-b border-white/28 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72 transition-[border-color,color] hover:border-white hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white",
                  isPrimary ? "min-w-64 pb-3" : "min-w-52 pb-2",
                )}
              >
                Add {homeName} to My Project
                <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
              </button>
            ) : (
              <a
                href={href}
                className={cn(
                  "group mt-7 inline-flex min-h-12 items-center justify-between gap-10 border-b border-white/28 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72 transition-[border-color,color] hover:border-white hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white",
                  isPrimary ? "min-w-64 pb-3" : "min-w-52 pb-2",
                )}
              >
                {activePlannerContext?.designSession
                  ? `Design ${homeName} for My Project`
                  : isPrimary
                    ? `Design My ${homeName}`
                    : `Explore ${homeName} Design Options`}
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-1"
                  strokeWidth={1.5}
                />
              </a>
            )}
          </>
        )}
        {plannerActionError ? <p role="alert" className="mt-4 text-xs leading-5 text-white/58">{plannerActionError}</p> : null}
      </div>
    </aside>
  );
}
