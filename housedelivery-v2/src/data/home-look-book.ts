import type { InclusionImage } from "@/data/inclusions";
import { isFinalHomeDesignCategory } from "@/data/home-configurator-order";

export type LookBookCustomer = {
  firstName: string;
  lastName?: string;
};

export type LookBookPersonalization = {
  customer?: LookBookCustomer;
  projectDesignName?: string;
  preparedAt: string;
  reference: string;
};

export type LookBookHome = {
  id: string;
  name: string;
  residenceLabel: string;
  areaLabel?: string;
  description: string;
  heroImage: InclusionImage;
  introductionImage?: InclusionImage;
  metadata?: readonly {
    label: string;
    value: string;
  }[];
};

export type LookBookLayout =
  | "cinematic-hero"
  | "editorial-split"
  | "asymmetric"
  | "material-palette"
  | "detail-story"
  | "architectural-arrival"
  | "dark-finale";

export type LookBookOptionEditorial = {
  descriptors: readonly string[];
  storyFragments: readonly string[];
  materialRole?: string;
};

export type LookBookSelectionReference = {
  categoryId: string;
  zoneId?: string;
  label?: string;
  presentation?: "hero" | "detail" | "material";
};

export type LookBookSelection = {
  id: string;
  categoryId: string;
  zoneId?: string;
  label: string;
  optionName: string;
  level: "premium" | "signature";
  description?: string;
  image: InclusionImage;
  editorial?: LookBookOptionEditorial;
};

export type LookBookSection = {
  id: string;
  number: string;
  title: string;
  introduction: string;
  kind: "design-story" | "selection-story" | "material-story" | "arrival";
  layout: LookBookLayout;
  items: readonly LookBookSelectionReference[];
  heroImage?: "home-hero" | "home-introduction";
  includeProjectCoordination?: boolean;
};

export type ProjectCoordinatedItem = {
  id: string;
  title: string;
  description: string;
};

export type HomeLookBook = {
  home: LookBookHome;
  sections: readonly LookBookSection[];
  projectCoordinatedItems?: readonly ProjectCoordinatedItem[];
  nextStageSteps: readonly {
    title: string;
    description: string;
  }[];
  preliminaryNotice: string;
};

export function getLookBookSelectionSections(
  sections: readonly LookBookSection[],
) {
  const selectionSections = sections.filter(
    (section) => section.kind === "selection-story",
  );
  const orderedSections = [
    ...selectionSections.filter(
      (section) =>
        !section.items.some((item) =>
          isFinalHomeDesignCategory(item.categoryId),
        ),
    ),
    ...selectionSections.filter((section) =>
      section.items.some((item) =>
        isFinalHomeDesignCategory(item.categoryId),
      ),
    ),
  ];

  return orderedSections.map((section, index) => ({
    ...section,
    number: String(index + 1).padStart(2, "0"),
  }));
}

export function getLookBookPersonalTitle(
  customer: LookBookCustomer,
  homeName: string,
) {
  const firstName = customer.firstName.trim();
  const possessive = firstName.toLowerCase().endsWith("s")
    ? `${firstName}’`
    : `${firstName}’s`;

  return `${possessive} ${homeName}`;
}

export function getLookBookDesignStory(selections: readonly LookBookSelection[]) {
  const descriptors = Array.from(
    new Set(selections.flatMap((selection) => selection.editorial?.descriptors ?? [])),
  ).slice(0, 4);
  const fragments = Array.from(
    new Set(
      selections.flatMap(
        (selection) => selection.editorial?.storyFragments ?? [],
      ),
    ),
  ).slice(0, 3);
  const joinedFragments = new Intl.ListFormat("en", {
    style: "long",
    type: "conjunction",
  }).format(fragments);
  const opening = joinedFragments
    ? joinedFragments.charAt(0).toUpperCase() + joinedFragments.slice(1)
    : "Your selected materials, finishes and architectural details";

  return {
    descriptors:
      descriptors.length > 0
        ? descriptors
        : ["Composed", "Contemporary", "Personal"],
    narrative: `${opening} shape a composed contemporary home with natural texture, generous light and moments of stronger definition.`,
  };
}

export function getLookBookCustomerName(customer: LookBookCustomer) {
  return [customer.firstName.trim(), customer.lastName?.trim()]
    .filter(Boolean)
    .join(" ");
}

export function formatLookBookPreparedDate(preparedAt: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(preparedAt));
}

export function createLookBookReference(homeId: string, date = new Date()) {
  const prefix = homeId.slice(0, 3).toUpperCase();
  const dateCode = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(4);
  globalThis.crypto.getRandomValues(values);
  const suffix = Array.from(values, (value) => alphabet[value % alphabet.length]).join("");

  return `${prefix}-${dateCode}-${suffix}`;
}
