import Image from "next/image";
import Link from "next/link";

import { RevealText } from "@/components/reveal-text";

const milestones = [
  {
    title: "Project review + fit",
    description:
      "Site, access, objectives, jurisdiction and delivery pathway.",
  },
  {
    title: "Home configuration + coordination",
    description:
      "Confirm the home, inclusions and project requirements.",
  },
  {
    title: "Project-specific review + approvals",
    description:
      "Required local design adaptation, engineering, permitting and technical review begin once the project is ready to proceed.",
  },
  {
    title: "Factory production + site preparation",
    description:
      "Coordinated workstreams can advance in parallel.",
  },
  {
    title: "Logistics + local assembly",
    description:
      "Freight, customs, delivery and structural assembly are coordinated.",
  },
  {
    title: "Completion + handover",
    description:
      "Interior completion, inspections, deficiencies and final handover.",
  },
] as const;

type DeliveryTimelineProps = {
  embedded?: boolean;
  eyebrow?: string;
  headlinePrimary?: string;
  headlineSecondary?: string;
  introCopy?: string;
  journeyHref?: string;
};

export function DeliveryTimeline({
  embedded = false,
  eyebrow = "The delivery sequence",
  headlinePrimary = "One path.",
  headlineSecondary = "Seven clear stages.",
  introCopy = "Parallel planning replaces the usual stop-start sequence. Engineering, approvals, production, and site work are coordinated around one delivery target.",
  journeyHref,
}: DeliveryTimelineProps) {
  return (
    <section
      id="timeline"
      className={
        embedded
          ? "mt-20 scroll-mt-20 border-t border-white/10 pt-20 lg:mt-28 lg:pt-24"
          : "scroll-mt-20 border-y border-white/10 bg-[#0e1014] px-5 py-28 sm:px-8 lg:px-12 lg:py-40"
      }
    >
      <div className={embedded ? undefined : "mx-auto max-w-[1504px]"}>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="mt-6 text-[clamp(3rem,5.4vw,6rem)] font-medium leading-[0.92] tracking-[-0.065em]">
              <RevealText text={headlinePrimary} />
              <br />
              <span className="text-white/40">
                <RevealText text={headlineSecondary} delay={0.12} />
              </span>
            </h2>
          </div>
          <div className="max-w-xl self-end lg:justify-self-end">
            <p className="text-lg leading-8 text-white/55">{introCopy}</p>
          </div>
        </div>

        <figure className="relative left-1/2 mt-16 w-[calc(100vw-2.5rem)] -translate-x-1/2 sm:w-[calc(100vw-4rem)] lg:mt-24 lg:w-[min(calc(100vw-6rem),1776px)]">
          <div
            className="overflow-x-auto overscroll-x-contain bg-black [scrollbar-color:rgba(255,255,255,0.24)_transparent] [scrollbar-width:thin]"
            tabIndex={0}
            role="region"
            aria-label="Panoramic House Delivery process. Scroll horizontally to view all five stages."
          >
            <div className="w-[960px] lg:w-full">
              <Image
                src="/images/how-it-works/house-delivery-process.png"
                alt="House Delivery process from site preparation and digital home coordination through factory production, structural assembly and completed home."
                width={2172}
                height={724}
                quality={100}
                unoptimized
                sizes="(max-width: 1023px) 960px, (max-width: 1888px) calc(100vw - 96px), 1776px"
                className="block h-auto w-full max-w-none"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/30 lg:hidden">
              Swipe to explore all five stages
            </p>
            <figcaption className="max-w-2xl text-xs leading-5 text-white/30 sm:ml-auto sm:text-right">
              Illustrative project sequence. Timing varies by design,
              approvals, site conditions, production and logistics.
            </figcaption>
          </div>
        </figure>

        <section
          aria-labelledby="typical-project-milestones-heading"
          className="mt-20 border-t border-white/10 pt-12 lg:mt-28 lg:pt-16"
        >
          <h3
            id="typical-project-milestones-heading"
            className="text-2xl font-medium tracking-[-0.04em] text-white/76 sm:text-3xl"
          >
            Typical Project Milestones
          </h3>

          <ol className="mt-10 grid border-t border-white/10 md:grid-cols-2 md:gap-x-16 lg:mt-12 lg:gap-x-24">
            {milestones.map((milestone, index) => (
              <li
                key={milestone.title}
                className="grid grid-cols-[2rem_1fr] gap-4 border-b border-white/10 py-7 sm:grid-cols-[2.5rem_1fr] sm:gap-6 sm:py-9"
              >
                <span className="pt-1 font-mono text-[9px] tracking-[0.18em] text-white/24">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h4 className="text-base font-medium tracking-[-0.025em] text-white/70 sm:text-lg">
                    {milestone.title}
                  </h4>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/40">
                    {milestone.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-3xl text-xs leading-6 text-white/32">
              Indicative project timing is established after site, design,
              approval and procurement requirements are understood.
              Workstreams may overlap.
            </p>
            {journeyHref ? (
              <Link
                href={journeyHref}
                className="inline-flex min-h-11 shrink-0 items-center border-b border-white/25 py-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-white/62 transition-colors hover:border-white hover:text-white"
              >
                Explore the homeowner journey
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
