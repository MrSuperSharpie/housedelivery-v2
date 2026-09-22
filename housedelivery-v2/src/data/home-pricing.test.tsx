import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeConfigurator } from "@/components/home-configurator";
import { HomeDesignToolCallout } from "@/components/home-design-tool-callout";
import { createDefaultHomeConfiguration } from "@/data/home-configurator";
import { getHomeConfiguratorDefinition } from "@/data/home-configurators";
import { applyHomeTier, getHomeTierDefinition, homePricing } from "@/data/home-pricing";
import { models } from "@/data/models";
import { parseCompletedLookBook } from "@/lib/lookbook/domain";

const solace = getHomeConfiguratorDefinition("solace")!;

test("every custom home uses its stored area and the reference rates", () => {
  assert.equal(homePricing.premium.rate, 225);
  assert.equal(homePricing.signature.rate, 275);
  for (const model of models) {
    const definition = getHomeConfiguratorDefinition(model.slug);
    const markup = renderToStaticMarkup(
      <HomeDesignToolCallout
        homeName={model.name}
        variant="primary"
        pricingSquareFeet={model.squareFeet}
        href={definition ? "#home-inclusions" : undefined}
        availability={"projectSelectionStatus" in model && model.projectSelectionStatus === "preview-only" ? "preview-only" : "available"}
      />,
    );
    assert.ok(markup.includes(model.squareFeet.toLocaleString("en-CA")), model.slug);
    for (const rate of [225, 275]) {
      assert.ok(markup.includes((model.squareFeet * rate).toLocaleString("en-CA")), `${model.slug}: ${rate}`);
    }
    assert.equal((markup.match(/data-home-tier=/g) ?? []).length, 2);
    assert.equal((markup.match(/disabled=""/g) ?? []).length, definition ? 0 : 2);
  }
});

test("both tiers remain selectable and create valid Look Books for every active custom home", () => {
  for (const model of models) {
    const definition = getHomeConfiguratorDefinition(model.slug);
    if (!definition) {
      assert.equal(model.slug, "salt-spring", "Only the existing preview home lacks a Look Book");
      continue;
    }
    const original = JSON.stringify(definition);
    for (const tier of ["premium", "signature"] as const) {
      const filtered = getHomeTierDefinition(definition, tier);
      const configuration = applyHomeTier(filtered, createDefaultHomeConfiguration(definition));
      for (const category of filtered.categories) {
        if (category.kind === "coordinated") continue;
        const groups = category.kind === "flooring" ? category.zones : [category];
        for (const group of groups) {
          assert.ok(group.options.length > 0, `${model.slug}: ${tier}: ${group.id}`);
          assert.ok(group.options.every((option) => option.level === tier));
          const selections = category.kind === "flooring" ? configuration.flooringSelections : configuration.inclusionSelections;
          selections[group.id] = { optionId: group.options[0].id, status: "confirmed" };
        }
      }
      const lookBook = parseCompletedLookBook(model.slug, configuration);
      assert.ok(lookBook.selections.length > 0);
      assert.ok(lookBook.selections.every((selection) => selection.tier === tier));
    }
    assert.equal(JSON.stringify(definition), original, `${model.slug}: canonical options unchanged`);
  }
});

test("Solace starting totals and scope appear only in its primary callout", () => {
  const markup = renderToStaticMarkup(
    <HomeDesignToolCallout homeName="Solace House" variant="primary" href="#home-inclusions" pricingSquareFeet={5405} />,
  );
  assert.match(markup, /5,405 sq. ft./);
  assert.match(markup, /All prices in CAD/);
  assert.match(markup, /225/);
  assert.match(markup, /275/);
  assert.match(markup, /1,216,125/);
  assert.match(markup, /1,486,375/);
  assert.match(markup, /Includes shipping and applicable import tariffs/);
  assert.match(markup, /Excludes site work, foundations, on-site assembly, and sales taxes/);
  assert.match(markup, /Appliances are selected and priced separately/);
  assert.match(markup, /Land, site services and local trade work are separate/);
  assert.match(markup, /Assembly &amp; erection is quoted separately on a project-specific basis/);
  assert.equal((markup.match(/data-home-tier=/g) ?? []).length, 2);
  for (const props of [
    { homeName: "Langley House", variant: "primary" as const },
    { homeName: "Solace House", variant: "quiet" as const, pricingSquareFeet: 5405 },
  ]) {
    assert.doesNotMatch(renderToStaticMarkup(<HomeDesignToolCallout {...props} href="#home-inclusions" />), /data-home-pricing/);
  }
});

test("both tiers filter every room and flooring zone without modifying the catalogue", () => {
  const original = JSON.stringify(solace);
  for (const tier of ["premium", "signature"] as const) {
    const filtered = getHomeTierDefinition(solace, tier);
    assert.equal(filtered.categories.length, solace.categories.length);
    for (const category of filtered.categories) {
      if (category.kind === "coordinated") continue;
      const groups = category.kind === "flooring" ? category.zones.map((zone) => zone.options) : [category.options];
      for (const options of groups) {
        assert.ok(options.length > 0, `${tier}: ${category.id} has options`);
        assert.ok(options.every((option) => option.level === tier));
      }
    }
    const markup = renderToStaticMarkup(<HomeConfigurator definition={solace} inclusionTier={tier} />);
    assert.match(markup, new RegExp(`data-option-level="${tier}"`));
    assert.doesNotMatch(markup, new RegExp(`data-option-level="${tier === "premium" ? "signature" : "premium"}"`));
  }
  assert.equal(JSON.stringify(solace), original);
  const langley = getHomeConfiguratorDefinition("langley")!;
  assert.throws(() => applyHomeTier(langley, createDefaultHomeConfiguration(solace)));
  const langleyMarkup = renderToStaticMarkup(<HomeConfigurator definition={langley} inclusionTier="premium" />);
  assert.match(langleyMarkup, /data-option-level="premium"/);
  assert.doesNotMatch(langleyMarkup, /data-option-level="signature"/);
});

test("switching tiers removes incompatible saved choices and stale Look Book completion", () => {
  const premium = getHomeTierDefinition(solace, "premium");
  const signature = getHomeTierDefinition(solace, "signature");
  const complete = createDefaultHomeConfiguration(solace);
  for (const category of premium.categories) {
    if (category.kind === "coordinated") continue;
    if (category.kind === "flooring") {
      for (const zone of category.zones) complete.flooringSelections[zone.id] = { optionId: zone.options[0].id, status: "confirmed" };
    } else complete.inclusionSelections[category.id] = { optionId: category.options[0].id, status: "confirmed" };
  }
  complete.reviewStatus = "ready-for-review";
  complete.lookBookPersonalization = { reference: "QA", preparedAt: "2026-09-11T00:00:00Z" };
  assert.deepEqual(applyHomeTier(premium, complete), complete);
  const changed = applyHomeTier(signature, complete);
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
