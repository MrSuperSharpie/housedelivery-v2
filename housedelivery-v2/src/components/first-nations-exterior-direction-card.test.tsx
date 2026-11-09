import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { CulturalDesignReport } from "@/components/cultural-design-report";
import { FirstNationsExteriorDirectionCard } from "@/components/first-nations-exterior-direction-card";
import { getCulturalDesignImage } from "@/data/first-nations-cultural-design";

const noop = () => {};

test("approved Coastal imagery resolves case-sensitive paths without substitution", () => {
  const approvedHomeIds = [
    "aurora",
    "boreal",
    "canmore",
    "cascade",
    "cedarview",
    "langley",
    "laurentian",
    "maplewood",
    "meridian",
    "solace",
    "solstice",
    "south-bay",
    "summit",
    "timberline",
  ];

  for (const homeId of approvedHomeIds) {
    const image = getCulturalDesignImage(homeId);
    assert.ok(image, `Missing cultural design image registry entry: ${homeId}`);
    assert.equal(existsSync(`public${image.src}`), true, image.src);
  }

  assert.equal(getCulturalDesignImage("dalton"), undefined);
  assert.equal(
    getCulturalDesignImage("south-bay")?.src,
    "/images/first-nations-inspired/design-center/Southbay-Coastal.png",
  );
  assert.equal(getCulturalDesignImage("saturna"), undefined);
});

test("Indigenous Inspiration swaps the First Nations home card image and labels it as illustrative", () => {
  const coastalImage = getCulturalDesignImage("solace");
  assert.ok(coastalImage);
  const markup = renderToStaticMarkup(
    <FirstNationsExteriorDirectionCard
      homeName="Solace"
      standardImage="/images/homes/solace/exterior.jpg"
      coastalImage={coastalImage}
      culturalExteriorInterest
      onChange={noop}
    />,
  );

  assert.match(
    markup,
    /src="\/images\/first-nations-inspired\/design-center\/Solace-Coastal\.png"/,
  );
  assert.doesNotMatch(markup, /\/_next\/image\?url=/);
  assert.match(markup, /Contemporary/);
  assert.match(markup, /Indigenous Inspiration/);
  assert.doesNotMatch(markup, /Coastal Inspiration/);
  assert.match(markup, /Illustrative Exterior Inspiration/);
  assert.match(markup, /early visual direction only/);
  assert.match(markup, /not a fixed product, approved design or supplier package/);
  assert.match(markup, /underlying home model remains Solace/);
  assert.doesNotMatch(markup, /Areas to explore/);
  assert.doesNotMatch(markup, /Interior feature elements/);
});

test("Contemporary keeps the normal home-card image", () => {
  const coastalImage = getCulturalDesignImage("solace");
  assert.ok(coastalImage);
  const markup = renderToStaticMarkup(
    <FirstNationsExteriorDirectionCard
      homeName="Solace"
      standardImage="/images/homes/solace/exterior.jpg"
      coastalImage={coastalImage}
      culturalExteriorInterest={false}
      onChange={noop}
    />,
  );

  assert.match(markup, /src="\/images\/homes\/solace\/exterior\.jpg"/);
  assert.doesNotMatch(markup, /\/_next\/image\?url=/);
  assert.doesNotMatch(markup, /Solace-Coastal\.png/);
  assert.doesNotMatch(markup, /Illustrative Exterior Inspiration/);
});

test("Contemporary-only homes keep the shared control dimensions and expose a disabled Coming Soon option", () => {
  const markup = renderToStaticMarkup(
    <FirstNationsExteriorDirectionCard
      homeName="Dalton"
      standardImage="/images/homes/dalton/exterior.jpg"
      culturalExteriorInterest
      onChange={noop}
    />,
  );

  assert.match(markup, /data-indigenous-inspiration-available="false"/);
  assert.match(markup, /data-cultural-exterior-interest="false"/);
  assert.match(markup, /src="\/images\/homes\/dalton\/exterior\.jpg"/);
  assert.match(markup, /Contemporary/);
  assert.match(
    markup,
    /aria-disabled="true" aria-pressed="false" disabled=""[^>]*>[^<]*<span[^>]*><span>Indigenous Inspiration<\/span><span[^>]*>Coming Soon<\/span>/,
  );
  assert.equal((markup.match(/h-14/g) ?? []).length, 2);
  assert.doesNotMatch(markup, /Illustrative Exterior Inspiration/);
});

test("Opportunity Report carries only the exterior cultural-direction note", () => {
  const markup = renderToStaticMarkup(
    <CulturalDesignReport
      records={[
        {
          id: "solace-line:design-a",
          designName: "Solace — Design A",
        },
      ]}
    />,
  );

  assert.match(markup, /Cultural Design Direction/);
  assert.match(markup, /Solace — Design A/);
  assert.match(markup, /Indigenous Inspiration selected/);
  assert.match(
    markup,
    /Exterior cultural expression to be developed with the Nation during project review/,
  );
  assert.doesNotMatch(markup, /Areas to explore/);
});
