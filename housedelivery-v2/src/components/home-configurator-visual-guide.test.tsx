import assert from "node:assert/strict";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { HomeConfigurationSummary } from "@/components/home-configuration-summary";
import { HomeConfigurator } from "@/components/home-configurator";
import {
  createDefaultHomeConfiguration,
  getHomeConfiguratorJourneyCategories,
} from "@/data/home-configurator";
import { getHomeConfiguratorDefinition } from "@/data/home-configurators";

const completedLookBookHomeIds = [
  "canmore",
  "saturna",
  "solace",
  "south-bay",
] as const;

test("Visual Guide configurators serve boards directly and use the full home title", () => {
  const definition = getHomeConfiguratorDefinition("canmore");
  assert.ok(definition);

  const markup = renderToStaticMarkup(
    <HomeConfigurator definition={definition} />,
  );

  assert.match(
    markup,
    /src="\/images\/homes\/canmore\/visual-guide\/kitchen\/Canmore%20-%20Kitchen%20-%20Premium%201\.png"/,
  );
  assert.doesNotMatch(markup, /_next\/image/);
  assert.match(markup, /My Canmore House/);
  assert.match(markup, /Selected for My Canmore House/);
  assert.doesNotMatch(markup, /Canmore House House/);
});

test("completed Look Books publicly show two Premium and two Signature choices", () => {
  for (const homeId of completedLookBookHomeIds) {
    const definition = getHomeConfiguratorDefinition(homeId);
    assert.ok(definition);

    const markup = renderToStaticMarkup(
      <HomeConfigurator definition={definition} />,
    );
    const premiumPosition = markup.indexOf('data-option-tier-section="premium"');
    const signaturePosition = markup.indexOf('data-option-tier-section="signature"');

    assert.ok(premiumPosition >= 0, `${homeId} Premium section missing`);
    assert.ok(signaturePosition > premiumPosition, `${homeId} tier order changed`);
    assert.equal((markup.match(/data-tier-option-count="2"/g) ?? []).length, 2);
    assert.equal((markup.match(/data-home-option=/g) ?? []).length, 4);
    assert.match(markup, />PREMIUM</);
    assert.match(markup, /Included with Premium specification/);
    assert.match(markup, />SIGNATURE</);
    assert.match(markup, /Upgrade Collection/);
    assert.match(
      markup,
      /Elevated materials, detailing and specification\. Upgrade pricing confirmed with the final home specification\./,
    );
  }
});

test("My House summary identifies confirmed Premium and Signature tiers", () => {
  const definition = getHomeConfiguratorDefinition("canmore");
  assert.ok(definition);
  const firstCategory = getHomeConfiguratorJourneyCategories(definition)[0];
  assert.ok(firstCategory);
  assert.equal(firstCategory.kind, "room-look");
  if (firstCategory.kind !== "room-look") return;

  for (const level of ["premium", "signature"] as const) {
    const option = firstCategory.options.find(
      (candidate) => candidate.level === level,
    );
    assert.ok(option);
    const configuration = createDefaultHomeConfiguration(definition);
    configuration.inclusionSelections[firstCategory.id] = {
      optionId: option.id,
      status: "confirmed",
    };
    const markup = renderToStaticMarkup(
      <HomeConfigurationSummary
        variant="sticky"
        definition={definition}
        configuration={configuration}
      />,
    );

    assert.match(markup, new RegExp(`data-summary-option-tier="${level}"`));
    assert.match(
      markup,
      new RegExp(level === "premium" ? "Premium — Included" : "Signature — Upgrade"),
    );
  }
});
