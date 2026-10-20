import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  createDefaultHomeConfiguration,
  getHomeConfiguratorJourneyCategories,
} from "@/data/home-configurator";
import { getLookBookSelectionSections } from "@/data/home-look-book";
import { getHomeConfiguratorRegistrationsByFamily } from "@/data/home-configurator-registry";
import { parseCompletedLookBook } from "@/lib/lookbook/domain";

test("all custom homes carry a selectable Canadian windows and patio doors chapter into the saved Look Book", () => {
  const homes = getHomeConfiguratorRegistrationsByFamily("custom-home");
  assert.equal(homes.length, 18);

  for (const home of homes) {
    const definition = home.definition;
    assert.ok(definition, home.homeId);
    const category = definition.categories.find((item) => item.id === "windows-patio-doors");
    assert.ok(category?.kind === "room-look", home.homeId);
    assert.equal(category.options.length, 8);
    assert.deepEqual(
      category.options.map((option) => `${option.level}:${option.optionNumber}`).sort(),
      ["premium:1", "premium:2", "premium:3", "premium:4", "signature:1", "signature:2", "signature:3", "signature:4"],
    );
    assert.match(category.technicalNote ?? "", /NAFS\/CSA A440S1/);
    assert.match(category.options.map((option) => option.name).join(" "), /Slider|Sliding/);
    assert.match(category.options.map((option) => option.name).join(" "), /Folding/);
    assert.match(category.options.map((option) => option.name).join(" "), /Pocketing/);
    for (const option of category.options) {
      assert.ok(existsSync(join(process.cwd(), "public", option.image.src)), `${home.homeId}: ${option.image.src}`);
      assert.equal(option.image.role, "design-board");
      assert.equal(option.image.fit, "contain");
      assert.match(option.image.src, new RegExp(`/boards/${home.homeId}-${option.level}-${option.optionNumber}\\.webp$`));
      assert.match(option.description ?? "", /triple-glazed/);
    }

    const sections = getLookBookSelectionSections(definition.lookBook.sections);
    assert.ok(sections.some((section) => section.items.some((item) => item.categoryId === category.id)));
    const configuration = createDefaultHomeConfiguration(definition);
    for (const chapter of getHomeConfiguratorJourneyCategories(definition)) {
      assert.ok(chapter.kind === "room-look");
      configuration.inclusionSelections[chapter.id] = {
        optionId: chapter.options[0].id,
        status: "confirmed",
      };
    }
    const saved = parseCompletedLookBook(home.homeId, configuration);
    assert.equal(saved.selections.filter((selection) => selection.categoryId === "windows-patio-doors").length, 1);
    delete configuration.inclusionSelections[category.id];
    assert.throws(() => parseCompletedLookBook(home.homeId, configuration), /Every design chapter must be complete/);

    if (home.homeId === "salt-spring") {
      assert.equal(category.residence, "shared");
      assert.ok(category.options.every((option) => option.shared));
      assert.equal(saved.selections.find((selection) => selection.categoryId === category.id)?.tier, "shared");
    }
  }
});
