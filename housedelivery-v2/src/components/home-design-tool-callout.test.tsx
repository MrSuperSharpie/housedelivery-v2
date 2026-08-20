import assert from "node:assert/strict";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { HomeDesignToolCallout } from "@/components/home-design-tool-callout";

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
