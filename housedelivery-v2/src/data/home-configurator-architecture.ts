import {
  getRequiredCategories,
  type HomeConfiguratorDefinition,
} from "@/data/home-configurator";

export type HomeProductFamily =
  | "custom-home"
  | "laneway-carriage-home"
  | "pre-approved-home";

export const canonicalHomeConfiguratorChapters = [
  { id: "kitchen-look-feel", number: "01", title: "Kitchen Look & Feel" },
  {
    id: "primary-ensuite-look-feel",
    number: "02",
    title: "Primary Ensuite Look & Feel",
  },
  { id: "primary-wardrobe", number: "03", title: "Primary Wardrobe" },
  {
    id: "interior-doors-details",
    number: "04",
    title: "Interior Doors & Details",
  },
  {
    id: "exterior-arrival-openings",
    number: "05",
    title: "Exterior Arrival & Openings",
  },
  {
    id: "whole-home-flooring-stairs",
    number: "06",
    title: "Whole-Home Flooring & Stairs",
  },
  { id: "window-coverings", number: "07", title: "Window Coverings" },
] as const;

export type CanonicalHomeConfiguratorChapterId =
  (typeof canonicalHomeConfiguratorChapters)[number]["id"];

export const canonicalHomeConfiguratorChapterIds =
  canonicalHomeConfiguratorChapters.map((chapter) => chapter.id);

export const canonicalHomeConfiguratorStages = [
  ...canonicalHomeConfiguratorChapters.map((chapter) => ({
    ...chapter,
    kind: "design-chapter" as const,
  })),
  {
    id: "my-home-review",
    number: "08",
    title: "My Home / Review / Save as PDF",
    kind: "review" as const,
  },
] as const;

export type HomeConfiguratorFamilyPolicy = {
  productFamily: HomeProductFamily;
  supportedChapterIds: readonly CanonicalHomeConfiguratorChapterId[];
  defaultChapterIds: readonly CanonicalHomeConfiguratorChapterId[];
  allowsDisabledChapters: boolean;
  supportsProjectCoordinatedItems: true;
  personalizationScope: "design-finishes-only";
  structuralArchitectureChangesAvailable: false;
  technicalInformationPlacement: "product-page-outside-configurator";
};

export const homeConfiguratorFamilyPolicies: Readonly<
  Record<HomeProductFamily, HomeConfiguratorFamilyPolicy>
> = {
  "custom-home": {
    productFamily: "custom-home",
    supportedChapterIds: canonicalHomeConfiguratorChapterIds,
    defaultChapterIds: canonicalHomeConfiguratorChapterIds,
    allowsDisabledChapters: false,
    supportsProjectCoordinatedItems: true,
    personalizationScope: "design-finishes-only",
    structuralArchitectureChangesAvailable: false,
    technicalInformationPlacement: "product-page-outside-configurator",
  },
  "laneway-carriage-home": {
    productFamily: "laneway-carriage-home",
    supportedChapterIds: canonicalHomeConfiguratorChapterIds,
    defaultChapterIds: [],
    allowsDisabledChapters: true,
    supportsProjectCoordinatedItems: true,
    personalizationScope: "design-finishes-only",
    structuralArchitectureChangesAvailable: false,
    technicalInformationPlacement: "product-page-outside-configurator",
  },
  "pre-approved-home": {
    productFamily: "pre-approved-home",
    supportedChapterIds: canonicalHomeConfiguratorChapterIds,
    defaultChapterIds: [],
    allowsDisabledChapters: true,
    supportsProjectCoordinatedItems: true,
    personalizationScope: "design-finishes-only",
    structuralArchitectureChangesAvailable: false,
    technicalInformationPlacement: "product-page-outside-configurator",
  },
};

export type HomeConfiguratorMigrationStatus =
  | "canonical"
  | "legacy-active"
  | "awaiting-approved-content";

export type HomeConfiguratorRegistration = {
  key: string;
  homeId: string;
  homeName: string;
  route: string;
  productFamily: HomeProductFamily;
  migrationStatus: HomeConfiguratorMigrationStatus;
  activeChapterIds: readonly string[];
  definition?: HomeConfiguratorDefinition;
};

const canonicalPackageClassifications = [
  "premium:1",
  "premium:2",
  "signature:1",
  "signature:2",
] as const;

export function getCanonicalHomeConfiguratorIssues(
  definition: HomeConfiguratorDefinition,
) {
  const issues: string[] = [];
  const categories = getRequiredCategories(definition);
  const categoryIds = categories.map((category) => category.id);

  if (
    categoryIds.length !== canonicalHomeConfiguratorChapterIds.length ||
    categoryIds.some(
      (categoryId, index) =>
        categoryId !== canonicalHomeConfiguratorChapterIds[index],
    )
  ) {
    issues.push("The seven canonical design chapters are not present in order.");
  }

  for (const category of categories) {
    const canonicalChapter = canonicalHomeConfiguratorChapters.find(
      (chapter) => chapter.id === category.id,
    );

    if (
      canonicalChapter &&
      (category.number !== canonicalChapter.number ||
        category.title !== canonicalChapter.title)
    ) {
      issues.push(
        `${category.id} must use chapter ${canonicalChapter.number}, ${canonicalChapter.title}.`,
      );
    }

    if (category.kind !== "room-look") {
      issues.push(`${category.id} is not a room-look chapter.`);
      continue;
    }

    const classifications = category.options
      .map((option) => `${option.level}:${option.optionNumber}`)
      .sort();

    if (
      classifications.length !== canonicalPackageClassifications.length ||
      classifications.some(
        (classification, index) =>
          classification !== canonicalPackageClassifications[index],
      )
    ) {
      issues.push(
        `${category.id} must provide Premium 1, Premium 2, Signature 1 and Signature 2.`,
      );
    }
  }

  return issues;
}
