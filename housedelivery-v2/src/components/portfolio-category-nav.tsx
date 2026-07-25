import { cn } from "@/lib/cn";

type PortfolioCollection = "custom" | "pre-approved";

type PortfolioCategoryNavProps = {
  active: PortfolioCollection;
};

const collections = [
  {
    id: "custom" as const,
    number: "01",
    label: "Custom Collection",
    href: "#models",
  },
  {
    id: "pre-approved" as const,
    number: "02",
    label: "Pre-Approved Catalogue",
    href: "#cmhc",
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
      <div className="grid grid-cols-2">
        {collections.map((collection, index) => {
          const isActive = collection.id === active;

          return (
            <a
              key={collection.id}
              href={collection.href}
              aria-current={isActive ? "location" : undefined}
              className={cn(
                "group flex min-h-20 items-center justify-between gap-4 px-4 py-5 transition-colors duration-500 sm:px-6",
                index === 0 && "border-r border-white/10",
                isActive
                  ? "bg-white/[0.04] text-white"
                  : "text-white/45 hover:bg-white/[0.025] hover:text-white/90",
              )}
            >
              <span className="text-[10px] tracking-[0.24em] text-white/35">
                {collection.number}
              </span>
              <span className="text-right text-[10px] font-medium uppercase tracking-[0.18em] sm:text-xs sm:tracking-[0.24em]">
                {collection.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
