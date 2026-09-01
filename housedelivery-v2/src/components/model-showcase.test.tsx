import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { HomeDetailHero } from "@/components/home-detail-hero";
import { HomeExteriorLightbox } from "@/components/home-exterior-lightbox";
import { ModelShowcase } from "@/components/model-showcase";
import {
  getHomeDetailHref,
  getHomeExteriorPresentationFromExpression,
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
  assert.match(markup, /data-model-card-surface-navigation="profile"/);
  assert.match(markup, /data-model-card-navigation="profile"/);
  assert.match(markup, /View larger/);
  assert.doesNotMatch(markup, /data-indigenous-inspired-coming-soon/);
});

test("card surfaces use each home's existing detail route while View Larger remains separate", () => {
  for (const slug of ["langley", "solace", "salt-spring"]) {
    const model = models.find((candidate) => candidate.slug === slug);
    assert.ok(model);

    const markup = renderToStaticMarkup(
      <ModelShowcase models={[{ ...model, images: ["/window.svg"] }]} />,
    );

    assert.match(
      markup,
      new RegExp(`data-model-card-surface-navigation="${slug}"`),
    );
    assert.match(markup, new RegExp(`href="/homes/${slug}"`));
    assert.match(
      markup,
      new RegExp(`data-open-home-exterior-preview="${slug}"`),
    );
    assert.match(markup, /<button[^>]+aria-haspopup="dialog"[^>]*>/);
  }
});

test("Langley and Solace enlarged views use their exact resolved card image", () => {
  for (const slug of ["langley", "solace"]) {
    const model = models.find((candidate) => candidate.slug === slug);
    assert.ok(model);

    const exterior = resolveHomeExteriorPresentation(
      model.slug,
      model.name,
      model.images[0],
      "indigenous-inspired",
    );
    const indigenousInspired = getIndigenousInspiredExteriorImage(model.slug);
    assert.ok(indigenousInspired);
    assert.equal(exterior.image.src, indigenousInspired.src);

    const markup = renderToStaticMarkup(
      <HomeExteriorLightbox
        model={model}
        presentation="indigenous-inspired"
        exterior={exterior}
        onPresentationChange={() => undefined}
        onClose={() => undefined}
      />,
    );

    assert.match(
      markup,
      new RegExp(`data-home-exterior-lightbox="${slug}"`),
    );
    assert.ok(markup.includes(`src="${exterior.image.src}"`));
    assert.match(markup, /data-lightbox-exterior-toggle/);
    assert.match(
      markup,
      new RegExp(`href="/homes/${slug}\\?expression=indigenous"`),
    );
    assert.doesNotMatch(markup, /data-lightbox-indigenous-coming-soon/);
  }
});

test("Salt Spring Coming Soon enlarged view retains its Contemporary exterior", () => {
  const saltSpring = models.find((model) => model.slug === "salt-spring");
  assert.ok(saltSpring);
  assert.equal(
    getIndigenousInspiredExteriorImage(saltSpring.slug),
    undefined,
  );
  const exterior = resolveHomeExteriorPresentation(
    saltSpring.slug,
    saltSpring.name,
    saltSpring.images[0],
    "indigenous-inspired",
  );

  const markup = renderToStaticMarkup(
    <HomeExteriorLightbox
      model={saltSpring}
      presentation="indigenous-inspired"
      exterior={exterior}
      onPresentationChange={() => undefined}
      onClose={() => undefined}
    />,
  );

  assert.match(markup, /data-home-exterior-lightbox="salt-spring"/);
  assert.match(markup, /data-lightbox-indigenous-coming-soon/);
  assert.ok(markup.includes(`src="${saltSpring.images[0]}"`));
  assert.match(markup, />Indigenous Inspired</);
  assert.match(markup, />Coming Soon</);
  assert.match(markup, /href="\/homes\/salt-spring"/);
  assert.doesNotMatch(markup, /expression=indigenous/);
});

test("exterior-expression navigation preserves only supported Indigenous imagery", () => {
  assert.equal(
    getHomeDetailHref("langley", "contemporary"),
    "/homes/langley",
  );
  assert.equal(
    getHomeDetailHref("langley", "indigenous-inspired"),
    "/homes/langley?expression=indigenous",
  );
  assert.equal(
    getHomeDetailHref("solace", "indigenous-inspired"),
    "/homes/solace?expression=indigenous",
  );
  assert.equal(
    getHomeDetailHref("salt-spring", "indigenous-inspired"),
    "/homes/salt-spring",
  );
  assert.equal(
    getHomeExteriorPresentationFromExpression("indigenous"),
    "indigenous-inspired",
  );
  assert.equal(
    getHomeExteriorPresentationFromExpression(undefined),
    "contemporary",
  );
});

test("home-detail hero starts with the supported expression and exposes the same toggle", () => {
  const langley = models.find((model) => model.slug === "langley");
  assert.ok(langley);
  const indigenousInspired = getIndigenousInspiredExteriorImage("langley");
  assert.ok(indigenousInspired);

  const markup = renderToStaticMarkup(
    <HomeDetailHero
      model={{ ...langley, heroImage: "/window.svg" }}
      modelNumber={1}
      modelCount={models.length}
      initialExteriorPresentation="indigenous-inspired"
    />,
  );

  assert.match(
    markup,
    /data-home-exterior-presentation="indigenous-inspired"/,
  );
  assert.ok(markup.includes(`data-home-exterior-image="${indigenousInspired.src}"`));
  assert.match(markup, /data-home-exterior-presentation-toggle/);
  assert.match(markup, />Contemporary</);
  assert.match(markup, />Indigenous Inspired</);
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
