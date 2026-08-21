import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";

export type ContextualInclusionDestination = {
  href: string;
  label: string;
};

function getInclusionDestination(
  sourceLabel: string,
): ContextualInclusionDestination | null {
  const label = sourceLabel.toLowerCase();

  if (label.includes("bath")) {
    return {
      href: "/inclusions#kitchen-bath-fixtures",
      label: "Explore Bath & Finish Options",
    };
  }

  if (label.includes("kitchen") || label.includes("cabinetry")) {
    return {
      href: "/inclusions#kitchen-cabinetry",
      label: "Explore Kitchen & Cabinetry",
    };
  }

  if (label.includes("wardrobe") || label.includes("storage")) {
    return {
      href: "/inclusions#wardrobes",
      label: "Explore Wardrobe Options",
    };
  }

  if (label.includes("flooring") || label.includes("floor finish")) {
    return {
      href: "/inclusions#flooring",
      label: "Explore Flooring Options",
    };
  }

  if (label.includes("window") || label.includes("patio door")) {
    return {
      href: "/inclusions#windows-patio-doors",
      label: "Explore Windows & Patio Doors",
    };
  }

  if (label.includes("interior door")) {
    return {
      href: "/inclusions#interior-doors",
      label: "Explore Interior Door Options",
    };
  }

  if (label.includes("exterior door") || label.includes("entry door")) {
    return {
      href: "/inclusions#exterior-doors",
      label: "Explore Exterior Entry Doors",
    };
  }

  return null;
}

export function ContextualInclusionsLink({
  sourceLabel,
  destinationOverride,
}: {
  sourceLabel: string;
  destinationOverride?: ContextualInclusionDestination;
}) {
  const defaultDestination = getInclusionDestination(sourceLabel);

  if (!defaultDestination) {
    return null;
  }

  const destination = destinationOverride ?? defaultDestination;

  return (
    <Link
      href={destination.href}
      className="group mt-3 inline-flex min-h-11 items-center gap-3 py-2 text-[9px] font-semibold uppercase tracking-[0.17em] text-white/58 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:text-[10px]"
    >
      {destination.label}
      <ArrowRight
        aria-hidden="true"
        className="size-3.5 transition-transform group-hover:translate-x-1"
        strokeWidth={1.5}
      />
    </Link>
  );
}

export function ExploreAllInclusionsLink({
  className,
}: {
  className?: string;
}) {
  return (
    <Link
      href="/inclusions"
      className={cn(
        "group inline-flex min-h-11 items-center gap-4 border-b border-white/20 py-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-white/58 transition-[border-color,color] hover:border-white/55 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white",
        className,
      )}
    >
      Explore All Inclusions
      <ArrowRight
        aria-hidden="true"
        className="size-3.5 transition-transform group-hover:translate-x-1"
        strokeWidth={1.5}
      />
    </Link>
  );
}

export function HomeDesignJourneyLink({
  homeName,
  href,
  availability,
  className,
}: {
  homeName: string;
  href?: string;
  availability: "available" | "coming-soon";
  className?: string;
}) {
  if (availability === "coming-soon" || !href) {
    return (
      <span
        aria-disabled="true"
        className={cn(
          "inline-flex min-h-11 items-center border-b border-white/12 py-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-white/38",
          className,
        )}
      >
        Lookbook coming soon
      </span>
    );
  }

  return (
    <a
      href={href}
      className={cn(
        "group inline-flex min-h-11 items-center gap-4 border-b border-white/20 py-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-white/68 transition-[border-color,color] hover:border-white/55 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white",
        className,
      )}
    >
      Build My {homeName}
      <ArrowRight
        aria-hidden="true"
        className="size-3.5 transition-transform group-hover:translate-x-1"
        strokeWidth={1.5}
      />
    </a>
  );
}
