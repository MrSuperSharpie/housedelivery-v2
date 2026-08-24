import assert from "node:assert/strict";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { HomeDesignToolCallout } from "@/components/home-design-tool-callout";
import { HomeEditorialGallery } from "@/components/home-editorial-gallery";

test("unfinished homes render a non-navigating Lookbook Coming Soon entry point", () => {
  const markup = renderToStaticMarkup(
    <HomeDesignToolCallout
      homeName="Langley"
      variant="primary"
      availability="coming-soon"
    />,
  );

  assert.match(markup, /Design Lookbook/);
  assert.match(markup, /Coming/);
  assert.match(markup, /Soon\./);
  assert.match(
    markup,
    /We’re currently preparing the curated interior and exterior design collections for this home\./,
  );
  assert.match(markup, /Design Lookbook Coming Soon/);
  assert.match(markup, /Contact House Delivery/);
  assert.match(markup, /href="\/#reserve"/);
  assert.doesNotMatch(markup, /#home-inclusions/);
  assert.doesNotMatch(markup, /Design My Langley/);
});

test("approved standalone homes use Design My Home terminology", () => {
  const markup = renderToStaticMarkup(
    <HomeDesignToolCallout
      homeName="Solace"
      href="#home-inclusions"
      variant="primary"
      availability="available"
    />,
  );

  assert.match(markup, /Design My Solace/);
  assert.doesNotMatch(markup, /Build My Solace/);
});

test("a home can suppress only the gallery Lookbook callout", () => {
  const markup = renderToStaticMarkup(
    <HomeEditorialGallery
      modelName="The Salt Spring Duplex"
      images={[
        "/images/homes/salt-spring/salt-spring-hero.jpg",
        "/images/homes/salt-spring/salt-spring-living-room.jpg",
        "/images/homes/salt-spring/salt-spring-kitchen.jpg",
      ]}
      floorPlanImage="/images/homes/salt-spring/salt-spring-floor-plan.jpg"
      imageQuality={75}
      designToolDiscovery={{
        homeName: "Salt Spring Duplex",
        availability: "coming-soon",
        showGalleryCallout: false,
      }}
    />,
  );

  assert.doesNotMatch(markup, /Design Lookbook/);
  assert.doesNotMatch(markup, /Design Lookbook Coming Soon/);
  assert.match(markup, /salt-spring-hero\.jpg/);
  assert.match(markup, /salt-spring-living-room\.jpg/);
  assert.match(markup, /salt-spring-kitchen\.jpg/);
});
