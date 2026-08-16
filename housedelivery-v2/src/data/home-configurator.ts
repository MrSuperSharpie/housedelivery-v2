import type {
  HomeDesignDirectionId,
  HomeDesignDirectionsExperience,
} from "@/data/home-design-collections";
import type { InclusionImage } from "@/data/inclusions";

export type HomeInclusionLevel = "premium" | "signature";

export type HomeInclusionOption = {
  id: string;
  level: HomeInclusionLevel;
  optionNumber: string;
  name: string;
  description?: string;
  image: InclusionImage;
};

export type HomeStandardInclusionCategory = {
  kind: "standard";
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  description: string;
  options: readonly HomeInclusionOption[];
  technicalNote?: string;
};

export type HomeFlooringZone = {
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  description: string;
  options: readonly HomeInclusionOption[];
};

export type HomeFlooringCategory = {
  kind: "flooring";
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  description: string;
  zones: readonly HomeFlooringZone[];
  technicalNote: string;
};

export type HomeCoordinatedCategory = {
  kind: "coordinated";
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  description: string;
  coordinatedMessage: string;
};

export type HomeInclusionCategory =
  | HomeStandardInclusionCategory
  | HomeFlooringCategory
  | HomeCoordinatedCategory;

export type HomeLookBookItem = {
  categoryId: string;
  zoneId?: string;
  label?: string;
};

export type HomeLookBookChapter = {
  id: string;
  number: string;
  title: string;
  introduction: string;
  items: readonly HomeLookBookItem[];
};

export type HomeConfiguratorDefinition = {
  homeId: string;
  homeName: string;
  residenceLabel: string;
  designDirections: HomeDesignDirectionsExperience;
  architecturalImages: readonly InclusionImage[];
  categories: readonly HomeInclusionCategory[];
  lookBookChapters: readonly HomeLookBookChapter[];
  disclaimer: string;
};

export type HomeSelection = {
  optionId: string;
  status: "draft" | "confirmed";
};

export type HomeConfiguration = {
  homeId: string;
  designDirectionId: HomeDesignDirectionId;
  inclusionSelections: Partial<Record<string, HomeSelection>>;
  flooringSelections: Partial<Record<string, HomeSelection>>;
  reviewStatus: "draft" | "ready-for-review";
};

export type ResolvedHomeSelection = {
  category: HomeStandardInclusionCategory;
  option: HomeInclusionOption;
};

export type ResolvedFlooringSelection = {
  category: HomeFlooringCategory;
  zone: HomeFlooringZone;
  option: HomeInclusionOption;
};

export function getHomeInclusionLevelLabel(level: HomeInclusionLevel) {
  return level === "premium"
    ? "Premium — Included"
    : "Signature — Upgrade";
}

export function createDefaultHomeConfiguration(
  definition: HomeConfiguratorDefinition,
): HomeConfiguration {
  const firstCategory = definition.categories.find(
    (category): category is HomeStandardInclusionCategory =>
      category.kind === "standard",
  );
  const firstOption = firstCategory?.options.find(
    (option) => option.level === "premium",
  );
  const firstDirection = definition.designDirections.directions[0];

  if (!firstCategory || !firstOption || !firstDirection) {
    throw new Error(
      `Home configurator definition is incomplete: ${definition.homeId}`,
    );
  }

  return {
    homeId: definition.homeId,
    designDirectionId: firstDirection.id,
    inclusionSelections: {
      [firstCategory.id]: {
        optionId: firstOption.id,
        status: "draft",
      },
    },
    flooringSelections: {},
    reviewStatus: "draft",
  };
}

export function isCategoryComplete(
  category: HomeInclusionCategory,
  configuration: HomeConfiguration,
) {
  if (category.kind === "coordinated") return false;
  if (category.kind === "standard") {
    return configuration.inclusionSelections[category.id]?.status === "confirmed";
  }

  return category.zones.every(
    (zone) => configuration.flooringSelections[zone.id]?.status === "confirmed",
  );
}

export function getRequiredCategories(
  definition: HomeConfiguratorDefinition,
) {
  return definition.categories.filter(
    (category) => category.kind !== "coordinated",
  );
}

export function getSelectedStandardOption(
  category: HomeStandardInclusionCategory,
  configuration: HomeConfiguration,
) {
  const optionId = configuration.inclusionSelections[category.id]?.optionId;
  return category.options.find((option) => option.id === optionId);
}

export function getDisplayedStandardOption(
  category: HomeStandardInclusionCategory,
  configuration: HomeConfiguration,
) {
  return (
    getSelectedStandardOption(category, configuration) ??
    category.options.find((option) => option.level === "premium") ??
    category.options[0]
  );
}

export function getSelectedFlooringOption(
  zone: HomeFlooringZone,
  configuration: HomeConfiguration,
) {
  const optionId = configuration.flooringSelections[zone.id]?.optionId;
  return zone.options.find((option) => option.id === optionId);
}

export function getDisplayedFlooringOption(
  zone: HomeFlooringZone,
  configuration: HomeConfiguration,
) {
  return (
    getSelectedFlooringOption(zone, configuration) ??
    zone.options.find((option) => option.level === "premium") ??
    zone.options[0]
  );
}
