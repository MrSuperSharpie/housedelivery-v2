import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { ModelShowcase } from "@/components/model-showcase";
import {
  getIndigenousInspiredExteriorImage,
  resolveHomeExteriorPresentation,
} from "@/data/first-nations-cultural-design";
import { models } from "@/data/models";

const indigenousInspiredCatalogueHomes = [
  "aurora",
  "boreal",
  "canmore",
  "cascade",
  "cedarview",
  "langley",
  "laurentian",
  "maplewood",
  "solace",
  "south-bay",
  "summit",
  "timberline",
];

const comingSoonCatalogueHomes = [
  "dalton",
  "keats",
  "mayne",
  "profile",
  "salt-spring",
  "saturna",
];

test("the collection defaults to Contemporary and retains normal home links", () => {
  const profile = models.find((model) => model.slug === "profile");
  assert.ok(profile);

  const markup = renderToStaticMarkup(<ModelShowcase models={[profile]} />);

  assert.match(markup, /data-exterior-presentation="contemporary"/);
  assert.match(markup, />Contemporary</);
  assert.match(markup, />Indigenous Inspired</);
  assert.match(markup, /Residence/);
  assert.match(markup, /Floor plan/);
  assert.match(markup, /href="\/homes\/profile"/);
  assert.doesNotMatch(markup, /data-indigenous-inspired-coming-soon/);
});

test("approved Indigenous-inspired exteriors resolve from the shared registry", () => {
  const available = models
    .filter((model) => getIndigenousInspiredExteriorImage(model.slug))
    .map((model) => model.slug)
    .sort();

  assert.deepEqual(available, indigenousInspiredCatalogueHomes.toSorted());

  for (const homeId of available) {
    const image = getIndigenousInspiredExteriorImage(homeId);
    assert.ok(image);
    assert.equal(existsSync(`public${image.src}`), true, image.src);
  }
});

test("missing alternate exteriors retain the Contemporary image and become Coming Soon", () => {
  const missing = models
    .filter((model) => !getIndigenousInspiredExteriorImage(model.slug))
    .map((model) => model.slug)
    .sort();

  assert.deepEqual(missing, comingSoonCatalogueHomes.toSorted());

  for (const model of models) {
    const contemporary = resolveHomeExteriorPresentation(
      model.slug,
      model.name,
      model.images[0],
      "contemporary",
    );
    assert.equal(contemporary.image.src, model.images[0]);
    assert.equal(contemporary.indigenousInspiredComingSoon, false);

    const indigenousInspired = resolveHomeExteriorPresentation(
      model.slug,
      model.name,
      model.images[0],
      "indigenous-inspired",
    );
    const registeredImage = getIndigenousInspiredExteriorImage(model.slug);

    if (registeredImage) {
      assert.equal(indigenousInspired.image.src, registeredImage.src);
      assert.equal(indigenousInspired.indigenousInspiredComingSoon, false);
    } else {
      assert.equal(indigenousInspired.image.src, model.images[0]);
      assert.equal(indigenousInspired.indigenousInspiredComingSoon, true);
    }
  }
});
