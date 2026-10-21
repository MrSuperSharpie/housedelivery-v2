import assert from "node:assert/strict";
import test from "node:test";
import legacyBooks from "../../scripts/fixtures/ed69bf3-saved-books.json";
import { createDefaultHomeConfiguration, getHomeConfiguratorJourneyCategories, isCategoryComplete, type HomeConfiguration } from "@/data/home-configurator";
import { getHomeConfiguratorRegistration } from "@/data/home-configurators";
import { getSavedLookBookDefinition } from "@/data/saved-lookbook-definition";

test("all 102 original saved books retain their confirmed pages without inventing a glazing choice", () => {
  assert.equal(legacyBooks.length, 102);
  for (const record of legacyBooks) {
    const definition = getHomeConfiguratorRegistration("custom-home", record.home_slug)!.definition!;
    const configuration = record.configuration as HomeConfiguration;
    const saved = getSavedLookBookDefinition(definition, configuration);
    assert.equal(getHomeConfiguratorJourneyCategories(saved).length, 7);
    assert.ok(getHomeConfiguratorJourneyCategories(saved).every((category) => isCategoryComplete(category, configuration)));
    assert.equal(saved.lookBook.sections.some((section) => section.id === "windows-patio-doors"), false);
    assert.ok(definition.categories.some((category) => category.id === "windows-patio-doors"));
    for (const selection of record.selections) {
      const category = saved.categories.find((item) => item.id === selection.categoryId);
      assert.ok(category && category.kind === "room-look");
      assert.ok(category.options.some((option) => option.id === selection.optionId && option.name === selection.optionName));
    }
  }
});

test("new saved books retain glazing, while the original definition still requires it for new journeys", () => {
  for (const home of ["solace", "profile", "salt-spring"]) {
    const definition = getHomeConfiguratorRegistration("custom-home", home)!.definition!;
    const configuration = createDefaultHomeConfiguration(definition);
    configuration.inclusionSelections["windows-patio-doors"] = { optionId: "windows-patio-doors-signature-4", status: "confirmed" };
    assert.equal(getSavedLookBookDefinition(definition, configuration), definition);
    delete configuration.inclusionSelections["windows-patio-doors"];
    assert.equal(getHomeConfiguratorJourneyCategories(getSavedLookBookDefinition(definition, configuration)).length, home === "salt-spring" ? 13 : 7);
    assert.equal(getHomeConfiguratorJourneyCategories(definition).length, home === "salt-spring" ? 14 : 8);
  }
});
