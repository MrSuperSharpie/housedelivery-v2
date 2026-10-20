import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import originals from "../../scripts/fixtures/ed69bf3-original-choices.json";
import imageManifest from "../../docs/lookbook-image-manifest.json";
import { createDefaultHomeConfiguration, getRequiredCategories, getHomeConfiguratorJourneyCategories, type HomeConfiguratorDefinition, type HomeInclusionOption } from "@/data/home-configurator";
import { getHomeConfiguratorDefinition } from "@/data/home-configurators";
import { getCanonicalHomeConfiguratorIssues } from "@/data/home-configurator-architecture";
import { getHomeTierDefinition, applyHomeTier, homePricing } from "@/data/home-pricing";
import { getDuplexTierDefinition, getSavedDuplexTiers } from "@/data/duplex-home-pricing";
import { parseCompletedLookBook } from "@/lib/lookbook/domain";

const baseline = originals as unknown as Pick<HomeConfiguratorDefinition, "homeId" | "configurationVersion" | "categories">[];

test("ed69bf3 option IDs, images, names, editorial meaning and schema versions remain intact for every original home", () => {
  for (const original of baseline) {
    const current = getHomeConfiguratorDefinition(original.homeId)!;
    assert.equal(current.configurationVersion, original.configurationVersion);
    for (const category of original.categories) {
      if (category.kind !== "room-look") continue;
      const updated = current.categories.find((candidate) => candidate.id === category.id);
      assert.ok(updated?.kind === "room-look");
      for (const option of category.options) {
        const preserved: HomeInclusionOption | undefined = updated.options.find((candidate) => candidate.id === option.id);
        assert.ok(preserved, `${original.homeId}/${option.id}`);
        const legacyOnly = preserved.legacyOnly;
        const meaning: HomeInclusionOption = { ...preserved };
        delete meaning.legacyOnly;
        assert.deepEqual(meaning, option, `${original.homeId}/${option.id} changed meaning`);
        if (legacyOnly) assert.equal(original.homeId, "profile");
      }
    }
  }
});

test("all 17 standard homes show exactly two original plus two new choices per tier in all seven chapters", () => {
  assert.equal(homePricing.premium.rate, 250);
  assert.equal(homePricing.signature.rate, 300);
  for (const original of baseline) {
    const current = getHomeConfiguratorDefinition(original.homeId)!;
    assert.deepEqual(getCanonicalHomeConfiguratorIssues(current), []);
    assert.equal(getRequiredCategories(current).length, 7);
    assert.equal(getHomeConfiguratorJourneyCategories(current).at(-1)?.id, "exterior-arrival-openings");
    for (const tier of ["premium", "signature"] as const) {
      for (const category of getRequiredCategories(getHomeTierDefinition(current, tier))) {
        assert.ok(category.kind === "room-look");
        assert.equal(category.options.length, 4, `${original.homeId}/${category.id}/${tier}`);
        assert.ok(category.options.every((option) => option.level === tier && !option.legacyOnly));
        const prior = original.categories.find((item) => item.id === category.id);
        assert.ok(prior?.kind === "room-look");
        const originalIds = new Set(prior.options.map((option) => option.id));
        assert.equal(category.options.filter((option) => originalIds.has(option.id)).length, 2);
        assert.equal(new Set(category.options.map((option) => option.id)).size, 4);
      }
    }
  }
});

test("all original saved combinations still validate, including Profile's third wardrobe choices and mixed tiers", () => {
  for (const original of baseline) {
    const current = getHomeConfiguratorDefinition(original.homeId)!;
    for (const slot of [0, 1, 2, 3, 4, 5]) {
      const configuration = createDefaultHomeConfiguration(current);
      const expected: string[] = [];
      for (const category of getRequiredCategories(original as HomeConfiguratorDefinition)) {
        assert.ok(category.kind === "room-look");
        const option = category.options[slot % category.options.length];
        expected.push(option.id);
        configuration.inclusionSelections[category.id] = { optionId: option.id, status: "confirmed" };
      }
      const parsed = parseCompletedLookBook(original.homeId, configuration);
      assert.equal(parsed.selections.length, 7);
      assert.deepEqual(new Set(parsed.selections.map((selection) => selection.optionId)), new Set(expected));
    }
  }
});

test("Profile keeps legacy option 3 separate from new artwork numbered 4 and 5", () => {
  const profile = getHomeConfiguratorDefinition("profile")!;
  const wardrobe = profile.categories.find((category) => category.id === "primary-wardrobe");
  assert.ok(wardrobe?.kind === "room-look");
  assert.equal(wardrobe.options.filter((option) => option.legacyOnly).length, 2);
  for (const tier of ["premium", "signature"] as const) {
    const visible = getHomeTierDefinition(profile, tier).categories.find((category) => category.id === "primary-wardrobe");
    assert.ok(visible?.kind === "room-look");
    assert.deepEqual(visible.options.map((option) => option.optionNumber), ["1", "2", "4", "5"]);
  }
});

test("all 497 imported boards match the optimized image manifest and keep the full 1448px design-board canvas", () => {
  assert.equal(imageManifest.length, 497);
  assert.equal(new Set(imageManifest.map((asset) => asset.src)).size, 497);
  for (const asset of imageManifest) {
    const bytes = readFileSync(join(process.cwd(), "public", asset.src));
    assert.equal(bytes.length, asset.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
    assert.equal(asset.width, 1448);
    assert.equal(asset.height, 1086);
    assert.ok(asset.bytes < asset.sourceBytes);
  }
});

test("Salt Spring supports every independent tier pairing and one immutable shared exterior", () => {
  const duplex = getHomeConfiguratorDefinition("salt-spring")!;
  assert.deepEqual(getCanonicalHomeConfiguratorIssues(duplex), []);
  assert.equal(getRequiredCategories(duplex).length, 13);
  for (const a of ["premium", "signature"] as const) for (const b of ["premium", "signature"] as const) {
    const filtered = getDuplexTierDefinition(duplex, { a, b });
    const configuration = applyHomeTier(filtered, createDefaultHomeConfiguration(duplex));
    for (const category of getRequiredCategories(filtered)) {
      assert.ok(category.kind === "room-look");
      assert.equal(category.options.length, category.residence === "shared" ? 1 : 4);
      assert.ok(category.options.every((option) => option.shared || option.level === (category.residence === "a" ? a : b)));
      configuration.inclusionSelections[category.id] = { optionId: category.options.at(-1)!.id, status: "confirmed" };
    }
    assert.deepEqual(getSavedDuplexTiers(duplex, configuration, {a: "premium", b: "premium"}), {a,b});
    const parsed = parseCompletedLookBook("salt-spring", configuration);
    assert.equal(parsed.selections.length, 13);
    assert.equal(parsed.selections.filter((selection) => selection.tier === "shared").length, 1);
    const next = applyHomeTier(getDuplexTierDefinition(duplex, {a,b:b === "premium" ? "signature" : "premium"}), configuration);
    for (const [key, value] of Object.entries(configuration.inclusionSelections)) {
      if (!key.startsWith("residence-b-")) assert.deepEqual(next.inclusionSelections[key], value);
      else assert.equal(next.inclusionSelections[key], undefined);
    }
    assert.equal(next.reviewStatus, "draft");
  }
});
