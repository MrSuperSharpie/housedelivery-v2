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

test("the approved general ranges remain separate from model planning bases", () => {
  assert.equal(pricingGuide.reviewedOn, "2026-09-10");
  assert.deepEqual(pricingGuide.levels.map(({ manufactured, delivered, completed }) => [manufactured, delivered, completed]), [
    [[150, 180], [215, 255], [450, 575]],
    [[165, 205], [240, 300], [500, 650]],
    [[190, 250], [270, 350], [550, 750]],
  ]);
  for (const model of firstNationsPlannerCatalog) {
    assert.equal(model.planningBasis.status, "under-review", model.id);
    assert.equal(model.planningBasis.low, null, model.id);
    assert.equal(model.planningBasis.base, null, model.id);
    assert.equal(model.planningBasis.high, null, model.id);
  }
});

test("pricing presents completed budgets first and disclosures outside details", () => {
  const markup = renderToStaticMarkup(<PricingPage />);
  const cards = markup.match(/<article\b[\s\S]*?<\/article>/g)!;
  assert.equal(cards.length, 3);
  for (const card of cards) {
    assert.ok(card.indexOf("Estimated completed build") < card.indexOf("Delivered package"));
    assert.ok(card.indexOf("Delivered package") < card.indexOf("<details"));
    assert.match(card, /<summary[^>]*>Manufactured package/);
  }
  assert.ok(markup.indexOf(pricingGuide.disclosure) > markup.lastIndexOf("</details>"));
  assert.match(markup, /alternative scope/);
  assert.match(markup, /Essential is not currently a selectable package/);
  assert.doesNotMatch(markup, /Starting from|120 days|20–30%/);
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
