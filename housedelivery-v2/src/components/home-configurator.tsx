"use client";

import { useState } from "react";

import { HomeConfigurationProgress } from "@/components/home-configuration-progress";
import { HomeConfigurationSummary } from "@/components/home-configuration-summary";
import { HomeCoordinatedCategory } from "@/components/home-coordinated-category";
import { HomeConfiguratorJourney } from "@/components/home-configurator-journey";
import { HomeDesignCollections } from "@/components/home-design-collections";
import { HomeFlooringCategory } from "@/components/home-flooring-category";
import { HomeInclusionCategory } from "@/components/home-inclusion-category";
import { HomeLookBook } from "@/components/home-look-book";
import type { HomeDesignDirectionId } from "@/data/home-design-collections";
import {
  createDefaultHomeConfiguration,
  getDisplayedFlooringOption,
  getDisplayedStandardOption,
  getRequiredCategories,
  isCategoryComplete,
  type HomeConfiguration,
  type HomeConfiguratorDefinition,
  type HomeFlooringCategory as HomeFlooringCategoryData,
  type HomeInclusionCategory as HomeInclusionCategoryData,
  type HomeStandardInclusionCategory,
} from "@/data/home-configurator";

type HomeConfiguratorProps = {
  definition: HomeConfiguratorDefinition;
};

function getNextIncompleteCategory(
  definition: HomeConfiguratorDefinition,
  configuration: HomeConfiguration,
  currentCategoryId: string,
) {
  const requiredCategories = getRequiredCategories(definition);
  const currentIndex = requiredCategories.findIndex(
    (category) => category.id === currentCategoryId,
  );
  const searchOrder = [
    ...requiredCategories.slice(currentIndex + 1),
    ...requiredCategories.slice(0, currentIndex),
  ];

  return searchOrder.find(
    (category) => !isCategoryComplete(category, configuration),
  );
}

function focusConfigurationTarget(targetId: string) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId);
      if (!target) return;

      const top = target.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      target?.focus({ preventScroll: true });
    });
  });
}

export function HomeConfigurator({ definition }: HomeConfiguratorProps) {
  const [configuration, setConfiguration] = useState<HomeConfiguration>(() =>
    createDefaultHomeConfiguration(definition),
  );
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    () => getRequiredCategories(definition)[0]?.id ?? null,
  );
  const [activeFlooringZoneId, setActiveFlooringZoneId] = useState<
    string | null
  >(() => {
    const firstCategory = getRequiredCategories(definition)[0];
    return firstCategory?.kind === "flooring"
      ? firstCategory.zones[0]?.id ?? null
      : null;
  });
  const selectedDirection = definition.designDirections.directions.find(
    (direction) => direction.id === configuration.designDirectionId,
  );

  if (!selectedDirection) {
    throw new Error(
      `The selected ${definition.homeName} Design Direction is invalid.`,
    );
  }

  const requiredCategories = getRequiredCategories(definition);
  const completedCount = requiredCategories.filter((category) =>
    isCategoryComplete(category, configuration),
  ).length;

  function selectDesignDirection(directionId: HomeDesignDirectionId) {
    setConfiguration((current) => ({
      ...current,
      designDirectionId: directionId,
      reviewStatus: "draft",
    }));
  }

  function selectStandardOption(
    category: HomeStandardInclusionCategory,
    optionId: string,
  ) {
    if (!category.options.some((option) => option.id === optionId)) return;

    setConfiguration((current) => {
      const currentStatus = current.inclusionSelections[category.id]?.status;
      return {
        ...current,
        inclusionSelections: {
          ...current.inclusionSelections,
          [category.id]: {
            optionId,
            status: currentStatus === "confirmed" ? "confirmed" : "draft",
          },
        },
        reviewStatus: "draft",
      };
    });
  }

  function selectFlooringOption(
    category: HomeFlooringCategoryData,
    zoneId: string,
    optionId: string,
  ) {
    const zone = category.zones.find((candidate) => candidate.id === zoneId);
    if (!zone?.options.some((option) => option.id === optionId)) return;

    setConfiguration((current) => {
      const currentStatus = current.flooringSelections[zoneId]?.status;
      return {
        ...current,
        flooringSelections: {
          ...current.flooringSelections,
          [zoneId]: {
            optionId,
            status: currentStatus === "confirmed" ? "confirmed" : "draft",
          },
        },
        reviewStatus: "draft",
      };
    });
  }

  function confirmStandardCategory(category: HomeStandardInclusionCategory) {
    const option = getDisplayedStandardOption(category, configuration);
    if (!option) return;

    const nextConfiguration: HomeConfiguration = {
      ...configuration,
      inclusionSelections: {
        ...configuration.inclusionSelections,
        [category.id]: { optionId: option.id, status: "confirmed" },
      },
      reviewStatus: "draft",
    };
    const nextCategory = getNextIncompleteCategory(
      definition,
      nextConfiguration,
      category.id,
    );

    setConfiguration(nextConfiguration);
    setActiveCategoryId(nextCategory?.id ?? null);
    setActiveFlooringZoneId(
      nextCategory?.kind === "flooring"
        ? nextCategory.zones[0]?.id ?? null
        : null,
    );
    focusConfigurationTarget(
      nextCategory ? `home-category-${nextCategory.id}` : "home-look-book",
    );
  }

  function confirmFlooringZone(
    category: HomeFlooringCategoryData,
    zoneId: string,
  ) {
    const zone = category.zones.find((candidate) => candidate.id === zoneId);
    if (!zone) return;
    const option = getDisplayedFlooringOption(zone, configuration);
    if (!option) return;

    const nextConfiguration: HomeConfiguration = {
      ...configuration,
      flooringSelections: {
        ...configuration.flooringSelections,
        [zone.id]: { optionId: option.id, status: "confirmed" },
      },
      reviewStatus: "draft",
    };
    const zoneIndex = category.zones.findIndex(
      (candidate) => candidate.id === zone.id,
    );
    const zoneSearchOrder = [
      ...category.zones.slice(zoneIndex + 1),
      ...category.zones.slice(0, zoneIndex),
    ];
    const nextZone = zoneSearchOrder.find(
      (candidate) =>
        nextConfiguration.flooringSelections[candidate.id]?.status !==
        "confirmed",
    );

    if (nextZone) {
      setConfiguration(nextConfiguration);
      setActiveCategoryId(category.id);
      setActiveFlooringZoneId(nextZone.id);
      focusConfigurationTarget(`home-flooring-zone-${nextZone.id}`);
      return;
    }

    const nextCategory = getNextIncompleteCategory(
      definition,
      nextConfiguration,
      category.id,
    );

    setConfiguration(nextConfiguration);
    setActiveCategoryId(nextCategory?.id ?? null);
    setActiveFlooringZoneId(
      nextCategory?.kind === "flooring"
        ? nextCategory.zones[0]?.id ?? null
        : null,
    );
    focusConfigurationTarget(
      nextCategory ? `home-category-${nextCategory.id}` : "home-look-book",
    );
  }

  function editCategory(categoryId: string, zoneId?: string) {
    const category = definition.categories.find(
      (candidate) => candidate.id === categoryId,
    );
    if (!category || category.kind === "coordinated") return;

    setActiveCategoryId(categoryId);
    if (category.kind === "flooring") {
      const targetZoneId =
        category.zones.find((zone) => zone.id === zoneId)?.id ??
        category.zones[0]?.id ??
        null;
      setActiveFlooringZoneId(targetZoneId);
      focusConfigurationTarget(
        targetZoneId
          ? `home-flooring-zone-${targetZoneId}`
          : `home-category-${categoryId}`,
      );
      return;
    }

    setActiveFlooringZoneId(null);
    focusConfigurationTarget(`home-category-${categoryId}`);
  }

  function getNextCategoryTitle(
    category: HomeInclusionCategoryData,
  ): string | undefined {
    return getNextIncompleteCategory(
      definition,
      configuration,
      category.id,
    )?.shortTitle;
  }

  return (
    <div
      id="home-configurator"
      data-home-configuration={definition.homeId}
      data-review-status={configuration.reviewStatus}
    >
      <HomeDesignCollections
        experience={definition.designDirections}
        selectedDirectionId={configuration.designDirectionId}
        onSelectDirection={selectDesignDirection}
      />

      <section
        id="home-inclusions"
        aria-labelledby="home-inclusions-heading"
        className="scroll-mt-20 border-b border-white/10 bg-[#0b0c10] px-5 py-24 sm:px-8 lg:px-12 lg:py-36"
      >
        <div className="mx-auto max-w-[1504px]">
          <div className="mb-16 lg:mb-24">
            <HomeConfiguratorJourney
              currentStage="configure"
              ariaLabel={`${definition.homeName} configuration journey`}
              homeName={definition.homeName}
            />
          </div>

          <div className="grid gap-12 border-t border-white/15 pt-7 lg:grid-cols-[0.78fr_1.22fr] lg:items-end lg:gap-20">
            <div>
              <p
                className="eyebrow"
                style={{ color: "rgb(255 255 255 / 0.6)" }}
              >
                My {definition.homeName} / Controlled inclusions
              </p>
              <h2
                id="home-inclusions-heading"
                className="mt-7 text-[clamp(3.8rem,8vw,8.5rem)] font-medium leading-[0.84] tracking-[-0.075em]"
              >
                Build the
                <br />
                <span className="text-white/55">specification.</span>
              </h2>
            </div>
            <div className="max-w-2xl lg:justify-self-end">
              <p className="text-base leading-8 text-white/56 lg:text-lg">
                Configure one chapter at a time. Completed choices collapse
                into a clear record, remain editable, and accumulate in My {definition.homeName} without locking the rest of the home to one level.
              </p>
              <p className="mt-5 text-xs leading-6 text-white/55">
                {definition.homeName} starts from a Premium baseline. Signature
                upgrades can be selected independently in every available
                category.
              </p>
            </div>
          </div>

          <p className="sr-only" aria-live="polite">
            {activeCategoryId
              ? `Now configuring ${definition.categories.find((category) => category.id === activeCategoryId)?.title}. ${completedCount} of ${requiredCategories.length} chapters complete.`
              : `All ${completedCount} required chapters complete. Review My ${definition.homeName}.`}
          </p>

          <div className="mt-16 grid items-start gap-8 lg:mt-24 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)_18rem] xl:gap-6 2xl:grid-cols-[18rem_minmax(0,1fr)_20rem] 2xl:gap-8">
            <div className="lg:sticky lg:top-24">
              <HomeConfigurationProgress
                definition={definition}
                configuration={configuration}
                activeCategoryId={activeCategoryId}
                onEditCategory={editCategory}
              />
            </div>

            <div className="min-w-0">
              <div className="sticky top-[4.75rem] z-30 xl:hidden">
                <HomeConfigurationSummary
                  variant="compact"
                  definition={definition}
                  configuration={configuration}
                  designDirection={selectedDirection}
                />
              </div>

              <div className="mt-5 grid gap-3 xl:mt-0">
                {definition.categories.map((category) => {
                  if (category.kind === "coordinated") {
                    return (
                      <HomeCoordinatedCategory
                        key={category.id}
                        category={category}
                      />
                    );
                  }

                  const isComplete = isCategoryComplete(
                    category,
                    configuration,
                  );
                  const isActive = activeCategoryId === category.id;

                  if (category.kind === "flooring") {
                    const selectedOptions = Object.fromEntries(
                      category.zones.map((zone) => [
                        zone.id,
                        getDisplayedFlooringOption(zone, configuration),
                      ]),
                    );

                    return (
                      <HomeFlooringCategory
                        key={category.id}
                        houseName={definition.homeName}
                        disclaimer={definition.disclaimer}
                        category={category}
                        categoryCount={requiredCategories.length}
                        selectedOptions={selectedOptions}
                        confirmedZoneIds={category.zones
                          .filter(
                            (zone) =>
                              configuration.flooringSelections[zone.id]
                                ?.status === "confirmed",
                          )
                          .map((zone) => zone.id)}
                        activeZoneId={activeFlooringZoneId}
                        isActive={isActive}
                        isComplete={isComplete}
                        onSelectOption={(zoneId, optionId) =>
                          selectFlooringOption(category, zoneId, optionId)
                        }
                        onConfirmZone={(zoneId) =>
                          confirmFlooringZone(category, zoneId)
                        }
                        onEditZone={(zoneId) =>
                          editCategory(category.id, zoneId)
                        }
                      />
                    );
                  }

                  return (
                    <HomeInclusionCategory
                      key={category.id}
                      houseName={definition.homeName}
                      disclaimer={definition.disclaimer}
                      category={category}
                      categoryCount={requiredCategories.length}
                      selectedOption={getDisplayedStandardOption(
                        category,
                        configuration,
                      )}
                      isActive={isActive}
                      isComplete={isComplete}
                      nextCategoryTitle={getNextCategoryTitle(category)}
                      onSelectOption={(optionId) =>
                        selectStandardOption(category, optionId)
                      }
                      onConfirm={() => confirmStandardCategory(category)}
                      onEdit={() => editCategory(category.id)}
                    />
                  );
                })}
              </div>
            </div>

            <div className="hidden xl:sticky xl:top-24 xl:block">
              <HomeConfigurationSummary
                variant="sticky"
                definition={definition}
                configuration={configuration}
                designDirection={selectedDirection}
              />
            </div>
          </div>
        </div>
      </section>

      <HomeLookBook
        definition={definition}
        configuration={configuration}
        designDirection={selectedDirection}
        onEditCategory={editCategory}
        onSubmit={() =>
          setConfiguration((current) => ({
            ...current,
            reviewStatus: "ready-for-review",
          }))
        }
      />
    </div>
  );
}
