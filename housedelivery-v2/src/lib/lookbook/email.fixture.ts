import { createDefaultHomeConfiguration, getHomeConfiguratorJourneyCategories, type HomeInclusionOption } from "@/data/home-configurator";
import { getHomeConfiguratorRegistration } from "@/data/home-configurators";
import { parseCompletedLookBook, personalizeStoredConfiguration } from "./domain";
import type { StoredLookBook } from "./types";
export function completeEmailFixture(slug = "aurora", tier: "premium" | "signature" = "signature"): StoredLookBook {
  const definition = getHomeConfiguratorRegistration("custom-home", slug)!.definition!;
  const configuration = createDefaultHomeConfiguration(definition);
  for (const category of getHomeConfiguratorJourneyCategories(definition)) {
    const pick = (options: readonly HomeInclusionOption[]) => options.find(o => !o.legacyOnly && (o.shared || o.level === tier)) ?? options[0];
    if (category.kind === "flooring") for (const zone of category.zones) configuration.flooringSelections[zone.id] = { optionId: pick(zone.options).id, status: "confirmed" };
    else configuration.inclusionSelections[category.id] = { optionId: pick(category.options).id, status: "confirmed" };
  }
  const parsed = parseCompletedLookBook(slug, configuration),now="2026-11-16T12:00:00.000Z",contact={firstName:"Sarah",email:"sarah@example.invalid"};
  return { id:"9342f2c1-8db8-4f09-a42a-f791d81b9407",homeSlug:slug,homeDisplayName:definition.homeName,homeFamily:"custom-home",configuratorVersion:definition.configurationVersion,configuration:personalizeStoredConfiguration(parsed.configuration,definition,contact,now),selections:parsed.selections,contact,leadState:"known_engaged",followUpRequested:false,attribution:{anonymousSessionId:"9342f2c1-8db8-4f09-a42a-f791d81b9407"},createdAt:now,updatedAt:now,completedAt:now };
}
