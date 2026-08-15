"use client";

import { useState } from "react";

import { HomeDesignCollections } from "@/components/home-design-collections";
import {
  MySolaceSummary,
  type ResolvedSolaceSelection,
} from "@/components/my-solace-summary";
import { SolaceInclusionCategory } from "@/components/solace-inclusion-category";
import { SolaceProgressNavigation } from "@/components/solace-progress-navigation";
import { SolaceReview } from "@/components/solace-review";
import type {
  HomeDesignDirectionId,
  HomeDesignDirectionsExperience,
} from "@/data/home-design-collections";
import {
  defaultSolaceConfiguration,
  type SolaceConfiguration,
  type SolaceInclusionCategory as SolaceInclusionCategoryData,
  type SolaceInclusionCategoryId,
  type SolaceInclusionOption,
  type SolaceInclusionOptionId,
  type SolaceInclusionSelections,
} from "@/data/solace-configuration";

type SolaceConfiguratorProps = {
  experience: HomeDesignDirectionsExperience;
  categories: readonly SolaceInclusionCategoryData[];
};

function getSelectedOption(
  category: SolaceInclusionCategoryData,
  selections: SolaceInclusionSelections,
): SolaceInclusionOption | undefined {
  const optionId = selections[category.id]?.optionId;
  return category.options.find((option) => option.id === optionId);
}

function getDisplayedOption(
  category: SolaceInclusionCategoryData,
  selections: SolaceInclusionSelections,
) {
  return (
    getSelectedOption(category, selections) ??
    category.options.find((option) => option.level === "premium") ??
    category.options[0]
  );
}

function getNextIncompleteCategory(
  categories: readonly SolaceInclusionCategoryData[],
  selections: SolaceInclusionSelections,
  currentCategoryId: SolaceInclusionCategoryId,
) {
  const currentIndex = categories.findIndex(
    (category) => category.id === currentCategoryId,
  );
  const searchOrder = [
    ...categories.slice(currentIndex + 1),
    ...categories.slice(0, currentIndex),
  ];

  return searchOrder.find(
    (category) =>
      category.status === "selectable" &&
      selections[category.id]?.status !== "confirmed",
  );
}

function focusCategory(categoryId: SolaceInclusionCategoryId | null) {
  const targetId = categoryId
    ? `solace-category-${categoryId}`
    : "review-my-solace";

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      target?.focus({ preventScroll: true });
    });
  });
}

export function SolaceConfigurator({
  experience,
  categories,
}: SolaceConfiguratorProps) {
  const [configuration, setConfiguration] = useState<SolaceConfiguration>(
    defaultSolaceConfiguration,
  );
  const [activeCategoryId, setActiveCategoryId] =
    useState<SolaceInclusionCategoryId | null>("kitchen-cabinetry");

  const selectedDirection = experience.directions.find(
    (direction) => direction.id === configuration.designDirectionId,
  );

  if (!selectedDirection) {
    throw new Error("The default Solace Design Direction is invalid.");
  }

  const completedSelections = categories.reduce<ResolvedSolaceSelection[]>(
    (completed, category) => {
      if (configuration.inclusionSelections[category.id]?.status !== "confirmed") {
        return completed;
      }

      const option = getSelectedOption(
        category,
        configuration.inclusionSelections,
      );
      if (option) completed.push({ category, option });
      return completed;
    },
    [],
  );

  function selectDesignDirection(designDirectionId: HomeDesignDirectionId) {
    setConfiguration((current) => ({
      ...current,
      designDirectionId,
    }));
  }

  function selectInclusionOption(
    categoryId: SolaceInclusionCategoryId,
    optionId: SolaceInclusionOptionId,
  ) {
    const category = categories.find((candidate) => candidate.id === categoryId);
    if (!category?.options.some((option) => option.id === optionId)) return;

    setConfiguration((current) => ({
      ...current,
      inclusionSelections: {
        ...current.inclusionSelections,
        [categoryId]: {
          optionId,
          status:
            current.inclusionSelections[categoryId]?.status === "confirmed"
              ? "confirmed"
              : "draft",
        },
      },
    }));
  }

  function confirmCategory(categoryId: SolaceInclusionCategoryId) {
    const category = categories.find((candidate) => candidate.id === categoryId);
    if (!category || category.status !== "selectable") return;

    const selectedOption = getDisplayedOption(
      category,
      configuration.inclusionSelections,
    );
    if (!selectedOption) return;

    const nextSelections: SolaceInclusionSelections = {
      ...configuration.inclusionSelections,
      [categoryId]: {
        optionId: selectedOption.id,
        status: "confirmed",
      },
    };
    const nextCategory = getNextIncompleteCategory(
      categories,
      nextSelections,
      categoryId,
    );

    setConfiguration((current) => ({
      ...current,
      inclusionSelections: {
        ...current.inclusionSelections,
        [categoryId]: {
          optionId: selectedOption.id,
          status: "confirmed",
        },
      },
    }));
    setActiveCategoryId(nextCategory?.id ?? null);
    focusCategory(nextCategory?.id ?? null);
  }

  function editCategory(categoryId: SolaceInclusionCategoryId) {
    const category = categories.find((candidate) => candidate.id === categoryId);
    if (!category || category.status !== "selectable") return;
    setActiveCategoryId(categoryId);
    focusCategory(categoryId);
  }

  return (
    <div id="solace-configurator" data-solace-configuration="active">
      <HomeDesignCollections
        experience={experience}
        selectedDirectionId={configuration.designDirectionId}
        onSelectDirection={selectDesignDirection}
      />

      <section
        id="solace-inclusions"
        aria-labelledby="solace-inclusions-heading"
        className="scroll-mt-20 border-b border-white/10 bg-[#0b0c10] px-5 py-24 sm:px-8 lg:px-12 lg:py-36"
      >
        <div className="mx-auto max-w-[1504px]">
          <div className="grid gap-12 border-t border-white/15 pt-7 lg:grid-cols-[0.78fr_1.22fr] lg:items-end lg:gap-20">
            <div>
              <p className="eyebrow">My Solace / Controlled inclusions</p>
              <h2
                id="solace-inclusions-heading"
                className="mt-7 text-[clamp(3.8rem,8vw,8.5rem)] font-medium leading-[0.84] tracking-[-0.075em]"
              >
                Build the
                <br />
                <span className="text-white/40">specification.</span>
              </h2>
            </div>
            <div className="max-w-2xl lg:justify-self-end">
              <p className="text-base leading-8 text-white/56 lg:text-lg">
                Configure one category at a time. Completed choices collapse
                into a clear record, remain editable, and accumulate in My
                Solace without locking the rest of the home to one level.
              </p>
              <p className="mt-5 text-xs leading-6 text-white/38">
                Solace starts from a Premium baseline. Signature upgrades can
                be selected independently in any available category.
              </p>
            </div>
          </div>

          <p className="sr-only" aria-live="polite">
            {activeCategoryId
              ? `Now configuring ${categories.find((category) => category.id === activeCategoryId)?.title}. ${completedSelections.length} selections complete.`
              : `All ${completedSelections.length} available selections complete. Review My Solace.`}
          </p>

          <div className="mt-16 grid items-start gap-8 lg:mt-24 lg:grid-cols-[18rem_minmax(0,1fr)] 2xl:grid-cols-[18rem_minmax(0,1fr)_20rem]">
            <div className="lg:sticky lg:top-24">
              <SolaceProgressNavigation
                categories={categories}
                activeCategoryId={activeCategoryId}
                selections={configuration.inclusionSelections}
                onEditCategory={editCategory}
              />
            </div>

            <div className="min-w-0">
              <div className="2xl:hidden">
                <MySolaceSummary
                  variant="compact"
                  designDirection={selectedDirection}
                  categories={categories}
                  completedSelections={completedSelections}
                />
              </div>

              <div className="mt-5 grid gap-3 2xl:mt-0">
                {categories.map((category) => {
                  const selectedOption = getDisplayedOption(
                    category,
                    configuration.inclusionSelections,
                  );
                  const isComplete =
                    configuration.inclusionSelections[category.id]?.status ===
                    "confirmed";
                  const nextCategory = getNextIncompleteCategory(
                    categories,
                    configuration.inclusionSelections,
                    category.id,
                  );

                  return (
                    <div key={category.id}>
                      <SolaceInclusionCategory
                        category={category}
                        selectedOption={selectedOption}
                        isActive={activeCategoryId === category.id}
                        isComplete={isComplete}
                        nextCategoryTitle={nextCategory?.shortTitle}
                        onSelectOption={(optionId) =>
                          selectInclusionOption(category.id, optionId)
                        }
                        onConfirm={() => confirmCategory(category.id)}
                        onEdit={() => editCategory(category.id)}
                      />

                      {category.id === "countertops" ? (
                        <aside className="mt-3 border border-dashed border-white/14 p-6 sm:p-8">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/38">
                            Flooring / A dedicated zone-based chapter
                          </p>
                          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/46">
                            Flooring will be coordinated by living, bedroom,
                            wet-area, service-space and stair zones, preserving
                            the right material decision for each part of Solace.
                          </p>
                        </aside>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="hidden 2xl:sticky 2xl:top-24 2xl:block">
              <MySolaceSummary
                variant="sticky"
                designDirection={selectedDirection}
                categories={categories}
                completedSelections={completedSelections}
              />
            </div>
          </div>
        </div>
      </section>

      <SolaceReview
        designDirection={selectedDirection}
        categories={categories}
        completedSelections={completedSelections}
        onEditCategory={editCategory}
      />
    </div>
  );
}
