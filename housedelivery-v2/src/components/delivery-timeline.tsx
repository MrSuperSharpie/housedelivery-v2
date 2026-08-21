"use client";

import { motion } from "framer-motion";
import {
  ClipboardCheck,
  Compass,
  Factory,
  Home,
  PackageCheck,
  Ruler,
  Ship,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { RevealText } from "@/components/reveal-text";
import { cn } from "@/lib/cn";

const stages = [
  {
    day: "DAY 01",
    title: "Site review + project kickoff",
    description:
      "We review the site, access, zoning context, utilities, project priorities, and the delivery pathway best suited to the opportunity.",
    icon: Compass,
  },
  {
    day: "DAY 15",
    title: "Design adaptation + engineering",
    description:
      "The selected design is adapted for local snow, wind, seismic, foundation, and jurisdictional requirements while key specifications are coordinated.",
    icon: Ruler,
  },
  {
    day: "DAY 30",
    title: "Permit submission + site preparation begins",
    description:
      "The coordinated permit package enters municipal review as approved site preparation, utility coordination, and local crew planning begin.",
    icon: ClipboardCheck,
  },
  {
    day: "DAY 30–75",
    title: "Factory production + site preparation in parallel",
    description:
      "Numbered structural components are precision-formed and quality checked in the factory while site work advances toward delivery readiness.",
    icon: Factory,
  },
  {
    day: "DAY 75–120",
    title: "Ocean transit + customs + inland delivery",
    description:
      "The component package moves through ocean transit, customs clearance, and inland delivery while the Canadian site advances toward readiness.",
    icon: Ship,
  },
  {
    day: "DAY 105–135",
    title: "Delivery + structural assembly",
    description:
      "Where shipment arrival and site readiness allow, delivery sequencing and structural assembly can begin before the broader logistics window is complete.",
    icon: PackageCheck,
  },
  {
    day: "DAY 135–165",
    title: "Interior completion, inspections + handover",
    description:
      "Interior systems and finishes are completed, required inspections are closed out, and the documented home is prepared for handover.",
    icon: Home,
  },
] as const;

type DeliveryTimelineProps = {
  embedded?: boolean;
  eyebrow?: string;
  headlinePrimary?: string;
  headlineSecondary?: string;
  introCopy?: string;
};

export function DeliveryTimeline({
  embedded = false,
  eyebrow = "The delivery sequence",
  headlinePrimary = "One path.",
  headlineSecondary = "Seven clear stages.",
  introCopy = "Parallel planning replaces the usual stop-start sequence. Engineering, approvals, production, and site work are coordinated around one delivery target.",
}: DeliveryTimelineProps) {
  const [activeStage, setActiveStage] = useState(0);
  const ActiveIcon = stages[activeStage].icon;

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

        <div className="relative mt-20 grid gap-2 border-t border-white/10 pt-16 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <div className="absolute left-0 right-0 top-[98px] hidden h-px bg-white/12 xl:block" />
          <motion.div
            className="absolute left-0 top-[98px] hidden h-px bg-white xl:block"
            animate={{ width: `${(activeStage / (stages.length - 1)) * 100}%` }}
            transition={{ duration: 0.55, ease: [0.2, 0.7, 0, 1] }}
          />
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const isActive = activeStage === index;
            return (
              <button
                key={stage.title}
                type="button"
                onClick={() => setActiveStage(index)}
                className={cn(
                  "relative z-10 flex items-center gap-4 border border-white/10 p-4 text-left transition-colors xl:block xl:border-0 xl:bg-transparent xl:p-0",
                  isActive ? "bg-white/[0.06]" : "hover:bg-white/[0.03]",
                )}
                aria-pressed={isActive}
              >
                <span
                  className={cn(
                    "grid size-[68px] shrink-0 place-items-center rounded-full border transition-colors xl:mx-auto",
                    isActive
                      ? "border-white bg-white text-black"
                      : "border-white/20 bg-[#0e1014] text-white/42",
                  )}
                >
                  <Icon size={19} strokeWidth={1.5} />
                </span>
                <span className="xl:mt-5 xl:block xl:text-center">
                  <span className="block text-[9px] uppercase tracking-[0.18em] text-white/35">
                    {stage.day}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block text-xs",
                      isActive ? "text-white" : "text-white/48",
                    )}
                  >
                    {stage.title}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <motion.div
          key={activeStage}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-14 grid border-t border-white/15 pt-10 md:grid-cols-[150px_1fr] md:gap-16"
        >
          <div className="flex items-center gap-4 text-white/35">
            <ActiveIcon size={24} strokeWidth={1.3} />
            <span className="text-[10px] uppercase tracking-[0.2em]">
              {stages[activeStage].day}
            </span>
          </div>
          <div className="mt-8 max-w-3xl md:mt-0">
            <h3 className="text-3xl font-medium tracking-[-0.045em] md:text-4xl">
              {stages[activeStage].title}
            </h3>
            <p className="mt-4 text-base leading-7 text-white/50 md:text-lg md:leading-8">
              {stages[activeStage].description}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
