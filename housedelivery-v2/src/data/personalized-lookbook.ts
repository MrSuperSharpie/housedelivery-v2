import type { HomeConfiguration, HomeConfiguratorDefinition, HomeInclusionLevel } from "@/data/home-configurator";
import type { InclusionImage } from "@/data/inclusions";

const interiorCollections = {
  "coastal-light-oak": { name: "Coastal Light Oak", palette: "Pale oak, warm white and soft ivory stone" },
  "soft-white": { name: "Soft White", palette: "Soft white surfaces and restrained detailing" },
  "stone-wrapped-oak": { name: "Stone Wrapped Oak", palette: "Expressive stone and warm oak" },
  "sculpted-white": { name: "Sculpted White", palette: "Sculpted pale surfaces and tonal detailing" },
} as const;

type InteriorCollectionId = keyof typeof interiorCollections;

type CollectionPreset = {
  id: InteriorCollectionId;
  tier: HomeInclusionLevel;
  optionNumber: string;
};

export type PersonalizedLookBookOffer = {
  homeKey: string;
  presets: readonly CollectionPreset[];
  presetChapters: readonly string[];
};

const offers: Readonly<Record<string, Omit<PersonalizedLookBookOffer, "homeKey"> | undefined>> = {
  "custom-home:solace": {
    presets: [
      { id: "coastal-light-oak", tier: "premium", optionNumber: "1" },
      { id: "soft-white", tier: "premium", optionNumber: "2" },
      { id: "stone-wrapped-oak", tier: "signature", optionNumber: "1" },
      { id: "sculpted-white", tier: "signature", optionNumber: "2" },
    ],
    presetChapters: [
      "kitchen-look-feel", "primary-ensuite-look-feel", "primary-wardrobe",
      "interior-doors-details", "whole-home-flooring-stairs", "window-coverings",
    ],
  },
};

export const lookBookRequestNotesLimit = 600;

export type PersonalizedLookBookBrief = {
  tier: HomeInclusionLevel;
  collectionName: string;
  collectionPalette: string;
  floorPlan?: InclusionImage;
  notes: string;
};

export function getPersonalizedLookBookOffer(registrationKey: string) {
  const offer = offers[registrationKey];
  return offer ? { ...offer, homeKey: registrationKey } : undefined;
}

export function getInteriorCollection(id: InteriorCollectionId) {
  return interiorCollections[id];
}

export function applyInteriorCollection(
  definition: HomeConfiguratorDefinition,
  configuration: HomeConfiguration,
  offer: PersonalizedLookBookOffer,
  preset: CollectionPreset,
): HomeConfiguration {
  const inclusionSelections = { ...configuration.inclusionSelections };
  for (const category of definition.categories) {
    if (category.kind !== "room-look" || !offer.presetChapters.includes(category.id)) continue;
    const option = category.options.find((candidate) =>
      candidate.level === preset.tier && candidate.optionNumber === preset.optionNumber && !candidate.legacyOnly,
    );
    if (option) inclusionSelections[category.id] = { optionId: option.id, status: "draft" };
  }
  return { ...configuration, inclusionSelections, lookBookPersonalization: null, reviewStatus: "draft" };
}

export const representativeFinishCaption =
  "Representative finish imagery. Room layouts, furnishings and views are illustrative.";
