import type { HomeConfiguration, HomeConfiguratorDefinition } from "@/data/home-configurator";

// Older saved books predate this chapter. Keep their original confirmed pages;
// new and edited journeys still require the current full definition.
export function getSavedLookBookDefinition(
  definition: HomeConfiguratorDefinition,
  configuration: HomeConfiguration,
): HomeConfiguratorDefinition {
  const chapterId = "windows-patio-doors";
  if (configuration.inclusionSelections[chapterId]) return definition;
  return {
    ...definition,
    categories: definition.categories.filter((category) => category.id !== chapterId),
    lookBook: {
      ...definition.lookBook,
      sections: definition.lookBook.sections.filter((section) => section.id !== chapterId),
    },
  };
}
