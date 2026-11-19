import type { HomeConfiguration, HomeConfiguratorDefinition, HomeInclusionLevel } from "@/data/home-configurator";

export type DuplexTiers = { a: HomeInclusionLevel; b: HomeInclusionLevel };

export function getSavedDuplexTiers(definition: HomeConfiguratorDefinition, configuration: HomeConfiguration, fallback: DuplexTiers): DuplexTiers {
  const tiers = { ...fallback };
  for (const residence of ["a", "b"] as const) {
    for (const category of definition.categories) {
      if (category.kind !== "room-look" || category.residence !== residence) continue;
      const selection = configuration.inclusionSelections[category.id];
      const option = category.options.find((candidate) => candidate.id === selection?.optionId);
      if (option) { tiers[residence] = option.level; break; }
    }
  }
  return tiers;
}

export function getDuplexTierDefinition(
  definition: HomeConfiguratorDefinition,
  tiers: DuplexTiers,
  glazingTier?: HomeInclusionLevel,
): HomeConfiguratorDefinition {
  return {
    ...definition,
    categories: definition.categories.map((category) => {
      if (category.kind !== "room-look" || !category.residence) return category;
      if (category.residence === "shared") {
        return glazingTier && category.id === "windows-patio-doors"
          ? { ...category, options: category.options.filter((option) => option.level === glazingTier) }
          : category;
      }
      return { ...category, options: category.options.filter((option) => option.level === tiers[category.residence as "a" | "b"]) };
    }),
  };
}
