import assert from "node:assert/strict";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { HomeDesignToolCallout } from "@/components/home-design-tool-callout";
import { HomeEditorialGallery } from "@/components/home-editorial-gallery";
import { HomeDesignJourneyLink } from "@/components/inclusions-journey-links";

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

test("Salt Spring stays viewable as a project-specific duplex without Look Book actions", () => {
  const calloutMarkup = renderToStaticMarkup(
    <HomeDesignToolCallout
      homeName="Salt Spring Duplex"
      href="#home-inclusions"
      variant="primary"
      availability="preview-only"
    />,
  );
  const journeyMarkup = renderToStaticMarkup(
    <HomeDesignJourneyLink
      homeName="Salt Spring Duplex"
      href="#home-inclusions"
      availability="preview-only"
    />,
  );

  for (const markup of [calloutMarkup, journeyMarkup]) {
    assert.match(markup, /Project-Specific Duplex/i);
    assert.match(markup, /My Look Book is not currently/);
    assert.doesNotMatch(markup, /href="#home-inclusions"/);
    assert.doesNotMatch(markup, /Design My Salt Spring Duplex/);
  }

  assert.match(calloutMarkup, /Pricing is project-specific/);
  assert.match(calloutMarkup, /two independent residences/);
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
