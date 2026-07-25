"use client";

import { motion } from "framer-motion";
import {
  ClipboardCheck,
  Compass,
  Factory,
  Home,
  PackageCheck,
  Ruler,
} from "lucide-react";
import { useState } from "react";

import { RevealText } from "@/components/reveal-text";
import { cn } from "@/lib/cn";

const stages = [
  {
    day: "Day 01",
    title: "Site & feasibility",
    description:
      "We review land, access, zoning context, utilities, budget, and the model best suited to your project.",
    icon: Compass,
  },
  {
    day: "Day 15",
    title: "Adapt & engineer",
    description:
      "The selected design is adapted for local snow, wind, seismic, foundation, and jurisdictional requirements.",
    icon: Ruler,
  },
  {
    day: "Day 30",
    title: "Permit pathway",
    description:
      "A coordinated permit package moves through local review while procurement and production planning advance.",
    icon: ClipboardCheck,
  },
  {
    day: "Day 45",
    title: "Factory production",
    description:
      "Numbered structural components are precision-formed in a controlled environment with documented quality checks.",
    icon: Factory,
  },
  {
    day: "Day 90",
    title: "Deliver & assemble",
    description:
      "The component system arrives sequenced for efficient on-site installation by the coordinated construction team.",
    icon: PackageCheck,
  },
  {
    day: "Day 120",
    title: "Finish & handover",
    description:
      "Final systems, finishes, inspections, and closeout turn a component package into a completed, documented home.",
    icon: Home,
  },
] as const;

export function DeliveryTimeline() {
  const [activeStage, setActiveStage] = useState(0);
  const ActiveIcon = stages[activeStage].icon;

  return (
    <section
      id="timeline"
      className="scroll-mt-20 border-y border-white/10 bg-[#0e1014] px-5 py-28 sm:px-8 lg:px-12 lg:py-40"
    >
      <div className="mx-auto max-w-[1504px]">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow">The delivery sequence</p>
            <h2 className="mt-6 text-[clamp(3rem,5.4vw,6rem)] font-medium leading-[0.92] tracking-[-0.065em]">
              <RevealText text="One path." />
              <br />
              <span className="text-white/40">
                <RevealText text="Six clear stages." delay={0.12} />
              </span>
            </h2>
          </div>
          <div className="max-w-xl self-end lg:justify-self-end">
            <p className="text-lg leading-8 text-white/55">
              Parallel planning replaces the usual stop-start sequence.
              Engineering, approvals, production, and site work are coordinated
              around one delivery target.
            </p>
            <p className="mt-5 text-xs leading-5 text-white/30">
              The 120-day target is project-specific. Municipal review, site
              conditions, utility work, and chosen finishes can affect timing.
            </p>
          </div>
        </div>

        <div className="relative mt-20 grid gap-2 md:grid-cols-6">
          <div className="absolute left-0 right-0 top-[34px] hidden h-px bg-white/12 md:block" />
          <motion.div
            className="absolute left-0 top-[34px] hidden h-px bg-white md:block"
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
                  "relative z-10 flex items-center gap-4 border border-white/10 p-4 text-left transition-colors md:block md:border-0 md:bg-transparent md:p-0",
                  isActive ? "bg-white/[0.06]" : "hover:bg-white/[0.03]",
                )}
                aria-pressed={isActive}
              >
                <span
                  className={cn(
                    "grid size-[68px] shrink-0 place-items-center rounded-full border transition-colors md:mx-auto",
                    isActive
                      ? "border-white bg-white text-black"
                      : "border-white/20 bg-[#0e1014] text-white/42",
                  )}
                >
                  <Icon size={19} strokeWidth={1.5} />
                </span>
                <span className="md:mt-5 md:block md:text-center">
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
