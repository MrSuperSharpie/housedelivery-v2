import type { InclusionImage } from "@/data/inclusions";
import type {
  HomeLookBook,
  LookBookOptionEditorial,
  LookBookPersonalization,
} from "@/data/home-look-book";

export type HomeInclusionLevel = "premium" | "signature";

export type HomeInclusionOption = {
  id: string;
  level: HomeInclusionLevel;
  optionNumber: string;
  name: string;
  description?: string;
  image: InclusionImage;
  editorial?: LookBookOptionEditorial;
};

type HomeSelectableCategoryBase = {
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  description: string;
  options: readonly HomeInclusionOption[];
  technicalNote?: string;
};

export type HomeStandardInclusionCategory = HomeSelectableCategoryBase & {
  kind: "standard";
};

export type HomeRoomLookCategory = HomeSelectableCategoryBase & {
  kind: "room-look";
  represents: readonly string[];
};

export type HomeSelectableInclusionCategory =
  | HomeStandardInclusionCategory
  | HomeRoomLookCategory;

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
  | HomeSelectableInclusionCategory
  | HomeFlooringCategory
  | HomeCoordinatedCategory;

export type HomeConfiguratorDefinition = {
  configurationVersion: number;
  homeId: string;
  homeName: string;
  residenceLabel: string;
  architecturalImages: readonly InclusionImage[];
  categories: readonly HomeInclusionCategory[];
  lookBook: HomeLookBook;
  disclaimer: string;
};

export type HomeSelection = {
  optionId: string;
  status: "draft" | "confirmed";
};

export type HomeConfiguration = {
  schemaVersion: number;
  homeId: string;
  inclusionSelections: Partial<Record<string, HomeSelection>>;
  flooringSelections: Partial<Record<string, HomeSelection>>;
  reviewStatus: "draft" | "ready-for-review";
  lookBookPersonalization: LookBookPersonalization | null;
};

export type ResolvedHomeSelection = {
  category: HomeSelectableInclusionCategory;
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
    (category): category is HomeSelectableInclusionCategory =>
      category.kind === "standard" || category.kind === "room-look",
  );
  const firstOption = firstCategory?.options.find(
    (option) => option.level === "premium",
  );
  if (!firstCategory || !firstOption) {
    throw new Error(
      `Home configurator definition is incomplete: ${definition.homeId}`,
    );
  }

  return {
    schemaVersion: definition.configurationVersion,
    homeId: definition.homeId,
    inclusionSelections: {
      [firstCategory.id]: {
        optionId: firstOption.id,
        status: "draft",
      },
    },
    flooringSelections: {},
    reviewStatus: "draft",
    lookBookPersonalization: null,
  };
}

export function isCategoryComplete(
  category: HomeInclusionCategory,
  configuration: HomeConfiguration,
) {
  if (category.kind === "coordinated") return false;
  if (category.kind === "standard" || category.kind === "room-look") {
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

export function getProjectCoordinatedCategories(
  definition: HomeConfiguratorDefinition,
) {
  return definition.categories.filter(
    (category): category is HomeCoordinatedCategory =>
      category.kind === "coordinated",
  );
}

export function getSelectedInclusionOption(
  category: HomeSelectableInclusionCategory,
  configuration: HomeConfiguration,
) {
  const optionId = configuration.inclusionSelections[category.id]?.optionId;
  return category.options.find((option) => option.id === optionId);
}

export function getDisplayedInclusionOption(
  category: HomeSelectableInclusionCategory,
  configuration: HomeConfiguration,
) {
  return (
    getSelectedInclusionOption(category, configuration) ??
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
