import { Check } from "lucide-react";

import { cn } from "@/lib/cn";

type HomeConfiguratorStage = "configure" | "look-book";

type HomeConfiguratorJourneyProps = {
  currentStage: HomeConfiguratorStage;
  theme?: "dark" | "light";
  ariaLabel?: string;
  homeName?: string;
};

const stages: readonly {
  id: HomeConfiguratorStage;
  number: string;
  label: string;
}[] = [
  { id: "configure", number: "01", label: "Configure My Home" },
  { id: "look-book", number: "02", label: "My Look Book" },
];

export function HomeConfiguratorJourney({
  currentStage,
  theme = "dark",
  ariaLabel = "Home configuration journey",
  homeName = "Home",
}: HomeConfiguratorJourneyProps) {
  const activeIndex = stages.findIndex((stage) => stage.id === currentStage);
  const isDark = theme === "dark";

  return (
    <nav aria-label={ariaLabel}>
      <ol
        className={cn(
          "grid gap-px border",
          "sm:grid-cols-2",
          isDark
            ? "border-white/12 bg-white/10"
            : "border-black/14 bg-black/10",
        )}
      >
        {stages.map((stage, index) => {
          const isActive = stage.id === currentStage;
          const isComplete = index < activeIndex;

          return (
            <li
              key={stage.id}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "flex min-h-12 items-center gap-3 px-4 text-[9px] font-semibold uppercase tracking-[0.16em] sm:min-h-14 sm:px-5",
                isDark ? "bg-[#0e1014]" : "bg-[#e7e3d8]",
                isActive
                  ? isDark
                    ? "text-white"
                    : "text-black/82"
                  : isDark
                    ? "text-white/55"
                    : "text-black/58",
              )}
            >
              <span className="font-mono font-normal">
                {isComplete ? (
                  <Check aria-hidden="true" className="size-3" strokeWidth={2} />
                ) : (
                  stage.number
                )}
              </span>
              <span className="min-w-0 truncate">
                {stage.id === "configure"
                  ? `Configure My ${homeName}`
                  : stage.label}
              </span>
              {isActive ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "ml-auto size-1.5 rounded-full",
                    isDark ? "bg-white" : "bg-black",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
