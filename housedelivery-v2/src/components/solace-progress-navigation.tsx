import { Check } from "lucide-react";

import type {
  SolaceInclusionCategory,
  SolaceInclusionCategoryId,
  SolaceInclusionSelections,
} from "@/data/solace-configuration";
import { cn } from "@/lib/cn";

type SolaceProgressNavigationProps = {
  categories: readonly SolaceInclusionCategory[];
  activeCategoryId: SolaceInclusionCategoryId | null;
  selections: SolaceInclusionSelections;
  onEditCategory: (categoryId: SolaceInclusionCategoryId) => void;
};

export function SolaceProgressNavigation({
  categories,
  activeCategoryId,
  selections,
  onEditCategory,
}: SolaceProgressNavigationProps) {
  const selectableCategories = categories.filter(
    (category) => category.status === "selectable",
  );
  const completeCount = selectableCategories.filter(
    (category) => selections[category.id]?.status === "confirmed",
  ).length;
  const activeCategory = categories.find(
    (category) => category.id === activeCategoryId,
  );
  const progress =
    selectableCategories.length === 0
      ? 0
      : (completeCount / selectableCategories.length) * 100;

  return (
    <nav aria-label="Solace configuration progress">
      <div className="border-b border-white/14 pb-6">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.19em] text-white/42">
              Configuration progress
            </p>
            <p className="mt-3 text-xl font-medium tracking-[-0.035em] text-white/82">
              {activeCategory
                ? `${activeCategory.number} / ${String(categories.length).padStart(2, "0")} · ${activeCategory.shortTitle}`
                : "Selections ready to review"}
            </p>
          </div>
          <span className="font-mono text-[10px] tracking-[0.14em] text-white/38">
            {completeCount} / {selectableCategories.length}
          </span>
        </div>
        <div className="mt-5 h-px bg-white/12">
          <div
            className="h-px bg-white transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <details className="group mt-5 border border-white/10 sm:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-5 px-4 text-[9px] font-semibold uppercase tracking-[0.17em] text-white/54 marker:content-none">
          <span>View all {categories.length} categories</span>
          <span aria-hidden="true" className="text-white/30 group-open:hidden">
            +
          </span>
          <span aria-hidden="true" className="hidden text-white/30 group-open:inline">
            −
          </span>
        </summary>
        <ol className="border-t border-white/10">
          {categories.map((category) => {
            const isActive = category.id === activeCategoryId;
            const isComplete = selections[category.id]?.status === "confirmed";
            const content = (
              <>
                <span className="font-mono text-[9px] tracking-[0.14em] text-white/30">
                  {category.number}
                </span>
                <span className="min-w-0 flex-1 text-left text-xs">
                  {category.shortTitle}
                </span>
                <span className="text-[7px] font-semibold uppercase tracking-[0.13em] text-white/30">
                  {category.status === "coordinated-later"
                    ? "Later"
                    : isComplete
                      ? "Complete"
                      : isActive
                        ? "Active"
                        : "Ahead"}
                </span>
              </>
            );

            return (
              <li key={category.id} className="border-b border-white/8 last:border-b-0">
                {isComplete ? (
                  <button
                    type="button"
                    onClick={() => onEditCategory(category.id)}
                    aria-label={`Edit ${category.title}`}
                    className="flex min-h-11 w-full items-center gap-3 px-4 text-white/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white"
                  >
                    {content}
                  </button>
                ) : (
                  <div
                    aria-current={isActive ? "step" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 px-4",
                      isActive ? "bg-white/[0.04] text-white" : "text-white/38",
                    )}
                  >
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </details>

      <ol className="mt-5 hidden gap-px bg-white/8 sm:grid sm:grid-cols-2 lg:grid-cols-1">
        {categories.map((category) => {
          const isActive = category.id === activeCategoryId;
          const isComplete = selections[category.id]?.status === "confirmed";
          const statusLabel =
            category.status === "coordinated-later"
              ? "Coordinated later"
              : isComplete
                ? "Complete"
                : isActive
                  ? "In progress"
                  : "Remaining";
          const content = (
            <>
              <span className="font-mono text-[9px] tracking-[0.14em] text-white/30">
                {category.number}
              </span>
              <span className="min-w-0 flex-1 truncate text-left text-xs font-medium tracking-[-0.01em]">
                {category.shortTitle}
              </span>
              {isComplete ? (
                <Check aria-hidden="true" className="size-3" strokeWidth={2} />
              ) : (
                <span className="text-[7px] font-semibold uppercase tracking-[0.14em] text-white/30">
                  {statusLabel}
                </span>
              )}
            </>
          );

          return (
            <li key={category.id} className="bg-[#0d0f13]">
              {isComplete ? (
                <button
                  type="button"
                  onClick={() => onEditCategory(category.id)}
                  aria-label={`Edit ${category.title}`}
                  className="flex min-h-12 w-full items-center gap-3 px-4 text-white/64 transition-colors hover:bg-white/[0.03] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white"
                >
                  {content}
                </button>
              ) : (
                <div
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "flex min-h-12 items-center gap-3 px-4",
                    isActive
                      ? "bg-white/[0.045] text-white"
                      : "text-white/38",
                  )}
                >
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
