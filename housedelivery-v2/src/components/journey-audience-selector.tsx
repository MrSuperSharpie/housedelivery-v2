"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";

const audiences = [
  {
    id: "first-nations-housing",
    label: "First Nations + Housing Organizations",
    heading: "Turn housing need into a coordinated delivery programme.",
    copy:
      "Begin with available land, funded demand or a community housing objective. House Delivery helps organize the housing mix, coordinated inclusions, procurement, logistics and delivery pathway while supporting local and Indigenous workforce participation where appropriate.",
  },
  {
    id: "land-developers",
    label: "Land Developers",
    heading: "Create a repeatable housing programme.",
    copy:
      "Use House Delivery across one site or multiple phases to coordinate home types, controlled design options, procurement and delivery without managing a fragmented network of product suppliers.",
  },
  {
    id: "general-contractors",
    label: "General Contractors",
    heading: "Add a coordinated supply and delivery partner.",
    copy:
      "House Delivery coordinates the light-gauge steel structural package and selected building components and inclusions while the GC retains control of local site execution, trades, construction management and project delivery.",
  },
  {
    id: "individual-homeowners",
    label: "Individual Homeowners",
    heading: "Start with your property and a home you love.",
    copy:
      "House Delivery helps you understand the path from preliminary site fit through design, project-specific professional work, coordinated delivery, assembly and occupancy.",
  },
] as const;

type AudienceId = (typeof audiences)[number]["id"];

export function JourneyAudienceSelector() {
  const [selectedId, setSelectedId] = useState<AudienceId>(audiences[0].id);
  const selectedAudience =
    audiences.find((audience) => audience.id === selectedId) ?? audiences[0];

  return (
    <section
      data-journey-audience-selector
      className="mt-16 border-y border-white/12 py-7 sm:mt-20 sm:py-9 lg:mt-24"
    >
      <div
        role="group"
        aria-label="Choose your planning perspective"
        className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4"
      >
        {audiences.map((audience) => {
          const isSelected = selectedId === audience.id;

          return (
            <button
              key={audience.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedId(audience.id)}
              className={cn(
                "relative min-h-16 bg-[#0e1014] px-4 py-4 text-left text-[9px] font-semibold uppercase leading-5 tracking-[0.15em] transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c8ad82] sm:min-h-20 sm:px-5",
                isSelected
                  ? "text-white"
                  : "text-white/44 hover:bg-white/[0.04] hover:text-white/78",
              )}
            >
              {audience.label}
              {isSelected ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-4 bottom-0 h-px bg-[#c8ad82] sm:inset-x-5"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        aria-live="polite"
        className="mt-9 grid gap-6 lg:grid-cols-12 lg:gap-x-8"
      >
        <h2 className="max-w-4xl text-[clamp(2.5rem,5vw,5.2rem)] font-medium leading-[0.9] tracking-[-0.06em] text-white/90 lg:col-span-7">
          {selectedAudience.heading}
        </h2>
        <p className="max-w-2xl text-sm leading-7 text-white/48 lg:col-span-5 lg:self-end lg:justify-self-end">
          {selectedAudience.copy}
        </p>
      </div>
    </section>
  );
}
