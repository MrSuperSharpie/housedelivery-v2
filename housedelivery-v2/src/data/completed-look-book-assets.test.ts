import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

import assets from "@/data/completed-look-book-assets.json";
import { getCompletedLookBookOptions } from "@/data/completed-look-book-assets";
import { getRequiredCategories } from "@/data/home-configurator";
import { getCanonicalHomeConfiguratorIssues } from "@/data/home-configurator-architecture";
import { getHomeConfiguratorDefinition } from "@/data/home-configurators";

test("all 224 completed boards are wired once to their own house, chapter and tier", () => {
  const allSources = new Set<string>();
  for (const home of Object.keys(assets) as (keyof typeof assets)[]) {
    const definition = getHomeConfiguratorDefinition(home);
    assert.ok(definition);
    // Old Signature option numbers referred to different styles. Do not silently
    // reinterpret a saved version-4 selection against this replacement set.
    assert.equal(definition.configurationVersion, 5);
    assert.deepEqual(getCanonicalHomeConfiguratorIssues(definition), []);
    const categories = getRequiredCategories(definition);
    assert.equal(categories.length, 7);
    const root = `/images/homes/${home}/visual-guide/`;
    const referenced: string[] = [];

    for (const category of categories) {
      assert.equal(category.kind, "room-look");
      if (category.kind !== "room-look") continue;
      assert.equal(category.options.length, 8);
      assert.equal(new Set(category.options.map((option) => option.id)).size, 8);
      for (const level of ["premium", "signature"] as const) {
        assert.deepEqual(
          category.options.filter((option) => option.level === level)
            .map((option) => option.optionNumber),
          ["1", "2", "3", "4"],
        );
      }
      for (const option of category.options) {
        assert.ok(option.image.src.startsWith(root));
        assert.equal(option.image.fit, "contain");
        assert.equal(option.image.role, "design-board");
        assert.equal(option.image.quality, 100);
        const tier = option.level === "premium" ? "Premium" : "Signature";
        assert.match(decodeURIComponent(option.image.src), new RegExp(`${tier}[ -]${option.optionNumber}`));
        assert.ok(option.image.alt.startsWith(`${tier} ${option.optionNumber} — ${option.name}`));
        assert.ok(!allSources.has(option.image.src), `Repeated image: ${option.image.src}`);
        allSources.add(option.image.src);
        referenced.push(decodeURIComponent(option.image.src.slice(root.length)));
      }
    }

    const directory = join(process.cwd(), "public", root);
    const installed = readdirSync(directory, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => relative(directory, join(entry.parentPath, entry.name)));
    assert.equal(installed.length, 56);
    assert.ok(installed.every((path) => path.endsWith(".png")));
    assert.deepEqual(referenced.toSorted(), installed.toSorted());
  }
  assert.equal(allSources.size, 224);
});

test("completed styles preserve the printed board names in each tier", () => {
  const commonNames = {
    canmore: ["Hearth Oak", "Mineral Linen", "Carbon Ridge", "Bronze Walnut"],
    solace: ["Coastal Light Oak", "Soft White", "Stone Wrapped Oak", "Sculpted White"],
    "south-bay": ["Shoreline Oak", "Mist Linen", "Basalt Frame", "Cove Bronze"],
  };
  for (const [home, names] of Object.entries(commonNames)) {
    for (const category of getRequiredCategories(getHomeConfiguratorDefinition(home)!)) {
      if (category.kind !== "room-look") continue;
      assert.deepEqual(category.options.map((option) => option.name), [...names, ...names]);
    }
  }
  for (const category of getRequiredCategories(getHomeConfiguratorDefinition("saturna")!)) {
    if (category.kind !== "room-look") continue;
    const names = category.id === "primary-ensuite-look-feel"
      ? ["Coastal Calm", "Urban Luxe", "Warm Natural", "Modern Cool"]
      : ["kitchen-look-feel", "primary-wardrobe"].includes(category.id)
        ? ["Warm Modern", "Contemporary Luxe", "Scandi Light", "Modern Earth"]
        : ["Warm Modern", "Contemporary Cool", "Scandi Natural", "Modern Earth"];
    assert.deepEqual(category.options.map((option) => option.name), [...names, ...names]);
  }
});

test("Saturna's misnamed source is mapped only to Window Coverings Premium 4", () => {
  const windows = getCompletedLookBookOptions("saturna", "window-coverings", "Window Coverings", "Textile + privacy");
  const modernEarth = windows.find((option) => option.id === "window-coverings-premium-4");
  assert.equal(modernEarth?.name, "Modern Earth");
  assert.equal(decodeURIComponent(modernEarth!.image.src), "/images/homes/saturna/visual-guide/Additional Images/Saturna - Window Coverings - Premium 4 - Modern Earth.png");
  const doors = getCompletedLookBookOptions("saturna", "interior-doors-details", "Interior Doors & Details", "Interior architecture");
  assert.ok(doors.find((option) => option.id === "interior-doors-details-premium-4")?.image.src.includes("Interior%20Doors%20%26%20Details/Premium/"));
  assert.throws(() => getCompletedLookBookOptions("canmore", "unknown", "Unknown", "Unknown"), /Missing completed Look Book assets/);
});
