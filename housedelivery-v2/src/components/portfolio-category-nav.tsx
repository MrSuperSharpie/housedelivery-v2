import { ArrowDownRight } from "lucide-react";

import { cn } from "@/lib/cn";

type PortfolioCollection = "custom" | "pre-approved" | "carriage";

type PortfolioCategoryNavProps = {
  active?: PortfolioCollection;
};

const collections = [
  {
    id: "custom" as const,
    number: "01",
    label: "Custom Homes",
    href: "#custom-homes",
  },
  {
    id: "carriage" as const,
    number: "02",
    label: "Laneway & Carriage Homes",
    href: "#laneway-carriage-homes",
  },
  {
    id: "pre-approved" as const,
    number: "03",
    label: "Pre-Reviewed Homes",
    href: "#pre-approved-homes",
  },
];

export function PortfolioCategoryNav({
  active,
}: PortfolioCategoryNavProps) {
  return (
    <nav
      aria-label="Housing portfolio collections"
      className="border-y border-white/20"
    >
      <div className="grid grid-cols-3">
        {collections.map((collection, index) => {
          const isActive = collection.id === active;

          return (
            <a
              key={collection.id}
              href={collection.href}
              aria-current={isActive ? "location" : undefined}
              className={cn(
                "group flex min-h-32 flex-col justify-between gap-5 px-3 py-5 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-[#d5c29f] sm:px-6 lg:min-h-40 lg:px-8 lg:py-7",
                index < collections.length - 1 &&
                  "border-r border-white/10",
                isActive
                  ? "bg-[#b9a17a]/10 text-white"
                  : "text-white/75 hover:bg-[#b9a17a]/10 hover:text-white",
              )}
            >
              <span className="text-2xl font-light tracking-[-0.06em] text-[#c9b48f] lg:text-4xl">
                {collection.number}
              </span>
              <div className="flex items-end justify-between gap-3">
                <span className="max-w-[16rem] text-left text-[9px] font-medium uppercase leading-4 tracking-[0.12em] sm:text-xs sm:leading-5 sm:tracking-[0.16em]">
                  {collection.label}
                </span>
                <ArrowDownRight aria-hidden="true" size={18} className="hidden shrink-0 transition-transform group-hover:translate-x-1 group-hover:translate-y-1 motion-reduce:transform-none sm:block" />
              </div>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
