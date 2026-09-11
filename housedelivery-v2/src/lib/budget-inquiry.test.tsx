import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import PricingPage from "@/app/pricing/page";
import { HomeBudgetSection } from "@/components/home-budget-section";
import { createDefaultHomeConfiguration } from "@/data/home-configurator";
import { getHomeConfiguratorDefinition } from "@/data/home-configurators";
import { inquiryModels } from "@/data/inquiry-models";
import { firstNationsPlannerCatalog } from "@/data/first-nations-planner";
import { pricingGuide } from "@/data/pricing";
import {
  getBudgetInquiryHref,
  getBudgetInquiryNotes,
  getConfigurationBudgetHref,
} from "@/lib/budget-inquiry";

test("preliminary package ranges remain separate from unpriced delivery, construction and models", () => {
  assert.equal(pricingGuide.reviewedOn, "2026-09-10");
  assert.deepEqual(pricingGuide.levels.map(({ manufactured }) => manufactured), [
    [150, 180],
    [165, 205],
    [190, 250],
  ]);
  for (const level of pricingGuide.levels) {
    assert.equal("delivered" in level, false);
    assert.equal("completed" in level, false);
  }
  for (const model of firstNationsPlannerCatalog) {
    assert.equal(model.planningBasis.status, "under-review", model.id);
    assert.equal(model.planningBasis.low, null, model.id);
    assert.equal(model.planningBasis.base, null, model.id);
    assert.equal(model.planningBasis.high, null, model.id);
  }
});

test("pricing presents complete package budgets with explicit unpriced stages", () => {
  const markup = renderToStaticMarkup(<PricingPage />);
  const cards = markup.match(/<article\b[\s\S]*?<\/article>/g)!;
  assert.equal(cards.length, 3);
  for (const card of cards) {
    assert.ok(card.indexOf("Manufactured Package") < card.indexOf("Delivery"));
    assert.match(card, /Calculated for your project location\./);
    assert.match(card, /<summary[^>]*>Local builder quote required/);
    assert.equal((card.match(/\$/g) ?? []).length, 1);
  }
  assert.ok(markup.indexOf(pricingGuide.disclosure) > markup.lastIndexOf("</details>"));
  assert.match(markup, /alternative complete manufactured-package budgets/);
  assert.ok(markup.includes(pricingGuide.introduction));
  assert.ok(markup.includes(pricingGuide.applicability));
  for (const scope of Object.values(pricingGuide.scopes)) {
    assert.ok(markup.includes(scope.description));
  }
  assert.match(markup, /Essential is not currently a selectable package/);
  assert.doesNotMatch(markup, /Starting from|120 days|20–30%|Estimated completed build|Delivered package|\$(?:450–575|500–650|550–750|215–255|240–300|270–350)/);
});

test("every public home receives an enquiry link without a numerical model price", () => {
  assert.equal(new Set(inquiryModels.map((model) => model.slug)).size, inquiryModels.length);
  for (const model of inquiryModels) {
    const markup = renderToStaticMarkup(<HomeBudgetSection model={model.slug} />);
    assert.doesNotMatch(markup, /\$/);
    assert.match(markup, /Your budget depends on your site, selected specifications and delivery location\./);
    const query = new URL(getBudgetInquiryHref({ model: model.slug }), "https://housedelivery.ca");
    assert.equal(query.pathname, "/");
    assert.equal(query.hash, "#reserve");
    assert.equal(query.searchParams.get("model"), model.slug);
  }
});

test("budget enquiries carry mixed selections without inventing a home tier or changing defaults", () => {
  const definition = getHomeConfiguratorDefinition("saturna")!;
  assert.ok(definition);
  const configuration = createDefaultHomeConfiguration(definition);
  const original = structuredClone(configuration);
  const selectable = definition.categories.filter((category) => category.kind === "room-look" || category.kind === "standard");
  assert.ok(selectable.length >= 2);
  for (const [index, category] of selectable.slice(0, 2).entries()) {
    const option = category.options.find((item) => item.level === (index ? "signature" : "premium"))!;
    assert.ok(option);
    configuration.inclusionSelections[category.id] = { optionId: option.id, status: "confirmed" };
  }
  const query = new URL(getConfigurationBudgetHref(definition, configuration), "https://housedelivery.ca");
  assert.equal(query.searchParams.get("model"), "saturna");
  assert.equal(query.searchParams.get("finish"), null);
  const notes = getBudgetInquiryNotes(query.searchParams);
  assert.match(notes, /\(premium\)/);
  assert.match(notes, /\(signature\)/);
  assert.doesNotMatch(notes, /\$|essential/i);
  assert.deepEqual(createDefaultHomeConfiguration(definition), original);
  assert.equal(getBudgetInquiryNotes(new URLSearchParams("finish=signature")), "");
  assert.doesNotMatch(getBudgetInquiryNotes(new URLSearchParams("inquiry=budget&finish=unknown")), /unknown/);
});
