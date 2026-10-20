import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeConfigurator } from "@/components/home-configurator";
import { createDefaultHomeConfiguration, type HomeConfiguratorDefinition } from "@/data/home-configurator";
import { solaceHomeConfigurator as definition } from "@/data/solace-home-configurator";
import { getHomeTierDefinition } from "@/data/home-pricing";
import { parseCompletedLookBook } from "@/lib/lookbook/domain";
import production from "@/data/fixtures/solace-production-ed69bf3.json";

const baseline = production as HomeConfiguratorDefinition;

test("Solace additions preserve the exact production definition and original option meanings", () => {
  const withoutAdditions = structuredClone(definition);
  for (const category of withoutAdditions.categories) {
    if (category.kind !== "coordinated" && category.kind !== "flooring") {
      category.options = category.options.slice(0, 4);
    }
  }
  assert.deepEqual(JSON.parse(JSON.stringify(withoutAdditions)), baseline);
  assert.equal(definition.configurationVersion, 4);
  const newImages = new Set<string>();
  for (const category of definition.categories) {
    if (category.kind !== "room-look") continue;
    assert.equal(category.options.length, 8);
    assert.equal(new Set(category.options.map((option) => option.id)).size, 8);
    for (const option of category.options.slice(4)) {
      assert.match(option.image.src, /\.[a-f0-9]{12}-1448\.webp$/);
      assert.ok(!newImages.has(option.image.src));
      newImages.add(option.image.src);
      const bytes = readFileSync(`public${option.image.src}`);
      assert.equal(bytes.subarray(8, 12).toString(), "WEBP");
    }
  }
  assert.equal(newImages.size, 28);
});

test("every production version-4 choice remains valid without migration or reinterpretation", () => {
  for (const tier of ["premium", "signature"] as const) {
    for (const number of ["1", "2"]) {
      const configuration = createDefaultHomeConfiguration(baseline);
      for (const category of baseline.categories) {
        if (category.kind !== "room-look") continue;
        const option = category.options.find((item) => item.level === tier && item.optionNumber === number)!;
        configuration.inclusionSelections[category.id] = { optionId: option.id, status: "confirmed" };
      }
      const parsed = parseCompletedLookBook("solace", configuration);
      assert.equal(parsed.selections.length, 7);
      assert.ok(parsed.selections.every((item) => item.tier === tier && item.optionNumber === number));
      for (const selection of parsed.selections) {
        const category = baseline.categories.find((item) => item.id === selection.categoryId);
        assert.ok(category?.kind === "room-look");
        assert.equal(selection.optionName, category.options.find((item) => item.id === selection.optionId)?.name);
      }
    }
  }
});

test("each production tier entry offers only its original two plus its approved two additions", () => {
  for (const tier of ["premium", "signature"] as const) {
    const filtered = getHomeTierDefinition(definition, tier);
    const configuration = createDefaultHomeConfiguration(definition);
    const names = tier === "premium" ? ["Sandstone Oak", "Graphite Oak"] : ["Smoked Walnut Bronze", "Limestone Noir"];
    for (const category of filtered.categories) {
      if (category.kind !== "room-look") continue;
      assert.equal(category.options.length, 4);
      assert.ok(category.options.every((option) => option.level === tier));
      assert.deepEqual(category.options.map((option) => option.optionNumber), ["1", "2", "3", "4"]);
      assert.deepEqual(category.options.slice(2).map((option) => option.name), names);
      configuration.inclusionSelections[category.id] = { optionId: category.options[3].id, status: "confirmed" };
    }
    const parsed = parseCompletedLookBook("solace", configuration);
    assert.equal(parsed.selections.length, 7);
    assert.ok(parsed.selections.every((item) => item.tier === tier && item.optionName === names[1]));
    const markup = renderToStaticMarkup(<HomeConfigurator definition={definition} inclusionTier={tier} />);
    assert.equal((markup.match(/data-option-level=/g) ?? []).length, 4);
    assert.ok(!markup.includes(`data-option-level="${tier === "premium" ? "signature" : "premium"}"`));
  }
});
