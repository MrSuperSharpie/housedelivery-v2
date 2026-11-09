import assert from "node:assert/strict";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { HomeConfigurator } from "@/components/home-configurator";
import { getHomeConfiguratorDefinition } from "@/data/home-configurators";

test("Visual Guide configurators serve boards directly and use the full home title", () => {
  const definition = getHomeConfiguratorDefinition("canmore");
  assert.ok(definition);

  const markup = renderToStaticMarkup(
    <HomeConfigurator definition={definition} />,
  );

  assert.match(
    markup,
    /src="\/images\/homes\/canmore\/visual-guide\/Canmore_01_Kitchen_Premium-1_Hearth-Oak\.png"/,
  );
  assert.doesNotMatch(markup, /_next\/image/);
  assert.match(markup, /My Canmore House/);
  assert.match(markup, /Selected for My Canmore House/);
  assert.doesNotMatch(markup, /Canmore House House/);
});
