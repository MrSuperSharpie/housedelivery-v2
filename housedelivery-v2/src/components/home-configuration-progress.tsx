import { Check } from "lucide-react";

import {
  getHomeConfiguratorJourneyCategories,
  getProjectCoordinatedCategories,
  isCategoryComplete,
  type HomeConfiguration,
  type HomeConfiguratorDefinition,
  type HomeInclusionCategory,
} from "@/data/home-configurator";
import { cn } from "@/lib/cn";

type HomeConfigurationProgressProps = {
  definition: HomeConfiguratorDefinition;
  configuration: HomeConfiguration;
  activeCategoryId: string | null;
  onEditCategory: (categoryId: string) => void;
};

function getStatusLabel(
  category: HomeInclusionCategory,
  configuration: HomeConfiguration,
  isActive: boolean,
) {
  if (category.kind === "coordinated") return "Coordinated";
  if (isCategoryComplete(category, configuration)) return "Complete";
  return isActive ? "In progress" : "Remaining";
}

export function HomeConfigurationProgress({
  definition,
  configuration,
  activeCategoryId,
  onEditCategory,
}: HomeConfigurationProgressProps) {
  const requiredCategories = getHomeConfiguratorJourneyCategories(definition);
  const displayedCategories = [
    ...requiredCategories,
    ...getProjectCoordinatedCategories(definition),
  ];
  const completeCount = requiredCategories.filter((category) =>
    isCategoryComplete(category, configuration),
  ).length;
  const activeCategory = definition.categories.find(
    (category) => category.id === activeCategoryId,
  );
  const progress =
    requiredCategories.length === 0
      ? 0
      : (completeCount / requiredCategories.length) * 100;

  function renderCategory(category: HomeInclusionCategory) {
    const isActive = category.id === activeCategoryId;
    const isComplete = isCategoryComplete(category, configuration);
    const isEditable = category.kind !== "coordinated" && isComplete;
    const statusLabel = getStatusLabel(category, configuration, isActive);
    const content = (
      <>
        <span className="font-mono text-[9px] tracking-[0.14em] text-white/55">
          {category.number}
        </span>
        <span className="min-w-0 flex-1 text-left text-xs font-medium tracking-[-0.01em]">
          {category.shortTitle}
        </span>
        {isComplete ? (
          <Check aria-hidden="true" className="size-3" strokeWidth={2} />
        ) : (
          <span className="text-[7px] font-semibold uppercase tracking-[0.13em] text-white/55">
            {statusLabel}
          </span>
        )}
      </>
    );

    return (
      <li key={category.id} className="border-b border-white/8 last:border-b-0">
        {isEditable ? (
          <button
            type="button"
            onClick={() => onEditCategory(category.id)}
            aria-label={`Edit ${category.title}`}
            className="flex min-h-11 w-full items-center gap-3 px-4 text-white/64 transition-colors hover:bg-white/[0.03] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white"
          >
            {content}
          </button>
        ) : (
          <div
            aria-current={isActive ? "step" : undefined}
            className={cn(
              "flex items-center gap-3",
              "min-h-11 px-4",
              isActive
                ? "bg-white/[0.045] text-white"
                : "text-white/55",
            )}
          >
            {content}
          </div>
        )}
      </li>
    );
  }

  return (
    <nav aria-label={`${definition.homeName} configuration progress`}>
      <div className="border-b border-white/14 pb-6">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.19em] text-white/55">
              My {definition.residenceLabel}
            </p>
            <p className="mt-3 text-xl font-medium tracking-[-0.035em] text-white/82">
              {activeCategory
                ? `${activeCategory.number} / ${String(requiredCategories.length).padStart(2, "0")} · ${activeCategory.shortTitle}`
                : "Selections ready to review"}
            </p>
          </div>
          <span className="font-mono text-[10px] tracking-[0.14em] text-white/55">
            {completeCount} / {requiredCategories.length}
          </span>
        </div>
        <div className="mt-5 h-px bg-white/12">
          <div
            className="h-px bg-white transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <details className="group mt-5 border border-white/10">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-5 px-4 text-[9px] font-semibold uppercase tracking-[0.17em] text-white/54 marker:content-none">
          <span>View configuration chapters</span>
          <span aria-hidden="true" className="text-white/55 group-open:hidden">
            +
          </span>
          <span
            aria-hidden="true"
            className="hidden text-white/55 group-open:inline"
          >
            −
          </span>
        </summary>
        <ol className="max-h-[52vh] overflow-y-auto border-t border-white/10">
          {displayedCategories.map((category) =>
            renderCategory(category),
          )}
        </ol>
      </details>
    </nav>
  );
}
