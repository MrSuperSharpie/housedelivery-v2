import assert from "node:assert/strict";
import test from "node:test";

import {
  getRequiredCategories,
  type HomeInclusionCategory,
} from "@/data/home-configurator";
import { getHomeConfiguratorDefinition } from "@/data/home-configurators";
import { models } from "@/data/models";
import { solaceHomeConfigurator } from "@/data/solace-home-configurator";

function getCategoryOptions(category: HomeInclusionCategory) {
  if (category.kind === "standard" || category.kind === "room-look") {
    return category.options;
  }

  if (category.kind === "flooring") {
    return category.zones.flatMap((zone) => zone.options);
  }

  return [];
}

test("every Custom Home model is registered with the shared configurator", () => {
  for (const model of models) {
    const definition = getHomeConfiguratorDefinition(model.slug);

    assert.ok(definition, `Missing configurator for ${model.slug}`);
    assert.equal(definition.homeId, model.slug);
    assert.equal(definition.lookBook.home.id, model.slug);
    assert.equal(
      definition.lookBook.home.areaLabel,
      `${model.squareFeet.toLocaleString()} sq. ft.`,
    );
    assert.equal(getRequiredCategories(definition).length, 11);

    for (const category of definition.categories) {
      const options = getCategoryOptions(category);
      if (options.length === 0) continue;

      assert.ok(
        options.some((option) => option.level === "premium"),
        `${model.slug}/${category.id} is missing its Premium baseline`,
      );
      assert.ok(
        options.some((option) => option.level === "signature"),
        `${model.slug}/${category.id} is missing Signature upgrades`,
      );
    }
  }
});
test("Solace remains the approved source definition", () => {
  assert.strictEqual(
    getHomeConfiguratorDefinition("solace"),
    solaceHomeConfigurator,
  );
  assert.equal(solaceHomeConfigurator.lookBook.sections[0]?.title, "The Solace You Created");
});

test("activated homes use model-specific architecture and labels", () => {
  for (const model of models.filter((candidate) => candidate.slug !== "solace")) {
    const definition = getHomeConfiguratorDefinition(model.slug);

    assert.ok(definition);
    assert.equal(definition.architecturalImages[0]?.src, model.heroImage);
    assert.equal(definition.lookBook.home.heroImage.src, model.heroImage);
    assert.doesNotMatch(definition.homeName, /^The\s/);
    assert.doesNotMatch(definition.lookBook.sections[0]?.title ?? "", /Solace/);
  }
});
