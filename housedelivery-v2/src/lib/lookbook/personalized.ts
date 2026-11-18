import { homeConfiguratorRegistrations } from "@/data/home-configurators";
import { getHomeTierDefinition } from "@/data/home-pricing";
import { models } from "@/data/models";
import {
  getInteriorCollection,
  getPersonalizedLookBookOffer,
  lookBookRequestNotesLimit,
  type PersonalizedLookBookBrief,
} from "@/data/personalized-lookbook";
import { createLookBookReference } from "@/data/home-look-book";
import { LookBookValidationError, resolveLookBookConfiguration, singleLine } from "@/lib/lookbook/domain";

export const personalizedLookBookDocumentHeader = "x-house-delivery-lookbook-document";
export const personalizedLookBookRequestLimit = 10_000;

export function resolvePersonalizedLookBook(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new LookBookValidationError("A completed Look Book is required.");
  }
  const input = value as Record<string, unknown>;
  const registration = homeConfiguratorRegistrations.find(({ key }) => key === input.homeKey);
  const offer = registration && getPersonalizedLookBookOffer(registration.key);
  const preset = offer?.presets.find(({ id, tier }) => id === input.collectionId && tier === input.tier);
  if (!registration?.definition || !offer || !preset) {
    throw new LookBookValidationError("This collection and package are unavailable for the selected home.");
  }

  const definition = getHomeTierDefinition(registration.definition, preset.tier);
  const { configuration } = resolveLookBookConfiguration(definition, input.configuration);
  const collection = getInteriorCollection(preset.id);
  const notes = singleLine(input.notes, lookBookRequestNotesLimit);
  const floorPlanSrc = registration.productFamily === "custom-home"
    ? models.find(({ slug }) => slug === registration.homeId)?.floorPlanImage
    : undefined;

  const brief: PersonalizedLookBookBrief = {
    tier: preset.tier,
    collectionName: collection.name,
    collectionPalette: collection.palette,
    ...(floorPlanSrc ? {
      floorPlan: { src: floorPlanSrc, alt: `${definition.residenceLabel} published architectural floor plan` },
    } : {}),
    notes,
  };
  const preparedAt = new Date();
  const printConfiguration = {
    ...configuration,
    lookBookPersonalization: {
      preparedAt: preparedAt.toISOString(),
      reference: createLookBookReference(definition.homeId, preparedAt),
    },
  };
  return {
    definition, brief, printConfiguration,
    document: {
      homeKey: registration.key,
      tier: preset.tier,
      collectionId: preset.id,
      configuration: {
        homeId: configuration.homeId,
        schemaVersion: configuration.schemaVersion,
        inclusionSelections: configuration.inclusionSelections,
        flooringSelections: configuration.flooringSelections,
      },
      notes,
    },
  };
}
