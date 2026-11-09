import assert from "node:assert/strict";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { PropertySnapshot } from "@/components/property-snapshot";
import type { PublicPropertySnapshot } from "@/lib/property-review/types";

const baseSnapshot: PublicPropertySnapshot = {
  status: "green",
  statusLabel: "PROMISING PROPERTY",
  headline: "Your property looks promising.",
  address: "3193 KITCHENER ST, Vancouver, BC",
  municipality: "City of Vancouver",
  zoning: "R1-1",
  propertyType: "Non-strata residential parcel",
  approximateLotSize: "5,200 sq. ft. (483 m²)",
  opportunity: "Laneway / backyard home worth exploring",
  message:
    "Based on the available information, this property appears worth progressing.",
  modelMatchStatus: "REVIEW_PENDING",
};

const noop = () => undefined;

function render(snapshot: PublicPropertySnapshot) {
  return renderToStaticMarkup(
    <PropertySnapshot
      snapshot={snapshot}
      onClose={noop}
      onCheckAnother={noop}
      onReviewCta={noop}
    />,
  );
}

test("green snapshot presents safe property facts and review CTAs", () => {
  const markup = render(baseSnapshot);
  assert.match(markup, /Your Property Snapshot/);
  assert.match(markup, /PROMISING PROPERTY/);
  assert.match(markup, /R1-1/);
  assert.match(markup, /Book my property review/);
  assert.match(markup, /Explore the homes/);
  assert.doesNotMatch(markup, /permit approved|guaranteed/i);
});

test("yellow snapshot requests no customer action", () => {
  const markup = render({
    ...baseSnapshot,
    status: "yellow",
    statusLabel: "REVIEW IN PROGRESS",
    headline: "Your property needs a closer look.",
    opportunity: "Human review required before a recommendation",
    message: "Nothing is required from you right now.",
  });
  assert.match(markup, /REVIEW IN PROGRESS/);
  assert.match(markup, /Nothing is required from you right now/);
  assert.doesNotMatch(markup, /Book my property review/);
});

test("red snapshot offers another property check without technical detail", () => {
  const markup = render({
    ...baseSnapshot,
    status: "red",
    statusLabel: "NOT A CONVENTIONAL FIT",
    headline: "We’ve reviewed your property.",
    propertyType: "Strata unit / multifamily property",
    opportunity: "Another property may be a better fit",
    message:
      "This does not appear to be a conventional detached residential property.",
  });
  assert.match(markup, /NOT A CONVENTIONAL FIT/);
  assert.match(markup, /Check another property/);
  assert.doesNotMatch(markup, /MUNICIPAL_DATA|RULE DETAIL|HTTP 503/);
});
