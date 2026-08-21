"use client";

import { useCallback, useState } from "react";

import { HomeConfigurationProgress } from "@/components/home-configuration-progress";
import { HomeConfigurationSummary } from "@/components/home-configuration-summary";
import { HomeCoordinatedCategory } from "@/components/home-coordinated-category";
import { HomeConfiguratorJourney } from "@/components/home-configurator-journey";
import { HomeFlooringCategory } from "@/components/home-flooring-category";
import { HomeImagePreview } from "@/components/home-image-preview";
import { HomeInclusionCategory } from "@/components/home-inclusion-category";
import { HomeLookBook } from "@/components/home-look-book";
import {
  createDefaultHomeConfiguration,
  getDisplayedFlooringOption,
  getDisplayedInclusionOption,
  getRequiredCategories,
  isCategoryComplete,
  type HomeConfiguration,
  type HomeConfiguratorDefinition,
  type HomeFlooringCategory as HomeFlooringCategoryData,
  type HomeInclusionCategory as HomeInclusionCategoryData,
  type HomeSelectableInclusionCategory,
} from "@/data/home-configurator";
import {
  createLookBookReference,
  type LookBookCustomer,
} from "@/data/home-look-book";

type HomeConfiguratorProps = {
  definition: HomeConfiguratorDefinition;
};

type HomeImagePreviewTarget = {
  categoryId: string;
  optionId: string;
  zoneId?: string;
  returnFocusId: string;
};

const configurationOrientation = [
  {
    label: "Choose",
    detail: () => "Key room looks and finishes",
  },
  {
    label: "Build",
    detail: (homeName: string) => `Your personalized ${homeName}`,
  },
  {
    label: "Review",
    detail: () => "Your complete Look Book",
  },
] as const;

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
  const [imagePreviewTarget, setImagePreviewTarget] =
    useState<HomeImagePreviewTarget | null>(null);
  const closeImagePreview = useCallback(() => {
    setImagePreviewTarget(null);
  }, []);
  const requiredCategories = getRequiredCategories(definition);
  const completedCount = requiredCategories.filter((category) =>
    isCategoryComplete(category, configuration),
  ).length;
  const imagePreview = (() => {
    if (!imagePreviewTarget) return undefined;

    const category = definition.categories.find(
      (candidate) => candidate.id === imagePreviewTarget.categoryId,
    );
    if (!category || category.kind === "coordinated") return undefined;

    if (category.kind === "standard" || category.kind === "room-look") {
      const option = category.options.find(
        (candidate) => candidate.id === imagePreviewTarget.optionId,
      );
      if (!option) return undefined;

      return {
        category,
        option,
        isSelected:
          getDisplayedInclusionOption(category, configuration)?.id ===
          option.id,
      };
    }

    const zone = category.zones.find(
      (candidate) => candidate.id === imagePreviewTarget.zoneId,
    );
    const option = zone?.options.find(
      (candidate) => candidate.id === imagePreviewTarget.optionId,
    );
    if (!zone || !option) return undefined;

    return {
      category,
      zone,
      option,
      isSelected:
        getDisplayedFlooringOption(zone, configuration)?.id === option.id,
    };
  })();
  const imagePreviewOptions = imagePreview
    ? imagePreview.category.kind === "flooring"
      ? (imagePreview.zone?.options ?? [])
      : imagePreview.category.options
    : [];
  const imagePreviewOptionIndex = imagePreview
    ? imagePreviewOptions.findIndex(
        (option) => option.id === imagePreview.option.id,
      )
    : -1;

  function selectInclusionOption(
    category: HomeSelectableInclusionCategory,
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

  function selectImagePreviewOption() {
    if (!imagePreview) return;

    if (
      imagePreview.category.kind === "standard" ||
      imagePreview.category.kind === "room-look"
    ) {
      selectInclusionOption(imagePreview.category, imagePreview.option.id);
      return;
    }

    if (imagePreview.zone) {
      selectFlooringOption(
        imagePreview.category,
        imagePreview.zone.id,
        imagePreview.option.id,
      );
    }
  }

  function showAdjacentImagePreviewOption(offset: -1 | 1) {
    if (!imagePreviewTarget || imagePreviewOptionIndex < 0) return;

    const option = imagePreviewOptions[imagePreviewOptionIndex + offset];
    if (!option) return;

    setImagePreviewTarget({
      ...imagePreviewTarget,
      optionId: option.id,
    });
  }

  function confirmInclusionCategory(
    category: HomeSelectableInclusionCategory,
  ) {
    const option = getDisplayedInclusionOption(category, configuration);
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

  function createLookBook(customer: LookBookCustomer) {
    const preparedAt = new Date();

    setConfiguration((current) => ({
      ...current,
      lookBookPersonalization: {
        customer,
        preparedAt: preparedAt.toISOString(),
        reference: createLookBookReference(definition.homeId, preparedAt),
      },
    }));

    focusConfigurationTarget("home-look-book");
  }

  return (
    <div
      id="home-configurator"
      data-home-configuration={definition.homeId}
      data-home-configuration-version={configuration.schemaVersion}
      data-review-status={configuration.reviewStatus}
    >
      <section
        id="home-inclusions"
        aria-labelledby="home-inclusions-heading"
        className="scroll-mt-24 border-b border-white/10 bg-[#0b0c10] px-5 py-24 sm:px-8 lg:px-12 lg:py-36"
      >
        <div id="design-collections" className="mx-auto max-w-[1504px] scroll-mt-20">
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
                Design your {definition.homeName}
              </p>
              <h2
                id="home-inclusions-heading"
                className="mt-7 text-[clamp(3.8rem,8vw,8.5rem)] font-medium leading-[0.84] tracking-[-0.075em]"
              >
                Build My
                <br />
                <span className="text-white/55">{definition.homeName}.</span>
              </h2>
            </div>
            <div className="max-w-2xl lg:justify-self-end">
              <p className="text-base leading-8 text-white/56 lg:text-lg">
                Choose the major spaces and finishes that establish the
                character of your home. Your selections create a personalized
                visual brief and Look Book for the next project-specific design
                stage.
              </p>
              <p className="mt-5 text-xs leading-6 text-white/55">
                Create the visual brief for your home in{" "}
                {requiredCategories.length} controlled choices. Start with the
                kitchen, then move through the major spaces and finishes that
                define your {definition.homeName}. Begin with the Premium
                baseline and selectively choose Signature upgrades.
              </p>
              <p className="mt-5 border-t border-white/12 pt-5 text-[10px] leading-5 text-white/50">
                {definition.disclaimer}
              </p>
            </div>
          </div>

          <ol
            aria-label={`How to design your ${definition.homeName}`}
            data-home-configuration-orientation
            className="mt-12 grid border-l border-t border-white/14 sm:grid-cols-3 lg:mt-16"
          >
            {configurationOrientation.map((step, index) => (
              <li
                key={step.label}
                className="relative min-h-28 border-b border-r border-white/14 p-5 sm:min-h-32 sm:p-6"
              >
                <div className="flex items-center justify-between gap-5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/62">
                    {step.label}
                  </p>
                  <span
                    aria-hidden="true"
                    className="font-mono text-[9px] tracking-[0.14em] text-white/55"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-6 max-w-xs text-sm leading-6 text-white/48">
                  {step.detail(definition.homeName)}
                </p>
                {index < configurationOrientation.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute -right-2.5 top-1/2 z-10 hidden -translate-y-1/2 bg-[#0b0c10] px-1 text-sm text-white/55 sm:block"
                  >
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>

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
                        onPreviewOption={(zoneId, optionId) =>
                          setImagePreviewTarget({
                            categoryId: category.id,
                            zoneId,
                            optionId,
                            returnFocusId: `home-option-preview-trigger-${optionId}`,
                          })
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
                      category={category}
                      categoryCount={requiredCategories.length}
                      selectedOption={getDisplayedInclusionOption(
                        category,
                        configuration,
                      )}
                      showInteractionGuidance={
                        requiredCategories.findIndex(
                          (candidate) => candidate.id === category.id,
                        ) < 2
                      }
                      isStartingCategory={
                        category.id === requiredCategories[0]?.id
                      }
                      isActive={isActive}
                      isComplete={isComplete}
                      nextCategoryTitle={getNextCategoryTitle(category)}
                      onSelectOption={(optionId) =>
                        selectInclusionOption(category, optionId)
                      }
                      onPreviewOption={(optionId) =>
                        setImagePreviewTarget({
                          categoryId: category.id,
                          optionId,
                          returnFocusId: `home-option-preview-trigger-${optionId}`,
                        })
                      }
                      onConfirm={() => confirmInclusionCategory(category)}
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
              />
            </div>
          </div>
        </div>
      </section>

      <HomeLookBook
        definition={definition}
        configuration={configuration}
        onCreateLookBook={createLookBook}
        onEditCategory={editCategory}
        onPreviewOption={(categoryId, optionId, zoneId) =>
          setImagePreviewTarget({
            categoryId,
            optionId,
            zoneId,
            returnFocusId: `home-look-book-preview-trigger-${optionId}-${zoneId ?? categoryId}`,
          })
        }
        onSubmit={() =>
          setConfiguration((current) => ({
            ...current,
            reviewStatus: "ready-for-review",
          }))
        }
      />

      {imagePreview && imagePreviewTarget ? (
        <HomeImagePreview
          option={imagePreview.option}
          homeName={definition.homeName}
          isSelected={imagePreview.isSelected}
          canShowPrevious={imagePreviewOptionIndex > 0}
          canShowNext={
            imagePreviewOptionIndex >= 0 &&
            imagePreviewOptionIndex < imagePreviewOptions.length - 1
          }
          returnFocusId={imagePreviewTarget.returnFocusId}
          onSelect={selectImagePreviewOption}
          onShowPrevious={() => showAdjacentImagePreviewOption(-1)}
          onShowNext={() => showAdjacentImagePreviewOption(1)}
          onClose={closeImagePreview}
        />
      ) : null}
    </div>
  );
}
