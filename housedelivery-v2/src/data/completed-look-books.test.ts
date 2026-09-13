import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import sharp from "sharp";

import { createDefaultHomeConfiguration, getRequiredCategories } from "@/data/home-configurator";
import { getHomeConfiguratorDefinition } from "@/data/home-configurators";
import { getHomeTierDefinition } from "@/data/home-pricing";
import { parseCompletedLookBook } from "@/lib/lookbook/domain";

const chapterIds = [
  "kitchen-look-feel", "primary-ensuite-look-feel", "primary-wardrobe",
  "interior-doors-details", "exterior-arrival-openings",
  "whole-home-flooring-stairs", "window-coverings",
];

// Transcribed from the final boards' printed headers, independently of filenames.
const printedDirections = {
  canmore: ["Hearth Oak", "Mineral Linen", "Carbon Ridge", "Bronze Walnut"],
  "south-bay": ["Shoreline Oak", "Mist Linen", "Basalt Frame", "Cove Bronze"],
  solace: ["Coastal Light Oak", "Soft White", "Stone Wrapped Oak", "Sculpted White"],
  saturna: ["Warm Modern", "Contemporary Cool", "Scandi Natural", "Modern Earth"],
};

for (const homeId of Object.keys(printedDirections) as (keyof typeof printedDirections)[]) {
  test(`${homeId}: 56 distinct final boards, printed styles and 28 selections per filtered tier`, async () => {
    const definition = getHomeConfiguratorDefinition(homeId)!;
    const categories = getRequiredCategories(definition);
    assert.equal(definition.configurationVersion, 5, "Retire saved drafts using the previous numbering");
    assert.deepEqual(categories.map((category) => category.id), chapterIds);
    const images = new Set<string>();
    const hashes = new Set<string>();
    const optionIds = new Set<string>();

    for (const category of categories) {
      assert.equal(category.kind, "room-look");
      if (category.kind !== "room-look") continue;
      let names = printedDirections[homeId];
      if (homeId === "saturna") {
        if (["kitchen-look-feel", "primary-wardrobe"].includes(category.id)) {
          names = ["Warm Modern", "Contemporary Luxe", "Scandi Light", "Modern Earth"];
        } else if (category.id === "primary-ensuite-look-feel") {
          names = ["Coastal Calm", "Urban Luxe", "Warm Natural", "Modern Cool"];
        }
      }
      assert.equal(category.options.length, 8);
      assert.deepEqual(category.options.map((option) => option.name), [...names, ...names]);
      for (const tier of ["premium", "signature"] as const) {
        assert.deepEqual(category.options.filter((option) => option.level === tier).map((option) => option.optionNumber), ["1", "2", "3", "4"]);
      }
      for (const option of category.options) {
        optionIds.add(option.id);
        images.add(option.image.src);
        const bytes = readFileSync(join(process.cwd(), "public", option.image.src));
        hashes.add(createHash("sha256").update(bytes).digest("hex"));
        const metadata = await sharp(bytes).metadata();
        assert.equal(metadata.format, "png");
        assert.ok(metadata.width && metadata.height && metadata.width >= 1400 && metadata.height >= 1000);
        assert.ok(Math.abs(metadata.width / metadata.height - 4 / 3) < 0.01);
      }
    }
    assert.equal(images.size, 56);
    assert.equal(hashes.size, 56, "No duplicate image contents");
    assert.equal(optionIds.size, 56, "No duplicate rendered IDs");
    const directory = join(process.cwd(), "public", dirname([...images][0]));
    assert.deepEqual(readdirSync(directory).filter((file) => file.endsWith(".png")).sort(), [...images].map((source) => basename(source)).sort(), "No obsolete PNGs remain");

    for (const tier of ["premium", "signature"] as const) {
      const filtered = getHomeTierDefinition(definition, tier);
      const filteredCategories = getRequiredCategories(filtered);
      const tierImages = filteredCategories.flatMap((category) => category.kind === "room-look" ? category.options.map((option) => option.image.src) : []);
      assert.equal(tierImages.length, 28);
      assert.equal(new Set(tierImages).size, 28);
      for (let index = 0; index < 4; index++) {
        const configuration = createDefaultHomeConfiguration(definition);
        for (const category of filteredCategories) {
          assert.equal(category.kind, "room-look");
          if (category.kind !== "room-look") continue;
          assert.ok(category.options.every((option) => option.level === tier));
          configuration.inclusionSelections[category.id] = { optionId: category.options[index].id, status: "confirmed" };
        }
        const book = parseCompletedLookBook(homeId, configuration);
        assert.equal(book.selections.length, 7);
        assert.ok(book.selections.every((selection) => selection.tier === tier));
      }
    }
  });
}

test("Saturna Window Coverings Premium 4 uses the corrected source image", () => {
  const definition = getHomeConfiguratorDefinition("saturna")!;
  const category = definition.categories.find((category) => category.id === "window-coverings")!;
  assert.equal(category.kind, "room-look");
  if (category.kind !== "room-look") return;
  const option = category.options.find((option) => option.level === "premium" && option.optionNumber === "4")!;
  assert.equal(option.name, "Modern Earth");
  const bytes = readFileSync(join(process.cwd(), "public", option.image.src));
  // Source filename incorrectly says Interior Doors; the printed header says Window Coverings.
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "4b3302b3a08b9f814ba6e38df2e6359d8c93d2e69cf35e169a28df7490bd24f5");
});
