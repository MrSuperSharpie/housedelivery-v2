import type {
  HomeConfiguration,
  HomeConfiguratorDefinition,
  HomeInclusionLevel,
} from "@/data/home-configurator";

export const solaceAreaSquareFeet = 5_405;
export const solacePricing = {
  premium: { label: "Premium", rate: 225 },
  signature: { label: "Signature", rate: 275 },
} as const;

export function getSolaceTierDefinition(
  definition: HomeConfiguratorDefinition,
  tier: HomeInclusionLevel,
): HomeConfiguratorDefinition {
  if (definition.homeId !== "solace") {
    throw new Error("Solace tiers apply only to Solace.");
  }
  return {
    ...definition,
    categories: definition.categories.map((category) => {
      if (category.kind === "coordinated") return category;
      if (category.kind === "flooring") {
        return {
          ...category,
          zones: category.zones.map((zone) => ({
            ...zone,
            options: zone.options.filter((option) => option.level === tier),
          })),
        };
      }
      return {
        ...category,
        options: category.options.filter((option) => option.level === tier),
      };
    }),
  };
}

// Saved project choices must obey the selected tier too. Removing an incompatible
// choice invalidates completion so it cannot survive in the summary or Look Book.
export function applySolaceTier(
  definition: HomeConfiguratorDefinition,
  configuration: HomeConfiguration,
): HomeConfiguration {
  if (definition.homeId !== "solace" || configuration.homeId !== "solace") {
    throw new Error("Solace tiers apply only to Solace.");
  }
  const inclusionSelections: HomeConfiguration["inclusionSelections"] = {};
  const flooringSelections: HomeConfiguration["flooringSelections"] = {};
  for (const category of definition.categories) {
    if (category.kind === "coordinated") continue;
    if (category.kind === "flooring") {
      for (const zone of category.zones) {
        const selected = configuration.flooringSelections[zone.id];
        if (selected && zone.options.some((option) => option.id === selected.optionId)) {
          flooringSelections[zone.id] = selected;
        }
      }
    } else {
      const selected = configuration.inclusionSelections[category.id];
      if (selected && category.options.some((option) => option.id === selected.optionId)) {
        inclusionSelections[category.id] = selected;
      }
    }
  }
  const removed =
    Object.keys(inclusionSelections).length !== Object.keys(configuration.inclusionSelections).length ||
    Object.keys(flooringSelections).length !== Object.keys(configuration.flooringSelections).length;
  const first = definition.categories.find(
    (category) => category.kind === "room-look" || category.kind === "standard",
  );
  if (first && (first.kind === "room-look" || first.kind === "standard") && !inclusionSelections[first.id] && first.options[0]) {
    inclusionSelections[first.id] = { optionId: first.options[0].id, status: "draft" };
  }
  return {
    ...configuration,
    inclusionSelections,
    flooringSelections,
    ...(removed ? { reviewStatus: "draft" as const, lookBookPersonalization: null } : {}),
  };
}
