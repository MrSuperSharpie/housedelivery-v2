import { pricingGuide, type PricingLevel } from "@/data/pricing";
import {
  getSelectedFlooringOption,
  getSelectedInclusionOption,
  type HomeConfiguration,
  type HomeConfiguratorDefinition,
} from "@/data/home-configurator";

export function getBudgetInquiryHref({
  model,
  finish,
  selections,
}: { model?: string; finish?: PricingLevel; selections?: string } = {}) {
  const query = new URLSearchParams({ inquiry: "budget" });
  if (model) query.set("model", model);
  if (finish) query.set("finish", finish);
  if (selections) query.set("selections", selections);
  return `/?${query.toString()}#reserve`;
}

export function getBudgetInquiryNotes(query: URLSearchParams) {
  if (query.get("inquiry") !== "budget") return "";
  const finish = pricingGuide.levels.find((level) => level.id === query.get("finish"));
  return [
    "Please help me plan a site-specific budget.",
    finish ? `Finish level of interest: ${finish.name} (subject to model availability and confirmed specifications).` : "",
    query.get("selections")?.slice(0, 2500) ?? "",
  ].filter(Boolean).join("\n\n");
}

// A home can mix Premium and Signature. Carry actual selections, without
// assigning a whole-home tier or deriving a price from its advertised area.
export function getConfigurationBudgetHref(
  definition: HomeConfiguratorDefinition,
  configuration: HomeConfiguration,
) {
  const selections = definition.categories.flatMap((category) => {
    if (category.kind === "coordinated") return [];
    if (category.kind === "flooring") {
      return category.zones.flatMap((zone) => {
        const option = getSelectedFlooringOption(zone, configuration);
        return option ? [`${zone.title}: ${option.name} (${option.level})`] : [];
      });
    }
    const option = getSelectedInclusionOption(category, configuration);
    return option ? [`${category.title}: ${option.name} (${option.level})`] : [];
  });
  return getBudgetInquiryHref({
    model: definition.homeId,
    selections: selections.length ? `Current design selections (subject to review):\n${selections.join("\n")}` : undefined,
  });
}
