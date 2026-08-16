import { Check, ChevronDown } from "lucide-react";

import type { HomeDesignDirection } from "@/data/home-design-collections";
import {
  getHomeInclusionLevelLabel,
  getRequiredCategories,
  getSelectedFlooringOption,
  getSelectedStandardOption,
  isCategoryComplete,
  type HomeConfiguration,
  type HomeConfiguratorDefinition,
} from "@/data/home-configurator";

type HomeConfigurationSummaryProps = {
  variant: "compact" | "sticky";
  definition: HomeConfiguratorDefinition;
  configuration: HomeConfiguration;
  designDirection: HomeDesignDirection;
};

function HomeConfigurationEntries({
  definition,
  configuration,
}: Pick<HomeConfigurationSummaryProps, "definition" | "configuration">) {
  return (
    <ol className="mt-6 divide-y divide-black/10 border-y border-black/12">
      {definition.categories.map((category) => {
        const isComplete = isCategoryComplete(category, configuration);

        return (
          <li key={category.id} className="grid grid-cols-[1fr_auto] gap-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-[-0.015em] text-black/68">
                {category.title}
              </p>

              {category.kind === "standard" ? (
                <p className="mt-1 text-[10px] leading-4 text-black/58">
                  {isComplete
                    ? (() => {
                        const option = getSelectedStandardOption(
                          category,
                          configuration,
                        );
                        return option
                          ? `${option.name} · ${getHomeInclusionLevelLabel(option.level)}`
                          : "Not yet selected";
                      })()
                    : "Not yet selected"}
                </p>
              ) : category.kind === "flooring" ? (
                <ul className="mt-1 grid gap-1">
                  {category.zones.map((zone) => {
                    const option = getSelectedFlooringOption(
                      zone,
                      configuration,
                    );
                    return (
                      <li
                        key={zone.id}
                        className="text-[10px] leading-4 text-black/58"
                      >
                        {zone.shortTitle}: {option?.name ?? "Not yet selected"}
                        {option
                          ? ` · ${getHomeInclusionLevelLabel(option.level)}`
                          : ""}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-1 text-[10px] leading-4 text-black/58">
                  {category.coordinatedMessage}
                </p>
              )}
            </div>

            {isComplete ? (
              <Check
                aria-label="Complete"
                className="mt-0.5 size-3.5 text-black/54"
                strokeWidth={2}
              />
            ) : (
              <span className="pt-0.5 font-mono text-[8px] tracking-[0.12em] text-black/58">
                {category.kind === "coordinated" ? "CO" : category.number}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function HomeConfigurationSummary({
  variant,
  definition,
  configuration,
  designDirection,
}: HomeConfigurationSummaryProps) {
  const requiredCategories = getRequiredCategories(definition);
  const completeCount = requiredCategories.filter((category) =>
    isCategoryComplete(category, configuration),
  ).length;

  if (variant === "compact") {
    return (
      <details className="group border border-black/12 bg-[#e7e3d8] text-[#111216]">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 px-5 marker:content-none">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/58">
              My {definition.homeName}
            </p>
            <p className="mt-1 text-sm font-medium text-black/70">
              {completeCount} of {requiredCategories.length} chapters complete
            </p>
          </div>
          <ChevronDown
            aria-hidden="true"
            className="size-4 transition-transform group-open:rotate-180"
            strokeWidth={1.5}
          />
        </summary>
        <div className="border-t border-black/12 px-5 pb-6 pt-5">
          <p className="text-xs leading-5 text-black/58">
            {definition.residenceLabel} · {designDirection.name} Design Direction
          </p>
          <HomeConfigurationEntries
            definition={definition}
            configuration={configuration}
          />
        </div>
      </details>
    );
  }

  return (
    <aside
      aria-labelledby={`my-${definition.homeId}-heading`}
      className="max-h-[calc(100vh-7rem)] overflow-y-auto bg-[#e7e3d8] p-7 text-[#111216]"
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/58">
        Evolving specification book
      </p>
      <h2
        id={`my-${definition.homeId}-heading`}
        className="mt-4 text-4xl font-medium tracking-[-0.06em]"
      >
        My {definition.homeName}
      </h2>
      <dl className="mt-6 grid grid-cols-2 border-l border-t border-black/12">
        <div className="border-b border-r border-black/12 p-4">
          <dt className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/58">
            Residence
          </dt>
          <dd className="mt-3 text-sm font-medium text-black/72">
            {definition.homeName}
          </dd>
        </div>
        <div className="border-b border-r border-black/12 p-4">
          <dt className="text-[8px] font-semibold uppercase tracking-[0.16em] text-black/58">
            Direction
          </dt>
          <dd className="mt-3 text-sm font-medium text-black/72">
            {designDirection.name}
          </dd>
        </div>
      </dl>
      <HomeConfigurationEntries
        definition={definition}
        configuration={configuration}
      />
      <p className="mt-5 text-[10px] leading-5 text-black/58">
        {completeCount} of {requiredCategories.length} controlled chapters
        complete. Final products and availability are confirmed during project
        review.
      </p>
    </aside>
  );
}
