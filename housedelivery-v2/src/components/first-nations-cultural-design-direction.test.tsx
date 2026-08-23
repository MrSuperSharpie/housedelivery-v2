import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { CulturalDesignReport } from "@/components/cultural-design-report";
import { FirstNationsCulturalDesignDirection } from "@/components/first-nations-cultural-design-direction";
import { getCulturalDesignImage } from "@/data/first-nations-cultural-design";

const noop = () => {};

test("First Nations project mode asks the optional cultural design question", () => {
  const markup = renderToStaticMarkup(
    <FirstNationsCulturalDesignDirection
      homeName="Solace"
      image={getCulturalDesignImage("solace")}
      onChoose={noop}
      onToggleArea={noop}
      onContinue={noop}
    />,
  );

  assert.match(markup, /Would you like to explore a Cultural &amp; Place-Based Design/);
  assert.match(markup, /Yes — Explore Cultural &amp; Place-Based Design/);
  assert.match(markup, /No — Continue with Contemporary Design/);
  assert.doesNotMatch(markup, /Solace-Coastal\.png/);
});

test("approved Coastal imagery resolves case-sensitive paths without substitution", () => {
  const approvedHomeIds = [
    "aurora",
    "boreal",
    "canmore",
    "cascade",
    "cedarview",
    "dalton",
    "langley",
    "laurentian",
    "maplewood",
    "meridian",
    "solace",
    "solstice",
    "southbay",
    "summit",
    "timberline",
  ];

  for (const homeId of approvedHomeIds) {
    const image = getCulturalDesignImage(homeId);
    assert.ok(image, `Missing cultural design image registry entry: ${homeId}`);
    assert.equal(existsSync(`public${image.src}`), true, image.src);
  }

  assert.equal(getCulturalDesignImage("saturna"), undefined);
});

test("cultural exploration shows only the matching approved image and all selectable areas", () => {
  const markup = renderToStaticMarkup(
    <FirstNationsCulturalDesignDirection
      homeName="Solace"
      image={getCulturalDesignImage("solace")}
      direction={{
        choice: "explore",
        areas: [
          "entry-arrival",
          "local-artist-artisan-collaboration",
        ],
      }}
      onChoose={noop}
      onToggleArea={noop}
      onContinue={noop}
    />,
  );

  assert.match(markup, /Solace-Coastal\.png/);
  assert.match(markup, /Illustrative Design Inspiration/);
  assert.match(markup, /not a fixed design, approved product or supplier package/);
  assert.match(markup, /Entry \/ arrival/);
  assert.match(markup, /Exterior accents and materials/);
  assert.match(markup, /Gathering spaces/);
  assert.match(markup, /Interior feature elements/);
  assert.match(markup, /Carving \/ artwork opportunities/);
  assert.match(markup, /Landscape \/ connection to place/);
  assert.match(markup, /Local artist \/ artisan collaboration/);
  assert.match(markup, /object-contain/);
});

test("contemporary choice leaves the universal Design Center path unchanged", () => {
  const markup = renderToStaticMarkup(
    <FirstNationsCulturalDesignDirection
      homeName="Solace"
      image={getCulturalDesignImage("solace")}
      direction={{ choice: "contemporary", areas: [] }}
      onChoose={noop}
      onToggleArea={noop}
      onContinue={noop}
    />,
  );

  assert.match(markup, /data-cultural-design-direction="contemporary"/);
  assert.doesNotMatch(markup, /Solace-Coastal\.png/);
  assert.doesNotMatch(markup, /Areas to explore/);
});

test("Opportunity Report carries the Nation-led intent and selected areas", () => {
  const markup = renderToStaticMarkup(
    <CulturalDesignReport
      records={[
        {
          id: "solace-line:design-a",
          designName: "Solace — Design A",
          choice: "explore",
          areas: ["Entry / arrival", "Local artist / artisan collaboration"],
          artistCollaborationRequested: true,
        },
      ]}
    />,
  );

  assert.match(markup, /Cultural Design Direction/);
  assert.match(markup, /Solace — Design A/);
  assert.match(markup, /Nation-led cultural design exploration requested/);
  assert.match(markup, /Entry \/ arrival/);
  assert.match(
    markup,
    /Local artist \/ community collaboration to be developed during project review/,
  );
});
