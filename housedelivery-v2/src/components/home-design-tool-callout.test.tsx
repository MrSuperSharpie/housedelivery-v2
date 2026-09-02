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

test("a preview-only home stays viewable without project or design actions", () => {
  const statusCopy =
    "Available to explore. Project selection, Design My Home and Look Book configuration are coming soon.";
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
    assert.match(markup, /Preview Model/i);
    assert.match(markup, new RegExp(statusCopy.replaceAll(" ", "\\s*"), "i"));
    assert.doesNotMatch(markup, /<button/);
    assert.doesNotMatch(markup, /href="#home-inclusions"/);
    assert.doesNotMatch(markup, /Return to My Project/);
  }
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
