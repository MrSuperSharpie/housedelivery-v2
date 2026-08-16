import { Check, ChevronDown } from "lucide-react";
import Image from "next/image";

import {
  getHomeInclusionLevelLabel,
  getRequiredCategories,
  getSelectedInclusionOption,
  getSelectedFlooringOption,
  isCategoryComplete,
  type HomeConfiguration,
  type HomeConfiguratorDefinition,
  type HomeRoomLookCategory,
} from "@/data/home-configurator";

type HomeConfigurationSummaryProps = {
  variant: "compact" | "sticky";
  definition: HomeConfiguratorDefinition;
  configuration: HomeConfiguration;
};

function HomeConfigurationEntries({
  definition,
  configuration,
}: Pick<HomeConfigurationSummaryProps, "definition" | "configuration">) {
  const visibleCategories = definition.categories.filter(
    (category) =>
      category.kind === "coordinated" ||
      isCategoryComplete(category, configuration),
  );

  if (visibleCategories.length === 0) {
    return (
      <p className="mt-6 border-y border-black/12 py-5 text-xs leading-5 text-black/58">
        Confirm your first inclusion to begin My {definition.homeName}.
      </p>
    );
  }

  return (
    <ol className="mt-6 divide-y divide-black/10 border-y border-black/12">
      {visibleCategories.map((category) => {
        const isComplete = isCategoryComplete(category, configuration);
        const previewOption =
          category.kind === "standard" || category.kind === "room-look"
            ? getSelectedInclusionOption(category, configuration)
            : category.kind === "flooring"
              ? getSelectedFlooringOption(category.zones[0], configuration)
              : undefined;

        return (
          <li
            key={category.id}
            className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-start gap-3 py-3"
          >
            {previewOption ? (
              <div className="relative aspect-square overflow-hidden bg-black/8">
                <Image
                  src={previewOption.image.src}
                  alt=""
                  width={96}
                  height={96}
                  quality={90}
                  sizes="48px"
                  className={
                    previewOption.image.fit === "contain"
                      ? "h-full w-full object-contain"
                      : "h-full w-full object-cover"
                  }
                />
              </div>
            ) : (
              <div className="grid aspect-square place-items-center border border-black/10 font-mono text-[8px] text-black/65">
                CO
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-[-0.015em] text-black/68">
                {category.title}
              </p>

              {category.kind === "standard" || category.kind === "room-look" ? (
                <p className="mt-1 text-[10px] leading-4 text-black/58">
                  {previewOption
                    ? `${previewOption.name} · ${getHomeInclusionLevelLabel(previewOption.level)}`
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
}: HomeConfigurationSummaryProps) {
  const requiredCategories = getRequiredCategories(definition);
  const completeCount = requiredCategories.filter((category) =>
    isCategoryComplete(category, configuration),
  ).length;
  const firstCompletedRoomLook = definition.categories.find(
    (category): category is HomeRoomLookCategory =>
      category.kind === "room-look" &&
      isCategoryComplete(category, configuration),
  );
  const visualBriefOption = firstCompletedRoomLook
    ? getSelectedInclusionOption(firstCompletedRoomLook, configuration)
    : undefined;
  const visualBriefImage =
    visualBriefOption?.image ?? definition.architecturalImages[0];

  if (variant === "compact") {
    return (
      <details className="group border border-black/12 bg-[#e7e3d8] text-[#111216]">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 px-5 marker:content-none">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/58">
              My {definition.homeName} · {completeCount}/{requiredCategories.length}
            </p>
            <p className="mt-1 text-sm font-medium text-black/70">
              {completeCount} of {requiredCategories.length} selections confirmed
            </p>
          </div>
          <ChevronDown
            aria-hidden="true"
            className="size-4 transition-transform group-open:rotate-180"
            strokeWidth={1.5}
          />
        </summary>
        <div className="max-h-[62vh] overflow-y-auto border-t border-black/12 px-5 pb-6 pt-5">
          <p className="text-xs leading-5 text-black/58">
            {definition.residenceLabel} · Visual brief in progress
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
      tabIndex={0}
      className="max-h-[calc(100vh-7rem)] overflow-y-auto bg-[#e7e3d8] p-7 text-[#111216] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-black/58">
        Evolving visual brief
      </p>
      <h2
        id={`my-${definition.homeId}-heading`}
        className="mt-4 text-4xl font-medium tracking-[-0.06em]"
      >
        My {definition.homeName}
      </h2>
      <div className="relative mt-6 aspect-[16/10] overflow-hidden bg-black/8">
        <Image
          src={visualBriefImage.src}
          alt=""
          width={1200}
          height={750}
          quality={90}
          sizes="320px"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/8 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="text-[8px] font-semibold uppercase tracking-[0.17em] text-white/64">
            {visualBriefOption ? "Visual brief begins with" : "Residence"}
          </p>
          <p className="mt-2 text-xl font-medium tracking-[-0.04em]">
            {visualBriefOption?.name ?? definition.residenceLabel}
          </p>
        </div>
      </div>
      <p className="mt-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-black/58">
        {definition.residenceLabel}
      </p>
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
