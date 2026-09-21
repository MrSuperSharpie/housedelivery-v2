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
  getConfigurationPlannerHref,
} from "@/lib/budget-inquiry";

test("finish levels publish the approved home-package reference prices", () => {
  assert.deepEqual(pricingGuide.levels.map((level) => level.priceLabel), ["Included in base", "$225 / sq. ft.", "$275 / sq. ft."]);
  assert.match(pricingGuide.disclosure, /exclude on-site assembly and erection/);
  assert.match(pricingGuide.disclosure, /Assembly, site work, foundations, services, local trades and land are separate/);
  assert.match(pricingGuide.disclosure, /Appliances are selected and priced separately/);
  for (const model of firstNationsPlannerCatalog) {
    assert.equal(model.planningBasis.status, "under-review");
    assert.equal(model.planningBasis.base, null);
  }
});

test("pricing retains three cards and distinguishes home-package pricing from site scope", () => {
  const markup = renderToStaticMarkup(<PricingPage />);
  const cards = markup.match(/<article\b[\s\S]*?<\/article>/g)!;
  assert.equal(cards.length, 3);
  for (const card of cards) {
    assert.match(card, /Request package pricing/);
    assert.match(card, /<summary[^>]*>Local builder quote required/);
  }
  assert.match(markup, /\$225 \/ sq\. ft\./);
  assert.match(markup, /\$275 \/ sq\. ft\./);
  assert.match(markup, /applicable sales taxes are confirmed separately/);
  assert.match(markup, /Assembly, site work, foundations, services, local trades and land are separate/);
  assert.match(markup, /Appliances are selected and priced separately/);
  assert.doesNotMatch(markup, /Essential is not currently|\$150/);
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
  const planner = new URL(getConfigurationPlannerHref(definition, configuration), "https://housedelivery.ca");
  assert.equal(planner.pathname, "/pricing");
  assert.equal(planner.hash, "#budget-planner");
  assert.equal(planner.searchParams.get("model"), "saturna");
  assert.equal(planner.searchParams.get("selections"), query.searchParams.get("selections"));
  const notes = getBudgetInquiryNotes(query.searchParams);
  assert.match(notes, /\(premium\)/);
  assert.match(notes, /\(signature\)/);
  assert.doesNotMatch(notes, /\$|essential/i);
  assert.deepEqual(createDefaultHomeConfiguration(definition), original);
  assert.equal(getBudgetInquiryNotes(new URLSearchParams("finish=signature")), "");
  assert.doesNotMatch(getBudgetInquiryNotes(new URLSearchParams("inquiry=budget&finish=unknown")), /unknown/);
});
