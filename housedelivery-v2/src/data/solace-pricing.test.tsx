import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeConfigurator } from "@/components/home-configurator";
import { HomeDesignToolCallout } from "@/components/home-design-tool-callout";
import { createDefaultHomeConfiguration } from "@/data/home-configurator";
import { getHomeConfiguratorDefinition } from "@/data/home-configurators";
import { applySolaceTier, getSolaceTierDefinition } from "@/data/solace-pricing";
import { parseCompletedLookBook } from "@/lib/lookbook/domain";

const solace = getHomeConfiguratorDefinition("solace")!;

test("Solace starting totals and scope appear only in its primary callout", () => {
  const markup = renderToStaticMarkup(
    <HomeDesignToolCallout homeName="Solace House" variant="primary" href="#home-inclusions" showSolacePricing />,
  );
  assert.match(markup, /5,405 sq. ft./);
  assert.match(markup, /All prices in CAD/);
  assert.match(markup, /225/);
  assert.match(markup, /275/);
  assert.match(markup, /1,216,125/);
  assert.match(markup, /1,486,375/);
  assert.match(markup, /Includes shipping and applicable import tariffs/);
  assert.match(markup, /Excludes site work, foundations, on-site assembly, and sales taxes/);
  assert.match(markup, /Assembly: Quoted separately/);
  assert.equal((markup.match(/data-solace-tier=/g) ?? []).length, 2);
  for (const props of [
    { homeName: "Langley House", variant: "primary" as const },
    { homeName: "Solace House", variant: "quiet" as const, showSolacePricing: true },
  ]) {
    assert.doesNotMatch(renderToStaticMarkup(<HomeDesignToolCallout {...props} href="#home-inclusions" />), /data-solace-pricing/);
  }
});

test("both tiers filter every room and flooring zone without modifying the catalogue", () => {
  const original = JSON.stringify(solace);
  for (const tier of ["premium", "signature"] as const) {
    const filtered = getSolaceTierDefinition(solace, tier);
    assert.equal(filtered.categories.length, solace.categories.length);
    for (const category of filtered.categories) {
      if (category.kind === "coordinated") continue;
      const groups = category.kind === "flooring" ? category.zones.map((zone) => zone.options) : [category.options];
      for (const options of groups) {
        assert.ok(options.length > 0, `${tier}: ${category.id} has options`);
        assert.ok(options.every((option) => option.level === tier));
      }
    }
    const markup = renderToStaticMarkup(<HomeConfigurator definition={solace} solaceTier={tier} />);
    assert.match(markup, new RegExp(`data-option-level="${tier}"`));
    assert.doesNotMatch(markup, new RegExp(`data-option-level="${tier === "premium" ? "signature" : "premium"}"`));
  }
  assert.equal(JSON.stringify(solace), original);
  const langley = getHomeConfiguratorDefinition("langley")!;
  assert.throws(() => getSolaceTierDefinition(langley, "premium"));
  const langleyMarkup = renderToStaticMarkup(<HomeConfigurator definition={langley} solaceTier="premium" />);
  assert.match(langleyMarkup, /data-option-level="premium"/);
  assert.match(langleyMarkup, /data-option-level="signature"/);
});

test("switching tiers removes incompatible saved choices and stale Look Book completion", () => {
  const premium = getSolaceTierDefinition(solace, "premium");
  const signature = getSolaceTierDefinition(solace, "signature");
  const complete = createDefaultHomeConfiguration(solace);
  for (const category of premium.categories) {
    if (category.kind === "coordinated") continue;
    if (category.kind === "flooring") {
      for (const zone of category.zones) complete.flooringSelections[zone.id] = { optionId: zone.options[0].id, status: "confirmed" };
    } else complete.inclusionSelections[category.id] = { optionId: category.options[0].id, status: "confirmed" };
  }
  complete.reviewStatus = "ready-for-review";
  complete.lookBookPersonalization = { reference: "QA", preparedAt: "2026-09-11T00:00:00Z" };
  assert.deepEqual(applySolaceTier(premium, complete), complete);
  const changed = applySolaceTier(signature, complete);
  assert.equal(changed.reviewStatus, "draft");
  assert.equal(changed.lookBookPersonalization, null);
  assert.equal(Object.keys(changed.flooringSelections).length, 0);
  assert.equal(Object.keys(changed.inclusionSelections).length, 1);
  assert.ok(Object.values(changed.inclusionSelections).every((selection) => selection?.status === "draft"));
  for (const category of signature.categories) {
    if (category.kind === "coordinated") continue;
    if (category.kind === "flooring") {
      for (const zone of category.zones) changed.flooringSelections[zone.id] = { optionId: zone.options[0].id, status: "confirmed" };
    } else changed.inclusionSelections[category.id] = { optionId: category.options[0].id, status: "confirmed" };
  }
  const saved = parseCompletedLookBook("solace", changed);
  assert.ok(saved.selections.length > 0);
  assert.ok(saved.selections.every((selection) => selection.tier === "signature"));
  assert.equal(complete.reviewStatus, "ready-for-review", "original selections were not mutated");
});
