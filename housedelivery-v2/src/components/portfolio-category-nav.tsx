import { cn } from "@/lib/cn";

type PortfolioCollection = "custom" | "pre-approved" | "carriage";

type PortfolioCategoryNavProps = {
  active?: PortfolioCollection;
};

const collections = [
  {
    id: "pre-approved" as const,
    number: "01",
    label: "Pre-Approved Homes",
    href: "#pre-approved-homes",
  },
  {
    id: "carriage" as const,
    number: "02",
    label: "Laneway & Carriage Homes",
    href: "#carriage-homes",
  },
  {
    id: "custom" as const,
    number: "03",
    label: "Custom Homes",
    href: "#models",
  },
];

export function PortfolioCategoryNav({
  active,
}: PortfolioCategoryNavProps) {
  return (
    <nav
      aria-label="Housing portfolio collections"
      className="border-y border-white/10"
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
                "group flex min-h-20 flex-col justify-between gap-3 px-3 py-4 transition-colors duration-500 sm:flex-row sm:items-center sm:px-6 sm:py-5",
                index < collections.length - 1 &&
                  "border-r border-white/10",
                isActive
                  ? "bg-white/[0.04] text-white"
                  : "text-white/45 hover:bg-white/[0.025] hover:text-white/90",
              )}
            >
              <span className="text-[10px] tracking-[0.24em] text-white/35">
                {collection.number}
              </span>
              <span className="text-left text-[9px] font-medium uppercase leading-4 tracking-[0.14em] sm:text-right sm:text-xs sm:tracking-[0.2em]">
                {collection.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
