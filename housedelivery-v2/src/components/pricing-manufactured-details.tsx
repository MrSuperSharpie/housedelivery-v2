"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { formatPricingRange, pricingGuide } from "@/data/pricing";

export function PricingManufacturedDetails({
  id,
  range,
}: {
  id: string;
  range: readonly [number, number];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <details className="group mt-7 border-y border-white/15" onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary
        role="button"
        aria-expanded={expanded}
        aria-controls={`${id}-manufactured-scope`}
        className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-xs text-white/75 marker:content-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        {pricingGuide.scopes.manufactured.label}
        <ChevronDown aria-hidden="true" size={16} className="shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div id={`${id}-manufactured-scope`} className="pb-5">
        <p className="text-xl font-medium">{formatPricingRange(range)} <span className="text-xs font-normal text-white/60">/ sq. ft.</span></p>
        <p className="mt-3 text-sm leading-6 text-white/65">{pricingGuide.scopes.manufactured.description}</p>
      </div>
    </details>
  );
}
