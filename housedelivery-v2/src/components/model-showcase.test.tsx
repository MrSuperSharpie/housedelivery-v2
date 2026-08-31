import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { HomeExteriorLightbox } from "@/components/home-exterior-lightbox";
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
  assert.match(markup, /data-open-home-exterior-preview="profile"/);
  assert.match(markup, /data-model-card-navigation="profile"/);
  assert.match(markup, /View larger/);
  assert.doesNotMatch(markup, /data-indigenous-inspired-coming-soon/);
});

test("an available Indigenous-inspired exterior renders in the enlarged viewer", () => {
  const canmore = models.find((model) => model.slug === "canmore");
  assert.ok(canmore);

  const indigenousInspired = getIndigenousInspiredExteriorImage(
    canmore.slug,
  );
  assert.ok(indigenousInspired);

  const markup = renderToStaticMarkup(
    <HomeExteriorLightbox
      model={canmore}
      presentation="indigenous-inspired"
      onPresentationChange={() => undefined}
      onClose={() => undefined}
    />,
  );

  assert.match(markup, /data-home-exterior-lightbox="canmore"/);
  assert.match(
    markup,
    /data-lightbox-exterior-presentation="indigenous-inspired"/,
  );
  assert.ok(markup.includes(indigenousInspired.src));
  assert.match(markup, /data-lightbox-exterior-toggle/);
  assert.match(markup, /href="\/homes\/canmore"/);
  assert.doesNotMatch(markup, /data-lightbox-indigenous-coming-soon/);
});

test("a Coming Soon enlarged view retains its Contemporary exterior", () => {
  const profile = models.find((model) => model.slug === "profile");
  assert.ok(profile);
  assert.equal(getIndigenousInspiredExteriorImage(profile.slug), undefined);

  const markup = renderToStaticMarkup(
    <HomeExteriorLightbox
      model={profile}
      presentation="indigenous-inspired"
      onPresentationChange={() => undefined}
      onClose={() => undefined}
    />,
  );

  assert.match(markup, /data-home-exterior-lightbox="profile"/);
  assert.match(markup, /data-lightbox-indigenous-coming-soon/);
  assert.ok(markup.includes(profile.images[0]));
  assert.match(markup, />Indigenous Inspired</);
  assert.match(markup, />Coming Soon</);
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
