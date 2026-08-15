import { Check, ChevronDown } from "lucide-react";

import type { HomeDesignDirection } from "@/data/home-design-collections";
import type {
  SolaceInclusionCategory,
  SolaceInclusionOption,
} from "@/data/solace-configuration";

export type ResolvedSolaceSelection = {
  category: SolaceInclusionCategory;
  option: SolaceInclusionOption;
};

type MySolaceSummaryProps = {
  variant: "compact" | "sticky";
  designDirection: HomeDesignDirection;
  categories: readonly SolaceInclusionCategory[];
  completedSelections: readonly ResolvedSolaceSelection[];
};

function MySolaceEntries({
  categories,
  completedSelections,
}: Pick<MySolaceSummaryProps, "categories" | "completedSelections">) {
  const completedByCategory = new Map(
    completedSelections.map((selection) => [selection.category.id, selection]),
  );

  return (
    <ol className="mt-6 divide-y divide-black/10 border-y border-black/12">
      {categories.map((category) => {
        const selection = completedByCategory.get(category.id);

        return (
          <li key={category.id} className="grid grid-cols-[1fr_auto] gap-4 py-3">
            <div>
              <p className="text-xs font-medium tracking-[-0.015em] text-black/68">
                {category.title}
              </p>
              <p className="mt-1 text-[10px] leading-4 text-black/42">
                {selection
                  ? selection.option.name
                  : category.status === "coordinated-later"
                    ? "Coordinated with the project"
                    : "Not yet selected"}
              </p>
            </div>
            {selection ? (
              <Check
                aria-label="Complete"
                className="mt-0.5 size-3.5 text-black/54"
                strokeWidth={2}
              />
            ) : (
              <span className="pt-0.5 font-mono text-[8px] tracking-[0.12em] text-black/28">
                {category.number}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function MySolaceSummary({
  variant,
  designDirection,
  categories,
  completedSelections,
}: MySolaceSummaryProps) {
  const selectableCount = categories.filter(
    (category) => category.status === "selectable",
  ).length;

  if (variant === "compact") {
    return (
      <details className="group border border-black/12 bg-[#e7e3d8] text-[#111216]">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 px-5 marker:content-none">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/38">
              My Solace
            </p>
            <p className="mt-1 text-sm font-medium text-black/70">
              {completedSelections.length} of {selectableCount} choices complete
            </p>
          </div>
          <ChevronDown
            aria-hidden="true"
            className="size-4 transition-transform group-open:rotate-180"
            strokeWidth={1.5}
          />
        </summary>
        <div className="border-t border-black/12 px-5 pb-6 pt-5">
          <p className="text-xs leading-5 text-black/48">
            Solace · {designDirection.name} Design Direction
          </p>
          <MySolaceEntries
            categories={categories}
            completedSelections={completedSelections}
          />
        </div>
      </details>
    );
  }

  return (
    <aside
      aria-labelledby="my-solace-heading"
      className="max-h-[calc(100vh-7rem)] overflow-y-auto bg-[#e7e3d8] p-7 text-[#111216]"
    >
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/38">
          Evolving specification book
        </p>
        <h2
          id="my-solace-heading"
          className="mt-4 text-4xl font-medium tracking-[-0.06em]"
        >
          My Solace
        </h2>
        <dl className="mt-6 grid grid-cols-2 border-l border-t border-black/12">
          <div className="border-b border-r border-black/12 p-4">
            <dt className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/38">
              Residence
            </dt>
            <dd className="mt-3 text-sm font-medium text-black/72">Solace</dd>
          </div>
          <div className="border-b border-r border-black/12 p-4">
            <dt className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/38">
              Direction
            </dt>
            <dd className="mt-3 text-sm font-medium text-black/72">
              {designDirection.name}
            </dd>
          </div>
        </dl>
        <MySolaceEntries
          categories={categories}
          completedSelections={completedSelections}
        />
        <p className="mt-5 text-[10px] leading-5 text-black/42">
          {completedSelections.length} of {selectableCount} controlled choices
          complete. Final products and availability are confirmed during project
          review.
        </p>
    </aside>
  );
}
